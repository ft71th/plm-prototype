/**
 * WhiteboardToolbar — Tool selection bar for the whiteboard.
 *
 * Deliverable 4: Added new shapes, export/import, template buttons
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
  { id: 'cylinder', label: 'Cylinder', icon: '⊙' },
  { id: 'cloud', label: 'Moln', icon: '☁' },
  { id: 'star', label: 'Stjärna', icon: '★' },
  { id: 'parallelogram', label: 'Parallellogram', icon: '▱' },
];

export default function WhiteboardToolbar({ className = '' }) {
  const activeTool = useWhiteboardStore((s) => s.activeTool);
  const activeShapeVariant = useWhiteboardStore((s) => s.activeShapeVariant);
  const gridEnabled = useWhiteboardStore((s) => s.gridEnabled);
  const snapToGrid = useWhiteboardStore((s) => s.snapToGrid);
  const showAlignmentGuides = useWhiteboardStore((s) => s.showAlignmentGuides);
  const gridSize = useWhiteboardStore((s) => s.gridSize);

  const setActiveTool = useWhiteboardStore((s) => s.setActiveTool);
  const setActiveShapeVariant = useWhiteboardStore((s) => s.setActiveShapeVariant);
  const setGridEnabled = useWhiteboardStore((s) => s.setGridEnabled);
  const setSnapToGrid = useWhiteboardStore((s) => s.setSnapToGrid);
  const setShowAlignmentGuides = useWhiteboardStore((s) => s.setShowAlignmentGuides);
  const setGridSize = useWhiteboardStore((s) => s.setGridSize);

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
          onClick={() => setActiveTool('shape')}
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
          <div style={{ ...styles.dropdownMenu, minWidth: '200px' }}>
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

      {/* ─── Line Tool (with dropdown) ─── */}
      <LineToolSection />

      <div style={styles.separator} />

      {/* ─── Action Buttons ─── */}
      <ActionButtons />

      <div style={styles.separator} />

      {/* ─── Export / Import / Template ─── */}
      <FileButtons />

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
              <input type="checkbox" checked={gridEnabled} onChange={(e) => setGridEnabled(e.target.checked)} />
              Visa rutnät
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
              Snappa till rutnät
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" checked={showAlignmentGuides} onChange={(e) => setShowAlignmentGuides(e.target.checked)} />
              Visa justeringslinjer
            </label>
            <div style={{ padding: '8px 12px', borderTop: '1px solid #eee' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Rutstorlek: {gridSize}px</div>
              <input
                type="range"
                min={5}
                max={50}
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const LINE_STYLES = [
  { id: 'solid', label: 'Solid', icon: '━' },
  { id: 'dashed', label: 'Streckad', icon: '╌' },
  { id: 'dotted', label: 'Prickad', icon: '┈' },
];

const ARROW_HEADS = [
  { id: 'none', label: 'Ingen', icon: '━━' },
  { id: 'arrow', label: 'Pil', icon: '━▶' },
  { id: 'open-arrow', label: 'Öppen pil', icon: '━>' },
  { id: 'diamond', label: 'Diamant', icon: '━◇' },
  { id: 'circle', label: 'Cirkel', icon: '━●' },
];

function FileButtons() {
  const setShowExportDialog = useWhiteboardStore((s) => s.setShowExportDialog);
  const setShowTemplateDialog = useWhiteboardStore((s) => s.setShowTemplateDialog);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
      <ToolButton onClick={() => setShowExportDialog(true)} title="Exportera / Importera">
        <span style={{ ...styles.icon, fontSize: '15px' }}>💾</span>
      </ToolButton>
      <ToolButton onClick={() => setShowTemplateDialog(true)} title="Mallar">
        <span style={{ ...styles.icon, fontSize: '15px' }}>📋</span>
      </ToolButton>
    </div>
  );
}

function ActionButtons() {
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const undo = useWhiteboardStore((s) => s.undo);
  const redo = useWhiteboardStore((s) => s.redo);
  const copyElements = useWhiteboardStore((s) => s.copyElements);
  const pasteElements = useWhiteboardStore((s) => s.pasteElements);
  const duplicateElements = useWhiteboardStore((s) => s.duplicateElements);
  const groupElements = useWhiteboardStore((s) => s.groupElements);
  const ungroupElements = useWhiteboardStore((s) => s.ungroupElements);
  const bringToFront = useWhiteboardStore((s) => s.bringToFront);
  const sendToBack = useWhiteboardStore((s) => s.sendToBack);
  const clipboard = useWhiteboardStore((s) => s.clipboard);
  const elements = useWhiteboardStore((s) => s.elements);

  const hasSelection = selectedIds.size > 0;
  const hasMultiSelection = selectedIds.size > 1;
  const hasClipboard = clipboard.length > 0;
  const hasGroup = [...selectedIds].some((id) => elements[id]?.type === 'group');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
      <ToolButton onClick={undo} title="Ångra (Ctrl+Z)">
        <span style={styles.icon}>↩</span>
      </ToolButton>
      <ToolButton onClick={redo} title="Gör om (Ctrl+Shift+Z)">
        <span style={styles.icon}>↪</span>
      </ToolButton>

      <div style={styles.separator} />

      <ToolButton onClick={copyElements} title="Kopiera (Ctrl+C)" disabled={!hasSelection}>
        <span style={styles.icon}>📋</span>
      </ToolButton>
      <ToolButton onClick={pasteElements} title="Klistra in (Ctrl+V)" disabled={!hasClipboard}>
        <span style={styles.icon}>📄</span>
      </ToolButton>
      <ToolButton onClick={duplicateElements} title="Duplicera (Ctrl+D)" disabled={!hasSelection}>
        <span style={styles.icon}>⧉</span>
      </ToolButton>

      <div style={styles.separator} />

      <ToolButton onClick={groupElements} title="Gruppera (Ctrl+G)" disabled={!hasMultiSelection}>
        <span style={{ ...styles.icon, fontSize: '14px' }}>⊞</span>
      </ToolButton>
      <ToolButton onClick={ungroupElements} title="Avgruppera (Ctrl+Shift+G)" disabled={!hasGroup}>
        <span style={{ ...styles.icon, fontSize: '14px' }}>⊟</span>
      </ToolButton>

      <div style={styles.separator} />

      <ToolButton onClick={bringToFront} title="Längst fram (Ctrl+])" disabled={!hasSelection}>
        <span style={{ ...styles.icon, fontSize: '13px' }}>⬆</span>
      </ToolButton>
      <ToolButton onClick={sendToBack} title="Längst bak (Ctrl+[)" disabled={!hasSelection}>
        <span style={{ ...styles.icon, fontSize: '13px' }}>⬇</span>
      </ToolButton>
    </div>
  );
}

