/**
 * TextRenderer — Draws standalone text elements on Canvas 2D context.
 * Handles word wrap, alignment, and text formatting.
 */

import { wrapText } from './ShapeRenderer';

export function renderText(ctx, textElement) {
  const { x, y, width, height, content } = textElement;
  if (!content || !content.text) return;

  ctx.save();

  const padding = 4;
  const maxWidth = width - padding * 2;

  // Font
  const fontStyle = content.fontStyle === 'italic' ? 'italic ' : '';
  const fontWeight = content.fontWeight === 'bold' ? 'bold ' : '';
  const fontSize = content.fontSize || 14;
  ctx.font = `${fontStyle}${fontWeight}${fontSize}px ${content.fontFamily || 'sans-serif'}`;
  ctx.fillStyle = content.color || '#000000';
  ctx.textBaseline = 'top';

  // Alignment
  let alignX = x + padding;
  if (content.align === 'center') {
    ctx.textAlign = 'center';
    alignX = x + width / 2;
  } else if (content.align === 'right') {
    ctx.textAlign = 'right';
    alignX = x + width - padding;
  } else {
    ctx.textAlign = 'left';
  }

  // Word wrap
  const lines = wrapText(ctx, content.text, maxWidth);
  const lineHeight = fontSize * 1.3;
  const totalTextHeight = lines.length * lineHeight;

  // Vertical alignment
  let startY = y + padding;
  if (content.verticalAlign === 'middle') {
    startY = y + (height - totalTextHeight) / 2;
  } else if (content.verticalAlign === 'bottom') {
    startY = y + height - totalTextHeight - padding;
  }

  // Draw each line
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], alignX, startY + i * lineHeight);
  }

  ctx.restore();
}
