// ============================================================================
// MyTasksPanel — Cross-project view of all tasks assigned to current user
// ============================================================================

import React, { useMemo } from 'react';
import { Task, PRIORITY_CONFIG } from '../types';
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

export default function MyTasksPanel({
  projectIds,
  currentUser,
  getProjectName,
  onClose,
  onNavigateToTask,
}: MyTasksPanelProps) {
  const allTasks = useMemo(() => {
    const result: TaskWithContext[] = [];

    for (const projectId of projectIds) {
      const boards = store.getBoards(projectId);
      const tasks = store.getTasks(projectId);

      for (const task of tasks) {
        if (task.assignee !== currentUser && task.createdBy !== currentUser) continue;

        const board = boards.find((b) => b.id === task.boardId);
        if (!board) continue;
        const column = board.columns.find((c) => c.id === task.columnId);

        result.push({
          ...task,
          projectName: getProjectName(projectId),
          boardName: board.name,
          columnName: column?.name || 'Unknown',
          columnColor: column?.color || '#6b7280',
        });
      }
    }

    // Sort: overdue first, then by priority, then by date
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    result.sort((a, b) => {
      // Overdue tasks first
      const nowTs = Date.now();
      const aOverdue = a.dueDate && new Date(a.dueDate).getTime() < nowTs;
      const bOverdue = b.dueDate && new Date(b.dueDate).getTime() < nowTs;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then by priority
      const aPri = priorityOrder[a.priority];
      const bPri = priorityOrder[b.priority];
      if (aPri !== bPri) return aPri - bPri;

      // Then by due date (earliest first)
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      return 0;
    });

    return result;
  }, [projectIds, currentUser, getProjectName]);

  // Group by project
  const grouped = useMemo(() => {
    const map = new Map<string, TaskWithContext[]>();
    for (const task of allTasks) {
      const key = task.projectId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return Array.from(map.entries());
  }, [allTasks]);

  return (
    <div className="my-tasks-overlay" onClick={onClose}>
      <div className="my-tasks-panel" onClick={(e) => e.stopPropagation()}>
        <div className="my-tasks-panel__header">
          <h2 className="my-tasks-panel__title">My Tasks</h2>
          <span className="my-tasks-panel__count">{allTasks.length} tasks</span>
          <button className="my-tasks-panel__close" onClick={onClose}>✕</button>
        </div>

        <div className="my-tasks-panel__body">
          {allTasks.length === 0 ? (
            <div className="my-tasks-panel__empty">
              <p>No tasks assigned to you.</p>
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
