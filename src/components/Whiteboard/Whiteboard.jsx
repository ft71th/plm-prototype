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
 * whiteboard state. Data is persisted to the backend API (PostgreSQL)
 * with localStorage as a write-through cache for fast loads.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
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
import SymbolLibraryPanel from './SymbolLibraryPanel';
import useWhiteboardStore from '../../stores/whiteboardStore';
import { apiFetch } from '../../api';

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
 * localStorage keys kept as write-through cache for instant loads.
 */
function getStorageKey(projectId) {
  const id = projectId || 'default';
  return `whiteboard-autosave-${id}`;
}

function getTimeKey(projectId) {
  const id = projectId || 'default';
  return `whiteboard-autosave-time-${id}`;
}

// Debounced save-to-backend timer ref (module level to survive re-renders)
let _backendSaveTimer = null;

export default function Whiteboard({ className = '', style = {}, projectId = null }) {
  const canvasRef = useRef(null);
  const importFromJSON = useWhiteboardStore((s) => s.importFromJSON);
  const exportToJSON = useWhiteboardStore((s) => s.exportToJSON);
  const elements = useWhiteboardStore((s) => s.elements);
  const elementOrder = useWhiteboardStore((s) => s.elementOrder);
  const clearCanvas = useWhiteboardStore((s) => s.clearCanvas);
  const [loading, setLoading] = useState(true);

  // Track which project we loaded for, to detect project changes
  const loadedProjectRef = useRef(null);

  // Save current state to backend + localStorage cache
  const saveToBackend = useCallback((pid) => {
    const effectivePid = pid || projectId;
    if (!effectivePid) return;

    try {
      const json = exportToJSON();
      // Write-through cache to localStorage for instant next load
      localStorage.setItem(getStorageKey(effectivePid), json);
      localStorage.setItem(getTimeKey(effectivePid), new Date().toISOString());

      // Save to backend
      const parsed = JSON.parse(json);
      apiFetch(`/projects/${effectivePid}/whiteboard`, {
        method: 'PUT',
        body: JSON.stringify({ data: parsed }),
      })
        .then(() => console.log('[Whiteboard] Saved to backend for project:', effectivePid))
        .catch(err => console.warn('[Whiteboard] Backend save failed (will retry):', err.message));
    } catch (e) {
      console.warn('[Whiteboard] Failed to save:', e);
    }
  }, [exportToJSON, projectId]);

  // Load from backend on mount OR when projectId changes
  useEffect(() => {
    let cancelled = false;

    // If projectId changed, save old project first
    if (loadedProjectRef.current !== null && loadedProjectRef.current !== projectId) {
      saveToBackend(loadedProjectRef.current);
    }

    async function loadWhiteboard() {
      setLoading(true);

      // 1. Try loading from localStorage cache first (instant)
      const storageKey = getStorageKey(projectId);
      const cachedJson = localStorage.getItem(storageKey);
      let cachedData = null;
      if (cachedJson) {
        try {
          cachedData = JSON.parse(cachedJson);
          const elCount = cachedData.elements ? Object.keys(cachedData.elements).length : 0;
          if (elCount > 0) {
            // Load cache immediately for fast UX
            importFromJSON(cachedJson);
            console.log(`[Whiteboard] Loaded ${elCount} elements from cache`);
          } else {
            cachedData = null;
          }
        } catch (e) {
          cachedData = null;
        }
      }

      // 2. Try loading from backend (source of truth) with timeout
      if (projectId) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const response = await apiFetch(`/projects/${projectId}/whiteboard`, { signal: controller.signal })
            .finally(() => clearTimeout(timeout));
          if (cancelled) return;

          const backendData = response?.data;
          if (backendData && backendData.elements && Object.keys(backendData.elements).length > 0) {
            const json = JSON.stringify(backendData, null, 2);
            const result = importFromJSON(json);
            if (result.success) {
              // Update cache
              localStorage.setItem(storageKey, json);
              localStorage.setItem(getTimeKey(projectId), new Date().toISOString());
              console.log(`[Whiteboard] Loaded from backend for project "${projectId}"`);
            }
          } else if (!cachedData) {
            // No data in backend or cache — migrate from localStorage if available
            const oldLocalData = localStorage.getItem(storageKey);
            if (oldLocalData) {
              try {
                const parsed = JSON.parse(oldLocalData);
                const elCount = parsed.elements ? Object.keys(parsed.elements).length : 0;
                if (elCount > 0) {
                  console.log(`[Whiteboard] Migrating ${elCount} elements from localStorage to backend`);
                  importFromJSON(oldLocalData);
                  // Push to backend
                  await apiFetch(`/projects/${projectId}/whiteboard`, {
                    method: 'PUT',
                    body: JSON.stringify({ data: parsed }),
                  });
                  console.log('[Whiteboard] Migration complete');
                } else {
                  console.log(`[Whiteboard] No saved data for project "${projectId}", starting fresh`);
                  if (clearCanvas) clearCanvas();
                }
              } catch (e) {
                console.log(`[Whiteboard] No saved data for project "${projectId}", starting fresh`);
                if (clearCanvas) clearCanvas();
              }
            } else {
              console.log(`[Whiteboard] No saved data for project "${projectId}", starting fresh`);
              if (clearCanvas) clearCanvas();
            }
          }
        } catch (err) {
          console.warn('[Whiteboard] Backend load failed, using cache:', err.message);
          if (!cachedData) {
            console.log(`[Whiteboard] No data available for project "${projectId}", starting fresh`);
            if (clearCanvas) clearCanvas();
          }
        }
      }

      if (!cancelled) {
        setLoading(false);
        loadedProjectRef.current = projectId;
      }
    }

    loadWhiteboard();

    // Safety: guarantee loading never hangs forever
    const safetyTimer = setTimeout(() => {
      setLoading(false);
      console.warn('[Whiteboard] Safety timeout — forced loading=false');
    }, 8000);

    return () => { cancelled = true; clearTimeout(safetyTimer); };
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave whenever elements change (debounced — 2s for backend, instant for cache)
  useEffect(() => {
    // Instant localStorage cache
    try {
      const json = exportToJSON();
      localStorage.setItem(getStorageKey(projectId), json);
    } catch (e) { /* ignore */ }

    // Debounced backend save
    if (_backendSaveTimer) clearTimeout(_backendSaveTimer);
    _backendSaveTimer = setTimeout(() => {
      saveToBackend(projectId);
    }, 2000);

    return () => {
      if (_backendSaveTimer) clearTimeout(_backendSaveTimer);
    };
  }, [elements, elementOrder, saveToBackend, exportToJSON, projectId]);

  // Save on unmount (when switching away from Draw view)
  useEffect(() => {
    return () => {
      const pid = loadedProjectRef.current;
      if (!pid) return;

      try {
        const state = useWhiteboardStore.getState();
        const data = {
          version: '2.0',
          timestamp: new Date().toISOString(),
          elements: state.elements,
          elementOrder: state.elementOrder,
          gridSize: state.gridSize,
          layers: state.layers,
          frames: state.frames,
        };
        const json = JSON.stringify(data, null, 2);

        // Cache
        localStorage.setItem(getStorageKey(pid), json);
        localStorage.setItem(getTimeKey(pid), new Date().toISOString());

        // Fire-and-forget backend save
        apiFetch(`/projects/${pid}/whiteboard`, {
          method: 'PUT',
          body: JSON.stringify({ data }),
        }).catch(err => console.warn('[Whiteboard] Unmount save failed:', err.message));

        console.log('[Whiteboard] Saved on unmount for project:', pid);
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
        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(250,250,250,0.8)', zIndex: 100,
            fontSize: '14px', color: '#666',
          }}>
            Loading whiteboard...
          </div>
        )}

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
        <SymbolLibraryPanel />

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
