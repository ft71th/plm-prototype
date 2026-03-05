import React, { useState, useMemo } from 'react';
import type { PLMNode, PLMEdge } from '../../types';
import type { NorthlightTheme } from '../../theme';
import { useSystemHierarchy, TYPE_COLORS } from './useSystemHierarchy';
import { LINK_TYPES } from '../../RequirementLinks';

// ─── Colors ─────────────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  critical: '#e74c3c', high: '#e74c3c', medium: '#f39c12', low: '#27ae60',
};
const STATUS_COLORS: Record<string, string> = {
  approved: '#27ae60', done: '#27ae60', draft: '#64748b', new: '#64748b',
  'in-progress': '#3498db', review: '#f39c12',
};
const NODE_TYPE_ICONS: Record<string, string> = {
  system: '⬡', subsystem: '◇', function: '○', platform: '▣',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface TraceabilityViewProps {
  nodes: PLMNode[];
  edges: PLMEdge[];
  requirementLinks?: any[];
  theme: NorthlightTheme;
  height: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TraceabilityView({ nodes, edges, requirementLinks, theme, height }: TraceabilityViewProps) {
  const t = theme;
  const [selectedCust, setSelectedCust] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const { traceChains, coverageStats, nodeMap } = useSystemHierarchy(nodes, edges, requirementLinks);

  const selectedChain = useMemo(
    () => traceChains.find((c) => c.sourceReq.id === selectedCust) || null,
    [traceChains, selectedCust]
  );

  // All functions for coverage list (deduplicated)
  const allFunctions = useMemo(() => {
    const seen = new Set<string>();
    return nodes.filter((n) => {
      if (n.data?.itemType !== 'function') return false;
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }, [nodes]);
  const linkedFunctionIds = useMemo(
    () => new Set(traceChains.flatMap((c) => c.implementingNodes.map((n) => n.id))),
    [traceChains]
  );

  // Style helpers
  const cardBg = t.key === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
  const cardBgHover = t.key === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const subtleBorder = t.key === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';

  // Empty state
  if (traceChains.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 8, height: '100%', background: t.bgCanvas,
      }}>
        <div style={{ fontSize: 40, opacity: 0.15 }}>⤭</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.canvasText }}>
          No traceability chains found
        </div>
        <div style={{ fontSize: 12, color: t.canvasTextSec, textAlign: 'center', maxWidth: 400, lineHeight: 1.5 }}>
          Create customer requirements (reqType = "customer") and link them to
          internal requirements or system nodes with edges to see traceability chains here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: t.bgCanvas }}>
      {/* ── Left: Customer requirements ────────────────── */}
      <div style={{
        width: 320, borderRight: `1px solid ${t.borderLight}`,
        overflowY: 'auto', padding: 14, flexShrink: 0,
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: t.canvasTextSec,
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14,
        }}>
          Customer Requirements ({traceChains.length})
        </div>
        {traceChains.map((chain) => {
          const cr = chain.sourceReq;
          const isSelected = selectedCust === cr.id;
          const isHov = hoveredRow === cr.id;
          const hasLinks = chain.linkedReqs.length > 0 || chain.implementingNodes.length > 0;

          return (
            <div
              key={cr.id}
              onClick={() => setSelectedCust(isSelected ? null : cr.id)}
              onMouseEnter={() => setHoveredRow(cr.id)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                padding: '10px 12px', marginBottom: 6, borderRadius: 8, cursor: 'pointer',
                background: isSelected ? `${t.accent}15` : isHov ? cardBgHover : cardBg,
                border: `1px solid ${isSelected ? `${t.accent}40` : subtleBorder}`,
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 4,
              }}>
                <span style={{ fontSize: 9, color: t.canvasTextSec, fontFamily: 'inherit' }}>
                  {cr.reqId || cr.id}
                </span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {cr.priority && (
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: PRIORITY_COLORS[cr.priority] || '#64748b',
                    }} />
                  )}
                  {cr.status && (
                    <span style={{
                      fontSize: 8, padding: '0 4px', borderRadius: 2,
                      background: `${STATUS_COLORS[cr.status] || '#64748b'}15`,
                      color: STATUS_COLORS[cr.status] || '#64748b',
                      fontWeight: 600, textTransform: 'uppercase',
                    }}>
                      {cr.status}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 11, color: t.canvasText, lineHeight: 1.4 }}>
                {cr.name}
              </div>
              {hasLinks && (
                <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 9, color: t.canvasTextSec }}>
                  {chain.linkedReqs.length > 0 && (
                    <span style={{ color: t.accent }}>→ {chain.linkedReqs.length} internal reqs</span>
                  )}
                  {chain.implementingNodes.length > 0 && (
                    <span style={{ color: '#27ae60' }}>→ {chain.implementingNodes.length} functions</span>
                  )}
                </div>
              )}
              {!hasLinks && (
                <div style={{ fontSize: 9, color: t.danger, marginTop: 4, fontStyle: 'italic' }}>
                  ⚠ No traceability links
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Center: Trace chain ──────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '10px 20px', borderBottom: `1px solid ${t.borderLight}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 12, color: t.canvasText, fontWeight: 600 }}>Traceability Chain</span>
          {selectedCust ? (
            <span style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 3,
              background: `${t.accent}18`, color: t.accent, fontWeight: 600,
            }}>
              {selectedChain?.sourceReq.reqId || selectedCust}
            </span>
          ) : (
            <span style={{ fontSize: 10, color: t.canvasTextSec }}>
              Select a customer requirement to trace
            </span>
          )}
        </div>

        {selectedChain ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {/* Source requirement */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, color: t.warning,
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
              }}>
                Customer Requirement
              </div>
              <div style={{
                padding: 12, borderRadius: 8,
                background: `${t.warning}08`, border: `1px solid ${t.warning}20`,
              }}>
                <div style={{ fontSize: 9, color: t.canvasTextSec }}>
                  {selectedChain.sourceReq.reqId || selectedChain.sourceReq.id}
                </div>
                <div style={{ fontSize: 12, color: t.canvasText, marginTop: 2 }}>
                  {selectedChain.sourceReq.name}
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div style={{ textAlign: 'center', color: t.canvasTextSec, fontSize: 18, marginBottom: 16, opacity: 0.3 }}>↓</div>

            {/* Linked internal requirements */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, color: t.accent,
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
              }}>
                Internal Requirements ({selectedChain.linkedReqs.length})
              </div>
              {selectedChain.linkedReqs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {selectedChain.linkedReqs.map((req) => {
                    const linkDef = LINK_TYPES[req.linkType as keyof typeof LINK_TYPES];
                    return (
                      <div key={req.id} style={{
                        padding: '8px 12px', borderRadius: 6,
                        background: `${t.accent}06`, border: `1px solid ${t.accent}15`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontSize: 9, color: t.canvasTextSec }}>
                            {req.reqId || req.id}
                            {linkDef && (
                              <span style={{
                                marginLeft: 8, color: linkDef.color || t.canvasTextSec,
                                fontWeight: 600,
                              }}>
                                ({linkDef.label || req.linkType})
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: t.canvasText }}>{req.name}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {req.reqType && (
                            <div style={{ fontSize: 8, color: t.canvasTextSec, textTransform: 'uppercase' }}>
                              {req.reqType}
                            </div>
                          )}
                          {req.status && (
                            <span style={{
                              fontSize: 8, padding: '0 4px', borderRadius: 2,
                              background: `${STATUS_COLORS[req.status] || '#64748b'}15`,
                              color: STATUS_COLORS[req.status] || '#64748b',
                              fontWeight: 600, textTransform: 'uppercase',
                            }}>
                              {req.status}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{
                  padding: 12, borderRadius: 6, background: cardBg,
                  border: `1px dashed ${subtleBorder}`, textAlign: 'center',
                  fontSize: 10, color: t.canvasTextSec, fontStyle: 'italic',
                }}>
                  No internal requirements linked
                </div>
              )}
            </div>

            {/* Arrow */}
            <div style={{ textAlign: 'center', color: t.canvasTextSec, fontSize: 18, marginBottom: 16, opacity: 0.3 }}>↓</div>

            {/* Implementing functions/nodes */}
            <div>
              <div style={{
                fontSize: 9, fontWeight: 700, color: '#27ae60',
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
              }}>
                Implementing Functions ({selectedChain.implementingNodes.length})
              </div>
              {selectedChain.implementingNodes.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedChain.implementingNodes.map((fn) => {
                    const color = TYPE_COLORS[fn.nodeType] || '#64748b';
                    return (
                      <div key={fn.id} style={{
                        padding: '8px 14px', borderRadius: 6,
                        background: `${color}08`, border: `1px solid ${color}20`,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span style={{ fontSize: 12, color }}>
                          {NODE_TYPE_ICONS[fn.nodeType] || '○'}
                        </span>
                        <span style={{ fontSize: 11, color: t.canvasText }}>{fn.name}</span>
                        <span style={{
                          fontSize: 8, color: t.canvasTextSec,
                          textTransform: 'uppercase', fontWeight: 600,
                        }}>
                          {fn.nodeType}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{
                  padding: 12, borderRadius: 6, background: cardBg,
                  border: `1px dashed ${subtleBorder}`, textAlign: 'center',
                  fontSize: 10, color: t.canvasTextSec, fontStyle: 'italic',
                }}>
                  No implementing functions linked
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
          }}>
            <div style={{ fontSize: 36, opacity: 0.1, color: t.canvasText }}>⤭</div>
            <div style={{ fontSize: 12, color: t.canvasTextSec }}>
              Select a customer requirement to see the full trace chain
            </div>
            <div style={{ fontSize: 10, color: t.canvasTextSec, opacity: 0.5 }}>
              Customer Req → Internal Reqs → Functions
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Coverage summary ──────────────────── */}
      <div style={{
        width: 260, borderLeft: `1px solid ${t.borderLight}`,
        overflowY: 'auto', padding: 14, flexShrink: 0,
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: t.canvasTextSec,
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14,
        }}>
          Coverage Summary
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
          {[
            { label: 'Customer Reqs', value: coverageStats.customerRequirements, color: t.warning },
            { label: 'Trace Chains', value: coverageStats.traceChainCount, color: t.accent },
            { label: 'Int. Reqs Linked', value: coverageStats.linkedCustomerReqs, color: t.info },
            { label: 'Functions', value: coverageStats.totalFunctions, color: '#27ae60' },
          ].map((s) => (
            <div key={s.label} style={{
              padding: 10, borderRadius: 6, background: cardBg,
              border: `1px solid ${subtleBorder}`, textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{
                fontSize: 8, color: t.canvasTextSec,
                textTransform: 'uppercase', marginTop: 2,
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Function coverage list */}
        <div style={{
          fontSize: 9, fontWeight: 700, color: t.canvasTextSec,
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
        }}>
          Function Coverage
        </div>
        {allFunctions.length > 0 ? (
          allFunctions.map((fn) => {
            const covered = linkedFunctionIds.has(fn.id);
            const isHighlighted = selectedChain?.implementingNodes.some((n) => n.id === fn.id);
            return (
              <div key={fn.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 6px', marginBottom: 2, borderRadius: 4,
                background: isHighlighted ? `rgba(39,174,96,0.08)` : 'transparent',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: 2,
                  background: covered ? '#27ae60' : subtleBorder,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 6, color: '#fff', flexShrink: 0,
                }}>
                  {covered ? '✓' : ''}
                </span>
                <span style={{
                  fontSize: 10,
                  color: covered ? t.canvasText : t.canvasTextSec,
                  flex: 1,
                }}>
                  {fn.data?.label || fn.id}
                </span>
              </div>
            );
          })
        ) : (
          <div style={{ fontSize: 10, color: t.canvasTextSec, fontStyle: 'italic' }}>
            No functions defined
          </div>
        )}
      </div>
    </div>
  );
}
