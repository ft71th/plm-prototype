import Login from './Login';
import { auth, projects, realtime } from './api';
import { NorthlightSplash, NorthlightLogo } from './NorthlightLogo';
import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import dagre from 'dagre';
import ProjectSelector from './ProjectSelector';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  updateEdge,
  Panel,
  Handle,
  MarkerType,
  Position,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  SelectionMode,
} from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import 'reactflow/dist/style.css';
import * as XLSX from 'xlsx';
import Whiteboard from './components/Whiteboard/Whiteboard';

// API Base URL - same as api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const defaultEdgeOptions = {
  type: 'custom',
  animated: false
};

// Relationship type definitions
const RELATIONSHIP_TYPES = {
  // System Engineering relationships
  contains: { label: 'Contains', color: '#1abc9c', style: 'solid' },
  provides: { label: 'Provides', color: '#3498db', style: 'solid' },
  realizedBy: { label: 'Realized by', color: '#9b59b6', style: 'solid' },
  verifies: { label: 'Verifies', color: '#27ae60', style: 'solid' },
  allocatedTo: { label: 'Allocated to', color: '#e91e63', style: 'solid' },
  
  // Requirement relationships
  addresses: { label: 'Addresses', color: '#27ae60', style: 'solid' },
  implements: { label: 'Implements', color: '#2196f3', style: 'solid' },
  satisfies: { label: 'Satisfies', color: '#8e44ad', style: 'solid' },
  derives: { label: 'Derives from', color: '#e67e22', style: 'dashed' },
  depends: { label: 'Depends on', color: '#f1c40f', style: 'dashed' },
  conflicts: { label: 'Conflicts with', color: '#e74c3c', style: 'dotted' },
  related: { label: 'Related to', color: '#95a5a6', style: 'dotted' },
  flowsDown: { label: 'Flows down', color: '#00bcd4', style: 'solid' },
  reuses: { label: 'Reuses', color: '#16a085', style: 'solid' },
};

// Issue Categories
const ISSUE_CATEGORIES = {
  bug: { icon: '🐛', label: 'Bug', color: '#e74c3c' },
  requirement: { icon: '📋', label: 'Requirement Issue', color: '#3498db' },
  design: { icon: '✏️', label: 'Design Issue', color: '#9b59b6' },
  safety: { icon: '⚠️', label: 'Safety Concern', color: '#e67e22' },
  performance: { icon: '⚡', label: 'Performance', color: '#f1c40f' },
  documentation: { icon: '📄', label: 'Documentation', color: '#1abc9c' },
  question: { icon: '❓', label: 'Question', color: '#95a5a6' },
  enhancement: { icon: '✨', label: 'Enhancement', color: '#27ae60' },
};

// Issue Priorities
const ISSUE_PRIORITIES = {
  critical: { icon: '🔴', label: 'Critical', color: '#9b59b6' },
  high: { icon: '🟠', label: 'High', color: '#e74c3c' },
  medium: { icon: '🟡', label: 'Medium', color: '#f39c12' },
  low: { icon: '🟢', label: 'Low', color: '#27ae60' },
};

// Issue Statuses
const ISSUE_STATUSES = {
  open: { icon: '📬', label: 'Open', color: '#e74c3c' },
  investigating: { icon: '🔍', label: 'Investigating', color: '#f39c12' },
  inProgress: { icon: '🔄', label: 'In Progress', color: '#3498db' },
  resolved: { icon: '✅', label: 'Resolved', color: '#27ae60' },
  closed: { icon: '📪', label: 'Closed', color: '#95a5a6' },
};

// Auto-inference engine
function inferRelationshipType(sourceNode, targetNode) {
  const sourceClass = sourceNode?.data?.classification || 'requirement';
  const targetClass = targetNode?.data?.classification || 'requirement';
  const sourceReqType = sourceNode?.data?.reqType || 'project';
  const targetReqType = targetNode?.data?.reqType || 'project';
  const sourceType = sourceNode?.data?.type || sourceNode?.data?.itemType || 'project';
  const targetType = targetNode?.data?.type || targetNode?.data?.itemType || 'project';
  const sourceItemType = sourceNode?.data?.itemType;
  const targetItemType = targetNode?.data?.itemType;

  // System Engineering relationships
  // System → Sub-System = Contains
  if (sourceItemType === 'system' && targetItemType === 'subsystem') {
    return 'contains';
  }
  
  // Sub-System → Function = Provides
  if (sourceItemType === 'subsystem' && targetItemType === 'function') {
    return 'provides';
  }
  
  // System → Function = Provides
  if (sourceItemType === 'system' && targetItemType === 'function') {
    return 'provides';
  }
  
  // Function → Requirement = Realized by
  if (sourceItemType === 'function' && !targetItemType) {
    return 'realizedBy';
  }
  
  // System/Sub-System → Requirement = Allocated to
  if ((sourceItemType === 'system' || sourceItemType === 'subsystem') && !targetItemType) {
    return 'allocatedTo';
  }
  
  // Requirement → Function = Implements
  if (!sourceItemType && targetItemType === 'function') {
    return 'implements';
  }
  
  // Requirement → Sub-System = Implements
  if (!sourceItemType && targetItemType === 'subsystem') {
    return 'implements';
  }
  
  // Requirement → System = Satisfies
  if (!sourceItemType && targetItemType === 'system') {
    return 'satisfies';
  }

  // Test Case → Requirement = Verifies
  if (sourceItemType === 'testcase' && !targetItemType) {
    return 'verifies';
  }
  
  // Requirement → Test Case = Verified by
  if (!sourceItemType && targetItemType === 'testcase') {
    return 'verifies';
  }

  // Original requirement relationships
  // Need → Capability = Addresses
  if (sourceClass === 'need' && targetClass === 'capability') {
    return 'addresses';
  }
  
  // Capability → Requirement = Implements
  if (sourceClass === 'capability' && targetClass === 'requirement') {
    return 'implements';
  }
  
  // Need → Requirement = Satisfies
  if (sourceClass === 'need' && targetClass === 'requirement') {
    return 'satisfies';
  }
  
  // Customer → Project = Flows down
  if (sourceReqType === 'customer' && targetReqType === 'project') {
    return 'flowsDown';
  }
  
  // Customer → Platform = Flows down
  if (sourceReqType === 'customer' && targetReqType === 'platform') {
    return 'flowsDown';
  }
  
  // Platform → Project = Reuses
  if (sourceType === 'platform' && targetType === 'project') {
    return 'reuses';
  }
  
  // Implementation → Requirement = Implements
  if (sourceReqType === 'implementation' && targetClass === 'requirement') {
    return 'implements';
  }
  
  // Same classification = Derives
  if (sourceClass === targetClass && sourceClass === 'requirement') {
    return 'derives';
  }
  
  // Default
  return 'related';
}

// Custom Edge Component with label and click handling
// Custom Edge Component with inline editing
function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [labelText, setLabelText] = useState(data?.customLabel || '');
  const clickTimeout = useRef(null);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeStyle = {
    stroke: selected ? '#3498db' : '#95a5a6',
    strokeWidth: selected ? 3 : 2,
    zIndex: selected ? 1000 : 0,
  };

  const relType = RELATIONSHIP_TYPES[data?.relationType || 'related'];
  
  const getStrokeDasharray = () => {
    if (relType.style === 'dashed') return '8 4';
    if (relType.style === 'dotted') return '2 2';
    return '0';
  };

  // Update local state when data changes
  useEffect(() => {
    setLabelText(data?.customLabel || '');
  }, [data?.customLabel]);

  const handleSave = () => {
    if (data?.onLabelChange) {
      data.onLabelChange(id, labelText);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    }
    if (e.key === 'Escape') {
      setLabelText(data?.customLabel || '');
      setIsEditing(false);
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    
    // Clear any existing timeout
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
      // Double click detected - open panel
      if (data?.onEdgeDoubleClick) {
        data.onEdgeDoubleClick(id, e);
      }
    } else {
      // Single click - wait to see if it's a double click
      clickTimeout.current = setTimeout(() => {
        clickTimeout.current = null;
        // Single click confirmed - start editing (only in whiteboard mode)
        if (data?.isWhiteboardMode) {
          setIsEditing(true);
        } else {
          // In PLM mode, single click opens panel
          if (data?.onEdgeDoubleClick) {
            data.onEdgeDoubleClick(id, e);
          }
        }
      }, 250);
    }
  };

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        /*style={{
          stroke: relType.color,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: getStrokeDasharray(),
          fill: 'none',
          cursor: 'pointer',
        }}*/
        strokeDasharray={getStrokeDasharray()}
        style={edgeStyle}
        markerEnd={`url(#arrow-${data?.relationType || 'related'})`}
      />
      <EdgeLabelRenderer>
        {(data?.showLabel && (data?.customLabel || isEditing)) && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: data?.isWhiteboardMode ? '#fff' : '#2c3e50',
              padding: data?.isWhiteboardMode ? '4px 10px' : '4px 8px',
              borderRadius: '4px',
              fontSize: data?.isWhiteboardMode ? '12px' : '10px',
              fontWeight: 'bold',
              color: data?.isWhiteboardMode ? '#333' : relType.color,
              border: data?.isWhiteboardMode 
                ? (isEditing ? '2px solid #3498db' : '1px solid #999')
                : `1px solid ${relType.color}`,
              pointerEvents: 'all',
              cursor: 'pointer',
              boxShadow: selected ? `0 0 8px ${relType.color}` : '0 2px 4px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              minWidth: data?.isWhiteboardMode ? '80px' : 'auto'
            }}
            className="nodrag nopan"
            onClick={handleClick}
          >
            {isEditing && data?.isWhiteboardMode ? (
              <input
                autoFocus
                type="text"
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                placeholder="Enter label..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#333',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  width: '100%',
                  minWidth: '60px',
                  textAlign: 'center'
                }}
              />
            ) : (
              <>
                {data?.isWhiteboardMode 
                  ? (
                      <>
                        {data?.customLabel || ''}
                        {data?.busWidth && !data?.customLabel?.includes('[') && (
                          <span style={{ 
                            fontSize: '9px', 
                            color: '#666',
                            marginLeft: '4px'
                          }}>
                            [{data.busWidth - 1}:0]
                          </span>
                        )}
                      </>
                    )
                  : relType.label
                }
                {!data?.isWhiteboardMode && data?.notes && (
                  <span style={{ fontSize: '8px' }}>📝</span>
                )}
              </>
            )}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = {
  custom: CustomEdge,
};

// Custom node component with enhanced requirement attributes
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

// Text Annotation Node - Free text for comments and notes
function TextAnnotationNode({ data, id, selected }) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.text || 'Double-click to edit');
  const textareaRef = useRef(null);

  const fontSize = data.fontSize || 14;
  const textColor = data.textColor || '#333333';
  const bgColor = data.bgColor || 'transparent';
  const fontWeight = data.fontWeight || 'normal';
  const fontStyle = data.fontStyle || 'normal';

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onChange) {
      data.onChange(id, 'text', text);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <div
      style={{
        minWidth: data.nodeWidth || 150,
        minHeight: data.nodeHeight || 40,
        width: data.nodeWidth || 'auto',
        height: data.nodeHeight || 'auto',
        padding: '8px 12px',
        background: bgColor,
        borderRadius: '4px',
        border: selected ? '2px dashed #3498db' : '1px dashed transparent',
        cursor: 'text',
        position: 'relative'
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Resize Handle */}
      {selected && (
        <NodeResizer
          color="#3498db"
          isVisible={selected}
          minWidth={80}
          minHeight={30}
          onResize={(event, { width, height }) => {
            if (data.onResize) {
              data.onResize(id, width, height);
            }
          }}
          handleStyle={{
            width: '8px',
            height: '8px',
            borderRadius: '2px',
          }}
        />
      )}

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '40px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: fontWeight,
            fontStyle: fontStyle,
            fontFamily: 'inherit',
            lineHeight: '1.4'
          }}
        />
      ) : (
        <div
          style={{
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: fontWeight,
            fontStyle: fontStyle,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: '1.4',
            minHeight: '20px'
          }}
        >
          {text || 'Double-click to edit'}
        </div>
      )}

      {/* Style indicator when selected */}
      {selected && !isEditing && (
        <div style={{
          position: 'absolute',
          top: '-24px',
          left: '0',
          display: 'flex',
          gap: '4px',
          background: '#2c3e50',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          color: 'white'
        }}>
          📝 Text
        </div>
      )}
    </div>
  );
}

