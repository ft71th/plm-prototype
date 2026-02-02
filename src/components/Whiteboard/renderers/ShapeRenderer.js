/**
 * ShapeRenderer — Draws shape elements on Canvas 2D context.
 * Supports: rectangle, rounded-rectangle, ellipse, diamond, triangle, hexagon
 */

export function renderShape(ctx, shape) {
  const { x, y, width, height, fill, fillOpacity, stroke, strokeWidth, shapeVariant, cornerRadius } = shape;

  ctx.save();

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
      ctx.ellipse(
        x + width / 2,
        y + height / 2,
        width / 2,
        height / 2,
        0, 0, Math.PI * 2
      );
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

  // Stroke
  if (stroke && strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
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
  const textX = shape.x + padding;
  const textY = shape.y + padding;
  const textAreaHeight = shape.height - padding * 2;

  ctx.save();

  const fontStyle = textContent.fontStyle === 'italic' ? 'italic ' : '';
  const fontWeight = textContent.fontWeight === 'bold' ? 'bold ' : '';
  ctx.font = `${fontStyle}${fontWeight}${textContent.fontSize}px ${textContent.fontFamily || 'sans-serif'}`;
  ctx.fillStyle = textContent.color || '#000000';
  ctx.textBaseline = 'top';

  // Text alignment
  let alignX = textX;
  if (textContent.align === 'center') {
    ctx.textAlign = 'center';
    alignX = shape.x + shape.width / 2;
  } else if (textContent.align === 'right') {
    ctx.textAlign = 'right';
    alignX = shape.x + shape.width - padding;
  } else {
    ctx.textAlign = 'left';
  }

  // Word wrap
  const lines = wrapText(ctx, textContent.text, maxWidth);
  const lineHeight = textContent.fontSize * 1.3;
  const totalTextHeight = lines.length * lineHeight;

  // Vertical alignment
  let startY = textY;
  if (textContent.verticalAlign === 'middle') {
    startY = shape.y + (shape.height - totalTextHeight) / 2;
  } else if (textContent.verticalAlign === 'bottom') {
    startY = shape.y + shape.height - totalTextHeight - padding;
  }

  // Clip text to shape bounds
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
  ctx.moveTo(cx, y);       // top
  ctx.lineTo(x + w, cy);   // right
  ctx.lineTo(cx, y + h);   // bottom
  ctx.lineTo(x, cy);       // left
  ctx.closePath();
}

function drawTriangle(ctx, x, y, w, h) {
  ctx.moveTo(x + w / 2, y);   // top center
  ctx.lineTo(x + w, y + h);   // bottom right
  ctx.lineTo(x, y + h);       // bottom left
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
