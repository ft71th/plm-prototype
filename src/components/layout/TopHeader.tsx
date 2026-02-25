import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Port } from '../../types';
import React from 'react';
import { NorthlightLogo } from '../../NorthlightLogo';
import { UserAvatars } from '../../collaboration';
import WhiteboardSelector from './WhiteboardSelector';
import type { NorthlightTheme } from '../../theme';

function TopHeader({ 
  objectName, 
  objectVersion, 
  onMenuClick, 
  searchText, 
  onSearchChange,
  filtersOpen,
  onFiltersToggle,
  filters,
  onFilterChange,
  user,
  handleLogout,
  onChangePassword,
  onLogout,
  viewMode,
  onViewModeChange,
  whiteboards,
  activeWhiteboardId,
  showWhiteboardDropdown,
  onWhiteboardDropdownToggle,
  onWhiteboardSelect,
  onNewWhiteboard,
  onDeleteWhiteboard,
  UserAvatarsComponent,
  theme,
  isDarkMode,
  onToggleTheme,
}: any) {
  const t = theme as NorthlightTheme;

  const viewBtn = (mode: string, label: string, title: string, radius?: string) => (
    <button
      onClick={() => onViewModeChange(mode)}
      style={{
        padding: '6px 10px',
        background: viewMode === mode ? t.accent : t.bgHeader,
        color: viewMode === mode ? t.textInverse : t.textPrimary,
        border: `1px solid ${t.border}`,
        borderRadius: radius || '0',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: 'bold',
      }}
      title={title}
    >
      {label}
    </button>
  );

  const selectStyle = {
    padding: '8px',
    background: t.bgInput,
    color: t.textPrimary,
    border: `1px solid ${t.border}`,
    borderRadius: '4px',
    fontSize: '12px',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 15px',
      background: t.bgHeader,
      borderBottom: `2px solid ${t.bgHeaderBorder}`,
      height: '50px',
      position: 'relative',
      zIndex: 100,
      gap: '15px',
    }}>
      {/* LEFT SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={onMenuClick} style={{ background: 'none', border: 'none', color: t.textPrimary, fontSize: 18, cursor: 'pointer' }}>☰</button>
        <NorthlightLogo size={30} showText={false} animated={false} />
        <span style={{ color: t.textPrimary, fontWeight: 'bold' }}>
          🎯 {objectName}
        </span>
        <span style={{
          background: t.accent,
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          color: t.textInverse,
        }}>
          v{objectVersion}
        </span>
      </div> 
     
      {/* CENTER SECTION - Search */}
      <div style={{ flex: 1, maxWidth: '400px' }}>
        <input
          type="text"
          placeholder="🔍 Search..."
          value={searchText}
          onChange={(e: any) => onSearchChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: t.bgInput,
            border: `1px solid ${t.border}`,
            borderRadius: '6px',
            color: t.textPrimary,
            fontSize: '13px',
          }}
        />
      </div>
      
      {/* RIGHT SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        
        <button onClick={onFiltersToggle} style={{
          background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 4,
          color: t.textPrimary, padding: '6px 10px', cursor: 'pointer', fontSize: 11,
        }}>
          🎛️ Filters ▼
        </button>
      
      <WhiteboardSelector
        whiteboards={whiteboards}
        activeId={activeWhiteboardId}
        isOpen={showWhiteboardDropdown}
        onToggle={onWhiteboardDropdownToggle}
        onSelect={onWhiteboardSelect}
        onNewWhiteboard={onNewWhiteboard}
        onDelete={onDeleteWhiteboard}
      />

      {/* Viewpoint Toggle */}
      <div style={{ display: 'flex', gap: '2px' }}>
        {viewBtn('plm', '📋 PLM', 'PLM View - Full details', '6px 0 0 6px')}
        {viewBtn('whiteboard', '🎨 Simple', 'Whiteboard - Simplified')}
        {viewBtn('freeform', '✏️ Draw', 'Freeform Drawing')}
        {viewBtn('document', '📄 Doc', 'Document View')}
        {viewBtn('tasks', '☑ Tasks', 'Task Board')}
        {viewBtn('gantt', '📊 Gantt', 'Gantt Timeline')}
        {viewBtn('3d', '🔮 3D', '3D Traceability View')}
        {viewBtn('sequence', '📊 Seq', 'Sequence Diagram')}
        {viewBtn('hal', '🔌 HAL', 'Hardware Abstraction Layer')}
        {viewBtn('docs', '📑 Docs', 'Document Engine', '0 6px 6px 0')}
      </div>

      {/* Theme Toggle */}
      <button
        onClick={onToggleTheme}
        style={{
          background: t.bgInput,
          border: `1px solid ${t.border}`,
          borderRadius: '6px',
          padding: '6px 10px',
          cursor: 'pointer',
          fontSize: '14px',
          color: t.textPrimary,
          transition: 'background 0.2s',
        }}
        title={isDarkMode ? 'Byt till ljust tema' : 'Byt till mörkt tema'}
      >
        {isDarkMode ? '☀️' : '🌙'}
      </button>

      {/* Filters Dropdown */}
      {filtersOpen && (
        <div style={{
          position: 'absolute',
          top: '50px',
          right: '300px',
          background: t.bgPanel,
          border: `1px solid ${t.border}`,
          borderRadius: '8px',
          padding: '15px',
          boxShadow: t.shadowLg,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          zIndex: 1000,
          minWidth: '400px',
        }}>
          <select value={filters.type} onChange={(e: any) => onFilterChange('type', e.target.value)} style={selectStyle}>
            <option value="all">All Types</option>
            <option value="customer">🟣 Customer</option>
            <option value="platform">🔷 Platform</option>
            <option value="project">🔶 Project</option>
            <option value="implementation">🟢 Implementation</option>
          </select>
          <select value={filters.state} onChange={(e: any) => onFilterChange('state', e.target.value)} style={selectStyle}>
            <option value="all">All States</option>
            <option value="open">📝 Open</option>
            <option value="frozen">🔒 Frozen</option>
            <option value="released">✅ Released</option>
          </select>
          <select value={filters.priority} onChange={(e: any) => onFilterChange('priority', e.target.value)} style={selectStyle}>
            <option value="all">All Priorities</option>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
          <select value={filters.classification} onChange={(e: any) => onFilterChange('classification', e.target.value)} style={selectStyle}>
            <option value="all">All Classifications</option>
            <option value="need">🎯 Need</option>
            <option value="capability">⚙️ Capability</option>
            <option value="requirement">📋 Requirement</option>
          </select>
        </div>
      )}
       
        {/* User & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {UserAvatarsComponent && <UserAvatarsComponent style={{ marginRight: '10px' }} />}
          <span style={{ color: t.textSecondary, fontSize: '12px' }}>
            👤 {user?.name}
          </span>
          <button
            onClick={onChangePassword}
            style={{
              padding: '6px 10px',
              background: t.bgInput,
              color: t.textPrimary,
              border: `1px solid ${t.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
            title="Change Password"
          >
            🔐
          </button>
          <button onClick={onLogout} style={{
            background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 4,
            color: t.textPrimary, padding: '6px 10px', cursor: 'pointer', fontSize: 11,
          }}>
            Logout
          </button>
        </div>
      </div>
      
    </div>
  );
}

export default TopHeader;
