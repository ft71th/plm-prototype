#!/usr/bin/env node
const fs = require('fs');
const file = 'src/components/flow/CustomNode.tsx';
let c = fs.readFileSync(file, 'utf8');
const hadCRLF = c.includes('\r\n');
if (hadCRLF) c = c.replace(/\r\n/g, '\n');

const patterns = ['Icon-centric with port labels inside','Icon-centric design','Blue card with port labels inside','Blue card, auto-sized, no resizer','Blue card, resizable'];
let startIdx = -1;
for (const pat of patterns) {
  const m = `    // WHITEBOARD MODE - HARDWARE NODES (${pat})\n  if (data.isWhiteboardMode && (data.itemType === 'hardware' || data.type === 'hardware')) {`;
  startIdx = c.indexOf(m);
  if (startIdx !== -1) { console.log('  Found:', pat); break; }
}
const endMarker = '        <ExtraHandles color="#795548" skipLeftRight={ports.length > 0} />\n      </div>\n      </>\n    );\n  }';
let endIdx = startIdx !== -1 ? c.indexOf(endMarker, startIdx) : -1;

// Also try without the </> wrapper (my no-resizer version didn't have it)
const endMarker2 = '        <ExtraHandles color="#795548" skipLeftRight={ports.length > 0} />\n      </div>\n    );\n  }';
if (endIdx === -1 && startIdx !== -1) endIdx = c.indexOf(endMarker2, startIdx);
const usedEnd = endIdx !== -1 ? (c.indexOf(endMarker, startIdx) === endIdx ? endMarker : endMarker2) : '';

if (startIdx === -1 || endIdx === -1) {
  console.log('❌ Section not found');
  process.exit(1);
}

