/**
 * PropertiesPanel — Contextual properties for selected element(s).
 * Deliverable 4: Added font family, corner radius, shadow controls
 */

import React from 'react';
import useWhiteboardStore from '../../stores/whiteboardStore';
import { FONT_FAMILIES } from '../../stores/whiteboardStore';
import { buildOrthogonalWaypoints } from './renderers/LineRenderer';

export default function PropertiesPanel({ className = '' }) {
  const elements = useWhiteboardStore((s) => s.elements);
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const recentColors = useWhiteboardStore((s) => s.recentColors);
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const addRecentColor = useWhiteboardStore((s) => s.addRecentColor);
  const pushHistoryCheckpoint = useWhiteboardStore((s) => s.pushHistoryCheckpoint);
  const layers = useWhiteboardStore((s) => s.layers);
  const showPropertiesPanel = useWhiteboardStore((s) => s.showPropertiesPanel);
  const store = useWhiteboardStore;

  // Hide panel if toggled off
  if (!showPropertiesPanel) return null;

  const selectedElements = [...selectedIds].map((id) => elements[id]).filter(Boolean);
  const hasSelection = selectedElements.length > 0;

  // ─── Group detection ─────────────────────────────────
  // When a group is selected, selectedIds contains the group element + all its children.
  // Detect this case so we treat it as a single-element selection of the group.
  let effectiveSingle = null;
  if (selectedElements.length === 1) {
    effectiveSingle = selectedElements[0];
  } else if (selectedElements.length > 1) {
    // Check if exactly one group element is selected and the rest are its children
    const groupEls = selectedElements.filter((el) => el.type === 'group');
    if (groupEls.length === 1) {
      const grp = groupEls[0];
      const childIds = new Set(grp.childIds || []);
      const nonGroupEls = selectedElements.filter((el) => el.type !== 'group');
      const allAreChildren = nonGroupEls.every((el) => childIds.has(el.id));
      if (allAreChildren) {
        effectiveSingle = grp; // treat as single group selection
      }
    }
    // Also handle: all selected elements share the same groupId (sub-group scenario)
    if (!effectiveSingle) {
      const groupIds = [...new Set(selectedElements.map((el) => el.groupId).filter(Boolean))];
      if (groupIds.length === 1 && elements[groupIds[0]]) {
        effectiveSingle = elements[groupIds[0]];
      }
    }
  }

  const single = effectiveSingle;

  const updateAll = (updates) => {
    pushHistoryCheckpoint();
    for (const el of selectedElements) updateElement(el.id, updates);
  };

  const updateTextContent = (textUpdates) => {
    pushHistoryCheckpoint();
    for (const el of selectedElements) {
      if (el.type === 'text') updateElement(el.id, { content: { ...el.content, ...textUpdates } });
      else if (el.type === 'shape' && el.text) updateElement(el.id, { text: { ...el.text, ...textUpdates } });
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

  // ─── Multi-selection panel ────────────────────────────
  // Skip this if we detected a group — that case is handled as `single` below
  if (selectedElements.length > 1 && !single) {
    // Derive mixed/common values across all selected elements
    const getCommon = (getter) => {
      const vals = selectedElements.map(getter).filter((v) => v !== undefined && v !== null);
      if (!vals.length) return undefined;
      return vals.every((v) => v === vals[0]) ? vals[0] : 'mixed';
    };
    const commonStroke = getCommon((el) => el.stroke);
    const commonFill = getCommon((el) => el.fill);
    const commonStrokeWidth = getCommon((el) => el.strokeWidth);
    const commonLayerId = getCommon((el) => el.layerId);
    const withText = selectedElements.filter((el) =>
      (el.type === 'text' && el.content) || (el.type === 'shape' && el.text)
    );
    const commonFontSize = getCommon((el) =>
      el.type === 'text' ? el.content?.fontSize : el.text?.fontSize
    );
    const commonTextColor = getCommon((el) =>
      el.type === 'text' ? el.content?.color : el.text?.color
    );

    const applyAll = (updates) => {
      pushHistoryCheckpoint();
      for (const el of selectedElements) updateElement(el.id, updates);
    };
    const applyText = (textUpdates) => {
      pushHistoryCheckpoint();
      for (const el of selectedElements) {
        if (el.type === 'text') updateElement(el.id, { content: { ...el.content, ...textUpdates } });
        else if (el.type === 'shape' && el.text) updateElement(el.id, { text: { ...el.text, ...textUpdates } });
      }
    };

    return (
      <div className={className} style={styles.panel}>
        <div style={styles.sectionTitle}>
          {selectedElements.length} objekt markerade
        </div>

        {/* Layer assignment for multi-select */}
        <Section title="Lager">
          <div style={styles.row}>
            <select
              value={commonLayerId === 'mixed' ? '' : (commonLayerId || 'default')}
              onChange={(e) => {
                pushHistoryCheckpoint();
                store.getState().moveElementsToLayer(selectedElements.map((el) => el.id), e.target.value);
              }}
              style={styles.select}
            >
              {commonLayerId === 'mixed' && <option value="">— blandat —</option>}
              {layers.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </Section>

        <Section title="Kantlinje">
          <div style={styles.row}>
            <ColorInput
              label="Färg"
              value={commonStroke === 'mixed' ? '#888888' : (commonStroke || '#000000')}
              onChange={(v) => { applyAll({ stroke: v }); addRecentColor(v); }}
            />
            {commonStroke === 'mixed' && <span style={styles.mixedBadge}>blandat</span>}
            <NumberInput
              label="Tjocklek"
              value={commonStrokeWidth === 'mixed' ? 2 : (commonStrokeWidth ?? 2)}
              min={0.5} max={16} step={0.5}
              onChange={(v) => applyAll({ strokeWidth: v })}
            />
          </div>
        </Section>

        <Section title="Fyllning">
          <div style={styles.row}>
            <ColorInput
              label="Färg"
              value={commonFill === 'mixed' ? '#888888' : (commonFill || '#ffffff')}
              onChange={(v) => { applyAll({ fill: v }); addRecentColor(v); }}
            />
            {commonFill === 'mixed' && <span style={styles.mixedBadge}>blandat</span>}
          </div>
          <div style={styles.row}>
            <button onClick={() => applyAll({ fill: 'transparent', fillOpacity: 0 })} style={styles.smallButton}>Ingen</button>
          </div>
        </Section>

        {withText.length > 0 && (
          <Section title={`Text (${withText.length} objekt)`}>
            <div style={styles.row}>
              <NumberInput
                label="Storlek"
                value={commonFontSize === 'mixed' ? 14 : (commonFontSize || 14)}
                min={8} max={120}
                onChange={(v) => applyText({ fontSize: v })}
              />
              {commonFontSize === 'mixed' && <span style={styles.mixedBadge}>blandat</span>}
            </div>
            <div style={styles.row}>
              <ColorInput
                label="Textfärg"
                value={commonTextColor === 'mixed' ? '#000000' : (commonTextColor || '#000000')}
                onChange={(v) => applyText({ color: v })}
              />
              {commonTextColor === 'mixed' && <span style={styles.mixedBadge}>blandat</span>}
            </div>
          </Section>
        )}

        {/* Quick color presets */}
        <Section title="Snabbfärger">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '2px 0' }}>
            {[
              { stroke: '#ef4444', fill: '#fee2e2' },
              { stroke: '#22c55e', fill: '#dcfce7' },
              { stroke: '#3b82f6', fill: '#dbeafe' },
              { stroke: '#f59e0b', fill: '#fef3c7' },
              { stroke: '#8b5cf6', fill: '#ede9fe' },
              { stroke: '#64748b', fill: '#f1f5f9' },
            ].map((p, i) => (
              <button
                key={i}
                onClick={() => applyAll({ stroke: p.stroke, fill: p.fill })}
                style={{
                  width: 24, height: 24, borderRadius: 4, cursor: 'pointer', padding: 0,
                  background: p.fill, border: `2px solid ${p.stroke}`,
                }}
                title={`${p.stroke}`}
              />
            ))}
          </div>
        </Section>

        <RecentColors colors={recentColors} onSelect={(c) => {
          applyAll({ stroke: c });
          addRecentColor(c);
        }} />
      </div>
    );
  }

  const isShape = single?.type === 'shape';
  const isText = single?.type === 'text';
  const isLine = single?.type === 'line';
  const isFrame = single?.type === 'frame';
  const hasTextContent = isShape ? !!single.text : isText;
  const textContent = isText ? single.content : (isShape ? single.text : null);

  return (
    <div className={className} style={styles.panel}>

      {/* ─── Layer Assignment (D5) ─── */}
      {single && (
        <Section title="Lager">
          <div style={styles.row}>
            <select
              value={single.layerId || 'default'}
              onChange={(e) => {
                pushHistoryCheckpoint();
                // For groups: move group + all children to the new layer
                const idsToMove = single.type === 'group' && single.childIds
                  ? [single.id, ...single.childIds]
                  : [single.id];
                store.getState().moveElementsToLayer(idsToMove, e.target.value);
              }}
              style={styles.select}
            >
              {layers.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          {single.type === 'group' && (
            <div style={styles.hint}>{(single.childIds || []).length} element i grupp</div>
          )}
          {single.plmNodeId && (
            <div style={{ background: '#ede9fe', borderRadius: 4, padding: '3px 6px', fontSize: 10, color: '#6366f1', fontWeight: 600, marginTop: 2 }}>
              🔗 PLM: {single.plmNodeId}
            </div>
          )}
        </Section>
      )}

      {/* ─── Position & Size ─── */}
      {single && single.type !== 'line' && (
        <Section title="Storlek & position">
          <div style={styles.row}>
            <NumberInput label="X" value={Math.round(single.x)} onChange={(v) => updateElement(single.id, { x: v })} />
            <NumberInput label="Y" value={Math.round(single.y)} onChange={(v) => updateElement(single.id, { y: v })} />
          </div>
          <div style={styles.row}>
            <NumberInput label="B" value={Math.round(single.width)} onChange={(v) => updateElement(single.id, { width: Math.max(10, v) })} />
            <NumberInput label="H" value={Math.round(single.height)} onChange={(v) => updateElement(single.id, { height: Math.max(10, v) })} />
          </div>
        </Section>
      )}

      {/* ─── Rotation ─── */}
      {single && single.type !== 'line' && (
        <Section title="Rotation">
          <div style={styles.row}>
            <NumberInput
              label="°"
              value={Math.round(((single.rotation || 0) * 180) / Math.PI)}
              min={0}
              max={359}
              onChange={(v) => {
                pushHistoryCheckpoint();
                updateElement(single.id, { rotation: (v * Math.PI) / 180 });
              }}
            />
            <button
              onClick={() => { pushHistoryCheckpoint(); updateElement(single.id, { rotation: 0 }); }}
              style={{ ...styles.smallButton, marginLeft: 4 }}
              title="Återställ rotation"
            >
              ↺ Nollställ
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={Math.round(((single.rotation || 0) * 180) / Math.PI)}
            onChange={(e) => {
              updateElement(single.id, { rotation: (Number(e.target.value) * Math.PI) / 180 });
            }}
            style={{ width: '100%', marginTop: '4px' }}
          />
        </Section>
      )}

      {/* ─── Fill (shapes only) ─── */}
      {selectedElements.some((e) => e.type === 'shape') && (
        <Section title="Fyllnad">
          <div style={styles.row}>
            <ColorInput label="Färg" value={single?.fill || '#ffffff'} onChange={(v) => { updateAll({ fill: v }); addRecentColor(v); }} />
            <NumberInput label="Opacity" value={Math.round((single?.fillOpacity ?? 1) * 100)} min={0} max={100} suffix="%" onChange={(v) => updateAll({ fillOpacity: v / 100 })} />
          </div>
          <RecentColors colors={recentColors} onSelect={(c) => { updateAll({ fill: c }); addRecentColor(c); }} />
        </Section>
      )}

      {/* ─── Stroke ─── */}
      <Section title="Kantlinje">
        <div style={styles.row}>
          <ColorInput label="Färg" value={single?.stroke || '#000000'} onChange={(v) => { updateAll({ stroke: v }); addRecentColor(v); }} />
          <NumberInput label="Bredd" value={single?.strokeWidth ?? 2} min={0.5} max={20} step={0.5} suffix="px" onChange={(v) => updateAll({ strokeWidth: v })} />
        </div>
      </Section>

      {/* ─── Corner Radius (rounded shapes) ─── */}
      {isShape && (single.shapeVariant === 'rounded-rectangle' || single.shapeVariant === 'rectangle') && (
        <Section title="Hörnradie">
          <div style={styles.row}>
            <NumberInput
              label="R"
              value={single.cornerRadius ?? 8}
              min={0}
              max={Math.min(single.width, single.height) / 2}
              onChange={(v) => updateElement(single.id, { cornerRadius: v, shapeVariant: v > 0 ? 'rounded-rectangle' : 'rectangle' })}
            />
          </div>
          <input
            type="range"
            min={0}
            max={Math.min(single.width, single.height) / 2}
            value={single.cornerRadius ?? 8}
            onChange={(e) => updateElement(single.id, {
              cornerRadius: Number(e.target.value),
              shapeVariant: Number(e.target.value) > 0 ? 'rounded-rectangle' : 'rectangle',
            })}
            style={{ width: '100%', marginTop: '4px' }}
          />
        </Section>
      )}

      {/* ─── Shadow ─── */}
      {isShape && (
        <Section title="Skugga">
          <div style={styles.row}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={!!(single.shadow && single.shadow.blur > 0)}
                onChange={(e) => {
                  if (e.target.checked) {
                    updateElement(single.id, { shadow: { color: 'rgba(0,0,0,0.2)', blur: 8, offsetX: 2, offsetY: 4 } });
                  } else {
                    updateElement(single.id, { shadow: null });
                  }
                }}
              />
              Aktivera
            </label>
          </div>
          {single.shadow && single.shadow.blur > 0 && (
            <>
              <div style={styles.row}>
                <NumberInput label="Blur" value={single.shadow.blur} min={0} max={50} onChange={(v) => updateElement(single.id, { shadow: { ...single.shadow, blur: v } })} />
              </div>
              <div style={styles.row}>
                <NumberInput label="X" value={single.shadow.offsetX || 0} min={-20} max={20} onChange={(v) => updateElement(single.id, { shadow: { ...single.shadow, offsetX: v } })} />
                <NumberInput label="Y" value={single.shadow.offsetY || 0} min={-20} max={20} onChange={(v) => updateElement(single.id, { shadow: { ...single.shadow, offsetY: v } })} />
              </div>
            </>
          )}
        </Section>
      )}

      {/* ─── Text Properties ─── */}
      {(hasTextContent || isText) && textContent && (
        <Section title="Text">
          <div style={styles.row}>
            <label style={{ ...styles.inputLabel, flex: 1 }}>
              <span style={styles.inputLabelText}>Typsnitt</span>
              <select
                value={textContent.fontFamily || 'Inter, system-ui, sans-serif'}
                onChange={(e) => updateTextContent({ fontFamily: e.target.value })}
                style={styles.select}
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={styles.row}>
            <NumberInput label="Storlek" value={textContent.fontSize || 14} min={8} max={120} onChange={(v) => updateTextContent({ fontSize: v })} />
            <ColorInput label="Färg" value={textContent.color || '#000000'} onChange={(v) => updateTextContent({ color: v })} />
          </div>
          <div style={styles.row}>
            <ToggleButton active={textContent.fontWeight === 'bold'} onClick={() => updateTextContent({ fontWeight: textContent.fontWeight === 'bold' ? 'normal' : 'bold' })} title="Fetstil"><strong>B</strong></ToggleButton>
            <ToggleButton active={textContent.fontStyle === 'italic'} onClick={() => updateTextContent({ fontStyle: textContent.fontStyle === 'italic' ? 'normal' : 'italic' })} title="Kursiv"><em>I</em></ToggleButton>
            <select value={textContent.align || 'center'} onChange={(e) => updateTextContent({ align: e.target.value })} style={styles.select}>
              <option value="left">Vänster</option>
              <option value="center">Center</option>
              <option value="right">Höger</option>
            </select>
          </div>
        </Section>
      )}

      {/* ─── Text Background Color ─── */}
      {isText && single && (
        <Section title="Textbakgrund">
          <div style={styles.row}>
            <ColorInput
              label="Färg"
              value={single.content?.backgroundColor || '#ffffff'}
              onChange={(v) => {
                pushHistoryCheckpoint();
                updateElement(single.id, { content: { ...single.content, backgroundColor: v } });
                addRecentColor(v);
              }}
            />
            <NumberInput
              label="Opacity"
              value={Math.round((single.content?.backgroundOpacity ?? 0) * 100)}
              min={0} max={100} suffix="%"
              onChange={(v) => {
                pushHistoryCheckpoint();
                updateElement(single.id, { content: { ...single.content, backgroundOpacity: v / 100 } });
              }}
            />
          </div>
          <div style={styles.row}>
            <NumberInput
              label="Radie"
              value={single.content?.backgroundRadius ?? 4}
              min={0} max={40}
              onChange={(v) => {
                updateElement(single.id, { content: { ...single.content, backgroundRadius: v } });
              }}
            />
            <button
              onClick={() => {
                pushHistoryCheckpoint();
                updateElement(single.id, { content: { ...single.content, backgroundColor: 'transparent', backgroundOpacity: 0 } });
              }}
              style={{ ...styles.smallButton, marginLeft: 4 }}
              title="Ta bort bakgrund"
            >
              Ingen
            </button>
          </div>
          <RecentColors colors={recentColors} onSelect={(c) => {
            pushHistoryCheckpoint();
            updateElement(single.id, { content: { ...single.content, backgroundColor: c, backgroundOpacity: single.content?.backgroundOpacity || 1 } });
            addRecentColor(c);
          }} />
        </Section>
      )}

      {/* ─── Frame Properties ─── */}
      {isFrame && single && (
        <Section title="Ram (Frame)">
          <div style={styles.row}>
            <label style={{ ...styles.inputLabel, flex: 1 }}>
              <span style={styles.inputLabelText}>Namn</span>
              <input
                type="text"
                value={single.label || ''}
                onChange={(e) => {
                  pushHistoryCheckpoint();
                  updateElement(single.id, { label: e.target.value });
                }}
                style={styles.select}
                placeholder="Ramnamn..."
              />
            </label>
          </div>
          <div style={styles.row}>
            <ColorInput
              label="Kantfärg"
              value={single.stroke || '#6366f1'}
              onChange={(v) => {
                pushHistoryCheckpoint();
                updateElement(single.id, { stroke: v });
                addRecentColor(v);
              }}
            />
          </div>
          <div style={styles.row}>
            <ColorInput
              label="Bakgrund"
              value={single.fill || '#6366f1'}
              onChange={(v) => {
                pushHistoryCheckpoint();
                updateElement(single.id, { fill: v });
                addRecentColor(v);
              }}
            />
            <NumberInput
              label="Opacity"
              value={Math.round((single.fillOpacity ?? 0.15) * 100)}
              min={0} max={100} suffix="%"
              onChange={(v) => {
                pushHistoryCheckpoint();
                updateElement(single.id, { fillOpacity: v / 100 });
              }}
            />
          </div>
          <div style={styles.row}>
            <button
              onClick={() => {
                pushHistoryCheckpoint();
                updateElement(single.id, { fill: 'transparent', fillOpacity: 0 });
              }}
              style={{ ...styles.smallButton }}
              title="Ta bort bakgrundsfärg"
            >
              Ingen bakgrund
            </button>
          </div>
          <RecentColors colors={recentColors} onSelect={(c) => {
            pushHistoryCheckpoint();
            updateElement(single.id, { fill: c, fillOpacity: single.fillOpacity ?? 0.15 });
            addRecentColor(c);
          }} />
        </Section>
      )}

      {/* ─── Line Properties ─── */}
      {isLine && (
        <Section title="Linje">
          <div style={styles.row}>
            <label style={styles.inputLabel}>
              <span style={styles.inputLabelText}>Stil</span>
              <select value={single.lineStyle || 'solid'} onChange={(e) => updateElement(single.id, { lineStyle: e.target.value })} style={styles.select}>
                <option value="solid">Solid</option>
                <option value="dashed">Streckad</option>
                <option value="dotted">Prickad</option>
              </select>
            </label>
          </div>
          <div style={styles.row}>
            <label style={styles.inputLabel}>
              <span style={styles.inputLabelText}>Pilhuvud</span>
              <select value={single.arrowHead || 'none'} onChange={(e) => updateElement(single.id, { arrowHead: e.target.value })} style={styles.select}>
                <option value="none">Ingen</option>
                <option value="arrow">Pil</option>
                <option value="open-arrow">Öppen pil</option>
                <option value="diamond">Diamant</option>
                <option value="circle">Cirkel</option>
              </select>
            </label>
          </div>
          <div style={styles.row}>
            <label style={styles.inputLabel}>
              <span style={styles.inputLabelText}>Pilsvans</span>
              <select value={single.arrowTail || 'none'} onChange={(e) => updateElement(single.id, { arrowTail: e.target.value })} style={styles.select}>
                <option value="none">Ingen</option>
                <option value="arrow">Pil</option>
                <option value="open-arrow">Öppen pil</option>
                <option value="diamond">Diamant</option>
                <option value="circle">Cirkel</option>
              </select>
            </label>
          </div>
          <div style={styles.row}>
            <NumberInput label="Kurvatur" value={single.curvature || 0} min={-200} max={200} step={10} onChange={(v) => updateElement(single.id, { curvature: v })} />
          </div>
          <div style={styles.row}>
            <label style={styles.inputLabel}>
              <span style={styles.inputLabelText}>Routing</span>
              <select
                value={single.lineType === 'orthogonal' ? 'orthogonal' : 'straight'}
                onChange={(e) => {
                  pushHistoryCheckpoint();
                  if (e.target.value === 'orthogonal') {
                    // Convert to orthogonal with auto-generated waypoints
                    const wp = buildOrthogonalWaypoints(single.x, single.y, single.x2, single.y2);
                    updateElement(single.id, { lineType: 'orthogonal', waypoints: wp });
                  } else {
                    updateElement(single.id, { lineType: 'straight', waypoints: null });
                  }
                }}
                style={styles.select}
              >
                <option value="straight">Rak</option>
                <option value="orthogonal">Rätvinklig</option>
              </select>
            </label>
          </div>
          {single.lineType === 'orthogonal' && Array.isArray(single.waypoints) && (
            <div style={{ ...styles.row, flexDirection: 'column', gap: 4 }}>
              <div style={styles.hint}>
                {single.waypoints.length} punkter — dra mitthandtagen på linjen för att flytta segment. Dubbelklicka på segment för att lägga till böj.
              </div>
              <button
                onClick={() => {
                  pushHistoryCheckpoint();
                  updateElement(single.id, {
                    waypoints: [
                      { x: single.x, y: single.y },
                      { x: (single.x + single.x2) / 2, y: single.y },
                      { x: (single.x + single.x2) / 2, y: single.y2 },
                      { x: single.x2, y: single.y2 },
                    ],
                  });
                }}
                style={styles.smallButton}
              >
                Återställ böjar
              </button>
            </div>
          )}
          <div style={{ ...styles.row, marginTop: 8 }}>
            <label style={{ ...styles.inputLabel, flex: 1 }}>
              <span style={styles.inputLabelText}>Etikett</span>
              <input
                type="text"
                value={single.label?.text || ''}
                placeholder="Lägg till text..."
                onChange={(e) => updateElement(single.id, {
                  label: { ...(single.label || {}), text: e.target.value, fontSize: 12, color: '#333', background: 'rgba(255,255,255,0.9)' }
                })}
                style={styles.textInput}
              />
            </label>
          </div>
          {single.startConnection && <div style={styles.hint}>📌 Kopplad (start)</div>}
          {single.endConnection && <div style={styles.hint}>📌 Kopplad (slut)</div>}
        </Section>
      )}

      {/* ─── Image Properties ─── */}
      {single?.type === 'image' && (
        <Section title="Bild">
          <div style={styles.row}>
            <NumberInput label="Opacity" value={Math.round((single.opacity ?? 1) * 100)} min={0} max={100} suffix="%" onChange={(v) => { pushHistoryCheckpoint(); updateElement(single.id, { opacity: v / 100 }); }} />
          </div>
          <div style={styles.hint}>
            {single.width}×{single.height} px
          </div>
        </Section>
      )}

      {/* ─── Path Properties ─── */}
      {single?.type === 'path' && (
        <Section title="Bana">
          <div style={styles.hint}>
            {single.points?.length || 0} punkter
          </div>
        </Section>
      )}

      {/* ─── Shape Variant Info ─── */}
      {isShape && (
        <Section title="Form">
          <div style={styles.hint}>{SHAPE_LABELS[single.shapeVariant] || single.shapeVariant}</div>
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
      <input type="number" value={value} min={min} max={max} step={step} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} style={styles.numberInput} />
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
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={styles.colorInput} />
      </div>
    </label>
  );
}

function ToggleButton({ active, onClick, title, children }) {
  return (
    <button
      onClick={onClick} title={title}
      style={{ ...styles.toggleButton, background: active ? '#e3f2fd' : '#f5f5f5', borderColor: active ? '#2196F3' : '#e0e0e0' }}
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
        <button key={`${color}-${i}`} onClick={() => onSelect(color)} style={{ ...styles.recentSwatch, background: color }} title={color} />
      ))}
    </div>
  );
}

