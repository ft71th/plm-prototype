import React, { useState, useEffect, useMemo } from 'react';
import { Handle, Position, useUpdateNodeInternals } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import type { SWSignal } from '../../types';

// ─── Theme constants ────────────────────────────────────────────────────────
const COLORS = {
  prg:  { primary: '#f59e0b', dim: '#92400e', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.35)' },
  fb:   { primary: '#06b6d4', dim: '#164e63', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.35)' },
  swc:  { primary: '#8b5cf6', dim: '#4c1d95', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.35)' },
};

const DTYPE_COLORS: Record<string, string> = {
  BOOL: '#22c55e', INT: '#a855f7', DINT: '#a855f7', REAL: '#3b82f6', LREAL: '#3b82f6',
  STRING: '#f97316', TIME: '#ec4899', DATE_AND_TIME: '#ec4899',
  BYTE: '#14b8a6', WORD: '#14b8a6', ARRAY: '#94a3b8', STRUCT: '#8b5cf6', ENUM: '#3b82f6',
};

const STATE_BADGE_COLORS: Record<string, string> = {
  draft: '#fbbf24', review: '#60a5fa', approved: '#34d399',
};

const LANG_COLORS: Record<string, string> = {
  ST: '#3b82f6', FBD: '#8b5cf6', SFC: '#22c55e', LD: '#f59e0b', CFC: '#ec4899',
};

const HANDLE_DOT: React.CSSProperties = {
  width: '8px', height: '8px',
  background: 'rgba(100,100,100,0.3)',
  border: '1.5px solid rgba(255,255,255,0.5)',
  transition: 'background 0.2s, transform 0.2s',
};

