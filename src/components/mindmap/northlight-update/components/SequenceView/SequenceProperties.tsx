import React, { useState, useEffect } from 'react';
import type {
  SequenceParticipant, SequenceMessage, SequenceFragment,
  MessageType, FragmentType,
} from './sequenceTypes';
import { MESSAGE_STYLES, PARTICIPANT_COLORS } from './sequenceTypes';

interface SequencePropertiesProps {
  elementType: 'participant' | 'message' | 'fragment' | null;
  element: any;
  participants: SequenceParticipant[];
  onUpdateParticipant: (id: string, changes: Partial<SequenceParticipant>) => void;
  onUpdateMessage: (id: string, changes: Partial<SequenceMessage>) => void;
  onUpdateFragment: (id: string, changes: Partial<SequenceFragment>) => void;
  onRemoveParticipant: (id: string) => void;
  onRemoveMessage: (id: string) => void;
  onRemoveFragment: (id: string) => void;
  plmNodes?: any[];
}

export default function SequenceProperties({
  elementType, element, participants,
  onUpdateParticipant, onUpdateMessage, onUpdateFragment,
  onRemoveParticipant, onRemoveMessage, onRemoveFragment,
  plmNodes = [],
}: SequencePropertiesProps) {
  if (!element || !elementType) {
    return (
      <div style={{
        position: 'fixed', right: 0, bottom: 0, width: 300, height: 220,
        background: '#ffffff', borderTop: '1px solid #e2e8f0', borderLeft: '1px solid #e2e8f0',
        zIndex: 2400, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
          Markera ett element för att redigera
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '5px 8px',
    background: '#f8fafc', border: '1px solid #d1d5db', borderRadius: 4,
    color: '#1e293b', fontSize: 11, outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    color: '#64748b', fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 2,
  };

  const deleteBtn = (onClick: () => void) => (
    <button onClick={onClick} style={{
      padding: '4px 10px', background: '#fef2f2', border: '1px solid #fecaca',
      borderRadius: 4, color: '#dc2626', fontSize: 10, cursor: 'pointer', marginTop: 8,
    }}>
      🗑️ Ta bort
    </button>
  );

  return (
    <div style={{
      position: 'fixed', right: 0, bottom: 0, width: 300,
      maxHeight: 'calc(100vh - 100px)',
      background: '#ffffff', borderTop: '1px solid #e2e8f0', borderLeft: '1px solid #e2e8f0',
      zIndex: 2400, overflowY: 'auto',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#1e293b', fontSize: 12, fontWeight: 600 }}>
          {elementType === 'participant' ? '👤 Deltagare' :
           elementType === 'message' ? '➡️ Meddelande' : '🔲 Fragment'}
        </span>
        <span style={{ color: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }}>{element.id?.slice(-8)}</span>
      </div>

      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* ─── Participant properties ─── */}
        {elementType === 'participant' && (() => {
          const p = element as SequenceParticipant;
          return (
            <>
              <div>
                <div style={labelStyle}>Namn</div>
                <input
                  value={p.label} style={inputStyle}
                  onChange={e => onUpdateParticipant(p.id, { label: e.target.value })}
                />
              </div>
              <div>
                <div style={labelStyle}>Stereotype</div>
                <input
                  value={p.stereotype || ''} style={inputStyle}
                  onChange={e => onUpdateParticipant(p.id, { stereotype: e.target.value || undefined })}
                  placeholder="<<system>>"
                />
              </div>
              <div>
                <div style={labelStyle}>Färg</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {Object.entries(PARTICIPANT_COLORS).map(([key, color]) => (
                    <button
                      key={key}
                      onClick={() => onUpdateParticipant(p.id, { color })}
                      style={{
                        width: 22, height: 22, borderRadius: 4, border: p.color === color ? '2px solid #1e293b' : '1px solid #d1d5db',
                        background: color, cursor: 'pointer',
                      }}
                      title={key}
                    />
                  ))}
                </div>
              </div>
              {plmNodes.length > 0 && (
                <div>
                  <div style={labelStyle}>Kopplad PLM-nod</div>
                  <select
                    value={p.linkedNodeId || ''}
                    onChange={e => {
                      const node = plmNodes.find(n => n.id === e.target.value);
                      onUpdateParticipant(p.id, {
                        linkedNodeId: e.target.value || undefined,
                        linkedNodeType: node?.data?.itemType || node?.data?.type,
                        color: PARTICIPANT_COLORS[node?.data?.itemType || 'default'],
                        stereotype: node ? `<<${node.data?.itemType || node.data?.type}>>` : undefined,
                      });
                    }}
                    style={{ ...inputStyle, padding: '5px 4px' }}
                  >
                    <option value="">Ingen koppling</option>
                    {plmNodes.filter(n => ['system','subsystem','function','actor','hardware'].includes(n.data?.itemType || n.data?.type)).map(n => (
                      <option key={n.id} value={n.id}>{n.data?.label} ({n.data?.itemType || n.data?.type})</option>
                    ))}
                  </select>
                </div>
              )}
              {deleteBtn(() => onRemoveParticipant(p.id))}
            </>
          );
        })()}

        {/* ─── Message properties ─── */}
        {elementType === 'message' && (() => {
          const m = element as SequenceMessage;
          return (
            <>
              <div>
                <div style={labelStyle}>Label</div>
                <input
                  value={m.label} style={inputStyle}
                  onChange={e => onUpdateMessage(m.id, { label: e.target.value })}
                />
              </div>
              <div>
                <div style={labelStyle}>Typ</div>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {(['sync','async','reply','create','destroy'] as MessageType[]).map(t => (
                    <button key={t} onClick={() => onUpdateMessage(m.id, { type: t })}
                      style={{
                        padding: '2px 6px', borderRadius: 3, cursor: 'pointer',
                        background: m.type === t ? '#eff6ff' : 'transparent',
                        border: m.type === t ? '1px solid #bfdbfe' : '1px solid #d1d5db',
                        color: m.type === t ? '#1d4ed8' : '#64748b', fontSize: 10, fontFamily: 'monospace',
                      }}>{t}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>Från</div>
                  <select value={m.fromId} onChange={e => onUpdateMessage(m.id, { fromId: e.target.value })}
                    style={{ ...inputStyle, padding: '5px 4px' }}>
                    {participants.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>Till</div>
                  <select value={m.toId} onChange={e => onUpdateMessage(m.id, { toId: e.target.value })}
                    style={{ ...inputStyle, padding: '5px 4px' }}>
                    {participants.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={labelStyle}>Guard (villkor)</div>
                <input
                  value={m.guard || ''} style={inputStyle}
                  onChange={e => onUpdateMessage(m.id, { guard: e.target.value || undefined })}
                  placeholder="x > 0"
                />
              </div>
              <div>
                <div style={labelStyle}>Signal-referens</div>
                <input
                  value={m.signalRef || ''} style={inputStyle}
                  onChange={e => onUpdateMessage(m.id, { signalRef: e.target.value || undefined })}
                  placeholder="st_sigCmdStart"
                />
              </div>
              {deleteBtn(() => onRemoveMessage(m.id))}
            </>
          );
        })()}

        {/* ─── Fragment properties ─── */}
        {elementType === 'fragment' && (() => {
          const f = element as SequenceFragment;
          return (
            <>
              <div>
                <div style={labelStyle}>Typ</div>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {(['alt','opt','loop','par','break','critical','ref'] as FragmentType[]).map(ft => (
                    <button key={ft} onClick={() => onUpdateFragment(f.id, { type: ft })}
                      style={{
                        padding: '2px 6px', borderRadius: 3, cursor: 'pointer',
                        background: f.type === ft ? '#fffbeb' : 'transparent',
                        border: f.type === ft ? '1px solid #fde68a' : '1px solid #d1d5db',
                        color: f.type === ft ? '#b45309' : '#64748b', fontSize: 10, fontFamily: 'monospace',
                      }}>{ft}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Label / Guard</div>
                <input
                  value={f.label} style={inputStyle}
                  onChange={e => onUpdateFragment(f.id, { label: e.target.value })}
                />
              </div>
              {deleteBtn(() => onRemoveFragment(f.id))}
            </>
          );
        })()}
      </div>
    </div>
  );
}
