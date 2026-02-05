/**
 * PenTool — Fritt ritverktyg (freehand drawing) med shape recognition.
 *
 * Klicka och dra för att rita. Punkterna samlas in under drag
 * och förenklas med Ramer-Douglas-Peucker-algoritmen vid release.
 *
 * Enhanced Inked Shapes: Om aktiverat analyseras den ritade banan
 * vid mouseUp och konverteras automatiskt till en ren shape om den
 * matchar en känd form (rektangel, cirkel, triangel, diamond, linje, pil).
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
      this._eraseAt(worldX, worldY, store);
      return;
    }

    this.isDrawing = true;
    this.points = [{ x: worldX, y: worldY }];
  }

  onMouseMove(worldX, worldY, shiftKey, store, renderer) {
    if (this.eraserMode) return;
    if (!this.isDrawing) return;

    const last = this.points[this.points.length - 1];
    const dist = Math.hypot(worldX - last.x, worldY - last.y);
    if (dist < 2) return;

    this.points.push({ x: worldX, y: worldY });

    if (renderer) {
      renderer.setPenPreview(this.points, store.getState());
    }
  }

  onMouseUp(worldX, worldY, shiftKey, store, renderer) {
    if (this.eraserMode) return;
    if (!this.isDrawing) return;

    this.isDrawing = false;

    if (renderer) {
      renderer.setPenPreview(null);
    }

    if (this.points.length < 2) {
      this.points = [];
      return;
    }

    const state = store.getState();

    // ── Enhanced Inked Shapes ──────────────────────────────
    if (state.enhanceInkedShapes) {
      const recognized = recognizeShape(this.points);
      if (recognized) {
        this._createRecognizedShape(recognized, state, store);
        this.points = [];
        return;
      }
    }

    // ── Fallback: vanlig freehand path ─────────────────────
    const simplified = simplifyPath(this.points, 1.5);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pt of simplified) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }

    const pathElement = {
      type: 'path',
      id: null,
      x: minX,
      y: minY,
      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
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

    const newState = store.getState();
    const lastId = newState.elementOrder[newState.elementOrder.length - 1];
    newState.selectElement(lastId);
    newState.setActiveTool('select');

    this.points = [];
  }

  _createRecognizedShape(recognized, state, store) {
    const { type, bounds, arrowHead } = recognized;

    if (type === 'line' || type === 'arrow') {
      // Skapa ett line-element
      const lineElement = {
        type: 'line',
        id: null,
        x: bounds.x1,
        y: bounds.y1,
        x2: bounds.x2,
        y2: bounds.y2,
        stroke: state.defaultStroke,
        strokeWidth: state.defaultStrokeWidth,
        lineStyle: 'solid',
        arrowHead: type === 'arrow' ? 'arrow' : 'none',
        curvature: 0,
        startConnection: null,
        endConnection: null,
        groupId: null,
        parentId: null,
        locked: false,
        visible: true,
      };
      state.addElement(lineElement);
    } else {
      // Skapa ett shape-element
      const shapeElement = {
        type: 'shape',
        id: null,
        shapeVariant: type, // 'rectangle', 'ellipse', 'diamond', 'triangle'
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        fill: state.defaultFill,
        fillOpacity: state.defaultFillOpacity,
        stroke: state.defaultStroke,
        strokeWidth: state.defaultStrokeWidth,
        cornerRadius: type === 'rectangle' ? 8 : 0,
        text: null,
        isContainer: false,
        childIds: [],
        shadow: null,
        groupId: null,
        parentId: null,
        locked: false,
        visible: true,
      };
      state.addElement(shapeElement);
    }

    const newState = store.getState();
    const lastId = newState.elementOrder[newState.elementOrder.length - 1];
    newState.selectElement(lastId);
    newState.setActiveTool('select');
  }

  onDoubleClick(worldX, worldY, store, renderer) {
    // Inget specialbeteende vid dubbelklick
  }

  getCursor(worldX, worldY, state) {
    return this.eraserMode ? 'cell' : 'crosshair';
  }

  _eraseAt(worldX, worldY, store) {
    const state = store.getState();
    for (let i = state.elementOrder.length - 1; i >= 0; i--) {
      const id = state.elementOrder[i];
      const el = state.elements[id];
      if (!el || el.type !== 'path' || !el.visible) continue;

      if (worldX < el.x - 10 || worldX > el.x + el.width + 10 ||
          worldY < el.y - 10 || worldY > el.y + el.height + 10) continue;

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


// ═══════════════════════════════════════════════════════════
// SHAPE RECOGNITION ENGINE
// ═══════════════════════════════════════════════════════════

/**
 * Analyserar en serie punkter och avgör om det är en känd form.
 * Returnerar { type, bounds } eller null om ingen match.
 *
 * Erkända former:
 * - line / arrow (rakt streck, ev. med pilspets)
 * - rectangle (4 hörn, ~90° vinklar)
 * - ellipse / circle (punkter jämnt runt en mitt)
 * - triangle (3 hörn)
 * - diamond (4 hörn, roterad ~45°)
 */
