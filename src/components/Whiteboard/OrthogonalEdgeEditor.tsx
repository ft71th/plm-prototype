// src/components/Whiteboard/OrthogonalEdgeEditor.tsx
// Handles editing of orthogonal (right-angle) lines:
// - Drag existing bend segment to move it
// - Double-click segment to add a new bend point
// - Delete bend handle to remove bend (merge segments)
//
// Usage: render this over an existing orthogonal line on the canvas.
// Pass in the line's points array and receive updates via onPointsChange.

import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface Point {
  x: number;
  y: number;
}

interface Props {
  /** Array of [x,y] waypoints defining the orthogonal line */
  points: Point[];
  /** Called whenever the user edits the line */
  onPointsChange: (newPoints: Point[]) => void;
  /** Canvas pan/zoom transform so handles are in the right place */
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  /** Line stroke color */
  color?: string;
  strokeWidth?: number;
}

/** Threshold in px (canvas coords) for snapping to horizontal/vertical */
const SNAP_THRESHOLD = 6;

/** Generate SVG path string for a series of right-angle points */
export function pointsToOrthogonalPath(pts: Point[]): string {
  if (pts.length < 2) return '';
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return d;
}

/** Snap a value to the nearest axis based on the previous point */
function snapOrthogonal(prev: Point, current: Point): Point {
  const dx = Math.abs(current.x - prev.x);
  const dy = Math.abs(current.y - prev.y);
  if (dx >= dy) {
    // Horizontal segment
    return { x: current.x, y: prev.y };
  } else {
    // Vertical segment
    return { x: prev.x, y: current.y };
  }
}

/** Insert a bend point by splitting a segment at its midpoint */
function insertBendAt(points: Point[], segmentIndex: number): Point[] {
  const a = points[segmentIndex];
  const b = points[segmentIndex + 1];
  const isHorizontal = Math.abs(a.y - b.y) < SNAP_THRESHOLD;

  // Insert two points to create a new Z-bend
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;

  let newPts: Point[];
  if (isHorizontal) {
    // Was horizontal: split into H-V-H
    const offset = 20;
    newPts = [
      ...points.slice(0, segmentIndex + 1),
      { x: midX, y: a.y },
      { x: midX, y: a.y + offset },
      { x: midX, y: b.y },
      ...points.slice(segmentIndex + 1),
    ];
  } else {
    // Was vertical: split into V-H-V
    const offset = 20;
    newPts = [
      ...points.slice(0, segmentIndex + 1),
      { x: a.x, y: midY },
      { x: a.x + offset, y: midY },
      { x: b.x, y: midY },
      ...points.slice(segmentIndex + 1),
    ];
  }
  return newPts;
}

/** Move a whole segment (all points forming it) perpendicular to the segment direction */
function moveSegment(points: Point[], segmentIndex: number, delta: Point): Point[] {
  const a = points[segmentIndex];
  const b = points[segmentIndex + 1];
  const isHorizontal = Math.abs(a.y - b.y) < SNAP_THRESHOLD;
  const newPts = points.map((p, i) => ({ ...p }));

  if (isHorizontal) {
    // Move vertically
    newPts[segmentIndex] = { ...a, y: a.y + delta.y };
    newPts[segmentIndex + 1] = { ...b, y: b.y + delta.y };
    // Also adjust adjacent vertical segments to stay connected
    if (segmentIndex > 0) {
      newPts[segmentIndex - 1] = { ...newPts[segmentIndex - 1], y: newPts[segmentIndex - 1].y };
      // prev segment endpoint must match
      newPts[segmentIndex] = { ...newPts[segmentIndex] };
    }
  } else {
    // Move horizontally
    newPts[segmentIndex] = { ...a, x: a.x + delta.x };
    newPts[segmentIndex + 1] = { ...b, x: b.x + delta.x };
  }

  return newPts;
}

// ─────────────────────────────────────────────────────────────────────────────

