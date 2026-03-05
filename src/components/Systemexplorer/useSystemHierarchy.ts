import { useMemo } from 'react';
import type { PLMNode, PLMEdge } from '../../types';
import type { HierarchyNode, ExternalRelation, TraceChain } from './systemExplorerTypes';

// ─── Color mapping ──────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  system: '#3498db',
  subsystem: '#9b59b6',
  function: '#27ae60',
  requirement: '#e67e22',
  testcase: '#e74c3c',
  usecase: '#16a085',
  actor: '#f39c12',
  platform: '#2196f3',
  hardware: '#95a5a6',
  parameter: '#00bcd4',
};

const STRUCTURAL_TYPES = new Set([
  'system', 'subsystem', 'function', 'platform', 'hardware', 'usecase', 'actor',
]);

const TYPE_DEPTH: Record<string, number> = {
  system: 0, platform: 0, subsystem: 1, hardware: 1, function: 2, usecase: 2, actor: 2,
};

const CONTAINMENT_RELATIONS = new Set(['contains', 'provides', 'allocatedTo']);
const REQ_LINK_RELATIONS = new Set([
  'satisfies', 'implements', 'verifies', 'derives',
  'addresses', 'realizedBy', 'allocatedTo', 'flowsDown',
]);

// ─── Deduplicate nodes ──────────────────────────────────────────────────────
function deduplicateNodes(nodes: PLMNode[]): PLMNode[] {
  const seen = new Map<string, PLMNode>();
  for (const n of nodes) {
    if (!seen.has(n.id)) seen.set(n.id, n);
  }
  return Array.from(seen.values());
}

// ─── Build hierarchy ────────────────────────────────────────────────────────
function buildHierarchy(rawNodes: PLMNode[], edges: PLMEdge[]): HierarchyNode[] {
  const nodes = deduplicateNodes(rawNodes);
  const nodeMap = new Map<string, PLMNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const childToParent = new Map<string, string>();
  const parentToChildren = new Map<string, Set<string>>();

  function addChild(parentId: string, childId: string) {
    if (parentId === childId) return;
    if (childToParent.has(childId)) return;
    if (!nodeMap.has(parentId) || !nodeMap.has(childId)) return;
    childToParent.set(childId, parentId);
    if (!parentToChildren.has(parentId)) parentToChildren.set(parentId, new Set());
    parentToChildren.get(parentId)!.add(childId);
  }

  // Strategy 1: Explicit containment edges
  for (const edge of edges) {
    const relType = edge.data?.relationshipType || '';
    if (!CONTAINMENT_RELATIONS.has(relType)) continue;
    const sn = nodeMap.get(edge.source);
    const tn = nodeMap.get(edge.target);
    if (!sn || !tn) continue;
    const sd = TYPE_DEPTH[sn.data?.itemType || ''] ?? 99;
    const td = TYPE_DEPTH[tn.data?.itemType || ''] ?? 99;
    if (sd < td) addChild(edge.source, edge.target);
    else if (td < sd) addChild(edge.target, edge.source);
    else addChild(edge.source, edge.target);
  }

  // Strategy 2: Infer from any edge between structural types at different depths
  for (const edge of edges) {
    const relType = edge.data?.relationshipType || '';
    if (CONTAINMENT_RELATIONS.has(relType)) continue;
    if (REQ_LINK_RELATIONS.has(relType)) continue;
    const sn = nodeMap.get(edge.source);
    const tn = nodeMap.get(edge.target);
    if (!sn || !tn) continue;
    const st = sn.data?.itemType || '';
    const tt = tn.data?.itemType || '';
    if (!STRUCTURAL_TYPES.has(st) || !STRUCTURAL_TYPES.has(tt)) continue;
    const sd = TYPE_DEPTH[st] ?? 99;
    const td = TYPE_DEPTH[tt] ?? 99;
    if (sd !== td) {
      if (sd < td) addChild(edge.source, edge.target);
      else addChild(edge.target, edge.source);
    }
  }

  // Strategy 3: parentNode field
  for (const node of nodes) {
    if (node.parentNode && nodeMap.has(node.parentNode)) {
      addChild(node.parentNode, node.id);
    }
  }

  // Build requirement attachments
  const nodeReqs = new Map<string, Set<string>>();
  for (const edge of edges) {
    const sn = nodeMap.get(edge.source);
    const tn = nodeMap.get(edge.target);
    if (!sn || !tn) continue;
    const sIsReq = sn.data?.itemType === 'requirement';
    const tIsReq = tn.data?.itemType === 'requirement';
    const sIsStruct = STRUCTURAL_TYPES.has(sn.data?.itemType || '');
    const tIsStruct = STRUCTURAL_TYPES.has(tn.data?.itemType || '');
    if (sIsReq && tIsStruct) {
      if (!nodeReqs.has(edge.target)) nodeReqs.set(edge.target, new Set());
      nodeReqs.get(edge.target)!.add(edge.source);
    } else if (tIsReq && sIsStruct) {
      if (!nodeReqs.has(edge.source)) nodeReqs.set(edge.source, new Set());
      nodeReqs.get(edge.source)!.add(edge.target);
    }
  }

  // Build tree
  function buildNode(nodeId: string): HierarchyNode | null {
    const plmNode = nodeMap.get(nodeId);
    if (!plmNode) return null;
    const d = plmNode.data;
    const itemType = d?.itemType || d?.type || 'unknown';
    if (!STRUCTURAL_TYPES.has(itemType)) return null;

    const childIds = parentToChildren.get(nodeId);
    const children: HierarchyNode[] = [];
    if (childIds) {
      for (const cid of childIds) {
        const child = buildNode(cid);
        if (child) children.push(child);
      }
    }
    children.sort((a, b) => {
      const da = TYPE_DEPTH[a.nodeType] ?? 3;
      const db = TYPE_DEPTH[b.nodeType] ?? 3;
      if (da !== db) return da - db;
      return a.name.localeCompare(b.name);
    });

    const rids = nodeReqs.get(nodeId);
    return {
      id: nodeId,
      name: d?.label || 'Unnamed',
      nodeType: itemType,
      description: d?.description || '',
      color: TYPE_COLORS[itemType] || '#64748b',
      reqId: d?.reqId,
      reqType: d?.reqType,
      priority: d?.priority,
      status: d?.status,
      state: d?.state,
      version: d?.version,
      children,
      requirementIds: rids ? Array.from(rids) : [],
      originalNodeId: nodeId,
    };
  }

  // Root = structural nodes with no parent
  const roots: HierarchyNode[] = [];
  const added = new Set<string>();
  for (const node of nodes) {
    const it = node.data?.itemType || node.data?.type || '';
    if (!STRUCTURAL_TYPES.has(it)) continue;
    if (childToParent.has(node.id)) continue;
    if (added.has(node.id)) continue;
    added.add(node.id);
    const hn = buildNode(node.id);
    if (hn) roots.push(hn);
  }
  roots.sort((a, b) => {
    const da = TYPE_DEPTH[a.nodeType] ?? 3;
    const db = TYPE_DEPTH[b.nodeType] ?? 3;
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name);
  });
  return roots;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function getAllDescendantIds(node: HierarchyNode): Set<string> {
  const ids = new Set<string>([node.id]);
  for (const c of node.children) for (const id of getAllDescendantIds(c)) ids.add(id);
  return ids;
}

