import React, { useState, useMemo, useCallback } from 'react';
import {
  COMPONENT_FAMILIES, FAMILY_COLORS, SIGNAL_TYPES,
  getSignalsForVariant, countSignals, getFeaturesForVariant,
  getConfigForVariant, searchLibrary, getTotalVariantCount,
} from '../../data/metsComponentLibrary';
import type { METSSignal, METSConfigParam } from '../../data/metsComponentLibrary';

interface METSLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAddComponent: (familyKey: string, variantKey: string) => void;
}

export default function METSLibraryPanel({ isOpen, onClose, onAddComponent }: METSLibraryPanelProps) {
  const [search, setSearch] = useState('');
  const [expandedFamily, setExpandedFamily] = useState<string | null>('VALVC');
  const [selectedComp, setSelectedComp] = useState<{ fk: string; vk: string } | null>(null);
  const [detailTab, setDetailTab] = useState<'signals' | 'interface' | 'states' | 'config'>('signals');

  const totalFamilies = Object.keys(COMPONENT_FAMILIES).length;
  const totalVariants = useMemo(() => getTotalVariantCount(), []);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return COMPONENT_FAMILIES;
    const results = searchLibrary(search);
    const map: Record<string, typeof COMPONENT_FAMILIES[string]> = {};
    results.forEach(({ familyKey, variantKey }) => {
      if (!map[familyKey]) {
        map[familyKey] = { ...COMPONENT_FAMILIES[familyKey], variants: {} };
      }
      (map[familyKey] as any).variants[variantKey] = COMPONENT_FAMILIES[familyKey].variants[variantKey];
    });
    return map;
  }, [search]);

  const handleDragStart = useCallback((e: React.DragEvent, fk: string, vk: string) => {
    e.dataTransfer.setData('application/northlight-mets-component', JSON.stringify({ familyKey: fk, variantKey: vk }));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // Selected detail
  const selFamily = selectedComp ? COMPONENT_FAMILIES[selectedComp.fk] : null;
  const selVariant = selFamily?.variants[selectedComp?.vk || ''];
  const selSignals = useMemo(() => selectedComp ? getSignalsForVariant(selectedComp.fk, selectedComp.vk) : [], [selectedComp]);
  const selConfig = useMemo(() => selectedComp ? getConfigForVariant(selectedComp.fk, selectedComp.vk) : [], [selectedComp]);
  const selFeatures = useMemo(() => selectedComp ? getFeaturesForVariant(selectedComp.fk, selectedComp.vk) : [], [selectedComp]);
  const selColor = selectedComp ? FAMILY_COLORS[selectedComp.fk] : null;

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: '380px', height: '100vh',
      backgroundColor: '#111827', boxShadow: '-4px 0 20px rgba(0,0,0,0.4)',
      zIndex: 3500, display: 'flex', flexDirection: 'column',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    }}>
      {/* ── Header ── */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              🔧 METS Komponentbibliotek
            </h3>
            <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 11 }}>
              {totalFamilies} familjer · {totalVariants} varianter — METS Standard v1.0
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginTop: 12 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: 13, pointerEvents: 'none' }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sök komponent, SWC, signal..."
            style={{
              width: '100%', padding: '8px 10px 8px 32px', background: '#0a0e17',
              border: '1px solid #1e293b', borderRadius: 6, color: '#e2e8f0', fontSize: 12,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 12 }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Family list ── */}
      <div style={{ flex: selectedComp ? '0 0 auto' : 1, overflowY: 'auto', maxHeight: selectedComp ? '45%' : undefined }}>
        {Object.entries(filtered).map(([fk, family]) => {
          const fc = FAMILY_COLORS[fk];
          const isExp = expandedFamily === fk || search.trim().length > 0;
          const variantCount = Object.keys(family.variants).length;

          return (
            <div key={fk}>
              {/* Family header */}
              <div
                onClick={() => setExpandedFamily(isExp && !search ? null : fk)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 20px', cursor: 'pointer',
                  background: isExp ? `${fc.dim}15` : 'transparent',
                  borderBottom: '1px solid #1e293b10',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{family.icon}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: fc.primary, fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>{fk}</span>
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>{family.name}</span>
                    </div>
                    <div style={{ color: '#475569', fontSize: 9 }}>{family.description.split('—')[0].trim()}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ background: `${fc.primary}20`, color: fc.primary, padding: '0 6px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>{variantCount}</span>
                  <span style={{ color: '#475569', fontSize: 10 }}>{isExp ? '▼' : '▶'}</span>
                </div>
              </div>

              {/* Variant cards */}
              {isExp && Object.entries(family.variants).map(([vk, variant]) => {
                const sigs = countSignals(fk, vk);
                const isSel = selectedComp?.fk === fk && selectedComp?.vk === vk;

                return (
                  <div
                    key={vk}
                    draggable
                    onDragStart={e => handleDragStart(e, fk, vk)}
                    onClick={() => setSelectedComp(isSel ? null : { fk, vk })}
                    style={{
                      margin: '2px 10px', padding: '8px 10px',
                      background: isSel ? `${fc.dim}30` : '#1a2332',
                      border: `1px solid ${isSel ? fc.primary : 'transparent'}`,
                      borderRadius: 6, cursor: 'grab',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: fc.primary, fontWeight: 600, fontSize: 11, fontFamily: 'monospace' }}>{variant.name}</div>
                      <div style={{ color: '#475569', fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{variant.description}</div>
                      <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                        {(['DI', 'DO', 'AI', 'AO'] as const).map(t => sigs[t] > 0 && (
                          <span key={t} style={{
                            background: `${SIGNAL_TYPES[t].color}15`, color: SIGNAL_TYPES[t].color,
                            padding: '0 4px', borderRadius: 3, fontSize: 8, fontWeight: 700,
                          }}>{sigs[t]}{t}</span>
                        ))}
                        <span style={{ color: '#475569', fontSize: 8, marginLeft: 'auto' }}>Σ{sigs.total}</span>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); onAddComponent(fk, vk); }}
                      style={{
                        background: `${fc.primary}20`, border: `1px solid ${fc.primary}40`,
                        color: fc.primary, borderRadius: 4, width: 24, height: 24,
                        fontSize: 14, cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 8,
                      }}
                      title="Lägg till på canvas"
                    >+</button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── Detail panel ── */}
      {selectedComp && selFamily && selVariant && selColor && (
        <div style={{ borderTop: `2px solid ${selColor.primary}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          {/* Detail header */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{selFamily.icon}</span>
                <span style={{ color: selColor.primary, fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{selVariant.name}</span>
              </div>
              <button onClick={() => setSelectedComp(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>{selVariant.description}</div>
            <div style={{ color: '#475569', fontSize: 9, marginTop: 2 }}>
              Extends: <span style={{ fontFamily: 'monospace' }}>{selFamily.baseClass}</span>
              {' | '}
              Implements: <span style={{ color: selColor.primary, fontFamily: 'monospace' }}>{selFamily.interface.name}</span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
            {([
              { id: 'signals' as const, label: 'Signaler', count: selSignals.length },
              { id: 'interface' as const, label: 'Interface', count: null },
              { id: 'states' as const, label: 'Tillstånd', count: selFamily.states.length },
              { id: 'config' as const, label: 'Config', count: selConfig.length },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setDetailTab(tab.id)}
                style={{
                  flex: 1, background: detailTab === tab.id ? '#1a2332' : 'transparent',
                  border: 'none',
                  borderBottom: detailTab === tab.id ? `2px solid ${selColor.primary}` : '2px solid transparent',
                  color: detailTab === tab.id ? '#e2e8f0' : '#475569',
                  padding: '6px 4px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {tab.label}{tab.count !== null ? ` (${tab.count})` : ''}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
            {detailTab === 'signals' && selSignals.map((sig: METSSignal, i: number) => (
              <div key={sig.name} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
                borderBottom: i < selSignals.length - 1 ? '1px solid #1e293b20' : 'none',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: SIGNAL_TYPES[sig.type]?.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace' }}>{sig.name}</div>
                  <div style={{ color: '#475569', fontSize: 9 }}>{sig.desc}</div>
                </div>
                <span style={{ color: SIGNAL_TYPES[sig.type]?.color, fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{sig.type}</span>
              </div>
            ))}

            {detailTab === 'interface' && (
              <div>
                <div style={{ fontSize: 9, color: selColor.primary, fontWeight: 600, marginBottom: 4 }}>Properties</div>
                {selFamily.interface.properties.map(p => (
                  <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', fontSize: 10 }}>
                    <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{p.name}</span>
                    <span style={{ color: '#475569', fontFamily: 'monospace', fontSize: 9 }}>{p.type}</span>
                  </div>
                ))}
                {selFamily.interface.methods.length > 0 && (
                  <>
                    <div style={{ fontSize: 9, color: selColor.primary, fontWeight: 600, marginTop: 10, marginBottom: 4 }}>Methods</div>
                    {selFamily.interface.methods.map(m => (
                      <div key={m.name} style={{ padding: '1px 0', fontSize: 10 }}>
                        <span style={{ color: '#10b981', fontFamily: 'monospace' }}>{m.name}</span>
                        <span style={{ color: '#475569' }}> : {m.returns}</span>
                        {m.params && m.params.length > 0 && <span style={{ color: '#475569', fontSize: 9 }}> ({m.params.join(', ')})</span>}
                      </div>
                    ))}
                  </>
                )}
                {selFeatures.length > 0 && (
                  <>
                    <div style={{ fontSize: 9, color: '#475569', fontWeight: 600, marginTop: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>Features</div>
                    {selFeatures.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: 5, padding: '1px 0', fontSize: 10, color: '#94a3b8' }}>
                        <span style={{ color: '#10b981', fontSize: 8, marginTop: 3 }}>●</span>{f}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {detailTab === 'states' && (
              <div>
                <div style={{ background: '#1a2332', borderRadius: 4, padding: '4px 8px', marginBottom: 8, fontSize: 9, color: '#94a3b8', fontFamily: 'monospace' }}>
                  {selFamily.stateFlow}
                </div>
                {selFamily.states.map(s => (
                  <div key={s.name} style={{ padding: '4px 0', borderBottom: '1px solid #1e293b15' }}>
                    <span style={{
                      display: 'inline-block', padding: '1px 6px', borderRadius: 3,
                      fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
                      background: (s.name === 'FAULT' || s.name === 'TRIPPED') ? '#7f1d1d' : `${selColor.primary}20`,
                      color: (s.name === 'FAULT' || s.name === 'TRIPPED') ? '#ef4444' : selColor.primary,
                    }}>{s.name}</span>
                    <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>
                      <span style={{ color: '#94a3b8' }}>Entry:</span> {s.entry} · <span style={{ color: '#94a3b8' }}>Exit:</span> {s.exit}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detailTab === 'config' && (
              selConfig.length === 0
                ? <div style={{ color: '#475569', fontSize: 11, fontStyle: 'italic' }}>Ingen extra konfiguration</div>
                : selConfig.map((cfg: METSConfigParam, i: number) => (
                  <div key={i} style={{ padding: '4px 0', borderBottom: i < selConfig.length - 1 ? '1px solid #1e293b15' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace' }}>{cfg.name}</span>
                      <span style={{ color: '#f59e0b', fontSize: 10, fontFamily: 'monospace' }}>{cfg.default}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#475569', marginTop: 1 }}>
                      <span>{cfg.desc}</span>
                      <span style={{ fontFamily: 'monospace' }}>{cfg.type}</span>
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Used by */}
          <div style={{ padding: '8px 16px', borderTop: '1px solid #1e293b', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: '#475569', fontWeight: 600 }}>Används i:</span>
              {selFamily.usedBy.map(sys => (
                <span key={sys} style={{
                  background: `${selColor.primary}15`, color: selColor.primary,
                  padding: '0 5px', borderRadius: 3, fontSize: 9, lineHeight: '16px',
                }}>{sys}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ padding: '10px 20px', borderTop: '1px solid #1e293b', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: '#475569' }}>Dra komponent till canvas eller klicka +</span>
        <span style={{ fontSize: 9, color: '#064e3b', background: '#10b98110', padding: '1px 6px', borderRadius: 3 }}>METS v1.0</span>
      </div>
    </div>
  );
}
