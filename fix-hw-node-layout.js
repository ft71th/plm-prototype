#!/usr/bin/env node
const fs = require('fs');
const file = 'src/components/flow/CustomNode.tsx';
let c = fs.readFileSync(file, 'utf8');

// Find the whiteboard HW section
const startMarker = '    // WHITEBOARD MODE - HARDWARE NODES (Icon-centric design)\n  if (data.isWhiteboardMode && (data.itemType === \'hardware\' || data.type === \'hardware\')) {';
const endMarker = '        <ExtraHandles color="#795548" skipLeftRight={ports.length > 0} />\n      </div>\n      </>\n    );\n  }';

const startIdx = c.indexOf(startMarker);
const endIdx = c.indexOf(endMarker, startIdx);

if (startIdx === -1) { console.log('❌ Start marker not found'); process.exit(1); }
if (endIdx === -1) { console.log('❌ End marker not found'); process.exit(1); }

const endOfSection = endIdx + endMarker.length;

const newCode = `    // WHITEBOARD MODE - HARDWARE NODES (Icon-centric with port labels inside)
  if (data.isWhiteboardMode && (data.itemType === 'hardware' || data.type === 'hardware')) {
    const ports = data.ports || [];
    const inputPorts = ports.filter(p => p.direction === 'input' || p.type === 'input');
    const outputPorts = ports.filter(p => p.direction === 'output' || p.type === 'output');
    
    // ── Sizing ──
    const iconSize = data.hwIconSize || 64;
    const maxPorts = Math.max(inputPorts.length, outputPorts.length, 1);
    const portRowHeight = 22;
    const portBlockHeight = maxPorts * portRowHeight;
    const contentPadding = 10;
    const imageHeight = Math.max(iconSize, portBlockHeight);
    const labelHeight = 24;
    const nodeContentHeight = contentPadding + imageHeight + labelHeight + contentPadding;

    // Port label widths
    const charWidth = 7;
    const getPortLabelWidth = (p) => {
      const name = p.name + (p.width ? \`[\${p.width-1}:0]\` : '');
      return name.length * charWidth + 16;
    };
    const maxInputLabelW = inputPorts.length > 0 
      ? Math.max(...inputPorts.map(getPortLabelWidth)) : 0;
    const maxOutputLabelW = outputPorts.length > 0 
      ? Math.max(...outputPorts.map(getPortLabelWidth)) : 0;
    
    const gapBetween = 8;
    const sidePadding = 12;
    const nodeWidth = Math.max(
      140,
      sidePadding + maxInputLabelW + (maxInputLabelW > 0 ? gapBetween : 0) 
        + iconSize + 10 
        + (maxOutputLabelW > 0 ? gapBetween : 0) + maxOutputLabelW + sidePadding
    );

    // Port vertical positions (px from top of node)
    const getPortY = (index, total) => {
      const blockTop = contentPadding + (imageHeight - total * portRowHeight) / 2;
      return blockTop + index * portRowHeight + portRowHeight / 2;
    };

    return (
      <>
      <NodeResizer
        color="#795548"
        isVisible={selected}
        minWidth={nodeWidth}
        minHeight={nodeContentHeight}
        onResizeEnd={(event, params) => {
          if (data.onChange) {
            data.onChange(id, 'nodeWidth', params.width);
            data.onChange(id, 'nodeHeight', params.height);
            data.onChange(id, 'hwIconSize', Math.max(32, Math.min(params.width * 0.4, params.height - 50)));
          }
        }}
        handleStyle={{ width: '8px', height: '8px', borderRadius: '2px' }}
      />
      <div 
        style={{
          width: data.nodeWidth ? \`\${Math.max(data.nodeWidth, nodeWidth)}px\` : \`\${nodeWidth}px\`,
          minHeight: \`\${nodeContentHeight}px\`,
          background: selected 
            ? 'rgba(52, 152, 219, 0.25)' 
            : 'rgba(52, 152, 219, 0.08)',
          border: selected ? '2px solid #3498db' : '1.5px solid rgba(52, 152, 219, 0.3)',
          borderRadius: '10px',
          position: 'relative',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transition: 'all 0.2s ease',
          boxShadow: selected 
            ? '0 0 20px rgba(52, 152, 219, 0.4)' 
            : '0 2px 8px rgba(0,0,0,0.1)',
        }}>

        {/* Main content row: input labels | image | output labels */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: \`\${contentPadding}px \${sidePadding}px 0\`,
          boxSizing: 'border-box',
          minHeight: \`\${imageHeight}px\`,
        }}>
          {/* Input port labels (left side) */}
          {inputPorts.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: \`\${portRowHeight - 14}px\`,
              marginRight: \`\${gapBetween}px\`,
              alignItems: 'flex-end',
            }}>
              {inputPorts.map(port => {
                const portLabel = port.name + (port.width ? \`[\${port.width-1}:0]\` : '');
                return (
                  <div key={port.id} style={{
                    fontSize: '10px',
                    color: '#27ae60',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    height: '14px',
                    lineHeight: '14px',
                  }}>
                    {portLabel}
                  </div>
                );
              })}
            </div>
          )}

          {/* Icon / Image */}
          <div style={{ flexShrink: 0 }}>
            {(data.hwCustomIcon || data.hwIcon?.startsWith('data:') || data.hwIcon?.startsWith('http')) ? (
              <img 
                src={data.hwCustomIcon || data.hwIcon} 
                alt={data.label || 'Hardware'}
                style={{ 
                  width: \`\${iconSize}px\`, 
                  height: \`\${iconSize}px\`, 
                  objectFit: 'contain',
                  filter: selected 
                    ? 'drop-shadow(0 0 8px rgba(52, 152, 219, 0.8))' 
                    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                  borderRadius: '6px',
                  background: 'white',
                  padding: '2px',
                }}
              />
            ) : (
              <span style={{ 
                fontSize: \`\${iconSize * 0.75}px\`,
                lineHeight: 1,
                filter: selected 
                  ? 'drop-shadow(0 0 8px rgba(52, 152, 219, 0.8))' 
                  : 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'
              }}>
                {data.hwIcon || '📦'}
              </span>
            )}
          </div>

          {/* Output port labels (right side) */}
          {outputPorts.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: \`\${portRowHeight - 14}px\`,
              marginLeft: \`\${gapBetween}px\`,
              alignItems: 'flex-start',
            }}>
              {outputPorts.map(port => {
                const portLabel = port.name + (port.width ? \`[\${port.width-1}:0]\` : '');
                return (
                  <div key={port.id} style={{
                    fontSize: '10px',
                    color: '#e67e22',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    height: '14px',
                    lineHeight: '14px',
                  }}>
                    {portLabel}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Label below */}
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: 'var(--nl-text-primary, #333)',
          textAlign: 'center',
          padding: '4px 8px',
          maxWidth: '100%',
          wordBreak: 'break-word',
          lineHeight: '1.3',
        }}>
          {data.label}
        </div>

        {/* ── Handles ── */}
        {/* Default handles (hidden when ports exist) */}
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
            opacity: ports.length > 0 ? 0 : 1,
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
            opacity: ports.length > 0 ? 0 : 1,
          }}
        />

        {/* Port-specific handles */}
        {inputPorts.map((port, index) => {
          const topPx = getPortY(index, inputPorts.length);
          return (
            <Handle
              key={port.id}
              type="target"
              position={Position.Left}
              id={port.id}
              style={{
                background: '#27ae60',
                width: 10,
                height: 10,
                top: \`\${topPx}px\`,
                left: '-5px',
                border: '2px solid #fff',
              }}
              title={port.name}
            />
          );
        })}
        {outputPorts.map((port, index) => {
          const topPx = getPortY(index, outputPorts.length);
          return (
            <Handle
              key={port.id}
              type="source"
              position={Position.Right}
              id={port.id}
              style={{
                background: '#e67e22',
                width: 10,
                height: 10,
                top: \`\${topPx}px\`,
                right: '-5px',
                border: '2px solid #fff',
              }}
              title={port.name}
            />
          );
        })}
        <ExtraHandles color="#795548" skipLeftRight={ports.length > 0} />
      </div>
      </>
    );
  }`;

c = c.substring(0, startIdx) + newCode + c.substring(endOfSection);
fs.writeFileSync(file, c, 'utf8');

console.log('✅ HW node rewritten: blue background + port labels inside');
console.log('   Layout: [● input labels | image | output labels ●]');
console.log('              label below');