// ─── Signal badge ───────────────────────────────────────────────────────────
function SignalBadge({ signal }: { signal: SWSignal }) {
  const color = DTYPE_COLORS[signal.datatype] || '#94a3b8';
  const dirColor = signal.direction === 'IN' ? '#60a5fa' : signal.direction === 'OUT' ? '#f472b6' : '#fbbf24';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0',
      fontSize: 10, fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      <span style={{
        fontSize: 8, color: dirColor, width: 20, textAlign: 'center', fontWeight: 700,
      }}>
        {signal.direction === 'IN' ? '→' : signal.direction === 'OUT' ? '←' : '↔'}
      </span>
      <span style={{ color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {signal.name}
      </span>
      {signal.unit && (
        <span style={{ fontSize: 8, color: '#64748b' }}>{signal.unit}</span>
      )}
      <span style={{
        fontSize: 8, padding: '0px 3px', borderRadius: 2,
        background: `${color}18`, color, border: `1px solid ${color}40`,
        fontWeight: 600,
      }}>{signal.datatype}</span>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
function SWPouNode({ data, id, selected }: { data: any; id: string; selected: boolean }) {
  const [showSignals, setShowSignals] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const updateNodeInternals = useUpdateNodeInternals();

  const isPrg = data.pouType === 'program';
  const colors = isPrg ? COLORS.prg : COLORS.fb;
  const icon = isPrg ? '▶' : '⚙';
  const typeLabel = isPrg ? 'Program (PRG)' : 'Function Block (FB)';

  const signals: SWSignal[] = data.swSignals || [];
  const inputSignals = useMemo(() => signals.filter(s => s.direction === 'IN' || s.direction === 'IN_OUT'), [signals]);
  const outputSignals = useMemo(() => signals.filter(s => s.direction === 'OUT' || s.direction === 'IN_OUT'), [signals]);

  // Recalc handles when expanded/collapsed
  useEffect(() => {
    const t = requestAnimationFrame(() => updateNodeInternals(id));
    return () => cancelAnimationFrame(t);
  }, [id, updateNodeInternals, showSignals]);

  const nodeWidth = data.nodeWidth || 260;

  // Name editing
  const handleStartEdit = () => {
    setEditName(data.label || '');
    setIsEditingName(true);
  };
  const handleFinishEdit = () => {
    setIsEditingName(false);
    if (data.onChange && editName.trim()) {
      data.onChange(id, 'label', editName.trim());
    }
  };

  return (
    <div style={{
      background: '#0f172a',
      border: `2px solid ${selected ? colors.primary : colors.border}`,
      borderRadius: 10,
      width: nodeWidth,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      boxShadow: selected
        ? `0 0 0 2px ${colors.primary}40, 0 4px 16px ${colors.primary}15`
        : `0 2px 8px rgba(0,0,0,0.2)`,
      overflow: 'hidden',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}>
      {/* Resizer */}
      <NodeResizer
        minWidth={200} minHeight={60} isVisible={selected}
        lineStyle={{ borderColor: `${colors.primary}60` }}
        handleStyle={{ background: colors.primary, width: 8, height: 8, borderRadius: 2, border: 'none' }}
        onResize={(_evt: any, params: any) => {
          if (data.onChange) data.onChange(id, 'nodeWidth', params.width);
        }}
      />

      {/* 4-side handles */}
      <Handle type="target" position={Position.Top} id={`${id}-top-in`} style={{ ...HANDLE_DOT, top: -4 }} />
      <Handle type="source" position={Position.Top} id={`${id}-top-out`} style={{ ...HANDLE_DOT, top: -4, left: '60%' }} />
      <Handle type="target" position={Position.Left} id={`${id}-left-in`} style={{ ...HANDLE_DOT, left: -4 }} />
      <Handle type="source" position={Position.Right} id={`${id}-right-out`} style={{ ...HANDLE_DOT, right: -4 }} />
      <Handle type="target" position={Position.Bottom} id={`${id}-bottom-in`} style={{ ...HANDLE_DOT, bottom: -4 }} />
      <Handle type="source" position={Position.Bottom} id={`${id}-bottom-out`} style={{ ...HANDLE_DOT, bottom: -4, left: '60%' }} />

      {/* Color bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${colors.primary}, ${colors.primary}60)` }} />

      {/* Header */}
      <div style={{ padding: '8px 10px 6px' }}>
        {/* Type badge + status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11 }}>{icon}</span>
            <span style={{
              fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
              color: colors.primary, letterSpacing: 0.6,
            }}>{typeLabel}</span>
          </div>
          {data.swStatus && (
            <span style={{
              fontSize: 8, padding: '1px 5px', borderRadius: 8,
              background: `${STATE_BADGE_COLORS[data.swStatus] || '#94a3b8'}18`,
              color: STATE_BADGE_COLORS[data.swStatus] || '#94a3b8',
              border: `1px solid ${STATE_BADGE_COLORS[data.swStatus] || '#94a3b8'}40`,
              fontWeight: 600, textTransform: 'uppercase',
            }}>{data.swStatus}</span>
          )}
        </div>

        {/* SWC badge + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          {data.swcCode && (
            <span style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 3,
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
              background: COLORS.swc.bg, color: COLORS.swc.primary,
              border: `1px solid ${COLORS.swc.border}`,
            }}>{data.swcCode}</span>
          )}
          {isEditingName ? (
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={handleFinishEdit}
              onKeyDown={e => e.key === 'Enter' && handleFinishEdit()}
              autoFocus
              style={{
                flex: 1, fontSize: 12, fontWeight: 700, padding: '1px 4px',
                background: '#1e293b', border: `1px solid ${colors.primary}`,
                borderRadius: 3, color: '#e2e8f0', outline: 'none',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
          ) : (
            <span
              onDoubleClick={handleStartEdit}
              style={{
                fontSize: 12, fontWeight: 700, color: '#e2e8f0',
                fontFamily: "'JetBrains Mono', monospace",
                cursor: 'text', flex: 1,
              }}
              title="Double-click to rename"
            >{data.label || 'Unnamed'}</span>
          )}
        </div>

        {/* Description */}
        {data.description && (
          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2, lineHeight: 1.3 }}>
            {data.description}
          </div>
        )}

        {/* Meta badges row */}
        <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
          {data.swLanguage && (
            <span style={{
              fontSize: 8, padding: '1px 5px', borderRadius: 3,
              background: `${LANG_COLORS[data.swLanguage] || '#3b82f6'}15`,
              color: LANG_COLORS[data.swLanguage] || '#3b82f6',
              border: `1px solid ${LANG_COLORS[data.swLanguage] || '#3b82f6'}30`,
              fontWeight: 600,
            }}>{data.swLanguage}</span>
          )}
          {isPrg && data.taskInterval && (
            <span style={{
              fontSize: 8, padding: '1px 5px', borderRadius: 3,
              background: `${colors.primary}15`, color: colors.primary,
              border: `1px solid ${colors.primary}30`,
              fontFamily: "'JetBrains Mono', monospace",
            }}>⏱ {data.taskType || 'cyclic'} {data.taskInterval}{data.taskPriority != null ? ` P${data.taskPriority}` : ''}</span>
          )}
          {data.useStateMachine && (
            <span style={{
              fontSize: 8, padding: '1px 5px', borderRadius: 3,
              background: 'rgba(34,197,94,0.15)', color: '#22c55e',
              border: '1px solid rgba(34,197,94,0.3)',
              fontWeight: 600,
            }}>PackML</span>
          )}
          {signals.length > 0 && (
            <button
              onClick={() => setShowSignals(!showSignals)}
              style={{
                fontSize: 8, padding: '1px 5px', borderRadius: 3,
                background: showSignals ? `${colors.primary}20` : 'transparent',
                color: colors.primary, cursor: 'pointer',
                border: `1px solid ${colors.primary}40`,
                fontWeight: 600,
              }}
            >{showSignals ? '▼' : '▶'} {inputSignals.length}in / {outputSignals.length}out</button>
          )}
        </div>
      </div>

      {/* Signals (expandable) */}
      {showSignals && signals.length > 0 && (
        <div style={{ borderTop: '1px solid #334155', padding: '6px 10px' }}>
          <div style={{
            fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
            color: '#64748b', letterSpacing: 0.6, marginBottom: 3,
          }}>Interface Signals</div>
          {/* Inputs */}
          {inputSignals.length > 0 && (
            <>
              <div style={{ fontSize: 7, color: '#60a5fa', fontWeight: 600, marginTop: 2, marginBottom: 1 }}>INPUTS</div>
              {inputSignals.map((s, i) => <SignalBadge key={`in-${i}`} signal={s} />)}
            </>
          )}
          {/* Outputs */}
          {outputSignals.length > 0 && (
            <>
              <div style={{ fontSize: 7, color: '#f472b6', fontWeight: 600, marginTop: 4, marginBottom: 1 }}>OUTPUTS</div>
              {outputSignals.map((s, i) => <SignalBadge key={`out-${i}`} signal={s} />)}
            </>
          )}
        </div>
      )}

      {/* Allocated functions summary */}
      {data.allocatedFunctions && data.allocatedFunctions.length > 0 && (
        <div style={{ borderTop: '1px solid #334155', padding: '5px 10px' }}>
          <div style={{
            fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
            color: '#64748b', letterSpacing: 0.6, marginBottom: 2,
          }}>Allocated ({data.allocatedFunctions.length})</div>
          {data.allocatedFunctions.slice(0, 3).map((fId: string, i: number) => (
            <div key={i} style={{ fontSize: 9, color: '#94a3b8', padding: '1px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00bcd4', flexShrink: 0 }} />
              {fId}
            </div>
          ))}
          {data.allocatedFunctions.length > 3 && (
            <div style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>+{data.allocatedFunctions.length - 3} more</div>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(SWPouNode);
