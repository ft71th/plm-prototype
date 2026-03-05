import React, { useState, useCallback, useMemo } from 'react';
import type { PLMNode, PLMEdge } from '../../types';
import type { NorthlightTheme } from '../../theme';
import type { HierarchyNode } from './systemExplorerTypes';
import { useSystemHierarchy, TYPE_COLORS } from './useSystemHierarchy';
import { RELATIONSHIP_TYPES } from '../../constants/relationships';

// ─── Constants ──────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  system: { icon: '⬡', label: 'System' },
  subsystem: { icon: '◇', label: 'Subsystem' },
  function: { icon: '○', label: 'Function' },
  platform: { icon: '▣', label: 'Platform' },
  hardware: { icon: '▦', label: 'Hardware' },
  usecase: { icon: '◎', label: 'Use Case' },
  actor: { icon: '◉', label: 'Actor' },
};

const SYSTEM_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#3b82f6',
];

const SUBSYSTEM_BORDER_COLORS = [
  '#1e3a5f', '#3a1e5f', '#5f1e1e', '#1e5f3a', '#5f4a1e',
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#e74c3c', high: '#e74c3c', medium: '#f39c12', low: '#27ae60',
};

interface ExplorerViewProps {
  nodes: PLMNode[];
  edges: PLMEdge[];
  requirementLinks?: any[];
  theme: NorthlightTheme;
  height: number;
}

// ─── Nested Architecture Box for a single system ────────────────────────────

