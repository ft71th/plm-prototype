// src/components/HALManager/halIOExport.ts
// Professional I/O Traceability List — Excel (.xlsx) and PDF export
//
// Full signal chain: Pin → Terminal → HW Module → Mapping → App Signal → Scaling → SW Variable

import ExcelJS from 'exceljs';
import type {
  HALConfig, HALMapping, HWModule, HWChannel,
  AppSignal, SignalScaling, COMDevice, COMRegister,
} from './halTypes';

// ─── Shared helpers ──────────────────────────────────────

interface IORow {
  idx: number;
  source: 'HW' | 'COM' | '—';
  rackOrDevice: string;
  slotOrAddress: string;
  terminal: string;
  tag: string;
  hwSignalType: string;
  electrical: string;
  status: string;
  appComponent: string;
  appSignal: string;
  appSignalType: string;
  appDataType: string;
  scalingRaw: string;
  scalingEng: string;
  unit: string;
  clamp: string;
  filterMs: string;
  grounded: string;
  groundValue: string;
  swVariable: string;
  notes: string;
}

function sanitizeVar(s: string): string {
  return s.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1').replace(/_{2,}/g, '_');
}

function buildIORows(config: HALConfig, appSignals: AppSignal[]): IORow[] {
  const appMap = new Map(appSignals.map(s => [s.id, s]));
  const rows: IORow[] = [];
  let idx = 1;

  // HW channels
  for (const mod of [...config.modules].sort((a, b) => {
    if (a.rackId !== b.rackId) return a.rackId.localeCompare(b.rackId);
    return a.rackPosition - b.rackPosition;
  })) {
    for (const ch of mod.channels) {
      const mapping = config.mappings.find(m => m.source !== 'com' && m.hwChannelId === ch.id);
      const app = mapping ? appMap.get(mapping.appSignalId) : undefined;
      const s = mapping?.scaling;

      rows.push({
        idx: idx++,
        source: 'HW',
        rackOrDevice: mod.rackId,
        slotOrAddress: `Slot ${mod.rackPosition}`,
        terminal: ch.terminal,
        tag: ch.tag || '',
        hwSignalType: ch.signalType,
        electrical: ch.electricalType,
        status: mapping?.grounded ? 'grounded' : mapping?.status || 'unmapped',
        appComponent: app?.componentName || '',
        appSignal: app?.signalName || '',
        appSignalType: app?.signalType || '',
        appDataType: app?.dataType || '',
        scalingRaw: s ? `${s.rawMin}..${s.rawMax}` : '',
        scalingEng: s ? `${s.engMin}..${s.engMax}` : '',
        unit: s?.unit || '',
        clamp: s ? (s.clampEnabled ? 'Yes' : 'No') : '',
        filterMs: s ? String(s.filterMs) : '',
        grounded: mapping?.grounded ? 'YES' : '',
        groundValue: mapping?.groundValue || '',
        swVariable: app ? sanitizeVar(`${app.componentName}_${app.signalName}`) : '',
        notes: mapping?.notes || '',
      });
    }
  }

  // COM registers
  for (const dev of (config.comDevices || [])) {
    for (const reg of dev.registers) {
      const mapping = config.mappings.find(m => m.source === 'com' && m.comRegisterId === reg.id);
      const app = mapping ? appMap.get(mapping.appSignalId) : undefined;
      const s = mapping?.scaling;

      rows.push({
        idx: idx++,
        source: 'COM',
        rackOrDevice: dev.instanceName,
        slotOrAddress: `Addr ${reg.address}`,
        terminal: reg.name,
        tag: reg.tag || '',
        hwSignalType: reg.signalType,
        electrical: dev.protocol,
        status: mapping?.grounded ? 'grounded' : mapping?.status || 'unmapped',
        appComponent: app?.componentName || '',
        appSignal: app?.signalName || '',
        appSignalType: app?.signalType || '',
        appDataType: app?.dataType || '',
        scalingRaw: s ? `${s.rawMin}..${s.rawMax}` : '',
        scalingEng: s ? `${s.engMin}..${s.engMax}` : '',
        unit: s?.unit || '',
        clamp: s ? (s.clampEnabled ? 'Yes' : 'No') : '',
        filterMs: s ? String(s.filterMs) : '',
        grounded: mapping?.grounded ? 'YES' : '',
        groundValue: mapping?.groundValue || '',
        swVariable: app ? sanitizeVar(`${app.componentName}_${app.signalName}`) : '',
        notes: mapping?.notes || '',
      });
    }
  }

  // Unmapped app signals
  const mappedAppIds = new Set(config.mappings.map(m => m.appSignalId));
  for (const app of appSignals) {
    if (mappedAppIds.has(app.id)) continue;
    rows.push({
      idx: idx++,
      source: '—',
      rackOrDevice: '—',
      slotOrAddress: '—',
      terminal: '—',
      tag: '',
      hwSignalType: '',
      electrical: '',
      status: 'unmapped',
      appComponent: app.componentName,
      appSignal: app.signalName,
      appSignalType: app.signalType,
      appDataType: app.dataType || '',
      scalingRaw: '',
      scalingEng: '',
      unit: '',
      clamp: '',
      filterMs: '',
      grounded: '',
      groundValue: '',
      swVariable: sanitizeVar(`${app.componentName}_${app.signalName}`),
      notes: 'No HW/COM source assigned',
    });
  }

  return rows;
}

