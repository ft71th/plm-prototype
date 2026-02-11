// ============================================================================
// NodeTasksSidebar — Sidebar panel showing tasks for a selected PLM node
// ============================================================================
//
// Usage in your existing sidebar:
//
//   import NodeTasksSidebar from './northlight-tasks/components/NodeTasksSidebar';
//
//   // In your sidebar tabs:
//   {activeTab === 'tasks' && selectedNode && (
//     <NodeTasksSidebar
//       projectId={projectId}
//       node={{ id: selectedNode.id, type: selectedNode.data.itemType, label: selectedNode.data.label }}
//       boardId={activeBoardId}
//       onOpenTask={(task) => setTaskDialogTask(task)}
//     />
//   )}

import React, { useMemo, useState, useCallback } from 'react';
import { Task, PRIORITY_CONFIG } from '../types';
import * as store from '../taskStore';

interface NodeInfo {
  id: string;
  type: 'requirement' | 'system' | 'hardware' | 'issue';
  label: string;
}

interface NodeTasksSidebarProps {
  projectId: string;
  node: NodeInfo;
  /** Board to create new tasks on (first column used) */
  boardId?: string;
  currentUser?: string;
  onOpenTask?: (task: Task) => void;
}

export default function NodeTasksSidebar({
  projectId,
  node,
  boardId,
  currentUser = 'user',
  onOpenTask,
}: NodeTasksSidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const linkedTasks = useMemo(
    () => store.getTasksForItem(projectId, node.id),
    [projectId, node.id]
  );

  const boards = useMemo(() => store.getBoards(projectId), [projectId]);

  const handleCreateTask = useCallback(() => {
    if (!newTitle.trim()) return;

    // Find target board and first column
    const targetBoardId = boardId || boards[0]?.id;
    if (!targetBoardId) return;

    const board = boards.find((b) => b.id === targetBoardId);
    if (!board || board.columns.length === 0) return;

    const firstColumn = board.columns.sort((a, b) => a.order - b.order)[0];

    store.createTask(projectId, targetBoardId, firstColumn.id, newTitle.trim(), currentUser, {
      linkedItems: [
        {
          itemId: node.id,
          itemType: node.type,
          projectId,
          title: node.label,
        },
      ],
    });

    setNewTitle('');
    setIsCreating(false);
  }, [newTitle, projectId, boardId, boards, currentUser, node]);

  const typeColors: Record<string, string> = {
    requirement: '#3b82f6',
    system: '#8b5cf6',
    hardware: '#f59e0b',
    issue: '#ef4444',
  };

  return (
    <div className="node-tasks-sidebar" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <span style={{ ...styles.typeBadge, backgroundColor: typeColors[node.type] || '#6b7280' }}>
            {node.type}
          </span>
          <span style={styles.nodeLabel}>{node.label}</span>
        </div>
        <div style={styles.headerInfo}>
          {linkedTasks.length} task{linkedTasks.length !== 1 ? 's' : ''} linked
        </div>
      </div>

      {/* Task list */}
      <div style={styles.taskList}>
        {linkedTasks.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>☑</div>
            <div>No tasks linked to this item.</div>
          </div>
        ) : (
          linkedTasks.map((task) => {
            const p = PRIORITY_CONFIG[task.priority];
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
            const checkDone = task.checklist?.filter((i) => i.done).length ?? 0;
            const checkTotal = task.checklist?.length ?? 0;

            // Find column name
            const board = boards.find((b) => b.id === task.boardId);
            const column = board?.columns.find((c) => c.id === task.columnId);

            return (
              <div
                key={task.id}
                style={styles.taskItem}
                onClick={() => onOpenTask?.(task)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#2e3440';
                  (e.currentTarget as HTMLElement).style.borderColor = '#383e4a';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#282c34';
                  (e.currentTarget as HTMLElement).style.borderColor = '#2e3440';
                }}
              >
                <div style={styles.taskItemTop}>
                  <span style={{ color: p.color, fontSize: 12, flexShrink: 0 }} title={p.label}>
                    {p.icon}
                  </span>
                  <span style={styles.taskTitle}>{task.title}</span>
                </div>
                <div style={styles.taskMeta}>
                  {column && (
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: column.color,
                      }}
                    >
                      {column.name}
                    </span>
                  )}
                  {task.assignee && <span>👤 {task.assignee}</span>}
                  {task.dueDate && (
                    <span
                      style={{
                        color: isOverdue ? '#ef4444' : '#6b7280',
                        fontWeight: isOverdue ? 600 : 400,
                      }}
                    >
                      📅 {task.dueDate}
                    </span>
                  )}
                  {checkTotal > 0 && (
                    <span>
                      ☑ {checkDone}/{checkTotal}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create task form */}
      <div style={styles.createSection}>
        {isCreating ? (
          <div style={styles.createForm}>
            <input
              style={styles.createInput}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateTask();
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewTitle('');
                }
              }}
              placeholder="Task title..."
              autoFocus
            />
            <div style={styles.createActions}>
              <button style={styles.createBtn} onClick={handleCreateTask} disabled={!newTitle.trim()}>
                Create
              </button>
              <button
                style={styles.cancelBtn}
                onClick={() => {
                  setIsCreating(false);
                  setNewTitle('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button style={styles.addTaskBtn} onClick={() => setIsCreating(true)}>
            + Create task for this item
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#1a1d23',
    color: '#e4e8ef',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    padding: '12px 14px',
    borderBottom: '1px solid #383e4a',
    flexShrink: 0,
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  typeBadge: {
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
    color: 'white',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
    flexShrink: 0,
  },
  nodeLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e4e8ef',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  headerInfo: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  taskList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '8px 10px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '32px 16px',
    color: '#6b7280',
    fontSize: 13,
  },
  taskItem: {
    padding: '10px 12px',
    background: '#282c34',
    border: '1px solid #2e3440',
    borderRadius: 6,
    marginBottom: 6,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  taskItemTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  taskTitle: {
    fontSize: 12,
    fontWeight: 500,
    color: '#e4e8ef',
    lineHeight: '1.3',
    wordBreak: 'break-word' as const,
  },
  taskMeta: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: 6,
    fontSize: 10,
    color: '#6b7280',
  },
  statusBadge: {
    padding: '1px 6px',
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 600,
    color: 'white',
  },
  createSection: {
    padding: '10px 12px',
    borderTop: '1px solid #383e4a',
    flexShrink: 0,
  },
  addTaskBtn: {
    width: '100%',
    padding: '8px',
    background: 'none',
    border: '1px dashed #383e4a',
    borderRadius: 6,
    color: '#6b7280',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 150ms',
  },
  createForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  createInput: {
    width: '100%',
    padding: '8px 10px',
    background: '#22262e',
    border: '1px solid #3b82f6',
    borderRadius: 6,
    color: '#e4e8ef',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  createActions: {
    display: 'flex',
    gap: 6,
  },
  createBtn: {
    padding: '5px 12px',
    background: '#3b82f6',
    border: 'none',
    borderRadius: 4,
    color: 'white',
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '5px 12px',
    background: 'transparent',
    border: '1px solid #383e4a',
    borderRadius: 4,
    color: '#9ca3b0',
    fontSize: 11,
    cursor: 'pointer',
  },
};
