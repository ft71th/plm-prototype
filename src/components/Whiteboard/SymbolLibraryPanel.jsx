/**
 * SymbolLibraryPanel — Side panel showing symbol libraries.
 *
 * Opens from toolbar button. Tabs to switch between libraries.
 * Displays categorized symbols in a grid.
 * Click a symbol to place it at the center of the canvas.
 * Symbols are rendered as shape elements with shapeVariant = 'symbol-<id>'.
 */

import React, { useRef, useEffect, useState } from 'react';
import useWhiteboardStore from '../../stores/whiteboardStore';
import { LIBRARIES, getLibraryById } from './symbols/SymbolRegistry';

export default function SymbolLibraryPanel() {
  const showSymbolLibrary = useWhiteboardStore((s) => s.showSymbolLibrary);
  const store = useWhiteboardStore;
  const [activeLibrary, setActiveLibrary] = useState(LIBRARIES[0].id);
  const [searchQuery, setSearchQuery] = useState('');

  if (!showSymbolLibrary) return null;

  const lib = getLibraryById(activeLibrary);
  const categories = lib ? lib.getCategories() : [];

  // Filter symbols by search query
  const getFilteredSymbols = (category) => {
    const symbols = lib ? lib.getSymbolsByCategory(category) : [];
    if (!searchQuery.trim()) return symbols;
    const q = searchQuery.toLowerCase();
    return symbols.filter((s) => s.label.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  };

  const hasAnyResults = categories.some((cat) => getFilteredSymbols(cat).length > 0);

  const handlePlaceSymbol = (symbol) => {
    const s = store.getState();
    const canvasWidth = window.innerWidth - 280;
    const canvasHeight = window.innerHeight - 100;
    const worldCenterX = (canvasWidth / 2 - s.panX) / s.zoom;
    const worldCenterY = (canvasHeight / 2 - s.panY) / s.zoom;

    let px = worldCenterX - symbol.width / 2;
    let py = worldCenterY - symbol.height / 2;
    if (s.snapToGrid) {
      px = Math.round(px / s.gridSize) * s.gridSize;
      py = Math.round(py / s.gridSize) * s.gridSize;
    }

    const id = `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const element = {
      type: 'shape',
      id,
      x: px,
      y: py,
      width: symbol.width,
      height: symbol.height,
      fill: '#ffffff',
      fillOpacity: 1,
      stroke: s.defaultStroke || '#000000',
      strokeWidth: 2,
      shapeVariant: `symbol-${symbol.id}`,
      visible: true,
      locked: false,
      layerId: s.activeLayerId || 'default',
      rotation: 0,
      text: {
        text: '', fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 'normal', fontStyle: 'normal', color: '#000000',
        align: 'center', verticalAlign: 'bottom',
      },
    };

    s.addElement(element);
    const newState = store.getState();
    newState.selectElement(id);
    newState.setActiveTool('select');
  };

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>Symbolbibliotek</span>
        <button
          onClick={() => store.setState({ showSymbolLibrary: false })}
          style={styles.closeButton}
          title="Stäng"
        >
          ✕
        </button>
      </div>

      {/* Library Tabs */}
      <div style={styles.tabBar}>
        {LIBRARIES.map((l) => (
          <button
            key={l.id}
            onClick={() => { setActiveLibrary(l.id); setSearchQuery(''); }}
            style={{
              ...styles.tab,
              ...(activeLibrary === l.id ? styles.tabActive : {}),
            }}
            title={l.label}
          >
            <span style={styles.tabIcon}>{l.icon}</span>
            <span style={styles.tabLabel}>{l.label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={styles.searchRow}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Sök symbol..."
          style={styles.searchInput}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={styles.searchClear}>✕</button>
        )}
      </div>

      {/* Symbol Grid */}
      <div style={styles.scrollArea}>
        {!hasAnyResults && searchQuery && (
          <div style={styles.noResults}>Inga symboler matchar "{searchQuery}"</div>
        )}

        {categories.map((cat) => {
          const symbols = getFilteredSymbols(cat);
          if (symbols.length === 0) return null;
          return (
            <CategorySection
              key={cat}
              category={cat}
              symbols={symbols}
              onPlace={handlePlaceSymbol}
            />
          );
        })}
      </div>

      {/* Footer with count */}
      <div style={styles.footer}>
        {lib ? `${lib.symbols.length} symboler` : ''}
      </div>
    </div>
  );
}

function CategorySection({ category, symbols, onPlace }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={styles.categorySection}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={styles.categoryHeader}
      >
        <span style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)', display: 'inline-block', transition: 'transform 0.15s' }}>▾</span>
        <span>{category}</span>
        <span style={styles.categoryCount}>{symbols.length}</span>
      </button>

      {!collapsed && (
        <div style={styles.symbolGrid}>
          {symbols.map((sym) => (
            <SymbolThumbnail key={sym.id} symbol={sym} onPlace={onPlace} />
          ))}
        </div>
      )}
    </div>
  );
}

function SymbolThumbnail({ symbol, onPlace }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cw = 72, ch = 56;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    const pad = 6;
    const availW = cw - pad * 2, availH = ch - pad * 2;
    const scale = Math.min(availW / symbol.width, availH / symbol.height, 1);
    const drawW = symbol.width * scale;
    const drawH = symbol.height * scale;
    const offsetX = pad + (availW - drawW) / 2;
    const offsetY = pad + (availH - drawH) / 2;

    ctx.save();
    symbol.render(ctx, offsetX, offsetY, drawW, drawH, '#334155', '#ffffff');
    ctx.restore();
  }, [symbol]);

  return (
    <button
      onClick={() => onPlace(symbol)}
      style={styles.thumbnailButton}
      title={`Placera ${symbol.label}`}
    >
      <canvas
        ref={canvasRef}
        style={{ width: 72, height: 56, display: 'block' }}
      />
      <span style={styles.thumbnailLabel}>{symbol.label}</span>
    </button>
  );
}

// ─── Styles ─────────────────────────────────────────────
const styles = {
  panel: {
    width: '220px',
    background: '#ffffff',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    fontSize: '13px',
    boxSizing: 'border-box',
    userSelect: 'none',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 20,
    boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: '1px solid #e0e0e0',
    background: '#f8f9fa',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333',
  },
  closeButton: {
    background: '#eee',
    border: '1px solid #ddd',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#666',
    padding: '2px 7px',
    borderRadius: '4px',
    lineHeight: 1,
  },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid #e0e0e0',
    flexShrink: 0,
    overflowX: 'auto',
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1px',
    padding: '6px 4px',
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '9px',
    color: '#888',
    transition: 'all 0.15s',
    minWidth: 0,
  },
  tabActive: {
    color: '#1976d2',
    borderBottomColor: '#1976d2',
    background: '#f0f7ff',
    fontWeight: 600,
  },
  tabIcon: {
    fontSize: '14px',
    lineHeight: 1,
  },
  tabLabel: {
    fontSize: '9px',
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 8px',
    borderBottom: '1px solid #f0f0f0',
    flexShrink: 0,
    position: 'relative',
  },
  searchInput: {
    width: '100%',
    padding: '5px 24px 5px 8px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  searchClear: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '11px',
    color: '#999',
    padding: '0 2px',
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 0',
  },
  noResults: {
    padding: '16px',
    textAlign: 'center',
    color: '#999',
    fontSize: '12px',
    fontStyle: 'italic',
  },
  categorySection: {
    marginBottom: '2px',
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    width: '100%',
    padding: '6px 12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: '#666',
    textAlign: 'left',
  },
  categoryCount: {
    marginLeft: 'auto',
    fontSize: '10px',
    color: '#aaa',
    fontWeight: 400,
  },
  symbolGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '4px',
    padding: '2px 8px 8px',
  },
  thumbnailButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '4px',
    border: '1px solid #eee',
    borderRadius: '6px',
    background: '#fafafa',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  thumbnailLabel: {
    fontSize: '9px',
    color: '#666',
    textAlign: 'center',
    lineHeight: 1.2,
    maxWidth: '72px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  footer: {
    padding: '6px 12px',
    borderTop: '1px solid #f0f0f0',
    fontSize: '10px',
    color: '#aaa',
    textAlign: 'center',
    flexShrink: 0,
  },
};
