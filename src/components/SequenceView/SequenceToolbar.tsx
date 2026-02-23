import React, { useState } from 'react';
import type { MessageType, FragmentType } from './sequenceTypes';

type Tool = 'select' | 'addParticipant' | 'addMessage' | 'addFragment';

interface SequenceToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onAddParticipant: (label: string) => void;
  onAddParticipantFromNode: () => void;
  messageType: MessageType;
  onMessageTypeChange: (t: MessageType) => void;
  fragmentType: FragmentType;
  onFragmentTypeChange: (t: FragmentType) => void;
  onAutoGenerate: () => void;
  onFitToWindow: () => void;
  onExportPlantUML: () => void;
  onExportSVG: () => void;
  participantCount: number;
  messageCount: number;
}

export default function SequenceToolbar({
  activeTool, onToolChange,
  onAddParticipant, onAddParticipantFromNode,
  messageType, onMessageTypeChange,
  fragmentType, onFragmentTypeChange,
  onAutoGenerate, onFitToWindow, onExportPlantUML, onExportSVG,
  participantCount, messageCount,
}: SequenceToolbarProps) {
  const [newParticipantName, setNewParticipantName] = useState('');
  const [showExport, setShowExport] = useState(false);

  const btnStyle = (isActive: boolean) => ({
    width: 44, height: 44,
    border: 'none', borderRadius: 8,
    cursor: 'pointer', fontSize: 18,
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    background: isActive ? '#3b82f6' : 'rgba(30,41,59,0.8)',
    color: 'white',
    transition: 'all 0.15s',
    flexShrink: 0 as const,
  });

  const labelStyle = {
    color: 'white', fontSize: 10, fontWeight: 500 as const,
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    whiteSpace: 'nowrap' as const,
  };

  const sep = <div style={{ height: 1, background: '#4a5f7f', margin: '6px 0' }} />;

  return (
    <div style={{
      position: 'fixed', left: 10, top: 55,
      display: 'flex', flexDirection: 'column', gap: 6,
      zIndex: 2500,
      background: 'rgba(44, 62, 80, 0.92)',
      padding: 10, borderRadius: 10,
      backdropFilter: 'blur(4px)',
      width: 160,
    }}>
      {/* Select tool */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => onToolChange('select')} style={btnStyle(activeTool === 'select')} title="Select (V)">
          🖱️
        </button>
        <span style={labelStyle}>Markera</span>
      </div>

      {sep}

      {/* Add participant */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => onToolChange('addParticipant')} style={btnStyle(activeTool === 'addParticipant')} title="Add Participant (P)">
          👤
        </button>
        <span style={labelStyle}>Deltagare</span>
      </div>

      {activeTool === 'addParticipant' && (
        <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <input
            value={newParticipantName}
            onChange={e => setNewParticipantName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newParticipantName.trim()) {
                onAddParticipant(newParticipantName.trim());
                setNewParticipantName('');
              }
            }}
            placeholder="Namn..."
            style={{
              width: '100%', padding: '5px 8px',
              background: '#1a2332', border: '1px solid var(--nl-border, #4a5f7f)', borderRadius: 4,
              color: '#e2e8f0', fontSize: 11, outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={onAddParticipantFromNode}
            style={{
              padding: '4px 8px', background: '#1abc9c20', border: '1px solid #1abc9c40',
              borderRadius: 4, color: '#1abc9c', fontSize: 10, cursor: 'pointer',
            }}
          >
            📋 Från PLM-nod...
          </button>
        </div>
      )}

      {sep}

      {/* Add message */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => onToolChange('addMessage')} style={btnStyle(activeTool === 'addMessage')} title="Add Message (M)">
          ➡️
        </button>
        <span style={labelStyle}>Meddelande</span>
      </div>

      {activeTool === 'addMessage' && (
        <div style={{ padding: '2px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {([
            { t: 'sync' as const,  icon: '──▶', label: 'Synkront' },
            { t: 'async' as const, icon: '──>', label: 'Asynkront' },
            { t: 'reply' as const, icon: '- ->', label: 'Svar' },
            { t: 'create' as const, icon: '- ->«', label: 'Create' },
          ]).map(({ t, icon, label }) => (
            <button
              key={t}
              onClick={() => onMessageTypeChange(t)}
              style={{
                padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 6,
                background: messageType === t ? '#3b82f620' : 'transparent',
                border: messageType === t ? '1px solid #3b82f640' : '1px solid transparent',
                borderRadius: 4, color: messageType === t ? '#93c5fd' : '#94a3b8',
                fontSize: 10, cursor: 'pointer', textAlign: 'left' as const,
              }}
            >
              <span style={{ fontFamily: 'monospace', fontSize: 9, width: 30 }}>{icon}</span>
              {label}
            </button>
          ))}
          <div style={{ color: '#475569', fontSize: 9, padding: '2px 4px', fontStyle: 'italic' }}>
            Klicka källa → mål
          </div>
        </div>
      )}

      {sep}

      {/* Fragment */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => onToolChange('addFragment')} style={btnStyle(activeTool === 'addFragment')} title="Add Fragment (G)">
          🔲
        </button>
        <span style={labelStyle}>Fragment</span>
      </div>

      {activeTool === 'addFragment' && (
        <div style={{ padding: '2px 0', display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {(['alt', 'opt', 'loop', 'par', 'break'] as FragmentType[]).map(ft => (
            <button
              key={ft}
              onClick={() => onFragmentTypeChange(ft)}
              style={{
                padding: '2px 6px',
                background: fragmentType === ft ? '#f59e0b20' : 'transparent',
                border: fragmentType === ft ? '1px solid #f59e0b40' : '1px solid #334155',
                borderRadius: 3, color: fragmentType === ft ? '#fbbf24' : '#94a3b8',
                fontSize: 9, fontFamily: 'monospace', cursor: 'pointer',
              }}
            >
              {ft}
            </button>
          ))}
        </div>
      )}

      {sep}

      {/* Auto-generate */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onAutoGenerate} style={btnStyle(false)} title="Auto-generera från PLM-edges">
          ⚡
        </button>
        <span style={labelStyle}>Auto-gen</span>
      </div>

      {sep}

      {/* Fit to window */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onFitToWindow} style={btnStyle(false)} title="Anpassa till fönster (F)">
          ⊞
        </button>
        <span style={labelStyle}>Anpassa (F)</span>
      </div>

      {sep}

      {/* Export */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setShowExport(!showExport)} style={btnStyle(showExport)} title="Export">
          📤
        </button>
        <span style={labelStyle}>Exportera</span>
      </div>

      {showExport && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <button onClick={() => { onExportPlantUML(); setShowExport(false); }}
            style={{ padding: '4px 8px', background: '#1a2332', border: '1px solid #334155', borderRadius: 4, color: '#94a3b8', fontSize: 10, cursor: 'pointer', textAlign: 'left' as const }}>
            📝 PlantUML
          </button>
          <button onClick={() => { onExportSVG(); setShowExport(false); }}
            style={{ padding: '4px 8px', background: '#1a2332', border: '1px solid #334155', borderRadius: 4, color: '#94a3b8', fontSize: 10, cursor: 'pointer', textAlign: 'left' as const }}>
            🖼️ SVG
          </button>
        </div>
      )}

      {sep}

      {/* Stats */}
      <div style={{ fontSize: 9, color: '#475569', padding: '0 4px' }}>
        {participantCount} deltagare · {messageCount} meddelanden
      </div>
    </div>
  );
}
