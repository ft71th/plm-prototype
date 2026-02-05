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
  if (totalLen < 20) return null;

  console.log(`[SHAPE-REC] ══════════════════════════════════`);
  console.log(`[SHAPE-REC] Points: ${points.length}, Total length: ${totalLen.toFixed(0)}`);

  // ── 1. Testa LINJE / PIL ────────────────────────────────
  const lineResult = detectLine(points, totalLen);
  if (lineResult) {
    console.log(`[SHAPE-REC] ✅ RESULT: ${lineResult.type}`);
    return lineResult;
  }

  // ── 2. Testa om banan är "sluten" (start ≈ slut) ────────
  const startEnd = Math.hypot(
    points[0].x - points[points.length - 1].x,
    points[0].y - points[points.length - 1].y
  );
  const isClosed = startEnd < totalLen * 0.15;
  console.log(`[SHAPE-REC] Start↔End distance: ${startEnd.toFixed(0)}, threshold: ${(totalLen * 0.15).toFixed(0)}, closed: ${isClosed}`);

  if (!isClosed) {
    console.log(`[SHAPE-REC] ❌ Not closed → freehand path`);
    return null;
  }

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
  console.log(`[SHAPE-REC] BBox: ${bbW.toFixed(0)}x${bbH.toFixed(0)} at (${minX.toFixed(0)},${minY.toFixed(0)})`);

  // ── 4. Hitta hörn (punkter med stor riktningsändring) ────
  const corners = detectCorners(points);
  console.log(`[SHAPE-REC] Corners found: ${corners.length}`);
  corners.forEach((c, i) => {
    console.log(`[SHAPE-REC]   corner[${i}]: (${c.x.toFixed(0)}, ${c.y.toFixed(0)}) angle=${(c.angle * 180 / Math.PI).toFixed(1)}°`);
  });

  // ── 5. Decide shape based on corner count and sharpness ──
  
  // Compute average corner sharpness (lower = sharper)
  const avgCornerAngle = corners.length > 0 
    ? corners.reduce((s, c) => s + c.angle, 0) / corners.length 
    : Math.PI;
  const minCornerAngle = corners.length > 0
    ? Math.min(...corners.map(c => c.angle))
    : Math.PI;
  const avgCornerDeg = avgCornerAngle * 180 / Math.PI;
  const minCornerDeg = minCornerAngle * 180 / Math.PI;
  console.log(`[SHAPE-REC] avgCornerAngle: ${avgCornerDeg.toFixed(1)}°, minCornerAngle: ${minCornerDeg.toFixed(1)}° (corners: ${corners.length})`);
  
  // ALWAYS test ellipse first with STRICT threshold
  // Real circles: avgError 0.03-0.08, Real rectangles: avgError 0.15+
  {
    console.log(`[SHAPE-REC] Testing ELLIPSE (strict, always-first)...`);
    const rx = bbW / 2, ry = bbH / 2;
    if (rx >= 10 && ry >= 10) {
      let totalError = 0;
      for (const pt of points) {
        const nx = (pt.x - cx) / rx;
        const ny = (pt.y - cy) / ry;
        totalError += Math.abs(Math.sqrt(nx * nx + ny * ny) - 1);
      }
      const avgError = totalError / points.length;
      const expectedPerimeter = estimateEllipsePerimeter(rx, ry);
      const lengthRatio = totalLen / expectedPerimeter;
      console.log(`[SHAPE-REC]   strict ellipse: avgError=${avgError.toFixed(3)} (need <0.12), lengthRatio=${lengthRatio.toFixed(3)}`);
      
      if (avgError < 0.12 && lengthRatio > 0.7 && lengthRatio < 1.4) {
        console.log(`[SHAPE-REC] ✅ RESULT: ellipse (strict match)`);
        return {
          type: 'ellipse',
          bounds: { x: cx - rx, y: cy - ry, width: bbW, height: bbH },
        };
      }
    }
  }

  // QUADRILATERAL: need 3-6 corners
  if (corners.length >= 3 && corners.length <= 6) {
    console.log(`[SHAPE-REC] Testing QUADRILATERAL (${corners.length} corners)...`);
    const quadResult = detectQuadrilateral(corners, minX, minY, bbW, bbH, cx, cy);
    if (quadResult) {
      console.log(`[SHAPE-REC] ✅ RESULT: ${quadResult.type}`);
      return quadResult;
    }
    console.log(`[SHAPE-REC]   quadrilateral rejected`);
  }

  // TRIANGLE: need 3+ corners, or 2 sharp corners
  if (corners.length >= 3 || (corners.length === 2 && avgCornerAngle < Math.PI * 0.5)) {
    console.log(`[SHAPE-REC] Testing TRIANGLE (${corners.length} corners)...`);
    const triangleResult = detectTriangle(corners, minX, minY, bbW, bbH);
    if (triangleResult) {
      console.log(`[SHAPE-REC] ✅ RESULT: triangle`);
      return triangleResult;
    }
    console.log(`[SHAPE-REC]   triangle rejected`);
  }

  // ELLIPSE fallback
  console.log(`[SHAPE-REC] Testing ELLIPSE (fallback)...`);
  const ellipseResult = detectEllipse(points, cx, cy, bbW, bbH, totalLen, corners);
  if (ellipseResult) {
    console.log(`[SHAPE-REC] ✅ RESULT: ellipse`);
    return ellipseResult;
  }
  console.log(`[SHAPE-REC]   ellipse rejected`);

  console.log(`[SHAPE-REC] ❌ No shape recognized → freehand path`);
  return null;
}


