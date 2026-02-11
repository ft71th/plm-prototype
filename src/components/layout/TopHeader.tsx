import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Port } from '../../types';
import React from 'react';
import { NorthlightLogo } from '../../NorthlightLogo';
import { UserAvatars } from '../../collaboration';
import WhiteboardSelector from './WhiteboardSelector';

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
  UserAvatarsComponent
}: any) {
    return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 15px',
      background: '#2c3e50',
      borderBottom: '2px solid #34495e',
      height: '50px',
      position: 'relative',
      zIndex: 100,
      gap: '15px'
    }}>
      {/* LEFT SECTION - Menu & Project Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={onMenuClick}>☰</button>
        <NorthlightLogo size={30} showText={false} animated={false} />
        <span style={{ color: 'white', fontWeight: 'bold' }}>
          🎯 {objectName}
        </span>
        <span style={{
          background: '#3498db',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          color: 'white'
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
            background: '#34495e',
            border: '1px solid #4a5f7f',
            borderRadius: '6px',
            color: 'white',
            fontSize: '13px'
          }}
        />
      </div>
      
      {/* RIGHT SECTION - Filters, Viewpoints, User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        
        {/* Filters Button */}
        <button onClick={onFiltersToggle} style={{ /* filter button styles */ }}>
          🎛️ Filters ▼
        </button>
      
            
      {/* Whiteboard Selector - replaces the old toggle */}
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
        <button
          onClick={() => onViewModeChange('plm')}
          style={{
            padding: '6px 10px',
            background: viewMode === 'plm' ? '#3498db' : '#2c3e50',
            color: 'white',
            border: '1px solid #4a5f7f',
            borderRadius: '6px 0 0 6px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold'
          }}
          title="PLM View - Full details"
        >
          📋 PLM
        </button>
        <button
          onClick={() => onViewModeChange('whiteboard')}
          style={{
            padding: '6px 10px',
            background: viewMode === 'whiteboard' ? '#3498db' : '#2c3e50',
            color: 'white',
            border: '1px solid #4a5f7f',
            borderRadius: '0',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold'
          }}
          title="Whiteboard - Simplified"
        >
          🎨 Simple
        </button>
        <button
          onClick={() => onViewModeChange('freeform')}
          style={{
            padding: '6px 10px',
            background: viewMode === 'freeform' ? '#3498db' : '#2c3e50',
            color: 'white',
            border: '1px solid #4a5f7f',
            borderRadius: '0',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold'
          }}
          title="Freeform Drawing"
        >
          ✏️ Draw
        </button>
        <button
          onClick={() => onViewModeChange('document')}
          style={{
            padding: '6px 10px',
            background: viewMode === 'document' ? '#3498db' : '#2c3e50',
            color: 'white',
            border: '1px solid #4a5f7f',
            borderRadius: '0',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold'
          }}
          title="Document View"
        >
          📄 Doc
        </button>
        <button
          onClick={() => onViewModeChange('tasks')}
          style={{
            padding: '6px 10px',
            background: viewMode === 'tasks' ? '#3498db' : '#2c3e50',
            color: 'white',
            border: '1px solid #4a5f7f',
            borderRadius: '0 6px 6px 0',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold'
          }}
          title="Task Board"
        >
          ☑ Tasks
        </button>
      </div>

      {/* Filters Dropdown */}
      {filtersOpen && (
        <div style={{
          position: 'absolute',
          top: '50px',
          right: '300px',
          background: '#1a2634',
          border: '1px solid #34495e',
          borderRadius: '8px',
          padding: '15px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          zIndex: 1000,
          minWidth: '400px'
        }}>
          <select
            value={filters.type}
            onChange={(e: any) => onFilterChange('type', e.target.value)}
            style={{
              padding: '8px',
              background: '#2c3e50',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="all">All Types</option>
            <option value="customer">🟣 Customer</option>
            <option value="platform">🔷 Platform</option>
            <option value="project">🔶 Project</option>
            <option value="implementation">🟢 Implementation</option>
          </select>
          
          <select
            value={filters.state}
            onChange={(e: any) => onFilterChange('state', e.target.value)}
            style={{
              padding: '8px',
              background: '#2c3e50',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="all">All States</option>
            <option value="open">📝 Open</option>
            <option value="frozen">🔒 Frozen</option>
            <option value="released">✅ Released</option>
          </select>
          
          <select
            value={filters.priority}
            onChange={(e: any) => onFilterChange('priority', e.target.value)}
            style={{
              padding: '8px',
              background: '#2c3e50',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="all">All Priorities</option>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
          
          <select
            value={filters.classification}
            onChange={(e: any) => onFilterChange('classification', e.target.value)}
            style={{
              padding: '8px',
              background: '#2c3e50',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="all">All Classifications</option>
            <option value="need">🎯 Need</option>
            <option value="capability">⚙️ Capability</option>
            <option value="requirement">📋 Requirement</option>
          </select>
        </div>
      )}
       
        {/* User & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          
          {/* Online Users */}
          {UserAvatarsComponent && <UserAvatarsComponent style={{ marginRight: '10px' }} />}
          
          <span style={{ color: '#bdc3c7', fontSize: '12px' }}>
            👤 {user?.name}
          </span>
          <button
            onClick={onChangePassword}
            style={{
              padding: '6px 10px',
              background: '#34495e',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
            title="Change Password"
          >
            🔐
          </button>
          <button onClick={onLogout} style={{ /* logout styles */ }}>
            Logout
          </button>
        </div>
      </div>  {/* This is the existing closing div */}
      
    </div>
  );
}

// Left Icon Strip Component

export default TopHeader;
