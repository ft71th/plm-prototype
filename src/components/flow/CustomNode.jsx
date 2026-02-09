import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';

function CustomNode({ data, id, selected }) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const isHighlighted = data.isHighlighted;

  const getBorderColor = () => {
    if (data.priority === 'high') return '#e74c3c';
    if (data.priority === 'low') return '#27ae60';
    return '#f39c12';
  };

  const getStateColor = () => {
    if (data.state === 'released') return '#27ae60';
    if (data.state === 'frozen') return '#3498db';
    return '#f39c12';
  };

  const getReqTypeColor = () => {
    if (data.reqType === 'customer') return '#9b59b6';      // Purple
    if (data.reqType === 'platform') return '#2c3e50';      // Dark Navy (was blue)
    if (data.reqType === 'project') return '#e67e22';       // Orange
    if (data.reqType === 'implementation') return '#f1c40f'; // Yellow/Gold (was teal)
    return '#95a5a6';
  };

  const getClassificationIcon = () => {
    if (data.classification === 'need') return '🎯';
    if (data.classification === 'capability') return '⚙️';
    if (data.classification === 'requirement') return '📋';
    return '📄';
  };

  const isSystemItem = () => {
    return ['system', 'subsystem', 'function'].includes(data.itemType || data.type);
  };

  const isTestItem = () => {
    return ['testcase', 'testrun', 'testresult'].includes(data.itemType || data.type);
  };

  const isParameterItem = () => {
    return data.itemType === 'parameter' || data.type === 'parameter';
  };

  const isHardwareItem = () => {
    return data.itemType === 'hardware' || data.type === 'hardware';
  };

  const isUseCaseItem = () => {
    return data.itemType === 'usecase' || data.type === 'usecase';
  };

  const isActorItem = () => {
    return data.itemType === 'actor' || data.type === 'actor';
  };

  const getSystemAccentColor = () => {
    if (data.itemType === 'system' || data.type === 'system') return '#1abc9c';       // Teal
    if (data.itemType === 'subsystem' || data.type === 'subsystem') return '#3498db'; // Blue
    if (data.itemType === 'function' || data.type === 'function') return '#00bcd4';   // Cyan
    if (data.itemType === 'testcase' || data.type === 'testcase') return '#27ae60';   // Green
    if (data.itemType === 'testrun' || data.type === 'testrun') return '#e67e22';     // Orange
    if (data.itemType === 'testresult' || data.type === 'testresult') return '#9b59b6'; // Purple
    if (data.itemType === 'usecase' || data.type === 'usecase') return '#f39c12';     // Orange
    if (data.itemType === 'actor' || data.type === 'actor') return '#2ecc71';         // Emerald Green
    if (data.itemType === 'parameter' || data.type === 'parameter') {
      // Parameter types: configuration = cyan, settings = magenta
      if (data.paramType === 'configuration') return '#00bcd4';  // Cyan
      if (data.paramType === 'settings') return '#e91e63';       // Magenta
      return '#00bcd4';  // Default to cyan
    }
    if (data.itemType === 'hardware' || data.type === 'hardware') return '#795548';   // Brown
    return '#95a5a6';
  };

  const getWhiteboardColor = () => {
    // Check if it's a requirement type
    if (data.itemType === 'requirement' || data.type === 'requirement' ||
        ['customer', 'platform', 'project', 'implementation'].includes(data.reqType)) {
      return getReqTypeColor();
    }
    // Parameter and Hardware use system accent colors
    if (isParameterItem() || isHardwareItem()) {
      return getSystemAccentColor();
    }
    // Otherwise use system colors
    return getSystemAccentColor();
  };

  const getItemTypeLabel = () => {
    if (data.itemType === 'system' || data.type === 'system') return 'SYSTEM';
    if (data.itemType === 'subsystem' || data.type === 'subsystem') return 'SUB-SYSTEM';
    if (data.itemType === 'function' || data.type === 'function') return 'FUNCTION';
    if (data.itemType === 'testcase' || data.type === 'testcase') return 'TEST CASE';
    if (data.itemType === 'testrun' || data.type === 'testrun') return 'TEST RUN';
    if (data.itemType === 'testresult' || data.type === 'testresult') return 'TEST RESULT';
    if (data.itemType === 'parameter' || data.type === 'parameter') return 'PARAMETER';
    if (data.itemType === 'hardware' || data.type === 'hardware') return 'HARDWARE';
    if (data.itemType === 'usecase' || data.type === 'usecase') return 'USE CASE';
    if (data.itemType === 'actor' || data.type === 'actor') return 'ACTOR';
    return null;
  };

  const getItemTypeIcon = () => {
    if (data.itemType === 'system' || data.type === 'system') return '🔷';
    if (data.itemType === 'subsystem' || data.type === 'subsystem') return '🔶';
    if (data.itemType === 'function' || data.type === 'function') return '⚡';
    if (data.itemType === 'testcase' || data.type === 'testcase') return '🧪';
    if (data.itemType === 'testrun' || data.type === 'testrun') return '▶️';
    if (data.itemType === 'testresult' || data.type === 'testresult') return '✅';
    if (data.itemType === 'parameter' || data.type === 'parameter') return '⚙️';
    if (data.itemType === 'usecase' || data.type === 'usecase') return '🎯';
    if (data.itemType === 'actor' || data.type === 'actor') return '👤';
    if (data.itemType === 'hardware' || data.type === 'hardware') {
      // Custom icon or base64/URL image takes priority
      if (data.hwCustomIcon || data.hwIcon?.startsWith('data:') || data.hwIcon?.startsWith('http')) return 'custom';
      return data.hwIcon || '📦';
    }
    return null;
  };

  // Render hardware icon (emoji or custom image)
  const renderHardwareIcon = (size = 24) => {
    // Custom uploaded icon takes priority
    if (data.hwCustomIcon) {
      return (
        <img 
          src={data.hwCustomIcon} 
          alt="HW"
          style={{ 
            width: `${size}px`, 
            height: `${size}px`, 
            objectFit: 'contain'
          }}
        />
      );
    }
    // Check if hwIcon is a base64 or URL image
    if (data.hwIcon?.startsWith('data:') || data.hwIcon?.startsWith('http')) {
      return (
        <img 
          src={data.hwIcon} 
          alt="HW"
          style={{ 
            width: `${size}px`, 
            height: `${size}px`, 
            objectFit: 'contain'
          }}
        />
      );
    }
    // Default: emoji
    return <span style={{ fontSize: `${size * 0.8}px` }}>{data.hwIcon || '📦'}</span>;
  };

  // Render UML Actor stick figure
  const renderActorStickFigure = (size = 60) => {
    return (
      <svg 
        width={size} 
        height={size * 1.2} 
        viewBox="0 0 100 120" 
        style={{ 
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
        }}
      >
        {/* Head - circle */}
        <circle 
          cx="50" 
          cy="20" 
          r="12" 
          fill="none" 
          stroke={getSystemAccentColor()} 
          strokeWidth="3"
        />
        
        {/* Body - vertical line */}
        <line 
          x1="50" 
          y1="32" 
          x2="50" 
          y2="75" 
          stroke={getSystemAccentColor()} 
          strokeWidth="3"
        />
        
        {/* Arms - horizontal line */}
        <line 
          x1="25" 
          y1="50" 
          x2="75" 
          y2="50" 
          stroke={getSystemAccentColor()} 
          strokeWidth="3"
        />
        
        {/* Left leg */}
        <line 
          x1="50" 
          y1="75" 
          x2="30" 
          y2="105" 
          stroke={getSystemAccentColor()} 
          strokeWidth="3"
        />
        
        {/* Right leg */}
        <line 
          x1="50" 
          y1="75" 
          x2="70" 
          y2="105" 
          stroke={getSystemAccentColor()} 
          strokeWidth="3"
        />
      </svg>
    );
  };

  // SHAPE FUNCTION - Must be BEFORE the return statement!
  const getNodeShape = () => {
    const type = data.itemType || data.type;
    const reqType = data.reqType;
    
    // Requirements get shapes based on reqType
    if (type === 'requirement' || ['customer', 'platform', 'project', 'implementation'].includes(reqType)) {
      switch (reqType) {
        case 'customer':
          return {
            borderRadius: '4px',            // Sharp rectangle
            borderStyle: 'solid',
          };
        case 'platform':
          return {
            borderRadius: '12px',           // Rounded rectangle
            borderStyle: 'solid',
          };
        case 'project':
          return {
            borderRadius: '20px',           // Pill shape
            borderStyle: 'solid',
          };
        case 'implementation':
          return {
            borderRadius: '4px',            // Rectangle
            borderStyle: 'dashed',          // Dashed border!
          };
        default:
          return { borderRadius: '8px' };
      }
    }
    
    switch (type) {
      case 'system':
        return {
          borderRadius: '8px',           // Rectangle with slight rounding
        };
      case 'subsystem':
        return {
          borderRadius: '20px',          // More rounded rectangle (pill-like)
        };
      case 'function':
        return {
          borderRadius: '50px',          // Oval/Ellipse effect
          paddingTop: '20px',
          paddingBottom: '20px',
        };
      case 'testcase':
        return {
          borderRadius: '0px',           // Sharp corners
          borderWidth: '4px',
          borderStyle: 'double',
        };
      case 'parameter':
        return {
          borderRadius: '8px',           // Rectangle
          borderStyle: data.paramType === 'configuration' ? 'solid' : 'dashed',
        };
      case 'hardware':
        return {
          borderRadius: '4px',           // Sharp corners for HW
          borderWidth: '3px',
          borderStyle: 'solid',
        };
      case 'usecase':
        return {
          borderRadius: '50%',           // Perfect oval for use cases
          paddingTop: '15px',
          paddingBottom: '15px',
          paddingLeft: '20px',
          paddingRight: '20px',
          borderWidth: '2px',
          borderStyle: 'solid',
        };
      case 'actor':
        return {
          borderRadius: '8px',           // Rounded rectangle for actors
          borderWidth: '0px',           // No border - just background
          borderStyle: 'none',
          minHeight: '100px',           // Taller for stick figure + name
          minWidth: '80px',            // Wider for stick figure
          padding: '10px',
          background: 'transparent',    // Transparent background
        };
      default:
        return {
          borderRadius: '8px',           // Standard rectangle
        };
    }
  };

   // FLOATING CONNECTOR - Small circle node
  // FLOATING CONNECTOR - Small circle node
  if (data.isFloatingConnector) {
    return (
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: selected ? '#3498db' : '#e74c3c',
        border: '3px solid #fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
      }}>
        <Handle
          type="target"
          position={Position.Left}
          id="connector-target"
          style={{ 
            background: '#555',
            width: '10px',
            height: '10px',
            left: '-5px',
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="connector-source"
          style={{ 
            background: '#555',
            width: '10px',
            height: '10px',
            right: '-5px',
          }}
        />
      </div>
    );
  }

  const handleDoubleClick = () => {
    if (data.state === 'frozen' || data.state === 'released') {
      return;
    }
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onChange) {
      data.onChange(id, label);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (data.onChange) {
        data.onChange(id, label);
      }
    }
    if (e.key === 'Escape') {
      setLabel(data.label);
      setIsEditing(false);
    }
  };

  // GROUP NODE - Container for grouped items
  if (data.isGroup) {
    return (
      <div style={{
        width: `${data.groupWidth || 300}px`,
        height: `${data.groupHeight || 200}px`,
        backgroundColor: `${data.groupColor || '#3498db'}15`,
        border: `2px dashed ${data.groupColor || '#3498db'}`,
        borderRadius: '12px',
        position: 'relative',
        pointerEvents: 'all',
      }}>
        {/* Group Label */}
        <div style={{
          position: 'absolute',
          top: '-12px',
          left: '12px',
          backgroundColor: data.groupColor || '#3498db',
          color: 'white',
          padding: '2px 10px',
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          📁 {data.label}
        </div>
        
        {/* Lock indicator for groups */}
        {data.locked && (
          <div style={{
            position: 'absolute',
            top: '-12px',
            right: '12px',
            backgroundColor: '#e74c3c',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '10px',
            fontSize: '10px'
          }}>
            🔒
          </div>
        )}
        
        {/* Handles for connecting to/from groups */}
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: data.groupColor || '#3498db', width: '10px', height: '10px' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: data.groupColor || '#3498db', width: '10px', height: '10px' }}
        />
      </div>
    );
  }

  
    // WHITEBOARD MODE - HARDWARE NODES (Icon-centric design)
  if (data.isWhiteboardMode && (data.itemType === 'hardware' || data.type === 'hardware')) {
    const ports = data.ports || [];
    const inputPorts = ports.filter(p => p.direction === 'input' || p.type === 'input');
    const outputPorts = ports.filter(p => p.direction === 'output' || p.type === 'output');
    
    const getHandlePosition = (index, total) => {
      if (total === 1) return '50%';
      const spacing = 100 / (total + 1);
      return `${spacing * (index + 1)}%`;
    };

    // Icon-based sizing - the node IS the icon
    const iconSize = data.hwIconSize || 64;  // Configurable icon size
    const maxPorts = Math.max(inputPorts.length, outputPorts.length, 1);
    const nodeHeight = Math.max(iconSize + 30, maxPorts * 24 + 20);  // Icon + label space
    const nodeWidth = Math.max(iconSize + 20, 80);  // Icon width + padding

    return (
      <div 
        style={{
          width: `${nodeWidth}px`,
          minHeight: `${nodeHeight}px`,
          backgroundColor: 'transparent',
          position: 'relative',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: '4px',
        }}>

        {/* The Icon IS the node */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '4px',
          borderRadius: '8px',
          background: selected ? 'rgba(52, 152, 219, 0.3)' : 'transparent',
          border: selected ? '2px solid #3498db' : '2px solid transparent',
          transition: 'all 0.2s ease',
        }}>
          {(data.hwCustomIcon || data.hwIcon?.startsWith('data:') || data.hwIcon?.startsWith('http')) ? (
            <img 
              src={data.hwCustomIcon || data.hwIcon} 
              alt={data.label || 'Hardware'}
              style={{ 
                width: `${iconSize}px`, 
                height: `${iconSize}px`, 
                objectFit: 'contain',
                filter: selected 
                  ? 'drop-shadow(0 0 8px rgba(52, 152, 219, 0.8))' 
                  : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }}
            />
          ) : (
            <span style={{ 
              fontSize: `${iconSize * 0.75}px`,
              lineHeight: 1,
              filter: selected 
                ? 'drop-shadow(0 0 8px rgba(52, 152, 219, 0.8))' 
                : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}>
              {data.hwIcon || '📦'}
            </span>
          )}
          
          {/* Label below icon */}
          <div style={{
            marginTop: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            maxWidth: `${nodeWidth + 40}px`,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textShadow: '0 0 3px #fff, 0 0 3px #fff',
          }}>
            {data.label}
          </div>
        </div>

        {/* Connection handles */}
        <Handle
          type="target"
          position={Position.Left}
          id="default-target"
          style={{
            background: '#27ae60',
            width: '10px',
            height: '10px',
            left: '-5px',
            top: '50%',
            transform: 'translateY(-50%)',
            border: '2px solid #fff',
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="default-source"
          style={{
            background: '#e67e22',
            width: '10px',
            height: '10px',
            right: '-5px',
            top: '50%',
            transform: 'translateY(-50%)',
            border: '2px solid #fff',
          }}
        />

        {/* Port handles if any */}
        {inputPorts.map((port, index) => (
          <Handle
            key={port.id}
            type="target"
            position={Position.Left}
            id={port.id}
            style={{
              background: '#27ae60',
              width: 8,
              height: 8,
              top: getHandlePosition(index, inputPorts.length),
              border: '2px solid #fff'
            }}
            title={port.name}
          />
        ))}
        {outputPorts.map((port, index) => (
          <Handle
            key={port.id}
            type="source"
            position={Position.Right}
            id={port.id}
            style={{
              background: '#e67e22',
              width: 8,
              height: 8,
              top: getHandlePosition(index, outputPorts.length),
              border: '2px solid #fff'
            }}
            title={port.name}
          />
        ))}
      </div>
    );
  }

    // WHITEBOARD MODE - UML ACTOR NODES (Stick figure with name below)
  if (data.isWhiteboardMode && (data.itemType === 'actor' || data.type === 'actor')) {
    return (
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '100px',
          minHeight: '120px',
          backgroundColor: 'transparent',
          position: 'relative',
          cursor: 'pointer',
          padding: '10px',
          borderRadius: '8px',
          background: selected ? 'rgba(46, 204, 113, 0.1)' : 'transparent',
          border: selected ? '2px solid #2ecc71' : '2px solid transparent',
          transition: 'all 0.2s ease',
        }}>
        
        {/* UML Actor Stick Figure */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '8px',
        }}>
          {renderActorStickFigure(50)}
        </div>
        
        {/* Actor Name Below */}
        <div style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#2ecc71',
          textAlign: 'center',
          maxWidth: '90px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textShadow: '0 0 3px #000, 0 0 3px #000',
        }}>
          {data.label}
        </div>

        {/* Connection Handles */}
        <Handle
          type="target"
          position={Position.Left}
          style={{ 
            background: '#2ecc71', 
            width: '8px', 
            height: '8px',
            left: '-4px' 
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          style={{ 
            background: '#2ecc71', 
            width: '8px', 
            height: '8px',
            right: '-4px' 
          }}
        />
        <Handle
          type="target"
          position={Position.Top}
          style={{ 
            background: '#2ecc71', 
            width: '8px', 
            height: '8px',
            top: '-4px' 
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ 
            background: '#2ecc71', 
            width: '8px', 
            height: '8px',
            bottom: '-4px' 
          }}
        />
      </div>
    );
  }

    // WHITEBOARD MODE - Simplified view with port labels
  if (data.isWhiteboardMode) {
    const ports = data.ports || [];
    const inputPorts = ports.filter(p => p.direction === 'input' || p.type === 'input');
    const outputPorts = ports.filter(p => p.direction === 'output' || p.type === 'output');
    
    const getHandlePosition = (index, total) => {
      if (total === 1) return '50%';
      const spacing = 100 / (total + 1);
      return `${spacing * (index + 1)}%`;
    };

    // Calculate dimensions based on content
    const maxPorts = Math.max(inputPorts.length, outputPorts.length, 1);
    const isHardware = data.itemType === 'hardware' || data.type === 'hardware';
    const baseHeight = isHardware ? 100 : 80;  // Larger base for hardware icons
    const nodeHeight = Math.max(baseHeight, maxPorts * 32 + 40);
    
    // Calculate width based on longest port names + label
    const getTextWidth = (text) => text ? text.length * 7 : 0;
    const longestInput = inputPorts.reduce((max, p) => {
      const name = p.name + (p.width ? `[${p.width-1}:0]` : '');
      return Math.max(max, getTextWidth(name));
    }, 0);
    const longestOutput = outputPorts.reduce((max, p) => {
      const name = p.name + (p.width ? `[${p.width-1}:0]` : '');
      return Math.max(max, getTextWidth(name));
    }, 0);
    const labelWidth = getTextWidth(data.label);
    
    // Total width = left ports + padding + label + padding + right ports
    const nodeWidth = Math.max(
      140,  // Minimum width
      longestInput + labelWidth + longestOutput + 60  // ports + label + spacing
    );

    return (
      <>
        {/* NodeResizer for whiteboard mode */}
        <NodeResizer
          color="#3498db"
          isVisible={selected}
          minWidth={120}
          minHeight={60}
          handleStyle={{
            width: '10px',
            height: '10px',
            borderRadius: '2px',
          }}
        />
        <div 
          style={{
            width: data.width || `${nodeWidth}px`,
            minHeight: data.height || `${nodeHeight}px`,
            backgroundColor: getWhiteboardColor(),
            borderRadius: getNodeShape().borderRadius || '8px',
            borderStyle: getNodeShape().borderStyle || 'solid',
            border: selected ? '3px solid #3498db' : '2px solid rgba(255,255,255,0.3)',
            boxShadow: selected ? '0 0 20px rgba(52, 152, 219, 0.5)' : '0 4px 12px rgba(0,0,0,0.2)',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box',
          }}>

        {/* TYPE BADGE - Special handling for Hardware with larger icons */}
        {(data.itemType === 'hardware' || data.type === 'hardware') ? (
          <div style={{
            position: 'absolute',
            top: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px'
          }}>
            {(data.hwCustomIcon || data.hwIcon?.startsWith('data:') || data.hwIcon?.startsWith('http')) ? (
              <img 
                src={data.hwCustomIcon || data.hwIcon} 
                alt="HW"
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                }}
              />
            ) : (
              <span style={{ 
                fontSize: '32px',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }}>
                {data.hwIcon || '📦'}
              </span>
            )}
            <span style={{
              fontSize: '8px',
              padding: '1px 4px',
              borderRadius: '2px',
              background: 'rgba(0,0,0,0.4)',
              color: '#fff',
              fontWeight: 'bold'
            }}>
              {data.hwType?.toUpperCase() || 'HW'}
            </span>
          </div>
        ) : (
          <div style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            fontSize: '8px',
            padding: '2px 6px',
            borderRadius: '3px',
            background: 'rgba(0,0,0,0.3)',
            color: '#fff',
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}>
            {data.itemType === 'requirement' ? 'REQ' :
             data.itemType === 'system' ? 'SYS' :
             data.itemType === 'subsystem' ? 'SUB' :
             data.itemType === 'function' ? 'FUN' :
             data.itemType === 'testcase' ? 'TC' :
             data.itemType === 'usecase' ? 'UC' :
             data.itemType === 'actor' ? 'ACT' :
             data.itemType === 'hardware' ? 'HW' :
             data.itemType === 'parameter' ? (data.paramType === 'configuration' ? 'CFG' : 'SET') : ''}
          </div>
        )}

        {/* Handles and Labels */}
        {/* Default handles - ALWAYS present for logical relationships */}
        <Handle
          type="target"
          position={Position.Left}
          id="default-target"
          style={{
            background: '#555',
            width: '8px',
            height: '8px',
            left: '-4px',
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: ports.length > 0 ? 0.3 : 1,  // Subtle when ports exist
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="default-source"
          style={{
            background: '#555',
            width: '8px',
            height: '8px',
            right: '-4px',
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: ports.length > 0 ? 0.3 : 1,
          }}
        />

        {/* Port-specific handles (if any) */}
        {ports.length > 0 && (
          <>
            {/* Input ports - left side */}
            {inputPorts.map((port, index) => {
              const topPos = getHandlePosition(index, inputPorts.length);
              const portLabel = port.name + (port.width ? `[${port.width-1}:0]` : '');
              return (
                <React.Fragment key={port.id}>
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={port.id}
                    style={{
                      background: '#27ae60',
                      width: 10,
                      height: 10,
                      top: topPos,
                      border: '2px solid #fff'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    left: '16px',
                    top: topPos,
                    transform: 'translateY(-50%)',
                    fontSize: '10px',
                    color: '#fff',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    whiteSpace: 'nowrap',
                    fontWeight: '500',
                    pointerEvents: 'none'
                  }}>
                    {portLabel}
                  </div>
                </React.Fragment>
              );
            })}
            
            {/* Output ports - right side */}
            {outputPorts.map((port, index) => {
              const topPos = getHandlePosition(index, outputPorts.length);
              const portLabel = port.name + (port.width ? `[${port.width-1}:0]` : '');
              return (
                <React.Fragment key={port.id}>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={port.id}
                    style={{
                      background: '#e67e22',
                      width: 10,
                      height: 10,
                      top: topPos,
                      border: '2px solid #fff'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    right: '16px',
                    top: topPos,
                    transform: 'translateY(-50%)',
                    fontSize: '10px',
                    color: '#fff',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    whiteSpace: 'nowrap',
                    textAlign: 'right',
                    fontWeight: '500',
                    pointerEvents: 'none'
                  }}>
                    {portLabel}
                  </div>
                </React.Fragment>
              );
            })}
          </>    
        )}

        {/* Center content - Node name */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          maxWidth: `${nodeWidth - longestInput - longestOutput - 40}px`,
          padding: '0 10px'
        }}>
          {isEditing ? (
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onFocus={(e) => e.target.select()}
              style={{
                width: '100%',
                fontSize: '14px',
                fontWeight: 'bold',
                background: 'rgba(255,255,255,0.9)',
                color: '#333',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 8px',
                outline: 'none',
                textAlign: 'center'
              }}
            />
          ) : (
            <div 
              onDoubleClick={handleDoubleClick}
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#fff',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                cursor: 'text',
                wordBreak: 'break-word'
              }}
            >
              {data.label}
            </div>
          )}
        </div>
      </div>
      </>
    );
  }

  // NORMAL PLM MODE - Full details (existing code below)
  return (
    <div 
      style={{
        padding: '15px',
        paddingLeft: (isSystemItem() || isTestItem() || isParameterItem() || isHardwareItem() || isUseCaseItem() || isActorItem()) ? '20px' : '15px',
        border: '3px solid ' + getBorderColor(),
        borderLeft: (isSystemItem() || isTestItem() || isParameterItem() || isHardwareItem() || isUseCaseItem() || isActorItem()) ? `6px solid ${getSystemAccentColor()}` : '3px solid ' + getBorderColor(),
        backgroundColor: (isSystemItem() || isTestItem() || isParameterItem() || isHardwareItem() || isUseCaseItem() || isActorItem()) ? '#1a2634' : '#2c3e50',
        minWidth: '180px',
        opacity: data.isFiltered === false ? 0.3 : 1,
        boxShadow: selected ? '0 0 20px rgba(52, 152, 219, 0.8)' : 
                  isHighlighted ? '0 0 15px rgba(241, 196, 15, 0.6)' : '0 4px 8px rgba(0,0,0,0.3)',
        transition: 'all 0.2s ease',
        position: 'relative',
        alignItems: 'center',
        ...getNodeShape()
      }}>
      
      {/* Dynamic Port Handles */}
      {(() => {
        const ports = data.ports || [];
        const inputPorts = ports.filter(p => p.direction === 'input' || p.type === 'input');
        const outputPorts = ports.filter(p => p.direction === 'output' || p.type === 'output');
        
        // If no ports defined, show default handles
        if (ports.length === 0) {
          return (
            <>
              <Handle 
                type="target" 
                position={Position.Left}
                id="default-target"
                style={{ 
                  background: '#27ae60', 
                  width: 10, 
                  height: 10,
                  border: '2px solid #1a1a2e'
                }}
              />
              <Handle 
                type="source" 
                position={Position.Right}
                id="default-source"
                style={{ 
                  background: '#e67e22', 
                  width: 10, 
                  height: 10,
                  border: '2px solid #1a1a2e'
                }}
              />
            </>
          );
        }
        
        // Calculate positions for multiple handles
        const getHandlePosition = (index, total) => {
          if (total === 1) return '50%';
          const spacing = 100 / (total + 1);
          return `${spacing * (index + 1)}%`;
        };
        
        return (
          <>
            {/* Default handles - ALWAYS present for logical relationships */}
            <Handle 
              type="target" 
              position={Position.Left}
              id="default-target"
              style={{ 
                background: '#27ae60', 
                width: 8, 
                height: 8,
                border: '2px solid #1a1a2e',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.5,
                zIndex: 1,
              }}
              title="Default input (for relationships)"
            />
            <Handle 
              type="source" 
              position={Position.Right}
              id="default-source"
              style={{ 
                background: '#e67e22', 
                width: 8, 
                height: 8,
                border: '2px solid #1a1a2e',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.5,
                zIndex: 1,
              }}
              title="Default output (for relationships)"
            />
            
            {/* Input ports on left */}
            {inputPorts.map((port, index) => (
              <React.Fragment key={port.id}>
                <Handle
                  type="target"
                  position={Position.Left}
                  id={port.id}
                  style={{
                    background: '#27ae60',
                    width: 10,
                    height: 10,
                    top: getHandlePosition(index, inputPorts.length),
                    border: '2px solid #1a1a2e'
                  }}
                  title={`${port.name}${port.width ? ` [${port.width-1}:0]` : ''} (${port.type || 'signal'})`}
                />
              </React.Fragment>
            ))}
            
            {/* Output ports on right */}
            {outputPorts.map((port, index) => (
              <React.Fragment key={port.id}>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={port.id}
                  style={{
                    background: '#e67e22',
                    width: 10,
                    height: 10,
                    top: getHandlePosition(index, outputPorts.length),
                    border: '2px solid #1a1a2e'
                  }}
                  title={`${port.name}${port.width ? ` [${port.width-1}:0]` : ''} (${port.type || 'signal'})`}
                />
              </React.Fragment>
            ))}
          </>
        );
      })()}
      
      {/* Hardware Icon Display - show prominently for hardware nodes */}
      {isHardwareItem() && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '10px',
          padding: '12px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {(data.hwCustomIcon || data.hwIcon?.startsWith('data:') || data.hwIcon?.startsWith('http')) ? (
            <img 
              src={data.hwCustomIcon || data.hwIcon} 
              alt="HW"
              style={{ 
                width: `${data.hwIconSize || 64}px`, 
                height: `${data.hwIconSize || 64}px`, 
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))'
              }}
            />
          ) : (
            <span style={{ 
              fontSize: `${(data.hwIconSize || 64) * 0.9}px`,
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))'
            }}>
              {data.hwIcon || '📦'}
            </span>
          )}
        </div>
      )}
      
      {/* UML Actor Stick Figure Display - show prominently for actor nodes */}
      {isActorItem() && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '15px',
          padding: '15px',
          background: 'rgba(46, 204, 113, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(46, 204, 113, 0.2)'
        }}>
          {/* Actor Type Label */}
          <div style={{
            fontSize: '9px',
            color: '#2ecc71',
            textTransform: 'uppercase',
            marginBottom: '8px',
            fontWeight: 'bold'
          }}>
            {data.actorType || 'Primary'} Actor
          </div>
          
          {/* Stick Figure */}
          {renderActorStickFigure(70)}
        </div>
      )}
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        gap: '8px'
      }}>
       <div style={{
          fontSize: '10px',
          padding: '3px 8px',
          borderRadius: '4px',
          backgroundColor: (isSystemItem() || isTestItem() || isParameterItem() || isHardwareItem() || isUseCaseItem() || isActorItem()) ? getSystemAccentColor() : getReqTypeColor(),
          color: 'white',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          {getItemTypeLabel() || data.reqType || 'project'}
        </div>
        
        <div style={{
          fontSize: '9px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getStateColor()
          }} />
          <span style={{ color: getStateColor(), fontWeight: 'bold' }}>
            {data.state === 'released' ? 'REL' : data.state === 'frozen' ? 'FRZ' : 'OPEN'}
          </span>
        </div>
      </div>
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        fontSize: '11px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{getClassificationIcon()}</span>
          <span style={{ color: '#bdc3c7', textTransform: 'capitalize' }}>
            {data.classification || 'requirement'}
          </span>
        </div>
        
        <div>
          {data.priority === 'high' && '🔴'}
          {data.priority === 'medium' && '🟡'}
          {data.priority === 'low' && '🟢'}
        </div>
      </div>

      {/* Port count indicator */}
      {data.ports && data.ports.length > 0 && (
        <span style={{
          background: '#9b59b6',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '9px',
          fontWeight: 'bold',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          width: 'fit-content',
          alignSelf: 'flex-start'
        }}>
          🔌 {data.ports.filter(p => p.direction === 'input').length}/{data.ports.filter(p => p.direction === 'output').length}
        </span>
      )}
      
 {isEditing ? (
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          style={{
            width: '100%',
            fontSize: '14px',
            fontWeight: 'bold',
            background: '#34495e',
            color: 'white',
            border: '1px solid ' + getBorderColor(),
            borderRadius: '4px',
            padding: '6px 8px',
            outline: 'none'
          }}
        />
      ) : (
        <>
          {data.reqId && (
            <div style={{
              fontSize: '10px',
              color: '#3498db',
              fontWeight: 'bold',
              marginBottom: '4px',
              fontFamily: 'monospace',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{data.reqId}</span>
              {data.version && (
                <span style={{
                  background: '#8e44ad',
                  color: 'white',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  fontSize: '9px'
                }}>
                  v{data.version}
                </span>
              )}
            </div>
          )}

          <div 
            onDoubleClick={handleDoubleClick}
            style={{
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: (data.state === 'frozen' || data.state === 'released') ? 'not-allowed' : 'text',
              minHeight: '20px',
              marginBottom: '6px'
            }}
          >
            {data.label}
          </div>
        </>
      )}
      
     
      {(data.state === 'frozen' || data.state === 'released') && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          fontSize: '16px'
        }}>
          {data.state === 'released' ? '✅' : '🔒'}
        </div>
      )}
      
      {/* Lock indicator (user-locked, not frozen) */}
      {data.locked && data.state !== 'frozen' && data.state !== 'released' && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          fontSize: '14px',
          background: '#e74c3c',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          🔒
        </div>
      )}

      {/* Issue Indicator */}
      {(() => {
        const issues = data.issues || [];
        const openIssues = issues.filter(i => i.status !== 'closed' && i.status !== 'resolved');
        const criticalHighCount = openIssues.filter(i => i.priority === 'critical' || i.priority === 'high').length;
        const issueCount = openIssues.length;
        
        if (issueCount === 0) return null;
        
        return (
          <div 
            style={{
              position: 'absolute',
              top: '4px',
              right: data.locked ? '32px' : '4px',
              background: criticalHighCount > 0 ? '#e74c3c' : '#f39c12',
              color: 'white',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              zIndex: 10
            }}
            title={`${issueCount} open issue${issueCount > 1 ? 's' : ''}${criticalHighCount > 0 ? ` (${criticalHighCount} critical/high)` : ''}`}
          >
            {issueCount > 9 ? '9+' : issueCount}
          </div>
        );
      })()}

      {data.attachment && (
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          fontSize: '14px'
        }}>
          📎
        </div>
      )}
    </div>
  );
}

export default CustomNode;
