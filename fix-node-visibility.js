#!/usr/bin/env node
// Remove the dimension-stripping useEffect that causes all nodes to
// vanish for ~4s on view switch. HandleUpdater already recalculates
// handle positions via updateNodeInternals - no need to remount nodes.
const fs = require('fs');
const file = 'src/App.tsx';
let c = fs.readFileSync(file, 'utf8');
const hadCRLF = c.includes('\r\n');
if (hadCRLF) c = c.replace(/\r\n/g, '\n');

const block = `  // Strip saved dimensions on view switch so ReactFlow measures fresh
  const prevViewForDims = React.useRef(viewMode);
  React.useEffect(() => {
    if (prevViewForDims.current !== viewMode) {
      prevViewForDims.current = viewMode;
      setNodes(nds => nds.map(n => ({
        ...n,
        width: undefined,
        height: undefined,
      })));
    }
  }, [viewMode, setNodes]);

`;

if (c.includes(block)) {
  c = c.replace(block, '');
  if (hadCRLF) c = c.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, c, 'utf8');
  console.log('✅ Removed dimension stripping — nodes stay visible on view switch');
} else {
  console.log('⏭ Already applied');
}
