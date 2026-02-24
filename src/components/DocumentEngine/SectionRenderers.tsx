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
    case 'sequence_embed':
    case 'component_list':
    case 'io_list':
    case 'alarm_list':
      return <PlaceholderSection section={section} theme={theme} />;
    default:
      return <PlaceholderSection section={section} theme={theme} />;
  }
}
