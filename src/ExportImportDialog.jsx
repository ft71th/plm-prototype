/**
 * ExportImportDialog — Modal dialog for exporting and importing whiteboard content.
 *
 * Export formats: PNG, SVG, JSON
 * Import formats: JSON
 */

import React, { useState, useRef, useCallback } from 'react';
import useWhiteboardStore from '../../stores/whiteboardStore';
import { getCombinedBoundingBox } from '../../utils/geometry';
import { renderShape } from './renderers/ShapeRenderer';
import { renderText } from './renderers/TextRenderer';

export default function ExportImportDialog({ canvasRef }) {
  const showExportDialog = useWhiteboardStore((s) => s.showExportDialog);
  const setShowExportDialog = useWhiteboardStore((s) => s.setShowExportDialog);
  const exportToJSON = useWhiteboardStore((s) => s.exportToJSON);
  const importFromJSON = useWhiteboardStore((s) => s.importFromJSON);
  const clearCanvas = useWhiteboardStore((s) => s.clearCanvas);
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);

  const [activeTab, setActiveTab] = useState('export');
  const [exportFormat, setExportFormat] = useState('png');
  const [exportScope, setExportScope] = useState('all'); // 'all' | 'selected'
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const hasSelection = selectedIds && selectedIds.size > 0;

  const handleClose = () => {
    setShowExportDialog(false);
    setImportError(null);
    setImportSuccess(false);
  };

  // ─── Get elements to export based on scope ────────────
  const getExportElements = useCallback(() => {
    const state = useWhiteboardStore.getState();
    if (exportScope === 'selected' && state.selectedIds.size > 0) {
      return state.elementOrder
        .filter((id) => state.selectedIds.has(id))
        .map((id) => state.elements[id])
        .filter(Boolean);
    }
    return state.elementOrder.map((id) => state.elements[id]).filter(Boolean);
  }, [exportScope]);

  const getExportElementOrder = useCallback(() => {
    const state = useWhiteboardStore.getState();
    if (exportScope === 'selected' && state.selectedIds.size > 0) {
      return state.elementOrder.filter((id) => state.selectedIds.has(id));
    }
    return state.elementOrder;
  }, [exportScope]);

  // ─── Export PNG ─────────────────────────────────────────
  const handleExportPNG = useCallback(() => {

    const state = useWhiteboardStore.getState();
    
    const exportEls = getExportElements();
    const exportOrder = getExportElementOrder();
    const bb = getCombinedBoundingBox(exportEls);

    if (!bb) return;

    const padding = 40;
    const exportWidth = bb.width + padding * 2;
    const exportHeight = bb.height + padding * 2;
    const scale = 2; // 2x for retina quality

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = exportWidth * scale;
    tempCanvas.height = exportHeight * scale;
    const ctx = tempCanvas.getContext('2d');
    ctx.scale(scale, scale);

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    // Translate so elements start at padding
    ctx.translate(padding - bb.x, padding - bb.y);

    // Render elements based on export scope
    for (const id of exportOrder) {
      const el = state.elements[id];
      if (!el || !el.visible) continue;

      if (el.type === 'shape') {
        renderShape(ctx, el);
      } else if (el.type === 'text') {
        renderText(ctx, el);
      } else if (el.type === 'line') {
        // Simple line rendering
        ctx.save();
        ctx.strokeStyle = el.stroke || '#000';
        ctx.lineWidth = el.strokeWidth || 2;
        if (el.lineStyle === 'dashed') ctx.setLineDash([10, 6]);
        else if (el.lineStyle === 'dotted') ctx.setLineDash([3, 4]);
        else ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x2, el.y2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow head
        if (el.arrowHead === 'arrow') {
          const angle = Math.atan2(el.y2 - el.y, el.x2 - el.x);
          const size = 10;
          ctx.fillStyle = el.stroke || '#000';
          ctx.beginPath();
          ctx.moveTo(el.x2, el.y2);
          ctx.lineTo(el.x2 - size * Math.cos(angle - 0.4), el.y2 - size * Math.sin(angle - 0.4));
          ctx.lineTo(el.x2 - size * Math.cos(angle + 0.4), el.y2 - size * Math.sin(angle + 0.4));
          ctx.closePath();
          ctx.fill();
        }

        // Label
        if (el.label && el.label.text) {
          const lx = (el.x + el.x2) / 2;
          const ly = (el.y + el.y2) / 2;
          ctx.font = `${el.label.fontSize || 12}px ${el.label.fontFamily || 'sans-serif'}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const metrics = ctx.measureText(el.label.text);
          ctx.fillStyle = el.label.background || 'rgba(255,255,255,0.9)';
          ctx.fillRect(lx - metrics.width / 2 - 4, ly - 8, metrics.width + 8, 16);
          ctx.fillStyle = el.label.color || '#333';
          ctx.fillText(el.label.text, lx, ly);
        }

        ctx.restore();
      }
    }

    // Trigger download
    tempCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whiteboard-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');

    handleClose();
  }, [getExportElements, getExportElementOrder]);

  // ─── Export SVG ─────────────────────────────────────────
  const handleExportSVG = useCallback(() => {
    const state = useWhiteboardStore.getState();
    
    const exportEls = getExportElements();
    const exportOrder = getExportElementOrder();
    const bb = getCombinedBoundingBox(exportEls);

    if (!bb) return;

    const padding = 40;
    const w = bb.width + padding * 2;
    const h = bb.height + padding * 2;
    const ox = bb.x - padding;
    const oy = bb.y - padding;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${ox} ${oy} ${w} ${h}">\n`;
    svg += `  <rect x="${ox}" y="${oy}" width="${w}" height="${h}" fill="white"/>\n`;

    for (const id of exportOrder) {
      const el = state.elements[id];
      if (!el || !el.visible) continue;

      if (el.type === 'shape') {
        const fill = el.fill || 'white';
        const stroke = el.stroke || '#000';
        const sw = el.strokeWidth || 2;
        const opacity = el.fillOpacity ?? 1;

        switch (el.shapeVariant) {
          case 'ellipse':
            svg += `  <ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" rx="${el.width / 2}" ry="${el.height / 2}" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="${sw}"/>\n`;
            break;
          case 'rounded-rectangle':
            svg += `  <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.cornerRadius || 8}" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="${sw}"/>\n`;
            break;
          default:
            svg += `  <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="${sw}"/>\n`;
        }

        // Text inside shape
        if (el.text && el.text.text) {
          const tx = el.x + el.width / 2;
          const ty = el.y + el.height / 2;
          svg += `  <text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central" font-size="${el.text.fontSize || 14}" font-family="${el.text.fontFamily || 'sans-serif'}" fill="${el.text.color || '#000'}" font-weight="${el.text.fontWeight || 'normal'}">${escapeXml(el.text.text)}</text>\n`;
        }

      } else if (el.type === 'text' && el.content) {
        const tx = el.x + el.width / 2;
        const ty = el.y + el.height / 2;
        svg += `  <text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central" font-size="${el.content.fontSize || 14}" font-family="${el.content.fontFamily || 'sans-serif'}" fill="${el.content.color || '#000'}" font-weight="${el.content.fontWeight || 'normal'}">${escapeXml(el.content.text)}</text>\n`;

      } else if (el.type === 'line') {
        const dashArray = el.lineStyle === 'dashed' ? ' stroke-dasharray="10 6"' : el.lineStyle === 'dotted' ? ' stroke-dasharray="3 4"' : '';
        const marker = el.arrowHead === 'arrow' ? ' marker-end="url(#arrowhead)"' : '';
        svg += `  <line x1="${el.x}" y1="${el.y}" x2="${el.x2}" y2="${el.y2}" stroke="${el.stroke || '#000'}" stroke-width="${el.strokeWidth || 2}"${dashArray}${marker}/>\n`;

        if (el.label && el.label.text) {
          const lx = (el.x + el.x2) / 2;
          const ly = (el.y + el.y2) / 2;
          svg += `  <text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-size="${el.label.fontSize || 12}" fill="${el.label.color || '#333'}">${escapeXml(el.label.text)}</text>\n`;
        }
      }
    }

    // Add arrowhead marker definition
    svg = svg.replace('<rect x=', `  <defs>\n    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">\n      <polygon points="0 0, 10 3.5, 0 7" fill="#000"/>\n    </marker>\n  </defs>\n  <rect x=`);

    svg += `</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);

    handleClose();
  }, [getExportElements, getExportElementOrder]);

  // ─── Export JSON ────────────────────────────────────────
  const handleExportJSON = useCallback(() => {
    const json = exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    handleClose();
  }, [exportToJSON]);

  // ─── Import JSON ────────────────────────────────────────
  const handleImportFile = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = importFromJSON(evt.target.result);
      if (result.success) {
        setImportSuccess(true);
        setImportError(null);
        setTimeout(() => handleClose(), 1000);
      } else {
        setImportError(result.error);
        setImportSuccess(false);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  }, [importFromJSON]);

  const handleExport = () => {
    switch (exportFormat) {
      case 'png': handleExportPNG(); break;
      case 'svg': handleExportSVG(); break;
      case 'json': handleExportJSON(); break;
    }
  };

  if (!showExportDialog) return null;

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Exportera / Importera</h3>
          <button onClick={handleClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('export')}
            style={{ ...styles.tab, ...(activeTab === 'export' ? styles.activeTab : {}) }}
          >
            📤 Exportera
          </button>
          <button
            onClick={() => setActiveTab('import')}
            style={{ ...styles.tab, ...(activeTab === 'import' ? styles.activeTab : {}) }}
          >
            📥 Importera
          </button>
        </div>

        <div style={styles.body}>
          {activeTab === 'export' ? (
            <>
              {/* Scope selector: All vs Selected */}
              {(exportFormat === 'png' || exportFormat === 'svg') && (
                <div style={styles.scopeGroup}>
                  <span style={styles.scopeLabel}>Omfång:</span>
                  <label style={{ ...styles.scopeOption, ...(exportScope === 'all' ? styles.scopeActive : {}) }}>
                    <input
                      type="radio"
                      name="scope"
                      value="all"
                      checked={exportScope === 'all'}
                      onChange={() => setExportScope('all')}
                      style={{ display: 'none' }}
                    />
                    🌐 Allt
                  </label>
                  <label style={{
                    ...styles.scopeOption,
                    ...(exportScope === 'selected' ? styles.scopeActive : {}),
                    ...(hasSelection ? {} : styles.scopeDisabled),
                  }}>
                    <input
                      type="radio"
                      name="scope"
                      value="selected"
                      checked={exportScope === 'selected'}
                      onChange={() => hasSelection && setExportScope('selected')}
                      disabled={!hasSelection}
                      style={{ display: 'none' }}
                    />
                    ✅ Markerade ({hasSelection ? selectedIds.size : 0})
                  </label>
                </div>
              )}

              <div style={styles.formatGroup}>
                {[
                  { id: 'png', label: 'PNG (Bild)', desc: 'Bäst för delning och presentationer', icon: '🖼️' },
                  { id: 'svg', label: 'SVG (Vektor)', desc: 'Skalbar, redigerbar i andra verktyg', icon: '📐' },
                  { id: 'json', label: 'JSON (Data)', desc: 'För import/backup av whiteboard-data', icon: '📄' },
                ].map((fmt) => (
                  <label key={fmt.id} style={{ ...styles.formatOption, ...(exportFormat === fmt.id ? styles.formatActive : {}) }}>
                    <input
                      type="radio"
                      name="format"
                      value={fmt.id}
                      checked={exportFormat === fmt.id}
                      onChange={() => setExportFormat(fmt.id)}
                      style={{ display: 'none' }}
                    />
                    <span style={styles.formatIcon}>{fmt.icon}</span>
                    <div>
                      <div style={styles.formatLabel}>{fmt.label}</div>
                      <div style={styles.formatDesc}>{fmt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <button onClick={handleExport} style={styles.exportBtn}>
                Exportera som {exportFormat.toUpperCase()}
              </button>
            </>
          ) : (
            <>
              <div style={styles.importInfo}>
                Importera en JSON-fil som exporterats från whiteboard.
                Befintligt innehåll ersätts.
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                style={{ display: 'none' }}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                style={styles.importBtn}
              >
                📁 Välj JSON-fil...
              </button>

              {importError && (
                <div style={styles.errorMsg}>❌ Fel: {importError}</div>
              )}
              {importSuccess && (
                <div style={styles.successMsg}>✅ Import lyckades!</div>
              )}

              <div style={styles.divider} />

              <button onClick={clearCanvas} style={styles.clearBtn}>
                🗑️ Rensa canvas
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    background: '#fff',
    borderRadius: '12px',
    width: '420px',
    maxWidth: '90vw',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #eee',
  },
  title: { margin: 0, fontSize: '16px', fontWeight: 600 },
  closeBtn: {
    background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888',
    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #eee',
  },
  tab: {
    flex: 1, padding: '10px 16px', border: 'none', background: 'transparent',
    cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#666',
    borderBottom: '2px solid transparent', transition: 'all 0.15s',
  },
  activeTab: {
    color: '#2196f3', borderBottomColor: '#2196f3', background: '#f8fbff',
  },
  body: { padding: '16px 20px' },
  formatGroup: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  scopeGroup: {
    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px',
    padding: '8px 0', borderBottom: '1px solid #f0f0f0',
  },
  scopeLabel: { fontSize: '12px', fontWeight: 600, color: '#555', marginRight: '4px' },
  scopeOption: {
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '6px 12px', borderRadius: '6px', border: '1.5px solid #e0e0e0',
    cursor: 'pointer', fontSize: '12px', fontWeight: 500, color: '#555',
    transition: 'all 0.15s',
  },
  scopeActive: {
    borderColor: '#2196f3', background: '#f0f7ff', color: '#1976d2', fontWeight: 600,
  },
  scopeDisabled: {
    opacity: 0.4, cursor: 'not-allowed',
  },
  formatOption: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 14px', borderRadius: '8px', border: '2px solid #e0e0e0',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  formatActive: {
    borderColor: '#2196f3', background: '#f8fbff',
  },
  formatIcon: { fontSize: '24px' },
  formatLabel: { fontSize: '13px', fontWeight: 600 },
  formatDesc: { fontSize: '11px', color: '#888', marginTop: '2px' },
  exportBtn: {
    width: '100%', padding: '10px 16px', background: '#2196f3', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
    cursor: 'pointer',
  },
  importInfo: {
    fontSize: '13px', color: '#666', marginBottom: '12px', lineHeight: 1.5,
  },
  importBtn: {
    width: '100%', padding: '10px 16px', background: '#f5f5f5',
    border: '2px dashed #ccc', borderRadius: '8px', fontSize: '14px',
    cursor: 'pointer', marginBottom: '12px',
  },
  errorMsg: {
    padding: '8px 12px', background: '#ffebee', borderRadius: '6px',
    color: '#c62828', fontSize: '12px', marginBottom: '12px',
  },
  successMsg: {
    padding: '8px 12px', background: '#e8f5e9', borderRadius: '6px',
    color: '#2e7d32', fontSize: '12px', marginBottom: '12px',
  },
  divider: {
    borderTop: '1px solid #eee', margin: '12px 0',
  },
  clearBtn: {
    width: '100%', padding: '8px 16px', background: 'transparent',
    border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px',
    cursor: 'pointer', color: '#888',
  },
};
