// src/components/HALManager/halExport.ts
// Export HAL configuration as WAGO-compatible XML, CSV, or JSON

import type {
  HALConfig, HALMapping, HWModule, HWChannel,
  AppSignal, SignalScaling, COMDevice, COMRegister,
} from './halTypes';

// ─── Helpers ────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function indent(level: number): string { return '  '.repeat(level); }

function isoNow(): string { return new Date().toISOString(); }

function getMapping(mappings: HALMapping[], hwId: string): HALMapping | undefined {
  return mappings.find(m => m.source !== 'com' && m.hwChannelId === hwId);
}

function getComMapping(mappings: HALMapping[], regId: string): HALMapping | undefined {
  return mappings.find(m => m.source === 'com' && m.comRegisterId === regId);
}

function scalingToString(s: SignalScaling): string {
  return `${s.rawMin}..${s.rawMax} → ${s.engMin}..${s.engMax} ${s.unit}`;
}

// ─── WAGO XML Export ────────────────────────────────────
//
// Generates XML compatible with WAGO e!COCKPIT / CODESYS
// IO configuration format. Structured as:
//   <WAGOConfiguration>
//     <Project>
//     <Nodes>
//       <Node> (= fieldbus coupler / rack)
//         <Modules>
//           <Module> (= I/O module in slot)
//             <Channels>
//               <Channel> (= individual I/O point)
//     <SignalMappings>
//     <COMDevices>

