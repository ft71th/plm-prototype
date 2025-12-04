import { useCallback, useState, useEffect, useMemo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  Handle,
  Position,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import * as XLSX from 'xlsx';

// Keyboard shortcuts

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
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const relType = RELATIONSHIP_TYPES[data?.relationType || 'related'];
  
  const getStrokeDasharray = () => {
    if (relType.style === 'dashed') return '8 4';
    if (relType.style === 'dotted') return '2 2';
    return '0';
  };

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          stroke: relType.color,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: getStrokeDasharray(),
          fill: 'none',
          cursor: 'pointer',
        }}
        markerEnd={`url(#arrow-${data?.relationType || 'related'})`}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: '#2c3e50',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            color: relType.color,
            border: `1px solid ${relType.color}`,
            pointerEvents: 'all',
            cursor: 'pointer',
            boxShadow: selected ? `0 0 8px ${relType.color}` : '0 2px 4px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          className="nodrag nopan"
        >
          {relType.label}
          {data?.notes && (
            <span style={{ fontSize: '8px' }}>📝</span>
          )}
        </div>
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
    if (data.reqType === 'customer') return '#9b59b6';
    if (data.reqType === 'platform') return '#3498db';
    if (data.reqType === 'project') return '#e67e22';
    if (data.reqType === 'implementation') return '#16a085';
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

  const getSystemAccentColor = () => {
    if (data.itemType === 'system' || data.type === 'system') return '#1abc9c';
    if (data.itemType === 'subsystem' || data.type === 'subsystem') return '#3498db';
    if (data.itemType === 'function' || data.type === 'function') return '#00bcd4';
    if (data.itemType === 'testcase' || data.type === 'testcase') return '#27ae60';
    if (data.itemType === 'testrun' || data.type === 'testrun') return '#e67e22';
    if (data.itemType === 'testresult' || data.type === 'testresult') return '#9b59b6';
    return '#95a5a6';
  };

  const getItemTypeLabel = () => {
    if (data.itemType === 'system' || data.type === 'system') return 'SYSTEM';
    if (data.itemType === 'subsystem' || data.type === 'subsystem') return 'SUB-SYSTEM';
    if (data.itemType === 'function' || data.type === 'function') return 'FUNCTION';
    if (data.itemType === 'testcase' || data.type === 'testcase') return 'TEST CASE';
    if (data.itemType === 'testrun' || data.type === 'testrun') return 'TEST RUN';
    if (data.itemType === 'testresult' || data.type === 'testresult') return 'TEST RESULT';
    return null;
  };

  const getItemTypeIcon = () => {
    if (data.itemType === 'system' || data.type === 'system') return '🔷';
    if (data.itemType === 'subsystem' || data.type === 'subsystem') return '🔶';
    if (data.itemType === 'function' || data.type === 'function') return '⚡';
    if (data.itemType === 'testcase' || data.type === 'testcase') return '🧪';
    if (data.itemType === 'testrun' || data.type === 'testrun') return '▶️';
    if (data.itemType === 'testresult' || data.type === 'testresult') return '✅';
    return null;
  };

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

  return (
    <div style={{
      padding: '15px',
      paddingLeft: (isSystemItem() || isTestItem()) ? '20px' : '15px',
      borderRadius: '8px',
      border: '3px solid ' + getBorderColor(),
      borderLeft: (isSystemItem() || isTestItem()) ? `6px solid ${getSystemAccentColor()}` : '3px solid ' + getBorderColor(),
      backgroundColor: (isSystemItem() || isTestItem()) ? '#1a2634' : '#2c3e50',
      color: 'white',
      minWidth: '200px',
      maxWidth: '280px',
      boxShadow: selected ? '0 0 0 3px #f39c12' : (isHighlighted ? '0 0 0 4px #f1c40f, 0 0 20px rgba(241,196,15,0.6)' : '0 4px 6px rgba(0,0,0,0.3)'),
      position: 'relative',
      opacity: data.isFiltered === false ? 0.3 : 1,
      transition: 'all 0.2s ease'
    }}>
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#555', width: 12, height: 12 }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ background: '#555', width: 12, height: 12 }}
      />
      
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
          backgroundColor: (isSystemItem() || isTestItem()) ? getSystemAccentColor() : getReqTypeColor(),
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
      
 {isEditing ? (
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
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
      
      {!isEditing && data.description && (
        <div style={{
          fontSize: '11px',
          color: '#bdc3c7',
          fontStyle: 'italic',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {data.description}
        </div>
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

// Enhanced Floating Panel for nodes
function FloatingPanel({ node, onClose, onUpdate, initialPosition }) {
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
                  node.data.itemType === 'function' ? 'Function' : 'Requirement'}
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
             node.data.itemType === 'function' ? 'Function ID' : 'Requirement ID'}
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

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Title
          </label>
          <div style={{
            padding: '8px',
            background: '#34495e',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {node.data.label}
          </div>
          <div style={{ fontSize: '9px', color: '#95a5a6', marginTop: '4px' }}>
            {isEditable ? 'Double-click node to edit' : 'Cannot edit - requirement is frozen/released'}
          </div>
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

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
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
              padding: '8px',
              background: isEditable ? '#34495e' : '#2c3e50',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: isEditable ? 'pointer' : 'not-allowed'
            }}
          >
            <option value="customer">🟣 Customer Requirement</option>
            <option value="platform">🔷 Platform Requirement</option>
            <option value="project">🔶 Project Requirement</option>
            <option value="implementation">🟢 Implementation Requirement</option>
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
            Classification
          </label>
          <select
            value={node.data.classification || 'requirement'}
            onChange={(e) => onUpdate(node.id, 'classification', e.target.value)}
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
            <option value="need">🎯 Need (High-level goal)</option>
            <option value="capability">⚙️ Capability (System ability)</option>
            <option value="requirement">📋 Requirement (Specific spec)</option>
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
          <textarea
            value={node.data.description || ''}
            onChange={(e) => onUpdate(node.id, 'description', e.target.value)}
            placeholder="Add description..."
            disabled={!isEditable}
            style={{
              width: '100%',
              minHeight: '80px',
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
      attachment: null
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
      attachment: null
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
      attachment: null
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
      attachment: null
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
      attachment: null
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
      attachment: null
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
      attachment: null
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
      attachment: null
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
      attachment: null
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
      attachment: null
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

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [nodeId, setNodeId] = useState(6);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [floatingPanelPosition, setFloatingPanelPosition] = useState({ x: 0, y: 0 });
  const [edgePanelPosition, setEdgePanelPosition] = useState({ x: 0, y: 0 });
  
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedo, setIsUndoRedo] = useState(false);

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
      default: // project
        const prjId = `PRJ-${String(prjIdCounter).padStart(3, '0')}`;
        setPrjIdCounter(c => c + 1);
        return prjId;
    }
  }, [sysIdCounter, subIdCounter, funIdCounter, tcIdCounter, cusIdCounter, pltIdCounter, prjIdCounter, impIdCounter]);

  const stats = useMemo(() => {
    const total = nodes.length;
    const stateOpen = nodes.filter(n => n.data.state === 'open' || !n.data.state).length;
    const stateFrozen = nodes.filter(n => n.data.state === 'frozen').length;
    const stateReleased = nodes.filter(n => n.data.state === 'released').length;
    const connections = edges.length;
    
    const relationshipCounts = {};
    edges.forEach(e => {
      const type = e.data?.relationType || 'related';
      relationshipCounts[type] = (relationshipCounts[type] || 0) + 1;
    });
    
    return { total, stateOpen, stateFrozen, stateReleased, connections, relationshipCounts };
  }, [nodes, edges]);

  const onConnect = useCallback((params) => {
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
    const relationType = inferRelationshipType(sourceNode, targetNode);
    
    const newEdge = {
      ...params,
      type: 'custom',
      data: { relationType, notes: '' },
    };
    
    setEdges((eds) => addEdge(newEdge, eds));
  }, [nodes, setEdges]);

  const handleNodeLabelChange = useCallback((nodeId, newLabel) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          if (node.data.state === 'frozen' || node.data.state === 'released') {
            return node;
          }
          return { ...node, data: { ...node.data, label: newLabel } };
        }
        return node;
      })
    );
  }, [setNodes]);

  const handleNodeClick = useCallback((event, node) => {
    setSelectedEdge(null);
    const rect = event.target.getBoundingClientRect();
    const newX = rect.right + 20;
    const newY = rect.top;
    
    const adjustedX = newX + 360 > window.innerWidth ? rect.left - 380 : newX;
    const adjustedY = newY + 500 > window.innerHeight ? window.innerHeight - 520 : newY;
    
    setFloatingPanelPosition({ x: adjustedX, y: Math.max(10, adjustedY) });
    setSelectedNode(node);
  }, []);

  const handleEdgeClick = useCallback((event, edge) => {
    setSelectedNode(null);
    setEdgePanelPosition({ x: event.clientX, y: event.clientY });
    setSelectedEdge(edge);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const updateNodeData = (nodeId, field, value) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, [field]: value } };
        }
        return node;
      })
    );
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, [field]: value } });
    }
  };

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

      return {
        ...node,
        data: { ...node.data, isFiltered, isHighlighted, onChange: handleNodeLabelChange },
      };
    });
  }, [nodes, searchText, typeFilter, statusFilter, priorityFilter, stateFilter, reqTypeFilter, classificationFilter, handleNodeLabelChange]);

  const filteredCount = processedNodes.filter(n => n.data.isFiltered).length;