// ─── Signal type colors ──────────────────────────────────

const SIG_FILLS: Record<string, string> = {
  DI: 'DBEAFE', DO: 'DCFCE7', AI: 'FEF3C7', AO: 'FEE2E2',
};
const SIG_FONTS: Record<string, string> = {
  DI: '2563EB', DO: '16A34A', AI: 'D97706', AO: 'DC2626',
};
const STATUS_FILLS: Record<string, string> = {
  mapped: 'DCFCE7', grounded: 'FEF3C7', unmapped: 'FEE2E2',
};
const STATUS_FONTS: Record<string, string> = {
  mapped: '15803D', grounded: 'B45309', unmapped: 'DC2626',
};

// ─── Excel Export ────────────────────────────────────────

export async function exportIOListExcel(
  config: HALConfig,
  appSignals: AppSignal[],
  projectName?: string,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Northlight PLM';
  wb.created = new Date();

  const rows = buildIORows(config, appSignals);
  const name = projectName || config.name || 'HAL';

  // ─── Cover Sheet ───
  const cover = wb.addWorksheet('Cover', { properties: { tabColor: { argb: '1E3A5F' } } });
  cover.getColumn(1).width = 5;
  cover.getColumn(2).width = 25;
  cover.getColumn(3).width = 45;

  const titleRow = cover.addRow(['', 'I/O TRACEABILITY LIST', '']);
  titleRow.getCell(2).font = { name: 'Arial', size: 20, bold: true, color: { argb: '1E3A5F' } };
  cover.mergeCells('B1:C1');
  cover.addRow([]);

  const infoData: [string, string][] = [
    ['Project', name],
    ['HAL Version', config.version],
    ['Description', config.description || '—'],
    ['Generated', new Date().toLocaleString()],
    ['Generator', 'Northlight PLM — HAL Manager'],
    ['', ''],
    ['Total HW Channels', String(config.modules.reduce((s, m) => s + m.channels.length, 0))],
    ['Total COM Registers', String((config.comDevices || []).reduce((s, d) => s + d.registers.length, 0))],
    ['Total App Signals', String(appSignals.length)],
    ['Mapped', String(config.mappings.filter(m => m.status === 'mapped').length)],
    ['Grounded', String(config.mappings.filter(m => m.grounded).length)],
    ['Unmapped App Signals', String(appSignals.length - new Set(config.mappings.map(m => m.appSignalId)).size)],
  ];

  for (const [label, value] of infoData) {
    const r = cover.addRow(['', label, value]);
    r.getCell(2).font = { name: 'Arial', size: 11, bold: true, color: { argb: '475569' } };
    r.getCell(3).font = { name: 'Arial', size: 11, color: { argb: '1E293B' } };
  }

  // ─── I/O List Sheet ───
  const ioSheet = wb.addWorksheet('I/O List', { properties: { tabColor: { argb: '3B82F6' } } });

  const headers = [
    '#', 'Source', 'Rack / Device', 'Slot / Addr', 'Terminal / Register',
    'Tag', 'HW Type', 'Electrical', 'Status',
    'App Component', 'App Signal', 'App Type', 'Data Type',
    'Raw Range', 'Eng Range', 'Unit', 'Clamp', 'Filter (ms)',
    'Grounded', 'Ground Val', 'SW Variable', 'Notes',
  ];

  const colWidths = [5, 7, 16, 12, 18, 14, 8, 14, 10, 18, 18, 8, 8, 12, 12, 8, 7, 8, 9, 10, 24, 25];

  // Set column widths
  headers.forEach((_, i) => {
    ioSheet.getColumn(i + 1).width = colWidths[i] || 12;
  });

  // Header row
  const hdrRow = ioSheet.addRow(headers);
  hdrRow.height = 28;
  hdrRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      bottom: { style: 'medium', color: { argb: '0F172A' } },
    };
  });

  // Freeze header
  ioSheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 5 }];

  // Auto filter
  ioSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

  // Data rows
  let prevRack = '';
  for (const r of rows) {
    // Separator row between racks/devices
    if (r.source !== '—' && r.rackOrDevice !== prevRack && prevRack !== '') {
      const sepRow = ioSheet.addRow([]);
      sepRow.height = 4;
      sepRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
      });
      // Fill all columns
      for (let c = 1; c <= headers.length; c++) {
        const cell = sepRow.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
      }
    }
    prevRack = r.rackOrDevice;

    const dataRow = ioSheet.addRow([
      r.idx, r.source, r.rackOrDevice, r.slotOrAddress, r.terminal,
      r.tag, r.hwSignalType, r.electrical, r.status,
      r.appComponent, r.appSignal, r.appSignalType, r.appDataType,
      r.scalingRaw, r.scalingEng, r.unit, r.clamp, r.filterMs,
      r.grounded, r.groundValue, r.swVariable, r.notes,
    ]);

    dataRow.height = 20;
    dataRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9, color: { argb: '1E293B' } };
      cell.alignment = { vertical: 'middle' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
      };
    });

    // Signal type badge coloring (col 7 = HW Type)
    if (r.hwSignalType && SIG_FILLS[r.hwSignalType]) {
      const sigCell = dataRow.getCell(7);
      sigCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SIG_FILLS[r.hwSignalType] } };
      sigCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: SIG_FONTS[r.hwSignalType] } };
      sigCell.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // App signal type badge (col 12)
    if (r.appSignalType && SIG_FILLS[r.appSignalType]) {
      const appCell = dataRow.getCell(12);
      appCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SIG_FILLS[r.appSignalType] } };
      appCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: SIG_FONTS[r.appSignalType] } };
      appCell.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // Status coloring (col 9)
    if (r.status && STATUS_FILLS[r.status]) {
      const statCell = dataRow.getCell(9);
      statCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_FILLS[r.status] } };
      statCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: STATUS_FONTS[r.status] } };
      statCell.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // SW Variable monospace
    if (r.swVariable) {
      dataRow.getCell(21).font = { name: 'Consolas', size: 8, color: { argb: '7C3AED' } };
    }

    // Alternating row shading
    if (r.idx % 2 === 0) {
      for (let c = 1; c <= headers.length; c++) {
        const cell = dataRow.getCell(c);
        if (!cell.fill || (cell.fill as any).fgColor?.argb === undefined) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
        }
      }
    }
  }

  // ─── HW Modules Sheet ───
  const hwSheet = wb.addWorksheet('HW Modules', { properties: { tabColor: { argb: '22C55E' } } });
  const hwHeaders = ['Rack', 'Slot', 'Model', 'Module Name', 'Channels', 'DI', 'DO', 'AI', 'AO', 'Mapped', 'Unmapped'];
  hwHeaders.forEach((_, i) => { hwSheet.getColumn(i + 1).width = i === 3 ? 22 : i === 2 ? 14 : 10; });

  const hwHdrRow = hwSheet.addRow(hwHeaders);
  hwHdrRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '16A34A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (const mod of [...config.modules].sort((a, b) => {
    if (a.rackId !== b.rackId) return a.rackId.localeCompare(b.rackId);
    return a.rackPosition - b.rackPosition;
  })) {
    const di = mod.channels.filter(c => c.signalType === 'DI').length;
    const _do = mod.channels.filter(c => c.signalType === 'DO').length;
    const ai = mod.channels.filter(c => c.signalType === 'AI').length;
    const ao = mod.channels.filter(c => c.signalType === 'AO').length;
    const mapped = mod.channels.filter(c =>
      config.mappings.some(m => m.source !== 'com' && m.hwChannelId === c.id && m.status === 'mapped')
    ).length;

    const r = hwSheet.addRow([
      mod.rackId, mod.rackPosition, mod.templateModel, mod.name,
      mod.channels.length, di, _do, ai, ao, mapped, mod.channels.length - mapped,
    ]);
    r.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  }

  // ─── COM Devices Sheet (if any) ───
  if (config.comDevices?.length > 0) {
    const comSheet = wb.addWorksheet('COM Devices', { properties: { tabColor: { argb: '8B5CF6' } } });
    const comHeaders = ['Device', 'Model', 'Protocol', 'IP', 'Port', 'Unit ID', 'Poll (ms)', 'Registers', 'Mapped', 'Unmapped'];
    comHeaders.forEach((_, i) => { comSheet.getColumn(i + 1).width = i <= 1 ? 20 : 12; });

    const comHdrRow = comSheet.addRow(comHeaders);
    comHdrRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7C3AED' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    for (const dev of config.comDevices) {
      const mapped = dev.registers.filter(r =>
        config.mappings.some(m => m.source === 'com' && m.comRegisterId === r.id && m.status === 'mapped')
      ).length;

      comSheet.addRow([
        dev.instanceName, dev.templateModel, dev.protocol,
        dev.ipAddress, dev.port, dev.unitId, dev.pollRateMs,
        dev.registers.length, mapped, dev.registers.length - mapped,
      ]).eachCell((cell) => {
        cell.font = { name: 'Arial', size: 9 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
    }
  }

  // ─── Summary Sheet ───
  const sumSheet = wb.addWorksheet('Summary', { properties: { tabColor: { argb: 'F59E0B' } } });
  sumSheet.getColumn(1).width = 5;
  sumSheet.getColumn(2).width = 30;
  sumSheet.getColumn(3).width = 12;
  sumSheet.getColumn(4).width = 12;
  sumSheet.getColumn(5).width = 12;
  sumSheet.getColumn(6).width = 12;

  const sumTitle = sumSheet.addRow(['', 'I/O SUMMARY', '', '', '', '']);
  sumTitle.getCell(2).font = { name: 'Arial', size: 16, bold: true, color: { argb: '1E3A5F' } };
  sumSheet.addRow([]);

  // Signal type breakdown
  const diTotal = rows.filter(r => r.hwSignalType === 'DI').length;
  const doTotal = rows.filter(r => r.hwSignalType === 'DO').length;
  const aiTotal = rows.filter(r => r.hwSignalType === 'AI').length;
  const aoTotal = rows.filter(r => r.hwSignalType === 'AO').length;

  const sumHdr = sumSheet.addRow(['', 'Category', 'DI', 'DO', 'AI', 'AO']);
  sumHdr.eachCell((cell, c) => {
    if (c >= 2) {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } };
      cell.alignment = { horizontal: 'center' };
    }
  });

  const hwMapped = rows.filter(r => r.source === 'HW' && r.status === 'mapped');
  const comMapped = rows.filter(r => r.source === 'COM' && r.status === 'mapped');

  const sumData: [string, number, number, number, number][] = [
    ['HW Channels (total)', rows.filter(r => r.source === 'HW' && r.hwSignalType === 'DI').length, rows.filter(r => r.source === 'HW' && r.hwSignalType === 'DO').length, rows.filter(r => r.source === 'HW' && r.hwSignalType === 'AI').length, rows.filter(r => r.source === 'HW' && r.hwSignalType === 'AO').length],
    ['HW Mapped', hwMapped.filter(r => r.hwSignalType === 'DI').length, hwMapped.filter(r => r.hwSignalType === 'DO').length, hwMapped.filter(r => r.hwSignalType === 'AI').length, hwMapped.filter(r => r.hwSignalType === 'AO').length],
    ['COM Registers (total)', rows.filter(r => r.source === 'COM' && r.hwSignalType === 'DI').length, rows.filter(r => r.source === 'COM' && r.hwSignalType === 'DO').length, rows.filter(r => r.source === 'COM' && r.hwSignalType === 'AI').length, rows.filter(r => r.source === 'COM' && r.hwSignalType === 'AO').length],
    ['COM Mapped', comMapped.filter(r => r.hwSignalType === 'DI').length, comMapped.filter(r => r.hwSignalType === 'DO').length, comMapped.filter(r => r.hwSignalType === 'AI').length, comMapped.filter(r => r.hwSignalType === 'AO').length],
    ['App Signals (total)', appSignals.filter(s => s.signalType === 'DI').length, appSignals.filter(s => s.signalType === 'DO').length, appSignals.filter(s => s.signalType === 'AI').length, appSignals.filter(s => s.signalType === 'AO').length],
  ];

  for (const [label, ...vals] of sumData) {
    const r = sumSheet.addRow(['', label, ...vals]);
    r.getCell(2).font = { name: 'Arial', size: 10, color: { argb: '334155' } };
    for (let c = 3; c <= 6; c++) {
      r.getCell(c).font = { name: 'Arial', size: 10 };
      r.getCell(c).alignment = { horizontal: 'center' };
    }
  }

  // ─── Download ───
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(name).replace(/\s+/g, '_')}_IO_List_v${config.version}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── PDF Export (print-friendly HTML) ────────────────────

