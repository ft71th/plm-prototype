/**
 * CanvasRenderer — Orchestrates all rendering on the HTML5 Canvas.
 *
 * Render order:
 * 1. Clear canvas
 * 2. Apply transform (pan/zoom)
 * 3. Grid
 * 4. Elements (shapes, text, lines) in z-order
 * 5. Selection overlays (handles, lasso, guides)
 */

import { renderGrid } from './renderers/GridRenderer';
import { renderShape } from './renderers/ShapeRenderer';
import { renderText } from './renderers/TextRenderer';
import { renderLine, renderConnectionPoints } from './renderers/LineRenderer';
import { renderSelection, renderAlignmentGuides } from './renderers/SelectionRenderer';

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._rafId = null;
    this._dirty = true;
    this._guides = [];
    this._previewElement = null; // Element being created (shape/line preview)
    this._showConnectionPoints = false; // Show connection points on shapes (line tool)
  }

  /**
   * Mark the canvas as needing a re-render.
   * Batches renders via requestAnimationFrame.
   */
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

  setAlignmentGuides(guides) {
    this._guides = guides || [];
  }

  setPreviewElement(element) {
    this._previewElement = element;
  }

  /**
   * Full render pass.
   */
  render(state) {
    if (!state) return;
    this._lastState = state;

    const ctx = this.ctx;
    const canvas = this.canvas;
    const dpr = window.devicePixelRatio || 1;

    // Handle high-DPI displays
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      ctx.scale(dpr, dpr);
    }

    // 1. Clear
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // 2. Apply transform
    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.zoom, state.zoom);

    // 3. Grid
    renderGrid(ctx, {
      gridEnabled: state.gridEnabled,
      gridSize: state.gridSize,
      panX: state.panX,
      panY: state.panY,
      zoom: state.zoom,
      canvasWidth: displayWidth,
      canvasHeight: displayHeight,
    });

    // 4. Elements in z-order
    for (const id of state.elementOrder) {
      const el = state.elements[id];
      if (!el || !el.visible) continue;

      // Skip elements being inline-edited (rendered as overlay instead)
      if (el.id === state.editingElementId) continue;

      this.renderElement(ctx, el);
    }

    // 4b. Preview element (being created via drag)
    if (this._previewElement) {
      ctx.globalAlpha = 0.6;
      this.renderElement(ctx, this._previewElement);
      ctx.globalAlpha = 1;
    }

    // 4c. Connection point indicators (when line tool is active)
    if (this._showConnectionPoints) {
      renderConnectionPoints(ctx, state.elements, state.elementOrder, state.zoom);
    }

    // 5. Selection overlays
    renderSelection(ctx, state);

    // 5b. Alignment guides
    if (state.showAlignmentGuides && this._guides.length > 0) {
      renderAlignmentGuides(ctx, this._guides);
    }

    ctx.restore();
  }

  renderElement(ctx, element) {
    switch (element.type) {
      case 'shape':
        renderShape(ctx, element);
        break;
      case 'text':
        renderText(ctx, element);
        break;
      case 'line':
        // Inline line rendering to guarantee visibility
        this._renderLineInline(ctx, element);
        break;
      default:
        break;
    }
  }

  /**
   * Inline line rendering — draws line directly on canvas context.
   * Handles: straight lines, bézier curves, arrow heads, line styles, labels.
   */
  _renderLineInline(ctx, line) {
    const { x, y, x2, y2 } = line;
    if (x === undefined || y === undefined || x2 === undefined || y2 === undefined) return;

    const stroke = line.stroke || '#000000';
    const strokeWidth = line.strokeWidth || 2;
    const lineStyle = line.lineStyle || 'solid';
    const arrowHead = line.arrowHead || 'none';

    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Dash pattern
    if (lineStyle === 'dashed') {
      ctx.setLineDash([10, 6]);
    } else if (lineStyle === 'dotted') {
      ctx.setLineDash([3, 4]);
    } else {
      ctx.setLineDash([]);
    }

    // Bézier curve support
    const isCurved = !!line.curvature && line.curvature !== 0;
    let cpx, cpy;
    if (isCurved) {
      const midX = (x + x2) / 2;
      const midY = (y + y2) / 2;
      const dx = x2 - x;
      const dy = y2 - y;
      const len = Math.hypot(dx, dy) || 1;
      cpx = midX + (-dy / len) * line.curvature;
      cpy = midY + (dx / len) * line.curvature;
    }

    // Draw line path
    ctx.beginPath();
    ctx.moveTo(x, y);
    if (isCurved) {
      ctx.quadraticCurveTo(cpx, cpy, x2, y2);
    } else {
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    // Reset dash for arrow heads
    ctx.setLineDash([]);

    // Arrow head at end
    if (arrowHead && arrowHead !== 'none') {
      let angle;
      if (isCurved) {
        angle = Math.atan2(y2 - cpy, x2 - cpx);
      } else {
        angle = Math.atan2(y2 - y, x2 - x);
      }
      this._drawArrowHead(ctx, x2, y2, angle, arrowHead, stroke, strokeWidth);
    }

    // Arrow tail at start
    if (line.arrowTail && line.arrowTail !== 'none') {
      let angle;
      if (isCurved) {
        angle = Math.atan2(y - cpy, x - cpx);
      } else {
        angle = Math.atan2(y - y2, x - x2);
      }
      this._drawArrowHead(ctx, x, y, angle, line.arrowTail, stroke, strokeWidth);
    }

    // Connection dots
    if (line.startConnection) {
      ctx.fillStyle = '#2196F3';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (line.endConnection) {
      ctx.fillStyle = '#2196F3';
      ctx.beginPath();
      ctx.arc(x2, y2, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Label
    if (line.label && line.label.text) {
      let lx, ly;
      if (isCurved) {
        lx = 0.25 * x + 0.5 * cpx + 0.25 * x2;
        ly = 0.25 * y + 0.5 * cpy + 0.25 * y2;
      } else {
        lx = (x + x2) / 2;
        ly = (y + y2) / 2;
      }
      const offset = line.label.offset || -14;
      const dx2 = x2 - x;
      const dy2 = y2 - y;
      const len2 = Math.hypot(dx2, dy2) || 1;
      lx += (-dy2 / len2) * offset;
      ly += (dx2 / len2) * offset;

      const fSize = line.label.fontSize || 12;
      ctx.font = `${fSize}px ${line.label.fontFamily || 'Inter, system-ui, sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Background pill
      const metrics = ctx.measureText(line.label.text);
      const pw = metrics.width + 12;
      const ph = fSize + 6;
      ctx.fillStyle = line.label.background || 'rgba(255,255,255,0.9)';
      ctx.fillRect(lx - pw / 2, ly - ph / 2, pw, ph);
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.strokeRect(lx - pw / 2, ly - ph / 2, pw, ph);

      ctx.fillStyle = line.label.color || '#333333';
      ctx.fillText(line.label.text, lx, ly);
    }

    ctx.restore();
  }

  _drawArrowHead(ctx, tipX, tipY, angle, type, color, lineWidth) {
    const size = Math.max(10, lineWidth * 4);
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    switch (type) {
      case 'arrow':
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-size, -size * 0.4);
        ctx.lineTo(-size * 0.7, 0);
        ctx.lineTo(-size, size * 0.4);
        ctx.closePath();
        ctx.fill();
        break;
      case 'open-arrow':
        ctx.beginPath();
        ctx.moveTo(-size, -size * 0.4);
        ctx.lineTo(0, 0);
        ctx.lineTo(-size, size * 0.4);
        ctx.stroke();
        break;
      case 'diamond': {
        const ds = size * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-ds, -ds * 0.5);
        ctx.lineTo(-ds * 2, 0);
        ctx.lineTo(-ds, ds * 0.5);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'circle': {
        const r = size * 0.3;
        ctx.beginPath();
        ctx.arc(-r, 0, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      default:
        break;
    }
    ctx.restore();
  }

  /**
   * Hit-test: find the topmost element at (x, y) in world coordinates.
   * Returns element ID or null.
   */
  hitTest(state, worldX, worldY) {
    const { hitTest: elementHitTest } = require('../../utils/geometry');

    // Iterate in reverse order (topmost first)
    for (let i = state.elementOrder.length - 1; i >= 0; i--) {
      const id = state.elementOrder[i];
      const el = state.elements[id];
      if (!el || !el.visible) continue;

      if (elementHitTest(el, worldX, worldY)) {
        return id;
      }
    }
    return null;
  }

  /**
   * Convert screen coordinates to world coordinates.
   */
  screenToWorld(screenX, screenY, state) {
    return {
      x: (screenX - state.panX) / state.zoom,
      y: (screenY - state.panY) / state.zoom,
    };
  }

  /**
   * Destroy the renderer — cancel any pending animation frame.
   */
  destroy() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }
}
