// ═══════════════════════════════════════════════════════════════
// Northlight Mind Map — Type Definitions
// ═══════════════════════════════════════════════════════════════

export type MindMapLayout = 'horizontal' | 'vertical';

export type CommentType = 'issue' | 'question' | 'action' | 'info';
export type CommentStatus = 'open' | 'in-progress' | 'closed';

export interface MindMapComment {
  id: string;
  text: string;
  author?: string;
  type: CommentType;
  status: CommentStatus;
  createdAt: string;
}

/** Core node data (stored/imported) */
export interface MindMapNodeData {
  id: string;
  label: string;
  sublabel?: string;
  color?: string;
  reqId?: string;
  linkedRequirementId?: string;
  comments?: MindMapComment[];
  children?: MindMapNodeData[];
}

/** Computed layout node (after layout pass) */
export interface MindMapNodeLayout {
  id: string;
  label: string;
  sublabel?: string;
  color: string;
  reqId?: string;
  linkedRequirementId?: string;
  comments?: MindMapComment[];
  x: number;
  y: number;
  depth: number;
  childIds: string[];
  hasChildren: boolean;
  descendantCount: number;
}

export interface MindMapEdge {
  fromId: string;
  toId: string;
  color: string;
}

export interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;
}

export interface MindMapDocument {
  id: string;
  name: string;
  projectId: string;
  rootNode: MindMapNodeData;
  layout: MindMapLayout;
  viewport: ViewportState;
  createdAt: string;
  updatedAt: string;
}

export interface ContextMenuAction {
  label: string;
  icon: string;
  action: () => void;
  divider?: boolean;
  danger?: boolean;
}