function recognizeShape(points) {
  if (points.length < 3) return null;

  const totalLen = pathLength(points);
  if (totalLen < 20) return null; // För kort, ignorera

  // ── 1. Testa LINJE / PIL ────────────────────────────────
  const lineResult = detectLine(points, totalLen);
  if (lineResult) return lineResult;

  // ── 2. Testa om banan är "sluten" (start ≈ slut) ────────
  const startEnd = Math.hypot(
    points[0].x - points[points.length - 1].x,
    points[0].y - points[points.length - 1].y
  );
  const isClosed = startEnd < totalLen * 0.15;

  if (!isClosed) return null; // Öppen bana som inte är linje → freehand

  // ── 3. Beräkna bounding box ─────────────────────────────
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of points) {
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
  }
  const bbW = maxX - minX;
  const bbH = maxY - minY;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // ── 4. Hitta hörn (punkter med stor riktningsändring) ────
  const corners = detectCorners(points);

  // ── 5. Testa CIRKEL / ELLIPS ────────────────────────────
  const ellipseResult = detectEllipse(points, cx, cy, bbW, bbH, totalLen, corners);
  if (ellipseResult) return ellipseResult;

  // ── 6. Testa TRIANGEL (3 hörn) ──────────────────────────
  if (corners.length === 3) {
    const triangleResult = detectTriangle(corners, minX, minY, bbW, bbH);
    if (triangleResult) return triangleResult;
  }

  // ── 7. Testa REKTANGEL / DIAMOND (4 hörn) ──────────────
  if (corners.length >= 3 && corners.length <= 5) {
    const quadResult = detectQuadrilateral(corners, minX, minY, bbW, bbH, cx, cy);
    if (quadResult) return quadResult;
  }

  return null;
}


// ─── Linje / Pil ──────────────────────────────────────────

function detectLine(points, totalLen) {
  const start = points[0];
  const end = points[points.length - 1];
  const directDist = Math.hypot(end.x - start.x, end.y - start.y);

  // En linje har directDist nära totalLen (rakhetsfaktor > 0.9)
  const straightness = directDist / totalLen;
  if (straightness < 0.85) return null;
  if (directDist < 30) return null; // För kort

  // Kolla om det finns en pilspets i slutet
  const isArrow = detectArrowHead(points);

  return {
    type: isArrow ? 'arrow' : 'line',
    bounds: { x1: start.x, y1: start.y, x2: end.x, y2: end.y },
  };
}

function detectArrowHead(points) {
  // En pil: sista 15-25% av banan har en skarp riktningsändring
  // (ritaren lyfter inte pennan, utan gör en V-form i slutet)
  const n = points.length;
  if (n < 10) return false;

  // Kolla de sista 20% av punkterna
  const tailStart = Math.floor(n * 0.75);
  const tailPoints = points.slice(tailStart);

  // Beräkna riktningsändringar i svansen
  let maxAngleChange = 0;
  for (let i = 1; i < tailPoints.length - 1; i++) {
    const prev = tailPoints[i - 1];
    const curr = tailPoints[i];
    const next = tailPoints[i + 1];
    const angle = angleBetween(prev, curr, next);
    maxAngleChange = Math.max(maxAngleChange, Math.abs(Math.PI - angle));
  }

  // Om vi ser en skarp vinkel (> 60°) i svansen → troligen pil
  return maxAngleChange > Math.PI / 3;
}


// ─── Cirkel / Ellips ──────────────────────────────────────

function detectEllipse(points, cx, cy, bbW, bbH, totalLen, corners) {
  // Cirklar har få hörn och jämn fördelning runt mitten
  if (corners.length > 3) return null;

  const rx = bbW / 2;
  const ry = bbH / 2;
  if (rx < 10 || ry < 10) return null;

  // Beräkna normaliserat avstånd till ellipsens kant för varje punkt
  let totalError = 0;
  for (const pt of points) {
    const nx = (pt.x - cx) / rx;
    const ny = (pt.y - cy) / ry;
    const dist = Math.sqrt(nx * nx + ny * ny);
    totalError += Math.abs(dist - 1);
  }
  const avgError = totalError / points.length;

  // Jämför banans längd med förväntad ellipsomkrets
  const expectedPerimeter = estimateEllipsePerimeter(rx, ry);
  const lengthRatio = totalLen / expectedPerimeter;

  // Godkänn om: snittfelet < 0.25 och banans längd stämmer ungefär (0.75-1.4)
  if (avgError < 0.25 && lengthRatio > 0.7 && lengthRatio < 1.5) {
    return {
      type: 'ellipse',
      bounds: {
        x: cx - rx,
        y: cy - ry,
        width: bbW,
        height: bbH,
      },
    };
  }

  return null;
}

function estimateEllipsePerimeter(rx, ry) {
  // Ramanujans approximation
  const h = ((rx - ry) * (rx - ry)) / ((rx + ry) * (rx + ry));
  return Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}


// ─── Triangel ─────────────────────────────────────────────

