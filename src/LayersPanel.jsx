/**
 * LayersPanel — Lager-hantering för whiteboard.
 *
 * Visar alla lager med:
 * - Synlighet (öga)
 * - Lås (hänglås)
 * - Aktiv markering
 * - Byta namn
 * - Skapa / ta bort lager
 * - Dra-omordning (upp/ned-knappar)
 * - Visa antal element per lager
 */

import React, { useState, useCallback } from 'react';
import useWhiteboardStore from '../../stores/whiteboardStore';

export default function LayersPanel() {
  const showLayersPanel = useWhiteboardStore((s) => s.showLayersPanel);
  const layers = useWhiteboardStore((s) => s.layers);
  const activeLayerId = useWhiteboardStore((s) => s.activeLayerId);
  const elements = useWhiteboardStore((s) => s.elements);
  const elementOrder = useWhiteboardStore((s) => s.elementOrder);
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const store = useWhiteboardStore;

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const getElementCount = useCallback((layerId) => {
    return elementOrder.filter((id) => {
      const el = elements[id];
      return el && (el.layerId || 'default') === layerId;
    }).length;
  }, [elements, elementOrder]);

  if (!showLayersPanel) return null;

  const handleAdd = () => {
    store.getState().addLayer();
  };

  const handleRemove = (layerId) => {
    if (layerId === 'default') return;
    const count = getElementCount(layerId);
    if (count > 0 && !window.confirm(`Lagret innehåller ${count} element som flyttas till Standard. Fortsätt?`)) return;
    store.getState().removeLayer(layerId);
  };

  const handleRename = (layerId) => {
    const layer = layers.find((l) => l.id === layerId);
    setEditingId(layerId);
    setEditName(layer?.name || '');
  };

  const handleRenameConfirm = () => {
    if (editingId && editName.trim()) {
      store.getState().updateLayer(editingId, { name: editName.trim() });
    }
    setEditingId(null);
    setEditName('');
  };

  const handleMoveSelected = (layerId) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    store.getState().moveElementsToLayer(ids, layerId);
  };

  const handleMoveLayer = (index, dir) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= layers.length) return;
    store.getState().reorderLayers(index, newIndex);
  };

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>📑 Lager</span>
        <button onClick={() => store.getState().setShowLayersPanel(false)} style={styles.closeBtn}>✕</button>
      </div>

      {/* Layer list */}
      <div style={styles.list}>
        {layers.map((layer, index) => {
          const isActive = layer.id === activeLayerId;
          const count = getElementCount(layer.id);

          return (
            <div
              key={layer.id}
              style={{
                ...styles.layerRow,
                background: isActive ? '#ede9fe' : 'transparent',
                borderLeft: `3px solid ${layer.color}`,
              }}
              onClick={() => store.getState().setActiveLayerId(layer.id)}
            >
              {/* Visibility */}
              <button
                onClick={(e) => { e.stopPropagation(); store.getState().updateLayer(layer.id, { visible: !layer.visible }); }}
                style={{ ...styles.iconBtn, opacity: layer.visible ? 1 : 0.3 }}
                title={layer.visible ? 'Dölj lager' : 'Visa lager'}
              >👁</button>

              {/* Lock */}
              <button
                onClick={(e) => { e.stopPropagation(); store.getState().updateLayer(layer.id, { locked: !layer.locked }); }}
                style={{ ...styles.iconBtn, opacity: layer.locked ? 1 : 0.3 }}
                title={layer.locked ? 'Lås upp lager' : 'Lås lager'}
              >{layer.locked ? '🔒' : '🔓'}</button>

              {/* Name */}
              <div style={styles.nameArea}>
                {editingId === layer.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleRenameConfirm}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                    style={styles.nameInput}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => { e.stopPropagation(); handleRename(layer.id); }}
                    style={{ ...styles.nameText, fontWeight: isActive ? 600 : 400 }}
                    title="Dubbelklicka för att byta namn"
                  >
                    {layer.name}
                  </span>
                )}
                <span style={styles.count}>{count}</span>
              </div>

              {/* Move up/down */}
              <button onClick={(e) => { e.stopPropagation(); handleMoveLayer(index, -1); }} style={styles.iconBtn} disabled={index === 0} title="Flytta upp">▲</button>
              <button onClick={(e) => { e.stopPropagation(); handleMoveLayer(index, 1); }} style={styles.iconBtn} disabled={index === layers.length - 1} title="Flytta ned">▼</button>

              {/* Move selected elements here */}
              {selectedIds.size > 0 && !isActive && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveSelected(layer.id); }}
                  style={styles.moveBtn}
                  title={`Flytta ${selectedIds.size} markerade hit`}
                >⬇ {selectedIds.size}</button>
              )}

              {/* Delete */}
              {layer.id !== 'default' && (
                <button onClick={(e) => { e.stopPropagation(); handleRemove(layer.id); }} style={styles.deleteBtn} title="Ta bort lager">🗑</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add button */}
      <button onClick={handleAdd} style={styles.addBtn}>+ Nytt lager</button>
    </div>
  );
}

const styles = {
  panel: {
    position: 'absolute', top: 8, left: 8, width: 260,
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
  list: { flex: 1, overflowY: 'auto', padding: '4px 0' },
  layerRow: {
    display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px',
    cursor: 'pointer', transition: 'background 0.15s',
    borderBottom: '1px solid #f3f4f6',
  },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
    width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 4, padding: 0, flexShrink: 0,
  },
  nameArea: { flex: 1, display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 },
  nameText: { fontSize: 12, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  nameInput: {
    fontSize: 12, border: '1px solid #6366f1', borderRadius: 3, padding: '2px 4px',
    outline: 'none', width: '100%',
  },
  count: { fontSize: 10, color: '#9ca3af', flexShrink: 0, background: '#f3f4f6', borderRadius: 8, padding: '1px 5px' },
  moveBtn: {
    background: '#ede9fe', border: 'none', cursor: 'pointer', fontSize: 10,
    borderRadius: 4, padding: '2px 5px', color: '#6366f1', fontWeight: 600, flexShrink: 0,
  },
  deleteBtn: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 11,
    width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 4, flexShrink: 0,
  },
  addBtn: {
    margin: 8, padding: '8px 12px', background: '#6366f1', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12,
  },
};
