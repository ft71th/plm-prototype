import type { NodeData } from '../../types';
import React, { useState, useEffect, useMemo } from 'react';
import { Handle, Position, useUpdateNodeInternals } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import {
  COMPONENT_FAMILIES, FAMILY_COLORS, SIGNAL_TYPES,
  getSignalsForVariant, countSignals,
} from '../../data/metsComponentLibrary';
import type { METSSignal } from '../../data/metsComponentLibrary';

// ─── Extra handles for system-level 4-side connectivity ─────────────────────
const handleDotStyle: React.CSSProperties = {
  width: '8px',
  height: '8px',
  background: 'rgba(100, 100, 100, 0.3)',
  border: '1.5px solid rgba(255,255,255,0.5)',
  transition: 'background 0.2s, transform 0.2s',
};

function SWComponentNode({ data, id, selected }: { data: any; id: string; selected: boolean }) {
  const [showSignals, setShowSignals] = useState(false);
  const [showStates, setShowStates] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const updateNodeInternals = useUpdateNodeInternals();

  // Resolve family and variant from data
  const familyKey = data.metsFamily || '';
  const variantKey = data.metsVariant || '';
  const family = COMPONENT_FAMILIES[familyKey];
  const variant = family?.variants[variantKey];
  const color = FAMILY_COLORS[familyKey] || { primary: '#666', dim: '#333', bg: '#1a1a1a' };

  const signals = useMemo(
    () => getSignalsForVariant(familyKey, variantKey),
    [familyKey, variantKey]
  );
  const sigCounts = useMemo(() => countSignals(familyKey, variantKey), [familyKey, variantKey]);

  const inputSignals = useMemo(() => signals.filter(s => s.type === 'DI' || s.type === 'AI'), [signals]);
  const outputSignals = useMemo(() => signals.filter(s => s.type === 'DO' || s.type === 'AO'), [signals]);

  // Recalc handles when expanded/collapsed
  useEffect(() => {
    const t = requestAnimationFrame(() => updateNodeInternals(id));
    return () => cancelAnimationFrame(t);
  }, [id, updateNodeInternals, showSignals, showStates, showConfig]);

  if (!family || !variant) {
    return (
      <div style={{ background: '#7f1d1d', border: '2px solid #ef4444', borderRadius: 8, padding: 12, color: '#ef4444', fontSize: 12 }}>
        ⚠ Unknown METS component: {familyKey}/{variantKey}
      </div>
    );
  }

  const nodeWidth = data.nodeWidth || 260;

  // Instance name editing
  const handleStartEdit = () => {
    setEditName(data.metsInstanceName || '');
    setIsEditingName(true);
  };
  const handleFinishEdit = () => {
    setIsEditingName(false);
    if (data.onChange && editName.trim()) {
      data.onChange(id, 'metsInstanceName', editName.trim());
    }
  };

  return (
    <div style={{
      background: '#0f172a',
      border: `2px solid ${selected ? color.primary : color.dim}`,
      borderRadius: 10,
      width: nodeWidth,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      boxShadow: selected
        ? `0 0 0 2px ${color.primary}40, 0 4px 16px ${color.primary}15`
        : '0 2px 8px rgba(0,0,0,0.4)',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s, border-color 0.2s',
    }}>
      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={100}
        lineStyle={{ borderColor: color.primary }}
        handleStyle={{ backgroundColor: color.primary, width: 8, height: 8, borderRadius: 2 }}
        onResize={(_evt, params) => {
          if (data.onChange) {
            data.onChange(id, 'nodeWidth', params.width);
            data.onChange(id, 'nodeHeight', params.height);
          }
        }}
      />

      {/* ── Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${color.bg}, #0b1120)`,
        borderBottom: `1px solid ${color.dim}`,
        padding: '8px 12px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>{family.icon}</span>
            <span style={{ color: color.primary, fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>
              {familyKey}
            </span>
            <span style={{ color: '#475569', fontSize: 11 }}>({variantKey})</span>
          </div>
          <span style={{
            background: '#064e3b', color: '#10b981',
            padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
          }}>STD</span>
        </div>

        {/* Instance name — double-click to edit */}
        <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {isEditingName ? (
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={handleFinishEdit}
              onKeyDown={e => { if (e.key === 'Enter') handleFinishEdit(); if (e.key === 'Escape') setIsEditingName(false); }}
              autoFocus
              style={{
                background: 'var(--nl-bg-panel, #1e293b)', border: `1px solid ${color.primary}`, borderRadius: 4,
                color: '#e2e8f0', fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
                padding: '1px 4px', outline: 'none', width: '60%',
              }}
            />
          ) : (
            <span
              onDoubleClick={handleStartEdit}
              style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, fontFamily: 'monospace', cursor: 'text' }}
              title="Double-click to rename"
            >
              {data.metsInstanceName || 'fb_unnamed'}
            </span>
          )}
          {data.metsPosNo && (
            <span style={{ color: '#475569', fontSize: 10 }}>Pos: {data.metsPosNo}</span>
          )}
        </div>
      </div>

      {/* ── Class & interface ── */}
      <div style={{ padding: '5px 12px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ fontSize: 10, color: '#475569' }}>
          <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{variant.name}</span>
          {' → '}
          <span style={{ color: color.primary, fontFamily: 'monospace' }}>{family.interface.name}</span>
          <span style={{ color: '#475569' }}> + I_Component</span>
        </div>
      </div>

      {/* ── Signals bar ── */}
      <div style={{ padding: '5px 12px', borderBottom: '1px solid #1e293b', cursor: 'pointer' }}
        onClick={() => setShowSignals(!showSignals)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Signaler ({signals.length}) {showSignals ? '▼' : '▶'}
          </span>
          <div style={{ display: 'flex', gap: 3 }}>
            {(['DI', 'DO', 'AI', 'AO'] as const).map(t => sigCounts[t] > 0 && (
              <span key={t} style={{
                background: `${SIGNAL_TYPES[t].color}20`,
                color: SIGNAL_TYPES[t].color,
                padding: '0 4px', borderRadius: 3, fontSize: 9, fontWeight: 700,
              }}>{sigCounts[t]}{t}</span>
            ))}
          </div>
        </div>
        {showSignals && (
          <div style={{ marginTop: 4 }}>
            {signals.map(sig => (
              <div key={sig.name} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '1px 0', fontSize: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: SIGNAL_TYPES[sig.type]?.color, flexShrink: 0 }} />
                <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 9, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sig.name}
                </span>
                <span style={{ color: SIGNAL_TYPES[sig.type]?.color, fontSize: 8, fontWeight: 700 }}>{sig.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── States bar ── */}
      <div style={{ padding: '5px 12px', cursor: 'pointer' }}
        onClick={() => setShowStates(!showStates)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Tillstånd ({family.states.length}) {showStates ? '▼' : '▶'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {family.states.map(s => (
            <span key={s.name} style={{
              padding: '1px 5px', borderRadius: 3, fontSize: 9, fontWeight: 600, fontFamily: 'monospace',
              background: (s.name === 'FAULT' || s.name === 'TRIPPED') ? '#7f1d1d' : `${color.primary}20`,
              color: (s.name === 'FAULT' || s.name === 'TRIPPED') ? '#ef4444' : color.primary,
            }}>{s.name}</span>
          ))}
        </div>
        {showStates && (
          <div style={{ marginTop: 6, padding: '4px 6px', background: '#1a2332', borderRadius: 4, fontSize: 9, color: '#94a3b8', fontFamily: 'monospace' }}>
            {family.stateFlow}
          </div>
        )}
      </div>

      {/* ── Config (if expanded) ── */}
      {showConfig && data.metsConfig && data.metsConfig.length > 0 && (
        <div style={{ padding: '5px 12px', borderTop: '1px solid #1e293b' }}>
          <span style={{ fontSize: 9, color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Config</span>
          <div style={{ marginTop: 3 }}>
            {data.metsConfig.map((cfg: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '1px 0' }}>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{cfg.name}</span>
                <span style={{ color: '#f59e0b', fontFamily: 'monospace' }}>{cfg.default}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── System badge ── */}
      {data.metsSystem && (
        <div style={{
          padding: '4px 12px', borderTop: '1px solid #1e293b',
          background: `${color.dim}15`, textAlign: 'center',
        }}>
          <span style={{ fontSize: 9, color: color.primary, fontWeight: 600 }}>{data.metsSystem}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* CONNECTION HANDLES                              */}
      {/* ═══════════════════════════════════════════════ */}

      {/* System-level top/bottom (matching ExtraHandles pattern) */}
      <Handle type="target" position={Position.Top} id="top-target"
        style={{ ...handleDotStyle, background: `${color.primary}66`, top: '-4px', left: '40%' }} />
      <Handle type="source" position={Position.Top} id="top-source"
        style={{ ...handleDotStyle, background: `${color.primary}66`, top: '-4px', left: '60%' }} />
      <Handle type="target" position={Position.Bottom} id="bottom-target"
        style={{ ...handleDotStyle, background: `${color.primary}66`, bottom: '-4px', left: '40%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-source"
        style={{ ...handleDotStyle, background: `${color.primary}66`, bottom: '-4px', left: '60%' }} />

      {/* Signal-typed left handles (inputs) */}
      {inputSignals.map((sig, i) => (
        <Handle
          key={`in-${sig.name}`}
          type="target"
          position={Position.Left}
          id={`sig-in-${sig.name}`}
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: SIGNAL_TYPES[sig.type]?.color || '#666',
            border: '2px solid #0f172a',
            left: '-5px',
            top: `${65 + i * 18}px`,
          }}
          title={`← ${sig.name} (${sig.type}) — ${sig.desc}`}
        />
      ))}

      {/* Signal-typed right handles (outputs) */}
      {outputSignals.map((sig, i) => (
        <Handle
          key={`out-${sig.name}`}
          type="source"
          position={Position.Right}
          id={`sig-out-${sig.name}`}
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: SIGNAL_TYPES[sig.type]?.color || '#666',
            border: '2px solid #0f172a',
            right: '-5px',
            top: `${65 + i * 18}px`,
          }}
          title={`→ ${sig.name} (${sig.type}) — ${sig.desc}`}
        />
      ))}

      {/* Default left/right for generic connections */}
      <Handle type="target" position={Position.Left} id="left-target"
        style={{ ...handleDotStyle, left: '-4px', top: '50%' }} />
      <Handle type="source" position={Position.Right} id="right-source"
        style={{ ...handleDotStyle, right: '-4px', top: '50%' }} />
    </div>
  );
}

export default SWComponentNode;
