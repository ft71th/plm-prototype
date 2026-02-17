// ============================================================================
// Northlight Gantt — Store & Task Sync Bridge
// ============================================================================
//
// Manages Gantt-specific data (timeline layout, categories) while providing
// bidirectional sync with the existing taskStore:
//
//   Pull:  taskStore tasks → Gantt activities  (import existing tasks as timeline items)
//   Push:  Gantt activities → taskStore tasks  (create tasks from timeline, avoiding duplicates)
//
// Deduplication is done via `linkedTaskId` on GanttActivity and matching by
// title + category as a fallback.
// ============================================================================

import { GanttData, GanttActivity, GanttCategory, GANTT_STORAGE_KEY } from './ganttTypes';
import { Task, TaskBoard } from './types';
import * as taskStore from './taskStore';
import { apiFetch } from '../api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

// Convert a date to weeks offset from projectStart
function dateToWeek(date: Date | string, projectStart: Date): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = d.getTime() - projectStart.getTime();
  return Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

// Convert weeks offset to Date
function weekToDate(week: number, projectStart: Date): Date {
  const d = new Date(projectStart);
  d.setDate(d.getDate() + week * 7);
  return d;
}

// ---------------------------------------------------------------------------
// Persistence (backend + localStorage fallback, same pattern as taskStore)
// ---------------------------------------------------------------------------

const ganttCache: Map<string, GanttData> = new Map();
const saveTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

function debouncedSave(projectId: string): void {
  const existing = saveTimers.get(projectId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    const data = ganttCache.get(projectId);
    if (!data) return;

    apiFetch(`/projects/${projectId}/gantt`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    })
      .then(() => console.log('[Gantt] Saved to backend for', projectId))
      .catch((err: any) => console.warn('[Gantt] Backend save failed:', err.message));

    try {
      localStorage.setItem(GANTT_STORAGE_KEY(projectId), JSON.stringify(data));
    } catch { /* ignore */ }
  }, 1000);

  saveTimers.set(projectId, timer);
}

// ---------------------------------------------------------------------------
// Init & CRUD
// ---------------------------------------------------------------------------

export async function initGantt(projectId: string): Promise<GanttData> {
  // Check cache first
  if (ganttCache.has(projectId)) return ganttCache.get(projectId)!;

  let data: GanttData | null = null;

  // Try backend
  try {
    const res = await apiFetch(`/projects/${projectId}/gantt`);
    if (res?.data && res.data._northlight) {
      data = res.data;
    }
  } catch { /* fallback */ }

  // Try localStorage
  if (!data) {
    try {
      const raw = localStorage.getItem(GANTT_STORAGE_KEY(projectId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed._northlight) data = parsed;
      }
    } catch { /* ignore */ }
  }

  // Create empty
  if (!data) {
    data = {
      _northlight: true,
      version: '1.0',
      projectId,
      projectStart: new Date().toISOString(),
      categories: [],
      activities: [],
      updatedAt: now(),
    };
  }

  ganttCache.set(projectId, data);
  return data;
}

export function getGanttData(projectId: string): GanttData | null {
  return ganttCache.get(projectId) || null;
}

export function saveGanttData(projectId: string, data: GanttData): void {
  data.updatedAt = now();
  ganttCache.set(projectId, data);
  debouncedSave(projectId);
}

// ---------------------------------------------------------------------------
// Activity CRUD
// ---------------------------------------------------------------------------

export function addActivity(projectId: string, activity: Omit<GanttActivity, 'id'>): GanttActivity {
  const data = ganttCache.get(projectId);
  if (!data) throw new Error('Gantt not initialized');

  const newActivity: GanttActivity = { ...activity, id: generateId() };
  data.activities.push(newActivity);
  saveGanttData(projectId, data);
  return newActivity;
}

export function updateActivity(projectId: string, id: string, updates: Partial<GanttActivity>): void {
  const data = ganttCache.get(projectId);
  if (!data) return;

  const idx = data.activities.findIndex((a) => a.id === id);
  if (idx !== -1) {
    data.activities[idx] = { ...data.activities[idx], ...updates };
    saveGanttData(projectId, data);
  }
}