const addPlatformNode = useCallback(() => {
    const reqId = generateItemId ('platform');
    const newNode = {
      id: String(nodeId),
      type: 'custom',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
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
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  }, [nodeId, handleNodeLabelChange, setNodes, generateItemId ]);

 const addRequirementNode = useCallback(() => {
    const reqId = generateItemId ('project');
    const newNode = {
      id: String(nodeId),
      type: 'custom',
      position: { x: Math.random() * 400 + 300, y: Math.random() * 400 },
      data: { 
        label: 'New Requirement', 
        type: 'project',
        reqType: 'project',
        reqId: reqId,
        version: '1.0',
        classification: 'requirement',
        description: '',
        priority: 'medium',
        status: 'new',
        state: 'open',
        owner: '',
        attachment: null,
        onChange: handleNodeLabelChange
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  }, [nodeId, handleNodeLabelChange, setNodes, generateItemId ]);

  const addSystemNode = useCallback(() => {
    const itemId = generateItemId('system');
    const newNode = {
      id: String(nodeId),
      type: 'custom',
      position: { x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 },
      data: { 
        label: 'New System', 
        type: 'system',
        itemType: 'system',
        reqId: itemId,
        version: '1.0',
        classification: 'system',
        description: '',
        rationale: '',
        priority: 'high',
        status: 'new',
        state: 'open',
        owner: '',
        attachment: null,
        onChange: handleNodeLabelChange
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  }, [nodeId, handleNodeLabelChange, setNodes, generateItemId]);

  const addSubSystemNode = useCallback(() => {
    const itemId = generateItemId('subsystem');
    const newNode = {
      id: String(nodeId),
      type: 'custom',
      position: { x: Math.random() * 300 + 200, y: Math.random() * 200 + 150 },
      data: { 
        label: 'New Sub-System', 
        type: 'subsystem',
        itemType: 'subsystem',
        reqId: itemId,
        version: '1.0',
        classification: 'subsystem',
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
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  }, [nodeId, handleNodeLabelChange, setNodes, generateItemId]);

  const addFunctionNode = useCallback(() => {
    const itemId = generateItemId('function');
    const newNode = {
      id: String(nodeId),
      type: 'custom',
      position: { x: Math.random() * 300 + 350, y: Math.random() * 200 + 250 },
      data: { 
        label: 'New Function', 
        type: 'function',
        itemType: 'function',
        reqId: itemId,
        version: '1.0',
        classification: 'function',
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
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  }, [nodeId, handleNodeLabelChange, setNodes, generateItemId]);

  const addTestCaseNode = useCallback(() => {
    const itemId = generateItemId('testcase');
    const newNode = {
      id: String(nodeId),
      type: 'custom',
      position: { x: Math.random() * 300 + 500, y: Math.random() * 200 + 350 },
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
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  }, [nodeId, handleNodeLabelChange, setNodes, generateItemId]);

  const exportProject = useCallback(() => {
    const project = { 
      objectName,
      objectVersion,
      objectDescription,
      nodes, 
      edges 
    };
    const dataStr = JSON.stringify(project, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plm-project.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, objectName, objectVersion, objectDescription]);

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
    setTcIdCounter(1);
    setSubIdCounter(1);
    setFunIdCounter(1);
    setHistory([]);
    setHistoryIndex(-1);
  };

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

  // Expose duplicateNode to window for FloatingPanel button
  useEffect(() => {
    window.duplicateNodeFunction = duplicateNode;
    return () => {
      delete window.duplicateNodeFunction;
    };
  }, [duplicateNode]);

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
        if (selectedNode) {
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

      // Ctrl+S = Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        exportProject();
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
          
          // Load nodes and edges
          setNodes(project.nodes || []);
          setEdges(project.edges || []);
          
          // Calculate max node ID
          const maxId = Math.max(...(project.nodes || []).map(n => parseInt(n.id) || 0), 0);
          setNodeId(maxId + 1);
          
          // Calculate max requirement IDs for each type
          let maxCus = 0, maxPlt = 0, maxPrj = 0, maxImp = 0;
          let maxSys = 0, maxSub = 0, maxFun = 0;
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
          });
          setCusIdCounter(maxCus + 1);
          setPltIdCounter(maxPlt + 1);
          setPrjIdCounter(maxPrj + 1);
          setImpIdCounter(maxImp + 1);
          setSysIdCounter(maxSys + 1);
          setSubIdCounter(maxSub + 1);
          setFunIdCounter(maxFun + 1);
          
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

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1e1e1e', position: 'relative' }}>
      {/* Arrow markers for different relationship types */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          {Object.entries(RELATIONSHIP_TYPES).map(([key, value]) => (
            <marker
              key={key}
              id={`arrow-${key}`}
              viewBox="0 0 20 20"
              refX="20"
              refY="10"
              markerWidth="10"
              markerHeight="10"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 20 10 L 0 20 z" fill={value.color} />
            </marker>
          ))}
        </defs>
      </svg>

      <div style={{
        position: 'absolute',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #1a252f 0%, #2C3E50 100%)',
        color: 'white',
        borderRadius: 10,
        boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        border: '1px solid #3d5a73'
      }}>
        <div>
          <div style={{ fontSize: '10px', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Object Definition
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            🚢 {objectName}
          </div>
        </div>
        <div style={{
          width: '1px',
          height: '35px',
          background: '#4a5f7f'
        }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#7f8c8d' }}>Version</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#3498db' }}>{objectVersion}</div>
        </div>
        <button
          onClick={() => setShowNewObjectModal(true)}
          style={{
            padding: '8px 12px',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold'
          }}
        >
          + New Object
        </button>
      </div>
      
      {/* Search and Filter Bar */}
      <div style={{
        position: 'absolute',
        top: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        background: '#34495e',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        flexWrap: 'wrap',
        maxWidth: '95vw',
        justifyContent: 'center'
      }}>
        <input
          type="text"
          placeholder="🔍 Search..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            padding: '8px 12px',
            background: '#2c3e50',
            color: 'white',
            border: '1px solid #4a5f7f',
            borderRadius: '4px',
            fontSize: '13px',
            width: '140px',
            outline: 'none'
          }}
        />
        
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={{
          padding: '8px', background: '#2c3e50', color: 'white',
          border: '1px solid #4a5f7f', borderRadius: '4px', fontSize: '12px', cursor: 'pointer'
        }}>
          <option value="all">All States</option>
          <option value="open">📝 Open</option>
          <option value="frozen">🔒 Frozen</option>
          <option value="released">✅ Released</option>
        </select>

        <select value={reqTypeFilter} onChange={(e) => setReqTypeFilter(e.target.value)} style={{
          padding: '8px', background: '#2c3e50', color: 'white',
          border: '1px solid #4a5f7f', borderRadius: '4px', fontSize: '12px', cursor: 'pointer'
        }}>
          <option value="all">All Req Types</option>
          <option value="customer">🟣 Customer</option>
          <option value="platform">🔷 Platform</option>
          <option value="project">🔶 Project</option>
          <option value="implementation">🟢 Implementation</option>
        </select>

        <select value={classificationFilter} onChange={(e) => setClassificationFilter(e.target.value)} style={{
          padding: '8px', background: '#2c3e50', color: 'white',
          border: '1px solid #4a5f7f', borderRadius: '4px', fontSize: '12px', cursor: 'pointer'
        }}>
          <option value="all">All Classes</option>
          <option value="need">🎯 Need</option>
          <option value="capability">⚙️ Capability</option>
          <option value="requirement">📋 Requirement</option>
        </select>
        
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{
          padding: '8px', background: '#2c3e50', color: 'white',
          border: '1px solid #4a5f7f', borderRadius: '4px', fontSize: '12px', cursor: 'pointer'
        }}>
          <option value="all">All Priority</option>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
        
        <div style={{
          padding: '8px 12px',
          background: '#2c3e50',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#bdc3c7',
          fontWeight: 'bold'
        }}>
          {filteredCount} / {nodes.length}
        </div>
        
        {(searchText || stateFilter !== 'all' || reqTypeFilter !== 'all' || classificationFilter !== 'all' || priorityFilter !== 'all') && (
          <button onClick={clearFilters} style={{
            padding: '8px 12px', background: '#e74c3c', color: 'white',
            border: 'none', borderRadius: '4px', cursor: 'pointer',
            fontSize: '11px', fontWeight: 'bold'
          }}>
            Clear All
          </button>
        )}
      </div>

      {/* Statistics Panel */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        background: '#2c3e50',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        color: 'white',
        minWidth: '240px'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '12px',
          borderBottom: '2px solid #34495e',
          paddingBottom: '8px'
        }}>
          📊 Statistics
        </div>
        
        <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Requirements:</span>
            <span style={{ fontWeight: 'bold' }}>{stats.total}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>📝 Open:</span>
            <span style={{ fontWeight: 'bold' }}>{stats.stateOpen}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>🔒 Frozen:</span>
            <span style={{ fontWeight: 'bold' }}>{stats.stateFrozen}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>✅ Released:</span>
            <span style={{ fontWeight: 'bold' }}>{stats.stateReleased}</span>
          </div>
          
          <div style={{ borderTop: '1px solid #34495e', marginTop: '10px', paddingTop: '10px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>🔗 Relationships ({stats.connections})</div>
            {Object.entries(stats.relationshipCounts).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: RELATIONSHIP_TYPES[type]?.color || '#95a5a6' }}>
                  {RELATIONSHIP_TYPES[type]?.label || type}:
                </span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <ReactFlow
        nodes={processedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        deleteKeyCode="Delete"
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} color="#444" />
        
        <Panel position="top-left">
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={addSystemNode} style={{
                padding: '8px 12px', background: '#1abc9c', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                🔷 System
              </button>
              <button onClick={addSubSystemNode} style={{
                padding: '8px 12px', background: '#3498db', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                🔶 Sub-Sys
              </button>
              <button onClick={addFunctionNode} style={{
                padding: '8px 12px', background: '#00bcd4', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                ⚡ Function
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={addTestCaseNode} style={{
                padding: '8px 12px', background: '#27ae60', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                🧪 Test Case
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={addPlatformNode} style={{
                padding: '8px 12px', background: '#9b59b6', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                + Platform
              </button>
              <button onClick={addRequirementNode} style={{
                padding: '8px 12px', background: '#e67e22', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                + Requirement
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={exportProject} style={{
                padding: '8px 16px', background: '#27ae60', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                💾 Save
              </button>
              <label style={{
                padding: '8px 16px', background: '#9b59b6', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                display: 'inline-block'
              }}>
                📂 Load
                <input type="file" accept=".json" onChange={importProject} style={{ display: 'none' }} />
              </label>
              <button onClick={exportToExcel} style={{
                padding: '8px 16px', background: '#16a085', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                📊 Excel
              </button>
            </div>
            
            <div style={{
              background: '#2c3e50',
              padding: '10px',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#bdc3c7'
            }}>
              💡 <strong>Smart Relationships:</strong><br/>
              Connect nodes → Auto-detects relationship type!<br/>
              Click relationship label → Change type manually
            </div>

            <div style={{
              background: '#2c3e50',
              padding: '8px 10px',
              borderRadius: '6px',
              fontSize: '10px',
              color: '#bdc3c7',
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}>
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                style={{
                  padding: '4px 8px',
                  background: historyIndex <= 0 ? '#34495e' : '#3498db',
                  color: historyIndex <= 0 ? '#666' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
              >
                ⏪ Undo
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                style={{
                  padding: '4px 8px',
                  background: historyIndex >= history.length - 1 ? '#34495e' : '#3498db',
                  color: historyIndex >= history.length - 1 ? '#666' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
              >
                Redo ⏩
              </button>
              <span style={{ fontSize: '9px', color: '#7f8c8d' }}>
                Ctrl+Z / Ctrl+Y
              </span>
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {selectedNode && (
        <FloatingPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={updateNodeData}
          initialPosition={floatingPanelPosition}
        />
      )}

      {selectedEdge && (
        <RelationshipPanel
          edge={selectedEdge}
          onClose={() => setSelectedEdge(null)}
          onUpdate={updateEdgeData}
          position={edgePanelPosition}
        />
      )}
      
      {showNewObjectModal && (
        <NewObjectModal
          onClose={() => setShowNewObjectModal(false)}
          onCreate={createNewObject}
        />
      )}
    </div>
  );
}