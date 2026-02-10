/**
 * WhiteboardCanvas — Main canvas component for the whiteboard.
 *
 * Handles:
 * - Canvas rendering via CanvasRenderer
 * - Mouse event delegation to active tool
 * - Inline text editing overlay
 * - Pan/zoom via mouse wheel
 * - Image paste (Ctrl+V) and drag-and-drop
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasRenderer } from './CanvasRenderer';
import { SelectTool } from './tools/SelectTool';
import { ShapeTool } from './tools/ShapeTool';
import { TextTool } from './tools/TextTool';
import { TrimTool } from './tools/TrimTool';
import { PenTool } from './tools/PenTool';
import { LineTool } from './tools/LineTool';
import useWhiteboardStore from '../../stores/whiteboardStore';
import { useWhiteboardKeyboard } from '../../hooks/useWhiteboardKeyboard';

// ─── Tool Instances (persistent across renders) ─────────────
const tools = {
  select: new SelectTool(),
  shape: new ShapeTool(),
  text: new TextTool(),
  trim: new TrimTool(),
  pen: new PenTool(),
  line: new LineTool(),
};

/**
 * Hjälpfunktion för att lägga till en bild på canvas
 */
function addImageToCanvas(dataUrl, store, worldX = null, worldY = null) {
  const img = new Image();
  img.onload = () => {
    const s = store.getState();
    
    // Om ingen position angiven, använd mitten av canvas
    if (worldX === null || worldY === null) {
      const canvasWidth = window.innerWidth - 280;
      const canvasHeight = window.innerHeight - 100;
      worldX = (canvasWidth / 2 - s.panX) / s.zoom;
      worldY = (canvasHeight / 2 - s.panY) / s.zoom;
    }

    // Skala ner stora bilder
    let width = img.width;
    let height = img.height;
    const maxSize = 400;
    if (width > maxSize || height > maxSize) {
      const ratio = Math.min(maxSize / width, maxSize / height);
      width = width * ratio;
      height = height * ratio;
    }

    const imageElement = s.createImageElement(
      worldX - width / 2,
      worldY - height / 2,
      width,
      height,
      dataUrl
    );
    s.addElement(imageElement);

    // Välj det nya elementet
    const newState = store.getState();
    const lastId = newState.elementOrder[newState.elementOrder.length - 1];
    newState.selectElement(lastId);
    newState.setActiveTool('select');
  };
  img.src = dataUrl;
}

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

  // ─── Renderer lifecycle ─────────────────────────────────────
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

  // ─── Resize observer ────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      rendererRef.current?.markDirty();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ─── Coordinate conversion ──────────────────────────────────
  const getWorldCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return rendererRef.current?.screenToWorld(screenX, screenY, store.getState()) || { x: screenX, y: screenY };
  }, []);

  // ─── Get active tool ────────────────────────────────────────
  const getActiveTool = useCallback(() => {
    return tools[state.activeTool] || tools.select;
  }, [state.activeTool]);

  // ─── Right-click pan state ──────────────────────────────────
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const panRAFRef = useRef(null);

  // ─── Mouse handlers ─────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    // Right-click or middle-click → start panning
    if (e.button === 2 || e.button === 1) {
      e.preventDefault();
      isPanningRef.current = true;
      const s = store.getState();
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: s.panX, panY: s.panY };
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return; // Only left click for tools

    // Close inline editor if clicking outside
    if (state.editingElementId) {
      store.getState().setEditingElementId(null);
    }

    const world = getWorldCoords(e);
    getActiveTool().onMouseDown(world.x, world.y, e.shiftKey, store, rendererRef.current);
    rendererRef.current?.markDirty();
  }, [state.editingElementId, getWorldCoords, getActiveTool]);

  const handleMouseMove = useCallback((e) => {
    // Right-click panning (throttled with rAF)
    if (isPanningRef.current) {
      if (panRAFRef.current) return; // Skip if frame already pending
      panRAFRef.current = requestAnimationFrame(() => {
        panRAFRef.current = null;
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        store.getState().setPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy);
        rendererRef.current?.markDirty();
      });
      return;
    }

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
    // End right-click pan
    if (isPanningRef.current) {
      isPanningRef.current = false;
      if (panRAFRef.current) {
        cancelAnimationFrame(panRAFRef.current);
        panRAFRef.current = null;
      }
      // Commit final position
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      store.getState().setPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy);
      rendererRef.current?.markDirty();
      if (canvasRef.current) canvasRef.current.style.cursor = 'default';
      return;
    }

    const world = getWorldCoords(e);
    getActiveTool().onMouseUp(world.x, world.y, e.shiftKey, store, rendererRef.current);
    rendererRef.current?.markDirty();
  }, [getWorldCoords, getActiveTool]);

  const handleDoubleClick = useCallback((e) => {
    const world = getWorldCoords(e);
    getActiveTool().onDoubleClick?.(world.x, world.y, store, rendererRef.current);
    rendererRef.current?.markDirty();
  }, [getWorldCoords, getActiveTool]);

  // ─── Wheel handler (pan/zoom) ───────────────────────────────
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

  // ─── Image Paste Handler (Ctrl+V) ───────────────────────────
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    
    // 1. Check for image in system clipboard first
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            addImageToCanvas(event.target.result, store);
          };
          reader.readAsDataURL(file);
          return; // Image found — don't paste internal elements
        }
      }
    }

    // 2. No image in clipboard — paste internal elements if available
    const state = store.getState();
    if (state.clipboard && state.clipboard.length > 0) {
      e.preventDefault();
      state.pasteElements();
    }
  }, []);

  // ─── Drag-and-Drop Handlers ─────────────────────────────────
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      // Beräkna drop-position i world coordinates
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const s = store.getState();
      const worldX = (screenX - s.panX) / s.zoom;
      const worldY = (screenY - s.panY) / s.zoom;

      addImageToCanvas(event.target.result, store, worldX, worldY);
    };
    reader.readAsDataURL(file);
  }, []);

  // ─── Paste Event Listener ───────────────────────────────────
  useEffect(() => {
    const onPaste = (e) => handlePaste(e);
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [handlePaste]);

  // ─── Wheel event (native, non-passive to allow preventDefault) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ─── Inline text editing ────────────────────────────────────
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
    }
  }, [state.editingElementId, state.elements]);

  const handleTextBlur = useCallback(() => {
    store.getState().setEditingElementId(null);
  }, []);

  const handleTextKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      store.getState().setEditingElementId(null);
    }
    e.stopPropagation(); // Don't let keyboard shortcuts fire
  }, []);

  // Focus textarea when editing starts (use ID, not object ref, to avoid re-triggering on every keystroke)
  useEffect(() => {
    if (state.editingElementId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [state.editingElementId]);

  // ─── Calculate textarea position ────────────────────────────
  const getTextareaStyle = () => {
    if (!editingElement) return { display: 'none' };

    const s = store.getState();
    const el = editingElement;
    const textContent = el.type === 'text' ? el.content : (el.text || {});

    const left = el.x * s.zoom + s.panX;
    const top = el.y * s.zoom + s.panY;
    const width = (el.width || 150) * s.zoom;
    const height = (el.height || 30) * s.zoom;
    const fontSize = (textContent.fontSize || 14) * s.zoom;

    // Compute rotation transform
    const rotation = el.rotation || 0;
    const transformOrigin = 'center center';
    const transform = rotation !== 0 ? `rotate(${rotation}rad)` : 'none';

    return {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      fontSize: `${fontSize}px`,
      fontFamily: textContent.fontFamily || 'sans-serif',
      fontWeight: textContent.fontWeight || 'normal',
      fontStyle: textContent.fontStyle || 'normal',
      color: textContent.color || '#000000',
      textAlign: textContent.align || 'center',
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
      transform,
      transformOrigin,
    };
  };

  const getTextareaValue = () => {
    if (!editingElement) return '';
    if (editingElement.type === 'text') return editingElement.content?.text || '';
    if (editingElement.type === 'shape') return editingElement.text?.text || '';
    return '';
  };

  // ─── Render ─────────────────────────────────────────────────
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
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
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