// ─── Linje / Pil ──────────────────────────────────────────

function detectLine(points, totalLen) {
  const start = points[0];
  const end = points[points.length - 1];
  const directDist = Math.hypot(end.x - start.x, end.y - start.y);
  const straightness = directDist / totalLen;
  console.log(`[SHAPE-REC] Line test: directDist=${directDist.toFixed(0)}, straightness=${straightness.toFixed(3)}`);

  if (straightness < 0.85) return null;
  if (directDist < 30) return null;

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
  const rx = bbW / 2;
  const ry = bbH / 2;
  if (rx < 10 || ry < 10) return null;

  let totalError = 0;
  for (const pt of points) {
    const nx = (pt.x - cx) / rx;
    const ny = (pt.y - cy) / ry;
    const dist = Math.sqrt(nx * nx + ny * ny);
    totalError += Math.abs(dist - 1);
  }
  const avgError = totalError / points.length;

  const expectedPerimeter = estimateEllipsePerimeter(rx, ry);
  const lengthRatio = totalLen / expectedPerimeter;

  // Aspect ratio (how circular)
  const aspectRatio = Math.min(rx, ry) / Math.max(rx, ry);

  console.log(`[SHAPE-REC]   ellipse: avgError=${avgError.toFixed(3)} (need <0.25), lengthRatio=${lengthRatio.toFixed(3)} (need 0.7-1.4), aspect=${aspectRatio.toFixed(2)}`);

  if (avgError < 0.25 && lengthRatio > 0.7 && lengthRatio < 1.4) {
    return {
      type: 'ellipse',
      bounds: { x: cx - rx, y: cy - ry, width: bbW, height: bbH },
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
  if (corners.length < 2) return null;
  
  // Use the 3 sharpest corners (or 2 if that's all we have)
  const triCorners = corners.slice(0, Math.min(3, corners.length));
  
  if (triCorners.length === 2) {
    // Only accept 2-corner triangle if BOTH corners are very sharp (< 70°)
    if (triCorners[0].angle > Math.PI * 0.39 || triCorners[1].angle > Math.PI * 0.39) {
      console.log(`[SHAPE-REC]   triangle: 2 corners but not sharp enough for inference`);
      return null;
    }
    // Infer 3rd corner from bounding box - the point farthest from the line between 2 corners
    const c0 = triCorners[0], c1 = triCorners[1];
    const candidates = [
      { x: minX, y: minY }, { x: minX + bbW, y: minY },
      { x: minX + bbW / 2, y: minY }, { x: minX, y: minY + bbH },
      { x: minX + bbW, y: minY + bbH }, { x: minX + bbW / 2, y: minY + bbH },
    ];
    let bestDist = 0, bestPt = null;
    for (const pt of candidates) {
      const dist = distToSegment(pt.x, pt.y, c0.x, c0.y, c1.x, c1.y);
      if (dist > bestDist) { bestDist = dist; bestPt = pt; }
    }
    if (!bestPt || bestDist < 20) return null;
    triCorners.push({ ...bestPt, angle: Math.PI / 3 });
    console.log(`[SHAPE-REC]   triangle: inferred 3rd corner at (${bestPt.x.toFixed(0)}, ${bestPt.y.toFixed(0)})`);
  }

  // Verify: all sides should be reasonably long
  const a = Math.hypot(triCorners[1].x - triCorners[0].x, triCorners[1].y - triCorners[0].y);
  const b = Math.hypot(triCorners[2].x - triCorners[1].x, triCorners[2].y - triCorners[1].y);
  const c = Math.hypot(triCorners[0].x - triCorners[2].x, triCorners[0].y - triCorners[2].y);
  const perimeter = a + b + c;
  const minSide = Math.min(a, b, c);

  console.log(`[SHAPE-REC]   triangle sides: ${a.toFixed(0)}, ${b.toFixed(0)}, ${c.toFixed(0)}, minSide/perim=${(minSide/perimeter).toFixed(2)} (need >0.12)`);

  if (minSide < perimeter * 0.12) return null;

  return {
    type: 'triangle',
    bounds: { x: minX, y: minY, width: bbW, height: bbH },
  };
}


// ─── Rektangel / Diamond ─────────────────────────────────

function detectQuadrilateral(corners, minX, minY, bbW, bbH, cx, cy) {
  let c4;
  
  if (corners.length >= 4) {
    // Use the 4 sharpest corners
    c4 = corners.slice(0, 4);
  } else if (corners.length === 3) {
    // Try to infer the 4th corner
    // For a rectangle, the 4th corner = c0 + c2 - c1 (parallelogram rule)
    // Try all combinations and pick the one that gives the most rectangular result
    const sorted = sortPointsClockwise(corners, cx, cy);
    
    // Infer 4th corner from BB corners
    const bbCorners = [
      { x: minX, y: minY },
      { x: minX + bbW, y: minY },
      { x: minX + bbW, y: minY + bbH },
      { x: minX, y: minY + bbH },
    ];
    
    // Find the BB corner farthest from all 3 detected corners
    let bestCorner = null;
    let bestMinDist = 0;
    for (const bc of bbCorners) {
      const minDistToExisting = Math.min(
        ...sorted.map(c => Math.hypot(c.x - bc.x, c.y - bc.y))
      );
      if (minDistToExisting > bestMinDist) {
        bestMinDist = minDistToExisting;
        bestCorner = bc;
      }
    }
    
    if (!bestCorner || bestMinDist < 15) return null;
    c4 = [...sorted, { ...bestCorner, angle: Math.PI / 2 }];
    console.log(`[SHAPE-REC]   inferred 4th corner at (${bestCorner.x.toFixed(0)}, ${bestCorner.y.toFixed(0)})`);
  } else {
    return null;
  }

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

  const avgAngle = angles.reduce((s, a) => s + a, 0) / 4;
  const avgAngleError = angles.reduce((sum, a) => sum + Math.abs(a - Math.PI / 2), 0) / 4;
  
  console.log(`[SHAPE-REC]   quad angles: [${angles.map(a => (a*180/Math.PI).toFixed(1)).join('°, ')}°]`);
  console.log(`[SHAPE-REC]   avgAngleError: ${(avgAngleError * 180 / Math.PI).toFixed(1)}° (need <35° for rect)`);

  // Test DIAMOND first: corners should be near midpoints of bounding box edges
  const midTop = { x: cx, y: minY };
  const midRight = { x: minX + bbW, y: cy };
  const midBottom = { x: cx, y: minY + bbH };
  const midLeft = { x: minX, y: cy };
  const diamondPoints = [midTop, midRight, midBottom, midLeft];

  // For each corner, find distance to nearest diamond point
  let diamondError = 0;
  const usedDiamondPts = new Set();
  for (let i = 0; i < 4; i++) {
    let bestDist = Infinity;
    let bestIdx = -1;
    for (let j = 0; j < 4; j++) {
      if (usedDiamondPts.has(j)) continue;
      const d = Math.hypot(sorted[i].x - diamondPoints[j].x, sorted[i].y - diamondPoints[j].y);
      if (d < bestDist) { bestDist = d; bestIdx = j; }
    }
    usedDiamondPts.add(bestIdx);
    diamondError += bestDist;
  }
  const avgDiamondError = diamondError / 4;
  const bbDiag = Math.hypot(bbW, bbH);

  // For rectangle: corners should be near BB corners
  const rectCorners = [
    { x: minX, y: minY },
    { x: minX + bbW, y: minY },
    { x: minX + bbW, y: minY + bbH },
    { x: minX, y: minY + bbH },
  ];
  let rectError = 0;
  const usedRectPts = new Set();
  for (let i = 0; i < 4; i++) {
    let bestDist = Infinity;
    let bestIdx = -1;
    for (let j = 0; j < 4; j++) {
      if (usedRectPts.has(j)) continue;
      const d = Math.hypot(sorted[i].x - rectCorners[j].x, sorted[i].y - rectCorners[j].y);
      if (d < bestDist) { bestDist = d; bestIdx = j; }
    }
    usedRectPts.add(bestIdx);
    rectError += bestDist;
  }
  const avgRectError = rectError / 4;

  const normalizedDiamondError = avgDiamondError / bbDiag;
  const normalizedRectError = avgRectError / bbDiag;

  console.log(`[SHAPE-REC]   diamondError: ${avgDiamondError.toFixed(1)} (normalized: ${normalizedDiamondError.toFixed(3)})`);
  console.log(`[SHAPE-REC]   rectError: ${avgRectError.toFixed(1)} (normalized: ${normalizedRectError.toFixed(3)})`);

  // Pick whichever fits better
  if (normalizedDiamondError < 0.2 && normalizedDiamondError < normalizedRectError * 0.8) {
    return {
      type: 'diamond',
      bounds: { x: minX, y: minY, width: bbW, height: bbH },
    };
  }

  if (avgAngleError < 0.6) { // ~35° average error from 90°
    return {
      type: 'rectangle',
      bounds: { x: minX, y: minY, width: bbW, height: bbH },
    };
  }

  if (normalizedDiamondError < 0.25) {
    return {
      type: 'diamond',
      bounds: { x: minX, y: minY, width: bbW, height: bbH },
    };
  }

  // Fallback rectangle
  if (avgAngleError < 0.8) {
    return {
      type: 'rectangle',
      bounds: { x: minX, y: minY, width: bbW, height: bbH },
    };
  }

  return null;
}


// ─── Hörndetektering ──────────────────────────────────────

function detectCorners(points) {
  if (points.length < 5) return [];

  // Use multiple RDP passes to find corners at different scales
  const simplified1 = simplifyPath(points, 3);  // Fine detail
  const simplified2 = simplifyPath(points, 5);  // Medium
  
  console.log(`[SHAPE-REC] Corner detection: ${points.length} pts → ${simplified1.length} fine, ${simplified2.length} medium`);
  
  // Also compute angular velocity on the raw points to find sharp turns
  const angularCorners = detectCornersAngularVelocity(points);
  console.log(`[SHAPE-REC]   Angular velocity corners: ${angularCorners.length}`);
  
  // Collect corner candidates from all methods
  const allCandidates = [];
  const minAngle = Math.PI * 0.78; // ~140° — more permissive for hand-drawn shapes
  
  // From fine simplification
  for (let i = 1; i < simplified1.length - 1; i++) {
    const angle = angleBetween(simplified1[i - 1], simplified1[i], simplified1[i + 1]);
    if (angle < minAngle) {
      allCandidates.push({ ...simplified1[i], angle, source: 'fine' });
    }
  }
  
  // From medium simplification
  for (let i = 1; i < simplified2.length - 1; i++) {
    const angle = angleBetween(simplified2[i - 1], simplified2[i], simplified2[i + 1]);
    if (angle < minAngle) {
      allCandidates.push({ ...simplified2[i], angle, source: 'medium' });
    }
  }
  
  // From angular velocity
  for (const c of angularCorners) {
    allCandidates.push({ ...c, source: 'angular' });
  }
  
  // Merge nearby candidates (within 30px), keeping the sharpest angle
  const merged = [];
  for (const c of allCandidates) {
    const nearby = merged.findIndex(m => Math.hypot(m.x - c.x, m.y - c.y) < 30);
    if (nearby >= 0) {
      if (c.angle < merged[nearby].angle) {
        merged[nearby] = c; // Keep sharper one
      }
    } else {
      merged.push(c);
    }
  }
  
  // Sort by angle (sharpest first)
  merged.sort((a, b) => a.angle - b.angle);
  
  for (const c of merged) {
    const angleDeg = c.angle * 180 / Math.PI;
    console.log(`[SHAPE-REC]   merged corner: (${c.x.toFixed(0)}, ${c.y.toFixed(0)}) angle=${angleDeg.toFixed(1)}° [${c.source}]`);
  }

  return merged;
}

/**
 * Detect corners using angular velocity (rate of direction change).
 * This works better than RDP for finding corners in hand-drawn paths.
 */
function detectCornersAngularVelocity(points) {
  if (points.length < 10) return [];
  
  const windowSize = Math.max(3, Math.floor(points.length / 20));
  const corners = [];
  
  // Compute direction at each point using a window
  const directions = [];
  for (let i = 0; i < points.length; i++) {
    const prevIdx = Math.max(0, i - windowSize);
    const nextIdx = Math.min(points.length - 1, i + windowSize);
    const dx = points[nextIdx].x - points[prevIdx].x;
    const dy = points[nextIdx].y - points[prevIdx].y;
    directions.push(Math.atan2(dy, dx));
  }
  
  // Compute angular velocity (rate of direction change)
  const angularVelocities = [];
  for (let i = 1; i < directions.length; i++) {
    let delta = directions[i] - directions[i - 1];
    // Normalize to [-π, π]
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    angularVelocities.push(Math.abs(delta));
  }
  
  // Find peaks in angular velocity
  const threshold = 0.05; // Minimum angular velocity for a corner (lowered from 0.08)
  const minDist = Math.floor(points.length / 10); // Min distance between corners
  
  for (let i = windowSize; i < angularVelocities.length - windowSize; i++) {
    if (angularVelocities[i] < threshold) continue;
    
    // Check if this is a local peak
    let isPeak = true;
    for (let j = Math.max(0, i - minDist); j < Math.min(angularVelocities.length, i + minDist); j++) {
      if (j !== i && angularVelocities[j] > angularVelocities[i]) {
        isPeak = false;
        break;
      }
    }
    
    if (isPeak) {
      // Compute the actual angle at this point using wider window
      const backIdx = Math.max(0, i - windowSize * 4);
      const fwdIdx = Math.min(points.length - 1, i + windowSize * 4);
      const angle = angleBetween(points[backIdx], points[i], points[fwdIdx]);
      
      if (angle < Math.PI * 0.85) { // ~153° max
        corners.push({ x: points[i].x, y: points[i].y, angle });
      }
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
