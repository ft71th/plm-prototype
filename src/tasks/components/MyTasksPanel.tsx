// ============================================================================
// MyTasksPanel — Cross-project view of all tasks (with filter for current user)
// ============================================================================

import React, { useMemo, useState } from 'react';
import { Task, PRIORITY_CONFIG, Priority } from '../types';
import * as store from '../taskStore';

interface MyTasksPanelProps {
  projectIds: string[];
  currentUser: string;
  getProjectName: (id: string) => string;
  onClose: () => void;
  onNavigateToTask?: (projectId: string, boardId: string, taskId: string) => void;
}

interface TaskWithContext extends Task {
  projectName: string;
  boardName: string;
  columnName: string;
  columnColor: string;
}

type FilterMode = 'all' | 'mine';
type PriorityFilter = Priority | 'all';

export default function MyTasksPanel({
  projectIds,
  currentUser,
  getProjectName,
  onClose,
  onNavigateToTask,
}: MyTasksPanelProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Discover ALL projects with task data (not just the ones passed in)
  const allProjectIds = useMemo(() => {
    const discovered = store.discoverProjectIds();
    const merged = new Set([...projectIds, ...discovered]);
    return Array.from(merged);
  }, [projectIds]);

  // Collect all tasks from all projects
  const allTasks = useMemo(() => {
    const result: TaskWithContext[] = [];

    for (const projectId of allProjectIds) {
      const boards = store.getBoards(projectId);
      const tasks = store.getTasks(projectId);

      for (const task of tasks) {
        const board = boards.find((b) => b.id === task.boardId);
        if (!board) continue;
        const column = board.columns.find((c) => c.id === task.columnId);

        result.push({
          ...task,
          projectName: getProjectName(projectId),
          boardName: board.name,
          columnName: column?.name || 'Okänd',
          columnColor: column?.color || '#6b7280',
        });
      }
    }

    // Sort: overdue first, then by priority, then by date
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    result.sort((a, b) => {
      const nowTs = Date.now();
      const aOverdue = a.dueDate && new Date(a.dueDate).getTime() < nowTs;
      const bOverdue = b.dueDate && new Date(b.dueDate).getTime() < nowTs;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      const aPri = priorityOrder[a.priority];
      const bPri = priorityOrder[b.priority];
      if (aPri !== bPri) return aPri - bPri;

      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      return 0;
    });

    return result;
  }, [allProjectIds, getProjectName]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    let result = allTasks;

    // User filter
    if (filterMode === 'mine') {
      result = result.filter(
        (t) => t.assignee === currentUser || t.createdBy === currentUser
      );
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          t.projectName.toLowerCase().includes(q) ||
          t.boardName.toLowerCase().includes(q) ||
          t.columnName.toLowerCase().includes(q) ||
          (t.assignee || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [allTasks, filterMode, priorityFilter, searchQuery, currentUser]);

  // Group by project
  const grouped = useMemo(() => {
    const map = new Map<string, TaskWithContext[]>();
    for (const task of filteredTasks) {
      const key = task.projectId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return Array.from(map.entries());
  }, [filteredTasks]);

  // Stats
  const overdueTasks = filteredTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  return (
    <div className="my-tasks-overlay" onClick={onClose}>
      <div className="my-tasks-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="my-tasks-panel__header">
          <h2 className="my-tasks-panel__title">Alla uppgifter</h2>
          <span className="my-tasks-panel__count">
            {filteredTasks.length}
            {filteredTasks.length !== allTasks.length ? ` / ${allTasks.length}` : ''}
            {overdueTasks > 0 && (
              <span style={{ color: 'var(--task-danger, #ef4444)', marginLeft: 6 }}>
                ({overdueTasks} försenad{overdueTasks > 1 ? 'e' : ''})
              </span>
            )}
          </span>
          <button className="my-tasks-panel__close" onClick={onClose}>✕</button>
        </div>

        {/* Filters */}
        <div className="my-tasks-panel__filters">
          {/* Search */}
          <div className="my-tasks-panel__search-row">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök uppgifter..."
              className="my-tasks-panel__search-input"
            />
            {searchQuery && (
              <button
                className="my-tasks-panel__search-clear"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="my-tasks-panel__filter-row">
            {/* User filter */}
            <div className="my-tasks-panel__toggle-group">
              <button
                className={`my-tasks-panel__toggle-btn ${filterMode === 'all' ? 'my-tasks-panel__toggle-btn--active' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                Alla
              </button>
              <button
                className={`my-tasks-panel__toggle-btn ${filterMode === 'mine' ? 'my-tasks-panel__toggle-btn--active' : ''}`}
                onClick={() => setFilterMode('mine')}
              >
                Mina
              </button>
            </div>

            {/* Priority filter */}
            <select
              className="my-tasks-panel__priority-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
            >
              <option value="all">Alla prioriteter</option>
              <option value="critical">⬆ Kritisk</option>
              <option value="high">△ Hög</option>
              <option value="medium">▷ Medium</option>
              <option value="low">▽ Låg</option>
            </select>
          </div>
        </div>

        {/* Task list */}
        <div className="my-tasks-panel__body">
          {filteredTasks.length === 0 ? (
            <div className="my-tasks-panel__empty">
              <p>
                {searchQuery
                  ? `Inga uppgifter matchar "${searchQuery}"`
                  : filterMode === 'mine'
                  ? 'Inga uppgifter tilldelade till dig.'
                  : 'Inga uppgifter hittades.'}
              </p>
            </div>
          ) : (
            grouped.map(([projectId, tasks]) => (
              <div key={projectId} className="my-tasks-panel__group">
                <div className="my-tasks-panel__group-header">
                  <span className="my-tasks-panel__project-name">{tasks[0].projectName}</span>
                  <span className="my-tasks-panel__group-count">{tasks.length}</span>
                </div>
                {tasks.map((task) => {
                  const priorityCfg = PRIORITY_CONFIG[task.priority];
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                  const checkDone = task.checklist?.filter((i) => i.done).length ?? 0;
                  const checkTotal = task.checklist?.length ?? 0;

                  return (
                    <div
                      key={task.id}
                      className="my-tasks-panel__task"
                      onClick={() => onNavigateToTask?.(task.projectId, task.boardId, task.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="my-tasks-panel__task-top">
                        <span style={{ color: priorityCfg.color }} title={priorityCfg.label}>
                          {priorityCfg.icon}
                        </span>
                        <span className="my-tasks-panel__task-title">{task.title}</span>
                      </div>
                      <div className="my-tasks-panel__task-meta">
                        <span
                          className="my-tasks-panel__status-badge"
                          style={{ backgroundColor: task.columnColor }}
                        >
                          {task.columnName}
                        </span>
                        <span className="my-tasks-panel__board-name">{task.boardName}</span>
                        {task.assignee && (
                          <span className="my-tasks-panel__assignee" title={`Tilldelad: ${task.assignee}`}>
                            👤 {task.assignee}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className={`my-tasks-panel__due ${isOverdue ? 'my-tasks-panel__due--overdue' : ''}`}>
                            📅 {task.dueDate}
                          </span>
                        )}
                        {checkTotal > 0 && (
                          <span className="my-tasks-panel__check">
                            ☑ {checkDone}/{checkTotal}
                          </span>
                        )}
                        {task.linkedItems.length > 0 && (
                          <span>🔗 {task.linkedItems.length}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
