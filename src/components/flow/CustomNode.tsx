import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Port } from '../../types';
import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, useUpdateNodeInternals } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';

// Extra handles for 4-side connectivity (top/bottom + reverse left/right)
const handleDotStyle = {
  width: '8px',
  height: '8px',
  background: 'rgba(100, 100, 100, 0.3)',
  border: '1.5px solid rgba(255,255,255,0.5)',
  transition: 'background 0.2s, transform 0.2s',
};

function ExtraHandles({ color, skipLeftRight }: { color?: string; skipLeftRight?: boolean }) {
  const bg = color ? `${color}66` : 'rgba(100,100,100,0.3)';
  const s = { ...handleDotStyle, background: bg };
  return (
    <>
      {/* Top handles */}
      <Handle type="target" position={Position.Top} id="top-target"
        style={{ ...s, top: '-4px', left: '40%' }} />
      <Handle type="source" position={Position.Top} id="top-source"
        style={{ ...s, top: '-4px', left: '60%' }} />
      {/* Bottom handles */}
      <Handle type="target" position={Position.Bottom} id="bottom-target"
        style={{ ...s, bottom: '-4px', left: '40%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-source"
        style={{ ...s, bottom: '-4px', left: '60%' }} />
      {/* Extra left source + right target (skip when ports exist to avoid overlap) */}
      {!skipLeftRight && (
        <>
          <Handle type="source" position={Position.Left} id="left-source"
            style={{ ...s, left: '-4px', top: '35%' }} />
          <Handle type="target" position={Position.Right} id="right-target"
            style={{ ...s, right: '-4px', top: '35%' }} />
        </>
      )}
    </>
  );
}

function CustomNode({ data, id, selected }: { data: NodeData; id: string; selected: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const isHighlighted = data.isHighlighted;
  const wbContainerRef = useRef<HTMLDivElement>(null);
  const updateNodeInternals = useUpdateNodeInternals();

  // Force ReactFlow to recalculate handle positions after the node renders.
  // This is critical for whiteboard/simple mode where nodes have dynamic sizes
  // (content-based width, minHeight, etc.) that aren't known at first render.
  // Without this, ReactFlow caches stale handle positions from initial measurement.
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      updateNodeInternals(id);
    });
    return () => cancelAnimationFrame(timer);
  }, [id, updateNodeInternals, data.isWhiteboardMode, data.label, data.nodeWidth, data.nodeHeight]);

  // Auto-heal: if the rendered node is larger than stored dimensions,
  // update React Flow so edges connect to the correct positions
  useEffect(() => {
    if (!data.isWhiteboardMode || !wbContainerRef.current || !data.onChange) return;
    const timer = requestAnimationFrame(() => {
      const el = wbContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const zoom = rect.width > 0 && el.offsetWidth > 0 ? rect.width / el.offsetWidth : 1;
      const actualW = el.offsetWidth;
      const actualH = el.offsetHeight;
      const storedW = data.nodeWidth || 0;
      const storedH = data.nodeHeight || 0;
      if (actualW > storedW + 5 || actualH > storedH + 5) {
        data.onChange(id, 'nodeWidth', actualW);
        data.onChange(id, 'nodeHeight', actualH);
      }
    });
    return () => cancelAnimationFrame(timer);
  }, [data.isWhiteboardMode]);

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
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: selected ? '#3498db' : '#e74c3c',
        border: '3px solid #fff',
        boxShadow: selected ? '0 0 12px rgba(52, 152, 219, 0.8)' : '0 2px 8px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        position: 'relative',
      }}>
        {/* Delete button — always visible */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (data.onDeleteNode) {
              data.onDeleteNode(id);
            }
          }}
          style={{
            position: 'absolute',
            top: '-12px',
            right: '-12px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: '#c0392b',
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: '2px solid #fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
            lineHeight: 1,
            zIndex: 20,
          }}
          title="Delete connector"
        >✕</div>
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
        <ExtraHandles color={data.groupColor || '#3498db'} />
      </div>
    );
  }

  
    // WHITEBOARD MODE - HARDWARE NODES (Blue card, resizable)
  if (data.isWhiteboardMode && (data.itemType === 'hardware' || data.type === 'hardware')) {
    const ports = data.ports || [];
    const inputPorts = ports.filter(p => p.direction === 'input' || p.type === 'input');
    const outputPorts = ports.filter(p => p.direction === 'output' || p.type === 'output');
    
    const iconSize = data.hwIconSize || 64;
    const maxPorts = Math.max(inputPorts.length, outputPorts.length, 1);
    const portRowHeight = 22;
    const contentPadding = 10;
    const imageHeight = Math.max(iconSize, maxPorts * portRowHeight);
    const labelHeight = 24;
    const minH = contentPadding + imageHeight + labelHeight + contentPadding;

    const charWidth = 7;
    const portLabelW = (p) => (p.name + (p.width ? `[${p.width-1}:0]` : '')).length * charWidth + 16;
    const maxInW = inputPorts.length > 0 ? Math.max(...inputPorts.map(portLabelW)) : 0;
    const maxOutW = outputPorts.length > 0 ? Math.max(...outputPorts.map(portLabelW)) : 0;
    const gap = 8, pad = 12;
    const minW = Math.max(140, pad + maxInW + (maxInW>0?gap:0) + iconSize + 10 + (maxOutW>0?gap:0) + maxOutW + pad);

    // Port Y as percentage of node height
    const getPortPct = (index, total) => {
      if (total === 1) return '50%';
      const topPct = (contentPadding + (imageHeight - total * portRowHeight) / 2) / minH * 100;
      const rangePct = ((total - 1) * portRowHeight) / minH * 100;
      return `${topPct + (rangePct / (total - 1)) * index + (portRowHeight / 2 / minH * 100)}%`;
    };

    return (
      <>
      <NodeResizer
        color="#3498db"
        isVisible={selected}
        minWidth={minW}
        minHeight={minH}
        onResizeEnd={(event, params) => {
          if (data.onChange) {
            data.onChange(id, 'nodeWidth', params.width);
            data.onChange(id, 'nodeHeight', params.height);
          }
        }}
        handleStyle={{ width: '10px', height: '10px', borderRadius: '2px' }}
      />
      <div 
        style={{
          width: '100%',
          height: '100%',
          minWidth: `${minW}px`,
          minHeight: `${minH}px`,
          background: selected ? 'rgba(52,152,219,0.25)' : 'rgba(52,152,219,0.08)',
          border: selected ? '2px solid #3498db' : '1.5px solid rgba(52,152,219,0.3)',
          borderRadius: '10px',
          position: 'relative',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transition: 'background 0.2s, border-color 0.2s',
          boxShadow: selected ? '0 0 16px rgba(52,152,219,0.35)' : '0 2px 8px rgba(0,0,0,0.08)',
          boxSizing: 'border-box',
        }}>

        {/* Content row: input labels | image | output labels */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', padding: `${contentPadding}px ${pad}px 0`,
          boxSizing: 'border-box', flex: 1,
        }}>
          {inputPorts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: `${portRowHeight-14}px`, marginRight: `${gap}px`, alignItems: 'flex-end' }}>
              {inputPorts.map(port => (
                <div key={port.id} style={{ fontSize: '10px', color: '#27ae60', fontWeight: '600', whiteSpace: 'nowrap', height: '14px', lineHeight: '14px' }}>
                  {port.name + (port.width ? `[${port.width-1}:0]` : '')}
                </div>
              ))}
            </div>
          )}

          <div style={{ flexShrink: 0 }}>
            {(data.hwCustomIcon || data.hwIcon?.startsWith('data:') || data.hwIcon?.startsWith('http')) ? (
              <img src={data.hwCustomIcon || data.hwIcon} alt={data.label || 'HW'}
                style={{ width: `${iconSize}px`, height: `${iconSize}px`, objectFit: 'contain',
                  filter: selected ? 'drop-shadow(0 0 6px rgba(52,152,219,0.7))' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))',
                  borderRadius: '6px', background: 'white', padding: '2px' }} />
            ) : (
              <span style={{ fontSize: `${iconSize*0.75}px`, lineHeight: 1,
                filter: selected ? 'drop-shadow(0 0 6px rgba(52,152,219,0.7))' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }}>
                {data.hwIcon || '📦'}
              </span>
            )}
          </div>

          {outputPorts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: `${portRowHeight-14}px`, marginLeft: `${gap}px`, alignItems: 'flex-start' }}>
              {outputPorts.map(port => (
                <div key={port.id} style={{ fontSize: '10px', color: '#e67e22', fontWeight: '600', whiteSpace: 'nowrap', height: '14px', lineHeight: '14px' }}>
                  {port.name + (port.width ? `[${port.width-1}:0]` : '')}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Label */}
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--nl-text-primary, #333)',
          textAlign: 'center', padding: '4px 8px', maxWidth: '100%', wordBreak: 'break-word', lineHeight: '1.3' }}>
          {data.label}
        </div>

        {/* Default handles */}
        <Handle type="target" position={Position.Left} id="default-target"
          style={{ background: '#27ae60', width: 10, height: 10, left: '-5px', top: '50%', transform: 'translateY(-50%)', border: '2px solid #fff', opacity: inputPorts.length > 0 ? 0.3 : 1 }} />
        <Handle type="source" position={Position.Right} id="default-source"
          style={{ background: '#e67e22', width: 10, height: 10, right: '-5px', top: '50%', transform: 'translateY(-50%)', border: '2px solid #fff', opacity: outputPorts.length > 0 ? 0.3 : 1 }} />

        {/* Port handles */}
        {inputPorts.map((port, index) => (
          <Handle key={port.id} type="target" position={Position.Left} id={port.id}
            style={{ background: '#27ae60', width: 10, height: 10, top: getPortPct(index, inputPorts.length), left: '-5px', border: '2px solid #fff' }}
            title={port.name} />
        ))}
        {outputPorts.map((port, index) => (
          <Handle key={port.id} type="source" position={Position.Right} id={port.id}
            style={{ background: '#e67e22', width: 10, height: 10, top: getPortPct(index, outputPorts.length), right: '-5px', border: '2px solid #fff' }}
            title={port.name} />
        ))}
        <ExtraHandles color="#795548" skipLeftRight={ports.length > 0} />
      </div>
      </>
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
          id="default-target"
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
          id="default-source"
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
          id="top-target"
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
          id="bottom-source"
          style={{ 
            background: '#2ecc71', 
            width: '8px', 
            height: '8px',
            bottom: '-4px' 
          }}
        />
        <ExtraHandles color="#2ecc71" />
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

    // Auto-size label font based on available width
    const actualNodeWidth = data.nodeWidth || nodeWidth;
    const availableLabelWidth = actualNodeWidth - (longestInput > 0 ? longestInput + 20 : actualNodeWidth * 0.1) - (longestOutput > 0 ? longestOutput + 20 : actualNodeWidth * 0.1) - 20;
    const baseFontSize = 14;
    const labelTextWidth = (data.label || '').length * (baseFontSize * 0.6);
    const autoFontSize = labelTextWidth > availableLabelWidth && availableLabelWidth > 0
      ? Math.max(9, Math.floor(baseFontSize * (availableLabelWidth / labelTextWidth)))
      : baseFontSize;

    return (
      <>
        {/* NodeResizer for whiteboard mode */}
        <NodeResizer
          color="#3498db"
          isVisible={selected}
          minWidth={Math.max(140, longestInput + longestOutput + 80, nodeWidth)}
          minHeight={nodeHeight}
          onResizeEnd={(event, params) => {
            // Persist resized dimensions in node.data so they survive save/load
            if (data.onChange) {
              data.onChange(id, 'nodeWidth', params.width);
              data.onChange(id, 'nodeHeight', params.height);
            }
          }}
          handleStyle={{
            width: '10px',
            height: '10px',
            borderRadius: '2px',
          }}
        />
        <div 
          ref={wbContainerRef}
          style={{
            width: '100%',
            height: '100%',
            minWidth: `${nodeWidth}px`,
            minHeight: `${nodeHeight}px`,
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
                    color: '#27ae60',
                    background: 'rgba(255,255,255,0.85)',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    whiteSpace: 'nowrap',
                    fontWeight: '600',
                    pointerEvents: 'none',
                    zIndex: 10
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
                    color: '#e67e22',
                    background: 'rgba(255,255,255,0.85)',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    whiteSpace: 'nowrap',
                    textAlign: 'right',
                    fontWeight: '600',
                    pointerEvents: 'none',
                    zIndex: 10
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
          left: longestInput > 0 ? `${longestInput + 20}px` : '10%',
          right: longestOutput > 0 ? `${longestOutput + 20}px` : '10%',
          transform: 'translateY(-50%)',
          textAlign: 'center',
          padding: '0 10px',
          overflow: 'hidden',
        }}>
          {isEditing ? (
            <input
              autoFocus
              value={label}
              onChange={(e: any) => setLabel(e.target.value)}
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
                fontSize: `${autoFontSize}px`,
                fontWeight: 'bold',
                color: '#fff',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                cursor: 'text',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                overflow: 'hidden',
                maxWidth: '100%',
                lineHeight: '1.3',
              }}
            >
              {data.label}
            </div>
          )}
        </div>

        {/* Issue indicator in whiteboard mode */}
        {data.issueCount > 0 && (
          <div 
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: data.criticalIssueCount > 0 ? '#e74c3c' : '#f39c12',
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
            title={`${data.issueCount} open issue${data.issueCount > 1 ? 's' : ''}`}
            onClick={() => data.onShowIssues && data.onShowIssues({ id })}
          >
            {data.issueCount > 9 ? '9+' : data.issueCount}
          </div>
        )}
      <ExtraHandles skipLeftRight={ports.length > 0} />
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
          <span style={{ color: 'var(--nl-text-secondary, #bdc3c7)', textTransform: 'capitalize' }}>
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
          onChange={(e: any) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          style={{
            width: '100%',
            fontSize: '14px',
            fontWeight: 'bold',
            background: 'var(--nl-bg-input, #34495e)',
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
              marginBottom: '6px',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              lineHeight: '1.3',
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
      {data.issueCount > 0 && (
          <div 
            style={{
              position: 'absolute',
              top: '4px',
              right: data.locked ? '32px' : '4px',
              background: data.criticalIssueCount > 0 ? '#e74c3c' : '#f39c12',
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
            title={`${data.issueCount} open issue${data.issueCount > 1 ? 's' : ''}`}
            onClick={() => data.onShowIssues && data.onShowIssues({ id })}
          >
            {data.issueCount > 9 ? '9+' : data.issueCount}
          </div>
      )}

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

      <ExtraHandles skipLeftRight={(data.ports || []).length > 0} />
    </div>
  );
}

export default CustomNode;
