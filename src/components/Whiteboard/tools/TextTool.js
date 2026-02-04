/**
 * TextTool — Create text elements by clicking on canvas.
 *
 * Click creates a text element and immediately opens inline editing.
 */

import { snapToGrid } from '../../../utils/geometry';

export class TextTool {
  constructor() {
    // No drag state needed — text is created on click
  }

  onMouseDown(worldX, worldY, shiftKey, store, renderer) {
    const state = store.getState();

    // If currently editing, clicking outside should just end editing
    // (don't create a new text element)
    if (state.editingElementId) {
      store.getState().setEditingElementId(null);
      store.getState().setActiveTool('select');
      renderer.markDirty();
      return;
    }

    let sx = worldX;
    let sy = worldY;

    if (state.snapToGrid) {
      const snapped = snapToGrid({ x: sx, y: sy }, state.gridSize);
      sx = snapped.x;
      sy = snapped.y;
    }

    // Create text element
    const textEl = state.createTextElement(sx, sy);
    store.getState().addElement(textEl);
    store.getState().selectElement(textEl.id);

    // Enter editing mode immediately
    store.getState().setEditingElementId(textEl.id);

    renderer.markDirty();
  }

  onMouseMove() {
    // No drag behavior for text tool
  }

  onMouseUp() {
    // No action needed
  }

  onDoubleClick(worldX, worldY, store, renderer) {
    const state = store.getState();
    const { hitTest } = require('../../../utils/geometry');

    // Check if double-clicking on existing element
    for (let i = state.elementOrder.length - 1; i >= 0; i--) {
      const id = state.elementOrder[i];
      const el = state.elements[id];
      if (!el || !el.visible) continue;

      if (hitTest(el, worldX, worldY)) {
        store.getState().selectElement(id);
        store.getState().setEditingElementId(id);
        renderer.markDirty();
        return;
      }
    }
  }

  getCursor() {
    return 'text';
  }
}
