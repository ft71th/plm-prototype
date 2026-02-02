/**
 * Minimap — Shows a small overview of the entire whiteboard.
 * Features:
 * - Renders all elements as simplified rectangles/dots
 * - Shows viewport rectangle (what's visible on the main canvas)
 * - Click to navigate, drag to pan
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import useWhiteboardStore from '../../stores/whiteboardStore';
import { getBoundingBox, getCombinedBoundingBox } from '../../utils/geometry';

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;
const MINIMAP_PADDING = 10;

export default function Minimap() {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const elements = useWhiteboardStore((s) => s.elements);
  const elementOrder = useWhiteboardStore((s) => s.elementOrder);
  const panX = useWhiteboardStore((s) => s.panX);
  const panY = useWhiteboardStore((s) => s.panY);
  const zoom = useWhiteboardStore((s) => s.zoom);
  const minimapVisible = useWhiteboardStore((s) => s.minimapVisible);

  // Calculate world bounds from all elements
  const getWorldBounds = useCallback(() => {
    if (elementOrder.length === 0) {
      return { x: 0, y: 0, width: 800, height: 600 };
    }

    const allEls = elementOrder.map((id) => elements[id]).filter(Boolean);
    const bb = getCombinedBoundingBox(allEls);
    if (!bb) return { x: 0, y: 0, width: 800, height: 600 };

    // Add padding around elements
    const pad = 100;
    return {
      x: bb.x - pad,
      y: bb.y - pad,
      width: bb.width + pad * 2,
      height: bb.height + pad * 2,
    };
  }, [elements, elementOrder]);

  // Render minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !minimapVisible) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = MINIMAP_WIDTH * dpr;
    canvas.height = MINIMAP_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    const world = getWorldBounds();
    const scale = Math.min(
      (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / world.width,
      (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / world.height
    );

    const offsetX = MINIMAP_PADDING + ((MINIMAP_WIDTH - MINIMAP_PADDING * 2) - world.width * scale) / 2;
    const offsetY = MINIMAP_PADDING + ((MINIMAP_HEIGHT - MINIMAP_PADDING * 2) - world.height * scale) / 2;

    const toMinimap = (wx, wy) => ({
      x: (wx - world.x) * scale + offsetX,
      y: (wy - world.y) * scale + offsetY,
    });

    // Draw elements as colored rectangles
    for (const id of elementOrder) {
      const el = elements[id];
      if (!el || !el.visible) continue;

      const bb = getBoundingBox(el);
      const pos = toMinimap(bb.x, bb.y);
      const w = Math.max(2, bb.width * scale);
      const h = Math.max(2, bb.height * scale);

      if (el.type === 'line') {
        const p1 = toMinimap(el.x, el.y);
        const p2 = toMinimap(el.x2, el.y2);
        ctx.strokeStyle = el.stroke || '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      } else {
        ctx.fillStyle = el.fill || '#ddd';
        ctx.strokeStyle = el.stroke || '#999';
        ctx.lineWidth = 0.5;
        ctx.fillRect(pos.x, pos.y, w, h);
        ctx.strokeRect(pos.x, pos.y, w, h);
      }
    }

    // Draw viewport rectangle
    const canvasWidth = window.innerWidth - 280;
    const canvasHeight = window.innerHeight - 100;
    const vpWorldX = -panX / zoom;
    const vpWorldY = -panY / zoom;
    const vpWorldW = canvasWidth / zoom;
    const vpWorldH = canvasHeight / zoom;

    const vpPos = toMinimap(vpWorldX, vpWorldY);
    const vpW = vpWorldW * scale;
    const vpH = vpWorldH * scale;

    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(33, 150, 243, 0.08)';
    ctx.fillRect(vpPos.x, vpPos.y, vpW, vpH);
    ctx.strokeRect(vpPos.x, vpPos.y, vpW, vpH);

    // Border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

  }, [elements, elementOrder, panX, panY, zoom, minimapVisible, getWorldBounds]);

  // Handle click/drag on minimap to navigate
  const handleMinimapNav = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const world = getWorldBounds();
    const scale = Math.min(
      (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / world.width,
      (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / world.height
    );
    const offsetX = MINIMAP_PADDING + ((MINIMAP_WIDTH - MINIMAP_PADDING * 2) - world.width * scale) / 2;
    const offsetY = MINIMAP_PADDING + ((MINIMAP_HEIGHT - MINIMAP_PADDING * 2) - world.height * scale) / 2;

    // Convert minimap coords to world coords
    const worldX = (mx - offsetX) / scale + world.x;
    const worldY = (my - offsetY) / scale + world.y;

    // Center viewport on this world position
    const canvasWidth = window.innerWidth - 280;
    const canvasHeight = window.innerHeight - 100;
    const newPanX = -(worldX * zoom - canvasWidth / 2);
    const newPanY = -(worldY * zoom - canvasHeight / 2);

    useWhiteboardStore.getState().setPan(newPanX, newPanY);
  }, [zoom, getWorldBounds]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleMinimapNav(e);
  };

  const handleMouseMove = (e) => {
    if (isDragging) handleMinimapNav(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  if (!minimapVisible) return null;

  return (
    <div style={styles.container}>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
        onMouseDown={handleMouseDown}
      />
      <button
        onClick={() => useWhiteboardStore.getState().setMinimapVisible(false)}
        style={styles.closeBtn}
        title="Dölj minimap"
      >
        ✕
      </button>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    bottom: 12,
    right: 252, // Properties panel width + margin
    zIndex: 20,
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    border: '1px solid #e0e0e0',
    background: '#fff',
  },
  canvas: {
    width: `${MINIMAP_WIDTH}px`,
    height: `${MINIMAP_HEIGHT}px`,
    display: 'block',
    cursor: 'pointer',
  },
  closeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    background: 'rgba(255,255,255,0.9)',
    border: 'none',
    borderRadius: '50%',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
    lineHeight: 1,
    padding: 0,
  },
};
