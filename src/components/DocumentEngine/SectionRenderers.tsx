// src/components/DocumentEngine/SectionRenderers.tsx
import React, { useState } from 'react';
import type { SectionDef, ColumnDef } from './useDocuments';

interface SectionProps {
  section: SectionDef;
  data: any;
  onChange: (sectionId: string, data: any) => void;
  readOnly?: boolean;
  theme: any;
}

// ═══════════════════════════════════════════════════════════
// STATIC — Rich text / markdown editor
// ═══════════════════════════════════════════════════════════
export function StaticSection({ section, data, onChange, readOnly, theme: t }: SectionProps) {
  const content = data?.content || '';
  
  return (
    <textarea
      value={content}
      onChange={(e) => onChange(section.id, { ...data, content: e.target.value })}
      readOnly={readOnly}
      placeholder="Write content here..."
      style={{
        width: '100%',
        minHeight: '150px',
        padding: '12px',
        background: t.bgInput,
        color: t.textPrimary,
        border: `1px solid ${t.border}`,
        borderRadius: '6px',
        fontSize: '13px',
        lineHeight: '1.6',
        resize: 'vertical',
        fontFamily: 'inherit',
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════
// MANUAL TABLE — Editable table with add/remove rows
// ═══════════════════════════════════════════════════════════
export function ManualTableSection({ section, data, onChange, readOnly, theme: t }: SectionProps) {
  const columns = section.columns || [];
  const rows = data?.rows || [];

  const addRow = () => {
    const newRow: Record<string, any> = {};
    columns.forEach(col => {
      if (col.auto_increment) {
        newRow[col.key] = rows.length + 1;
      } else {
        newRow[col.key] = '';
      }
    });
    onChange(section.id, { ...data, rows: [...rows, newRow] });
  };

  const updateCell = (rowIdx: number, key: string, value: any) => {
    const updated = [...rows];
    updated[rowIdx] = { ...updated[rowIdx], [key]: value };
    
    // Auto-compute RPN if applicable
    const rpnCol = columns.find(c => c.computed);
    if (rpnCol) {
      try {
        const expr = rpnCol.computed!;
        const row = updated[rowIdx];
        // Simple eval for "severity * occurrence * detection" pattern
        const result = expr.split('*').reduce((acc: number, key: string) => {
          return acc * (parseFloat(row[key.trim()]) || 0);
        }, 1);
        updated[rowIdx][rpnCol.key] = result;
      } catch { /* ignore */ }
    }
    
    onChange(section.id, { ...data, rows: updated });
  };

  const deleteRow = (rowIdx: number) => {
    onChange(section.id, { ...data, rows: rows.filter((_: any, i: number) => i !== rowIdx) });
  };

  const cellStyle: React.CSSProperties = {
    padding: '6px 8px',
    border: `1px solid ${t.border}`,
    fontSize: '12px',
    color: t.textPrimary,
  };

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: t.bgCard }}>
          <thead>
            <tr>
              {columns.map((col: ColumnDef) => (
                <th key={col.key} style={{
                  ...cellStyle,
                  background: t.bgHeader,
                  fontWeight: 'bold',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                }}>
                  {col.label}
                </th>
              ))}
              {!readOnly && <th style={{ ...cellStyle, background: t.bgHeader, width: 40 }}></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, rowIdx: number) => (
              <tr key={rowIdx}>
                {columns.map((col: ColumnDef) => (
                  <td key={col.key} style={cellStyle}>
                    {col.auto_increment || col.computed ? (
                      <span>{row[col.key]}</span>
                    ) : col.type === 'select' ? (
                      <select
                        value={row[col.key] || ''}
                        onChange={(e) => updateCell(rowIdx, col.key, e.target.value)}
                        disabled={readOnly}
                        style={{ background: t.bgInput, color: t.textPrimary, border: 'none', fontSize: '12px', width: '100%' }}
                      >
                        <option value="">—</option>
                        {(col.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : col.type === 'number' ? (
                      <input
                        type="number"
                        value={row[col.key] || ''}
                        onChange={(e) => updateCell(rowIdx, col.key, e.target.value)}
                        readOnly={readOnly}
                        min={col.min}
                        max={col.max}
                        style={{ background: t.bgInput, color: t.textPrimary, border: 'none', fontSize: '12px', width: '60px' }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={row[col.key] || ''}
                        onChange={(e) => updateCell(rowIdx, col.key, e.target.value)}
                        readOnly={readOnly}
                        style={{ background: 'transparent', color: t.textPrimary, border: 'none', fontSize: '12px', width: '100%' }}
                      />
                    )}
                  </td>
                ))}
                {!readOnly && (
                  <td style={cellStyle}>
                    <button onClick={() => deleteRow(rowIdx)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '14px',
                    }}>✕</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <button onClick={addRow} style={{
          marginTop: '8px',
          padding: '6px 16px',
          background: t.accent,
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
        }}>
          + Add Row
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TEST PROCEDURES — Step-by-step test procedures
// ═══════════════════════════════════════════════════════════
export function TestProceduresSection({ section, data, onChange, readOnly, theme: t }: SectionProps) {
  const procedures = data?.procedures || [];
  const fields = section.procedure_fields || ['precondition', 'steps', 'expected_result', 'actual_result', 'pass_fail'];

  const addProcedure = () => {
    const proc: any = { id: `proc-${Date.now()}` };
    fields.forEach(f => { proc[f] = f === 'steps' ? [] : f === 'pass_fail' ? null : ''; });
    onChange(section.id, { ...data, procedures: [...procedures, proc] });
  };

  const updateProcedure = (idx: number, key: string, value: any) => {
    const updated = [...procedures];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange(section.id, { ...data, procedures: updated });
  };

  const deleteProcedure = (idx: number) => {
    onChange(section.id, { ...data, procedures: procedures.filter((_: any, i: number) => i !== idx) });
  };

  const fieldLabel = (f: string) => {
    const labels: Record<string, string> = {
      precondition: 'Preconditions',
      steps: 'Test Steps',
      expected_result: 'Expected Result',
      actual_result: 'Actual Result',
      pass_fail: 'Result',
    };
    return labels[f] || f;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {procedures.map((proc: any, idx: number) => (
        <div key={proc.id || idx} style={{
          border: `1px solid ${t.border}`,
          borderRadius: '8px',
          padding: '16px',
          background: t.bgCard,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: 'bold', color: t.textPrimary, fontSize: '13px' }}>
              Test {idx + 1}{proc.requirement_id ? ` — ${proc.requirement_id}` : ''}
            </span>
            {!readOnly && (
              <button onClick={() => deleteProcedure(idx)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '12px',
              }}>✕ Remove</button>
            )}
          </div>
          
          {fields.map(field => (
            <div key={field} style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', color: t.textSecondary, fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                {fieldLabel(field)}
              </label>
              {field === 'pass_fail' ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Pass', 'Fail', 'N/A'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => !readOnly && updateProcedure(idx, field, opt)}
                      style={{
                        padding: '4px 16px',
                        borderRadius: '4px',
                        border: `1px solid ${t.border}`,
                        cursor: readOnly ? 'default' : 'pointer',
                        fontSize: '12px',
                        fontWeight: proc[field] === opt ? 'bold' : 'normal',
                        background: proc[field] === opt
                          ? (opt === 'Pass' ? '#22c55e' : opt === 'Fail' ? '#ef4444' : '#6b7280')
                          : t.bgInput,
                        color: proc[field] === opt ? '#fff' : t.textPrimary,
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : field === 'steps' ? (
                <StepsEditor
                  steps={proc[field] || []}
                  onChange={(steps) => updateProcedure(idx, field, steps)}
                  readOnly={readOnly}
                  theme={t}
                />
              ) : (
                <textarea
                  value={proc[field] || ''}
                  onChange={(e) => updateProcedure(idx, field, e.target.value)}
                  readOnly={readOnly}
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '8px',
                    background: t.bgInput,
                    color: t.textPrimary,
                    border: `1px solid ${t.border}`,
                    borderRadius: '4px',
                    fontSize: '12px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      ))}
      
      {!readOnly && (
        <button onClick={addProcedure} style={{
          padding: '8px 20px',
          background: t.accent,
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
        }}>
          + Add Test Procedure
        </button>
      )}
    </div>
  );
}

// Steps sub-editor
function StepsEditor({ steps, onChange, readOnly, theme: t }: {
  steps: string[], onChange: (s: string[]) => void, readOnly?: boolean, theme: any
}) {
  const addStep = () => onChange([...steps, '']);
  const updateStep = (idx: number, val: string) => {
    const updated = [...steps];
    updated[idx] = val;
    onChange(updated);
  };
  const removeStep = (idx: number) => onChange(steps.filter((_, i) => i !== idx));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {steps.map((step, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: t.textSecondary, fontSize: '11px', minWidth: '24px' }}>{idx + 1}.</span>
          <input
            type="text"
            value={step}
            onChange={(e) => updateStep(idx, e.target.value)}
            readOnly={readOnly}
            style={{
              flex: 1, padding: '6px 8px',
              background: t.bgInput, color: t.textPrimary,
              border: `1px solid ${t.border}`, borderRadius: '4px',
              fontSize: '12px',
            }}
          />
          {!readOnly && (
            <button onClick={() => removeStep(idx)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '12px',
            }}>✕</button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button onClick={addStep} style={{
          alignSelf: 'flex-start',
          padding: '3px 12px',
          background: 'transparent',
          color: t.accent,
          border: `1px dashed ${t.accent}`,
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
        }}>
          + Step
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// RISK MATRIX — FMEA table (reuses ManualTable with computed RPN)
// ═══════════════════════════════════════════════════════════
export function RiskMatrixSection(props: SectionProps) {
  return <ManualTableSection {...props} />;
}

// ═══════════════════════════════════════════════════════════
// SIGNATURE BLOCK
// ═══════════════════════════════════════════════════════════
export function SignatureBlockSection({ section, data, onChange, readOnly, theme: t }: SectionProps) {
  const signatures = data?.signatures || [];

  const updateSig = (idx: number, key: string, value: any) => {
    const updated = [...signatures];
    updated[idx] = { ...updated[idx], [key]: value };
    if (key === 'signed' && value) {
      updated[idx].date = new Date().toISOString().split('T')[0];
    }
    onChange(section.id, { ...data, signatures: updated });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
      {signatures.map((sig: any, idx: number) => (
        <div key={idx} style={{
          border: `1px solid ${t.border}`,
          borderRadius: '8px',
          padding: '16px',
          background: t.bgCard,
        }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: t.textSecondary, marginBottom: '8px' }}>
            {sig.role}
          </div>
          <input
            type="text"
            placeholder="Name"
            value={sig.name || ''}
            onChange={(e) => updateSig(idx, 'name', e.target.value)}
            readOnly={readOnly}
            style={{
              width: '100%', padding: '6px 8px', marginBottom: '8px',
              background: t.bgInput, color: t.textPrimary,
              border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '12px',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: t.textSecondary }}>
              {sig.date || 'Not signed'}
            </span>
            {!readOnly && (
              <button
                onClick={() => updateSig(idx, 'signed', !sig.signed)}
                style={{
                  padding: '4px 12px',
                  background: sig.signed ? '#22c55e' : t.bgInput,
                  color: sig.signed ? '#fff' : t.textPrimary,
                  border: `1px solid ${t.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                {sig.signed ? '✓ Signed' : 'Sign'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CHECKLIST
// ═══════════════════════════════════════════════════════════
export function ChecklistSection({ section, data, onChange, readOnly, theme: t }: SectionProps) {
  const items = data?.items || [];

  const addItem = () => {
    onChange(section.id, { ...data, items: [...items, { text: '', checked: false }] });
  };

  const updateItem = (idx: number, updates: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], ...updates };
    onChange(section.id, { ...data, items: updated });
  };

  const deleteItem = (idx: number) => {
    onChange(section.id, { ...data, items: items.filter((_: any, i: number) => i !== idx) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {items.map((item: any, idx: number) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={item.checked || false}
            onChange={(e) => !readOnly && updateItem(idx, { checked: e.target.checked })}
            disabled={readOnly}
          />
          <input
            type="text"
            value={item.text || ''}
            onChange={(e) => updateItem(idx, { text: e.target.value })}
            readOnly={readOnly}
            style={{
              flex: 1, padding: '6px 8px',
              background: 'transparent', color: t.textPrimary,
              border: `1px solid ${t.border}`, borderRadius: '4px',
              fontSize: '12px',
              textDecoration: item.checked ? 'line-through' : 'none',
              opacity: item.checked ? 0.6 : 1,
            }}
          />
          {!readOnly && (
            <button onClick={() => deleteItem(idx)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '12px',
            }}>✕</button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button onClick={addItem} style={{
          alignSelf: 'flex-start',
          padding: '4px 14px',
          background: 'transparent',
          color: t.accent,
          border: `1px dashed ${t.accent}`,
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          marginTop: '4px',
        }}>
          + Add Item
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// REFERENCE LIST
// ═══════════════════════════════════════════════════════════
export function ReferenceListSection({ section, data, onChange, readOnly, theme: t }: SectionProps) {
  const references = data?.references || [];

  const addRef = () => {
    onChange(section.id, {
      ...data,
      references: [...references, { doc_number: '', title: '', version: '', note: '' }]
    });
  };

  const updateRef = (idx: number, key: string, value: string) => {
    const updated = [...references];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange(section.id, { ...data, references: updated });
  };

  const deleteRef = (idx: number) => {
    onChange(section.id, { ...data, references: references.filter((_: any, i: number) => i !== idx) });
  };

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Doc Number', 'Title', 'Version', 'Note'].map(h => (
              <th key={h} style={{
                padding: '6px 8px', border: `1px solid ${t.border}`,
                background: t.bgHeader, color: t.textPrimary,
                fontSize: '11px', fontWeight: 'bold', textAlign: 'left',
              }}>{h}</th>
            ))}
            {!readOnly && <th style={{ width: 40, border: `1px solid ${t.border}`, background: t.bgHeader }}></th>}
          </tr>
        </thead>
        <tbody>
          {references.map((ref: any, idx: number) => (
            <tr key={idx}>
              {['doc_number', 'title', 'version', 'note'].map(key => (
                <td key={key} style={{ padding: '4px 6px', border: `1px solid ${t.border}` }}>
                  <input
                    type="text"
                    value={ref[key] || ''}
                    onChange={(e) => updateRef(idx, key, e.target.value)}
                    readOnly={readOnly}
                    style={{
                      background: 'transparent', color: t.textPrimary,
                      border: 'none', fontSize: '12px', width: '100%',
                    }}
                  />
                </td>
              ))}
              {!readOnly && (
                <td style={{ padding: '4px', border: `1px solid ${t.border}`, textAlign: 'center' }}>
                  <button onClick={() => deleteRef(idx)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '12px',
                  }}>✕</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <button onClick={addRef} style={{
          marginTop: '8px', padding: '6px 16px',
          background: t.accent, color: '#fff',
          border: 'none', borderRadius: '4px',
          cursor: 'pointer', fontSize: '12px',
        }}>
          + Add Reference
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PLACEHOLDER for PLM-linked sections
// ═══════════════════════════════════════════════════════════
export function PlaceholderSection({ section, theme: t }: { section: SectionDef, theme: any }) {
  const typeLabels: Record<string, string> = {
    dynamic_table: '📊 Dynamic table — auto-populates from PLM requirements',
    architecture_view: '🏗️ Architecture diagram — embedded from PLM canvas',
    sequence_embed: '📊 Sequence diagram — embedded from Sequence view',
    component_list: '🔧 Component list — from METS library',
    io_list: '⚡ I/O list — from PLM nodes',
    alarm_list: '🔔 Alarm list — from PLM nodes',
  };

  return (
    <div style={{
      padding: '24px',
      background: `${t.accent}11`,
      border: `2px dashed ${t.accent}44`,
      borderRadius: '8px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '14px', color: t.textSecondary, marginBottom: '4px' }}>
        {typeLabels[section.type] || `📋 ${section.type}`}
      </div>
      <div style={{ fontSize: '11px', color: t.textSecondary, opacity: 0.7 }}>
        This section will be auto-populated from project data when implemented
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION DISPATCHER
// ═══════════════════════════════════════════════════════════
export function renderSection(section: SectionDef, data: any, onChange: (id: string, d: any) => void, readOnly: boolean, theme: any) {
  const props = { section, data, onChange, readOnly, theme };

  switch (section.type) {
    case 'static':
      return <StaticSection {...props} />;
    case 'dynamic_table':
      return section.data_source === 'manual'
        ? <ManualTableSection {...props} />
        : <PlaceholderSection section={section} theme={theme} />;
    case 'manual_table':
      return <ManualTableSection {...props} />;
    case 'risk_matrix':
      return <RiskMatrixSection {...props} />;
    case 'test_procedures':
      return <TestProceduresSection {...props} />;
    case 'signature_block':
      return <SignatureBlockSection {...props} />;
    case 'checklist':
      return <ChecklistSection {...props} />;
    case 'reference_list':
      return <ReferenceListSection {...props} />;
    case 'architecture_view':
    case 'sequence_embed':
    case 'component_list':
    case 'io_list':
    case 'alarm_list':
      return <PlaceholderSection section={section} theme={theme} />;
    default:
      return <PlaceholderSection section={section} theme={theme} />;
  }
}