const SHAPE_LABELS = {
  rectangle: 'Rektangel', 'rounded-rectangle': 'Rundad rektangel',
  ellipse: 'Ellips', diamond: 'Romb', triangle: 'Triangel', hexagon: 'Hexagon',
  cylinder: 'Cylinder', cloud: 'Moln', star: 'Stjärna', parallelogram: 'Parallellogram',
  'sticky-note': 'Klisterlapp',
};

// ─── Styles ─────────────────────────────────────────────

const styles = {
  panel: { width: '240px', background: '#ffffff', borderLeft: '1px solid #e0e0e0', padding: '12px', overflowY: 'auto', fontSize: '13px', boxSizing: 'border-box', userSelect: 'none' },
  section: { marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f0f0f0' },
  sectionTitle: { fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666', marginBottom: '8px' },
  row: { display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' },
  inputLabel: { display: 'flex', alignItems: 'center', gap: '4px', flex: 1 },
  inputLabelText: { fontSize: '11px', color: '#888', minWidth: '14px' },
  numberInput: { width: '100%', padding: '4px 6px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' },
  suffix: { fontSize: '11px', color: '#888' },
  colorInputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  colorSwatch: { width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #e0e0e0', cursor: 'pointer' },
  colorInput: { position: 'absolute', top: 0, left: 0, width: '24px', height: '24px', opacity: 0, cursor: 'pointer' },
  toggleButton: { width: '32px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e0e0e0', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  select: { flex: 1, padding: '4px 6px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '12px', background: '#fff' },
  recentColors: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' },
  recentSwatch: { width: '18px', height: '18px', borderRadius: '3px', border: '1px solid #e0e0e0', cursor: 'pointer', padding: 0 },
  hint: { color: '#999', fontSize: '12px', fontStyle: 'italic' },
  textInput: { flex: 1, padding: '4px 6px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box', outline: 'none' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' },
  smallButton: { padding: '3px 8px', border: '1px solid #e0e0e0', borderRadius: '4px', background: '#f5f5f5', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' },
  mixedBadge: { fontSize: '9px', color: '#94a3b8', fontStyle: 'italic', whiteSpace: 'nowrap' },
};
