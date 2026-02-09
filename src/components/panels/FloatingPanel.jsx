import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RELATIONSHIP_TYPES } from '../../constants/relationships';
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES, ISSUE_STATUSES } from '../../constants/issues';
import PortEditor from './PortEditor';
import VoiceTextArea from '../shared/VoiceTextArea';
import { NodeLinkSection } from '../../RequirementLinks';

function FloatingPanel({ 
  node, onClose, onUpdate, initialPosition, hardwareTypes, onManageTypes, requirementLinks, nodes, 
  onCreateLink, onRemoveLink, onPinLink, onUnpinLink, onUpdateLinkStatus, onUpdateLink,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState(initialPosition);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const isEditable = node.data.state !== 'frozen' && node.data.state !== 'released';

  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  {/* Requirement Links Section */}
  <div style={{ marginTop: '15px', borderTop: '1px solid #34495e', paddingTop: '10px' }}>
    <NodeLinkSection
      nodeId={node.id}
      links={requirementLinks}
      nodes={nodes}
      onCreateLink={onCreateLink}
      onRemoveLink={onRemoveLink}
      onPinLink={onPinLink}
      onUnpinLink={onUnpinLink}
      onUpdateLinkStatus={onUpdateLinkStatus}
      onUpdateLink={onUpdateLink}
    />
  </div>

const handleMouseDown = (e) => {
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.tagName === 'SELECT' ||
        e.target.tagName === 'BUTTON') {
      return;
    }

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdate(node.id, 'attachment', event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    onUpdate(node.id, 'attachment', null);
  };

console.log('Node itemType:', node.data.itemType);

return (
    <div
      style={{
        position: 'fixed',
        left: Math.min(position.x, window.innerWidth - 380) + 'px',
        top: '20px',
        bottom: '20px',
        width: '360px',
        background: '#2c3e50',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 2000,
        color: 'white',
        userSelect: isDragging ? 'none' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div 
        style={{
          padding: '12px 15px',
          borderBottom: '2px solid #34495e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#34495e',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>✋</span>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
            Edit {node.data.itemType === 'system' ? 'System' : 
                  node.data.itemType === 'subsystem' ? 'Sub-System' : 
                  node.data.itemType === 'function' ? 'Function' :
                  node.data.itemType === 'testcase' ? 'Test Case' :
                  node.data.itemType === 'parameter' ? 'Parameter' :
                  node.data.itemType === 'hardware' ? 'Hardware' :
                  node.data.itemType === 'usecase' ? 'Use Case' :
                  node.data.itemType === 'actor' ? 'Actor' : 'Requirement'}
          </span>
          {!isEditable && <span style={{ fontSize: '12px', color: '#f39c12' }}>🔒 Read-Only</span>}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 6px',
            lineHeight: '1'
          }}   >
        ×
        </button>
      </div>

      <div style={{ 
        padding: '15px', 
        overflowY: 'auto', 
        flex: 1,
        minHeight: 0
      }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            {node.data.itemType === 'system' ? 'System ID' : 
             node.data.itemType === 'subsystem' ? 'Sub-System ID' : 
             node.data.itemType === 'function' ? 'Function ID' :
             node.data.itemType === 'testcase' ? 'Test Case ID' :
             node.data.itemType === 'parameter' ? 'Parameter ID' :
             node.data.itemType === 'hardware' ? 'Hardware ID' :
             node.data.itemType === 'usecase' ? 'Use Case ID' :
             node.data.itemType === 'actor' ? 'Actor ID' : 'Item ID'}
          </label>
          <div style={{
            padding: '8px',
            background: '#34495e',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#3498db',
            fontFamily: 'monospace'
          }}>
            {node.data.reqId || 'No ID'}
          </div>
        </div>

        {/* Node Type Selector */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Node Type
          </label>
          <select
            value={node.data.itemType || 'requirement'}
            onChange={(e) => {
              const newType = e.target.value;
              onUpdate(node.id, 'itemType', newType);
              // Also update 'type' for consistency
              onUpdate(node.id, 'type', newType);
            }}
            disabled={!isEditable}
            style={{
              width: '100%',
              padding: '8px',
              background: isEditable ? '#34495e' : '#2c3e50',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: isEditable ? 'pointer' : 'not-allowed'
            }}
          >
            <optgroup label="Architecture">
              <option value="system">System</option>
              <option value="subsystem">Sub-System</option>
              <option value="function">Function</option>
            </optgroup>
            <optgroup label="Requirements">
              <option value="requirement">Requirement</option>
            </optgroup>
            <optgroup label="Testing">
              <option value="testcase">Test Case</option>
            </optgroup>
            <optgroup label="Other">
              <option value="parameter">Parameter</option>
              <option value="hardware">Hardware</option>
              <option value="usecase">Use Case</option>
              <option value="actor">Actor</option>
            </optgroup>
          </select>
        </div>

          <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Version
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={node.data.version || '1.0'}
              onChange={(e) => onUpdate(node.id, 'version', e.target.value)}
              disabled={!isEditable}
              onFocus={(e) => e.target.select()}
              style={{
                flex: 1,
                padding: '8px',
                background: isEditable ? '#34495e' : '#2c3e50',
                color: 'white',
                border: '1px solid #4a5f7f',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                cursor: isEditable ? 'text' : 'not-allowed'
              }}
            />
            {isEditable && (
              <button
                onClick={() => {
                  const currentVersion = node.data.version || '1.0';
                  const parts = currentVersion.split('.');
                  const minor = parseInt(parts[1] || 0) + 1;
                  onUpdate(node.id, 'version', `${parts[0]}.${minor}`);
                }}
                style={{
                  padding: '8px 12px',
                  background: '#8e44ad',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}
              >
                +0.1
              </button>
            )}
          </div>
        </div>

        {/* TITLE */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#3498db',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Title
          </label>
          <input
            type="text"
            value={node.data.label || ''}
            onChange={(e) => onUpdate(node.id, 'label', e.target.value)}
            disabled={!isEditable}
            onFocus={(e) => e.target.select()}
            style={{
              width: '100%',
              padding: '10px',
              background: isEditable ? '#34495e' : '#2c3e50',
              color: isEditable ? 'white' : '#7f8c8d',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: isEditable ? 'text' : 'not-allowed'
            }}
          />
          {!isEditable && (
            <div style={{ fontSize: '9px', color: '#95a5a6', marginTop: '4px' }}>
              Cannot edit - item is frozen/released
            </div>
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            State
          </label>
          <select
            value={node.data.state || 'open'}
            onChange={(e) => onUpdate(node.id, 'state', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              background: '#34495e',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <option value="open">📝 Open (Editable)</option>
            <option value="frozen">🔒 Frozen (Review)</option>
            <option value="released">✅ Released (Approved)</option>
          </select>
        </div>

        {/* REQUIREMENT ORIGIN - Only for requirements */}
        {node.data.itemType === 'requirement' && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              color: '#3498db',
              marginBottom: '6px',
              textTransform: 'uppercase',
              fontWeight: 'bold'
            }}>
              Origin
            </label>
            <select
              value={node.data.origin || 'internal'}
              onChange={(e) => onUpdate(node.id, 'origin', e.target.value)}
              disabled={!isEditable}
              style={{
                width: '100%',
                padding: '10px',
                background: '#34495e',
                color: 'white',
                border: '1px solid #4a5f7f',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            >
              <option value="internal">🏠 Internal</option>
              <option value="external">🌐 External</option>
            </select>
          </div>
        )}

        {/* REQUIREMENT TYPE - Only for requirements */}
        {node.data.itemType === 'requirement' && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              color: '#3498db',
              marginBottom: '6px',
              textTransform: 'uppercase',
              fontWeight: 'bold'
            }}>
              Requirement Type
            </label>
            <select
              value={node.data.reqType || 'project'}
              onChange={(e) => onUpdate(node.id, 'reqType', e.target.value)}
              disabled={!isEditable}
              style={{
                width: '100%',
                padding: '10px',
                background: '#34495e',
                color: 'white',
                border: '1px solid #4a5f7f',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            >
              <option value="customer">🟣 Customer Requirement</option>
              <option value="platform">🔷 Platform Requirement</option>
              <option value="project">🔶 Project Requirement</option>
              <option value="implementation">🟢 Implementation Requirement</option>
            </select>
          </div>
        )}

        {/* CLASSIFICATION */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            fontSize: '11px',
            color: '#3498db',
            marginBottom: '6px',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Classification
          </label>
          <select
            value={node.data.classification || 'requirement'}
            onChange={(e) => onUpdate(node.id, 'classification', e.target.value)}
            disabled={!isEditable}
            style={{
              width: '100%',
              padding: '10px',
              background: '#34495e',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          >
            {/* Options for System/Sub-System/Function */}
            {(node.data.itemType === 'system' || 
              node.data.itemType === 'subsystem' || 
              node.data.itemType === 'function') ? (
              <>
                <option value="platform">🔷 Platform</option>
                <option value="project">🔶 Project</option>
              </>
            ) : (
              <>
                <option value="need">🎯 Need (High-level goal)</option>
                <option value="capability">⚙️ Capability</option>
                <option value="requirement">📋 Requirement</option>
              </>
            )}
          </select>
        </div>
            
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Description
          </label>
          <VoiceTextArea
            value={node.data.description || ''}
            onChange={(text) => onUpdate(node.id, 'description', text)}
            placeholder="Add description..."
            disabled={!isEditable}
            style={{
              width: '100%',
              padding: '8px',
              background: isEditable ? '#34495e' : '#2c3e50',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical',
              cursor: isEditable ? 'text' : 'not-allowed'
            }}
          />
        </div>
        
        {/* Port Editor - for System Engineering items */}
        {(node.data.itemType === 'system' || 
          node.data.itemType === 'subsystem' || 
          node.data.itemType === 'function') && (
          <PortEditor
            ports={node.data.ports || []}
            onChange={(newPorts) => onUpdate(node.id, 'ports', newPorts)}
            disabled={!isEditable}
          />
        )}

        {/* Issues Section */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Issues 🐛
          </label>
          <button
            onClick={() => {
              if (node.data.onShowIssues) {
                node.data.onShowIssues(node);
              }
            }}
            style={{
              width: '100%',
              padding: '10px',
              background: node.data.issueCount > 0 
                ? (node.data.criticalIssueCount > 0 ? '#c0392b' : '#e67e22')
                : '#34495e',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '13px'
            }}
          >
            {node.data.issueCount > 0 ? (
              <>
                <span>🐛</span>
                <span>{node.data.issueCount} Open Issue{node.data.issueCount !== 1 ? 's' : ''}</span>
                {node.data.criticalIssueCount > 0 && (
                  <span style={{
                    background: '#fff',
                    color: '#c0392b',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    {node.data.criticalIssueCount} Critical
                  </span>
                )}
              </>
            ) : (
              <>
                <span>➕</span>
                <span>Add Issue</span>
              </>
            )}
          </button>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Attachment 📎
          </label>
          
          {node.data.attachment ? (
            <div>
              <div 
                style={{
                  width: '100%',
                  height: '120px',
                  backgroundImage: 'url(' + node.data.attachment + ')',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: '2px solid #4a5f7f'
                }}
                onClick={() => setShowImagePreview(true)}
              />
              {isEditable && (
                <button
                  onClick={removeImage}
                  style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    background: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    width: '100%'
                  }}
                >
                  Remove Image
                </button>
              )}
            </div>
          ) : (
            <label style={{
              display: 'block',
              padding: '20px',
              background: isEditable ? '#34495e' : '#2c3e50',
              border: '2px dashed #4a5f7f',
              borderRadius: '4px',
              textAlign: 'center',
              cursor: isEditable ? 'pointer' : 'not-allowed',
              fontSize: '13px'
            }}>
              {isEditable ? '📎 Click to upload image' : '📎 No attachment'}
              {isEditable && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              )}
            </label>
          )}
        </div>

        {/* Issues Section */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            fontSize: '11px',
            color: '#e74c3c',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            <span>🐛 Issues ({(node.data.issues || []).length})</span>
            {isEditable && (
              <button
                onClick={() => {
                  const issues = node.data.issues || [];
                  const newIssue = {
                    id: `issue-${Date.now()}`,
                    title: 'New Issue',
                    description: '',
                    priority: 'medium',
                    status: 'open',
                    createdAt: new Date().toISOString(),
                    createdBy: 'Current User'
                  };
                  onUpdate(node.id, 'issues', [...issues, newIssue]);
                }}
                style={{
                  background: '#e74c3c',
                  border: 'none',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                + Add Issue
              </button>
            )}
          </label>

          {(node.data.issues || []).length === 0 ? (
            <div style={{
              padding: '12px',
              background: '#1a2a1a',
              borderRadius: '4px',
              textAlign: 'center',
              color: '#7f8c8d',
              fontSize: '12px'
            }}>
              ✓ No issues
            </div>
          ) : (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {(node.data.issues || []).map((issue, index) => (
                <div 
                  key={issue.id} 
                  style={{
                    background: '#34495e',
                    borderRadius: '4px',
                    padding: '10px',
                    marginBottom: '6px',
                    borderLeft: `3px solid ${
                      issue.priority === 'critical' ? '#9b59b6' :
                      issue.priority === 'high' ? '#e74c3c' :
                      issue.priority === 'medium' ? '#f39c12' : '#27ae60'
                    }`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <input
                      type="text"
                      value={issue.title}
                      onChange={(e) => {
                        const issues = [...(node.data.issues || [])];
                        issues[index] = { ...issues[index], title: e.target.value };
                        onUpdate(node.id, 'issues', issues);
                      }}
                      disabled={!isEditable}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        outline: 'none'
                      }}
                    />
                    {isEditable && (
                      <button
                        onClick={() => {
                          const issues = (node.data.issues || []).filter((_, i) => i !== index);
                          onUpdate(node.id, 'issues', issues);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#e74c3c',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '0 4px'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  
                  <textarea
                    value={issue.description || ''}
                    onChange={(e) => {
                      const issues = [...(node.data.issues || [])];
                      issues[index] = { ...issues[index], description: e.target.value };
                      onUpdate(node.id, 'issues', issues);
                    }}
                    disabled={!isEditable}
                    placeholder="Issue description..."
                    style={{
                      width: '100%',
                      background: '#2c3e50',
                      border: '1px solid #4a5f7f',
                      borderRadius: '3px',
                      color: 'white',
                      fontSize: '11px',
                      padding: '6px',
                      resize: 'vertical',
                      minHeight: '40px',
                      marginBottom: '6px'
                    }}
                  />
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={issue.priority}
                      onChange={(e) => {
                        const issues = [...(node.data.issues || [])];
                        issues[index] = { ...issues[index], priority: e.target.value };
                        onUpdate(node.id, 'issues', issues);
                      }}
                      disabled={!isEditable}
                      style={{
                        flex: 1,
                        padding: '4px',
                        background: '#2c3e50',
                        color: 'white',
                        border: '1px solid #4a5f7f',
                        borderRadius: '3px',
                        fontSize: '10px'
                      }}
                    >
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🔴 High</option>
                      <option value="critical">🟣 Critical</option>
                    </select>
                    
                    <select
                      value={issue.status}
                      onChange={(e) => {
                        const issues = [...(node.data.issues || [])];
                        issues[index] = { ...issues[index], status: e.target.value };
                        onUpdate(node.id, 'issues', issues);
                      }}
                      disabled={!isEditable}
                      style={{
                        flex: 1,
                        padding: '4px',
                        background: '#2c3e50',
                        color: 'white',
                        border: '1px solid #4a5f7f',
                        borderRadius: '3px',
                        fontSize: '10px'
                      }}
                    >
                      <option value="open">📬 Open</option>
                      <option value="in-progress">🔄 In Progress</option>
                      <option value="resolved">✅ Resolved</option>
                      <option value="closed">📪 Closed</option>
                    </select>
                  </div>
                  
                  <div style={{ 
                    marginTop: '6px', 
                    fontSize: '9px', 
                    color: '#7f8c8d' 
                  }}>
                    Created: {new Date(issue.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Priority
          </label>
          <select
            value={node.data.priority || 'medium'}
            onChange={(e) => onUpdate(node.id, 'priority', e.target.value)}
            disabled={!isEditable}
            style={{
              width: '100%',
              padding: '8px',
              background: isEditable ? '#34495e' : '#2c3e50',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: isEditable ? 'pointer' : 'not-allowed'
            }}
          >
            <option value="low">🟢 Low</option>
            <option value="medium">🟡 Medium</option>
            <option value="high">🔴 High</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Owner
          </label>
          <input
            type="text"
            value={node.data.owner || ''}
            onChange={(e) => onUpdate(node.id, 'owner', e.target.value)}
            placeholder="Who owns this?"
            disabled={!isEditable}
            style={{
              width: '100%',
              padding: '8px',
              background: isEditable ? '#34495e' : '#2c3e50',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: isEditable ? 'text' : 'not-allowed'
            }}
          />
        </div>

        {/* Rationale field - for all items */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            💡 Rationale (Why is this needed?)
          </label>
          <textarea
            value={node.data.rationale || ''}
            onChange={(e) => onUpdate(node.id, 'rationale', e.target.value)}
            placeholder="Explain why this item exists..."
            disabled={!isEditable}
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '8px',
              background: isEditable ? '#34495e' : '#2c3e50',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical',
              cursor: isEditable ? 'text' : 'not-allowed'
            }}
          />
        </div>

        {/* Test Case specific fields */}
        {(node.data.itemType === 'testcase' || node.data.type === 'testcase') && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#27ae60',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                🎯 Purpose
              </label>
              <textarea
                value={node.data.purpose || ''}
                onChange={(e) => onUpdate(node.id, 'purpose', e.target.value)}
                placeholder="What does this test verify?"
                disabled={!isEditable}
                style={{
                  width: '100%',
                  minHeight: '60px',
                  padding: '8px',
                  background: isEditable ? '#34495e' : '#2c3e50',
                  color: 'white',
                  border: '1px solid #27ae60',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#27ae60',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                ⚠️ Preconditions
              </label>
              <textarea
                value={node.data.preconditions || ''}
                onChange={(e) => onUpdate(node.id, 'preconditions', e.target.value)}
                placeholder="What must be true before testing? (one per line)"
                disabled={!isEditable}
                style={{
                  width: '100%',
                  minHeight: '60px',
                  padding: '8px',
                  background: isEditable ? '#34495e' : '#2c3e50',
                  color: 'white',
                  border: '1px solid #27ae60',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#27ae60',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                📝 Test Steps (one per line)
              </label>
              <textarea
                value={node.data.testSteps || ''}
                onChange={(e) => onUpdate(node.id, 'testSteps', e.target.value)}
                placeholder="Step 1: Do this&#10;Step 2: Do that&#10;Step 3: Check result"
                disabled={!isEditable}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '8px',
                  background: isEditable ? '#34495e' : '#2c3e50',
                  color: 'white',
                  border: '1px solid #27ae60',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#27ae60',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                ✅ Expected Results (one per line, matching steps)
              </label>
              <textarea
                value={node.data.expectedResults || ''}
                onChange={(e) => onUpdate(node.id, 'expectedResults', e.target.value)}
                placeholder="Step 1: System responds with OK&#10;Step 2: Value changes to X&#10;Step 3: No errors shown"
                disabled={!isEditable}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '8px',
                  background: isEditable ? '#34495e' : '#2c3e50',
                  color: 'white',
                  border: '1px solid #27ae60',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>
          </>
        )}

        {/* PARAMETER FIELDS */}
        {(node.data.itemType === 'parameter' || node.data.type === 'parameter') && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#00bcd4',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Parameter Type
              </label>
              <select
                value={node.data.paramType || 'configuration'}
                onChange={(e) => onUpdate(node.id, 'paramType', e.target.value)}
                disabled={!isEditable}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #00bcd4',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              >
                <option value="configuration">⚙️ Configuration</option>
                <option value="settings">🔧 Settings</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: '#00bcd4',
                  textTransform: 'uppercase',
                  fontWeight: 'bold'
                }}>
                  Value
                </label>
                <input
                  type="text"
                  value={node.data.paramValue || ''}
                  onChange={(e) => onUpdate(node.id, 'paramValue', e.target.value)}
                  disabled={!isEditable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: '#00bcd4',
                  textTransform: 'uppercase',
                  fontWeight: 'bold'
                }}>
                  Unit
                </label>
                <input
                  type="text"
                  value={node.data.paramUnit || ''}
                  onChange={(e) => onUpdate(node.id, 'paramUnit', e.target.value)}
                  placeholder="e.g., V, A, kW, °C"
                  disabled={!isEditable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: '#00bcd4',
                  textTransform: 'uppercase',
                  fontWeight: 'bold'
                }}>
                  Min
                </label>
                <input
                  type="text"
                  value={node.data.paramMin || ''}
                  onChange={(e) => onUpdate(node.id, 'paramMin', e.target.value)}
                  disabled={!isEditable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: '#00bcd4',
                  textTransform: 'uppercase',
                  fontWeight: 'bold'
                }}>
                  Max
                </label>
                <input
                  type="text"
                  value={node.data.paramMax || ''}
                  onChange={(e) => onUpdate(node.id, 'paramMax', e.target.value)}
                  disabled={!isEditable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: '#00bcd4',
                  textTransform: 'uppercase',
                  fontWeight: 'bold'
                }}>
                  Default
                </label>
                <input
                  type="text"
                  value={node.data.paramDefault || ''}
                  onChange={(e) => onUpdate(node.id, 'paramDefault', e.target.value)}
                  disabled={!isEditable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* HARDWARE FIELDS */}
        {(node.data.itemType === 'hardware' || node.data.type === 'hardware') && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#795548',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Hardware Type
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={node.data.hwType || 'generic'}
                  onChange={(e) => {
                    const hwInfo = hardwareTypes.find(t => t.id === e.target.value) || { icon: '📦' };
                    onUpdate(node.id, 'hwType', e.target.value);
                    onUpdate(node.id, 'hwIcon', hwInfo.icon);
                  }}
                  disabled={!isEditable}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #795548',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                >
                  {hardwareTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.icon?.length <= 2 ? type.icon : '📦'} {type.name}
                    </option>
                  ))}
                </select>
                {onManageTypes && (
                  <button
                    onClick={onManageTypes}
                    style={{
                      padding: '8px 12px',
                      background: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                    title="Manage Hardware Types"
                  >
                    ⚙️
                  </button>
                )}
              </div>
            </div>

            {/* Custom Icon */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#795548',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Custom Icon (Optional)
              </label>
              
              {/* Show current custom icon if exists */}
              {node.data.hwCustomIcon && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  marginBottom: '10px',
                  padding: '10px',
                  background: '#2c3e50',
                  borderRadius: '6px'
                }}>
                  <img 
                    src={node.data.hwCustomIcon} 
                    alt="Custom Icon"
                    style={{ 
                      width: '50px', 
                      height: '50px', 
                      objectFit: 'contain',
                      background: '#fff',
                      borderRadius: '4px',
                      padding: '4px'
                    }}
                  />
                  <button
                    onClick={() => onUpdate(node.id, 'hwCustomIcon', null)}
                    style={{
                      padding: '6px 12px',
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              )}
              
              {/* Icon URL input */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="Paste image URL..."
                  id={`icon-url-${node.id}`}
                  disabled={!isEditable}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
                <button
                  onClick={() => {
                    const urlInput = document.getElementById(`icon-url-${node.id}`);
                    if (urlInput && urlInput.value) {
                      onUpdate(node.id, 'hwCustomIcon', urlInput.value);
                      urlInput.value = '';
                    }
                  }}
                  disabled={!isEditable}
                  style={{
                    padding: '8px 12px',
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                >
                  Add
                </button>
              </div>
              
              {/* Or upload file */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: '#7f8c8d' }}>or</span>
                <label style={{
                  padding: '6px 12px',
                  background: '#3498db',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: isEditable ? 'pointer' : 'not-allowed',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}>
                  📁 Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={!isEditable}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          onUpdate(node.id, 'hwCustomIcon', event.target.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
              
              <div style={{ fontSize: '9px', color: '#7f8c8d', marginTop: '6px' }}>
                💡 Use PNG/SVG with transparent background for best results
              </div>
            </div>

            {/* Icon Size Control */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#795548',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Icon Size: {node.data.hwIconSize || 64}px
              </label>
              <input
                type="range"
                min="32"
                max="128"
                value={node.data.hwIconSize || 64}
                onChange={(e) => onUpdate(node.id, 'hwIconSize', parseInt(e.target.value))}
                disabled={!isEditable}
                style={{
                  width: '100%',
                  cursor: 'pointer'
                }}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '9px', 
                color: '#7f8c8d' 
              }}>
                <span>32px</span>
                <span>128px</span>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#795548',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Manufacturer
              </label>
              <input
                type="text"
                value={node.data.manufacturer || ''}
                onChange={(e) => onUpdate(node.id, 'manufacturer', e.target.value)}
                placeholder="e.g., ABB, Siemens, Danfoss"
                disabled={!isEditable}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #4a5f7f',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: '#795548',
                  textTransform: 'uppercase',
                  fontWeight: 'bold'
                }}>
                  Part Number
                </label>
                <input
                  type="text"
                  value={node.data.partNumber || ''}
                  onChange={(e) => onUpdate(node.id, 'partNumber', e.target.value)}
                  disabled={!isEditable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: '#795548',
                  textTransform: 'uppercase',
                  fontWeight: 'bold'
                }}>
                  Serial Number
                </label>
                <input
                  type="text"
                  value={node.data.serialNumber || ''}
                  onChange={(e) => onUpdate(node.id, 'serialNumber', e.target.value)}
                  disabled={!isEditable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#795548',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Specifications
              </label>
              <textarea
                value={node.data.specifications || ''}
                onChange={(e) => onUpdate(node.id, 'specifications', e.target.value)}
                placeholder="Power: 500W&#10;Voltage: 400V AC&#10;Current: 10A"
                disabled={!isEditable}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #4a5f7f',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
              />
            </div>
          </>
        )}

        {/* USE CASE FIELDS */}
        {(node.data.itemType === 'usecase' || node.data.type === 'usecase') && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#f39c12',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Preconditions
              </label>
              <textarea
                value={node.data.preconditions || ''}
                onChange={(e) => onUpdate(node.id, 'preconditions', e.target.value)}
                disabled={!isEditable}
                placeholder="What must be true before this use case can be executed?"
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #f39c12',
                  borderRadius: '4px',
                  minHeight: '60px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#f39c12',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Main Flow
              </label>
              <textarea
                value={node.data.mainFlow || ''}
                onChange={(e) => onUpdate(node.id, 'mainFlow', e.target.value)}
                disabled={!isEditable}
                placeholder="Step-by-step description of the normal flow"
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #f39c12',
                  borderRadius: '4px',
                  minHeight: '80px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#f39c12',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Alternative Flows
              </label>
              <textarea
                value={node.data.alternativeFlows || ''}
                onChange={(e) => onUpdate(node.id, 'alternativeFlows', e.target.value)}
                disabled={!isEditable}
                placeholder="Alternative paths or exception handling"
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #f39c12',
                  borderRadius: '4px',
                  minHeight: '60px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#f39c12',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Postconditions
              </label>
              <textarea
                value={node.data.postconditions || ''}
                onChange={(e) => onUpdate(node.id, 'postconditions', e.target.value)}
                disabled={!isEditable}
                placeholder="What will be true after successful execution?"
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #f39c12',
                  borderRadius: '4px',
                  minHeight: '60px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>
          </>
        )}

        {/* ACTOR FIELDS */}
        {(node.data.itemType === 'actor' || node.data.type === 'actor') && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#2ecc71',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Actor Type
              </label>
              <select
                value={node.data.actorType || 'primary'}
                onChange={(e) => onUpdate(node.id, 'actorType', e.target.value)}
                disabled={!isEditable}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #2ecc71',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              >
                <option value="primary">Primary Actor</option>
                <option value="secondary">Secondary Actor</option>
                <option value="system">System Actor</option>
                <option value="external">External System</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#2ecc71',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Responsibilities
              </label>
              <textarea
                value={node.data.responsibilities || ''}
                onChange={(e) => onUpdate(node.id, 'responsibilities', e.target.value)}
                disabled={!isEditable}
                placeholder="What actions or decisions is this actor responsible for?"
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #2ecc71',
                  borderRadius: '4px',
                  minHeight: '80px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>
          </>
        )}


        <div style={{
          padding: '10px',
          background: '#34495e',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#95a5a6',
          marginBottom: '15px'
        }}>
          <div><strong>ID:</strong> {node.id}</div>
        </div>

        {(node.data.itemType === 'testcase' || node.data.type === 'testcase') && (
          <button
            onClick={() => {
              if (window.generateFATFunction) {
                window.generateFATFunction(node);
              }
            }}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              background: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📄 Generate FAT Protocol
          </button>
        )}  

        <button
          onClick={() => {
            if (window.duplicateNodeFunction) {
              window.duplicateNodeFunction(node);
            }
          }}
          style={{
            width: '100%',
            padding: '10px',
            background: '#8e44ad',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
        📋 Duplicate Node (Ctrl+D) 
        </button>
      </div>

      {showImagePreview && node.data.attachment && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowImagePreview(false)}
        >
          <img
            src={node.data.attachment}
            alt="Attachment preview"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
          />
        </div>
      )}
    </div>
  );
}

export default FloatingPanel;
