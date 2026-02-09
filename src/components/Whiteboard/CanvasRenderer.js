/**
 * CanvasRenderer — Orchestrates all rendering on the HTML5 Canvas.
 *
 * Deliverable 5: Path, image, sticky-note, orthogonal lines,
 * pen preview, search highlights
 */

import { renderGrid } from './renderers/GridRenderer';
import { renderShape } from './renderers/ShapeRenderer';
import { renderText } from './renderers/TextRenderer';
import { renderConnectionPoints } from './renderers/LineRenderer';
import { renderPath, renderPathPreview } from './renderers/PathRenderer';
import { renderImage } from './renderers/ImageRenderer';
import { renderSelection, renderAlignmentGuides } from './renderers/SelectionRenderer';
import { hitTest as elementHitTest } from '../../utils/geometry';

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._rafId = null;
    this._dirty = true;
    this._guides = [];
    this._previewElement = null;
    this._showConnectionPoints = false;
    this._penPreviewPoints = null;
    this._penPreviewState = null;
  }

  markDirty() {
    this._dirty = true;
    if (!this._rafId) {
      this._rafId = requestAnimationFrame(() => {
        this._rafId = null;
        if (this._dirty) {
          this._dirty = false;
          this.render(this._lastState);
        }
      });
    }
  }

  setAlignmentGuides(guides) { this._guides = guides || []; }
  setPreviewElement(element) { this._previewElement = element; }

  setPenPreview(points, state) {
    this._penPreviewPoints = points;
    this._penPreviewState = state || null;
    this.markDirty();
  }

  render(state) {
    if (!state) return;
    this._lastState = state;

    const ctx = this.ctx;
    const canvas = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.zoom, state.zoom);

    // Grid
    renderGrid(ctx, {
      gridEnabled: state.gridEnabled, gridSize: state.gridSize,
      panX: state.panX, panY: state.panY, zoom: state.zoom,
      canvasWidth: displayWidth, canvasHeight: displayHeight,
    });

    // Elements in z-order (respecting layer visibility)
    for (const id of state.elementOrder) {
      const el = state.elements[id];
      if (!el || !el.visible) continue;
      if (el.id === state.editingElementId) continue;
      // Layer visibility check
      const layerId = el.layerId || 'default';
      const layer = (state.layers || []).find((l) => l.id === layerId);
      if (layer && !layer.visible) continue;
      // Render frame elements specially
      if (el.type === 'frame') {
        this._renderFrame(ctx, el, state.zoom);
        continue;
      }
      this.renderElement(ctx, el);
      // PLM badge
      if (el.plmNodeId) {
        this._renderPLMBadge(ctx, el, state.zoom);
      }
    }

    // Preview element
    if (this._previewElement) {
      ctx.globalAlpha = 0.6;
      this.renderElement(ctx, this._previewElement);
      ctx.globalAlpha = 1;
    }

    // Pen preview
    if (this._penPreviewPoints && this._penPreviewPoints.length > 1) {
      renderPathPreview(ctx, this._penPreviewPoints, this._penPreviewState || state);
    }

    // Connection points
    if (this._showConnectionPoints) {
      renderConnectionPoints(ctx, state.elements, state.elementOrder, state.zoom);
    }

    // Search highlights
    if (state.searchHighlights && state.searchHighlights.length > 0) {
      this._renderSearchHighlights(ctx, state);
    }

    // Selection overlays
    renderSelection(ctx, state);

    if (state.showAlignmentGuides && this._guides.length > 0) {
      renderAlignmentGuides(ctx, this._guides);
    }

    ctx.restore();
  }

  renderElement(ctx, element) {
    switch (element.type) {
      case 'shape':  renderShape(ctx, element); break;
      case 'text':   renderText(ctx, element); break;
      case 'line':   this._renderLineInline(ctx, element); break;
      case 'path':   renderPath(ctx, element); break;
      case 'image':  renderImage(ctx, element); break;
      default: break;
    }
  }

  _renderSearchHighlights(ctx, state) {
    ctx.save();
    const zoom = state.zoom;
    for (const id of state.searchHighlights) {
      const el = state.elements[id];
      if (!el) continue;
      let bx, by, bw, bh;
      if (el.type === 'line') {
        bx = Math.min(el.x, el.x2) - 10;
        by = Math.min(el.y, el.y2) - 10;
        bw = Math.abs(el.x2 - el.x) + 20;
        bh = Math.abs(el.y2 - el.y) + 20;
      } else {
        bx = el.x - 4; by = el.y - 4;
        bw = (el.width || 0) + 8; bh = (el.height || 0) + 8;
      }
      ctx.strokeStyle = '#FF9800';
      ctx.lineWidth = 3 / zoom;
      ctx.setLineDash([6 / zoom, 3 / zoom]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = 'rgba(255, 152, 0, 0.08)';
      ctx.fillRect(bx, by, bw, bh);
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ─── Line rendering (straight / curved / orthogonal) ───

  _renderLineInline(ctx, line) {
    const { x, y, x2, y2 } = line;
    if (x === undefined || y === undefined || x2 === undefined || y2 === undefined) return;

    const stroke = line.stroke || '#000000';
    const strokeWidth = line.strokeWidth || 2;
    const lineStyle = line.lineStyle || 'solid';
    const arrowHead = line.arrowHead || 'none';
    const routing = line.routing || 'straight';

    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (lineStyle === 'dashed') ctx.setLineDash([10, 6]);
    else if (lineStyle === 'dotted') ctx.setLineDash([3, 4]);
    else ctx.setLineDash([]);

    // ─── Orthogonal ────────────────────────
    if (routing === 'orthogonal') {
      const segs = this._calcOrthogonalPath(line);
      ctx.beginPath();
      ctx.moveTo(segs[0].x, segs[0].y);
      for (let i = 1; i < segs.length; i++) ctx.lineTo(segs[i].x, segs[i].y);
      ctx.stroke();

      ctx.setLineDash([]);
      if (arrowHead && arrowHead !== 'none') {
        const last = segs[segs.length - 1];
        const prev = segs[segs.length - 2];
        this._drawArrowHead(ctx, last.x, last.y, Math.atan2(last.y - prev.y, last.x - prev.x), arrowHead, stroke, strokeWidth);
      }
      this._renderConnectionDots(ctx, line);
      if (line.label?.text) {
        const mid = segs[Math.floor(segs.length / 2)];
        this._renderLineLabel(ctx, line, mid.x, mid.y);
      }
      ctx.restore();
      return;
    }

    // ─── Straight / Bézier ─────────────────
    const isCurved = !!line.curvature && line.curvature !== 0;
    let cpx, cpy;
    if (isCurved) {
      const midX = (x + x2) / 2, midY = (y + y2) / 2;
      const dx = x2 - x, dy = y2 - y;
      const len = Math.hypot(dx, dy) || 1;
      cpx = midX + (-dy / len) * line.curvature;
      cpy = midY + (dx / len) * line.curvature;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    if (isCurved) ctx.quadraticCurveTo(cpx, cpy, x2, y2);
    else ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.setLineDash([]);
    if (arrowHead && arrowHead !== 'none') {
      const angle = isCurved ? Math.atan2(y2 - cpy, x2 - cpx) : Math.atan2(y2 - y, x2 - x);
      this._drawArrowHead(ctx, x2, y2, angle, arrowHead, stroke, strokeWidth);
    }
    if (line.arrowTail && line.arrowTail !== 'none') {
      const angle = isCurved ? Math.atan2(y - cpy, x - cpx) : Math.atan2(y - y2, x - x2);
      this._drawArrowHead(ctx, x, y, angle, line.arrowTail, stroke, strokeWidth);
    }

    this._renderConnectionDots(ctx, line);

    if (line.label?.text) {
      let lx, ly;
      if (isCurved) { lx = 0.25*x + 0.5*cpx + 0.25*x2; ly = 0.25*y + 0.5*cpy + 0.25*y2; }
      else { lx = (x+x2)/2; ly = (y+y2)/2; }
      const offset = line.label.offset || -14;
      const dx2 = x2-x, dy2 = y2-y, len2 = Math.hypot(dx2,dy2)||1;
      lx += (-dy2/len2)*offset; ly += (dx2/len2)*offset;
      this._renderLineLabel(ctx, line, lx, ly);
    }

    ctx.restore();
  }

  _calcOrthogonalPath(line) {
    const { x, y, x2, y2, startConnection, endConnection } = line;
    const startDir = startConnection?.side || null;
    const OFFSET = 30;

    if (startDir === 'right' || startDir === 'left') {
      const midX = startDir === 'right'
        ? Math.max(x + OFFSET, (x + x2) / 2)
        : Math.min(x - OFFSET, (x + x2) / 2);
      return [{ x, y }, { x: midX, y }, { x: midX, y: y2 }, { x: x2, y: y2 }];
    } else if (startDir === 'top' || startDir === 'bottom') {
      const midY = startDir === 'bottom'
        ? Math.max(y + OFFSET, (y + y2) / 2)
        : Math.min(y - OFFSET, (y + y2) / 2);
      return [{ x, y }, { x, y: midY }, { x: x2, y: midY }, { x: x2, y: y2 }];
    }
    // Default H-V
    const midX = (x + x2) / 2;
    return [{ x, y }, { x: midX, y }, { x: midX, y: y2 }, { x: x2, y: y2 }];
  }

  _renderConnectionDots(ctx, line) {
    if (line.startConnection) {
      ctx.fillStyle = '#2196F3'; ctx.beginPath(); ctx.arc(line.x, line.y, 4, 0, Math.PI*2); ctx.fill();
    }
    if (line.endConnection) {
      ctx.fillStyle = '#2196F3'; ctx.beginPath(); ctx.arc(line.x2, line.y2, 4, 0, Math.PI*2); ctx.fill();
    }
  }

  _renderLineLabel(ctx, line, lx, ly) {
    const fSize = line.label.fontSize || 12;
    ctx.font = `${fSize}px ${line.label.fontFamily || 'Inter, system-ui, sans-serif'}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const m = ctx.measureText(line.label.text);
    const pw = m.width + 12, ph = fSize + 6;
    ctx.fillStyle = line.label.background || 'rgba(255,255,255,0.9)';
    ctx.fillRect(lx - pw/2, ly - ph/2, pw, ph);
    ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1;
    ctx.strokeRect(lx - pw/2, ly - ph/2, pw, ph);
    ctx.fillStyle = line.label.color || '#333333';
    ctx.fillText(line.label.text, lx, ly);
  }

  _drawArrowHead(ctx, tipX, tipY, angle, type, color, lineWidth) {
    const size = Math.max(10, lineWidth * 4);
    ctx.save(); ctx.translate(tipX, tipY); ctx.rotate(angle);
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = lineWidth;
    switch (type) {
      case 'arrow':
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-size,-size*0.4); ctx.lineTo(-size*0.7,0); ctx.lineTo(-size,size*0.4); ctx.closePath(); ctx.fill(); break;
      case 'open-arrow':
        ctx.beginPath(); ctx.moveTo(-size,-size*0.4); ctx.lineTo(0,0); ctx.lineTo(-size,size*0.4); ctx.stroke(); break;
      case 'diamond': {
        const ds = size*0.5; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-ds,-ds*0.5); ctx.lineTo(-ds*2,0); ctx.lineTo(-ds,ds*0.5); ctx.closePath(); ctx.fill(); break;
      }
      case 'circle': {
        const r = size*0.3; ctx.beginPath(); ctx.arc(-r,0,r,0,Math.PI*2); ctx.fill(); break;
      }
      default: break;
    }
    ctx.restore();
  }

  // ─── Frame rendering ──────────────────────────────────
  _renderFrame(ctx, frame, zoom) {
    const { x, y, width, height, label, stroke } = frame;
    ctx.save();
    ctx.strokeStyle = stroke || '#6366f1';
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([8 / zoom, 4 / zoom]);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);

    // Frame label
    if (label) {
      const fontSize = Math.max(12, 14 / zoom);
      ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = stroke || '#6366f1';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, x + 4, y - 4);
    }

    // Light background
    ctx.fillStyle = 'rgba(99, 102, 241, 0.02)';
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }

  // ─── PLM badge rendering ─────────────────────────────
  _renderPLMBadge(ctx, element, zoom) {
    if (!element.plmNodeId) return;
    const ex = element.x + (element.width || 20) - 6;
    const ey = element.y - 6;
    const size = Math.max(10, 12 / zoom);
    ctx.save();
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(ex, ey, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(8 / zoom)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', ex, ey);
    ctx.restore();
  }

  hitTest(state, worldX, worldY) {
    
    for (let i = state.elementOrder.length - 1; i >= 0; i--) {
      const id = state.elementOrder[i];
      const el = state.elements[id];
      if (!el || !el.visible) continue;
      // Layer visibility check
      const layerId = el.layerId || 'default';
      const layer = (state.layers || []).find((l) => l.id === layerId);
      if (layer && (!layer.visible || layer.locked)) continue;

      // For rotated elements, transform the test point into the element's local space
      let testX = worldX;
      let testY = worldY;
      if (el.rotation && el.rotation !== 0 && el.type !== 'line') {
        const cx = el.x + (el.width || 0) / 2;
        const cy = el.y + (el.height || 0) / 2;
        const cos = Math.cos(-el.rotation);
        const sin = Math.sin(-el.rotation);
        const dx = worldX - cx;
        const dy = worldY - cy;
        testX = cx + dx * cos - dy * sin;
        testY = cy + dx * sin + dy * cos;
      }

      if (elementHitTest(el, testX, testY)) return id;
    }
    return null;
  }

  screenToWorld(screenX, screenY, state) {
    return { x: (screenX - state.panX) / state.zoom, y: (screenY - state.panY) / state.zoom };
  }

  destroy() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  }
}
