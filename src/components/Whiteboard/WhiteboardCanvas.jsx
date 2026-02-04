/**
 * WhiteboardCanvas — Main canvas component for the whiteboard.
 *
 * Deliverable 4: Space+drag panning, middle-click pan, canvasRef forwarding
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasRenderer } from './CanvasRenderer';
import { SelectTool } from './tools/SelectTool';
import { ShapeTool } from './tools/ShapeTool';
import { TextTool } from './tools/TextTool';
import { LineTool } from './tools/LineTool';
import { PenTool } from './tools/PenTool';
import useWhiteboardStore from '../../stores/whiteboardStore';
import { useWhiteboardKeyboard } from '../../hooks/useWhiteboardKeyboard';

// ─── Tool Instances (persistent across renders) ─────────
const tools = {
  select: new SelectTool(),
  shape: new ShapeTool(),
  text: new TextTool(),
  line: new LineTool(),
  pen: new PenTool(),
};

export default function WhiteboardCanvas({ className = '', canvasRef: externalCanvasRef }) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const containerRef = useRef(null);
  const textareaRef = useRef(null);

  // Space panning state
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef(null);
  const spaceDownRef = useRef(false);

  // Subscribe to relevant store slices
  const state = useWhiteboardStore();
  const store = useWhiteboardStore;

  // Keyboard shortcuts
  useWhiteboardKeyboard(store);

  // Forward ref to external canvasRef
  useEffect(() => {
    if (externalCanvasRef) {
      externalCanvasRef.current = canvasRef.current;
    }
  }, [externalCanvasRef]);

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

  // ─── Space key tracking (for space+drag pan) ───────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !state.editingElementId) {
        e.preventDefault();
        spaceDownRef.current = true;
        setIsSpacePanning(true);
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false;
        setIsSpacePanning(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [state.editingElementId]);

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
    // Middle click pan
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: store.getState().panX, panY: store.getState().panY };
      return;
    }

    if (e.button !== 0) return; // Only left click

    // Space+left click = pan
    if (spaceDownRef.current) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: store.getState().panX, panY: store.getState().panY };
      return;
    }

    // Close inline editor if clicking outside — and DON'T call the tool
    // This prevents TextTool from creating a new element when user clicks to exit edit mode
    if (state.editingElementId) {
      store.getState().setEditingElementId(null);
      store.getState().setActiveTool('select');
      rendererRef.current?.markDirty();
      return; // Critical: don't call tool.onMouseDown
    }

    const world = getWorldCoords(e);
    getActiveTool().onMouseDown(world.x, world.y, e.shiftKey, store, rendererRef.current);
    rendererRef.current?.markDirty();
  }, [state.editingElementId, getWorldCoords, getActiveTool]);

  const handleMouseMove = useCallback((e) => {
    // Pan mode
    if (isPanning && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      store.getState().setPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy);
      rendererRef.current?.markDirty();
      return;
    }

    const world = getWorldCoords(e);
    const tool = getActiveTool();
    tool.onMouseMove(world.x, world.y, e.shiftKey, store, rendererRef.current);

    // Update cursor
    let cursor;
    if (isSpacePanning) {
      cursor = isPanning ? 'grabbing' : 'grab';
    } else {
      cursor = tool.getCursor?.(world.x, world.y, store.getState()) || 'default';
    }
    if (canvasRef.current) {
      canvasRef.current.style.cursor = cursor;
    }

    rendererRef.current?.markDirty();
  }, [isPanning, isSpacePanning, getWorldCoords, getActiveTool]);

  const handleMouseUp = useCallback((e) => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      return;
    }

    const world = getWorldCoords(e);
    getActiveTool().onMouseUp(world.x, world.y, e.shiftKey, store, rendererRef.current);
    rendererRef.current?.markDirty();
  }, [isPanning, getWorldCoords, getActiveTool]);

  const handleDoubleClick = useCallback((e) => {
    if (isSpacePanning) return;
    const world = getWorldCoords(e);
    getActiveTool().onDoubleClick?.(world.x, world.y, store, rendererRef.current);
    rendererRef.current?.markDirty();
  }, [isSpacePanning, getWorldCoords, getActiveTool]);

  // ─── Wheel handler (pan/zoom) ──────────────────────
  // Must use native addEventListener with { passive: false } to prevent browser zoom
  const wheelHandlerRef = useRef(null);
  wheelHandlerRef.current = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const s = store.getState();

    if (e.ctrlKey || e.metaKey) {
      // Zoom canvas only (not browser)
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
  };

  // Attach non-passive wheel listener to prevent browser Ctrl+scroll zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e) => wheelHandlerRef.current?.(e);
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  // ─── Context Menu (right-click) ────────────────────
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    const world = getWorldCoords(e);

    // Om vi klickar på ett element, markera det
    const hitId = rendererRef.current?.hitTest(store.getState(), world.x, world.y);
    if (hitId && !store.getState().selectedIds.has(hitId)) {
      store.getState().selectElement(hitId);
    }

    store.getState().setContextMenu({ x: e.clientX, y: e.clientY });
  }, [getWorldCoords]);

  // ─── Paste from clipboard (images) ─────────────────
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            const img = new Image();
            img.onload = () => {
              const s = store.getState();
              // Placera bilden mitt i viewport
              const canvasWidth = window.innerWidth - 280;
              const canvasHeight = window.innerHeight - 100;
              const worldCenterX = (canvasWidth / 2 - s.panX) / s.zoom;
              const worldCenterY = (canvasHeight / 2 - s.panY) / s.zoom;

              // Begränsa storlek till max 500px
              let w = img.width;
              let h = img.height;
              const maxSize = 500;
              if (w > maxSize || h > maxSize) {
                const scale = maxSize / Math.max(w, h);
                w = Math.round(w * scale);
                h = Math.round(h * scale);
              }

              const imgElement = s.createImageElement(
                worldCenterX - w / 2,
                worldCenterY - h / 2,
                w, h, dataUrl
              );
              s.addElement(imgElement);

              // Markera den nya bilden
              const newState = store.getState();
              const lastId = newState.elementOrder[newState.elementOrder.length - 1];
              newState.selectElement(lastId);
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
          return; // Hantera bara första bilden
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // ─── Drag-and-drop images ──────────────────────────
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
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const img = new Image();
      img.onload = () => {
        const world = getWorldCoords(e);
        let w = img.width;
        let h = img.height;
        const maxSize = 500;
        if (w > maxSize || h > maxSize) {
          const scale = maxSize / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }

        const s = store.getState();
        const imgElement = s.createImageElement(
          world.x - w / 2, world.y - h / 2,
          w, h, dataUrl
        );
        s.addElement(imgElement);

        const newState = store.getState();
        const lastId = newState.elementOrder[newState.elementOrder.length - 1];
        newState.selectElement(lastId);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [getWorldCoords]);

  // ─── Inline text editing ───────────────────────────
  const editingElement = state.editingElementId
    ? state.elements[state.editingElementId]
    : null;

  const handleTextChange = useCallback((e) => {
    if (!state.editingElementId) return;
    const el = state.elements[state.editingElementId];
    if (!el) return;

    const newText = e.target.value;

    // Auto-grow height for multi-line text
    const autoGrowHeight = (textProps, currentHeight) => {
      const lineCount = newText.split('\n').length;
      const lineHeight = (textProps.fontSize || 14) * 1.3;
      const neededHeight = lineCount * lineHeight + 16; // 8px padding top+bottom
      return Math.max(currentHeight, neededHeight);
    };

    if (el.type === 'text') {
      const newHeight = autoGrowHeight(el.content || {}, el.height);
      store.getState().updateElement(state.editingElementId, {
        content: { ...el.content, text: newText },
        height: newHeight,
      });
    } else if (el.type === 'shape') {
      const currentText = el.text || {
        text: '', fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 'normal', fontStyle: 'normal', color: '#000000',
        align: 'center', verticalAlign: 'middle',
      };
      const newHeight = autoGrowHeight(currentText, el.height);
      store.getState().updateElement(state.editingElementId, {
        text: { ...currentText, text: newText },
        height: newHeight,
      });
    } else if (el.type === 'line') {
      const currentLabel = el.label || {
        text: '', fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif',
        color: '#333333', background: 'rgba(255,255,255,0.9)',
      };
      store.getState().updateElement(state.editingElementId, {
        label: { ...currentLabel, text: newText },
      });
    }
  }, [state.editingElementId, state.elements]);

  const handleTextBlur = useCallback(() => {
    const currentEditingId = state.editingElementId;
    requestAnimationFrame(() => {
      if (store.getState().editingElementId === currentEditingId) {
        store.getState().setEditingElementId(null);
        // Switch to select tool when text editing ends
        store.getState().setActiveTool('select');
      }
    });
  }, [state.editingElementId]);

  const handleTextKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      store.getState().setEditingElementId(null);
    }
    e.stopPropagation();
  }, []);

  // Focus textarea when editing starts
  useEffect(() => {
    if (state.editingElementId) {
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

    // Calculate vertical centering padding
    const lineHeight = fontSize * 1.3;
    const text = el.type === 'line' ? (el.label?.text || '') :
                 el.type === 'text' ? (el.content?.text || '') :
                 (el.text?.text || '');
    const lineCount = Math.max(1, (text.match(/\n/g) || []).length + 1);
    const textHeight = lineCount * lineHeight;
    const verticalPadding = Math.max(4, (height - textHeight) / 2);

    return {
      position: 'absolute', left: `${left}px`, top: `${top}px`,
      width: `${width}px`, height: `${height}px`,
      fontSize: `${fontSize}px`, fontFamily, fontWeight, fontStyle, color, textAlign,
      background: 'rgba(255,255,255,0.9)', border: '2px solid #2196F3',
      borderRadius: '2px', outline: 'none', resize: 'none', overflow: 'auto',
      paddingTop: `${verticalPadding}px`, paddingBottom: `${verticalPadding}px`,
      paddingLeft: '8px', paddingRight: '8px',
      boxSizing: 'border-box', zIndex: 10, lineHeight: 1.3,
      whiteSpace: 'pre-wrap', overflowWrap: 'break-word',
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
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
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
