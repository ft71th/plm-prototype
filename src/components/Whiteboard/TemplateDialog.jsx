/**
 * TemplateDialog — Modal for selecting and inserting predefined templates.
 * Templates are loaded into the existing canvas (additive, not replacing).
 */

import React from 'react';
import useWhiteboardStore from '../../stores/whiteboardStore';
import { TEMPLATES } from '../../stores/whiteboardStore';

export default function TemplateDialog() {
  const showTemplateDialog = useWhiteboardStore((s) => s.showTemplateDialog);
  const setShowTemplateDialog = useWhiteboardStore((s) => s.setShowTemplateDialog);
  const loadTemplate = useWhiteboardStore((s) => s.loadTemplate);

  if (!showTemplateDialog) return null;

  return (
    <div style={styles.overlay} onClick={() => setShowTemplateDialog(false)}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Mallar</h3>
          <button onClick={() => setShowTemplateDialog(false)} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          <div style={styles.hint}>
            Välj en mall att infoga i din whiteboard. Befintligt innehåll bevaras.
          </div>

          <div style={styles.grid}>
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => loadTemplate(template.id)}
                style={styles.templateCard}
              >
                <span style={styles.templateIcon}>{template.icon}</span>
                <span style={styles.templateLabel}>{template.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
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
    width: '480px',
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
  body: { padding: '16px 20px' },
  hint: {
    fontSize: '13px', color: '#666', marginBottom: '16px', lineHeight: 1.5,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
  },
  templateCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '20px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '10px',
    background: '#fafafa',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontSize: '13px',
    fontWeight: 500,
    color: '#333',
  },
  templateIcon: {
    fontSize: '32px',
  },
  templateLabel: {
    fontSize: '13px',
    fontWeight: 600,
    textAlign: 'center',
  },
};
