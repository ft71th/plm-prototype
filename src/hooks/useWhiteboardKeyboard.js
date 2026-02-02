/**
 * useWhiteboardKeyboard — Keyboard shortcuts for the whiteboard.
 *
 * Tool switching: V, R, O, T, L
 * Delete/Backspace, Ctrl+A, Escape
 * Ctrl+Z (undo), Ctrl+Shift+Z / Ctrl+Y (redo)
 * Ctrl+C (copy), Ctrl+V (paste), Ctrl+D (duplicate)
 * Ctrl+G (group), Ctrl+Shift+G (ungroup)
 * Z-order: ] (forward), [ (backward), Ctrl+] (front), Ctrl+[ (back)
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
        // Only paste if clipboard has items
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
        if (isCtrl) {
          store.getState().bringToFront();
        } else {
          store.getState().bringForward();
        }
      }
      if (e.key === '[') {
        e.preventDefault();
        if (isCtrl) {
          store.getState().sendToBack();
        } else {
          store.getState().sendBackward();
        }
      }

      // Escape — deselect, switch to select tool
      if (e.key === 'Escape') {
        e.preventDefault();
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
