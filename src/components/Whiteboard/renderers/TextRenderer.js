/**
 * TextRenderer — Draws standalone text elements on Canvas 2D context.
 * Handles word wrap, alignment, and text formatting.
 */

import { wrapText } from './ShapeRenderer';

export function renderText(ctx, textElement) {
  const { x, y, width, height, content } = textElement;
  if (!content || !content.text) return;

  ctx.save();

  const padding = 8;
  const maxWidth = width - padding * 2;

  // Font
  const fontStyle = content.fontStyle === 'italic' ? 'italic ' : '';
  const fontWeight = content.fontWeight === 'bold' ? 'bold ' : '';
  const fontSize = content.fontSize || 14;
  ctx.font = `${fontStyle}${fontWeight}${fontSize}px ${content.fontFamily || 'sans-serif'}`;
  ctx.fillStyle = content.color || '#000000';

  // Alignment — default to 'center' to match the textarea editing behavior
  const align = content.align || 'center';
  let alignX;
  if (align === 'center') {
    ctx.textAlign = 'center';
    alignX = x + width / 2;
  } else if (align === 'right') {
    ctx.textAlign = 'right';
    alignX = x + width - padding;
  } else {
    ctx.textAlign = 'left';
    alignX = x + padding;
  }

  // Word wrap
  const lines = wrapText(ctx, content.text, maxWidth);
  const lineHeight = fontSize * 1.3;
  const totalTextHeight = lines.length * lineHeight;

  // Use textBaseline 'middle' for accurate vertical centering
  ctx.textBaseline = 'middle';

  // Vertical alignment — default to 'middle'
  const vAlign = content.verticalAlign || 'middle';
  let firstLineY;
  if (vAlign === 'middle') {
    // Center the block of text vertically
    firstLineY = y + height / 2 - totalTextHeight / 2 + lineHeight / 2;
  } else if (vAlign === 'bottom') {
    firstLineY = y + height - padding - totalTextHeight + lineHeight / 2;
  } else {
    // top
    firstLineY = y + padding + lineHeight / 2;
  }

  // Draw each line
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], alignX, firstLineY + i * lineHeight);
  }

  ctx.restore();
}
