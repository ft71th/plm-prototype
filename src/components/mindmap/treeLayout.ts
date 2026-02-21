// ═══════════════════════════════════════════════════════════════
// Northlight Mind Map — Tree Layout Engine
// ═══════════════════════════════════════════════════════════════

import type { MindMapNodeData, MindMapNodeLayout, MindMapEdge, MindMapLayout } from './mindmapTypes';

interface LayoutConfig {
  levelWidth: number;
  nodeGap: number;
  nodeHeight: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  levelWidth: 280,
  nodeGap: 10,
  nodeHeight: 40,
};

function countDescendants(node: MindMapNodeData): number {
  if (!node.children?.length) return 0;
  return node.children.length +
    node.children.reduce((sum, c) => sum + countDescendants(c), 0);
}

// ─── Horizontal Layout ───

function layoutHorizontal(
  node: MindMapNodeData,
  depth: number,
  yOff: { v: number },
  parentColor: string | null,
  collapsed: Set<string>,
  cfg: LayoutConfig,
): MindMapNodeLayout[] {
  const color = node.color || parentColor || '#64748b';
  const x = depth * cfg.levelWidth;
  const hasKids = !!(node.children?.length);
  const descCount = countDescendants(node);
  const kids = collapsed.has(node.id) ? [] : (node.children || []);

  if (!kids.length) {
    const y = yOff.v;
    yOff.v += (node.sublabel ? cfg.nodeHeight + 12 : cfg.nodeHeight) + cfg.nodeGap;
    return [{ ...node, x, y, depth, color, childIds: [], hasChildren: hasKids, descendantCount: descCount } as MindMapNodeLayout];
  }

  const all: MindMapNodeLayout[] = [];
  const direct: MindMapNodeLayout[] = [];
  for (const child of kids) {
    const r = layoutHorizontal(child, depth + 1, yOff, color, collapsed, cfg);
    direct.push(r[0]);
    all.push(...r);
  }

  const y = (Math.min(...direct.map(d => d.y)) + Math.max(...direct.map(d => d.y))) / 2;
  return [{
    ...node, x, y, depth, color,
    childIds: kids.map(c => c.id),
    hasChildren: hasKids,
    descendantCount: descCount,
  } as MindMapNodeLayout, ...all];
}

// ─── Vertical Layout ───

function layoutVertical(
  node: MindMapNodeData,
  depth: number,
  xOff: { v: number },
  parentColor: string | null,
  collapsed: Set<string>,
  cfg: LayoutConfig,
): MindMapNodeLayout[] {
  const color = node.color || parentColor || '#64748b';
  const y = depth * (cfg.nodeHeight + 60);
  const hasKids = !!(node.children?.length);
  const descCount = countDescendants(node);
  const kids = collapsed.has(node.id) ? [] : (node.children || []);

  if (!kids.length) {
    const x = xOff.v;
    xOff.v += Math.max((node.label || '').length * 7.5 + 50, 160) + cfg.nodeGap;
    return [{ ...node, x, y, depth, color, childIds: [], hasChildren: hasKids, descendantCount: descCount } as MindMapNodeLayout];
  }

  const all: MindMapNodeLayout[] = [];
  const direct: MindMapNodeLayout[] = [];
  for (const child of kids) {
    const r = layoutVertical(child, depth + 1, xOff, color, collapsed, cfg);
    direct.push(r[0]);
    all.push(...r);
  }

  const x = (Math.min(...direct.map(d => d.x)) + Math.max(...direct.map(d => d.x))) / 2;
  return [{
    ...node, x, y, depth, color,
    childIds: kids.map(c => c.id),
    hasChildren: hasKids,
    descendantCount: descCount,
  } as MindMapNodeLayout, ...all];
}

// ─── Public API ───

export function computeMindMapLayout(
  root: MindMapNodeData,
  layout: MindMapLayout,
  collapsed: Set<string>,
  config?: Partial<LayoutConfig>,
): { nodes: MindMapNodeLayout[]; edges: MindMapEdge[] } {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const nodes = layout === 'vertical'
    ? layoutVertical(root, 0, { v: 0 }, null, collapsed, cfg)
    : layoutHorizontal(root, 0, { v: 0 }, null, collapsed, cfg);

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const edges: MindMapEdge[] = [];
  for (const n of nodes) {
    for (const cid of n.childIds) {
      const child = nodeMap.get(cid);
      if (child) edges.push({ fromId: n.id, toId: cid, color: child.color });
    }
  }
  return { nodes, edges };
}

export function getHorizontalBezier(x1: number, y1: number, x2: number, y2: number): string {
  const cp = Math.min(Math.abs(x2 - x1) * 0.5, 120);
  return `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`;
}

export function getVerticalBezier(x1: number, y1: number, x2: number, y2: number): string {
  const cp = Math.min(Math.abs(y2 - y1) * 0.5, 80);
  return `M ${x1} ${y1} C ${x1} ${y1 + cp}, ${x2} ${y2 - cp}, ${x2} ${y2}`;
}

export function getNodeWidth(node: MindMapNodeLayout): number {
  return node.depth === 0 ? 200 : Math.max((node.label || '').length * 7.2 + 50, 150);
}

export function getNodeHeight(node: MindMapNodeLayout): number {
  return node.sublabel ? 52 : 38;
}