const newCode = `    // WHITEBOARD MODE - HARDWARE NODES (Blue card, resizable)
  if (data.isWhiteboardMode && (data.itemType === 'hardware' || data.type === 'hardware')) {
    const ports = data.ports || [];
    const inputPorts = ports.filter(p => p.direction === 'input' || p.type === 'input');
    const outputPorts = ports.filter(p => p.direction === 'output' || p.type === 'output');
    
    const iconSize = data.hwIconSize || 64;
    const maxPorts = Math.max(inputPorts.length, outputPorts.length, 1);
    const portRowHeight = 22;
    const contentPadding = 10;
    const imageHeight = Math.max(iconSize, maxPorts * portRowHeight);
    const labelHeight = 24;
    const minH = contentPadding + imageHeight + labelHeight + contentPadding;

    const charWidth = 7;
    const portLabelW = (p) => (p.name + (p.width ? \`[\${p.width-1}:0]\` : '')).length * charWidth + 16;
    const maxInW = inputPorts.length > 0 ? Math.max(...inputPorts.map(portLabelW)) : 0;
    const maxOutW = outputPorts.length > 0 ? Math.max(...outputPorts.map(portLabelW)) : 0;
    const gap = 8, pad = 12;
    const minW = Math.max(140, pad + maxInW + (maxInW>0?gap:0) + iconSize + 10 + (maxOutW>0?gap:0) + maxOutW + pad);

    // Port Y as percentage of node height
    const getPortPct = (index, total) => {
      if (total === 1) return '50%';
      const topPct = (contentPadding + (imageHeight - total * portRowHeight) / 2) / minH * 100;
      const rangePct = ((total - 1) * portRowHeight) / minH * 100;
      return \`\${topPct + (rangePct / (total - 1)) * index + (portRowHeight / 2 / minH * 100)}%\`;
    };

    return (
      <>
      <NodeResizer
        color="#3498db"
        isVisible={selected}
        minWidth={minW}
        minHeight={minH}
        onResizeEnd={(event, params) => {
          if (data.onChange) {
            data.onChange(id, 'nodeWidth', params.width);
            data.onChange(id, 'nodeHeight', params.height);
          }
        }}
        handleStyle={{ width: '10px', height: '10px', borderRadius: '2px' }}
      />
      <div 
        style={{
          width: '100%',
          height: '100%',
          minWidth: \`\${minW}px\`,
          minHeight: \`\${minH}px\`,
          background: selected ? 'rgba(52,152,219,0.25)' : 'rgba(52,152,219,0.08)',
          border: selected ? '2px solid #3498db' : '1.5px solid rgba(52,152,219,0.3)',
          borderRadius: '10px',
          position: 'relative',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transition: 'background 0.2s, border-color 0.2s',
          boxShadow: selected ? '0 0 16px rgba(52,152,219,0.35)' : '0 2px 8px rgba(0,0,0,0.08)',
          boxSizing: 'border-box',
        }}>

        {/* Content row: input labels | image | output labels */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', padding: \`\${contentPadding}px \${pad}px 0\`,
          boxSizing: 'border-box', flex: 1,
        }}>
          {inputPorts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: \`\${portRowHeight-14}px\`, marginRight: \`\${gap}px\`, alignItems: 'flex-end' }}>
              {inputPorts.map(port => (
                <div key={port.id} style={{ fontSize: '10px', color: '#27ae60', fontWeight: '600', whiteSpace: 'nowrap', height: '14px', lineHeight: '14px' }}>
                  {port.name + (port.width ? \`[\${port.width-1}:0]\` : '')}
                </div>
              ))}
            </div>
          )}

          <div style={{ flexShrink: 0 }}>
            {(data.hwCustomIcon || data.hwIcon?.startsWith('data:') || data.hwIcon?.startsWith('http')) ? (
              <img src={data.hwCustomIcon || data.hwIcon} alt={data.label || 'HW'}
                style={{ width: \`\${iconSize}px\`, height: \`\${iconSize}px\`, objectFit: 'contain',
                  filter: selected ? 'drop-shadow(0 0 6px rgba(52,152,219,0.7))' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))',
                  borderRadius: '6px', background: 'white', padding: '2px' }} />
            ) : (
              <span style={{ fontSize: \`\${iconSize*0.75}px\`, lineHeight: 1,
                filter: selected ? 'drop-shadow(0 0 6px rgba(52,152,219,0.7))' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }}>
                {data.hwIcon || '📦'}
              </span>
            )}
          </div>

          {outputPorts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: \`\${portRowHeight-14}px\`, marginLeft: \`\${gap}px\`, alignItems: 'flex-start' }}>
              {outputPorts.map(port => (
                <div key={port.id} style={{ fontSize: '10px', color: '#e67e22', fontWeight: '600', whiteSpace: 'nowrap', height: '14px', lineHeight: '14px' }}>
                  {port.name + (port.width ? \`[\${port.width-1}:0]\` : '')}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Label */}
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--nl-text-primary, #333)',
          textAlign: 'center', padding: '4px 8px', maxWidth: '100%', wordBreak: 'break-word', lineHeight: '1.3' }}>
          {data.label}
        </div>

        {/* Default handles */}
        <Handle type="target" position={Position.Left} id="default-target"
          style={{ background: '#27ae60', width: 10, height: 10, left: '-5px', top: '50%', transform: 'translateY(-50%)', border: '2px solid #fff', opacity: inputPorts.length > 0 ? 0.3 : 1 }} />
        <Handle type="source" position={Position.Right} id="default-source"
          style={{ background: '#e67e22', width: 10, height: 10, right: '-5px', top: '50%', transform: 'translateY(-50%)', border: '2px solid #fff', opacity: outputPorts.length > 0 ? 0.3 : 1 }} />

        {/* Port handles */}
        {inputPorts.map((port, index) => (
          <Handle key={port.id} type="target" position={Position.Left} id={port.id}
            style={{ background: '#27ae60', width: 10, height: 10, top: getPortPct(index, inputPorts.length), left: '-5px', border: '2px solid #fff' }}
            title={port.name} />
        ))}
        {outputPorts.map((port, index) => (
          <Handle key={port.id} type="source" position={Position.Right} id={port.id}
            style={{ background: '#e67e22', width: 10, height: 10, top: getPortPct(index, outputPorts.length), right: '-5px', border: '2px solid #fff' }}
            title={port.name} />
        ))}
        <ExtraHandles color="#795548" skipLeftRight={ports.length > 0} />
      </div>
      </>
    );
  }`;

c = c.substring(0, startIdx) + newCode + c.substring(endIdx + usedEnd.length);
if (hadCRLF) c = c.replace(/\n/g, '\r\n');
fs.writeFileSync(file, c, 'utf8');
console.log('✅ HW node: blue card, resizable, handles aligned');
