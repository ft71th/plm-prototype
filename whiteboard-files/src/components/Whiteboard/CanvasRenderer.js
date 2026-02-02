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
import { renderSelection, renderAlignmentGuides } from './renderers/SelectionRenderer';

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._rafId = null;
    this._dirty = true;
    this._guides = [];
    this._previewElement = null; // Element being created (shape/line preview)
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
      // 'line' will be added in Deliverable 2
      default:
        break;
    }
  }

  /**
   * Hit-test: find the topmost element at (x, y) in world coordinates.
   * Returns element ID or null.
   */
  hitTest(state, worldX, worldY) {
    const { hitTest: elementHitTest } = require('../../../utils/geometry');

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