export function exportWAGOXML(
  config: HALConfig,
  appSignals: AppSignal[],
): string {
  const lines: string[] = [];
  const appMap = new Map(appSignals.map(s => [s.id, s]));

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(`<WAGOConfiguration version="1.0" generator="Northlight PLM" exported="${isoNow()}">`);

  // Project info
  lines.push(`${indent(1)}<Project>`);
  lines.push(`${indent(2)}<Name>${esc(config.name || 'HAL Configuration')}</Name>`);
  lines.push(`${indent(2)}<Version>${esc(config.version)}</Version>`);
  lines.push(`${indent(2)}<Description>${esc(config.description || '')}</Description>`);
  lines.push(`${indent(2)}<ProjectId>${esc(config.projectId)}</ProjectId>`);
  lines.push(`${indent(1)}</Project>`);

  // Group modules by rack
  const racks = new Map<string, HWModule[]>();
  for (const mod of config.modules) {
    const rk = mod.rackId || 'Rack-1';
    if (!racks.has(rk)) racks.set(rk, []);
    racks.get(rk)!.push(mod);
  }

  lines.push(`${indent(1)}<Nodes>`);
  for (const [rackId, modules] of racks) {
    const sorted = [...modules].sort((a, b) => a.rackPosition - b.rackPosition);
    const coupler = sorted.find(m => m.templateModel === '750-352');

    lines.push(`${indent(2)}<Node id="${esc(rackId)}">`);
    lines.push(`${indent(3)}<Name>${esc(rackId)}</Name>`);
    if (coupler) {
      lines.push(`${indent(3)}<Coupler model="${esc(coupler.templateModel)}" name="${esc(coupler.name)}" />`);
    }
    lines.push(`${indent(3)}<Modules>`);

    for (const mod of sorted) {
      if (mod.templateModel === '750-352' || mod.templateModel === '750-600') continue;

      lines.push(`${indent(4)}<Module position="${mod.rackPosition}" model="${esc(mod.templateModel)}" name="${esc(mod.name)}">`);

      // Process data summary
      const diCount = mod.channels.filter(c => c.signalType === 'DI').length;
      const doCount = mod.channels.filter(c => c.signalType === 'DO').length;
      const aiCount = mod.channels.filter(c => c.signalType === 'AI').length;
      const aoCount = mod.channels.filter(c => c.signalType === 'AO').length;
      lines.push(`${indent(5)}<ProcessData di="${diCount}" do="${doCount}" ai="${aiCount}" ao="${aoCount}" />`);

      lines.push(`${indent(5)}<Channels>`);
      for (const ch of mod.channels) {
        const mapping = getMapping(config.mappings, ch.id);
        const app = mapping ? appMap.get(mapping.appSignalId) : undefined;

        lines.push(`${indent(6)}<Channel number="${ch.channelNumber}" signalType="${ch.signalType}">`);
        lines.push(`${indent(7)}<Terminal>${esc(ch.terminal)}</Terminal>`);
        lines.push(`${indent(7)}<Tag>${esc(ch.tag || '')}</Tag>`);
        lines.push(`${indent(7)}<ElectricalType>${esc(ch.electricalType)}</ElectricalType>`);
        lines.push(`${indent(7)}<Description>${esc(ch.description || '')}</Description>`);

        if (mapping && app) {
          lines.push(`${indent(7)}<Mapping status="${mapping.status}">`);
          lines.push(`${indent(8)}<AppSignal>${esc(`${app.componentName}.${app.signalName}`)}</AppSignal>`);
          lines.push(`${indent(8)}<AppSignalType>${app.signalType}</AppSignalType>`);
          lines.push(`${indent(8)}<AppDataType>${esc(app.dataType || 'BOOL')}</AppDataType>`);
          if (mapping.notes) {
            lines.push(`${indent(8)}<Notes>${esc(mapping.notes)}</Notes>`);
          }
          if (mapping.scaling) {
            const s = mapping.scaling;
            lines.push(`${indent(8)}<Scaling>`);
            lines.push(`${indent(9)}<RawMin>${s.rawMin}</RawMin>`);
            lines.push(`${indent(9)}<RawMax>${s.rawMax}</RawMax>`);
            lines.push(`${indent(9)}<EngMin>${s.engMin}</EngMin>`);
            lines.push(`${indent(9)}<EngMax>${s.engMax}</EngMax>`);
            lines.push(`${indent(9)}<Unit>${esc(s.unit)}</Unit>`);
            lines.push(`${indent(9)}<Clamp>${s.clampEnabled}</Clamp>`);
            lines.push(`${indent(9)}<Filter>${s.filterMs}</Filter>`);
            lines.push(`${indent(8)}</Scaling>`);
          }
          lines.push(`${indent(7)}</Mapping>`);
        } else if (mapping?.grounded) {
          lines.push(`${indent(7)}<Grounded value="${esc(mapping.groundValue || '')}" />`);
        } else {
          lines.push(`${indent(7)}<Mapping status="unmapped" />`);
        }

        lines.push(`${indent(6)}</Channel>`);
      }
      lines.push(`${indent(5)}</Channels>`);
      lines.push(`${indent(4)}</Module>`);
    }

    // End module
    const endMod = sorted.find(m => m.templateModel === '750-600');
    if (endMod) {
      lines.push(`${indent(4)}<EndModule model="750-600" position="${endMod.rackPosition}" />`);
    }

    lines.push(`${indent(3)}</Modules>`);
    lines.push(`${indent(2)}</Node>`);
  }
  lines.push(`${indent(1)}</Nodes>`);

  // COM Devices
  if (config.comDevices?.length > 0) {
    lines.push(`${indent(1)}<COMDevices>`);
    for (const dev of config.comDevices) {
      lines.push(`${indent(2)}<Device protocol="${dev.protocol}" model="${esc(dev.templateModel)}" manufacturer="${esc(dev.manufacturer)}">`);
      lines.push(`${indent(3)}<InstanceName>${esc(dev.instanceName)}</InstanceName>`);
      lines.push(`${indent(3)}<Name>${esc(dev.name)}</Name>`);
      lines.push(`${indent(3)}<Network ip="${esc(dev.ipAddress)}" port="${dev.port}" unitId="${dev.unitId}" pollRate="${dev.pollRateMs}" />`);
      lines.push(`${indent(3)}<Registers>`);

      for (const reg of dev.registers) {
        const mapping = getComMapping(config.mappings, reg.id);
        const app = mapping ? appMap.get(mapping.appSignalId) : undefined;

        lines.push(`${indent(4)}<Register address="${reg.address}" type="${reg.registerType || 'holding_register'}" signalType="${reg.signalType}">`);
        lines.push(`${indent(5)}<Name>${esc(reg.name)}</Name>`);
        lines.push(`${indent(5)}<Tag>${esc(reg.tag || '')}</Tag>`);
        lines.push(`${indent(5)}<DataType>${esc(reg.dataType)}</DataType>`);
        lines.push(`${indent(5)}<ByteOrder>${reg.byteOrder || 'big_endian'}</ByteOrder>`);
        if (reg.scaleFactor != null && reg.scaleFactor !== 1) {
          lines.push(`${indent(5)}<ScaleFactor>${reg.scaleFactor}</ScaleFactor>`);
        }
        lines.push(`${indent(5)}<Description>${esc(reg.description || '')}</Description>`);

        if (mapping && app) {
          lines.push(`${indent(5)}<Mapping status="${mapping.status}">`);
          lines.push(`${indent(6)}<AppSignal>${esc(`${app.componentName}.${app.signalName}`)}</AppSignal>`);
          if (mapping.scaling) {
            const s = mapping.scaling;
            lines.push(`${indent(6)}<Scaling rawMin="${s.rawMin}" rawMax="${s.rawMax}" engMin="${s.engMin}" engMax="${s.engMax}" unit="${esc(s.unit)}" />`);
          }
          lines.push(`${indent(5)}</Mapping>`);
        }

        lines.push(`${indent(4)}</Register>`);
      }

      lines.push(`${indent(3)}</Registers>`);
      lines.push(`${indent(2)}</Device>`);
    }
    lines.push(`${indent(1)}</COMDevices>`);
  }

  // Summary mapping table (flat for easy import)
  lines.push(`${indent(1)}<MappingSummary total="${config.mappings.length}">`);
  for (const m of config.mappings) {
    const app = appMap.get(m.appSignalId);
    if (!app) continue;

    if (m.source === 'com') {
      const allRegs = config.comDevices?.flatMap(d => d.registers) || [];
      const reg = allRegs.find(r => r.id === m.comRegisterId);
      const dev = config.comDevices?.find(d => d.id === reg?.deviceId);
      lines.push(`${indent(2)}<Map source="com" device="${esc(dev?.instanceName || '?')}" register="${esc(reg?.name || '?')}" signal="${esc(`${app.componentName}.${app.signalName}`)}" type="${app.signalType}" status="${m.status}" />`);
    } else {
      const allCh = config.modules.flatMap(mod => mod.channels);
      const ch = allCh.find(c => c.id === m.hwChannelId);
      lines.push(`${indent(2)}<Map source="hw" terminal="${esc(ch?.terminal || '?')}" tag="${esc(ch?.tag || '')}" signal="${esc(`${app.componentName}.${app.signalName}`)}" type="${app.signalType}" status="${m.status}"${m.scaling ? ` scaling="${scalingToString(m.scaling)}"` : ''} />`);
    }
  }
  lines.push(`${indent(1)}</MappingSummary>`);

  lines.push('</WAGOConfiguration>');
  return lines.join('\n');
}

