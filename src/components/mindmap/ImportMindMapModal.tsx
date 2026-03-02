// ═══════════════════════════════════════════════════════════════
// Northlight Mind Map — Import Modal
// Supports: Indented Text/Markdown, Miro CSV, PDF
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback } from 'react';
import type { MindMapNodeData } from './mindmapTypes';
import { parseIndentedText, parseMiroCSV, extractPDFText, parsePDFText } from './mindmapImport';

type ImportMode = 'text' | 'miro' | 'pdf';

interface Props {
  colors: Record<string, string>;
  onImport: (rootNode: MindMapNodeData, name: string) => void;
  onClose: () => void;
}

// ── Preview tree renderer ──
function TreePreview({ node, depth = 0, maxDepth = 4 }: { node: MindMapNodeData; depth?: number; maxDepth?: number }) {
  if (depth > maxDepth) return null;
  const childCount = (node.children || []).length;
  return (
    <div style={{ marginLeft: depth * 16, fontSize: 12, lineHeight: 1.8 }}>
      <span style={{
        color: node.color || '#94a3b8',
        fontWeight: depth < 2 ? 600 : 400,
      }}>
        {depth > 0 && <span style={{ opacity: 0.3, marginRight: 4 }}>├─</span>}
        {node.label}
        {node.sublabel && <span style={{ opacity: 0.5, marginLeft: 6, fontSize: 10 }}>{node.sublabel}</span>}
        {depth === maxDepth && childCount > 0 && (
          <span style={{ opacity: 0.4, marginLeft: 6, fontSize: 10 }}>+{childCount} more…</span>
        )}
      </span>
      {(node.children || []).map(c => (
        <TreePreview key={c.id} node={c} depth={depth + 1} maxDepth={maxDepth} />
      ))}
    </div>
  );
}

function countNodes(node: MindMapNodeData): number {
  return 1 + (node.children || []).reduce((sum, c) => sum + countNodes(c), 0);
}

function maxTreeDepth(node: MindMapNodeData, d = 0): number {
  if (!node.children?.length) return d;
  return Math.max(...node.children.map(c => maxTreeDepth(c, d + 1)));
}

