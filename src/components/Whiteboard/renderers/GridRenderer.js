/**
 * GridRenderer — Draws dot grid or line grid background on canvas.
 *
 * PERFORMANCE OPTIMIZED:
 * - Dots: all dots batched into a single path → one fill() call
 *   (was: individual beginPath/arc/fill per dot = thousands of draw calls)
 * - Lines: batched into one path per direction → two stroke() calls
 * - Adaptive density: skip dots at high zoom-out to avoid overdraw
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
    style = 'dots',
  } = options;

  if (!gridEnabled) return;

  // Calculate visible area in world coordinates
  const startX = Math.floor(-panX / zoom / gridSize) * gridSize;
  const startY = Math.floor(-panY / zoom / gridSize) * gridSize;
  const endX = Math.ceil((canvasWidth / zoom - panX / zoom) / gridSize) * gridSize;
  const endY = Math.ceil((canvasHeight / zoom - panY / zoom) / gridSize) * gridSize;

  // Adaptive: skip grid if too many points (zoomed out far)
  const cols = (endX - startX) / gridSize;
  const rows = (endY - startY) / gridSize;
  const totalPoints = cols * rows;

  if (style === 'dots') {
    // At extreme zoom-out, increase grid step to avoid rendering 10k+ dots
    let step = gridSize;
    if (totalPoints > 5000) step = gridSize * 2;
    if (totalPoints > 15000) step = gridSize * 4;
    if (totalPoints > 40000) return; // Too dense, skip entirely

    const dotRadius = 1.5 / zoom;

    ctx.save();
    ctx.fillStyle = '#c0c0c0';

    // Batch all dots into a single path — ONE fill() call
    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      for (let y = startY; y <= endY; y += step) {
        ctx.moveTo(x + dotRadius, y);
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      }
    }
    ctx.fill();

    ctx.restore();
  } else {
    // Lines mode — batch all lines into minimal stroke calls
    if (totalPoints > 40000) return;

    let step = gridSize;
    if (totalPoints > 10000) step = gridSize * 2;

    ctx.save();
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 0.5 / zoom;

    // All vertical lines in one path
    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    ctx.stroke();

    // All horizontal lines in one path
    ctx.beginPath();
    for (let y = startY; y <= endY; y += step) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    ctx.restore();
  }
}
