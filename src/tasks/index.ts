// ============================================================================
// Northlight Task Management — Public API
// ============================================================================

// Types
export type {
  TaskBoard,
  TaskColumn,
  Task,
  TaskLabel,
  TaskCategory,
  TaskRef,
  Priority,
  ThemeKey,
  BoardTheme,
  LinkedItem,
  ChecklistItem,
} from './types';

export { PRIORITY_CONFIG, DEFAULT_COLUMNS, DEFAULT_LABELS, DEFAULT_CATEGORIES, THEMES } from './types';

// Store (for direct access / PLM integration)
export * as taskStore from './taskStore';

// React components
export { TaskProvider, useTaskContext } from './TaskContext';
export { default as KanbanBoard } from './components/KanbanBoard';
export { default as MyTasksPanel } from './components/MyTasksPanel';
export { default as TaskCard } from './components/TaskCard';
export { default as TaskDetailDialog } from './components/TaskDetailDialog';
export { default as CategoryFilterBar } from './components/CategoryFilterBar';
export { default as ThemePicker } from './components/ThemePicker';

// PLM Integration components (Step 7)
export { default as TaskBadge } from './components/TaskBadge';
export { default as NodeTasksSidebar } from './components/NodeTasksSidebar';
export {
  getTaskMenuItems,
  handleTaskMenuAction,
  quickCreateLinkedTask,
} from './components/contextMenuIntegration';
