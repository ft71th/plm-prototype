/**
 * GridRenderer — Draws dot grid or line grid background on canvas.
 */

export function renderGrid(ctx, options) {
  const {
    gridEnabled = true,
    gridSize = 20,
    panX = 0,
    panY = 0,
    zoom = 1,
    canvasWidth,
    canvasHeight,
    style = 'dots', // 'dots' | 'lines'
  } = options;

  if (!gridEnabled) return;

  ctx.save();

  const dotColor = '#c0c0c0';
  const dotSize = 1.5;

  // Calculate visible area in world coordinates
  const startX = Math.floor(-panX / zoom / gridSize) * gridSize;
  const startY = Math.floor(-panY / zoom / gridSize) * gridSize;
  const endX = Math.ceil((canvasWidth / zoom - panX / zoom) / gridSize) * gridSize;
  const endY = Math.ceil((canvasHeight / zoom - panY / zoom) / gridSize) * gridSize;

  if (style === 'dots') {
    ctx.fillStyle = dotColor;
    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize / zoom, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    ctx.strokeStyle = dotColor;
    ctx.lineWidth = 0.5 / zoom;

    // Vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
  }

  ctx.restore();
}
