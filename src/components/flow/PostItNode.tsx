import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';

const POST_IT_COLORS = [
  { id: 'yellow',  bg: '#fff9c4', border: '#f9e547', label: 'Gul' },
  { id: 'pink',    bg: '#f8bbd0', border: '#e91e63', label: 'Rosa' },
  { id: 'green',   bg: '#c8e6c9', border: '#4caf50', label: 'Grön' },
  { id: 'blue',    bg: '#bbdefb', border: '#2196f3', label: 'Blå' },
  { id: 'orange',  bg: '#ffe0b2', border: '#ff9800', label: 'Orange' },
  { id: 'purple',  bg: '#e1bee7', border: '#9c27b0', label: 'Lila' },
];

interface PostItNodeData {
  text?: string;
  postItColor?: string;
  nodeWidth?: number;
  nodeHeight?: number;
  fontSize?: number;
  onChange?: (id: string, field: string, value: unknown) => void;
  itemType?: string;
}

function PostItNode({ data, id, selected }: { data: PostItNodeData; id: string; selected: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.text || '');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const colorId = data.postItColor || 'yellow';
  const color = POST_IT_COLORS.find(c => c.id === colorId) || POST_IT_COLORS[0];
  const width = data.nodeWidth || 180;
  const height = data.nodeHeight || 140;
  const fontSize = data.fontSize || 13;

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  // Sync external data changes
  useEffect(() => {
    if (!isEditing && data.text !== undefined) {
      setText(data.text);
    }
  }, [data.text, isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setShowColorPicker(false);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onChange) {
      data.onChange(id, 'text', text);
    }
  };

  const handleColorChange = (newColorId: string) => {
    if (data.onChange) {
      data.onChange(id, 'postItColor', newColorId);
    }
    setShowColorPicker(false);
  };

  return (
    <div
      style={{
        width,
        height,
        background: color.bg,
        borderRadius: '2px',
        border: `1px solid ${color.border}`,
        boxShadow: selected
          ? `0 2px 12px rgba(0,0,0,0.2), 3px 3px 0 ${color.border}40`
          : '2px 2px 6px rgba(0,0,0,0.1), 3px 3px 0 rgba(0,0,0,0.05)',
        position: 'relative',
        cursor: 'default',
        fontFamily: "'Segoe UI', 'Comic Sans MS', cursive, sans-serif",
        display: 'flex',
        flexDirection: 'column' as const,
        // Tape effect
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Resize handle */}
      <NodeResizer
        color={color.border}
        isVisible={selected}
        minWidth={100}
        minHeight={80}
        onResizeEnd={(_event, { width: w, height: h }) => {
          if (data.onChange) {
            data.onChange(id, 'nodeWidth', w);
            data.onChange(id, 'nodeHeight', h);
          }
        }}
        handleStyle={{ width: '8px', height: '8px', borderRadius: '2px' }}
      />

      {/* Tape decoration at top */}
      <div style={{
        position: 'absolute',
        top: '-8px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '40px',
        height: '16px',
        background: 'rgba(255,255,255,0.5)',
        borderRadius: '2px',
        border: '1px solid rgba(0,0,0,0.08)',
      }} />

      {/* Color picker button (top-right) */}
      {selected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowColorPicker(!showColorPicker);
          }}
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            border: `2px solid ${color.border}`,
            background: color.bg,
            cursor: 'pointer',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
          title="Byt färg"
        >
          🎨
        </button>
      )}

      {/* Color picker dropdown */}
      {showColorPicker && (
        <div
          style={{
            position: 'absolute',
            top: '30px',
            right: '4px',
            display: 'flex',
            gap: '4px',
            padding: '6px',
            background: '#fff',
            borderRadius: '6px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
            zIndex: 20,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {POST_IT_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => handleColorChange(c.id)}
              title={c.label}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: c.id === colorId ? `2px solid ${c.border}` : '2px solid #ddd',
                background: c.bg,
                cursor: 'pointer',
                transform: c.id === colorId ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      )}

      {/* Text content */}
      <div style={{
        flex: 1,
        padding: '16px 10px 8px',
        overflow: 'hidden',
      }}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleBlur();
            }}
            style={{
              width: '100%',
              height: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: `${fontSize}px`,
              color: '#333',
              fontFamily: 'inherit',
              lineHeight: '1.5',
            }}
          />
        ) : (
          <div
            style={{
              fontSize: `${fontSize}px`,
              color: '#333',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: '1.5',
              minHeight: '20px',
              opacity: text ? 1 : 0.4,
            }}
          >
            {text || 'Dubbelklicka för att skriva...'}
          </div>
        )}
      </div>

      {/* Type badge */}
      {selected && !isEditing && (
        <div style={{
          position: 'absolute',
          bottom: '-22px',
          left: '0',
          display: 'flex',
          gap: '4px',
          background: '#2c3e50',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          color: 'white',
        }}>
          📌 Post-it
        </div>
      )}
      {/* Connection handles — all 4 sides */}
      <Handle type="target" position={Position.Left} id="default-target"
        style={{ background: color.border, width: 8, height: 8, left: -4, border: '2px solid #fff' }} />
      <Handle type="source" position={Position.Right} id="default-source"
        style={{ background: color.border, width: 8, height: 8, right: -4, border: '2px solid #fff' }} />
      <Handle type="target" position={Position.Top} id="top-target"
        style={{ background: color.border, width: 8, height: 8, top: -4, border: '2px solid #fff' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-source"
        style={{ background: color.border, width: 8, height: 8, bottom: -4, border: '2px solid #fff' }} />
      <Handle type="source" position={Position.Left} id="left-source"
        style={{ background: `${color.border}66`, width: 6, height: 6, left: -3, top: '35%', border: '1.5px solid #fff' }} />
      <Handle type="target" position={Position.Right} id="right-target"
        style={{ background: `${color.border}66`, width: 6, height: 6, right: -3, top: '35%', border: '1.5px solid #fff' }} />
      <Handle type="source" position={Position.Top} id="top-source"
        style={{ background: `${color.border}66`, width: 6, height: 6, top: -3, left: '60%', border: '1.5px solid #fff' }} />
      <Handle type="target" position={Position.Bottom} id="bottom-target"
        style={{ background: `${color.border}66`, width: 6, height: 6, bottom: -3, left: '60%', border: '1.5px solid #fff' }} />
    </div>
  );
}

export { POST_IT_COLORS };
export default PostItNode;
