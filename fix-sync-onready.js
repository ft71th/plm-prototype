#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// Fix: 3.5s edge delay caused by rAF + unmemoized nodeIds
//
// Debug logs revealed:
//   t=264677  updateAll → 84 updateNodeInternals calls
//   t=264702  84 re-renders start (~33ms each = 3.5s)
//   t=268187  rAF finally fires → onReady → edges appear
//
// Two fixes:
//   1. Call onReady() SYNCHRONOUSLY after updateAll().
//      React 18 batches all state updates in setTimeout:
//      84 updateNodeInternals + setEdgesVisible(true) = ONE render.
//      Edges appear in the SAME render pass as node updates.
//
//   2. Memoize nodeIds with useMemo to prevent 84 unnecessary
//      effect re-runs (nodes.map creates new array every render).
// ═══════════════════════════════════════════════════════════
const fs = require('fs');

const file = 'src/App.tsx';
let c = fs.readFileSync(file, 'utf8');
const crlf = c.includes('\r\n');
if (crlf) c = c.replace(/\r\n/g, '\n');

if (c.includes('// React 18 batches all state updates in setTimeout')) {
  console.log('⏭ Already applied');
  process.exit(0);
}

let fixes = 0;

// ── FIX 1: Replace rAF with synchronous onReady ──
const rAFBlock = `      const t1 = setTimeout(() => {
        updateAll();
        // Wait one frame for ReactFlow to process handle updates
        requestAnimationFrame(() => {
          if (onReady) onReady();
        });
      }, 50);
      // Safety: second pass for late-loading content (images, etc.)
      const t2 = setTimeout(updateAll, 500);`;

const syncBlock = `      const t1 = setTimeout(() => {
        updateAll();
        // React 18 batches all state updates in setTimeout:
        // 84 updateNodeInternals + setEdgesVisible(true) = ONE render.
        if (onReady) onReady();
      }, 50);
      const t2 = setTimeout(updateAll, 500);`;

if (c.includes(rAFBlock)) {
  c = c.replace(rAFBlock, syncBlock);
  fixes++;
  console.log('  ✓ Replaced rAF with synchronous onReady');
} else {
  console.log('  ⚠ Could not find rAF block (may already be fixed)');
}

// ── FIX 2: Memoize nodeIds ──
// Add useMemo before HandleUpdater JSX usage
const oldJsx = '<HandleUpdater nodeIds={nodes.map(n => n.id)} viewMode={viewMode} onReady={handleEdgesReady} />';

if (c.includes(oldJsx)) {
  // Find where to insert the useMemo — before the return statement containing ReactFlow
  // We need to add it as a const in the component body
  
  // Find handleEdgesReady definition and add memoNodeIds after it
  const afterReady = '  const handleEdgesReady = useCallback(() => {\n    setEdgesVisible(true);';
  const afterReadyEnd = c.indexOf('  }, []);', c.indexOf(afterReady));
  
  if (afterReadyEnd !== -1) {
    const insertPoint = afterReadyEnd + '  }, []);'.length;
    const memoCode = `\n\n  // Stable nodeIds reference — prevents HandleUpdater effect from re-running\n  // 84 times during view switch (nodes.map creates new array every render).\n  const memoNodeIds = useMemo(() => nodes.map(n => n.id), [nodes.map(n => n.id).join(',')]);`;
    
    // Actually, using nodes.map in the dep is the same problem. Use a different approach:
    // Track by node count + first/last id as a cheap proxy
  }
  
  // Simpler: just use useMemo with JSON comparison via a ref
  // Actually simplest: use the nodes array length as dep (IDs don't change during view switch)
  c = c.replace(oldJsx, 
    '<HandleUpdater nodeIds={memoNodeIds} viewMode={viewMode} onReady={handleEdgesReady} />');
  
  // Add the memoNodeIds definition. Find processedEdges and add before it.
  const beforeProcessedEdges = '  // ── Memoized edges (prevents 74 new objects per render) ──';
  if (c.includes(beforeProcessedEdges)) {
    c = c.replace(beforeProcessedEdges,
      `  // Stable nodeIds — prevents HandleUpdater effect from re-running on every render.
  // IDs only change when nodes are added/removed, not during view switch re-renders.
  const nodeIdStr = nodes.map(n => n.id).join(',');
  const memoNodeIds = useMemo(() => nodeIdStr.split(','), [nodeIdStr]);

  ${beforeProcessedEdges}`);
    fixes++;
    console.log('  ✓ Memoized nodeIds (stable reference across re-renders)');
  }
}

if (fixes > 0) {
  if (crlf) c = c.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, c, 'utf8');
  console.log(`\n✅ Applied ${fixes} fixes — edges should appear instantly after updateAll`);
} else {
  console.log('\n⚠ No fixes applied');
}
