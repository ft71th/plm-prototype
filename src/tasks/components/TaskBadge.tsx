// ============================================================================
// TaskBadge — Shows task count on PLM nodes (ReactFlow)
// ============================================================================
//
// Usage in your custom ReactFlow node:
//
//   import TaskBadge from './northlight-tasks/components/TaskBadge';
//
//   function CustomNode({ data }) {
//     return (
//       <div className="plm-node">
//         <span>{data.label}</span>
//         <TaskBadge
//           projectId={projectId}
//           itemId={data.id}
//           onClick={(tasks) => setSelectedNodeTasks(tasks)}
//         />
//       </div>
//     );
//   }

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Task, PRIORITY_CONFIG } from '../types';
import * as store from '../taskStore';

interface TaskBadgeProps {
  projectId: string;
  itemId: string;
  /** Called when badge is clicked, receives the linked tasks */
  onClick?: (tasks: Task[]) => void;
  /** If true, shows a popover with task list on click instead of calling onClick */
  showPopover?: boolean;
}

export default function TaskBadge({
  projectId,
  itemId,
  onClick,
  showPopover = false,
}: TaskBadgeProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const linkedTasks = useMemo(
    () => store.getTasksForItem(projectId, itemId),
    [projectId, itemId]
  );

  useEffect(() => {
    if (!isPopoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isPopoverOpen]);

  if (linkedTasks.length === 0) return null;

  // Determine badge color based on highest priority task
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const highestPriority = linkedTasks.reduce(
    (best, task) =>
      priorityOrder[task.priority] < priorityOrder[best] ? task.priority : best,
    'low' as keyof typeof priorityOrder
  );
  const badgeColor = PRIORITY_CONFIG[highestPriority].color;

  // Check if any tasks are overdue
  const hasOverdue = linkedTasks.some(
    (t) => t.dueDate && new Date(t.dueDate) < new Date()
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showPopover) {
      setIsPopoverOpen(!isPopoverOpen);
    } else if (onClick) {
      onClick(linkedTasks);
    }
  };

  return (
    <div className="task-badge-wrapper" style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        className="task-badge"
        onClick={handleClick}
        title={`${linkedTasks.length} linked task${linkedTasks.length !== 1 ? 's' : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          padding: '2px 6px',
          background: hasOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.12)',
          border: `1px solid ${hasOverdue ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.25)'}`,
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 10,
          fontWeight: 600,
          color: hasOverdue ? '#ef4444' : badgeColor,
          lineHeight: 1,
          transition: 'all 150ms ease',
        }}
      >
        <span style={{ fontSize: 9 }}>☑</span>
        <span>{linkedTasks.length}</span>
      </button>

      {/* Popover */}
      {showPopover && isPopoverOpen && (
        <div
          ref={popoverRef}
          className="task-badge-popover"
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: 6,
            width: 260,
            background: '#22262e',
            border: '1px solid #383e4a',
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 500,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid #383e4a',
              fontSize: 11,
              fontWeight: 600,
              color: '#9ca3b0',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Linked Tasks ({linkedTasks.length})
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {linkedTasks.map((task) => {
              const p = PRIORITY_CONFIG[task.priority];
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
              return (
                <div
                  key={task.id}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #2e3440',
                    cursor: 'pointer',
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#2a2f38';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick?.([task]);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ color: p.color, fontSize: 10 }}>{p.icon}</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#e4e8ef',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {task.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, fontSize: 10, color: '#6b7280' }}>
                    {task.assignee && <span>👤 {task.assignee}</span>}
                    {task.dueDate && (
                      <span style={{ color: isOverdue ? '#ef4444' : '#6b7280' }}>
                        📅 {task.dueDate}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
