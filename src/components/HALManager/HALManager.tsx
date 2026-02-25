// src/components/HALManager/HALManager.tsx
// Hardware Abstraction Layer — visual signal mapping tool

import React, { useState, useMemo, useCallback } from 'react';
import type { NorthlightTheme } from '../../theme';
import type {
  HWModule, HWChannel, AppSignal, HALMapping, HALConfig,
  SignalType, SignalScaling, ValidationIssue, HWModuleTemplate,
} from './halTypes';
import { WAGO_MODULES, SCALING_PRESETS } from './wagoModules';
import { useHALStore } from './useHALStore';

// ═══════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════

const SIG_COLORS: Record<SignalType, { bg: string; color: string; label: string }> = {
  DI: { bg: '#dbeafe', color: '#2563eb', label: 'DI' },
  DO: { bg: '#dcfce7', color: '#16a34a', label: 'DO' },
  AI: { bg: '#fef3c7', color: '#d97706', label: 'AI' },
  AO: { bg: '#fee2e2', color: '#dc2626', label: 'AO' },
};

let _idCounter = 0;
function genId() { return `hal_${Date.now()}_${++_idCounter}`; }


function defaultScaling(): SignalScaling {
  return { rawMin: 4, rawMax: 20, engMin: 0, engMax: 100, unit: '', clampEnabled: true, filterMs: 0 };
}

// ═══════════════════════════════════════════════════════════
// VALIDATION ENGINE
// ═══════════════════════════════════════════════════════════

