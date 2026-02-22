// src/components/DocumentEngine/DocumentEngine.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDocuments, type DocTemplate, type Document } from './useDocuments';
import { renderSection } from './SectionRenderers';
import type { NorthlightTheme } from '../../theme';

interface Props {
  projectId: string | null;
  theme: NorthlightTheme;
}

type Screen = 'list' | 'templates' | 'editor' | 'create';

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  requirements: { label: 'Requirements', icon: '📋' },
  architecture: { label: 'Architecture', icon: '🏗️' },
  standard: { label: 'Standards & Procedures', icon: '📖' },
  risk: { label: 'Risk Analysis', icon: '⚠️' },
  functional: { label: 'Functional', icon: '⚙️' },
  manual: { label: 'Manuals', icon: '📘' },
  test: { label: 'Test Documents', icon: '🧪' },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: '#3b82f6', color: '#fff', label: 'Draft' },
  review: { bg: '#f59e0b', color: '#000', label: 'Review' },
  approved: { bg: '#22c55e', color: '#fff', label: 'Approved' },
  released: { bg: '#8b5cf6', color: '#fff', label: 'Released' },
};

export default function DocumentEngine({ projectId, theme }: Props) {
  const t = theme;
  const {
    templates, documents, activeDoc,
    loading, saving, error,
    setActiveDoc, setError,
    createDocument, openDocument, saveDocument, deleteDocument,
    createNewVersion, cloneTemplate,
  } = useDocuments(projectId);

  const [screen, setScreen] = useState<Screen>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<DocTemplate | null>(null);
  const [createTitle, setCreateTitle] = useState('');
  const [createMetadata, setCreateMetadata] = useState<Record<string, any>>({});
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // Auto-save timer
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingChangesRef = useRef<Record<string, any> | null>(null);

  // Debounced save
  const debouncedSave = useCallback((docId: string, sectionData: Record<string, any>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    pendingChangesRef.current = sectionData;
    saveTimerRef.current = setTimeout(() => {
      saveDocument(docId, { section_data: sectionData });
      pendingChangesRef.current = null;
    }, 1500);
  }, [saveDocument]);

  // Section change handler
  const handleSectionChange = useCallback((sectionId: string, data: any) => {
    if (!activeDoc) return;
    const updated = { ...activeDoc.section_data, [sectionId]: data };
    // Update local state immediately
    setActiveDoc({ ...activeDoc, section_data: updated } as any);
    // Debounce save to backend
    debouncedSave(activeDoc.id, updated);
  }, [activeDoc, setActiveDoc, debouncedSave]);

  // Metadata change handler
  const handleMetadataChange = useCallback((key: string, value: any) => {
    if (!activeDoc) return;
    const updated = { ...activeDoc.metadata, [key]: value };
    setActiveDoc({ ...activeDoc, metadata: updated } as any);
    saveDocument(activeDoc.id, { metadata: updated });
  }, [activeDoc, setActiveDoc, saveDocument]);

  // Status change handler
  const handleStatusChange = useCallback((status: string) => {
    if (!activeDoc) return;
    saveDocument(activeDoc.id, { status });
    setActiveDoc({ ...activeDoc, status: status as any } as any);
  }, [activeDoc, setActiveDoc, saveDocument]);

  // Create document
  const handleCreate = useCallback(async () => {
    if (!selectedTemplate || !createTitle.trim()) return;
    const doc = await createDocument(selectedTemplate.id, createTitle.trim(), createMetadata);
    if (doc) {
      await openDocument(doc.id);
      setScreen('editor');
      setCreateTitle('');
      setCreateMetadata({});
      setSelectedTemplate(null);
    }
  }, [selectedTemplate, createTitle, createMetadata, createDocument, openDocument]);

  // Filtered documents
  const filteredDocs = documents.filter(d => {
    if (filterCategory !== 'all' && d.template_category !== filterCategory) return false;
    if (searchText && !d.title.toLowerCase().includes(searchText.toLowerCase()) &&
        !d.doc_number?.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, DocTemplate[]>);

  // ═══════════════════════════════════════════════════════════
  // RENDER: Document List
  // ═══════════════════════════════════════════════════════════
  const renderDocumentList = () => (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: t.textPrimary, margin: 0, fontSize: '20px' }}>📄 Project Documents</h2>
        <button
          onClick={() => setScreen('templates')}
          style={{
            padding: '8px 20px',
            background: t.accent,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
          }}
        >
          + New Document
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search documents..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            flex: 1, padding: '8px 12px',
            background: t.bgInput, color: t.textPrimary,
            border: `1px solid ${t.border}`, borderRadius: '6px', fontSize: '13px',
          }}
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding: '8px 12px',
            background: t.bgInput, color: t.textPrimary,
            border: `1px solid ${t.border}`, borderRadius: '6px', fontSize: '13px',
          }}
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => (
            <option key={key} value={key}>{icon} {label}</option>
          ))}
        </select>
      </div>

      {/* Document grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: t.textSecondary }}>Loading documents...</div>
      ) : filteredDocs.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px',
          color: t.textSecondary,
          border: `2px dashed ${t.border}`,
          borderRadius: '12px',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📄</div>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>No documents yet</div>
          <div style={{ fontSize: '13px' }}>Click "New Document" to create one from a template</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {filteredDocs.map(doc => {
            const cat = CATEGORY_LABELS[doc.template_category || ''] || { label: '', icon: '📄' };
            const status = STATUS_STYLES[doc.status] || STATUS_STYLES.draft;
            return (
              <div
                key={doc.id}
                onClick={() => { openDocument(doc.id); setScreen('editor'); }}
                style={{
                  padding: '16px',
                  background: t.bgCard,
                  border: `1px solid ${t.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = t.accent)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: t.textSecondary }}>
                    {cat.icon} {doc.template_name || 'Document'}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                    background: status.bg, color: status.color,
                  }}>
                    {status.label}
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: t.textPrimary, marginBottom: '4px' }}>
                  {doc.title}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: t.textSecondary }}>
                  <span>{doc.doc_number}</span>
                  <span>v{doc.version}</span>
                </div>
                <div style={{ fontSize: '10px', color: t.textSecondary, marginTop: '6px' }}>
                  Updated: {new Date(doc.updated_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: Template Browser
  // ═══════════════════════════════════════════════════════════
  const renderTemplateBrowser = () => (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => setScreen('list')} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary, fontSize: '16px',
        }}>← Back</button>
        <h2 style={{ color: t.textPrimary, margin: 0, fontSize: '20px' }}>Choose Template</h2>
      </div>

      {Object.entries(templatesByCategory).map(([cat, tmpls]) => {
        const catInfo = CATEGORY_LABELS[cat] || { label: cat, icon: '📄' };
        return (
          <div key={cat} style={{ marginBottom: '24px' }}>
            <h3 style={{ color: t.textPrimary, fontSize: '14px', marginBottom: '10px' }}>
              {catInfo.icon} {catInfo.label}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
              {tmpls.map(tmpl => (
                <div
                  key={tmpl.id}
                  onClick={() => { setSelectedTemplate(tmpl); setScreen('create'); }}
                  style={{
                    padding: '14px',
                    background: t.bgCard,
                    border: `1px solid ${t.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = t.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}
                >
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: t.textPrimary, marginBottom: '4px' }}>
                    {tmpl.name}
                  </div>
                  <div style={{ fontSize: '12px', color: t.textSecondary }}>
                    {tmpl.description}
                  </div>
                  <div style={{ fontSize: '10px', color: t.textSecondary, marginTop: '6px' }}>
                    {tmpl.schema?.sections?.length || 0} sections · v{tmpl.version}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: Create Document Form
  // ═══════════════════════════════════════════════════════════
  const renderCreateForm = () => {
    if (!selectedTemplate) return null;
    const metaFields = selectedTemplate.schema?.metadata_fields || [];

    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => setScreen('templates')} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary, fontSize: '16px',
          }}>← Back</button>
          <h2 style={{ color: t.textPrimary, margin: 0, fontSize: '20px' }}>
            New: {selectedTemplate.name}
          </h2>
        </div>

        <div style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: '8px',
          padding: '24px',
        }}>
          {/* Title */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: t.textSecondary, marginBottom: '6px' }}>
              Document Title *
            </label>
            <input
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder={`${selectedTemplate.name} — ...`}
              style={{
                width: '100%', padding: '10px 12px',
                background: t.bgInput, color: t.textPrimary,
                border: `1px solid ${t.border}`, borderRadius: '6px', fontSize: '14px',
              }}
              autoFocus
            />
          </div>

          {/* Metadata fields */}
          {metaFields.map(field => (
            <div key={field.key} style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: t.textSecondary, marginBottom: '4px' }}>
                {field.label} {field.required ? '*' : ''}
              </label>
              {field.type === 'select' ? (
                <select
                  value={createMetadata[field.key] || ''}
                  onChange={(e) => setCreateMetadata({ ...createMetadata, [field.key]: e.target.value })}
                  style={{
                    width: '100%', padding: '8px 12px',
                    background: t.bgInput, color: t.textPrimary,
                    border: `1px solid ${t.border}`, borderRadius: '6px', fontSize: '13px',
                  }}
                >
                  <option value="">Select...</option>
                  {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <input
                  type={field.type === 'date' ? 'date' : 'text'}
                  value={createMetadata[field.key] || ''}
                  onChange={(e) => setCreateMetadata({ ...createMetadata, [field.key]: e.target.value })}
                  style={{
                    width: '100%', padding: '8px 12px',
                    background: t.bgInput, color: t.textPrimary,
                    border: `1px solid ${t.border}`, borderRadius: '6px', fontSize: '13px',
                  }}
                />
              )}
            </div>
          ))}

          <button
            onClick={handleCreate}
            disabled={!createTitle.trim()}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '12px',
              background: createTitle.trim() ? t.accent : t.bgInput,
              color: createTitle.trim() ? '#fff' : t.textSecondary,
              border: 'none',
              borderRadius: '6px',
              cursor: createTitle.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            Create Document
          </button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER: Document Editor
  // ═══════════════════════════════════════════════════════════
  const renderEditor = () => {
    if (!activeDoc) return (
      <div style={{ textAlign: 'center', padding: '60px', color: t.textSecondary }}>Loading document...</div>
    );

    const schema = activeDoc.template_schema;
    const sections = schema?.sections || [];
    const metaFields = schema?.metadata_fields || [];
    const isReadOnly = activeDoc.status === 'released';
    const status = STATUS_STYLES[activeDoc.status] || STATUS_STYLES.draft;

    return (
      <div style={{ display: 'flex', height: '100%' }}>
        {/* Sidebar — sections nav */}
        <div style={{
          width: '240px',
          borderRight: `1px solid ${t.border}`,
          background: t.bgPanel,
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          <div style={{ padding: '16px' }}>
            <button onClick={() => { setActiveDoc(null); setScreen('list'); }} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary,
              fontSize: '12px', marginBottom: '12px',
            }}>← Back to Documents</button>

            <div style={{ fontSize: '13px', fontWeight: 'bold', color: t.textPrimary, marginBottom: '4px' }}>
              {activeDoc.doc_number}
            </div>
            <div style={{ fontSize: '11px', color: t.textSecondary, marginBottom: '16px' }}>
              v{activeDoc.version} · {status.label}
            </div>
          </div>

          {/* Section links */}
          <div>
            {sections.map((sec, idx) => (
              <a
                key={sec.id}
                href={`#section-${sec.id}`}
                style={{
                  display: 'block',
                  padding: '8px 16px',
                  fontSize: '12px',
                  color: t.textPrimary,
                  textDecoration: 'none',
                  borderLeft: `3px solid transparent`,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${t.accent}15`;
                  e.currentTarget.style.borderLeftColor = t.accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderLeftColor = 'transparent';
                }}
              >
                {sec.title}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div style={{ padding: '16px', borderTop: `1px solid ${t.border}`, marginTop: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: t.textSecondary, marginBottom: '8px' }}>Status</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '16px' }}>
              {Object.entries(STATUS_STYLES).map(([key, style]) => (
                <button
                  key={key}
                  onClick={() => handleStatusChange(key)}
                  style={{
                    padding: '3px 10px', borderRadius: '4px',
                    border: activeDoc.status === key ? `2px solid ${style.bg}` : `1px solid ${t.border}`,
                    background: activeDoc.status === key ? style.bg : 'transparent',
                    color: activeDoc.status === key ? style.color : t.textSecondary,
                    cursor: 'pointer', fontSize: '10px', fontWeight: 'bold',
                  }}
                >
                  {style.label}
                </button>
              ))}
            </div>

            {saving && (
              <div style={{ fontSize: '10px', color: t.accent, marginBottom: '8px' }}>💾 Saving...</div>
            )}

            <button
              onClick={() => {
                const changes = prompt('Version changes:');
                if (changes !== null) createNewVersion(activeDoc.id, changes);
              }}
              style={{
                width: '100%', padding: '6px',
                background: t.bgInput, color: t.textPrimary,
                border: `1px solid ${t.border}`, borderRadius: '4px',
                cursor: 'pointer', fontSize: '11px', marginBottom: '6px',
              }}
            >
              📋 New Version
            </button>

            <button
              onClick={() => {
                if (confirm('Delete this document?')) {
                  deleteDocument(activeDoc.id);
                  setScreen('list');
                }
              }}
              style={{
                width: '100%', padding: '6px',
                background: 'transparent', color: '#ef4444',
                border: `1px solid #ef444444`, borderRadius: '4px',
                cursor: 'pointer', fontSize: '11px',
              }}
            >
              🗑️ Delete
            </button>
          </div>
        </div>

        {/* Main content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          background: t.bgMain,
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Document header */}
            <div style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: '8px',
              padding: '24px',
              marginBottom: '20px',
            }}>
              <input
                type="text"
                value={activeDoc.title}
                onChange={(e) => {
                  setActiveDoc({ ...activeDoc, title: e.target.value } as any);
                  saveDocument(activeDoc.id, { title: e.target.value });
                }}
                readOnly={isReadOnly}
                style={{
                  width: '100%', fontSize: '20px', fontWeight: 'bold',
                  background: 'transparent', color: t.textPrimary,
                  border: 'none', marginBottom: '12px',
                }}
              />

              {/* Metadata fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {metaFields.map(field => (
                  <div key={field.key}>
                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: t.textSecondary }}>
                      {field.label}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={activeDoc.metadata?.[field.key] || ''}
                        onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                        disabled={isReadOnly}
                        style={{
                          width: '100%', padding: '6px 8px',
                          background: t.bgInput, color: t.textPrimary,
                          border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '12px',
                        }}
                      >
                        <option value="">—</option>
                        {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'date' ? 'date' : 'text'}
                        value={activeDoc.metadata?.[field.key] || ''}
                        onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                        readOnly={isReadOnly}
                        style={{
                          width: '100%', padding: '6px 8px',
                          background: t.bgInput, color: t.textPrimary,
                          border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '12px',
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sections */}
            {sections.map((sec) => (
              <div
                key={sec.id}
                id={`section-${sec.id}`}
                style={{
                  background: t.bgCard,
                  border: `1px solid ${t.border}`,
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '12px',
                }}
              >
                <h3 style={{
                  color: t.textPrimary,
                  fontSize: '15px',
                  marginTop: 0,
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: `1px solid ${t.border}`,
                }}>
                  {sec.title}
                </h3>
                {renderSection(
                  sec,
                  activeDoc.section_data?.[sec.id],
                  handleSectionChange,
                  isReadOnly,
                  t
                )}
              </div>
            ))}

            {/* Revision History */}
            {(activeDoc.revision_log?.length > 0) && (
              <div style={{
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '12px',
              }}>
                <h3 style={{ color: t.textPrimary, fontSize: '15px', marginTop: 0, marginBottom: '12px' }}>
                  Revision History
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      {['Version', 'Date', 'Author', 'Changes'].map(h => (
                        <th key={h} style={{
                          padding: '6px 8px', border: `1px solid ${t.border}`,
                          background: t.bgHeader, color: t.textPrimary, textAlign: 'left', fontWeight: 'bold',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeDoc.revision_log.map((rev, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '4px 8px', border: `1px solid ${t.border}`, color: t.textPrimary }}>{rev.version}</td>
                        <td style={{ padding: '4px 8px', border: `1px solid ${t.border}`, color: t.textPrimary }}>{rev.date}</td>
                        <td style={{ padding: '4px 8px', border: `1px solid ${t.border}`, color: t.textPrimary }}>{rev.author}</td>
                        <td style={{ padding: '4px 8px', border: `1px solid ${t.border}`, color: t.textPrimary }}>{rev.changes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: t.bgMain,
      color: t.textPrimary,
      overflow: 'auto',
    }}>
      {error && (
        <div style={{
          padding: '10px 20px',
          background: '#ef444420',
          color: '#ef4444',
          borderBottom: `1px solid #ef444440`,
          fontSize: '13px',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={{
            background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
          }}>✕</button>
        </div>
      )}

      {screen === 'list' && renderDocumentList()}
      {screen === 'templates' && renderTemplateBrowser()}
      {screen === 'create' && renderCreateForm()}
      {screen === 'editor' && renderEditor()}
    </div>
  );
}
