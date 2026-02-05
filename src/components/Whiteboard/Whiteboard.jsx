/**
 * Whiteboard — Main whiteboard component.
 * Assembles all sub-components.
 *
 * Deliverable 6: Added LayersPanel, AlignDistributeBar,
 * PresentationMode, ElementMetadataPanel, RulerOverlay
 *
 * Bugfix 7: Added autosave on every change + save on unmount
 * so data persists across view mode switches.
 *
 * Feature: Per-project whiteboard data — each project gets its own
 * whiteboard state scoped by projectId in localStorage.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import WhiteboardCanvas from './WhiteboardCanvas';
import WhiteboardToolbar from './WhiteboardToolbar';
import PropertiesPanel from './PropertiesPanel';
import Minimap from './Minimap';
import ZoomControls from './ZoomControls';
import ExportImportDialog from './ExportImportDialog';
import TemplateDialog from './TemplateDialog';
import ContextMenu from './ContextMenu';
import SearchPanel from './SearchPanel';
import LayersPanel from './LayersPanel';
import AlignDistributeBar from './AlignDistributeBar';
import PresentationMode from './PresentationMode';
import ElementMetadataPanel from './ElementMetadataPanel';
import RulerOverlay from './RulerOverlay';
import useWhiteboardStore from '../../stores/whiteboardStore';

// Save notification component
function SaveNotification() {
  const saveNotification = useWhiteboardStore((s) => s.saveNotification);
  if (!saveNotification) return null;
  return (
    <div style={{
      position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
      background: '#4caf50', color: 'white', padding: '8px 20px',
      borderRadius: '6px', fontSize: '14px', fontWeight: 600,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 9999,
      animation: 'fadeIn 0.2s ease-out',
    }}>
      {saveNotification.message}
    </div>
  );
}

/**
 * Get storage key for a project's whiteboard data.
 * Falls back to 'default' if no projectId is provided.
 */
function getStorageKey(projectId) {
  const id = projectId || 'default';
  return `whiteboard-autosave-${id}`;
}

function getTimeKey(projectId) {
  const id = projectId || 'default';
  return `whiteboard-autosave-time-${id}`;
}

