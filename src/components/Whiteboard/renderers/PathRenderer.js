/**
 * PathRenderer — Renderar fritt ritade banor (freehand paths) på Canvas 2D.
 *
 * Stöd för:
 * - Smooth kurvor via quadratic bézier-interpolering mellan punkter
 * - Strek-färg, tjocklek
 * - Preview-rendering under ritning
 */

/**
 * Rendera en sparad path-element.
 */
export function renderPath(ctx, element) {
  const { points, stroke, strokeWidth, x, y } = element;
  if (!points || points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = stroke || '#000000';
  ctx.lineWidth = strokeWidth || 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  drawSmoothPath(ctx, points, x, y);

  ctx.stroke();
  ctx.restore();
}

/**
 * Rendera live-preview under ritning (absoluta koordinater).
 */
export function renderPathPreview(ctx, points, state) {
  if (!points || points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = state.defaultStroke || '#000000';
  ctx.lineWidth = (state.defaultStrokeWidth || 2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.7;

  // Preview använder absoluta koordinater (offset = 0,0)
  drawSmoothPath(ctx, points.map(p => ({ x: p.x, y: p.y })), 0, 0);

  ctx.stroke();
  ctx.restore();
}

/**
 * Rita en mjuk bana genom att interpolera med quadratic bézier.
 */
function drawSmoothPath(ctx, points, offsetX, offsetY) {
  ctx.beginPath();

  const p0 = points[0];
  ctx.moveTo(p0.x + offsetX, p0.y + offsetY);

  if (points.length === 2) {
    const p1 = points[1];
    ctx.lineTo(p1.x + offsetX, p1.y + offsetY);
    return;
  }

  // Använd quadratic bézier mellan mittpunkter av segment
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];

    if (i === 0) {
      // Första segmentet: rät linje till mittpunkten
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      ctx.lineTo(midX + offsetX, midY + offsetY);
    } else if (i === points.length - 2) {
      // Sista segmentet: kurva till slutpunkten
      ctx.quadraticCurveTo(
        current.x + offsetX,
        current.y + offsetY,
        next.x + offsetX,
        next.y + offsetY
      );
    } else {
      // Mellanliggande segment: kurva till mittpunkten
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      ctx.quadraticCurveTo(
        current.x + offsetX,
        current.y + offsetY,
        midX + offsetX,
        midY + offsetY
      );
    }
  }
}
