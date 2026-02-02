/**
 * LineTool — Create lines/connections by clicking and dragging.
 *
 * Click+drag creates a line from start to end point.
 * When near a shape edge, snaps to the nearest connection point.
 * After creation, switches to Select tool with new line selected.
 *
 * Double-click on an existing line to edit its label.
 */

import { snapToGrid } from '../../../utils/geometry';
import { findNearestConnectionPoint } from '../renderers/LineRenderer';

export class LineTool {
  constructor() {
    this.isDrawing = false;
    this.startWorld = null;
    this.startConnection = null;
    this.currentEnd = null;
    this.currentEndConnection = null;
  }

  onMouseDown(worldX, worldY, shiftKey, store, renderer) {
    const state = store.getState();

    // Check for connection point snap at start
    const conn = findNearestConnectionPoint(
      worldX, worldY,
      state.elements, state.elementOrder, 20
    );

    let sx, sy;
    if (conn) {
      sx = conn.x;
      sy = conn.y;
      this.startConnection = { elementId: conn.elementId, side: conn.side };
    } else if (state.snapToGrid) {
      const snapped = snapToGrid({ x: worldX, y: worldY }, state.gridSize);
      sx = snapped.x;
      sy = snapped.y;
      this.startConnection = null;
    } else {
      sx = worldX;
      sy = worldY;
      this.startConnection = null;
    }

    this.isDrawing = true;
    this.startWorld = { x: sx, y: sy };
    this.currentEnd = { x: sx, y: sy };
    this.currentEndConnection = null;

    store.getState().clearSelection();
  }

  onMouseMove(worldX, worldY, shiftKey, store, renderer) {
    if (!this.isDrawing) {
      // Show connection point previews while hovering
      const state = store.getState();
      renderer._showConnectionPoints = true;
      renderer.markDirty();
      return;
    }

    const state = store.getState();

    // Check for connection point snap at end
    const conn = findNearestConnectionPoint(
      worldX, worldY,
      state.elements, state.elementOrder, 20,
      this.startConnection?.elementId // exclude start shape
    );

    let ex, ey;
    if (conn) {
      ex = conn.x;
      ey = conn.y;
      this.currentEndConnection = { elementId: conn.elementId, side: conn.side };
    } else {
      // Shift constrains to 45° angles
      if (shiftKey) {
        const constrained = constrainAngle(this.startWorld.x, this.startWorld.y, worldX, worldY);
        ex = constrained.x;
        ey = constrained.y;
      } else if (state.snapToGrid) {
        const snapped = snapToGrid({ x: worldX, y: worldY }, state.gridSize);
        ex = snapped.x;
        ey = snapped.y;
      } else {
        ex = worldX;
        ey = worldY;
      }
      this.currentEndConnection = null;
    }

    this.currentEnd = { x: ex, y: ey };

    // Show preview line
    const preview = state.createLine(
      this.startWorld.x, this.startWorld.y,
      ex, ey
    );
    preview.startConnection = this.startConnection;
    preview.endConnection = this.currentEndConnection;
    renderer.setPreviewElement(preview);
    renderer._showConnectionPoints = true;
    renderer.markDirty();
  }

  onMouseUp(worldX, worldY, shiftKey, store, renderer) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    renderer.setPreviewElement(null);
    renderer._showConnectionPoints = false;

    const start = this.startWorld;
    const end = this.currentEnd;

    // Ignore tiny lines (accidental click)
    const len = Math.hypot(end.x - start.x, end.y - start.y);
    if (len < 5) {
      this.reset();
      renderer.markDirty();
      return;
    }

    const state = store.getState();
    const line = state.createLine(start.x, start.y, end.x, end.y, {
      startConnection: this.startConnection,
      endConnection: this.currentEndConnection,
    });

    store.getState().addElement(line);
    store.getState().selectElement(line.id);

    // Stay in line tool for drawing multiple lines
    // (user can press V or Escape to switch back to select)

    this.reset();
    renderer.markDirty();
  }

  onDoubleClick(worldX, worldY, store, renderer) {
    const state = store.getState();
    const { hitTest } = require('../../../utils/geometry');

    // Check if double-clicking on existing line
    for (let i = state.elementOrder.length - 1; i >= 0; i--) {
      const id = state.elementOrder[i];
      const el = state.elements[id];
      if (!el || !el.visible || el.type !== 'line') continue;

      if (hitTest(el, worldX, worldY)) {
        store.getState().selectElement(id);
        store.getState().setEditingElementId(id);
        renderer.markDirty();
        return;
      }
    }
  }

  reset() {
    this.isDrawing = false;
    this.startWorld = null;
    this.startConnection = null;
    this.currentEnd = null;
    this.currentEndConnection = null;
  }

  getCursor() {
    return 'crosshair';
  }
}

/**
 * Constrain a point to the nearest 45° angle from origin.
 */
function constrainAngle(ox, oy, px, py) {
  const dx = px - ox;
  const dy = py - oy;
  const len = Math.hypot(dx, dy);
  if (len === 0) return { x: px, y: py };

  const angle = Math.atan2(dy, dx);
  const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);

  return {
    x: ox + len * Math.cos(snappedAngle),
    y: oy + len * Math.sin(snappedAngle),
  };
}
