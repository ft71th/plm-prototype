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
import { findNearestConnectionPoint, hitTestOrthogonalSegment, moveOrthogonalSegment, insertOrthogonalBend, buildOrthogonalWaypoints, hitTestStraightLineMid, buildUShapeWaypoints, hitTestOrthogonalCorner, moveOrthogonalCorner, updateStartWaypoint, updateEndWaypoint } from '../renderers/LineRenderer';

// Rotation handle constants (must match SelectionRenderer)
const ROTATION_HANDLE_DISTANCE = 25;
const ROTATION_HANDLE_RADIUS = 6;

/**
 * Get the rotation handle position for an element (in world coords, accounting for rotation).
 */
function getRotationHandlePosition(element) {
  const bb = getBoundingBox(element);
  const cx = bb.x + bb.width / 2;
  const cy = bb.y + bb.height / 2;
  const rotation = element.rotation || 0;

  let hx = cx;
  let hy = bb.y - ROTATION_HANDLE_DISTANCE;

  if (rotation !== 0) {
    const dx = hx - cx;
    const dy = hy - cy;
    hx = cx + dx * Math.cos(rotation) - dy * Math.sin(rotation);
    hy = cy + dx * Math.sin(rotation) + dy * Math.cos(rotation);
  }

  return { x: hx, y: hy, radius: ROTATION_HANDLE_RADIUS };
}

export class SelectTool {
  constructor() {
    this.isDragging = false;
    this.isResizing = false;
    this.isLassoing = false;
    this.isRotating = false;
    this.rotatingElementId = null;
    this.rotationStart = null;
    this.dragStartWorld = null;
    this.dragStartPositions = null; // Map: id → { x, y }
    this.resizeHandle = null;
    this.resizeOriginal = null;
    this.resizeElementId = null;
    this.lassoStart = null;
    // Orthogonal bend segment dragging
    this.isDraggingBend = false;
    this.bendLineId = null;
    this.bendSegIndex = null;
    this.bendStartWaypoints = null;
    this.bendDragStart = null;
    // Straight line → U-shape bend creation by dragging midpoint
    this.isBendCreating = false;
    this.bendCreateLineId = null;
    this.bendCreateStart = null;
    // Corner waypoint dragging (move single corner, others stay fixed)
    this.isDraggingCorner = false;
    this.cornerLineId = null;
    this.cornerIndex = null;
    this.cornerStartWaypoints = null;
  }

