import React, { useState, useCallback, useMemo } from 'react';

// ─────────────────────────────────────────────────
// LINK TYPE DEFINITIONS
// ─────────────────────────────────────────────────
export const LINK_TYPES = {
  satisfies:  { label: 'Satisfies',       color: '#8e44ad', icon: '✅', description: 'Source requirement is satisfied by target' },
  derives:    { label: 'Derives from',    color: '#e67e22', icon: '🔀', description: 'Source is derived from target' },
  refines:    { label: 'Refines',         color: '#3498db', icon: '🔍', description: 'Source refines/details target' },
  conflicts:  { label: 'Conflicts with',  color: '#e74c3c', icon: '⚠️', description: 'Source conflicts with target' },
  relates:    { label: 'Related to',      color: '#95a5a6', icon: '🔗', description: 'General relationship' },
  implements: { label: 'Implements',      color: '#2196f3', icon: '⚙️', description: 'Source implements target' },
  verifies:   { label: 'Verifies',        color: '#27ae60', icon: '🧪', description: 'Source verifies target' },
  reuses:     { label: 'Reuses',          color: '#16a085', icon: '♻️', description: 'Source reuses target requirement' },
};

export const LINK_STATUSES = {
  active:       { label: 'Active',        color: '#27ae60', icon: '🟢' },
  needsReview:  { label: 'Needs Review',  color: '#f39c12', icon: '🟡' },
  proposed:     { label: 'Proposed',       color: '#3498db', icon: '🔵' },
  deprecated:   { label: 'Deprecated',    color: '#95a5a6', icon: '⚪' },
  broken:       { label: 'Broken',        color: '#e74c3c', icon: '🔴' },
};

// ─────────────────────────────────────────────────
// CREATE LINK HELPER
// ─────────────────────────────────────────────────
let linkCounter = 0;

export function createRequirementLink({
  sourceItemId,
  sourceVersion = null,   // null = floating
  targetItemId,
  targetVersion = null,   // null = floating
  linkType = 'relates',
  notes = '',
  createdBy = 'unknown',
}) {
  linkCounter++;
  return {
    id: `rl-${Date.now()}-${linkCounter}`,
    source: {
      itemId: sourceItemId,
      version: sourceVersion,  // null = floating (latest approved)
    },
    target: {
      itemId: targetItemId,
      version: targetVersion,  // null = floating
    },
    linkType,
    status: 'active',
    metadata: {
      createdAt: new Date().toISOString(),
      createdBy,
      notes,
      verifiedAt: null,
      verifiedBy: null,
      lastReviewedAt: null,
    },
  };
}

