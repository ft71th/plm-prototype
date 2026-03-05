import React, { useState, useCallback } from 'react';
import type { NorthlightTheme } from '../../theme';

// ─── Types ──────────────────────────────────────────────────────────────────
interface GroupItem {
  key: string;
  label: string;
  icon: string | JSX.Element;
  bgColor: string;
  action: () => void;
}

interface Group {
  id: string;
  label: string;
  icon: string;
  items: GroupItem[];
}

// ─── Component ──────────────────────────────────────────────────────────────
function LeftIconStrip({ 
  onAddSystem, 
  onAddSubSystem, 
  onAddFunction, 
  onAddTestCase,
  onAddRequirement,
  onAddPlatform,
  onAddParameter,
  onAddHardware,
  onAddUseCase,
  onAddActor,
  onAddTextAnnotation,
  onAddPostIt,
  onAddSWProgram,
  onAddSWFunctionBlock,
  onOpenLibrary,
  onOpenMETSLibrary,
  onOpenIssueManager,
  onVoice,
  isListening,
  voiceStatus,
  theme,
}: any) {
  const t = theme as NorthlightTheme;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ arch: true });

  const toggle = useCallback((id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const wrap = (cb: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    cb();
  };

  const actorSvg = (
    <svg width={16} height={18} viewBox="0 0 100 120">
      <circle cx="50" cy="20" r="12" fill="none" stroke="white" strokeWidth="5" />
      <line x1="50" y1="32" x2="50" y2="75" stroke="white" strokeWidth="5" />
      <line x1="25" y1="50" x2="75" y2="50" stroke="white" strokeWidth="5" />
      <line x1="50" y1="75" x2="30" y2="105" stroke="white" strokeWidth="5" />
      <line x1="50" y1="75" x2="70" y2="105" stroke="white" strokeWidth="5" />
    </svg>
  );

  const groups: Group[] = [
    {
      id: 'arch',
      label: 'Arkitektur',
      icon: '📐',
      items: [
        { key: 'system',    label: 'System',     icon: '🔷', bgColor: '#1abc9c', action: onAddSystem },
        { key: 'subsystem', label: 'Sub-System', icon: '🔶', bgColor: '#3498db', action: onAddSubSystem },
        { key: 'function',  label: 'Function',   icon: '⚡', bgColor: '#00bcd4', action: onAddFunction },
      ],
    },
    {
      id: 'hw',
      label: 'Hårdvara',
      icon: '🔌',
      items: [
        { key: 'hardware',  label: 'Hardware',   icon: '📦', bgColor: '#795548', action: () => onAddHardware('generic') },
        { key: 'parameter', label: 'Parameter',  icon: '⚙️', bgColor: '#00bcd4', action: () => onAddParameter('configuration') },
        { key: 'mets',      label: 'METS Komp.', icon: '🔧', bgColor: '#1e3a5f', action: onOpenMETSLibrary },
      ],
    },
    {
      id: 'sw',
      label: 'Mjukvara',
      icon: '💻',
      items: [
        { key: 'swprg', label: 'Program (PRG)', icon: '▶', bgColor: '#b45309', action: onAddSWProgram },
        { key: 'swfb',  label: 'Func. Block (FB)', icon: '⚙', bgColor: '#0e7490', action: onAddSWFunctionBlock },
      ],
    },
    {
      id: 'verify',
      label: 'Verifiering',
      icon: '✅',
      items: [
        { key: 'testcase', label: 'Test Case', icon: '🧪', bgColor: '#27ae60', action: onAddTestCase },
        { key: 'usecase',  label: 'Use Case',  icon: '🎯', bgColor: '#f39c12', action: onAddUseCase },
        { key: 'actor',    label: 'Actor',      icon: actorSvg, bgColor: '#2ecc71', action: onAddActor },
      ],
    },
    {
      id: 'req',
      label: 'Krav',
      icon: '📋',
      items: [
        { key: 'req',      label: 'Requirement', icon: '📋', bgColor: '#e67e22', action: onAddRequirement },
        { key: 'platform', label: 'Platform',    icon: '🟣', bgColor: '#9b59b6', action: onAddPlatform },
      ],
    },
    {
      id: 'misc',
      label: 'Övrigt',
      icon: '🎨',
      items: [
        { key: 'text',    label: 'Text',    icon: '📝', bgColor: '#607d8b', action: onAddTextAnnotation },
        { key: 'postit',  label: 'Post-it', icon: '📌', bgColor: '#f9e547', action: onAddPostIt },
        { key: 'library', label: 'Library',  icon: '📚', bgColor: '#16a085', action: onOpenLibrary },
        { key: 'issues',  label: 'Issues',   icon: '🐛', bgColor: '#c0392b', action: onOpenIssueManager },
      ],
    },
  ];

  return (
    <div style={{
      position: 'fixed',
      left: 10, top: 55,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 2500,
      background: t?.bgSidebar || 'rgba(44, 62, 80, 0.92)',
      padding: 6,
      borderRadius: 10,
      backdropFilter: 'blur(4px)',
      width: 158,
      maxHeight: 'calc(100vh - 90px)',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>
      {groups.map((group, gi) => (
        <div key={group.id}>
          {/* ── Group header ── */}
          <button
            onClick={() => toggle(group.id)}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 6px',
              background: 'none', border: 'none',
              cursor: 'pointer', borderRadius: 6,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = (t?.bgHover || 'rgba(255,255,255,0.06)'))}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <span style={{
              fontSize: 7, color: t?.textMuted || '#64748b',
              transition: 'transform 0.15s',
              transform: expanded[group.id] ? 'rotate(90deg)' : 'rotate(0deg)',
              display: 'inline-block', width: 10,
            }}>▶</span>
            <span style={{ fontSize: 12 }}>{group.icon}</span>
            <span style={{
              color: t?.textSecondary || '#94a3b8', fontSize: 10, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 0.5,
              flex: 1, textAlign: 'left',
            }}>{group.label}</span>
            <span style={{ color: t?.textMuted || '#475569', fontSize: 9, fontFamily: 'monospace' }}>
              {group.items.length}
            </span>
          </button>

          {/* ── Group items ── */}
          <div style={{
            overflow: 'hidden',
            maxHeight: expanded[group.id] ? `${group.items.length * 36}px` : '0px',
            transition: 'max-height 0.2s ease-in-out',
          }}>
            {group.items.map(item => (
              <div
                key={item.key}
                onClick={wrap(item.action)}
                title={item.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '3px 4px 3px 18px',
                  cursor: 'pointer', borderRadius: 5,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = (t?.bgHover || 'rgba(255,255,255,0.08)'))}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: item.bgColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <span style={{
                  color: t?.textPrimary || '#e2e8f0', fontSize: 11, fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Separator */}
          {gi < groups.length - 1 && (
            <div style={{ height: 1, background: t?.borderLight || '#334155', margin: '2px 8px' }} />
          )}
        </div>
      ))}

      {/* ── Voice — always visible ── */}
      <div style={{ height: 1, background: t?.borderLight || '#334155', margin: '2px 8px' }} />
      <div
        onClick={wrap(onVoice)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '3px 4px 3px 18px',
          cursor: isListening ? 'not-allowed' : 'pointer',
          borderRadius: 5, opacity: isListening ? 0.7 : 1,
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: isListening ? '#e74c3c' : '#3498db',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
          animation: isListening ? 'pulse 1s infinite' : 'none',
        }}>🎤</div>
        <span style={{ color: t?.textPrimary || '#e2e8f0', fontSize: 11, fontWeight: 500 }}>
          {isListening ? 'Lyssnar...' : 'Voice'}
        </span>
      </div>

      {voiceStatus && (
        <div style={{
          background: t?.bgPanel || '#1e293b', padding: '4px 8px', borderRadius: 5,
          fontSize: 9, margin: '2px 4px 0',
          color: voiceStatus.includes('✅') ? '#27ae60' : 
                 voiceStatus.includes('❌') ? '#e74c3c' : '#3498db',
          maxWidth: '140px', wordBreak: 'break-word',
        }}>
          {voiceStatus}
        </div>
      )}
    </div>
  );
}

export default LeftIconStrip;
