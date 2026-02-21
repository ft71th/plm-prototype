import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Port } from '../../types';
import React, { useState } from 'react';
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES, ISSUE_STATUSES } from '../../constants/issues';
import VoiceTextArea from '../shared/VoiceTextArea';

function IssuePanelModal({ node, issues, onClose, onAddIssue, onUpdateIssue, onDeleteIssue }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIssue, setEditingIssue] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    status: 'open',
    type: 'bug',
    assignee: '',
    dueDate: ''
  });

  const nodeIssues = issues[node.id] || [];

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      severity: 'medium',
      status: 'open',
      type: 'bug',
      assignee: '',
      dueDate: ''
    });
  };

  const handleAdd = () => {
    if (formData.title.trim()) {
      onAddIssue(node.id, formData);
      resetForm();
      setIsAdding(false);
    }
  };

  const handleUpdate = () => {
    if (editingIssue && formData.title.trim()) {
      onUpdateIssue(node.id, editingIssue.id, formData);
      resetForm();
      setEditingIssue(null);
    }
  };

  const startEdit = (issue) => {
    setEditingIssue(issue);
    setFormData({
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      status: issue.status,
      type: issue.type,
      assignee: issue.assignee,
      dueDate: issue.dueDate
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingIssue(null);
    setIsAdding(false);
    resetForm();
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#c0392b';
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#e74c3c';
      case 'in-progress': return '#3498db';
      case 'resolved': return '#27ae60';
      case 'closed': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'bug': return '🐛';
      case 'enhancement': return '✨';
      case 'question': return '❓';
      case 'task': return '📋';
      default: return '📌';
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px',
    background: 'var(--nl-bg-input, #34495e)',
    border: '1px solid var(--nl-border, #4a5f7f)',
    borderRadius: '4px',
    color: 'white',
    fontSize: '13px'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '4px',
    fontSize: '11px',
    color: 'var(--nl-text-secondary, #bdc3c7)',
    textTransform: 'uppercase'
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000
    }}>
      <div style={{
        width: '600px',
        maxHeight: '80vh',
        background: 'var(--nl-bg-panel, #2c3e50)',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'var(--nl-bg-input, #34495e)',
          borderBottom: '1px solid #4a5f7f',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>
              🐛 Issues for: {node.data.label}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--nl-text-secondary, #bdc3c7)', marginTop: '2px' }}>
              {node.data.reqId} • {nodeIssues.length} issue{nodeIssues.length !== 1 ? 's' : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 8px'
            }}
          >×</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {/* Issue List */}
          {nodeIssues.length === 0 && !isAdding && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#7f8c8d'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
              <div>No issues reported for this item</div>
            </div>
          )}

          {nodeIssues.map(issue => (
            <div 
              key={issue.id}
              style={{
                background: editingIssue?.id === issue.id ? '#3d566e' : '#34495e',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '10px',
                border: editingIssue?.id === issue.id ? '2px solid #3498db' : '1px solid #4a5f7f'
              }}
            >
              {editingIssue?.id === issue.id ? (
                // Edit Mode
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e: any) => setFormData({ ...formData, title: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                      style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Severity</label>
                      <select
                        value={formData.severity}
                        onChange={(e: any) => setFormData({ ...formData, severity: e.target.value })}
                        style={selectStyle}
                      >
                        <option value="critical">🔴 Critical</option>
                        <option value="high">🟠 High</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="low">🟢 Low</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Status</label>
                      <select
                        value={formData.status}
                        onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                        style={selectStyle}
                      >
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Type</label>
                      <select
                        value={formData.type}
                        onChange={(e: any) => setFormData({ ...formData, type: e.target.value })}
                        style={selectStyle}
                      >
                        <option value="bug">🐛 Bug</option>
                        <option value="enhancement">✨ Enhancement</option>
                        <option value="question">❓ Question</option>
                        <option value="task">📋 Task</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Assignee</label>
                      <input
                        type="text"
                        value={formData.assignee}
                        onChange={(e: any) => setFormData({ ...formData, assignee: e.target.value })}
                        placeholder="Enter name..."
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Due Date</label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e: any) => setFormData({ ...formData, dueDate: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={cancelEdit}
                      style={{
                        padding: '8px 16px',
                        background: '#7f8c8d',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >Cancel</button>
                    <button
                      onClick={handleUpdate}
                      style={{
                        padding: '8px 16px',
                        background: '#3498db',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >Save Changes</button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{getTypeIcon(issue.type)}</span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: 'white',
                        textDecoration: issue.status === 'closed' ? 'line-through' : 'none',
                        opacity: issue.status === 'closed' ? 0.6 : 1
                      }}>
                        {issue.title}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        color: '#7f8c8d',
                        fontFamily: 'monospace'
                      }}>
                        {issue.id}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => startEdit(issue)}
                        style={{
                          background: '#3498db',
                          border: 'none',
                          borderRadius: '4px',
                          color: 'white',
                          padding: '4px 8px',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >Edit</button>
                      <button
                        onClick={() => onDeleteIssue(node.id, issue.id)}
                        style={{
                          background: '#e74c3c',
                          border: 'none',
                          borderRadius: '4px',
                          color: 'white',
                          padding: '4px 8px',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >Delete</button>
                    </div>
                  </div>
                  
                  {issue.description && (
                    <div style={{ color: 'var(--nl-text-secondary, #bdc3c7)', fontSize: '13px', marginBottom: '8px' }}>
                      {issue.description}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      background: getSeverityColor(issue.severity),
                      color: 'white'
                    }}>
                      {issue.severity.toUpperCase()}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: getStatusColor(issue.status),
                      color: 'white'
                    }}>
                      {issue.status.replace('-', ' ').toUpperCase()}
                    </span>
                    {issue.assignee && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        background: '#8e44ad',
                        color: 'white'
                      }}>
                        👤 {issue.assignee}
                      </span>
                    )}
                    {issue.dueDate && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        background: 'var(--nl-bg-panel, #2c3e50)',
                        color: 'var(--nl-text-secondary, #bdc3c7)'
                      }}>
                        📅 {issue.dueDate}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Add Issue Form */}
          {isAdding && (
            <div style={{
              background: 'var(--nl-bg-input, #34495e)',
              borderRadius: '8px',
              padding: '16px',
              border: '2px solid #27ae60'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: 'white' }}>
                ➕ New Issue
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e: any) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief issue title..."
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed description of the issue..."
                    style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>Severity</label>
                    <select
                      value={formData.severity}
                      onChange={(e: any) => setFormData({ ...formData, severity: e.target.value })}
                      style={selectStyle}
                    >
                      <option value="critical">🔴 Critical</option>
                      <option value="high">🟠 High</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select
                      value={formData.type}
                      onChange={(e: any) => setFormData({ ...formData, type: e.target.value })}
                      style={selectStyle}
                    >
                      <option value="bug">🐛 Bug</option>
                      <option value="enhancement">✨ Enhancement</option>
                      <option value="question">❓ Question</option>
                      <option value="task">📋 Task</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Assignee</label>
                    <input
                      type="text"
                      value={formData.assignee}
                      onChange={(e: any) => setFormData({ ...formData, assignee: e.target.value })}
                      placeholder="Name..."
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={cancelEdit}
                    style={{
                      padding: '8px 16px',
                      background: '#7f8c8d',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >Cancel</button>
                  <button
                    onClick={handleAdd}
                    disabled={!formData.title.trim()}
                    style={{
                      padding: '8px 16px',
                      background: formData.title.trim() ? '#27ae60' : '#7f8c8d',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: formData.title.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >Create Issue</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          background: 'var(--nl-bg-input, #34495e)',
          borderTop: '1px solid #4a5f7f',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={() => { setIsAdding(true); setEditingIssue(null); resetForm(); }}
            disabled={isAdding || editingIssue}
            style={{
              padding: '10px 20px',
              background: isAdding || editingIssue ? '#7f8c8d' : '#27ae60',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: isAdding || editingIssue ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            ➕ Add Issue
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'var(--nl-bg-input, #34495e)',
              border: '1px solid var(--nl-border, #4a5f7f)',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// New Object Modal

export default IssuePanelModal;
