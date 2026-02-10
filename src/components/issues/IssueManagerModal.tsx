import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Port } from '../../types';
import React, { useState } from 'react';
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES, ISSUE_STATUSES } from '../../constants/issues';

function IssueManagerModal({ issues, nodes, onClose, onIssueClick, onUpdateIssue, onDeleteIssue }: any) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [searchTerm, setSearchTerm] = useState('');

  const getNodeName = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.data?.label || node?.data?.reqId || nodeId;
  };

  // Flatten issues from all nodes
  const allIssues = Object.entries(issues).flatMap(([nodeId, nodeIssues]) => 
    (nodeIssues || []).map(issue => ({ ...issue, nodeId }))
  );

  const filteredIssues = allIssues
    .filter(issue => {
      if (filter === 'all') return true;
      if (filter === 'open') return !['resolved', 'closed'].includes(issue.status);
      if (filter === 'resolved') return issue.status === 'resolved';
      if (filter === 'closed') return issue.status === 'closed';
      return issue.priority === filter || issue.category === filter;
    })
    .filter(issue => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        issue.title?.toLowerCase().includes(search) ||
        issue.description?.toLowerCase().includes(search) ||
        issue.id?.toLowerCase().includes(search) ||
        getNodeName(issue.nodeId).toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      }
      if (sortBy === 'date') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'status') {
        const statusOrder = { open: 0, investigating: 1, inProgress: 2, resolved: 3, closed: 4 };
        return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      }
      return 0;
    });

  const stats = {
    total: allIssues.length,
    open: allIssues.filter(i => i.status === 'open').length,
    inProgress: allIssues.filter(i => i.status === 'investigating' || i.status === 'inProgress').length,
    resolved: allIssues.filter(i => i.status === 'resolved').length,
    critical: allIssues.filter(i => i.priority === 'critical' && i.status !== 'closed').length,
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000,
    }}>
      <div style={{
        backgroundColor: '#1a252f',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '1200px',
        height: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 50px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 25px', borderBottom: '1px solid #34495e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '22px' }}>🐛 Issue Manager</h2>
            <p style={{ margin: '5px 0 0', color: '#7f8c8d', fontSize: '13px' }}>Track and manage all issues across your project</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#95a5a6', fontSize: '28px', cursor: 'pointer' }}>×</button>
        </div>

        {/* Stats Bar */}
        <div style={{ display: 'flex', gap: '15px', padding: '15px 25px', backgroundColor: '#2c3e50', borderBottom: '1px solid #34495e' }}>
          {[
            { label: 'Total', value: stats.total, color: '#fff' },
            { label: 'Open', value: stats.open, color: '#e74c3c' },
            { label: 'In Progress', value: stats.inProgress, color: '#3498db' },
            { label: 'Resolved', value: stats.resolved, color: '#27ae60' },
          ].map(stat => (
            <div key={stat.label} style={{ padding: '10px 20px', backgroundColor: '#34495e', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: '#7f8c8d' }}>{stat.label}</div>
            </div>
          ))}
          {stats.critical > 0 && (
            <div style={{ padding: '10px 20px', backgroundColor: '#e74c3c', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>{stats.critical}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>Critical!</div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '15px', padding: '15px 25px', backgroundColor: '#2c3e50', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Search issues..."
            value={searchTerm}
            onChange={(e: any) => setSearchTerm(e.target.value)}
            style={{ flex: 1, padding: '10px 15px', backgroundColor: '#34495e', color: '#fff', border: '1px solid #4a5f7f', borderRadius: '6px' }}
          />
          <select value={filter} onChange={(e: any) => setFilter(e.target.value)} style={{ padding: '10px 15px', backgroundColor: '#34495e', color: '#fff', border: '1px solid #4a5f7f', borderRadius: '6px' }}>
            <option value="all">All Issues</option>
            <option value="open">Open Only</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High Priority</option>
          </select>
          <select value={sortBy} onChange={(e: any) => setSortBy(e.target.value)} style={{ padding: '10px 15px', backgroundColor: '#34495e', color: '#fff', border: '1px solid #4a5f7f', borderRadius: '6px' }}>
            <option value="priority">Sort by Priority</option>
            <option value="date">Sort by Date</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>

        {/* Issue List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 25px' }}>
          {filteredIssues.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#7f8c8d' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎉</div>
              <div style={{ fontSize: '18px' }}>No issues found</div>
              <div style={{ fontSize: '13px', marginTop: '10px' }}>
                {allIssues.length === 0 ? 'Create issues from the node panel' : 'Try adjusting your filters'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredIssues.map(issue => (
                <div
                  key={issue.id}
                  onClick={() => onIssueClick && onIssueClick(issue)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '15px 20px',
                    backgroundColor: '#2c3e50',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    borderLeft: `4px solid ${ISSUE_PRIORITIES[issue.priority]?.color || '#95a5a6'}`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '8px',
                    backgroundColor: ISSUE_PRIORITIES[issue.priority]?.color || '#95a5a6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: '15px', fontSize: '20px',
                  }}>
                    {ISSUE_CATEGORIES[issue.category]?.icon || '📌'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{issue.title}</span>
                      <span style={{
                        fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                        backgroundColor: ISSUE_STATUSES[issue.status]?.color || '#95a5a6', color: '#fff',
                      }}>
                        {ISSUE_STATUSES[issue.status]?.label || issue.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '12px', color: '#7f8c8d' }}>
                      <span>📍 {getNodeName(issue.nodeId)}</span>
                      <span>#{issue.id}</span>
                      {issue.assignee && <span>👤 {issue.assignee}</span>}
                    </div>
                  </div>
                  <button
                    onClick={(e: any) => {
                      e.stopPropagation();
                      const newStatus = issue.status === 'open' ? 'inProgress' : 
                                       issue.status === 'inProgress' ? 'resolved' : issue.status;
                      onUpdateIssue && onUpdateIssue({ ...issue, status: newStatus, updatedAt: new Date().toISOString() });
                    }}
                    style={{ padding: '6px 12px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                    title="Advance status"
                  >
                    →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IssueManagerModal;
