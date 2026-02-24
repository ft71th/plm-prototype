#!/usr/bin/env node
const fs = require('fs');
const file = 'src/components/flow/CustomNode.tsx';
let c = fs.readFileSync(file, 'utf8');
const hadCRLF = c.includes('\r\n');
if (hadCRLF) c = c.replace(/\r\n/g, '\n');

const old = '      <NodeResizer color="#795548" isVisible={false} minWidth={nodeWidth} minHeight={nodeContentHeight} />';
const rep = `      <NodeResizer color="#795548" isVisible={selected} minWidth={nodeWidth} minHeight={nodeContentHeight}
        onResize={(event, params) => {
          if (data.onChange) {
            const newIconSize = Math.max(32, Math.min(params.width * 0.45, params.height - labelHeight - contentPadding * 2));
            data.onChange(id, 'hwIconSize', Math.round(newIconSize));
          }
        }}
        handleStyle={{ width: '8px', height: '8px', borderRadius: '2px' }}
      />`;

if (c.includes(old)) {
  c = c.replace(old, rep);
  if (hadCRLF) c = c.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, c, 'utf8');
  console.log('✅ HW resize re-enabled (scales icon size)');
} else if (c.includes('isVisible={selected} minWidth={nodeWidth}')) {
  console.log('⏭ Already applied');
} else {
  console.log('❌ Marker not found');
}
