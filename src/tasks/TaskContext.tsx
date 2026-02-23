// ============================================================================
// Northlight Task Management — React Context & Hook
// ============================================================================

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import {
  TaskBoard,
  TaskColumn,
  Task,
  TaskLabel,
  TaskCategory,
  Priority,
  ThemeKey,
  BoardTheme,
  LinkedItem,
  THEMES,
} from './types';
import * as store from './taskStore';
import { initProjectTasks } from './taskStore';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface TaskContextValue {
  // Current state
  projectId: string;
  currentUser: string;
  boards: TaskBoard[];
  activeBoard: TaskBoard | null;
  tasks: Task[];         // filtered tasks
  allTasks: Task[];      // unfiltered tasks for current board
  loading: boolean;      // true while initializing from backend

  // Theme
  theme: BoardTheme;
  themeKey: string;
  setThemeKey: (key: string) => void;

  // Filters
  categoryFilter: string;
  setCategoryFilter: (id: string) => void;
  searchFilter: string;
  setSearchFilter: (text: string) => void;

  // Board ops
  setActiveBoard: (board: TaskBoard | null) => void;
  createBoard: (name: string) => TaskBoard;
  updateBoard: (board: TaskBoard) => void;
  deleteBoard: (boardId: string) => void;

  // Column ops
  addColumn: (name: string, color?: string) => void;
  updateColumn: (column: TaskColumn) => void;
  deleteColumn: (columnId: string, moveToId?: string) => void;
  reorderColumns: (columnIds: string[]) => void;

  // Category ops
  addCategory: (name: string, color: string, icon: string) => void;
  updateCategory: (category: TaskCategory) => void;
  deleteCategory: (categoryId: string) => void;

  // Label ops
  addLabel: (name: string, color: string) => void;
  updateLabel: (label: TaskLabel) => void;
  deleteLabel: (labelId: string) => void;

  // Custom theme ops
  customThemes: Record<string, BoardTheme>;
  allThemes: Record<string, BoardTheme>;
  addCustomTheme: (name: string, theme: BoardTheme) => void;
  deleteCustomTheme: (key: string) => void;

  // Task ops
  createTask: (columnId: string, title: string, extra?: Partial<Pick<Task, 'description' | 'assignee' | 'priority' | 'dueDate' | 'labels' | 'linkedItems' | 'categoryId'>>) => Task | null;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  moveTask: (taskId: string, toColumnId: string, toOrder: number) => void;

  // Checklist
  addChecklistItem: (taskId: string, text: string) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;

  // Linked items
  linkItem: (taskId: string, item: LinkedItem) => void;
  unlinkItem: (taskId: string, itemId: string) => void;

  // Refresh
  refresh: () => void;
}

const TaskContext = createContext<TaskContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface TaskProviderProps {
  projectId: string;
  currentUser: string;
  children: React.ReactNode;
}

