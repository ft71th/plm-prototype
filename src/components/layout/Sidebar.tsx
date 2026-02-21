import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Port } from '../../types';
import React from 'react';

function Sidebar({ isOpen, onClose, children }: any) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--nl-bg-overlay, rgba(0,0,0,0.3))',
            zIndex: 4000
          }}
        />
      )}
      
      {/* Sidebar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: isOpen ? 0 : '-280px',
        width: '260px',
        height: '100vh',
        backgroundColor: 'var(--nl-bg-panel, #1a2634)',
        boxShadow: isOpen ? 'var(--nl-shadow-lg, 4px 0 20px rgba(0,0,0,0.5))' : 'none',
        transition: 'left 0.3s ease',
        zIndex: 4001,
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--nl-text-primary, white)'
      }}>
        {/* Header */}
        <div style={{
          padding: '15px',
          borderBottom: '1px solid var(--nl-border, #34495e)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>☰ MENU</span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--nl-text-primary, white)',
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
        
        {/* Content */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: '10px'
        }}>
          {children}
        </div>
      </div>
    </>
  );
}

// Sidebar Section Component
function SidebarSection({ title, children }) {
  return (
    <div style={{ marginBottom: '15px' }}>
      <div style={{
        fontSize: '11px',
        color: 'var(--nl-text-muted, #7f8c8d)',
        textTransform: 'uppercase',
        fontWeight: 'bold',
        marginBottom: '8px',
        paddingLeft: '5px'
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// Sidebar Button Component
function SidebarButton({ icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '10px 12px',
        background: active ? 'var(--nl-bg-accent, #3498db)' : 'transparent',
        color: 'var(--nl-text-primary, white)',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '4px',
        transition: 'background 0.2s'
      }}
      onMouseOver={(e: any) => e.currentTarget.style.background = active ? 'var(--nl-bg-accent, #3498db)' : 'var(--nl-bg-hover, #2c3e50)'}
      onMouseOut={(e: any) => e.currentTarget.style.background = active ? 'var(--nl-bg-accent, #3498db)' : 'transparent'}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      {label}
    </button>
  );
}

export { Sidebar, SidebarSection, SidebarButton };