// Text Annotation Formatting Toolbar
function TextAnnotationToolbar({ node, onUpdate }) {
  const data = node.data;

  const updateData = (key, value) => {
    onUpdate(node.id, key, value);
  };

  const fontSizes = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48];
  const colors = ['#333333', '#e74c3c', '#e67e22', '#f1c40f', '#27ae60', '#3498db', '#9b59b6', '#ffffff'];
  const bgColors = [
    'transparent', 
    'rgba(255,255,200,0.9)', 
    'rgba(200,255,200,0.9)', 
    'rgba(200,220,255,0.9)',
    'rgba(255,200,200,0.9)',
    'rgba(220,200,255,0.9)',
    '#ffffff'
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#2c3e50',
      borderRadius: '12px',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      zIndex: 3000,
    }}>
      {/* Font Size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#7f8c8d', fontSize: '11px' }}>Size:</span>
        <select
          value={data.fontSize || 14}
          onChange={(e) => updateData('fontSize', parseInt(e.target.value))}
          style={{
            padding: '6px 10px',
            backgroundColor: '#34495e',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          {fontSizes.map(size => (
            <option key={size} value={size}>{size}px</option>
          ))}
        </select>
      </div>

      <div style={{ width: '1px', height: '24px', backgroundColor: '#4a5f7f' }} />

      {/* Text Color */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#7f8c8d', fontSize: '11px' }}>Color:</span>
        {colors.map(color => (
          <button
            key={color}
            onClick={() => updateData('textColor', color)}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              backgroundColor: color,
              border: data.textColor === color ? '2px solid #3498db' : '1px solid #4a5f7f',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>

      <div style={{ width: '1px', height: '24px', backgroundColor: '#4a5f7f' }} />

      {/* Background Color */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#7f8c8d', fontSize: '11px' }}>Bg:</span>
        {bgColors.map((color, i) => (
          <button
            key={i}
            onClick={() => updateData('bgColor', color)}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              backgroundColor: color === 'transparent' ? '#34495e' : color,
              border: data.bgColor === color ? '2px solid #3498db' : '1px solid #4a5f7f',
              cursor: 'pointer',
            }}
          >
            {color === 'transparent' && <span style={{ fontSize: '10px' }}>∅</span>}
          </button>
        ))}
      </div>

      <div style={{ width: '1px', height: '24px', backgroundColor: '#4a5f7f' }} />

      {/* Bold/Italic */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => updateData('fontWeight', data.fontWeight === 'bold' ? 'normal' : 'bold')}
          style={{
            padding: '6px 10px',
            backgroundColor: data.fontWeight === 'bold' ? '#3498db' : '#34495e',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          B
        </button>
        <button
          onClick={() => updateData('fontStyle', data.fontStyle === 'italic' ? 'normal' : 'italic')}
          style={{
            padding: '6px 10px',
            backgroundColor: data.fontStyle === 'italic' ? '#3498db' : '#34495e',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontStyle: 'italic',
          }}
        >
          I
        </button>
      </div>
    </div>
  );
}

// Create Issue Modal
function CreateIssueModal({ nodeId, nodeName, onClose, onCreate }) {
  const [issue, setIssue] = useState({
    title: '',
    description: '',
    category: 'bug',
    priority: 'medium',
    status: 'open',
    rootCause: '',
    solution: '',
    impact: '',
    assignee: '',
    dueDate: '',
  });

  const handleCreate = () => {
    if (!issue.title.trim()) {
      alert('Please enter an issue title');
      return;
    }
    onCreate({
      ...issue,
      id: `ISS-${Date.now().toString(36).toUpperCase()}`,
      nodeId: nodeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000,
    }}>
      <div style={{
        backgroundColor: '#2c3e50',
        borderRadius: '12px',
        padding: '30px',
        width: '550px',
        maxHeight: '85vh',
        overflow: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      }}>
        <h2 style={{ color: '#fff', marginTop: 0, marginBottom: '10px', fontSize: '20px' }}>
          🐛 Create New Issue
        </h2>
        <p style={{ color: '#7f8c8d', marginBottom: '20px', fontSize: '13px' }}>
          Creating issue for: <strong style={{ color: '#3498db' }}>{nodeName}</strong>
        </p>

        {/* Title */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>
            Issue Title *
          </label>
          <input
            type="text"
            value={issue.title}
            onChange={(e) => setIssue({ ...issue, title: e.target.value })}
            placeholder="Brief description of the issue"
            autoFocus
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#34495e',
              color: '#fff',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Category & Priority */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>
              Category
            </label>
            <select
              value={issue.category}
              onChange={(e) => setIssue({ ...issue, category: e.target.value })}
              style={{ width: '100%', padding: '12px', backgroundColor: '#34495e', color: '#fff', border: '1px solid #4a5f7f', borderRadius: '6px' }}
            >
              {Object.entries(ISSUE_CATEGORIES).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>
              Priority
            </label>
            <select
              value={issue.priority}
              onChange={(e) => setIssue({ ...issue, priority: e.target.value })}
              style={{ width: '100%', padding: '12px', backgroundColor: '#34495e', color: '#fff', border: '1px solid #4a5f7f', borderRadius: '6px' }}
            >
              {Object.entries(ISSUE_PRIORITIES).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>
            Description
          </label>
          <textarea
            value={issue.description}
            onChange={(e) => setIssue({ ...issue, description: e.target.value })}
            placeholder="Detailed description of the issue..."
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '12px',
              backgroundColor: '#34495e',
              color: '#fff',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Impact */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>
            ⚠️ Impact Assessment
          </label>
          <textarea
            value={issue.impact}
            onChange={(e) => setIssue({ ...issue, impact: e.target.value })}
            placeholder="What is affected by this issue?"
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '12px',
              backgroundColor: '#34495e',
              color: '#fff',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Assignee & Due Date */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>
              Assignee
            </label>
            <input
              type="text"
              value={issue.assignee}
              onChange={(e) => setIssue({ ...issue, assignee: e.target.value })}
              placeholder="Who should fix this?"
              style={{ width: '100%', padding: '12px', backgroundColor: '#34495e', color: '#fff', border: '1px solid #4a5f7f', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>
              Due Date
            </label>
            <input
              type="date"
              value={issue.dueDate}
              onChange={(e) => setIssue({ ...issue, dueDate: e.target.value })}
              style={{ width: '100%', padding: '12px', backgroundColor: '#34495e', color: '#fff', border: '1px solid #4a5f7f', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '12px 24px', backgroundColor: '#7f8c8d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!issue.title.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: issue.title.trim() ? '#e74c3c' : '#7f8c8d',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: issue.title.trim() ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
            }}
          >
            🐛 Create Issue
          </button>
        </div>
      </div>
    </div>
  );
}

// Issue Manager Modal - View all issues
function IssueManagerModal({ issues, nodes, onClose, onIssueClick, onUpdateIssue, onDeleteIssue }) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [searchTerm, setSearchTerm] = useState('');

  const getNodeName = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.data?.label || node?.data?.reqId || nodeId;
  };

  // Flatten issues from all nodes
  const allIssues = Object.entries(issues).flatMap(([nodeId, nodeIssues]) => 
    (nodeIssues || []).map(issue => ({ ...issue, nodeId }))
  );

  const filteredIssues = allIssues
    .filter(issue => {
      if (filter === 'all') return true;
      if (filter === 'open') return !['resolved', 'closed'].includes(issue.status);
      if (filter === 'resolved') return issue.status === 'resolved';
      if (filter === 'closed') return issue.status === 'closed';
      return issue.priority === filter || issue.category === filter;
    })
    .filter(issue => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        issue.title?.toLowerCase().includes(search) ||
        issue.description?.toLowerCase().includes(search) ||
        issue.id?.toLowerCase().includes(search) ||
        getNodeName(issue.nodeId).toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      }
      if (sortBy === 'date') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'status') {
        const statusOrder = { open: 0, investigating: 1, inProgress: 2, resolved: 3, closed: 4 };
        return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      }
      return 0;
    });

  const stats = {
    total: allIssues.length,
    open: allIssues.filter(i => i.status === 'open').length,
    inProgress: allIssues.filter(i => i.status === 'investigating' || i.status === 'inProgress').length,
    resolved: allIssues.filter(i => i.status === 'resolved').length,
    critical: allIssues.filter(i => i.priority === 'critical' && i.status !== 'closed').length,
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000,
    }}>
      <div style={{
        backgroundColor: '#1a252f',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '1200px',
        height: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 50px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 25px', borderBottom: '1px solid #34495e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '22px' }}>🐛 Issue Manager</h2>
            <p style={{ margin: '5px 0 0', color: '#7f8c8d', fontSize: '13px' }}>Track and manage all issues across your project</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#95a5a6', fontSize: '28px', cursor: 'pointer' }}>×</button>
        </div>

        {/* Stats Bar */}
        <div style={{ display: 'flex', gap: '15px', padding: '15px 25px', backgroundColor: '#2c3e50', borderBottom: '1px solid #34495e' }}>
          {[
            { label: 'Total', value: stats.total, color: '#fff' },
            { label: 'Open', value: stats.open, color: '#e74c3c' },
            { label: 'In Progress', value: stats.inProgress, color: '#3498db' },
            { label: 'Resolved', value: stats.resolved, color: '#27ae60' },
          ].map(stat => (
            <div key={stat.label} style={{ padding: '10px 20px', backgroundColor: '#34495e', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: '#7f8c8d' }}>{stat.label}</div>
            </div>
          ))}
          {stats.critical > 0 && (
            <div style={{ padding: '10px 20px', backgroundColor: '#e74c3c', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>{stats.critical}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>Critical!</div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '15px', padding: '15px 25px', backgroundColor: '#2c3e50', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Search issues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, padding: '10px 15px', backgroundColor: '#34495e', color: '#fff', border: '1px solid #4a5f7f', borderRadius: '6px' }}
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '10px 15px', backgroundColor: '#34495e', color: '#fff', border: '1px solid #4a5f7f', borderRadius: '6px' }}>
            <option value="all">All Issues</option>
            <option value="open">Open Only</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High Priority</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '10px 15px', backgroundColor: '#34495e', color: '#fff', border: '1px solid #4a5f7f', borderRadius: '6px' }}>
            <option value="priority">Sort by Priority</option>
            <option value="date">Sort by Date</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>

        {/* Issue List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 25px' }}>
          {filteredIssues.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#7f8c8d' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎉</div>
              <div style={{ fontSize: '18px' }}>No issues found</div>
              <div style={{ fontSize: '13px', marginTop: '10px' }}>
                {allIssues.length === 0 ? 'Create issues from the node panel' : 'Try adjusting your filters'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredIssues.map(issue => (
                <div
                  key={issue.id}
                  onClick={() => onIssueClick && onIssueClick(issue)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '15px 20px',
                    backgroundColor: '#2c3e50',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    borderLeft: `4px solid ${ISSUE_PRIORITIES[issue.priority]?.color || '#95a5a6'}`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '8px',
                    backgroundColor: ISSUE_PRIORITIES[issue.priority]?.color || '#95a5a6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: '15px', fontSize: '20px',
                  }}>
                    {ISSUE_CATEGORIES[issue.category]?.icon || '📌'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{issue.title}</span>
                      <span style={{
                        fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                        backgroundColor: ISSUE_STATUSES[issue.status]?.color || '#95a5a6', color: '#fff',
                      }}>
                        {ISSUE_STATUSES[issue.status]?.label || issue.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '12px', color: '#7f8c8d' }}>
                      <span>📍 {getNodeName(issue.nodeId)}</span>
                      <span>#{issue.id}</span>
                      {issue.assignee && <span>👤 {issue.assignee}</span>}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newStatus = issue.status === 'open' ? 'inProgress' : 
                                       issue.status === 'inProgress' ? 'resolved' : issue.status;
                      onUpdateIssue && onUpdateIssue({ ...issue, status: newStatus, updatedAt: new Date().toISOString() });
                    }}
                    style={{ padding: '6px 12px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                    title="Advance status"
                  >
                    →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Component Library Panel
function ComponentLibraryPanel({ isOpen, onClose, nodes, onAddFromLibrary, libraryItems, onSaveToLibrary, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);

  if (!isOpen) return null;

  // Group items by type
  const groupedItems = (libraryItems || []).reduce((acc, item) => {
    const type = item.itemType || item.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  const filteredItems = (libraryItems || []).filter(item => {
    const matchesSearch = !searchTerm || 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || item.itemType === typeFilter || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '380px',
      height: '100vh',
      backgroundColor: '#1a252f',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
      zIndex: 3500,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid #34495e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>📚 Component Library</h3>
          <p style={{ margin: '5px 0 0', color: '#7f8c8d', fontSize: '12px' }}>Reusable components with version control</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#95a5a6', fontSize: '24px', cursor: 'pointer' }}>×</button>
      </div>

      {/* Search & Filter */}
      <div style={{ padding: '15px', borderBottom: '1px solid #34495e' }}>
        <input
          type="text"
          placeholder="🔍 Search components..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px', backgroundColor: '#34495e', color: '#fff', border: '1px solid #4a5f7f', borderRadius: '6px', marginBottom: '10px', boxSizing: 'border-box' }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ width: '100%', padding: '10px', backgroundColor: '#34495e', color: '#fff', border: '1px solid #4a5f7f', borderRadius: '6px' }}
        >
          <option value="all">All Types</option>
          <option value="system">🔷 Systems</option>
          <option value="subsystem">🔶 Sub-Systems</option>
          <option value="function">⚡ Functions</option>
          <option value="hardware">📦 Hardware</option>
          <option value="requirement">📋 Requirements</option>
        </select>
      </div>

      {/* Library Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#7f8c8d' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>📚</div>
            <div style={{ fontSize: '14px' }}>No components in library</div>
            <div style={{ fontSize: '12px', marginTop: '10px' }}>Save components from the canvas to build your library</div>
          </div>
        ) : (
          filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
              style={{
                padding: '12px',
                backgroundColor: selectedItem?.id === item.id ? '#34495e' : '#2c3e50',
                borderRadius: '8px',
                marginBottom: '10px',
                cursor: 'pointer',
                borderLeft: `3px solid ${item.itemType === 'system' ? '#1abc9c' : item.itemType === 'function' ? '#00bcd4' : '#3498db'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>{item.name}</span>
                <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#27ae60', borderRadius: '4px', color: '#fff' }}>
                  v{item.version || '1.0'}
                </span>
              </div>
              <div style={{ color: '#7f8c8d', fontSize: '11px', marginBottom: '6px' }}>{item.description || 'No description'}</div>
              {selectedItem?.id === item.id && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddFromLibrary && onAddFromLibrary(item); }}
                    style={{ flex: 1, padding: '8px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                  >
                    ➕ Add to Canvas
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '15px', borderTop: '1px solid #34495e' }}>
        <button
          onClick={onRefresh}
          style={{ width: '100%', padding: '10px', backgroundColor: '#34495e', color: '#fff', border: '1px solid #4a5f7f', borderRadius: '6px', cursor: 'pointer' }}
        >
          🔄 Refresh Library
        </button>
      </div>
    </div>
  );
}

// Save to Library Modal
function SaveToLibraryModal({ node, onClose, onSave }) {
  const [name, setName] = useState(node?.data?.label || '');
  const [description, setDescription] = useState(node?.data?.description || '');
  const [version, setVersion] = useState('1.0');

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a name');
      return;
    }
    onSave({
      name: name.trim(),
      description: description.trim(),
      version,
      itemType: node?.data?.itemType || node?.data?.type,
      nodeData: node?.data,
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000,
    }}>
      <div style={{
        backgroundColor: '#2c3e50',
        borderRadius: '12px',
        padding: '30px',
        width: '450px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      }}>
        <h2 style={{ color: '#fff', marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
          📚 Save to Library
        </h2>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>
            Component Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#34495e',
              color: '#fff',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '12px',
              backgroundColor: '#34495e',
              color: '#fff',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>
            Version
          </label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#34495e',
              color: '#fff',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '12px 24px', backgroundColor: '#7f8c8d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{ padding: '12px 24px', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            📚 Save to Library
          </button>
        </div>
      </div>
    </div>
  );
}


// Voice-enabled text input helper
function VoiceTextArea({ value, onChange, placeholder, disabled, style, minHeight = '80px' }) {
  const [isRecording, setIsRecording] = useState(false);

  const handleVoice = () => {
    if (window.startVoiceDictation) {
      setIsRecording(true);
      window.startVoiceDictation((text) => {
        // Append to existing text with space
        const newValue = value ? value + ' ' + text : text;
        onChange(newValue);
        setIsRecording(false);
      });
      // Auto-stop recording state after 3 seconds (safety)
      setTimeout(() => setIsRecording(false), 3000);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          ...style,
          minHeight,
          paddingRight: '40px'
        }}
      />
      {!disabled && (
        <button
          onClick={handleVoice}
          type="button"
          style={{
            position: 'absolute',
            right: '8px',
            top: '8px',
            background: isRecording ? '#e74c3c' : '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {isRecording ? '⏺️' : '🎤'}
        </button>
      )}
    </div>
  );
}


// Floating Panel for editing relationships
function RelationshipPanel({ edge, onClose, onUpdate, position }) {
  return (
    <div 
      onClick={(e) => e.stopPropagation()}  
        style={{
        position: 'fixed',
        left: position.x + 'px',
        top: position.y + 'px',
        background: '#2c3e50',
        borderRadius: '8px',
        padding: '15px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 3000,
        color: 'white',
        minWidth: '250px'
      }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        borderBottom: '2px solid #34495e',
        paddingBottom: '8px'
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>🔗 Edit Relationship</span>
        <button onClick={onClose} style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          fontSize: '18px',
          cursor: 'pointer'
        }}>×</button>
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'block',
          fontSize: '11px',
          color: '#bdc3c7',
          marginBottom: '6px',
          textTransform: 'uppercase',
          fontWeight: 'bold'
        }}>
          Relationship Type
        </label>
        <select
          value={edge.data?.relationType || 'related'}
          onChange={(e) => onUpdate(edge.id, 'relationType', e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            background: '#34495e',
            color: 'white',
            border: '1px solid #4a5f7f',
            borderRadius: '4px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          {Object.entries(RELATIONSHIP_TYPES).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        marginTop: '12px'
      }}>
        {Object.entries(RELATIONSHIP_TYPES).map(([key, value]) => (
          <button
            key={key}
            onClick={() => onUpdate(edge.id, 'relationType', key)}
            style={{
              padding: '8px',
              background: edge.data?.relationType === key ? value.color : '#34495e',
              color: 'white',
              border: `2px solid ${value.color}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            {value.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '15px' }}>
        <label style={{
          display: 'block',
          fontSize: '11px',
          color: '#bdc3c7',
          marginBottom: '6px',
          textTransform: 'uppercase',
          fontWeight: 'bold'
        }}>

        {/* Custom Label - for Whiteboard mode */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{
          display: 'block',
          fontSize: '11px',
          color: '#3498db',
          marginBottom: '6px',
          textTransform: 'uppercase',
          fontWeight: 'bold'
        }}>
          🏷️ Custom Label (Whiteboard)
        </label>
        <input
          type="text"
          value={edge.data?.customLabel || ''}
          onChange={(e) => onUpdate(edge.id, 'customLabel', e.target.value)}
          placeholder="e.g., clock signal, data bus..."
          style={{
            width: '100%',
            padding: '8px',
            background: '#34495e',
            color: 'white',
            border: '1px solid #3498db',
            borderRadius: '4px',
            fontSize: '13px'
          }}
        />
        <div style={{ fontSize: '9px', color: '#7f8c8d', marginTop: '4px' }}>
          Shown instead of relationship type in Whiteboard mode
        </div>
      </div>

      {/* Signal Info - shown when ports are connected */}
      {(edge.data?.signalType || edge.data?.busWidth) && (
        <div style={{ 
          marginBottom: '15px',
          padding: '10px',
          background: '#1a2634',
          borderRadius: '6px'
        }}>
          <label style={{
            display: 'block',
            fontSize: '11px',
            color: '#9b59b6',
            marginBottom: '8px',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            📡 Signal Info
          </label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '8px',
            fontSize: '12px'
          }}>
            {edge.data?.signalType && (
              <div>
                <span style={{ color: '#7f8c8d' }}>Type: </span>
                <span style={{ color: '#3498db', fontWeight: 'bold' }}>
                  {edge.data.signalType}
                </span>
              </div>
            )}
            {edge.data?.busWidth && (
              <div>
                <span style={{ color: '#7f8c8d' }}>Width: </span>
                <span style={{ color: '#e67e22', fontWeight: 'bold' }}>
                  {edge.data.busWidth}-bit
                </span>
              </div>
            )}
          </div>
          {edge.data?.sourcePort && (
            <div style={{ marginTop: '6px', fontSize: '10px', color: '#7f8c8d' }}>
              From port: <span style={{ color: '#27ae60' }}>{edge.data.sourcePort}</span>
              {edge.data?.targetPort && (
                <> → To port: <span style={{ color: '#e67e22' }}>{edge.data.targetPort}</span></>
              )}
            </div>
          )}
        </div>
      )}

          📝 Notes / Rationale
        </label>
        <textarea
          value={edge.data?.notes || ''}
          onChange={(e) => onUpdate(edge.id, 'notes', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Why is this relationship needed? Add context..."
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '8px',
            background: '#34495e',
            color: 'white',
            border: '1px solid #4a5f7f',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      </div>
    </div>
  );
}

// Port Editor Component for managing interfaces
function PortEditor({ ports = [], onChange, disabled }) {
  const [newPortName, setNewPortName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const addPort = (direction) => {
    if (!newPortName.trim()) return;
    
    // Auto-infer type from name
    const inferType = (name) => {
      const n = name.toLowerCase();
      if (n.includes('clk') || n.includes('clock')) return 'clock';
      if (n.includes('rst') || n.includes('reset')) return 'reset';
      if (n.includes('en') || n.includes('enable')) return 'control';
      if (n.match(/\[\d+:\d+\]/) || n.includes('bus') || n.includes('data')) return 'bus';
      return 'signal';
    };

    // Extract bus width from name like "data[7:0]"
    const extractWidth = (name) => {
      const match = name.match(/\[(\d+):(\d+)\]/);
      if (match) {
        return Math.abs(parseInt(match[1]) - parseInt(match[2])) + 1;
      }
      return null;
    };

    // Clean name (remove bus notation for display)
    const cleanName = newPortName.replace(/\[\d+:\d+\]/, '').trim();
    
    const newPort = {
      id: `port-${Date.now()}`,
      name: cleanName || newPortName,
      direction: direction,
      type: inferType(newPortName),
      width: extractWidth(newPortName),
    };
    
    onChange([...ports, newPort]);
    setNewPortName('');
    setIsAdding(false);
  };

  const removePort = (portId) => {
    onChange(ports.filter(p => p.id !== portId));
  };

  const updatePort = (portId, field, value) => {
    onChange(ports.map(p => 
      p.id === portId ? { ...p, [field]: value } : p
    ));
  };

  const inputPorts = ports.filter(p => p.direction === 'input' || p.type === 'input');
  const outputPorts = ports.filter(p => p.direction === 'output' || p.type === 'output');

  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{
        display: 'block',
        marginBottom: '8px',
        fontSize: '11px',
        color: '#3498db',
        textTransform: 'uppercase',
        fontWeight: 'bold'
      }}>
        🔌 Interfaces / Ports
      </label>

      {/* Input Ports */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ 
          fontSize: '10px', 
          color: '#27ae60', 
          fontWeight: 'bold',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          ○ INPUTS ({inputPorts.length})
        </div>
        {inputPorts.map(port => (
          <div key={port.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            background: '#1a3a1a',
            borderRadius: '4px',
            marginBottom: '4px',
            fontSize: '12px'
          }}>
            <span style={{ color: '#27ae60' }}>○</span>
            <input
              type="text"
              value={port.name}
              onChange={(e) => updatePort(port.id, 'name', e.target.value)}
              disabled={disabled}
              onFocus={(e) => e.target.select()}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '12px',
                outline: 'none'
              }}
            />
            {port.width && (
              <span style={{ color: '#7f8c8d', fontSize: '10px' }}>
                [{port.width - 1}:0]
              </span>
            )}
            <span style={{ 
              color: '#7f8c8d', 
              fontSize: '9px',
              background: '#2c3e50',
              padding: '2px 6px',
              borderRadius: '3px'
            }}>
              {port.type}
            </span>
            {!disabled && (
              <button
                onClick={() => removePort(port.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#e74c3c',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '0 4px'
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Output Ports */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ 
          fontSize: '10px', 
          color: '#e67e22', 
          fontWeight: 'bold',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          ● OUTPUTS ({outputPorts.length})
        </div>
        {outputPorts.map(port => (
          <div key={port.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            background: '#3a2a1a',
            borderRadius: '4px',
            marginBottom: '4px',
            fontSize: '12px'
          }}>
            <span style={{ color: '#e67e22' }}>●</span>
            <input
              type="text"
              value={port.name}
              onChange={(e) => updatePort(port.id, 'name', e.target.value)}
              disabled={disabled}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '12px',
                outline: 'none'
              }}
            />
            {port.width && (
              <span style={{ color: '#7f8c8d', fontSize: '10px' }}>
                [{port.width - 1}:0]
              </span>
            )}
            <span style={{ 
              color: '#7f8c8d', 
              fontSize: '9px',
              background: '#2c3e50',
              padding: '2px 6px',
              borderRadius: '3px'
            }}>
              {port.type}
            </span>
            {!disabled && (
              <button
                onClick={() => removePort(port.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#e74c3c',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '0 4px'
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Port UI */}
      {!disabled && (
        <>
          {isAdding ? (
            <div style={{
              background: '#34495e',
              padding: '10px',
              borderRadius: '6px'
            }}>
              <input
                autoFocus
                type="text"
                value={newPortName}
                onChange={(e) => setNewPortName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewPortName('');
                  }
                }}
                placeholder="Port name (e.g., clk, data[7:0], enable)"
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#2c3e50',
                  color: 'white',
                  border: '1px solid #4a5f7f',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginBottom: '8px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => addPort('input')}
                  disabled={!newPortName.trim()}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: newPortName.trim() ? '#27ae60' : '#34495e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: newPortName.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                >
                  ○ Add Input
                </button>
                <button
                  onClick={() => addPort('output')}
                  disabled={!newPortName.trim()}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: newPortName.trim() ? '#e67e22' : '#34495e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: newPortName.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                >
                  ● Add Output
                </button>
              </div>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewPortName('');
                }}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '6px',
                  background: 'transparent',
                  color: '#7f8c8d',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              style={{
                width: '100%',
                padding: '8px',
                background: '#34495e',
                color: '#3498db',
                border: '1px dashed #3498db',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              + Add Port
            </button>
          )}
        </>
      )}

      {/* Help text */}
      <div style={{ 
        fontSize: '9px', 
        color: '#7f8c8d', 
        marginTop: '8px' 
      }}>
        💡 Tip: Use "clk", "rst", "data[7:0]" - type auto-detected!
      </div>
    </div>
  );
}

// Enhanced Floating Panel for nodes
function FloatingPanel({ node, onClose, onUpdate, initialPosition, hardwareTypes = [], onManageTypes }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState(initialPosition);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const isEditable = node.data.state !== 'frozen' && node.data.state !== 'released';

  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.tagName === 'SELECT' ||
        e.target.tagName === 'BUTTON') {
      return;
    }

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdate(node.id, 'attachment', event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    onUpdate(node.id, 'attachment', null);
  };

console.log('Node itemType:', node.data.itemType);

return (
    <div
      style={{
        position: 'fixed',
        left: Math.min(position.x, window.innerWidth - 380) + 'px',
        top: '20px',
        bottom: '20px',
        width: '360px',
        background: '#2c3e50',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 2000,
        color: 'white',
        userSelect: isDragging ? 'none' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div 
        style={{
          padding: '12px 15px',
          borderBottom: '2px solid #34495e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#34495e',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>✋</span>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
            Edit {node.data.itemType === 'system' ? 'System' : 
                  node.data.itemType === 'subsystem' ? 'Sub-System' : 
                  node.data.itemType === 'function' ? 'Function' :
                  node.data.itemType === 'testcase' ? 'Test Case' :
                  node.data.itemType === 'parameter' ? 'Parameter' :
                  node.data.itemType === 'hardware' ? 'Hardware' :
                  node.data.itemType === 'usecase' ? 'Use Case' :
                  node.data.itemType === 'actor' ? 'Actor' : 'Requirement'}
          </span>
          {!isEditable && <span style={{ fontSize: '12px', color: '#f39c12' }}>🔒 Read-Only</span>}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 6px',
            lineHeight: '1'
          }}   >
        ×
        </button>
      </div>

      <div style={{ 
        padding: '15px', 
        overflowY: 'auto', 
        flex: 1,
        minHeight: 0
      }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            {node.data.itemType === 'system' ? 'System ID' : 
             node.data.itemType === 'subsystem' ? 'Sub-System ID' : 
             node.data.itemType === 'function' ? 'Function ID' :
             node.data.itemType === 'testcase' ? 'Test Case ID' :
             node.data.itemType === 'parameter' ? 'Parameter ID' :
             node.data.itemType === 'hardware' ? 'Hardware ID' :
             node.data.itemType === 'usecase' ? 'Use Case ID' :
             node.data.itemType === 'actor' ? 'Actor ID' : 'Item ID'}
          </label>
          <div style={{
            padding: '8px',
            background: '#34495e',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#3498db',
            fontFamily: 'monospace'
          }}>
            {node.data.reqId || 'No ID'}
          </div>
        </div>

        {/* Node Type Selector */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Node Type
          </label>
          <select
            value={node.data.itemType || 'requirement'}
            onChange={(e) => {
              const newType = e.target.value;
              onUpdate(node.id, 'itemType', newType);
              // Also update 'type' for consistency
              onUpdate(node.id, 'type', newType);
            }}
            disabled={!isEditable}
            style={{
              width: '100%',
              padding: '8px',
              background: isEditable ? '#34495e' : '#2c3e50',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: isEditable ? 'pointer' : 'not-allowed'
            }}
          >
            <optgroup label="Architecture">
              <option value="system">System</option>
              <option value="subsystem">Sub-System</option>
              <option value="function">Function</option>
            </optgroup>
            <optgroup label="Requirements">
              <option value="requirement">Requirement</option>
            </optgroup>
            <optgroup label="Testing">
              <option value="testcase">Test Case</option>
            </optgroup>
            <optgroup label="Other">
              <option value="parameter">Parameter</option>
              <option value="hardware">Hardware</option>
              <option value="usecase">Use Case</option>
              <option value="actor">Actor</option>
            </optgroup>
          </select>
        </div>

          <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Version
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={node.data.version || '1.0'}
              onChange={(e) => onUpdate(node.id, 'version', e.target.value)}
              disabled={!isEditable}
              onFocus={(e) => e.target.select()}
              style={{
                flex: 1,
                padding: '8px',
                background: isEditable ? '#34495e' : '#2c3e50',
                color: 'white',
                border: '1px solid #4a5f7f',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                cursor: isEditable ? 'text' : 'not-allowed'
              }}
            />
            {isEditable && (
              <button
                onClick={() => {
                  const currentVersion = node.data.version || '1.0';
                  const parts = currentVersion.split('.');
                  const minor = parseInt(parts[1] || 0) + 1;
                  onUpdate(node.id, 'version', `${parts[0]}.${minor}`);
                }}
                style={{
                  padding: '8px 12px',
                  background: '#8e44ad',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}
              >
                +0.1
              </button>
            )}
          </div>
        </div>

        {/* TITLE */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#3498db',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Title
          </label>
          <input
            type="text"
            value={node.data.label || ''}
            onChange={(e) => onUpdate(node.id, 'label', e.target.value)}
            disabled={!isEditable}
            onFocus={(e) => e.target.select()}
            style={{
              width: '100%',
              padding: '10px',
              background: isEditable ? '#34495e' : '#2c3e50',
              color: isEditable ? 'white' : '#7f8c8d',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: isEditable ? 'text' : 'not-allowed'
            }}
          />
          {!isEditable && (
            <div style={{ fontSize: '9px', color: '#95a5a6', marginTop: '4px' }}>
              Cannot edit - item is frozen/released
            </div>
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            State
          </label>
          <select
            value={node.data.state || 'open'}
            onChange={(e) => onUpdate(node.id, 'state', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              background: '#34495e',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <option value="open">📝 Open (Editable)</option>
            <option value="frozen">🔒 Frozen (Review)</option>
            <option value="released">✅ Released (Approved)</option>
          </select>
        </div>

        {/* REQUIREMENT ORIGIN - Only for requirements */}
        {node.data.itemType === 'requirement' && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              color: '#3498db',
              marginBottom: '6px',
              textTransform: 'uppercase',
              fontWeight: 'bold'
            }}>
              Origin
            </label>
            <select
              value={node.data.origin || 'internal'}
              onChange={(e) => onUpdate(node.id, 'origin', e.target.value)}
              disabled={!isEditable}
              style={{
                width: '100%',
                padding: '10px',
                background: '#34495e',
                color: 'white',
                border: '1px solid #4a5f7f',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            >
              <option value="internal">🏠 Internal</option>
              <option value="external">🌐 External</option>
            </select>
          </div>
        )}

        {/* REQUIREMENT TYPE - Only for requirements */}
        {node.data.itemType === 'requirement' && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              color: '#3498db',
              marginBottom: '6px',
              textTransform: 'uppercase',
              fontWeight: 'bold'
            }}>
              Requirement Type
            </label>
            <select
              value={node.data.reqType || 'project'}
              onChange={(e) => onUpdate(node.id, 'reqType', e.target.value)}
              disabled={!isEditable}
              style={{
                width: '100%',
                padding: '10px',
                background: '#34495e',
                color: 'white',
                border: '1px solid #4a5f7f',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            >
              <option value="customer">🟣 Customer Requirement</option>
              <option value="platform">🔷 Platform Requirement</option>
              <option value="project">🔶 Project Requirement</option>
              <option value="implementation">🟢 Implementation Requirement</option>
            </select>
          </div>
        )}

        {/* CLASSIFICATION */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            fontSize: '11px',
            color: '#3498db',
            marginBottom: '6px',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Classification
          </label>
          <select
            value={node.data.classification || 'requirement'}
            onChange={(e) => onUpdate(node.id, 'classification', e.target.value)}
            disabled={!isEditable}
            style={{
              width: '100%',
              padding: '10px',
              background: '#34495e',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          >
            {/* Options for System/Sub-System/Function */}
            {(node.data.itemType === 'system' || 
              node.data.itemType === 'subsystem' || 
              node.data.itemType === 'function') ? (
              <>
                <option value="platform">🔷 Platform</option>
                <option value="project">🔶 Project</option>
              </>
            ) : (
              <>
                <option value="need">🎯 Need (High-level goal)</option>
                <option value="capability">⚙️ Capability</option>
                <option value="requirement">📋 Requirement</option>
              </>
            )}
          </select>
        </div>
            
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Description
          </label>
          <VoiceTextArea
            value={node.data.description || ''}
            onChange={(text) => onUpdate(node.id, 'description', text)}
            placeholder="Add description..."
            disabled={!isEditable}
            style={{
              width: '100%',
              padding: '8px',
              background: isEditable ? '#34495e' : '#2c3e50',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical',
              cursor: isEditable ? 'text' : 'not-allowed'
            }}
          />
        </div>
        
        {/* Port Editor - for System Engineering items */}
        {(node.data.itemType === 'system' || 
          node.data.itemType === 'subsystem' || 
          node.data.itemType === 'function') && (
          <PortEditor
            ports={node.data.ports || []}
            onChange={(newPorts) => onUpdate(node.id, 'ports', newPorts)}
            disabled={!isEditable}
          />
        )}

        {/* Issues Section */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Issues 🐛
          </label>
          <button
            onClick={() => {
              if (node.data.onShowIssues) {
                node.data.onShowIssues(node);
              }
            }}
            style={{
              width: '100%',
              padding: '10px',
              background: node.data.issueCount > 0 
                ? (node.data.criticalIssueCount > 0 ? '#c0392b' : '#e67e22')
                : '#34495e',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '13px'
            }}
          >
            {node.data.issueCount > 0 ? (
              <>
                <span>🐛</span>
                <span>{node.data.issueCount} Open Issue{node.data.issueCount !== 1 ? 's' : ''}</span>
                {node.data.criticalIssueCount > 0 && (
                  <span style={{
                    background: '#fff',
                    color: '#c0392b',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    {node.data.criticalIssueCount} Critical
                  </span>
                )}
              </>
            ) : (
              <>
                <span>➕</span>
                <span>Add Issue</span>
              </>
            )}
          </button>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Attachment 📎
          </label>
          
          {node.data.attachment ? (
            <div>
              <div 
                style={{
                  width: '100%',
                  height: '120px',
                  backgroundImage: 'url(' + node.data.attachment + ')',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: '2px solid #4a5f7f'
                }}
                onClick={() => setShowImagePreview(true)}
              />
              {isEditable && (
                <button
                  onClick={removeImage}
                  style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    background: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    width: '100%'
                  }}
                >
                  Remove Image
                </button>
              )}
            </div>
          ) : (
            <label style={{
              display: 'block',
              padding: '20px',
              background: isEditable ? '#34495e' : '#2c3e50',
              border: '2px dashed #4a5f7f',
              borderRadius: '4px',
              textAlign: 'center',
              cursor: isEditable ? 'pointer' : 'not-allowed',
              fontSize: '13px'
            }}>
              {isEditable ? '📎 Click to upload image' : '📎 No attachment'}
              {isEditable && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              )}
            </label>
          )}
        </div>

        {/* Issues Section */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            fontSize: '11px',
            color: '#e74c3c',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            <span>🐛 Issues ({(node.data.issues || []).length})</span>
            {isEditable && (
              <button
                onClick={() => {
                  const issues = node.data.issues || [];
                  const newIssue = {
                    id: `issue-${Date.now()}`,
                    title: 'New Issue',
                    description: '',
                    priority: 'medium',
                    status: 'open',
                    createdAt: new Date().toISOString(),
                    createdBy: 'Current User'
                  };
                  onUpdate(node.id, 'issues', [...issues, newIssue]);
                }}
                style={{
                  background: '#e74c3c',
                  border: 'none',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                + Add Issue
              </button>
            )}
          </label>

          {(node.data.issues || []).length === 0 ? (
            <div style={{
              padding: '12px',
              background: '#1a2a1a',
              borderRadius: '4px',
              textAlign: 'center',
              color: '#7f8c8d',
              fontSize: '12px'
            }}>
              ✓ No issues
            </div>
          ) : (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {(node.data.issues || []).map((issue, index) => (
                <div 
                  key={issue.id} 
                  style={{
                    background: '#34495e',
                    borderRadius: '4px',
                    padding: '10px',
                    marginBottom: '6px',
                    borderLeft: `3px solid ${
                      issue.priority === 'critical' ? '#9b59b6' :
                      issue.priority === 'high' ? '#e74c3c' :
                      issue.priority === 'medium' ? '#f39c12' : '#27ae60'
                    }`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <input
                      type="text"
                      value={issue.title}
                      onChange={(e) => {
                        const issues = [...(node.data.issues || [])];
                        issues[index] = { ...issues[index], title: e.target.value };
                        onUpdate(node.id, 'issues', issues);
                      }}
                      disabled={!isEditable}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        outline: 'none'
                      }}
                    />
                    {isEditable && (
                      <button
                        onClick={() => {
                          const issues = (node.data.issues || []).filter((_, i) => i !== index);
                          onUpdate(node.id, 'issues', issues);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#e74c3c',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '0 4px'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  
                  <textarea
                    value={issue.description || ''}
                    onChange={(e) => {
                      const issues = [...(node.data.issues || [])];
                      issues[index] = { ...issues[index], description: e.target.value };
                      onUpdate(node.id, 'issues', issues);
                    }}
                    disabled={!isEditable}
                    placeholder="Issue description..."
                    style={{
                      width: '100%',
                      background: '#2c3e50',
                      border: '1px solid #4a5f7f',
                      borderRadius: '3px',
                      color: 'white',
                      fontSize: '11px',
                      padding: '6px',
                      resize: 'vertical',
                      minHeight: '40px',
                      marginBottom: '6px'
                    }}
                  />
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={issue.priority}
                      onChange={(e) => {
                        const issues = [...(node.data.issues || [])];
                        issues[index] = { ...issues[index], priority: e.target.value };
                        onUpdate(node.id, 'issues', issues);
                      }}
                      disabled={!isEditable}
                      style={{
                        flex: 1,
                        padding: '4px',
                        background: '#2c3e50',
                        color: 'white',
                        border: '1px solid #4a5f7f',
                        borderRadius: '3px',
                        fontSize: '10px'
                      }}
                    >
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🔴 High</option>
                      <option value="critical">🟣 Critical</option>
                    </select>
                    
                    <select
                      value={issue.status}
                      onChange={(e) => {
                        const issues = [...(node.data.issues || [])];
                        issues[index] = { ...issues[index], status: e.target.value };
                        onUpdate(node.id, 'issues', issues);
                      }}
                      disabled={!isEditable}
                      style={{
                        flex: 1,
                        padding: '4px',
                        background: '#2c3e50',
                        color: 'white',
                        border: '1px solid #4a5f7f',
                        borderRadius: '3px',
                        fontSize: '10px'
                      }}
                    >
                      <option value="open">📬 Open</option>
                      <option value="in-progress">🔄 In Progress</option>
                      <option value="resolved">✅ Resolved</option>
                      <option value="closed">📪 Closed</option>
                    </select>
                  </div>
                  
                  <div style={{ 
                    marginTop: '6px', 
                    fontSize: '9px', 
                    color: '#7f8c8d' 
                  }}>
                    Created: {new Date(issue.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Priority
          </label>
          <select
            value={node.data.priority || 'medium'}
            onChange={(e) => onUpdate(node.id, 'priority', e.target.value)}
            disabled={!isEditable}
            style={{
              width: '100%',
              padding: '8px',
              background: isEditable ? '#34495e' : '#2c3e50',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: isEditable ? 'pointer' : 'not-allowed'
            }}
          >
            <option value="low">🟢 Low</option>
            <option value="medium">🟡 Medium</option>
            <option value="high">🔴 High</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Owner
          </label>
          <input
            type="text"
            value={node.data.owner || ''}
            onChange={(e) => onUpdate(node.id, 'owner', e.target.value)}
            placeholder="Who owns this?"
            disabled={!isEditable}
            style={{
              width: '100%',
              padding: '8px',
              background: isEditable ? '#34495e' : '#2c3e50',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: isEditable ? 'text' : 'not-allowed'
            }}
          />
        </div>

        {/* Rationale field - for all items */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            💡 Rationale (Why is this needed?)
          </label>
          <textarea
            value={node.data.rationale || ''}
            onChange={(e) => onUpdate(node.id, 'rationale', e.target.value)}
            placeholder="Explain why this item exists..."
            disabled={!isEditable}
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '8px',
              background: isEditable ? '#34495e' : '#2c3e50',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical',
              cursor: isEditable ? 'text' : 'not-allowed'
            }}
          />
        </div>

        {/* Test Case specific fields */}
        {(node.data.itemType === 'testcase' || node.data.type === 'testcase') && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#27ae60',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                🎯 Purpose
              </label>
              <textarea
                value={node.data.purpose || ''}
                onChange={(e) => onUpdate(node.id, 'purpose', e.target.value)}
                placeholder="What does this test verify?"
                disabled={!isEditable}
                style={{
                  width: '100%',
                  minHeight: '60px',
                  padding: '8px',
                  background: isEditable ? '#34495e' : '#2c3e50',
                  color: 'white',
                  border: '1px solid #27ae60',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#27ae60',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                ⚠️ Preconditions
              </label>
              <textarea
                value={node.data.preconditions || ''}
                onChange={(e) => onUpdate(node.id, 'preconditions', e.target.value)}
                placeholder="What must be true before testing? (one per line)"
                disabled={!isEditable}
                style={{
                  width: '100%',
                  minHeight: '60px',
                  padding: '8px',
                  background: isEditable ? '#34495e' : '#2c3e50',
                  color: 'white',
                  border: '1px solid #27ae60',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#27ae60',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                📝 Test Steps (one per line)
              </label>
              <textarea
                value={node.data.testSteps || ''}
                onChange={(e) => onUpdate(node.id, 'testSteps', e.target.value)}
                placeholder="Step 1: Do this&#10;Step 2: Do that&#10;Step 3: Check result"
                disabled={!isEditable}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '8px',
                  background: isEditable ? '#34495e' : '#2c3e50',
                  color: 'white',
                  border: '1px solid #27ae60',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#27ae60',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                ✅ Expected Results (one per line, matching steps)
              </label>
              <textarea
                value={node.data.expectedResults || ''}
                onChange={(e) => onUpdate(node.id, 'expectedResults', e.target.value)}
                placeholder="Step 1: System responds with OK&#10;Step 2: Value changes to X&#10;Step 3: No errors shown"
                disabled={!isEditable}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '8px',
                  background: isEditable ? '#34495e' : '#2c3e50',
                  color: 'white',
                  border: '1px solid #27ae60',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>
          </>
        )}

        {/* PARAMETER FIELDS */}
        {(node.data.itemType === 'parameter' || node.data.type === 'parameter') && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#00bcd4',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Parameter Type
              </label>
              <select
                value={node.data.paramType || 'configuration'}
                onChange={(e) => onUpdate(node.id, 'paramType', e.target.value)}
                disabled={!isEditable}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #00bcd4',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              >
                <option value="configuration">⚙️ Configuration</option>
                <option value="settings">🔧 Settings</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: '#00bcd4',
                  textTransform: 'uppercase',
                  fontWeight: 'bold'
                }}>
                  Value
                </label>
                <input
                  type="text"
                  value={node.data.paramValue || ''}
                  onChange={(e) => onUpdate(node.id, 'paramValue', e.target.value)}
                  disabled={!isEditable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: '#00bcd4',
                  textTransform: 'uppercase',
                  fontWeight: 'bold'
                }}>
                  Unit
                </label>
                <input
                  type="text"
                  value={node.data.paramUnit || ''}
                  onChange={(e) => onUpdate(node.id, 'paramUnit', e.target.value)}
                  placeholder="e.g., V, A, kW, °C"
                  disabled={!isEditable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: '#00bcd4',
                  textTransform: 'uppercase',
                  fontWeight: 'bold'
                }}>
                  Min
                </label>
                <input
                  type="text"
                  value={node.data.paramMin || ''}
                  onChange={(e) => onUpdate(node.id, 'paramMin', e.target.value)}
                  disabled={!isEditable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: '#00bcd4',
                  textTransform: 'uppercase',
                  fontWeight: 'bold'
                }}>
                  Max
                </label>
                <input
                  type="text"
                  value={node.data.paramMax || ''}
                  onChange={(e) => onUpdate(node.id, 'paramMax', e.target.value)}
                  disabled={!isEditable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: '#00bcd4',
                  textTransform: 'uppercase',
                  fontWeight: 'bold'
                }}>
                  Default
                </label>
                <input
                  type="text"
                  value={node.data.paramDefault || ''}
                  onChange={(e) => onUpdate(node.id, 'paramDefault', e.target.value)}
                  disabled={!isEditable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* HARDWARE FIELDS */}
        {(node.data.itemType === 'hardware' || node.data.type === 'hardware') && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#795548',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Hardware Type
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={node.data.hwType || 'generic'}
                  onChange={(e) => {
                    const hwInfo = hardwareTypes.find(t => t.id === e.target.value) || { icon: '📦' };
                    onUpdate(node.id, 'hwType', e.target.value);
                    onUpdate(node.id, 'hwIcon', hwInfo.icon);
                  }}
                  disabled={!isEditable}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #795548',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                >
                  {hardwareTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.icon?.length <= 2 ? type.icon : '📦'} {type.name}
                    </option>
                  ))}
                </select>
                {onManageTypes && (
                  <button
                    onClick={onManageTypes}
                    style={{
                      padding: '8px 12px',
                      background: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                    title="Manage Hardware Types"
                  >
                    ⚙️
                  </button>
                )}
              </div>
            </div>

            {/* Custom Icon */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#795548',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Custom Icon (Optional)
              </label>
              
              {/* Show current custom icon if exists */}
              {node.data.hwCustomIcon && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  marginBottom: '10px',
                  padding: '10px',
                  background: '#2c3e50',
                  borderRadius: '6px'
                }}>
                  <img 
                    src={node.data.hwCustomIcon} 
                    alt="Custom Icon"
                    style={{ 
                      width: '50px', 
                      height: '50px', 
                      objectFit: 'contain',
                      background: '#fff',
                      borderRadius: '4px',
                      padding: '4px'
                    }}
                  />
                  <button
                    onClick={() => onUpdate(node.id, 'hwCustomIcon', null)}
                    style={{
                      padding: '6px 12px',
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              )}
              
              {/* Icon URL input */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="Paste image URL..."
                  id={`icon-url-${node.id}`}
                  disabled={!isEditable}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
                <button
                  onClick={() => {
                    const urlInput = document.getElementById(`icon-url-${node.id}`);
                    if (urlInput && urlInput.value) {
                      onUpdate(node.id, 'hwCustomIcon', urlInput.value);
                      urlInput.value = '';
                    }
                  }}
                  disabled={!isEditable}
                  style={{
                    padding: '8px 12px',
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                >
                  Add
                </button>
              </div>
              
              {/* Or upload file */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: '#7f8c8d' }}>or</span>
                <label style={{
                  padding: '6px 12px',
                  background: '#3498db',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: isEditable ? 'pointer' : 'not-allowed',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}>
                  📁 Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={!isEditable}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          onUpdate(node.id, 'hwCustomIcon', event.target.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
              
              <div style={{ fontSize: '9px', color: '#7f8c8d', marginTop: '6px' }}>
                💡 Use PNG/SVG with transparent background for best results
              </div>
            </div>

            {/* Icon Size Control */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#795548',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Icon Size: {node.data.hwIconSize || 64}px
              </label>
              <input
                type="range"
                min="32"
                max="128"
                value={node.data.hwIconSize || 64}
                onChange={(e) => onUpdate(node.id, 'hwIconSize', parseInt(e.target.value))}
                disabled={!isEditable}
                style={{
                  width: '100%',
                  cursor: 'pointer'
                }}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '9px', 
                color: '#7f8c8d' 
              }}>
                <span>32px</span>
                <span>128px</span>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#795548',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Manufacturer
              </label>
              <input
                type="text"
                value={node.data.manufacturer || ''}
                onChange={(e) => onUpdate(node.id, 'manufacturer', e.target.value)}
                placeholder="e.g., ABB, Siemens, Danfoss"
                disabled={!isEditable}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #4a5f7f',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: '#795548',
                  textTransform: 'uppercase',
                  fontWeight: 'bold'
                }}>
                  Part Number
                </label>
                <input
                  type="text"
                  value={node.data.partNumber || ''}
                  onChange={(e) => onUpdate(node.id, 'partNumber', e.target.value)}
                  disabled={!isEditable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: '#795548',
                  textTransform: 'uppercase',
                  fontWeight: 'bold'
                }}>
                  Serial Number
                </label>
                <input
                  type="text"
                  value={node.data.serialNumber || ''}
                  onChange={(e) => onUpdate(node.id, 'serialNumber', e.target.value)}
                  disabled={!isEditable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#34495e',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#795548',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Specifications
              </label>
              <textarea
                value={node.data.specifications || ''}
                onChange={(e) => onUpdate(node.id, 'specifications', e.target.value)}
                placeholder="Power: 500W&#10;Voltage: 400V AC&#10;Current: 10A"
                disabled={!isEditable}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #4a5f7f',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
              />
            </div>
          </>
        )}

        {/* USE CASE FIELDS */}
        {(node.data.itemType === 'usecase' || node.data.type === 'usecase') && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#f39c12',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Preconditions
              </label>
              <textarea
                value={node.data.preconditions || ''}
                onChange={(e) => onUpdate(node.id, 'preconditions', e.target.value)}
                disabled={!isEditable}
                placeholder="What must be true before this use case can be executed?"
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #f39c12',
                  borderRadius: '4px',
                  minHeight: '60px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#f39c12',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Main Flow
              </label>
              <textarea
                value={node.data.mainFlow || ''}
                onChange={(e) => onUpdate(node.id, 'mainFlow', e.target.value)}
                disabled={!isEditable}
                placeholder="Step-by-step description of the normal flow"
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #f39c12',
                  borderRadius: '4px',
                  minHeight: '80px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#f39c12',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Alternative Flows
              </label>
              <textarea
                value={node.data.alternativeFlows || ''}
                onChange={(e) => onUpdate(node.id, 'alternativeFlows', e.target.value)}
                disabled={!isEditable}
                placeholder="Alternative paths or exception handling"
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #f39c12',
                  borderRadius: '4px',
                  minHeight: '60px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#f39c12',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Postconditions
              </label>
              <textarea
                value={node.data.postconditions || ''}
                onChange={(e) => onUpdate(node.id, 'postconditions', e.target.value)}
                disabled={!isEditable}
                placeholder="What will be true after successful execution?"
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #f39c12',
                  borderRadius: '4px',
                  minHeight: '60px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>
          </>
        )}

        {/* ACTOR FIELDS */}
        {(node.data.itemType === 'actor' || node.data.type === 'actor') && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#2ecc71',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Actor Type
              </label>
              <select
                value={node.data.actorType || 'primary'}
                onChange={(e) => onUpdate(node.id, 'actorType', e.target.value)}
                disabled={!isEditable}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #2ecc71',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              >
                <option value="primary">Primary Actor</option>
                <option value="secondary">Secondary Actor</option>
                <option value="system">System Actor</option>
                <option value="external">External System</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                color: '#2ecc71',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                Responsibilities
              </label>
              <textarea
                value={node.data.responsibilities || ''}
                onChange={(e) => onUpdate(node.id, 'responsibilities', e.target.value)}
                disabled={!isEditable}
                placeholder="What actions or decisions is this actor responsible for?"
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#34495e',
                  color: 'white',
                  border: '1px solid #2ecc71',
                  borderRadius: '4px',
                  minHeight: '80px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  cursor: isEditable ? 'text' : 'not-allowed'
                }}
              />
            </div>
          </>
        )}


        <div style={{
          padding: '10px',
          background: '#34495e',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#95a5a6',
          marginBottom: '15px'
        }}>
          <div><strong>ID:</strong> {node.id}</div>
        </div>

        {(node.data.itemType === 'testcase' || node.data.type === 'testcase') && (
          <button
            onClick={() => {
              if (window.generateFATFunction) {
                window.generateFATFunction(node);
              }
            }}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              background: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📄 Generate FAT Protocol
          </button>
        )}  

        <button
          onClick={() => {
            if (window.duplicateNodeFunction) {
              window.duplicateNodeFunction(node);
            }
          }}
          style={{
            width: '100%',
            padding: '10px',
            background: '#8e44ad',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
        📋 Duplicate Node (Ctrl+D) 
        </button>
      </div>

      {showImagePreview && node.data.attachment && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowImagePreview(false)}
        >
          <img
            src={node.data.attachment}
            alt="Attachment preview"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
          />
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
  textAnnotation: TextAnnotationNode,
};

const initialNodes = [
  // SYSTEM
  { 
    id: '1', 
    type: 'custom',
    position: { x: 50, y: 200 }, 
    data: { 
      label: 'Propulsion Control System', 
      type: 'system',
      itemType: 'system',
      reqId: 'SYS-001',
      version: '1.0',
      classification: 'system',
      description: 'Main propulsion control system for vessel motor management',
      rationale: 'Required to control and monitor all propulsion motors on the vessel',
      priority: 'high',
      status: 'in-progress',
      state: 'open',
      owner: 'Systems Engineering',
      attachment: null,
      issues: []
    }
  },
  
  // SUB-SYSTEMS
  { 
    id: '2', 
    type: 'custom',
    position: { x: 350, y: 80 }, 
    data: { 
      label: 'Motor Controller', 
      type: 'subsystem',
      itemType: 'subsystem',
      reqId: 'SUB-001',
      version: '1.0',
      classification: 'subsystem',
      description: 'Controls motor speed and direction',
      rationale: 'Needed to translate bridge commands to motor actions',
      priority: 'high',
      status: 'in-progress',
      state: 'open',
      owner: 'Control Systems Team',
      attachment: null,
      issues: []
    }
  },
  { 
    id: '3', 
    type: 'custom',
    position: { x: 350, y: 320 }, 
    data: { 
      label: 'Safety Monitor', 
      type: 'subsystem',
      itemType: 'subsystem',
      reqId: 'SUB-002',
      version: '1.0',
      classification: 'subsystem',
      description: 'Monitors safety conditions and triggers emergency stops',
      rationale: 'Critical for vessel and crew safety - IMO requirement',
      priority: 'high',
      status: 'new',
      state: 'frozen',
      owner: 'Safety Team',
      attachment: null,
      issues: []
    }
  },
  
  // FUNCTIONS
  { 
    id: '4', 
    type: 'custom',
    position: { x: 650, y: 30 }, 
    data: { 
      label: 'Speed Regulation', 
      type: 'function',
      itemType: 'function',
      reqId: 'FUN-001',
      version: '1.0',
      classification: 'function',
      description: 'Regulate motor speed from 0-100%',
      rationale: 'Core function for vessel maneuverability',
      priority: 'high',
      status: 'in-progress',
      state: 'open',
      owner: 'Software Team',
      attachment: null,
      issues: []
    }
  },
  { 
    id: '5', 
    type: 'custom',
    position: { x: 650, y: 180 }, 
    data: { 
      label: 'Direction Control', 
      type: 'function',
      itemType: 'function',
      reqId: 'FUN-002',
      version: '1.0',
      classification: 'function',
      description: 'Control forward/reverse direction',
      rationale: 'Essential for docking and maneuvering',
      priority: 'high',
      status: 'new',
      state: 'open',
      owner: 'Software Team',
      attachment: null,
      issues: []
    }
  },
  { 
    id: '6', 
    type: 'custom',
    position: { x: 650, y: 320 }, 
    data: { 
      label: 'Emergency Stop', 
      type: 'function',
      itemType: 'function',
      reqId: 'FUN-003',
      version: '1.0',
      classification: 'function',
      description: 'Immediately stop all motors within 2 seconds',
      rationale: 'Safety critical - required by maritime regulations',
      priority: 'high',
      status: 'in-progress',
      state: 'frozen',
      owner: 'Safety Team',
      attachment: null,
      issues: []
    }
  },
  
  // REQUIREMENTS
  { 
    id: '7', 
    type: 'custom',
    position: { x: 950, y: 30 }, 
    data: { 
      label: 'PWM Control Algorithm', 
      type: 'project',
      reqType: 'project',
      reqId: 'PRJ-001',
      version: '1.0',
      classification: 'requirement',
      description: 'Implement PWM control with 10kHz frequency',
      rationale: 'Required for smooth speed transitions',
      priority: 'high',
      status: 'new',
      state: 'open',
      owner: 'Fredrik',
      attachment: null,
      issues: []
    }
  },
  { 
    id: '8', 
    type: 'custom',
    position: { x: 950, y: 180 }, 
    data: { 
      label: 'Direction State Machine', 
      type: 'project',
      reqType: 'project',
      reqId: 'PRJ-002',
      version: '1.0',
      classification: 'requirement',
      description: 'Implement state machine for direction changes with safety interlocks',
      rationale: 'Prevent mechanical damage from sudden direction changes',
      priority: 'medium',
      status: 'new',
      state: 'open',
      owner: 'Fredrik',
      attachment: null,
      issues: []
    }
  },
  { 
    id: '9', 
    type: 'custom',
    position: { x: 950, y: 320 }, 
    data: { 
      label: 'Hardware Interrupt Handler', 
      type: 'project',
      reqType: 'implementation',
      reqId: 'IMP-001',
      version: '1.0',
      classification: 'requirement',
      description: 'Implement interrupt-based stop signal with <10ms latency',
      rationale: 'Ensures immediate response to emergency stop commands',
      priority: 'high',
      status: 'in-progress',
      state: 'open',
      owner: 'Embedded Team',
      attachment: null,
      issues: []
    }
  },
  
  // CUSTOMER REQUIREMENT
  { 
    id: '10', 
    type: 'custom',
    position: { x: 50, y: 450 }, 
    data: { 
      label: 'Vessel Speed Control', 
      type: 'platform',
      reqType: 'customer',
      reqId: 'CUS-001',
      version: '1.0',
      classification: 'need',
      description: 'Customer requires precise vessel speed control for fuel efficiency',
      rationale: 'Customer business requirement - reduce fuel costs by 15%',
      priority: 'high',
      status: 'done',
      state: 'released',
      owner: 'Customer: Nordic Shipping AB',
      attachment: null,
      issues: []
    }
  },
];

const initialEdges = [
  // System contains Sub-Systems
  { id: 'e1-2', source: '1', target: '2', type: 'custom', data: { relationType: 'contains', notes: 'Motor Controller is part of the main propulsion system' } },
  { id: 'e1-3', source: '1', target: '3', type: 'custom', data: { relationType: 'contains', notes: 'Safety Monitor is integrated into propulsion system' } },
  
  // Sub-Systems provide Functions
  { id: 'e2-4', source: '2', target: '4', type: 'custom', data: { relationType: 'provides', notes: 'Motor Controller provides speed regulation capability' } },
  { id: 'e2-5', source: '2', target: '5', type: 'custom', data: { relationType: 'provides', notes: 'Motor Controller handles direction switching' } },
  { id: 'e3-6', source: '3', target: '6', type: 'custom', data: { relationType: 'provides', notes: 'Safety Monitor triggers emergency stop function' } },
  
  // Functions realized by Requirements
  { id: 'e4-7', source: '4', target: '7', type: 'custom', data: { relationType: 'realizedBy', notes: 'PWM algorithm implements speed regulation' } },
  { id: 'e5-8', source: '5', target: '8', type: 'custom', data: { relationType: 'realizedBy', notes: 'State machine implements direction control logic' } },
  { id: 'e6-9', source: '6', target: '9', type: 'custom', data: { relationType: 'realizedBy', notes: 'Interrupt handler implements emergency stop response' } },
  
  // Customer need flows to System
  { id: 'e10-1', source: '10', target: '1', type: 'custom', data: { relationType: 'satisfies', notes: 'Propulsion Control System satisfies customer speed control needs' } },
];

// Issue Panel Modal for managing issues on a node
function IssuePanelModal({ node, issues, onClose, onAddIssue, onUpdateIssue, onDeleteIssue }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    status: 'open',
    type: 'bug',
    assignee: '',
    dueDate: ''
  });

  const nodeIssues = issues[node.id] || [];

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      severity: 'medium',
      status: 'open',
      type: 'bug',
      assignee: '',
      dueDate: ''
    });
  };

  const handleAdd = () => {
    if (formData.title.trim()) {
      onAddIssue(node.id, formData);
      resetForm();
      setIsAdding(false);
    }
  };

  const handleUpdate = () => {
    if (editingIssue && formData.title.trim()) {
      onUpdateIssue(node.id, editingIssue.id, formData);
      resetForm();
      setEditingIssue(null);
    }
  };

  const startEdit = (issue) => {
    setEditingIssue(issue);
    setFormData({
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      status: issue.status,
      type: issue.type,
      assignee: issue.assignee,
      dueDate: issue.dueDate
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingIssue(null);
    setIsAdding(false);
    resetForm();
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#c0392b';
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#e74c3c';
      case 'in-progress': return '#3498db';
      case 'resolved': return '#27ae60';
      case 'closed': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'bug': return '🐛';
      case 'enhancement': return '✨';
      case 'question': return '❓';
      case 'task': return '📋';
      default: return '📌';
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px',
    background: '#34495e',
    border: '1px solid #4a5f7f',
    borderRadius: '4px',
    color: 'white',
    fontSize: '13px'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '4px',
    fontSize: '11px',
    color: '#bdc3c7',
    textTransform: 'uppercase'
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000
    }}>
      <div style={{
        width: '600px',
        maxHeight: '80vh',
        background: '#2c3e50',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: '#34495e',
          borderBottom: '1px solid #4a5f7f',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>
              🐛 Issues for: {node.data.label}
            </div>
            <div style={{ fontSize: '12px', color: '#bdc3c7', marginTop: '2px' }}>
              {node.data.reqId} • {nodeIssues.length} issue{nodeIssues.length !== 1 ? 's' : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 8px'
            }}
          >×</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {/* Issue List */}
          {nodeIssues.length === 0 && !isAdding && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#7f8c8d'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
              <div>No issues reported for this item</div>
            </div>
          )}

          {nodeIssues.map(issue => (
            <div 
              key={issue.id}
              style={{
                background: editingIssue?.id === issue.id ? '#3d566e' : '#34495e',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '10px',
                border: editingIssue?.id === issue.id ? '2px solid #3498db' : '1px solid #4a5f7f'
              }}
            >
              {editingIssue?.id === issue.id ? (
                // Edit Mode
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Severity</label>
                      <select
                        value={formData.severity}
                        onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                        style={selectStyle}
                      >
                        <option value="critical">🔴 Critical</option>
                        <option value="high">🟠 High</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="low">🟢 Low</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        style={selectStyle}
                      >
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        style={selectStyle}
                      >
                        <option value="bug">🐛 Bug</option>
                        <option value="enhancement">✨ Enhancement</option>
                        <option value="question">❓ Question</option>
                        <option value="task">📋 Task</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Assignee</label>
                      <input
                        type="text"
                        value={formData.assignee}
                        onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                        placeholder="Enter name..."
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Due Date</label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={cancelEdit}
                      style={{
                        padding: '8px 16px',
                        background: '#7f8c8d',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >Cancel</button>
                    <button
                      onClick={handleUpdate}
                      style={{
                        padding: '8px 16px',
                        background: '#3498db',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >Save Changes</button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{getTypeIcon(issue.type)}</span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: 'white',
                        textDecoration: issue.status === 'closed' ? 'line-through' : 'none',
                        opacity: issue.status === 'closed' ? 0.6 : 1
                      }}>
                        {issue.title}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        color: '#7f8c8d',
                        fontFamily: 'monospace'
                      }}>
                        {issue.id}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => startEdit(issue)}
                        style={{
                          background: '#3498db',
                          border: 'none',
                          borderRadius: '4px',
                          color: 'white',
                          padding: '4px 8px',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >Edit</button>
                      <button
                        onClick={() => onDeleteIssue(node.id, issue.id)}
                        style={{
                          background: '#e74c3c',
                          border: 'none',
                          borderRadius: '4px',
                          color: 'white',
                          padding: '4px 8px',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >Delete</button>
                    </div>
                  </div>
                  
                  {issue.description && (
                    <div style={{ color: '#bdc3c7', fontSize: '13px', marginBottom: '8px' }}>
                      {issue.description}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      background: getSeverityColor(issue.severity),
                      color: 'white'
                    }}>
                      {issue.severity.toUpperCase()}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: getStatusColor(issue.status),
                      color: 'white'
                    }}>
                      {issue.status.replace('-', ' ').toUpperCase()}
                    </span>
                    {issue.assignee && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        background: '#8e44ad',
                        color: 'white'
                      }}>
                        👤 {issue.assignee}
                      </span>
                    )}
                    {issue.dueDate && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        background: '#2c3e50',
                        color: '#bdc3c7'
                      }}>
                        📅 {issue.dueDate}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Add Issue Form */}
          {isAdding && (
            <div style={{
              background: '#34495e',
              borderRadius: '8px',
              padding: '16px',
              border: '2px solid #27ae60'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: 'white' }}>
                ➕ New Issue
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief issue title..."
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed description of the issue..."
                    style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>Severity</label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                      style={selectStyle}
                    >
                      <option value="critical">🔴 Critical</option>
                      <option value="high">🟠 High</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      style={selectStyle}
                    >
                      <option value="bug">🐛 Bug</option>
                      <option value="enhancement">✨ Enhancement</option>
                      <option value="question">❓ Question</option>
                      <option value="task">📋 Task</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Assignee</label>
                    <input
                      type="text"
                      value={formData.assignee}
                      onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                      placeholder="Name..."
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={cancelEdit}
                    style={{
                      padding: '8px 16px',
                      background: '#7f8c8d',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >Cancel</button>
                  <button
                    onClick={handleAdd}
                    disabled={!formData.title.trim()}
                    style={{
                      padding: '8px 16px',
                      background: formData.title.trim() ? '#27ae60' : '#7f8c8d',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: formData.title.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >Create Issue</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          background: '#34495e',
          borderTop: '1px solid #4a5f7f',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={() => { setIsAdding(true); setEditingIssue(null); resetForm(); }}
            disabled={isAdding || editingIssue}
            style={{
              padding: '10px 20px',
              background: isAdding || editingIssue ? '#7f8c8d' : '#27ae60',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: isAdding || editingIssue ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            ➕ Add Issue
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#34495e',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// New Object Modal
function NewObjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name, version, description);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000
    }}>
      <div style={{
        background: '#2c3e50',
        borderRadius: '12px',
        padding: '30px',
        width: '450px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ color: 'white', marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
          🚢 Create New Object Definition
        </h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            color: '#bdc3c7',
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            marginBottom: '6px'
          }}>
            Object Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Propulsion Control System"
            autoFocus
            style={{
              width: '100%',
              padding: '12px',
              background: '#34495e',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            color: '#bdc3c7',
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            marginBottom: '6px'
          }}>
            Version
          </label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0"
            style={{
              width: '100%',
              padding: '12px',
              background: '#34495e',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            color: '#bdc3c7',
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            marginBottom: '6px'
          }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this object? What does it control?"
            style={{
              width: '100%',
              padding: '12px',
              background: '#34495e',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#7f8c8d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            style={{
              padding: '10px 20px',
              background: name.trim() ? '#27ae60' : '#7f8c8d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🚀 Create Object
          </button>
        </div>
      </div>
    </div>
  );
}

// Collapsible Sidebar Component
function Sidebar({ isOpen, onClose, children }) {
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
            backgroundColor: 'rgba(0,0,0,0.3)',
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
        backgroundColor: '#1a2634',
        boxShadow: isOpen ? '4px 0 20px rgba(0,0,0,0.5)' : 'none',
        transition: 'left 0.3s ease',
        zIndex: 4001,
        display: 'flex',
        flexDirection: 'column',
        color: 'white'
      }}>
        {/* Header */}
        <div style={{
          padding: '15px',
          borderBottom: '1px solid #34495e',
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
              color: 'white',
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
        color: '#7f8c8d',
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
        background: active ? '#3498db' : 'transparent',
        color: 'white',
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
      onMouseOver={(e) => e.target.style.background = active ? '#3498db' : '#2c3e50'}
      onMouseOut={(e) => e.target.style.background = active ? '#3498db' : 'transparent'}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      {label}
    </button>
  );
}

// Top Header Bar Component
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
  onDeleteWhiteboard
}) {
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
          onChange={(e) => onSearchChange(e.target.value)}
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
            borderRadius: '0 6px 6px 0',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold'
          }}
          title="Document View"
        >
          📄 Doc
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
            onChange={(e) => onFilterChange('type', e.target.value)}
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
            onChange={(e) => onFilterChange('state', e.target.value)}
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
            onChange={(e) => onFilterChange('priority', e.target.value)}
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
            onChange={(e) => onFilterChange('classification', e.target.value)}
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
  onOpenLibrary,
  onOpenIssueManager,
  onVoice,
  isListening,
  voiceStatus
}) {
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
function WhiteboardSelector({ 
  whiteboards, 
  activeId, 
  isOpen, 
  onToggle, 
  onSelect, 
  onNewWhiteboard,
  onRename,
  onDelete 
}) {
  const [newBoardName, setNewBoardName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const activeBoard = whiteboards.find(wb => wb.id === activeId);
  
  const handleCreate = () => {
    if (newBoardName.trim()) {
      onNewWhiteboard(newBoardName.trim());
      setNewBoardName('');
      setIsCreating(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Dropdown Button */}
      <button
        onClick={onToggle}
        style={{
          padding: '8px 14px',
          background: activeBoard?.type === 'whiteboard' ? '#ecf0f1' : '#2c3e50',
          color: activeBoard?.type === 'whiteboard' ? '#2c3e50' : 'white',
          border: '1px solid #4a5f7f',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '160px'
        }}
      >
        <span>{activeBoard?.type === 'whiteboard' ? '🎨' : '📋'}</span>
        <span style={{ flex: 1, textAlign: 'left' }}>{activeBoard?.name || 'Select View'}</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          background: '#1a2634',
          border: '1px solid #34495e',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          minWidth: '220px',
          zIndex: 5000,
          overflow: 'hidden'
        }}>
          {/* PLM View */}
          <div
            onClick={() => onSelect('plm')}
            style={{
              padding: '10px 14px',
              cursor: 'pointer',
              background: activeId === 'plm' ? '#3498db' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderBottom: '1px solid #34495e'
            }}
          >
            <span>📋</span>
            <span style={{ fontWeight: 'bold', color: 'white' }}>PLM View</span>
            {activeId === 'plm' && <span style={{ marginLeft: 'auto' }}>✓</span>}
          </div>
          
          {/* Whiteboard List */}
          {whiteboards.filter(wb => wb.type === 'whiteboard').map(wb => (
            <div
              key={wb.id}
              onClick={() => onSelect(wb.id)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                background: activeId === wb.id ? '#3498db' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'white'
              }}
            >
              <span>🎨</span>
              <span style={{ flex: 1 }}>{wb.name}</span>
              {activeId === wb.id && <span>✓</span>}
              {wb.type === 'whiteboard' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(wb.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#e74c3c',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '2px 6px'
                  }}
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
          
          {/* Separator */}
          <div style={{ height: '1px', background: '#34495e' }} />
          
          {/* New Whiteboard */}
          {isCreating ? (
            <div style={{ padding: '10px 14px' }}>
              <input
                autoFocus
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
                placeholder="Whiteboard name..."
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#2c3e50',
                  color: 'white',
                  border: '1px solid #3498db',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginBottom: '8px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleCreate}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                >
                  Create
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: '#7f8c8d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setIsCreating(true)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#27ae60'
              }}
            >
              <span>➕</span>
              <span style={{ fontWeight: 'bold' }}>New Whiteboard</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// Document View Component
function DocumentView({ nodes, edges, onNodeClick }) {
  
  // Build hierarchy from nodes and edges
  const buildHierarchy = () => {
    // Find root nodes (nodes with no incoming "contains" edges)
    const containsEdges = edges.filter(e => 
      e.data?.relationType === 'contains' || 
      e.data?.relationType === 'provides'
    );
    
    const childIds = new Set(containsEdges.map(e => e.target));
    const rootNodes = nodes.filter(n => !childIds.has(n.id));
    
    // Sort by position (left to right, top to bottom)
    rootNodes.sort((a, b) => {
      if (Math.abs(a.position.y - b.position.y) < 50) {
        return a.position.x - b.position.x;
      }
      return a.position.y - b.position.y;
    });
    
    // Recursive function to get children
    const getChildren = (nodeId) => {
      const childEdges = containsEdges.filter(e => e.source === nodeId);
      const children = childEdges.map(e => nodes.find(n => n.id === e.target)).filter(Boolean);
      children.sort((a, b) => {
        if (Math.abs(a.position.y - b.position.y) < 50) {
          return a.position.x - b.position.x;
        }
        return a.position.y - b.position.y;
      });
      return children;
    };
    
    // Build tree structure
    const buildTree = (node, level = 0) => {
      const children = getChildren(node.id);
      return {
        node,
        level,
        children: children.map(child => buildTree(child, level + 1))
      };
    };
    
        return rootNodes.map(root => buildTree(root, 0));
  };

  // Get related requirements for a node
  const getRelatedRequirements = (nodeId) => {
    const relatedEdges = edges.filter(e => 
      (e.source === nodeId || e.target === nodeId) &&
      (e.data?.relationType === 'realizes' || 
       e.data?.relationType === 'satisfies' ||
       e.data?.relationType === 'allocated')
    );
    
    const relatedIds = relatedEdges.map(e => e.source === nodeId ? e.target : e.source);
    return nodes.filter(n => relatedIds.includes(n.id) && n.data?.itemType === 'requirement');
  };

  // Generate section number
  const getSectionNumber = (indices) => {
    return indices.map(i => i + 1).join('.');
  };

  // Get item type color
  const getTypeColor = (itemType) => {
    switch(itemType) {
      case 'system': return '#1abc9c';
      case 'subsystem': return '#3498db';
      case 'function': return '#00bcd4';
      case 'requirement': return '#e67e22';
      case 'testcase': return '#27ae60';
      default: return '#9b59b6';
    }
  };

  // Get item type label
  const getTypeLabel = (itemType) => {
    switch(itemType) {
      case 'system': return 'SYSTEM';
      case 'subsystem': return 'SUB-SYSTEM';
      case 'function': return 'FUNCTION';
      case 'requirement': return 'REQUIREMENT';
      case 'testcase': return 'TEST CASE';
      default: return 'ITEM';
    }
  };

  const hierarchy = buildHierarchy();

  // Render a node section
  const renderSection = (item, indices = []) => {
    const { node, children } = item;
    const sectionNum = getSectionNumber(indices);
    const requirements = getRelatedRequirements(node.id);
    
    return (
      <div key={node.id} style={{ marginBottom: '24px' }}>
        {/* Section Header */}
        <div 
          onClick={() => onNodeClick(node)}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            cursor: 'pointer',
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(52, 152, 219, 0.05)',
            borderLeft: `4px solid ${getTypeColor(node.data?.itemType)}`,
            marginBottom: '8px',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(52, 152, 219, 0.15)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(52, 152, 219, 0.05)'}
        >
          {/* Section Number */}
          <div style={{
            fontSize: indices.length === 1 ? '24px' : indices.length === 2 ? '20px' : '16px',
            fontWeight: 'bold',
            color: '#3498db',
            minWidth: '60px'
          }}>
            {sectionNum}
          </div>
          
          {/* Content */}
          <div style={{ flex: 1 }}>
            {/* Type Badge */}
            <span style={{
              display: 'inline-block',
              background: getTypeColor(node.data?.itemType),
              color: 'white',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 'bold',
              marginBottom: '6px'
            }}>
              {getTypeLabel(node.data?.itemType)}
            </span>
            
            {/* Title */}
            <h3 style={{
              margin: '4px 0',
              fontSize: indices.length === 1 ? '20px' : indices.length === 2 ? '17px' : '15px',
              color: '#ecf0f1'
            }}>
              {node.data?.label}
            </h3>
            
            {/* ID */}
            <div style={{ fontSize: '12px', color: '#3498db', marginBottom: '8px' }}>
              {node.data?.reqId} • v{node.data?.version || '1.0'}
            </div>
            
            {/* Description */}
            {node.data?.description && (
              <p style={{
                margin: '8px 0',
                color: '#bdc3c7',
                fontSize: '14px',
                lineHeight: '1.6'
              }}>
                {node.data.description}
              </p>
            )}
            
            {/* Rationale */}
            {node.data?.rationale && (
              <div style={{
                margin: '8px 0',
                padding: '10px',
                background: 'rgba(241, 196, 15, 0.1)',
                borderRadius: '4px',
                fontSize: '13px'
              }}>
                <strong style={{ color: '#f1c40f' }}>💡 Rationale:</strong>
                <span style={{ color: '#bdc3c7', marginLeft: '8px' }}>{node.data.rationale}</span>
              </div>
            )}
            
            {/* Related Requirements */}
            {requirements.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '6px' }}>
                  Related Requirements:
                </div>
                {requirements.map(req => (
                  <div 
                    key={req.id}
                    onClick={(e) => { e.stopPropagation(); onNodeClick(req); }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      background: '#2c3e50',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginRight: '8px',
                      marginBottom: '4px',
                      cursor: 'pointer',
                      color: '#e67e22'
                    }}
                  >
                    📋 {req.data?.reqId}: {req.data?.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Children */}
        {children.length > 0 && (
          <div style={{ marginLeft: '24px' }}>
            {children.map((child, idx) => renderSection(child, [...indices, idx]))}
          </div>
        )}
      </div>
    );
  };

  // Export to Word
  const exportToWord = async () => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
    
    const docChildren = [];
    
    // Title
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'System Documentation', bold: true, size: 48 })],
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 }
      })
    );
    
    // Subtitle
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ 
          text: `Generated on ${new Date().toLocaleDateString()} • ${nodes.length} items`, 
          color: '666666',
          size: 24 
        })],
        spacing: { after: 600 }
      })
    );

    // Recursive function to add sections
    const addSection = (item, indices) => {
      const { node, children } = item;
      const sectionNum = indices.map(i => i + 1).join('.');
      const level = indices.length;
      
      // Section heading
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${sectionNum}  `, bold: true }),
            new TextRun({ text: node.data?.label || 'Untitled', bold: true })
          ],
          heading: level === 1 ? HeadingLevel.HEADING_1 : 
                   level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
          spacing: { before: 400, after: 200 }
        })
      );
      
      // Type and ID
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ 
              text: `[${(node.data?.itemType || 'item').toUpperCase()}] ${node.data?.reqId || ''} • v${node.data?.version || '1.0'}`,
              color: '3498db',
              size: 20
            })
          ],
          spacing: { after: 200 }
        })
      );
      
      // Description
      if (node.data?.description) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: node.data.description })],
            spacing: { after: 200 }
          })
        );
      }
      
      // Rationale
      if (node.data?.rationale) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Rationale: ', bold: true, color: 'f1c40f' }),
              new TextRun({ text: node.data.rationale })
            ],
            spacing: { after: 300 }
          })
        );
      }
      
      // Children
      children.forEach((child, idx) => addSection(child, [...indices, idx]));
    };

    // Add all sections
    hierarchy.forEach((item, idx) => addSection(item, [idx]));

    const doc = new Document({
      sections: [{
        properties: {},
        children: docChildren
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `System_Documentation_${new Date().toISOString().split('T')[0]}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export to PDF (Word-style, clean)
  const exportToPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    
    // Build clean HTML for PDF
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h1 style="text-align: center; color: #000; border-bottom: 2px solid #333; padding-bottom: 15px;">
          System Documentation
        </h1>
        <p style="text-align: center; color: #666; margin-bottom: 30px;">
          Generated on ${new Date().toLocaleDateString()} • ${nodes.length} items • ${edges.length} relationships
        </p>
    `;

    // Recursive function to add sections
    const addSection = (item, indices) => {
      const { node, children } = item;
      const sectionNum = indices.map(i => i + 1).join('.');
      const level = indices.length;
      const indent = (level - 1) * 20;
      
      const fontSize = level === 1 ? '18px' : level === 2 ? '15px' : '13px';
      const marginTop = level === 1 ? '25px' : '15px';
      
      htmlContent += `
        <div style="margin-left: ${indent}px; margin-top: ${marginTop};">
          <h${level + 1} style="color: #000; font-size: ${fontSize}; margin-bottom: 5px;">
            ${sectionNum} ${node.data?.label || 'Untitled'}
          </h${level + 1}>
          <p style="color: #333; font-size: 11px; margin: 0 0 8px 0;">
            [${(node.data?.itemType || 'item').toUpperCase()}] ${node.data?.reqId || ''} • v${node.data?.version || '1.0'}
          </p>
      `;
      
      if (node.data?.description) {
        htmlContent += `
          <p style="color: #333; font-size: 12px; line-height: 1.6; margin: 8px 0;">
            ${node.data.description}
          </p>
        `;
      }
      
      if (node.data?.rationale) {
        htmlContent += `
          <p style="color: #333; font-size: 11px; margin: 10px 0;">
            <strong>Rationale:</strong> ${node.data.rationale}
          </p>
        `;
      }
      
      htmlContent += `</div>`;
      
      // Add children
      children.forEach((child, idx) => addSection(child, [...indices, idx]));
    };

    // Add all sections
    hierarchy.forEach((item, idx) => addSection(item, [idx]));

    htmlContent += `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 10px;">
          PLM Prototype • Generated ${new Date().toLocaleString()}
        </div>
      </div>
    `;

    // Create temporary element
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.background = 'white';
    document.body.appendChild(tempDiv);

    const opt = {
      margin: [15, 15, 15, 15],
      filename: `System_Documentation_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    await html2pdf().set(opt).from(tempDiv).save();
    
    // Clean up
    document.body.removeChild(tempDiv);
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50px',
      left: '60px',
      right: 0,
      bottom: 0,
      background: '#1a1a2e',
      overflowY: 'auto',
      padding: '40px'
    }}>
      {/* Document Container */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: '#1e2a3a',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        padding: '40px 50px'
      }}>
        {/* Document Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          paddingBottom: '30px',
          borderBottom: '2px solid #34495e'
        }}>
          <h1 style={{
            fontSize: '28px',
            color: '#ecf0f1',
            margin: '0 0 10px 0'
          }}>
            📄 System Documentation
          </h1>
          <p style={{
            color: '#7f8c8d',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            Auto-generated from PLM data • {nodes.length} items • {edges.length} relationships
          </p>
          
          {/* Export Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={exportToWord}
              style={{
                padding: '10px 20px',
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📥 Export Word
            </button>
            <button
              onClick={exportToPDF}
              style={{
                padding: '10px 20px',
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📥 Export PDF
            </button>
          </div>
        </div>
        
        {/* Table of Contents */}
        <div style={{
          marginBottom: '40px',
          padding: '20px',
          background: '#2c3e50',
          borderRadius: '8px'
        }}>
          <h2 style={{ color: '#3498db', fontSize: '16px', marginBottom: '15px' }}>
            📑 Table of Contents
          </h2>
          {hierarchy.map((item, idx) => (
            <div key={item.node.id} style={{ marginBottom: '6px' }}>
              <a 
                href={`#section-${item.node.id}`}
                style={{ color: '#ecf0f1', textDecoration: 'none', fontSize: '14px' }}
              >
                {idx + 1}. {item.node.data?.label}
              </a>
            </div>
          ))}
        </div>
        
        {/* Content */}
        <div id="document-content">
          {hierarchy.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#7f8c8d', padding: '40px' }}>
              No items to display. Create some nodes in PLM or Whiteboard view.
            </div>
          ) : (
            hierarchy.map((item, idx) => renderSection(item, [idx]))
          )}
        </div>
        
        {/* Footer */}
        <div style={{
          marginTop: '40px',
          paddingTop: '20px',
          borderTop: '2px solid #34495e',
          textAlign: 'center',
          color: '#7f8c8d',
          fontSize: '12px'
        }}>
          Generated on {new Date().toLocaleDateString()} • PLM Prototype
        </div>
      </div>
    </div>
  );
}

// Manage Hardware Types Modal
function ManageHardwareTypesModal({ onClose, hardwareTypes, onAddType, onDeleteType, onUpdateType, onRefresh }) {
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📦');
  const [newDescription, setNewDescription] = useState('');
  const [customIconUrl, setCustomIconUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  
  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCustomIconUrl, setEditCustomIconUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if types are from database
  const hasDbTypes = hardwareTypes.some(t => t.dbId);

  const handleAdd = async () => {
    if (!newName.trim()) {
      setError('Name is required');
      return;
    }
    
    setIsAdding(true);
    setError('');
    
    const iconToSave = customIconUrl || newIcon;
    console.log('🔧 Adding HW type:', {
      name: newName.trim(),
      iconLength: iconToSave?.length,
      iconPreview: iconToSave?.substring(0, 50) + '...',
      description: newDescription.trim()
    });
    
    try {
      const result = await onAddType({
        name: newName.trim(),
        icon: iconToSave,
        description: newDescription.trim()
      });
      console.log('🔧 Add result:', result);
      setNewName('');
      setNewIcon('📦');
      setNewDescription('');
      setCustomIconUrl('');
      // Refresh after adding
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('🔧 Add error:', err);
      setError(err.message || 'Failed to add hardware type');
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (type) => {
    setEditingId(type.dbId);
    setEditName(type.name);
    setEditIcon(type.icon || '📦');
    setEditDescription(type.description || '');
    // Check if icon is a URL
    if (type.icon?.startsWith('http') || type.icon?.startsWith('data:')) {
      setEditCustomIconUrl(type.icon);
      setEditIcon('📦');
    } else {
      setEditCustomIconUrl('');
      setEditIcon(type.icon || '📦');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditIcon('📦');
    setEditDescription('');
    setEditCustomIconUrl('');
  };

  const handleUpdate = async () => {
    if (!editName.trim()) {
      setError('Name is required');
      return;
    }
    
    setIsUpdating(true);
    setError('');
    
    const iconToSave = editCustomIconUrl || editIcon;
    console.log('🔧 Updating HW type:', {
      dbId: editingId,
      name: editName.trim(),
      iconLength: iconToSave?.length,
      iconPreview: iconToSave?.substring(0, 50) + '...',
      description: editDescription.trim()
    });
    
    try {
      const result = await onUpdateType(editingId, {
        name: editName.trim(),
        icon: iconToSave,
        description: editDescription.trim()
      });
      console.log('🔧 Update result:', result);
      cancelEdit();
      // Refresh to get the updated data
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('🔧 Update error:', err);
      setError(err.message || 'Failed to update hardware type');
    } finally {
      setIsUpdating(false);
    }
  };

  const commonEmojis = ['📦', '⚙️', '🔄', '🔋', '📡', '🎛️', '💧', '🌀', '⚡', '🔌', '🖥️', '🚰', '🔥', '❄️', '🔧', '⛽', '🛢️', '🎚️', '📊', '🔩'];

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5000
      }}
      onClick={(e) => {
        // Close when clicking backdrop (not the modal content)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        style={{
          background: '#2c3e50',
          padding: '30px',
          borderRadius: '12px',
          width: '600px',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ color: 'white', margin: 0 }}>🔧 Manage Hardware Types</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {onRefresh && (
              <button
                onClick={onRefresh}
                style={{
                  background: '#3498db',
                  border: 'none',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                title="Refresh from database"
              >
                🔄 Refresh
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#95a5a6',
                fontSize: '24px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Database Status */}
        <div style={{
          padding: '8px 12px',
          marginBottom: '15px',
          borderRadius: '6px',
          fontSize: '12px',
          background: hasDbTypes ? 'rgba(39, 174, 96, 0.2)' : 'rgba(231, 76, 60, 0.2)',
          color: hasDbTypes ? '#27ae60' : '#e74c3c',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {hasDbTypes ? (
            <>✅ Connected to database - {hardwareTypes.filter(t => t.dbId).length} types loaded</>
          ) : (
            <>⚠️ Using default types - Add a new type to save to database</>
          )}
        </div>

        {/* Add New Type Section */}
        <div style={{
          background: '#34495e',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#3498db', marginTop: 0, fontSize: '14px' }}>➕ Add New Type</h3>
          
          {error && (
            <div style={{ color: '#e74c3c', marginBottom: '10px', fontSize: '13px' }}>
              {error}
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', marginBottom: '5px' }}>
                NAME *
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., PLC, VFD, HMI..."
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#2c3e50',
                  color: 'white',
                  border: '1px solid #4a5f7f',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', marginBottom: '5px' }}>
                ICON
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Upload Button */}
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 12px',
                  background: '#795548',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  📁 Upload
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setCustomIconUrl(event.target.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                
                {/* Emoji Select */}
                <select
                  value={newIcon}
                  onChange={(e) => {
                    setNewIcon(e.target.value);
                    setCustomIconUrl('');
                  }}
                  style={{
                    padding: '10px',
                    background: '#2c3e50',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '18px',
                    cursor: 'pointer'
                  }}
                >
                  {commonEmojis.map(emoji => (
                    <option key={emoji} value={emoji}>{emoji}</option>
                  ))}
                </select>
                
                {/* Show uploaded image preview or clear button */}
                {customIconUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img 
                      src={customIconUrl} 
                      alt="icon" 
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        objectFit: 'contain',
                        borderRadius: '4px',
                        background: 'white'
                      }} 
                    />
                    <button
                      onClick={() => setCustomIconUrl('')}
                      style={{
                        background: '#e74c3c',
                        border: 'none',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px'
                      }}
                      title="Remove uploaded icon"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <div style={{ fontSize: '9px', color: '#7f8c8d', marginTop: '4px' }}>
                💡 PNG/SVG with transparent background recommended
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', marginBottom: '5px' }}>
              DESCRIPTION
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Short description..."
              style={{
                width: '100%',
                padding: '10px',
                background: '#2c3e50',
                color: 'white',
                border: '1px solid #4a5f7f',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          
          {/* Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <span style={{ color: '#7f8c8d', fontSize: '12px' }}>Preview:</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: '#2c3e50',
              borderRadius: '6px'
            }}>
              {customIconUrl ? (
                <img src={customIconUrl} alt="icon" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '24px' }}>{newIcon}</span>
              )}
              <span style={{ color: 'white', fontWeight: 'bold' }}>{newName || 'Type Name'}</span>
            </div>
          </div>
          
          <button
            onClick={handleAdd}
            disabled={isAdding || !newName.trim()}
            style={{
              width: '100%',
              padding: '12px',
              background: isAdding ? '#7f8c8d' : '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isAdding ? 'wait' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isAdding ? 'Adding...' : '➕ Add Hardware Type'}
          </button>
        </div>

        {/* Existing Types List */}
        <div>
          <h3 style={{ color: '#bdc3c7', marginBottom: '15px', fontSize: '14px' }}>
            📋 Existing Types ({hardwareTypes.length})
          </h3>
          
          <div style={{ display: 'grid', gap: '8px' }}>
            {hardwareTypes.map((type) => (
              <div
                key={type.id || type.name}
                style={{
                  padding: '12px 15px',
                  background: editingId === type.dbId ? '#2c3e50' : '#34495e',
                  borderRadius: '6px',
                  border: editingId === type.dbId ? '2px solid #3498db' : '2px solid transparent'
                }}
              >
                {editingId === type.dbId ? (
                  /* Edit Mode */
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <label style={{ display: 'block', color: '#bdc3c7', fontSize: '10px', marginBottom: '4px' }}>NAME</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            background: '#34495e',
                            color: 'white',
                            border: '1px solid #4a5f7f',
                            borderRadius: '4px',
                            fontSize: '13px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#bdc3c7', fontSize: '10px', marginBottom: '4px' }}>ICON</label>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* Upload Button */}
                          <label style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            background: '#795548',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}>
                            📁
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file && file.type.startsWith('image/')) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    setEditCustomIconUrl(event.target.result);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <select
                            value={editIcon}
                            onChange={(e) => {
                              setEditIcon(e.target.value);
                              setEditCustomIconUrl('');
                            }}
                            style={{
                              padding: '8px',
                              background: '#34495e',
                              color: 'white',
                              border: '1px solid #4a5f7f',
                              borderRadius: '4px',
                              fontSize: '16px'
                            }}
                          >
                            {commonEmojis.map(emoji => (
                              <option key={emoji} value={emoji}>{emoji}</option>
                            ))}
                          </select>
                          {editCustomIconUrl && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <img 
                                src={editCustomIconUrl} 
                                alt="icon" 
                                style={{ 
                                  width: '24px', 
                                  height: '24px', 
                                  objectFit: 'contain',
                                  borderRadius: '3px',
                                  background: 'white'
                                }} 
                              />
                              <button
                                onClick={() => setEditCustomIconUrl('')}
                                style={{
                                  background: '#e74c3c',
                                  border: 'none',
                                  color: 'white',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontSize: '9px'
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', color: '#bdc3c7', fontSize: '10px', marginBottom: '4px' }}>DESCRIPTION</label>
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: '#34495e',
                          color: 'white',
                          border: '1px solid #4a5f7f',
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={cancelEdit}
                        style={{
                          padding: '6px 12px',
                          background: '#7f8c8d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdate}
                        disabled={isUpdating}
                        style={{
                          padding: '6px 12px',
                          background: isUpdating ? '#7f8c8d' : '#27ae60',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: isUpdating ? 'wait' : 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        {isUpdating ? 'Saving...' : '✓ Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {type.icon?.startsWith('http') || type.icon?.startsWith('data:') ? (
                        <img src={type.icon} alt={type.name} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '24px' }}>{type.icon || '📦'}</span>
                      )}
                      <div>
                        <div style={{ color: 'white', fontWeight: 'bold' }}>{type.name}</div>
                        {type.description && (
                          <div style={{ color: '#7f8c8d', fontSize: '11px' }}>{type.description}</div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => type.dbId ? startEdit(type) : alert('Default types cannot be edited. Add a new type to customize.')}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${type.dbId ? '#3498db' : '#7f8c8d'}`,
                          color: type.dbId ? '#3498db' : '#7f8c8d',
                          padding: '5px 10px',
                          borderRadius: '4px',
                          cursor: type.dbId ? 'pointer' : 'not-allowed',
                          fontSize: '11px',
                          opacity: type.dbId ? 1 : 0.5
                        }}
                        title={type.dbId ? "Edit this type" : "Default type - cannot edit"}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => type.dbId ? onDeleteType(type.dbId) : alert('Default types cannot be deleted.')}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${type.dbId ? '#e74c3c' : '#7f8c8d'}`,
                          color: type.dbId ? '#e74c3c' : '#7f8c8d',
                          padding: '5px 10px',
                          borderRadius: '4px',
                          cursor: type.dbId ? 'pointer' : 'not-allowed',
                          fontSize: '11px',
                          opacity: type.dbId ? 1 : 0.5
                        }}
                        title={type.dbId ? "Delete this type" : "Default type - cannot delete"}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 30px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Change Password Modal
function ChangePasswordModal({ onClose, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await auth.changePassword(currentPassword, newPassword);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000
    }}>
      <div style={{
        background: '#2c3e50',
        padding: '30px',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{ color: 'white', margin: '0 0 20px 0', fontSize: '20px' }}>
          🔐 Change Password
        </h2>

        {error && (
          <div style={{
            background: '#e74c3c',
            color: 'white',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '15px',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', color: '#bdc3c7', marginBottom: '6px', fontSize: '12px' }}>
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                background: '#34495e',
                border: '1px solid #4a5f7f',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', color: '#bdc3c7', marginBottom: '6px', fontSize: '12px' }}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '10px',
                background: '#34495e',
                border: '1px solid #4a5f7f',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#bdc3c7', marginBottom: '6px', fontSize: '12px' }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                background: '#34495e',
                border: '1px solid #4a5f7f',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                background: '#7f8c8d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                background: loading ? '#7f8c8d' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {loading ? '...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// State declarations //
export default function App() {
  // Suppress ResizeObserver loop error (common with React Flow, harmless)
  useEffect(() => {
    const resizeObserverErr = (e) => {
      if (e.message === 'ResizeObserver loop completed with undelivered notifications.' ||
          e.message === 'ResizeObserver loop limit exceeded') {
        e.stopImmediatePropagation();
        return;
      }
    };
    window.addEventListener('error', resizeObserverErr);
    return () => window.removeEventListener('error', resizeObserverErr);
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [nodeId, setNodeId] = useState(11);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [floatingPanelPosition, setFloatingPanelPosition] = useState({ x: 0, y: 0 });
  const [edgePanelPosition, setEdgePanelPosition] = useState({ x: 0, y: 0 });
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [showRelationshipLabels, setShowRelationshipLabels] = useState(true);
  const [viewMode, setViewMode] = useState('plm');
  const [whiteboards, setWhiteboards] = useState([
    { id: 'plm', name: 'Project', type: 'plm' }
  ]);
  const [activeWhiteboardId, setActiveWhiteboardId] = useState('plm');
  const [whiteboardNodes, setWhiteboardNodes] = useState({});  // { wb1: [...nodes], wb2: [...nodes] }
  const [whiteboardEdges, setWhiteboardEdges] = useState({});  // { wb1: [...edges], wb2: [...edges] }
  const [showWhiteboardDropdown, setShowWhiteboardDropdown] = useState(false);
  
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedo, setIsUndoRedo] = useState(false);
  
  // Clipboard for copy/paste
  const [clipboard, setClipboard] = useState({ nodes: [], edges: [] });

  // Issue Management State
  const [issues, setIssues] = useState({});  // { nodeId: [issue1, issue2, ...] }
  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const [issueNodeId, setIssueNodeId] = useState(null);  // Which node's issues to show
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issueIdCounter, setIssueIdCounter] = useState(1);
  const [showCreateIssueModal, setShowCreateIssueModal] = useState(false);
  const [createIssueNodeId, setCreateIssueNodeId] = useState(null);
  const [showIssueManagerModal, setShowIssueManagerModal] = useState(false);

  // Component Library State
  const [showLibraryPanel, setShowLibraryPanel] = useState(false);
  const [libraryItems, setLibraryItems] = useState([]);

  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [reqTypeFilter, setReqTypeFilter] = useState('all');
  const [classificationFilter, setClassificationFilter] = useState('all');

  const [objectName, setObjectName] = useState('MPV Propulsion System');
  const [objectVersion, setObjectVersion] = useState('1.0');
  const [objectDescription, setObjectDescription] = useState('Multi-Purpose Vessel propulsion control system');
  const [showNewObjectModal, setShowNewObjectModal] = useState(false);

  const [cusIdCounter, setCusIdCounter] = useState(2);  // CUS-001 exists
  const [pltIdCounter, setPltIdCounter] = useState(1);  // None yet
  const [prjIdCounter, setPrjIdCounter] = useState(3);  // PRJ-001, PRJ-002 exist
  const [impIdCounter, setImpIdCounter] = useState(2);  // IMP-001 exists
  const [sysIdCounter, setSysIdCounter] = useState(2);  // SYS-001 exists
  const [subIdCounter, setSubIdCounter] = useState(3);  // SUB-001, SUB-002 exist
  const [funIdCounter, setFunIdCounter] = useState(4);  // FUN-001, FUN-002, FUN-003 exist
  const [tcIdCounter, setTcIdCounter] = useState(1);
  const [parIdCounter, setParIdCounter] = useState(1);  // Parameter counter
  const [hwIdCounter, setHwIdCounter] = useState(1);    // Hardware counter
  const [ucIdCounter, setUcIdCounter] = useState(1);    // Use Case counter
  const [actIdCounter, setActIdCounter] = useState(1);  // Actor counter
  
  // Hardware types - loaded from database
  const [hardwareTypes, setHardwareTypes] = useState([]);
  const [showHardwareTypesModal, setShowHardwareTypesModal] = useState(false);
  
  // Default hardware types (fallback if DB empty)
  const defaultHardwareTypes = [
    { id: 'motor', name: 'Motor', icon: '⚙️' },
    { id: 'inverter', name: 'Inverter', icon: '🔄' },
    { id: 'battery', name: 'Battery', icon: '🔋' },
    { id: 'sensor', name: 'Sensor', icon: '📡' },
    { id: 'controller', name: 'Controller', icon: '🎛️' },
    { id: 'pump', name: 'Pump', icon: '💧' },
    { id: 'fan', name: 'Fan', icon: '🌀' },
    { id: 'transformer', name: 'Transformer', icon: '⚡' },
    { id: 'relay', name: 'Relay', icon: '🔌' },
    { id: 'display', name: 'Display', icon: '🖥️' },
    { id: 'valve', name: 'Valve', icon: '🚰' },
    { id: 'heater', name: 'Heater', icon: '🔥' },
    { id: 'cooler', name: 'Cooler', icon: '❄️' },
    { id: 'generic', name: 'Generic', icon: '📦' },
  ];
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [showSplash, setShowSplash] = useState(true);

  const edgeUpdateSuccessful = useRef(true);
  const [showEdgePanel, setShowEdgePanel] = useState(false);

  // Auth state
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentProject, setCurrentProject] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);


   // Handle login
  const handleLogin = (userData) => {
    setUser(userData);
    realtime.connect();
    fetchHardwareTypes();  // Load hardware types from database
  };

  // Fetch hardware types from database
  const fetchHardwareTypes = async () => {
    console.log('🔧 Fetching hardware types from database...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/hardware-types`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('plm_token')}`
        }
      });
      console.log('🔧 Hardware types response status:', response.status);
      if (response.ok) {
        const types = await response.json();
        console.log('🔧 Hardware types from DB:', types);
        if (types.length > 0) {
          // Map database format to our format
          const mappedTypes = types.map(t => ({
            id: t.name.toLowerCase().replace(/\s+/g, '-'),
            dbId: t.id,  // UUID from database
            name: t.name,
            icon: t.icon,
            description: t.description
          }));
          console.log('🔧 Mapped hardware types:', mappedTypes);
          setHardwareTypes(mappedTypes);
        } else {
          console.log('🔧 Database empty, using defaults');
          setHardwareTypes(defaultHardwareTypes);
        }
      } else {
        console.error('🔧 Failed to fetch hardware types, status:', response.status);
        setHardwareTypes(defaultHardwareTypes);
      }
    } catch (error) {
      console.error('🔧 Error fetching hardware types:', error);
      setHardwareTypes(defaultHardwareTypes);
    }
  };

  // Add new hardware type to database
  const addHardwareType = async (typeData) => {
    console.log('🔧 API: Adding hardware type', {
      name: typeData.name,
      iconLength: typeData.icon?.length,
      isBase64: typeData.icon?.startsWith('data:')
    });
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/hardware-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('plm_token')}`
        },
        body: JSON.stringify(typeData)
      });
      
      console.log('🔧 API: Response status', response.status);
      
      if (response.ok) {
        const newType = await response.json();
        console.log('🔧 API: Saved type', {
          id: newType.id,
          name: newType.name,
          iconLength: newType.icon?.length,
          iconPreview: newType.icon?.substring(0, 30)
        });
        // Add to local state
        setHardwareTypes(prev => [...prev, {
          id: newType.name.toLowerCase().replace(/\s+/g, '-'),
          dbId: newType.id,
          name: newType.name,
          icon: newType.icon,
          description: newType.description
        }]);
        return newType;
      } else {
        const error = await response.json();
        console.error('🔧 API: Error response', error);
        throw new Error(error.error || 'Failed to add hardware type');
      }
    } catch (error) {
      console.error('Error adding hardware type:', error);
      throw error;
    }
  };

  // Delete hardware type from database
  const deleteHardwareType = async (dbId) => {
    if (!window.confirm('Delete this hardware type?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/hardware-types/${dbId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('plm_token')}`
        }
      });
      
      if (response.ok) {
        // Remove from local state
        setHardwareTypes(prev => prev.filter(t => t.dbId !== dbId));
      } else {
        alert('Failed to delete hardware type');
      }
    } catch (error) {
      console.error('Error deleting hardware type:', error);
      alert('Error deleting hardware type');
    }
  };

  // Update hardware type in database
  const updateHardwareType = async (dbId, typeData) => {
    console.log('🔧 API: Updating hardware type', {
      dbId,
      name: typeData.name,
      iconLength: typeData.icon?.length,
      isBase64: typeData.icon?.startsWith('data:')
    });
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/hardware-types/${dbId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('plm_token')}`
        },
        body: JSON.stringify(typeData)
      });
      
      console.log('🔧 API: Update response status', response.status);
      
      if (response.ok) {
        const updatedType = await response.json();
        console.log('🔧 API: Updated type from server', {
          id: updatedType.id,
          name: updatedType.name,
          iconLength: updatedType.icon?.length,
          iconPreview: updatedType.icon?.substring(0, 30)
        });
        // Update local state
        setHardwareTypes(prev => prev.map(t => 
          t.dbId === dbId 
            ? {
                id: updatedType.name.toLowerCase().replace(/\s+/g, '-'),
                dbId: updatedType.id,
                name: updatedType.name,
                icon: updatedType.icon,
                description: updatedType.description
              }
            : t
        ));
        return updatedType;
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update hardware type');
      }
    } catch (error) {
      console.error('Error updating hardware type:', error);
      throw error;
    }
  };

  // Handle logout
  const handleLogout = () => {
    auth.logout();
    setUser(null);
    setCurrentProjectId(null);
  };

  // Handle project selection
  const handleSelectProject = (projectData) => {
    console.log('Opening project:', projectData);
    
    // Set project info
    setCurrentProject(projectData.project || projectData);
    setObjectName(projectData.project?.name || projectData.name || 'New Project');
    setObjectVersion(projectData.project?.version || projectData.version || '1.0');
    
    // Load nodes and edges if present
    if (projectData.nodes) {
      const loadedNodes = projectData.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          // Preserve reqType - don't override it!
          reqType: node.data.reqType,
          onChange: handleNodeLabelChange
        }
      }));
      setNodes(loadedNodes);
      
      // *** FIX: Update all ID counters based on loaded nodes ***
      const maxId = Math.max(...(projectData.nodes || []).map(n => parseInt(n.id) || 0), 0);
      setNodeId(maxId + 1);
      
      // Calculate max requirement IDs for each type
      let maxCus = 0, maxPlt = 0, maxPrj = 0, maxImp = 0;
      let maxSys = 0, maxSub = 0, maxFun = 0, maxPar = 0, maxHw = 0;
      let maxTc = 0, maxUc = 0, maxAct = 0;
      (projectData.nodes || []).forEach(n => {
        const reqId = n.data?.reqId || '';
        const num = parseInt(reqId.split('-')[1]) || 0;
        if (reqId.startsWith('CUS')) maxCus = Math.max(maxCus, num);
        if (reqId.startsWith('PLT')) maxPlt = Math.max(maxPlt, num);
        if (reqId.startsWith('PRJ')) maxPrj = Math.max(maxPrj, num);
        if (reqId.startsWith('IMP')) maxImp = Math.max(maxImp, num);
        if (reqId.startsWith('SYS')) maxSys = Math.max(maxSys, num);
        if (reqId.startsWith('SUB')) maxSub = Math.max(maxSub, num);
        if (reqId.startsWith('FUN')) maxFun = Math.max(maxFun, num);
        if (reqId.startsWith('PAR')) maxPar = Math.max(maxPar, num);
        if (reqId.startsWith('HW')) maxHw = Math.max(maxHw, num);
        if (reqId.startsWith('TC')) maxTc = Math.max(maxTc, num);
        if (reqId.startsWith('UC')) maxUc = Math.max(maxUc, num);
        if (reqId.startsWith('ACT')) maxAct = Math.max(maxAct, num);
      });
      setCusIdCounter(maxCus + 1);
      setPltIdCounter(maxPlt + 1);
      setPrjIdCounter(maxPrj + 1);
      setImpIdCounter(maxImp + 1);
      setSysIdCounter(maxSys + 1);
      setSubIdCounter(maxSub + 1);
      setFunIdCounter(maxFun + 1);
      setParIdCounter(maxPar + 1);
      setHwIdCounter(maxHw + 1);
      setTcIdCounter(maxTc + 1);
      setUcIdCounter(maxUc + 1);
      setActIdCounter(maxAct + 1);
      
      // Load issues if present
      if (projectData.issues) {
        setIssues(projectData.issues);
        // Calculate max issue ID
        let maxIssueId = 0;
        Object.values(projectData.issues).forEach(nodeIssues => {
          nodeIssues.forEach(issue => {
            const idNum = parseInt(issue.id.replace('ISS-', '')) || 0;
            if (idNum > maxIssueId) maxIssueId = idNum;
          });
        });
        setIssueIdCounter(maxIssueId + 1);
      } else {
        setIssues({});
        setIssueIdCounter(1);
      }
      
      console.log('Updated counters - nodeId:', maxId + 1, 'SYS:', maxSys + 1, 'HW:', maxHw + 1);
      
      // Process edges - validate handles exist on nodes
      if (projectData.edges) {
        const edgesWithArrows = projectData.edges.map(edge => {
          const sourceNode = loadedNodes.find(n => n.id === edge.source);
          const targetNode = loadedNodes.find(n => n.id === edge.target);
          
          // Check if handles exist on the nodes
          const sourcePorts = sourceNode?.data?.ports || [];
          const targetPorts = targetNode?.data?.ports || [];
          
          const validSourceHandle = !edge.sourceHandle || 
            edge.sourceHandle === 'default-source' ||
            sourcePorts.some(p => p.id === edge.sourceHandle);
          const validTargetHandle = !edge.targetHandle || 
            edge.targetHandle === 'default-target' ||
            targetPorts.some(p => p.id === edge.targetHandle);
          
          return {
            ...edge,
            // Convert invalid or null handles to undefined (use default)
            sourceHandle: validSourceHandle ? (edge.sourceHandle === null ? undefined : edge.sourceHandle) : undefined,
            targetHandle: validTargetHandle ? (edge.targetHandle === null ? undefined : edge.targetHandle) : undefined,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: '#95a5a6'
            }
          };
        });
        setEdges(edgesWithArrows);
      } else {
        setEdges([]);
      }
    } else {
      setNodes([]);
      setEdges([]);
      // Reset counters for empty project
      setNodeId(1);
      setCusIdCounter(1);
      setPltIdCounter(1);
      setPrjIdCounter(1);
      setImpIdCounter(1);
      setSysIdCounter(1);
      setSubIdCounter(1);
      setFunIdCounter(1);
      setParIdCounter(1);
      setHwIdCounter(1);
      setTcIdCounter(1);
      setUcIdCounter(1);
      setActIdCounter(1);
    }
    
    // Load whiteboards if present
    if (projectData.whiteboards) {
      setWhiteboards(projectData.whiteboards);
    }
    
    // Clear selection state
    setSelectedNode(null);
    setSelectedEdge(null);
    
    // Connect to real-time
    realtime.connect();
    realtime.joinProject(projectData.project?.id || projectData.id, user);
  };

  // Handle close project (back to project list)
  const handleCloseProject = () => {
    if (currentProject) {
      realtime.leaveProject(currentProject.id);
    }
    setCurrentProject(null);
    setNodes([]);
    setEdges([]);
  };

  // Save project to database
  const saveProjectToDatabase = async () => {
    if (!currentProject) {
      alert('No project open');
      return;
      
    }
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 1000);
    
    try {
      // Prepare nodes - remove non-serializable functions and floating connectors
      const nodesToSave = nodes
        .filter(node => !node.data?.isFloatingConnector) // Remove floating connectors
        .map(node => ({
          ...node,
          data: {
            ...node.data,
            // Remove non-serializable functions
            onChange: undefined,
            onLabelChange: undefined,
          }
        }));
      
      // Remove edges connected to floating connectors
      const connectorIds = nodes
        .filter(n => n.data?.isFloatingConnector)
        .map(n => n.id);
      
      const edgesToSave = edges
        .filter(e => !connectorIds.includes(e.source) && !connectorIds.includes(e.target))
        .map(edge => ({
          ...edge,
          data: {
            ...edge.data,
            // Remove non-serializable functions
            onLabelChange: undefined,
            onEdgeDoubleClick: undefined,
          }
        }));
      
      await projects.save(currentProject.id, {
        name: objectName,
        description: objectDescription,
        version: objectVersion,
        nodes: nodesToSave,
        edges: edgesToSave,
        whiteboards: whiteboards,
        issues: issues,
        issueIdCounter: issueIdCounter
      });
      // Removed alert - bottom notification will show instead
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save project: ' + err.message);
    }
  };

  // Auto-layout function
  const autoLayoutNodes = useCallback(() => {
    if (nodes.length === 0) return;

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    // Layout settings
    dagreGraph.setGraph({ 
      rankdir: 'LR',      // Left to Right layout
      nodesep: 80,        // Horizontal spacing between nodes
      ranksep: 150,       // Vertical spacing between ranks
      marginx: 50,
      marginy: 50
    });

    // Add nodes to dagre
    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { 
        width: node.width || 200, 
        height: node.height || 100 
      });
    });

    // Add edges to dagre
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Run the layout
    dagre.layout(dagreGraph);

    // Update node positions
    const newNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - (node.width || 200) / 2,
          y: nodeWithPosition.y - (node.height || 100) / 2,
        },
      };
    });

    setNodes(newNodes);
    
    // Fit view after layout
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2 });
      }
    }, 50);
  }, [nodes, edges, setNodes, reactFlowInstance]);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    if (isUndoRedo) return; // Don't save during undo/redo operations
    
    const currentState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    };
    
    setHistory(prev => {
      // Remove any future states if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add current state
      newHistory.push(currentState);
      // Keep only last 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [nodes, edges, historyIndex, isUndoRedo]);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex <= 0) return; // Nothing to undo
    
    setIsUndoRedo(true);
    const prevIndex = historyIndex - 1;
    const prevState = history[prevIndex];
    
    if (prevState) {
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(prevIndex);
    }
    
    setTimeout(() => setIsUndoRedo(false), 100);
  }, [history, historyIndex, setNodes, setEdges]);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return; // Nothing to redo
    
    setIsUndoRedo(true);
    const nextIndex = historyIndex + 1;
    const nextState = history[nextIndex];
    
    if (nextState) {
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(nextIndex);
    }
    
    setTimeout(() => setIsUndoRedo(false), 100);
  }, [history, historyIndex, setNodes, setEdges]);

  // Save to history when nodes or edges change
  useEffect(() => {
    if (!isUndoRedo && nodes.length > 0) {
      const timeoutId = setTimeout(() => {
        saveToHistory();
      }, 500); // Debounce to avoid saving every tiny change
      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, isUndoRedo, saveToHistory]);

  // Generate ID based on type
  const generateItemId = useCallback((itemType) => {
    switch (itemType) {
      case 'system':
        const sysId = `SYS-${String(sysIdCounter).padStart(3, '0')}`;
        setSysIdCounter(c => c + 1);
        return sysId;
      case 'subsystem':
        const subId = `SUB-${String(subIdCounter).padStart(3, '0')}`;
        setSubIdCounter(c => c + 1);
        return subId;
      case 'function':
        const funId = `FUN-${String(funIdCounter).padStart(3, '0')}`;
        setFunIdCounter(c => c + 1);
        return funId;
      case 'testcase':
        const tcId = `TC-${String(tcIdCounter).padStart(3, '0')}`;
        setTcIdCounter(c => c + 1);
        return tcId;  
      case 'usecase':
        const ucId = `UC-${String(ucIdCounter).padStart(3, '0')}`;
        setUcIdCounter(c => c + 1);
        return ucId;
      case 'actor':
        const actId = `ACT-${String(actIdCounter).padStart(3, '0')}`;
        setActIdCounter(c => c + 1);
        return actId;
      case 'customer':
        const cusId = `CUS-${String(cusIdCounter).padStart(3, '0')}`;
        setCusIdCounter(c => c + 1);
        return cusId;
      case 'platform':
        const pltId = `PLT-${String(pltIdCounter).padStart(3, '0')}`;
        setPltIdCounter(c => c + 1);
        return pltId;
      case 'implementation':
        const impId = `IMP-${String(impIdCounter).padStart(3, '0')}`;
        setImpIdCounter(c => c + 1);
        return impId;
      case 'parameter':
        const parId = `PAR-${String(parIdCounter).padStart(3, '0')}`;
        setParIdCounter(c => c + 1);
        return parId;
      case 'hardware':
        const hwId = `HW-${String(hwIdCounter).padStart(3, '0')}`;
        setHwIdCounter(c => c + 1);
        return hwId;
      default: // project
        const prjId = `PRJ-${String(prjIdCounter).padStart(3, '0')}`;
        setPrjIdCounter(c => c + 1);
        return prjId;
    }
  }, [sysIdCounter, subIdCounter, funIdCounter, tcIdCounter, ucIdCounter, actIdCounter, cusIdCounter, pltIdCounter, prjIdCounter, impIdCounter, parIdCounter, hwIdCounter]);

  const stats = useMemo(() => {
    const floatingConnectors = nodes.filter(n => n.data?.isFloatingConnector).length;  // ADD THIS
    const total = nodes.length - floatingConnectors;  // Don't count connectors as items
    const stateOpen = nodes.filter(n => !n.data?.isFloatingConnector && (n.data.state === 'open' || !n.data.state)).length;
    const stateFrozen = nodes.filter(n => !n.data?.isFloatingConnector && n.data.state === 'frozen').length;
    const stateReleased = nodes.filter(n => !n.data?.isFloatingConnector && n.data.state === 'released').length;
    const connections = edges.length;
    
    const relationshipCounts = {};
    edges.forEach(e => {
      const type = e.data?.relationType || 'related';
      relationshipCounts[type] = (relationshipCounts[type] || 0) + 1;
    });
    
    return { total, stateOpen, stateFrozen, stateReleased, connections, relationshipCounts, floatingConnectors };  // ADD floatingConnectors
  }, [nodes, edges]);

  // Edge update handlers - allow moving connections
  const onEdgeUpdateStart = useCallback(() => {
    console.log('🔵 Edge drag STARTED');
    edgeUpdateSuccessful.current = false;  // Use .current for refs
  }, []);

  const onEdgeUpdate = useCallback((oldEdge, newConnection) => {
    edgeUpdateSuccessful.current = true;
    
    // Check if we're reconnecting FROM a floating connector
    const oldTargetNode = nodes.find(n => n.id === oldEdge.target);
    const oldSourceNode = nodes.find(n => n.id === oldEdge.source);
    
    // Remove floating connector if edge was connected to one
    if (oldTargetNode?.data?.isFloatingConnector) {
      setNodes((nds) => nds.filter(n => n.id !== oldEdge.target));
    }
    if (oldSourceNode?.data?.isFloatingConnector) {
      setNodes((nds) => nds.filter(n => n.id !== oldEdge.source));
    }
    
    // Get port info for the new connection
    const sourceNode = nodes.find(n => n.id === newConnection.source);
    const targetNode = nodes.find(n => n.id === newConnection.target);
    const sourcePort = sourceNode?.data?.ports?.find(p => p.id === newConnection.sourceHandle);
    const targetPort = targetNode?.data?.ports?.find(p => p.id === newConnection.targetHandle);
    
    // Update signal name
    let signalName = '';
    if (sourcePort && targetPort) {
      const sourceName = sourcePort.name.replace(/\[\d+:\d+\]/, '').trim();
      const targetName = targetPort.name.replace(/\[\d+:\d+\]/, '').trim();
      if (sourceName.toLowerCase() === targetName.toLowerCase()) {
        signalName = sourceName;
      } else {
        signalName = `${sourceName} → ${targetName}`;
      }
    } else if (sourcePort) {
      signalName = sourcePort.name.replace(/\[\d+:\d+\]/, '').trim();
    } else if (targetPort) {
      signalName = targetPort.name.replace(/\[\d+:\d+\]/, '').trim();
    }
    
    setEdges((els) => updateEdge(oldEdge, {
      ...newConnection,
      data: {
        ...oldEdge.data,
        sourcePortId: newConnection.sourceHandle || null,
        targetPortId: newConnection.targetHandle || null,
        sourcePortName: sourcePort?.name || null,
        targetPortName: targetPort?.name || null,
        signalName: signalName,
      }
    }, els));
  }, [nodes, setEdges, setNodes]);

  const onEdgeUpdateEnd = useCallback((event, edge) => {
    if (!edgeUpdateSuccessful.current) {
      // Only create floating connector if this is a real user drag event
      // Check if event has valid coordinates (not triggered by loading)
      if (!event || !event.clientX || !event.clientY || !reactFlowInstance) {
        // Just delete the edge if we can't create a floating connector
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        edgeUpdateSuccessful.current = true;
        return;
      }
      
      // Get drop position using reactFlowInstance directly
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      if (!position) {
        // Fallback: just delete the edge if we can't get position
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        edgeUpdateSuccessful.current = true;
        return;
      }
      
      // Create a floating connector node
      const connectorId = `connector-${Date.now()}`;
      const newConnectorNode = {
        id: connectorId,
        type: 'custom',
        position: position,
        data: {
          label: '⚡',
          itemType: 'connector',
          type: 'connector',
          isFloatingConnector: true,
        }
      };
      
      // Add the connector node
      setNodes((nds) => [...nds, newConnectorNode]);
      
      // Update the edge to point to the connector
      setEdges((eds) => eds.map((e) => {
        if (e.id === edge.id) {
          return {
            ...e,
            target: connectorId,
            targetHandle: null,
          };
        }
        return e;
      }));
    }
    
    edgeUpdateSuccessful.current = true;
  }, [setEdges, setNodes, reactFlowInstance]);

  const onNodeDragStop = useCallback((event, node) => {
    // Only handle floating connectors
    if (!node.data?.isFloatingConnector) return;
    
    // Get the connector's position
    const connectorPos = node.position;
    
    // Find nearby nodes (excluding connectors)
    const nearbyThreshold = 50; // pixels
    
    for (const otherNode of nodes) {
      if (otherNode.id === node.id) continue;
      if (otherNode.data?.isFloatingConnector) continue;
      
      // Check if connector is dropped near this node
      const nodeWidth = 200; // approximate
      const nodeHeight = 100; // approximate
      
      const isNearNode = 
        connectorPos.x >= otherNode.position.x - nearbyThreshold &&
        connectorPos.x <= otherNode.position.x + nodeWidth + nearbyThreshold &&
        connectorPos.y >= otherNode.position.y - nearbyThreshold &&
        connectorPos.y <= otherNode.position.y + nodeHeight + nearbyThreshold;
      
      if (isNearNode) {
        // Find the edge connected to this connector
        const connectedEdge = edges.find(e => 
          e.target === node.id || e.source === node.id
        );
        
        if (connectedEdge) {
          // Determine which port to connect to (find nearest)
          const ports = otherNode.data?.ports || [];
          let targetHandle = null;
          
          // If node has ports, find the nearest input port
          if (ports.length > 0) {
            const inputPorts = ports.filter(p => p.direction === 'input' || p.type === 'input');
            if (inputPorts.length > 0) {
              targetHandle = inputPorts[0].id;
            }
          }
          
          // Update the edge to connect to the real node
          setEdges((eds) => eds.map((e) => {
            if (e.id === connectedEdge.id) {
              if (e.target === node.id) {
                // Connector was the target, update target
                return {
                  ...e,
                  target: otherNode.id,
                  targetHandle: targetHandle,
                };
              } else {
                // Connector was the source, update source
                const outputPorts = ports.filter(p => p.direction === 'output' || p.type === 'output');
                const sourceHandle = outputPorts.length > 0 ? outputPorts[0].id : null;
                return {
                  ...e,
                  source: otherNode.id,
                  sourceHandle: sourceHandle,
                };
              }
            }
            return e;
          }));
          
          // Remove the connector node
          setNodes((nds) => nds.filter((n) => n.id !== node.id));
          
          return; // Done!
        }
      }
    }
  }, [nodes, edges, setNodes, setEdges]);

  const onConnect = useCallback((params) => {
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
    const relationType = inferRelationshipType(sourceNode, targetNode);
    
    // Get port info if connecting to specific handles
    const sourcePort = sourceNode?.data?.ports?.find(p => p.id === params.sourceHandle);
    const targetPort = targetNode?.data?.ports?.find(p => p.id === params.targetHandle);
    
    // Smart signal name generation
    let signalName = '';
    if (sourcePort && targetPort) {
      // Both ports exist
      const sourceName = sourcePort.name.replace(/\[\d+:\d+\]/, '').trim();
      const targetName = targetPort.name.replace(/\[\d+:\d+\]/, '').trim();
      
      if (sourceName.toLowerCase() === targetName.toLowerCase()) {
        // Same name - just use it
        signalName = sourceName;
      } else {
        // Different names - show connection
        signalName = `${sourceName} → ${targetName}`;
      }
    } else if (sourcePort) {
      signalName = sourcePort.name.replace(/\[\d+:\d+\]/, '').trim();
    } else if (targetPort) {
      signalName = targetPort.name.replace(/\[\d+:\d+\]/, '').trim();
    }
    
    // Use larger bus width if different
    const busWidth = Math.max(sourcePort?.width || 0, targetPort?.width || 0) || null;
    
    const newEdge = {
      ...params,
      sourceHandle: params.sourceHandle || null,
      targetHandle: params.targetHandle || null,
      type: 'custom',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#95a5a6'
      },
      data: { 
        relationType, 
        notes: '',
        customLabel: signalName,
        sourcePortId: params.sourceHandle || null,
        targetPortId: params.targetHandle || null,
        sourcePortName: sourcePort?.name || null,
        targetPortName: targetPort?.name || null,
        signalName: signalName,
        signalType: sourcePort?.type || targetPort?.type || null,
        busWidth: busWidth,
      },
    };
    
    setEdges((eds) => addEdge(newEdge, eds));
  }, [nodes, setEdges]);

  const handleNodeLabelChange = useCallback((nodeId, field, value) => {
  // Support both old format (nodeId, labelValue) and new format (nodeId, field, value)
  if (value === undefined) {
    // Old format: handleNodeLabelChange(id, 'new label')
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label: field } }
          : node
      )
    );
  } else {
    // New format: handleNodeLabelChange(id, 'width', 200)
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, [field]: value } }
          : node
      )
    );
  }
}, [setNodes]);

  // Copy selected nodes to clipboard
  const copySelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) {
      console.log('No nodes selected to copy');
      return;
    }
    
    // Get IDs of selected nodes
    const selectedNodeIds = selectedNodes.map(n => n.id);
    
    // Find edges between selected nodes
    const relatedEdges = edges.filter(e => 
      selectedNodeIds.includes(e.source) && selectedNodeIds.includes(e.target)
    );
    
    // Store in clipboard with deep copy
    setClipboard({
      nodes: JSON.parse(JSON.stringify(selectedNodes)),
      edges: JSON.parse(JSON.stringify(relatedEdges))
    });
    
    console.log(`Copied ${selectedNodes.length} nodes and ${relatedEdges.length} edges`);
  }, [nodes, edges]);

  // Paste nodes from clipboard
  const pasteNodes = useCallback(() => {
    if (clipboard.nodes.length === 0) {
      console.log('Clipboard is empty');
      return;
    }
    
    // Create ID mapping for new nodes
    const idMapping = {};
    const offset = { x: 50, y: 50 }; // Offset pasted nodes
    
    // Create new nodes with new IDs
    const newNodes = clipboard.nodes.map(node => {
      const newId = String(nodeId + Object.keys(idMapping).length);
      idMapping[node.id] = newId;
      
      // Generate new reqId based on type
      let newReqId = node.data.reqId;
      const itemType = node.data.itemType || node.data.type;
      if (itemType === 'system') {
        newReqId = `SYS-${String(sysIdCounter).padStart(3, '0')}`;
      } else if (itemType === 'subsystem') {
        newReqId = `SUB-${String(subIdCounter).padStart(3, '0')}`;
      } else if (itemType === 'function') {
        newReqId = `FUN-${String(funIdCounter).padStart(3, '0')}`;
      } else if (itemType === 'hardware') {
        newReqId = `HW-${String(hwIdCounter).padStart(3, '0')}`;
      } else if (itemType === 'parameter') {
        newReqId = `PAR-${String(parIdCounter).padStart(3, '0')}`;
      } else if (itemType === 'testcase') {
        newReqId = `TC-${String(tcIdCounter).padStart(3, '0')}`;
      } else if (itemType === 'requirement') {
        const reqType = node.data.reqType || 'project';
        if (reqType === 'customer') {
          newReqId = `CUS-${String(cusIdCounter).padStart(3, '0')}`;
        } else if (reqType === 'platform') {
          newReqId = `PLT-${String(pltIdCounter).padStart(3, '0')}`;
        } else if (reqType === 'implementation') {
          newReqId = `IMP-${String(impIdCounter).padStart(3, '0')}`;
        } else {
          newReqId = `PRJ-${String(prjIdCounter).padStart(3, '0')}`;
        }
      }
      
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offset.x,
          y: node.position.y + offset.y
        },
        selected: true, // Select pasted nodes
        data: {
          ...node.data,
          reqId: newReqId,
          label: `${node.data.label} (copy)`,
          onChange: handleNodeLabelChange
        }
      };
    });
    
    // Create new edges with updated IDs
    const newEdges = clipboard.edges.map(edge => ({
      ...edge,
      id: `e${idMapping[edge.source]}-${idMapping[edge.target]}-${Date.now()}`,
      source: idMapping[edge.source],
      target: idMapping[edge.target]
    }));
    
    // Update counters
    const nodeCount = newNodes.length;
    setNodeId(prev => prev + nodeCount);
    
    // Count by type and update counters
    newNodes.forEach(node => {
      const itemType = node.data.itemType || node.data.type;
      if (itemType === 'system') setSysIdCounter(c => c + 1);
      else if (itemType === 'subsystem') setSubIdCounter(c => c + 1);
      else if (itemType === 'function') setFunIdCounter(c => c + 1);
      else if (itemType === 'hardware') setHwIdCounter(c => c + 1);
      else if (itemType === 'parameter') setParIdCounter(c => c + 1);
      else if (itemType === 'testcase') setTcIdCounter(c => c + 1);
      else if (itemType === 'requirement') {
        const reqType = node.data.reqType || 'project';
        if (reqType === 'customer') setCusIdCounter(c => c + 1);
        else if (reqType === 'platform') setPltIdCounter(c => c + 1);
        else if (reqType === 'implementation') setImpIdCounter(c => c + 1);
        else setPrjIdCounter(c => c + 1);
      }
    });
    
    // Deselect existing nodes, add new nodes
    setNodes(nds => [
      ...nds.map(n => ({ ...n, selected: false })),
      ...newNodes
    ]);
    
    // Add new edges
    if (newEdges.length > 0) {
      setEdges(eds => [...eds, ...newEdges]);
    }
    
    console.log(`Pasted ${newNodes.length} nodes and ${newEdges.length} edges`);
  }, [clipboard, nodeId, handleNodeLabelChange, setNodes, setEdges,
      sysIdCounter, subIdCounter, funIdCounter, hwIdCounter, parIdCounter, tcIdCounter,
      cusIdCounter, pltIdCounter, prjIdCounter, impIdCounter]);

  // Delete selected nodes
  const deleteSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    const selectedNodeIds = selectedNodes.map(n => n.id);
    
    if (selectedNodeIds.length === 0) return;
    
    // Don't delete locked nodes
    const lockedNodes = selectedNodes.filter(n => n.data?.locked);
    if (lockedNodes.length > 0) {
      alert(`Cannot delete ${lockedNodes.length} locked node(s). Unlock them first.`);
      return;
    }
    
    // Remove selected nodes
    setNodes(nds => nds.filter(n => !n.selected));
    
    // Remove edges connected to deleted nodes
    setEdges(eds => eds.filter(e => 
      !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target)
    ));
    
    setSelectedNode(null);
    console.log(`Deleted ${selectedNodeIds.length} nodes`);
  }, [nodes, setNodes, setEdges, setSelectedNode]);

  // Duplicate selected nodes in place (Ctrl+D)
  const duplicateSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return;
    
    const idMapping = {};
    const offset = { x: 30, y: 30 };
    
    const newNodes = selectedNodes.map(node => {
      const newId = String(nodeId + Object.keys(idMapping).length);
      idMapping[node.id] = newId;
      
      // Generate new reqId
      let newReqId = node.data.reqId;
      const itemType = node.data.itemType || node.data.type;
      if (itemType === 'system') newReqId = `SYS-${String(sysIdCounter + Object.keys(idMapping).length - 1).padStart(3, '0')}`;
      else if (itemType === 'subsystem') newReqId = `SUB-${String(subIdCounter + Object.keys(idMapping).length - 1).padStart(3, '0')}`;
      else if (itemType === 'function') newReqId = `FUN-${String(funIdCounter + Object.keys(idMapping).length - 1).padStart(3, '0')}`;
      else if (itemType === 'hardware') newReqId = `HW-${String(hwIdCounter + Object.keys(idMapping).length - 1).padStart(3, '0')}`;
      else if (itemType === 'parameter') newReqId = `PAR-${String(parIdCounter + Object.keys(idMapping).length - 1).padStart(3, '0')}`;
      else if (itemType === 'testcase') newReqId = `TC-${String(tcIdCounter + Object.keys(idMapping).length - 1).padStart(3, '0')}`;
      else if (itemType === 'usecase') newReqId = `UC-${String(ucIdCounter + Object.keys(idMapping).length - 1).padStart(3, '0')}`;
      else if (itemType === 'actor') newReqId = `ACT-${String(actIdCounter + Object.keys(idMapping).length - 1).padStart(3, '0')}`;
      
      return {
        ...node,
        id: newId,
        position: { x: node.position.x + offset.x, y: node.position.y + offset.y },
        selected: true,
        data: {
          ...node.data,
          reqId: newReqId,
          locked: false, // Don't copy lock state
          onChange: handleNodeLabelChange
        }
      };
    });
    
    // Duplicate edges between selected nodes
    const selectedIds = selectedNodes.map(n => n.id);
    const relatedEdges = edges.filter(e => 
      selectedIds.includes(e.source) && selectedIds.includes(e.target)
    );
    const newEdges = relatedEdges.map(edge => ({
      ...edge,
      id: `e${idMapping[edge.source]}-${idMapping[edge.target]}-${Date.now()}`,
      source: idMapping[edge.source],
      target: idMapping[edge.target]
    }));
    
    // Update counters
    setNodeId(prev => prev + newNodes.length);
    newNodes.forEach(node => {
      const itemType = node.data.itemType || node.data.type;
      if (itemType === 'system') setSysIdCounter(c => c + 1);
      else if (itemType === 'subsystem') setSubIdCounter(c => c + 1);
      else if (itemType === 'function') setFunIdCounter(c => c + 1);
      else if (itemType === 'hardware') setHwIdCounter(c => c + 1);
      else if (itemType === 'parameter') setParIdCounter(c => c + 1);
      else if (itemType === 'testcase') setTcIdCounter(c => c + 1);
      else if (itemType === 'usecase') setUcIdCounter(c => c + 1);
      else if (itemType === 'actor') setActIdCounter(c => c + 1);
    });
    
    setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), ...newNodes]);
    if (newEdges.length > 0) setEdges(eds => [...eds, ...newEdges]);
    
    console.log(`Duplicated ${newNodes.length} nodes`);
  }, [nodes, edges, nodeId, handleNodeLabelChange, setNodes, setEdges,
      sysIdCounter, subIdCounter, funIdCounter, hwIdCounter, parIdCounter, tcIdCounter, ucIdCounter, actIdCounter]);

  // Align selected nodes
  const alignSelectedNodes = useCallback((direction) => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length < 2) return;
    
    // Check for locked nodes
    const lockedNodes = selectedNodes.filter(n => n.data?.locked);
    if (lockedNodes.length > 0) {
      alert(`Cannot align - ${lockedNodes.length} node(s) are locked.`);
      return;
    }
    
    const positions = selectedNodes.map(n => n.position);
    
    let targetValue;
    switch (direction) {
      case 'left':
        targetValue = Math.min(...positions.map(p => p.x));
        setNodes(nds => nds.map(n => n.selected ? { ...n, position: { ...n.position, x: targetValue } } : n));
        break;
      case 'right':
        targetValue = Math.max(...positions.map(p => p.x));
        setNodes(nds => nds.map(n => n.selected ? { ...n, position: { ...n.position, x: targetValue } } : n));
        break;
      case 'top':
        targetValue = Math.min(...positions.map(p => p.y));
        setNodes(nds => nds.map(n => n.selected ? { ...n, position: { ...n.position, y: targetValue } } : n));
        break;
      case 'bottom':
        targetValue = Math.max(...positions.map(p => p.y));
        setNodes(nds => nds.map(n => n.selected ? { ...n, position: { ...n.position, y: targetValue } } : n));
        break;
      case 'centerH':
        targetValue = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
        setNodes(nds => nds.map(n => n.selected ? { ...n, position: { ...n.position, x: targetValue } } : n));
        break;
      case 'centerV':
        targetValue = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
        setNodes(nds => nds.map(n => n.selected ? { ...n, position: { ...n.position, y: targetValue } } : n));
        break;
      case 'distributeH':
        const sortedByX = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
        const minX = sortedByX[0].position.x;
        const maxX = sortedByX[sortedByX.length - 1].position.x;
        const stepX = (maxX - minX) / (sortedByX.length - 1);
        const xMapping = {};
        sortedByX.forEach((n, i) => { xMapping[n.id] = minX + i * stepX; });
        setNodes(nds => nds.map(n => n.selected ? { ...n, position: { ...n.position, x: xMapping[n.id] } } : n));
        break;
      case 'distributeV':
        const sortedByY = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
        const minY = sortedByY[0].position.y;
        const maxY = sortedByY[sortedByY.length - 1].position.y;
        const stepY = (maxY - minY) / (sortedByY.length - 1);
        const yMapping = {};
        sortedByY.forEach((n, i) => { yMapping[n.id] = minY + i * stepY; });
        setNodes(nds => nds.map(n => n.selected ? { ...n, position: { ...n.position, y: yMapping[n.id] } } : n));
        break;
      default:
        break;
    }
  }, [nodes, setNodes]);

  // Toggle lock on selected nodes
  const toggleLockSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return;
    
    // If any are unlocked, lock all. If all locked, unlock all.
    const anyUnlocked = selectedNodes.some(n => !n.data?.locked);
    
    setNodes(nds => nds.map(n => {
      if (n.selected) {
        return {
          ...n,
          draggable: anyUnlocked ? false : true,
          data: { ...n.data, locked: anyUnlocked }
        };
      }
      return n;
    }));
    
    console.log(anyUnlocked ? 'Locked selected nodes' : 'Unlocked selected nodes');
  }, [nodes, setNodes]);

  // Export selected nodes to file
  const exportSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return;
    
    const selectedIds = selectedNodes.map(n => n.id);
    const relatedEdges = edges.filter(e => 
      selectedIds.includes(e.source) && selectedIds.includes(e.target)
    );
    
    const exportData = {
      name: `Selection_${new Date().toISOString().slice(0, 10)}`,
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes: selectedNodes.map(n => ({
        ...n,
        data: { ...n.data, onChange: undefined }
      })),
      edges: relatedEdges
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plm_selection_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`Exported ${selectedNodes.length} nodes and ${relatedEdges.length} edges`);
  }, [nodes, edges]);

  // Group selected nodes into a container
  const groupSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length < 2) {
      alert('Select at least 2 nodes to group');
      return;
    }
    
    // Check for locked nodes
    const lockedNodes = selectedNodes.filter(n => n.data?.locked);
    if (lockedNodes.length > 0) {
      alert(`Cannot group - ${lockedNodes.length} node(s) are locked.`);
      return;
    }
    
    // Calculate bounding box
    const padding = 40;
    const positions = selectedNodes.map(n => n.position);
    const minX = Math.min(...positions.map(p => p.x)) - padding;
    const minY = Math.min(...positions.map(p => p.y)) - padding;
    const maxX = Math.max(...positions.map(p => p.x)) + 200 + padding;
    const maxY = Math.max(...positions.map(p => p.y)) + 100 + padding;
    
    const groupName = prompt('Enter group name:', 'Group');
    if (!groupName) return;
    
    const groupId = String(nodeId);
    
    // Create group node
    const groupNode = {
      id: groupId,
      type: 'custom',
      position: { x: minX, y: minY },
      style: { zIndex: -1 },
      data: {
        label: groupName,
        type: 'group',
        itemType: 'group',
        reqId: `GRP-${String(nodeId).padStart(3, '0')}`,
        version: '1.0',
        isGroup: true,
        groupWidth: maxX - minX,
        groupHeight: maxY - minY,
        groupColor: '#3498db',
        childIds: selectedNodes.map(n => n.id),
        description: `Group containing ${selectedNodes.length} items`,
        onChange: handleNodeLabelChange
      }
    };
    
    setNodes(nds => [groupNode, ...nds.map(n => ({ ...n, selected: false }))]);
    setNodeId(prev => prev + 1);
    
    console.log(`Created group with ${selectedNodes.length} nodes`);
  }, [nodes, nodeId, handleNodeLabelChange, setNodes]);

  // Ungroup - remove group container
  const ungroupSelectedNodes = useCallback(() => {
    const selectedGroups = nodes.filter(n => n.selected && n.data?.isGroup);
    if (selectedGroups.length === 0) return;
    
    const groupIds = selectedGroups.map(g => g.id);
    setNodes(nds => nds.filter(n => !groupIds.includes(n.id)));
    
    console.log(`Removed ${selectedGroups.length} group(s)`);
  }, [nodes, setNodes]);

  // Keyboard shortcuts for copy/paste/delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
      
      // Ctrl+C or Cmd+C - Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copySelectedNodes();
      }
      
      // Ctrl+V or Cmd+V - Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        pasteNodes();
      }
      
      // Ctrl+X or Cmd+X - Cut
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        copySelectedNodes();
        deleteSelectedNodes();
      }
      
      // Ctrl+A or Cmd+A - Select All
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setNodes(nds => nds.map(n => ({ ...n, selected: true })));
      }
      
      // Ctrl+D or Cmd+D - Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        duplicateSelectedNodes();
      }
      
      // Ctrl+L or Cmd+L - Lock/Unlock
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        toggleLockSelectedNodes();
      }
      
      // Ctrl+G or Cmd+G - Group
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          ungroupSelectedNodes();
        } else {
          groupSelectedNodes();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copySelectedNodes, pasteNodes, deleteSelectedNodes, duplicateSelectedNodes, 
      toggleLockSelectedNodes, groupSelectedNodes, ungroupSelectedNodes, setNodes]);

  const handleNodeClick = (event, node) => {
    // Single click just highlights/selects - doesn't open panel
    setSelectedEdge(null);
  };

  const handleNodeDoubleClick = (event, node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    
    // Position panel to the right of the clicked node
    const nodeElement = event.target.closest('.react-flow__node');
    if (nodeElement) {
      const rect = nodeElement.getBoundingClientRect();
      setFloatingPanelPosition({
        x: rect.right + 20,  // 20px to the right of node
        y: rect.top
      });
    } else {
      setFloatingPanelPosition({
        x: event.clientX + 20,
        y: event.clientY
      });
    }
  };

  // Single click - just select, don't show panel
   const onEdgeClick = useCallback((event, edge) => {
    setSelectedNode(null);
    setShowEdgePanel(false);
    
    // Bring selected edge to top by updating its zIndex
    setEdges((eds) => eds.map((e) => ({
      ...e,
      zIndex: e.id === edge.id ? 1000 : 0,
      selected: e.id === edge.id
    })));
    
    setSelectedEdge(edge);
  }, [setEdges]);

  // Double click - open edge panel
  const onEdgeDoubleClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setShowEdgePanel(true);   // ADD THIS
    
    // Position panel near the click
    setEdgePanelPosition({
      x: Math.min(event.clientX + 20, window.innerWidth - 350),
      y: Math.max(event.clientY - 100, 60)
    });
  }, []);

   const updateNodeData = useCallback((nodeId, field, value) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, [field]: value } };
        }
        return node;
      })
    );
    setSelectedNode((current) => {
      if (current && current.id === nodeId) {
        return { ...current, data: { ...current.data, [field]: value } };
      }
      return current;
    });
  }, [setNodes]);

  const updateEdgeData = (edgeId, field, value) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === edgeId) {
          return { ...edge, data: { ...edge.data, [field]: value } };
        }
        return edge;
      })
    );
    
    // Also update selectedEdge so the panel reflects the change
    if (selectedEdge && selectedEdge.id === edgeId) {
      setSelectedEdge({
        ...selectedEdge,
        data: { ...selectedEdge.data, [field]: value }
      });
    }
  };

  // Issue Management Functions
  const addIssue = useCallback((nodeId, issueData) => {
    const newIssue = {
      id: `ISS-${String(issueIdCounter).padStart(3, '0')}`,
      title: issueData.title || 'New Issue',
      description: issueData.description || '',
      severity: issueData.severity || 'medium', // critical, high, medium, low
      status: issueData.status || 'open', // open, in-progress, resolved, closed
      type: issueData.type || 'bug', // bug, enhancement, question, task
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignee: issueData.assignee || '',
      dueDate: issueData.dueDate || '',
      comments: []
    };
    
    setIssues(prev => ({
      ...prev,
      [nodeId]: [...(prev[nodeId] || []), newIssue]
    }));
    setIssueIdCounter(prev => prev + 1);
    return newIssue;
  }, [issueIdCounter]);

  const updateIssue = useCallback((nodeId, issueId, updates) => {
    setIssues(prev => ({
      ...prev,
      [nodeId]: (prev[nodeId] || []).map(issue => 
        issue.id === issueId 
          ? { ...issue, ...updates, updatedAt: new Date().toISOString() }
          : issue
      )
    }));
  }, []);

  const deleteIssue = useCallback((nodeId, issueId) => {
    setIssues(prev => ({
      ...prev,
      [nodeId]: (prev[nodeId] || []).filter(issue => issue.id !== issueId)
    }));
  }, []);

  const getNodeIssues = useCallback((nodeId) => {
    return issues[nodeId] || [];
  }, [issues]);

  const getOpenIssueCount = useCallback((nodeId) => {
    return (issues[nodeId] || []).filter(i => i.status !== 'closed' && i.status !== 'resolved').length;
  }, [issues]);

  const getCriticalIssueCount = useCallback((nodeId) => {
    return (issues[nodeId] || []).filter(i => 
      (i.severity === 'critical' || i.severity === 'high') && 
      i.status !== 'closed' && i.status !== 'resolved'
    ).length;
  }, [issues]);

  // Library management callbacks
  const fetchLibraryItems = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/library`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('plm_token')}`
        }
      });
      if (response.ok) {
        const items = await response.json();
        setLibraryItems(items);
      } else {
        console.log('Library API not available, using empty library');
        setLibraryItems([]);
      }
    } catch (error) {
      console.log('Library fetch error:', error);
      setLibraryItems([]);
    }
  }, []);

  const saveNodeToLibrary = useCallback(async (node) => {
    const libraryItem = {
      name: node.data.label,
      type: node.data.type || node.data.itemType,
      itemType: node.data.itemType || node.data.type,
      description: node.data.description || '',
      version: '1.0',
      nodeData: { ...node.data },
      createdAt: new Date().toISOString()
    };
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/library`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('plm_token')}`
        },
        body: JSON.stringify(libraryItem)
      });
      if (response.ok) {
        const saved = await response.json();
        setLibraryItems(prev => [...prev, saved]);
        return saved;
      }
    } catch (error) {
      console.log('Save to library error:', error);
    }
    // Fallback: save locally
    const localItem = { ...libraryItem, id: `lib-${Date.now()}` };
    setLibraryItems(prev => [...prev, localItem]);
    return localItem;
  }, []);

  const addLibraryItemToCanvas = useCallback((libraryItem) => {
    const newNode = {
      id: String(nodeId),
      type: 'custom',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        ...libraryItem.nodeData,
        label: libraryItem.name,
        libraryRef: libraryItem.id,
        libraryVersion: libraryItem.version,
      }
    };
    setNodes(nds => [...nds, newNode]);
    setNodeId(prev => prev + 1);
  }, [nodeId]);

  // Node resize handler
  const handleNodeResize = useCallback((nodeId, width, height) => {
    setNodes(nds => nds.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, nodeWidth: width, nodeHeight: height } }
        : node
    ));
  }, []);

  const processedNodes = useMemo(() => {
    return nodes.map((node) => {
      const searchLower = searchText.toLowerCase();
      const matchesSearch = searchText === '' || 
        node.data.label.toLowerCase().includes(searchLower) ||
        (node.data.description && node.data.description.toLowerCase().includes(searchLower)) ||
        (node.data.reqId && node.data.reqId.toLowerCase().includes(searchLower));
      
      const matchesType = typeFilter === 'all' || node.data.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || node.data.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || node.data.priority === priorityFilter;
      const matchesState = stateFilter === 'all' || node.data.state === stateFilter || (stateFilter === 'open' && !node.data.state);
      const matchesReqType = reqTypeFilter === 'all' || node.data.reqType === reqTypeFilter;
      const matchesClassification = classificationFilter === 'all' || node.data.classification === classificationFilter;
      
      const isFiltered = matchesSearch && matchesType && matchesStatus && matchesPriority && matchesState && matchesReqType && matchesClassification;
      const isHighlighted = searchText !== '' && isFiltered;

      // Add issue counts
      const nodeIssues = issues[node.id] || [];
      const issueCount = nodeIssues.filter(i => i.status !== 'closed' && i.status !== 'resolved').length;
      const criticalIssueCount = nodeIssues.filter(i => 
        (i.severity === 'critical' || i.severity === 'high') && 
        i.status !== 'closed' && i.status !== 'resolved'
      ).length;

      return {
        ...node,
        data: { 
          ...node.data, 
          isFiltered, 
          isHighlighted, 
          isWhiteboardMode: viewMode === 'whiteboard', 
          onChange: handleNodeLabelChange,
          issueCount,
          criticalIssueCount,
          onShowIssues: (n) => {
            setIssueNodeId(n.id);
            setShowIssuePanel(true);
          }
        },
      };
    });
  }, [nodes, searchText, typeFilter, statusFilter, priorityFilter, stateFilter, reqTypeFilter, classificationFilter, handleNodeLabelChange, viewMode, issues]);

  const filteredCount = processedNodes.filter(n => n.data.isFiltered).length;

const addPlatformNode = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
    
    const reqId = generateItemId ('platform');
    
    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'custom',
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        selected: false,
        data: { 
          label: 'New Platform Component', 
          type: 'platform',
          reqType: 'platform',
          reqId: reqId,
          version: '1.0',
          classification: 'capability',
          description: '',
          priority: 'medium',
          status: 'new',
          state: 'open',
          owner: '',
          attachment: null,
          onChange: handleNodeLabelChange
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, setSelectedNode, generateItemId ]);

 const addRequirementNode = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
    
    let position = { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 };
    
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      position = { 
        x: centerX + (Math.random() * 100 - 50), 
        y: centerY + (Math.random() * 100 - 50) 
      };
    }
    const itemId = generateItemId('project');
    
    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'custom',
        position: position,
        selected: false,
        data: { 
          label: 'New Requirement',
          type: 'requirement',
          itemType: 'requirement',
          reqId: itemId,
          version: '1.0',
          reqType: 'project',
          origin: 'internal',
          classification: 'requirement',
          description: '',
          rationale: '',
          priority: 'medium',
          status: 'new',
          state: 'open',
          owner: '',
          attachment: null,
          onChange: handleNodeLabelChange
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, setSelectedNode, generateItemId, reactFlowInstance]);

  const addSystemNode = useCallback(() => {
    // Clear any selected node first to prevent issues
    setSelectedNode(null);
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
    
    // Get current viewport center
    let position = { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 };
    
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      position = { 
        x: centerX + (Math.random() * 100 - 50), 
        y: centerY + (Math.random() * 100 - 50) 
      };
    }
    const itemId = generateItemId('system');
    
    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'custom',
        position: position,
        selected: false,
        data: { 
          label: 'New System', 
          type: 'system',
          itemType: 'system',
          reqId: itemId,
          version: '1.0',
          classification: 'system',
          description: '',
          rationale: '',
          ports: [],
          priority: 'high',
          status: 'new',
          state: 'open',
          owner: '',
          attachment: null,
          onChange: handleNodeLabelChange
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, setSelectedNode, generateItemId, reactFlowInstance]);

  const addSubSystemNode = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
    
    let position = { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 };
    
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      position = { 
        x: centerX + (Math.random() * 100 - 50), 
        y: centerY + (Math.random() * 100 - 50) 
      };
    }
    const itemId = generateItemId('subsystem');
    
    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'custom',
        position: position,
        selected: false,
        data: { 
          label: 'New Sub-System', 
          type: 'subsystem',
          itemType: 'subsystem',
          reqId: itemId,
          version: '1.0',
          classification: 'subsystem',
          description: '',
          rationale: '',
          ports: [],
          priority: 'medium',
          status: 'new',
          state: 'open',
          owner: '',
          attachment: null,
          onChange: handleNodeLabelChange
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, setSelectedNode, generateItemId, reactFlowInstance]);

  const addFunctionNode = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
    
    let position = { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 };
    
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      position = { 
        x: centerX + (Math.random() * 100 - 50), 
        y: centerY + (Math.random() * 100 - 50) 
      };
    }
    const itemId = generateItemId('function');
    
    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'custom',
        position: position,
        selected: false,
        data: { 
          label: 'New Function', 
          type: 'function',
          itemType: 'function',
          reqId: itemId,
          version: '1.0',
          classification: 'function',
          description: '',
          rationale: '',
          ports: [],
          priority: 'medium',
          status: 'new',
          state: 'open',
          owner: '',
          attachment: null,
          onChange: handleNodeLabelChange
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, setSelectedNode, generateItemId, reactFlowInstance]);

  const addTestCaseNode = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
    
    let position = { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 };
    
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      position = { 
        x: centerX + (Math.random() * 100 - 50), 
        y: centerY + (Math.random() * 100 - 50) 
      };
    }
    const itemId = generateItemId('testcase');
    
    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'custom',
        position: position,
        selected: false,
        data: { 
          label: 'New Test Case', 
          type: 'testcase',
          itemType: 'testcase',
          reqId: itemId,
          version: '1.0',
          classification: 'testcase',
          description: '',
          rationale: '',
          purpose: '',
          preconditions: '',
          testSteps: '',
          expectedResults: '',
          priority: 'medium',
          status: 'draft',
          state: 'open',
          owner: '',
          attachment: null,
          onChange: handleNodeLabelChange
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, setSelectedNode, generateItemId, reactFlowInstance]);

  const addParameterNode = useCallback((paramType = 'configuration') => {
    // Clear any selected node first to prevent issues
    setSelectedNode(null);
    
    // Also clear ReactFlow's internal selection
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
    
    // Get current viewport center
    let position = { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 };
    
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      position = { 
        x: centerX + (Math.random() * 100 - 50), 
        y: centerY + (Math.random() * 100 - 50) 
      };
    }
    const itemId = generateItemId('parameter');
    
    // Use setTimeout to ensure state updates complete before adding new node
    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'custom',
        position: position,
        selected: false,
        data: { 
          label: 'New Parameter', 
          type: 'parameter',
          itemType: 'parameter',
          reqId: itemId,
          version: '1.0',
          classification: 'parameter',
          paramType: paramType,  // 'configuration' or 'settings'
          paramValue: '',
          paramUnit: '',
          paramMin: '',
          paramMax: '',
          paramDefault: '',
          description: '',
          rationale: '',
          ports: [],
          priority: 'medium',
          status: 'new',
          state: 'open',
          owner: '',
          attachment: null,
          onChange: handleNodeLabelChange
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, setSelectedNode, generateItemId, reactFlowInstance]);

  const addHardwareNode = useCallback((hwType = 'generic') => {
    // Clear any selected node first to prevent issues
    setSelectedNode(null);
    
    // Also clear ReactFlow's internal selection
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
    
    // Get current viewport center
    let position = { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 };
    
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      position = { 
        x: centerX + (Math.random() * 100 - 50), 
        y: centerY + (Math.random() * 100 - 50) 
      };
    }
    const itemId = generateItemId('hardware');
    
    // Find hardware type info - use defaults if hardwareTypes is empty
    const typesToSearch = hardwareTypes.length > 0 ? hardwareTypes : [
      { id: 'motor', name: 'Motor', icon: '⚙️' },
      { id: 'inverter', name: 'Inverter', icon: '🔄' },
      { id: 'battery', name: 'Battery', icon: '🔋' },
      { id: 'sensor', name: 'Sensor', icon: '📡' },
      { id: 'controller', name: 'Controller', icon: '🎛️' },
      { id: 'pump', name: 'Pump', icon: '💧' },
      { id: 'fan', name: 'Fan', icon: '🌀' },
      { id: 'transformer', name: 'Transformer', icon: '⚡' },
      { id: 'relay', name: 'Relay', icon: '🔌' },
      { id: 'display', name: 'Display', icon: '🖥️' },
      { id: 'valve', name: 'Valve', icon: '🚰' },
      { id: 'heater', name: 'Heater', icon: '🔥' },
      { id: 'cooler', name: 'Cooler', icon: '❄️' },
      { id: 'generic', name: 'Generic', icon: '📦' },
    ];
    const hwTypeInfo = typesToSearch.find(t => t.id === hwType) || { name: 'Generic', icon: '📦' };
    
    // Use setTimeout to ensure state updates complete before adding new node
    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'custom',
        position: position,
        selected: false,
        data: { 
          label: `New ${hwTypeInfo.name}`, 
          type: 'hardware',
          itemType: 'hardware',
          reqId: itemId,
          version: '1.0',
          classification: 'hardware',
          hwType: hwType,
          hwIcon: hwTypeInfo.icon,
          hwIconSize: 64,          // Default icon size
          hwCustomIcon: null,       // For custom uploaded icons
          manufacturer: '',
          partNumber: '',
          serialNumber: '',
          specifications: '',
          description: '',
          rationale: '',
          ports: [],
          priority: 'medium',
          status: 'new',
          state: 'open',
          owner: '',
          attachment: null,
          onChange: handleNodeLabelChange
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, setSelectedNode, generateItemId, reactFlowInstance, hardwareTypes]);

  const addUseCaseNode = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
    
    let position = { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 };
    
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      position = { 
        x: centerX + (Math.random() * 100 - 50), 
        y: centerY + (Math.random() * 100 - 50) 
      };
    }
    const itemId = generateItemId('usecase');
    
    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'custom',
        position: position,
        selected: false,
        data: { 
          label: 'New Use Case',
          type: 'usecase',
          itemType: 'usecase',
          reqId: itemId,
          version: '1.0',
          classification: 'usecase',
          description: '',
          preconditions: '',
          postconditions: '',
          mainFlow: '',
          alternativeFlows: '',
          actors: [],
          priority: 'medium',
          status: 'new',
          state: 'open',
          owner: '',
          attachment: null,
          onChange: handleNodeLabelChange
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, setSelectedNode, generateItemId, reactFlowInstance]);

  const addActorNode = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
    
    let position = { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 };
    
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      position = { 
        x: centerX + (Math.random() * 100 - 50), 
        y: centerY + (Math.random() * 100 - 50) 
      };
    }
    const itemId = generateItemId('actor');
    
    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'custom',
        position: position,
        selected: false,
        data: { 
          label: 'New Actor',
          type: 'actor',
          itemType: 'actor',
          reqId: itemId,
          version: '1.0',
          classification: 'actor',
          description: '',
          actorType: 'primary', // primary, secondary, system
          responsibilities: '',
          priority: 'medium',
          status: 'new',
          state: 'open',
          owner: '',
          attachment: null,
          onChange: handleNodeLabelChange
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, setSelectedNode, generateItemId, reactFlowInstance]);

  // Add Text Annotation Node
  const addTextAnnotationNode = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
    
    let position = { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 };
    
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      position = { 
        x: centerX + (Math.random() * 100 - 50), 
        y: centerY + (Math.random() * 100 - 50) 
      };
    }
    
    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'textAnnotation',
        position: position,
        selected: true,
        data: { 
          text: 'Double-click to edit',
          itemType: 'textAnnotation',
          fontSize: 14,
          textColor: '#333333',
          bgColor: 'rgba(255, 255, 200, 0.9)',
          fontWeight: 'normal',
          fontStyle: 'normal',
          nodeWidth: 200,
          nodeHeight: 60,
          onChange: handleNodeLabelChange,
          onResize: (nodeId, width, height) => {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === nodeId
                  ? { ...node, data: { ...node.data, nodeWidth: width, nodeHeight: height } }
                  : node
              )
            );
          }
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, setSelectedNode, reactFlowInstance]);

  const exportProject = useCallback(() => {
  // Ask user for filename
  const defaultName = objectName.replace(/[^a-z0-9]/gi, '_') || 'project';
  const filename = prompt('Save project as:', defaultName);
  
  if (!filename) return;  // User cancelled
  
  const data = {
    objectName,
    objectVersion,
    nodes,
    edges,
    whiteboards,
    whiteboardNodes,
    whiteboardEdges,
    issues,
    issueIdCounter,
    savedAt: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  link.click();
  URL.revokeObjectURL(url);
}, [objectName, objectVersion, nodes, edges, whiteboards, whiteboardNodes, whiteboardEdges, issues, issueIdCounter]);

 const exportToExcel = useCallback(() => {
    // Prepare data for Excel
    const excelData = nodes.map(node => ({
      'Requirement ID': node.data.reqId || '',
      'Title': node.data.label || '',
      'Version': node.data.version || '1.0',
      'Type': node.data.reqType || '',
      'Classification': node.data.classification || '',
      'State': node.data.state || 'open',
      'Priority': node.data.priority || 'medium',
      'Status': node.data.status || 'new',
      'Owner': node.data.owner || '',
      'Description': node.data.description || ''
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 },  // Requirement ID
      { wch: 30 },  // Title
      { wch: 8 },   // Version
      { wch: 15 },  // Type
      { wch: 15 },  // Classification
      { wch: 10 },  // State
      { wch: 10 },  // Priority
      { wch: 12 },  // Status
      { wch: 15 },  // Owner
      { wch: 50 },  // Description
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Requirements');

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `PLM-Requirements-${date}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
  }, [nodes]);

  const generateFATProtocol = useCallback(async (testCaseNode) => {
    // Dynamic import of docx library
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
            Header, Footer, AlignmentType, BorderStyle, WidthType, 
            ShadingType, PageNumber, HeadingLevel } = await import('docx');
    
    const tc = testCaseNode.data;
    const steps = (tc.testSteps || '').split('\n').filter(s => s.trim());
    const expected = (tc.expectedResults || '').split('\n').filter(s => s.trim());
    const preconditions = (tc.preconditions || '').split('\n').filter(s => s.trim());
    
    // Find linked requirements
    const linkedReqs = edges
      .filter(e => e.source === testCaseNode.id || e.target === testCaseNode.id)
      .map(e => {
        const otherId = e.source === testCaseNode.id ? e.target : e.source;
        return nodes.find(n => n.id === otherId);
      })
      .filter(n => n && !['testcase', 'testrun', 'testresult'].includes(n.data.itemType));

    const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
    const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };
    
    // Build test steps rows
    const stepRows = steps.map((step, index) => {
      return new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: 600, type: WidthType.DXA },
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: String(index + 1), bold: true })]
            })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 4000, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun(step.trim())] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 3000, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun(expected[index]?.trim() || '')] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 800, type: WidthType.DXA },
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: '☐', size: 28 })]
            })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 800, type: WidthType.DXA },
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: '☐', size: 28 })]
            })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 1800, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun('')] })]
          }),
        ]
      });
    });

    const doc = new Document({
      styles: {
        default: { document: { run: { font: "Arial", size: 22 } } },
        paragraphStyles: [
          { id: "Title", name: "Title", basedOn: "Normal",
            run: { size: 48, bold: true, color: "1a5276" },
            paragraph: { spacing: { before: 0, after: 200 }, alignment: AlignmentType.CENTER } },
          { id: "Heading1", name: "Heading 1", basedOn: "Normal",
            run: { size: 28, bold: true, color: "2c3e50" },
            paragraph: { spacing: { before: 300, after: 120 } } },
        ]
      },
      sections: [{
        properties: {
          page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } }
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: objectName + ' | ', size: 18, color: "666666" }),
                new TextRun({ text: 'FAT Protocol', size: 18, color: "666666", bold: true })
              ]
            })]
          })
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Page ', size: 18 }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
                new TextRun({ text: ' of ', size: 18 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 })
              ]
            })]
          })
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [new TextRun({ text: 'FACTORY ACCEPTANCE TEST PROTOCOL', bold: true })]
          }),
          
          new Table({
            columnWidths: [2500, 8500],
            rows: [
              new TableRow({
                children: [
                  new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Project:', bold: true })] })] }),
                  new TableCell({ borders: cellBorders,
                    children: [new Paragraph({ children: [new TextRun(objectName)] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Version:', bold: true })] })] }),
                  new TableCell({ borders: cellBorders,
                    children: [new Paragraph({ children: [new TextRun(objectVersion)] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Date:', bold: true })] })] }),
                  new TableCell({ borders: cellBorders,
                    children: [new Paragraph({ children: [new TextRun(new Date().toISOString().split('T')[0])] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Test Case ID:', bold: true })] })] }),
                  new TableCell({ borders: cellBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: tc.reqId || 'N/A', bold: true, color: "2980b9" })] })] })
                ]
              }),
            ]
          }),
          
          new Paragraph({ children: [] }),
          
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: tc.label || 'Test Case' })]
          }),
          
          new Paragraph({
            spacing: { before: 200 },
            children: [
              new TextRun({ text: 'Verifies: ', bold: true }),
              new TextRun(linkedReqs.map(r => `${r.data.reqId} - ${r.data.label}`).join(', ') || 'No linked requirements')
            ]
          }),
          
          new Paragraph({
            spacing: { before: 300 },
            children: [new TextRun({ text: 'PURPOSE', bold: true, size: 24 })]
          }),
          new Paragraph({
            children: [new TextRun(tc.purpose || 'Not specified')]
          }),
          
          new Paragraph({
            spacing: { before: 300 },
            children: [new TextRun({ text: 'PRECONDITIONS', bold: true, size: 24 })]
          }),
          ...(preconditions.length > 0 
            ? preconditions.map(p => new Paragraph({
                children: [new TextRun({ text: '• ' + p })]
              }))
            : [new Paragraph({ children: [new TextRun('None specified')] })]
          ),
          
          new Paragraph({
            spacing: { before: 400 },
            children: [new TextRun({ text: 'TEST PROCEDURE', bold: true, size: 24 })]
          }),
          new Paragraph({ children: [] }),
          
          new Table({
            columnWidths: [600, 4000, 3000, 800, 800, 1800],
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({ borders: cellBorders, shading: { fill: "2c3e50", type: ShadingType.CLEAR },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, 
                      children: [new TextRun({ text: '#', bold: true, color: "ffffff" })] })] }),
                  new TableCell({ borders: cellBorders, shading: { fill: "2c3e50", type: ShadingType.CLEAR },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'Step', bold: true, color: "ffffff" })] })] }),
                  new TableCell({ borders: cellBorders, shading: { fill: "2c3e50", type: ShadingType.CLEAR },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'Expected Result', bold: true, color: "ffffff" })] })] }),
                  new TableCell({ borders: cellBorders, shading: { fill: "27ae60", type: ShadingType.CLEAR },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'Pass', bold: true, color: "ffffff" })] })] }),
                  new TableCell({ borders: cellBorders, shading: { fill: "e74c3c", type: ShadingType.CLEAR },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'Fail', bold: true, color: "ffffff" })] })] }),
                  new TableCell({ borders: cellBorders, shading: { fill: "2c3e50", type: ShadingType.CLEAR },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'Comments', bold: true, color: "ffffff" })] })] }),
                ]
              }),
              ...stepRows
            ]
          }),
          
          new Paragraph({
            spacing: { before: 400 },
            children: [new TextRun({ text: 'OVERALL RESULT', bold: true, size: 24 })]
          }),
          new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ text: '☐ PASS     ☐ FAIL     ☐ BLOCKED', size: 28 })]
          }),
          
          new Paragraph({
            spacing: { before: 300 },
            children: [new TextRun({ text: 'COMMENTS / OBSERVATIONS', bold: true, size: 24 })]
          }),
          new Paragraph({ borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" } }, spacing: { before: 200 }, children: [new TextRun('')] }),
          new Paragraph({ borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" } }, spacing: { before: 400 }, children: [new TextRun('')] }),
          new Paragraph({ borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" } }, spacing: { before: 400 }, children: [new TextRun('')] }),
          
          new Paragraph({
            spacing: { before: 500 },
            children: [new TextRun({ text: 'SIGN-OFF', bold: true, size: 24 })]
          }),
          new Table({
            columnWidths: [2750, 2750, 2750, 2750],
            rows: [
              new TableRow({
                children: [
                  new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Tested by:', bold: true })] })] }),
                  new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun('')] })] }),
                  new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Date:', bold: true })] })] }),
                  new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun('')] })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Signature:', bold: true })] })] }),
                  new TableCell({ borders: cellBorders, children: [new Paragraph({ spacing: { before: 400 }, children: [new TextRun('')] })] }),
                  new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Witness:', bold: true })] })] }),
                  new TableCell({ borders: cellBorders, children: [new Paragraph({ spacing: { before: 400 }, children: [new TextRun('')] })] }),
                ]
              }),
            ]
          }),
        ]
      }]
    });

    // Generate and download
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FAT-${tc.reqId || 'TestCase'}-${new Date().toISOString().split('T')[0]}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, objectName, objectVersion]);

  // Voice Recognition Setup
  const startVoiceRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus('🎤 Listening...');
    };

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase();
      setVoiceStatus(`Heard: "${command}"`);
      
      // Process commands
      if (command.includes('create system') || command.includes('add system')) {
        addSystemNode();
        setVoiceStatus('✅ Created System node');
      } else if (command.includes('create subsystem') || command.includes('add subsystem') || command.includes('create sub system') || command.includes('add sub system')) {
        addSubSystemNode();
        setVoiceStatus('✅ Created Sub-System node');
      } else if (command.includes('create function') || command.includes('add function')) {
        addFunctionNode();
        setVoiceStatus('✅ Created Function node');
      } else if (command.includes('create requirement') || command.includes('add requirement')) {
        addRequirementNode();
        setVoiceStatus('✅ Created Requirement node');
      } else if (command.includes('create test') || command.includes('add test')) {
        addTestCaseNode();
        setVoiceStatus('✅ Created Test Case node');
      } else if (command.includes('create platform') || command.includes('add platform')) {
        addPlatformNode();
        setVoiceStatus('✅ Created Platform node');
      } else if (command.includes('save project') || command.includes('save')) {
        exportProject();
        setVoiceStatus('✅ Project saved');
      } else if (command.includes('export excel') || command.includes('excel export')) {
        exportToExcel();
        setVoiceStatus('✅ Exported to Excel');
      } else if (command.includes('fit view') || command.includes('fit screen') || command.includes('zoom fit')) {
        // We'll need to expose fitView - for now just show message
        setVoiceStatus('💡 Press F to fit view');
      } else if (command.includes('new object') || command.includes('new project')) {
        setShowNewObjectModal(true);
        setVoiceStatus('✅ Opening New Object dialog');
      } else if (command.includes('undo')) {
        undo();
        setVoiceStatus('✅ Undo');
      } else if (command.includes('redo')) {
        redo();
        setVoiceStatus('✅ Redo');
      } else if (command.includes('help') || command.includes('commands')) {
        setVoiceStatus('💡 Say: create system/requirement/test, save, undo, redo');
      } else {
        setVoiceStatus(`❓ Unknown: "${command}"`);
      }

      // Clear status after 3 seconds
      setTimeout(() => setVoiceStatus(''), 3000);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setVoiceStatus(`❌ Error: ${event.error}`);
      setTimeout(() => setVoiceStatus(''), 3000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [addSystemNode, addSubSystemNode, addFunctionNode, addRequirementNode, addTestCaseNode, addPlatformNode, addUseCaseNode, addActorNode, exportProject, exportToExcel, undo, redo]);