// ─────────────────────────────────────────────────
// useRequirementLinks HOOK
// ─────────────────────────────────────────────────
export function useRequirementLinks(initialLinks = []) {
  const [links, setLinks] = useState(initialLinks);

  const addLink = useCallback((linkData) => {
    const newLink = createRequirementLink(linkData);
    setLinks(prev => [...prev, newLink]);
    return newLink;
  }, []);

  const removeLink = useCallback((linkId) => {
    setLinks(prev => prev.filter(l => l.id !== linkId));
  }, []);

  const updateLink = useCallback((linkId, updates) => {
    setLinks(prev => prev.map(l => 
      l.id === linkId ? { ...l, ...updates } : l
    ));
  }, []);

  const updateLinkStatus = useCallback((linkId, status) => {
    setLinks(prev => prev.map(l =>
      l.id === linkId ? { ...l, status } : l
    ));
  }, []);

  // Pin a floating link to a specific version
  const pinLink = useCallback((linkId, side, version) => {
    setLinks(prev => prev.map(l => {
      if (l.id !== linkId) return l;
      return {
        ...l,
        [side]: { ...l[side], version },
      };
    }));
  }, []);

  // Unpin (make floating) a link side
  const unpinLink = useCallback((linkId, side) => {
    setLinks(prev => prev.map(l => {
      if (l.id !== linkId) return l;
      return {
        ...l,
        [side]: { ...l[side], version: null },
      };
    }));
  }, []);

  // Pin ALL floating links (baseline operation)
  const baselineAllLinks = useCallback((nodes) => {
    setLinks(prev => prev.map(l => {
      const updatedLink = { ...l };
      if (l.source.version === null) {
        const sourceNode = nodes.find(n => n.id === l.source.itemId);
        if (sourceNode) {
          updatedLink.source = { ...l.source, version: sourceNode.data?.version || '1.0' };
        }
      }
      if (l.target.version === null) {
        const targetNode = nodes.find(n => n.id === l.target.itemId);
        if (targetNode) {
          updatedLink.target = { ...l.target, version: targetNode.data?.version || '1.0' };
        }
      }
      return updatedLink;
    }));
  }, []);

  // Get all links for a specific node
  const getLinksForNode = useCallback((nodeId) => {
    return links.filter(l => 
      l.source.itemId === nodeId || l.target.itemId === nodeId
    );
  }, [links]);

  // Get incoming links (where node is the target)
  const getIncomingLinks = useCallback((nodeId) => {
    return links.filter(l => l.target.itemId === nodeId);
  }, [links]);

  // Get outgoing links (where node is the source)
  const getOutgoingLinks = useCallback((nodeId) => {
    return links.filter(l => l.source.itemId === nodeId);
  }, [links]);

  // ─────────────────────────────────────────────
  // HEALTH CHECKS / CONSISTENCY
  // ─────────────────────────────────────────────
  const runHealthChecks = useCallback((nodes) => {
    const nodeIds = new Set(nodes.map(n => n.id));
    const nodeVersions = {};
    nodes.forEach(n => { nodeVersions[n.id] = n.data?.version || '1.0'; });
    
    const issues = [];

    links.forEach(link => {
      // Broken: source or target node doesn't exist
      if (!nodeIds.has(link.source.itemId)) {
        issues.push({
          type: 'broken',
          severity: 'critical',
          linkId: link.id,
          message: `Source node ${link.source.itemId} no longer exists`,
          icon: '🔴',
        });
      }
      if (!nodeIds.has(link.target.itemId)) {
        issues.push({
          type: 'broken',
          severity: 'critical',
          linkId: link.id,
          message: `Target node ${link.target.itemId} no longer exists`,
          icon: '🔴',
        });
      }

      // Version drift: pinned to old version
      if (link.source.version && nodeIds.has(link.source.itemId)) {
        const currentVersion = nodeVersions[link.source.itemId];
        if (link.source.version !== currentVersion) {
          issues.push({
            type: 'versionDrift',
            severity: 'warning',
            linkId: link.id,
            message: `Source pinned to v${link.source.version}, current is v${currentVersion}`,
            icon: '🟡',
          });
        }
      }
      if (link.target.version && nodeIds.has(link.target.itemId)) {
        const currentVersion = nodeVersions[link.target.itemId];
        if (link.target.version !== currentVersion) {
          issues.push({
            type: 'versionDrift',
            severity: 'warning',
            linkId: link.id,
            message: `Target pinned to v${link.target.version}, current is v${currentVersion}`,
            icon: '🟡',
          });
        }
      }

      // Self-link
      if (link.source.itemId === link.target.itemId) {
        issues.push({
          type: 'selfLink',
          severity: 'warning',
          linkId: link.id,
          message: `Node links to itself`,
          icon: '🟠',
        });
      }
    });

    // Orphan check: nodes with NO links at all (no edges either)
    // This is called separately as it needs edges too
    
    return issues;
  }, [links]);

  // Find orphan nodes (no requirement links AND no edges)
  const findOrphans = useCallback((nodes, edges) => {
    const linkedNodeIds = new Set();
    links.forEach(l => {
      linkedNodeIds.add(l.source.itemId);
      linkedNodeIds.add(l.target.itemId);
    });
    edges.forEach(e => {
      linkedNodeIds.add(e.source);
      linkedNodeIds.add(e.target);
    });

    return nodes.filter(n => !linkedNodeIds.has(n.id) && !n.data?.isFloatingConnector);
  }, [links]);

  // Find circular dependencies
  const findCircularDeps = useCallback(() => {
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const dfs = (nodeId, path) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const outgoing = links.filter(l => 
        l.source.itemId === nodeId && 
        ['derives', 'refines', 'implements'].includes(l.linkType)
      );

      for (const link of outgoing) {
        const targetId = link.target.itemId;
        if (!visited.has(targetId)) {
          dfs(targetId, [...path]);
        } else if (recursionStack.has(targetId)) {
          cycles.push([...path, targetId]);
        }
      }

      recursionStack.delete(nodeId);
    };

    const allSourceIds = [...new Set(links.map(l => l.source.itemId))];
    allSourceIds.forEach(id => {
      if (!visited.has(id)) dfs(id, []);
    });

    return cycles;
  }, [links]);

  // Coverage analysis: find external/customer reqs missing satisfies links
  const findUncoveredRequirements = useCallback((nodes) => {
    const customerReqs = nodes.filter(n => 
      n.data?.reqType === 'customer' || n.data?.classification === 'need'
    );
    
    return customerReqs.filter(req => {
      const outgoing = links.filter(l => 
        l.source.itemId === req.id && 
        ['satisfies', 'implements', 'derives'].includes(l.linkType)
      );
      return outgoing.length === 0;
    });
  }, [links]);

  // Impact analysis: what gets affected if a node's version changes?
  const getImpactAnalysis = useCallback((nodeId) => {
    const affected = [];
    
    // All links where this node is the target (incoming)
    const incoming = links.filter(l => l.target.itemId === nodeId);
    incoming.forEach(link => {
      affected.push({
        linkId: link.id,
        affectedNodeId: link.source.itemId,
        direction: 'incoming',
        isPinned: link.target.version !== null,
        currentPinnedVersion: link.target.version,
        linkType: link.linkType,
      });
    });

    // All links where this node is the source (outgoing)
    const outgoing = links.filter(l => l.source.itemId === nodeId);
    outgoing.forEach(link => {
      affected.push({
        linkId: link.id,
        affectedNodeId: link.target.itemId,
        direction: 'outgoing',
        isPinned: link.source.version !== null,
        currentPinnedVersion: link.source.version,
        linkType: link.linkType,
      });
    });

    return affected;
  }, [links]);

  return {
    links,
    setLinks,
    addLink,
    removeLink,
    updateLink,
    updateLinkStatus,
    pinLink,
    unpinLink,
    baselineAllLinks,
    getLinksForNode,
    getIncomingLinks,
    getOutgoingLinks,
    runHealthChecks,
    findOrphans,
    findCircularDeps,
    findUncoveredRequirements,
    getImpactAnalysis,
  };
}


