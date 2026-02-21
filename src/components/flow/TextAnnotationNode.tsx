import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Port } from '../../types';
import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';

function TextAnnotationNode({ data, id, selected }: { data: NodeData; id: string; selected: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.text || 'Double-click to edit');
  const textareaRef = useRef<any>(null);

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
      <NodeResizer
        color="#3498db"
        isVisible={selected}
        minWidth={80}
        minHeight={30}
        onResizeEnd={(event, { width, height }) => {
          if (data.onChange) {
            data.onChange(id, 'nodeWidth', width);
            data.onChange(id, 'nodeHeight', height);
          }
        }}
        handleStyle={{
          width: '8px',
          height: '8px',
          borderRadius: '2px',
        }}
      />

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e: any) => setText(e.target.value)}
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
          background: 'var(--nl-bg-panel, #2c3e50)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          color: 'white'
        }}>
          📝 Text
        </div>
      )}

      {/* Connection handles — all 4 sides */}
      <Handle type="target" position={Position.Left} id="default-target"
        style={{ background: '#60606066', width: 6, height: 6, left: -3, border: '1.5px solid #fff' }} />
      <Handle type="source" position={Position.Right} id="default-source"
        style={{ background: '#60606066', width: 6, height: 6, right: -3, border: '1.5px solid #fff' }} />
      <Handle type="target" position={Position.Top} id="top-target"
        style={{ background: '#60606066', width: 6, height: 6, top: -3, border: '1.5px solid #fff' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-source"
        style={{ background: '#60606066', width: 6, height: 6, bottom: -3, border: '1.5px solid #fff' }} />
      <Handle type="source" position={Position.Left} id="left-source"
        style={{ background: '#60606044', width: 5, height: 5, left: -3, top: '35%', border: '1px solid #fff' }} />
      <Handle type="target" position={Position.Right} id="right-target"
        style={{ background: '#60606044', width: 5, height: 5, right: -3, top: '35%', border: '1px solid #fff' }} />
      <Handle type="source" position={Position.Top} id="top-source"
        style={{ background: '#60606044', width: 5, height: 5, top: -3, left: '60%', border: '1px solid #fff' }} />
      <Handle type="target" position={Position.Bottom} id="bottom-target"
        style={{ background: '#60606044', width: 5, height: 5, bottom: -3, left: '60%', border: '1px solid #fff' }} />
    </div>
  );
}

export default TextAnnotationNode;
