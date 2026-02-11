// ============================================================================
// Northlight Task Management — Type Definitions
// ============================================================================

export interface TaskBoard {
  id: string;
  projectId: string;
  name: string;
  columns: TaskColumn[];
  labels: TaskLabel[];
  categories: TaskCategory[];
  themeKey: string; // ThemeKey or custom theme key
  createdAt: string;
  updatedAt: string;
}

export interface TaskColumn {
  id: string;
  name: string;
  order: number;
  color: string;
  wipLimit?: number;
  isComplete?: boolean; // marks "done" columns for tracking
}

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  boardId: string;
  projectId: string;
  columnId: string;
  order: number;

  // Content
  title: string;
  description?: string;
  checklist?: ChecklistItem[];

  // PLM links
  linkedItems: LinkedItem[];

  // Assignment & metadata
  assignee?: string;
  createdBy: string;
  priority: Priority;
  dueDate?: string;
  labels: string[]; // label IDs
  categoryId?: string; // category ID

  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface LinkedItem {
  itemId: string;
  itemType: 'requirement' | 'system' | 'hardware' | 'issue';
  projectId: string;
  title: string;
}

export type Priority = 'low' | 'medium' | 'high' | 'critical';

// Cross-project task reference (lightweight index)
export interface TaskRef {
  taskId: string;
  projectId: string;
  projectName: string;
  boardId: string;
  boardName: string;
  title: string;
  columnName: string;
  assignee?: string;
  priority: Priority;
  dueDate?: string;
}

// Default board template
export const DEFAULT_COLUMNS: Omit<TaskColumn, 'id'>[] = [
  { name: 'Backlog', order: 0, color: '#6b7280' },
  { name: 'To Do', order: 1, color: '#3b82f6' },
  { name: 'In Progress', order: 2, color: '#f59e0b' },
  { name: 'Review', order: 3, color: '#8b5cf6' },
  { name: 'Done', order: 4, color: '#10b981', isComplete: true },
];

export const DEFAULT_LABELS: Omit<TaskLabel, 'id'>[] = [
  { name: 'Bug', color: '#ef4444' },
  { name: 'Feature', color: '#3b82f6' },
  { name: 'Documentation', color: '#6366f1' },
  { name: 'Design', color: '#ec4899' },
  { name: 'Electrical', color: '#f59e0b' },
  { name: 'Software', color: '#10b981' },
];

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: string }> = {
  low: { label: 'Low', color: '#6b7280', icon: '▽' },
  medium: { label: 'Medium', color: '#3b82f6', icon: '▷' },
  high: { label: 'High', color: '#f59e0b', icon: '△' },
  critical: { label: 'Critical', color: '#ef4444', icon: '⬆' },
};

// ─── Categories ──────────────────────────────────────────────────────────────

export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export const DEFAULT_CATEGORIES: Omit<TaskCategory, 'id'>[] = [
  { name: 'Power Management', color: '#f59e0b', icon: '⚡' },
  { name: 'Communication', color: '#3b82f6', icon: '📡' },
  { name: 'Safety Systems', color: '#ef4444', icon: '🛡️' },
  { name: 'HMI / SCADA', color: '#8b5cf6', icon: '🖥️' },
  { name: 'I/O & Hardware', color: '#06b6d4', icon: '🔧' },
  { name: 'Testing & QA', color: '#10b981', icon: '✓' },
  { name: 'Documentation', color: '#6366f1', icon: '📄' },
];

// ─── Themes ──────────────────────────────────────────────────────────────────

export type ThemeKey = 'dark' | 'midnight' | 'nord' | 'forest' | 'warm' | 'light';

export interface BoardTheme {
  name: string;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgHover: string;
  bgCard: string;
  bgCardHover: string;
  border: string;
  borderLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
}

export const THEMES: Record<ThemeKey, BoardTheme> = {
  dark: {
    name: 'Dark',
    bgPrimary: '#1a1d23', bgSecondary: '#22262e', bgTertiary: '#2a2f38',
    bgHover: '#323842', bgCard: '#282c34', bgCardHover: '#2e3440',
    border: '#383e4a', borderLight: '#2e3440',
    textPrimary: '#e4e8ef', textSecondary: '#9ca3b0', textMuted: '#6b7280',
    accent: '#3b82f6',
  },
  midnight: {
    name: 'Midnight',
    bgPrimary: '#0f172a', bgSecondary: '#1e293b', bgTertiary: '#273548',
    bgHover: '#334155', bgCard: '#1e293b', bgCardHover: '#273548',
    border: '#334155', borderLight: '#1e293b',
    textPrimary: '#e2e8f0', textSecondary: '#94a3b8', textMuted: '#64748b',
    accent: '#3b82f6',
  },
  nord: {
    name: 'Nord',
    bgPrimary: '#2e3440', bgSecondary: '#3b4252', bgTertiary: '#434c5e',
    bgHover: '#4c566a', bgCard: '#3b4252', bgCardHover: '#434c5e',
    border: '#4c566a', borderLight: '#3b4252',
    textPrimary: '#eceff4', textSecondary: '#d8dee9', textMuted: '#81a1c1',
    accent: '#88c0d0',
  },
  forest: {
    name: 'Forest',
    bgPrimary: '#0f1a14', bgSecondary: '#1a2e22', bgTertiary: '#243a2c',
    bgHover: '#2e4a38', bgCard: '#1a2e22', bgCardHover: '#243a2c',
    border: '#2e4a38', borderLight: '#1a2e22',
    textPrimary: '#d1e7dd', textSecondary: '#8fb5a0', textMuted: '#5e8a72',
    accent: '#22c55e',
  },
  warm: {
    name: 'Warm',
    bgPrimary: '#1c1917', bgSecondary: '#292524', bgTertiary: '#352f2b',
    bgHover: '#44403c', bgCard: '#292524', bgCardHover: '#352f2b',
    border: '#44403c', borderLight: '#292524',
    textPrimary: '#fafaf9', textSecondary: '#a8a29e', textMuted: '#78716c',
    accent: '#f97316',
  },
  light: {
    name: 'Light',
    bgPrimary: '#f8fafc', bgSecondary: '#ffffff', bgTertiary: '#f1f5f9',
    bgHover: '#e2e8f0', bgCard: '#ffffff', bgCardHover: '#f8fafc',
    border: '#e2e8f0', borderLight: '#f1f5f9',
    textPrimary: '#1e293b', textSecondary: '#475569', textMuted: '#94a3b8',
    accent: '#3b82f6',
  },
};
