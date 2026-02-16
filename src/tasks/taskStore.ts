// ============================================================================
// Northlight Task Management — Store (CRUD + Persistence)
// Now uses backend API (PostgreSQL) as source of truth,
// with in-memory cache for synchronous access.
// ============================================================================

import {
  TaskBoard,
  TaskColumn,
  Task,
  TaskLabel,
  TaskCategory,
  TaskRef,
  Priority,
  ThemeKey,
  LinkedItem,
  ChecklistItem,
  DEFAULT_COLUMNS,
  DEFAULT_LABELS,
  DEFAULT_CATEGORIES,
} from './types';

import { apiFetch } from '../api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// In-memory cache + background sync
// ---------------------------------------------------------------------------

const boardsCache: Map<string, TaskBoard[]> = new Map();
const tasksCache: Map<string, Task[]> = new Map();
const initializedProjects: Set<string> = new Set();

// Debounced save timers
const boardsSaveTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
const tasksSaveTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

function debouncedSaveBoards(projectId: string): void {
  const existing = boardsSaveTimers.get(projectId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    const boards = boardsCache.get(projectId) || [];
    apiFetch(`/projects/${projectId}/boards`, {
      method: 'PUT',
      body: JSON.stringify({ data: boards }),
    })
      .then(() => console.log('[Tasks] Boards saved to backend for', projectId))
      .catch((err: any) => console.warn('[Tasks] Failed to save boards:', err.message));

    // Also cache to localStorage as fallback
    try {
      localStorage.setItem(`northlight-boards-${projectId}`, JSON.stringify(boards));
    } catch (e) { /* ignore */ }
  }, 1000);

  boardsSaveTimers.set(projectId, timer);
}

function debouncedSaveTasks(projectId: string): void {
  const existing = tasksSaveTimers.get(projectId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    const tasks = tasksCache.get(projectId) || [];
    apiFetch(`/projects/${projectId}/tasks`, {
      method: 'PUT',
      body: JSON.stringify({ data: tasks }),
    })
      .then(() => console.log('[Tasks] Tasks saved to backend for', projectId))
      .catch((err: any) => console.warn('[Tasks] Failed to save tasks:', err.message));

    // Also cache to localStorage as fallback
    try {
      localStorage.setItem(`northlight-tasks-${projectId}`, JSON.stringify(tasks));
    } catch (e) { /* ignore */ }
  }, 1000);

  tasksSaveTimers.set(projectId, timer);
}

// ---------------------------------------------------------------------------
// Initialization — call this when opening a project
// ---------------------------------------------------------------------------

export async function initProjectTasks(projectId: string): Promise<void> {
  if (initializedProjects.has(projectId)) return;

  try {
    // Load boards from backend
    const boardsRes = await apiFetch(`/projects/${projectId}/boards`);
    const backendBoards = boardsRes?.data;
    if (Array.isArray(backendBoards) && backendBoards.length > 0) {
      boardsCache.set(projectId, backendBoards);
    } else {
      // Try localStorage migration
      const localBoards = localStorage.getItem(`northlight-boards-${projectId}`);
      if (localBoards) {
        try {
          const parsed = JSON.parse(localBoards);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`[Tasks] Migrating ${parsed.length} boards from localStorage`);
            boardsCache.set(projectId, parsed);
            // Push to backend
            await apiFetch(`/projects/${projectId}/boards`, {
              method: 'PUT',
              body: JSON.stringify({ data: parsed }),
            });
          }
        } catch (e) { /* ignore */ }
      }
      if (!boardsCache.has(projectId)) {
        boardsCache.set(projectId, []);
      }
    }

    // Load tasks from backend
    const tasksRes = await apiFetch(`/projects/${projectId}/tasks`);
    const backendTasks = tasksRes?.data;
    if (Array.isArray(backendTasks) && backendTasks.length > 0) {
      tasksCache.set(projectId, backendTasks);
    } else {
      // Try localStorage migration
      const localTasks = localStorage.getItem(`northlight-tasks-${projectId}`);
      if (localTasks) {
        try {
          const parsed = JSON.parse(localTasks);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`[Tasks] Migrating ${parsed.length} tasks from localStorage`);
            tasksCache.set(projectId, parsed);
            // Push to backend
            await apiFetch(`/projects/${projectId}/tasks`, {
              method: 'PUT',
              body: JSON.stringify({ data: parsed }),
            });
          }
        } catch (e) { /* ignore */ }
      }
      if (!tasksCache.has(projectId)) {
        tasksCache.set(projectId, []);
      }
    }

    initializedProjects.add(projectId);
    console.log(`[Tasks] Initialized project ${projectId}: ${boardsCache.get(projectId)?.length || 0} boards, ${tasksCache.get(projectId)?.length || 0} tasks`);
  } catch (err: any) {
    console.warn('[Tasks] Backend init failed, falling back to localStorage:', err.message);

    // Fallback to localStorage
    try {
      const localBoards = localStorage.getItem(`northlight-boards-${projectId}`);
      boardsCache.set(projectId, localBoards ? JSON.parse(localBoards) : []);
    } catch (e) {
      boardsCache.set(projectId, []);
    }

    try {
      const localTasks = localStorage.getItem(`northlight-tasks-${projectId}`);
      tasksCache.set(projectId, localTasks ? JSON.parse(localTasks) : []);
    } catch (e) {
      tasksCache.set(projectId, []);
    }

    initializedProjects.add(projectId);
  }
}

