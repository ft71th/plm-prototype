// ============================================================================
// Northlight Gantt View — Integrated with TaskContext & ganttStore
// ============================================================================
//
// Usage:
//   <TaskProvider projectId={pid} currentUser={user}>
//     <GanttView />
//   </TaskProvider>
//
// Features:
//   - Drag & resize bars to adjust schedule
//   - Inline editing of activity names
//   - Detail panel with date pickers
//   - Pull tasks from Kanban board → Gantt (with dedup)
//   - Push Gantt activities → Kanban tasks (with dedup)
//   - Add/remove categories and activities
//   - Import/export JSON
//   - Zoom control
// ============================================================================

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { useTaskContext } from '../TaskContext';
import { GanttActivity, GanttCategory, GanttData } from '../ganttTypes';
import * as ganttStore from '../ganttStore';
import { exportGanttToExcel } from './ganttExportExcel';

// ─── Constants ──────────────────────────────────────────────────────────────

const TOTAL_WEEKS = 78; // ~18 months runway (fallback)
const ROW_H = 38;
const CAT_H = 32;
const PADDING_BEFORE = 8;  // extra weeks before earliest activity
const PADDING_AFTER = 12;  // extra weeks after latest activity

const DEFAULT_CATEGORIES: Omit<GanttCategory, 'id'>[] = [
  { name: 'Plattformsdefinition', color: '#4c7bf5' },
  { name: 'Northlight PLM Utveckling', color: '#2dd4a8' },
  { name: 'Deployment & Dokumentation', color: '#f5a623' },
  { name: 'Process & Utbildning', color: '#9f7aea' },
];

// ─── Date helpers ───────────────────────────────────────────────────────────

function weekToDate(week: number, projectStart: Date): Date {
  const d = new Date(projectStart);
  d.setDate(d.getDate() + week * 7);
  return d;
}