function getExternalRelations(
  nodeId: string, subtreeIds: Set<string>, edges: PLMEdge[], nodeMap: Map<string, PLMNode>,
): ExternalRelation[] {
  const rels: ExternalRelation[] = [];
  const seen = new Set<string>();
  for (const edge of edges) {
    const relType = edge.data?.relationshipType || '';
    if (CONTAINMENT_RELATIONS.has(relType)) continue;
    const isFrom = subtreeIds.has(edge.source);
    const isTo = subtreeIds.has(edge.target);
    if ((isFrom && !isTo) || (!isFrom && isTo)) {
      const key = `${edge.source}-${edge.target}-${relType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rels.push({
        edgeId: edge.id,
        fromId: edge.source,
        fromName: nodeMap.get(edge.source)?.data?.label || edge.source,
        toId: edge.target,
        toName: nodeMap.get(edge.target)?.data?.label || edge.target,
        relationshipType: relType,
        label: edge.data?.label,
      });
    }
  }
  return rels;
}

// ─── Traceability ───────────────────────────────────────────────────────────
function buildTraceChains(rawNodes: PLMNode[], edges: PLMEdge[], requirementLinks: any[]): TraceChain[] {
  const nodes = deduplicateNodes(rawNodes);
  const nodeMap = new Map<string, PLMNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const customerReqs = nodes.filter(n => n.data?.itemType === 'requirement' && n.data?.reqType === 'customer');
  const chains: TraceChain[] = [];

  for (const custReq of customerReqs) {
    const chain: TraceChain = {
      sourceReq: {
        id: custReq.id, nodeId: custReq.id, name: custReq.data?.label || 'Unnamed',
        reqId: custReq.data?.reqId, reqType: custReq.data?.reqType,
        priority: custReq.data?.priority, status: custReq.data?.status,
      },
      linkedReqs: [], implementingNodes: [],
    };
    const lrIds = new Set<string>();
    const imIds = new Set<string>();

    for (const edge of edges) {
      if (edge.source !== custReq.id && edge.target !== custReq.id) continue;
      const oid = edge.source === custReq.id ? edge.target : edge.source;
      const on = nodeMap.get(oid);
      if (!on) continue;
      const rt = edge.data?.relationshipType || 'related';
      if (on.data?.itemType === 'requirement' && !lrIds.has(oid)) {
        lrIds.add(oid);
        chain.linkedReqs.push({
          id: oid, nodeId: oid, name: on.data?.label || '', reqId: on.data?.reqId,
          reqType: on.data?.reqType, priority: on.data?.priority, status: on.data?.status,
          linkType: rt,
        });
      } else if (STRUCTURAL_TYPES.has(on.data?.itemType || '') && !imIds.has(oid)) {
        imIds.add(oid);
        chain.implementingNodes.push({
          id: oid, nodeId: oid, name: on.data?.label || '', nodeType: on.data?.itemType || '',
        });
      }
    }

    for (const link of requirementLinks || []) {
      const sid = link.source?.itemId || link.sourceId;
      const tid = link.target?.itemId || link.targetId;
      if (sid !== custReq.id && tid !== custReq.id) continue;
      const oid = sid === custReq.id ? tid : sid;
      const on = nodeMap.get(oid);
      if (!on) continue;
      if (on.data?.itemType === 'requirement' && !lrIds.has(oid)) {
        lrIds.add(oid);
        chain.linkedReqs.push({
          id: oid, nodeId: oid, name: on.data?.label || '', reqId: on.data?.reqId,
          reqType: on.data?.reqType, priority: on.data?.priority, status: on.data?.status,
          linkType: link.linkType || link.type || 'related', linkStatus: link.status,
        });
      } else if (STRUCTURAL_TYPES.has(on.data?.itemType || '') && !imIds.has(oid)) {
        imIds.add(oid);
        chain.implementingNodes.push({
          id: oid, nodeId: oid, name: on.data?.label || '', nodeType: on.data?.itemType || '',
        });
      }
    }

    // Follow linked reqs → functions
    for (const lr of chain.linkedReqs) {
      for (const edge of edges) {
        if (edge.source !== lr.id && edge.target !== lr.id) continue;
        const oid = edge.source === lr.id ? edge.target : edge.source;
        const on = nodeMap.get(oid);
        if (!on) continue;
        if (STRUCTURAL_TYPES.has(on.data?.itemType || '') && !imIds.has(oid)) {
          imIds.add(oid);
          chain.implementingNodes.push({
            id: oid, nodeId: oid, name: on.data?.label || '', nodeType: on.data?.itemType || '',
          });
        }
      }
    }
    chains.push(chain);
  }
  return chains;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════
export function useSystemHierarchy(nodes: PLMNode[], edges: PLMEdge[], requirementLinks?: any[]) {
  const hierarchy = useMemo(() => buildHierarchy(nodes, edges), [nodes, edges]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, PLMNode>();
    for (const n of nodes) { if (!m.has(n.id)) m.set(n.id, n); }
    return m;
  }, [nodes]);

  const getSubtreeRelations = useMemo(() => (node: HierarchyNode) => {
    const ids = getAllDescendantIds(node);
    return getExternalRelations(node.id, ids, edges, nodeMap);
  }, [edges, nodeMap]);

  const getRequirementsForNode = useMemo(() => (node: HierarchyNode) => {
    return node.requirementIds.map(id => nodeMap.get(id)).filter(Boolean) as PLMNode[];
  }, [nodeMap]);

  const countAllRequirements = useMemo(() => {
    const fn = (node: HierarchyNode): number => {
      let c = node.requirementIds.length;
      for (const ch of node.children) c += fn(ch);
      return c;
    };
    return fn;
  }, []);

  const traceChains = useMemo(
    () => buildTraceChains(nodes, edges, requirementLinks || []),
    [nodes, edges, requirementLinks],
  );

  const coverageStats = useMemo(() => {
    const dn = deduplicateNodes(nodes);
    const allReqs = dn.filter(n => n.data?.itemType === 'requirement');
    const custReqs = allReqs.filter(n => n.data?.reqType === 'customer');
    const linked = traceChains.filter(c => c.linkedReqs.length > 0 || c.implementingNodes.length > 0);
    const allFns = dn.filter(n => n.data?.itemType === 'function');
    const linkedFnIds = new Set(traceChains.flatMap(c => c.implementingNodes.map(n => n.id)));
    return {
      totalRequirements: allReqs.length,
      customerRequirements: custReqs.length,
      linkedCustomerReqs: linked.length,
      totalFunctions: allFns.length,
      linkedFunctions: linkedFnIds.size,
      traceChainCount: traceChains.length,
    };
  }, [nodes, traceChains]);

  return {
    hierarchy, nodeMap, getSubtreeRelations, getRequirementsForNode,
    countAllRequirements, traceChains, coverageStats, getAllDescendantIds,
  };
}

export { TYPE_COLORS, STRUCTURAL_TYPES, CONTAINMENT_RELATIONS, getAllDescendantIds, deduplicateNodes };