// Force re-init (useful after migration)
export function resetProjectCache(projectId: string): void {
  initializedProjects.delete(projectId);
  boardsCache.delete(projectId);
  tasksCache.delete(projectId);
}

// ---------------------------------------------------------------------------
// Storage keys (kept for localStorage fallback cache)
// ---------------------------------------------------------------------------

const BOARDS_KEY = (projectId: string) => `northlight-boards-${projectId}`;
const TASKS_KEY = (projectId: string) => `northlight-tasks-${projectId}`;
const TASK_INDEX_KEY = (userId: string) => `northlight-task-index-${userId}`;

// ---------------------------------------------------------------------------
// Discovery — find all project IDs that have task data
// ---------------------------------------------------------------------------

export function discoverProjectIds(): string[] {
  const ids = new Set<string>();
  // From cache
  boardsCache.forEach((_, key) => ids.add(key));
  tasksCache.forEach((_, key) => ids.add(key));
  // From localStorage (for uninitialized projects)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith('northlight-tasks-')) {
      ids.add(key.slice('northlight-tasks-'.length));
    } else if (key.startsWith('northlight-boards-')) {
      ids.add(key.slice('northlight-boards-'.length));
    }
  }
  return Array.from(ids);
}

// ---------------------------------------------------------------------------
// Board CRUD
// ---------------------------------------------------------------------------

export function getBoards(projectId: string): TaskBoard[] {
  return boardsCache.get(projectId) || [];
}

export function saveBoards(projectId: string, boards: TaskBoard[]): void {
  boardsCache.set(projectId, boards);
  debouncedSaveBoards(projectId);
}

export function createBoard(
  projectId: string,
  name: string,
  templateColumns?: Omit<TaskColumn, 'id'>[]
): TaskBoard {
  const columns = (templateColumns || DEFAULT_COLUMNS).map((col, i) => ({
    ...col,
    id: generateId(),
    order: i,
  }));

  const labels = DEFAULT_LABELS.map((l) => ({
    ...l,
    id: generateId(),
  }));

  const categories = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    id: generateId(),
  }));

  const board: TaskBoard = {
    id: generateId(),
    projectId,
    name,
    columns,
    labels,
    categories,
    themeKey: 'dark' as ThemeKey,
    createdAt: now(),
    updatedAt: now(),
  };

  const boards = getBoards(projectId);
  boards.push(board);
  saveBoards(projectId, boards);
  return board;
}

export function updateBoard(projectId: string, board: TaskBoard): void {
  const boards = getBoards(projectId);
  const idx = boards.findIndex((b) => b.id === board.id);
  if (idx !== -1) {
    boards[idx] = { ...board, updatedAt: now() };
    saveBoards(projectId, boards);
  }
}

export function deleteBoard(projectId: string, boardId: string): void {
  const boards = getBoards(projectId).filter((b) => b.id !== boardId);
  saveBoards(projectId, boards);
  // Also delete all tasks for this board
  const tasks = getTasks(projectId).filter((t) => t.boardId !== boardId);
  saveTasks(projectId, tasks);
}

