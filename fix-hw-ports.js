#!/usr/bin/env node
// Fix HW node port labels: pixel-based positioning within image bounds
// Run: node fix-hw-ports.js
const fs = require('fs');
const file = 'src/components/flow/CustomNode.tsx';
let c = fs.readFileSync(file, 'utf8');
let fixed = 0;

function r(old, rep, label) {
  if (c.includes(old)) {
    c = c.replace(old, rep);
    console.log(`  ✅ ${label}`);
    fixed++;
  } else {
    console.log(`  ⏭ Already done: ${label}`);
  }
}

console.log('🔧 Fix HW node port positioning...\n');

// 1. Replace percentage-based getHandlePosition + nodeHeight calc
r(
  `const getHandlePosition = (index, total) => {
      if (total === 1) return '50%';
      const spacing = 100 / (total + 1);
      return \`\${spacing * (index + 1)}%\`;
    };

    // Icon-based sizing - the node IS the icon
    const iconSize = data.hwIconSize || 64;  // Configurable icon size
    const maxPorts = Math.max(inputPorts.length, outputPorts.length, 1);
    const nodeHeight = Math.max(iconSize + 30, maxPorts * 24 + 20);  // Icon + label space
    const nodeWidth = Math.max(iconSize + 20, 80);  // Icon width + padding`,

  `// Icon-based sizing - the node IS the icon
    const iconSize = data.hwIconSize || 64;  // Configurable icon size
    const maxPorts = Math.max(inputPorts.length, outputPorts.length, 1);
    const portSpacing = 28;  // px between ports
    const portMargin = 12;   // px margin from top/bottom of image
    const minPortHeight = maxPorts > 1 
      ? (maxPorts - 1) * portSpacing + portMargin * 2 
      : portMargin * 2;
    // Node must fit both the icon and all port positions
    const imageHeight = Math.max(iconSize, minPortHeight);
    const labelHeight = 22;  // space for label below image
    const paddingTop = 4;
    const nodeHeight = imageHeight + labelHeight + paddingTop;
    const nodeWidth = Math.max(iconSize + 20, 80);  // Icon width + padding

    // Position ports in pixels within the image area
    const getHandlePositionPx = (index, total) => {
      if (total === 1) return paddingTop + imageHeight / 2;
      return paddingTop + portMargin + ((imageHeight - portMargin * 2) / (total - 1)) * index;
    };`,
  '1. Pixel-based port positioning + dynamic height'
);

// 2. Ensure saved dimensions don't shrink below min
r(
  `width: data.nodeWidth ? \`\${data.nodeWidth}px\` : \`\${nodeWidth}px\`,
          minHeight: data.nodeHeight ? \`\${data.nodeHeight}px\` : \`\${nodeHeight}px\`,
          backgroundColor: 'transparent',`,
  `width: data.nodeWidth ? \`\${Math.max(data.nodeWidth, nodeWidth)}px\` : \`\${nodeWidth}px\`,
          minHeight: \`\${nodeHeight}px\`,
          backgroundColor: 'transparent',`,
  '2. Enforce min dimensions'
);

// 3. Update NodeResizer minHeight
r(
  `minWidth={60}
        minHeight={60}
        onResizeEnd={(event, params) => {
          if (data.onChange) {
            data.onChange(id, 'nodeWidth', params.width);
            data.onChange(id, 'nodeHeight', params.height);
            // Also scale icon with resize`,
  `minWidth={60}
        minHeight={nodeHeight}
        onResizeEnd={(event, params) => {
          if (data.onChange) {
            data.onChange(id, 'nodeWidth', params.width);
            data.onChange(id, 'nodeHeight', params.height);
            // Also scale icon with resize`,
  '3. NodeResizer minHeight'
);

// 4. Make image height match imageHeight
r(
  `width: \`\${iconSize}px\`, 
                height: \`\${iconSize}px\`, 
                objectFit: 'contain',`,
  `width: \`\${iconSize}px\`, 
                height: \`\${imageHeight}px\`, 
                objectFit: 'contain',`,
  '4. Image height → imageHeight'
);

// 5. Update input port handles: getHandlePosition → getHandlePositionPx with px units
// Input ports
r(
  `{inputPorts.map((port, index) => {
          const topPos = getHandlePosition(index, inputPorts.length);
          const portLabel = port.name + (port.width ? \`[\${port.width-1}:0]\` : '');
          return (
            <React.Fragment key={port.id}>
              <Handle
                type="target"
                position={Position.Left}
                id={port.id}
                style={{
                  background: '#27ae60',
                  width: 8,
                  height: 8,
                  top: topPos,
                  border: '2px solid #fff'
                }}
                title={port.name}
              />
              <div style={{
                position: 'absolute',
                left: '14px',
                top: topPos,`,
  `{inputPorts.map((port, index) => {
          const topPx = getHandlePositionPx(index, inputPorts.length);
          const portLabel = port.name + (port.width ? \`[\${port.width-1}:0]\` : '');
          return (
            <React.Fragment key={port.id}>
              <Handle
                type="target"
                position={Position.Left}
                id={port.id}
                style={{
                  background: '#27ae60',
                  width: 8,
                  height: 8,
                  top: \`\${topPx}px\`,
                  border: '2px solid #fff'
                }}
                title={port.name}
              />
              <div style={{
                position: 'absolute',
                left: '14px',
                top: \`\${topPx}px\`,`,
  '5. Input port handles → pixel positioning'
);

// Output ports
r(
  `{outputPorts.map((port, index) => {
          const topPos = getHandlePosition(index, outputPorts.length);
          const portLabel = port.name + (port.width ? \`[\${port.width-1}:0]\` : '');
          return (
            <React.Fragment key={port.id}>
              <Handle
                type="source"
                position={Position.Right}
                id={port.id}
                style={{
                  background: '#e67e22',
                  width: 8,
                  height: 8,
                  top: topPos,
                  border: '2px solid #fff'
                }}
            title={port.name}
              />
              <div style={{
                position: 'absolute',
                right: '14px',
                top: topPos,`,
  `{outputPorts.map((port, index) => {
          const topPx = getHandlePositionPx(index, outputPorts.length);
          const portLabel = port.name + (port.width ? \`[\${port.width-1}:0]\` : '');
          return (
            <React.Fragment key={port.id}>
              <Handle
                type="source"
                position={Position.Right}
                id={port.id}
                style={{
                  background: '#e67e22',
                  width: 8,
                  height: 8,
                  top: \`\${topPx}px\`,
                  border: '2px solid #fff'
                }}
            title={port.name}
              />
              <div style={{
                position: 'absolute',
                right: '14px',
                top: \`\${topPx}px\`,`,
  '6. Output port handles → pixel positioning'
);

fs.writeFileSync(file, c, 'utf8');
console.log(`\n${'═'.repeat(50)}`);
console.log(`✅ ${fixed} fixes applied to CustomNode.tsx`);
console.log('Port handles now use pixel positions within image bounds.');
console.log('Node height adapts to fit all ports.');
