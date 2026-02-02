/**
 * useWhiteboardKeyboard — Keyboard shortcuts for the whiteboard.
 *
 * Handles: Delete, Backspace, Ctrl+A, Escape
 * (Undo/Redo, Copy/Paste, Group added in Deliverable 4)
 */

import { useEffect } from 'react';

export function useWhiteboardKeyboard(store) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const state = store.getState();

      // Don't intercept shortcuts during inline text editing
      if (state.editingElementId) {
        // Only Escape exits editing
        if (e.key === 'Escape') {
          e.preventDefault();
          store.getState().setEditingElementId(null);
        }
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;

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
          // 'l' for line will be added in Deliverable 2
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);
}
