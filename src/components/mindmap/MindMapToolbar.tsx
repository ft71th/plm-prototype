// ═══════════════════════════════════════════════════════════════
// Northlight Mind Map — Toolbar (theme-aware, map management)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import type { MindMapLayout } from './mindmapTypes';
import useStore from '../../store';

interface MapEntry { id: string; name: string; }

interface Props {
  docId: string;
  docName: string;
  layout: MindMapLayout;
  zoom: number;
  searchTerm: string;
  mapEntries: MapEntry[];
  onSearchChange: (v: string) => void;
  onLayoutChange: (v: MindMapLayout) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onCollapseToDepth: (d: number) => void;
  onExport: () => void;
  onExportPNG: () => void;
  onAutoLayout: () => void;
  onFitView: () => void;
  onCreateMap: (name: string) => void;
  onRenameMap: (name: string) => void;
  onSwitchMap: (id: string) => void;
  onDeleteMap: (id: string) => void;
}

const LAYOUTS: { id: MindMapLayout; label: string; icon: string }[] = [
  { id: 'horizontal', label: 'Horizontal', icon: '↔' },
  { id: 'vertical', label: 'Vertical', icon: '↕' },
];

export default function MindMapToolbar({
  docId, docName, layout, zoom, searchTerm, mapEntries,
  onSearchChange, onLayoutChange,
  onZoomIn, onZoomOut, onZoomReset,
  onExpandAll, onCollapseAll, onCollapseToDepth,
  onExport, onExportPNG,
  onAutoLayout, onFitView,
  onCreateMap, onRenameMap, onSwitchMap, onDeleteMap,
}: Props) {
  const { colors } = useStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameText, setRenameText] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showDropdown]);

  // Focus rename input
  useEffect(() => {
    if (isRenaming && renameRef.current) { renameRef.current.focus(); renameRef.current.select(); }
  }, [isRenaming]);

  const startRename = () => { setRenameText(docName); setIsRenaming(true); setShowDropdown(false); };
  const confirmRename = () => {
    if (renameText.trim() && renameText.trim() !== docName) onRenameMap(renameText.trim());
    setIsRenaming(false);
  };

  const handleCreate = () => {
    const name = prompt('Mind map name:');
    if (name?.trim()) { onCreateMap(name.trim()); setShowDropdown(false); }
  };

  const handleDelete = (id: string, name: string) => {
    if (mapEntries.length <= 1) return;
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      onDeleteMap(id);
      setShowDropdown(false);
    }
  };

  const btn = (active: boolean): React.CSSProperties => ({
    background: active ? colors.surfaceHover : 'transparent',
    border: `1px solid ${colors.border}`, borderRadius: 5,
    color: active ? colors.text : colors.textMuted,
    padding: '3px 10px', fontSize: 11, cursor: 'pointer',
    fontFamily: "'IBM Plex Sans',sans-serif",
    display: 'flex', alignItems: 'center', gap: 4,
  });

  const iconBtn: React.CSSProperties = {
    background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 4,
    color: colors.textSecondary, width: 28, height: 28, cursor: 'pointer', fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 48,
      background: colors.surfaceOverlay, borderBottom: `1px solid ${colors.borderSubtle}`,
      display: 'flex', alignItems: 'center', padding: '0 16px',
      zIndex: 10, gap: 10, backdropFilter: 'blur(8px)',
    }}>
      {/* Map selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, position: 'relative' }} ref={dropRef}>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, flexShrink: 0,
        }}>🧠</div>

        {isRenaming ? (
          <input ref={renameRef} value={renameText}
            onChange={e => setRenameText(e.target.value)}
            onBlur={confirmRename}
            onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setIsRenaming(false); }}
            style={{
              background: colors.surface, border: `1px solid ${colors.primary}`, borderRadius: 4,
              color: colors.text, padding: '2px 8px', fontSize: 13, fontWeight: 600, width: 160,
              outline: 'none', fontFamily: "'IBM Plex Sans',sans-serif",
            }} />
        ) : (
          <button onClick={() => setShowDropdown(!showDropdown)}
            onDoubleClick={startRename}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: colors.text, fontSize: 13, fontWeight: 600,
              fontFamily: "'IBM Plex Sans',sans-serif",
              display: 'flex', alignItems: 'center', gap: 4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: 180, padding: '2px 4px', borderRadius: 4,
            }}
            title="Click to switch maps, double-click to rename"
          >
            {docName}
            <span style={{ fontSize: 9, color: colors.textMuted, marginLeft: 2 }}>▼</span>
          </button>
        )}

        {/* Dropdown */}
        {showDropdown && (
          <div style={{
            position: 'absolute', top: 38, left: 0, minWidth: 240,
            background: colors.surface, border: `1px solid ${colors.border}`,
            borderRadius: 8, padding: '4px 0', zIndex: 20,
            boxShadow: colors.shadowStrong,
          }}>
            {mapEntries.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', cursor: 'pointer',
                background: m.id === docId ? colors.primarySubtle : 'transparent',
              }}
                onMouseEnter={e => { if (m.id !== docId) e.currentTarget.style.background = colors.surfaceHover; }}
                onMouseLeave={e => { if (m.id !== docId) e.currentTarget.style.background = 'transparent'; }}
              >
                <span onClick={() => { onSwitchMap(m.id); setShowDropdown(false); }}
                  style={{
                    flex: 1, fontSize: 12, color: colors.text,
                    fontWeight: m.id === docId ? 600 : 400,
                    fontFamily: "'IBM Plex Sans',sans-serif",
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                  {m.id === docId && <span style={{ color: colors.primary, marginRight: 4 }}>●</span>}
                  {m.name}
                </span>
                {mapEntries.length > 1 && (
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(m.id, m.name); }}
                    style={{
                      background: 'none', border: 'none', color: colors.textMuted,
                      cursor: 'pointer', fontSize: 11, padding: '2px 4px', borderRadius: 3,
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={e => (e.currentTarget.style.color = colors.textMuted)}
                    title={`Delete "${m.name}"`}>✕</button>
                )}
              </div>
            ))}
            {/* Divider + New */}
            <div style={{ height: 1, background: colors.border, margin: '4px 0' }} />
            <button onClick={handleCreate}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                background: 'none', border: 'none', padding: '6px 12px',
                color: colors.primary, fontSize: 12, cursor: 'pointer',
                fontFamily: "'IBM Plex Sans',sans-serif",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = colors.surfaceHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              ➕ New Mind Map
            </button>
          </div>
        )}
      </div>

      <div style={{ width: 1, height: 24, background: colors.border }} />

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <input type="text" placeholder="🔍 Search..."
          value={searchTerm} onChange={e => onSearchChange(e.target.value)}
          style={{
            background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6,
            color: colors.text, padding: '5px 10px', fontSize: 12, width: 180,
            outline: 'none', fontFamily: "'IBM Plex Sans',sans-serif",
          }} />
        {searchTerm && (
          <button onClick={() => onSearchChange('')}
            style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer',
              fontSize: 12, padding: '0 4px' }}>✕</button>
        )}
      </div>

      <div style={{ width: 1, height: 24, background: colors.border }} />

      {/* Layout */}
      <div style={{ display: 'flex', gap: 3 }}>
        {LAYOUTS.map(l => (
          <button key={l.id} onClick={() => onLayoutChange(l.id)}
            style={btn(layout === l.id)} title={l.label}>
            <span style={{ fontSize: 12 }}>{l.icon}</span> {l.label}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 24, background: colors.border }} />

      {/* Collapse controls */}
      <div style={{ display: 'flex', gap: 3 }}>
        <button onClick={onExpandAll} style={btn(false)} title="Expand All">⊞</button>
        <button onClick={onCollapseAll} style={btn(false)} title="Collapse All">⊟</button>
        {[1, 2, 3].map(d => (
          <button key={d} onClick={() => onCollapseToDepth(d)}
            style={btn(false)} title={`Depth ${d}`}>L{d}</button>
        ))}
      </div>

      <div style={{ width: 1, height: 24, background: colors.border }} />

      {/* Layout actions */}
      <div style={{ display: 'flex', gap: 3 }}>
        <button onClick={onAutoLayout} style={btn(false)} title="Auto Layout (A)">⟳ Auto</button>
        <button onClick={onFitView} style={btn(false)} title="Fit to View (F)">⊡ Fit</button>
      </div>

      <div style={{ flex: 1 }} />

      {/* Export */}
      <div style={{ display: 'flex', gap: 3 }}>
        <button onClick={onExport} style={btn(false)} title="Export SVG">📥 SVG</button>
        <button onClick={onExportPNG} style={btn(false)} title="Export PNG">🖼️ PNG</button>
      </div>

      <div style={{ width: 1, height: 24, background: colors.border }} />

      {/* Zoom */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={onZoomOut} style={iconBtn}>−</button>
        <span onClick={onZoomReset} style={{
          color: colors.textSecondary, fontSize: 11, width: 42, textAlign: 'center',
          fontFamily: "'IBM Plex Mono',monospace", cursor: 'pointer',
        }} title="Reset zoom">{Math.round(zoom * 100)}%</span>
        <button onClick={onZoomIn} style={iconBtn}>+</button>
      </div>
    </div>
  );
}
