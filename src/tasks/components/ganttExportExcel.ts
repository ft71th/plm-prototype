// ============================================================================
// Northlight Gantt — Professional Excel Export
// ============================================================================
//
// Creates a visually rich Gantt chart in Excel with:
//   - Colored bar fills matching each category
//   - Merged month headers with year grouping
//   - Category separator rows
//   - Freeze panes so names stay visible while scrolling
//   - Today marker column
//   - Summary sheet with project statistics
//
// Requires: npm install exceljs
// ============================================================================

import ExcelJS from 'exceljs';
import { GanttData, GanttActivity, GanttCategory } from '../ganttTypes';

// ─── Helpers ────────────────────────────────────────────────────────────

function weekToDate(week: number, projectStart: Date): Date {
  const d = new Date(projectStart);
  d.setDate(d.getDate() + week * 7);
  return d;
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function fmtDateShort(d: Date): string {
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

/** Convert hex '#4c7bf5' → 'FF4C7BF5' (ARGB) */
function toArgb(hex: string): string {
  return 'FF' + hex.replace('#', '').toUpperCase();
}

/** Lighten a hex color */
function lighten(hex: string, amount = 0.15): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, parseInt(h.slice(0, 2), 16) + Math.round(255 * amount));
  const g = Math.min(255, parseInt(h.slice(2, 4), 16) + Math.round(255 * amount));
  const b = Math.min(255, parseInt(h.slice(4, 6), 16) + Math.round(255 * amount));
  return `${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

/** Darken a hex color */
function darken(hex: string, amount = 0.3): string {
  const h = hex.replace('#', '');
  const r = Math.max(0, parseInt(h.slice(0, 2), 16) - Math.round(255 * amount));
  const g = Math.max(0, parseInt(h.slice(2, 4), 16) - Math.round(255 * amount));
  const b = Math.max(0, parseInt(h.slice(4, 6), 16) - Math.round(255 * amount));
  return `${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

// ─── Column layout ──────────────────────────────────────────────────────
// A=Nr, B=Aktivitet, C=Ansvarig, D=Start, E=Slut, F=Veckor
const FIXED_COLS = 6;
const COL = { nr: 1, name: 2, assignee: 3, start: 4, end: 5, weeks: 6 };

const COLORS = {
  headerBg: 'FF2C3E50',
  headerText: 'FFFFFFFF',
  monthBg: 'FF34495E',
  weekBg: 'FF3D566E',
  gridBorder: 'FFD5D8DC',
  gridLight: 'FFECF0F1',
  todayBg: 'FFFFF0F0',
  todayBorder: 'FFFF6B6B',
  white: 'FFFFFFFF',
  altRow: 'FFF8F9FA',
  textDark: 'FF2C3E50',
  textMuted: 'FF95A5A6',
};

const THIN: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: COLORS.gridBorder } };
const HAIR: Partial<ExcelJS.Border> = { style: 'hair', color: { argb: COLORS.gridLight } };

// ─── Main Export ────────────────────────────────────────────────────────

