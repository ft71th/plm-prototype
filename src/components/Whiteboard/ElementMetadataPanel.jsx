/**
 * ElementMetadataPanel — Metadata & PLM-länkning för element.
 *
 * Visas i sidopanelen när ett enda element är markerat.
 * Funktioner:
 * - Visa/redigera anpassade nyckel-värde-egenskaper
 * - Länka till PLM-nod (plmNodeId)
 * - Visa lager-tillhörighet
 * - Badge-indikator för länkade element
 */

import React, { useState, useCallback } from 'react';
import useWhiteboardStore from '../../stores/whiteboardStore';

export default function ElementMetadataPanel() {
  const showMetadataPanel = useWhiteboardStore((s) => s.showMetadataPanel);
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const elements = useWhiteboardStore((s) => s.elements);
  const layers = useWhiteboardStore((s) => s.layers);
  const store = useWhiteboardStore;

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const selectedId = selectedIds.size === 1 ? [...selectedIds][0] : null;
  const element = selectedId ? elements[selectedId] : null;

  if (!showMetadataPanel || !element) return null;

  const metadata = element.metadata || {};
  const metaEntries = Object.entries(metadata);
  const layerId = element.layerId || 'default';
  const layer = layers.find((l) => l.id === layerId);

  const handleAddMeta = () => {
    if (!newKey.trim()) return;
    store.getState().setElementMetadata(selectedId, newKey.trim(), newValue);
    setNewKey('');
    setNewValue('');
  };

  const handleRemoveMeta = (key) => {
    store.getState().setElementMetadata(selectedId, key, null);
  };

  const handlePLMLink = (e) => {
    store.getState().setElementPLMLink(selectedId, e.target.value);
  };

  const handleLayerChange = (e) => {
    store.getState().moveElementsToLayer([selectedId], e.target.value);
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>📋 Elementdata</span>
        <button onClick={() => store.getState().setShowMetadataPanel(false)} style={styles.closeBtn}>✕</button>
      </div>

      <div style={styles.content}>
        {/* Element info */}
        <div style={styles.section}>
          <span style={styles.sectionLabel}>Element</span>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>ID</span>
            <span style={styles.infoValue}>{element.id}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Typ</span>
            <span style={styles.infoValue}>{element.type}{element.shapeVariant ? ` (${element.shapeVariant})` : ''}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Position</span>
            <span style={styles.infoValue}>{Math.round(element.x || 0)}, {Math.round(element.y || 0)}</span>
          </div>
          {element.width && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Storlek</span>
              <span style={styles.infoValue}>{Math.round(element.width)} × {Math.round(element.height)}</span>
            </div>
          )}
        </div>

        {/* Layer */}
        <div style={styles.section}>
          <span style={styles.sectionLabel}>Lager</span>
          <select value={layerId} onChange={handleLayerChange} style={styles.select}>
            {layers.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        {/* PLM Link */}
        <div style={styles.section}>
          <span style={styles.sectionLabel}>🔗 PLM-koppling</span>
          <input
            type="text"
            value={element.plmNodeId || ''}
            onChange={handlePLMLink}
            placeholder="PLM nod-ID (t.ex. node_abc123)"
            style={styles.input}
          />
          {element.plmNodeId && (
            <div style={styles.plmBadge}>
              <span>✓ Kopplad till: {element.plmNodeId}</span>
            </div>
          )}
        </div>

        {/* Custom metadata */}
        <div style={styles.section}>
          <span style={styles.sectionLabel}>Egenskaper</span>
          
          {metaEntries.length === 0 && (
            <span style={styles.emptyText}>Inga anpassade egenskaper</span>
          )}

          {metaEntries.map(([key, value]) => (
            <div key={key} style={styles.metaRow}>
              <span style={styles.metaKey}>{key}</span>
              <input
                type="text"
                value={value}
                onChange={(e) => store.getState().setElementMetadata(selectedId, key, e.target.value)}
                style={styles.metaInput}
              />
              <button onClick={() => handleRemoveMeta(key)} style={styles.removeBtn}>✕</button>
            </div>
          ))}

          {/* Add new */}
          <div style={styles.addRow}>
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Nyckel"
              style={{ ...styles.metaInput, flex: 1 }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMeta()}
            />
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Värde"
              style={{ ...styles.metaInput, flex: 1 }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMeta()}
            />
            <button onClick={handleAddMeta} style={styles.addMetaBtn} disabled={!newKey.trim()}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * PLM Badge — Liten indikator som visas på canvas för element
 * som har en PLM-koppling.
 */
export function renderPLMBadge(ctx, element, zoom) {
  if (!element.plmNodeId) return;
  const x = element.x + (element.width || 20) - 6;
  const y = element.y - 6;
  const size = 12 / zoom;

  ctx.save();
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(8 / zoom)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('P', x, y);
  ctx.restore();
}

const styles = {
  panel: {
    position: 'absolute', top: 8, right: 280, width: 260,
    background: '#fff', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    border: '1px solid #e5e7eb', zIndex: 50, display: 'flex', flexDirection: 'column',
    maxHeight: 'calc(100% - 16px)', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 12px', borderBottom: '1px solid #e5e7eb',
  },
  title: { fontWeight: 600, fontSize: 13 },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#666',
    width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 4,
  },
  content: { overflowY: 'auto', padding: '8px 12px' },
  section: { marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12 },
  infoLabel: { color: '#9ca3af' },
  infoValue: { color: '#1f2937', fontFamily: 'monospace', fontSize: 11 },
  select: {
    padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4,
    fontSize: 12, outline: 'none', cursor: 'pointer',
  },
  input: {
    padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4,
    fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  plmBadge: {
    background: '#ede9fe', color: '#6366f1', borderRadius: 4, padding: '4px 8px',
    fontSize: 11, fontWeight: 600,
  },
  emptyText: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic' },
  metaRow: { display: 'flex', alignItems: 'center', gap: 4 },
  metaKey: {
    fontSize: 11, fontWeight: 600, color: '#4b5563', minWidth: 60,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  metaInput: {
    padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: 3,
    fontSize: 11, outline: 'none', flex: 2,
  },
  removeBtn: {
    width: 20, height: 20, background: '#fee2e2', border: 'none', borderRadius: 3,
    cursor: 'pointer', fontSize: 10, color: '#ef4444', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  addRow: { display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 },
  addMetaBtn: {
    width: 24, height: 24, background: '#6366f1', color: '#fff', border: 'none',
    borderRadius: 4, cursor: 'pointer', fontWeight: 700, fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
};