// ---------------------------------------------------------------------------
// Column CRUD (operates on board)
// ---------------------------------------------------------------------------

export function addColumn(
  projectId: string,
  boardId: string,
  name: string,
  color: string = '#6b7280'
): TaskColumn | null {
  const boards = getBoards(projectId);
  const board = boards.find((b) => b.id === boardId);
  if (!board) return null;

  const maxOrder = Math.max(...board.columns.map((c) => c.order), -1);
  const column: TaskColumn = {
    id: generateId(),
    name,
    order: maxOrder + 1,
    color,
  };
  board.columns.push(column);
  board.updatedAt = now();
  saveBoards(projectId, boards);
  return column;
}

export function updateColumn(
  projectId: string,
  boardId: string,
  column: TaskColumn
): void {
  const boards = getBoards(projectId);
  const board = boards.find((b) => b.id === boardId);
  if (!board) return;

  const idx = board.columns.findIndex((c) => c.id === column.id);
  if (idx !== -1) {
    board.columns[idx] = column;
    board.updatedAt = now();
    saveBoards(projectId, boards);
  }
}

export function deleteColumn(
  projectId: string,
  boardId: string,
  columnId: string,
  moveTasksToColumnId?: string
): void {
  const boards = getBoards(projectId);
  const board = boards.find((b) => b.id === boardId);
  if (!board) return;

  board.columns = board.columns.filter((c) => c.id !== columnId);
  board.columns.sort((a, b) => a.order - b.order);
  board.columns.forEach((c, i) => (c.order = i));
  board.updatedAt = now();
  saveBoards(projectId, boards);

  const tasks = getTasks(projectId);
  if (moveTasksToColumnId) {
    tasks.forEach((t) => {
      if (t.boardId === boardId && t.columnId === columnId) {
        t.columnId = moveTasksToColumnId;
      }
    });
  }
  const filtered = moveTasksToColumnId
    ? tasks
    : tasks.filter((t) => !(t.boardId === boardId && t.columnId === columnId));
  saveTasks(projectId, filtered);
}

export function reorderColumns(
  projectId: string,
  boardId: string,
  columnIds: string[]
): void {
  const boards = getBoards(projectId);
  const board = boards.find((b) => b.id === boardId);
  if (!board) return;

  columnIds.forEach((id, i) => {
    const col = board.columns.find((c) => c.id === id);
    if (col) col.order = i;
  });
  board.columns.sort((a, b) => a.order - b.order);
  board.updatedAt = now();
  saveBoards(projectId, boards);
}

// ---------------------------------------------------------------------------
// Task CRUD
// ---------------------------------------------------------------------------

export function getTasks(projectId: string): Task[] {
  return tasksCache.get(projectId) || [];
}

export function saveTasks(projectId: string, tasks: Task[]): void {
  tasksCache.set(projectId, tasks);
  debouncedSaveTasks(projectId);
}

export function getTasksForBoard(projectId: string, boardId: string): Task[] {
  return getTasks(projectId).filter((t) => t.boardId === boardId);
}

export function createTask(
  projectId: string,
  boardId: string,
  columnId: string,
  title: string,
  createdBy: string,
  extra?: Partial<Pick<Task, 'description' | 'assignee' | 'priority' | 'dueDate' | 'labels' | 'linkedItems' | 'categoryId'>>
): Task {
  const tasks = getTasks(projectId);
  const columnTasks = tasks.filter(
    (t) => t.boardId === boardId && t.columnId === columnId
  );
  const maxOrder = columnTasks.length > 0
    ? Math.max(...columnTasks.map((t) => t.order))
    : -1;

  const task: Task = {
    id: generateId(),
    boardId,
    projectId,
    columnId,
    order: maxOrder + 1,
    title,
    description: extra?.description || '',
    checklist: [],
    linkedItems: extra?.linkedItems || [],
    assignee: extra?.assignee || '',
    createdBy,
    priority: extra?.priority || 'medium',
    dueDate: extra?.dueDate || '',
    labels: extra?.labels || [],
    categoryId: extra?.categoryId || '',
    createdAt: now(),
    updatedAt: now(),
  };

  tasks.push(task);
  saveTasks(projectId, tasks);
  return task;
}

export function updateTask(projectId: string, task: Task): void {
  const tasks = getTasks(projectId);
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx !== -1) {
    tasks[idx] = { ...task, updatedAt: now() };
    saveTasks(projectId, tasks);
  }
}

