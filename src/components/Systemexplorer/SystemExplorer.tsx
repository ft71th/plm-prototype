import React, { useState } from 'react';
import type { PLMNode, PLMEdge } from '../../types';
import type { NorthlightTheme } from '../../theme';
import type { ExplorerTab } from './systemExplorerTypes';
import ExplorerView from './ExplorerView';
import TraceabilityView from './TraceabilityView';

// ─── Props ──────────────────────────────────────────────────────────────────

interface SystemExplorerProps {
  nodes: PLMNode[];
  edges: PLMEdge[];
  requirementLinks?: any[];
  theme: NorthlightTheme;
  style?: React.CSSProperties;
  projectId?: string | null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SystemExplorer({
  nodes,
  edges,
  requirementLinks,
  theme,
  style,
  projectId,
}: SystemExplorerProps) {
  const t = theme;
  const [activeTab, setActiveTab] = useState<ExplorerTab>('explorer');

  const height = style?.height
    ? typeof style.height === 'number' ? style.height : parseInt(String(style.height), 10) || 600
    : 600;

  const tabs: { key: ExplorerTab; label: string; icon: string }[] = [
    { key: 'explorer', label: 'System Explorer', icon: '◈' },
    { key: 'traceability', label: 'Traceability', icon: '⤭' },
  ];

  return (
    <div style={{
      height: style?.height || '100%',
      display: 'flex',
      flexDirection: 'column',
      background: t.bgCanvas,
      color: t.canvasText,
      overflow: 'hidden',
      ...style,
    }}>
      {/* ── Tab bar ──────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        padding: '6px 16px',
        borderBottom: `1px solid ${t.borderLight}`,
        background: t.bgCanvas,
        flexShrink: 0,
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: activeTab === tab.key ? `${t.accent}18` : 'transparent',
              border: `1px solid ${activeTab === tab.key ? `${t.accent}35` : 'transparent'}`,
              borderRadius: 6,
              padding: '5px 14px',
              cursor: 'pointer',
              color: activeTab === tab.key ? t.canvasText : t.canvasTextSec,
              fontSize: 11,
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 13 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── View content ─────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'explorer' ? (
          <ExplorerView
            nodes={nodes}
            edges={edges}
            requirementLinks={requirementLinks}
            theme={t}
            height={height - 50}
          />
        ) : (
          <TraceabilityView
            nodes={nodes}
            edges={edges}
            requirementLinks={requirementLinks}
            theme={t}
            height={height - 50}
          />
        )}
      </div>
    </div>
  );
}
