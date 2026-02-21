import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Port } from '../../types';
import React, { useState } from 'react';
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES } from '../../constants/issues';

function CreateIssueModal({ nodeId, nodeName, onClose, onCreate }: any) {
  const [issue, setIssue] = useState({
    title: '',
    description: '',
    category: 'bug',
    priority: 'medium',
    status: 'open',
    rootCause: '',
    solution: '',
    impact: '',
    assignee: '',
    dueDate: '',
  });

  const handleCreate = () => {
    if (!issue.title.trim()) {
      alert('Please enter an issue title');
      return;
    }
    onCreate({
      ...issue,
      id: `ISS-${Date.now().toString(36).toUpperCase()}`,
      nodeId: nodeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000,
    }}>
      <div style={{
        backgroundColor: '#2c3e50',
        borderRadius: '12px',
        padding: '30px',
        width: '550px',
        maxHeight: '85vh',
        overflow: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      }}>
        <h2 style={{ color: '#fff', marginTop: 0, marginBottom: '10px', fontSize: '20px' }}>
          🐛 Create New Issue
        </h2>
        <p style={{ color: '#7f8c8d', marginBottom: '20px', fontSize: '13px' }}>
          Creating issue for: <strong style={{ color: '#3498db' }}>{nodeName}</strong>
        </p>

        {/* Title */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', color: 'var(--nl-text-secondary, #bdc3c7)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>
            Issue Title *
          </label>
          <input
            type="text"
            value={issue.title}
            onChange={(e: any) => setIssue({ ...issue, title: e.target.value })}
            placeholder="Brief description of the issue"
            autoFocus
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#34495e',
              color: '#fff',
              border: '1px solid var(--nl-border, #4a5f7f)',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Category & Priority */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: 'var(--nl-text-secondary, #bdc3c7)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>
              Category
            </label>
            <select
              value={issue.category}
              onChange={(e: any) => setIssue({ ...issue, category: e.target.value })}
              style={{ width: '100%', padding: '12px', backgroundColor: '#34495e', color: '#fff', border: '1px solid var(--nl-border, #4a5f7f)', borderRadius: '6px' }}
            >
              {Object.entries(ISSUE_CATEGORIES).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: 'var(--nl-text-secondary, #bdc3c7)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>
              Priority
            </label>
            <select
              value={issue.priority}
              onChange={(e: any) => setIssue({ ...issue, priority: e.target.value })}
              style={{ width: '100%', padding: '12px', backgroundColor: '#34495e', color: '#fff', border: '1px solid var(--nl-border, #4a5f7f)', borderRadius: '6px' }}
            >
              {Object.entries(ISSUE_PRIORITIES).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', color: 'var(--nl-text-secondary, #bdc3c7)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>
            Description
          </label>
          <textarea
            value={issue.description}
            onChange={(e: any) => setIssue({ ...issue, description: e.target.value })}
            placeholder="Detailed description of the issue..."
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '12px',
              backgroundColor: '#34495e',
              color: '#fff',
              border: '1px solid var(--nl-border, #4a5f7f)',
              borderRadius: '6px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Impact */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', color: 'var(--nl-text-secondary, #bdc3c7)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>
            ⚠️ Impact Assessment
          </label>
          <textarea
            value={issue.impact}
            onChange={(e: any) => setIssue({ ...issue, impact: e.target.value })}
            placeholder="What is affected by this issue?"
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '12px',
              backgroundColor: '#34495e',
              color: '#fff',
              border: '1px solid var(--nl-border, #4a5f7f)',
              borderRadius: '6px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Assignee & Due Date */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: 'var(--nl-text-secondary, #bdc3c7)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>
              Assignee
            </label>
            <input
              type="text"
              value={issue.assignee}
              onChange={(e: any) => setIssue({ ...issue, assignee: e.target.value })}
              placeholder="Who should fix this?"
              style={{ width: '100%', padding: '12px', backgroundColor: '#34495e', color: '#fff', border: '1px solid var(--nl-border, #4a5f7f)', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: 'var(--nl-text-secondary, #bdc3c7)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>
              Due Date
            </label>
            <input
              type="date"
              value={issue.dueDate}
              onChange={(e: any) => setIssue({ ...issue, dueDate: e.target.value })}
              style={{ width: '100%', padding: '12px', backgroundColor: '#34495e', color: '#fff', border: '1px solid var(--nl-border, #4a5f7f)', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '12px 24px', backgroundColor: '#7f8c8d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!issue.title.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: issue.title.trim() ? '#e74c3c' : '#7f8c8d',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: issue.title.trim() ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
            }}
          >
            🐛 Create Issue
          </button>
        </div>
      </div>
    </div>
  );
}

// Issue Manager Modal - View all issues

export default CreateIssueModal;