export function deleteTask(projectId: string, taskId: string): void {
  const tasks = getTasks(projectId).filter((t) => t.id !== taskId);
  saveTasks(projectId, tasks);
}

export function moveTask(
  projectId: string,
  taskId: string,
  toColumnId: string,
  toOrder: number
): void {
  const tasks = getTasks(projectId);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  const oldColumnId = task.columnId;

  const oldColumnTasks = tasks
    .filter((t) => t.boardId === task.boardId && t.columnId === oldColumnId && t.id !== taskId)
    .sort((a, b) => a.order - b.order);
  oldColumnTasks.forEach((t, i) => (t.order = i));

  task.columnId = toColumnId;
  task.order = toOrder;
  task.updatedAt = now();

  const newColumnTasks = tasks
    .filter((t) => t.boardId === task.boardId && t.columnId === toColumnId && t.id !== taskId)
    .sort((a, b) => a.order - b.order);

  newColumnTasks.forEach((t, i) => {
    t.order = i >= toOrder ? i + 1 : i;
  });

  saveTasks(projectId, tasks);
}

// ---------------------------------------------------------------------------
// Checklist helpers
// ---------------------------------------------------------------------------

export function addChecklistItem(
  projectId: string,
  taskId: string,
  text: string
): ChecklistItem | null {
  const tasks = getTasks(projectId);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  if (!task.checklist) task.checklist = [];
  const item: ChecklistItem = { id: generateId(), text, done: false };
  task.checklist.push(item);
  task.updatedAt = now();
  saveTasks(projectId, tasks);
  return item;
}

export function toggleChecklistItem(
  projectId: string,
  taskId: string,
  itemId: string
): void {
  const tasks = getTasks(projectId);
  const task = tasks.find((t) => t.id === taskId);
  if (!task?.checklist) return;

  const item = task.checklist.find((i) => i.id === itemId);
  if (item) {
    item.done = !item.done;
    task.updatedAt = now();
    saveTasks(projectId, tasks);
  }
}

// ---------------------------------------------------------------------------
// Cross-project task index
// ---------------------------------------------------------------------------

export function getTaskIndex(userId: string): TaskRef[] {
  try {
    const raw = localStorage.getItem(TASK_INDEX_KEY(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function rebuildTaskIndex(
  userId: string,
  projectIds: string[],
  getProjectName: (id: string) => string
): TaskRef[] {
  const refs: TaskRef[] = [];

  for (const projectId of projectIds) {
    const boards = getBoards(projectId);
    const tasks = getTasks(projectId);

    for (const task of tasks) {
      if (task.assignee !== userId && task.createdBy !== userId) continue;

      const board = boards.find((b) => b.id === task.boardId);
      if (!board) continue;

      const column = board.columns.find((c) => c.id === task.columnId);

      refs.push({
        taskId: task.id,
        projectId,
        projectName: getProjectName(projectId),
        boardId: task.boardId,
        boardName: board.name,
        title: task.title,
        columnName: column?.name || 'Unknown',
        assignee: task.assignee,
        priority: task.priority,
        dueDate: task.dueDate,
      });
    }
  }

  localStorage.setItem(TASK_INDEX_KEY(userId), JSON.stringify(refs));
  return refs;
}

// ---------------------------------------------------------------------------
// Linked items helpers
// ---------------------------------------------------------------------------

export function linkItemToTask(
  projectId: string,
  taskId: string,
  item: LinkedItem
): void {
  const tasks = getTasks(projectId);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  if (task.linkedItems.some((li) => li.itemId === item.itemId)) return;

  task.linkedItems.push(item);
  task.updatedAt = now();
  saveTasks(projectId, tasks);
}

export function unlinkItemFromTask(
  projectId: string,
  taskId: string,
  itemId: string
): void {
  const tasks = getTasks(projectId);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  task.linkedItems = task.linkedItems.filter((li) => li.itemId !== itemId);
  task.updatedAt = now();
  saveTasks(projectId, tasks);
}

export function getTasksForItem(
  projectId: string,
  itemId: string
): Task[] {
  return getTasks(projectId).filter((t) =>
    t.linkedItems.some((li) => li.itemId === itemId)
  );
}
