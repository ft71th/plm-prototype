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
// DYNAMIC REQUIREMENTS TABLE — auto-populated from PLM nodes
// ═══════════════════════════════════════════════════════════

// All node types that can appear in PLM canvas
const ALL_NODE_TYPES = ['requirement', 'system', 'subsystem', 'function', 'testcase', 'testrun', 'testresult', 'parameter', 'hardware', 'usecase', 'actor'] as const;
const REQ_TYPES = ['customer', 'platform', 'project', 'implementation'] as const;
const CLASSIFICATIONS = ['need', 'capability', 'requirement'] as const;

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  customer:       { label: 'Customer',       icon: '👤', color: '#9b59b6' },
  platform:       { label: 'Platform',       icon: '🏗️', color: '#2c3e50' },
  project:        { label: 'Project',        icon: '📁', color: '#e67e22' },
  implementation: { label: 'Implementation', icon: '⚙️', color: '#f1c40f' },
  need:           { label: 'Need',           icon: '🎯', color: '#e74c3c' },
  capability:     { label: 'Capability',     icon: '⚙️', color: '#3498db' },
  requirement:    { label: 'Requirement',    icon: '📋', color: '#8e44ad' },
  system:         { label: 'System',         icon: '🖥️', color: '#1abc9c' },
  subsystem:      { label: 'Sub-system',     icon: '📦', color: '#3498db' },
  function:       { label: 'Function',       icon: '⚡', color: '#00bcd4' },
  testcase:       { label: 'Test Case',      icon: '🧪', color: '#27ae60' },
  hardware:       { label: 'Hardware',       icon: '🔧', color: '#795548' },
  parameter:      { label: 'Parameter',      icon: '📊', color: '#607d8b' },
};

// Resolve which node types this section should include
function resolveNodeFilter(sectionFilter: Record<string, any> | undefined) {
  if (!sectionFilter) return { reqTypes: null, classifications: null, nodeTypes: null, priorities: null };
  return {
    reqTypes:        sectionFilter.reqTypes || null,        // e.g. ['customer']
    classifications: sectionFilter.classifications || null, // e.g. ['need', 'capability']
    nodeTypes:       sectionFilter.nodeTypes || null,       // e.g. ['requirement', 'system']
    priorities:      sectionFilter.priorities || null,      // e.g. ['high', 'medium']
  };
}