export function TaskProvider({ projectId, currentUser, isDarkMode: appDarkMode, children }: TaskProviderProps) {
  const [boards, setBoards] = useState<TaskBoard[]>([]);
  const [activeBoard, setActiveBoard] = useState<TaskBoard | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data
  const refresh = useCallback(() => {
    const b = store.getBoards(projectId);
    setBoards(b);

    if (activeBoard) {
      const updated = b.find((x) => x.id === activeBoard.id);
      if (updated) {
        setActiveBoard(updated);
        setTasks(store.getTasksForBoard(projectId, updated.id));
      } else {
        setActiveBoard(null);
        setTasks([]);
      }
    }
  }, [projectId, activeBoard?.id]);

  // Initialize from backend, then load into state
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        await initProjectTasks(projectId);
      } catch (err) {
        console.warn('[TaskContext] Backend init failed, using cache:', err);
      }

      if (cancelled) return;

      const b = store.getBoards(projectId);
      setBoards(b);
      if (b.length > 0) {
        // Restore last active board from localStorage
        const ACTIVE_BOARD_KEY = `northlight-active-board-${projectId}`;
        const savedBoardId = localStorage.getItem(ACTIVE_BOARD_KEY);
        const savedBoard = savedBoardId ? b.find(x => x.id === savedBoardId) : null;
        const initialBoard = savedBoard || b[0];
        setActiveBoard(initialBoard);
        setTasks(store.getTasksForBoard(projectId, initialBoard.id));
      } else {
        setActiveBoard(null);
        setTasks([]);
      }
      setLoading(false);
    }

    init();

    return () => { cancelled = true; };
  }, [projectId]);

  // Board selection
  const handleSetActiveBoard = useCallback((board: TaskBoard | null) => {
    setActiveBoard(board);
    // Persist selection so it survives view switches
    const ACTIVE_BOARD_KEY = `northlight-active-board-${projectId}`;
    if (board) {
      localStorage.setItem(ACTIVE_BOARD_KEY, board.id);
      setTasks(store.getTasksForBoard(projectId, board.id));
    } else {
      localStorage.removeItem(ACTIVE_BOARD_KEY);
      setTasks([]);
    }
  }, [projectId]);

  // — Theme state (must be before Board ops so createBoard can reference it) —
  const PROJECT_THEME_KEY = `northlight-theme-${projectId}`;
  const [projectThemeFallback, setProjectThemeFallback] = useState(() => {
    try { return localStorage.getItem(PROJECT_THEME_KEY) || 'dark'; } catch { return 'dark'; }
  });
  const themeKey: string = activeBoard?.themeKey || projectThemeFallback;

  // Board ops
  const handleCreateBoard = useCallback((name: string) => {
    const board = store.createBoard(projectId, name);
    // Inherit project-level theme preference
    if (projectThemeFallback !== 'dark') {
      board.themeKey = projectThemeFallback;
      store.updateBoard(projectId, board);
    }
    setBoards(store.getBoards(projectId));
    setActiveBoard(board);
    setTasks([]);
    return board;
  }, [projectId, projectThemeFallback]);

  const handleUpdateBoard = useCallback((board: TaskBoard) => {
    store.updateBoard(projectId, board);
    setBoards(store.getBoards(projectId));
    if (activeBoard?.id === board.id) setActiveBoard(board);
  }, [projectId, activeBoard?.id]);

  const handleDeleteBoard = useCallback((boardId: string) => {
    store.deleteBoard(projectId, boardId);
    const remaining = store.getBoards(projectId);
    setBoards(remaining);
    if (activeBoard?.id === boardId) {
      const next = remaining[0] || null;
      setActiveBoard(next);
      setTasks(next ? store.getTasksForBoard(projectId, next.id) : []);
      const ACTIVE_BOARD_KEY = `northlight-active-board-${projectId}`;
      if (next) localStorage.setItem(ACTIVE_BOARD_KEY, next.id);
      else localStorage.removeItem(ACTIVE_BOARD_KEY);
    }
  }, [projectId, activeBoard?.id]);

  // Column ops
  const handleAddColumn = useCallback((name: string, color?: string) => {
    if (!activeBoard) return;
    store.addColumn(projectId, activeBoard.id, name, color);
    const b = store.getBoards(projectId);
    setBoards(b);
    const updated = b.find((x) => x.id === activeBoard.id);
    if (updated) setActiveBoard(updated);
  }, [projectId, activeBoard?.id]);

  const handleUpdateColumn = useCallback((column: TaskColumn) => {
    if (!activeBoard) return;
    store.updateColumn(projectId, activeBoard.id, column);
    const b = store.getBoards(projectId);
    setBoards(b);
    const updated = b.find((x) => x.id === activeBoard.id);
    if (updated) setActiveBoard(updated);
  }, [projectId, activeBoard?.id]);

  const handleDeleteColumn = useCallback((columnId: string, moveToId?: string) => {
    if (!activeBoard) return;
    store.deleteColumn(projectId, activeBoard.id, columnId, moveToId);
    const b = store.getBoards(projectId);
    setBoards(b);
    const updated = b.find((x) => x.id === activeBoard.id);
    if (updated) {
      setActiveBoard(updated);
      setTasks(store.getTasksForBoard(projectId, updated.id));
    }
  }, [projectId, activeBoard?.id]);

  const handleReorderColumns = useCallback((columnIds: string[]) => {
    if (!activeBoard) return;
    store.reorderColumns(projectId, activeBoard.id, columnIds);
    const b = store.getBoards(projectId);
    setBoards(b);
    const updated = b.find((x) => x.id === activeBoard.id);
    if (updated) setActiveBoard(updated);
  }, [projectId, activeBoard?.id]);

  // Task ops
  const handleCreateTask = useCallback((columnId: string, title: string, extra?: any) => {
    if (!activeBoard) return null;
    const task = store.createTask(projectId, activeBoard.id, columnId, title, currentUser, extra);
    setTasks(store.getTasksForBoard(projectId, activeBoard.id));
    return task;
  }, [projectId, activeBoard?.id, currentUser]);

  const handleUpdateTask = useCallback((task: Task) => {
    store.updateTask(projectId, task);
    if (activeBoard) setTasks(store.getTasksForBoard(projectId, activeBoard.id));
  }, [projectId, activeBoard?.id]);

  const handleDeleteTask = useCallback((taskId: string) => {
    store.deleteTask(projectId, taskId);
    if (activeBoard) setTasks(store.getTasksForBoard(projectId, activeBoard.id));
  }, [projectId, activeBoard?.id]);

  const handleMoveTask = useCallback((taskId: string, toColumnId: string, toOrder: number) => {
    store.moveTask(projectId, taskId, toColumnId, toOrder);
    if (activeBoard) setTasks(store.getTasksForBoard(projectId, activeBoard.id));
  }, [projectId, activeBoard?.id]);

  // Checklist
  const handleAddChecklistItem = useCallback((taskId: string, text: string) => {
    store.addChecklistItem(projectId, taskId, text);
    if (activeBoard) setTasks(store.getTasksForBoard(projectId, activeBoard.id));
  }, [projectId, activeBoard?.id]);

  const handleToggleChecklistItem = useCallback((taskId: string, itemId: string) => {
    store.toggleChecklistItem(projectId, taskId, itemId);
    if (activeBoard) setTasks(store.getTasksForBoard(projectId, activeBoard.id));
  }, [projectId, activeBoard?.id]);

  // Linked items
  const handleLinkItem = useCallback((taskId: string, item: LinkedItem) => {
    store.linkItemToTask(projectId, taskId, item);
    if (activeBoard) setTasks(store.getTasksForBoard(projectId, activeBoard.id));
  }, [projectId, activeBoard?.id]);

  const handleUnlinkItem = useCallback((taskId: string, itemId: string) => {
    store.unlinkItemFromTask(projectId, taskId, itemId);
    if (activeBoard) setTasks(store.getTasksForBoard(projectId, activeBoard.id));
  }, [projectId, activeBoard?.id]);

  // — Theme (handleSetThemeKey) —
  const handleSetThemeKey = useCallback((key: string) => {
    // Always save project-level fallback and update state
    try { localStorage.setItem(PROJECT_THEME_KEY, key); } catch {}
    setProjectThemeFallback(key);

    if (!activeBoard) return;
    const updated = { ...activeBoard, themeKey: key };
    store.updateBoard(projectId, updated);
    const b = store.getBoards(projectId);
    setBoards(b);
    setActiveBoard(b.find((x) => x.id === activeBoard.id) || null);
  }, [projectId, activeBoard?.id, PROJECT_THEME_KEY]);

  // — Filters —
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.categoryId === categoryFilter);
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.assignee?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tasks, categoryFilter, searchFilter]);

  // — Category ops —
  const handleAddCategory = useCallback((name: string, color: string, icon: string) => {
    if (!activeBoard) return;
    const cat = { id: store.generateId(), name, color, icon };
    const updated = { ...activeBoard, categories: [...(activeBoard.categories || []), cat] };
    store.updateBoard(projectId, updated);
    const b = store.getBoards(projectId);
    setBoards(b);
    setActiveBoard(b.find((x) => x.id === activeBoard.id) || null);
  }, [projectId, activeBoard]);

  const handleUpdateCategory = useCallback((category: TaskCategory) => {
    if (!activeBoard) return;
    const updated = { ...activeBoard, categories: (activeBoard.categories || []).map((c) => c.id === category.id ? category : c) };
    store.updateBoard(projectId, updated);
    const b = store.getBoards(projectId);
    setBoards(b);
    setActiveBoard(b.find((x) => x.id === activeBoard.id) || null);
  }, [projectId, activeBoard]);

  const handleDeleteCategory = useCallback((categoryId: string) => {
    if (!activeBoard) return;
    const updated = { ...activeBoard, categories: (activeBoard.categories || []).filter((c) => c.id !== categoryId) };
    store.updateBoard(projectId, updated);
    const allTasks = store.getTasks(projectId);
    allTasks.forEach((t) => {
      if (t.categoryId === categoryId) {
        store.updateTask(projectId, { ...t, categoryId: '' });
      }
    });
    const b = store.getBoards(projectId);
    setBoards(b);
    setActiveBoard(b.find((x) => x.id === activeBoard.id) || null);
    if (activeBoard) setTasks(store.getTasksForBoard(projectId, activeBoard.id));
    if (categoryFilter === categoryId) setCategoryFilter('all');
  }, [projectId, activeBoard, categoryFilter]);

  // — Label ops —
  const handleAddLabel = useCallback((name: string, color: string) => {
    if (!activeBoard) return;
    const label = { id: store.generateId(), name, color };
    const updated = { ...activeBoard, labels: [...activeBoard.labels, label] };
    store.updateBoard(projectId, updated);
    const b = store.getBoards(projectId);
    setBoards(b);
    setActiveBoard(b.find((x) => x.id === activeBoard.id) || null);
  }, [projectId, activeBoard]);

  const handleUpdateLabel = useCallback((label: TaskLabel) => {
    if (!activeBoard) return;
    const updated = { ...activeBoard, labels: activeBoard.labels.map((l) => l.id === label.id ? label : l) };
    store.updateBoard(projectId, updated);
    const b = store.getBoards(projectId);
    setBoards(b);
    setActiveBoard(b.find((x) => x.id === activeBoard.id) || null);
  }, [projectId, activeBoard]);

  const handleDeleteLabel = useCallback((labelId: string) => {
    if (!activeBoard) return;
    const updated = { ...activeBoard, labels: activeBoard.labels.filter((l) => l.id !== labelId) };
    store.updateBoard(projectId, updated);
    // Remove label from tasks
    const allT = store.getTasks(projectId);
    allT.forEach((t) => {
      if (t.labels.includes(labelId)) {
        store.updateTask(projectId, { ...t, labels: t.labels.filter((id) => id !== labelId) });
      }
    });
    const b = store.getBoards(projectId);
    setBoards(b);
    setActiveBoard(b.find((x) => x.id === activeBoard.id) || null);
    if (activeBoard) setTasks(store.getTasksForBoard(projectId, activeBoard.id));
  }, [projectId, activeBoard]);

  // — Custom themes —
  const CUSTOM_THEMES_KEY = `northlight-custom-themes`;

  const [customThemes, setCustomThemes] = useState<Record<string, BoardTheme>>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  const allThemes = useMemo(() => ({ ...THEMES, ...customThemes }), [customThemes]);

  // Override theme resolution to support custom themes
  const resolvedTheme = allThemes[themeKey] || THEMES.dark;

  const handleAddCustomTheme = useCallback((name: string, newTheme: BoardTheme) => {
    const key = `custom-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`;
    const updated = { ...customThemes, [key]: { ...newTheme, name } };
    setCustomThemes(updated);
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(updated));
  }, [customThemes]);

  const handleDeleteCustomTheme = useCallback((key: string) => {
    const updated = { ...customThemes };
    delete updated[key];
    setCustomThemes(updated);
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(updated));
    // If active theme was deleted, switch to dark
    if (themeKey === key) handleSetThemeKey('dark');
  }, [customThemes, themeKey, handleSetThemeKey]);

  const value: TaskContextValue = {
    projectId,
    currentUser,
    boards,
    activeBoard,
    tasks: filteredTasks,
    allTasks: tasks,
    loading,
    theme: resolvedTheme,
    themeKey,
    setThemeKey: handleSetThemeKey,
    categoryFilter,
    setCategoryFilter,
    searchFilter,
    setSearchFilter,
    setActiveBoard: handleSetActiveBoard,
    createBoard: handleCreateBoard,
    updateBoard: handleUpdateBoard,
    deleteBoard: handleDeleteBoard,
    addColumn: handleAddColumn,
    updateColumn: handleUpdateColumn,
    deleteColumn: handleDeleteColumn,
    reorderColumns: handleReorderColumns,
    addCategory: handleAddCategory,
    updateCategory: handleUpdateCategory,
    deleteCategory: handleDeleteCategory,
    addLabel: handleAddLabel,
    updateLabel: handleUpdateLabel,
    deleteLabel: handleDeleteLabel,
    customThemes,
    allThemes,
    addCustomTheme: handleAddCustomTheme,
    deleteCustomTheme: handleDeleteCustomTheme,
    createTask: handleCreateTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
    moveTask: handleMoveTask,
    addChecklistItem: handleAddChecklistItem,
    toggleChecklistItem: handleToggleChecklistItem,
    linkItem: handleLinkItem,
    unlinkItem: handleUnlinkItem,
    refresh,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTaskContext(): TaskContextValue {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTaskContext must be used within TaskProvider');
  return ctx;
}
