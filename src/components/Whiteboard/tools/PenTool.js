/**
 * PenTool — Fritt ritverktyg (freehand drawing).
 *
 * Klicka och dra för att rita. Punkterna samlas in under drag
 * och förenklas med Ramer-Douglas-Peucker-algoritmen vid release.
 *
 * Stöd för raderare (eraser mode): tar bort path-element under markören.
 */

export class PenTool {
  constructor() {
    this.isDrawing = false;
    this.points = [];
    this.eraserMode = false;
  }

  setEraserMode(enabled) {
    this.eraserMode = enabled;
  }

  onMouseDown(worldX, worldY, shiftKey, store, renderer) {
    if (this.eraserMode) {
      // Eraser: hitta och radera path-element under markören
      this._eraseAt(worldX, worldY, store);
      return;
    }

    this.isDrawing = true;
    this.points = [{ x: worldX, y: worldY }];
  }

  onMouseMove(worldX, worldY, shiftKey, store, renderer) {
    if (this.eraserMode) {
      // Visa eraser-markör, radera vid klick (handled i mouseDown)
      return;
    }

    if (!this.isDrawing) return;

    // Samla punkt (med minimal-avstånd filter)
    const last = this.points[this.points.length - 1];
    const dist = Math.hypot(worldX - last.x, worldY - last.y);
    if (dist < 2) return; // Ignorera sub-pixel rörelser

    this.points.push({ x: worldX, y: worldY });

    // Rendera live preview via renderer
    if (renderer) {
      renderer.setPenPreview(this.points, store.getState());
    }
  }

  onMouseUp(worldX, worldY, shiftKey, store, renderer) {
    if (this.eraserMode) return;
    if (!this.isDrawing) return;

    this.isDrawing = false;

    // Rensa preview
    if (renderer) {
      renderer.setPenPreview(null);
    }

    // Behöver minst 2 punkter
    if (this.points.length < 2) {
      this.points = [];
      return;
    }

    // Förenkla banan med RDP-algoritm
    const simplified = simplifyPath(this.points, 1.5);

    // Beräkna bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pt of simplified) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }

    const state = store.getState();
    const pathElement = {
      type: 'path',
      id: null, // addElement genererar id
      x: minX,
      y: minY,
      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
      // Lagra punkterna relativt till bounding box origin
      points: simplified.map(pt => ({
        x: pt.x - minX,
        y: pt.y - minY,
      })),
      stroke: state.defaultStroke,
      strokeWidth: state.defaultStrokeWidth,
      fill: 'none',
      groupId: null,
      parentId: null,
      locked: false,
      visible: true,
    };

    state.addElement(pathElement);

    // Byt till select-verktyg med ny path vald
    const newState = store.getState();
    const lastId = newState.elementOrder[newState.elementOrder.length - 1];
    newState.selectElement(lastId);
    newState.setActiveTool('select');

    this.points = [];
  }

  onDoubleClick(worldX, worldY, store, renderer) {
    // Inget specialbeteende vid dubbelklick
  }

  getCursor(worldX, worldY, state) {
    return this.eraserMode ? 'cell' : 'crosshair';
  }

  _eraseAt(worldX, worldY, store) {
    const state = store.getState();
    // Sök path-element under markören
    for (let i = state.elementOrder.length - 1; i >= 0; i--) {
      const id = state.elementOrder[i];
      const el = state.elements[id];
      if (!el || el.type !== 'path' || !el.visible) continue;

      // Enkel bounding-box check + point proximity check
      if (worldX < el.x - 10 || worldX > el.x + el.width + 10 ||
          worldY < el.y - 10 || worldY > el.y + el.height + 10) continue;

      // Kolla avstånd till varje segment i banan
      const pts = el.points;
      for (let j = 0; j < pts.length - 1; j++) {
        const ax = el.x + pts[j].x;
        const ay = el.y + pts[j].y;
        const bx = el.x + pts[j + 1].x;
        const by = el.y + pts[j + 1].y;
        const dist = distToSegment(worldX, worldY, ax, ay, bx, by);
        if (dist < 8) {
          state.deleteElements([id]);
          return;
        }
      }
    }
  }
}

// ─── Ramer-Douglas-Peucker ────────────────────────────

function simplifyPath(points, epsilon) {
  if (points.length <= 2) return points;

  // Hitta punkt med störst avstånd från linjen start → slut
  let maxDist = 0;
  let maxIdx = 0;

  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPath(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyPath(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [start, end];
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);

  const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq));
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  return Math.hypot(point.x - projX, point.y - projY);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
