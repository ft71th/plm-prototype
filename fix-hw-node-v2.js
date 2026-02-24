#!/usr/bin/env node
const fs = require('fs');
const file = 'src/components/flow/CustomNode.tsx';
let c = fs.readFileSync(file, 'utf8');

// Normalize to LF for matching
const hadCRLF = c.includes('\r\n');
if (hadCRLF) c = c.replace(/\r\n/g, '\n');

const startPatterns = [
  'Icon-centric with port labels inside',
  'Icon-centric design',
  'Blue card with port labels inside',
];

let startIdx = -1;
for (const pat of startPatterns) {
  const marker = `    // WHITEBOARD MODE - HARDWARE NODES (${pat})\n  if (data.isWhiteboardMode && (data.itemType === 'hardware' || data.type === 'hardware')) {`;
  startIdx = c.indexOf(marker);
  if (startIdx !== -1) { console.log('  Found marker:', pat); break; }
}

const endMarker = '        <ExtraHandles color="#795548" skipLeftRight={ports.length > 0} />\n      </div>\n      </>\n    );\n  }';
const endIdx = startIdx !== -1 ? c.indexOf(endMarker, startIdx) : -1;

if (startIdx === -1) { 
  console.log('Start not found. Searching...');
  const i = c.indexOf('HARDWARE NODES');
  if (i !== -1) console.log(JSON.stringify(c.substring(i-10, i+120)));
  else console.log('"HARDWARE NODES" not in file');
  process.exit(1);
}
if (endIdx === -1) { console.log('End marker not found'); process.exit(1); }

const endOfSection = endIdx + endMarker.length;

const newCode = `    // WHITEBOARD MODE - HARDWARE NODES (Blue card with port labels inside)
  if (data.isWhiteboardMode && (data.itemType === 'hardware' || data.type === 'hardware')) {
    const ports = data.ports || [];
    const inputPorts = ports.filter(p => p.direction === 'input' || p.type === 'input');
    const outputPorts = ports.filter(p => p.direction === 'output' || p.type === 'output');
    
    const iconSize = data.hwIconSize || 64;
    const maxPorts = Math.max(inputPorts.length, outputPorts.length, 1);
    const portRowHeight = 22;
    const portBlockHeight = maxPorts * portRowHeight;
    const contentPadding = 10;
    const imageHeight = Math.max(iconSize, portBlockHeight);
    const labelHeight = 24;
    const nodeContentHeight = contentPadding + imageHeight + labelHeight + contentPadding;

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

    const getPortY = (index, total) => {
      const blockTop = contentPadding + (imageHeight - total * portRowHeight) / 2;
      return blockTop + index * portRowHeight + portRowHeight / 2;
    };

    return (
      <>
      <NodeResizer color="#795548" isVisible={false} minWidth={nodeWidth} minHeight={nodeContentHeight} />
      <div 
        style={{
          width: \`\${nodeWidth}px\`,
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
          transition: 'background 0.2s ease, border-color 0.2s ease',
          boxShadow: selected 
            ? '0 0 16px rgba(52, 152, 219, 0.35)' 
            : '0 2px 8px rgba(0,0,0,0.08)',
        }}>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: \`\${contentPadding}px \${sidePadding}px 0\`,
          boxSizing: 'border-box',
          minHeight: \`\${imageHeight}px\`,
        }}>
          {inputPorts.length > 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              gap: \`\${portRowHeight - 14}px\`,
              marginRight: \`\${gapBetween}px\`,
              alignItems: 'flex-end',
            }}>
              {inputPorts.map(port => {
                const portLabel = port.name + (port.width ? \`[\${port.width-1}:0]\` : '');
                return (
                  <div key={port.id} style={{
                    fontSize: '10px', color: '#27ae60', fontWeight: '600',
                    whiteSpace: 'nowrap', height: '14px', lineHeight: '14px',
                  }}>{portLabel}</div>
                );
              })}
            </div>
          )}

          <div style={{ flexShrink: 0 }}>
            {(data.hwCustomIcon || data.hwIcon?.startsWith('data:') || data.hwIcon?.startsWith('http')) ? (
              <img 
                src={data.hwCustomIcon || data.hwIcon} 
                alt={data.label || 'Hardware'}
                style={{ 
                  width: \`\${iconSize}px\`, height: \`\${iconSize}px\`, 
                  objectFit: 'contain',
                  filter: selected 
                    ? 'drop-shadow(0 0 6px rgba(52, 152, 219, 0.7))' 
                    : 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))',
                  borderRadius: '6px', background: 'white', padding: '2px',
                }}
              />
            ) : (
              <span style={{ 
                fontSize: \`\${iconSize * 0.75}px\`, lineHeight: 1,
                filter: selected 
                  ? 'drop-shadow(0 0 6px rgba(52, 152, 219, 0.7))' 
                  : 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))'
              }}>
                {data.hwIcon || '📦'}
              </span>
            )}
          </div>

          {outputPorts.length > 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              gap: \`\${portRowHeight - 14}px\`,
              marginLeft: \`\${gapBetween}px\`,
              alignItems: 'flex-start',
            }}>
              {outputPorts.map(port => {
                const portLabel = port.name + (port.width ? \`[\${port.width-1}:0]\` : '');
                return (
                  <div key={port.id} style={{
                    fontSize: '10px', color: '#e67e22', fontWeight: '600',
                    whiteSpace: 'nowrap', height: '14px', lineHeight: '14px',
                  }}>{portLabel}</div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{
          fontSize: '11px', fontWeight: 'bold',
          color: 'var(--nl-text-primary, #333)',
          textAlign: 'center', padding: '4px 8px',
          maxWidth: '100%', wordBreak: 'break-word', lineHeight: '1.3',
        }}>
          {data.label}
        </div>

        <Handle type="target" position={Position.Left} id="default-target"
          style={{
            background: '#27ae60', width: 10, height: 10,
            left: '-5px', top: '50%', transform: 'translateY(-50%)',
            border: '2px solid #fff',
            opacity: inputPorts.length > 0 ? 0.3 : 1,
          }}
        />
        <Handle type="source" position={Position.Right} id="default-source"
          style={{
            background: '#e67e22', width: 10, height: 10,
            right: '-5px', top: '50%', transform: 'translateY(-50%)',
            border: '2px solid #fff',
            opacity: outputPorts.length > 0 ? 0.3 : 1,
          }}
        />

        {inputPorts.map((port, index) => {
          const topPx = getPortY(index, inputPorts.length);
          return (
            <Handle key={port.id} type="target" position={Position.Left} id={port.id}
              style={{
                background: '#27ae60', width: 10, height: 10,
                top: \`\${topPx}px\`, left: '-5px',
                border: '2px solid #fff',
              }}
              title={port.name}
            />
          );
        })}
        {outputPorts.map((port, index) => {
          const topPx = getPortY(index, outputPorts.length);
          return (
            <Handle key={port.id} type="source" position={Position.Right} id={port.id}
              style={{
                background: '#e67e22', width: 10, height: 10,
                top: \`\${topPx}px\`, right: '-5px',
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

// Restore CRLF if original had it
if (hadCRLF) c = c.replace(/\n/g, '\r\n');

fs.writeFileSync(file, c, 'utf8');
console.log('✅ HW node: auto-sized, no resize, handles on edge');
