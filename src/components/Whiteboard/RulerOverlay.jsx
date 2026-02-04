/**
 * RulerOverlay — Linjaler & mätningsverktyg.
 *
 * Renderar:
 * - Horisontell linjal (topp)
 * - Vertikal linjal (vänster)
 * - Avståndsmätning mellan 2 markerade element
 * - Dimension-visning för enstaka markerade element
 *
 * Linjalerna är synkroniserade med pan/zoom.
 */

import React, { useMemo } from 'react';
import useWhiteboardStore from '../../stores/whiteboardStore';

const RULER_SIZE = 24;
const TICK_MAJOR = 100;
const TICK_MINOR = 10;
const TICK_MEDIUM = 50;

export default function RulerOverlay() {
  const showRulers = useWhiteboardStore((s) => s.showRulers);
  const showMeasurements = useWhiteboardStore((s) => s.showMeasurements);
  const panX = useWhiteboardStore((s) => s.panX);
  const panY = useWhiteboardStore((s) => s.panY);
  const zoom = useWhiteboardStore((s) => s.zoom);
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const elements = useWhiteboardStore((s) => s.elements);

  if (!showRulers && !showMeasurements) return null;

  return (
    <>
      {showRulers && (
        <>
          <HorizontalRuler panX={panX} zoom={zoom} />
          <VerticalRuler panY={panY} zoom={zoom} />
          <div style={styles.corner}>{Math.round(zoom * 100)}%</div>
        </>
      )}
      {showMeasurements && (
        <MeasurementOverlay
          selectedIds={selectedIds}
          elements={elements}
          panX={panX} panY={panY} zoom={zoom}
        />
      )}
    </>
  );
}