  onMouseDown(worldX, worldY, shiftKey, store, renderer) {
    const state = store.getState();

    // Check for rotation handle on selected elements first
    for (const id of state.selectedIds) {
      const el = state.elements[id];
      if (!el || el.type === 'line') continue;
      const rotHandle = getRotationHandlePosition(el);
      const dist = Math.hypot(worldX - rotHandle.x, worldY - rotHandle.y);
      if (dist <= rotHandle.radius + 4) {
        this.isRotating = true;
        this.rotatingElementId = id;
        const bb = getBoundingBox(el);
        const cx = bb.x + bb.width / 2;
        const cy = bb.y + bb.height / 2;
        this.rotationCenter = { x: cx, y: cy };
        this.rotationStart = Math.atan2(worldY - cy, worldX - cx);
        this.rotationOriginal = el.rotation || 0;
        return;
      }
    }

    // Check for orthogonal line endpoint handles FIRST (before general hitTestHandles)
    // This ensures we can always grab endpoints regardless of where x2,y2 are
    for (const id of state.selectedIds) {
      const el = state.elements[id];
      if (!el || el.type !== 'line' || el.lineType !== 'orthogonal' || !Array.isArray(el.waypoints) || el.waypoints.length < 2) continue;
      const threshold = 12 / (state.zoom || 1);
      const first = el.waypoints[0];
      const last = el.waypoints[el.waypoints.length - 1];
      if (Math.hypot(worldX - first.x, worldY - first.y) <= threshold) {
        this.isResizing = true;
        this.resizeHandle = 'line-start';
        this.resizeElementId = id;
        this.resizeOriginal = { x: el.x, y: el.y, width: 0, height: 0 };
        this.dragStartWorld = { x: worldX, y: worldY };
        return;
      }
      if (Math.hypot(worldX - last.x, worldY - last.y) <= threshold) {
        this.isResizing = true;
        this.resizeHandle = 'line-end';
        this.resizeElementId = id;
        this.resizeOriginal = { x: el.x, y: el.y, width: 0, height: 0 };
        this.dragStartWorld = { x: worldX, y: worldY };
        return;
      }
    }

    // Check for resize handle on selected elements
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

    // Check for orthogonal bend segment handles on selected lines
    for (const id of state.selectedIds) {
      const el = state.elements[id];
      if (!el || el.type !== 'line' || el.lineType !== 'orthogonal' || !Array.isArray(el.waypoints)) continue;

      // ── Corner waypoints (filled circles) — move single corner ──
      const cornerIdx = hitTestOrthogonalCorner(worldX, worldY, el.waypoints, state.zoom || 1);
      if (cornerIdx !== null) {
        this.isDraggingCorner = true;
        this.cornerLineId = id;
        this.cornerIndex = cornerIdx;
        this.cornerStartWaypoints = el.waypoints.map((p) => ({ ...p }));
        this.dragStartWorld = { x: worldX, y: worldY };
        return;
      }

      // ── Segment midpoint squares — move whole segment perpendicularly ──
      const hit = hitTestOrthogonalSegment(worldX, worldY, el.waypoints, state.zoom || 1);
      if (hit) {
        this.isDraggingBend = true;
        this.bendLineId = id;
        this.bendSegIndex = hit.segIndex;
        this.bendStartWaypoints = el.waypoints.map((p) => ({ ...p }));
        this.bendDragStart = { x: worldX, y: worldY };
        return;
      }
    }

    // Check for straight line midpoint handle (diamond) — drag to create U-shape bend
    for (const id of state.selectedIds) {
      const el = state.elements[id];
      if (!el || el.type !== 'line' || (el.lineType && el.lineType !== 'straight')) continue;
      if (hitTestStraightLineMid(worldX, worldY, el, state.zoom || 1)) {
        this.isBendCreating = true;
        this.bendCreateLineId = id;
        this.bendCreateStart = { x: worldX, y: worldY, el: { ...el } };
        return;
      }
    }

    // Check for element hit
    const hitId = renderer.hitTest(state, worldX, worldY);

    if (hitId) {
      // GROUP-AWARE SELECTION: If we hit a child of a group, expand selection to include all group members
      const hitEl = state.elements[hitId];
      let effectiveHitId = hitId;
      
      if (hitEl?.groupId && state.elements[hitEl.groupId]) {
        effectiveHitId = hitEl.groupId;
      }
      
      if (shiftKey) {
        store.getState().selectElement(effectiveHitId, true);
      } else if (!state.selectedIds.has(effectiveHitId)) {
        store.getState().selectElement(effectiveHitId, false);
      }
      
      // After selecting group, also ensure all children are in selectedIds
      const currentState = store.getState();
      const selectedEl = currentState.elements[effectiveHitId];
      if (selectedEl?.type === 'group' && selectedEl.childIds) {
        // Add all children to selection
        const newSelected = new Set(currentState.selectedIds);
        for (const childId of selectedEl.childIds) {
          newSelected.add(childId);
        }
        // Also add the group itself
        newSelected.add(effectiveHitId);
        store.setState({ selectedIds: newSelected });
      }

      // Start move
      this.isDragging = true;
      this.dragStartWorld = { x: worldX, y: worldY };

      // Save starting positions for all selected elements (now includes group children)
      const moveState = store.getState();
      this.dragStartPositions = {};
      for (const id of moveState.selectedIds) {
        const el = moveState.elements[id];
        if (el) {
          this.dragStartPositions[id] = { x: el.x, y: el.y };
          if (el.type === 'line') {
            this.dragStartPositions[id].x2 = el.x2;
            this.dragStartPositions[id].y2 = el.y2;
            // Save waypoints for orthogonal lines so they move with the line
            if (el.lineType === 'orthogonal' && Array.isArray(el.waypoints)) {
              this.dragStartPositions[id].waypoints = el.waypoints.map((p) => ({ ...p }));
            }
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
    if (this.isRotating) {
      this._handleRotation(worldX, worldY, shiftKey, store, renderer);
      return;
    }

    if (this.isResizing) {
      this._handleResize(worldX, worldY, shiftKey, store, renderer);
      return;
    }

    if (this.isDraggingBend) {
      const dx = worldX - this.bendDragStart.x;
      const dy = worldY - this.bendDragStart.y;
      const newWaypoints = moveOrthogonalSegment(this.bendStartWaypoints, this.bendSegIndex, dx, dy);
      store.getState().updateElement(this.bendLineId, { waypoints: newWaypoints });
      renderer.markDirty();
      return;
    }

    if (this.isDraggingCorner) {
      const newWaypoints = moveOrthogonalCorner(this.cornerStartWaypoints, this.cornerIndex, worldX, worldY);
      store.getState().updateElement(this.cornerLineId, { waypoints: newWaypoints });
      renderer.markDirty();
      return;
    }

    if (this.isBendCreating) {
      const el = this.bendCreateStart.el;
      const waypoints = buildUShapeWaypoints(el.x, el.y, el.x2, el.y2, worldX, worldY);
      store.getState().updateElement(this.bendCreateLineId, {
        lineType: 'orthogonal',
        waypoints,
      });
      renderer.markDirty();
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
    if (this.isDraggingBend) {
      store.getState().pushHistoryCheckpoint?.();
      this.isDraggingBend = false;
      this.bendLineId = null;
      this.bendSegIndex = null;
      this.bendStartWaypoints = null;
      this.bendDragStart = null;
      renderer.markDirty();
      return;
    }

    if (this.isDraggingCorner) {
      store.getState().pushHistoryCheckpoint?.();
      this.isDraggingCorner = false;
      this.cornerLineId = null;
      this.cornerIndex = null;
      this.cornerStartWaypoints = null;
      renderer.markDirty();
      return;
    }

    if (this.isBendCreating) {
      store.getState().pushHistoryCheckpoint?.();
      this.isBendCreating = false;
      this.bendCreateLineId = null;
      this.bendCreateStart = null;
      renderer.markDirty();
      return;
    }

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

    // Clear alignment guides and connection points
    renderer.setAlignmentGuides([]);
    renderer._showConnectionPoints = false;

    this.isDragging = false;
    this.isResizing = false;
    this.isLassoing = false;
    this.isRotating = false;
    this.rotatingElementId = null;
    this.rotationStart = null;
    this.rotationCenter = null;
    this.rotationOriginal = null;
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

    // Check for double-click on orthogonal line segment → insert bend
    for (const id of state.selectedIds) {
      const el = state.elements[id];
      if (!el || el.type !== 'line' || el.lineType !== 'orthogonal' || !Array.isArray(el.waypoints)) continue;
      const hit = hitTestOrthogonalSegment(worldX, worldY, el.waypoints, state.zoom || 1);
      if (hit) {
        const newWaypoints = insertOrthogonalBend(el.waypoints, hit.segIndex);
        state.pushHistoryCheckpoint?.();
        state.updateElement(id, { waypoints: newWaypoints });
        renderer.markDirty();
        return;
      }
    }

    const hitId = renderer.hitTest(state, worldX, worldY);

    if (hitId) {
      const el = state.elements[hitId];
      if (el && (el.type === 'shape' || el.type === 'text' || el.type === 'frame')) {
        // Enter inline text editing mode
        store.getState().setEditingElementId(hitId);
      }
    }
  }

  // ─── Private helpers ──────────────────────────────────

  _handleRotation(worldX, worldY, shiftKey, store, renderer) {
    const state = store.getState();
    const cx = this.rotationCenter.x;
    const cy = this.rotationCenter.y;

    const currentAngle = Math.atan2(worldY - cy, worldX - cx);
    let newRotation = this.rotationOriginal + (currentAngle - this.rotationStart);

    // Normalize to 0..2π
    while (newRotation < 0) newRotation += Math.PI * 2;
    while (newRotation >= Math.PI * 2) newRotation -= Math.PI * 2;

    // Shift: snap to 15° increments
    if (shiftKey) {
      const snap = Math.PI / 12; // 15 degrees
      newRotation = Math.round(newRotation / snap) * snap;
    }

    state.updateElement(this.rotatingElementId, { rotation: newRotation });
    renderer.markDirty();
  }

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
        // Also move waypoints for orthogonal lines
        const el = state.elements[id];
        if (el && el.lineType === 'orthogonal' && Array.isArray(startPos.waypoints)) {
          updates.waypoints = startPos.waypoints.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        }
      }

      state.updateElement(id, updates);
    }

    // Update connected lines: when moving a shape, update any line endpoints connected to it
    for (const id of state.elementOrder) {
      if (state.selectedIds.has(id)) continue; // Skip already-moved elements
      const el = state.elements[id];
      if (!el || el.type !== 'line') continue;

      const lineUpdates = {};
      if (el.startConnection && state.selectedIds.has(el.startConnection.elementId)) {
        const targetEl = state.elements[el.startConnection.elementId];
        if (targetEl) {
          const pt = getConnectionPointPosition(targetEl, el.startConnection.side);
          if (pt) {
            lineUpdates.x = pt.x;
            lineUpdates.y = pt.y;
          }
        }
      }
      if (el.endConnection && state.selectedIds.has(el.endConnection.elementId)) {
        const targetEl = state.elements[el.endConnection.elementId];
        if (targetEl) {
          const pt = getConnectionPointPosition(targetEl, el.endConnection.side);
          if (pt) {
            lineUpdates.x2 = pt.x;
            lineUpdates.y2 = pt.y;
          }
        }
      }
      if (Object.keys(lineUpdates).length > 0) {
        // For orthogonal lines: preserve interior waypoints, only move the affected endpoint
        if (el.lineType === 'orthogonal' && Array.isArray(el.waypoints) && el.waypoints.length >= 2) {
          if (lineUpdates.x !== undefined && lineUpdates.y !== undefined) {
            // Start endpoint moved
            lineUpdates.waypoints = updateStartWaypoint(el.waypoints, lineUpdates.x, lineUpdates.y);
          } else if (lineUpdates.x2 !== undefined && lineUpdates.y2 !== undefined) {
            // End endpoint moved
            lineUpdates.waypoints = updateEndWaypoint(el.waypoints, lineUpdates.x2, lineUpdates.y2);
          } else {
            // Fallback: regenerate
            const newX = lineUpdates.x ?? el.x;
            const newY = lineUpdates.y ?? el.y;
            const newX2 = lineUpdates.x2 ?? el.x2;
            const newY2 = lineUpdates.y2 ?? el.y2;
            lineUpdates.waypoints = buildOrthogonalWaypoints(newX, newY, newX2, newY2);
          }
        }
        state.updateElement(id, lineUpdates);
      }
    }

    renderer.markDirty();
  }

  _handleResize(worldX, worldY, shiftKey, store, renderer) {
    const state = store.getState();
    const el = state.elements[this.resizeElementId];

    // Line endpoint dragging
    if (el && el.type === 'line') {
      this._handleLineEndpointDrag(worldX, worldY, shiftKey, store, renderer);
      return;
    }

    const dx = worldX - this.dragStartWorld.x;
    const dy = worldY - this.dragStartWorld.y;

    // Shift inverts default: default is proportional for corners, shift makes it free
    const preserveAspect = ['nw', 'ne', 'sw', 'se'].includes(this.resizeHandle) && !shiftKey;

    const newBounds = calculateResize(this.resizeOriginal, this.resizeHandle, dx, dy, preserveAspect);

    // Snap to grid
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

  _handleLineEndpointDrag(worldX, worldY, shiftKey, store, renderer) {
    const state = store.getState();
    const el = state.elements[this.resizeElementId];
    if (!el) return;

    // Check for connection snap
    const conn = findNearestConnectionPoint(
      worldX, worldY,
      state.elements, state.elementOrder, 20,
      this.resizeElementId
    );

    let ex, ey;
    let connection = null;

    if (conn) {
      ex = conn.x;
      ey = conn.y;
      connection = { elementId: conn.elementId, side: conn.side };
    } else if (shiftKey) {
      // Constrain to 45° angles from the other endpoint
      const otherX = this.resizeHandle === 'line-start' ? el.x2 : el.x;
      const otherY = this.resizeHandle === 'line-start' ? el.y2 : el.y;
      const dx = worldX - otherX;
      const dy = worldY - otherY;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      ex = otherX + len * Math.cos(snappedAngle);
      ey = otherY + len * Math.sin(snappedAngle);
    } else if (state.snapToGrid) {
      const snapped = snapToGrid({ x: worldX, y: worldY }, state.gridSize);
      ex = snapped.x;
      ey = snapped.y;
    } else {
      ex = worldX;
      ey = worldY;
    }

    if (this.resizeHandle === 'line-start') {
      const updates = { x: ex, y: ey, startConnection: connection };
      // Preserve interior waypoints - only update first waypoint and adjust first interior corner
      if (el.lineType === 'orthogonal' && Array.isArray(el.waypoints) && el.waypoints.length >= 2) {
        updates.waypoints = updateStartWaypoint(el.waypoints, ex, ey);
      }
      state.updateElement(this.resizeElementId, updates);
    } else {
      const updates = { x2: ex, y2: ey, endConnection: connection };
      // Preserve interior waypoints - only update last waypoint and adjust last interior corner
      if (el.lineType === 'orthogonal' && Array.isArray(el.waypoints) && el.waypoints.length >= 2) {
        updates.waypoints = updateEndWaypoint(el.waypoints, ex, ey);
      }
      state.updateElement(this.resizeElementId, updates);
    }

    renderer._showConnectionPoints = true;
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
    // Check for rotation handle on selected elements
    for (const id of state.selectedIds) {
      const el = state.elements[id];
      if (!el || el.type === 'line') continue;
      const rotHandle = getRotationHandlePosition(el);
      const dist = Math.hypot(worldX - rotHandle.x, worldY - rotHandle.y);
      if (dist <= rotHandle.radius + 4) {
        return 'grab';
      }
    }

    // Check orthogonal line endpoints first (waypoints-aware)
    for (const id of state.selectedIds) {
      const el = state.elements[id];
      if (!el || el.type !== 'line' || el.lineType !== 'orthogonal' || !Array.isArray(el.waypoints) || el.waypoints.length < 2) continue;
      const threshold = 12 / (state.zoom || 1);
      const first = el.waypoints[0];
      const last = el.waypoints[el.waypoints.length - 1];
      if (Math.hypot(worldX - first.x, worldY - first.y) <= threshold ||
          Math.hypot(worldX - last.x, worldY - last.y) <= threshold) {
        return 'grab';
      }
      // Check interior corners
      if (hitTestOrthogonalCorner(worldX, worldY, el.waypoints, state.zoom || 1) !== null) {
        return 'move';
      }
    }

    // Check straight line midpoint handle (diamond → creates U-bend)
    for (const id of state.selectedIds) {
      const el = state.elements[id];
      if (!el || el.type !== 'line' || (el.lineType && el.lineType !== 'straight')) continue;
      if (hitTestStraightLineMid(worldX, worldY, el, state.zoom || 1)) {
        return 'crosshair';
      }
    }

    // Check for resize handles on selected elements
    for (const id of state.selectedIds) {
      const el = state.elements[id];
      if (!el) continue;
      const handle = hitTestHandles(el, worldX, worldY, 8);
      if (handle) {
        // Line endpoints
        if (handle === 'line-start' || handle === 'line-end') {
          return 'grab';
        }
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

/**
 * Get the world-coordinates of a connection point on a shape.
 */
function getConnectionPointPosition(el, side) {
  if (!el || el.type === 'line' || el.type === 'text') return null;
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;

  switch (side) {
    case 'top': return { x: cx, y: el.y };
    case 'right': return { x: el.x + el.width, y: cy };
    case 'bottom': return { x: cx, y: el.y + el.height };
    case 'left': return { x: el.x, y: cy };
    default: return { x: cx, y: cy };
  }
}
