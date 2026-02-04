/**
 * ImageRenderer — Renderar bildelement på Canvas 2D.
 *
 * Bilder lagras som dataURL i element.imageData.
 * Caching av Image-objekt för att undvika att skapa nya varje frame.
 */

// Cache: elementId → { dataUrl, img, loaded }
const imageCache = new Map();

/**
 * Rendera ett bild-element.
 */
export function renderImage(ctx, element) {
  const { x, y, width, height, imageData, opacity } = element;
  if (!imageData) return;

  // Hämta eller skapa cached Image-objekt
  let cached = imageCache.get(element.id);
  if (!cached || cached.dataUrl !== imageData) {
    const img = new Image();
    img.src = imageData;
    cached = { dataUrl: imageData, img, loaded: false };
    img.onload = () => { cached.loaded = true; };
    // Om bilden redan var cached av webbläsaren
    if (img.complete) cached.loaded = true;
    imageCache.set(element.id, cached);
  }

  if (!cached.loaded) {
    // Rita placeholder medan bilden laddas
    ctx.save();
    ctx.fillStyle = '#f0f0f0';
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    // Ikon-indikator
    ctx.fillStyle = '#999999';
    ctx.font = `${Math.min(width, height) * 0.3}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🖼', x + width / 2, y + height / 2);
    ctx.restore();
    return;
  }

  ctx.save();

  if (opacity !== undefined && opacity < 1) {
    ctx.globalAlpha = opacity;
  }

  // Rita bilden skalad till elementets storlek
  ctx.drawImage(cached.img, x, y, width, height);

  // Ram runt bilden (subtil)
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  ctx.restore();
}

/**
 * Rensa cache för borttagna element.
 */
export function clearImageCache(elementId) {
  imageCache.delete(elementId);
}

/**
 * Rensa hela cachen (t.ex. vid canvas-clear).
 */
export function clearAllImageCache() {
  imageCache.clear();
}
