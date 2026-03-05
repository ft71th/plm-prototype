// ═══════════════════════════════════════════
// SYSTEM EXPLORER TYPES
// ═══════════════════════════════════════════

export type ExplorerTab = 'explorer' | 'traceability';

/** A node in the hierarchy tree, built from flat PLMNode list + edges */
export interface HierarchyNode {
  id: string;
  name: string;
  nodeType: string;        // itemType: 'system' | 'subsystem' | 'function' | etc.
  description?: string;
  color?: string;
  reqId?: string;
  reqType?: string;
  priority?: string;
  status?: string;
  state?: string;
  version?: string;
  children: HierarchyNode[];
  /** IDs of PLMNodes that are requirements attached to this node */
  requirementIds: string[];
  /** Original PLMNode id */
  originalNodeId: string;
}

export interface ExternalRelation {
  edgeId: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  relationshipType: string;
  label?: string;
}

export interface TraceChain {
  /** The customer/source requirement */
  sourceReq: {
    id: string;
    nodeId: string;
    name: string;
    reqId?: string;
    reqType?: string;
    priority?: string;
    status?: string;
  };
  /** Linked internal requirements */
  linkedReqs: {
    id: string;
    nodeId: string;
    name: string;
    reqId?: string;
    reqType?: string;
    priority?: string;
    status?: string;
    linkType: string;
    linkStatus?: string;
  }[];
  /** Functions/systems that implement */
  implementingNodes: {
    id: string;
    nodeId: string;
    name: string;
    nodeType: string;
  }[];
}
