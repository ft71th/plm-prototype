/**
 * LineRenderer — Draws line/connection elements on Canvas 2D context.
 *
 * Supports:
 * - Straight lines and quadratic bézier curves
 * - Arrow heads: none, arrow, diamond, circle
 * - Line styles: solid, dashed, dotted
 * - Labels (text on line midpoint)
 * - Connection endpoints (visual indicator when connected to shapes)
 */

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
