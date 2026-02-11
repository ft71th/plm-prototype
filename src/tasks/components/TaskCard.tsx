// ============================================================================
// TaskCard — Individual task card on the Kanban board
// ============================================================================

import React, { useMemo } from 'react';
import { Task, PRIORITY_CONFIG } from '../types';
import { useTaskContext } from '../TaskContext';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  onOpen: (task: Task) => void;
}

export default function TaskCard({ task, isDragging, onOpen }: TaskCardProps) {
  const { activeBoard } = useTaskContext();

  const priorityCfg = PRIORITY_CONFIG[task.priority];

  const checklistProgress = useMemo(() => {
    if (!task.checklist || task.checklist.length === 0) return null;
    const done = task.checklist.filter((i) => i.done).length;
    return { done, total: task.checklist.length };
  }, [task.checklist]);

  const labels = useMemo(() => {
    if (!activeBoard || task.labels.length === 0) return [];
    return task.labels
      .map((id) => activeBoard.labels.find((l) => l.id === id))
      .filter(Boolean);
  }, [task.labels, activeBoard?.labels]);

  const isOverdue = useMemo(() => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date();
  }, [task.dueDate]);

  const category = useMemo(() => {
    if (!activeBoard || !task.categoryId) return null;
    return (activeBoard.categories || []).find((c) => c.id === task.categoryId) || null;
  }, [task.categoryId, activeBoard]);

  return (
    <div
      className={`task-card ${isDragging ? 'task-card--dragging' : ''}`}
      onClick={() => onOpen(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(task)}
    >
      {/* Category + Labels */}
      {(category || labels.length > 0) && (
        <div className="task-card__labels">
          {category && (
            <span
              className="task-card__category"
              style={{
                color: category.color,
                background: category.color + '18',
                border: `1px solid ${category.color}33`,
              }}
            >
              {category.icon} {category.name}
            </span>
          )}
          {labels.map((label: any) => (
            <span
              key={label.id}
              className="task-card__label"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <div className="task-card__title">{task.title}</div>

      {/* Bottom row: metadata */}
      <div className="task-card__meta">
        {/* Priority */}
        <span
          className="task-card__priority"
          style={{ color: priorityCfg.color }}
          title={priorityCfg.label}
        >
          {priorityCfg.icon}
        </span>

        {/* Due date */}
        {task.dueDate && (
          <span className={`task-card__due ${isOverdue ? 'task-card__due--overdue' : ''}`}>
            📅 {new Date(task.dueDate).toLocaleDateString('sv-SE')}
          </span>
        )}

        {/* Checklist progress */}
        {checklistProgress && (
          <span className="task-card__checklist">
            ☑ {checklistProgress.done}/{checklistProgress.total}
          </span>
        )}

        {/* Linked items count */}
        {task.linkedItems.length > 0 && (
          <span className="task-card__links" title={`${task.linkedItems.length} linked items`}>
            🔗 {task.linkedItems.length}
          </span>
        )}

        {/* Assignee */}
        {task.assignee && (
          <span className="task-card__assignee" title={task.assignee}>
            {task.assignee.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}
