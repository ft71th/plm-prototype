/**
 * SelectTool — Handles selection, move, and resize interactions.
 *
 * Mouse behavior:
 * - Click on element → select it
 * - Shift+click → toggle in multi-selection
 * - Click on empty → deselect all
 * - Drag on element → move selected elements
 * - Drag on handle → resize element
 * - Drag on empty → lasso selection
 */

import {
  hitTestHandles,
  calculateResize,
  snapToGrid,
  getAlignmentGuides,
  getBoundingBox,
  getCombinedBoundingBox,
} from '../../../utils/geometry';

export class SelectTool {
  constructor() {
    this.isDragging = false;
    this.isResizing = false;
    this.isLassoing = false;
    this.dragStartWorld = null;
    this.dragStartPositions = null; // Map: id → { x, y }
    this.resizeHandle = null;
    this.resizeOriginal = null;
    this.resizeElementId = null;
    this.lassoStart = null;
  }

  onMouseDown(worldX, worldY, shiftKey, store, renderer) {
    const state = store.getState();

    // Check for resize handle on selected elements first
    for (const id of state.selectedIds) {
      const el = state.elements[id];
      if (!el) continue;
      const handle = hitTestHandles(el, worldX, worldY, 8);
      if (handle) {
        this.isResizing = true;
        this.resizeHandle = handle;
        this.resizeElementId = id;
        this.resizeOriginal = { x: el.x, y: el.y, width: el.width, height: el.height };
        this.dragStartWorld = { x: worldX, y: worldY };
        return;
      }
    }

    // Check for element hit
    const hitId = renderer.hitTest(state, worldX, worldY);

    if (hitId) {
      if (shiftKey) {
        store.getState().selectElement(hitId, true);
      } else if (!state.selectedIds.has(hitId)) {
        store.getState().selectElement(hitId, false);
      }

      // Start move
      this.isDragging = true;
      this.dragStartWorld = { x: worldX, y: worldY };

      // Save starting positions for all selected elements
      const currentState = store.getState();
      this.dragStartPositions = {};
      for (const id of currentState.selectedIds) {
        const el = currentState.elements[id];
        if (el) {
          this.dragStartPositions[id] = { x: el.x, y: el.y };
          if (el.type === 'line') {
            this.dragStartPositions[id].x2 = el.x2;
            this.dragStartPositions[id].y2 = el.y2;
          }
        }
      }
    } else {
      // Click on empty → start lasso or deselect
      if (!shiftKey) {
        store.getState().clearSelection();
      }
      this.isLassoing = true;
      this.lassoStart = { x: worldX, y: worldY };
      store.getState().setSelectionBox({ x: worldX, y: worldY, width: 0, height: 0 });
    }
  }

  onMouseMove(worldX, worldY, shiftKey, store, renderer) {
    if (this.isResizing) {
      this._handleResize(worldX, worldY, shiftKey, store, renderer);
      return;
    }

    if (this.isDragging) {
      this._handleMove(worldX, worldY, store, renderer);
      return;
    }

    if (this.isLassoing) {
      this._handleLasso(worldX, worldY, store);
      return;
    }

    // Hover: update cursor based on handle hit
    // (cursor updates handled in WhiteboardCanvas)
  }

  onMouseUp(worldX, worldY, shiftKey, store, renderer) {
    if (this.isLassoing) {
      // Complete lasso selection
      const state = store.getState();
      if (state.selectionBox) {
        const box = state.selectionBox;
        // Only select if lasso has meaningful size
        if (Math.abs(box.width) > 3 || Math.abs(box.height) > 3) {
          // Normalize box (handle negative width/height)
          const normalizedBox = {
            x: Math.min(box.x, box.x + box.width),
            y: Math.min(box.y, box.y + box.height),
            width: Math.abs(box.width),
            height: Math.abs(box.height),
          };
          store.getState().selectByLasso(normalizedBox);
        }
      }
      store.getState().setSelectionBox(null);
    }

    // Clear alignment guides
    renderer.setAlignmentGuides([]);

    this.isDragging = false;
    this.isResizing = false;
    this.isLassoing = false;
    this.dragStartWorld = null;
    this.dragStartPositions = null;
    this.resizeHandle = null;
    this.resizeOriginal = null;
    this.resizeElementId = null;
    this.lassoStart = null;

    renderer.markDirty();
  }