export default function ImportMindMapModal({ colors: c, onImport, onClose }: Props) {
  const [mode, setMode] = useState<ImportMode>('text');
  const [textInput, setTextInput] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<MindMapNodeData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapName, setMapName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Parse text input ──
  const handleTextParse = useCallback(() => {
    setError('');
    try {
      const result = parseIndentedText(textInput);
      if (!result) { setError('Could not parse text — check indentation or headings'); return; }
      setPreview(result);
      if (!mapName) setMapName(result.label || 'Imported Map');
    } catch (e: any) {
      setError(e.message || 'Parse error');
    }
  }, [textInput, mapName]);

  // ── Handle file upload ──
  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setPreview(null);
    setLoading(true);

    try {
      if (mode === 'miro') {
        const text = await file.text();
        const result = parseMiroCSV(text);
        if (!result) { setError('Could not parse CSV — expected Miro export format'); setLoading(false); return; }
        setPreview(result);
        if (!mapName) setMapName(file.name.replace(/\.\w+$/, ''));
      } else if (mode === 'pdf') {
        const rawText = await extractPDFText(file);
        const result = parsePDFText(rawText);
        setPreview(result);
        if (!mapName) setMapName(file.name.replace(/\.pdf$/i, ''));
      }
    } catch (e: any) {
      console.error('Import error:', e);
      setError(e.message || 'Failed to parse file');
    }
    setLoading(false);
  }, [mode, mapName]);

  // ── Confirm import ──
  const handleImport = useCallback(() => {
    if (!preview) return;
    onImport(preview, mapName || preview.label || 'Imported Map');
  }, [preview, mapName, onImport]);

  const modes: { id: ImportMode; label: string; icon: string; desc: string }[] = [
    { id: 'text', label: 'Text / Markdown', icon: '📝', desc: 'Paste indented text or markdown headings' },
    { id: 'miro', label: 'Miro CSV', icon: '🔷', desc: 'Upload Miro board CSV export' },
    { id: 'pdf', label: 'PDF', icon: '📄', desc: 'Extract structure from PDF document' },
  ];

  const btnStyle: React.CSSProperties = {
    padding: '6px 14px', borderRadius: 6, border: `1px solid ${c.border}`,
    background: c.surface, color: c.text, fontSize: 12, cursor: 'pointer',
    fontFamily: "'IBM Plex Sans', sans-serif",
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12,
        width: 680, maxHeight: '85vh', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)', color: c.text,
        display: 'flex', flexDirection: 'column',
        fontFamily: "'IBM Plex Sans', sans-serif",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${c.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>📥</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Import Mind Map</div>
            <div style={{ fontSize: 11, color: c.textMuted }}>Create a mind map from external content</div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: c.textMuted,
            fontSize: 18, cursor: 'pointer', padding: '2px 6px',
          }}>✕</button>
        </div>

        {/* Mode tabs */}
        <div style={{
          display: 'flex', gap: 4, padding: '12px 20px',
          borderBottom: `1px solid ${c.border}`,
        }}>
          {modes.map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setPreview(null); setError(''); setFileName(''); }}
              style={{
                ...btnStyle,
                background: mode === m.id ? c.primarySubtle : c.surface,
                borderColor: mode === m.id ? c.primary : c.border,
                color: mode === m.id ? c.primary : c.textSecondary,
                fontWeight: mode === m.id ? 600 : 400,
              }}>
              <span style={{ marginRight: 4 }}>{m.icon}</span> {m.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {/* Description */}
          <div style={{ fontSize: 11, color: c.textMuted, marginBottom: 12 }}>
            {modes.find(m => m.id === mode)?.desc}
          </div>

          {/* TEXT MODE */}
          {mode === 'text' && (
            <>
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder={`Paste your content here…\n\nSupported formats:\n\n# Markdown Headings\n## Sub-heading\n### Sub-sub-heading\n- Bullet point\n\nOr indented text:\nRoot Topic\n  Branch 1\n    Leaf 1.1\n    Leaf 1.2\n  Branch 2\n    Leaf 2.1`}
                style={{
                  width: '100%', height: 200, padding: 12,
                  background: c.surfaceHover, border: `1px solid ${c.border}`,
                  borderRadius: 8, color: c.text, fontSize: 13,
                  fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.6,
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={handleTextParse} style={{ ...btnStyle, background: c.primary, color: '#fff', borderColor: c.primary }}
                  disabled={!textInput.trim()}>
                  🔍 Parse
                </button>
                <button onClick={() => { setTextInput(''); setPreview(null); }} style={btnStyle}>
                  Clear
                </button>
              </div>
            </>
          )}

          {/* MIRO / PDF MODE */}
          {(mode === 'miro' || mode === 'pdf') && (
            <>
              <input ref={fileRef} type="file" hidden
                accept={mode === 'miro' ? '.csv,.tsv' : '.pdf'}
                onChange={handleFile} />
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${c.border}`, borderRadius: 10,
                  padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                  background: c.surfaceHover, transition: 'border-color 200ms',
                }}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = c.primary; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = c.border; }}
                onDrop={e => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = c.border;
                  const file = e.dataTransfer.files[0];
                  if (file && fileRef.current) {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    fileRef.current.files = dt.files;
                    fileRef.current.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  {mode === 'miro' ? '🔷' : '📄'}
                </div>
                <div style={{ fontSize: 13, color: c.text, fontWeight: 600 }}>
                  {fileName || `Drop ${mode === 'miro' ? 'CSV' : 'PDF'} here or click to browse`}
                </div>
                <div style={{ fontSize: 11, color: c.textMuted, marginTop: 4 }}>
                  {mode === 'miro'
                    ? 'Export from Miro: Board → Export → CSV'
                    : 'Headings and numbered sections become branches'}
                </div>
              </div>
              {loading && (
                <div style={{ textAlign: 'center', padding: 16, color: c.primary, fontSize: 13 }}>
                  ⏳ Processing file…
                </div>
              )}
            </>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: 12, padding: '8px 12px', borderRadius: 6,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: 12,
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>Preview</span>
                <span style={{ fontSize: 10, color: c.textMuted }}>
                  {countNodes(preview)} nodes · {maxTreeDepth(preview)} levels deep
                </span>
              </div>

              <div style={{
                background: c.surfaceHover, border: `1px solid ${c.border}`,
                borderRadius: 8, padding: 12, maxHeight: 200, overflow: 'auto',
              }}>
                <TreePreview node={preview} />
              </div>

              {/* Map name */}
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, color: c.textSecondary, whiteSpace: 'nowrap' }}>Map name:</label>
                <input
                  value={mapName}
                  onChange={e => setMapName(e.target.value)}
                  style={{
                    flex: 1, padding: '5px 10px', background: c.surfaceHover,
                    border: `1px solid ${c.border}`, borderRadius: 6,
                    color: c.text, fontSize: 12,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${c.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button onClick={onClose} style={btnStyle}>Cancel</button>
          <button
            onClick={handleImport}
            disabled={!preview}
            style={{
              ...btnStyle,
              background: preview ? c.primary : c.surfaceHover,
              color: preview ? '#fff' : c.textMuted,
              borderColor: preview ? c.primary : c.border,
              fontWeight: 600,
            }}>
            📥 Import as New Map
          </button>
        </div>
      </div>
    </div>
  );
}
