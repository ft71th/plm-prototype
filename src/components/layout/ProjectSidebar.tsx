import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Port } from '../../types';
import React, { useState } from 'react';
import { Sidebar, SidebarSection, SidebarButton } from './Sidebar';
import useStore from '../../store';
import { projects } from '../../api';

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
    currentProject, setCurrentProject,
    setObjectName,
  } = useStore();
  const closeThen = (fn) => () => { fn(); onClose(); };

  // ── Rename state ──
  const [showRename, setShowRename] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [renameDesc, setRenameDesc] = useState('');
  const [renaming, setRenaming] = useState(false);

  // ── Save As state ──
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [savingAs, setSavingAs] = useState(false);

  const handleRenameOpen = () => {
    setRenameName(currentProject?.name || '');
    setRenameDesc(currentProject?.description || '');
    setShowRename(true);
  };

  const handleRename = async () => {
    if (!currentProject || !renameName.trim()) return;
    setRenaming(true);
    try {
      // Save current project first
      await saveProjectToDatabase();
      // Then rename
      const updated = await projects.rename(currentProject.id, renameName.trim(), renameDesc.trim());
      setCurrentProject({ ...currentProject, name: updated.name, description: updated.description });
      setObjectName(updated.name);
      setShowRename(false);
    } catch (err) {
      console.error('Rename error:', err);
      alert('Failed to rename project: ' + err.message);
    } finally {
      setRenaming(false);
    }
  };

  const handleSaveAsOpen = () => {
    setSaveAsName((currentProject?.name || 'Project') + ' (Copy)');
    setShowSaveAs(true);
  };

  const handleSaveAs = async () => {
    if (!currentProject || !saveAsName.trim()) return;
    setSavingAs(true);
    try {
      // Save current project first
      await saveProjectToDatabase();
      // Clone it
      const newProject = await projects.clone(currentProject.id, saveAsName.trim());
      // Open the new project
      const fullProject = await projects.get(newProject.id);
      handleCloseProject();
      // Small delay to let state clear
      setTimeout(() => {
        window.location.reload(); // cleanest way to switch to new project
      }, 200);
    } catch (err) {
      console.error('Save As error:', err);
      alert('Failed to save as: ' + err.message);
    } finally {
      setSavingAs(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--nl-bg-input, #34495e)',
    border: '1px solid var(--nl-border, #4a5f7f)',
    borderRadius: '5px',
    color: 'var(--nl-text-primary, white)',
    fontSize: '13px',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  };

  const actionBtnStyle = (color: string, disabled?: boolean) => ({
    flex: 1,
    padding: '8px',
    background: disabled ? '#34495e' : color,
    color: disabled ? '#666' : 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '12px',
    fontWeight: 600 as const,
  });

  return (
    <Sidebar isOpen={isOpen} onClose={onClose}>
      <SidebarSection title="📁 Project">
        <SidebarButton 
          icon="💾" 
          label="Save Project" 
          onClick={closeThen(saveProjectToDatabase)} 
        />
        <SidebarButton 
          icon="✏️" 
          label="Rename Project" 
          onClick={handleRenameOpen} 
        />
        <SidebarButton 
          icon="📋" 
          label="Save As..." 
          onClick={handleSaveAsOpen} 
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

        {/* Rename inline dialog */}
        {showRename && (
          <div style={{
            padding: '12px',
            background: 'var(--nl-bg-panel, #2c3e50)',
            borderRadius: '6px',
            margin: '8px 0',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--nl-text-secondary, #bdc3c7)', marginBottom: '8px', fontWeight: 600 }}>
              ✏️ Rename Project
            </div>
            <input
              value={renameName}
              onChange={e => setRenameName(e.target.value)}
              placeholder="Project name"
              autoFocus
              style={{ ...inputStyle, marginBottom: '6px' }}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setShowRename(false); }}
            />
            <textarea
              value={renameDesc}
              onChange={e => setRenameDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' as const, marginBottom: '8px' }}
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setShowRename(false)} style={actionBtnStyle('#7f8c8d')}>Cancel</button>
              <button onClick={handleRename} disabled={renaming || !renameName.trim()} style={actionBtnStyle('#3498db', renaming || !renameName.trim())}>
                {renaming ? 'Renaming...' : 'Rename'}
              </button>
            </div>
          </div>
        )}

        {/* Save As inline dialog */}
        {showSaveAs && (
          <div style={{
            padding: '12px',
            background: 'var(--nl-bg-panel, #2c3e50)',
            borderRadius: '6px',
            margin: '8px 0',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--nl-text-secondary, #bdc3c7)', marginBottom: '8px', fontWeight: 600 }}>
              📋 Save As New Project
            </div>
            <input
              value={saveAsName}
              onChange={e => setSaveAsName(e.target.value)}
              placeholder="New project name"
              autoFocus
              style={{ ...inputStyle, marginBottom: '8px' }}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveAs(); if (e.key === 'Escape') setShowSaveAs(false); }}
            />
            <div style={{ fontSize: '10px', color: '#7f8c8d', marginBottom: '8px' }}>
              Creates a full copy of the current project with all nodes, edges, whiteboards and documents.
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setShowSaveAs(false)} style={actionBtnStyle('#7f8c8d')}>Cancel</button>
              <button onClick={handleSaveAs} disabled={savingAs || !saveAsName.trim()} style={actionBtnStyle('#27ae60', savingAs || !saveAsName.trim())}>
                {savingAs ? 'Cloning...' : 'Save As'}
              </button>
            </div>
          </div>
        )}

        <div style={{ 
          borderTop: '1px solid var(--nl-border, #34495e)', 
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
          background: 'var(--nl-bg-panel, #2c3e50)', 
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
              borderTop: '1px solid var(--nl-border, #34495e)'
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
          background: 'var(--nl-bg-panel, #2c3e50)', 
          borderRadius: '6px',
          fontSize: '11px',
          color: 'var(--nl-text-secondary, #bdc3c7)'
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
