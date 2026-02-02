/**
 * WhiteboardToolbar — Tool selection bar for the whiteboard.
 *
 * Shows: Select, Shape (with variant picker), Text tools
 * Deliverable 2 adds: Line tool
 * Deliverable 4 adds: Undo/Redo, Copy/Paste, Group, Z-order
 */

import React, { useState, useRef, useEffect } from 'react';
import useWhiteboardStore from '../../stores/whiteboardStore';

const SHAPE_VARIANTS = [
  { id: 'rectangle', label: 'Rektangel', icon: '▭' },
  { id: 'rounded-rectangle', label: 'Rundad rektangel', icon: '▢' },
  { id: 'ellipse', label: 'Ellips', icon: '⬭' },
  { id: 'diamond', label: 'Romb', icon: '◇' },
  { id: 'triangle', label: 'Triangel', icon: '△' },
  { id: 'hexagon', label: 'Hexagon', icon: '⬡' },
];

export default function WhiteboardToolbar({ className = '' }) {
  const activeTool = useWhiteboardStore((s) => s.activeTool);
  const activeShapeVariant = useWhiteboardStore((s) => s.activeShapeVariant);
  const gridEnabled = useWhiteboardStore((s) => s.gridEnabled);
  const snapToGrid = useWhiteboardStore((s) => s.snapToGrid);
  const showAlignmentGuides = useWhiteboardStore((s) => s.showAlignmentGuides);

  const setActiveTool = useWhiteboardStore((s) => s.setActiveTool);
  const setActiveShapeVariant = useWhiteboardStore((s) => s.setActiveShapeVariant);
  const setGridEnabled = useWhiteboardStore((s) => s.setGridEnabled);
  const setSnapToGrid = useWhiteboardStore((s) => s.setSnapToGrid);
  const setShowAlignmentGuides = useWhiteboardStore((s) => s.setShowAlignmentGuides);

  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showGridMenu, setShowGridMenu] = useState(false);
  const shapeMenuRef = useRef(null);
  const gridMenuRef = useRef(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(e.target)) {
        setShowShapeMenu(false);
      }
      if (gridMenuRef.current && !gridMenuRef.current.contains(e.target)) {
        setShowGridMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleShapeSelect = (variant) => {
    setActiveShapeVariant(variant);
    setActiveTool('shape');
    setShowShapeMenu(false);
  };

  const currentShapeIcon = SHAPE_VARIANTS.find((v) => v.id === activeShapeVariant)?.icon || '▭';

  return (
    <div className={`whiteboard-toolbar ${className}`} style={styles.toolbar}>
      {/* ─── Select Tool ─── */}
      <ToolButton
        active={activeTool === 'select'}
        onClick={() => setActiveTool('select')}
        title="Markera (V)"
      >
        <span style={styles.icon}>↖</span>
      </ToolButton>

      <div style={styles.separator} />

      {/* ─── Shape Tool (with dropdown) ─── */}
      <div ref={shapeMenuRef} style={styles.dropdownContainer}>
        <ToolButton
          active={activeTool === 'shape'}
          onClick={() => {
            setActiveTool('shape');
          }}
          title={`Form: ${SHAPE_VARIANTS.find((v) => v.id === activeShapeVariant)?.label} (R)`}
        >
          <span style={styles.icon}>{currentShapeIcon}</span>
        </ToolButton>
        <button
          onClick={() => setShowShapeMenu(!showShapeMenu)}
          style={styles.dropdownArrow}
          title="Välj formtyp"
        >
          ▾
        </button>

        {showShapeMenu && (
          <div style={styles.dropdownMenu}>
            {SHAPE_VARIANTS.map((variant) => (
              <button
                key={variant.id}
                onClick={() => handleShapeSelect(variant.id)}
                style={{
                  ...styles.menuItem,
                  background: activeShapeVariant === variant.id ? '#e3f2fd' : 'transparent',
                }}
              >
                <span style={styles.menuIcon}>{variant.icon}</span>
                {variant.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={styles.separator} />

      {/* ─── Text Tool ─── */}
      <ToolButton
        active={activeTool === 'text'}
        onClick={() => setActiveTool('text')}
        title="Text (T)"
      >
        <span style={{ ...styles.icon, fontWeight: 'bold', fontFamily: 'serif' }}>T</span>
      </ToolButton>

      <div style={styles.separator} />

      {/* ─── Line Tool (placeholder — Deliverable 2) ─── */}
      <ToolButton
        active={activeTool === 'line'}
        onClick={() => {}}
        title="Linje (kommer i nästa leverans)"
        disabled
      >
        <span style={{ ...styles.icon, opacity: 0.4 }}>╱</span>
      </ToolButton>

      {/* ─── Spacer ─── */}
      <div style={{ flex: 1 }} />

      {/* ─── Grid/Snap controls ─── */}
      <div ref={gridMenuRef} style={styles.dropdownContainer}>
        <ToolButton
          active={gridEnabled}
          onClick={() => setGridEnabled(!gridEnabled)}
          title="Visa rutnät"
        >
          <span style={styles.icon}>⊞</span>
        </ToolButton>
        <button
          onClick={() => setShowGridMenu(!showGridMenu)}
          style={styles.dropdownArrow}
          title="Grid-alternativ"
        >
          ▾
        </button>

        {showGridMenu && (
          <div style={{ ...styles.dropdownMenu, right: 0, left: 'auto' }}>
            <label style={styles.checkboxItem}>
              <input
                type="checkbox"
                checked={gridEnabled}
                onChange={(e) => setGridEnabled(e.target.checked)}
              />
              Visa rutnät
            </label>
            <label style={styles.checkboxItem}>
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
              />
              Snappa till rutnät
            </label>
            <label style={styles.checkboxItem}>
              <input
                type="checkbox"
                checked={showAlignmentGuides}
                onChange={(e) => setShowAlignmentGuides(e.target.checked)}
              />
              Visa justeringslinjer
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reusable tool button ───────────────────────────────

function ToolButton({ active, onClick, title, disabled, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        ...styles.toolButton,
        background: active ? '#e3f2fd' : 'transparent',
        borderColor: active ? '#2196F3' : 'transparent',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '4px 8px',
    background: '#ffffff',
    borderBottom: '1px solid #e0e0e0',
    height: '44px',
    boxSizing: 'border-box',
    userSelect: 'none',
  },
  toolButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    border: '1.5px solid transparent',
    borderRadius: '6px',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'all 0.15s',
  },
  icon: {
    fontSize: '18px',
    lineHeight: 1,
  },
  separator: {
    width: '1px',
    height: '24px',
    background: '#e0e0e0',
    margin: '0 4px',
  },
  dropdownContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  dropdownArrow: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '10px',
    padding: '2px',
    color: '#666',
    marginLeft: '-4px',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    padding: '4px',
    zIndex: 100,
    minWidth: '180px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    textAlign: 'left',
    background: 'transparent',
  },
  menuIcon: {
    fontSize: '16px',
    width: '20px',
    textAlign: 'center',
  },
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    fontSize: '13px',
    cursor: 'pointer',
  },
};