function LineToolSection() {
  const activeTool = useWhiteboardStore((s) => s.activeTool);
  const activeLineStyle = useWhiteboardStore((s) => s.activeLineStyle);
  const activeArrowHead = useWhiteboardStore((s) => s.activeArrowHead);
  const setActiveTool = useWhiteboardStore((s) => s.setActiveTool);
  const setActiveLineStyle = useWhiteboardStore((s) => s.setActiveLineStyle);
  const setActiveArrowHead = useWhiteboardStore((s) => s.setActiveArrowHead);

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={menuRef} style={styles.dropdownContainer}>
      <ToolButton
        active={activeTool === 'line'}
        onClick={() => setActiveTool('line')}
        title={`Linje (L) — ${LINE_STYLES.find(s => s.id === activeLineStyle)?.label}, ${ARROW_HEADS.find(a => a.id === activeArrowHead)?.label}`}
      >
        <span style={styles.icon}>╱</span>
      </ToolButton>
      <button onClick={() => setShowMenu(!showMenu)} style={styles.dropdownArrow} title="Linjealternativ">▾</button>

      {showMenu && (
        <div style={{ ...styles.dropdownMenu, minWidth: '200px' }}>
          <div style={{ padding: '4px 12px', fontSize: '10px', color: '#999', fontWeight: 'bold', textTransform: 'uppercase' }}>Linjestil</div>
          {LINE_STYLES.map((ls) => (
            <button
              key={ls.id}
              onClick={() => { setActiveLineStyle(ls.id); setActiveTool('line'); }}
              style={{ ...styles.menuItem, background: activeLineStyle === ls.id ? '#e3f2fd' : 'transparent' }}
            >
              <span style={styles.menuIcon}>{ls.icon}</span>
              {ls.label}
            </button>
          ))}
          <div style={{ borderTop: '1px solid #eee', margin: '4px 0' }} />
          <div style={{ padding: '4px 12px', fontSize: '10px', color: '#999', fontWeight: 'bold', textTransform: 'uppercase' }}>Pilhuvud</div>
          {ARROW_HEADS.map((ah) => (
            <button
              key={ah.id}
              onClick={() => { setActiveArrowHead(ah.id); setActiveTool('line'); }}
              style={{ ...styles.menuItem, background: activeArrowHead === ah.id ? '#e3f2fd' : 'transparent' }}
            >
              <span style={styles.menuIcon}>{ah.icon}</span>
              {ah.label}
            </button>
          ))}
        </div>
      )}
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
    display: 'flex', alignItems: 'center', gap: '2px',
    padding: '4px 8px', background: '#ffffff', borderBottom: '1px solid #e0e0e0',
    height: '44px', boxSizing: 'border-box', userSelect: 'none',
  },
  toolButton: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '36px', height: '36px', border: '1.5px solid transparent',
    borderRadius: '6px', background: 'transparent', cursor: 'pointer',
    fontSize: '18px', transition: 'all 0.15s',
  },
  icon: { fontSize: '18px', lineHeight: 1 },
  separator: { width: '1px', height: '24px', background: '#e0e0e0', margin: '0 4px' },
  dropdownContainer: { position: 'relative', display: 'flex', alignItems: 'center' },
  dropdownArrow: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px',
    padding: '2px', color: '#666', marginLeft: '-4px',
  },
  dropdownMenu: {
    position: 'absolute', top: '100%', left: 0, marginTop: '4px',
    background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '4px', zIndex: 100, minWidth: '180px',
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
    padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer',
    fontSize: '13px', textAlign: 'left', background: 'transparent',
  },
  menuIcon: { fontSize: '16px', width: '20px', textAlign: 'center' },
  checkboxItem: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 12px', fontSize: '13px', cursor: 'pointer',
  },
};