// ─── CSV Export ─────────────────────────────────────────
// Complete I/O traceability list

export function exportCSV(
  config: HALConfig,
  appSignals: AppSignal[],
): string {
  const appMap = new Map(appSignals.map(s => [s.id, s]));
  const allCh = config.modules.flatMap(m => m.channels.map(ch => ({ ...ch, rackId: m.rackId, moduleModel: m.templateModel, moduleName: m.name, rackPos: m.rackPosition })));
  const allRegs = (config.comDevices || []).flatMap(d => d.registers.map(r => ({ ...r, deviceName: d.instanceName, protocol: d.protocol, ip: d.ipAddress })));

  const rows: string[][] = [];

  // Header
  rows.push([
    '#', 'Source', 'Rack/Device', 'Position/Address', 'Terminal/Register',
    'Tag', 'HW Signal Type', 'Electrical/Protocol', 'Status',
    'App Component', 'App Signal', 'App Signal Type', 'App Data Type',
    'Scaling Raw', 'Scaling Eng', 'Unit', 'Clamp', 'Filter (ms)',
    'Grounded', 'Ground Value', 'Notes',
  ]);

  let idx = 1;

  // HW channels
  for (const ch of allCh) {
    const mapping = getMapping(config.mappings, ch.id);
    const app = mapping ? appMap.get(mapping.appSignalId) : undefined;
    const s = mapping?.scaling;

    rows.push([
      String(idx++),
      'HW',
      ch.rackId,
      `Slot ${ch.rackPos}`,
      ch.terminal,
      ch.tag || '',
      ch.signalType,
      ch.electricalType,
      mapping?.status || 'unmapped',
      app?.componentName || '',
      app?.signalName || '',
      app?.signalType || '',
      app?.dataType || '',
      s ? `${s.rawMin}..${s.rawMax}` : '',
      s ? `${s.engMin}..${s.engMax}` : '',
      s?.unit || '',
      s ? String(s.clampEnabled) : '',
      s ? String(s.filterMs) : '',
      mapping?.grounded ? 'YES' : '',
      mapping?.groundValue || '',
      mapping?.notes || '',
    ]);
  }

  // COM registers
  for (const reg of allRegs) {
    const mapping = getComMapping(config.mappings, reg.id);
    const app = mapping ? appMap.get(mapping.appSignalId) : undefined;
    const s = mapping?.scaling;

    rows.push([
      String(idx++),
      'COM',
      reg.deviceName,
      `Addr ${reg.address}`,
      reg.name,
      reg.tag || '',
      reg.signalType,
      `${reg.protocol}`,
      mapping?.status || 'unmapped',
      app?.componentName || '',
      app?.signalName || '',
      app?.signalType || '',
      app?.dataType || '',
      s ? `${s.rawMin}..${s.rawMax}` : '',
      s ? `${s.engMin}..${s.engMax}` : '',
      s?.unit || '',
      s ? String(s.clampEnabled) : '',
      s ? String(s.filterMs) : '',
      mapping?.grounded ? 'YES' : '',
      mapping?.groundValue || '',
      mapping?.notes || '',
    ]);
  }

  // Unmapped app signals (no HW/COM source)
  const mappedAppIds = new Set(config.mappings.map(m => m.appSignalId));
  for (const app of appSignals) {
    if (mappedAppIds.has(app.id)) continue;
    rows.push([
      String(idx++),
      '—',
      '—',
      '—',
      '—',
      '',
      '',
      '',
      'unmapped',
      app.componentName,
      app.signalName,
      app.signalType,
      app.dataType || '',
      '', '', '', '', '',
      '', '', 'No HW/COM source',
    ]);
  }

  // CSV encode
  return rows.map(row =>
    row.map(cell => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');
}

// ─── JSON Export ────────────────────────────────────────

export function exportJSON(
  config: HALConfig,
  appSignals: AppSignal[],
): string {
  return JSON.stringify({
    exported: isoNow(),
    generator: 'Northlight PLM',
    config,
    appSignals,
  }, null, 2);
}

// ─── CODESYS Global Variable List (GVL) ────────────────
// Generates IEC 61131-3 compatible variable declarations
// for import into e!COCKPIT or CODESYS IDE

export function exportCODESYSGVL(
  config: HALConfig,
  appSignals: AppSignal[],
): string {
  const appMap = new Map(appSignals.map(s => [s.id, s]));
  const lines: string[] = [];

  lines.push('// Auto-generated by Northlight PLM');
  lines.push(`// Project: ${config.name || 'HAL'} v${config.version}`);
  lines.push(`// Generated: ${isoNow()}`);
  lines.push('');
  lines.push('VAR_GLOBAL');

  // HW-mapped signals
  lines.push('  // ─── Hardware I/O ───────────────────────────');
  const allCh = config.modules.flatMap(m => m.channels);
  for (const m of config.mappings.filter(m => m.source !== 'com')) {
    const ch = allCh.find(c => c.id === m.hwChannelId);
    const app = appMap.get(m.appSignalId);
    if (!ch || !app) continue;

    const varName = sanitizeVarName(`${app.componentName}_${app.signalName}`);
    const iecType = toIECType(app.signalType, app.dataType, m.scaling);
    const comment = ch.tag ? `(* ${ch.terminal} | Tag: ${ch.tag} *)` : `(* ${ch.terminal} *)`;

    lines.push(`  ${varName} : ${iecType}; ${comment}`);
  }

  // COM-mapped signals
  if (config.comDevices?.length > 0) {
    const allRegs = config.comDevices.flatMap(d => d.registers);
    lines.push('');
    lines.push('  // ─── COM / Fieldbus ─────────────────────────');
    for (const m of config.mappings.filter(m => m.source === 'com')) {
      const reg = allRegs.find(r => r.id === m.comRegisterId);
      const app = appMap.get(m.appSignalId);
      if (!reg || !app) continue;

      const dev = config.comDevices.find(d => d.id === reg.deviceId);
      const varName = sanitizeVarName(`${app.componentName}_${app.signalName}`);
      const iecType = toIECType(app.signalType, app.dataType, m.scaling);
      const comment = `(* ${dev?.instanceName || '?'}.${reg.name} [${reg.protocol}] *)`;

      lines.push(`  ${varName} : ${iecType}; ${comment}`);
    }
  }

  // Grounded signals
  const grounded = config.mappings.filter(m => m.grounded);
  if (grounded.length > 0) {
    lines.push('');
    lines.push('  // ─── Grounded (default values) ──────────────');
    for (const m of grounded) {
      const app = appMap.get(m.appSignalId);
      if (!app) continue;
      const varName = sanitizeVarName(`${app.componentName}_${app.signalName}`);
      const iecType = toIECType(app.signalType, app.dataType);
      lines.push(`  ${varName} : ${iecType} := ${m.groundValue || '0'}; (* GROUNDED *)`);
    }
  }

  lines.push('END_VAR');
  return lines.join('\n');
}

function sanitizeVarName(s: string): string {
  return s.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1').replace(/_{2,}/g, '_');
}

function toIECType(signalType: string, dataType?: string, scaling?: SignalScaling): string {
  if (dataType) {
    const dt = dataType.toUpperCase();
    if (['BOOL', 'BYTE', 'WORD', 'DWORD', 'INT', 'UINT', 'DINT', 'UDINT', 'REAL', 'LREAL', 'STRING'].includes(dt)) {
      return dt;
    }
  }
  if (scaling || signalType === 'AI' || signalType === 'AO') return 'REAL';
  return 'BOOL';
}

// ─── Download helper ────────────────────────────────────

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
