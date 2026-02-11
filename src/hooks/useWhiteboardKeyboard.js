/**
 * useWhiteboardKeyboard — Keyboard shortcuts for the whiteboard.
 */
import { useEffect } from 'react';

/**
 * Copy selected whiteboard elements as a PNG image to the system clipboard.
 * Reads directly from the rendered canvas to avoid re-rendering.
 */
function copySelectionAsImage(store) {
  const state = store.getState();
  if (!state.selectedIds || state.selectedIds.size === 0) return;

  // Save current selection
  const savedSelection = new Set(state.selectedIds);

  // 1. Compute bounding box of selected elements in world coords
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of savedSelection) {
    const el = state.elements[id];
    if (!el) continue;

    const ex = el.x || 0;
    const ey = el.y || 0;
    const ew = el.width || (el.x2 ? Math.abs(el.x2 - el.x) : 100);
    const eh = el.height || (el.y2 ? Math.abs(el.y2 - el.y) : 100);

    minX = Math.min(minX, ex, el.x2 ?? ex);
    minY = Math.min(minY, ey, el.y2 ?? ey);
    maxX = Math.max(maxX, ex + ew, el.x2 ?? (ex + ew));
    maxY = Math.max(maxY, ey + eh, el.y2 ?? (ey + eh));
  }

  if (!isFinite(minX)) return;

  const padding = 20;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  // 2. Temporarily clear selection so handles aren't rendered
  store.getState().clearSelection();

  // 3. Wait one frame for canvas to re-render without selection handles
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const canvas = document.querySelector('.whiteboard-canvas-container canvas');
      if (!canvas) {
        // Restore selection
        for (const id of savedSelection) store.getState().selectElement(id, true);
        return;
      }

      const zoom = state.zoom || 1;
      const panX = state.panX || 0;
      const panY = state.panY || 0;
      const dpr = window.devicePixelRatio || 1;

      const sx = (minX * zoom + panX) * dpr;
      const sy = (minY * zoom + panY) * dpr;
      const sw = (maxX - minX) * zoom * dpr;
      const sh = (maxY - minY) * zoom * dpr;

      const tempCanvas = document.createElement('canvas');
      const scale = 2;
      tempCanvas.width = (maxX - minX) * scale;
      tempCanvas.height = (maxY - minY) * scale;
      const ctx = tempCanvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      ctx.drawImage(
        canvas,
        sx, sy, sw, sh,
        0, 0, tempCanvas.width, tempCanvas.height
      );

      // 4. Restore selection immediately
      for (const id of savedSelection) {
        store.getState().selectElement(id, true);
      }

      // 5. Copy to system clipboard
      tempCanvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          if (store.getState().setSaveNotification) {
            store.getState().setSaveNotification({ message: '📋 Kopierat som bild' });
            setTimeout(() => store.getState().setSaveNotification(null), 2000);
          }
        } catch (err) {
          console.error('[Whiteboard] Failed to copy to clipboard:', err);
          if (store.getState().setSaveNotification) {
            store.getState().setSaveNotification({ message: '❌ Kunde inte kopiera' });
            setTimeout(() => store.getState().setSaveNotification(null), 3000);
          }
        }
      }, 'image/png');
    });
  });
}

export function useWhiteboardKeyboard(store) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const state = store.getState();
      
      // Don't intercept shortcuts during inline text editing
      if (state.editingElementId) {
        if (e.key === 'Escape') {
          e.preventDefault();
          store.getState().setEditingElementId(null);
        }
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // Delete / Backspace — delete selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedIds.size > 0) {
          e.preventDefault();
          store.getState().deleteElements([...state.selectedIds]);
        }
      }

      // Ctrl+A — select all
      if (isCtrl && e.key === 'a') {
        e.preventDefault();
        store.getState().selectAll();
      }

      // Ctrl+C — copy
      if (isCtrl && !isShift && !e.altKey && e.key === 'c') {
        if (state.selectedIds.size > 0) {
          e.preventDefault();
          store.getState().copyElements();
        }
      }

      // Ctrl+Alt+C — copy selection as image to system clipboard
      if (isCtrl && e.altKey && e.key === 'c') {
        if (state.selectedIds.size > 0) {
          e.preventDefault();
          copySelectionAsImage(store);
        }
      }

      // Ctrl+V — handled by paste event in WhiteboardCanvas
      // (checks for clipboard images first, then falls back to internal paste)

      // Ctrl+D — duplicate
      if (isCtrl && e.key === 'd') {
        if (state.selectedIds.size > 0) {
          e.preventDefault();
          store.getState().duplicateElements();
        }
      }

      // Ctrl+Z — undo
      if (isCtrl && !isShift && e.key === 'z') {
        e.preventDefault();
        store.getState().undo();
      }

      // Ctrl+Shift+Z or Ctrl+Y — redo
      if ((isCtrl && isShift && e.key === 'z') || (isCtrl && e.key === 'y')) {
        e.preventDefault();
        store.getState().redo();
      }

      // Ctrl+G — group
      if (isCtrl && !isShift && e.key === 'g') {
        if (state.selectedIds.size > 1) {
          e.preventDefault();
          store.getState().groupElements();
        }
      }

      // Ctrl+Shift+G — ungroup
      if (isCtrl && isShift && e.key === 'g') {
        e.preventDefault();
        store.getState().ungroupElements();
      }

      // Escape — deselect all, switch to select tool
      if (e.key === 'Escape') {
        e.preventDefault();
        store.getState().clearSelection();
        store.getState().setActiveTool('select');
      }

      // Quick tool shortcuts (single key, no modifier)
      if (!isCtrl && !e.altKey) {
        switch (e.key) {
          case 'v':
          case 'V':
            store.getState().setActiveTool('select');
            break;
          case 'r':
          case 'R':
            store.getState().setActiveTool('shape');
            store.getState().setActiveShapeVariant('rectangle');
            break;
          case 'o':
          case 'O':
            store.getState().setActiveTool('shape');
            store.getState().setActiveShapeVariant('ellipse');
            break;
          case 't':
          case 'T':
            store.getState().setActiveTool('text');
            break;
          case 'l':
          case 'L':
            store.getState().setActiveTool('line');
            break;
          case 'p':
          case 'P':
            store.getState().setActiveTool('pen');
            break;
          case 'x':
          case 'X':
            store.getState().setActiveTool('trim');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);
}