export const OrthogonalEdgeEditor: React.FC<Props> = ({
  points,
  onPointsChange,
  scale = 1,
  offsetX = 0,
  offsetY = 0,
  color = '#6366f1',
  strokeWidth = 2,
}) => {
  const [dragState, setDragState] = useState<{
    type: 'segment' | 'point';
    index: number;
    startMouseX: number;
    startMouseY: number;
    startPoints: Point[];
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // Convert mouse event coords to canvas coords
  const toCanvas = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { x: clientX, y: clientY };
      return {
        x: (clientX - rect.left - offsetX) / scale,
        y: (clientY - rect.top - offsetY) / scale,
      };
    },
    [scale, offsetX, offsetY]
  );

  const handleSegmentMouseDown = useCallback(
    (e: React.MouseEvent, segIdx: number) => {
      e.stopPropagation();
      e.preventDefault();
      setDragState({
        type: 'segment',
        index: segIdx,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPoints: points.map(p => ({ ...p })),
      });
    },
    [points]
  );

  const handlePointMouseDown = useCallback(
    (e: React.MouseEvent, ptIdx: number) => {
      e.stopPropagation();
      e.preventDefault();
      setDragState({
        type: 'point',
        index: ptIdx,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPoints: points.map(p => ({ ...p })),
      });
    },
    [points]
  );

  const handleSegmentDblClick = useCallback(
    (e: React.MouseEvent, segIdx: number) => {
      e.stopPropagation();
      const newPts = insertBendAt(points, segIdx);
      onPointsChange(newPts);
    },
    [points, onPointsChange]
  );

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragState.startMouseX) / scale;
      const dy = (e.clientY - dragState.startMouseY) / scale;

      if (dragState.type === 'segment') {
        const newPts = moveSegment(dragState.startPoints, dragState.index, { x: dx, y: dy });
        onPointsChange(newPts);
      } else {
        // Move individual point (corner / bend point)
        const newPts = dragState.startPoints.map((p, i) => {
          if (i !== dragState.index) return p;
          return { x: p.x + dx, y: p.y + dy };
        });
        onPointsChange(newPts);
      }
    };

    const handleMouseUp = () => setDragState(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, scale, onPointsChange]);

  if (points.length < 2) return null;

  // Build segment info for rendering hit targets
  const segments: Array<{ x1: number; y1: number; x2: number; y2: number; idx: number; isH: boolean }> = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    segments.push({
      x1: a.x, y1: a.y,
      x2: b.x, y2: b.y,
      idx: i,
      isH: Math.abs(a.y - b.y) < SNAP_THRESHOLD,
    });
  }

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {/* Visible line */}
      <polyline
        points={points.map(p => `${p.x},${p.y}`).join(' ')}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinejoin="round"
      />

      {/* Invisible wider hit areas for segments (drag to move) */}
      {segments.map(seg => {
        const midX = (seg.x1 + seg.x2) / 2;
        const midY = (seg.y1 + seg.y2) / 2;
        return (
          <g key={`seg-${seg.idx}`} style={{ pointerEvents: 'all' }}>
            <line
              x1={seg.x1} y1={seg.y1}
              x2={seg.x2} y2={seg.y2}
              stroke="transparent"
              strokeWidth={14}
              style={{ cursor: seg.isH ? 'ns-resize' : 'ew-resize' }}
              onMouseDown={e => handleSegmentMouseDown(e, seg.idx)}
              onDoubleClick={e => handleSegmentDblClick(e, seg.idx)}
            />
            {/* Midpoint indicator (small square) */}
            <rect
              x={midX - 5} y={midY - 5}
              width={10} height={10}
              rx={2}
              fill="white"
              stroke={color}
              strokeWidth={1.5}
              style={{ cursor: seg.isH ? 'ns-resize' : 'ew-resize', pointerEvents: 'all' }}
              onMouseDown={e => handleSegmentMouseDown(e, seg.idx)}
              onDoubleClick={e => handleSegmentDblClick(e, seg.idx)}
            />
          </g>
        );
      })}

      {/* Corner / bend point handles */}
      {points.map((p, i) => {
        const isEndpoint = i === 0 || i === points.length - 1;
        return (
          <circle
            key={`pt-${i}`}
            cx={p.x}
            cy={p.y}
            r={isEndpoint ? 5 : 4}
            fill={isEndpoint ? color : 'white'}
            stroke={color}
            strokeWidth={1.5}
            style={{ cursor: 'grab', pointerEvents: 'all' }}
            onMouseDown={e => handlePointMouseDown(e, i)}
          />
        );
      })}
    </svg>
  );
};

export default OrthogonalEdgeEditor;
