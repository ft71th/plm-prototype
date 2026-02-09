import React, { useState, useEffect, useRef } from 'react';
import { getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { RELATIONSHIP_TYPES } from '../../constants/relationships';

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

export default CustomEdge;
