// ============================================================================
// Northlight Task Management — Integration Guide
// ============================================================================
//
// INSTALLATION
// ============
// 1. Copy the entire `northlight-tasks/` folder into your `src/` directory
// 2. Import the CSS in your main entry point:
//
//    import './northlight-tasks/taskManagement.css';
//
// 3. No additional npm packages needed! Uses HTML5 drag & drop.
//
// BASIC USAGE
// ===========
// Wrap your task management page/panel with the TaskProvider:

import React from 'react';
import { TaskProvider, KanbanBoard } from './northlight-tasks';
import './northlight-tasks/taskManagement.css';

// Main task management page
export function TaskManagementPage() {
  // These should come from your app's project/auth context
  const currentProjectId = 'project-123';
  const currentUser = 'fredrik';
  const allProjectIds = ['project-123', 'project-456', 'project-789'];

  return (
    <TaskProvider projectId={currentProjectId} currentUser={currentUser}>
      <div style={{ height: '100vh' }}>
        <KanbanBoard
          allProjectIds={allProjectIds}
          getProjectName={(id) => {
            // Replace with your actual project name lookup
            const names: Record<string, string> = {
              'project-123': 'MIAS/PMS Main',
              'project-456': 'Generator Control',
              'project-789': 'Bus Tie Breaker',
            };
            return names[id] || id;
          }}
        />
      </div>
    </TaskProvider>
  );
}

// ============================================================================
// PLM INTEGRATION — Linking tasks to PLM items
// ============================================================================
//
// From your PLM node context menu or sidebar, you can create/link tasks:

import { taskStore, LinkedItem } from './northlight-tasks';

// Create a task linked to a PLM item (from context menu)
function handleCreateTaskFromNode(
  projectId: string,
  boardId: string,
  columnId: string,
  node: { id: string; type: string; label: string }
) {
  const linkedItem: LinkedItem = {
    itemId: node.id,
    itemType: node.type as any, // 'requirement' | 'system' | 'hardware' | 'issue'
    projectId: projectId,
    title: node.label,
  };

  const task = taskStore.createTask(
    projectId,
    boardId,
    columnId,
    `Task for: ${node.label}`,
    'fredrik', // current user
    { linkedItems: [linkedItem] }
  );

  return task;
}

// Get tasks linked to a specific PLM item (for badge count / sidebar)
function getTaskCountForNode(projectId: string, nodeId: string): number {
  return taskStore.getTasksForItem(projectId, nodeId).length;
}

// Link an existing task to a PLM item
function linkExistingTask(
  projectId: string,
  taskId: string,
  node: { id: string; type: string; label: string }
) {
  taskStore.linkItemToTask(projectId, taskId, {
    itemId: node.id,
    itemType: node.type as any,
    projectId,
    title: node.label,
  });
}

// ============================================================================
// ROUTING INTEGRATION
// ============================================================================
//
// If you're using React Router, add a route for the task board:
//
// <Route path="/project/:projectId/tasks" element={<TaskManagementPage />} />
//
// Or embed it in your existing layout:
//
// <div className="northlight-layout">
//   <Sidebar />
//   <main>
//     {activeView === 'tasks' && (
//       <TaskProvider projectId={projectId} currentUser={user}>
//         <KanbanBoard />
//       </TaskProvider>
//     )}
//   </main>
// </div>

// ============================================================================
// ADDING TASK BADGE TO PLM NODES (Step 7)
// ============================================================================
//
// In your ReactFlow custom node component:

import { TaskBadge } from './northlight-tasks';

function CustomPLMNode({ data }: { data: any }) {
  return (
    <div className="plm-node">
      <span>{data.label}</span>
      <TaskBadge
        projectId="project-123"
        itemId={data.id}
        showPopover={true}       // Click badge → shows task list popover
        onClick={(tasks) => {
          console.log('Tasks for node:', tasks);
        }}
      />
    </div>
  );
}

// ============================================================================
// CONTEXT MENU INTEGRATION (Step 7)
// ============================================================================
//
// Add "Create task" / "View tasks" to your node right-click menu:

import { getTaskMenuItems, handleTaskMenuAction } from './northlight-tasks';

function buildContextMenu(projectId2: string, node2: any) {
  const existingItems = [
    { id: 'edit', label: 'Edit', action: 'edit' },
    { id: 'delete', label: 'Delete', action: 'delete' },
  ];

  // getTaskMenuItems returns ready-to-use menu entries
  const taskItems = getTaskMenuItems(projectId2, node2.id);

  return [...existingItems, { id: 'sep', label: '---', action: '' }, ...taskItems];
}

function onContextMenuAction(action2: string, node2: any) {
  if (action2.startsWith('task-')) {
    handleTaskMenuAction(action2, {
      projectId: 'project-123',
      nodeId: node2.id,
      nodeType: node2.data.itemType,
      nodeLabel: node2.data.label,
      currentUser: 'fredrik',
      onTaskCreated: (task2) => {
        console.log('Task created:', task2);
        // Refresh node to show badge
      },
      onOpenBoard: () => {
        // Navigate to task board view
      },
      onShowTasks: (tasks2) => {
        // Open task detail dialog or sidebar
      },
    });
    return;
  }
  // handle other actions...
}

// ============================================================================
// SIDEBAR TASKS TAB (Step 7)
// ============================================================================
//
// Add a "Tasks" tab to your existing node sidebar:

import { NodeTasksSidebar } from './northlight-tasks';

function PLMSidebar({ selectedNode: sn, projectId: pid }: any) {
  const [activeTab, setActiveTab] = useState('properties');

  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        <button onClick={() => setActiveTab('properties')}>Properties</button>
        <button onClick={() => setActiveTab('tasks')}>Tasks</button>
      </div>
      {activeTab === 'tasks' && sn && (
        <NodeTasksSidebar
          projectId={pid}
          node={{
            id: sn.id,
            type: sn.data.itemType, // 'requirement' | 'system' | 'hardware' | 'issue'
            label: sn.data.label,
          }}
          currentUser="fredrik"
          onOpenTask={(task3) => {
            // Open TaskDetailDialog
            console.log('Open task:', task3);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// BOARD DEFAULT TEMPLATES
// ============================================================================
//
// You can create boards with custom column templates:

import { DEFAULT_COLUMNS } from './northlight-tasks';

// Software development board
const softwareColumns = [
  { name: 'Backlog', order: 0, color: '#6b7280' },
  { name: 'Specification', order: 1, color: '#8b5cf6' },
  { name: 'Development', order: 2, color: '#3b82f6' },
  { name: 'Testing', order: 3, color: '#f59e0b' },
  { name: 'Code Review', order: 4, color: '#ec4899' },
  { name: 'Done', order: 5, color: '#10b981', isComplete: true },
];

// Electrical design board
const electricalColumns = [
  { name: 'Requirements', order: 0, color: '#6b7280' },
  { name: 'Design', order: 1, color: '#3b82f6' },
  { name: 'Verification', order: 2, color: '#f59e0b' },
  { name: 'Approved', order: 3, color: '#10b981', isComplete: true },
];

// Create board with template:
// taskStore.createBoard('project-123', 'Electrical Design', electricalColumns);

export {};
