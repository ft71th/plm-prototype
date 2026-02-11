// ============================================================================
// KanbanColumn — Single column in the Kanban board
// ============================================================================

import React, { useState, useRef, useCallback } from 'react';
import { TaskColumn, Task } from '../types';
import { useTaskContext } from '../TaskContext';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
  column: TaskColumn;
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onColumnMenu: (column: TaskColumn, anchor: HTMLElement) => void;
  dragState: {
    draggedTaskId: string | null;
    overColumnId: string | null;
    setDraggedTaskId: (id: string | null) => void;
    setOverColumnId: (id: string | null) => void;
    handleDrop: (targetColumnId: string) => void;
  };
}

export default function KanbanColumn({
  column,
  tasks,
  onOpenTask,
  onColumnMenu,
  dragState,
}: KanbanColumnProps) {
  const { createTask, currentUser } = useTaskContext();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);
  const isOver = dragState.overColumnId === column.id;

  const handleAddTask = useCallback(() => {
    if (newTaskTitle.trim()) {
      createTask(column.id, newTaskTitle.trim());
      setNewTaskTitle('');
    }
    setIsAddingTask(false);
  }, [newTaskTitle, column.id, createTask]);

  const handleStartAdd = () => {
    setIsAddingTask(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div
      className={`kanban-column ${isOver ? 'kanban-column--dragover' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        dragState.setOverColumnId(column.id);
      }}
      onDragLeave={() => {
        if (dragState.overColumnId === column.id) {
          dragState.setOverColumnId(null);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragState.handleDrop(column.id);
      }}
    >
      {/* Column header */}
      <div className="kanban-column__header">
        <div className="kanban-column__header-left">
          <span
            className="kanban-column__dot"
            style={{ backgroundColor: column.color }}
          />
          <span className="kanban-column__name">{column.name}</span>
          <span className="kanban-column__count">{tasks.length}</span>
          {column.wipLimit && tasks.length > column.wipLimit && (
            <span className="kanban-column__wip-warn" title={`WIP limit: ${column.wipLimit}`}>
              ⚠
            </span>
          )}
        </div>
        <button
          className="kanban-column__menu-btn"
          onClick={(e) => onColumnMenu(column, e.currentTarget)}
          title="Column options"
        >
          ⋯
        </button>
      </div>

      {/* Task list */}
      <div className="kanban-column__tasks">
        {sortedTasks.map((task) => (
          <div
            key={task.id}
            draggable
            onDragStart={() => dragState.setDraggedTaskId(task.id)}
            onDragEnd={() => {
              dragState.setDraggedTaskId(null);
              dragState.setOverColumnId(null);
            }}
            className={`kanban-column__task-wrapper ${
              dragState.draggedTaskId === task.id ? 'kanban-column__task-wrapper--dragging' : ''
            }`}
          >
            <TaskCard
              task={task}
              isDragging={dragState.draggedTaskId === task.id}
              onOpen={onOpenTask}
            />
          </div>
        ))}

        {/* Drop zone indicator */}
        {isOver && dragState.draggedTaskId && (
          <div className="kanban-column__drop-indicator" />
        )}
      </div>

      {/* Add task */}
      {isAddingTask ? (
        <div className="kanban-column__add-form">
          <input
            ref={inputRef}
            className="kanban-column__add-input"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTask();
              if (e.key === 'Escape') {
                setIsAddingTask(false);
                setNewTaskTitle('');
              }
            }}
            onBlur={handleAddTask}
            placeholder="Task title..."
          />
        </div>
      ) : (
        <button className="kanban-column__add-btn" onClick={handleStartAdd}>
          + Add task
        </button>
      )}
    </div>
  );
}
