/**
 * TrimTool — AutoCAD-style trim tool for whiteboard.
 * 
 * Usage:
 * 1. Select Trim tool (scissors icon)
 * 2. Click on the part of a shape you want to remove
 * 3. The tool finds intersections with other shapes
 * 4. Removes the segment between the two nearest intersection points
 * 
 * Supports: ellipse, rectangle, rounded-rectangle, diamond, triangle,
 *           hexagon, line, and path elements.
 */

// ─── Constants ────────────────────────────────────────────
const ELLIPSE_SAMPLES = 120;      // Points to approximate an ellipse
const SHAPE_SAMPLES = 200;        // Points for general shapes
const HIT_TOLERANCE = 8;          // Pixels tolerance for clicking on a shape
const INTERSECTION_MERGE = 3;     // Merge intersections within N pixels

// ─── Main Tool Class ──────────────────────────────────────

export class TrimTool {
  constructor() {
    this.hoveredElement = null;
    this.hoveredSegmentIdx = null;
    this.previewIntersections = [];
    this.previewSegments = [];
    this.previewRemoveIdx = -1;
  }

  onMouseDown(worldX, worldY, shiftKey, store, renderer) {
    const state = store.getState();
    const { elements, elementOrder } = state;

    // Find which element was clicked
    const clickedId = this._hitTest(worldX, worldY, elements, elementOrder);
    if (!clickedId) return;

    const clickedEl = elements[clickedId];
    
    // Convert clicked element to polyline
    const clickedPoly = shapeToPolyline(clickedEl);
    if (!clickedPoly || clickedPoly.length < 2) return;

    // Find all intersections with OTHER elements
    const allIntersections = [];
    
    for (const otherId of elementOrder) {
      if (otherId === clickedId) continue;
      const otherEl = elements[otherId];
      if (!otherEl || !otherEl.visible) continue;
      
      const otherPoly = shapeToPolyline(otherEl);
      if (!otherPoly || otherPoly.length < 2) continue;

      const ixs = findPolylineIntersections(clickedPoly, otherPoly);
      for (const ix of ixs) {
        allIntersections.push({ ...ix, cutterId: otherId });
      }
    }

    if (allIntersections.length < 2) {
      console.log('[Trim] Need at least 2 intersections, found:', allIntersections.length);
      return;
    }

    // Find parameter t along the clicked polyline for each intersection
    // and for the click point
    const clickT = findClosestT(clickedPoly, worldX, worldY);
    
    // Sort intersections by their parameter t
    allIntersections.sort((a, b) => a.tA - b.tA);

    // Merge nearby intersections
    const merged = mergeIntersections(allIntersections);

    // Find the two intersections that bracket the click point
    let leftIdx = -1;
    let rightIdx = -1;
    
    for (let i = 0; i < merged.length; i++) {
      if (merged[i].tA <= clickT) leftIdx = i;
    }
    for (let i = merged.length - 1; i >= 0; i--) {
      if (merged[i].tA >= clickT) rightIdx = i;
    }

    // Handle wrap-around for closed shapes
    const isClosed = isClosedPolyline(clickedPoly);
    
    if (leftIdx === -1 && isClosed) {
      leftIdx = merged.length - 1; // Wrap to last
    }
    if (rightIdx === -1 && isClosed) {
      rightIdx = 0; // Wrap to first
    }

    if (leftIdx === -1 || rightIdx === -1 || leftIdx === rightIdx) {
      // For closed shapes, if click is before first or after last intersection
      if (isClosed && merged.length >= 2) {
        if (leftIdx === -1) { leftIdx = merged.length - 1; rightIdx = 0; }
        else if (rightIdx === -1) { leftIdx = merged.length - 1; rightIdx = 0; }
        else if (leftIdx === rightIdx) {
          // Click exactly at an intersection
          return;
        }
      } else {
        console.log('[Trim] Click not between two intersections');
        return;
      }
    }

    const leftT = merged[leftIdx].tA;
    const rightT = merged[rightIdx].tA;
    // Keep exact intersection coordinates so endpoints snap precisely
    const leftPt = { x: merged[leftIdx].x, y: merged[leftIdx].y };
    const rightPt = { x: merged[rightIdx].x, y: merged[rightIdx].y };

    console.log(`[Trim] Removing segment between t=${leftT.toFixed(3)} and t=${rightT.toFixed(3)} (click at t=${clickT.toFixed(3)})`);

    // Split the polyline: keep everything EXCEPT the segment between leftT and rightT
    const remainingSegments = splitAndRemove(clickedPoly, leftT, rightT, isClosed, leftPt, rightPt);

    if (remainingSegments.length === 0) {
      console.log('[Trim] Nothing remaining after trim');
      return;
    }

    // Replace the original element with path elements for remaining segments
    const newElements = {};
    const newOrder = [];
    const generateId = () => `trim-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    for (const seg of remainingSegments) {
      if (seg.length < 2) continue;
      
      const id = generateId();
      
      // Compute bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of seg) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }

      newElements[id] = {
        type: 'path',
        id,
        stroke: clickedEl.stroke || '#000000',
        strokeWidth: clickedEl.strokeWidth || 2,
        fill: 'none',
        // Points must be relative to element's (x, y) position,
        // since the renderer applies x/y as a transform offset
        points: seg.map(p => ({ x: p.x - minX, y: p.y - minY })),
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        zIndex: clickedEl.zIndex || 0,
        groupId: clickedEl.groupId || null,
        parentId: clickedEl.parentId || null,
        locked: false,
        visible: true,
        layer: clickedEl.layer || 'default',
      };
      newOrder.push(id);
    }

    // Apply changes: remove old element, add new paths
    store.setState(prev => {
      const els = { ...prev.elements };
      const order = [...prev.elementOrder];
      
      // Remove original
      const origIdx = order.indexOf(clickedId);
      delete els[clickedId];
      order.splice(origIdx, 1);

      // Add new segments at same position
      for (let i = 0; i < newOrder.length; i++) {
        els[newOrder[i]] = newElements[newOrder[i]];
        order.splice(origIdx + i, 0, newOrder[i]);
      }

      return { elements: els, elementOrder: order };
    });

    console.log(`[Trim] Replaced "${clickedId}" with ${newOrder.length} path segment(s)`);
  }

  onMouseMove(worldX, worldY, shiftKey, store, renderer) {
    // Show preview: highlight which segment would be removed
    const state = store.getState();
    const { elements, elementOrder } = state;

    const hoveredId = this._hitTest(worldX, worldY, elements, elementOrder);
    this.hoveredElement = hoveredId;
    
    if (renderer) renderer.markDirty();
  }

  onMouseUp(worldX, worldY, shiftKey, store, renderer) {
    // Nothing needed - all action happens in onMouseDown
  }

  getCursor(worldX, worldY, state) {
    if (this.hoveredElement) return 'crosshair';
    return 'default';
  }

  /**
   * Render trim preview overlay
   */
  renderOverlay(ctx, state) {
    // Could show intersection points preview here
  }

  // ─── Hit Test ─────────────────────────────────────────

  _hitTest(worldX, worldY, elements, elementOrder) {
    // Find the topmost visible element near the click point
    for (let i = elementOrder.length - 1; i >= 0; i--) {
      const id = elementOrder[i];
      const el = elements[id];
      if (!el || !el.visible || el.locked) continue;
      if (el.type === 'text' || el.type === 'image' || el.type === 'frame') continue;

      const poly = shapeToPolyline(el);
      if (!poly || poly.length < 2) continue;

      const dist = distToPolyline(worldX, worldY, poly);
      if (dist < HIT_TOLERANCE + (el.strokeWidth || 2)) {
        return id;
      }
    }
    return null;
  }
}


// ═══════════════════════════════════════════════════════════
// GEOMETRY UTILITIES
// ═══════════════════════════════════════════════════════════

/**
 * Convert any shape element to a polyline (array of {x,y} points).
 * Closed shapes have first point ≈ last point.
 */
export function shapeToPolyline(el) {
  if (el.type === 'shape') return shapeVariantToPolyline(el);
  if (el.type === 'line') return lineToPolyline(el);
  if (el.type === 'path') return el.points && el.points.length >= 2 ? [...el.points] : null;
  return null;
}

function shapeVariantToPolyline(el) {
  const { x, y, width, height, shapeVariant, cornerRadius } = el;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const rx = width / 2;
  const ry = height / 2;

  switch (shapeVariant) {
    case 'ellipse': {
      const pts = [];
      for (let i = 0; i <= ELLIPSE_SAMPLES; i++) {
        const angle = (i / ELLIPSE_SAMPLES) * Math.PI * 2;
        pts.push({
          x: cx + rx * Math.cos(angle),
          y: cy + ry * Math.sin(angle),
        });
      }
      return pts;
    }

    case 'rectangle': {
      return [
        { x, y }, { x: x + width, y },
        { x: x + width, y: y + height }, { x, y: y + height },
        { x, y }, // close
      ];
    }

    case 'rounded-rectangle': {
      const r = Math.min(cornerRadius || 8, width / 2, height / 2);
      const pts = [];
      const arcSteps = 8;
      // Top edge
      pts.push({ x: x + r, y });
      pts.push({ x: x + width - r, y });
      // Top-right corner
      for (let i = 0; i <= arcSteps; i++) {
        const a = -Math.PI / 2 + (Math.PI / 2) * (i / arcSteps);
        pts.push({ x: x + width - r + r * Math.cos(a), y: y + r + r * Math.sin(a) });
      }
      // Right edge
      pts.push({ x: x + width, y: y + height - r });
      // Bottom-right corner
      for (let i = 0; i <= arcSteps; i++) {
        const a = 0 + (Math.PI / 2) * (i / arcSteps);
        pts.push({ x: x + width - r + r * Math.cos(a), y: y + height - r + r * Math.sin(a) });
      }
      // Bottom edge
      pts.push({ x: x + r, y: y + height });
      // Bottom-left corner
      for (let i = 0; i <= arcSteps; i++) {
        const a = Math.PI / 2 + (Math.PI / 2) * (i / arcSteps);
        pts.push({ x: x + r + r * Math.cos(a), y: y + height - r + r * Math.sin(a) });
      }
      // Left edge
      pts.push({ x, y: y + r });
      // Top-left corner
      for (let i = 0; i <= arcSteps; i++) {
        const a = Math.PI + (Math.PI / 2) * (i / arcSteps);
        pts.push({ x: x + r + r * Math.cos(a), y: y + r + r * Math.sin(a) });
      }
      pts.push(pts[0]); // close
      return pts;
    }

    case 'diamond': {
      return [
        { x: cx, y },            // top
        { x: x + width, y: cy }, // right
        { x: cx, y: y + height },// bottom
        { x, y: cy },            // left
        { x: cx, y },            // close
      ];
    }

    case 'triangle': {
      return [
        { x: cx, y },            // top
        { x: x + width, y: y + height }, // bottom-right
        { x, y: y + height },    // bottom-left
        { x: cx, y },            // close
      ];
    }

    case 'hexagon': {
      const pts = [];
      for (let i = 0; i <= 6; i++) {
        const angle = (Math.PI / 3) * (i % 6) - Math.PI / 2;
        pts.push({
          x: cx + rx * Math.cos(angle),
          y: cy + ry * Math.sin(angle),
        });
      }
      return pts;
    }

    default:
      // Fallback: rectangle
      return [
        { x, y }, { x: x + width, y },
        { x: x + width, y: y + height }, { x, y: y + height },
        { x, y },
      ];
  }
}

function lineToPolyline(el) {
  const x1 = el.x || 0;
  const y1 = el.y || 0;
  const x2 = el.x2 ?? (x1 + (el.width || 0));
  const y2 = el.y2 ?? (y1 + (el.height || 0));
  
  // Handle waypoints for routed lines
  if (el.waypoints && el.waypoints.length > 0) {
    return [{ x: x1, y: y1 }, ...el.waypoints, { x: x2, y: y2 }];
  }
  
  return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
}


// ─── Intersection Finding ──────────────────────────────────

/**
 * Find all intersection points between two polylines.
 * Returns array of { x, y, tA, tB } where tA/tB are parameter along each polyline [0..1].
 */
function findPolylineIntersections(polyA, polyB) {
  const intersections = [];
  const totalLenA = polylineLength(polyA);
  const totalLenB = polylineLength(polyB);
  
  let cumLenA = 0;
  
  for (let i = 0; i < polyA.length - 1; i++) {
    const a1 = polyA[i];
    const a2 = polyA[i + 1];
    const segLenA = Math.hypot(a2.x - a1.x, a2.y - a1.y);
    
    let cumLenB = 0;
    
    for (let j = 0; j < polyB.length - 1; j++) {
      const b1 = polyB[j];
      const b2 = polyB[j + 1];
      const segLenB = Math.hypot(b2.x - b1.x, b2.y - b1.y);
      
      const ix = segmentIntersection(a1, a2, b1, b2);
      if (ix) {
        const tA = (cumLenA + ix.tA * segLenA) / totalLenA;
        const tB = (cumLenB + ix.tB * segLenB) / totalLenB;
        intersections.push({ x: ix.x, y: ix.y, tA, tB });
      }
      
      cumLenB += segLenB;
    }
    
    cumLenA += segLenA;
  }
  
  return intersections;
}

/**
 * Segment-segment intersection.
 * Returns { x, y, tA, tB } or null.
 */
function segmentIntersection(p1, p2, p3, p4) {
  const dx1 = p2.x - p1.x;
  const dy1 = p2.y - p1.y;
  const dx2 = p4.x - p3.x;
  const dy2 = p4.y - p3.y;
  
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-10) return null; // Parallel
  
  const t = ((p3.x - p1.x) * dy2 - (p3.y - p1.y) * dx2) / denom;
  const u = ((p3.x - p1.x) * dy1 - (p3.y - p1.y) * dx1) / denom;
  
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  
  return {
    x: p1.x + t * dx1,
    y: p1.y + t * dy1,
    tA: t,
    tB: u,
  };
}


// ─── Polyline Utilities ────────────────────────────────────

function polylineLength(poly) {
  let len = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    len += Math.hypot(poly[i + 1].x - poly[i].x, poly[i + 1].y - poly[i].y);
  }
  return len;
}

function isClosedPolyline(poly) {
  if (poly.length < 3) return false;
  const first = poly[0];
  const last = poly[poly.length - 1];
  return Math.hypot(first.x - last.x, first.y - last.y) < 2;
}

/**
 * Find the parameter t [0..1] of the closest point on the polyline to (px, py).
 */
function findClosestT(poly, px, py) {
  const totalLen = polylineLength(poly);
  let bestDist = Infinity;
  let bestT = 0;
  let cumLen = 0;

  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (segLen < 0.001) { cumLen += segLen; continue; }

    // Project point onto segment
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let t = ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));

    const closestX = a.x + t * dx;
    const closestY = a.y + t * dy;
    const dist = Math.hypot(px - closestX, py - closestY);

    if (dist < bestDist) {
      bestDist = dist;
      bestT = (cumLen + t * segLen) / totalLen;
    }

    cumLen += segLen;
  }

  return bestT;
}

/**
 * Distance from point to polyline.
 */
function distToPolyline(px, py, poly) {
  let minDist = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const d = distToSegment(px, py, poly[i], poly[i + 1]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function distToSegment(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 0.001) return Math.hypot(px - a.x, py - a.y);

  let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}


// ─── Merge & Split ─────────────────────────────────────────

/**
 * Merge intersection points that are very close together.
 */
function mergeIntersections(intersections) {
  if (intersections.length === 0) return [];
  
  const merged = [intersections[0]];
  for (let i = 1; i < intersections.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = intersections[i];
    const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    if (dist > INTERSECTION_MERGE) {
      merged.push(curr);
    }
  }
  return merged;
}

/**
 * Split a polyline by removing the segment between tLeft and tRight.
 * Returns array of remaining polyline segments.
 * 
 * For closed shapes: keeps the part OUTSIDE [tLeft, tRight]
 * For open shapes: keeps both ends (before tLeft and after tRight)
 */
function splitAndRemove(poly, tLeft, tRight, isClosed, leftPt, rightPt) {
  const totalLen = polylineLength(poly);
  
  // Get the actual point on the polyline at parameter t
  const pointAtT = (t) => {
    const targetLen = t * totalLen;
    let cumLen = 0;
    for (let i = 0; i < poly.length - 1; i++) {
      const segLen = Math.hypot(poly[i + 1].x - poly[i].x, poly[i + 1].y - poly[i].y);
      if (cumLen + segLen >= targetLen - 0.001) {
        const frac = segLen > 0.001 ? (targetLen - cumLen) / segLen : 0;
        return {
          x: poly[i].x + frac * (poly[i + 1].x - poly[i].x),
          y: poly[i].y + frac * (poly[i + 1].y - poly[i].y),
        };
      }
      cumLen += segLen;
    }
    return poly[poly.length - 1];
  };

  // Use exact intersection points if provided, otherwise fall back to pointAtT
  const exactLeftPt = leftPt || pointAtT(tLeft);
  const exactRightPt = rightPt || pointAtT(tRight);

  // Get all points within a t-range, plus exact endpoints
  const getSegment = (t0, t1, startPt, endPt) => {
    const pts = [startPt || pointAtT(t0)];
    let cumLen = 0;
    
    for (let i = 0; i < poly.length - 1; i++) {
      const segLen = Math.hypot(poly[i + 1].x - poly[i].x, poly[i + 1].y - poly[i].y);
      const tStart = cumLen / totalLen;
      const tEnd = (cumLen + segLen) / totalLen;
      
      // Add interior points that fall within [t0, t1]
      if (tEnd > t0 + 0.001 && tStart < t1 - 0.001) {
        if (tEnd <= t1 + 0.001) {
          pts.push({ x: poly[i + 1].x, y: poly[i + 1].y });
        }
      }
      
      cumLen += segLen;
    }
    
    pts.push(endPt || pointAtT(t1));
    return pts;
  };

  if (isClosed) {
    // For closed shape: keep the segment from tRight → wrap → tLeft
    if (tRight > tLeft) {
      // Normal case: remove [tLeft, tRight], keep [tRight, 1] + [0, tLeft]
      const seg1 = getSegment(tRight, 1.0, exactRightPt, null);
      const seg2 = getSegment(0, tLeft, null, exactLeftPt);
      // Merge: seg1 end ≈ seg2 start (both near the closure point)
      return [[ ...seg1, ...seg2.slice(1) ]];
    } else {
      // Wrapped case: tRight < tLeft means remove wraps around
      return [getSegment(tRight, tLeft, exactRightPt, exactLeftPt)];
    }
  } else {
    // Open shape: keep [0, tLeft] and [tRight, 1]
    const segments = [];
    if (tLeft > 0.01) {
      segments.push(getSegment(0, tLeft, null, exactLeftPt));
    }
    if (tRight < 0.99) {
      segments.push(getSegment(tRight, 1.0, exactRightPt, null));
    }
    return segments;
  }
}
