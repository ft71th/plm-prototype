// ============================================================================
// PLM Context Menu Integration — Helper for node right-click → task actions
// ============================================================================
//
// This provides the menu items and handlers for integrating task management
// into your existing PLM node context menu.
//
// USAGE:
//
// 1. Import the helpers:
//    import { getTaskMenuItems, handleTaskMenuAction } from './northlight-tasks/components/contextMenuIntegration';
//
// 2. In your context menu builder, add task-related items:
//
//    const menuItems = [
//      ...yourExistingItems,
//      { type: 'separator' },
//      ...getTaskMenuItems(projectId, node.id),
//    ];
//
// 3. Handle the action:
//
//    function onMenuItemClick(action, nodeData) {
//      if (action.startsWith('task-')) {
//        handleTaskMenuAction(action, {
//          projectId,
//          nodeId: nodeData.id,
//          nodeType: nodeData.itemType,
//          nodeLabel: nodeData.label,
//          currentUser: user,
//          onTaskCreated: (task) => { /* refresh UI */ },
//          onOpenBoard: () => { /* navigate to board */ },
//          onShowTasks: (tasks) => { /* open task list */ },
//        });
//        return;
//      }
//      // ... handle other actions
//    }

import { Task, LinkedItem } from '../types';
import * as store from '../taskStore';

// ---------------------------------------------------------------------------
// Menu item types
// ---------------------------------------------------------------------------

export interface TaskMenuItem {
  id: string;
  label: string;
  icon?: string;
  action: string;
  disabled?: boolean;
  submenu?: TaskMenuItem[];
}

// ---------------------------------------------------------------------------
// Get context menu items for a PLM node
// ---------------------------------------------------------------------------

export function getTaskMenuItems(
  projectId: string,
  nodeId: string
): TaskMenuItem[] {
  const linkedTasks = store.getTasksForItem(projectId, nodeId);
  const boards = store.getBoards(projectId);

  const items: TaskMenuItem[] = [];

  // "Create task" submenu — one entry per board
  if (boards.length > 0) {
    if (boards.length === 1) {
      items.push({
        id: 'task-create',
        label: '☑ Create task',
        action: `task-create:${boards[0].id}`,
      });
    } else {
      items.push({
        id: 'task-create',
        label: '☑ Create task',
        action: 'task-create',
        submenu: boards.map((b) => ({
          id: `task-create-${b.id}`,
          label: `On "${b.name}"`,
          action: `task-create:${b.id}`,
        })),
      });
    }
  }

  // "View tasks" (if any linked)
  if (linkedTasks.length > 0) {
    items.push({
      id: 'task-view',
      label: `☑ View tasks (${linkedTasks.length})`,
      action: 'task-view',
    });
  }

  // "Open task board"
  if (boards.length > 0) {
    items.push({
      id: 'task-board',
      label: '▦ Open task board',
      action: 'task-open-board',
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Handle menu action
// ---------------------------------------------------------------------------

interface TaskMenuActionContext {
  projectId: string;
  nodeId: string;
  nodeType: 'requirement' | 'system' | 'hardware' | 'issue';
  nodeLabel: string;
  currentUser: string;
  onTaskCreated?: (task: Task) => void;
  onOpenBoard?: () => void;
  onShowTasks?: (tasks: Task[]) => void;
}

export function handleTaskMenuAction(
  action: string,
  ctx: TaskMenuActionContext
): void {
  const { projectId, nodeId, nodeType, nodeLabel, currentUser } = ctx;

  if (action.startsWith('task-create:')) {
    const boardId = action.split(':')[1];
    const board = store.getBoards(projectId).find((b) => b.id === boardId);
    if (!board || board.columns.length === 0) return;

    // Create on first non-complete column (or first column)
    const targetColumn =
      board.columns.find((c) => !c.isComplete) ||
      board.columns.sort((a, b) => a.order - b.order)[0];

    const linkedItem: LinkedItem = {
      itemId: nodeId,
      itemType: nodeType,
      projectId,
      title: nodeLabel,
    };

    const task = store.createTask(
      projectId,
      boardId,
      targetColumn.id,
      `Task: ${nodeLabel}`,
      currentUser,
      { linkedItems: [linkedItem] }
    );

    ctx.onTaskCreated?.(task);
  }

  if (action === 'task-view') {
    const tasks = store.getTasksForItem(projectId, nodeId);
    ctx.onShowTasks?.(tasks);
  }

  if (action === 'task-open-board') {
    ctx.onOpenBoard?.();
  }
}

// ---------------------------------------------------------------------------
// Quick-create: One-liner to create a linked task
// ---------------------------------------------------------------------------

export function quickCreateLinkedTask(
  projectId: string,
  nodeId: string,
  nodeType: 'requirement' | 'system' | 'hardware' | 'issue',
  nodeLabel: string,
  title: string,
  currentUser: string,
  boardId?: string
): Task | null {
  const boards = store.getBoards(projectId);
  const targetBoard = boardId
    ? boards.find((b) => b.id === boardId)
    : boards[0];

  if (!targetBoard || targetBoard.columns.length === 0) return null;

  const targetColumn =
    targetBoard.columns.find((c) => !c.isComplete) ||
    targetBoard.columns.sort((a, b) => a.order - b.order)[0];

  return store.createTask(
    projectId,
    targetBoard.id,
    targetColumn.id,
    title,
    currentUser,
    {
      linkedItems: [
        {
          itemId: nodeId,
          itemType: nodeType,
          projectId,
          title: nodeLabel,
        },
      ],
    }
  );
}