  onDoubleClick(worldX, worldY, store, renderer) {
    const state = store.getState();
    const hitId = renderer.hitTest(state, worldX, worldY);

    if (hitId) {
      const el = state.elements[hitId];
      if (el && (el.type === 'shape' || el.type === 'text')) {
        // Enter inline text editing mode
        store.getState().setEditingElementId(hitId);
      }
    }
  }

  // ─── Private helpers ──────────────────────────────────

  _handleMove(worldX, worldY, store, renderer) {
    const dx = worldX - this.dragStartWorld.x;
    const dy = worldY - this.dragStartWorld.y;
    const state = store.getState();

    // Calculate alignment guides
    if (state.showAlignmentGuides && state.selectedIds.size > 0) {
      const selectedElements = [...state.selectedIds]
        .map((id) => state.elements[id])
        .filter(Boolean);
      const movingBox = getCombinedBoundingBox(selectedElements);

      if (movingBox) {
        const adjustedBox = {
          x: movingBox.x + dx,
          y: movingBox.y + dy,
          width: movingBox.width,
          height: movingBox.height,
        };

        const otherBoxes = state.elementOrder
          .filter((id) => !state.selectedIds.has(id))
          .map((id) => state.elements[id])
          .filter(Boolean)
          .map(getBoundingBox);

        const guides = getAlignmentGuides(adjustedBox, otherBoxes, 5);
        renderer.setAlignmentGuides(guides);
      }
    }

    // Move all selected elements
    for (const id of state.selectedIds) {
      const startPos = this.dragStartPositions[id];
      if (!startPos) continue;

      let newX = startPos.x + dx;
      let newY = startPos.y + dy;

      // Snap to grid
      if (state.snapToGrid) {
        const snapped = snapToGrid({ x: newX, y: newY }, state.gridSize);
        newX = snapped.x;
        newY = snapped.y;
      }

      const updates = { x: newX, y: newY };

      // Lines also need x2/y2 updated
      if (startPos.x2 !== undefined) {
        updates.x2 = startPos.x2 + dx;
        updates.y2 = startPos.y2 + dy;
        if (state.snapToGrid) {
          const snapped2 = snapToGrid({ x: updates.x2, y: updates.y2 }, state.gridSize);
          updates.x2 = snapped2.x;
          updates.y2 = snapped2.y;
        }
      }

      state.updateElement(id, updates);
    }

    renderer.markDirty();
  }

  _handleResize(worldX, worldY, shiftKey, store, renderer) {
    const dx = worldX - this.dragStartWorld.x;
    const dy = worldY - this.dragStartWorld.y;

    // Shift inverts default: default is proportional for corners, shift makes it free
    const preserveAspect = ['nw', 'ne', 'sw', 'se'].includes(this.resizeHandle) && !shiftKey;

    const newBounds = calculateResize(this.resizeOriginal, this.resizeHandle, dx, dy, preserveAspect);

    // Snap to grid
    const state = store.getState();
    if (state.snapToGrid) {
      const snapped = snapToGrid({ x: newBounds.x, y: newBounds.y }, state.gridSize);
      const snappedEnd = snapToGrid(
        { x: newBounds.x + newBounds.width, y: newBounds.y + newBounds.height },
        state.gridSize
      );
      newBounds.x = snapped.x;
      newBounds.y = snapped.y;
      newBounds.width = Math.max(10, snappedEnd.x - snapped.x);
      newBounds.height = Math.max(10, snappedEnd.y - snapped.y);
    }

    state.updateElement(this.resizeElementId, newBounds);
    renderer.markDirty();
  }

  _handleLasso(worldX, worldY, store) {
    const dx = worldX - this.lassoStart.x;
    const dy = worldY - this.lassoStart.y;

    store.getState().setSelectionBox({
      x: Math.min(this.lassoStart.x, worldX),
      y: Math.min(this.lassoStart.y, worldY),
      width: Math.abs(dx),
      height: Math.abs(dy),
    });
  }

  /**
   * Get the cursor style based on current hover position.
   */
  getCursor(worldX, worldY, state) {
    // Check for resize handles on selected elements
    for (const id of state.selectedIds) {
      const el = state.elements[id];
      if (!el) continue;
      const handle = hitTestHandles(el, worldX, worldY, 8);
      if (handle) {
        const cursorMap = {
          nw: 'nwse-resize', se: 'nwse-resize',
          ne: 'nesw-resize', sw: 'nesw-resize',
          n: 'ns-resize', s: 'ns-resize',
          e: 'ew-resize', w: 'ew-resize',
        };
        return cursorMap[handle] || 'default';
      }
    }
    return 'default';
  }
}