function detectTriangle(corners, minX, minY, bbW, bbH) {
  // Verifiera att hörnen bildar en rimlig triangel
  const a = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
  const b = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);
  const c = Math.hypot(corners[0].x - corners[2].x, corners[0].y - corners[2].y);

  const perimeter = a + b + c;
  const minSide = Math.min(a, b, c);

  // Alla sidor bör vara rimligt långa (ingen degenererad triangel)
  if (minSide < perimeter * 0.15) return null;

  return {
    type: 'triangle',
    bounds: {
      x: minX,
      y: minY,
      width: bbW,
      height: bbH,
    },
  };
}


// ─── Rektangel / Diamond ─────────────────────────────────

function detectQuadrilateral(corners, minX, minY, bbW, bbH, cx, cy) {
  // Använd de 4 mest framträdande hörnen
  const c4 = corners.length === 4 ? corners :
    corners.slice(0, 4).length === 4 ? corners.slice(0, 4) :
    findBestFourCorners(corners, cx, cy);

  if (!c4 || c4.length !== 4) return null;

  // Sortera hörnen medurs
  const sorted = sortPointsClockwise(c4, cx, cy);

  // Beräkna vinklar vid varje hörn
  const angles = [];
  for (let i = 0; i < 4; i++) {
    const prev = sorted[(i + 3) % 4];
    const curr = sorted[i];
    const next = sorted[(i + 1) % 4];
    angles.push(angleBetween(prev, curr, next));
  }

  // Kolla om vinklarna är nära 90° (π/2)
  const avgAngleError = angles.reduce((sum, a) => sum + Math.abs(a - Math.PI / 2), 0) / 4;

  if (avgAngleError < 0.45) {
    // Nära 90° vinklar → rektangel
    return {
      type: 'rectangle',
      bounds: { x: minX, y: minY, width: bbW, height: bbH },
    };
  }

  // Kolla om det är en diamond (hörn nära mittpunkterna av BB-kanterna)
  const midTop = { x: cx, y: minY };
  const midRight = { x: minX + bbW, y: cy };
  const midBottom = { x: cx, y: minY + bbH };
  const midLeft = { x: minX, y: cy };
  const diamondPoints = [midTop, midRight, midBottom, midLeft];

  let diamondError = 0;
  for (let i = 0; i < 4; i++) {
    const closest = diamondPoints.reduce((best, dp) => {
      const d = Math.hypot(sorted[i].x - dp.x, sorted[i].y - dp.y);
      return d < best.d ? { d, pt: dp } : best;
    }, { d: Infinity, pt: null });
    diamondError += closest.d;
  }
  const avgDiamondError = diamondError / 4;
  const bbDiag = Math.hypot(bbW, bbH);

  if (avgDiamondError < bbDiag * 0.2) {
    return {
      type: 'diamond',
      bounds: { x: minX, y: minY, width: bbW, height: bbH },
    };
  }

  // Annars fallback till rektangel om hörn-felet inte är för stort
  if (avgAngleError < 0.7) {
    return {
      type: 'rectangle',
      bounds: { x: minX, y: minY, width: bbW, height: bbH },
    };
  }

  return null;
}

function findBestFourCorners(corners, cx, cy) {
  if (corners.length < 4) return null;
  // Välj de 4 hörn som har bäst spridning (ett i varje quadrant)
  const quadrants = [[], [], [], []];
  for (const c of corners) {
    const qx = c.x >= cx ? 1 : 0;
    const qy = c.y >= cy ? 1 : 0;
    quadrants[qy * 2 + qx].push(c);
  }
  const result = [];
  for (const q of quadrants) {
    if (q.length > 0) {
      // Välj hörnet längst från mitten
      q.sort((a, b) => Math.hypot(b.x - cx, b.y - cy) - Math.hypot(a.x - cx, a.y - cy));
      result.push(q[0]);
    }
  }
  return result.length === 4 ? result : null;
}


// ─── Hörndetektering ──────────────────────────────────────

function detectCorners(points) {
  if (points.length < 5) return [];

  // Förenkla banan kraftigt för att hitta hörn
  const simplified = simplifyPath(points, 8);
  if (simplified.length < 3) return [];

  const corners = [];
  const minAngle = Math.PI * 0.55; // ~100° = tydlig riktningsändring

  for (let i = 1; i < simplified.length - 1; i++) {
    const angle = angleBetween(simplified[i - 1], simplified[i], simplified[i + 1]);
    if (angle < minAngle) {
      corners.push({ ...simplified[i], angle });
    }
  }

  return corners;
}


// ─── Geometriska hjälpfunktioner ──────────────────────────

function angleBetween(a, b, c) {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.hypot(ba.x, ba.y);
  const magBC = Math.hypot(bc.x, bc.y);
  if (magBA === 0 || magBC === 0) return Math.PI;
  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return Math.acos(cosAngle);
}

function pathLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return len;
}

function sortPointsClockwise(points, cx, cy) {
  return [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - cy, a.x - cx);
    const angleB = Math.atan2(b.y - cy, b.x - cx);
    return angleA - angleB;
  });
}


// ─── Ramer-Douglas-Peucker ────────────────────────────────

function simplifyPath(points, epsilon) {
  if (points.length <= 2) return points;

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
