import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Port } from '../../types';
import React from 'react';

function LeftIconStrip({ 
  onAddSystem, 
  onAddSubSystem, 
  onAddFunction, 
  onAddTestCase,
  onAddRequirement,
  onAddPlatform,
  onAddParameter,
  onAddHardware,
  onAddUseCase,
  onAddActor,
  onAddTextAnnotation,
  onAddPostIt,
  onOpenLibrary,
  onOpenIssueManager,
  onVoice,
  isListening,
  voiceStatus
}: any) {
  const iconButtonStyle = {
    width: '44px',
    height: '44px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s, box-shadow 0.1s',
    flexShrink: 0
  };

  // Wrapper to stop propagation and prevent ReactFlow interference
  const handleClick = (callback) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    callback();
  };

  // Button with label component
  const ToolbarButton = ({ onClick, title, bgColor, icon, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button 
        onClick={handleClick(onClick)} 
        title={title}
        style={{ ...iconButtonStyle, background: bgColor }}
      >
        {children || icon}
      </button>
      <span style={{ 
        color: 'white', 
        fontSize: '11px', 
        fontWeight: '500',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        whiteSpace: 'nowrap'
      }}>
        {title.replace('Add ', '')}
      </span>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      left: '10px',
      top: '70px',  // Below header
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      zIndex: 2500,
      background: 'rgba(44, 62, 80, 0.85)',
      padding: '10px',
      borderRadius: '10px',
      backdropFilter: 'blur(4px)'
    }}>
      {/* System Engineering */}
      <ToolbarButton onClick={onAddSystem} title="Add System" bgColor="#1abc9c" icon="🔷" />
      <ToolbarButton onClick={onAddSubSystem} title="Add Sub-System" bgColor="#3498db" icon="🔶" />
      <ToolbarButton onClick={onAddFunction} title="Add Function" bgColor="#00bcd4" icon="⚡" />
      
      {/* Separator */}
      <div style={{ height: '1px', background: '#4a5f7f', margin: '4px 0' }} />
      
      {/* Hardware & Parameters */}
      <ToolbarButton onClick={() => onAddHardware('generic')} title="Add Hardware" bgColor="#795548" icon="📦" />
      <ToolbarButton onClick={() => onAddParameter('configuration')} title="Add Parameter" bgColor="#00bcd4" icon="⚙️" />
      
      {/* Separator */}
      <div style={{ height: '1px', background: '#4a5f7f', margin: '4px 0' }} />
      
      {/* Test */}
      <ToolbarButton onClick={onAddTestCase} title="Add Test Case" bgColor="#27ae60" icon="🧪" />
      
      {/* Separator */}
      <div style={{ height: '1px', background: '#4a5f7f', margin: '4px 0' }} />
      
      {/* Use Cases */}
      <ToolbarButton onClick={onAddUseCase} title="Add Use Case" bgColor="#f39c12" icon="🎯" />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button 
          onClick={handleClick(onAddActor)} 
          title="Add Actor"
          style={{ ...iconButtonStyle, background: '#2ecc71' }}
        >
          <svg 
            width={24} 
            height={28} 
            viewBox="0 0 100 120" 
            style={{ fill: 'white' }}
          >
            <circle cx="50" cy="20" r="12" fill="none" stroke="white" strokeWidth="4" />
            <line x1="50" y1="32" x2="50" y2="75" stroke="white" strokeWidth="4" />
            <line x1="25" y1="50" x2="75" y2="50" stroke="white" strokeWidth="4" />
            <line x1="50" y1="75" x2="30" y2="105" stroke="white" strokeWidth="4" />
            <line x1="50" y1="75" x2="70" y2="105" stroke="white" strokeWidth="4" />
          </svg>
        </button>
        <span style={{ 
          color: 'white', 
          fontSize: '11px', 
          fontWeight: '500',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap'
        }}>
          Actor
        </span>
      </div>
      
      {/* Separator */}
      <div style={{ height: '1px', background: '#4a5f7f', margin: '4px 0' }} />
      
      {/* Requirements */}
      <ToolbarButton onClick={onAddRequirement} title="Add Requirement" bgColor="#e67e22" icon="📋" />
      <ToolbarButton onClick={onAddPlatform} title="Add Platform" bgColor="#9b59b6" icon="🟣" />
      
      {/* Separator */}
      <div style={{ height: '1px', background: '#4a5f7f', margin: '4px 0' }} />
      
      {/* Annotations */}
      <ToolbarButton onClick={onAddTextAnnotation} title="Add Text" bgColor="#607d8b" icon="📝" />
      <ToolbarButton onClick={onAddPostIt} title="Add Post-it" bgColor="#f9e547" icon="📌" />
      
      {/* Separator */}
      <div style={{ height: '1px', background: '#4a5f7f', margin: '4px 0' }} />
      
      {/* Library & Issues */}
      <ToolbarButton onClick={onOpenLibrary} title="Library" bgColor="#16a085" icon="📚" />
      <ToolbarButton onClick={onOpenIssueManager} title="Issues" bgColor="#c0392b" icon="🐛" />
      
      {/* Separator */}
      <div style={{ height: '1px', background: '#4a5f7f', margin: '4px 0' }} />
      
      {/* Voice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button 
          onClick={handleClick(onVoice)} 
          title={isListening ? 'Listening...' : 'Voice Command'}
          disabled={isListening}
          style={{ 
            ...iconButtonStyle, 
            background: isListening ? '#e74c3c' : '#3498db',
            animation: isListening ? 'pulse 1s infinite' : 'none'
          }}
        >
          🎤
        </button>
        <span style={{ 
          color: 'white', 
          fontSize: '11px', 
          fontWeight: '500',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap'
        }}>
          Voice
        </span>
      </div>
      
      {/* Voice Status */}
      {voiceStatus && (
        <div style={{
          background: '#2c3e50',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '10px',
          color: voiceStatus.includes('✅') ? '#27ae60' : 
                 voiceStatus.includes('❌') ? '#e74c3c' : '#3498db',
          maxWidth: '120px',
          wordBreak: 'break-word'
        }}>
          {voiceStatus}
        </div>
      )}
    </div>
  );
}

// Whiteboard Selector Dropdown

export default LeftIconStrip;
