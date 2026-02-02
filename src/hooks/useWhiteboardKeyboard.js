/**
 * useWhiteboardKeyboard — Keyboard shortcuts for the whiteboard.
 *
 * Deliverable 4: Added Ctrl++/- zoom, Ctrl+0 fit, Ctrl+E export
 */

import { useEffect } from 'react';

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

      // Delete / Backspace
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

      // Ctrl+Z — undo
      if (isCtrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        store.getState().undo();
      }

      // Ctrl+Shift+Z or Ctrl+Y — redo
      if ((isCtrl && e.shiftKey && (e.key === 'z' || e.key === 'Z')) ||
          (isCtrl && e.key === 'y')) {
        e.preventDefault();
        store.getState().redo();
      }

      // Ctrl+C — copy
      if (isCtrl && e.key === 'c' && state.selectedIds.size > 0) {
        e.preventDefault();
        store.getState().copyElements();
      }

      // Ctrl+V — paste
      if (isCtrl && e.key === 'v' && !e.shiftKey) {
        if (state.clipboard.length > 0) {
          e.preventDefault();
          store.getState().pasteElements();
        }
      }

      // Ctrl+D — duplicate
      if (isCtrl && e.key === 'd') {
        e.preventDefault();
        store.getState().duplicateElements();
      }

      // Ctrl+G — group
      if (isCtrl && !e.shiftKey && e.key === 'g') {
        e.preventDefault();
        store.getState().groupElements();
      }

      // Ctrl+Shift+G — ungroup
      if (isCtrl && e.shiftKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        store.getState().ungroupElements();
      }

      // Z-order: ] and [
      if (e.key === ']') {
        e.preventDefault();
        if (isCtrl) store.getState().bringToFront();
        else store.getState().bringForward();
      }
      if (e.key === '[') {
        e.preventDefault();
        if (isCtrl) store.getState().sendToBack();
        else store.getState().sendBackward();
      }

      // ─── Zoom shortcuts (Deliverable 4) ────────────
      // Ctrl++ / Ctrl+= — zoom in
      if (isCtrl && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        store.getState().zoomIn();
      }

      // Ctrl+- — zoom out
      if (isCtrl && e.key === '-') {
        e.preventDefault();
        store.getState().zoomOut();
      }

      // Ctrl+0 — zoom to fit
      if (isCtrl && e.key === '0') {
        e.preventDefault();
        store.getState().zoomToFit();
      }

      // Ctrl+1 — zoom to 100%
      if (isCtrl && e.key === '1') {
        e.preventDefault();
        store.getState().zoomReset();
      }

      // Ctrl+E — export dialog
      if (isCtrl && e.key === 'e') {
        e.preventDefault();
        store.getState().setShowExportDialog(true);
      }

      // Escape — deselect, switch to select tool
      if (e.key === 'Escape') {
        e.preventDefault();
        // Close dialogs first
        if (state.showExportDialog) {
          store.getState().setShowExportDialog(false);
          return;
        }
        if (state.showTemplateDialog) {
          store.getState().setShowTemplateDialog(false);
          return;
        }
        store.getState().clearSelection();
        store.getState().setActiveTool('select');
      }

      // Quick tool shortcuts (no modifier)
      if (!isCtrl && !e.altKey) {
        switch (e.key) {
          case 'v':
            store.getState().setActiveTool('select');
            break;
          case 'r':
            store.getState().setActiveTool('shape');
            store.getState().setActiveShapeVariant('rectangle');
            break;
          case 'o':
            store.getState().setActiveTool('shape');
            store.getState().setActiveShapeVariant('ellipse');
            break;
          case 't':
            store.getState().setActiveTool('text');
            break;
          case 'l':
            store.getState().setActiveTool('line');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);
}
