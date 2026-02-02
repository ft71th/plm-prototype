/**
 * Geometry Utilities
 * Pure functions for spatial calculations on whiteboard elements.
 *
 * Architecture ref: docs/architecture/whiteboard-freeform-drawing.md
 */

// ============================================================
// Bounding Box
// ============================================================

/**
 * Get the axis-aligned bounding box of any element.
 * @param {Object} element - A whiteboard element (shape, text, line)
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function getBoundingBox(element) {
  if (element.type === 'line') {
    const minX = Math.min(element.x, element.x2);
    const minY = Math.min(element.y, element.y2);
    const maxX = Math.max(element.x, element.x2);
    const maxY = Math.max(element.y, element.y2);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  return { x: element.x, y: element.y, width: element.width, height: element.height };
}

/**
 * Get bounding box that encompasses multiple elements.
 */
export function getCombinedBoundingBox(elements) {
  if (!elements || elements.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const el of elements) {
    const bb = getBoundingBox(el);
    minX = Math.min(minX, bb.x);
    minY = Math.min(minY, bb.y);
    maxX = Math.max(maxX, bb.x + bb.width);
    maxY = Math.max(maxY, bb.y + bb.height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ============================================================
// Hit Testing
// ============================================================

/**
 * Test if a point is inside an element.
 * Shape-variant-aware: rectangles use box test, ellipses use ellipse equation, etc.
 *
 * @param {Object} element - The whiteboard element
 * @param {number} px - Point X in canvas coordinates
 * @param {number} py - Point Y in canvas coordinates
 * @returns {boolean}
 */
export function hitTest(element, px, py) {
  if (element.type === 'line') {
    return hitTestLine(element, px, py, 6);
  }

  if (element.type === 'text' || element.type === 'group') {
    return hitTestRect(element.x, element.y, element.width, element.height, px, py);
  }

  // Shapes — variant-specific
  switch (element.shapeVariant) {
    case 'ellipse':
      return hitTestEllipse(element, px, py);
    case 'diamond':
      return hitTestDiamond(element, px, py);
    case 'triangle':
      return hitTestTriangle(element, px, py);
    case 'hexagon':
      return hitTestHexagon(element, px, py);
    case 'rectangle':
    case 'rounded-rectangle':
    default:
      return hitTestRect(element.x, element.y, element.width, element.height, px, py);
  }
}

function hitTestRect(x, y, width, height, px, py) {
  return px >= x && px <= x + width && py >= y && py <= y + height;
}

function hitTestEllipse(element, px, py) {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const rx = element.width / 2;
  const ry = element.height / 2;
  if (rx === 0 || ry === 0) return false;
  const dx = (px - cx) / rx;
  const dy = (py - cy) / ry;
  return (dx * dx + dy * dy) <= 1;
}

function hitTestDiamond(element, px, py) {
  // Diamond is a rotated rectangle — test using manhattan distance from center
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const halfW = element.width / 2;
  const halfH = element.height / 2;
  if (halfW === 0 || halfH === 0) return false;
  const dx = Math.abs(px - cx) / halfW;
  const dy = Math.abs(py - cy) / halfH;
  return (dx + dy) <= 1;
}

function hitTestTriangle(element, px, py) {
  // Isoceles triangle: top-center, bottom-left, bottom-right
  const x1 = element.x + element.width / 2, y1 = element.y;
  const x2 = element.x, y2 = element.y + element.height;
  const x3 = element.x + element.width, y3 = element.y + element.height;
  return pointInTriangle(px, py, x1, y1, x2, y2, x3, y3);
}

function hitTestHexagon(element, px, py) {
  // Regular hexagon — approximate with bounding box shrunk by 25% at sides
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const halfW = element.width / 2;
  const halfH = element.height / 2;
  // Check bounding box first
  if (!hitTestRect(element.x, element.y, element.width, element.height, px, py)) return false;
  // Hexagon edges cut corners — use manhattan-like distance
  const dx = Math.abs(px - cx) / halfW;
  const dy = Math.abs(py - cy) / halfH;
  return (dx + dy * 0.5) <= 1 && dy <= 1;
}

function hitTestLine(line, px, py, tolerance) {
  // Distance from point to line segment
  const dist = distanceToLineSegment(line.x, line.y, line.x2, line.y2, px, py);
  return dist <= tolerance;
}

function distanceToLineSegment(x1, y1, x2, y2, px, py) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  return Math.hypot(px - closestX, py - closestY);
}

function pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  const sign = (px, py, x1, y1, x2, y2) =>
    (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);

  const d1 = sign(px, py, x1, y1, x2, y2);
  const d2 = sign(px, py, x2, y2, x3, y3);
  const d3 = sign(px, py, x3, y3, x1, y1);

  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}

// ============================================================
// Resize Handles
// ============================================================

/**
 * Handle positions: nw, n, ne, e, se, s, sw, w
 * Returns the position of each handle for a given element.
 */
export function getHandlePositions(element) {
  const bb = getBoundingBox(element);
  const { x, y, width: w, height: h } = bb;
  return {
    nw: { x: x, y: y },
    n:  { x: x + w / 2, y: y },
    ne: { x: x + w, y: y },
    e:  { x: x + w, y: y + h / 2 },
    se: { x: x + w, y: y + h },
    s:  { x: x + w / 2, y: y + h },
    sw: { x: x, y: y + h },
    w:  { x: x, y: y + h / 2 },
  };
}

/**
 * Test if a point hits a resize handle.
 * @returns {string|null} Handle position ('nw', 'ne', etc.) or null
 */
export function hitTestHandles(element, px, py, handleSize = 8) {
  if (element.type === 'line') return null; // Lines don't have resize handles (yet)

  const handles = getHandlePositions(element);
  const half = handleSize / 2;

  for (const [pos, point] of Object.entries(handles)) {
    if (
      px >= point.x - half && px <= point.x + half &&
      py >= point.y - half && py <= point.y + half
    ) {
      return pos;
    }
  }
  return null;
}

/**
 * Calculate new bounds after a resize drag.
 *
 * @param {{ x, y, width, height }} original - Original bounding box
 * @param {string} handle - Which handle is being dragged ('nw', 'se', etc.)
 * @param {number} deltaX - Mouse delta X
 * @param {number} deltaY - Mouse delta Y
 * @param {boolean} preserveAspect - Maintain aspect ratio
 * @returns {{ x, y, width, height }}
 */
export function calculateResize(original, handle, deltaX, deltaY, preserveAspect) {
  let { x, y, width, height } = original;
  const minSize = 10;

  switch (handle) {
    case 'se':
      width += deltaX;
      height += deltaY;
      break;
    case 'sw':
      x += deltaX;
      width -= deltaX;
      height += deltaY;
      break;
    case 'ne':
      width += deltaX;
      y += deltaY;
      height -= deltaY;
      break;
    case 'nw':
      x += deltaX;
      width -= deltaX;
      y += deltaY;
      height -= deltaY;
      break;
    case 'e':
      width += deltaX;
      break;
    case 'w':
      x += deltaX;
      width -= deltaX;
      break;
    case 's':
      height += deltaY;
      break;
    case 'n':
      y += deltaY;
      height -= deltaY;
      break;
  }

  if (preserveAspect && original.width > 0 && original.height > 0) {
    const aspect = original.width / original.height;
    // For corner handles, use the larger delta to determine size
    if (['nw', 'ne', 'sw', 'se'].includes(handle)) {
      const newW = Math.max(width, minSize);
      const newH = newW / aspect;
      // Adjust position for top/left handles
      if (handle.includes('n')) {
        y = original.y + original.height - newH;
      }
      if (handle.includes('w')) {
        x = original.x + original.width - newW;
      }
      width = newW;
      height = newH;
    }
  }

  // Clamp minimum size
  if (width < minSize) {
    if (['nw', 'w', 'sw'].includes(handle)) {
      x = original.x + original.width - minSize;
    }
    width = minSize;
  }
  if (height < minSize) {
    if (['nw', 'n', 'ne'].includes(handle)) {
      y = original.y + original.height - minSize;
    }
    height = minSize;
  }

  return { x, y, width, height };
}

// ============================================================
// Snap to Grid
// ============================================================

/**
 * Snap a point to the nearest grid position.
 */
export function snapToGrid(point, gridSize) {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

// ============================================================
// Alignment Guides
// ============================================================

/**
 * Calculate alignment guides for a moving element vs all other elements.
 *
 * @param {{ x, y, width, height }} movingBox - Bounding box of moving element(s)
 * @param {Array<{ x, y, width, height }>} otherBoxes - Other element bounding boxes
 * @param {number} threshold - Snap distance in pixels (default 5)
 * @returns {Array<{ type: 'vertical'|'horizontal', position: number, from: number, to: number }>}
 */
export function getAlignmentGuides(movingBox, otherBoxes, threshold = 5) {
  const guides = [];
  const movingCx = movingBox.x + movingBox.width / 2;
  const movingCy = movingBox.y + movingBox.height / 2;
  const movingRight = movingBox.x + movingBox.width;
  const movingBottom = movingBox.y + movingBox.height;

  for (const other of otherBoxes) {
    const otherCx = other.x + other.width / 2;
    const otherCy = other.y + other.height / 2;
    const otherRight = other.x + other.width;
    const otherBottom = other.y + other.height;

    // Vertical guides (x-axis alignment)
    const vChecks = [
      { moving: movingBox.x, other: other.x, label: 'left-left' },
      { moving: movingBox.x, other: otherRight, label: 'left-right' },
      { moving: movingRight, other: other.x, label: 'right-left' },
      { moving: movingRight, other: otherRight, label: 'right-right' },
      { moving: movingCx, other: otherCx, label: 'center-center' },
    ];

    for (const check of vChecks) {
      if (Math.abs(check.moving - check.other) <= threshold) {
        guides.push({
          type: 'vertical',
          position: check.other,
          from: Math.min(movingBox.y, other.y),
          to: Math.max(movingBottom, otherBottom),
        });
      }
    }

    // Horizontal guides (y-axis alignment)
    const hChecks = [
      { moving: movingBox.y, other: other.y, label: 'top-top' },
      { moving: movingBox.y, other: otherBottom, label: 'top-bottom' },
      { moving: movingBottom, other: other.y, label: 'bottom-top' },
      { moving: movingBottom, other: otherBottom, label: 'bottom-bottom' },
      { moving: movingCy, other: otherCy, label: 'center-center' },
    ];

    for (const check of hChecks) {
      if (Math.abs(check.moving - check.other) <= threshold) {
        guides.push({
          type: 'horizontal',
          position: check.other,
          from: Math.min(movingBox.x, other.x),
          to: Math.max(movingRight, otherRight),
        });
      }
    }
  }

  return guides;
}

// ============================================================
// Containment
// ============================================================

/**
 * Check if a child bounding box is fully contained within a parent bounding box.
 */
export function isContainedWithin(childBox, parentBox) {
  return (
    childBox.x >= parentBox.x &&
    childBox.y >= parentBox.y &&
    childBox.x + childBox.width <= parentBox.x + parentBox.width &&
    childBox.y + childBox.height <= parentBox.y + parentBox.height
  );
}

// ============================================================
// Lasso selection
// ============================================================

/**
 * Check if an element's bounding box intersects with a selection rectangle.
 */
export function intersectsRect(elementBox, selectionBox) {
  return !(
    elementBox.x + elementBox.width < selectionBox.x ||
    selectionBox.x + selectionBox.width < elementBox.x ||
    elementBox.y + elementBox.height < selectionBox.y ||
    selectionBox.y + selectionBox.height < elementBox.y
  );
}

// ============================================================
// Utility
// ============================================================

/**
 * Clamp a value between min and max.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generate a unique ID.
 */
export function generateId(prefix = 'el') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
