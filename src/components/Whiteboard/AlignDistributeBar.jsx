/**
 * AlignDistributeBar — Justering & fördelning av markerade element.
 *
 * Flytande toolbar som visas när ≥2 element är markerade.
 * Funktioner:
 * - Justera: vänster, center, höger, topp, mitten, botten
 * - Fördela: horisontellt, vertikalt (≥3 element)
 * - Auto-layout: rutnät, träd, cirkel, rad, kolumn
 */

import React, { useState } from 'react';
import useWhiteboardStore from '../../stores/whiteboardStore';

export default function AlignDistributeBar() {
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const store = useWhiteboardStore;
  const [showLayout, setShowLayout] = useState(false);

  const count = selectedIds.size;
  if (count < 2) return null;

  const align = (dir) => store.getState().alignElements(dir);
  const distribute = (dir) => store.getState().distributeElements(dir);
  const autoLayout = (mode) => { store.getState().autoLayout(mode); setShowLayout(false); };

  return (
    <div style={styles.bar}>
      {/* Align */}
      <div style={styles.group}>
        <span style={styles.groupLabel}>Justera</span>
        <div style={styles.btnRow}>
          <ToolBtn icon="⫷" title="Vänster" onClick={() => align('left')} />
          <ToolBtn icon="⫿" title="Center (H)" onClick={() => align('center-h')} />
          <ToolBtn icon="⫸" title="Höger" onClick={() => align('right')} />
          <span style={styles.sep} />
          <ToolBtn icon="⊤" title="Topp" onClick={() => align('top')} />
          <ToolBtn icon="⊝" title="Mitten (V)" onClick={() => align('center-v')} />
          <ToolBtn icon="⊥" title="Botten" onClick={() => align('bottom')} />
        </div>
      </div>

      {/* Distribute (requires 3+) */}
      {count >= 3 && (
        <div style={styles.group}>
          <span style={styles.groupLabel}>Fördela</span>
          <div style={styles.btnRow}>
            <ToolBtn icon="⟺" title="Horisontellt" onClick={() => distribute('horizontal')} />
            <ToolBtn icon="⟺" title="Vertikalt" onClick={() => distribute('vertical')} rotate />
          </div>
        </div>
      )}

      {/* Auto-Layout */}
      <div style={styles.group}>
        <span style={styles.groupLabel}>Layout</span>
        <div style={styles.btnRow}>
          <ToolBtn icon="▦" title="Rutnät" onClick={() => autoLayout('grid')} />
          <ToolBtn icon="🌲" title="Träd" onClick={() => autoLayout('tree')} />
          <ToolBtn icon="◎" title="Cirkel" onClick={() => autoLayout('circle')} />
          <ToolBtn icon="⟶" title="Rad" onClick={() => autoLayout('horizontal')} />
          <ToolBtn icon="⟱" title="Kolumn" onClick={() => autoLayout('vertical')} />
        </div>
      </div>

      <span style={styles.countBadge}>{count} element</span>
    </div>
  );
}

function ToolBtn({ icon, title, onClick, rotate }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...styles.toolBtn,
        background: hover ? '#ede9fe' : 'transparent',
        transform: rotate ? 'rotate(90deg)' : 'none',
      }}
      title={title}
    >
      {icon}
    </button>
  );
}

const styles = {
  bar: {
    position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#fff', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    border: '1px solid #e5e7eb', padding: '6px 12px', zIndex: 45,
  },
  group: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  groupLabel: { fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  btnRow: { display: 'flex', alignItems: 'center', gap: 1 },
  toolBtn: {
    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 14,
    transition: 'background 0.15s', color: '#374151', padding: 0,
  },
  sep: { width: 1, height: 20, background: '#e5e7eb', margin: '0 3px' },
  countBadge: {
    fontSize: 10, color: '#6366f1', fontWeight: 600, background: '#ede9fe',
    borderRadius: 8, padding: '2px 8px', whiteSpace: 'nowrap',
  },
};