// Voice Dictation for text fields
  const startVoiceDictation = useCallback((callback) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition not supported. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      callback(text);
    };

    recognition.onerror = (event) => {
      console.error('Voice error:', event.error);
    };

    recognition.start();
  }, []);
const createNewObject = (name, version, description) => {
    setObjectName(name);
    setObjectVersion(version);
    setObjectDescription(description);
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setSelectedEdge(null);
    setNodeId(1);
    setCusIdCounter(1);
    setPltIdCounter(1);
    setPrjIdCounter(1);
    setImpIdCounter(1);
    setSysIdCounter(1);
    setSubIdCounter(1);
    setFunIdCounter(1);
    setParIdCounter(1);
    setHwIdCounter(1);
    setTcIdCounter(1);
    setHistory([]);
    setHistoryIndex(-1);
  };

  const createNewWhiteboard = useCallback((name) => {
    const newId = `wb-${Date.now()}`;
    const newWhiteboard = {
      id: newId,
      name: name || `Whiteboard ${whiteboards.length}`,
      type: 'whiteboard'
    };
    
    // IMPORTANT: Save current PLM data before switching
    if (activeWhiteboardId === 'plm') {
      setWhiteboardNodes(prev => ({ ...prev, 'plm': nodes }));
      setWhiteboardEdges(prev => ({ ...prev, 'plm': edges }));
    } else {
      setWhiteboardNodes(prev => ({ ...prev, [activeWhiteboardId]: nodes }));
      setWhiteboardEdges(prev => ({ ...prev, [activeWhiteboardId]: edges }));
    }
    
    // Add new whiteboard to list
    setWhiteboards(prev => [...prev, newWhiteboard]);
    setWhiteboardNodes(prev => ({ ...prev, [newId]: [] }));
    setWhiteboardEdges(prev => ({ ...prev, [newId]: [] }));
    
    // Switch to the new whiteboard immediately
    setNodes([]);
    setEdges([]);
    setViewMode('whiteboard')
    setActiveWhiteboardId(newId);
    setShowWhiteboardDropdown(false);
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [whiteboards.length, activeWhiteboardId, nodes, edges, setNodes, setEdges]);

  const switchWhiteboard = useCallback((whiteboardId) => {
    // Save current view's data before switching
    if (activeWhiteboardId === 'plm') {
      // Save PLM data to a special key
      setWhiteboardNodes(prev => ({ ...prev, 'plm': nodes }));
      setWhiteboardEdges(prev => ({ ...prev, 'plm': edges }));
    } else {
      // Save current whiteboard data
      setWhiteboardNodes(prev => ({ ...prev, [activeWhiteboardId]: nodes }));
      setWhiteboardEdges(prev => ({ ...prev, [activeWhiteboardId]: edges }));
    }
    
    // Small delay to ensure state is saved before loading new view
    setTimeout(() => {
      if (whiteboardId === 'plm') {
        // Load PLM data
        const plmNodes = whiteboardNodes['plm'] || nodes;
        const plmEdges = whiteboardEdges['plm'] || edges;
        setNodes(plmNodes);
        setEdges(plmEdges);
        setViewMode('plm');
      } else {
        // Load whiteboard data
        const wbNodes = whiteboardNodes[whiteboardId] || [];
        const wbEdges = whiteboardEdges[whiteboardId] || [];
        setNodes(wbNodes);
        setEdges(wbEdges);
        setViewMode('whiteboard');
      }
      
      setActiveWhiteboardId(whiteboardId);
      setShowWhiteboardDropdown(false);
      setSelectedNode(null);
      setSelectedEdge(null);
    }, 50);
  }, [activeWhiteboardId, nodes, edges, whiteboardNodes, whiteboardEdges, setNodes, setEdges]);


  const deleteWhiteboard = useCallback((whiteboardId) => {
    if (whiteboardId === 'plm') return; // Can't delete PLM view
    
    // If deleting active whiteboard, switch to PLM
    if (activeWhiteboardId === whiteboardId) {
      switchWhiteboard('plm');
    }
    
    setWhiteboards(prev => prev.filter(wb => wb.id !== whiteboardId));
    setWhiteboardNodes(prev => {
      const newNodes = { ...prev };
      delete newNodes[whiteboardId];
      return newNodes;
    });
    setWhiteboardEdges(prev => {
      const newEdges = { ...prev };
      delete newEdges[whiteboardId];
      return newEdges;
    });
  }, [activeWhiteboardId, switchWhiteboard]);

  const duplicateNode = useCallback((nodeToDuplicate) => {
    if (!nodeToDuplicate) return;
    
    const reqId = generateItemId (nodeToDuplicate.data.reqType || 'project');
    const newNode = {
      id: String(nodeId),
      type: 'custom',
      position: { 
        x: nodeToDuplicate.position.x + 50, 
        y: nodeToDuplicate.position.y + 50 
      },
      data: { 
        ...nodeToDuplicate.data,
        label: nodeToDuplicate.data.label + ' (Copy)',
        reqId: reqId,
        state: 'open',
        onChange: handleNodeLabelChange
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  }, [nodeId, handleNodeLabelChange, setNodes, generateItemId ]);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('plm_token');
      const savedUser = localStorage.getItem('plm_user');
      
      console.log('Auth check - Token exists:', !!token, 'User exists:', !!savedUser);
      
      if (token && savedUser) {
        try {
          const userData = await auth.me();
          setUser(userData);
          realtime.connect();
          fetchHardwareTypes();  // Load hardware types from database
        } catch (err) {
          console.error('Auth check failed:', err);
          // Token is invalid - clear everything
          localStorage.removeItem('plm_token');
          localStorage.removeItem('plm_user');
          setUser(null);
        }
      } else {
        // No token - make sure user is null
        setUser(null);
      }
      
      setIsAuthChecking(false);
    };
    checkAuth();
  }, []);

 // Expose duplicateNode and generateFATProtocol to window for FloatingPanel buttons
  useEffect(() => {
    window.duplicateNodeFunction = duplicateNode;
    window.generateFATFunction = generateFATProtocol;
    window.startVoiceDictation = startVoiceDictation;
    return () => {
      delete window.duplicateNodeFunction;
      delete window.generateFATFunction;
      delete window.startVoiceDictation;
    };
  }, [duplicateNode, generateFATProtocol, startVoiceDictation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        if (e.key === 'Escape') {
          setSelectedNode(null);
          setSelectedEdge(null);
          e.target.blur();
        }
        return;
      }

      // Auto-layout with 'A'
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey) {
        // Don't trigger if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        autoLayoutNodes();
      }

      // P = New Platform
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        addPlatformNode();
      }

      // R = New Requirement
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        addRequirementNode();
      }

      // Escape = Close panels
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setSelectedEdge(null);
      }

      // Ctrl+D = Duplicate selected node
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        // Find selected nodes from ReactFlow's selection
        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length > 0) {
          duplicateNode(selectedNodes[0]);
        } else if (selectedNode) {
          // Fallback to panel's selected node
          duplicateNode(selectedNode);
        }
      }

      // Ctrl+Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Y or Ctrl+Shift+Z = Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }

      // Ctrl+S = Save to Database
      if (e.ctrlKey && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        saveProjectToDatabase();
        return;
      }
      
      // Ctrl+Shift+S = Export to File
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        exportProject();
        return;
      }
      
      // Ctrl+O = Import from File
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        document.getElementById('file-import-input')?.click();
        return;
      }

      // Ctrl+F = Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="🔍 Search..."]');
        if (searchInput) {
          searchInput.focus();
        }
      }

      // F = Fit view (only if not Ctrl+F)
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const fitViewButton = document.querySelector('.react-flow__controls-fitview');
        if (fitViewButton) {
          fitViewButton.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addPlatformNode, addRequirementNode, exportProject, duplicateNode, selectedNode, undo, redo]);
    
  const importProject = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const project = JSON.parse(e.target.result);
          
          // Load object definition
          if (project.objectName) setObjectName(project.objectName);
          if (project.objectVersion) setObjectVersion(project.objectVersion);
          if (project.objectDescription) setObjectDescription(project.objectDescription);
          
           // Load nodes and edges (add missing fields for backwards compatibility)
          const updatedNodes = (project.nodes || []).map(node => {
            // Determine correct itemType
            let itemType = node.data.itemType || node.data.type;
            
            // Normalize: project/customer/platform/implementation are all "requirement" itemType
            if (['project', 'customer', 'platform', 'implementation'].includes(itemType)) {
              itemType = 'requirement';
            }
            
            // Detect from reqId prefix if still not set
            if (!itemType || itemType === 'requirement') {
              if (node.data.reqId?.startsWith('SYS')) itemType = 'system';
              else if (node.data.reqId?.startsWith('SUB')) itemType = 'subsystem';
              else if (node.data.reqId?.startsWith('FUN')) itemType = 'function';
              else if (node.data.reqId?.startsWith('TC')) itemType = 'testcase';
              else itemType = 'requirement';
            }
            
            return {
              ...node,
              data: {
                ...node.data,
                itemType: itemType,
                origin: node.data.origin || 'internal',
                classification: node.data.classification || 'requirement',
                onChange: handleNodeLabelChange
              }
            };
          });
          setNodes(updatedNodes);
          
          // Process edges - validate handles and add arrows
          const edgesWithArrows = (project.edges || []).map(edge => {
            const sourceNode = updatedNodes.find(n => n.id === edge.source);
            const targetNode = updatedNodes.find(n => n.id === edge.target);
            
            // Check if handles exist on the nodes
            const sourcePorts = sourceNode?.data?.ports || [];
            const targetPorts = targetNode?.data?.ports || [];
            
            const validSourceHandle = !edge.sourceHandle || 
              edge.sourceHandle === 'default-source' ||
              sourcePorts.some(p => p.id === edge.sourceHandle);
            const validTargetHandle = !edge.targetHandle || 
              edge.targetHandle === 'default-target' ||
              targetPorts.some(p => p.id === edge.targetHandle);
            
            return {
              ...edge,
              // Convert invalid or null handles to undefined (use default)
              sourceHandle: validSourceHandle ? (edge.sourceHandle === null ? undefined : edge.sourceHandle) : undefined,
              targetHandle: validTargetHandle ? (edge.targetHandle === null ? undefined : edge.targetHandle) : undefined,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: '#95a5a6'
              }
            };
          });
          setEdges(edgesWithArrows);
          
          // Calculate max node ID
          const maxId = Math.max(...(project.nodes || []).map(n => parseInt(n.id) || 0), 0);
          setNodeId(maxId + 1);
          
          // Calculate max requirement IDs for each type
          let maxCus = 0, maxPlt = 0, maxPrj = 0, maxImp = 0;
          let maxSys = 0, maxSub = 0, maxFun = 0, maxPar = 0, maxHw = 0, maxTc = 0;
          (project.nodes || []).forEach(n => {
            const reqId = n.data?.reqId || '';
            const num = parseInt(reqId.split('-')[1]) || 0;
            if (reqId.startsWith('CUS')) maxCus = Math.max(maxCus, num);
            if (reqId.startsWith('PLT')) maxPlt = Math.max(maxPlt, num);
            if (reqId.startsWith('PRJ')) maxPrj = Math.max(maxPrj, num);
            if (reqId.startsWith('IMP')) maxImp = Math.max(maxImp, num);
            if (reqId.startsWith('SYS')) maxSys = Math.max(maxSys, num);
            if (reqId.startsWith('SUB')) maxSub = Math.max(maxSub, num);
            if (reqId.startsWith('FUN')) maxFun = Math.max(maxFun, num);
            if (reqId.startsWith('PAR')) maxPar = Math.max(maxPar, num);
            if (reqId.startsWith('HW')) maxHw = Math.max(maxHw, num);
            if (reqId.startsWith('TC')) maxTc = Math.max(maxTc, num);
          });
          setCusIdCounter(maxCus + 1);
          setPltIdCounter(maxPlt + 1);
          setPrjIdCounter(maxPrj + 1);
          setImpIdCounter(maxImp + 1);
          setSysIdCounter(maxSys + 1);
          setSubIdCounter(maxSub + 1);
          setFunIdCounter(maxFun + 1);
          setParIdCounter(maxPar + 1);
          setHwIdCounter(maxHw + 1);
          setTcIdCounter(maxTc + 1);
          
          // Load issues if present
          if (project.issues) {
            setIssues(project.issues);
            let maxIssueId = 0;
            Object.values(project.issues).forEach(nodeIssues => {
              nodeIssues.forEach(issue => {
                const idNum = parseInt(issue.id.replace('ISS-', '')) || 0;
                if (idNum > maxIssueId) maxIssueId = idNum;
              });
            });
            setIssueIdCounter(maxIssueId + 1);
          } else {
            setIssues({});
            setIssueIdCounter(1);
          }
          
          setSelectedNode(null);
          setSelectedEdge(null);
          setHistory([]);
          setHistoryIndex(-1);
        } catch (error) {
          alert('Error loading project file!');
        }
      };
      reader.readAsText(file);
    }
  };

  const clearFilters = () => {
    setSearchText('');
    setTypeFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setStateFilter('all');
    setReqTypeFilter('all');
    setClassificationFilter('all');
  };
  
  if (showSplash) {
      return <NorthlightSplash onComplete={() => setShowSplash(false)} duration={5000} />;
    }
  // Show loading while checking auth
  
  if (isAuthChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  // Show login if NOT authenticated (user is null or undefined)
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Show project selector if no project open
  if (!currentProject) {
    return (
      <ProjectSelector
        user={user}
        onSelectProject={handleSelectProject}
        onLogout={handleLogout}
      />
    );
  }

  // Toolbar button styles
  const toolbarBtnStyle = (bgColor) => ({
    background: bgColor,
    border: 'none',
    color: 'white',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px'
  });
  
  const toolbarBtnSmall = {
    background: '#4a5f7f',
    border: 'none',
    color: 'white',
    padding: '4px 6px',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px',
    minWidth: '24px'
  };
  
  //APP return

  return (
    
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e',overflow: 'hidden' }}>
      
      {/* Top Header */}
      <TopHeader
        objectName={objectName}
        objectVersion={objectVersion}
        onMenuClick={() => {
          setSidebarOpen(true);
          setSelectedNode(null);
          setSelectedEdge(null);
        }}
        searchText={searchText}
        onSearchChange={setSearchText}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => {
          setFiltersOpen(!filtersOpen);
          setSelectedNode(null);
          setSelectedEdge(null);
        }}
        filters={{
          type: reqTypeFilter,
          state: stateFilter,
          priority: priorityFilter,
          classification: classificationFilter
        }}
        onFilterChange={(filterType, value) => {
          if (filterType === 'type') setReqTypeFilter(value);
          if (filterType === 'state') setStateFilter(value);
          if (filterType === 'priority') setPriorityFilter(value);
          if (filterType === 'classification') setClassificationFilter(value);
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        whiteboards={whiteboards}
        activeWhiteboardId={activeWhiteboardId}
        showWhiteboardDropdown={showWhiteboardDropdown}
        onWhiteboardDropdownToggle={() => setShowWhiteboardDropdown(!showWhiteboardDropdown)}
        onWhiteboardSelect={switchWhiteboard}
        onNewWhiteboard={createNewWhiteboard}
        onDeleteWhiteboard={deleteWhiteboard}
        user={user}
        onLogout={handleLogout}
        onChangePassword={() => setShowChangePassword(true)}
      />
      
      {/* Left Icon Strip - hidden in freeform drawing mode */}
      {viewMode !== 'freeform' && <LeftIconStrip
        onAddSystem={addSystemNode}
        onAddSubSystem={addSubSystemNode}
        onAddFunction={addFunctionNode}
        onAddTestCase={addTestCaseNode}
        onAddRequirement={addRequirementNode}
        onAddPlatform={addPlatformNode}
        onAddParameter={addParameterNode}
        onAddHardware={addHardwareNode}
        onAddUseCase={addUseCaseNode}
        onAddActor={addActorNode}
        onAddTextAnnotation={addTextAnnotationNode}
        onOpenLibrary={() => setShowLibraryPanel(true)}
        onOpenIssueManager={() => setShowIssueManagerModal(true)}
        onVoice={startVoiceRecognition}
        isListening={isListening}
        voiceStatus={voiceStatus}
      />}
      
      {/* Sidebar - hidden in freeform drawing mode */}
      {viewMode !== 'freeform' && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <SidebarSection title="📁 Project">
          <SidebarButton 
            icon="💾" 
            label="Save Project" 
            onClick={() => { 
              saveProjectToDatabase(); 
              setSidebarOpen(false); 
            }} 
          />
          <SidebarButton 
            icon="📂" 
            label="Open Project" 
            onClick={() => {
              if (window.confirm('Save current project before opening another?')) {
                saveProjectToDatabase();
              }
              handleCloseProject();
              setSidebarOpen(false);
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
              setSidebarOpen(false);
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
                onClick={() => {
                  exportProject();
                  setSidebarOpen(false);
                }} 
              />
              <SidebarButton 
                icon="📥" 
                label="Import from File (Ctrl+O)" 
                onClick={() => {
                  document.getElementById('file-import-input')?.click();
                  setSidebarOpen(false);
                }} 
              />
            </div>
          <SidebarButton icon="📊" label="Export to Excel" onClick={() => { exportToExcel(); setSidebarOpen(false); }} />
          <SidebarButton icon="🆕" label="New Object" onClick={() => { setShowNewObjectModal(true); setSidebarOpen(false); }} />
          <SidebarButton 
            icon="🔧" 
            label="Manage HW Types" 
            onClick={() => { 
              setShowHardwareTypesModal(true); 
              setSidebarOpen(false); 
            }} 
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
            onClick={() => {
              autoLayoutNodes();
              setSidebarOpen(false);
            }} 
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
              disabled={historyIndex <= 0}
              style={{
                flex: 1,
                padding: '8px',
                background: historyIndex <= 0 ? '#34495e' : '#3498db',
                color: historyIndex <= 0 ? '#666' : 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              ⏪ Undo
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              style={{
                flex: 1,
                padding: '8px',
                background: historyIndex >= history.length - 1 ? '#34495e' : '#3498db',
                color: historyIndex >= history.length - 1 ? '#666' : 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
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
      </Sidebar>}
      
      {/* Show Document View, Freeform Whiteboard, OR PLM Canvas */}
      {viewMode === 'document' ? (
        <DocumentView 
          nodes={nodes} 
          edges={edges} 
          onNodeClick={(node) => {
            setSelectedNode(node);
            setFloatingPanelPosition({ x: window.innerWidth - 350, y: 100 });
          }}
        />
      ) : viewMode === 'freeform' ? (
        <Whiteboard style={{ marginTop: '50px', height: 'calc(100vh - 50px)' }} projectId={currentProject?.id || null} />
      ) : (
      
      <ReactFlow
        nodes={processedNodes}
        edges={edges.map(e => ({
          ...e,
          data: { 
            ...e.data, 
            showLabel: showRelationshipLabels,
            isWhiteboardMode: viewMode === 'whiteboard',
            onLabelChange: (edgeId, newLabel) => {
              setEdges(eds => eds.map(edge => 
                edge.id === edgeId 
                  ? { ...edge, data: { ...edge.data, customLabel: newLabel } }
                  : edge
              ));
            },
            onEdgeDoubleClick: (edgeId, event) => {
              const edge = edges.find(ed => ed.id === edgeId);
              if (edge) {
                setSelectedEdge(edge);
                setEdgePanelPosition({ x: event.clientX, y: event.clientY });
              }
            }
          }
        }))}
        onInit={setReactFlowInstance}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeUpdate={onEdgeUpdate}
        onEdgeUpdateStart={onEdgeUpdateStart}
        onEdgeUpdateEnd={onEdgeUpdateEnd} 
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeDragStop={onNodeDragStop} 
        onEdgeClick={onEdgeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onPaneClick={() => {
          setSelectedNode(null);
          setSelectedEdge(null);
          setShowEdgePanel(false);
          setFiltersOpen(false);
          setShowWhiteboardDropdown(false);
        }}
        connectOnClick={false}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
        selectionOnDrag={true}
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        selectionKeyCode={null}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        style={{ 
          background: viewMode === 'whiteboard' ? '#f5f5f5' : '#1a1a2e',
          marginTop: '50px',
          height: 'calc(100vh - 50px)'
        }}
      >
        <Controls style={{ bottom: 20, left: 70 }} />
        <MiniMap 
          style={{ 
            position: 'absolute',
            bottom: 120,
            right: 10,
            width: 150,
            height: 100,
            background: '#ecf0f1',
            borderRadius: '8px',
            border: '1px solid #34495e'
          }}
          maskColor="rgba(0,0,0,0.2)"
        />
        
        {/* Selection Toolbar - shows when multiple nodes selected */}
        {nodes.filter(n => n.selected).length > 0 && (
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
              {nodes.filter(n => n.selected).length} selected
              {nodes.filter(n => n.selected && n.data?.locked).length > 0 && (
                <span style={{ color: '#e74c3c', marginLeft: '4px' }}>
                  ({nodes.filter(n => n.selected && n.data?.locked).length} 🔒)
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
                style={toolbarBtnStyle(nodes.filter(n => n.selected).some(n => n.data?.locked) ? '#e74c3c' : '#27ae60')} 
                title={nodes.filter(n => n.selected).some(n => !n.data?.locked) ? "Lock (Ctrl+L)" : "Unlock (Ctrl+L)"}
              >
                {nodes.filter(n => n.selected).some(n => !n.data?.locked) ? '🔒' : '🔓'}
              </button>
              <button onClick={groupSelectedNodes} style={toolbarBtnStyle('#1abc9c')} title="Group (Ctrl+G)">
                📁
              </button>
              {nodes.filter(n => n.selected && n.data?.isGroup).length > 0 && (
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
              onClick={() => setNodes(nds => nds.map(n => ({ ...n, selected: false })))}
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
        
        {/* Paste indicator - shows if clipboard has content */}
        {clipboard.nodes.length > 0 && nodes.filter(n => n.selected).length === 0 && (
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
        
        <Background 
          variant="dots" 
          gap={12} 
          size={1} 
          color={viewMode === 'whiteboard' ? '#ccc' : '#444'} 
        />
        
        {/* Arrow markers for relationships */}
        <svg>
          <defs>
            {Object.entries(RELATIONSHIP_TYPES).map(([key, value]) => (
              <marker
                key={key}
                id={`arrow-${key}`}
                viewBox="0 0 20 20"
                refX="20"
                refY="10"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 20 10 L 0 20 z" fill={value.color} />
              </marker>
            ))}
          </defs>
        </svg>
      </ReactFlow>
      )}

      {/* Floating Panel for Text Annotations */}
      {selectedNode && selectedNode.data?.itemType === 'textAnnotation' && (
        <div
          style={{
            position: 'fixed',
            right: '20px',
            top: '80px',
            width: '280px',
            background: '#2c3e50',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 2000,
            color: 'white',
            padding: '15px'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '1px solid #34495e'
          }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>📝 Text Annotation</span>
            <button
              onClick={() => setSelectedNode(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer'
              }}
            >×</button>
          </div>

          {/* Font Size */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#bdc3c7', display: 'block', marginBottom: '4px' }}>
              Font Size
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="range"
                min="10"
                max="48"
                value={selectedNode.data.fontSize || 14}
                onChange={(e) => updateNodeData(selectedNode.id, 'fontSize', parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '12px', width: '30px' }}>{selectedNode.data.fontSize || 14}px</span>
            </div>
          </div>

          {/* Text Color */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#bdc3c7', display: 'block', marginBottom: '4px' }}>
              Text Color
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['#333333', '#e74c3c', '#e67e22', '#f1c40f', '#27ae60', '#3498db', '#9b59b6', '#ffffff'].map(color => (
                <button
                  key={color}
                  onClick={() => updateNodeData(selectedNode.id, 'textColor', color)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    background: color,
                    border: selectedNode.data.textColor === color ? '3px solid #3498db' : '2px solid #4a5f7f',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Background Color */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#bdc3c7', display: 'block', marginBottom: '4px' }}>
              Background
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                'transparent', 
                'rgba(255,255,200,0.9)', 
                'rgba(200,255,200,0.9)', 
                'rgba(200,220,255,0.9)',
                'rgba(255,200,200,0.9)',
                'rgba(255,220,180,0.9)',
                'rgba(220,200,255,0.9)',
                '#ffffff'
              ].map(color => (
                <button
                  key={color}
                  onClick={() => updateNodeData(selectedNode.id, 'bgColor', color)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    background: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)' : color,
                    backgroundSize: color === 'transparent' ? '8px 8px' : 'auto',
                    backgroundPosition: color === 'transparent' ? '0 0, 4px 4px' : 'auto',
                    border: selectedNode.data.bgColor === color ? '3px solid #3498db' : '2px solid #4a5f7f',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Font Style */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#bdc3c7', display: 'block', marginBottom: '4px' }}>
              Style
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => updateNodeData(selectedNode.id, 'fontWeight', selectedNode.data.fontWeight === 'bold' ? 'normal' : 'bold')}
                style={{
                  padding: '6px 12px',
                  background: selectedNode.data.fontWeight === 'bold' ? '#3498db' : '#34495e',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                B
              </button>
              <button
                onClick={() => updateNodeData(selectedNode.id, 'fontStyle', selectedNode.data.fontStyle === 'italic' ? 'normal' : 'italic')}
                style={{
                  padding: '6px 12px',
                  background: selectedNode.data.fontStyle === 'italic' ? '#3498db' : '#34495e',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  fontStyle: 'italic'
                }}
              >
                I
              </button>
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={() => {
              setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
              setSelectedNode(null);
            }}
            style={{
              width: '100%',
              padding: '8px',
              background: '#e74c3c',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            🗑️ Delete Annotation
          </button>
        </div>
      )}

      {/* Floating Panel for Regular Nodes */}
      {selectedNode && selectedNode.data?.itemType !== 'textAnnotation' && (
        <FloatingPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={updateNodeData}
          initialPosition={floatingPanelPosition}
          hardwareTypes={hardwareTypes.length > 0 ? hardwareTypes : defaultHardwareTypes}
          onManageTypes={() => setShowHardwareTypesModal(true)}
        />
      )}

      {/* Issue Panel Modal */}
      {showIssuePanel && issueNodeId && (
        <IssuePanelModal
          node={nodes.find(n => n.id === issueNodeId) || { id: issueNodeId, data: { label: 'Unknown', reqId: '' } }}
          issues={issues}
          onClose={() => {
            setShowIssuePanel(false);
            setIssueNodeId(null);
          }}
          onAddIssue={addIssue}
          onUpdateIssue={updateIssue}
          onDeleteIssue={deleteIssue}
        />
      )}

      {/* Manage Hardware Types Modal */}
      {showHardwareTypesModal && (
        <ManageHardwareTypesModal
          onClose={() => setShowHardwareTypesModal(false)}
          hardwareTypes={hardwareTypes.length > 0 ? hardwareTypes : defaultHardwareTypes}
          onAddType={addHardwareType}
          onDeleteType={deleteHardwareType}
          onUpdateType={updateHardwareType}
          onRefresh={fetchHardwareTypes}
        />
      )}

      {showChangePassword && (
          <ChangePasswordModal
            onClose={() => setShowChangePassword(false)}
            onSuccess={() => alert('Password changed successfully!')}
          />
        )}

      {/* Save Toast */}
      {showSaveToast && (
        <div style={{
          position: 'fixed',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#27ae60',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          ✅ Project saved successfully!
        </div>
      )}  

      {/* Relationship Panel for Edges */}
      {selectedEdge && showEdgePanel && !selectedNode && (
        <RelationshipPanel
          edge={selectedEdge}
          onClose={() => {
            setSelectedEdge(null);
            setShowEdgePanel(false);
          }}
          onUpdate={updateEdgeData}
          position={edgePanelPosition}
        />
      )}
      
      {/* New Object Modal */}
      {showNewObjectModal && (
        <NewObjectModal
          onClose={() => setShowNewObjectModal(false)}
          onCreate={createNewObject}
        />
      )}

      {/* Issue Manager Modal */}
      {showIssueManagerModal && (
        <IssueManagerModal
          issues={issues}
          nodes={nodes}
          onClose={() => setShowIssueManagerModal(false)}
          onIssueClick={(issue) => {
            setShowIssueManagerModal(false);
            // Optionally select the node
            const node = nodes.find(n => n.id === issue.nodeId);
            if (node) {
              setSelectedNode(node);
            }
          }}
          onUpdateIssue={(updatedIssue) => {
            updateIssue(updatedIssue.nodeId, updatedIssue.id, updatedIssue);
          }}
          onDeleteIssue={(issue) => {
            deleteIssue(issue.nodeId, issue.id);
          }}
        />
      )}

      {/* Create Issue Modal */}
      {showCreateIssueModal && createIssueNodeId && (
        <CreateIssueModal
          nodeId={createIssueNodeId}
          nodeName={nodes.find(n => n.id === createIssueNodeId)?.data?.label || 'Unknown'}
          onClose={() => {
            setShowCreateIssueModal(false);
            setCreateIssueNodeId(null);
          }}
          onCreate={(issueData) => {
            addIssue(createIssueNodeId, issueData);
            setShowCreateIssueModal(false);
            setCreateIssueNodeId(null);
          }}
        />
      )}

      {/* Component Library Panel */}
      <ComponentLibraryPanel
        isOpen={showLibraryPanel}
        onClose={() => setShowLibraryPanel(false)}
        nodes={nodes}
        libraryItems={libraryItems}
        onAddFromLibrary={addLibraryItemToCanvas}
        onSaveToLibrary={saveNodeToLibrary}
        onRefresh={fetchLibraryItems}
      />

      {/* Text Annotation Toolbar - shows when text annotation is selected */}
      {selectedNode && selectedNode.type === 'textAnnotation' && (
        <TextAnnotationToolbar
          node={selectedNode}
          onUpdate={(nodeId, key, value) => {
            setNodes(nds => nds.map(n => 
              n.id === nodeId 
                ? { ...n, data: { ...n.data, [key]: value } }
                : n
            ));
          }}
        />
      )}

      <input
      id="file-import-input"
      type="file"
      accept=".json"
      style={{ display: 'none' }}
      onChange={importProject}
    />
    </div>
  );
}
