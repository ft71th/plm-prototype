import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';

interface ImageNodeData {
  src: string;
  label?: string;
  nodeWidth?: number;
  nodeHeight?: number;
  onChange?: (id: string, field: string, value: unknown) => void;
  itemType?: string;
}

function ImageNode({ data, id, selected }: { data: ImageNodeData; id: string; selected: boolean }) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [label, setLabel] = useState(data.label || '');

  const width = data.nodeWidth || 300;
  const height = data.nodeHeight || 200;

  const handleLabelBlur = () => {
    setIsEditingLabel(false);
    if (data.onChange) {
      data.onChange(id, 'label', label);
    }
  };

  return (
    <div
      style={{
        width,
        height: height + (label || isEditingLabel ? 28 : 0),
        background: '#fff',
        borderRadius: '6px',
        border: selected ? '2px solid #3498db' : '1px solid #ddd',
        boxShadow: selected ? '0 0 8px rgba(52,152,219,0.3)' : '0 1px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <NodeResizer
        color="#3498db"
        isVisible={selected}
        minWidth={80}
        minHeight={60}
        onResizeEnd={(_event, { width: w, height: h }) => {
          if (data.onChange) {
            data.onChange(id, 'nodeWidth', w);
            data.onChange(id, 'nodeHeight', h - (label || isEditingLabel ? 28 : 0));
          }
        }}
        handleStyle={{ width: '8px', height: '8px', borderRadius: '2px' }}
      />

      {/* Image */}
      <img
        src={data.src}
        alt={label || 'Pasted image'}
        style={{
          width: '100%',
          height: height,
          objectFit: 'contain',
          display: 'block',
          background: '#f8f8f8',
          pointerEvents: 'none',
        }}
        draggable={false}
      />

      {/* Optional label below image */}
      <div
        style={{
          padding: '4px 8px',
          fontSize: '11px',
          color: '#555',
          textAlign: 'center',
          borderTop: '1px solid #eee',
          background: '#fafafa',
          cursor: 'text',
          minHeight: '20px',
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditingLabel(true);
        }}
      >
        {isEditingLabel ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleLabelBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') handleLabelBlur();
            }}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              textAlign: 'center',
              fontSize: '11px',
              color: '#555',
            }}
          />
        ) : (
          <span style={{ opacity: label ? 1 : 0.4 }}>
            {label || (selected ? 'Double-click to add caption' : '')}
          </span>
        )}
      </div>

      {/* Handles for connections — all 4 sides */}
      <Handle type="target" position={Position.Left} id="default-target" style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} id="default-source" style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="target" position={Position.Top} id="top-target" style={{ background: '#55555566', width: 6, height: 6, top: -3 }} />
      <Handle type="source" position={Position.Top} id="top-source" style={{ background: '#55555566', width: 6, height: 6, top: -3, left: '60%' }} />
      <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ background: '#55555566', width: 6, height: 6, bottom: -3 }} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" style={{ background: '#55555566', width: 6, height: 6, bottom: -3, left: '60%' }} />
      <Handle type="source" position={Position.Left} id="left-source" style={{ background: '#55555566', width: 6, height: 6, left: -3, top: '35%' }} />
      <Handle type="target" position={Position.Right} id="right-target" style={{ background: '#55555566', width: 6, height: 6, right: -3, top: '35%' }} />

      {/* Type badge when selected */}
      {selected && (
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
          color: 'white',
        }}>
          🖼️ Image
        </div>
      )}
    </div>
  );
}

export default ImageNode;
