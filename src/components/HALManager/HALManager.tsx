// src/components/HALManager/HALManager.tsx
// Hardware Abstraction Layer — visual signal mapping tool

import React, { useState, useMemo, useCallback } from 'react';
import type { NorthlightTheme } from '../../theme';
import type {
  HWModule, HWChannel, AppSignal, HALMapping, HALConfig,
  SignalType, SignalScaling, ValidationIssue, HWModuleTemplate,
  COMDevice, COMRegister, COMDeviceTemplate, MappingSource,
} from './halTypes';
import { WAGO_MODULES, SCALING_PRESETS } from './wagoModules';
import { COM_DEVICES, PROTOCOL_INFO, REGISTER_TYPE_INFO } from './comDevices';
import { useHALStore } from './useHALStore';
import { exportWAGOXML, exportCSV, exportJSON, exportCODESYSGVL, downloadFile } from './halExport';
import { exportIOListExcel, exportIOListPDF } from './halIOExport';

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
  const allComRegisters = (config.comDevices || []).flatMap(d => d.registers);

  // 1. Type mismatches
  config.mappings.forEach(m => {
    if (m.grounded) return;
    const app = appSignals.find(s => s.id === m.appSignalId);
    if (!app) return;
    if (m.source === 'com') {
      const reg = allComRegisters.find(r => r.id === m.comRegisterId);
      if (reg && reg.signalType !== app.signalType) {
        issues.push({
          id: genId(), severity: 'error', category: 'type_mismatch',
          message: `Type mismatch: COM ${reg.name} (${reg.signalType}) → ${app.signalName} (${app.signalType})`,
          comRegisterId: reg.id, appSignalId: app.id, mappingId: m.id,
        });
      }
    } else {
      const hw = allHwChannels.find(c => c.id === m.hwChannelId);
      if (hw && hw.signalType !== app.signalType) {
        issues.push({
          id: genId(), severity: 'error', category: 'type_mismatch',
          message: `Type mismatch: ${hw.terminal} (${hw.signalType}) → ${app.signalName} (${app.signalType})`,
          hwChannelId: hw.id, appSignalId: app.id, mappingId: m.id,
        });
      }
    }
  });

  // 2. Unmapped required app signals
  const mappedAppIds = new Set(config.mappings.map(m => m.appSignalId));
  appSignals.filter(s => s.required && !mappedAppIds.has(s.id)).forEach(s => {
    issues.push({
      id: genId(), severity: 'warning', category: 'unmapped_required',
      message: `Required signal unmapped: ${s.componentName}.${s.signalName}`,
      appSignalId: s.id,
    });
  });

  // 3. Unmapped HW channels
  const mappedHwIds = new Set(config.mappings.filter(m => m.source !== 'com').map(m => m.hwChannelId));
  allHwChannels.filter(c => !mappedHwIds.has(c.id)).forEach(c => {
    issues.push({
      id: genId(), severity: 'info', category: 'unmapped_hw',
      message: `HW channel unused: ${c.terminal}`, hwChannelId: c.id,
    });
  });

  // 4. Unmapped COM registers
  const mappedComIds = new Set(config.mappings.filter(m => m.source === 'com').map(m => m.comRegisterId));
  allComRegisters.filter(r => !mappedComIds.has(r.id)).forEach(r => {
    const dev = (config.comDevices || []).find(d => d.id === r.deviceId);
    issues.push({
      id: genId(), severity: 'info', category: 'unmapped_com',
      message: `COM register unused: ${dev?.instanceName || '?'}.${r.name}`, comRegisterId: r.id,
    });
  });

  // 5. Duplicate mappings
  const hwUsed = new Map<string, string>();
  config.mappings.forEach(m => {
    if (m.grounded) return;
    const key = m.source === 'com' ? `com:${m.comRegisterId}` : `hw:${m.hwChannelId}`;
    if (hwUsed.has(key)) {
      issues.push({
        id: genId(), severity: 'error', category: 'duplicate',
        message: `Source mapped twice: ${key}`, mappingId: m.id,
      });
    }
    hwUsed.set(key, m.id);
  });

  // 6. Analog without scaling
  config.mappings.forEach(m => {
    if (m.grounded) return;
    let sigType: SignalType | undefined;
    if (m.source === 'com') {
      sigType = allComRegisters.find(r => r.id === m.comRegisterId)?.signalType;
    } else {
      sigType = allHwChannels.find(c => c.id === m.hwChannelId)?.signalType;
    }
    if ((sigType === 'AI' || sigType === 'AO') && !m.scaling) {
      issues.push({
        id: genId(), severity: 'warning', category: 'scaling',
        message: `Analog signal without scaling`, mappingId: m.id,
      });
    }
  });

  // 7. COM devices without IP
  (config.comDevices || []).forEach(dev => {
    if (!dev.ipAddress && dev.protocol !== 'modbus_rtu') {
      issues.push({
        id: genId(), severity: 'warning', category: 'com_config',
        message: `COM device "${dev.instanceName}" has no IP address`,
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
  const seenIds = new Set<string>();
  (nodes || []).forEach(n => {
    const d = n.data || {};
    if (!d.metsFamily && !d.ports?.length) return;

    const compName = d.metsInstanceName || d.label || n.id.slice(0, 8);
    const family = d.metsFamily || '';

    // METS signals
    if (d.metsSignals?.length) {
      d.metsSignals.forEach((sig: any, idx: number) => {
        let id = `app_${n.id}_${sig.name}`;
        if (seenIds.has(id)) id = `${id}_${idx}`;
        seenIds.add(id);
        signals.push({
          id,
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
      d.ports.forEach((p: any, idx: number) => {
        let id = `app_${n.id}_${p.id || p.name}`;
        if (seenIds.has(id)) id = `${id}_${idx}`;
        seenIds.add(id);
        signals.push({
          id,
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
  const [showCOMLibrary, setShowCOMLibrary] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [rackId, setRackId] = useState('Rack-1');
  const [tab, setTab] = useState<'map' | 'table' | 'issues'>('map');
  const [sourceTab, setSourceTab] = useState<'hw' | 'com'>('hw');
  const [showExport, setShowExport] = useState(false);

  // ─── App signals from PLM ─────────────────────────────
  const appSignals = useMemo(() => extractAppSignals(nodes), [nodes]);

  // ─── All HW channels ─────────────────────────────────
  const allHwChannels = useMemo(() => config.modules.flatMap(m => m.channels), [config.modules]);

  // ─── All COM registers ────────────────────────────────
  const allComRegisters = useMemo(() => (config.comDevices || []).flatMap(d => d.registers), [config.comDevices]);

  // ─── Validation ───────────────────────────────────────
  const issues = useMemo(() => validate(config, appSignals), [config, appSignals]);
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;

  // ─── Mapping helpers ──────────────────────────────────
  const getMappingForHw = useCallback((hwId: string) =>
    config.mappings.find(m => m.source !== 'com' && m.hwChannelId === hwId), [config.mappings]);
  const getMappingForCom = useCallback((regId: string) =>
    config.mappings.find(m => m.source === 'com' && m.comRegisterId === regId), [config.mappings]);
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

  function addCOMDevice(template: COMDeviceTemplate) {
    const existing = (config.comDevices || []).filter(d => d.templateModel === template.model).length;
    const proto = PROTOCOL_INFO[template.protocol] || { defaultPort: 502 };
    const newDevice: COMDevice = {
      id: genId(),
      templateModel: template.model,
      manufacturer: template.manufacturer,
      name: template.name,
      instanceName: `${template.model}-${existing + 1}`,
      protocol: template.protocol,
      ipAddress: '',
      port: proto.defaultPort,
      unitId: 1,
      pollRateMs: 1000,
      registers: template.defaultRegisters.map((r, i) => ({
        id: genId(),
        deviceId: '', // filled below
        name: r.name,
        signalType: r.signalType,
        dataType: r.dataType,
        registerType: r.registerType,
        address: r.address || i,
        slot: r.slot,
        subslot: r.subslot,
        description: r.description,
        byteOrder: r.byteOrder || 'big_endian',
        bitOffset: r.bitOffset,
        scaleFactor: r.scaleFactor,
        tag: '',
      })),
      color: template.color,
    };
    newDevice.registers.forEach(r => r.deviceId = newDevice.id);
    setConfig(prev => ({
      ...prev,
      comDevices: [...(prev.comDevices || []), newDevice],
      updatedAt: new Date().toISOString(),
    }));
    setShowCOMLibrary(false);
  }

  function removeCOMDevice(deviceId: string) {
    setConfig(prev => ({
      ...prev,
      comDevices: (prev.comDevices || []).filter(d => d.id !== deviceId),
      mappings: prev.mappings.filter(m => {
        if (m.source !== 'com') return true;
        const reg = allComRegisters.find(r => r.id === m.comRegisterId);
        return reg?.deviceId !== deviceId;
      }),
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateCOMDeviceField(deviceId: string, field: string, value: any) {
    setConfig(prev => ({
      ...prev,
      comDevices: (prev.comDevices || []).map(d =>
        d.id === deviceId ? { ...d, [field]: value } : d
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function createMapping(sourceType: MappingSource, sourceId: string, appSignalId: string) {
    const isAnalog = sourceType === 'com'
      ? (() => { const r = allComRegisters.find(c => c.id === sourceId); return r && (r.signalType === 'AI' || r.signalType === 'AO'); })()
      : (() => { const h = allHwChannels.find(c => c.id === sourceId); return h && (h.signalType === 'AI' || h.signalType === 'AO'); })();

    const mapping: HALMapping = {
      id: genId(),
      source: sourceType,
      hwChannelId: sourceType === 'hw' ? sourceId : '',
      comRegisterId: sourceType === 'com' ? sourceId : '',
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
      mappings: [
        ...prev.mappings.filter(m =>
          !(sourceType === 'hw' && m.source !== 'com' && m.hwChannelId === sourceId) &&
          !(sourceType === 'com' && m.source === 'com' && m.comRegisterId === sourceId) &&
          !(m.appSignalId === appSignalId)
        ),
        mapping,
      ],
      updatedAt: new Date().toISOString(),
    }));
    setSelectedHw(null);
    setSelectedApp(null);
  }

  function groundSignal(appSignalId: string, value: string) {
    const mapping: HALMapping = {
      id: genId(),
      source: 'hw',
      hwChannelId: '',
      comRegisterId: '',
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
      createMapping(sourceTab === 'com' ? 'com' : 'hw', chId, selectedApp);
    } else {
      setSelectedHw(selectedHw === chId ? null : chId);
      setSelectedApp(null);
    }
  }

  function handleAppClick(sigId: string) {
    if (selectedHw) {
      createMapping(sourceTab === 'com' ? 'com' : 'hw', selectedHw, sigId);
    } else {
      setSelectedApp(selectedApp === sigId ? null : sigId);
      setSelectedHw(null);
    }
  }

  // ─── Auto-Suggest ──────────────────────────────────────
  const [showSuggestions, setShowSuggestions] = useState(false);

  interface Suggestion {
    sourceType: MappingSource;
    sourceId: string;
    sourceName: string;
    appSignalId: string;
    appName: string;
    score: number;
    reason: string;
  }

  function computeSuggestions(): Suggestion[] {
    const mappedAppIds = new Set(config.mappings.map(m => m.appSignalId));
    const mappedHwIds = new Set(config.mappings.filter(m => m.source !== 'com').map(m => m.hwChannelId));
    const mappedComIds = new Set(config.mappings.filter(m => m.source === 'com').map(m => m.comRegisterId));

    const unmappedApp = appSignals.filter(s => !mappedAppIds.has(s.id));
    const unmappedHw = allHwChannels.filter((c: HWChannel) => !mappedHwIds.has(c.id));
    const unmappedCom = allComRegisters.filter((r: COMRegister) => !mappedComIds.has(r.id));

    const suggestions: Suggestion[] = [];

    function nameScore(a: string, b: string): number {
      const al = a.toLowerCase().replace(/[_\-.\s]/g, '');
      const bl = b.toLowerCase().replace(/[_\-.\s]/g, '');
      if (al === bl) return 1.0;
      if (al.includes(bl) || bl.includes(al)) return 0.8;
      const aw = a.toLowerCase().split(/[_\-.\s]+/).filter(Boolean);
      const bw = b.toLowerCase().split(/[_\-.\s]+/).filter(Boolean);
      const common = aw.filter(w => bw.some(bww => bww.includes(w) || w.includes(bww))).length;
      if (common > 0) return 0.3 + 0.4 * (common / Math.max(aw.length, bw.length));
      return 0;
    }

    function tagScore(tag: string, appName: string): number {
      if (!tag) return 0;
      const tl = tag.toLowerCase().replace(/[_\-.\s]/g, '');
      const al = appName.toLowerCase().replace(/[_\-.\s]/g, '');
      if (tl === al) return 1.0;
      if (al.includes(tl) || tl.includes(al)) return 0.7;
      return 0;
    }

    for (const app of unmappedApp) {
      let best: Suggestion | null = null;

      for (const hw of unmappedHw) {
        if (hw.signalType !== app.signalType) continue;
        const ns = Math.max(nameScore(hw.terminal, app.signalName), nameScore(hw.description || '', app.signalName));
        const ts = tagScore(hw.tag, app.signalName);
        const score = Math.max(ns, ts);
        if (score > 0.2 && (!best || score > best.score)) {
          best = {
            sourceType: 'hw', sourceId: hw.id, sourceName: hw.terminal,
            appSignalId: app.id, appName: `${app.componentName}.${app.signalName}`,
            score, reason: ts > ns ? `tag "${hw.tag}"` : 'name match',
          };
        }
      }

      for (const reg of unmappedCom) {
        if (reg.signalType !== app.signalType) continue;
        const ns = Math.max(nameScore(reg.name, app.signalName), nameScore(reg.description || '', app.signalName));
        const ts = tagScore(reg.tag, app.signalName);
        const score = Math.max(ns, ts);
        if (score > 0.2 && (!best || score > best.score)) {
          const dev = (config.comDevices || []).find(d => d.id === reg.deviceId);
          best = {
            sourceType: 'com', sourceId: reg.id, sourceName: `${dev?.instanceName || '?'}.${reg.name}`,
            appSignalId: app.id, appName: `${app.componentName}.${app.signalName}`,
            score, reason: ts > ns ? `tag "${reg.tag}"` : 'name match',
          };
        }
      }

      if (best) suggestions.push(best);
    }
    return suggestions.sort((a, b) => b.score - a.score);
  }

  function acceptSuggestion(s: Suggestion) {
    createMapping(s.sourceType, s.sourceId, s.appSignalId);
  }

  function acceptAllSuggestions(suggestions: Suggestion[]) {
    const now = new Date().toISOString();
    const newMappings: HALMapping[] = suggestions.map(s => {
      const srcType = s.sourceType === 'com'
        ? allComRegisters.find((r: COMRegister) => r.id === s.sourceId)?.signalType
        : allHwChannels.find((c: HWChannel) => c.id === s.sourceId)?.signalType;
      const isAnalog = srcType === 'AI' || srcType === 'AO';
      return {
        id: genId(), source: s.sourceType,
        hwChannelId: s.sourceType === 'hw' ? s.sourceId : '',
        comRegisterId: s.sourceType === 'com' ? s.sourceId : '',
        appSignalId: s.appSignalId,
        scaling: isAnalog ? defaultScaling() : undefined,
        grounded: false, groundValue: '', notes: `Auto-suggested: ${s.reason}`,
        status: 'mapped' as const, createdAt: now, updatedAt: now,
      };
    });
    setConfig(prev => ({
      ...prev,
      mappings: [...prev.mappings, ...newMappings],
      updatedAt: now,
    }));
    setShowSuggestions(false);
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
  const comDeviceCount = (config.comDevices || []).length;
  const comRegisterCount = allComRegisters.length;

  // ═════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════

  return (
    <div style={{
      ...style,
      display: 'flex', flexDirection: 'column',
      background: t.bgApp, color: t.textPrimary,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    }} onClick={() => showExport && setShowExport(false)}>
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

        {/* Auto-suggest */}
        <button onClick={() => setShowSuggestions(true)} style={{
          background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '4px',
          padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
        }} title="Auto-suggest mappings based on signal type and name matching">
          🔮 Auto-Map
        </button>
        {/* Export dropdown */}
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowExport(!showExport)} style={{
            background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '4px',
            color: t.textPrimary, padding: '4px 10px', fontSize: '11px', cursor: 'pointer',
          }} title="Export HAL configuration">
            📤 Export
          </button>
          {showExport && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: '4px', zIndex: 100,
              background: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: '6px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)', minWidth: '240px', padding: '4px',
            }}>
              <div style={{ padding: '4px 10px 2px', fontSize: '9px', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>I/O Documentation</div>
              {[
                { label: '📊 I/O List (Excel)', desc: 'Professional .xlsx — 4 sheets', fmt: 'xlsx' as const },
                { label: '📄 I/O List (PDF)', desc: 'Print-ready A3 landscape', fmt: 'pdf' as const },
              ].map(item => (
                <button key={item.fmt} onClick={() => {
                  if (item.fmt === 'xlsx') exportIOListExcel(config, appSignals, config.name);
                  else exportIOListPDF(config, appSignals, config.name);
                  setShowExport(false);
                }} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                  background: 'transparent', border: 'none', borderRadius: '4px',
                  padding: '8px 10px', cursor: 'pointer', color: t.textPrimary, textAlign: 'left',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${t.accent}20`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: '10px', color: t.textSecondary }}>{item.desc}</div>
                  </div>
                </button>
              ))}
              <div style={{ borderTop: `1px solid ${t.border}`, margin: '4px 0' }} />
              <div style={{ padding: '4px 10px 2px', fontSize: '9px', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>PLC / Integration</div>
              {[
                { label: '🏭 WAGO XML', desc: 'e!COCKPIT / CODESYS', fmt: 'xml' as const },
                { label: '📝 CODESYS GVL', desc: 'IEC 61131-3 variables', fmt: 'gvl' as const },
                { label: '📋 CSV', desc: 'Raw I/O data', fmt: 'csv' as const },
                { label: '💾 JSON', desc: 'Complete config backup', fmt: 'json' as const },
              ].map(item => (
                <button key={item.fmt} onClick={() => {
                  const name = config.name?.replace(/\s+/g, '_') || 'hal';
                  const ver = config.version || '0.1';
                  if (item.fmt === 'xml') {
                    downloadFile(exportWAGOXML(config, appSignals), `${name}_v${ver}.xml`, 'application/xml');
                  } else if (item.fmt === 'gvl') {
                    downloadFile(exportCODESYSGVL(config, appSignals), `${name}_v${ver}_GVL.st`, 'text/plain');
                  } else if (item.fmt === 'csv') {
                    downloadFile(exportCSV(config, appSignals), `${name}_v${ver}_IO_List.csv`, 'text/csv');
                  } else {
                    downloadFile(exportJSON(config, appSignals), `${name}_v${ver}.json`, 'application/json');
                  }
                  setShowExport(false);
                }} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                  background: 'transparent', border: 'none', borderRadius: '4px',
                  padding: '8px 10px', cursor: 'pointer', color: t.textPrimary, textAlign: 'left',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${t.accent}20`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: '10px', color: t.textSecondary }}>{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
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
          {comDeviceCount > 0 && <span style={{ color: '#8b5cf6' }}>📡 {comDeviceCount} COM ({comRegisterCount} reg)</span>}
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
            getMappingForCom={getMappingForCom}
            onRemoveMapping={removeMapping} onGround={groundSignal}
            onAddModule={() => setShowModuleLibrary(true)}
            onRemoveModule={removeModule}
            allHwChannels={allHwChannels}
            allComRegisters={allComRegisters}
            onEditScaling={setEditingMapping}
            sourceTab={sourceTab} onSetSourceTab={setSourceTab}
            onAddCOMDevice={() => setShowCOMLibrary(true)}
            onRemoveCOMDevice={removeCOMDevice}
            onUpdateCOMField={updateCOMDeviceField}
          />
        ) : tab === 'table' ? (
          <TableView
            t={t} config={config} appSignals={appSignals}
            allHwChannels={allHwChannels} allComRegisters={allComRegisters}
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

      {/* ─── COM Device Library Modal ─── */}
      {showCOMLibrary && (
        <COMDeviceLibraryModal
          t={t}
          onAdd={addCOMDevice}
          onClose={() => setShowCOMLibrary(false)}
        />
      )}

      {/* ─── Auto-Suggest Modal ─── */}
      {showSuggestions && (
        <AutoSuggestModal
          t={t}
          suggestions={computeSuggestions()}
          onAccept={acceptSuggestion}
          onAcceptAll={acceptAllSuggestions}
          onClose={() => setShowSuggestions(false)}
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

// ═══════════════════════════════════════════════════════════
// RENDER HW MODULE (extracted helper)
// ═══════════════════════════════════════════════════════════

function renderHWModule(mod: any, t: any, getMappingForHw: any, appSignals: any[], selectedHw: string | null, onHwClick: any, onHwTag: any, onEditScaling: any, onRemoveMapping: any, onRemoveModule: any) {
  return (
    <div key={mod.id} style={{
      marginBottom: '8px', background: t.bgSecondary,
      border: `1px solid ${t.border}`, borderRadius: '8px',
      borderLeft: `4px solid ${mod.color}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', padding: '8px 10px',
        borderBottom: `1px solid ${t.border}`,
      }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: mod.color }}>{mod.templateModel}</span>
        <span style={{ fontSize: '11px', color: t.textSecondary, marginLeft: '8px' }}>{mod.name}</span>
        <span style={{ fontSize: '10px', color: t.textSecondary, marginLeft: '8px', fontFamily: 'monospace' }}>
          Pos {mod.rackPosition} · {mod.rackId}
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={() => onRemoveModule(mod.id)} style={{
          background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px',
        }} title="Remove">✕</button>
      </div>
      {mod.channels.map((ch: any) => {
        const mapping = getMappingForHw(ch.id);
        const isMapped = !!mapping;
        const isSelected = selectedHw === ch.id;
        const sigColor = SIG_COLORS[ch.signalType as SignalType];
        const appSig = mapping ? appSignals.find((s: any) => s.id === mapping.appSignalId) : null;
        return (
          <div key={ch.id} onClick={() => onHwClick(ch.id)} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 10px', cursor: 'pointer',
            background: isSelected ? `${t.accent}20` : isMapped ? `${sigColor.bg}40` : 'transparent',
            borderBottom: `1px solid ${t.border}`,
            borderLeft: isSelected ? `3px solid ${t.accent}` : '3px solid transparent',
          }}>
            <span style={{ ...badgeStyle(sigColor), minWidth: '24px', textAlign: 'center' as const }}>{sigColor.label}</span>
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: t.textPrimary, minWidth: '70px' }}>{ch.terminal}</span>
            <span style={{ fontSize: '10px', color: t.textSecondary, minWidth: '50px' }}>{ch.electricalType}</span>
            <input value={ch.tag} onChange={(e) => { e.stopPropagation(); onHwTag(ch.id, e.target.value); }}
              onClick={(e) => e.stopPropagation()} placeholder="Tag..."
              style={{ width: '70px', padding: '2px 4px', fontSize: '10px', background: t.bgMain, border: `1px solid ${t.border}`, borderRadius: '3px', color: t.textPrimary, fontFamily: 'monospace' }} />
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
              {isMapped ? (
                <>
                  <span style={{ fontSize: '10px', color: '#22c55e' }}>→</span>
                  <span style={{ fontSize: '10px', color: t.textSecondary, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appSig?.signalName || '?'}</span>
                  {mapping.scaling && (
                    <button onClick={(e) => { e.stopPropagation(); onEditScaling(mapping.id); }} style={{
                      background: '#fef3c7', border: 'none', borderRadius: '3px', padding: '1px 4px', fontSize: '9px', color: '#d97706', cursor: 'pointer', fontWeight: 600,
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
  );
}

// ═══════════════════════════════════════════════════════════
// MAP VIEW
// ═══════════════════════════════════════════════════════════

function MapView({ t, config, appSignals, filteredHwChannels, filteredAppSignals,
  selectedHw, selectedApp, onHwClick, onAppClick, onHwTag,
  getMappingForHw, getMappingForApp, getMappingForCom, onRemoveMapping, onGround,
  onAddModule, onRemoveModule, allHwChannels, allComRegisters, onEditScaling,
  sourceTab, onSetSourceTab, onAddCOMDevice, onRemoveCOMDevice, onUpdateCOMField,
}: any) {
  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* ─── Left: Sources (HW / COM) ─── */}
      <div style={{
        width: '38%', borderRight: `1px solid ${t.border}`,
        overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        {/* Source tab toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '8px 12px',
          borderBottom: `1px solid ${t.border}`, gap: '4px', flexShrink: 0,
        }}>
          {(['hw', 'com'] as const).map(st => (
            <button key={st} onClick={() => onSetSourceTab(st)} style={{
              flex: 1, padding: '6px', borderRadius: '6px', border: 'none', fontSize: '11px',
              cursor: 'pointer', fontWeight: 600,
              background: sourceTab === st ? t.accent : 'transparent',
              color: sourceTab === st ? '#fff' : t.textSecondary,
            }}>
              {st === 'hw' ? '⚡ Hardware I/O' : '📡 COM / Fieldbus'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {sourceTab === 'hw' ? (
            /* ─── HW Panel ─── */
            <>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: t.textSecondary }}>
                  {config.modules.length} modules · {allHwChannels.length} ch
                </span>
                <div style={{ flex: 1 }} />
                <button onClick={onAddModule} style={{
                  background: t.accent, color: '#fff', border: 'none', borderRadius: '4px',
                  padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                }}>+ Module</button>
              </div>

              {config.modules.length === 0 ? (
                <EmptyState icon="⚡" title="No hardware modules" subtitle="Add WAGO modules from the library" t={t} />
              ) : (
                config.modules.map((mod: any) => renderHWModule(mod, t, getMappingForHw, appSignals, selectedHw, onHwClick, onHwTag, onEditScaling, onRemoveMapping, onRemoveModule))
              )}
            </>
          ) : (
            /* ─── COM Panel ─── */
            <>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: t.textSecondary }}>
                  {(config.comDevices || []).length} devices · {allComRegisters.length} reg
                </span>
                <div style={{ flex: 1 }} />
                <button onClick={onAddCOMDevice} style={{
                  background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '4px',
                  padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                }}>+ COM Device</button>
              </div>

              {(config.comDevices || []).length === 0 ? (
                <EmptyState icon="📡" title="No COM devices" subtitle="Add Modbus/PROFINET devices from the library" t={t} />
              ) : (
                (config.comDevices || []).map((dev: COMDevice) => {
                  const proto = PROTOCOL_INFO[dev.protocol] || { label: dev.protocol, icon: '📡', color: '#64748b' };
                  return (
                    <div key={dev.id} style={{
                      marginBottom: '8px', background: t.bgSecondary,
                      border: `1px solid ${t.border}`, borderRadius: '8px',
                      borderLeft: `4px solid ${dev.color}`,
                    }}>
                      {/* Device header */}
                      <div style={{
                        padding: '8px 10px', borderBottom: `1px solid ${t.border}`,
                        display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
                      }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: dev.color }}>{dev.templateModel}</span>
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: `${proto.color}20`, color: proto.color, fontWeight: 600 }}>
                          {proto.icon} {proto.label}
                        </span>
                        <input value={dev.instanceName} onChange={e => onUpdateCOMField(dev.id, 'instanceName', e.target.value)}
                          style={{ fontSize: '11px', fontFamily: 'monospace', background: t.bgMain, border: `1px solid ${t.border}`, borderRadius: '3px', padding: '2px 4px', color: t.textPrimary, width: '120px' }} />
                        <input value={dev.ipAddress} onChange={e => onUpdateCOMField(dev.id, 'ipAddress', e.target.value)} placeholder="IP..."
                          style={{ fontSize: '10px', fontFamily: 'monospace', background: t.bgMain, border: `1px solid ${t.border}`, borderRadius: '3px', padding: '2px 4px', color: t.textPrimary, width: '100px' }} />
                        <span style={{ fontSize: '10px', color: t.textSecondary }}>:{dev.port} ID:{dev.unitId}</span>
                        <div style={{ flex: 1 }} />
                        <button onClick={() => onRemoveCOMDevice(dev.id)} style={{
                          background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px',
                        }} title="Remove">✕</button>
                      </div>

                      {/* Registers */}
                      {dev.registers.map(reg => {
                        const mapping = getMappingForCom(reg.id);
                        const isMapped = !!mapping;
                        const isSelected = selectedHw === reg.id;
                        const sigColor = SIG_COLORS[reg.signalType as SignalType];
                        const appSig = mapping ? appSignals.find((s: any) => s.id === mapping.appSignalId) : null;
                        const regInfo = reg.registerType ? (REGISTER_TYPE_INFO[reg.registerType] || {}) : {};

                        return (
                          <div key={reg.id} onClick={() => onHwClick(reg.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '5px',
                              padding: '5px 10px', cursor: 'pointer',
                              background: isSelected ? `${t.accent}20` : isMapped ? `${sigColor.bg}40` : 'transparent',
                              borderBottom: `1px solid ${t.border}`,
                              borderLeft: isSelected ? `3px solid ${t.accent}` : '3px solid transparent',
                            }}>
                            <span style={{ ...badgeStyle(sigColor), minWidth: '24px', textAlign: 'center' as const }}>{sigColor.label}</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: t.textPrimary, minWidth: '90px' }}>{reg.name}</span>
                            <span style={{ fontSize: '9px', color: t.textSecondary, minWidth: '45px' }}>{reg.dataType}</span>
                            {reg.registerType && (
                              <span style={{ fontSize: '9px', color: t.textSecondary, opacity: 0.6 }}>@{reg.address}</span>
                            )}
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                              {isMapped ? (
                                <>
                                  <span style={{ fontSize: '10px', color: '#22c55e' }}>→</span>
                                  <span style={{ fontSize: '10px', color: t.textSecondary, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {appSig?.signalName || '?'}
                                  </span>
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
                  );
                })
              )}
            </>
          )}
        </div>
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

function TableView({ t, config, appSignals, allHwChannels, allComRegisters, onRemoveMapping }: any) {
  const rows: any[] = [];

  config.mappings.forEach((m: HALMapping) => {
    const isCom = m.source === 'com';
    const hw = isCom ? null : allHwChannels.find((c: any) => c.id === m.hwChannelId);
    const com = isCom ? allComRegisters.find((r: any) => r.id === m.comRegisterId) : null;
    const comDev = com ? (config.comDevices || []).find((d: any) => d.id === com.deviceId) : null;
    const app = appSignals.find((s: any) => s.id === m.appSignalId);
    rows.push({ mapping: m, hw, com, comDev, app, source: isCom ? 'com' : 'hw' });
  });

  // Unmapped app signals
  const mappedAppIds = new Set(config.mappings.map((m: HALMapping) => m.appSignalId));
  appSignals.filter((s: AppSignal) => !mappedAppIds.has(s.id)).forEach((s: AppSignal) => {
    rows.push({ mapping: null, hw: null, com: null, comDev: null, app: s, source: null });
  });

  // Unmapped HW channels
  const mappedHwIds = new Set(config.mappings.filter((m: HALMapping) => m.source !== 'com').map((m: HALMapping) => m.hwChannelId));
  allHwChannels.filter((c: any) => !mappedHwIds.has(c.id)).forEach((c: any) => {
    rows.push({ mapping: null, hw: c, com: null, comDev: null, app: null, source: 'hw' });
  });

  // Unmapped COM registers
  const mappedComIds = new Set(config.mappings.filter((m: HALMapping) => m.source === 'com').map((m: HALMapping) => m.comRegisterId));
  allComRegisters.filter((r: any) => !mappedComIds.has(r.id)).forEach((r: any) => {
    const comDev = (config.comDevices || []).find((d: any) => d.id === r.deviceId);
    rows.push({ mapping: null, hw: null, com: r, comDev, app: null, source: 'com' });
  });

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: `${t.accent}10`, position: 'sticky', top: 0 }}>
            {['Status', 'Source', 'Terminal/Register', 'Type', 'Tag', 'Detail', '→', 'App Signal', 'App Type', 'Component', 'Scaling', ''].map(h => (
              <th key={h} style={{
                padding: '8px 6px', textAlign: 'left', fontWeight: 600,
                color: t.textPrimary, borderBottom: `2px solid ${t.border}`, fontSize: '10px',
                whiteSpace: 'nowrap', background: t.bgPanel,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const status = row.mapping?.grounded ? 'grounded' : row.mapping ? 'mapped' : 'unmapped';
            const statusColor = status === 'mapped' ? '#22c55e' : status === 'grounded' ? '#94a3b8' : '#f59e0b';
            const srcType = row.hw?.signalType || row.com?.signalType;
            const appType = row.app?.signalType as SignalType | undefined;
            const typeMismatch = srcType && appType && srcType !== appType;

            return (
              <tr key={idx} style={{
                background: idx % 2 === 0 ? 'transparent' : `${t.accent}04`,
                borderBottom: `1px solid ${t.border}`,
              }}>
                <td style={{ padding: '5px 6px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: statusColor, marginRight: '4px' }} />
                  <span style={{ fontSize: '10px', color: statusColor, fontWeight: 500 }}>{status}</span>
                </td>
                <td style={{ padding: '5px 6px' }}>
                  {row.source === 'com' ? (
                    <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: '#8b5cf620', color: '#8b5cf6', fontWeight: 600 }}>COM</span>
                  ) : row.source === 'hw' ? (
                    <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: '#f59e0b20', color: '#f59e0b', fontWeight: 600 }}>HW</span>
                  ) : '—'}
                </td>
                <td style={{ padding: '5px 6px', fontFamily: 'monospace', fontSize: '10px', color: t.textPrimary }}>
                  {row.hw?.terminal || row.com?.name || (row.mapping?.grounded ? '⏚' : '—')}
                  {row.comDev && <span style={{ fontSize: '9px', color: t.textSecondary, marginLeft: '4px' }}>@{row.comDev.instanceName}</span>}
                </td>
                <td style={{ padding: '5px 6px' }}>
                  {srcType && <span style={{ ...badgeStyle(SIG_COLORS[srcType]) }}>{srcType}</span>}
                </td>
                <td style={{ padding: '5px 6px', fontFamily: 'monospace', fontSize: '10px', color: t.textSecondary }}>
                  {row.hw?.tag || row.com?.tag || '—'}
                </td>
                <td style={{ padding: '5px 6px', fontSize: '9px', color: t.textSecondary }}>
                  {row.hw?.electricalType || (row.com ? `${row.com.dataType} @${row.com.address}` : '—')}
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'center', color: typeMismatch ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                  {row.mapping ? (typeMismatch ? '⚠' : '→') : '·'}
                </td>
                <td style={{ padding: '5px 6px', fontFamily: 'monospace', fontSize: '10px', color: row.app ? t.textPrimary : t.textSecondary }}>
                  {row.app?.signalName || (row.mapping?.grounded ? `⏚ ${row.mapping.groundValue}` : '—')}
                </td>
                <td style={{ padding: '5px 6px' }}>
                  {appType && <span style={{ ...badgeStyle(SIG_COLORS[appType]) }}>{appType}</span>}
                </td>
                <td style={{ padding: '5px 6px', fontSize: '10px', color: t.textSecondary }}>
                  {row.app?.componentName || '—'}
                </td>
                <td style={{ padding: '5px 6px', fontSize: '10px', color: t.textSecondary }}>
                  {row.mapping?.scaling
                    ? `${row.mapping.scaling.engMin}–${row.mapping.scaling.engMax} ${row.mapping.scaling.unit}`
                    : '—'}
                </td>
                <td style={{ padding: '5px 6px' }}>
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
// COM DEVICE LIBRARY MODAL
// ═══════════════════════════════════════════════════════════

function COMDeviceLibraryModal({ t, onAdd, onClose }: {
  t: any; onAdd: (template: COMDeviceTemplate) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filterProto, setFilterProto] = useState<string>('all');

  const filtered = COM_DEVICES.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.model.toLowerCase().includes(search.toLowerCase()) ||
      d.manufacturer.toLowerCase().includes(search.toLowerCase());
    const matchProto = filterProto === 'all' || d.protocol === filterProto;
    return matchSearch && matchProto;
  });

  const protocols = [...new Set(COM_DEVICES.map(d => d.protocol))];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: t.bgPanel, borderRadius: '12px', width: '600px', maxHeight: '80vh',
        overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        border: `1px solid ${t.border}`,
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: t.textPrimary }}>
            📡 COM / Fieldbus Device Library
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: t.textSecondary, cursor: 'pointer', fontSize: '16px',
          }}>✕</button>
        </div>

        {/* Filters */}
        <div style={{ padding: '10px 20px', display: 'flex', gap: '8px', borderBottom: `1px solid ${t.border}` }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search devices..."
            style={{
              flex: 1, padding: '6px 10px', fontSize: '12px', borderRadius: '6px',
              border: `1px solid ${t.border}`, background: t.bgMain, color: t.textPrimary,
            }} />
          <select value={filterProto} onChange={e => setFilterProto(e.target.value)}
            style={{
              padding: '6px 10px', fontSize: '11px', borderRadius: '6px',
              border: `1px solid ${t.border}`, background: t.bgMain, color: t.textPrimary,
            }}>
            <option value="all">All protocols</option>
            {protocols.map(p => {
              const info = PROTOCOL_INFO[p] || { label: p, icon: '' };
              return <option key={p} value={p}>{info.icon} {info.label}</option>;
            })}
          </select>
        </div>

        {/* Device list */}
        <div style={{ overflowY: 'auto', maxHeight: '50vh', padding: '10px 20px' }}>
          {filtered.map(dev => {
            const proto = PROTOCOL_INFO[dev.protocol] || { label: dev.protocol, icon: '📡', color: '#64748b' };
            return (
              <div key={dev.model} onClick={() => onAdd(dev)} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px', marginBottom: '6px', borderRadius: '8px',
                border: `1px solid ${t.border}`, cursor: 'pointer',
                transition: 'all 100ms',
              }}
              onMouseOver={e => (e.currentTarget.style.background = `${dev.color}15`)}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: '24px' }}>{dev.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: t.textPrimary }}>{dev.name}</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: dev.color, fontWeight: 600 }}>{dev.model}</span>
                    <span style={{ fontSize: '10px', color: t.textSecondary }}>{dev.manufacturer}</span>
                    <span style={{
                      fontSize: '9px', padding: '1px 6px', borderRadius: '3px',
                      background: `${proto.color}20`, color: proto.color, fontWeight: 600,
                    }}>{proto.icon} {proto.label}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: t.textSecondary, marginTop: '2px' }}>
                    {dev.defaultRegisters.length} registers:
                    {' '}{dev.defaultRegisters.filter(r => r.signalType === 'AI').length} AI,
                    {' '}{dev.defaultRegisters.filter(r => r.signalType === 'DI').length} DI,
                    {' '}{dev.defaultRegisters.filter(r => r.signalType === 'AO').length} AO,
                    {' '}{dev.defaultRegisters.filter(r => r.signalType === 'DO').length} DO
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// AUTO-SUGGEST MODAL
// ═══════════════════════════════════════════════════════════

function AutoSuggestModal({ t, suggestions, onAccept, onAcceptAll, onClose }: {
  t: any; suggestions: any[]; onAccept: (s: any) => void;
  onAcceptAll: (s: any[]) => void; onClose: () => void;
}) {
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: t.bgPanel, borderRadius: '12px', width: '700px', maxHeight: '80vh',
        overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        border: `1px solid ${t.border}`,
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: t.textPrimary }}>
              🔮 Auto-Suggest Mappings
            </div>
            <div style={{ fontSize: '11px', color: t.textSecondary, marginTop: '2px' }}>
              {suggestions.length} suggestions based on signal type + name matching
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {suggestions.length > 0 && (
              <button onClick={() => onAcceptAll(suggestions)} style={{
                background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px',
                padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}>✓ Accept All ({suggestions.length})</button>
            )}
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: t.textSecondary, cursor: 'pointer', fontSize: '16px',
            }}>✕</button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', maxHeight: '60vh', padding: '10px 20px' }}>
          {suggestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: t.textSecondary }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>No suggestions</div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>All signals are mapped, or no matching sources found.</div>
              <div style={{ fontSize: '10px', marginTop: '8px', color: t.textSecondary }}>
                Tip: Add HW tags or COM device tags that match your app signal names for better suggestions.
              </div>
            </div>
          ) : (
            suggestions.map((s, idx) => {
              const isAccepted = accepted.has(s.appSignalId);
              const confidence = s.score >= 0.8 ? 'high' : s.score >= 0.5 ? 'medium' : 'low';
              const confColor = confidence === 'high' ? '#22c55e' : confidence === 'medium' ? '#f59e0b' : '#94a3b8';
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', marginBottom: '4px', borderRadius: '8px',
                  border: `1px solid ${isAccepted ? '#22c55e' : t.border}`,
                  background: isAccepted ? '#22c55e10' : 'transparent',
                  opacity: isAccepted ? 0.6 : 1,
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: confColor, minWidth: '30px' }}>
                    {Math.round(s.score * 100)}%
                  </span>
                  <span style={{
                    fontSize: '9px', padding: '1px 5px', borderRadius: '3px', fontWeight: 600,
                    background: s.sourceType === 'com' ? '#8b5cf620' : '#f59e0b20',
                    color: s.sourceType === 'com' ? '#8b5cf6' : '#f59e0b',
                  }}>{s.sourceType === 'com' ? 'COM' : 'HW'}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: t.textPrimary, minWidth: '140px' }}>
                    {s.sourceName}
                  </span>
                  <span style={{ color: '#22c55e', fontSize: '12px' }}>→</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: t.textPrimary, flex: 1 }}>
                    {s.appName}
                  </span>
                  <span style={{ fontSize: '9px', color: t.textSecondary }}>{s.reason}</span>
                  {!isAccepted ? (
                    <button onClick={() => {
                      onAccept(s);
                      setAccepted(prev => new Set([...prev, s.appSignalId]));
                    }} style={{
                      background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px',
                      padding: '3px 10px', fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                    }}>✓</button>
                  ) : (
                    <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: 600 }}>✓ Done</span>
                  )}
                </div>
              );
            })
          )}
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

