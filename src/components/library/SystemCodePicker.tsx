import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  SYSTEM_CODES, NAMING_FORMATS, EQUIPMENT_ABBREV,
  getNamingEngine, persistNamingEngine,
  type SystemCode, type NamingFormat,
} from '../../data/metsNamingStandards';
import { COMPONENT_FAMILIES, FAMILY_COLORS } from '../../data/metsComponentLibrary';

interface SystemCodePickerProps {
  isOpen: boolean;
  familyKey: string;
  variantKey: string;
  projectId?: string | null;
  onConfirm: (systemCode: string, names: { instanceName: string; posNo: string; label: string }) => void;
  onCancel: () => void;
}

export default function SystemCodePicker({
  isOpen, familyKey, variantKey, projectId, onConfirm, onCancel,
}: SystemCodePickerProps) {
  const [selectedSystem, setSelectedSystem] = useState<string>('');
  const [showAllSystems, setShowAllSystems] = useState(false);
  const [activeFormatId, setActiveFormatId] = useState<string>('mets-standard');
  const [customLabel, setCustomLabel] = useState('');
  const [useCustomLabel, setUseCustomLabel] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const engine = useMemo(() => getNamingEngine(projectId), [projectId]);
  const family = COMPONENT_FAMILIES[familyKey];
  const familyColor = FAMILY_COLORS[familyKey]?.primary || '#607d8b';

  // Suggested systems for this component family
  const suggestedSystems = useMemo(() => {
    return engine.suggestSystems(familyKey);
  }, [engine, familyKey]);

  const allSystems = useMemo(() => Object.values(SYSTEM_CODES), []);

  // Preview the generated name
  const preview = useMemo(() => {
    if (!selectedSystem || !family) return null;
    const fmt = NAMING_FORMATS.find(f => f.id === activeFormatId);
    if (fmt) engine.setFormat(fmt);
    return engine.preview(selectedSystem, familyKey, variantKey, family.name);
  }, [selectedSystem, familyKey, variantKey, family, activeFormatId, engine]);

  // Auto-select first suggested system
  useEffect(() => {
    if (isOpen && suggestedSystems.length > 0 && !selectedSystem) {
      setSelectedSystem(suggestedSystems[0].code);
    }
  }, [isOpen, suggestedSystems, selectedSystem]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSelectedSystem(suggestedSystems.length > 0 ? suggestedSystems[0].code : '');
      setShowAllSystems(false);
      setUseCustomLabel(false);
      setCustomLabel('');
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (isOpen) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
        if (e.key === 'Enter' && selectedSystem && preview) {
          handleConfirm();
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [isOpen, selectedSystem, preview]);

  const handleConfirm = () => {
    if (!selectedSystem || !family) return;
    const fmt = NAMING_FORMATS.find(f => f.id === activeFormatId);
    if (fmt) engine.setFormat(fmt);
    const names = engine.generate(selectedSystem, familyKey, variantKey, family.name);
    if (useCustomLabel && customLabel.trim()) {
      names.label = customLabel.trim();
    }
    persistNamingEngine(projectId);
    onConfirm(selectedSystem, names);
  };

  if (!isOpen) return null;

  const eqAbbrev = EQUIPMENT_ABBREV[familyKey]?.[variantKey] || familyKey.slice(0, 3);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
    }} onClick={onCancel}>
      <div
        ref={dialogRef}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--nl-bg-panel, #1e293b)', borderRadius: 12,
          border: '1px solid #334155', width: 480,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          fontFamily: "'DM Sans', sans-serif",
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #334155',
          display: 'flex', alignItems: 'center', gap: 12,
          background: `linear-gradient(135deg, ${familyColor}15, transparent)`,
        }}>
          <span style={{ fontSize: 24 }}>{family?.icon || '🔧'}</span>
          <div>
            <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>
              Ny {family?.name || familyKey} — {variantKey}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>
              Välj system och granska namngivning
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* System selection */}
          <div>
            <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Systemtillhörighet
            </div>

            {/* Suggested systems */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {suggestedSystems.map(sc => (
                <button
                  key={sc.code}
                  onClick={() => setSelectedSystem(sc.code)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: selectedSystem === sc.code ? `${sc.color}25` : '#0f172a',
                    border: selectedSystem === sc.code ? `2px solid ${sc.color}` : '1px solid #334155',
                    color: selectedSystem === sc.code ? sc.color : '#94a3b8',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: sc.color, flexShrink: 0,
                  }} />
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{sc.code}</span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>{sc.name}</span>
                </button>
              ))}
            </div>

            {/* Show all toggle */}
            <button
              onClick={() => setShowAllSystems(!showAllSystems)}
              style={{
                background: 'none', border: 'none', color: '#3b82f6',
                fontSize: 10, cursor: 'pointer', padding: '2px 0',
              }}
            >
              {showAllSystems ? '▲ Dölj andra system' : '▼ Visa alla system'}
            </button>

            {showAllSystems && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6,
                maxHeight: 140, overflowY: 'auto', padding: 4,
                background: '#0f172a', borderRadius: 6,
              }}>
                {allSystems
                  .filter(sc => !suggestedSystems.find(s => s.code === sc.code))
                  .map(sc => (
                    <button
                      key={sc.code}
                      onClick={() => setSelectedSystem(sc.code)}
                      style={{
                        padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                        background: selectedSystem === sc.code ? `${sc.color}20` : 'transparent',
                        border: selectedSystem === sc.code ? `1px solid ${sc.color}` : '1px solid #1e293b',
                        color: selectedSystem === sc.code ? sc.color : '#64748b',
                        fontSize: 10,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{sc.code}</span> {sc.name}
                    </button>
                  ))
                }
              </div>
            )}
          </div>

          {/* Naming format */}
          <div>
            <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              Namnformat
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {NAMING_FORMATS.map(fmt => (
                <button
                  key={fmt.id}
                  onClick={() => setActiveFormatId(fmt.id)}
                  style={{
                    flex: 1, padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                    background: activeFormatId === fmt.id ? '#3b82f615' : '#0f172a',
                    border: activeFormatId === fmt.id ? '1px solid #3b82f6' : '1px solid #334155',
                    color: activeFormatId === fmt.id ? '#93c5fd' : '#64748b',
                    fontSize: 10, textAlign: 'center',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{fmt.label}</div>
                  <div style={{ fontSize: 8, opacity: 0.7, marginTop: 2, fontFamily: 'monospace' }}>{fmt.example.split(' / ')[0]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {preview && selectedSystem && (
            <div style={{
              background: '#0f172a', borderRadius: 8, padding: 14,
              border: '1px solid #1e293b',
            }}>
              <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Förhandsgranskning
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 6, columnGap: 8 }}>
                <span style={{ color: '#475569', fontSize: 10 }}>Instansnamn:</span>
                <span style={{ color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>
                  {preview.instanceName}
                </span>

                <span style={{ color: '#475569', fontSize: 10 }}>PosNo:</span>
                <span style={{ color: '#f59e0b', fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>
                  {preview.posNo}
                </span>

                <span style={{ color: '#475569', fontSize: 10 }}>Etikett:</span>
                {useCustomLabel ? (
                  <input
                    value={customLabel}
                    onChange={e => setCustomLabel(e.target.value)}
                    placeholder={preview.label}
                    autoFocus
                    style={{
                      background: 'var(--nl-bg-panel, #1e293b)', border: '1px solid #3b82f6', borderRadius: 3,
                      color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace', padding: '2px 6px',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <span style={{ color: '#10b981', fontSize: 12, fontFamily: 'monospace' }}>
                    {preview.label}
                  </span>
                )}

                <span style={{ color: '#475569', fontSize: 10 }}>System:</span>
                <span style={{ color: SYSTEM_CODES[selectedSystem]?.color || '#94a3b8', fontSize: 11 }}>
                  {SYSTEM_CODES[selectedSystem]?.name || selectedSystem}
                  {' '}
                  <span style={{ opacity: 0.6, fontSize: 9 }}>({SYSTEM_CODES[selectedSystem]?.nameEn})</span>
                </span>

                <span style={{ color: '#475569', fontSize: 10 }}>Utrustning:</span>
                <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>
                  {eqAbbrev} — {family?.name} ({variantKey})
                </span>

                <span style={{ color: '#475569', fontSize: 10 }}>Nummer:</span>
                <span style={{ color: '#94a3b8', fontSize: 11 }}>
                  #{preview.number} i {selectedSystem}-{eqAbbrev}
                </span>
              </div>

              <button
                onClick={() => setUseCustomLabel(!useCustomLabel)}
                style={{
                  marginTop: 8, background: 'none', border: 'none',
                  color: '#3b82f6', fontSize: 9, cursor: 'pointer', padding: 0,
                }}
              >
                {useCustomLabel ? '↩ Använd auto-etikett' : '✏️ Anpassad etikett...'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #334155',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: '#475569', fontSize: 9 }}>
            Enter = bekräfta · Esc = avbryt
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} style={{
              padding: '6px 16px', background: '#0f172a', border: '1px solid #334155',
              borderRadius: 6, color: '#94a3b8', fontSize: 12, cursor: 'pointer',
            }}>Avbryt</button>
            <button
              onClick={handleConfirm}
              disabled={!selectedSystem}
              style={{
                padding: '6px 16px',
                background: selectedSystem ? '#3b82f6' : '#1e293b',
                border: 'none', borderRadius: 6,
                color: selectedSystem ? 'white' : '#475569',
                fontSize: 12, fontWeight: 600, cursor: selectedSystem ? 'pointer' : 'not-allowed',
              }}
            >
              ✓ Lägg till
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