export function deleteActivity(projectId: string, id: string): void {
  const data = ganttCache.get(projectId);
  if (!data) return;

  data.activities = data.activities.filter((a) => a.id !== id);
  saveGanttData(projectId, data);
}

// ---------------------------------------------------------------------------
// Category CRUD
// ---------------------------------------------------------------------------

export function addCategory(projectId: string, name: string, color: string): GanttCategory {
  const data = ganttCache.get(projectId);
  if (!data) throw new Error('Gantt not initialized');

  const cat: GanttCategory = { id: generateId(), name, color };
  data.categories.push(cat);
  saveGanttData(projectId, data);
  return cat;
}

export function updateCategory(projectId: string, id: string, updates: Partial<GanttCategory>): void {
  const data = ganttCache.get(projectId);
  if (!data) return;

  const idx = data.categories.findIndex((c) => c.id === id);
  if (idx !== -1) {
    data.categories[idx] = { ...data.categories[idx], ...updates };
    saveGanttData(projectId, data);
  }
}

export function deleteCategory(projectId: string, id: string): void {
  const data = ganttCache.get(projectId);
  if (!data) return;

  data.categories = data.categories.filter((c) => c.id !== id);
  data.activities = data.activities.filter((a) => a.categoryId !== id);
  saveGanttData(projectId, data);
}

// ---------------------------------------------------------------------------
// SYNC: Pull tasks from taskStore → Gantt activities
// ---------------------------------------------------------------------------
//
// Reads all tasks for a given board and creates/updates Gantt activities.
// Uses `linkedTaskId` to avoid duplicates. Falls back to title matching.
//

export interface PullResult {
  created: number;
  updated: number;
  skipped: number;
}

export function pullTasksToGantt(
  projectId: string,
  boardId: string,
  targetCategoryId: string,
  projectStart: Date,
): PullResult {
  const data = ganttCache.get(projectId);
  if (!data) throw new Error('Gantt not initialized');

  const tasks = taskStore.getTasksForBoard(projectId, boardId);
  const result: PullResult = { created: 0, updated: 0, skipped: 0 };

  for (const task of tasks) {
    // 1. Check by linkedTaskId
    const existingByLink = data.activities.find((a) => a.linkedTaskId === task.id);
    if (existingByLink) {
      // Update name if changed
      if (existingByLink.name !== task.title) {
        existingByLink.name = task.title;
        result.updated++;
      } else {
        result.skipped++;
      }
      continue;
    }

    // 2. Check by title match (fuzzy dedup)
    const normalizedTitle = task.title.trim().toLowerCase();
    const existingByTitle = data.activities.find(
      (a) => a.name.trim().toLowerCase() === normalizedTitle && a.categoryId === targetCategoryId
    );
    if (existingByTitle) {
      // Link it and update
      existingByTitle.linkedTaskId = task.id;
      if (task.dueDate) {
        const dueWeek = dateToWeek(task.dueDate, projectStart);
        if (existingByTitle.startWeek + existingByTitle.durWeeks !== dueWeek) {
          existingByTitle.durWeeks = Math.max(1, dueWeek - existingByTitle.startWeek);
        }
      }
      result.updated++;
      continue;
    }

    // 3. Create new activity from task
    const startWeek = dateToWeek(new Date(), projectStart); // default to now
    let durWeeks = 4; // default 4 weeks
    if (task.dueDate) {
      const dueWeek = dateToWeek(task.dueDate, projectStart);
      durWeeks = Math.max(1, dueWeek - startWeek);
    }

    data.activities.push({
      id: generateId(),
      name: task.title,
      categoryId: targetCategoryId,
      startWeek,
      durWeeks,
      milestone: false,
      linkedTaskId: task.id,
      priority: task.priority,
      assignee: task.assignee,
      description: task.description,
    });
    result.created++;
  }

  saveGanttData(projectId, data);
  return result;
}

// ---------------------------------------------------------------------------
// SYNC: Push Gantt activities → taskStore tasks
// ---------------------------------------------------------------------------
//
// Creates tasks in the task board for any Gantt activity that doesn't yet
// have a linked task. Updates existing linked tasks with new dates.
//

export interface PushResult {
  created: number;
  updated: number;
  skipped: number;
}