export function exportIOListPDF(
  config: HALConfig,
  appSignals: AppSignal[],
  projectName?: string,
): void {
  const rows = buildIORows(config, appSignals);
  const name = projectName || config.name || 'HAL';
  const totalHw = config.modules.reduce((s, m) => s + m.channels.length, 0);
  const totalCom = (config.comDevices || []).reduce((s, d) => s + d.registers.length, 0);
  const mapped = config.mappings.filter(m => m.status === 'mapped').length;
  const grounded = config.mappings.filter(m => m.grounded).length;
  const unmappedApp = appSignals.length - new Set(config.mappings.map(m => m.appSignalId)).size;

  const sigBg: Record<string, string> = { DI: '#dbeafe', DO: '#dcfce7', AI: '#fef3c7', AO: '#fee2e2' };
  const sigFg: Record<string, string> = { DI: '#2563eb', DO: '#16a34a', AI: '#d97706', AO: '#dc2626' };
  const statBg: Record<string, string> = { mapped: '#dcfce7', grounded: '#fef3c7', unmapped: '#fee2e2' };
  const statFg: Record<string, string> = { mapped: '#15803d', grounded: '#b45309', unmapped: '#dc2626' };

  function badge(text: string, bg: string, fg: string) {
    return `<span style="background:${bg};color:${fg};padding:1px 6px;border-radius:3px;font-weight:600;font-size:8px">${text}</span>`;
  }

  const tableRows = rows.map(r => {
    const sigBadge = r.hwSignalType ? badge(r.hwSignalType, sigBg[r.hwSignalType] || '#f1f5f9', sigFg[r.hwSignalType] || '#334155') : '';
    const appBadge = r.appSignalType ? badge(r.appSignalType, sigBg[r.appSignalType] || '#f1f5f9', sigFg[r.appSignalType] || '#334155') : '';
    const statBadge = r.status ? badge(r.status, statBg[r.status] || '#f1f5f9', statFg[r.status] || '#334155') : '';
    const bg = r.idx % 2 === 0 ? '#f8fafc' : '#ffffff';
    return `<tr style="background:${bg}">
      <td style="text-align:center;color:#94a3b8">${r.idx}</td>
      <td style="text-align:center;font-weight:600">${r.source}</td>
      <td>${r.rackOrDevice}</td>
      <td>${r.slotOrAddress}</td>
      <td style="font-family:monospace;font-size:8px">${r.terminal}</td>
      <td>${r.tag}</td>
      <td style="text-align:center">${sigBadge}</td>
      <td>${r.electrical}</td>
      <td style="text-align:center">${statBadge}</td>
      <td style="font-weight:500">${r.appComponent}</td>
      <td>${r.appSignal}</td>
      <td style="text-align:center">${appBadge}</td>
      <td>${r.scalingRaw}${r.scalingRaw ? ' → ' + r.scalingEng + ' ' + r.unit : ''}</td>
      <td style="font-family:Consolas,monospace;font-size:7px;color:#7c3aed">${r.swVariable}</td>
      <td style="color:#64748b;font-size:7px">${r.notes}</td>
    </tr>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>I/O Traceability List — ${name}</title>
  <style>
    @page { size: A3 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 9px; color: #1e293b; margin: 0; padding: 16px; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 18px; color: #1e3a5f; }
    .header .meta { text-align: right; font-size: 9px; color: #64748b; }
    .stats { display: flex; gap: 16px; margin-bottom: 12px; }
    .stat { padding: 6px 12px; border-radius: 6px; font-size: 10px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 8px; }
    th { background: #1e3a5f; color: white; padding: 5px 4px; text-align: left; font-size: 8px; font-weight: 600; white-space: nowrap; }
    td { padding: 3px 4px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>I/O TRACEABILITY LIST</h1>
      <div style="color:#64748b;font-size:11px">${name} — v${config.version}</div>
    </div>
    <div class="meta">
      <div>Generated: ${new Date().toLocaleString()}</div>
      <div>Northlight PLM — HAL Manager</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat" style="background:#dbeafe;color:#2563eb">HW: ${totalHw} ch</div>
    <div class="stat" style="background:#f3e8ff;color:#7c3aed">COM: ${totalCom} reg</div>
    <div class="stat" style="background:#dcfce7;color:#15803d">Mapped: ${mapped}</div>
    <div class="stat" style="background:#fef3c7;color:#b45309">Grounded: ${grounded}</div>
    <div class="stat" style="background:#fee2e2;color:#dc2626">Unmapped: ${unmappedApp}</div>
    <div class="stat" style="background:#f1f5f9;color:#334155">App Signals: ${appSignals.length}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th><th>Src</th><th>Rack/Device</th><th>Slot/Addr</th><th>Terminal</th>
        <th>Tag</th><th>Type</th><th>Electrical</th><th>Status</th>
        <th>Component</th><th>Signal</th><th>App</th>
        <th>Scaling</th><th>SW Variable</th><th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div style="margin-top:16px;font-size:8px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:6px">
    Signal chain: Physical Pin → HW Terminal → Module → HAL Mapping → Application Signal → Scaling → SW Variable
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
