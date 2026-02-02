/**
 * WhiteboardCanvas — Main canvas component for the whiteboard.
 *
 * Handles:
 * - Canvas rendering via CanvasRenderer
 * - Mouse event delegation to active tool
 * - Inline text editing overlay
 * - Pan/zoom via mouse wheel
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasRenderer } from './CanvasRenderer';
import { SelectTool } from './tools/SelectTool';
import { ShapeTool } from './tools/ShapeTool';
import { TextTool } from './tools/TextTool';
import { LineTool } from './tools/LineTool';
import useWhiteboardStore from '../../stores/whiteboardStore';
import { useWhiteboardKeyboard } from '../../hooks/useWhiteboardKeyboard';

// ─── Tool Instances (persistent across renders) ─────────
const tools = {
  select: new SelectTool(),
  shape: new ShapeTool(),
  text: new TextTool(),
  line: new LineTool(),
};

export default function WhiteboardCanvas({ className = '' }) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const containerRef = useRef(null);
  const textareaRef = useRef(null);

  // Subscribe to relevant store slices
  const state = useWhiteboardStore();
  const store = useWhiteboardStore;

  // Keyboard shortcuts
  useWhiteboardKeyboard(store);

  // ─── Renderer lifecycle ─────────────────────────────
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvasRef.current);
    }
    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, []);

  // Re-render whenever state changes
  useEffect(() => {
    rendererRef.current?.render(state);
  }, [state]);

  // ─── Resize observer ────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      rendererRef.current?.markDirty();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ─── Coordinate conversion ─────────────────────────
  const getWorldCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return rendererRef.current?.screenToWorld(screenX, screenY, store.getState()) || { x: screenX, y: screenY };
  }, []);

  // ─── Get active tool ────────────────────────────────
  const getActiveTool = useCallback(() => {
    return tools[state.activeTool] || tools.select;
  }, [state.activeTool]);

  // ─── Mouse handlers ─────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return; // Only left click

    // Close inline editor if clicking outside
    if (state.editingElementId) {
      store.getState().setEditingElementId(null);
    }

    const world = getWorldCoords(e);
    getActiveTool().onMouseDown(world.x, world.y, e.shiftKey, store, rendererRef.current);
    rendererRef.current?.markDirty();
  }, [state.editingElementId, getWorldCoords, getActiveTool]);

  const handleMouseMove = useCallback((e) => {
    const world = getWorldCoords(e);
    const tool = getActiveTool();

    tool.onMouseMove(world.x, world.y, e.shiftKey, store, rendererRef.current);

    // Update cursor
    const cursor = tool.getCursor?.(world.x, world.y, store.getState()) || 'default';
    if (canvasRef.current) {
      canvasRef.current.style.cursor = cursor;
    }

    rendererRef.current?.markDirty();
  }, [getWorldCoords, getActiveTool]);

  const handleMouseUp = useCallback((e) => {
    const world = getWorldCoords(e);
    getActiveTool().onMouseUp(world.x, world.y, e.shiftKey, store, rendererRef.current);
    rendererRef.current?.markDirty();
  }, [getWorldCoords, getActiveTool]);

  const handleDoubleClick = useCallback((e) => {
    const world = getWorldCoords(e);
    getActiveTool().onDoubleClick?.(world.x, world.y, store, rendererRef.current);
    rendererRef.current?.markDirty();
  }, [getWorldCoords, getActiveTool]);

  // ─── Wheel handler (pan/zoom) ──────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const s = store.getState();

    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, s.zoom * delta));

      // Zoom toward cursor position
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newPanX = mouseX - (mouseX - s.panX) * (newZoom / s.zoom);
      const newPanY = mouseY - (mouseY - s.panY) * (newZoom / s.zoom);

      store.getState().setZoom(newZoom);
      store.getState().setPan(newPanX, newPanY);
    } else {
      // Pan
      store.getState().setPan(s.panX - e.deltaX, s.panY - e.deltaY);
    }

    rendererRef.current?.markDirty();
  }, []);

  // ─── Inline text editing ───────────────────────────
  const editingElement = state.editingElementId
    ? state.elements[state.editingElementId]
    : null;

  const handleTextChange = useCallback((e) => {
    if (!state.editingElementId) return;
    const el = state.elements[state.editingElementId];
    if (!el) return;

    if (el.type === 'text') {
      store.getState().updateElement(state.editingElementId, {
        content: { ...el.content, text: e.target.value },
      });
    } else if (el.type === 'shape') {
      const currentText = el.text || {
        text: '', fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 'normal', fontStyle: 'normal', color: '#000000',
        align: 'center', verticalAlign: 'middle',
      };
      store.getState().updateElement(state.editingElementId, {
        text: { ...currentText, text: e.target.value },
      });
    } else if (el.type === 'line') {
      const currentLabel = el.label || {
        text: '', fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif',
        color: '#333333', background: 'rgba(255,255,255,0.9)',
      };
      store.getState().updateElement(state.editingElementId, {
        label: { ...currentLabel, text: e.target.value },
      });
    }
  }, [state.editingElementId, state.elements]);

  const handleTextBlur = useCallback(() => {
    // Defer to avoid race condition: mousedown on canvas fires before blur,
    // and may set a NEW editingElementId (e.g. TextTool creating next element).
    // If we clear immediately, we'd overwrite the new editing state.
    const currentEditingId = state.editingElementId;
    requestAnimationFrame(() => {
      // Only clear if no new editing started since the blur
      if (store.getState().editingElementId === currentEditingId) {
        store.getState().setEditingElementId(null);
      }
    });
  }, [state.editingElementId]);

  const handleTextKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      store.getState().setEditingElementId(null);
    }
    e.stopPropagation(); // Don't let keyboard shortcuts fire
  }, []);

  // Focus textarea when editing starts (NOT on every content change)
  useEffect(() => {
    if (state.editingElementId) {
      // Double-rAF: first waits for React DOM commit, second ensures paint.
      // This is needed because canvas mouseDown steals browser focus,
      // and the textarea might not be in DOM yet during the first frame.
      const focusTextarea = () => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          if (textareaRef.current.value) {
            textareaRef.current.select();
          }
        }
      };
      requestAnimationFrame(() => {
        requestAnimationFrame(focusTextarea);
      });
    }
  }, [state.editingElementId]);

  // ─── Calculate textarea position ───────────────────
  const getTextareaStyle = () => {
    if (!editingElement) return { display: 'none' };

    const s = store.getState();
    const el = editingElement;

    let left, top, width, height, fontSize, fontFamily, fontWeight, fontStyle, color, textAlign;

    if (el.type === 'line') {
      // Position textarea at line midpoint
      const midX = ((el.x || 0) + (el.x2 || 0)) / 2;
      const midY = ((el.y || 0) + (el.y2 || 0)) / 2;
      const labelData = el.label || {};
      fontSize = (labelData.fontSize || 12) * s.zoom;
      left = (midX - 75) * s.zoom + s.panX;
      top = (midY - 15) * s.zoom + s.panY;
      width = 150 * s.zoom;
      height = 30 * s.zoom;
      fontFamily = labelData.fontFamily || 'Inter, system-ui, sans-serif';
      fontWeight = 'normal';
      fontStyle = 'normal';
      color = labelData.color || '#333333';
      textAlign = 'center';
    } else {
      const textContent = el.type === 'text' ? el.content : (el.text || {});
      left = el.x * s.zoom + s.panX;
      top = el.y * s.zoom + s.panY;
      width = (el.width || 150) * s.zoom;
      height = (el.height || 30) * s.zoom;
      fontSize = (textContent.fontSize || 14) * s.zoom;
      fontFamily = textContent.fontFamily || 'sans-serif';
      fontWeight = textContent.fontWeight || 'normal';
      fontStyle = textContent.fontStyle || 'normal';
      color = textContent.color || '#000000';
      textAlign = textContent.align || 'center';
    }

    return {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      fontSize: `${fontSize}px`,
      fontFamily,
      fontWeight,
      fontStyle,
      color,
      textAlign,
      background: 'rgba(255,255,255,0.9)',
      border: '2px solid #2196F3',
      borderRadius: '2px',
      outline: 'none',
      resize: 'none',
      overflow: 'hidden',
      padding: '4px 8px',
      boxSizing: 'border-box',
      zIndex: 10,
      lineHeight: 1.3,
    };
  };

  const getTextareaValue = () => {
    if (!editingElement) return '';
    if (editingElement.type === 'text') return editingElement.content?.text || '';
    if (editingElement.type === 'shape') return editingElement.text?.text || '';
    if (editingElement.type === 'line') return editingElement.label?.text || '';
    return '';
  };

  // ─── Render ─────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`whiteboard-canvas-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Inline text editing overlay */}
      {editingElement && (
        <textarea
          ref={textareaRef}
          value={getTextareaValue()}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          onKeyDown={handleTextKeyDown}
          style={getTextareaStyle()}
        />
      )}
    </div>
  );
}
