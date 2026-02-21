// ═══════════════════════════════════════════════════════════════
// Northlight Mind Map — State Management Hook
// Pattern: useSequenceDiagram.ts
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  MindMapNodeData, MindMapNodeLayout, MindMapEdge,
  MindMapLayout, MindMapDocument, MindMapComment, ViewportState,
} from './mindmapTypes';
import { computeMindMapLayout } from './treeLayout';

// ─── Storage ───

const storageKey = (pid: string, mid: string) => `northlight_mindmap_${pid}_${mid}`;
const listKey = (pid: string) => `northlight_mindmap_list_${pid}`;

function makeDefaultDoc(pid: string, data?: MindMapNodeData): MindMapDocument {
  return {
    id: `mm_${Date.now()}`,
    name: 'New Mind Map',
    projectId: pid,
    rootNode: data || { id: 'root', label: 'Root', color: '#6366f1', children: [] },
    layout: 'horizontal',
    viewport: { panX: 40, panY: 20, zoom: 0.55 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Tree helpers ───

function updateNodeInTree(
  root: MindMapNodeData, targetId: string, fn: (n: MindMapNodeData) => MindMapNodeData,
): MindMapNodeData {
  if (root.id === targetId) return fn({ ...root });
  return { ...root, children: (root.children || []).map(c => updateNodeInTree(c, targetId, fn)) };
}

function findParentId(root: MindMapNodeData, targetId: string): string | null {
  for (const c of root.children || []) {
    if (c.id === targetId) return root.id;
    const found = findParentId(c, targetId);
    if (found) return found;
  }
  return null;
}

// ─── Hook ───

export default function useMindMapData(projectId: string | null, initialData?: MindMapNodeData) {
  const pid = projectId || 'default';

  const [doc, setDoc] = useState<MindMapDocument>(() => {
    const lk = listKey(pid);
    try {
      const list: string[] = JSON.parse(localStorage.getItem(lk) || '[]');
      if (list.length) {
        const saved = localStorage.getItem(storageKey(pid, list[0]));
        if (saved) return JSON.parse(saved);
      }
    } catch { /* fall through */ }
    return makeDefaultDoc(pid, initialData);
  });

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewport, setViewport] = useState<ViewportState>(doc.viewport);

  // ── Manual position offsets (cleared on auto-layout) ──
  const [nodeOffsets, setNodeOffsets] = useState<Map<string, { dx: number; dy: number }>>(new Map());

  // ── Layout ──
  const { nodes: baseNodes, edges } = useMemo(
    () => computeMindMapLayout(doc.rootNode, doc.layout, collapsed),
    [doc.rootNode, doc.layout, collapsed],
  );

  // Apply drag offsets to computed positions
  const nodes = useMemo(() => {
    if (nodeOffsets.size === 0) return baseNodes;
    return baseNodes.map(n => {
      const off = nodeOffsets.get(n.id);
      return off ? { ...n, x: n.x + off.dx, y: n.y + off.dy } : n;
    });
  }, [baseNodes, nodeOffsets]);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  // Move a single node (or node + subtree)
  const moveNode = useCallback((nodeId: string, dx: number, dy: number, withSubtree = false) => {
    setNodeOffsets(prev => {
      const next = new Map(prev);
      const applyOffset = (id: string) => {
        const existing = next.get(id) || { dx: 0, dy: 0 };
        next.set(id, { dx: existing.dx + dx, dy: existing.dy + dy });
      };
      applyOffset(nodeId);
      if (withSubtree) {
        // Find all descendants in baseNodes
        const descendants = new Set<string>();
        const walk = (nData: MindMapNodeData) => {
          (nData.children || []).forEach(c => { descendants.add(c.id); walk(c); });
        };
        const findInTree = (nData: MindMapNodeData, targetId: string): MindMapNodeData | null => {
          if (nData.id === targetId) return nData;
          for (const c of (nData.children || [])) {
            const found = findInTree(c, targetId);
            if (found) return found;
          }
          return null;
        };
        const target = findInTree(doc.rootNode, nodeId);
        if (target) { walk(target); descendants.forEach(id => applyOffset(id)); }
      }
      return next;
    });
  }, [doc.rootNode]);

  // Reset all offsets (auto-layout)
  const autoLayout = useCallback(() => {
    setNodeOffsets(new Map());
  }, []);

  // ── Search ──
  const highlighted = useMemo(() => {
    if (!searchTerm.trim()) return new Set<string>();
    const t = searchTerm.toLowerCase();
    return new Set(nodes.filter(n =>
      n.label.toLowerCase().includes(t) ||
      n.sublabel?.toLowerCase().includes(t) ||
      n.reqId?.toLowerCase().includes(t)
    ).map(n => n.id));
  }, [searchTerm, nodes]);

  // ── Auto-save ──
  useEffect(() => {
    const timer = setTimeout(() => {
      const updated = { ...doc, viewport, updatedAt: new Date().toISOString() };
      localStorage.setItem(storageKey(pid, updated.id), JSON.stringify(updated));
      const lk = listKey(pid);
      try {
        const list: string[] = JSON.parse(localStorage.getItem(lk) || '[]');
        if (!list.includes(updated.id)) list.unshift(updated.id);
        localStorage.setItem(lk, JSON.stringify(list));
      } catch { /* ignore */ }
    }, 1000);
    return () => clearTimeout(timer);
  }, [doc.rootNode, viewport, pid, doc.id]);

  // ── Mutations ──

  const mutRoot = useCallback((fn: (r: MindMapNodeData) => MindMapNodeData) => {
    setDoc(prev => ({ ...prev, rootNode: fn(prev.rootNode) }));
  }, []);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const addChild = useCallback((parentId: string, label = 'New Node') => {
    const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    mutRoot(r => updateNodeInTree(r, parentId, n => ({
      ...n, children: [...(n.children || []), { id: newId, label, children: [] }],
    })));
    setCollapsed(prev => { const s = new Set(prev); s.delete(parentId); return s; });
    return newId;
  }, [mutRoot]);

  const addSibling = useCallback((nodeId: string, label = 'New Node') => {
    const parentId = findParentId(doc.rootNode, nodeId);
    if (!parentId) return null;
    const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    mutRoot(r => updateNodeInTree(r, parentId, parent => {
      const kids = [...(parent.children || [])];
      const idx = kids.findIndex(c => c.id === nodeId);
      kids.splice(idx + 1, 0, { id: newId, label, children: [] });
      return { ...parent, children: kids };
    }));
    return newId;
  }, [doc.rootNode, mutRoot]);

  const renameNode = useCallback((id: string, label: string) => {
    mutRoot(r => updateNodeInTree(r, id, n => ({ ...n, label })));
  }, [mutRoot]);

  const deleteNode = useCallback((id: string) => {
    if (id === doc.rootNode.id) return;
    const parentId = findParentId(doc.rootNode, id);
    if (!parentId) return;
    mutRoot(r => updateNodeInTree(r, parentId, p => ({
      ...p, children: (p.children || []).filter(c => c.id !== id),
    })));
    if (selectedId === id) setSelectedId(null);
  }, [doc.rootNode, selectedId, mutRoot]);

  const setNodeColor = useCallback((id: string, color: string) => {
    mutRoot(r => updateNodeInTree(r, id, n => ({ ...n, color })));
  }, [mutRoot]);

  const setNodeReqId = useCallback((id: string, reqId?: string) => {
    mutRoot(r => updateNodeInTree(r, id, n => ({ ...n, reqId })));
  }, [mutRoot]);

  const addComment = useCallback((nodeId: string, comment: Omit<MindMapComment, 'id' | 'createdAt'>) => {
    const c: MindMapComment = { ...comment, id: `c_${Date.now()}`, createdAt: new Date().toISOString() };
    mutRoot(r => updateNodeInTree(r, nodeId, n => ({
      ...n, comments: [...(n.comments || []), c],
    })));
  }, [mutRoot]);

  const setLayout = useCallback((layout: MindMapLayout) => {
    setDoc(prev => ({ ...prev, layout }));
    setNodeOffsets(new Map()); // Reset drag offsets on layout change
  }, []);

  const setRootNode = useCallback((rootNode: MindMapNodeData) => {
    setDoc(prev => ({ ...prev, rootNode }));
    setCollapsed(new Set());
    setSelectedId(null);
  }, []);

  const expandAll = useCallback(() => setCollapsed(new Set()), []);

  const collapseAll = useCallback(() => {
    const ids = new Set<string>();
    const walk = (n: MindMapNodeData) => {
      if (n.children?.length) { ids.add(n.id); n.children.forEach(walk); }
    };
    walk(doc.rootNode);
    ids.delete(doc.rootNode.id);
    setCollapsed(ids);
  }, [doc.rootNode]);

  const collapseToDepth = useCallback((maxDepth: number) => {
    const ids = new Set<string>();
    const walk = (n: MindMapNodeData, d: number) => {
      if (d >= maxDepth && n.children?.length) ids.add(n.id);
      (n.children || []).forEach(c => walk(c, d + 1));
    };
    walk(doc.rootNode, 0);
    setCollapsed(ids);
  }, [doc.rootNode]);

  // ── Mind map list management ──

  // Build entries with names from localStorage
  const [mapIds, setMapIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(listKey(pid)) || '[]'); } catch { return []; }
  });

  // Ensure current doc is always in the list
  useEffect(() => {
    if (!mapIds.includes(doc.id)) {
      const list = [doc.id, ...mapIds];
      localStorage.setItem(listKey(pid), JSON.stringify(list));
      setMapIds(list);
    }
  }, [doc.id, pid]);

  // Resolve IDs to {id, name} — read name from stored docs
  const mapEntries = useMemo(() => {
    return mapIds.map(id => {
      if (id === doc.id) return { id, name: doc.name };
      try {
        const raw = localStorage.getItem(storageKey(pid, id));
        if (raw) { const d = JSON.parse(raw); return { id, name: d.name || 'Untitled' }; }
      } catch { /* ignore */ }
      return { id, name: 'Untitled' };
    });
  }, [mapIds, doc.id, doc.name, pid]);

  const switchMap = useCallback((mapId: string) => {
    try {
      const saved = localStorage.getItem(storageKey(pid, mapId));
      if (saved) {
        const parsed = JSON.parse(saved) as MindMapDocument;
        setDoc(parsed);
        setViewport(parsed.viewport);
        setCollapsed(new Set());
        setSelectedId(null);
      }
    } catch { /* ignore */ }
  }, [pid]);

  const createNewMap = useCallback((name: string, data?: MindMapNodeData) => {
    const newDoc = makeDefaultDoc(pid, data);
    newDoc.name = name;
    setDoc(newDoc);
    setViewport(newDoc.viewport);
    setCollapsed(new Set());
    setSelectedId(null);
    localStorage.setItem(storageKey(pid, newDoc.id), JSON.stringify(newDoc));
    const list = [...mapIds, newDoc.id];
    localStorage.setItem(listKey(pid), JSON.stringify(list));
    setMapIds(list);
    return newDoc.id;
  }, [pid, mapIds]);

  const renameMap = useCallback((name: string) => {
    setDoc(prev => ({ ...prev, name }));
  }, []);

  const deleteMap = useCallback((mapId: string) => {
    localStorage.removeItem(storageKey(pid, mapId));
    const list = mapIds.filter(id => id !== mapId);
    localStorage.setItem(listKey(pid), JSON.stringify(list));
    setMapIds(list);
    if (doc.id === mapId && list.length) switchMap(list[0]);
  }, [pid, mapIds, doc.id, switchMap]);

  return {
    doc, nodes, edges, nodeMap, collapsed, selectedId, searchTerm,
    highlighted, viewport, layout: doc.layout, mapEntries,

    setSelectedId, setSearchTerm, setViewport, setLayout, setRootNode,
    toggleCollapse, addChild, addSibling, renameNode, deleteNode,
    setNodeColor, setNodeReqId, addComment,
    expandAll, collapseAll, collapseToDepth,
    moveNode, autoLayout,
    switchMap, createNewMap, renameMap, deleteMap,
  };
}
