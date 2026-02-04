/**
 * Whiteboard — Main whiteboard component.
 * Assembles all sub-components.
 *
 * Deliverable 6: Added LayersPanel, AlignDistributeBar,
 * PresentationMode, ElementMetadataPanel, RulerOverlay
 *
 * Bugfix 7: Added autosave on every change + save on unmount
 * so data persists across view mode switches.
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

export default function Whiteboard({ className = '', style = {} }) {
  const canvasRef = useRef(null);
  const importFromJSON = useWhiteboardStore((s) => s.importFromJSON);
  const exportToJSON = useWhiteboardStore((s) => s.exportToJSON);
  const elements = useWhiteboardStore((s) => s.elements);
  const elementOrder = useWhiteboardStore((s) => s.elementOrder);

  // Helper to save current state to localStorage
  const saveToLocalStorage = useCallback(() => {
    try {
      const json = exportToJSON();
      localStorage.setItem('whiteboard-autosave', json);
      localStorage.setItem('whiteboard-autosave-time', new Date().toISOString());
    } catch (e) {
      console.warn('[Whiteboard] Failed to autosave:', e);
    }
  }, [exportToJSON]);

  // Load from localStorage on mount (only once)
  useEffect(() => {
    const saved = localStorage.getItem('whiteboard-autosave');
    if (saved) {
      try {
        const result = importFromJSON(saved);
        if (result.success) {
          const time = localStorage.getItem('whiteboard-autosave-time');
          console.log('[Whiteboard] Loaded from autosave:', time ? new Date(time).toLocaleString() : 'unknown time');
        }
      } catch (e) {
        console.warn('[Whiteboard] Failed to load autosave:', e);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        // Get the latest state directly from the store (not from stale closure)
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
        localStorage.setItem('whiteboard-autosave', json);
        localStorage.setItem('whiteboard-autosave-time', new Date().toISOString());
        console.log('[Whiteboard] Saved on unmount');
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