export async function exportGanttToExcel(data: GanttData, projectName?: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Northlight PLM';
  wb.created = new Date();

  const projectStart = new Date(data.projectStart);

  // Timeline range
  const allStarts = data.activities.map((a) => a.startWeek);
  const allEnds = data.activities.map((a) => a.startWeek + a.durWeeks);
  const minWeek = Math.min(0, ...allStarts) - 1;
  const maxWeek = Math.max(...allEnds) + 3;
  const weekCount = maxWeek - minWeek;

  // Today
  const todayWeek = Math.floor((Date.now() - projectStart.getTime()) / (7 * 86400000));

  // ════════════════════════════════════════════════════════════════════════
  // SHEET 1: TIDPLAN
  // ════════════════════════════════════════════════════════════════════════

  const ws = wb.addWorksheet('Tidplan', {
    views: [{ state: 'frozen', xSplit: FIXED_COLS, ySplit: 3 }],
    properties: { defaultRowHeight: 22 },
  });

  // Column widths
  ws.getColumn(COL.nr).width = 5;
  ws.getColumn(COL.name).width = 38;
  ws.getColumn(COL.assignee).width = 14;
  ws.getColumn(COL.start).width = 12;
  ws.getColumn(COL.end).width = 12;
  ws.getColumn(COL.weeks).width = 7;
  for (let i = 0; i < weekCount; i++) {
    ws.getColumn(FIXED_COLS + 1 + i).width = 3.2;
  }

  // ═══════════════════════════════════
  // ROW 1: Title
  // ═══════════════════════════════════
  const r1 = ws.getRow(1);
  r1.height = 30;
  ws.mergeCells(1, 1, 1, FIXED_COLS);
  const tc = ws.getCell(1, 1);
  tc.value = `${projectName || 'Northlight'} — Tidplan`;
  tc.font = { name: 'Arial', size: 13, bold: true, color: { argb: COLORS.headerText } };
  tc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  tc.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Fill rest of row 1
  for (let i = 0; i < weekCount; i++) {
    const c = ws.getCell(1, FIXED_COLS + 1 + i);
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  }

  // ═══════════════════════════════════
  // ROW 2: Month headers (merged)
  // ═══════════════════════════════════
  const monthSpans: { label: string; startCol: number; count: number }[] = [];
  let prevKey = '';
  for (let i = 0; i < weekCount; i++) {
    const d = weekToDate(minWeek + i, projectStart);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleDateString('sv-SE', { month: 'long' });
    const year = d.getFullYear();
    const fullLabel = `${label.charAt(0).toUpperCase()}${label.slice(1)} ${year}`;
    if (key !== prevKey) {
      monthSpans.push({ label: fullLabel, startCol: FIXED_COLS + 1 + i, count: 1 });
      prevKey = key;
    } else {
      monthSpans[monthSpans.length - 1].count++;
    }
  }

  const r2 = ws.getRow(2);
  r2.height = 22;

  // Fixed headers
  ['#', 'Aktivitet', 'Ansvarig', 'Start', 'Slut', 'v'].forEach((h, i) => {
    const c = ws.getCell(2, i + 1);
    c.value = h;
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.headerText } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.monthBg } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = { bottom: THIN };
  });

  for (const span of monthSpans) {
    if (span.count > 1) ws.mergeCells(2, span.startCol, 2, span.startCol + span.count - 1);
    const c = ws.getCell(2, span.startCol);
    c.value = span.label;
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.headerText } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.monthBg } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = { bottom: THIN, left: THIN };
  }

  // ═══════════════════════════════════
  // ROW 3: Week dates
  // ═══════════════════════════════════
  const r3 = ws.getRow(3);
  r3.height = 46;

  for (let i = 1; i <= FIXED_COLS; i++) {
    const c = ws.getCell(3, i);
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.weekBg } };
    c.border = { bottom: THIN };
  }

  for (let i = 0; i < weekCount; i++) {
    const w = minWeek + i;
    const d = weekToDate(w, projectStart);
    const c = ws.getCell(3, FIXED_COLS + 1 + i);
    // Show date for first of month or first column
    const isMonthStart = d.getDate() <= 7 && d.getDay() <= 3;
    c.value = (isMonthStart || i === 0) ? fmtDateShort(d) : `${d.getDate()}`;
    c.font = { name: 'Arial', size: 7, color: { argb: 'FFBDC3C7' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.weekBg } };
    c.alignment = { vertical: 'middle', horizontal: 'center', textRotation: 90 };
    c.border = { bottom: THIN, left: HAIR };

    if (w === todayWeek) {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
      c.font = { name: 'Arial', size: 7, bold: true, color: { argb: COLORS.headerText } };
    }
  }

  // ═══════════════════════════════════
  // DATA ROWS
  // ═══════════════════════════════════
  let rowIdx = 4;
  let counter = 0;

  for (const cat of data.categories) {
    const acts = data.activities.filter((a) => a.categoryId === cat.id).sort((a, b) => a.startWeek - b.startWeek);
    if (acts.length === 0) continue;

    const catHex = cat.color.replace('#', '');
    const catBg = 'FF' + lighten('#' + catHex, 0.38);
    const catBorder: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF' + catHex } };

    // Category separator
    const catRow = ws.getRow(rowIdx);
    catRow.height = 24;
    ws.mergeCells(rowIdx, COL.nr, rowIdx, COL.weeks);
    const catCell = ws.getCell(rowIdx, COL.nr);
    catCell.value = `  ${cat.name.toUpperCase()}  (${acts.length})`;
    catCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF' + darken('#' + catHex, 0.05) } };
    catCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catBg } };
    catCell.alignment = { vertical: 'middle' };
    catCell.border = { top: catBorder, bottom: catBorder };

    for (let i = 0; i < weekCount; i++) {
      const c = ws.getCell(rowIdx, FIXED_COLS + 1 + i);
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catBg } };
      c.border = { top: catBorder, bottom: catBorder };
    }
    rowIdx++;

    // Activities
    for (const a of acts) {
      counter++;
      const aRow = ws.getRow(rowIdx);
      aRow.height = a.milestone ? 20 : 24;

      const startDate = weekToDate(a.startWeek, projectStart);
      const endDate = weekToDate(a.startWeek + a.durWeeks, projectStart);
      const rowBg = counter % 2 === 0 ? COLORS.altRow : COLORS.white;
      const mutedFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 8, color: { argb: COLORS.textMuted } };
      const actFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 9, color: { argb: COLORS.textDark } };

      // Fixed cols
      ws.getCell(rowIdx, COL.nr).value = counter;
      ws.getCell(rowIdx, COL.nr).font = mutedFont;
      ws.getCell(rowIdx, COL.nr).alignment = { vertical: 'middle', horizontal: 'center' };

      ws.getCell(rowIdx, COL.name).value = a.milestone ? `◆  ${a.name}` : a.name;
      ws.getCell(rowIdx, COL.name).font = a.milestone ? { ...actFont, bold: true, italic: true } : actFont;
      ws.getCell(rowIdx, COL.name).alignment = { vertical: 'middle', indent: 1 };

      ws.getCell(rowIdx, COL.assignee).value = a.assignee || '';
      ws.getCell(rowIdx, COL.assignee).font = mutedFont;
      ws.getCell(rowIdx, COL.assignee).alignment = { vertical: 'middle' };

      ws.getCell(rowIdx, COL.start).value = fmtDate(startDate);
      ws.getCell(rowIdx, COL.start).font = mutedFont;
      ws.getCell(rowIdx, COL.start).alignment = { vertical: 'middle', horizontal: 'center' };

      ws.getCell(rowIdx, COL.end).value = a.milestone ? '' : fmtDate(endDate);
      ws.getCell(rowIdx, COL.end).font = mutedFont;
      ws.getCell(rowIdx, COL.end).alignment = { vertical: 'middle', horizontal: 'center' };

      ws.getCell(rowIdx, COL.weeks).value = a.milestone ? '◆' : a.durWeeks;
      ws.getCell(rowIdx, COL.weeks).font = mutedFont;
      ws.getCell(rowIdx, COL.weeks).alignment = { vertical: 'middle', horizontal: 'center' };

      // Fill + border on fixed cols
      for (let ci = 1; ci <= FIXED_COLS; ci++) {
        const c = ws.getCell(rowIdx, ci);
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        c.border = { bottom: HAIR, right: ci === FIXED_COLS ? THIN : HAIR };
      }

      // Timeline: draw bars
      const barArgb = 'FF' + catHex;
      const barDarkArgb = 'FF' + darken('#' + catHex, 0.15);
      const barLightArgb = 'FF' + lighten('#' + catHex, 0.2);

      for (let i = 0; i < weekCount; i++) {
        const w = minWeek + i;
        const c = ws.getCell(rowIdx, FIXED_COLS + 1 + i);
        const inBar = !a.milestone && w >= a.startWeek && w < a.startWeek + a.durWeeks;
        const isMile = a.milestone && w === a.startWeek;
        const isToday = w === todayWeek;
        const isStart = inBar && w === a.startWeek;
        const isEnd = inBar && w === a.startWeek + a.durWeeks - 1;

        if (isMile) {
          c.value = '◆';
          c.font = { name: 'Arial', size: 12, bold: true, color: { argb: barArgb } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isToday ? COLORS.todayBg : rowBg } };
          c.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (inBar) {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: barArgb } };
          // Activity name on first cell of bar (if enough room)
          if (isStart && a.durWeeks >= 6) {
            c.value = a.assignee ? `${a.name} — ${a.assignee}` : a.name;
            c.font = { name: 'Arial', size: 7.5, bold: true, color: { argb: COLORS.headerText } };
            c.alignment = { vertical: 'middle', horizontal: 'left' };
          }
          c.border = {
            top: { style: 'thin', color: { argb: barDarkArgb } },
            bottom: { style: 'thin', color: { argb: barDarkArgb } },
            left: isStart ? { style: 'medium', color: { argb: barDarkArgb } } : undefined,
            right: isEnd ? { style: 'medium', color: { argb: barDarkArgb } } : undefined,
          };
        } else {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isToday ? COLORS.todayBg : rowBg } };
          c.border = { left: HAIR, bottom: HAIR };
          if (isToday) {
            c.border = { left: { style: 'thin', color: { argb: COLORS.todayBorder } }, right: { style: 'thin', color: { argb: COLORS.todayBorder } }, bottom: HAIR };
          }
        }
      }

      rowIdx++;
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // SHEET 2: DATA
  // ════════════════════════════════════════════════════════════════════════

  const wsD = wb.addWorksheet('Data', { views: [{ state: 'frozen', ySplit: 1 }] });
  const dHeaders = ['Kategori', 'Aktivitet', 'Typ', 'Start', 'Slut', 'Veckor', 'Ansvarig', 'Prioritet', 'Beskrivning'];
  dHeaders.forEach((h, i) => {
    const c = wsD.getCell(1, i + 1);
    c.value = h;
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.headerText } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  wsD.getRow(1).height = 26;

  let dr = 2;
  for (const cat of data.categories) {
    for (const a of data.activities.filter((x) => x.categoryId === cat.id).sort((x, y) => x.startWeek - y.startWeek)) {
      const sd = weekToDate(a.startWeek, projectStart);
      const ed = weekToDate(a.startWeek + a.durWeeks, projectStart);
      [cat.name, a.name, a.milestone ? 'Milstolpe' : 'Aktivitet', fmtDate(sd), fmtDate(ed), a.durWeeks, a.assignee || '', a.priority || '', a.description || ''].forEach((v, i) => {
        const c = wsD.getCell(dr, i + 1);
        c.value = v;
        c.font = { name: 'Arial', size: 9, color: { argb: COLORS.textDark } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: dr % 2 === 0 ? COLORS.altRow : COLORS.white } };
      });
      dr++;
    }
  }
  [28, 42, 12, 14, 14, 8, 16, 12, 40].forEach((w, i) => { wsD.getColumn(i + 1).width = w; });

  // ════════════════════════════════════════════════════════════════════════
  // SHEET 3: SAMMANFATTNING
  // ════════════════════════════════════════════════════════════════════════

  const wsS = wb.addWorksheet('Sammanfattning');
  [30, 22, 16, 16].forEach((w, i) => { wsS.getColumn(i + 1).width = w; });

  let sr = 1;
  wsS.getCell(sr, 1).value = 'Northlight PLM — Tidplan';
  wsS.getCell(sr, 1).font = { name: 'Arial', size: 16, bold: true, color: { argb: COLORS.textDark } };
  sr += 2;

  const info: [string, string][] = [
    ['Projekt', projectName || '-'],
    ['Projektstart', fmtDate(projectStart)],
    ['Exporterad', fmtDate(new Date())],
    ['Aktiviteter', `${data.activities.length}`],
    ['Milstolpar', `${data.activities.filter((a) => a.milestone).length}`],
  ];
  for (const [l, v] of info) {
    wsS.getCell(sr, 1).value = l;
    wsS.getCell(sr, 1).font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.textDark } };
    wsS.getCell(sr, 2).value = v;
    wsS.getCell(sr, 2).font = { name: 'Arial', size: 10, color: { argb: COLORS.textDark } };
    sr++;
  }
  sr++;

  ['Kategori', 'Antal', 'Start', 'Slut'].forEach((h, i) => {
    const c = wsS.getCell(sr, i + 1);
    c.value = h;
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.headerText } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  });
  sr++;

  for (const cat of data.categories) {
    const acts = data.activities.filter((a) => a.categoryId === cat.id);
    wsS.getCell(sr, 1).value = cat.name;
    wsS.getCell(sr, 1).font = { name: 'Arial', size: 10, bold: true, color: { argb: toArgb(cat.color) } };
    wsS.getCell(sr, 2).value = acts.length;
    if (acts.length > 0) {
      wsS.getCell(sr, 3).value = fmtDate(weekToDate(Math.min(...acts.map((a) => a.startWeek)), projectStart));
      wsS.getCell(sr, 4).value = fmtDate(weekToDate(Math.max(...acts.map((a) => a.startWeek + a.durWeeks)), projectStart));
    }
    sr++;
  }

  // ════════════════════════════════════════════════════════════════════════
  // DOWNLOAD
  // ════════════════════════════════════════════════════════════════════════

  const fileName = `tidplan-${(projectName || 'northlight').toLowerCase().replace(/\s+/g, '-')}-${fmtDate(new Date())}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
