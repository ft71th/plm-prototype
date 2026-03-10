/**
 * LineRenderer — Draws line/connection elements on Canvas 2D context.
 *
 * Supports:
 * - Straight lines and quadratic bézier curves
 * - Orthogonal lines with waypoints (lineType: 'orthogonal', waypoints: [{x,y},...])
 * - Arrow heads: none, arrow, diamond, circle
 * - Line styles: solid, dashed, dotted
 * - Labels (text on line midpoint)
 * - Connection endpoints (visual indicator when connected to shapes)
 */

// ─── Orthogonal (right-angle) line helpers ────────────────

/**
 * Build default waypoints for an orthogonal line (L-shape via horizontal mid).
 */
export function buildOrthogonalWaypoints(x, y, x2, y2) {
  const midX = (x + x2) / 2;
  return [
    { x, y },
    { x: midX, y },
    { x: midX, y: y2 },
    { x: x2, y: y2 },
  ];
}

/**
 * Render orthogonal bend handles on screen (called from CanvasRenderer when line is selected).
 * - Large filled circles at interior corner waypoints (drag = move that corner)
 * - Small squares at segment midpoints (drag = move whole segment perpendicular)
 */
export function renderOrthogonalHandles(ctx, waypoints, zoom) {
  if (!waypoints || waypoints.length < 2) return;
  ctx.save();
  const segHandleSize = 7 / zoom;
  const cornerR = 6 / zoom;

  // ── Segment midpoint squares (move whole segment) ──────
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5 / zoom;
    ctx.beginPath();
    ctx.rect(mx - segHandleSize / 2, my - segHandleSize / 2, segHandleSize, segHandleSize);
    ctx.fill();
    ctx.stroke();
  }

  // ── Corner circles (move single corner) ───────────────
  // Skip first and last points (they are endpoints, handled separately)
  for (let i = 1; i < waypoints.length - 1; i++) {
    const p = waypoints[i];
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 / zoom;
    ctx.beginPath();
    ctx.arc(p.x, p.y, cornerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Hit-test segment midpoint handles. Returns { segIndex } or null.
 */
export function hitTestOrthogonalSegment(worldX, worldY, waypoints, zoom) {
  if (!waypoints || waypoints.length < 2) return null;
  const threshold = 12 / zoom;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (Math.hypot(worldX - mx, worldY - my) < threshold) return { segIndex: i };
  }
  return null;
}

/**
 * Move an orthogonal segment perpendicular to its direction.
 * Updates the two neighbouring segments to maintain orthogonality.
 */
export function moveOrthogonalSegment(waypoints, segIndex, dx, dy) {
  const pts = waypoints.map((p) => ({ ...p }));
  const a = pts[segIndex], b = pts[segIndex + 1];
  const isHorizontal = Math.abs(a.y - b.y) < 1;

  if (isHorizontal) {
    // Horizontal segment: move vertically
    pts[segIndex] = { ...a, y: a.y + dy };
    pts[segIndex + 1] = { ...b, y: b.y + dy };
    // Extend adjacent vertical segments
    if (segIndex > 0) pts[segIndex - 1] = { ...pts[segIndex - 1], y: pts[segIndex - 1].y };
    if (segIndex + 2 < pts.length) pts[segIndex + 2] = { ...pts[segIndex + 2], y: pts[segIndex + 2].y };
  } else {
    // Vertical segment: move horizontally
    pts[segIndex] = { ...a, x: a.x + dx };
    pts[segIndex + 1] = { ...b, x: b.x + dx };
  }
  return pts;
}

/**
 * Insert a new bend into an orthogonal polyline at segment segIndex.
 */
export function insertOrthogonalBend(waypoints, segIndex) {
  const a = waypoints[segIndex], b = waypoints[segIndex + 1];
  const isHorizontal = Math.abs(a.y - b.y) < 1;
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const offset = 30;

  let newPts;
  if (isHorizontal) {
    newPts = [
      ...waypoints.slice(0, segIndex + 1),
      { x: midX, y: a.y },
      { x: midX, y: a.y + offset },
      { x: midX, y: b.y },
      ...waypoints.slice(segIndex + 1),
    ];
  } else {
    newPts = [
      ...waypoints.slice(0, segIndex + 1),
      { x: a.x, y: midY },
      { x: a.x + offset, y: midY },
      { x: b.x, y: midY },
      ...waypoints.slice(segIndex + 1),
    ];
  }
  return newPts;
}

/**
 * Update only the START endpoint (waypoints[0]) of an orthogonal line,
 * keeping all interior corners intact. Adjusts the first interior corner
 * to maintain orthogonality with the new start position.
 */
export function updateStartWaypoint(waypoints, newX, newY) {
  if (!waypoints || waypoints.length < 2) return [{ x: newX, y: newY }, { x: newX, y: newY }];
  const pts = waypoints.map((p) => ({ ...p }));
  pts[0] = { x: newX, y: newY };

  if (pts.length >= 3) {
    // Segment 0→1: maintain orthogonality
    const seg0IsH = Math.abs(waypoints[1].y - waypoints[0].y) < Math.abs(waypoints[1].x - waypoints[0].x);
    if (seg0IsH) {
      pts[1] = { ...pts[1], y: newY }; // keep horizontal → adjust Y
    } else {
      pts[1] = { ...pts[1], x: newX }; // keep vertical → adjust X
    }
  } else {
    // Only 2 points: update end to maintain straight orthogonal
    const seg0IsH = Math.abs(waypoints[1].y - waypoints[0].y) < Math.abs(waypoints[1].x - waypoints[0].x);
    if (seg0IsH) {
      pts[1] = { ...pts[1], y: newY };
    } else {
      pts[1] = { ...pts[1], x: newX };
    }
  }
  return pts;
}

/**
 * Update only the END endpoint (waypoints[last]) of an orthogonal line,
 * keeping all interior corners intact. Adjusts the second-to-last interior
 * corner to maintain orthogonality with the new end position.
 */
export function updateEndWaypoint(waypoints, newX, newY) {
  if (!waypoints || waypoints.length < 2) return [{ x: newX, y: newY }, { x: newX, y: newY }];
  const pts = waypoints.map((p) => ({ ...p }));
  const last = pts.length - 1;
  pts[last] = { x: newX, y: newY };

  if (pts.length >= 3) {
    // Segment (last-1)→last: maintain orthogonality
    const lastSegIsH = Math.abs(waypoints[last].y - waypoints[last - 1].y) < Math.abs(waypoints[last].x - waypoints[last - 1].x);
    if (lastSegIsH) {
      pts[last - 1] = { ...pts[last - 1], y: newY }; // keep horizontal → adjust Y
    } else {
      pts[last - 1] = { ...pts[last - 1], x: newX }; // keep vertical → adjust X
    }
  } else {
    const lastSegIsH = Math.abs(waypoints[last].y - waypoints[last - 1].y) < Math.abs(waypoints[last].x - waypoints[last - 1].x);
    if (lastSegIsH) {
      pts[last - 1] = { ...pts[last - 1], y: newY };
    } else {
      pts[last - 1] = { ...pts[last - 1], x: newX };
    }
  }
  return pts;
}



/**
 * Hit-test INTERIOR corner waypoints (not the endpoints).
 * Returns the index of the waypoint hit, or null.
 */
export function hitTestOrthogonalCorner(worldX, worldY, waypoints, zoom) {
  if (!waypoints || waypoints.length < 3) return null;
  const threshold = 10 / zoom;
  for (let i = 1; i < waypoints.length - 1; i++) {
    const p = waypoints[i];
    if (Math.hypot(worldX - p.x, worldY - p.y) < threshold) return i;
  }
  return null;
}

/**
 * Move a single interior corner waypoint to (newX, newY), adjusting adjacent
 * interior corners to maintain orthogonality. Endpoints are never moved.
 */
export function moveOrthogonalCorner(waypoints, cornerIdx, newX, newY) {
  const pts = waypoints.map((p) => ({ ...p }));
  const i = cornerIdx;
  if (i <= 0 || i >= pts.length - 1) return pts;

  const prev = waypoints[i - 1];
  const curr = waypoints[i];

  // Determine if the segment TO the previous point is horizontal or vertical
  const prevDx = Math.abs(curr.x - prev.x);
  const prevDy = Math.abs(curr.y - prev.y);
  const prevIsH = prevDx >= prevDy; // segment before this corner is horizontal

  // Move the corner
  pts[i] = { x: newX, y: newY };

  // Adjust the PREVIOUS interior corner (not start endpoint)
  if (i - 1 > 0) {
    if (prevIsH) {
      pts[i - 1] = { ...pts[i - 1], y: newY }; // keep prev→curr horizontal: match Y
    } else {
      pts[i - 1] = { ...pts[i - 1], x: newX }; // keep prev→curr vertical: match X
    }
  }

  // Adjust the NEXT interior corner (not end endpoint)
  if (i + 1 < pts.length - 1) {
    if (prevIsH) {
      pts[i + 1] = { ...pts[i + 1], x: newX }; // next segment is V: match X
    } else {
      pts[i + 1] = { ...pts[i + 1], y: newY }; // next segment is H: match Y
    }
  }

  return pts;
}

/**
 * Insert a new waypoint on the segment nearest to (worldX, worldY).
 * Splits that segment at the click position, maintaining orthogonality
 * by snapping to the segment's axis.
 */
export function addWaypointAt(waypoints, worldX, worldY) {
  if (!waypoints || waypoints.length < 2) return waypoints;

  let bestSeg = 0;
  let bestDist = Infinity;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const d = Math.hypot(worldX - mx, worldY - my);
    if (d < bestDist) { bestDist = d; bestSeg = i; }
  }

  const a = waypoints[bestSeg];
  const b = waypoints[bestSeg + 1];
  const isH = Math.abs(a.y - b.y) < Math.abs(a.x - b.x);

  // Snap the new point onto the segment axis
  const newPt = isH
    ? { x: Math.max(Math.min(worldX, Math.max(a.x, b.x)), Math.min(a.x, b.x)), y: a.y }
    : { x: a.x, y: Math.max(Math.min(worldY, Math.max(a.y, b.y)), Math.min(a.y, b.y)) };

  // Insert 3 points to create a draggable U-bend: a → newPt(−offset) → newPt → newPt(+offset) → b
  // Actually just split into two new corners, giving the user a handle to drag
  const offset = isH ? 30 : 30;
  const mid1 = isH ? { x: newPt.x, y: newPt.y } : { x: newPt.x, y: newPt.y };
  // Simply split: a → newPt → b  (one new interior corner)
  return [
    ...waypoints.slice(0, bestSeg + 1),
    { ...newPt },
    ...waypoints.slice(bestSeg + 1),
  ];
}



