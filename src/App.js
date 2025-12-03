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

// Keyboard shortcuts

// Relationship type definitions
const RELATIONSHIP_TYPES = {
  addresses: { label: 'Addresses', color: '#27ae60', style: 'solid' },
  implements: { label: 'Implements', color: '#3498db', style: 'solid' },
  satisfies: { label: 'Satisfies', color: '#9b59b6', style: 'solid' },
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
  const sourceType = sourceNode?.data?.type || 'project';
  const targetType = targetNode?.data?.type || 'project';

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
  
  // Platform → Platform with implementation = Implements
  if (sourceReqType === 'implementation' && targetClass === 'requirement') {
    return 'implements';
  }
  
  // Same classification = Related or Derives
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
          }}
          className="nodrag nopan"
        >
          {relType.label}
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
      borderRadius: '8px',
      border: '3px solid ' + getBorderColor(),
      backgroundColor: '#2c3e50',
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
          backgroundColor: getReqTypeColor(),
          color: 'white',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          {data.reqType || 'project'}
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
              fontFamily: 'monospace'
            }}>
              {data.reqId}
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
    <div style={{
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
          onChange={(e) => onUpdate(edge.id, e.target.value)}
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
            onClick={() => onUpdate(edge.id, key)}
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
        left: position.x + 'px',
        top: position.y + 'px',
        width: '360px',
        background: '#2c3e50',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 2000,
        color: 'white',
        userSelect: isDragging ? 'none' : 'auto',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
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
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Edit Requirement</span>
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
          }}
        >
          ×
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
            Requirement ID
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
  { 
    id: '1', 
    type: 'custom',
    position: { x: 100, y: 150 }, 
    data: { 
      label: 'High-Speed Motor Control', 
      type: 'platform',
      reqType: 'customer',
      reqId: 'CUS-001',
      classification: 'need',
      description: 'Customer needs high-performance motor control system',
      priority: 'high',
      status: 'done',
      state: 'released',
      owner: 'Customer A',
      attachment: null
    }
  },
  { 
    id: '2', 
    type: 'custom',
    position: { x: 450, y: 100 }, 
    data: { 
      label: 'Variable Speed Control', 
      type: 'platform',
      reqType: 'platform',
      reqId: 'PLT-001',
      classification: 'capability',
      description: 'System shall support variable speed from 0-100%',
      priority: 'high',
      status: 'in-progress',
      state: 'open',
      owner: 'Engineering Team',
      attachment: null
    }
  },
  { 
    id: '3', 
    type: 'custom',
    position: { x: 800, y: 100 }, 
    data: { 
      label: 'PWM Control Algorithm', 
      type: 'project',
      reqType: 'project',
      reqId: 'PRJ-001',
      classification: 'requirement',
      description: 'Implement PWM with 10kHz frequency',
      priority: 'high',
      status: 'new',
      state: 'open',
      owner: 'Fredrik',
      attachment: null
    }
  },
  { 
    id: '4', 
    type: 'custom',
    position: { x: 450, y: 280 }, 
    data: { 
      label: 'Safety Stop Function', 
      type: 'platform',
      reqType: 'platform',
      reqId: 'PLT-002',
      classification: 'capability',
      description: 'Emergency stop within 2 seconds',
      priority: 'high',
      status: 'new',
      state: 'frozen',
      owner: 'Safety Team',
      attachment: null
    }
  },
  { 
    id: '5', 
    type: 'custom',
    position: { x: 800, y: 280 }, 
    data: { 
      label: 'Hardware Interrupt Handler', 
      type: 'project',
      reqType: 'implementation',
      reqId: 'IMP-001',
      classification: 'requirement',
      description: 'Implement interrupt-based stop signal',
      priority: 'medium',
      status: 'new',
      state: 'open',
      owner: 'Dev Team',
      attachment: null
    }
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', type: 'custom', data: { relationType: 'addresses' } },
  { id: 'e1-4', source: '1', target: '4', type: 'custom', data: { relationType: 'addresses' } },
  { id: 'e2-3', source: '2', target: '3', type: 'custom', data: { relationType: 'implements' } },
  { id: 'e4-5', source: '4', target: '5', type: 'custom', data: { relationType: 'implements' } },
];



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

  const [cusIdCounter, setCusIdCounter] = useState(2);  // CUS-001 exists
  const [pltIdCounter, setPltIdCounter] = useState(3);  // PLT-001, PLT-002 exist
  const [prjIdCounter, setPrjIdCounter] = useState(2);  // PRJ-001 exists
  const [impIdCounter, setImpIdCounter] = useState(2);  // IMP-001 exists

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

  // Generate requirement ID based on type
  const generateReqId = useCallback((reqType) => {
    switch (reqType) {
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
  }, [cusIdCounter, pltIdCounter, prjIdCounter, impIdCounter]);

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
      data: { relationType },
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

  const updateEdgeRelationType = (edgeId, relationType) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === edgeId) {
          return { ...edge, data: { ...edge.data, relationType } };
        }
        return edge;
      })
    );
    setSelectedEdge(null);
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
    const reqId = generateReqId('platform');
    const newNode = {
      id: String(nodeId),
      type: 'custom',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: 'New Platform Component', 
        type: 'platform',
        reqType: 'platform',
        reqId: reqId,
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
  }, [nodeId, handleNodeLabelChange, setNodes, generateReqId]);

 const addRequirementNode = useCallback(() => {
    const reqId = generateReqId('project');
    const newNode = {
      id: String(nodeId),
      type: 'custom',
      position: { x: Math.random() * 400 + 300, y: Math.random() * 400 },
      data: { 
        label: 'New Requirement', 
        type: 'project',
        reqType: 'project',
        reqId: reqId,
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
  }, [nodeId, handleNodeLabelChange, setNodes, generateReqId]);

  const exportProject = useCallback(() => {
    const project = { nodes, edges };
    const dataStr = JSON.stringify(project, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plm-project.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

 const duplicateNode = useCallback((nodeToDuplicate) => {
    if (!nodeToDuplicate) return;
    
    const reqId = generateReqId(nodeToDuplicate.data.reqType || 'project');
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
  }, [nodeId, handleNodeLabelChange, setNodes, generateReqId]);

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
          setNodes(project.nodes || []);
          setEdges(project.edges || []);
          
          // Calculate max node ID
          const maxId = Math.max(...project.nodes.map(n => parseInt(n.id) || 0), 0);
          setNodeId(maxId + 1);
          
          // Calculate max requirement IDs for each type
          let maxCus = 0, maxPlt = 0, maxPrj = 0, maxImp = 0;
          project.nodes.forEach(n => {
            const reqId = n.data?.reqId || '';
            const num = parseInt(reqId.split('-')[1]) || 0;
            if (reqId.startsWith('CUS')) maxCus = Math.max(maxCus, num);
            if (reqId.startsWith('PLT')) maxPlt = Math.max(maxPlt, num);
            if (reqId.startsWith('PRJ')) maxPrj = Math.max(maxPrj, num);
            if (reqId.startsWith('IMP')) maxImp = Math.max(maxImp, num);
          });
          setCusIdCounter(maxCus + 1);
          setPltIdCounter(maxPlt + 1);
          setPrjIdCounter(maxPrj + 1);
          setImpIdCounter(maxImp + 1);
          
          setSelectedNode(null);
          setSelectedEdge(null);
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
        padding: '10px 20px',
        background: '#2C3E50',
        color: 'white',
        borderRadius: 8,
        fontSize: 20,
        fontWeight: 'bold',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
      }}>
        PLM Prototype - Smart Relationships 🧠
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
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={addPlatformNode} style={{
                padding: '10px 20px', background: '#3498db', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                + Platform
              </button>
              <button onClick={addRequirementNode} style={{
                padding: '10px 20px', background: '#e67e22', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                + Requirement
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
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
          onUpdate={updateEdgeRelationType}
          position={edgePanelPosition}
        />
      )}
    </div>
  );
}