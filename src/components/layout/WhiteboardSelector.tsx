import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Port } from '../../types';
import React, { useState } from 'react';

function WhiteboardSelector({ 
  whiteboards, 
  activeId, 
  isOpen, 
  onToggle, 
  onSelect, 
  onNewWhiteboard,
  onRename,
  onDelete 
}: any) {
  const [newBoardName, setNewBoardName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const activeBoard = whiteboards.find(wb => wb.id === activeId);
  
  const handleCreate = () => {
    if (newBoardName.trim()) {
      onNewWhiteboard(newBoardName.trim());
      setNewBoardName('');
      setIsCreating(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Dropdown Button */}
      <button
        onClick={onToggle}
        style={{
          padding: '8px 14px',
          background: activeBoard?.type === 'whiteboard' ? '#ecf0f1' : '#2c3e50',
          color: activeBoard?.type === 'whiteboard' ? '#2c3e50' : 'white',
          border: '1px solid var(--nl-border, #4a5f7f)',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '160px'
        }}
      >
        <span>{activeBoard?.type === 'whiteboard' ? '🎨' : '📋'}</span>
        <span style={{ flex: 1, textAlign: 'left' }}>{activeBoard?.name || 'Select View'}</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          background: 'var(--nl-bg-panel, #1a2634)',
          border: '1px solid var(--nl-border, #34495e)',
          borderRadius: '8px',
          boxShadow: 'var(--nl-shadow-lg, 0 8px 24px rgba(0,0,0,0.4))',
          minWidth: '220px',
          zIndex: 5000,
          overflow: 'hidden'
        }}>
          {/* PLM View */}
          <div
            onClick={() => onSelect('plm')}
            style={{
              padding: '10px 14px',
              cursor: 'pointer',
              background: activeId === 'plm' ? '#3498db' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderBottom: '1px solid var(--nl-border, #34495e)'
            }}
          >
            <span>📋</span>
            <span style={{ fontWeight: 'bold', color: 'white' }}>PLM View</span>
            {activeId === 'plm' && <span style={{ marginLeft: 'auto' }}>✓</span>}
          </div>
          
          {/* Whiteboard List */}
          {whiteboards.filter(wb => wb.type === 'whiteboard').map(wb => (
            <div
              key={wb.id}
              onClick={() => onSelect(wb.id)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                background: activeId === wb.id ? '#3498db' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'white'
              }}
            >
              <span>🎨</span>
              <span style={{ flex: 1 }}>{wb.name}</span>
              {activeId === wb.id && <span>✓</span>}
              {wb.type === 'whiteboard' && (
                <button
                  onClick={(e: any) => {
                    e.stopPropagation();
                    onDelete(wb.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#e74c3c',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '2px 6px'
                  }}
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
          
          {/* Separator */}
          <div style={{ height: '1px', background: 'var(--nl-bg-input, #34495e)' }} />
          
          {/* New Whiteboard */}
          {isCreating ? (
            <div style={{ padding: '10px 14px' }}>
              <input
                autoFocus
                type="text"
                value={newBoardName}
                onChange={(e: any) => setNewBoardName(e.target.value)}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
                placeholder="Whiteboard name..."
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'var(--nl-bg-panel, #2c3e50)',
                  color: 'white',
                  border: '1px solid #3498db',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginBottom: '8px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleCreate}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                >
                  Create
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: '#7f8c8d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setIsCreating(true)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#27ae60'
              }}
            >
              <span>➕</span>
              <span style={{ fontWeight: 'bold' }}>New Whiteboard</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// Document View Component

export default WhiteboardSelector;