/**
 * Render a diamond-shaped midpoint handle on a straight selected line.
 * Dragging this handle converts the line to orthogonal with a U-shape.
 */
export function renderStraightLineMidHandle(ctx, line, zoom) {
  const mx = (line.x + line.x2) / 2;
  const my = (line.y + line.y2) / 2;
  const size = 7 / zoom;

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 1.5 / zoom;
  ctx.beginPath();
  ctx.moveTo(mx, my - size);
  ctx.lineTo(mx + size, my);
  ctx.lineTo(mx, my + size);
  ctx.lineTo(mx - size, my);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Hit-test the midpoint handle on a straight line.
 * Returns true if (worldX, worldY) is within threshold of midpoint.
 */
export function hitTestStraightLineMid(worldX, worldY, line, zoom) {
  const mx = (line.x + line.x2) / 2;
  const my = (line.y + line.y2) / 2;
  const threshold = 12 / zoom;
  return Math.hypot(worldX - mx, worldY - my) < threshold;
}

/**
 * Build U-shape waypoints by dragging the midpoint to (dragX, dragY).
 * Detects whether to route around horizontally or vertically.
 */
export function buildUShapeWaypoints(x, y, x2, y2, dragX, dragY) {
  // Determine primary axis of the line
  const isHorizontal = Math.abs(x2 - x) >= Math.abs(y2 - y);
  if (isHorizontal) {
    // Drag vertically: U goes start → down → across → up → end
    return [
      { x, y },
      { x, y: dragY },
      { x: x2, y: dragY },
      { x: x2, y: y2 },
    ];
  } else {
    // Drag horizontally: U goes start → right → across → left → end
    return [
      { x, y },
      { x: dragX, y },
      { x: dragX, y: y2 },
      { x: x2, y: y2 },
    ];
  }
}



export function renderLine(ctx, line) {
  const { x, y, x2, y2, stroke, strokeWidth, lineStyle, arrowHead } = line;
  if (x === undefined || y === undefined || x2 === undefined || y2 === undefined) return;

  ctx.save();

  // Line style
  ctx.strokeStyle = stroke || '#000000';
  ctx.lineWidth = strokeWidth || 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Dash pattern
  switch (lineStyle) {
    case 'dashed':
      ctx.setLineDash([10, 6]);
      break;
    case 'dotted':
      ctx.setLineDash([3, 4]);
      break;
    default:
      ctx.setLineDash([]);
  }

  // ── Orthogonal line with waypoints ──────────────────────
  if (line.lineType === 'orthogonal' && Array.isArray(line.waypoints) && line.waypoints.length >= 2) {
    const pts = line.waypoints;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow at end
    if (arrowHead && arrowHead !== 'none') {
      const last = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
      drawArrowHead(ctx, last.x, last.y, angle, arrowHead, stroke || '#000000', strokeWidth || 2);
    }
    if (line.arrowTail && line.arrowTail !== 'none') {
      const first = pts[0], second = pts[1];
      const angle = Math.atan2(first.y - second.y, first.x - second.x);
      drawArrowHead(ctx, first.x, first.y, angle, line.arrowTail, stroke || '#000000', strokeWidth || 2);
    }
    if (line.startConnection) drawConnectionDot(ctx, pts[0].x, pts[0].y, stroke || '#000000');
    if (line.endConnection) { const l = pts[pts.length - 1]; drawConnectionDot(ctx, l.x, l.y, stroke || '#000000'); }
    if (line.label && line.label.text) {
      const mid = Math.floor(pts.length / 2);
      const lx = (pts[mid - 1].x + pts[mid].x) / 2;
      const ly = (pts[mid - 1].y + pts[mid].y) / 2;
      renderLineLabelAt(ctx, line, lx, ly);
    }
    ctx.restore();
    return;
  }

  // ── Standard straight / curved line ────────────────────
  // Calculate the control point for bézier curves
  const isCurved = !!line.curvature && line.curvature !== 0;
  let cpx, cpy; // control point

  if (isCurved) {
    const midX = (x + x2) / 2;
    const midY = (y + y2) / 2;
    const dx = x2 - x;
    const dy = y2 - y;
    const len = Math.hypot(dx, dy) || 1;
    // Perpendicular offset
    const nx = -dy / len;
    const ny = dx / len;
    cpx = midX + nx * line.curvature;
    cpy = midY + ny * line.curvature;
  }

  // Draw the line/curve
  ctx.beginPath();
  ctx.moveTo(x, y);

  if (isCurved) {
    ctx.quadraticCurveTo(cpx, cpy, x2, y2);
  } else {
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();

  // Reset dash for arrowheads
  ctx.setLineDash([]);

  // Arrow heads
  if (arrowHead && arrowHead !== 'none') {
    // Calculate angle at the end of the line
    let endAngle;
    if (isCurved) {
      // Tangent at end of quadratic bézier: derivative at t=1
      endAngle = Math.atan2(y2 - cpy, x2 - cpx);
    } else {
      endAngle = Math.atan2(y2 - y, x2 - x);
    }

    drawArrowHead(ctx, x2, y2, endAngle, arrowHead, stroke || '#000000', strokeWidth || 2);
  }

  // Start arrow (if bidirectional)
  if (line.arrowTail && line.arrowTail !== 'none') {
    let startAngle;
    if (isCurved) {
      startAngle = Math.atan2(y - cpy, x - cpx);
    } else {
      startAngle = Math.atan2(y - y2, x - x2);
    }
    drawArrowHead(ctx, x, y, startAngle, line.arrowTail, stroke || '#000000', strokeWidth || 2);
  }

  // Connection point indicators (small circles at endpoints if connected)
  if (line.startConnection) {
    drawConnectionDot(ctx, x, y, stroke || '#000000');
  }
  if (line.endConnection) {
    drawConnectionDot(ctx, x2, y2, stroke || '#000000');
  }

  // Label
  if (line.label && line.label.text) {
    renderLineLabel(ctx, line, isCurved ? { cpx, cpy } : null);
  }

  ctx.restore();
}

// ─── Arrow head variants ──────────────────────────────────

function drawArrowHead(ctx, tipX, tipY, angle, type, color, lineWidth) {
  const size = Math.max(10, lineWidth * 4);

  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  switch (type) {
    case 'arrow':
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size, -size * 0.4);
      ctx.lineTo(-size * 0.7, 0);
      ctx.lineTo(-size, size * 0.4);
      ctx.closePath();
      ctx.fill();
      break;

    case 'open-arrow':
      ctx.beginPath();
      ctx.moveTo(-size, -size * 0.4);
      ctx.lineTo(0, 0);
      ctx.lineTo(-size, size * 0.4);
      ctx.stroke();
      break;

    case 'diamond':
      const ds = size * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-ds, -ds * 0.5);
      ctx.lineTo(-ds * 2, 0);
      ctx.lineTo(-ds, ds * 0.5);
      ctx.closePath();
      ctx.fill();
      break;

    case 'circle':
      const radius = size * 0.3;
      ctx.beginPath();
      ctx.arc(-radius, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      break;

    default:
      break;
  }

  ctx.restore();
}

// ─── Connection indicator dot ─────────────────────────────

function drawConnectionDot(ctx, cx, cy, color) {
  ctx.save();
  ctx.fillStyle = '#2196F3';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// ─── Line label ───────────────────────────────────────────

function renderLineLabel(ctx, line, curve) {
  const { x, y, x2, y2, label } = line;

  // Position at midpoint (or midpoint of curve)
  let lx, ly;
  if (curve) {
    // Quadratic bézier midpoint at t=0.5
    lx = 0.25 * x + 0.5 * curve.cpx + 0.25 * x2;
    ly = 0.25 * y + 0.5 * curve.cpy + 0.25 * y2;
  } else {
    lx = (x + x2) / 2;
    ly = (y + y2) / 2;
  }

  // Offset label above the line
  const offset = label.offset || -14;
  const dx = x2 - x;
  const dy = y2 - y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  lx += nx * offset;
  ly += ny * offset;

  ctx.save();
  const fontSize = label.fontSize || 12;
  ctx.font = `${fontSize}px ${label.fontFamily || 'Inter, system-ui, sans-serif'}`;
  ctx.fillStyle = label.color || '#333333';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Background pill for readability
  const text = label.text;
  const metrics = ctx.measureText(text);
  const padX = 6;
  const padY = 3;
  const bgW = metrics.width + padX * 2;
  const bgH = fontSize + padY * 2;

  ctx.fillStyle = label.background || 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  roundedRect(ctx, lx - bgW / 2, ly - bgH / 2, bgW, bgH, 4);
  ctx.fill();

  // Border
  ctx.strokeStyle = label.borderColor || '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Text
  ctx.fillStyle = label.color || '#333333';
  ctx.fillText(text, lx, ly);

  ctx.restore();
}

function roundedRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ─── Connection point previews (shown during line drawing) ─

export function renderConnectionPoints(ctx, elements, elementOrder, zoom) {
  ctx.save();

  for (const id of elementOrder) {
    const el = elements[id];
    if (!el || !el.visible || el.type === 'line' || el.type === 'text') continue;

    const points = getShapeConnectionPoints(el);
    for (const pt of points) {
      ctx.fillStyle = 'rgba(33, 150, 243, 0.3)';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6 / zoom, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#2196F3';
      ctx.lineWidth = 1.5 / zoom;
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Get the 4 cardinal connection points for a shape element.
 */
export function getShapeConnectionPoints(el) {
  if (!el || el.type === 'line' || el.type === 'text') return [];
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;

  return [
    { x: cx, y: el.y, side: 'top' },             // top
    { x: el.x + el.width, y: cy, side: 'right' }, // right
    { x: cx, y: el.y + el.height, side: 'bottom' }, // bottom
    { x: el.x, y: cy, side: 'left' },              // left
  ];
}

/**
 * Find the nearest connection point on any shape within snap distance.
 * Returns { elementId, side, x, y } or null.
 */
export function findNearestConnectionPoint(worldX, worldY, elements, elementOrder, snapDist = 20, excludeId = null) {
  let best = null;
  let bestDist = snapDist;

  for (const id of elementOrder) {
    if (id === excludeId) continue;
    const el = elements[id];
    if (!el || !el.visible || el.type === 'line' || el.type === 'text') continue;

    const points = getShapeConnectionPoints(el);
    for (const pt of points) {
      const d = Math.hypot(worldX - pt.x, worldY - pt.y);
      if (d < bestDist) {
        bestDist = d;
        best = { elementId: id, side: pt.side, x: pt.x, y: pt.y };
      }
    }
  }

  return best;
}

// ─── Label at explicit position (for orthogonal lines) ───
function renderLineLabelAt(ctx, line, lx, ly) {
  const { label } = line;
  if (!label || !label.text) return;
  ctx.save();
  const fontSize = label.fontSize || 12;
  ctx.font = `${fontSize}px ${label.fontFamily || 'Inter, system-ui, sans-serif'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const metrics = ctx.measureText(label.text);
  const padX = 6, padY = 3;
  const bgW = metrics.width + padX * 2, bgH = fontSize + padY * 2;
  ctx.fillStyle = label.background || 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  const rrx = lx - bgW / 2, rry = ly - bgH / 2;
  ctx.moveTo(rrx + 4, rry);
  ctx.lineTo(rrx + bgW - 4, rry);
  ctx.arcTo(rrx + bgW, rry, rrx + bgW, rry + 4, 4);
  ctx.lineTo(rrx + bgW, rry + bgH - 4);
  ctx.arcTo(rrx + bgW, rry + bgH, rrx + bgW - 4, rry + bgH, 4);
  ctx.lineTo(rrx + 4, rry + bgH);
  ctx.arcTo(rrx, rry + bgH, rrx, rry + bgH - 4, 4);
  ctx.lineTo(rrx, rry + 4);
  ctx.arcTo(rrx, rry, rrx + 4, rry, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = label.borderColor || '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = label.color || '#333333';
  ctx.fillText(label.text, lx, ly);
  ctx.restore();
}
