/**
 * useWhiteboardKeyboard — Keyboard shortcuts for the whiteboard.
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
      if (isCtrl && e.key === 'c') {
        if (state.selectedIds.size > 0) {
          e.preventDefault();
          store.getState().copyElements();
        }
      }

      // Ctrl+V — paste elements (images handled separately in WhiteboardCanvas)
      if (isCtrl && e.key === 'v') {
        if (state.clipboard && state.clipboard.length > 0) {
          // Only paste elements if we have elements in clipboard
          // Image paste is handled by the paste event listener
          store.getState().pasteElements();
        }
      }

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