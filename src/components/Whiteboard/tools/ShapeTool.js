/**
 * ShapeTool — Create shapes by clicking and dragging on canvas.
 *
 * Click+drag creates a shape with the dimensions of the drag rectangle.
 * Shift constrains to square/circle.
 * After creation, switches to Select tool with new shape selected.
 */

import { snapToGrid } from '../../../utils/geometry';

export class ShapeTool {
  constructor() {
    this.isDrawing = false;
    this.startWorld = null;
  }

  onMouseDown(worldX, worldY, shiftKey, store, renderer) {
    this.isDrawing = true;

    const state = store.getState();
    let sx = worldX;
    let sy = worldY;

    if (state.snapToGrid) {
      const snapped = snapToGrid({ x: sx, y: sy }, state.gridSize);
      sx = snapped.x;
      sy = snapped.y;
    }

    this.startWorld = { x: sx, y: sy };

    // Clear selection
    store.getState().clearSelection();
  }

  onMouseMove(worldX, worldY, shiftKey, store, renderer) {
    if (!this.isDrawing) return;

    const state = store.getState();
    let endX = worldX;
    let endY = worldY;

    if (state.snapToGrid) {
      const snapped = snapToGrid({ x: endX, y: endY }, state.gridSize);
      endX = snapped.x;
      endY = snapped.y;
    }

    let width = endX - this.startWorld.x;
    let height = endY - this.startWorld.y;

    // Shift: constrain to square/circle
    if (shiftKey) {
      const size = Math.max(Math.abs(width), Math.abs(height));
      width = Math.sign(width) * size;
      height = Math.sign(height) * size;
    }

    // Create preview element
    const preview = state.createShape(
      width >= 0 ? this.startWorld.x : this.startWorld.x + width,
      height >= 0 ? this.startWorld.y : this.startWorld.y + height,
      Math.abs(width),
      Math.abs(height)
    );

    renderer.setPreviewElement(preview);
    renderer.markDirty();
  }

  onMouseUp(worldX, worldY, shiftKey, store, renderer) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    renderer.setPreviewElement(null);

    const state = store.getState();
    let endX = worldX;
    let endY = worldY;

    if (state.snapToGrid) {
      const snapped = snapToGrid({ x: endX, y: endY }, state.gridSize);
      endX = snapped.x;
      endY = snapped.y;
    }

    let width = endX - this.startWorld.x;
    let height = endY - this.startWorld.y;

    // Shift: constrain
    if (shiftKey) {
      const size = Math.max(Math.abs(width), Math.abs(height));
      width = Math.sign(width) * size || size;
      height = Math.sign(height) * size || size;
    }

    const absWidth = Math.abs(width);
    const absHeight = Math.abs(height);

    // Ignore tiny shapes (accidental click)
    if (absWidth < 5 && absHeight < 5) {
      // Create a default-sized shape at click position
      const defaultSize = 120;
      const shape = state.createShape(
        this.startWorld.x - defaultSize / 2,
        this.startWorld.y - defaultSize / 2,
        defaultSize,
        defaultSize * 0.7
      );
      store.getState().addElement(shape);
      store.getState().selectElement(shape.id);
      store.getState().setActiveTool('select');
      renderer.markDirty();
      return;
    }

    const shape = state.createShape(
      width >= 0 ? this.startWorld.x : this.startWorld.x + width,
      height >= 0 ? this.startWorld.y : this.startWorld.y + height,
      absWidth,
      absHeight
    );

    store.getState().addElement(shape);
    store.getState().selectElement(shape.id);
    store.getState().setActiveTool('select');

    renderer.markDirty();
  }

  onDoubleClick() {
    // No action for shape tool double-click
  }

  getCursor() {
    return 'crosshair';
  }
}
