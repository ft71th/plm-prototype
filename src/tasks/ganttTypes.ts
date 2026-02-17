// ============================================================================
// Northlight Gantt — Type Definitions
// ============================================================================

export interface GanttActivity {
  id: string;
  name: string;
  categoryId: string;       // maps to GanttCategory.id
  startWeek: number;        // weeks from project start
  durWeeks: number;         // 0 = milestone
  milestone: boolean;
  linkedTaskId?: string;    // links to Task.id in taskStore (for dedup & sync)
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  description?: string;
}

export interface GanttCategory {
  id: string;
  name: string;
  color: string;
}

export interface GanttData {
  _northlight: true;
  version: '1.0';
  projectId: string;
  projectStart: string;       // ISO date string
  categories: GanttCategory[];
  activities: GanttActivity[];
  updatedAt: string;
}

// Storage key pattern
export const GANTT_STORAGE_KEY = (projectId: string) =>
  `northlight-gantt-${projectId}`;
