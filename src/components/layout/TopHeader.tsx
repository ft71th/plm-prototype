import React from 'react';
import { NorthlightLogo } from '../../NorthlightLogo';
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
      
      <div style={{ flex: 1 }} />

      {/* RIGHT SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

      {/* View Modes */}
      <div style={{ display: 'flex', gap: '2px' }}>
        {viewBtn('whiteboard', '🎯 System', 'System View', '6px 0 0 6px')}
        {viewBtn('3d', '🔮 3D', '3D Traceability View')}
        {viewBtn('sequence', '📊 Seq', 'Sequence Diagram')}
        {viewBtn('hal', '🔌 HAL', 'Hardware Abstraction Layer')}
        {viewBtn('freeform', '✏️ Draw', 'Freeform Drawing')}
        <div style={{ width: '8px' }} />
        {viewBtn('tasks', '☑ Tasks', 'Task Board')}
        {viewBtn('gantt', '📊 Gantt', 'Gantt Timeline')}
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