// ─────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────

// Link badge (small inline indicator)
export function LinkBadge({ count, status = 'active' }) {
  const s = LINK_STATUSES[status] || LINK_STATUSES.active;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      background: `${s.color}22`,
      border: `1px solid ${s.color}44`,
      borderRadius: '12px',
      fontSize: '11px',
      color: s.color,
      fontWeight: 'bold',
    }}>
      🔗 {count}
    </span>
  );
}

// Single link row display
function LinkRow({ link, nodes, onRemove, onPin, onUnpin, onStatusChange, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const lt = LINK_TYPES[link.linkType] || LINK_TYPES.relates;
  const ls = LINK_STATUSES[link.status] || LINK_STATUSES.active;
  
  const sourceNode = nodes.find(n => n.id === link.source.itemId);
  const targetNode = nodes.find(n => n.id === link.target.itemId);
  
  const sourceLabel = sourceNode?.data?.label || link.source.itemId;
  const targetLabel = targetNode?.data?.label || link.target.itemId;
  const sourceReqId = sourceNode?.data?.reqId || '';
  const targetReqId = targetNode?.data?.reqId || '';
  const sourceCurrentVer = sourceNode?.data?.version || '1.0';
  const targetCurrentVer = targetNode?.data?.version || '1.0';

  return (
    <div style={{
      background: '#1e2a3a',
      borderRadius: '6px',
      border: `1px solid ${lt.color}33`,
      marginBottom: '6px',
      overflow: 'hidden',
    }}>
      {/* Summary row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        <span style={{ color: ls.color }}>{ls.icon}</span>
        <span style={{ color: '#bdc3c7', flex: 1 }}>
          <span style={{ color: '#ecf0f1', fontWeight: 'bold' }}>{sourceReqId || sourceLabel}</span>
          <span style={{ color: lt.color, margin: '0 6px', fontWeight: 'bold' }}>
            {lt.icon} {lt.label}
          </span>
          <span style={{ color: '#ecf0f1', fontWeight: 'bold' }}>{targetReqId || targetLabel}</span>
        </span>
        
        {/* Version indicators */}
        <span style={{
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '3px',
          background: link.source.version ? '#f39c12' : '#27ae60',
          color: 'white',
        }}>
          {link.source.version ? `📌 v${link.source.version}` : '🔄 float'}
        </span>
        <span style={{ fontSize: '10px', color: '#7f8c8d' }}>→</span>
        <span style={{
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '3px',
          background: link.target.version ? '#f39c12' : '#27ae60',
          color: 'white',
        }}>
          {link.target.version ? `📌 v${link.target.version}` : '🔄 float'}
        </span>
        
        <span style={{ fontSize: '10px', color: '#7f8c8d' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: '10px 12px', borderTop: '1px solid #34495e' }}>
          {/* Source details */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', color: '#7f8c8d', marginBottom: '4px' }}>SOURCE</div>
              <div style={{ fontSize: '12px', color: '#ecf0f1' }}>{sourceLabel}</div>
              <div style={{ fontSize: '10px', color: '#3498db' }}>
                {sourceReqId} • Current: v{sourceCurrentVer}
                {link.source.version && link.source.version !== sourceCurrentVer && (
                  <span style={{ color: '#f39c12', marginLeft: '4px' }}>⚠️ pinned to v{link.source.version}</span>
                )}
              </div>
              <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
                {link.source.version ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onUnpin(link.id, 'source'); }}
                    style={miniButtonStyle('#27ae60')}
                  >
                    🔄 Make Floating
                  </button>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); onPin(link.id, 'source', sourceCurrentVer); }}
                    style={miniButtonStyle('#f39c12')}
                  >
                    📌 Pin v{sourceCurrentVer}
                  </button>
                )}
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', color: '#7f8c8d', marginBottom: '4px' }}>TARGET</div>
              <div style={{ fontSize: '12px', color: '#ecf0f1' }}>{targetLabel}</div>
              <div style={{ fontSize: '10px', color: '#3498db' }}>
                {targetReqId} • Current: v{targetCurrentVer}
                {link.target.version && link.target.version !== targetCurrentVer && (
                  <span style={{ color: '#f39c12', marginLeft: '4px' }}>⚠️ pinned to v{link.target.version}</span>
                )}
              </div>
              <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
                {link.target.version ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onUnpin(link.id, 'target'); }}
                    style={miniButtonStyle('#27ae60')}
                  >
                    🔄 Make Floating
                  </button>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); onPin(link.id, 'target', targetCurrentVer); }}
                    style={miniButtonStyle('#f39c12')}
                  >
                    📌 Pin v{targetCurrentVer}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {link.metadata?.notes && (
            <div style={{
              fontSize: '11px',
              color: '#bdc3c7',
              padding: '6px 8px',
              background: '#2c3e50',
              borderRadius: '4px',
              marginBottom: '8px',
            }}>
              📝 {link.metadata.notes}
            </div>
          )}

          {/* Status + Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <select
              value={link.status}
              onChange={(e) => onStatusChange(link.id, e.target.value)}
              style={selectStyle}
            >
              {Object.entries(LINK_STATUSES).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
            
            <select
              value={link.linkType}
              onChange={(e) => onEdit(link.id, { linkType: e.target.value })}
              style={selectStyle}
            >
              {Object.entries(LINK_TYPES).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
            
            <div style={{ flex: 1 }} />
            
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(link.id); }}
              style={miniButtonStyle('#e74c3c')}
            >
              🗑️ Delete
            </button>
          </div>
          
          {/* Timestamps */}
          <div style={{ fontSize: '9px', color: '#555', marginTop: '6px' }}>
            Created: {new Date(link.metadata.createdAt).toLocaleString()} by {link.metadata.createdBy}
            {link.metadata.verifiedAt && (
              <span> • Verified: {new Date(link.metadata.verifiedAt).toLocaleString()} by {link.metadata.verifiedBy}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// CREATE LINK MODAL
// ─────────────────────────────────────────────────
export function CreateLinkModal({ nodes, onClose, onCreate, preselectedSourceId = null, user = 'unknown' }) {
  const [sourceId, setSourceId] = useState(preselectedSourceId || '');
  const [targetId, setTargetId] = useState('');
  const [linkType, setLinkType] = useState('satisfies');
  const [sourceVersion, setSourceVersion] = useState('floating');
  const [targetVersion, setTargetVersion] = useState('floating');
  const [notes, setNotes] = useState('');
  const [searchSource, setSearchSource] = useState('');
  const [searchTarget, setSearchTarget] = useState('');

  const filteredSourceNodes = nodes.filter(n => {
    if (!searchSource) return true;
    const s = searchSource.toLowerCase();
    return (n.data?.label || '').toLowerCase().includes(s) ||
           (n.data?.reqId || '').toLowerCase().includes(s);
  });

  const filteredTargetNodes = nodes.filter(n => {
    if (n.id === sourceId) return false; // Can't link to self
    if (!searchTarget) return true;
    const s = searchTarget.toLowerCase();
    return (n.data?.label || '').toLowerCase().includes(s) ||
           (n.data?.reqId || '').toLowerCase().includes(s);
  });

  const handleCreate = () => {
    if (!sourceId || !targetId) return;
    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);
    
    onCreate({
      sourceItemId: sourceId,
      sourceVersion: sourceVersion === 'floating' ? null : (sourceNode?.data?.version || '1.0'),
      targetItemId: targetId,
      targetVersion: targetVersion === 'floating' ? null : (targetNode?.data?.version || '1.0'),
      linkType,
      notes,
      createdBy: user,
    });
    onClose();
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, width: '600px' }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <span>🔗 Create Requirement Link</span>
          <button onClick={onClose} style={closeButtonStyle}>×</button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Source */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Source (what ställer kravet)</label>
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchSource}
              onChange={e => setSearchSource(e.target.value)}
              style={inputStyle}
            />
            <select
              value={sourceId}
              onChange={e => setSourceId(e.target.value)}
              style={{ ...inputStyle, marginTop: '4px' }}
              size={4}
            >
              <option value="">— Select source —</option>
              {filteredSourceNodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.data?.reqId || n.id} — {n.data?.label} (v{n.data?.version || '1.0'})
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <label style={{ fontSize: '11px', color: '#bdc3c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="radio"
                  name="sourceVer"
                  checked={sourceVersion === 'floating'}
                  onChange={() => setSourceVersion('floating')}
                /> 🔄 Floating
              </label>
              <label style={{ fontSize: '11px', color: '#bdc3c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="radio"
                  name="sourceVer"
                  checked={sourceVersion === 'pinned'}
                  onChange={() => setSourceVersion('pinned')}
                /> 📌 Pinned to current
              </label>
            </div>
          </div>

          {/* Link type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Link Type</label>
            <select value={linkType} onChange={e => setLinkType(e.target.value)} style={inputStyle}>
              {Object.entries(LINK_TYPES).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label} — {val.description}</option>
              ))}
            </select>
          </div>

          {/* Target */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Target (det som uppfyller kravet)</label>
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchTarget}
              onChange={e => setSearchTarget(e.target.value)}
              style={inputStyle}
            />
            <select
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              style={{ ...inputStyle, marginTop: '4px' }}
              size={4}
            >
              <option value="">— Select target —</option>
              {filteredTargetNodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.data?.reqId || n.id} — {n.data?.label} (v{n.data?.version || '1.0'})
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <label style={{ fontSize: '11px', color: '#bdc3c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="radio"
                  name="targetVer"
                  checked={targetVersion === 'floating'}
                  onChange={() => setTargetVersion('floating')}
                /> 🔄 Floating
              </label>
              <label style={{ fontSize: '11px', color: '#bdc3c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="radio"
                  name="targetVer"
                  checked={targetVersion === 'pinned'}
                  onChange={() => setTargetVersion('pinned')}
                /> 📌 Pinned to current
              </label>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Why does this link exist?"
              style={{ ...inputStyle, height: '60px', resize: 'vertical' }}
            />
          </div>

          {/* Preview */}
          {sourceId && targetId && (
            <div style={{
              padding: '10px',
              background: '#34495e',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '12px',
              textAlign: 'center',
            }}>
              <span style={{ color: '#ecf0f1', fontWeight: 'bold' }}>
                {nodes.find(n => n.id === sourceId)?.data?.reqId || sourceId}
              </span>
              <span style={{ color: LINK_TYPES[linkType].color, margin: '0 10px', fontWeight: 'bold' }}>
                {LINK_TYPES[linkType].icon} {LINK_TYPES[linkType].label}
              </span>
              <span style={{ color: '#ecf0f1', fontWeight: 'bold' }}>
                {nodes.find(n => n.id === targetId)?.data?.reqId || targetId}
              </span>
              <div style={{ color: '#7f8c8d', fontSize: '10px', marginTop: '4px' }}>
                {sourceVersion === 'floating' ? '🔄 float' : '📌 pinned'} → {targetVersion === 'floating' ? '🔄 float' : '📌 pinned'}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ ...buttonStyle, background: '#34495e' }}>Cancel</button>
            <button
              onClick={handleCreate}
              disabled={!sourceId || !targetId}
              style={{
                ...buttonStyle,
                background: sourceId && targetId ? '#27ae60' : '#555',
                cursor: sourceId && targetId ? 'pointer' : 'not-allowed',
              }}
            >
              🔗 Create Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────
// LINK MANAGER PANEL (full list + health)
// ─────────────────────────────────────────────────
export function LinkManagerPanel({
  links,
  nodes,
  edges,
  onClose,
  onRemoveLink,
  onPinLink,
  onUnpinLink,
  onUpdateLinkStatus,
  onUpdateLink,
  onCreateLink,
  onBaselineAll,
  healthIssues = [],
  orphanNodes = [],
  uncoveredReqs = [],
  circularDeps = [],
}) {
  const [tab, setTab] = useState('links'); // links | health | coverage
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchText, setSearchText] = useState('');

  const filteredLinks = links.filter(l => {
    if (filterType !== 'all' && l.linkType !== filterType) return false;
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    if (searchText) {
      const s = searchText.toLowerCase();
      const sourceNode = nodes.find(n => n.id === l.source.itemId);
      const targetNode = nodes.find(n => n.id === l.target.itemId);
      const inSource = (sourceNode?.data?.label || '').toLowerCase().includes(s) ||
                       (sourceNode?.data?.reqId || '').toLowerCase().includes(s);
      const inTarget = (targetNode?.data?.label || '').toLowerCase().includes(s) ||
                       (targetNode?.data?.reqId || '').toLowerCase().includes(s);
      if (!inSource && !inTarget) return false;
    }
    return true;
  });

  // Stats
  const stats = {
    total: links.length,
    active: links.filter(l => l.status === 'active').length,
    needsReview: links.filter(l => l.status === 'needsReview').length,
    floating: links.filter(l => l.source.version === null || l.target.version === null).length,
    pinned: links.filter(l => l.source.version !== null && l.target.version !== null).length,
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, width: '800px', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <span>🔗 Requirement Link Manager</span>
          <button onClick={onClose} style={closeButtonStyle}>×</button>
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '10px 20px',
          background: '#1a2634',
          borderBottom: '1px solid #34495e',
          flexWrap: 'wrap',
        }}>
          {[
            { label: 'Total', value: stats.total, color: '#3498db' },
            { label: 'Active', value: stats.active, color: '#27ae60' },
            { label: 'Needs Review', value: stats.needsReview, color: '#f39c12' },
            { label: 'Floating', value: stats.floating, color: '#27ae60' },
            { label: 'Pinned', value: stats.pinned, color: '#f39c12' },
            { label: 'Health Issues', value: healthIssues.length, color: healthIssues.length > 0 ? '#e74c3c' : '#27ae60' },
          ].map(s => (
            <div key={s.label} style={{
              fontSize: '11px',
              color: '#7f8c8d',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: s.color }}>{s.value}</div>
              {s.label}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #34495e' }}>
          {[
            { key: 'links', label: `🔗 Links (${links.length})` },
            { key: 'health', label: `🏥 Health (${healthIssues.length})` },
            { key: 'coverage', label: `📊 Coverage` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 20px',
                background: tab === t.key ? '#3498db' : 'transparent',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: tab === t.key ? 'bold' : 'normal',
              }}
            >
              {t.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={onCreateLink} style={{ ...miniButtonStyle('#27ae60'), margin: '6px 10px' }}>
            ➕ New Link
          </button>
          <button onClick={onBaselineAll} style={{ ...miniButtonStyle('#f39c12'), margin: '6px 10px' }}>
            📌 Baseline All
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '15px 20px', overflowY: 'auto', maxHeight: 'calc(85vh - 200px)' }}>
          {tab === 'links' && (
            <>
              {/* Filters */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="🔍 Search..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ ...inputStyle, flex: 1, minWidth: '150px' }}
                />
                <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selectStyle}>
                  <option value="all">All Types</option>
                  {Object.entries(LINK_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
                  <option value="all">All Statuses</option>
                  {Object.entries(LINK_STATUSES).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>

              {filteredLinks.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#7f8c8d', padding: '40px' }}>
                  No requirement links found. Click "New Link" to create one.
                </div>
              ) : (
                filteredLinks.map(link => (
                  <LinkRow
                    key={link.id}
                    link={link}
                    nodes={nodes}
                    onRemove={onRemoveLink}
                    onPin={onPinLink}
                    onUnpin={onUnpinLink}
                    onStatusChange={onUpdateLinkStatus}
                    onEdit={(id, updates) => onUpdateLink(id, updates)}
                  />
                ))
              )}
            </>
          )}

          {tab === 'health' && (
            <>
              {healthIssues.length === 0 && circularDeps.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#27ae60', padding: '40px' }}>
                  ✅ No issues found — all links are healthy!
                </div>
              ) : (
                <>
                  {healthIssues.map((issue, i) => (
                    <div key={i} style={{
                      padding: '10px 12px',
                      background: '#1e2a3a',
                      borderRadius: '6px',
                      borderLeft: `3px solid ${issue.severity === 'critical' ? '#e74c3c' : '#f39c12'}`,
                      marginBottom: '6px',
                      fontSize: '12px',
                      color: '#bdc3c7',
                    }}>
                      {issue.icon} <strong>{issue.type}</strong>: {issue.message}
                    </div>
                  ))}
                  {circularDeps.length > 0 && (
                    <div style={{
                      padding: '10px 12px',
                      background: '#1e2a3a',
                      borderRadius: '6px',
                      borderLeft: '3px solid #e74c3c',
                      marginBottom: '6px',
                      fontSize: '12px',
                      color: '#bdc3c7',
                    }}>
                      🔴 <strong>Circular Dependencies</strong>: {circularDeps.length} cycle(s) detected
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === 'coverage' && (
            <>
              {/* Orphan nodes */}
              <h4 style={{ color: '#ecf0f1', fontSize: '13px', marginBottom: '8px' }}>
                🏝️ Orphan Nodes ({orphanNodes.length})
              </h4>
              {orphanNodes.length === 0 ? (
                <div style={{ color: '#27ae60', fontSize: '12px', marginBottom: '20px' }}>
                  ✅ All nodes are connected
                </div>
              ) : (
                <div style={{ marginBottom: '20px' }}>
                  {orphanNodes.slice(0, 20).map(n => (
                    <div key={n.id} style={{
                      padding: '6px 10px',
                      background: '#1e2a3a',
                      borderRadius: '4px',
                      marginBottom: '3px',
                      fontSize: '11px',
                      color: '#bdc3c7',
                    }}>
                      {n.data?.reqId || n.id} — {n.data?.label}
                    </div>
                  ))}
                  {orphanNodes.length > 20 && (
                    <div style={{ color: '#7f8c8d', fontSize: '11px' }}>...and {orphanNodes.length - 20} more</div>
                  )}
                </div>
              )}

              {/* Uncovered customer requirements */}
              <h4 style={{ color: '#ecf0f1', fontSize: '13px', marginBottom: '8px' }}>
                ⚠️ Uncovered Customer Requirements ({uncoveredReqs.length})
              </h4>
              {uncoveredReqs.length === 0 ? (
                <div style={{ color: '#27ae60', fontSize: '12px' }}>
                  ✅ All customer requirements have at least one link
                </div>
              ) : (
                uncoveredReqs.map(n => (
                  <div key={n.id} style={{
                    padding: '6px 10px',
                    background: '#1e2a3a',
                    borderLeft: '3px solid #e74c3c',
                    borderRadius: '4px',
                    marginBottom: '3px',
                    fontSize: '11px',
                    color: '#bdc3c7',
                  }}>
                    {n.data?.reqId || n.id} — {n.data?.label}
                    <span style={{ color: '#e74c3c', marginLeft: '8px' }}>No satisfies/implements/derives link</span>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// NODE LINK SECTION (inline in FloatingPanel / DocView)
// ─────────────────────────────────────────────────
export function NodeLinkSection({ nodeId, links, nodes, onCreateLink, onRemoveLink, onPinLink, onUnpinLink, onUpdateLinkStatus, onUpdateLink }) {
  const nodeLinks = links.filter(l => l.source.itemId === nodeId || l.target.itemId === nodeId);
  const incoming = nodeLinks.filter(l => l.target.itemId === nodeId);
  const outgoing = nodeLinks.filter(l => l.source.itemId === nodeId);

  if (nodeLinks.length === 0) {
    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px' }}>
          No requirement links. 
          <button
            onClick={() => onCreateLink(nodeId)}
            style={{ ...miniButtonStyle('#3498db'), marginLeft: '8px' }}
          >
            ➕ Add Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <span style={{ fontSize: '11px', color: '#bdc3c7', fontWeight: 'bold', textTransform: 'uppercase' }}>
          🔗 Requirement Links ({nodeLinks.length})
        </span>
        <button
          onClick={() => onCreateLink(nodeId)}
          style={miniButtonStyle('#3498db')}
        >
          ➕
        </button>
      </div>

      {incoming.length > 0 && (
        <div style={{ marginBottom: '6px' }}>
          <div style={{ fontSize: '10px', color: '#7f8c8d', marginBottom: '4px' }}>⬇️ INCOMING ({incoming.length})</div>
          {incoming.map(link => (
            <LinkRow
              key={link.id}
              link={link}
              nodes={nodes}
              onRemove={onRemoveLink}
              onPin={onPinLink}
              onUnpin={onUnpinLink}
              onStatusChange={onUpdateLinkStatus}
              onEdit={(id, updates) => onUpdateLink(id, updates)}
            />
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <div style={{ fontSize: '10px', color: '#7f8c8d', marginBottom: '4px' }}>⬆️ OUTGOING ({outgoing.length})</div>
          {outgoing.map(link => (
            <LinkRow
              key={link.id}
              link={link}
              nodes={nodes}
              onRemove={onRemoveLink}
              onPin={onPinLink}
              onUnpin={onUnpinLink}
              onStatusChange={onUpdateLinkStatus}
              onEdit={(id, updates) => onUpdateLink(id, updates)}
            />
          ))}
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────
// SHARED STYLES
// ─────────────────────────────────────────────────
const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 5000,
};

const modalStyle = {
  background: '#2c3e50',
  borderRadius: '10px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  color: 'white',
  overflow: 'hidden',
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 20px',
  background: '#34495e',
  fontWeight: 'bold',
  fontSize: '14px',
};

const closeButtonStyle = {
  background: 'transparent',
  border: 'none',
  color: 'white',
  fontSize: '20px',
  cursor: 'pointer',
};

const labelStyle = {
  display: 'block',
  marginBottom: '4px',
  fontSize: '11px',
  color: '#bdc3c7',
  textTransform: 'uppercase',
  fontWeight: 'bold',
};

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  background: '#34495e',
  border: '1px solid #4a5f7f',
  borderRadius: '4px',
  color: 'white',
  fontSize: '12px',
  boxSizing: 'border-box',
};

const selectStyle = {
  padding: '6px 8px',
  background: '#34495e',
  border: '1px solid #4a5f7f',
  borderRadius: '4px',
  color: 'white',
  fontSize: '11px',
  cursor: 'pointer',
};

const buttonStyle = {
  padding: '8px 16px',
  border: 'none',
  borderRadius: '6px',
  color: 'white',
  fontSize: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
};

function miniButtonStyle(color) {
  return {
    padding: '3px 8px',
    background: `${color}33`,
    border: `1px solid ${color}66`,
    borderRadius: '4px',
    color: color,
    fontSize: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
  };
}
