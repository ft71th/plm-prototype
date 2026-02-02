/**
 * PropertiesPanel — Contextual properties for selected element(s).
 *
 * Shows fill, stroke, text, and size properties.
 * When nothing is selected, shows canvas-level settings (grid).
 */

import React from 'react';
import useWhiteboardStore from '../../stores/whiteboardStore';

export default function PropertiesPanel({ className = '' }) {
  const elements = useWhiteboardStore((s) => s.elements);
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const recentColors = useWhiteboardStore((s) => s.recentColors);
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const addRecentColor = useWhiteboardStore((s) => s.addRecentColor);

  const selectedElements = [...selectedIds]
    .map((id) => elements[id])
    .filter(Boolean);

  const single = selectedElements.length === 1 ? selectedElements[0] : null;
  const hasSelection = selectedElements.length > 0;

  // ─── Update helper (updates all selected) ────────────
  const updateAll = (updates) => {
    for (const el of selectedElements) {
      updateElement(el.id, updates);
    }
  };

  const updateTextContent = (textUpdates) => {
    for (const el of selectedElements) {
      if (el.type === 'text') {
        updateElement(el.id, { content: { ...el.content, ...textUpdates } });
      } else if (el.type === 'shape' && el.text) {
        updateElement(el.id, { text: { ...el.text, ...textUpdates } });
      }
    }
  };

  // ─── No selection ────────────────────────────────────
  if (!hasSelection) {
    return (
      <div className={className} style={styles.panel}>
        <div style={styles.sectionTitle}>Canvas</div>
        <div style={styles.hint}>Markera ett element för att se egenskaper</div>
      </div>
    );
  }

  // ─── Has selection ───────────────────────────────────
  const isShape = single?.type === 'shape';
  const isText = single?.type === 'text';
  const hasTextContent = isShape ? !!single.text : isText;
  const textContent = isText ? single.content : (isShape ? single.text : null);

  return (
    <div className={className} style={styles.panel}>

      {/* ─── Position & Size ─── */}
      {single && single.type !== 'line' && (
        <Section title="Storlek & position">
          <div style={styles.row}>
            <NumberInput
              label="X"
              value={Math.round(single.x)}
              onChange={(v) => updateElement(single.id, { x: v })}
            />
            <NumberInput
              label="Y"
              value={Math.round(single.y)}
              onChange={(v) => updateElement(single.id, { y: v })}
            />
          </div>
          <div style={styles.row}>
            <NumberInput
              label="B"
              value={Math.round(single.width)}
              onChange={(v) => updateElement(single.id, { width: Math.max(10, v) })}
            />
            <NumberInput
              label="H"
              value={Math.round(single.height)}
              onChange={(v) => updateElement(single.id, { height: Math.max(10, v) })}
            />
          </div>
        </Section>
      )}

      {/* ─── Fill (shapes only) ─── */}
      {selectedElements.some((e) => e.type === 'shape') && (
        <Section title="Fyllnad">
          <div style={styles.row}>
            <ColorInput
              label="Färg"
              value={single?.fill || '#ffffff'}
              onChange={(v) => {
                updateAll({ fill: v });
                addRecentColor(v);
              }}
            />
            <NumberInput
              label="Opacity"
              value={Math.round((single?.fillOpacity ?? 1) * 100)}
              min={0}
              max={100}
              suffix="%"
              onChange={(v) => updateAll({ fillOpacity: v / 100 })}
            />
          </div>
          <RecentColors
            colors={recentColors}
            onSelect={(c) => {
              updateAll({ fill: c });
              addRecentColor(c);
            }}
          />
        </Section>
      )}

      {/* ─── Stroke ─── */}
      <Section title="Kantlinje">
        <div style={styles.row}>
          <ColorInput
            label="Färg"
            value={single?.stroke || '#000000'}
            onChange={(v) => {
              updateAll({ stroke: v });
              addRecentColor(v);
            }}
          />
          <NumberInput
            label="Bredd"
            value={single?.strokeWidth ?? 2}
            min={0.5}
            max={20}
            step={0.5}
            suffix="px"
            onChange={(v) => updateAll({ strokeWidth: v })}
          />
        </div>
      </Section>

      {/* ─── Text Properties ─── */}
      {(hasTextContent || isText) && textContent && (
        <Section title="Text">
          <div style={styles.row}>
            <NumberInput
              label="Storlek"
              value={textContent.fontSize || 14}
              min={8}
              max={120}
              onChange={(v) => updateTextContent({ fontSize: v })}
            />
            <ColorInput
              label="Färg"
              value={textContent.color || '#000000'}
              onChange={(v) => updateTextContent({ color: v })}
            />
          </div>
          <div style={styles.row}>
            <ToggleButton
              active={textContent.fontWeight === 'bold'}
              onClick={() => updateTextContent({
                fontWeight: textContent.fontWeight === 'bold' ? 'normal' : 'bold',
              })}
              title="Fetstil"
            >
              <strong>B</strong>
            </ToggleButton>
            <ToggleButton
              active={textContent.fontStyle === 'italic'}
              onClick={() => updateTextContent({
                fontStyle: textContent.fontStyle === 'italic' ? 'normal' : 'italic',
              })}
              title="Kursiv"
            >
              <em>I</em>
            </ToggleButton>
            <select
              value={textContent.align || 'center'}
              onChange={(e) => updateTextContent({ align: e.target.value })}
              style={styles.select}
            >
              <option value="left">Vänster</option>
              <option value="center">Center</option>
              <option value="right">Höger</option>
            </select>
          </div>
        </Section>
      )}

      {/* ─── Shape Variant Info ─── */}
      {isShape && (
        <Section title="Form">
          <div style={styles.hint}>
            {SHAPE_LABELS[single.shapeVariant] || single.shapeVariant}
          </div>
        </Section>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function NumberInput({ label, value, onChange, min, max, step = 1, suffix = '' }) {
  return (
    <label style={styles.inputLabel}>
      <span style={styles.inputLabelText}>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={styles.numberInput}
      />
      {suffix && <span style={styles.suffix}>{suffix}</span>}
    </label>
  );
}

function ColorInput({ label, value, onChange }) {
  return (
    <label style={styles.inputLabel}>
      <span style={styles.inputLabelText}>{label}</span>
      <div style={styles.colorInputWrapper}>
        <div style={{ ...styles.colorSwatch, background: value }} />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={styles.colorInput}
        />
      </div>
    </label>
  );
}

function ToggleButton({ active, onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        ...styles.toggleButton,
        background: active ? '#e3f2fd' : '#f5f5f5',
        borderColor: active ? '#2196F3' : '#e0e0e0',
      }}
    >
      {children}
    </button>
  );
}

function RecentColors({ colors, onSelect }) {
  if (!colors || colors.length === 0) return null;
  return (
    <div style={styles.recentColors}>
      {colors.map((color, i) => (
        <button
          key={`${color}-${i}`}
          onClick={() => onSelect(color)}
          style={{ ...styles.recentSwatch, background: color }}
          title={color}
        />
      ))}
    </div>
  );
}

const SHAPE_LABELS = {
  rectangle: 'Rektangel',
  'rounded-rectangle': 'Rundad rektangel',
  ellipse: 'Ellips',
  diamond: 'Romb',
  triangle: 'Triangel',
  hexagon: 'Hexagon',
};

// ─── Styles ─────────────────────────────────────────────

const styles = {
  panel: {
    width: '240px',
    background: '#ffffff',
    borderLeft: '1px solid #e0e0e0',
    padding: '12px',
    overflowY: 'auto',
    fontSize: '13px',
    boxSizing: 'border-box',
    userSelect: 'none',
  },
  section: {
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f0f0f0',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#666',
    marginBottom: '8px',
  },
  row: {
    display: 'flex',
    gap: '8px',
    marginBottom: '6px',
    alignItems: 'center',
  },
  inputLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
  },
  inputLabelText: {
    fontSize: '11px',
    color: '#888',
    minWidth: '14px',
  },
  numberInput: {
    width: '100%',
    padding: '4px 6px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    fontSize: '12px',
    boxSizing: 'border-box',
  },
  suffix: {
    fontSize: '11px',
    color: '#888',
  },
  colorInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  colorSwatch: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    border: '1px solid #e0e0e0',
    cursor: 'pointer',
  },
  colorInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '24px',
    height: '24px',
    opacity: 0,
    cursor: 'pointer',
  },
  toggleButton: {
    width: '32px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  select: {
    flex: 1,
    padding: '4px 6px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    fontSize: '12px',
    background: '#fff',
  },
  recentColors: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
    marginTop: '6px',
  },
  recentSwatch: {
    width: '18px',
    height: '18px',
    borderRadius: '3px',
    border: '1px solid #e0e0e0',
    cursor: 'pointer',
    padding: 0,
  },
  hint: {
    color: '#999',
    fontSize: '12px',
    fontStyle: 'italic',
  },
};
