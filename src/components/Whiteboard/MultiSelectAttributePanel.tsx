// src/components/Whiteboard/MultiSelectAttributePanel.tsx
// Floating panel shown when multiple elements are selected.
// Allows bulk-editing of shared attributes: text color, font size, stroke color, fill color, opacity.

import React, { useCallback, useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

/** The subset of element attributes we allow bulk-editing */
export interface BulkAttributes {
  textColor?: string;
  fontSize?: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  opacity?: number;
}

/** What a selectable element looks like (use your existing element type here) */
export interface SelectableElement {
  id: string;
  type: string;
  text?: string;
  style?: {
    textColor?: string;
    fontSize?: number;
    strokeColor?: string;
    fillColor?: string;
    strokeWidth?: number;
    opacity?: number;
  };
}

interface Props {
  selectedElements: SelectableElement[];
  /** Called with the attribute key/value to apply to all selected elements */
  onApply: (attrs: BulkAttributes) => void;
  onClose?: () => void;
  position?: { x: number; y: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get the "mixed" or common value across selected elements for an attribute */
function getCommonValue<T>(
  elements: SelectableElement[],
  getter: (el: SelectableElement) => T | undefined
): T | 'mixed' | undefined {
  const values = elements.map(getter).filter(v => v !== undefined);
  if (values.length === 0) return undefined;
  const first = values[0];
  const allSame = values.every(v => v === first);
  return allSame ? first : 'mixed';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
    {children}
  </span>
);

const ColorSwatch: React.FC<{
  label: string;
  value?: string | 'mixed';
  onChange: (val: string) => void;
}> = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 28 }}>
    <Label>{label}</Label>
    <input
      type="color"
      value={value === 'mixed' || value === undefined ? '#888888' : value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: 28,
        height: 24,
        border: '1px solid #334155',
        borderRadius: 4,
        padding: 2,
        cursor: 'pointer',
        background: 'none',
      }}
      title={value === 'mixed' ? 'Mixed values' : value}
    />
    {value === 'mixed' && (
      <span style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>blandet</span>
    )}
  </div>
);

const NumberControl: React.FC<{
  label: string;
  value?: number | 'mixed';
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
}> = ({ label, value, min, max, step = 1, unit, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 28 }}>
    <Label>{label}</Label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value === 'mixed' || value === undefined ? Math.round((min + max) / 2) : value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ flex: 1, accentColor: '#6366f1' }}
    />
    <span style={{ fontSize: 11, color: '#cbd5e1', minWidth: 32, textAlign: 'right' }}>
      {value === 'mixed' ? '—' : `${value}${unit ?? ''}`}
    </span>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

export const MultiSelectAttributePanel: React.FC<Props> = ({
  selectedElements,
  onApply,
  onClose,
  position,
}) => {
  const count = selectedElements.length;

  // How many elements have text
  const textCount = useMemo(
    () => selectedElements.filter(el => el.text !== undefined && el.text !== '').length,
    [selectedElements]
  );

  // Derive common values
  const commonTextColor = useMemo(
    () => getCommonValue(selectedElements, el => el.style?.textColor),
    [selectedElements]
  );
  const commonFontSize = useMemo(
    () => getCommonValue(selectedElements, el => el.style?.fontSize),
    [selectedElements]
  );
  const commonStrokeColor = useMemo(
    () => getCommonValue(selectedElements, el => el.style?.strokeColor),
    [selectedElements]
  );
  const commonFillColor = useMemo(
    () => getCommonValue(selectedElements, el => el.style?.fillColor),
    [selectedElements]
  );
  const commonStrokeWidth = useMemo(
    () => getCommonValue(selectedElements, el => el.style?.strokeWidth),
    [selectedElements]
  );
  const commonOpacity = useMemo(
    () => getCommonValue(selectedElements, el => el.style?.opacity),
    [selectedElements]
  );

  const apply = useCallback((attrs: BulkAttributes) => onApply(attrs), [onApply]);

  if (count < 2) return null;

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    left: position?.x ?? 12,
    top: position?.y ?? 60,
    zIndex: 1000,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    padding: '12px 14px',
    minWidth: 220,
    maxWidth: 260,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    userSelect: 'none',
    fontFamily: 'system-ui, sans-serif',
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>
          {count} objekt markerade
        </span>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              padding: '0 2px',
            }}
          >
            ×
          </button>
        )}
      </div>

      <div style={{ height: 1, background: '#334155' }} />

      {/* Stroke */}
      <ColorSwatch
        label="Kantlinje"
        value={commonStrokeColor}
        onChange={val => apply({ strokeColor: val })}
      />
      <NumberControl
        label="Linjetjocklek"
        value={commonStrokeWidth}
        min={0.5}
        max={12}
        step={0.5}
        unit="px"
        onChange={val => apply({ strokeWidth: val })}
      />

      {/* Fill */}
      <ColorSwatch
        label="Fyllning"
        value={commonFillColor}
        onChange={val => apply({ fillColor: val })}
      />

      {/* Opacity */}
      <NumberControl
        label="Opacitet"
        value={
          typeof commonOpacity === 'number'
            ? Math.round(commonOpacity * 100)
            : commonOpacity
        }
        min={10}
        max={100}
        step={5}
        unit="%"
        onChange={val => apply({ opacity: val / 100 })}
      />

      {/* Text section (only shown if any selected elements have text) */}
      {textCount > 0 && (
        <>
          <div style={{ height: 1, background: '#334155' }} />
          <span style={{ fontSize: 11, color: '#64748b' }}>
            Text ({textCount} av {count} objekt)
          </span>
          <ColorSwatch
            label="Textfärg"
            value={commonTextColor}
            onChange={val => apply({ textColor: val })}
          />
          <NumberControl
            label="Teckenstorlek"
            value={commonFontSize}
            min={8}
            max={96}
            step={1}
            unit="px"
            onChange={val => apply({ fontSize: val })}
          />
        </>
      )}

      {/* Quick presets row */}
      <div style={{ height: 1, background: '#334155' }} />
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {[
          { label: 'Röd', stroke: '#ef4444', fill: '#fee2e2' },
          { label: 'Grön', stroke: '#22c55e', fill: '#dcfce7' },
          { label: 'Blå', stroke: '#3b82f6', fill: '#dbeafe' },
          { label: 'Grå', stroke: '#94a3b8', fill: '#f1f5f9' },
          { label: 'Gul', stroke: '#eab308', fill: '#fef9c3' },
        ].map(preset => (
          <button
            key={preset.label}
            onClick={() => apply({ strokeColor: preset.stroke, fillColor: preset.fill })}
            title={preset.label}
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              background: preset.fill,
              border: `2px solid ${preset.stroke}`,
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default MultiSelectAttributePanel;

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION PATTERN (add to your Whiteboard/DrawCanvas component):
// ─────────────────────────────────────────────────────────────────────────────
/*

// In your canvas state:
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

const selectedElements = useMemo(
  () => elements.filter(el => selectedIds.has(el.id)),
  [elements, selectedIds]
);

// Apply handler - merge attrs into each selected element's style:
const handleBulkApply = useCallback((attrs: BulkAttributes) => {
  setElements(prev =>
    prev.map(el => {
      if (!selectedIds.has(el.id)) return el;
      return {
        ...el,
        style: {
          ...el.style,
          ...attrs,
        },
      };
    })
  );
}, [selectedIds]);

// In your JSX (above the canvas, positioned via the panel's position prop):
{selectedElements.length >= 2 && (
  <MultiSelectAttributePanel
    selectedElements={selectedElements}
    onApply={handleBulkApply}
    position={{ x: 12, y: 60 }}
  />
)}

*/