function SystemArchBox({
  node, theme, colorIdx, onDrillIn, onShowDetail,
  getSubtreeRelations, countAllRequirements,
}: {
  node: HierarchyNode;
  theme: NorthlightTheme;
  colorIdx: number;
  onDrillIn: (node: HierarchyNode) => void;
  onShowDetail: (node: HierarchyNode) => void;
  getSubtreeRelations: (n: HierarchyNode) => any[];
  countAllRequirements: (n: HierarchyNode) => number;
}) {
  const t = theme;
  const color = SYSTEM_COLORS[colorIdx % SYSTEM_COLORS.length];
  const [hovered, setHovered] = useState(false);
  const reqCount = countAllRequirements(node);
  const relCount = getSubtreeRelations(node).length;

  const subsystems = node.children.filter(c => c.nodeType === 'subsystem' || c.nodeType === 'hardware');
  const directFunctions = node.children.filter(c => c.nodeType === 'function');
  const otherChildren = node.children.filter(c =>
    c.nodeType !== 'subsystem' && c.nodeType !== 'hardware' && c.nodeType !== 'function'
  );

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `2px dashed ${color}${hovered ? 'cc' : '55'}`,
        borderRadius: 10,
        overflow: 'hidden',
        transition: 'all 0.2s',
        background: `${color}05`,
        minWidth: 220,
      }}
    >
      {/* System header bar */}
      <div
        onClick={() => onDrillIn(node)}
        style={{
          background: color,
          padding: '8px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'filter 0.2s',
          filter: hovered ? 'brightness(1.1)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            {node.name}
          </span>
          <span style={{
            fontSize: 8, padding: '1px 5px', borderRadius: 3,
            background: 'rgba(255,255,255,0.2)', color: '#fff',
            fontWeight: 600, textTransform: 'uppercase',
          }}>
            {TYPE_CONFIG[node.nodeType]?.label || node.nodeType}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {reqCount > 0 && (
            <span style={{
              fontSize: 9, color: 'rgba(255,255,255,0.8)',
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              ⤭ {reqCount}
            </span>
          )}
          <span style={{
            fontSize: 14, color: 'rgba(255,255,255,0.6)',
            transform: hovered ? 'translateX(2px)' : 'none',
            transition: 'transform 0.2s',
          }}>→</span>
        </div>
      </div>

      {/* Body: subsystems + direct functions */}
      <div style={{ padding: 8 }}>
        {/* Subsystems as nested dashed boxes */}
        {subsystems.length > 0 && (
          <div style={{
            display: 'flex', gap: 6, flexWrap: 'wrap',
            marginBottom: directFunctions.length > 0 ? 6 : 0,
          }}>
            {subsystems.map((sub, si) => {
              const subColor = SUBSYSTEM_BORDER_COLORS[si % SUBSYSTEM_BORDER_COLORS.length];
              const subFunctions = sub.children.filter(c => c.nodeType === 'function');
              const subOther = sub.children.filter(c => c.nodeType !== 'function');
              return (
                <div
                  key={sub.id}
                  style={{
                    border: `2px dashed ${sub.color || subColor}60`,
                    borderRadius: 8,
                    flex: '1 1 180px',
                    minWidth: 150,
                    background: `${sub.color || subColor}08`,
                  }}
                >
                  {/* Subsystem label */}
                  <div
                    onClick={() => onDrillIn(sub)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11, fontWeight: 700,
                      color: sub.color || subColor,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderBottom: `1px solid ${sub.color || subColor}20`,
                    }}
                  >
                    <span>{sub.name}</span>
                    <span style={{ fontSize: 8, opacity: 0.5, textTransform: 'uppercase' }}>
                      {TYPE_CONFIG[sub.nodeType]?.label || sub.nodeType}
                    </span>
                  </div>
                  {/* Functions inside subsystem */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: subFunctions.length > 4 ? 'repeat(auto-fill, minmax(100px, 1fr))' : `repeat(${Math.min(subFunctions.length, 2)}, 1fr)`,
                    gap: 4,
                    padding: 6,
                  }}>
                    {subFunctions.map(fn => (
                      <div
                        key={fn.id}
                        onClick={() => onShowDetail(fn)}
                        style={{
                          padding: '6px 8px',
                          background: t.key === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                          border: `1px solid ${t.key === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                          borderRadius: 5,
                          fontSize: 10,
                          color: t.canvasText,
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontWeight: 500,
                          transition: 'all 0.15s',
                        }}
                        onMouseOver={e => {
                          (e.currentTarget as HTMLElement).style.background =
                            t.key === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
                        }}
                        onMouseOut={e => {
                          (e.currentTarget as HTMLElement).style.background =
                            t.key === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
                        }}
                      >
                        {fn.name}
                      </div>
                    ))}
                    {subOther.map(o => (
                      <div
                        key={o.id}
                        onClick={() => onShowDetail(o)}
                        style={{
                          padding: '6px 8px',
                          background: `${o.color || '#64748b'}10`,
                          border: `1px solid ${o.color || '#64748b'}25`,
                          borderRadius: 5, fontSize: 10,
                          color: o.color || t.canvasTextSec,
                          cursor: 'pointer', textAlign: 'center',
                          fontWeight: 500,
                        }}
                      >
                        {o.name}
                      </div>
                    ))}
                    {subFunctions.length === 0 && subOther.length === 0 && (
                      <div style={{ fontSize: 9, color: t.canvasTextSec, fontStyle: 'italic', padding: 4 }}>
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Direct functions (not inside a subsystem) */}
        {directFunctions.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(100px, 1fr))`,
            gap: 4,
          }}>
            {directFunctions.map(fn => (
              <div
                key={fn.id}
                onClick={() => onShowDetail(fn)}
                style={{
                  padding: '6px 8px',
                  background: t.key === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${t.key === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: 5,
                  fontSize: 10,
                  color: t.canvasText,
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: 500,
                }}
              >
                {fn.name}
              </div>
            ))}
          </div>
        )}

        {/* Other children */}
        {otherChildren.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
            {otherChildren.map(o => (
              <div
                key={o.id}
                onClick={() => onDrillIn(o)}
                style={{
                  padding: '4px 8px', borderRadius: 4,
                  background: `${o.color || '#64748b'}15`,
                  border: `1px solid ${o.color || '#64748b'}30`,
                  fontSize: 9, color: o.color || t.canvasTextSec,
                  cursor: 'pointer', fontWeight: 600,
                }}
              >
                {o.name}
              </div>
            ))}
          </div>
        )}

        {node.children.length === 0 && (
          <div style={{ padding: 10, fontSize: 10, color: t.canvasTextSec, fontStyle: 'italic', textAlign: 'center' }}>
            No children defined
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Detail panel (shown when clicking a function or leaf node) ─────────────

function DetailPanel({
  node, theme, nodeMap, getSubtreeRelations, getRequirementsForNode, onClose,
}: {
  node: HierarchyNode;
  theme: NorthlightTheme;
  nodeMap: Map<string, PLMNode>;
  getSubtreeRelations: (n: HierarchyNode) => any[];
  getRequirementsForNode: (n: HierarchyNode) => PLMNode[];
  onClose: () => void;
}) {
  const t = theme;
  const reqs = getRequirementsForNode(node);
  const rels = getSubtreeRelations(node);

  return (
    <div style={{
      width: 320, borderLeft: `1px solid ${t.borderLight}`,
      background: t.bgCanvas, overflowY: 'auto', padding: 16, flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 16, color: node.color }}>{TYPE_CONFIG[node.nodeType]?.icon || '○'}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.canvasText }}>{node.name}</span>
          </div>
          <span style={{
            fontSize: 8, padding: '1px 5px', borderRadius: 3,
            background: `${node.color}15`, color: node.color,
            fontWeight: 700, textTransform: 'uppercase',
          }}>
            {TYPE_CONFIG[node.nodeType]?.label || node.nodeType}
          </span>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: t.canvasTextSec,
          cursor: 'pointer', fontSize: 16, padding: 2,
        }}>×</button>
      </div>

      {node.description && (
        <p style={{ fontSize: 11, color: t.canvasTextSec, margin: '0 0 14px 0', lineHeight: 1.5 }}>
          {node.description}
        </p>
      )}

      {/* Metadata */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {node.status && (
          <span style={{
            fontSize: 8, padding: '2px 6px', borderRadius: 3,
            background: `${node.status === 'approved' || node.status === 'done' ? '#27ae60' : '#64748b'}18`,
            color: node.status === 'approved' || node.status === 'done' ? '#27ae60' : '#64748b',
            fontWeight: 600, textTransform: 'uppercase',
          }}>{node.status}</span>
        )}
        {node.priority && (
          <span style={{
            fontSize: 8, padding: '2px 6px', borderRadius: 3,
            background: `${PRIORITY_COLORS[node.priority] || '#64748b'}18`,
            color: PRIORITY_COLORS[node.priority] || '#64748b',
            fontWeight: 600, textTransform: 'uppercase',
          }}>{node.priority}</span>
        )}
        {node.state && (
          <span style={{
            fontSize: 8, padding: '2px 6px', borderRadius: 3,
            background: 'rgba(100,116,139,0.1)', color: '#64748b',
            fontWeight: 600, textTransform: 'uppercase',
          }}>{node.state}</span>
        )}
      </div>

      {/* Requirements */}
      {reqs.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: t.accent,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
          }}>Requirements ({reqs.length})</div>
          {reqs.map(req => (
            <div key={req.id} style={{
              padding: '5px 7px', marginBottom: 3, borderRadius: 5,
              background: `${t.accent}06`, border: `1px solid ${t.accent}15`,
            }}>
              <div style={{ fontSize: 8, color: t.canvasTextSec }}>{req.data?.reqId || req.id}</div>
              <div style={{ fontSize: 10, color: t.canvasText, lineHeight: 1.3 }}>{req.data?.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Relations */}
      {rels.length > 0 && (
        <div>
          <div style={{
            fontSize: 9, fontWeight: 700, color: t.warning,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
          }}>External Relations ({rels.length})</div>
          {rels.slice(0, 15).map((rel: any, i: number) => {
            const rd = RELATIONSHIP_TYPES[rel.relationshipType as keyof typeof RELATIONSHIP_TYPES];
            const rc = rd?.color || '#64748b';
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '3px 0', fontSize: 9, color: t.canvasTextSec,
                borderBottom: `1px solid ${t.key === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: rc, flexShrink: 0 }} />
                <span style={{ color: rc, fontWeight: 600, minWidth: 55 }}>{rd?.label || rel.relationshipType}</span>
                <span style={{ opacity: 0.4 }}>→</span>
                <span style={{ color: t.canvasText }}>{rel.toName}</span>
              </div>
            );
          })}
          {rels.length > 15 && (
            <div style={{ fontSize: 9, color: t.canvasTextSec, paddingTop: 4 }}>+{rels.length - 15} more</div>
          )}
        </div>
      )}

      {reqs.length === 0 && rels.length === 0 && (
        <div style={{ fontSize: 10, color: t.canvasTextSec, fontStyle: 'italic' }}>
          No requirements or external relations linked.
        </div>
      )}

      {/* Children list */}
      {node.children.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: '#27ae60',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
          }}>Contains ({node.children.length})</div>
          {node.children.map(c => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '3px 0', fontSize: 10,
            }}>
              <span style={{ color: c.color, fontSize: 11 }}>{TYPE_CONFIG[c.nodeType]?.icon || '○'}</span>
              <span style={{ color: t.canvasText }}>{c.name}</span>
              <span style={{ fontSize: 8, color: t.canvasTextSec, textTransform: 'uppercase' }}>
                {TYPE_CONFIG[c.nodeType]?.label || c.nodeType}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ExplorerView({ nodes, edges, requirementLinks, theme, height }: ExplorerViewProps) {
  const t = theme;
  const [path, setPath] = useState<string[]>([]);
  const [detailNode, setDetailNode] = useState<HierarchyNode | null>(null);

  const {
    hierarchy, nodeMap, getSubtreeRelations, getRequirementsForNode, countAllRequirements,
  } = useSystemHierarchy(nodes, edges, requirementLinks);

  // Virtual root
  const virtualRoot: HierarchyNode = useMemo(() => ({
    id: '__root__', name: 'System Architecture', nodeType: 'root',
    description: 'Top-level system overview', children: hierarchy,
    requirementIds: [], originalNodeId: '__root__',
  }), [hierarchy]);

  // Current node from path
  const currentNode = useMemo(() => {
    let node = virtualRoot;
    for (const id of path) {
      const child = node.children.find(c => c.id === id);
      if (!child) break;
      node = child;
    }
    return node;
  }, [virtualRoot, path]);

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs = [{ label: 'Architecture', id: '__root__' }];
    let node = virtualRoot;
    for (const id of path) {
      const child = node.children.find(c => c.id === id);
      if (child) {
        crumbs.push({ label: child.name, id: child.id });
        node = child;
      }
    }
    return crumbs;
  }, [path, virtualRoot]);

  const drillIn = useCallback((node: HierarchyNode) => {
    if (node.children.length > 0) {
      setPath(p => [...p, node.id]);
      setDetailNode(null);
    } else {
      setDetailNode(node);
    }
  }, []);

  const navigateTo = useCallback((index: number) => {
    setPath(p => p.slice(0, index));
    setDetailNode(null);
  }, []);

  // Separate systems from orphan functions at current level
  const systems = currentNode.children.filter(c =>
    c.nodeType === 'system' || c.nodeType === 'platform'
  );
  const subsystems = currentNode.children.filter(c =>
    c.nodeType === 'subsystem' || c.nodeType === 'hardware'
  );
  const functions = currentNode.children.filter(c =>
    c.nodeType === 'function' || c.nodeType === 'usecase' || c.nodeType === 'actor'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        padding: '8px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${t.borderLight}`,
        background: t.bgCanvas, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {breadcrumbs.map((c, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <span style={{ color: t.canvasTextSec, margin: '0 4px', fontSize: 11, opacity: 0.4 }}>/</span>}
              <button
                onClick={() => navigateTo(i)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '2px 5px', borderRadius: 4, fontSize: 11, fontFamily: 'inherit',
                  color: i === breadcrumbs.length - 1 ? t.canvasText : t.canvasTextSec,
                  fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                }}
              >{c.label}</button>
            </span>
          ))}
        </div>
        <div style={{ fontSize: 10, color: t.canvasTextSec }}>
          {currentNode.children.length} items
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main area */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: 20, background: t.bgCanvas,
        }}>
          {/* Current level header (for drilled-in nodes) */}
          {currentNode.id !== '__root__' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 20, color: currentNode.color }}>
                  {TYPE_CONFIG[currentNode.nodeType]?.icon || '◈'}
                </span>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: t.canvasText }}>
                  {currentNode.name}
                </h2>
                <span style={{
                  fontSize: 8, padding: '2px 6px', borderRadius: 3,
                  background: `${currentNode.color}15`, color: currentNode.color,
                  fontWeight: 700, textTransform: 'uppercase',
                }}>
                  {TYPE_CONFIG[currentNode.nodeType]?.label || currentNode.nodeType}
                </span>
              </div>
              {currentNode.description && (
                <p style={{ fontSize: 11, color: t.canvasTextSec, margin: 0, paddingLeft: 28 }}>
                  {currentNode.description}
                </p>
              )}
            </div>
          )}

          {/* Systems — nested box architecture view */}
          {systems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: subsystems.length + functions.length > 0 ? 20 : 0 }}>
              {systems.map((sys, i) => (
                <SystemArchBox
                  key={sys.id}
                  node={sys}
                  theme={t}
                  colorIdx={i}
                  onDrillIn={drillIn}
                  onShowDetail={(n) => setDetailNode(n)}
                  getSubtreeRelations={getSubtreeRelations}
                  countAllRequirements={countAllRequirements}
                />
              ))}
            </div>
          )}

          {/* Subsystems at current level (when drilled into a system) */}
          {subsystems.length > 0 && (
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap',
              marginBottom: functions.length > 0 ? 16 : 0,
            }}>
              {subsystems.map((sub, i) => {
                const subColor = sub.color || SUBSYSTEM_BORDER_COLORS[i % SUBSYSTEM_BORDER_COLORS.length];
                return (
                  <div
                    key={sub.id}
                    style={{
                      border: `2px dashed ${subColor}60`,
                      borderRadius: 8, flex: '1 1 200px', minWidth: 180,
                      background: `${subColor}08`,
                    }}
                  >
                    <div
                      onClick={() => drillIn(sub)}
                      style={{
                        padding: '6px 12px', fontSize: 12, fontWeight: 700,
                        color: subColor, cursor: 'pointer',
                        borderBottom: `1px solid ${subColor}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <span>{sub.name}</span>
                      <span style={{ fontSize: 8, opacity: 0.5, textTransform: 'uppercase' }}>
                        {TYPE_CONFIG[sub.nodeType]?.label || sub.nodeType}
                      </span>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                      gap: 4, padding: 6,
                    }}>
                      {sub.children.map(fn => (
                        <div
                          key={fn.id}
                          onClick={() => setDetailNode(fn)}
                          style={{
                            padding: '6px 8px',
                            background: t.key === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                            border: `1px solid ${t.key === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                            borderRadius: 5, fontSize: 10, color: t.canvasText,
                            cursor: 'pointer', textAlign: 'center', fontWeight: 500,
                          }}
                        >{fn.name}</div>
                      ))}
                      {sub.children.length === 0 && (
                        <div style={{ fontSize: 9, color: t.canvasTextSec, fontStyle: 'italic', padding: 4 }}>
                          Empty
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Functions at current level */}
          {functions.length > 0 && (
            <div>
              {(systems.length > 0 || subsystems.length > 0) && (
                <div style={{
                  fontSize: 9, fontWeight: 700, color: t.canvasTextSec,
                  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
                }}>
                  Functions
                </div>
              )}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 6,
              }}>
                {functions.map(fn => (
                  <div
                    key={fn.id}
                    onClick={() => setDetailNode(fn)}
                    style={{
                      padding: '8px 10px',
                      background: t.key === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${t.key === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                      borderRadius: 6, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 500, color: t.canvasText }}>{fn.name}</div>
                    <div style={{ fontSize: 8, color: fn.color || t.canvasTextSec, textTransform: 'uppercase', marginTop: 2 }}>
                      {TYPE_CONFIG[fn.nodeType]?.label || fn.nodeType}
                    </div>
                    {fn.requirementIds.length > 0 && (
                      <div style={{ fontSize: 9, color: t.accent, marginTop: 3 }}>
                        ⤭ {fn.requirementIds.length}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {currentNode.children.length === 0 && currentNode.id === '__root__' && (
            <div style={{ padding: 60, textAlign: 'center', color: t.canvasTextSec }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.15 }}>◈</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No systems defined yet</div>
              <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
                Add System, Subsystem, and Function nodes in the System view,<br />
                then connect them with edges to build the hierarchy.
              </div>
            </div>
          )}

          {currentNode.children.length === 0 && currentNode.id !== '__root__' && (
            <div style={{ padding: 30, textAlign: 'center', color: t.canvasTextSec }}>
              <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.2 }}>○</div>
              <div style={{ fontSize: 11 }}>Leaf node — no structural children</div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {detailNode && (
          <DetailPanel
            node={detailNode}
            theme={t}
            nodeMap={nodeMap}
            getSubtreeRelations={getSubtreeRelations}
            getRequirementsForNode={getRequirementsForNode}
            onClose={() => setDetailNode(null)}
          />
        )}
      </div>
    </div>
  );
}
