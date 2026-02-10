import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Port } from '../../types';
import React from 'react';

/**
 * Floating toolbar that appears when nodes are selected.
 * Includes copy/paste, alignment, lock/group, and export actions.
 */
export default function SelectionToolbar({
  nodes, setNodes, clipboard,
  // Clipboard actions
  copySelectedNodes, deleteSelectedNodes, duplicateSelectedNodes, pasteNodes,
  // Node operations
  alignSelectedNodes, toggleLockSelectedNodes,
  groupSelectedNodes, ungroupSelectedNodes, exportSelectedNodes,
  // Styles
  toolbarBtnStyle, toolbarBtnSmall,
}: any) {
  const selectedNodes = nodes.filter((n: any) => n.selected);
  const selectedCount = selectedNodes.length;
  const lockedCount = selectedNodes.filter((n: any) => n.data?.locked).length;
  const hasUnlocked = selectedNodes.some(n => !n.data?.locked);
  const hasGroups = selectedNodes.some(n => n.data?.isGroup);

  return (
    <>
      {/* Selection Toolbar */}
      {selectedCount > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#2c3e50',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
          flexWrap: 'wrap',
          maxWidth: '90vw'
        }}>
          {/* Selection count */}
          <span style={{ color: '#3498db', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>
            {selectedCount} selected
            {lockedCount > 0 && (
              <span style={{ color: '#e74c3c', marginLeft: '4px' }}>
                ({lockedCount} 🔒)
              </span>
            )}
          </span>
          
          <div style={{ width: '1px', height: '24px', background: '#4a5f7f' }} />
          
          {/* Copy/Cut/Paste/Delete Group */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={copySelectedNodes} style={toolbarBtnStyle('#3498db')} title="Copy (Ctrl+C)">
              📋
            </button>
            <button onClick={() => { copySelectedNodes(); deleteSelectedNodes(); }} style={toolbarBtnStyle('#e67e22')} title="Cut (Ctrl+X)">
              ✂️
            </button>
            <button onClick={duplicateSelectedNodes} style={toolbarBtnStyle('#9b59b6')} title="Duplicate (Ctrl+D)">
              ⧉
            </button>
            <button onClick={deleteSelectedNodes} style={toolbarBtnStyle('#e74c3c')} title="Delete (Del)">
              🗑️
            </button>
          </div>
          
          <div style={{ width: '1px', height: '24px', background: '#4a5f7f' }} />
          
          {/* Align Group */}
          <div style={{ display: 'flex', gap: '2px' }}>
            <button onClick={() => alignSelectedNodes('left')} style={toolbarBtnSmall} title="Align Left">⬅</button>
            <button onClick={() => alignSelectedNodes('centerH')} style={toolbarBtnSmall} title="Align Center H">⬌</button>
            <button onClick={() => alignSelectedNodes('right')} style={toolbarBtnSmall} title="Align Right">➡</button>
            <button onClick={() => alignSelectedNodes('top')} style={toolbarBtnSmall} title="Align Top">⬆</button>
            <button onClick={() => alignSelectedNodes('centerV')} style={toolbarBtnSmall} title="Align Center V">⬍</button>
            <button onClick={() => alignSelectedNodes('bottom')} style={toolbarBtnSmall} title="Align Bottom">⬇</button>
          </div>
          
          {/* Distribute */}
          <div style={{ display: 'flex', gap: '2px' }}>
            <button onClick={() => alignSelectedNodes('distributeH')} style={toolbarBtnSmall} title="Distribute Horizontally">↔</button>
            <button onClick={() => alignSelectedNodes('distributeV')} style={toolbarBtnSmall} title="Distribute Vertically">↕</button>
          </div>
          
          <div style={{ width: '1px', height: '24px', background: '#4a5f7f' }} />
          
          {/* Lock/Group/Export */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={toggleLockSelectedNodes} 
              style={toolbarBtnStyle(hasUnlocked ? '#27ae60' : '#e74c3c')} 
              title={hasUnlocked ? "Lock (Ctrl+L)" : "Unlock (Ctrl+L)"}
            >
              {hasUnlocked ? '🔒' : '🔓'}
            </button>
            <button onClick={groupSelectedNodes} style={toolbarBtnStyle('#1abc9c')} title="Group (Ctrl+G)">
              📁
            </button>
            {hasGroups && (
              <button onClick={ungroupSelectedNodes} style={toolbarBtnStyle('#95a5a6')} title="Ungroup (Ctrl+Shift+G)">
                📂
              </button>
            )}
            <button onClick={exportSelectedNodes} style={toolbarBtnStyle('#f39c12')} title="Export Selection">
              📤
            </button>
          </div>
                                          
          <div style={{ width: '1px', height: '24px', background: '#4a5f7f' }} />
          
          {/* Clear */}
          <button
            onClick={() => setNodes(nds => nds.map((n: any) => ({ ...n, selected: false })))}
            style={{
              background: 'transparent',
              border: '1px solid #7f8c8d',
              color: '#bdc3c7',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
            title="Clear selection (Esc)"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Paste indicator */}
      {clipboard.nodes.length > 0 && selectedCount === 0 && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#27ae60',
          borderRadius: '8px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000
        }}>
          <span style={{ color: 'white', fontSize: '13px' }}>
            📋 {clipboard.nodes.length} item{clipboard.nodes.length > 1 ? 's' : ''} in clipboard
          </span>
          <button
            onClick={pasteNodes}
            style={{
              background: 'white',
              border: 'none',
              color: '#27ae60',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
            title="Paste (Ctrl+V)"
          >
            📥 Paste
          </button>
        </div>
      )}
    </>
  );
}