export function pushActivitiesToTasks(
  projectId: string,
  boardId: string,
  columnId: string,
  currentUser: string,
  projectStart: Date,
): PushResult {
  const data = ganttCache.get(projectId);
  if (!data) throw new Error('Gantt not initialized');

  const existingTasks = taskStore.getTasks(projectId);
  const result: PushResult = { created: 0, updated: 0, skipped: 0 };

  for (const activity of data.activities) {
    if (activity.milestone) {
      result.skipped++;
      continue;
    }

    const dueDate = weekToDate(activity.startWeek + activity.durWeeks, projectStart)
      .toISOString()
      .split('T')[0];

    // 1. Has linked task already?
    if (activity.linkedTaskId) {
      const existing = existingTasks.find((t) => t.id === activity.linkedTaskId);
      if (existing) {
        // Update due date & title if changed
        let needsUpdate = false;
        if (existing.title !== activity.name) {
          existing.title = activity.name;
          needsUpdate = true;
        }
        if (existing.dueDate !== dueDate) {
          existing.dueDate = dueDate;
          needsUpdate = true;
        }
        if (needsUpdate) {
          taskStore.updateTask(projectId, existing);
          result.updated++;
        } else {
          result.skipped++;
        }
        continue;
      }
      // Linked task was deleted — fall through to create
    }

    // 2. Check by title (dedup fallback)
    const normalizedName = activity.name.trim().toLowerCase();
    const matchByTitle = existingTasks.find(
      (t) => t.boardId === boardId && t.title.trim().toLowerCase() === normalizedName
    );
    if (matchByTitle) {
      // Link and update
      activity.linkedTaskId = matchByTitle.id;
      let needsUpdate = false;
      if (matchByTitle.dueDate !== dueDate) {
        matchByTitle.dueDate = dueDate;
        needsUpdate = true;
      }
      if (needsUpdate) {
        taskStore.updateTask(projectId, matchByTitle);
        result.updated++;
      } else {
        result.skipped++;
      }
      continue;
    }

    // 3. Create new task
    const newTask = taskStore.createTask(
      projectId,
      boardId,
      columnId,
      activity.name,
      currentUser,
      {
        description: activity.description || `[Gantt] Skapad från tidplan`,
        priority: activity.priority || 'medium',
        dueDate,
        assignee: activity.assignee,
      }
    );

    // Link back
    activity.linkedTaskId = newTask.id;
    result.created++;
  }

  saveGanttData(projectId, data);
  return result;
}

// ---------------------------------------------------------------------------
// Utility: Export full Gantt data for external use
// ---------------------------------------------------------------------------

export function exportGanttJSON(projectId: string): string {
  const data = ganttCache.get(projectId);
  if (!data) return '{}';

  const projectStart = new Date(data.projectStart);
  const exported = {
    ...data,
    activities: data.activities.map((a) => ({
      ...a,
      startDate: weekToDate(a.startWeek, projectStart).toISOString().split('T')[0],
      endDate: weekToDate(a.startWeek + a.durWeeks, projectStart).toISOString().split('T')[0],
    })),
  };

  return JSON.stringify(exported, null, 2);
}

// ---------------------------------------------------------------------------
// Utility: Import Gantt JSON (from external source or clipboard)
// ---------------------------------------------------------------------------

export function importGanttJSON(projectId: string, json: string): GanttData {
  const parsed = JSON.parse(json);
  if (!parsed._northlight) throw new Error('Invalid Gantt data — missing _northlight flag');

  const data: GanttData = {
    _northlight: true,
    version: '1.0',
    projectId,
    projectStart: parsed.projectStart || new Date().toISOString(),
    categories: parsed.categories || [],
    activities: (parsed.activities || []).map((a: any) => ({
      id: a.id || generateId(),
      name: a.name,
      categoryId: a.categoryId || a.cat || '',
      startWeek: a.startWeek ?? 0,
      durWeeks: a.durWeeks ?? a.durationWeeks ?? 4,
      milestone: a.milestone ?? false,
      linkedTaskId: a.linkedTaskId,
      priority: a.priority,
      assignee: a.assignee,
      description: a.description,
    })),
    updatedAt: now(),
  };

  ganttCache.set(projectId, data);
  debouncedSave(projectId);
  return data;
}
