/**
 * ShapeRenderer — Draws shape elements on Canvas 2D context.
 * Supports: rectangle, rounded-rectangle, ellipse, diamond, triangle, hexagon,
 *           cylinder, cloud, star, parallelogram
 */

export function renderShape(ctx, shape) {
  const { x, y, width, height, fill, fillOpacity, stroke, strokeWidth, shapeVariant, cornerRadius, shadow } = shape;

  ctx.save();

  // Shadow (Deliverable 4)
  if (shadow && shadow.blur > 0) {
    ctx.shadowColor = shadow.color || 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = shadow.blur || 8;
    ctx.shadowOffsetX = shadow.offsetX || 2;
    ctx.shadowOffsetY = shadow.offsetY || 2;
  }

  // Build path based on shape variant
  ctx.beginPath();

  switch (shapeVariant) {
    case 'rectangle':
      ctx.rect(x, y, width, height);
      break;
    case 'rounded-rectangle':
      drawRoundedRect(ctx, x, y, width, height, cornerRadius || 8);
      break;
    case 'ellipse':
      ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      break;
    case 'diamond':
      drawDiamond(ctx, x, y, width, height);
      break;
    case 'triangle':
      drawTriangle(ctx, x, y, width, height);
      break;
    case 'hexagon':
      drawHexagon(ctx, x, y, width, height);
      break;
    case 'cylinder':
      drawCylinder(ctx, x, y, width, height);
      break;
    case 'cloud':
      drawCloud(ctx, x, y, width, height);
      break;
    case 'star':
      drawStar(ctx, x, y, width, height, 5);
      break;
    case 'parallelogram':
      drawParallelogram(ctx, x, y, width, height);
      break;
    default:
      ctx.rect(x, y, width, height);
  }

  // Fill
  if (fill && fill !== 'transparent') {
    ctx.globalAlpha = fillOpacity ?? 1;
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Reset shadow before stroke (avoid double shadow)
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Stroke
  if (stroke && strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }

  // Cylinder needs extra ellipse for the top
  if (shapeVariant === 'cylinder') {
    drawCylinderTop(ctx, x, y, width, height, fill, fillOpacity, stroke, strokeWidth);
  }

  ctx.restore();

  // Render text inside shape (if any)
  if (shape.text && shape.text.text) {
    renderShapeText(ctx, shape);
  }
}

function renderShapeText(ctx, shape) {
  const { text: textContent } = shape;
  const padding = 8;
  const maxWidth = shape.width - padding * 2;
  const textY = shape.y + padding;

  ctx.save();

  const fontStyle = textContent.fontStyle === 'italic' ? 'italic ' : '';
  const fontWeight = textContent.fontWeight === 'bold' ? 'bold ' : '';
  ctx.font = `${fontStyle}${fontWeight}${textContent.fontSize}px ${textContent.fontFamily || 'sans-serif'}`;
  ctx.fillStyle = textContent.color || '#000000';
  ctx.textBaseline = 'top';

  let alignX = shape.x + padding;
  if (textContent.align === 'center') {
    ctx.textAlign = 'center';
    alignX = shape.x + shape.width / 2;
  } else if (textContent.align === 'right') {
    ctx.textAlign = 'right';
    alignX = shape.x + shape.width - padding;
  } else {
    ctx.textAlign = 'left';
  }

  const lines = wrapText(ctx, textContent.text, maxWidth);
  const lineHeight = textContent.fontSize * 1.3;
  const totalTextHeight = lines.length * lineHeight;

  let startY = textY;
  if (textContent.verticalAlign === 'middle') {
    startY = shape.y + (shape.height - totalTextHeight) / 2;
  } else if (textContent.verticalAlign === 'bottom') {
    startY = shape.y + shape.height - totalTextHeight - padding;
  }

  ctx.beginPath();
  ctx.rect(shape.x, shape.y, shape.width, shape.height);
  ctx.clip();

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], alignX, startY + i * lineHeight);
  }

  ctx.restore();
}

// ─── Shape drawing helpers ───────────────────────────────

function drawRoundedRect(ctx, x, y, w, h, r) {
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

function drawDiamond(ctx, x, y, w, h) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.moveTo(cx, y);
  ctx.lineTo(x + w, cy);
  ctx.lineTo(cx, y + h);
  ctx.lineTo(x, cy);
  ctx.closePath();
}

function drawTriangle(ctx, x, y, w, h) {
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

function drawHexagon(ctx, x, y, w, h) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const px = cx + rx * Math.cos(angle);
    const py = cy + ry * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// ─── NEW SHAPES (Deliverable 4) ─────────────────────────

function drawCylinder(ctx, x, y, w, h) {
  // Cylinder body: rectangle + bottom ellipse
  const ry = Math.min(h * 0.15, 30); // ellipse height proportion
  // Bottom ellipse
  ctx.ellipse(x + w / 2, y + h - ry, w / 2, ry, 0, 0, Math.PI * 2);
  // Sides
  ctx.moveTo(x, y + ry);
  ctx.lineTo(x, y + h - ry);
  ctx.moveTo(x + w, y + ry);
  ctx.lineTo(x + w, y + h - ry);
  // Top ellipse (will be drawn separately as overlay)
  ctx.moveTo(x + w, y + ry);
  ctx.ellipse(x + w / 2, y + ry, w / 2, ry, 0, 0, Math.PI, true);
}

function drawCylinderTop(ctx, x, y, w, h, fill, fillOpacity, stroke, strokeWidth) {
  const ry = Math.min(h * 0.15, 30);
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + ry, w / 2, ry, 0, 0, Math.PI * 2);
  if (fill && fill !== 'transparent') {
    ctx.globalAlpha = fillOpacity ?? 1;
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (stroke && strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

function drawCloud(ctx, x, y, w, h) {
  // Cloud made of overlapping circles
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rw = w / 2;
  const rh = h / 2;

  // Build cloud from arcs
  ctx.moveTo(x + w * 0.25, y + h * 0.65);

  // Bottom
  ctx.bezierCurveTo(x + w * 0.05, y + h * 0.65, x, y + h * 0.45, x + w * 0.15, y + h * 0.35);
  // Left
  ctx.bezierCurveTo(x + w * 0.05, y + h * 0.15, x + w * 0.25, y, x + w * 0.4, y + h * 0.1);
  // Top
  ctx.bezierCurveTo(x + w * 0.45, y - h * 0.05, x + w * 0.7, y - h * 0.02, x + w * 0.72, y + h * 0.15);
  // Right top
  ctx.bezierCurveTo(x + w * 0.95, y + h * 0.1, x + w * 1.05, y + h * 0.35, x + w * 0.9, y + h * 0.45);
  // Right bottom
  ctx.bezierCurveTo(x + w * 1.0, y + h * 0.6, x + w * 0.9, y + h * 0.75, x + w * 0.75, y + h * 0.65);
  // Bottom close
  ctx.bezierCurveTo(x + w * 0.65, y + h * 0.8, x + w * 0.35, y + h * 0.8, x + w * 0.25, y + h * 0.65);
  ctx.closePath();
}

function drawStar(ctx, x, y, w, h, points) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const outerR = Math.min(w, h) / 2;
  const innerR = outerR * 0.4;

  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * i) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = cx + r * Math.cos(angle) * (w / Math.min(w, h));
    const py = cy + r * Math.sin(angle) * (h / Math.min(w, h));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawParallelogram(ctx, x, y, w, h) {
  const skew = w * 0.2; // 20% skew
  ctx.moveTo(x + skew, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - skew, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

// ─── Word wrap utility ───────────────────────────────────

export function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  if (maxWidth <= 0) return [text];

  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}