function validate(config: HALConfig, appSignals: AppSignal[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allHwChannels = config.modules.flatMap(m => m.channels);

  // 1. Type mismatches
  config.mappings.forEach(m => {
    if (m.grounded) return;
    const hw = allHwChannels.find(c => c.id === m.hwChannelId);
    const app = appSignals.find(s => s.id === m.appSignalId);
    if (hw && app && hw.signalType !== app.signalType) {
      issues.push({
        id: genId(), severity: 'error', category: 'type_mismatch',
        message: `Type mismatch: ${hw.terminal} (${hw.signalType}) → ${app.signalName} (${app.signalType})`,
        hwChannelId: hw.id, appSignalId: app.id, mappingId: m.id,
      });
    }
  });

  // 2. Unmapped required app signals
  const mappedAppIds = new Set(config.mappings.filter(m => !m.grounded).map(m => m.appSignalId));
  appSignals.filter(s => s.required && !mappedAppIds.has(s.id)).forEach(s => {
    issues.push({
      id: genId(), severity: 'warning', category: 'unmapped_required',
      message: `Required signal unmapped: ${s.componentName}.${s.signalName}`,
      appSignalId: s.id,
    });
  });

  // 3. Unmapped HW channels (info)
  const mappedHwIds = new Set(config.mappings.map(m => m.hwChannelId));
  allHwChannels.filter(c => !mappedHwIds.has(c.id)).forEach(c => {
    issues.push({
      id: genId(), severity: 'info', category: 'unmapped_hw',
      message: `HW channel unused: ${c.terminal}`,
      hwChannelId: c.id,
    });
  });

  // 4. Duplicate mappings
  const hwUsed = new Map<string, string>();
  config.mappings.forEach(m => {
    if (m.grounded) return;
    if (hwUsed.has(m.hwChannelId)) {
      issues.push({
        id: genId(), severity: 'error', category: 'duplicate',
        message: `HW channel mapped twice: ${allHwChannels.find(c => c.id === m.hwChannelId)?.terminal}`,
        hwChannelId: m.hwChannelId, mappingId: m.id,
      });
    }
    hwUsed.set(m.hwChannelId, m.id);
  });

  // 5. Analog without scaling
  config.mappings.forEach(m => {
    if (m.grounded) return;
    const hw = allHwChannels.find(c => c.id === m.hwChannelId);
    if (hw && (hw.signalType === 'AI' || hw.signalType === 'AO') && !m.scaling) {
      issues.push({
        id: genId(), severity: 'warning', category: 'scaling',
        message: `Analog signal without scaling: ${hw.terminal}`,
        hwChannelId: hw.id, mappingId: m.id,
      });
    }
  });

  return issues;
}

// ═══════════════════════════════════════════════════════════
// EXTRACT APP SIGNALS FROM PLM NODES
// ═══════════════════════════════════════════════════════════

function extractAppSignals(nodes: any[]): AppSignal[] {
  const signals: AppSignal[] = [];
  (nodes || []).forEach(n => {
    const d = n.data || {};
    if (!d.metsFamily && !d.ports?.length) return;

    const compName = d.metsInstanceName || d.label || n.id.slice(0, 8);
    const family = d.metsFamily || '';

    // METS signals
    if (d.metsSignals?.length) {
      d.metsSignals.forEach((sig: any) => {
        signals.push({
          id: `app_${n.id}_${sig.name}`,
          nodeId: n.id,
          componentName: compName,
          componentFamily: family,
          signalName: sig.name,
          signalType: sig.type as SignalType,
          dataType: sig.struct || '',
          description: sig.desc || '',
          required: sig.required || false,
        });
      });
    }

    // Regular ports
    if (d.ports?.length && !d.metsFamily) {
      d.ports.forEach((p: any) => {
        signals.push({
          id: `app_${n.id}_${p.id || p.name}`,
          nodeId: n.id,
          componentName: compName,
          componentFamily: '',
          signalName: p.label || p.name || p.id,
          signalType: (p.direction === 'input' ? 'DI' : 'DO') as SignalType,
          dataType: p.dataType || '',
          description: p.description || '',
          required: false,
        });
      });
    }
  });
  return signals;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

interface Props {
  projectId: string | null;
  nodes: any[];
  edges: any[];
  theme: NorthlightTheme;
  style?: React.CSSProperties;
}

export default function HALManager({ projectId, nodes, edges, theme: t, style }: Props) {
  // ─── State ────────────────────────────────────────────
  const { config, setConfig, saving, loading, versions, createVersion, loadVersion } = useHALStore(projectId);
  const [selectedHw, setSelectedHw] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [showModuleLibrary, setShowModuleLibrary] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [rackId, setRackId] = useState('Rack-1');
  const [tab, setTab] = useState<'map' | 'table' | 'issues'>('map');

  // ─── App signals from PLM ─────────────────────────────
  const appSignals = useMemo(() => extractAppSignals(nodes), [nodes]);

  // ─── All HW channels ─────────────────────────────────
  const allHwChannels = useMemo(() => config.modules.flatMap(m => m.channels), [config.modules]);

  // ─── Validation ───────────────────────────────────────
  const issues = useMemo(() => validate(config, appSignals), [config, appSignals]);
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;

  // ─── Mapping helpers ──────────────────────────────────
  const getMappingForHw = useCallback((hwId: string) =>
    config.mappings.find(m => m.hwChannelId === hwId), [config.mappings]);
  const getMappingForApp = useCallback((appId: string) =>
    config.mappings.find(m => m.appSignalId === appId && !m.grounded), [config.mappings]);

  // ─── Actions ──────────────────────────────────────────

  function addModule(template: HWModuleTemplate) {
    const maxPos = config.modules.reduce((max, m) => Math.max(max, m.rackPosition), 0);
    const newModule: HWModule = {
      id: genId(),
      templateModel: template.model,
      manufacturer: template.manufacturer,
      name: template.name,
      rackPosition: maxPos + 1,
      rackId,
      channels: template.channels.flatMap(ch =>
        Array.from({ length: ch.count }, (_, i) => ({
          id: genId(),
          moduleId: '', // filled below
          channelNumber: i + 1,
          signalType: ch.signalType,
          electricalType: ch.electricalType,
          terminal: `${rackId}:${maxPos + 1}.${i + 1}`,
          tag: '',
          description: '',
        }))
      ),
      color: template.color,
    };
    newModule.channels.forEach(ch => ch.moduleId = newModule.id);
    setConfig(prev => ({ ...prev, modules: [...prev.modules, newModule], updatedAt: new Date().toISOString() }));
    setShowModuleLibrary(false);
  }

  function removeModule(moduleId: string) {
    setConfig(prev => ({
      ...prev,
      modules: prev.modules.filter(m => m.id !== moduleId),
      mappings: prev.mappings.filter(m => {
        const ch = allHwChannels.find(c => c.id === m.hwChannelId);
        return ch?.moduleId !== moduleId;
      }),
      updatedAt: new Date().toISOString(),
    }));
  }

  function createMapping(hwChannelId: string, appSignalId: string) {
    // Remove existing mapping for this hw channel
    const hw = allHwChannels.find(c => c.id === hwChannelId);
    const app = appSignals.find(s => s.id === appSignalId);
    const isAnalog = hw && (hw.signalType === 'AI' || hw.signalType === 'AO');

    const mapping: HALMapping = {
      id: genId(),
      hwChannelId,
      appSignalId,
      scaling: isAnalog ? defaultScaling() : undefined,
      grounded: false,
      groundValue: '',
      notes: '',
      status: 'mapped',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConfig(prev => ({
      ...prev,
      mappings: [...prev.mappings.filter(m => m.hwChannelId !== hwChannelId && m.appSignalId !== appSignalId), mapping],
      updatedAt: new Date().toISOString(),
    }));
    setSelectedHw(null);
    setSelectedApp(null);
  }

  function groundSignal(appSignalId: string, value: string) {
    const mapping: HALMapping = {
      id: genId(),
      hwChannelId: '',
      appSignalId,
      grounded: true,
      groundValue: value,
      notes: 'Grounded — no HW connection',
      status: 'grounded',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConfig(prev => ({
      ...prev,
      mappings: [...prev.mappings.filter(m => m.appSignalId !== appSignalId), mapping],
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeMapping(mappingId: string) {
    setConfig(prev => ({
      ...prev,
      mappings: prev.mappings.filter(m => m.id !== mappingId),
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateScaling(mappingId: string, scaling: SignalScaling) {
    setConfig(prev => ({
      ...prev,
      mappings: prev.mappings.map(m => m.id === mappingId ? { ...m, scaling, updatedAt: new Date().toISOString() } : m),
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateHwTag(channelId: string, tag: string) {
    setConfig(prev => ({
      ...prev,
      modules: prev.modules.map(mod => ({
        ...mod,
        channels: mod.channels.map(ch => ch.id === channelId ? { ...ch, tag } : ch),
      })),
      updatedAt: new Date().toISOString(),
    }));
  }

  // ─── Click-to-connect logic ───────────────────────────
  function handleHwClick(chId: string) {
    if (selectedApp) {
      // Connect!
      createMapping(chId, selectedApp);
    } else {
      setSelectedHw(selectedHw === chId ? null : chId);
      setSelectedApp(null);
    }
  }

  function handleAppClick(sigId: string) {
    if (selectedHw) {
      createMapping(selectedHw, sigId);
    } else {
      setSelectedApp(selectedApp === sigId ? null : sigId);
      setSelectedHw(null);
    }
  }

  // ─── Filter ───────────────────────────────────────────
  const filteredHwChannels = filterType === 'all'
    ? allHwChannels
    : allHwChannels.filter(c => c.signalType === filterType);

  const filteredAppSignals = filterType === 'all'
    ? appSignals
    : appSignals.filter(s => s.signalType === filterType);

  // ─── Stats ────────────────────────────────────────────
  const mappedCount = config.mappings.filter(m => !m.grounded).length;
  const groundedCount = config.mappings.filter(m => m.grounded).length;
  const unmappedApp = appSignals.filter(s => !getMappingForApp(s.id) && !config.mappings.find(m => m.appSignalId === s.id && m.grounded)).length;
  const unmappedHw = allHwChannels.filter(c => !getMappingForHw(c.id)).length;

  // ═════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════

  return (
    <div style={{
      ...style,
      display: 'flex', flexDirection: 'column',
      background: t.bgApp, color: t.textPrimary,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    }}>
      {/* ─── Top Bar ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
        background: t.bgPanel, borderBottom: `1px solid ${t.border}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: '18px' }}>🔌</span>
        <span style={{ fontWeight: 700, fontSize: '14px' }}>HAL Manager</span>
        <span style={{ fontSize: '11px', color: t.textSecondary }}>v{config.version}</span>
        {saving && <span style={{ fontSize: '10px', color: t.accent }}>💾 Saving...</span>}
        {loading && <span style={{ fontSize: '10px', color: t.accent }}>⏳ Loading...</span>}

        {/* Version management */}
        <button onClick={() => {
          const changes = prompt('Version changes:');
          if (changes !== null) createVersion(changes);
        }} style={{
          background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '4px',
          color: t.textPrimary, padding: '4px 10px', fontSize: '11px', cursor: 'pointer',
        }} title="Save a named version snapshot">
          📋 New Version
        </button>
        {versions.length > 0 && (
          <select
            onChange={e => { if (e.target.value) loadVersion(e.target.value); }}
            value=""
            style={{
              background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '4px',
              color: t.textPrimary, padding: '4px 8px', fontSize: '11px',
            }}
          >
            <option value="">History ({versions.length})</option>
            {versions.map(v => (
              <option key={v.id} value={v.id}>v{v.version} — {v.changes || 'no comment'} ({new Date(v.created_at).toLocaleDateString()})</option>
            ))}
          </select>
        )}

        <div style={{ flex: 1 }} />

        {/* Stats */}
        <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
          <span style={{ color: '#22c55e' }}>✓ {mappedCount} mapped</span>
          <span style={{ color: '#f59e0b' }}>⏚ {groundedCount} grounded</span>
          <span style={{ color: '#94a3b8' }}>○ {unmappedApp} unmapped</span>
          {errors > 0 && <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠ {errors} errors</span>}
          {warnings > 0 && <span style={{ color: '#f59e0b' }}>⚠ {warnings} warnings</span>}
        </div>

        {/* Filter */}
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{
          background: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '4px',
          color: t.textPrimary, padding: '4px 8px', fontSize: '12px',
        }}>
          <option value="all">All types</option>
          <option value="DI">DI — Digital In</option>
          <option value="DO">DO — Digital Out</option>
          <option value="AI">AI — Analog In</option>
          <option value="AO">AO — Analog Out</option>
        </select>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', background: t.bgPanel, borderRadius: '4px', border: `1px solid ${t.border}`, padding: '2px' }}>
          {([['map', '🔗 Map'], ['table', '📋 Table'], ['issues', `⚠ Issues (${issues.length})`]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k as any)} style={{
              padding: '4px 10px', borderRadius: '3px', border: 'none', fontSize: '11px', cursor: 'pointer',
              background: tab === k ? t.accent : 'transparent',
              color: tab === k ? '#fff' : t.textSecondary, fontWeight: tab === k ? 600 : 400,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ─── Selection hint ─── */}
      {(selectedHw || selectedApp) && (
        <div style={{
          padding: '6px 16px', background: `${t.accent}20`, borderBottom: `1px solid ${t.accent}40`,
          fontSize: '12px', color: t.accent, display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span>🔗</span>
          {selectedHw && <span>HW channel selected — click an Application signal to connect</span>}
          {selectedApp && <span>App signal selected — click a HW channel to connect</span>}
          <button onClick={() => { setSelectedHw(null); setSelectedApp(null); }} style={{
            marginLeft: 'auto', background: 'none', border: `1px solid ${t.accent}`, borderRadius: '4px',
            color: t.accent, padding: '2px 8px', cursor: 'pointer', fontSize: '11px',
          }}>Cancel</button>
        </div>
      )}

      {/* ─── Main Content ─── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {tab === 'map' ? (
          <MapView
            t={t} config={config} appSignals={appSignals}
            filteredHwChannels={filteredHwChannels} filteredAppSignals={filteredAppSignals}
            selectedHw={selectedHw} selectedApp={selectedApp}
            onHwClick={handleHwClick} onAppClick={handleAppClick}
            onHwTag={updateHwTag}
            getMappingForHw={getMappingForHw} getMappingForApp={getMappingForApp}
            onRemoveMapping={removeMapping} onGround={groundSignal}
            onAddModule={() => setShowModuleLibrary(true)}
            onRemoveModule={removeModule}
            allHwChannels={allHwChannels}
            onEditScaling={setEditingMapping}
          />
        ) : tab === 'table' ? (
          <TableView
            t={t} config={config} appSignals={appSignals}
            allHwChannels={allHwChannels}
            onRemoveMapping={removeMapping}
          />
        ) : (
          <IssuesView t={t} issues={issues} />
        )}
      </div>

      {/* ─── Module Library Modal ─── */}
      {showModuleLibrary && (
        <ModuleLibraryModal
          t={t}
          rackId={rackId}
          onSetRackId={setRackId}
          onAdd={addModule}
          onClose={() => setShowModuleLibrary(false)}
        />
      )}

      {/* ─── Scaling Editor Modal ─── */}
      {editingMapping && (
        <ScalingModal
          t={t}
          mapping={config.mappings.find(m => m.id === editingMapping)!}
          hwChannel={allHwChannels.find(c => c.id === config.mappings.find(m => m.id === editingMapping)?.hwChannelId)}
          onSave={(scaling) => { updateScaling(editingMapping, scaling); setEditingMapping(null); }}
          onClose={() => setEditingMapping(null)}
        />
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// MAP VIEW — Two-panel with connections
// ═══════════════════════════════════════════════════════════

function MapView({ t, config, appSignals, filteredHwChannels, filteredAppSignals,
  selectedHw, selectedApp, onHwClick, onAppClick, onHwTag,
  getMappingForHw, getMappingForApp, onRemoveMapping, onGround,
  onAddModule, onRemoveModule, allHwChannels, onEditScaling,
}: any) {
  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* ─── Left: Hardware ─── */}
      <div style={{
        width: '38%', borderRight: `1px solid ${t.border}`,
        overflowY: 'auto', padding: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: t.textPrimary }}>
            ⚡ Hardware I/O
          </div>
          <span style={{ fontSize: '11px', color: t.textSecondary, marginLeft: '8px' }}>
            {config.modules.length} modules · {allHwChannels.length} channels
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={onAddModule} style={{
            background: t.accent, color: '#fff', border: 'none', borderRadius: '4px',
            padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          }}>+ Add Module</button>
        </div>

        {config.modules.length === 0 ? (
          <EmptyState icon="⚡" title="No hardware modules" subtitle="Add WAGO modules from the library" t={t} />
        ) : (
          config.modules.map((mod: any) => (
            <div key={mod.id} style={{
              marginBottom: '8px', background: t.bgPanel,
              border: `1px solid ${t.border}`, borderRadius: '8px',
              borderLeft: `4px solid ${mod.color}`,
            }}>
              {/* Module header */}
              <div style={{
                display: 'flex', alignItems: 'center', padding: '8px 10px',
                borderBottom: `1px solid ${t.border}`,
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: mod.color }}>
                  {mod.templateModel}
                </span>
                <span style={{ fontSize: '11px', color: t.textSecondary, marginLeft: '8px' }}>
                  {mod.name}
                </span>
                <span style={{ fontSize: '10px', color: t.textSecondary, marginLeft: '8px', fontFamily: 'monospace' }}>
                  Pos {mod.rackPosition} · {mod.rackId}
                </span>
                <div style={{ flex: 1 }} />
                <button onClick={() => onRemoveModule(mod.id)} style={{
                  background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: '2px 4px',
                }} title="Remove module">✕</button>
              </div>

              {/* Channels */}
              {mod.channels.map((ch: any) => {
                const mapping = getMappingForHw(ch.id);
                const isMapped = !!mapping;
                const isSelected = selectedHw === ch.id;
                const sigColor = SIG_COLORS[ch.signalType as SignalType];
                const appSig = mapping ? appSignals.find((s: any) => s.id === mapping.appSignalId) : null;

                return (
                  <div
                    key={ch.id}
                    onClick={() => onHwClick(ch.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 10px', cursor: 'pointer',
                      background: isSelected ? `${t.accent}20` : isMapped ? `${sigColor.bg}40` : 'transparent',
                      borderBottom: `1px solid ${t.border}`,
                      borderLeft: isSelected ? `3px solid ${t.accent}` : '3px solid transparent',
                      transition: 'all 100ms',
                    }}
                  >
                    {/* Signal type badge */}
                    <span style={{
                      background: sigColor.bg, color: sigColor.color,
                      padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700,
                      minWidth: '24px', textAlign: 'center',
                    }}>{sigColor.label}</span>

                    {/* Terminal */}
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: t.textPrimary, minWidth: '80px' }}>
                      {ch.terminal}
                    </span>

                    {/* Electrical type */}
                    <span style={{ fontSize: '10px', color: t.textSecondary, minWidth: '60px' }}>
                      {ch.electricalType}
                    </span>

                    {/* Tag */}
                    <input
                      value={ch.tag}
                      onChange={(e) => { e.stopPropagation(); onHwTag(ch.id, e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Tag..."
                      style={{
                        width: '80px', padding: '2px 4px', fontSize: '10px',
                        background: t.bgApp, border: `1px solid ${t.border}`, borderRadius: '3px',
                        color: t.textPrimary, fontFamily: 'monospace',
                      }}
                    />

                    {/* Connection indicator */}
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                      {isMapped ? (
                        <>
                          <span style={{ fontSize: '10px', color: '#22c55e' }}>→</span>
                          <span style={{ fontSize: '10px', color: t.textSecondary, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {appSig?.signalName || '?'}
                          </span>
                          {mapping.scaling && (
                            <button onClick={(e) => { e.stopPropagation(); onEditScaling(mapping.id); }} style={{
                              background: '#fef3c7', border: 'none', borderRadius: '3px', padding: '1px 4px',
                              fontSize: '9px', color: '#d97706', cursor: 'pointer', fontWeight: 600,
                            }}>⚖</button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); onRemoveMapping(mapping.id); }} style={{
                            background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '10px',
                          }}>✕</button>
                        </>
                      ) : (
                        <span style={{ fontSize: '10px', color: t.textSecondary, opacity: 0.4 }}>unmapped</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* ─── Right: Application Signals ─── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: t.textPrimary }}>
            📡 Application Signals
          </div>
          <span style={{ fontSize: '11px', color: t.textSecondary, marginLeft: '8px' }}>
            {filteredAppSignals.length} signals from PLM
          </span>
        </div>

        {filteredAppSignals.length === 0 ? (
          <EmptyState icon="📡" title="No application signals" subtitle="Add METS components in PLM view" t={t} />
        ) : (
          // Group by component
          (() => {
            const groups = new Map<string, AppSignal[]>();
            filteredAppSignals.forEach((s: AppSignal) => {
              const key = s.componentName;
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(s);
            });

            return [...groups.entries()].map(([compName, sigs]) => (
              <div key={compName} style={{
                marginBottom: '8px', background: t.bgPanel,
                border: `1px solid ${t.border}`, borderRadius: '8px',
              }}>
                <div style={{
                  padding: '8px 10px', borderBottom: `1px solid ${t.border}`,
                  fontSize: '11px', fontWeight: 700, color: t.textPrimary,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <span style={{ fontFamily: 'monospace' }}>{compName}</span>
                  {sigs[0]?.componentFamily && (
                    <span style={{
                      fontSize: '9px', padding: '1px 6px', borderRadius: '3px',
                      background: `${t.accent}15`, color: t.accent,
                    }}>{sigs[0].componentFamily}</span>
                  )}
                </div>

                {sigs.map(sig => {
                  const mapping = getMappingForApp(sig.id);
                  const groundMapping = config.mappings.find((m: HALMapping) => m.appSignalId === sig.id && m.grounded);
                  const isMapped = !!mapping;
                  const isGrounded = !!groundMapping;
                  const isSelected = selectedApp === sig.id;
                  const sigColor = SIG_COLORS[sig.signalType];
                  const hwCh = mapping ? allHwChannels.find((c: any) => c.id === mapping.hwChannelId) : null;

                  return (
                    <div
                      key={sig.id}
                      onClick={() => !isGrounded && onAppClick(sig.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 10px', cursor: isGrounded ? 'default' : 'pointer',
                        background: isSelected ? `${t.accent}20` : isMapped ? `${sigColor.bg}40` : isGrounded ? '#33333320' : 'transparent',
                        borderBottom: `1px solid ${t.border}`,
                        borderRight: isSelected ? `3px solid ${t.accent}` : '3px solid transparent',
                        transition: 'all 100ms',
                        opacity: isGrounded ? 0.6 : 1,
                      }}
                    >
                      {/* Connection indicator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '100px' }}>
                        {isMapped ? (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); onRemoveMapping(mapping.id); }} style={{
                              background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '10px',
                            }}>✕</button>
                            <span style={{ fontSize: '10px', color: t.textSecondary, fontFamily: 'monospace' }}>
                              {hwCh?.terminal || '?'}
                            </span>
                            <span style={{ fontSize: '10px', color: '#22c55e' }}>←</span>
                          </>
                        ) : isGrounded ? (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); onRemoveMapping(groundMapping.id); }} style={{
                              background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '10px',
                            }}>✕</button>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>⏚ {groundMapping.groundValue}</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '10px', color: t.textSecondary, opacity: 0.4, minWidth: '55px' }}>unmapped</span>
                            <button onClick={(e) => {
                              e.stopPropagation();
                              const val = prompt(`Ground value for ${sig.signalName}:`, sig.signalType === 'DI' || sig.signalType === 'DO' ? 'FALSE' : '0.0');
                              if (val !== null) onGround(sig.id, val);
                            }} style={{
                              background: 'none', border: `1px solid ${t.border}`, borderRadius: '3px',
                              color: t.textSecondary, cursor: 'pointer', fontSize: '9px', padding: '1px 4px',
                            }} title="Ground this signal">⏚</button>
                          </>
                        )}
                      </div>

                      {/* Signal type badge */}
                      <span style={{
                        background: sigColor.bg, color: sigColor.color,
                        padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700,
                        minWidth: '24px', textAlign: 'center',
                      }}>{sigColor.label}</span>

                      {/* Signal name */}
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: t.textPrimary }}>
                        {sig.signalName}
                      </span>

                      {/* Required marker */}
                      {sig.required && (
                        <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 700 }}>REQ</span>
                      )}

                      {/* Description */}
                      <span style={{ fontSize: '10px', color: t.textSecondary, marginLeft: 'auto', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sig.description}
                      </span>
                    </div>
                  );
                })}
              </div>
            ));
          })()
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// TABLE VIEW — Full mapping table
// ═══════════════════════════════════════════════════════════

function TableView({ t, config, appSignals, allHwChannels, onRemoveMapping }: any) {
  // Build a unified list: all mappings + unmapped signals
  const rows: any[] = [];

  config.mappings.forEach((m: HALMapping) => {
    const hw = allHwChannels.find((c: any) => c.id === m.hwChannelId);
    const app = appSignals.find((s: any) => s.id === m.appSignalId);
    rows.push({ mapping: m, hw, app });
  });

  // Unmapped app signals
  const mappedAppIds = new Set(config.mappings.map((m: HALMapping) => m.appSignalId));
  appSignals.filter((s: AppSignal) => !mappedAppIds.has(s.id)).forEach((s: AppSignal) => {
    rows.push({ mapping: null, hw: null, app: s });
  });

  // Unmapped HW channels
  const mappedHwIds = new Set(config.mappings.map((m: HALMapping) => m.hwChannelId));
  allHwChannels.filter((c: any) => !mappedHwIds.has(c.id)).forEach((c: any) => {
    rows.push({ mapping: null, hw: c, app: null });
  });

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: `${t.accent}10`, position: 'sticky', top: 0 }}>
            {['Status', 'HW Terminal', 'HW Type', 'Tag', 'Electrical', '→', 'App Signal', 'App Type', 'Component', 'Scaling', ''].map(h => (
              <th key={h} style={{
                padding: '8px 8px', textAlign: 'left', fontWeight: 600,
                color: t.textPrimary, borderBottom: `2px solid ${t.border}`, fontSize: '11px',
                whiteSpace: 'nowrap', background: t.bgPanel,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const status = row.mapping?.grounded ? 'grounded' : row.mapping ? 'mapped' : 'unmapped';
            const statusColor = status === 'mapped' ? '#22c55e' : status === 'grounded' ? '#94a3b8' : '#f59e0b';
            const hwType = row.hw?.signalType as SignalType | undefined;
            const appType = row.app?.signalType as SignalType | undefined;
            const typeMismatch = hwType && appType && hwType !== appType;

            return (
              <tr key={idx} style={{
                background: idx % 2 === 0 ? 'transparent' : `${t.accent}04`,
                borderBottom: `1px solid ${t.border}`,
              }}>
                <td style={{ padding: '6px 8px' }}>
                  <span style={{
                    display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                    background: statusColor, marginRight: '4px',
                  }} />
                  <span style={{ fontSize: '10px', color: statusColor, fontWeight: 500 }}>{status}</span>
                </td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: '11px', color: row.hw ? t.textPrimary : t.textSecondary }}>
                  {row.hw?.terminal || (row.mapping?.grounded ? '⏚' : '—')}
                </td>
                <td style={{ padding: '6px 8px' }}>
                  {hwType && <span style={{ ...badgeStyle(SIG_COLORS[hwType]) }}>{hwType}</span>}
                </td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: '11px', color: t.textSecondary }}>
                  {row.hw?.tag || '—'}
                </td>
                <td style={{ padding: '6px 8px', fontSize: '10px', color: t.textSecondary }}>
                  {row.hw?.electricalType || '—'}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'center', color: typeMismatch ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                  {row.mapping ? (typeMismatch ? '⚠' : '→') : '·'}
                </td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: '11px', color: row.app ? t.textPrimary : t.textSecondary }}>
                  {row.app?.signalName || (row.mapping?.grounded ? `⏚ ${row.mapping.groundValue}` : '—')}
                </td>
                <td style={{ padding: '6px 8px' }}>
                  {appType && <span style={{ ...badgeStyle(SIG_COLORS[appType]) }}>{appType}</span>}
                </td>
                <td style={{ padding: '6px 8px', fontSize: '11px', color: t.textSecondary }}>
                  {row.app?.componentName || '—'}
                </td>
                <td style={{ padding: '6px 8px', fontSize: '10px', color: t.textSecondary }}>
                  {row.mapping?.scaling
                    ? `${row.mapping.scaling.engMin}–${row.mapping.scaling.engMax} ${row.mapping.scaling.unit}`
                    : '—'}
                </td>
                <td style={{ padding: '6px 8px' }}>
                  {row.mapping && (
                    <button onClick={() => onRemoveMapping(row.mapping.id)} style={{
                      background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px',
                    }}>✕</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function badgeStyle(c: { bg: string; color: string }) {
  return {
    background: c.bg, color: c.color,
    padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700 as const,
    display: 'inline-block',
  };
}


// ═══════════════════════════════════════════════════════════
// ISSUES VIEW
// ═══════════════════════════════════════════════════════════

function IssuesView({ t, issues }: { t: any; issues: ValidationIssue[] }) {
  const sevColors: Record<string, { bg: string; color: string; icon: string }> = {
    error:   { bg: '#fee2e2', color: '#dc2626', icon: '🔴' },
    warning: { bg: '#fef3c7', color: '#d97706', icon: '🟡' },
    info:    { bg: '#dbeafe', color: '#2563eb', icon: '🔵' },
  };

  if (issues.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState icon="✅" title="No issues found" subtitle="All mappings look good!" t={t} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
      {issues.map(issue => {
        const sev = sevColors[issue.severity] || sevColors.info;
        return (
          <div key={issue.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', marginBottom: '4px',
            background: `${sev.bg}60`, border: `1px solid ${sev.bg}`,
            borderLeft: `4px solid ${sev.color}`, borderRadius: '6px',
          }}>
            <span>{sev.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: t.textPrimary }}>{issue.message}</div>
              <div style={{ fontSize: '10px', color: t.textSecondary, marginTop: '2px' }}>
                {issue.category.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// MODULE LIBRARY MODAL
// ═══════════════════════════════════════════════════════════

function ModuleLibraryModal({ t, rackId, onSetRackId, onAdd, onClose }: {
  t: any; rackId: string; onSetRackId: (v: string) => void;
  onAdd: (template: HWModuleTemplate) => void; onClose: () => void;
}) {
  const [filter, setFilter] = useState('');
  const filtered = WAGO_MODULES.filter(m =>
    !m.endModule &&
    (m.model.toLowerCase().includes(filter.toLowerCase()) ||
     m.name.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '12px',
        width: '520px', maxHeight: '70vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ padding: '16px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: t.textPrimary, marginBottom: '10px' }}>
            📦 WAGO Module Library
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={filter} onChange={e => setFilter(e.target.value)}
              placeholder="Search modules..."
              style={{
                flex: 1, padding: '6px 10px', background: t.bgPanel,
                border: `1px solid ${t.border}`, borderRadius: '6px',
                color: t.textPrimary, fontSize: '12px',
              }}
            />
            <input
              value={rackId} onChange={e => onSetRackId(e.target.value)}
              placeholder="Rack ID..."
              style={{
                width: '100px', padding: '6px 10px', background: t.bgPanel,
                border: `1px solid ${t.border}`, borderRadius: '6px',
                color: t.textPrimary, fontSize: '12px', fontFamily: 'monospace',
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filtered.map(mod => (
            <div key={mod.model} onClick={() => onAdd(mod)} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', cursor: 'pointer',
              borderRadius: '6px', marginBottom: '2px',
              borderLeft: `4px solid ${mod.color}`,
            }}
            onMouseEnter={e => e.currentTarget.style.background = `${t.accent}10`}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: mod.color, minWidth: '70px' }}>
                {mod.model}
              </span>
              <span style={{ fontSize: '12px', color: t.textPrimary, flex: 1 }}>{mod.name}</span>
              {mod.channels.map((ch, i) => (
                <span key={i} style={{
                  ...badgeStyle(SIG_COLORS[ch.signalType] || { bg: '#f1f5f9', color: '#64748b' }),
                }}>{ch.count}× {ch.signalType}</span>
              ))}
              {mod.busCoupler && <span style={{ fontSize: '10px', color: '#0ea5e9' }}>Bus Coupler</span>}
            </div>
          ))}
        </div>

        <div style={{ padding: '12px', borderTop: `1px solid ${t.border}`, textAlign: 'right' }}>
          <button onClick={onClose} style={{
            padding: '6px 16px', background: t.bgPanel, border: `1px solid ${t.border}`,
            borderRadius: '6px', color: t.textPrimary, fontSize: '12px', cursor: 'pointer',
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// SCALING MODAL
// ═══════════════════════════════════════════════════════════

function ScalingModal({ t, mapping, hwChannel, onSave, onClose }: {
  t: any; mapping: HALMapping; hwChannel: any;
  onSave: (scaling: SignalScaling) => void; onClose: () => void;
}) {
  const [scaling, setScaling] = useState<SignalScaling>(mapping.scaling || defaultScaling());
  const [presetKey, setPresetKey] = useState('');

  const applyPreset = (key: string) => {
    const p = SCALING_PRESETS[key];
    if (p) setScaling({ ...scaling, ...p });
    setPresetKey(key);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '12px',
        width: '420px', padding: '20px', boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: t.textPrimary, marginBottom: '16px' }}>
          ⚖️ Signal Scaling — {hwChannel?.terminal || '?'}
        </div>

        {/* Preset selector */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', color: t.textSecondary, display: 'block', marginBottom: '4px' }}>Preset</label>
          <select value={presetKey} onChange={e => applyPreset(e.target.value)} style={{
            width: '100%', padding: '6px 8px', background: t.bgPanel,
            border: `1px solid ${t.border}`, borderRadius: '4px',
            color: t.textPrimary, fontSize: '12px',
          }}>
            <option value="">— Custom —</option>
            {Object.entries(SCALING_PRESETS).map(([key, p]) => (
              <option key={key} value={key}>{key.replace(/_/g, ' ')} ({p.engMin}–{p.engMax} {p.unit})</option>
            ))}
          </select>
        </div>

        {/* Scaling fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {[
            { key: 'rawMin', label: 'Raw Min', desc: hwChannel?.electricalType || '' },
            { key: 'rawMax', label: 'Raw Max', desc: '' },
            { key: 'engMin', label: 'Eng. Min', desc: scaling.unit },
            { key: 'engMax', label: 'Eng. Max', desc: scaling.unit },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: '10px', color: t.textSecondary }}>{f.label} {f.desc && `(${f.desc})`}</label>
              <input
                type="number"
                value={(scaling as any)[f.key]}
                onChange={e => setScaling({ ...scaling, [f.key]: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%', padding: '6px 8px', background: t.bgPanel,
                  border: `1px solid ${t.border}`, borderRadius: '4px',
                  color: t.textPrimary, fontSize: '12px', fontFamily: 'monospace',
                }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '10px', color: t.textSecondary }}>Unit</label>
            <input
              value={scaling.unit}
              onChange={e => setScaling({ ...scaling, unit: e.target.value })}
              style={{
                width: '100%', padding: '6px 8px', background: t.bgPanel,
                border: `1px solid ${t.border}`, borderRadius: '4px',
                color: t.textPrimary, fontSize: '12px',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '10px', color: t.textSecondary }}>Filter (ms)</label>
            <input
              type="number"
              value={scaling.filterMs}
              onChange={e => setScaling({ ...scaling, filterMs: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%', padding: '6px 8px', background: t.bgPanel,
                border: `1px solid ${t.border}`, borderRadius: '4px',
                color: t.textPrimary, fontSize: '12px', fontFamily: 'monospace',
              }}
            />
          </div>
        </div>

        {/* Visual scaling preview */}
        <div style={{
          padding: '10px', background: t.bgPanel, borderRadius: '6px',
          border: `1px solid ${t.border}`, marginBottom: '16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: t.textSecondary, marginBottom: '6px' }}>Preview</div>
          <div style={{ fontFamily: 'monospace', fontSize: '13px', color: t.textPrimary }}>
            {scaling.rawMin} {hwChannel?.electricalType || 'raw'} → {scaling.engMin} {scaling.unit}
          </div>
          <div style={{ fontSize: '11px', color: t.textSecondary, margin: '2px 0' }}>⟋</div>
          <div style={{ fontFamily: 'monospace', fontSize: '13px', color: t.textPrimary }}>
            {scaling.rawMax} {hwChannel?.electricalType || 'raw'} → {scaling.engMax} {scaling.unit}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '6px 16px', background: t.bgPanel, border: `1px solid ${t.border}`,
            borderRadius: '6px', color: t.textPrimary, fontSize: '12px', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={() => onSave(scaling)} style={{
            padding: '6px 16px', background: t.accent, border: 'none',
            borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 600,
          }}>Save</button>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════

function EmptyState({ icon, title, subtitle, t }: { icon: string; title: string; subtitle: string; t: any }) {
  return (
    <div style={{
      padding: '32px', textAlign: 'center',
      background: `${t.accent}08`, border: `2px dashed ${t.border}`, borderRadius: '8px',
    }}>
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '14px', color: t.textSecondary, marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '12px', color: t.textSecondary, opacity: 0.7 }}>{subtitle}</div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// PERSISTENCE — backend with localStorage fallback
// ═══════════════════════════════════════════════════════════