export default function Whiteboard({ className = '', style = {}, projectId = null }) {
  const canvasRef = useRef(null);
  const importFromJSON = useWhiteboardStore((s) => s.importFromJSON);
  const exportToJSON = useWhiteboardStore((s) => s.exportToJSON);
  const elements = useWhiteboardStore((s) => s.elements);
  const elementOrder = useWhiteboardStore((s) => s.elementOrder);
  const clearCanvas = useWhiteboardStore((s) => s.clearCanvas);

  // Track which project we loaded for, to detect project changes
  const loadedProjectRef = useRef(null);

  // Helper to save current state to localStorage (project-scoped)
  const saveToLocalStorage = useCallback(() => {
    try {
      const json = exportToJSON();
      localStorage.setItem(getStorageKey(projectId), json);
      localStorage.setItem(getTimeKey(projectId), new Date().toISOString());
    } catch (e) {
      console.warn('[Whiteboard] Failed to autosave:', e);
    }
  }, [exportToJSON, projectId]);

  // Load from localStorage on mount OR when projectId changes
  useEffect(() => {
    // If projectId changed, save old project first (if we had one loaded)
    if (loadedProjectRef.current !== null && loadedProjectRef.current !== projectId) {
      try {
        const state = useWhiteboardStore.getState();
        const json = JSON.stringify({
          version: '2.0',
          timestamp: new Date().toISOString(),
          elements: state.elements,
          elementOrder: state.elementOrder,
          gridSize: state.gridSize,
          layers: state.layers,
          frames: state.frames,
        }, null, 2);
        localStorage.setItem(getStorageKey(loadedProjectRef.current), json);
        localStorage.setItem(getTimeKey(loadedProjectRef.current), new Date().toISOString());
        console.log('[Whiteboard] Saved previous project:', loadedProjectRef.current);
      } catch (e) {
        console.warn('[Whiteboard] Failed to save previous project:', e);
      }
    }

    // Now load the new project's whiteboard data
    const storageKey = getStorageKey(projectId);
    let saved = localStorage.getItem(storageKey);
    
    // Check if saved data is actually empty (has no elements)
    let savedHasData = false;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const elCount = parsed.elements ? Object.keys(parsed.elements).length : 0;
        savedHasData = elCount > 0;
      } catch (e) { /* ignore */ }
    }
    
    // Migration: if no meaningful project-scoped data, check the old global key
    if (!savedHasData) {
      const oldData = localStorage.getItem('whiteboard-autosave');
      if (oldData) {
        try {
          const parsed = JSON.parse(oldData);
          const oldElCount = parsed.elements ? Object.keys(parsed.elements).length : 0;
          if (oldElCount > 0) {
            console.log(`[Whiteboard] Migrating old whiteboard data (${oldElCount} elements) to project "${projectId || 'default'}"`);
            saved = oldData;
            savedHasData = true;
            // Save under the new project-scoped key
            localStorage.setItem(storageKey, oldData);
            const oldTime = localStorage.getItem('whiteboard-autosave-time');
            if (oldTime) localStorage.setItem(getTimeKey(projectId), oldTime);
            // Don't remove old keys until confirmed working — just leave them
          }
        } catch (e) { /* ignore */ }
      }
    }
    
    if (saved && savedHasData) {
      try {
        const result = importFromJSON(saved);
        if (result.success) {
          const time = localStorage.getItem(getTimeKey(projectId));
          console.log(`[Whiteboard] Loaded project "${projectId || 'default'}" from autosave:`, time ? new Date(time).toLocaleString() : 'unknown time');
        }
      } catch (e) {
        console.warn('[Whiteboard] Failed to load autosave:', e);
      }
    } else if (!savedHasData) {
      // No saved data for this project — start with clean whiteboard
      console.log(`[Whiteboard] No saved data for project "${projectId || 'default'}", starting fresh`);
      if (clearCanvas) clearCanvas();
    }

    loadedProjectRef.current = projectId;
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave whenever elements change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToLocalStorage();
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [elements, elementOrder, saveToLocalStorage]);

  // Save on unmount (when switching away from Draw view)
  useEffect(() => {
    return () => {
      // This runs when the component unmounts
      try {
        const pid = loadedProjectRef.current;
        const state = useWhiteboardStore.getState();
        const json = JSON.stringify({
          version: '2.0',
          timestamp: new Date().toISOString(),
          elements: state.elements,
          elementOrder: state.elementOrder,
          gridSize: state.gridSize,
          layers: state.layers,
          frames: state.frames,
        }, null, 2);
        localStorage.setItem(getStorageKey(pid), json);
        localStorage.setItem(getTimeKey(pid), new Date().toISOString());
        console.log('[Whiteboard] Saved on unmount for project:', pid || 'default');
      } catch (e) {
        console.warn('[Whiteboard] Failed to save on unmount:', e);
      }
    };
  }, []); // Empty deps = runs cleanup only on unmount

  return (
    <div
      className={`whiteboard ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#fafafa',
        margin: 0,
        padding: 0,
        ...style,
      }}
    >
      {/* Toolbar - no gap */}
      <WhiteboardToolbar />

      {/* Main area: Canvas + Properties */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        margin: 0,
        padding: 0,
      }}>
        {/* Canvas (expands to fill) */}
        <WhiteboardCanvas
          className="whiteboard-main-canvas"
          canvasRef={canvasRef}
        />

        {/* Overlays */}
        <Minimap />
        <ZoomControls />
        <SearchPanel />
        <LayersPanel />
        <AlignDistributeBar />
        <ElementMetadataPanel />
        <RulerOverlay />

        {/* Properties panel (fixed width, right side) */}
        <PropertiesPanel />
      </div>

      {/* Dialogs */}
      <ExportImportDialog canvasRef={canvasRef} />
      <TemplateDialog />
      <ContextMenu />
      <PresentationMode />
      <SaveNotification />
    </div>
  );
}
