#!/usr/bin/env node
// Add debug logging to trace edge visibility timing
const fs = require('fs');
const file = 'src/App.tsx';
let c = fs.readFileSync(file, 'utf8');
const crlf = c.includes('\r\n');
if (crlf) c = c.replace(/\r\n/g, '\n');

if (c.includes('[HU] effect run')) {
  console.log('⏭ Debug logging already present');
  process.exit(0);
}

let fixes = 0;

// 1. HandleUpdater effect - add logging after each key line
// After: "const viewChanged = ..."
c = c.replace(
  /( +const viewChanged = viewMode !== prevViewRef\.current;)\n/,
  `$1\n\n    console.log(\`[HU] effect run: viewMode=\${viewMode}, prev=\${prevViewRef.current}, viewChanged=\${viewChanged}, countChanged=\${countChanged}, t=\${performance.now().toFixed(0)}ms\`);\n`
);
fixes++;

// After the early return
c = c.replace(
  /( +if \(!countChanged && !viewChanged\) return;)\n/,
  `$1\n\n    console.log(\`[HU] change detected! scheduling work, t=\${performance.now().toFixed(0)}ms\`);\n`
);
fixes++;

// Inside updateAll
c = c.replace(
  /( +const updateAll = \(\) => \{)\n( +prevCountRef)/,
  `$1\n      console.log(\`[HU] updateAll executing, t=\${performance.now().toFixed(0)}ms\`);\n$2`
);
fixes++;

// After the viewChanged setTimeout
c = c.replace(
  /(if \(viewChanged\) \{)\n/,
  `$1\n      console.log(\`[HU] viewChanged branch, scheduling setTimeout(50), t=\${performance.now().toFixed(0)}ms\`);\n`
);
fixes++;

// Before onReady call in the rAF
c = c.replace(
  /( +if \(onReady\) onReady\(\);)\n( +\}\);?\n +\}, 50\))/,
  `          console.log(\`[HU] rAF fired, calling onReady, t=\${performance.now().toFixed(0)}ms\`);\n$1\n$2`
);
fixes++;

// Cleanup logging
c = c.replace(
  /return \(\) => \{ clearTimeout\(t1\); clearTimeout\(t2\); \};/g,
  (match, offset) => {
    // Only add logging to the first occurrence (viewChanged branch)
    if (c.lastIndexOf('viewChanged', offset) > c.lastIndexOf('} else {', offset)) {
      return `return () => { console.log(\`[HU] cleanup: clearing timeouts, t=\${performance.now().toFixed(0)}ms\`); clearTimeout(t1); clearTimeout(t2); };`;
    }
    return match;
  }
);
fixes++;

// 2. handleViewModeChange - add logging
c = c.replace(
  /const handleViewModeChange = useCallback\(\(newMode: string\) => \{\n( +)setEdgesVisible\(false\)/,
  `const handleViewModeChange = useCallback((newMode: string) => {\n$1console.log(\`[EDGES] handleViewModeChange: \${newMode}, setting edgesVisible=false, t=\${performance.now().toFixed(0)}ms\`);\n$1setEdgesVisible(false)`
);
fixes++;

// 3. handleEdgesReady - add logging
c = c.replace(
  /const handleEdgesReady = useCallback\(\(\) => \{\n( +)setEdgesVisible\(true\)/,
  `const handleEdgesReady = useCallback(() => {\n$1console.log(\`[EDGES] handleEdgesReady: setting edgesVisible=true, t=\${performance.now().toFixed(0)}ms\`);\n$1setEdgesVisible(true)`
);
fixes++;

// 4. processedEdges - log when returning empty
c = c.replace(
  /if \(!edgesVisible\) return \[\];/,
  `if (!edgesVisible) { console.log(\`[EDGES] processedEdges: returning [] (hidden), t=\${performance.now().toFixed(0)}ms\`); return []; }`
);
fixes++;

// 5. Add a log when edges are computed normally
c = c.replace(
  /const isWb = viewMode === 'whiteboard';\n( +)return edges\.map/,
  `const isWb = viewMode === 'whiteboard';\n$1console.log(\`[EDGES] processedEdges: returning \${edges.length} edges, t=\${performance.now().toFixed(0)}ms\`);\n$1return edges.map`
);
fixes++;

if (crlf) c = c.replace(/\n/g, '\r\n');
fs.writeFileSync(file, c, 'utf8');
console.log(`✅ Added ${fixes} debug log points. Look for [HU] and [EDGES] in console.`);
console.log('');
console.log('Expected flow:');
console.log('  [EDGES] handleViewModeChange → edgesVisible=false');
console.log('  [EDGES] processedEdges → returning []');
console.log('  [HU] effect run → viewChanged=true');
console.log('  [HU] cleanup (StrictMode)');
console.log('  [HU] effect run → viewChanged=true (2nd)');
console.log('  [HU] viewChanged branch, setTimeout(50)');
console.log('  [HU] updateAll executing');
console.log('  [HU] rAF fired, calling onReady');
console.log('  [EDGES] handleEdgesReady → edgesVisible=true');
console.log('  [EDGES] processedEdges → returning 74 edges');
