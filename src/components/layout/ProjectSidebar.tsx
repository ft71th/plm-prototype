import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Port } from '../../types';
import React from 'react';
import { Sidebar, SidebarSection, SidebarButton } from './Sidebar';
import useStore from '../../store';

/**
 * Main project sidebar with all action sections.
 */
export default function ProjectSidebar({
  isOpen, onClose,
  // Project actions
  saveProjectToDatabase, handleCloseProject,
  exportProject, exportToExcel,
  onImportRequirements,
  autoLayoutNodes,
  // Stats
  stats, filteredCount, edges,
  // History
  undo, redo, canUndo, canRedo,
}: any) {
  const {
    showRelationshipLabels, setShowRelationshipLabels,
    setShowShareModal, setShowNewObjectModal,
    setShowLinkManager, setShowHardwareTypesModal,
  } = useStore();
  const closeThen = (fn) => () => { fn(); onClose(); };

  return (
    <Sidebar isOpen={isOpen} onClose={onClose}>
      <SidebarSection title="📁 Project">
        <SidebarButton 
          icon="💾" 
          label="Save Project" 
          onClick={closeThen(saveProjectToDatabase)} 
        />
        <SidebarButton 
          icon="🔗" 
          label="Share Project" 
          onClick={closeThen(() => setShowShareModal(true))} 
        />
        <SidebarButton 
          icon="📂" 
          label="Open Project" 
          onClick={() => {
            if (window.confirm('Save current project before opening another?')) {
              saveProjectToDatabase();
            }
            handleCloseProject();
            onClose();
          }} 
        />
        <SidebarButton 
          icon="📁" 
          label="Close Project" 
          onClick={() => {
            if (window.confirm('Save before closing?')) {
              saveProjectToDatabase().then(() => handleCloseProject());
            } else {
              handleCloseProject();
            }
            onClose();
          }} 
        />
        <div style={{ 
          borderTop: '1px solid #34495e', 
          margin: '10px 0',
          paddingTop: '10px'
        }}>
          <div style={{ 
            fontSize: '10px', 
            color: '#7f8c8d', 
            marginBottom: '6px',
            paddingLeft: '10px'
          }}>
            FILE OPERATIONS
          </div>
          <SidebarButton 
            icon="📤" 
            label="Export to File (Ctrl+Shift+S)" 
            onClick={closeThen(exportProject)} 
          />
          <SidebarButton 
            icon="📥" 
            label="Import from File (Ctrl+O)" 
            onClick={() => {
              document.getElementById('file-import-input')?.click();
              onClose();
            }} 
          />
        </div>
        <SidebarButton icon="📊" label="Export to Excel" onClick={closeThen(exportToExcel)} />
        <SidebarButton icon="📥" label="Importera krav (CSV/Excel/PDF)" onClick={closeThen(onImportRequirements)} />
        <SidebarButton icon="🆕" label="New Object" onClick={closeThen(() => setShowNewObjectModal(true))} />
        <SidebarButton 
          icon="🔗" 
          label="Link Manager" 
          onClick={closeThen(() => setShowLinkManager(true))} 
        />
        <SidebarButton 
          icon="🔧" 
          label="Manage HW Types" 
          onClick={closeThen(() => setShowHardwareTypesModal(true))} 
        />
      </SidebarSection>
      
      <SidebarSection title="👁️ View">
        <SidebarButton 
          icon="🏷️" 
          label={showRelationshipLabels ? 'Labels: ON' : 'Labels: OFF'} 
          onClick={() => setShowRelationshipLabels(!showRelationshipLabels)}
          active={showRelationshipLabels}
        />
        <SidebarButton 
          icon="📐" 
          label="Auto-Arrange (A)" 
          onClick={closeThen(autoLayoutNodes)} 
        />
      </SidebarSection>
      
      <SidebarSection title="📊 Statistics">
        <div style={{ 
          padding: '10px', 
          background: '#2c3e50', 
          borderRadius: '6px',
          fontSize: '12px'
        }}>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: '#7f8c8d' }}>Total Items:</span>
            <span style={{ float: 'right', fontWeight: 'bold' }}>{stats.total}</span>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: '#7f8c8d' }}>Filtered:</span>
            <span style={{ float: 'right', fontWeight: 'bold' }}>{filteredCount}</span>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: '#7f8c8d' }}>Relationships:</span>
            <span style={{ float: 'right', fontWeight: 'bold' }}>{edges.length}</span>
          </div>
          {stats.floatingConnectors > 0 && (
            <div style={{ 
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid #34495e'
            }}>
              <span style={{ color: '#e74c3c' }}>⚠️ Unconnected:</span>
              <span style={{ float: 'right', fontWeight: 'bold', color: '#e74c3c' }}>
                {stats.floatingConnectors}
              </span>
            </div>
          )}
        </div>
      </SidebarSection>
      
      <SidebarSection title="↩️ History">
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            style={{
              flex: 1,
              padding: '8px',
              background: !canUndo ? '#34495e' : '#3498db',
              color: !canUndo ? '#666' : 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !canUndo ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            ⏪ Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            style={{
              flex: 1,
              padding: '8px',
              background: !canRedo ? '#34495e' : '#3498db',
              color: !canRedo ? '#666' : 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !canRedo ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            Redo ⏩
          </button>
        </div>
        <div style={{ fontSize: '10px', color: '#7f8c8d', marginTop: '6px', textAlign: 'center' }}>
          Ctrl+Z / Ctrl+Y
        </div>
      </SidebarSection>
      
      <SidebarSection title="💡 Help">
        <div style={{ 
          padding: '10px', 
          background: '#2c3e50', 
          borderRadius: '6px',
          fontSize: '11px',
          color: '#bdc3c7'
        }}>
          <div><strong>Double-click:</strong> Edit node</div>
          <div><strong>Connect:</strong> Drag from handle</div>
          <div><strong>Delete:</strong> Select + Del</div>
          <div><strong>Duplicate:</strong> Ctrl+D</div>
        </div>
      </SidebarSection>
    </Sidebar>
  );
}