function DynamicRequirementsTable({ section, data, onChange, theme: t, nodes = [], edges = [] }: SectionProps & { nodes?: any[], edges?: any[] }) {
  // Template-defined defaults
  const defaults = resolveNodeFilter(section.filter);

  // UI state — initialized from template defaults, user can override
  const [activeReqTypes, setActiveReqTypes] = useState<Set<string>>(
    new Set(defaults.reqTypes || REQ_TYPES)
  );
  const [activeClassifications, setActiveClassifications] = useState<Set<string>>(
    new Set(defaults.classifications || CLASSIFICATIONS)
  );
  const [includeNonReq, setIncludeNonReq] = useState<boolean>(
    defaults.nodeTypes ? defaults.nodeTypes.some((t: string) => !['requirement'].includes(t)) : false
  );
  const [sortBy, setSortBy] = useState<string>('reqId');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // All requirement-type nodes from PLM
  const allReqNodes = (nodes || []).filter(n => {
    const d = n.data || {};
    const itemType = d.itemType || d.type || '';
    const reqType = d.reqType || '';
    const classification = d.classification || '';

    // Is it a requirement node?
    if (itemType === 'requirement' || d.reqId) return true;
    if (['customer', 'platform', 'project', 'implementation'].includes(reqType)) return true;
    if (['need', 'capability', 'requirement'].includes(classification)) return true;

    // Include non-requirement node types if toggled
    if (includeNonReq && ['system', 'subsystem', 'function', 'hardware', 'parameter'].includes(itemType)) return true;

    return false;
  });

  // Apply active filters
  const filtered = allReqNodes.filter(n => {
    const d = n.data || {};
    const reqType = d.reqType || '';
    const classification = d.classification || 'requirement';
    const itemType = d.itemType || d.type || '';

    // Requirement nodes: filter by reqType and classification
    if (itemType === 'requirement' || d.reqId || ['customer', 'platform', 'project', 'implementation'].includes(reqType)) {
      if (reqType && !activeReqTypes.has(reqType)) return false;
      if (classification && !activeClassifications.has(classification)) return false;
      return true;
    }

    // Non-requirement nodes pass through if includeNonReq is on
    return includeNonReq;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'reqId') return (a.data?.reqId || '').localeCompare(b.data?.reqId || '');
    if (sortBy === 'priority') {
      const p: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (p[a.data?.priority] ?? 9) - (p[b.data?.priority] ?? 9);
    }
    if (sortBy === 'label') return (a.data?.label || '').localeCompare(b.data?.label || '');
    if (sortBy === 'reqType') return (a.data?.reqType || '').localeCompare(b.data?.reqType || '');
    return 0;
  });

  // Get unique reqTypes and classifications present in data
  const presentReqTypes = [...new Set(allReqNodes.map(n => n.data?.reqType).filter(Boolean))] as string[];
  const presentClassifications = [...new Set(allReqNodes.map(n => n.data?.classification).filter(Boolean))] as string[];

  // Find connected nodes (traceability)
  const getConnected = (nodeId: string, direction: 'source' | 'target') => {
    return (edges || [])
      .filter(e => direction === 'source' ? e.source === nodeId : e.target === nodeId)
      .map(e => {
        const connId = direction === 'source' ? e.target : e.source;
        const connNode = (nodes || []).find(n => n.id === connId);
        return connNode?.data?.label || connId;
      });
  };

  // Toggle helpers
  const toggleSet = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    setter(next);
  };

  const priorityBadge = (p: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      high: { bg: '#fee2e2', color: '#dc2626', label: 'High' },
      medium: { bg: '#fef3c7', color: '#d97706', label: 'Medium' },
      low: { bg: '#dcfce7', color: '#16a34a', label: 'Low' },
    };
    const s = styles[p] || { bg: '#f1f5f9', color: '#64748b', label: p || '—' };
    return (
      <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
        {s.label}
      </span>
    );
  };

  const stateBadge = (state: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      frozen: { bg: '#dbeafe', color: '#2563eb' },
      released: { bg: '#dcfce7', color: '#16a34a' },
      draft: { bg: '#f1f5f9', color: '#64748b' },
    };
    const s = styles[state] || styles.draft;
    return (
      <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
        {state || 'draft'}
      </span>
    );
  };

  // Filter pill component
  const FilterPill = ({ value, active, onClick, color }: { value: string; active: boolean; onClick: () => void; color?: string }) => {
    const info = TYPE_LABELS[value] || { label: value, icon: '📄', color: '#64748b' };
    return (
      <button onClick={onClick} style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 500,
        cursor: 'pointer', transition: 'all 0.15s',
        background: active ? `${color || info.color}20` : 'transparent',
        border: `1px solid ${active ? (color || info.color) : t.border}`,
        color: active ? (color || info.color) : t.textSecondary,
        opacity: active ? 1 : 0.6,
      }}>
        <span style={{ fontSize: '12px' }}>{info.icon}</span>
        {info.label}
        {active && <span style={{ marginLeft: '2px' }}>✓</span>}
      </button>
    );
  };

  if (allReqNodes.length === 0) {
    return (
      <div style={{
        padding: '32px', textAlign: 'center',
        background: `${t.accent}08`, border: `2px dashed ${t.border}`, borderRadius: '8px',
      }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
        <div style={{ fontSize: '14px', color: t.textSecondary, marginBottom: '4px' }}>
          No requirements found in PLM canvas
        </div>
        <div style={{ fontSize: '12px', color: t.textSecondary, opacity: 0.7 }}>
          Add requirement nodes in the PLM or Simple view to auto-populate this table
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: '12px', color: t.textSecondary, fontWeight: 600 }}>
          {sorted.length} of {allReqNodes.length} requirement{allReqNodes.length !== 1 ? 's' : ''}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: showFilters ? `${t.accent}15` : 'transparent',
            border: `1px solid ${showFilters ? t.accent : t.border}`,
            borderRadius: '4px', padding: '4px 10px', fontSize: '11px',
            color: showFilters ? t.accent : t.textSecondary, cursor: 'pointer',
          }}
        >
          🔽 Filters {filtered.length < allReqNodes.length && `(${allReqNodes.length - filtered.length} hidden)`}
        </button>

        {/* Template default indicator */}
        {section.filter && (
          <span style={{ fontSize: '10px', color: t.textSecondary, opacity: 0.6, fontStyle: 'italic' }}>
            Template default: {section.filter.reqTypes?.join(', ') || section.filter.classifications?.join(', ') || 'all'}
          </span>
        )}

        <div style={{ flex: 1 }} />

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '4px',
            color: t.textPrimary, padding: '4px 8px', fontSize: '12px',
          }}
        >
          <option value="reqId">Sort by ID</option>
          <option value="reqType">Sort by Type</option>
          <option value="priority">Sort by Priority</option>
          <option value="label">Sort by Name</option>
        </select>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{
          background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px',
          padding: '12px 16px', marginBottom: '12px',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          {/* Requirement types */}
          {presentReqTypes.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '6px' }}>
                Requirement Type
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {presentReqTypes.map(rt => (
                  <FilterPill
                    key={rt} value={rt}
                    active={activeReqTypes.has(rt)}
                    onClick={() => toggleSet(activeReqTypes, rt, setActiveReqTypes)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Classification */}
          {presentClassifications.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: t.textSecondary, marginBottom: '6px' }}>
                Classification
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {presentClassifications.map(cl => (
                  <FilterPill
                    key={cl} value={cl}
                    active={activeClassifications.has(cl)}
                    onClick={() => toggleSet(activeClassifications, cl, setActiveClassifications)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Include non-requirement nodes */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: t.textSecondary, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeNonReq}
                onChange={e => setIncludeNonReq(e.target.checked)}
                style={{ accentColor: t.accent }}
              />
              Include system, subsystem, function, hardware & parameter nodes
            </label>
          </div>
        </div>
      )}

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: `${t.accent}15` }}>
            {['ID', 'Requirement', 'Type', 'Priority', 'Status', 'Version', 'Traces To'].map(h => (
              <th key={h} style={{
                padding: '8px 10px', textAlign: 'left', fontWeight: 600,
                color: t.textPrimary, borderBottom: `2px solid ${t.border}`, fontSize: '11px',
                whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((node, idx) => {
            const d = node.data || {};
            const tracesTo = getConnected(node.id, 'source');
            const reqType = d.reqType || '';
            const typeInfo = TYPE_LABELS[reqType] || TYPE_LABELS[d.classification] || TYPE_LABELS[d.itemType] || { label: d.classification || d.itemType || 'requirement', icon: '📋', color: '#8e44ad' };
            return (
              <tr key={node.id} style={{
                background: idx % 2 === 0 ? 'transparent' : `${t.accent}05`,
                borderBottom: `1px solid ${t.border}`,
              }}>
                <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600, color: '#3b82f6', whiteSpace: 'nowrap' }}>
                  {d.reqId || node.id.slice(0, 8)}
                </td>
                <td style={{ padding: '8px 10px', color: t.textPrimary, maxWidth: '300px' }}>
                  <div style={{ fontWeight: 500 }}>{d.label}</div>
                  {d.description && (
                    <div style={{ fontSize: '11px', color: t.textSecondary, marginTop: '2px' }}>
                      {d.description}
                    </div>
                  )}
                </td>
                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: `${typeInfo.color}18`, color: typeInfo.color,
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                  }}>
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                </td>
                <td style={{ padding: '8px 10px' }}>
                  {priorityBadge(d.priority)}
                </td>
                <td style={{ padding: '8px 10px' }}>
                  {stateBadge(d.state)}
                </td>
                <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11px', color: t.textSecondary }}>
                  {d.version ? `v${d.version}` : '—'}
                </td>
                <td style={{ padding: '8px 10px', fontSize: '11px', color: t.textSecondary, maxWidth: '200px' }}>
                  {tracesTo.length > 0
                    ? tracesTo.map((name, i) => (
                        <span key={i} style={{
                          background: `${t.accent}15`, padding: '1px 6px', borderRadius: '3px',
                          marginRight: '4px', display: 'inline-block', marginBottom: '2px',
                        }}>{name}</span>
                      ))
                    : <span style={{ opacity: 0.5 }}>—</span>
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: '8px', fontSize: '10px', color: t.textSecondary, opacity: 0.6, fontStyle: 'italic' }}>
        Auto-populated from PLM canvas · {new Date().toLocaleDateString()}
      </div>
    </div>
  );

}

// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// DYNAMIC ARCHITECTURE VIEW — system/subsystem/function/hardware from PLM
// ═══════════════════════════════════════════════════════════

const ARCH_TYPES = ['system', 'subsystem', 'function', 'hardware', 'parameter'] as const;

function DynamicArchitectureView({ section, data, onChange, theme: t, nodes = [], edges = [] }: SectionProps & { nodes?: any[], edges?: any[] }) {
  const [showType, setShowType] = useState<string>('all');
  const [viewStyle, setViewStyle] = useState<'hierarchy' | 'table'>('hierarchy');

  // Filter to architecture-relevant nodes
  const archNodes = (nodes || []).filter(n => {
    const itemType = n.data?.itemType || n.data?.type || '';
    return ARCH_TYPES.includes(itemType as any);
  });

  // Build parent→children map from edges
  const childrenOf = new Map<string, string[]>();
  const parentOf = new Map<string, string>();
  (edges || []).forEach(e => {
    // source → target = parent → child in architecture
    if (!childrenOf.has(e.source)) childrenOf.set(e.source, []);
    childrenOf.get(e.source)!.push(e.target);
    parentOf.set(e.target, e.source);
  });

  // Get connections (non-hierarchical)
  const getConnections = (nodeId: string) => {
    return (edges || [])
      .filter(e => e.source === nodeId || e.target === nodeId)
      .map(e => {
        const otherId = e.source === nodeId ? e.target : e.source;
        const other = (nodes || []).find(n => n.id === otherId);
        return other?.data?.label || otherId;
      });
  };

  // Find root nodes (arch nodes that have no arch-type parent)
  const archNodeIds = new Set(archNodes.map(n => n.id));
  const rootNodes = archNodes.filter(n => {
    const parent = parentOf.get(n.id);
    return !parent || !archNodeIds.has(parent);
  });

  // Sort by type hierarchy: system → subsystem → function → hardware → parameter
  const typeOrder: Record<string, number> = { system: 0, subsystem: 1, function: 2, hardware: 3, parameter: 4 };
  const sortByType = (a: any, b: any) => {
    const ta = a.data?.itemType || a.data?.type || '';
    const tb = b.data?.itemType || b.data?.type || '';
    return (typeOrder[ta] ?? 9) - (typeOrder[tb] ?? 9);
  };

  // Build flat list with indent levels via DFS
  const flatList: { node: any; depth: number }[] = [];
  const visited = new Set<string>();

  function walkTree(nodeId: string, depth: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = archNodes.find(n => n.id === nodeId);
    if (!node) return;
    flatList.push({ node, depth });
    const kids = (childrenOf.get(nodeId) || [])
      .map(id => archNodes.find(n => n.id === id))
      .filter(Boolean)
      .sort(sortByType);
    kids.forEach(kid => walkTree(kid!.id, depth + 1));
  }

  rootNodes.sort(sortByType).forEach(n => walkTree(n.id, 0));

  // Add orphans (arch nodes not reached by tree walk)
  archNodes.forEach(n => {
    if (!visited.has(n.id)) flatList.push({ node: n, depth: 0 });
  });

  // Apply type filter
  const filtered = showType === 'all'
    ? flatList
    : flatList.filter(({ node }) => (node.data?.itemType || node.data?.type) === showType);

  // Unique types present
  const presentTypes = [...new Set(archNodes.map(n => n.data?.itemType || n.data?.type || ''))];

  if (archNodes.length === 0) {
    return (
      <div style={{
        padding: '32px', textAlign: 'center',
        background: `${t.accent}08`, border: `2px dashed ${t.border}`, borderRadius: '8px',
      }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏗️</div>
        <div style={{ fontSize: '14px', color: t.textSecondary, marginBottom: '4px' }}>
          No architecture nodes found in PLM canvas
        </div>
        <div style={{ fontSize: '12px', color: t.textSecondary, opacity: 0.7 }}>
          Add system, subsystem, function, or hardware nodes to auto-populate
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: '12px', color: t.textSecondary, fontWeight: 600 }}>
          {filtered.length} component{filtered.length !== 1 ? 's' : ''}
        </div>

        <div style={{ flex: 1 }} />

        {presentTypes.length > 1 && (
          <select
            value={showType}
            onChange={e => setShowType(e.target.value)}
            style={{
              background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '4px',
              color: t.textPrimary, padding: '4px 8px', fontSize: '12px',
            }}
          >
            <option value="all">All types</option>
            {presentTypes.map(tp => (
              <option key={tp} value={tp}>{TYPE_LABELS[tp]?.label || tp}</option>
            ))}
          </select>
        )}

        <div style={{ display: 'flex', gap: '2px', background: t.bgCard, borderRadius: '4px', border: `1px solid ${t.border}`, padding: '2px' }}>
          {(['hierarchy', 'table'] as const).map(v => (
            <button key={v} onClick={() => setViewStyle(v)} style={{
              padding: '3px 10px', borderRadius: '3px', border: 'none', fontSize: '11px', cursor: 'pointer',
              background: viewStyle === v ? t.accent : 'transparent',
              color: viewStyle === v ? '#fff' : t.textSecondary, fontWeight: viewStyle === v ? 600 : 400,
            }}>
              {v === 'hierarchy' ? '🌳 Tree' : '📋 Table'}
            </button>
          ))}
        </div>
      </div>

      {viewStyle === 'hierarchy' ? (
        /* ─── Hierarchy View ─── */
        <div style={{ fontSize: '12px' }}>
          {filtered.map(({ node, depth }, idx) => {
            const d = node.data || {};
            const itemType = d.itemType || d.type || '';
            const info = TYPE_LABELS[itemType] || { label: itemType, icon: '📦', color: '#64748b' };
            const ports = d.ports || [];
            const inputPorts = ports.filter((p: any) => p.direction === 'input');
            const outputPorts = ports.filter((p: any) => p.direction === 'output');

            return (
              <div key={node.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                padding: '8px 10px', marginLeft: `${depth * 28}px`,
                borderLeft: depth > 0 ? `2px solid ${info.color}40` : 'none',
                background: idx % 2 === 0 ? 'transparent' : `${t.accent}04`,
                borderBottom: `1px solid ${t.border}`,
              }}>
                {/* Type badge */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0,
                  background: `${info.color}18`, color: info.color,
                  padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                  minWidth: '85px',
                }}>
                  {info.icon} {info.label}
                </span>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: t.textPrimary }}>{d.label}</div>
                  {d.description && (
                    <div style={{ fontSize: '11px', color: t.textSecondary, marginTop: '2px' }}>{d.description}</div>
                  )}
                  {/* Ports info */}
                  {ports.length > 0 && (
                    <div style={{ marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {inputPorts.length > 0 && (
                        <span style={{ fontSize: '10px', color: '#3b82f6' }}>
                          ⬅ {inputPorts.length} input{inputPorts.length > 1 ? 's' : ''}
                          {inputPorts.length <= 3 && `: ${inputPorts.map((p: any) => p.label || p.name || p.id).join(', ')}`}
                        </span>
                      )}
                      {outputPorts.length > 0 && (
                        <span style={{ fontSize: '10px', color: '#22c55e' }}>
                          ➡ {outputPorts.length} output{outputPorts.length > 1 ? 's' : ''}
                          {outputPorts.length <= 3 && `: ${outputPorts.map((p: any) => p.label || p.name || p.id).join(', ')}`}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* ID */}
                {d.reqId && (
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#3b82f6', flexShrink: 0 }}>
                    {d.reqId}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── Table View ─── */
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: `${t.accent}15` }}>
              {['Component', 'Type', 'Ports', 'Connections', 'Parent'].map(h => (
                <th key={h} style={{
                  padding: '8px 10px', textAlign: 'left', fontWeight: 600,
                  color: t.textPrimary, borderBottom: `2px solid ${t.border}`, fontSize: '11px',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ node, depth }, idx) => {
              const d = node.data || {};
              const itemType = d.itemType || d.type || '';
              const info = TYPE_LABELS[itemType] || { label: itemType, icon: '📦', color: '#64748b' };
              const ports = d.ports || [];
              const connections = getConnections(node.id);
              const parent = parentOf.get(node.id);
              const parentNode = parent ? (nodes || []).find(n => n.id === parent) : null;

              return (
                <tr key={node.id} style={{
                  background: idx % 2 === 0 ? 'transparent' : `${t.accent}05`,
                  borderBottom: `1px solid ${t.border}`,
                }}>
                  <td style={{ padding: '8px 10px', color: t.textPrimary }}>
                    <div style={{ fontWeight: 500, paddingLeft: `${depth * 16}px` }}>
                      {depth > 0 && <span style={{ color: t.textSecondary, marginRight: '4px' }}>└</span>}
                      {d.label}
                    </div>
                    {d.description && (
                      <div style={{ fontSize: '11px', color: t.textSecondary, paddingLeft: `${depth * 16}px` }}>{d.description}</div>
                    )}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '3px',
                      background: `${info.color}18`, color: info.color,
                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                    }}>
                      {info.icon} {info.label}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: '11px', color: t.textSecondary }}>
                    {ports.length > 0 ? `${ports.filter((p: any) => p.direction === 'input').length}↓ ${ports.filter((p: any) => p.direction === 'output').length}↑` : '—'}
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: '11px', color: t.textSecondary, maxWidth: '200px' }}>
                    {connections.length > 0
                      ? connections.slice(0, 4).map((name, i) => (
                          <span key={i} style={{
                            background: `${t.accent}15`, padding: '1px 6px', borderRadius: '3px',
                            marginRight: '4px', display: 'inline-block', marginBottom: '2px',
                          }}>{name}</span>
                        ))
                      : '—'
                    }
                    {connections.length > 4 && <span style={{ opacity: 0.5 }}>+{connections.length - 4}</span>}
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: '11px', color: t.textSecondary }}>
                    {parentNode?.data?.label || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: '8px', fontSize: '10px', color: t.textSecondary, opacity: 0.6, fontStyle: 'italic' }}>
        Auto-populated from PLM canvas · {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DYNAMIC COMPONENT LIST — METS library components from PLM
// ═══════════════════════════════════════════════════════════

function DynamicComponentList({ section, data, onChange, theme: t, nodes = [], edges = [] }: SectionProps & { nodes?: any[], edges?: any[] }) {
  const [groupBy, setGroupBy] = useState<'family' | 'system' | 'flat'>('family');
  const [showSignals, setShowSignals] = useState(false);

  // Filter to swComponent nodes
  const compNodes = (nodes || []).filter(n => {
    return n.type === 'swComponent' || n.data?.metsFamily;
  });

  if (compNodes.length === 0) {
    return (
      <div style={{
        padding: '32px', textAlign: 'center',
        background: `${t.accent}08`, border: `2px dashed ${t.border}`, borderRadius: '8px',
      }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔧</div>
        <div style={{ fontSize: '14px', color: t.textSecondary, marginBottom: '4px' }}>
          No METS components found in PLM canvas
        </div>
        <div style={{ fontSize: '12px', color: t.textSecondary, opacity: 0.7 }}>
          Drag components from the METS Library panel to auto-populate
        </div>
      </div>
    );
  }

  // Group nodes
  const grouped = new Map<string, any[]>();
  compNodes.forEach(n => {
    const key = groupBy === 'family'
      ? (n.data?.metsFamily || 'Unknown')
      : groupBy === 'system'
        ? (n.data?.metsSystem || 'Unassigned')
        : 'All Components';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(n);
  });

  // Family colors from library
  const FAMILY_COLORS_LOCAL: Record<string, string> = {
    VALVC: '#ef4444', PUMPC: '#3b82f6', TANKM: '#10b981', BRKC: '#f59e0b',
    FANC: '#8b5cf6', DMPC: '#06b6d4', MOTRC: '#ec4899', HEATC: '#f97316',
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: '12px', color: t.textSecondary, fontWeight: 600 }}>
          {compNodes.length} component{compNodes.length !== 1 ? 's' : ''}
        </div>
        <div style={{ flex: 1 }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: t.textSecondary, cursor: 'pointer' }}>
          <input type="checkbox" checked={showSignals} onChange={e => setShowSignals(e.target.checked)} style={{ accentColor: t.accent }} />
          Show signals
        </label>

        <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} style={{
          background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '4px',
          color: t.textPrimary, padding: '4px 8px', fontSize: '12px',
        }}>
          <option value="family">Group by Family</option>
          <option value="system">Group by System</option>
          <option value="flat">Flat list</option>
        </select>
      </div>

      {/* Grouped tables */}
      {[...grouped.entries()].map(([groupName, groupNodes]) => {
        const familyColor = FAMILY_COLORS_LOCAL[groupName] || t.accent;
        return (
          <div key={groupName} style={{ marginBottom: '16px' }}>
            {groupBy !== 'flat' && (
              <div style={{
                padding: '6px 12px', background: `${familyColor}15`,
                borderLeft: `3px solid ${familyColor}`, borderRadius: '0 4px 4px 0',
                fontSize: '12px', fontWeight: 600, color: familyColor, marginBottom: '6px',
              }}>
                {groupName} ({groupNodes.length})
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: `${t.accent}10` }}>
                  {['Instance', 'Family', 'Variant', 'Pos No', 'System', ...(showSignals ? ['DI', 'DO', 'AI', 'AO'] : ['Signals'])].map(h => (
                    <th key={h} style={{
                      padding: '6px 10px', textAlign: 'left', fontWeight: 600,
                      color: t.textPrimary, borderBottom: `2px solid ${t.border}`, fontSize: '11px',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupNodes.map((node: any, idx: number) => {
                  const d = node.data || {};
                  const famKey = d.metsFamily || '';
                  const varKey = d.metsVariant || '';
                  const fc = FAMILY_COLORS_LOCAL[famKey] || '#64748b';

                  // Count signals by type
                  const sigs = d.metsSignals || [];
                  const di = sigs.filter((s: any) => s.type === 'DI').length;
                  const dout = sigs.filter((s: any) => s.type === 'DO').length;
                  const ai = sigs.filter((s: any) => s.type === 'AI').length;
                  const ao = sigs.filter((s: any) => s.type === 'AO').length;
                  const totalSigs = di + dout + ai + ao;

                  return (
                    <tr key={node.id} style={{
                      background: idx % 2 === 0 ? 'transparent' : `${t.accent}05`,
                      borderBottom: `1px solid ${t.border}`,
                    }}>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 600, color: fc }}>
                        {d.metsInstanceName || 'fb_unnamed'}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{
                          background: `${fc}18`, color: fc,
                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                        }}>{famKey}</span>
                      </td>
                      <td style={{ padding: '6px 10px', color: t.textPrimary, fontSize: '11px' }}>
                        {varKey}
                      </td>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: '11px', color: t.textSecondary }}>
                        {d.metsPosNo || '—'}
                      </td>
                      <td style={{ padding: '6px 10px', fontSize: '11px', color: t.textSecondary }}>
                        {d.metsSystem || '—'}
                      </td>
                      {showSignals ? (
                        <>
                          <td style={{ padding: '6px 10px', textAlign: 'center', fontSize: '11px', color: di > 0 ? '#3b82f6' : t.textSecondary }}>{di || '—'}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center', fontSize: '11px', color: dout > 0 ? '#22c55e' : t.textSecondary }}>{dout || '—'}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center', fontSize: '11px', color: ai > 0 ? '#f59e0b' : t.textSecondary }}>{ai || '—'}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center', fontSize: '11px', color: ao > 0 ? '#ef4444' : t.textSecondary }}>{ao || '—'}</td>
                        </>
                      ) : (
                        <td style={{ padding: '6px 10px', fontSize: '11px', color: t.textSecondary }}>
                          {totalSigs > 0 ? totalSigs : '—'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      <div style={{ marginTop: '8px', fontSize: '10px', color: t.textSecondary, opacity: 0.6, fontStyle: 'italic' }}>
        Auto-populated from METS Library · {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// DYNAMIC I/O LIST — signals/ports from all PLM nodes
// ═══════════════════════════════════════════════════════════

function DynamicIOList({ section, data, onChange, theme: t, nodes = [], edges = [] }: SectionProps & { nodes?: any[], edges?: any[] }) {
  const [filterSigType, setFilterSigType] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  // Collect all signals/ports from all nodes
  const allSignals: { signal: any; source: string; sourceType: string; nodeId: string; family?: string }[] = [];

  (nodes || []).forEach(n => {
    const d = n.data || {};
    const srcName = d.metsInstanceName || d.label || n.id.slice(0, 8);
    const srcType = n.type === 'swComponent' ? 'METS' : (d.itemType || d.type || 'node');

    // METS component signals
    if (d.metsSignals?.length) {
      d.metsSignals.forEach((sig: any) => {
        allSignals.push({ signal: sig, source: srcName, sourceType: srcType, nodeId: n.id, family: d.metsFamily });
      });
    }

    // Regular node ports (non-METS)
    if (d.ports?.length && !d.metsFamily) {
      d.ports.forEach((port: any) => {
        allSignals.push({
          signal: {
            name: port.label || port.name || port.id,
            type: port.direction === 'input' ? 'DI' : 'DO',
            desc: port.description || '',
            struct: port.dataType || '',
          },
          source: srcName, sourceType: srcType, nodeId: n.id,
        });
      });
    }
  });

  // Filter
  const filtered = allSignals.filter(s => {
    if (filterSigType !== 'all' && s.signal.type !== filterSigType) return false;
    if (filterSource !== 'all' && s.source !== filterSource) return false;
    return true;
  });

  // Sort: DI, AI, DO, AO
  const typeOrder: Record<string, number> = { DI: 0, AI: 1, DO: 2, AO: 3 };
  filtered.sort((a, b) => (typeOrder[a.signal.type] ?? 9) - (typeOrder[b.signal.type] ?? 9));

  // Unique sources and signal types
  const sources = [...new Set(allSignals.map(s => s.source))];
  const sigTypes = [...new Set(allSignals.map(s => s.signal.type))];

  const sigTypeColors: Record<string, { bg: string; color: string }> = {
    DI: { bg: '#dbeafe', color: '#2563eb' },
    DO: { bg: '#dcfce7', color: '#16a34a' },
    AI: { bg: '#fef3c7', color: '#d97706' },
    AO: { bg: '#fee2e2', color: '#dc2626' },
  };

  if (allSignals.length === 0) {
    return (
      <div style={{
        padding: '32px', textAlign: 'center',
        background: `${t.accent}08`, border: `2px dashed ${t.border}`, borderRadius: '8px',
      }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚡</div>
        <div style={{ fontSize: '14px', color: t.textSecondary, marginBottom: '4px' }}>
          No I/O signals found in PLM canvas
        </div>
        <div style={{ fontSize: '12px', color: t.textSecondary, opacity: 0.7 }}>
          Add components with signals or nodes with ports to auto-populate
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: '12px', color: t.textSecondary, fontWeight: 600 }}>
          {filtered.length} of {allSignals.length} signal{allSignals.length !== 1 ? 's' : ''}
        </div>

        {/* Summary badges */}
        {sigTypes.map(st => {
          const count = allSignals.filter(s => s.signal.type === st).length;
          const c = sigTypeColors[st] || { bg: '#f1f5f9', color: '#64748b' };
          return (
            <span key={st} style={{
              background: c.bg, color: c.color,
              padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
            }}>
              {st}: {count}
            </span>
          );
        })}

        <div style={{ flex: 1 }} />

        {sigTypes.length > 1 && (
          <select value={filterSigType} onChange={e => setFilterSigType(e.target.value)} style={{
            background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '4px',
            color: t.textPrimary, padding: '4px 8px', fontSize: '12px',
          }}>
            <option value="all">All types</option>
            {sigTypes.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        )}

        {sources.length > 1 && (
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={{
            background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '4px',
            color: t.textPrimary, padding: '4px 8px', fontSize: '12px',
          }}>
            <option value="all">All sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: `${t.accent}10` }}>
            {['#', 'Signal Name', 'Type', 'Data Type', 'Source', 'Description'].map(h => (
              <th key={h} style={{
                padding: '6px 10px', textAlign: 'left', fontWeight: 600,
                color: t.textPrimary, borderBottom: `2px solid ${t.border}`, fontSize: '11px',
                whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((item, idx) => {
            const s = item.signal;
            const c = sigTypeColors[s.type] || { bg: '#f1f5f9', color: '#64748b' };
            return (
              <tr key={`${item.nodeId}-${s.name}-${idx}`} style={{
                background: idx % 2 === 0 ? 'transparent' : `${t.accent}05`,
                borderBottom: `1px solid ${t.border}`,
              }}>
                <td style={{ padding: '6px 10px', color: t.textSecondary, fontSize: '11px' }}>{idx + 1}</td>
                <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 500, color: t.textPrimary }}>
                  {s.name}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <span style={{
                    background: c.bg, color: c.color,
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                  }}>{s.type}</span>
                </td>
                <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: '11px', color: t.textSecondary }}>
                  {s.struct || '—'}
                </td>
                <td style={{ padding: '6px 10px', fontSize: '11px', color: t.textSecondary }}>
                  {item.family && <span style={{ fontSize: '9px', marginRight: '4px', opacity: 0.6 }}>[{item.family}]</span>}
                  {item.source}
                </td>
                <td style={{ padding: '6px 10px', fontSize: '11px', color: t.textSecondary, maxWidth: '250px' }}>
                  {s.desc || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: '8px', fontSize: '10px', color: t.textSecondary, opacity: 0.6, fontStyle: 'italic' }}>
        Auto-populated from PLM canvas · {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// DYNAMIC ALARM LIST — derived from METS component states & config
// ═══════════════════════════════════════════════════════════

interface DerivedAlarm {
  tag: string;
  source: string;
  family: string;
  condition: string;
  action: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'info';
  setpoint: string;
  type: 'state' | 'limit' | 'signal';
}

function deriveAlarms(nodes: any[]): DerivedAlarm[] {
  const alarms: DerivedAlarm[] = [];

  (nodes || []).filter(n => n.type === 'swComponent' || n.data?.metsFamily).forEach(n => {
    const d = n.data || {};
    const instanceName = d.metsInstanceName || 'fb_unnamed';
    const family = d.metsFamily || '';
    const states = d.metsStates || [];
    const config = d.metsConfig || [];
    const signals = d.metsSignals || [];

    // 1. States with alarm/trip actions
    states.forEach((s: any) => {
      const act = (s.actions || '').toLowerCase();
      if (act.includes('alarm') || act.includes('trip') || act.includes('all off')) {
        const priority = act.includes('critical') ? 'critical' :
                         act.includes('trip') || act.includes('all off') ? 'high' :
                         act.includes('high') || act.includes('low') ? 'medium' : 'info';
        alarms.push({
          tag: `${instanceName}.${s.name}`,
          source: instanceName,
          family,
          condition: s.entry || s.name,
          action: s.actions,
          priority,
          setpoint: '',
          type: 'state',
        });
      }
    });

    // 2. Config params with alarm/limit/trip keywords
    config.forEach((c: any) => {
      const desc = (c.desc || '').toLowerCase();
      if (desc.includes('alarm') || desc.includes('limit') || desc.includes('trip') || desc.includes('max') || desc.includes('min')) {
        alarms.push({
          tag: `${instanceName}.${c.name}`,
          source: instanceName,
          family,
          condition: c.desc,
          action: `Setpoint: ${c.default} ${c.type}`,
          priority: desc.includes('max') || desc.includes('overload') ? 'high' : 'medium',
          setpoint: `${c.default}`,
          type: 'limit',
        });
      }
    });

    // 3. DI signals that indicate alarm/trip/fault
    signals.forEach((sig: any) => {
      const name = (sig.name || '').toLowerCase();
      const desc = (sig.desc || '').toLowerCase();
      if ((name.includes('trip') || name.includes('fault') || name.includes('alarm') ||
           desc.includes('trip') || desc.includes('fault') || desc.includes('alarm')) && sig.type === 'DI') {
        alarms.push({
          tag: `${instanceName}.${sig.name}`,
          source: instanceName,
          family,
          condition: sig.desc || sig.name,
          action: 'Digital input alarm',
          priority: name.includes('trip') ? 'high' : 'medium',
          setpoint: 'TRUE',
          type: 'signal',
        });
      }
    });
  });

  return alarms;
}

function DynamicAlarmList({ section, data, onChange, theme: t, nodes = [], edges = [] }: SectionProps & { nodes?: any[], edges?: any[] }) {
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  const alarms = deriveAlarms(nodes);

  const filtered = alarms.filter(a => {
    if (filterPriority !== 'all' && a.priority !== filterPriority) return false;
    if (filterSource !== 'all' && a.source !== filterSource) return false;
    return true;
  });

  const sources = [...new Set(alarms.map(a => a.source))];
  const priorities = [...new Set(alarms.map(a => a.priority))];

  const priorityStyles: Record<string, { bg: string; color: string; label: string }> = {
    critical: { bg: '#7f1d1d', color: '#fca5a5', label: '🔴 Critical' },
    high:     { bg: '#fee2e2', color: '#dc2626', label: '🟠 High' },
    medium:   { bg: '#fef3c7', color: '#d97706', label: '🟡 Medium' },
    low:      { bg: '#dcfce7', color: '#16a34a', label: '🟢 Low' },
    info:     { bg: '#dbeafe', color: '#2563eb', label: '🔵 Info' },
  };

  if (alarms.length === 0) {
    return (
      <div style={{
        padding: '32px', textAlign: 'center',
        background: `${t.accent}08`, border: `2px dashed ${t.border}`, borderRadius: '8px',
      }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔔</div>
        <div style={{ fontSize: '14px', color: t.textSecondary, marginBottom: '4px' }}>
          No alarms found in PLM canvas
        </div>
        <div style={{ fontSize: '12px', color: t.textSecondary, opacity: 0.7 }}>
          Add METS components with alarm states to auto-populate
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: '12px', color: t.textSecondary, fontWeight: 600 }}>
          {filtered.length} of {alarms.length} alarm{alarms.length !== 1 ? 's' : ''}
        </div>

        {/* Priority summary */}
        {Object.entries(priorityStyles).map(([key, ps]) => {
          const count = alarms.filter(a => a.priority === key).length;
          if (!count) return null;
          return (
            <span key={key} style={{
              background: ps.bg, color: ps.color,
              padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
            }}>{ps.label}: {count}</span>
          );
        })}

        <div style={{ flex: 1 }} />

        {priorities.length > 1 && (
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{
            background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '4px',
            color: t.textPrimary, padding: '4px 8px', fontSize: '12px',
          }}>
            <option value="all">All priorities</option>
            {priorities.map(p => <option key={p} value={p}>{priorityStyles[p]?.label || p}</option>)}
          </select>
        )}

        {sources.length > 1 && (
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={{
            background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '4px',
            color: t.textPrimary, padding: '4px 8px', fontSize: '12px',
          }}>
            <option value="all">All sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: `${t.accent}10` }}>
            {['#', 'Alarm Tag', 'Priority', 'Condition', 'Action', 'Setpoint', 'Source', 'Type'].map(h => (
              <th key={h} style={{
                padding: '6px 10px', textAlign: 'left', fontWeight: 600,
                color: t.textPrimary, borderBottom: `2px solid ${t.border}`, fontSize: '11px',
                whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((a, idx) => {
            const ps = priorityStyles[a.priority] || priorityStyles.info;
            return (
              <tr key={`${a.tag}-${idx}`} style={{
                background: idx % 2 === 0 ? 'transparent' : `${t.accent}05`,
                borderBottom: `1px solid ${t.border}`,
              }}>
                <td style={{ padding: '6px 10px', color: t.textSecondary, fontSize: '11px' }}>{idx + 1}</td>
                <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 500, color: t.textPrimary, fontSize: '11px' }}>
                  {a.tag}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <span style={{
                    background: ps.bg, color: ps.color,
                    padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                  }}>{ps.label}</span>
                </td>
                <td style={{ padding: '6px 10px', color: t.textPrimary, fontSize: '11px' }}>{a.condition}</td>
                <td style={{ padding: '6px 10px', color: t.textSecondary, fontSize: '11px' }}>{a.action}</td>
                <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: '11px', color: t.textSecondary }}>
                  {a.setpoint || '—'}
                </td>
                <td style={{ padding: '6px 10px', fontSize: '11px', color: t.textSecondary }}>{a.source}</td>
                <td style={{ padding: '6px 10px', fontSize: '11px', color: t.textSecondary, textTransform: 'capitalize' }}>{a.type}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: '8px', fontSize: '10px', color: t.textSecondary, opacity: 0.6, fontStyle: 'italic' }}>
        Derived from METS component states, limits & signals · {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// DYNAMIC SEQUENCE EMBED — renders saved sequence diagrams
// ═══════════════════════════════════════════════════════════

interface SeqDiagram {
  id: string; name: string; description?: string;
  participants: { id: string; label: string; color?: string }[];
  messages: { id: string; fromId: string; toId: string; label: string; type: string; orderIndex: number }[];
}

function loadSequenceDiagrams(projectId: string | null): SeqDiagram[] {
  try {
    const key = `northlight_seqdiagrams_${projectId || 'default'}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function DynamicSequenceEmbed({ section, data, onChange, theme: t, nodes = [], edges = [] }: SectionProps & { nodes?: any[], edges?: any[], projectId?: string }) {
  // Try to get projectId from section data or URL
  const projectId = (section as any).projectId || new URLSearchParams(window.location.search).get('project') || null;
  const diagrams = loadSequenceDiagrams(projectId);

  const [selectedDiagramId, setSelectedDiagramId] = useState<string>(
    data?.selectedDiagramId || diagrams[0]?.id || ''
  );

  const diagram = diagrams.find(d => d.id === selectedDiagramId);

  // Save selection
  const handleSelect = (id: string) => {
    setSelectedDiagramId(id);
    onChange(section.id, { ...data, selectedDiagramId: id });
  };

  if (diagrams.length === 0) {
    return (
      <div style={{
        padding: '32px', textAlign: 'center',
        background: `${t.accent}08`, border: `2px dashed ${t.border}`, borderRadius: '8px',
      }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
        <div style={{ fontSize: '14px', color: t.textSecondary, marginBottom: '4px' }}>
          No sequence diagrams found
        </div>
        <div style={{ fontSize: '12px', color: t.textSecondary, opacity: 0.7 }}>
          Create sequence diagrams in the Sequence view to embed here
        </div>
      </div>
    );
  }

  if (!diagram) {
    return (
      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', color: t.textSecondary }}>Select a diagram:</div>
        {diagrams.map(d => (
          <button key={d.id} onClick={() => handleSelect(d.id)} style={{
            display: 'block', width: '100%', padding: '8px 12px', marginBottom: '4px',
            background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '6px',
            color: t.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '12px',
          }}>
            📊 {d.name} {d.description && <span style={{ color: t.textSecondary }}> — {d.description}</span>}
          </button>
        ))}
      </div>
    );
  }

  // Render simplified sequence diagram as message table + visual
  const participants = diagram.participants || [];
  const messages = [...(diagram.messages || [])].sort((a, b) => a.orderIndex - b.orderIndex);
  const pMap = new Map(participants.map(p => [p.id, p]));

  return (
    <div>
      {/* Diagram selector */}
      {diagrams.length > 1 && (
        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: t.textSecondary, fontWeight: 600 }}>Diagram:</span>
          <select value={selectedDiagramId} onChange={e => handleSelect(e.target.value)} style={{
            background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '4px',
            color: t.textPrimary, padding: '4px 8px', fontSize: '12px',
          }}>
            {diagrams.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      )}

      {/* Diagram name */}
      <div style={{
        padding: '8px 12px', background: `${t.accent}10`, borderRadius: '6px', marginBottom: '12px',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ fontSize: '16px' }}>📊</span>
        <div>
          <div style={{ fontWeight: 600, color: t.textPrimary, fontSize: '13px' }}>{diagram.name}</div>
          {diagram.description && <div style={{ fontSize: '11px', color: t.textSecondary }}>{diagram.description}</div>}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '11px', color: t.textSecondary }}>
          {participants.length} participants · {messages.length} messages
        </span>
      </div>

      {/* Participants */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {participants.map(p => (
          <span key={p.id} style={{
            padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
            background: `${p.color || t.accent}20`, color: p.color || t.accent,
            border: `1px solid ${p.color || t.accent}40`,
          }}>
            {p.label}
          </span>
        ))}
      </div>

      {/* Message flow table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: `${t.accent}10` }}>
            {['#', 'From', 'To', 'Message', 'Type'].map(h => (
              <th key={h} style={{
                padding: '6px 10px', textAlign: 'left', fontWeight: 600,
                color: t.textPrimary, borderBottom: `2px solid ${t.border}`, fontSize: '11px',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {messages.map((msg, idx) => {
            const from = pMap.get(msg.fromId);
            const to = pMap.get(msg.toId);
            const typeStyles: Record<string, { color: string; label: string }> = {
              sync: { color: '#2563eb', label: '→ Sync' },
              async: { color: '#7c3aed', label: '⇢ Async' },
              reply: { color: '#16a34a', label: '← Reply' },
              create: { color: '#d97706', label: '+ Create' },
              destroy: { color: '#dc2626', label: '✕ Destroy' },
            };
            const ts = typeStyles[msg.type] || { color: '#64748b', label: msg.type };
            return (
              <tr key={msg.id} style={{
                background: idx % 2 === 0 ? 'transparent' : `${t.accent}05`,
                borderBottom: `1px solid ${t.border}`,
              }}>
                <td style={{ padding: '6px 10px', color: t.textSecondary, fontSize: '11px' }}>{idx + 1}</td>
                <td style={{ padding: '6px 10px', fontWeight: 500, color: from?.color || t.textPrimary, fontSize: '11px' }}>
                  {from?.label || msg.fromId}
                </td>
                <td style={{ padding: '6px 10px', fontWeight: 500, color: to?.color || t.textPrimary, fontSize: '11px' }}>
                  {to?.label || msg.toId}
                </td>
                <td style={{ padding: '6px 10px', color: t.textPrimary, fontSize: '12px' }}>
                  {msg.label}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <span style={{ color: ts.color, fontSize: '11px', fontWeight: 500 }}>{ts.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: '8px', fontSize: '10px', color: t.textSecondary, opacity: 0.6, fontStyle: 'italic' }}>
        From Sequence View · {new Date().toLocaleDateString()}
      </div>
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
export function renderSection(section: SectionDef, data: any, onChange: (id: string, d: any) => void, readOnly: boolean, theme: any, nodes?: any[], edges?: any[]) {
  const props = { section, data, onChange, readOnly, theme };

  switch (section.type) {
    case 'static':
      return <StaticSection {...props} />;
    case 'dynamic_table':
      return section.data_source === 'manual'
        ? <ManualTableSection {...props} />
        : <DynamicRequirementsTable {...props} nodes={nodes} edges={edges} />;
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
      return <DynamicArchitectureView {...props} nodes={nodes} edges={edges} />;
    case 'sequence_embed':
      return <DynamicSequenceEmbed {...props} nodes={nodes} edges={edges} />;
    case 'component_list':
      return <DynamicComponentList {...props} nodes={nodes} edges={edges} />;
    case 'io_list':
      return <DynamicIOList {...props} nodes={nodes} edges={edges} />;
    case 'alarm_list':
      return <DynamicAlarmList {...props} nodes={nodes} edges={edges} />;
    default:
      return <PlaceholderSection section={section} theme={theme} />;
  }
}
