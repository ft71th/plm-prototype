// ============================================================================
// KanbanBoard — Main board view with theme + category filtering
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { Task, TaskColumn as TaskColumnType } from '../types';
import { useTaskContext } from '../TaskContext';
import KanbanColumn from './KanbanColumn';
import ColumnMenu from './ColumnMenu';
import TaskDetailDialog from './TaskDetailDialog';
import BoardHeader from './BoardHeader';
import MyTasksPanel from './MyTasksPanel';
import CategoryFilterBar from './CategoryFilterBar';

interface KanbanBoardProps {
  allProjectIds?: string[];
  getProjectName?: (id: string) => string;
}

export default function KanbanBoard({
  allProjectIds,
  getProjectName = (id) => id,
}: KanbanBoardProps) {
  const { activeBoard, tasks, moveTask, currentUser, projectId, theme } = useTaskContext();

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [menuColumn, setMenuColumn] = useState<TaskColumnType | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [showMyTasks, setShowMyTasks] = useState(false);

  const tasksByColumn = useMemo(() => {
    const map = new Map<string, Task[]>();
    if (activeBoard) {
      for (const col of activeBoard.columns) map.set(col.id, []);
    }
    for (const task of tasks) {
      const arr = map.get(task.columnId);
      if (arr) arr.push(task);
    }
    return map;
  }, [tasks, activeBoard]);

  const handleDrop = useCallback(
    (targetColumnId: string) => {
      if (draggedTaskId && targetColumnId) {
        const targetTasks = tasksByColumn.get(targetColumnId) || [];
        const maxOrder = targetTasks.length > 0
          ? Math.max(...targetTasks.map((t) => t.order)) + 1 : 0;
        moveTask(draggedTaskId, targetColumnId, maxOrder);
      }
      setDraggedTaskId(null);
      setOverColumnId(null);
    },
    [draggedTaskId, moveTask, tasksByColumn]
  );

  const dragState = { draggedTaskId, overColumnId, setDraggedTaskId, setOverColumnId, handleDrop };

  // Apply theme as CSS custom properties so the CSS file picks them up
  const themeVars: Record<string, string> = {
    '--tm-bg-primary': theme.bgPrimary,
    '--tm-bg-secondary': theme.bgSecondary,
    '--tm-bg-tertiary': theme.bgTertiary,
    '--tm-bg-hover': theme.bgHover,
    '--tm-bg-card': theme.bgCard,
    '--tm-bg-card-hover': theme.bgCardHover,
    '--tm-border': theme.border,
    '--tm-border-light': theme.borderLight,
    '--tm-text-primary': theme.textPrimary,
    '--tm-text-secondary': theme.textSecondary,
    '--tm-text-muted': theme.textMuted,
    '--tm-accent': theme.accent,
  };

  if (!activeBoard) {
    return (
      <div className="kanban-board kanban-board--empty" style={themeVars as any}>
        <BoardHeader onShowMyTasks={() => setShowMyTasks(true)} />
        <div className="kanban-board__empty-state">
          <div className="kanban-board__empty-icon">▦</div>
          <h3>No board selected</h3>
          <p>Create a new board to get started.</p>
        </div>
        {showMyTasks && (
          <MyTasksPanel projectIds={allProjectIds || [projectId]}
            currentUser={currentUser} getProjectName={getProjectName}
            onClose={() => setShowMyTasks(false)} />
        )}
      </div>
    );
  }

  const sortedColumns = [...activeBoard.columns].sort((a, b) => a.order - b.order);

  return (
    <div className="kanban-board" style={themeVars as any}>
      <BoardHeader onShowMyTasks={() => setShowMyTasks(true)} />
      <CategoryFilterBar />

      <div className="kanban-board__columns">
        {sortedColumns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByColumn.get(column.id) || []}
            onOpenTask={setSelectedTask}
            onColumnMenu={(col, anchor) => { setMenuColumn(col); setMenuAnchor(anchor); }}
            dragState={dragState}
          />
        ))}
      </div>

      {menuColumn && (
        <ColumnMenu column={menuColumn} anchor={menuAnchor}
          onClose={() => { setMenuColumn(null); setMenuAnchor(null); }} />
      )}

      <TaskDetailDialog task={selectedTask} onClose={() => setSelectedTask(null)} />

      {showMyTasks && (
        <MyTasksPanel projectIds={allProjectIds || [projectId]}
          currentUser={currentUser} getProjectName={getProjectName}
          onClose={() => setShowMyTasks(false)} />
      )}
    </div>
  );
}
