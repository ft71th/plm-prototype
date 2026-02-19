// ═══════════════════════════════════════════
// CORE DOMAIN TYPES
// ═══════════════════════════════════════════

export type ItemType =
  | 'system' | 'subsystem' | 'function' | 'requirement'
  | 'testcase' | 'usecase' | 'actor' | 'hardware'
  | 'parameter' | 'textAnnotation' | 'platform';

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type State = 'open' | 'frozen' | 'released';
export type Status = 'new' | 'draft' | 'in-progress' | 'review' | 'approved' | 'done';
export type Classification =
  | 'system' | 'subsystem' | 'function' | 'requirement'
  | 'testcase' | 'usecase' | 'actor' | 'capability';
export type ReqType = 'project' | 'customer' | 'platform' | 'implementation';
export type Origin = 'internal' | 'external' | 'derived';

export interface Port {
  id: string;
  name: string;
  direction: 'input' | 'output';
  type: string;
  width?: number;
}

export interface NodeData {
  label: string;
  type: string;
  itemType?: ItemType;
  reqId?: string;
  version?: string;
  reqType?: ReqType;
  origin?: Origin;
  classification?: Classification;
  description?: string;
  rationale?: string;
  priority?: Priority;
  status?: string;
  state?: State;
  owner?: string;
  attachment?: string | null;
  ports?: Port[];
  // Hardware-specific
  hwIcon?: string;
  hwType?: string;
  // Text annotation
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  textAlign?: string;
  // Parameter-specific
  paramType?: string;
  unit?: string;
  defaultValue?: string;
  minValue?: string;
  maxValue?: string;
  // Test case-specific
  purpose?: string;
  preconditions?: string;
  postconditions?: string;
  testSteps?: string;
  expectedResults?: string;
  mainFlow?: string;
  alternativeFlows?: string;
  actors?: string[];
  actorType?: string;
  responsibilities?: string;
  // Resize
  nodeWidth?: number;
  nodeHeight?: number;
  // Internal
  onChange?: (nodeId: string, field: string, value: unknown) => void;
  onLabelChange?: (nodeId: string, field: string, value: unknown) => void;
  isFloatingConnector?: boolean;
  isGroup?: boolean;
  locked?: boolean;
  isHighlighted?: boolean;
}

export interface PLMNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
  selected?: boolean;
  width?: number;
  height?: number;
  style?: Record<string, unknown>;
  parentNode?: string;
}

export interface EdgeData {
  label?: string;
  signalName?: string;
  portInfo?: {
    sourcePort?: Port;
    targetPort?: Port;
  };
  busWidth?: number;
  relationshipType?: string;
  onLabelChange?: (edgeId: string, label: string) => void;
  onEdgeDoubleClick?: (edgeId: string) => void;
}

export interface PLMEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  data?: EdgeData;
  style?: Record<string, unknown>;
  markerEnd?: unknown;
}

// ═══════════════════════════════════════════
// ISSUE TYPES
// ═══════════════════════════════════════════

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IssueStatus = 'open' | 'investigating' | 'inProgress' | 'resolved' | 'closed';
export type IssueType = 'bug' | 'requirement' | 'design' | 'safety' | 'performance' | 'documentation' | 'question' | 'enhancement';

export interface IssueComment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  type: IssueType;
  createdAt: string;
  updatedAt: string;
  assignee: string;
  dueDate: string;
  comments: IssueComment[];
}

export type IssueMap = Record<string, Issue[]>;

// ═══════════════════════════════════════════
// RELATIONSHIP TYPES
// ═══════════════════════════════════════════

export interface RelationshipDef {
  label: string;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
}

export type RelationshipKey =
  | 'contains' | 'provides' | 'realizedBy' | 'verifies' | 'allocatedTo'
  | 'addresses' | 'implements' | 'satisfies' | 'derives' | 'depends'
  | 'conflicts' | 'related' | 'flowsDown' | 'reuses';

// ═══════════════════════════════════════════
// HARDWARE TYPES
// ═══════════════════════════════════════════

export interface HardwareType {
  id: string;
  name: string;
  icon: string;
}

// ═══════════════════════════════════════════
// WHITEBOARD
// ═══════════════════════════════════════════

export type WhiteboardType = 'plm' | 'whiteboard' | 'freeform';

export interface Whiteboard {
  id: string;
  name: string;
  type: WhiteboardType;
}

// ═══════════════════════════════════════════
// REQUIREMENT LINKS
// ═══════════════════════════════════════════

export interface RequirementLink {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  status?: string;
  pinned?: boolean;
  baseline?: string;
}

// ═══════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════

export interface User {
  id: string;
  name: string;
  email: string;
  token?: string;
}

// ═══════════════════════════════════════════
// PROJECT
// ═══════════════════════════════════════════

export interface Project {
  id: string;
  name: string;
  description?: string;
  version?: string;
}

export interface ProjectData {
  project?: Project;
  id?: string;
  name?: string;
  version?: string;
  description?: string;
  nodes?: PLMNode[];
  edges?: PLMEdge[];
  whiteboards?: Whiteboard[];
  issues?: IssueMap;
  issueIdCounter?: number;
  requirementLinks?: RequirementLink[];
}

// ═══════════════════════════════════════════
// VIEW MODE
// ═══════════════════════════════════════════

export type ViewMode = 'plm' | 'whiteboard' | 'simple' | 'document' | 'tasks' | 'gantt' | 'freeform' | '3d' | 'sequence';

// ═══════════════════════════════════════════
// CLIPBOARD
// ═══════════════════════════════════════════

export interface Clipboard {
  nodes: PLMNode[];
  edges: PLMEdge[];
}

// ═══════════════════════════════════════════
// LIBRARY
// ═══════════════════════════════════════════

export interface LibraryItem {
  id: string;
  name: string;
  type: string;
  data: NodeData;
  version?: string;
  createdAt?: string;
}

// ═══════════════════════════════════════════
// ICON/LABEL DEFS (for issues, etc.)
// ═══════════════════════════════════════════

export interface LabelDef {
  icon: string;
  label: string;
  color: string;
}