function HorizontalRuler({ panX, zoom }) {
  const ticks = useMemo(() => {
    const width = window.innerWidth;
    const result = [];
    const step = Math.max(1, Math.round(TICK_MINOR / zoom));
    const worldStart = Math.floor(-panX / zoom / step) * step - step * 5;
    const worldEnd = Math.ceil((width - panX) / zoom / step) * step + step * 5;

    for (let world = worldStart; world <= worldEnd; world += step) {
      const screen = world * zoom + panX;
      if (screen < 0 || screen > width) continue;

      const isMajor = world % TICK_MAJOR === 0;
      const isMedium = world % TICK_MEDIUM === 0;

      result.push({ screen, world, isMajor, isMedium });
    }
    return result;
  }, [panX, zoom]);

  return (
    <div style={styles.hRuler}>
      <svg width="100%" height={RULER_SIZE} style={{ display: 'block' }}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={t.screen} y1={t.isMajor ? 4 : t.isMedium ? 10 : 16}
              x2={t.screen} y2={RULER_SIZE}
              stroke={t.isMajor ? '#374151' : '#9ca3af'}
              strokeWidth={t.isMajor ? 1 : 0.5}
            />
            {t.isMajor && (
              <text x={t.screen + 3} y={12} fontSize={9} fill="#6b7280" fontFamily="monospace">
                {t.world}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function VerticalRuler({ panY, zoom }) {
  const ticks = useMemo(() => {
    const height = window.innerHeight;
    const result = [];
    const step = Math.max(1, Math.round(TICK_MINOR / zoom));
    const worldStart = Math.floor(-panY / zoom / step) * step - step * 5;
    const worldEnd = Math.ceil((height - panY) / zoom / step) * step + step * 5;

    for (let world = worldStart; world <= worldEnd; world += step) {
      const screen = world * zoom + panY;
      if (screen < RULER_SIZE || screen > height) continue;

      const isMajor = world % TICK_MAJOR === 0;
      const isMedium = world % TICK_MEDIUM === 0;

      result.push({ screen, world, isMajor, isMedium });
    }
    return result;
  }, [panY, zoom]);

  return (
    <div style={styles.vRuler}>
      <svg width={RULER_SIZE} height="100%" style={{ display: 'block' }}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={t.isMajor ? 4 : t.isMedium ? 10 : 16}
              y1={t.screen - RULER_SIZE}
              x2={RULER_SIZE}
              y2={t.screen - RULER_SIZE}
              stroke={t.isMajor ? '#374151' : '#9ca3af'}
              strokeWidth={t.isMajor ? 1 : 0.5}
            />
            {t.isMajor && (
              <text
                x={2} y={t.screen - RULER_SIZE - 3}
                fontSize={9} fill="#6b7280" fontFamily="monospace"
                transform={`rotate(-90, 2, ${t.screen - RULER_SIZE - 3})`}
              >
                {t.world}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function MeasurementOverlay({ selectedIds, elements, panX, panY, zoom }) {
  const ids = [...selectedIds];

  // Single element: show dimensions
  if (ids.length === 1) {
    const el = elements[ids[0]];
    if (!el || !el.width) return null;

    const screenX = el.x * zoom + panX;
    const screenY = el.y * zoom + panY;
    const screenW = el.width * zoom;
    const screenH = el.height * zoom;

    return (
      <svg style={styles.measureSvg}>
        {/* Width label */}
        <g>
          <line x1={screenX} y1={screenY - 16} x2={screenX + screenW} y2={screenY - 16} stroke="#6366f1" strokeWidth={1} />
          <line x1={screenX} y1={screenY - 20} x2={screenX} y2={screenY - 12} stroke="#6366f1" strokeWidth={1} />
          <line x1={screenX + screenW} y1={screenY - 20} x2={screenX + screenW} y2={screenY - 12} stroke="#6366f1" strokeWidth={1} />
          <rect x={screenX + screenW / 2 - 20} y={screenY - 26} width={40} height={14} rx={3} fill="#6366f1" />
          <text x={screenX + screenW / 2} y={screenY - 16} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="bold" fontFamily="monospace">
            {Math.round(el.width)}
          </text>
        </g>
        {/* Height label */}
        <g>
          <line x1={screenX - 16} y1={screenY} x2={screenX - 16} y2={screenY + screenH} stroke="#6366f1" strokeWidth={1} />
          <line x1={screenX - 20} y1={screenY} x2={screenX - 12} y2={screenY} stroke="#6366f1" strokeWidth={1} />
          <line x1={screenX - 20} y1={screenY + screenH} x2={screenX - 12} y2={screenY + screenH} stroke="#6366f1" strokeWidth={1} />
          <rect x={screenX - 36} y={screenY + screenH / 2 - 7} width={34} height={14} rx={3} fill="#6366f1" />
          <text x={screenX - 19} y={screenY + screenH / 2 + 3} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="bold" fontFamily="monospace">
            {Math.round(el.height)}
          </text>
        </g>
      </svg>
    );
  }

  // Two elements: show distance
  if (ids.length === 2) {
    const el1 = elements[ids[0]];
    const el2 = elements[ids[1]];
    if (!el1 || !el2) return null;

    const c1x = ((el1.x || 0) + (el1.width || 0) / 2) * zoom + panX;
    const c1y = ((el1.y || 0) + (el1.height || 0) / 2) * zoom + panY;
    const c2x = ((el2.x || 0) + (el2.width || 0) / 2) * zoom + panX;
    const c2y = ((el2.y || 0) + (el2.height || 0) / 2) * zoom + panY;
    const dist = Math.round(Math.hypot(
      (el2.x || 0) + (el2.width || 0) / 2 - ((el1.x || 0) + (el1.width || 0) / 2),
      (el2.y || 0) + (el2.height || 0) / 2 - ((el1.y || 0) + (el1.height || 0) / 2)
    ));
    const midX = (c1x + c2x) / 2;
    const midY = (c1y + c2y) / 2;

    return (
      <svg style={styles.measureSvg}>
        <line x1={c1x} y1={c1y} x2={c2x} y2={c2y} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6,4" />
        <circle cx={c1x} cy={c1y} r={3} fill="#f59e0b" />
        <circle cx={c2x} cy={c2y} r={3} fill="#f59e0b" />
        <rect x={midX - 24} y={midY - 10} width={48} height={20} rx={4} fill="#f59e0b" />
        <text x={midX} y={midY + 4} textAnchor="middle" fontSize={11} fill="#fff" fontWeight="bold" fontFamily="monospace">
          {dist}px
        </text>
      </svg>
    );
  }

  return null;
}

const styles = {
  hRuler: {
    position: 'absolute', top: 0, left: RULER_SIZE, right: 0, height: RULER_SIZE,
    background: '#f9fafb', borderBottom: '1px solid #e5e7eb', zIndex: 40,
    pointerEvents: 'none', overflow: 'hidden',
  },
  vRuler: {
    position: 'absolute', top: RULER_SIZE, left: 0, bottom: 0, width: RULER_SIZE,
    background: '#f9fafb', borderRight: '1px solid #e5e7eb', zIndex: 40,
    pointerEvents: 'none', overflow: 'hidden',
  },
  corner: {
    position: 'absolute', top: 0, left: 0, width: RULER_SIZE, height: RULER_SIZE,
    background: '#f3f4f6', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb',
    zIndex: 41, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 7, color: '#9ca3af', fontWeight: 600,
  },
  measureSvg: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: 35, overflow: 'visible',
  },
};
