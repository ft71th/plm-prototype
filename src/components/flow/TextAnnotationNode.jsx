import React, { useState, useEffect, useRef } from 'react';
import { NodeResizer } from '@reactflow/node-resizer';

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

export default TextAnnotationNode;