function dateToWeek(date: Date | string, projectStart: Date): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  return Math.round((d.getTime() - projectStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateInput(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getMonthHeaders(projectStart: Date, startWeek: number = 0, totalWeeks: number = TOTAL_WEEKS) {
  const months: { key: string; label: string; year: number; startWeek: number; weeks: number }[] = [];
  for (let i = 0; i < totalWeeks; i++) {
    const w = weekToDate(startWeek + i, projectStart);
    const key = `${w.getFullYear()}-${w.getMonth()}`;
    if (!months.length || months[months.length - 1].key !== key) {
      months.push({
        key,
        label: w.toLocaleDateString('sv-SE', { month: 'short' }),
        year: w.getFullYear(),
        startWeek: i,
        weeks: 1,
      });
    } else {
      months[months.length - 1].weeks++;
    }
  }
  return months;
}

function getTodayWeek(projectStart: Date): number {
  return dateToWeek(new Date(), projectStart);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function GanttView() {
  const ctx = useTaskContext();
  const { projectId, currentUser, boards, activeBoard, theme } = ctx;

  // State
  const [ganttData, setGanttData] = useState<GanttData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [dragState, setDragState] = useState<any>(null);
  const [zoom, setZoom] = useState(28);
  const [filterCats, setFilterCats] = useState<Set<string>>(new Set());
  const [editingName, setEditingName] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ msg: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [importText, setImportText] = useState('');
  const [showSyncDialog, setShowSyncDialog] = useState<'pull' | 'push' | null>(null);
  const [selectedBoardForSync, setSelectedBoardForSync] = useState('');
  const [selectedCatForSync, setSelectedCatForSync] = useState('');
  const [selectedColumnForSync, setSelectedColumnForSync] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize gantt data
  useEffect(() => {
    ganttStore.initGantt(projectId).then((data) => {
      // If empty, seed with default categories
      if (data.categories.length === 0) {
        DEFAULT_CATEGORIES.forEach((c) => {
          ganttStore.addCategory(projectId, c.name, c.color);
        });
        data = ganttStore.getGanttData(projectId)!;
      }
      setGanttData({ ...data });
      setFilterCats(new Set(data.categories.map((c) => c.id)));
    });
  }, [projectId]);

  // Derived
  const projectStart = useMemo(
    () => (ganttData ? new Date(ganttData.projectStart) : new Date()),
    [ganttData?.projectStart]
  );

  const activities = ganttData?.activities || [];
  const categories = ganttData?.categories || [];
  const selectedActivity = activities.find((a) => a.id === selectedId) || null;

  // Dynamic timeline range — covers all activities with padding
  const timelineRange = useMemo(() => {
    if (activities.length === 0) return { startWeek: 0, totalWeeks: TOTAL_WEEKS };
    const allStarts = activities.map((a) => a.startWeek);
    const allEnds = activities.map((a) => a.startWeek + (a.durWeeks || 0));
    const minW = Math.min(0, ...allStarts) - PADDING_BEFORE;
    const maxW = Math.max(TOTAL_WEEKS, ...allEnds) + PADDING_AFTER;
    return { startWeek: minW, totalWeeks: maxW - minW };
  }, [activities]);

  const { startWeek: tlStart, totalWeeks: tlWeeks } = timelineRange;

  const monthHeaders = useMemo(() => getMonthHeaders(projectStart, tlStart, tlWeeks), [projectStart, tlStart, tlWeeks]);
  const todayWeek = useMemo(() => getTodayWeek(projectStart), [projectStart]);

  const catGroups = useMemo(() =>
    categories.map((cat) => ({
      ...cat,
      activities: activities.filter((a) => a.categoryId === cat.id),
    })),
    [categories, activities]
  );

  const stats = useMemo(() => {
    const acts = activities.filter((a) => !a.milestone);
    if (acts.length === 0) return { total: 0, milestones: 0, totalMonths: 0 };
    const minW = Math.min(...acts.map((a) => a.startWeek));
    const maxW = Math.max(...acts.map((a) => a.startWeek + a.durWeeks));
    return {
      total: activities.length,
      milestones: activities.filter((a) => a.milestone).length,
      totalMonths: Math.round((maxW - minW) / 4.33),
    };
  }, [activities]);

  // ─── Refresh helper ───────────────────────────────────────────────────
  const refreshData = useCallback(() => {
    const d = ganttStore.getGanttData(projectId);
    if (d) setGanttData({
      ...d,
      activities: d.activities.map(a => ({ ...a })),
      categories: d.categories.map(c => ({ ...c })),
    });
  }, [projectId]);

  // ─── Refs for stable drag/update access ───────────────────────────────
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // ─── Activity CRUD ────────────────────────────────────────────────────
  // updateActivity writes to store but does NOT trigger React re-render.
  // Call refreshData() explicitly when you want the UI to reflect changes
  // (e.g. on mouseup, on blur, on button click — NOT on every mousemove).
  const storeUpdate = useCallback((id: string, updates: Partial<GanttActivity>) => {
    ganttStore.updateActivity(projectIdRef.current, id, updates);
  }, []);

  const handleUpdateActivity = useCallback((id: string, updates: Partial<GanttActivity>) => {
    storeUpdate(id, updates);
    refreshData();
  }, [storeUpdate, refreshData]);

  const handleAddActivity = useCallback((catId: string) => {
    const a = ganttStore.addActivity(projectId, {
      name: 'Ny aktivitet',
      categoryId: catId,
      startWeek: Math.max(0, todayWeek),
      durWeeks: 4,
      milestone: false,
    });
    refreshData();
    setSelectedId(a.id);
    setShowPanel(true);
  }, [projectId, todayWeek, refreshData]);

  const handleDeleteActivity = useCallback((id: string) => {
    ganttStore.deleteActivity(projectId, id);
    if (selectedId === id) { setSelectedId(null); setShowPanel(false); }
    refreshData();
  }, [projectId, selectedId, refreshData]);

  const handleDuplicateActivity = useCallback((id: string) => {
    const src = activities.find((a) => a.id === id);
    if (!src) return;
    ganttStore.addActivity(projectId, {
      ...src,
      name: src.name + ' (kopia)',
      startWeek: src.startWeek + 2,
      linkedTaskId: undefined,
    });
    refreshData();
  }, [projectId, activities, refreshData]);

  const handleToggleMilestone = useCallback((id: string) => {
    const a = activities.find((x) => x.id === id);
    if (!a) return;
    handleUpdateActivity(id, { milestone: !a.milestone, durWeeks: a.milestone ? 4 : 0 });
  }, [activities, handleUpdateActivity]);

  // ─── Category CRUD ────────────────────────────────────────────────────
  const handleAddCategory = useCallback(() => {
    const colors = ['#4c7bf5', '#2dd4a8', '#f5a623', '#9f7aea', '#f56565', '#06b6d4'];
    const color = colors[categories.length % colors.length];
    const cat = ganttStore.addCategory(projectId, 'Ny kategori', color);
    refreshData();
    setFilterCats((prev) => new Set([...prev, cat.id]));
  }, [projectId, categories.length, refreshData]);

  const handleDeleteCategory = useCallback((catId: string) => {
    if (!confirm('Ta bort kategorin och alla dess aktiviteter?')) return;
    ganttStore.deleteCategory(projectId, catId);
    setFilterCats((prev) => { const next = new Set(prev); next.delete(catId); return next; });
    if (selectedId && activities.find(a => a.id === selectedId)?.categoryId === catId) {
      setSelectedId(null);
      setShowPanel(false);
    }
    refreshData();
  }, [projectId, activities, selectedId, refreshData]);

  // ─── Drag ─────────────────────────────────────────────────────────────
  const handleBarMouseDown = useCallback((e: React.MouseEvent, actId: string, mode: string) => {
    e.stopPropagation();
    e.preventDefault();
    const data = ganttStore.getGanttData(projectIdRef.current);
    const act = data?.activities.find((a) => a.id === actId);
    if (!act) return;
    setDragState({ actId, mode, startX: e.clientX, origStart: act.startWeek, origDur: act.durWeeks });
    setSelectedId(actId);
  }, []);

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      const dWeeks = Math.round(dx / zoomRef.current);

      if (dragState.mode === 'move') {
        storeUpdate(dragState.actId, { startWeek: dragState.origStart + dWeeks });
      } else if (dragState.mode === 'resize-right') {
        storeUpdate(dragState.actId, { durWeeks: Math.max(1, dragState.origDur + dWeeks) });
      } else if (dragState.mode === 'resize-left') {
        const newStart = dragState.origStart + dWeeks;
        const newDur = dragState.origDur - (newStart - dragState.origStart);
        storeUpdate(dragState.actId, { startWeek: newStart, durWeeks: Math.max(1, newDur) });
      }
      // Update UI without full state cycle — read directly from store
      refreshData();
    };

    const handleUp = () => {
      setDragState(null);
      refreshData(); // final sync
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragState, storeUpdate, refreshData]);

  // ─── Sync handlers ────────────────────────────────────────────────────
  const handlePull = useCallback(() => {
    if (!selectedBoardForSync || !selectedCatForSync) return;
    const result = ganttStore.pullTasksToGantt(projectId, selectedBoardForSync, selectedCatForSync, projectStart);
    refreshData();
    setSyncResult({
      msg: `Pull klar: ${result.created} skapade, ${result.updated} uppdaterade, ${result.skipped} oförändrade`,
      type: 'success',
    });
    setShowSyncDialog(null);
    setTimeout(() => setSyncResult(null), 4000);
  }, [projectId, selectedBoardForSync, selectedCatForSync, projectStart, refreshData]);

  const handlePush = useCallback(() => {
    if (!selectedBoardForSync || !selectedColumnForSync) return;
    const result = ganttStore.pushActivitiesToTasks(
      projectId, selectedBoardForSync, selectedColumnForSync, currentUser, projectStart
    );
    refreshData();
    ctx.refresh(); // refresh TaskContext too
    setSyncResult({
      msg: `Push klar: ${result.created} skapade, ${result.updated} uppdaterade, ${result.skipped} oförändrade`,
      type: 'success',
    });
    setShowSyncDialog(null);
    setTimeout(() => setSyncResult(null), 4000);
  }, [projectId, selectedBoardForSync, selectedColumnForSync, currentUser, projectStart, refreshData, ctx]);

  // ─── Import / Export ──────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const json = ganttStore.exportGanttJSON(projectId);
    navigator.clipboard.writeText(json).then(() => {
      setSyncResult({ msg: 'JSON kopierad till urklipp!', type: 'info' });
      setTimeout(() => setSyncResult(null), 3000);
    });
  }, [projectId]);

  const handleExportExcel = useCallback(async () => {
    if (!ganttData) return;
    try {
      await exportGanttToExcel(ganttData, activeBoard?.name || 'Northlight');
      setSyncResult({ msg: 'Excel-fil nedladdad!', type: 'success' });
      setTimeout(() => setSyncResult(null), 3000);
    } catch (err: any) {
      setSyncResult({ msg: 'Excel-export misslyckades: ' + err.message, type: 'error' });
      setTimeout(() => setSyncResult(null), 4000);
    }
  }, [ganttData, activeBoard?.name]);

  const handleImport = useCallback(() => {
    try {
      ganttStore.importGanttJSON(projectId, importText);
      refreshData();
      setShowImport(false);
      setImportText('');
      setSyncResult({ msg: 'Import lyckades!', type: 'success' });
      setTimeout(() => setSyncResult(null), 3000);
    } catch (err: any) {
      setSyncResult({ msg: 'Import misslyckades: ' + err.message, type: 'error' });
    }
  }, [projectId, importText, refreshData]);

  // ─── Styles (uses TaskContext theme) ──────────────────────────────────
  const t = theme;
  const S = {
    app: { display: 'flex', flexDirection: 'column' as const, height: '100%', background: t.bgPrimary, color: t.textPrimary, fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 13, overflow: 'hidden' },
    topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${t.border}`, background: t.bgSecondary, flexShrink: 0, gap: 10, flexWrap: 'wrap' as const },
    title: { fontSize: 15, fontWeight: 700, letterSpacing: -0.3 },
    badge: { fontSize: 10, fontWeight: 600, color: '#2dd4a8', background: 'rgba(45,212,168,0.1)', border: '1px solid rgba(45,212,168,0.2)', padding: '2px 8px', borderRadius: 4 },
    toolGroup: { display: 'flex', alignItems: 'center', gap: 5 },
    btn: { padding: '5px 10px', borderRadius: 5, border: `1px solid ${t.border}`, background: t.bgTertiary, color: t.textSecondary, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' as const },
    btnPrimary: { background: '#4c7bf5', border: '1px solid #4c7bf5', color: '#fff' },
    btnSync: { background: 'rgba(45,212,168,0.12)', border: '1px solid rgba(45,212,168,0.3)', color: '#2dd4a8' },
    btnDanger: { background: 'rgba(245,101,101,0.1)', border: '1px solid rgba(245,101,101,0.3)', color: '#f56565' },

    statsRow: { display: 'flex', gap: 14, padding: '8px 16px', borderBottom: `1px solid ${t.border}`, background: t.bgPrimary, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' as const, fontSize: 12, color: t.textSecondary },
    statVal: { fontWeight: 700, color: t.textPrimary },
    legendItem: (color: string, active: boolean) => ({ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: active ? t.textSecondary : t.textMuted, cursor: 'pointer', padding: '3px 7px', borderRadius: 5, background: active ? `${color}18` : 'transparent', border: `1px solid ${active ? color + '40' : 'transparent'}` }),
    legendDot: (color: string) => ({ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }),

    main: { display: 'flex', flex: 1, overflow: 'hidden' },
    sidebar: { width: 300, minWidth: 300, borderRight: `1px solid ${t.border}`, background: t.bgSecondary, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
    sideHeader: { padding: '8px 12px', borderBottom: `1px solid ${t.border}`, fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    catSection: { borderBottom: `1px solid ${t.borderLight}` },
    catHeader: (color: string) => ({ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', fontSize: 11, fontWeight: 600, color }),
    catDot: (color: string) => ({ width: 6, height: 6, borderRadius: '50%', background: color }),
    taskRow: (sel: boolean) => ({ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px 4px 24px', fontSize: 12, cursor: 'pointer', background: sel ? `${t.accent}14` : 'transparent', borderLeft: sel ? `2px solid ${t.accent}` : '2px solid transparent', minHeight: 28 }),
    taskDot: (color: string, ms: boolean) => ({ width: ms ? 7 : 5, height: ms ? 7 : 5, borderRadius: ms ? 1 : '50%', background: color, transform: ms ? 'rotate(45deg)' : 'none', flexShrink: 0 }),
    taskName: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, color: t.textPrimary },
    taskWeeks: { fontSize: 10, color: t.textMuted, whiteSpace: 'nowrap' as const },
    linkedIcon: { fontSize: 9, color: '#2dd4a8', background: 'rgba(45,212,168,0.15)', padding: '1px 4px', borderRadius: 3, marginLeft: 2 },
    addBtn: { padding: '4px 12px 4px 24px', fontSize: 11, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 },

    timeline: { flex: 1, overflow: 'auto', position: 'relative' as const },
    monthBar: { display: 'flex', position: 'sticky' as const, top: 0, zIndex: 20, background: t.bgPrimary, borderBottom: `1px solid ${t.border}` },
    monthCell: (w: number) => ({ width: w, minWidth: w, boxSizing: 'border-box' as const, padding: '5px 3px', textAlign: 'center' as const, fontSize: 10, fontWeight: 600, color: t.textMuted, borderRight: `1px solid ${t.borderLight}`, overflow: 'hidden', whiteSpace: 'nowrap' as const }),
    monthYear: { fontSize: 9, color: t.textMuted, fontWeight: 400, opacity: 0.6 },

    bar: (left: number, width: number, color: string, sel: boolean, dragging: boolean) => ({
      position: 'absolute' as const, minHeight: 24, borderRadius: 5,
      left, width: Math.max(width, 6),
      background: `linear-gradient(180deg, ${color}dd 0%, ${color}aa 100%)`,
      boxShadow: sel ? `0 0 0 2px ${color}, 0 4px 12px ${color}40` : `0 2px 6px ${color}30`,
      cursor: dragging ? 'grabbing' : 'grab',
      zIndex: sel ? 12 : 10,
      display: 'flex', alignItems: 'center', padding: '2px 0',
      transition: dragging ? 'none' : 'box-shadow .15s',
    }),
    barLabel: { fontSize: 10, fontWeight: 600, color: '#fff', padding: '0 6px', overflow: 'hidden', whiteSpace: 'normal' as const, wordBreak: 'break-word' as const, lineHeight: 1.25, pointerEvents: 'none' as const, textShadow: '0 1px 3px rgba(0,0,0,0.5)' },
    resizeHandle: (side: string) => ({
      position: 'absolute' as const, top: 0, bottom: 0, width: 8,
      [side]: -2, cursor: side === 'left' ? 'w-resize' : 'e-resize', zIndex: 2,
    }),
    milestone: (left: number, color: string, sel: boolean) => ({
      position: 'absolute' as const, width: 14, height: 14, borderRadius: 3,
      left: left - 7, background: color, transform: 'rotate(45deg)',
      boxShadow: sel ? `0 0 0 2px #fff, 0 0 0 4px ${color}` : `0 2px 8px ${color}50`,
      cursor: 'pointer', zIndex: sel ? 12 : 10,
    }),

    panel: { position: 'absolute' as const, top: 0, right: 0, bottom: 0, width: 290, background: t.bgSecondary, borderLeft: `1px solid ${t.border}`, zIndex: 30, display: 'flex', flexDirection: 'column' as const, boxShadow: '-4px 0 24px rgba(0,0,0,0.3)' },
    panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${t.border}` },
    panelBody: { flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column' as const, gap: 12 },
    fieldGroup: { display: 'flex', flexDirection: 'column' as const, gap: 3 },
    fieldLabel: { fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.6 },
    fieldInput: { padding: '6px 9px', borderRadius: 5, border: `1px solid ${t.border}`, background: t.bgTertiary, color: t.textPrimary, fontSize: 12, outline: 'none' },
    fieldRow: { display: 'flex', gap: 8 },
    panelActions: { padding: '10px 14px', borderTop: `1px solid ${t.border}`, display: 'flex', gap: 6, flexWrap: 'wrap' as const },

    toast: (type: string) => ({ position: 'fixed' as const, bottom: 20, left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 100, background: type === 'success' ? '#065f46' : type === 'error' ? '#7f1d1d' : '#1e3a5f', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }),

    modal: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
    modalBox: { background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20, width: 440, maxHeight: '80vh', display: 'flex', flexDirection: 'column' as const, gap: 14 },
    code: { background: t.bgPrimary, border: `1px solid ${t.border}`, borderRadius: 8, padding: 10, fontSize: 11, fontFamily: 'monospace', color: t.textSecondary, overflow: 'auto', maxHeight: 250, whiteSpace: 'pre-wrap' as const },
    select: { padding: '6px 9px', borderRadius: 5, border: `1px solid ${t.border}`, background: t.bgTertiary, color: t.textPrimary, fontSize: 12, outline: 'none', width: '100%' },
  };

  // ─── Project Start ─────────────────────────────────────────────────────
  const handleProjectStartChange = useCallback((newDate: string) => {
    const data = ganttStore.getGanttData(projectId);
    if (!data) return;
    data.projectStart = new Date(newDate).toISOString();
    ganttStore.saveGanttData(projectId, data);
    refreshData();
  }, [projectId, refreshData]);

  if (!ganttData) {
    return <div style={{ ...S.app, alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: t.textMuted }}>Laddar tidplan...</span>
    </div>;
  }

  // ─── Build visual rows ────────────────────────────────────────────────
  const totalWidth = tlWeeks * zoom;
  type Row = { type: 'cat'; cat: GanttCategory; height: number } | { type: 'act'; act: GanttActivity; cat: GanttCategory; height: number };
  const rows: Row[] = [];
  catGroups.forEach((cat) => {
    if (!filterCats.has(cat.id)) return;
    rows.push({ type: 'cat', cat, height: CAT_H });
    cat.activities.forEach((a) => {
      rows.push({ type: 'act', act: a, cat, height: ROW_H });
    });
  });
  const totalHeight = rows.reduce((s, r) => s + r.height, 0);

  // ─── Board info for sync dialogs ──────────────────────────────────────
  const syncBoard = boards.find((b) => b.id === selectedBoardForSync);

  return (
    <div style={S.app}>
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <div style={S.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={S.title}>Tidplan</span>
          <span style={S.badge}>GANTT</span>
        </div>
        <div style={S.toolGroup}>
          <button style={S.btn} onClick={() => setZoom((z) => Math.max(10, z - 4))}>−</button>
          <span style={{ fontSize: 10, color: t.textMuted, minWidth: 36, textAlign: 'center' }}>{zoom}px/v</span>
          <button style={S.btn} onClick={() => setZoom((z) => Math.min(60, z + 4))}>+</button>

          <div style={{ width: 1, height: 18, background: t.border, margin: '0 3px' }} />

          <button style={{ ...S.btn, ...S.btnSync }} onClick={() => { setShowSyncDialog('pull'); setSelectedBoardForSync(activeBoard?.id || ''); setSelectedCatForSync(categories[0]?.id || ''); }}>
            ← Pull Tasks
          </button>
          <button style={{ ...S.btn, ...S.btnSync }} onClick={() => { setShowSyncDialog('push'); setSelectedBoardForSync(activeBoard?.id || ''); setSelectedColumnForSync(''); }}>
            → Push Tasks
          </button>

          <div style={{ width: 1, height: 18, background: t.border, margin: '0 3px' }} />

          <button style={S.btn} onClick={() => setShowImport(true)}>↑ Import</button>
          <button style={S.btn} onClick={handleExport}>↓ JSON</button>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={handleExportExcel}>📊 Excel</button>
          <button style={S.btn} onClick={handleAddCategory}>+ Kategori</button>
        </div>
      </div>

      {/* ── Stats & Legend ───────────────────────────────────────────── */}
      <div style={S.statsRow}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: t.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Start:</span>
          <input type="date" style={{ ...S.fieldInput, padding: '2px 6px', fontSize: 11, width: 130, background: t.bgTertiary }}
            value={formatDateInput(projectStart)}
            onChange={(e) => { if (e.target.value) handleProjectStartChange(e.target.value); }} />
        </span>
        <div style={{ width: 1, height: 14, background: t.border }} />
        <span><span style={S.statVal}>{stats.totalMonths}</span> mån</span>
        <span><span style={S.statVal}>{stats.total}</span> aktiviteter</span>
        <span><span style={S.statVal}>{stats.milestones}</span> milstolpar</span>
        <div style={{ width: 1, height: 14, background: t.border }} />
        {categories.map((cat) => (
          <div key={cat.id} style={S.legendItem(cat.color, filterCats.has(cat.id))}
            onClick={() => setFilterCats((prev) => {
              const next = new Set(prev);
              next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id);
              return next;
            })}>
            <div style={S.legendDot(cat.color)} />
            {cat.name}
          </div>
        ))}
      </div>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <div style={S.main}>
        {/* Sidebar */}
        <div style={S.sidebar}>
          <div style={S.sideHeader}>
            <span>Aktiviteter</span>
            <span style={{ fontSize: 10, color: t.textMuted }}>{activities.length} st</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {catGroups.map((cat) => (
              <div key={cat.id} style={S.catSection}>
                <div style={S.catHeader(cat.color)}>
                  <div style={S.catDot(cat.color)} />
                  <span style={{ flex: 1 }}>{cat.name}</span>
                  <span style={{ fontSize: 10, opacity: 0.5, marginRight: 4 }}>{cat.activities.length}</span>
                  <button style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 11, padding: '0 3px', opacity: 0.4 }}
                    title="Ta bort kategori"
                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}>✕</button>
                </div>
                {cat.activities.map((a) => (
                  <div key={a.id} style={S.taskRow(selectedId === a.id)}
                    onClick={() => { setSelectedId(a.id); setShowPanel(true); }}>
                    <div style={S.taskDot(cat.color, a.milestone)} />
                    {editingName === a.id ? (
                      <input autoFocus style={{ ...S.fieldInput, padding: '2px 5px', fontSize: 11, flex: 1 }}
                        defaultValue={a.name}
                        onBlur={(e) => { handleUpdateActivity(a.id, { name: e.target.value }); setEditingName(null); }}
                        onKeyDown={(e: any) => { if (e.key === 'Enter') e.target.blur(); }}
                      />
                    ) : (
                      <span style={S.taskName} onDoubleClick={() => setEditingName(a.id)}>{a.name}</span>
                    )}
                    {a.linkedTaskId && <span style={S.linkedIcon}>⛓</span>}
                    <span style={S.taskWeeks}>{a.milestone ? '◆' : `${a.durWeeks}v`}</span>
                    <button style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 10, padding: '0 2px', opacity: 0.3, flexShrink: 0 }}
                      title="Ta bort"
                      onClick={(e) => { e.stopPropagation(); handleDeleteActivity(a.id); }}>✕</button>
                  </div>
                ))}
                <div style={S.addBtn} onClick={() => handleAddActivity(cat.id)}>+ Lägg till</div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div style={S.timeline} ref={scrollRef}>
          <div style={S.monthBar}>
            {monthHeaders.map((m, i) => (
              <div key={i} style={S.monthCell(m.weeks * zoom)}>
                {m.weeks * zoom > 28 ? m.label : ''}{' '}
                <span style={S.monthYear as any}>{m.weeks * zoom > 48 ? m.year : ''}</span>
              </div>
            ))}
          </div>

          <div style={{ width: totalWidth, minHeight: '100%', height: totalHeight, position: 'relative' }}>
            {/* Week gridlines */}
            {Array.from({ length: tlWeeks }, (_, i) => (
              <div key={`wl${i}`} style={{ position: 'absolute', left: i * zoom, top: 0, height: Math.max(totalHeight, 3000), width: 1, background: t.borderLight }} />
            ))}

            {/* Today */}
            {todayWeek >= tlStart && todayWeek < tlStart + tlWeeks && (
              <div style={{ position: 'absolute', left: (todayWeek - tlStart) * zoom, top: 0, height: Math.max(totalHeight, 3000), width: 2, background: '#f56565', zIndex: 15, opacity: 0.5 }}>
                <div style={{ position: 'absolute', top: -17, left: '50%', transform: 'translateX(-50%)', fontSize: 8, fontWeight: 700, color: '#f56565', letterSpacing: 1 }}>IDAG</div>
              </div>
            )}

            {/* Rows */}
            {(() => {
              let y = 0;
              return rows.map((row, ri) => {
                const top = y;
                y += row.height;

                if (row.type === 'cat') {
                  return (
                    <div key={`cr${ri}`} style={{ position: 'absolute', top, left: 0, width: totalWidth, height: CAT_H, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${t.borderLight}`, background: `${row.cat.color}06` }}>
                      <div style={{ padding: '0 12px', fontSize: 11, fontWeight: 700, color: row.cat.color, opacity: 0.5 }}>{row.cat.name}</div>
                    </div>
                  );
                }

                const a = row.act;
                const color = row.cat.color;
                const barTop = top + (ROW_H - 24) / 2;
                const isSel = selectedId === a.id;

                return (
                  <div key={`ar${ri}`} style={{ position: 'absolute', top, left: 0, width: totalWidth, height: ROW_H, borderBottom: `1px solid ${t.borderLight}08` }}
                    onClick={() => setSelectedId(null)}>
                    {a.milestone ? (
                      <div style={{ ...S.milestone((a.startWeek - tlStart) * zoom, color, isSel), top: barTop + 5 }}
                        onClick={(e) => { e.stopPropagation(); setSelectedId(a.id); setShowPanel(true); }} />
                    ) : (
                      <div
                        style={{ ...S.bar((a.startWeek - tlStart) * zoom, a.durWeeks * zoom, color, isSel, dragState?.actId === a.id), top: barTop }}
                        onMouseDown={(e) => handleBarMouseDown(e, a.id, 'move')}
                        onDoubleClick={(e) => { e.stopPropagation(); setSelectedId(a.id); setShowPanel(true); }}
                        onClick={(e) => { e.stopPropagation(); setSelectedId(a.id); }}>
                        <div style={S.resizeHandle('left')} onMouseDown={(e) => handleBarMouseDown(e, a.id, 'resize-left')} />
                        {a.durWeeks * zoom > 40 && <span style={S.barLabel}>
                          {a.name}{a.assignee ? <span style={{ opacity: 0.7, fontWeight: 400 }}> — {a.assignee}</span> : ''}
                        </span>}
                        <div style={S.resizeHandle('right')} onMouseDown={(e) => handleBarMouseDown(e, a.id, 'resize-right')} />
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Detail Panel */}
        {showPanel && selectedActivity && (
          <div style={S.panel} key={selectedActivity.id}>
            <div style={S.panelHeader}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Redigera</span>
              <button style={{ ...S.btn, padding: '3px 8px' }} onClick={() => setShowPanel(false)}>✕</button>
            </div>
            <div style={S.panelBody}>
              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>Namn</label>
                <input style={S.fieldInput} defaultValue={selectedActivity.name}
                  onBlur={(e) => handleUpdateActivity(selectedActivity.id, { name: e.target.value })}
                  onKeyDown={(e: any) => { if (e.key === 'Enter') e.target.blur(); }} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>Kategori</label>
                <select style={S.select} value={selectedActivity.categoryId}
                  onChange={(e) => handleUpdateActivity(selectedActivity.id, { categoryId: e.target.value })}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={S.fieldRow}>
                <div style={{ ...S.fieldGroup, flex: 1 }}>
                  <label style={S.fieldLabel}>Start</label>
                  <input style={S.fieldInput} type="date"
                    value={formatDateInput(weekToDate(selectedActivity.startWeek, projectStart))}
                    onChange={(e) => {
                      const w = dateToWeek(new Date(e.target.value), projectStart);
                      handleUpdateActivity(selectedActivity.id, { startWeek: w });
                    }} />
                </div>
                <div style={{ ...S.fieldGroup, flex: 1 }}>
                  <label style={S.fieldLabel}>Slut</label>
                  <input style={S.fieldInput} type="date"
                    value={formatDateInput(weekToDate(selectedActivity.startWeek + selectedActivity.durWeeks, projectStart))}
                    onChange={(e) => {
                      const endW = dateToWeek(new Date(e.target.value), projectStart);
                      const dur = endW - selectedActivity.startWeek;
                      if (dur >= 1) handleUpdateActivity(selectedActivity.id, { durWeeks: dur });
                    }} />
                </div>
              </div>
              <div style={S.fieldRow}>
                <div style={{ ...S.fieldGroup, flex: 1 }}>
                  <label style={S.fieldLabel}>Veckor</label>
                  <input style={S.fieldInput} type="number" min={selectedActivity.milestone ? 0 : 1}
                    value={selectedActivity.durWeeks}
                    onChange={(e) => handleUpdateActivity(selectedActivity.id, { durWeeks: Math.max(selectedActivity.milestone ? 0 : 1, parseInt(e.target.value) || 1) })} />
                </div>
                <div style={{ ...S.fieldGroup, flex: 1 }}>
                  <label style={S.fieldLabel}>Typ</label>
                  <button style={{ ...S.btn, width: '100%', justifyContent: 'center' }}
                    onClick={() => handleToggleMilestone(selectedActivity.id)}>
                    {selectedActivity.milestone ? '◆ Milstolpe' : '▬ Aktivitet'}
                  </button>
                </div>
              </div>
              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>Tilldelad</label>
                <input style={S.fieldInput} defaultValue={selectedActivity.assignee || ''}
                  placeholder="Namn..."
                  onBlur={(e) => handleUpdateActivity(selectedActivity.id, { assignee: e.target.value })}
                  onKeyDown={(e: any) => { if (e.key === 'Enter') e.target.blur(); }} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>Beskrivning</label>
                <textarea style={{ ...S.fieldInput, minHeight: 60, resize: 'vertical' }} defaultValue={selectedActivity.description || ''}
                  onBlur={(e) => handleUpdateActivity(selectedActivity.id, { description: e.target.value })} />
              </div>

              {/* Linked task info */}
              {selectedActivity.linkedTaskId && (
                <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 10 }}>
                  <div style={S.fieldLabel}>Länkad Task</div>
                  <div style={{ fontSize: 11, color: '#2dd4a8', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                    ⛓ {selectedActivity.linkedTaskId}
                  </div>
                </div>
              )}

              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 10 }}>
                <div style={S.fieldLabel}>Beräknat</div>
                <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 3 }}>
                  {formatDate(weekToDate(selectedActivity.startWeek, projectStart))} → {formatDate(weekToDate(selectedActivity.startWeek + selectedActivity.durWeeks, projectStart))}
                </div>
              </div>
            </div>
            <div style={S.panelActions}>
              <button style={S.btn} onClick={() => handleDuplicateActivity(selectedActivity.id)}>Duplicera</button>
              <button style={{ ...S.btn, ...S.btnDanger, marginLeft: 'auto' }}
                onClick={() => handleDeleteActivity(selectedActivity.id)}>Ta bort</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Sync Dialog ─────────────────────────────────────────────── */}
      {showSyncDialog && (
        <div style={S.modal} onClick={() => setShowSyncDialog(null)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {showSyncDialog === 'pull' ? '← Hämta tasks till Gantt' : '→ Skicka aktiviteter till Kanban'}
              </span>
              <button style={{ ...S.btn, padding: '3px 8px' }} onClick={() => setShowSyncDialog(null)}>✕</button>
            </div>

            <p style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.6 }}>
              {showSyncDialog === 'pull'
                ? 'Importerar tasks från en Kanban-board som Gantt-aktiviteter. Redan länkade tasks hoppas över (ingen dubblering).'
                : 'Skapar Kanban-tasks för Gantt-aktiviteter som inte redan finns. Milstolpar hoppas över.'}
            </p>

            <div style={S.fieldGroup}>
              <label style={S.fieldLabel}>Board</label>
              <select style={S.select} value={selectedBoardForSync}
                onChange={(e) => { setSelectedBoardForSync(e.target.value); setSelectedColumnForSync(''); }}>
                <option value="">Välj board...</option>
                {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {showSyncDialog === 'pull' && (
              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>Mål-kategori i Gantt</label>
                <select style={S.select} value={selectedCatForSync}
                  onChange={(e) => setSelectedCatForSync(e.target.value)}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {showSyncDialog === 'push' && syncBoard && (
              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>Mål-kolumn i Kanban</label>
                <select style={S.select} value={selectedColumnForSync}
                  onChange={(e) => setSelectedColumnForSync(e.target.value)}>
                  <option value="">Välj kolumn...</option>
                  {syncBoard.columns.sort((a, b) => a.order - b.order).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={S.btn} onClick={() => setShowSyncDialog(null)}>Avbryt</button>
              <button
                style={{ ...S.btn, ...S.btnSync, opacity: (showSyncDialog === 'pull' ? selectedBoardForSync && selectedCatForSync : selectedBoardForSync && selectedColumnForSync) ? 1 : 0.4 }}
                onClick={showSyncDialog === 'pull' ? handlePull : handlePush}
                disabled={showSyncDialog === 'pull' ? !(selectedBoardForSync && selectedCatForSync) : !(selectedBoardForSync && selectedColumnForSync)}>
                {showSyncDialog === 'pull' ? '← Pull Tasks' : '→ Push Tasks'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Modal ────────────────────────────────────────────── */}
      {showImport && (
        <div style={S.modal} onClick={() => setShowImport(false)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Importera Gantt-data</span>
            <textarea style={{ ...S.code, minHeight: 180, resize: 'vertical', color: t.textPrimary, outline: 'none' }}
              placeholder='{"_northlight": true, ...}'
              value={importText} onChange={(e) => setImportText(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={S.btn} onClick={() => setShowImport(false)}>Avbryt</button>
              <button style={{ ...S.btn, ...S.btnPrimary }} onClick={handleImport} disabled={!importText.trim()}>Importera</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────────────────── */}
      {syncResult && <div style={S.toast(syncResult.type)}>{syncResult.msg}</div>}
    </div>
  );
}
