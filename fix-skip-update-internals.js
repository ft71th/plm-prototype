#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// Fix: Skip updateNodeInternals on view switch
//
// Debug logs prove 84 updateNodeInternals = 84 re-renders = 4s delay.
// But with React-state edge hiding (processedEdges returns []),
// we DON'T NEED updateNodeInternals:
//
//   1. Edges removed from React tree → nothing to render wrong
//   2. React renders 84 nodes with new viewMode (~200ms)
//   3. ReactFlow detects new dimensions via ResizeObserver
//   4. Handle positions already correct in ReactFlow's store
//   5. setEdgesVisible(true) → edges computed from CURRENT positions
//
// No updateNodeInternals = no 84 extra re-renders = instant edges.
// ═══════════════════════════════════════════════════════════
const fs = require('fs');

const file = 'src/App.tsx';
let c = fs.readFileSync(file, 'utf8');
const crlf = c.includes('\r\n');
if (crlf) c = c.replace(/\r\n/g, '\n');

if (c.includes('// Skip updateNodeInternals — causes 84 re-renders')) {
  console.log('⏭ Already applied');
  process.exit(0);
}

let fixes = 0;

// ── FIX 1: handleViewModeChange schedules edge restoration directly ──
// No HandleUpdater involvement for view switches.
const oldHVM = `  const handleViewModeChange = useCallback((newMode: string) => {
    setEdgesVisible(false); // Remove edges from React tree
    setViewMode(newMode);
  }, [setViewMode]);

  const handleEdgesReady = useCallback(() => {
    setEdgesVisible(true); // Restore edges — will compute from current handle positions
  }, []);`;

const newHVM = `  const edgeTimerRef = useRef<any>(null);

  const handleViewModeChange = useCallback((newMode: string) => {
    setEdgesVisible(false); // Remove edges from React tree
    setViewMode(newMode);
    // Skip updateNodeInternals — causes 84 re-renders (4s delay).
    // Edges are empty during transition, so nothing to render wrong.
    // When restored, ReactFlow computes paths from current handle positions.
    // React renders 84 nodes in ~200ms. Use 300ms to be safe.
    if (edgeTimerRef.current) clearTimeout(edgeTimerRef.current);
    edgeTimerRef.current = setTimeout(() => setEdgesVisible(true), 300);
  }, [setViewMode]);

  const handleEdgesReady = useCallback(() => {
    setEdgesVisible(true);
  }, []);`;

if (c.includes(oldHVM)) {
  c = c.replace(oldHVM, newHVM);
  fixes++;
  console.log('  ✓ handleViewModeChange: direct setTimeout(300) for edge restoration');
}

// ── FIX 2: HandleUpdater — only handle node count changes, not view changes ──
// Remove viewChanged branch entirely.
const oldHU_viewChanged = c.match(/if \(viewChanged\) \{[\s\S]*?return \(\) => \{ clearTimeout\(t1\); clearTimeout\(t2\); \};/);

if (oldHU_viewChanged) {
  // Find the full viewChanged block and replace with just passing through to the count-change logic
  // We want to keep the node-count-change branch and remove the view-change branch
  
  // Actually simpler: make HandleUpdater ignore view changes
  const oldCheck = '    if (!countChanged && !viewChanged) return;';
  const newCheck = '    // Only react to node count changes (initial load, add/remove nodes).\n    // View mode changes are handled by handleViewModeChange directly.\n    if (!countChanged) return;';
  
  if (c.includes(oldCheck)) {
    c = c.replace(oldCheck, newCheck);
    fixes++;
    console.log('  ✓ HandleUpdater: ignores view changes (only handles node count)');
  }
}

// Remove the viewChanged branch from HandleUpdater  
const viewChangedBranch = /    if \(viewChanged\) \{[\s\S]*?return \(\) => \{ clearTimeout\(t1\); clearTimeout\(t2\); \};\n    \} else \{\n/;
const match = c.match(viewChangedBranch);
if (match) {
  c = c.replace(viewChangedBranch, '    {\n');
  // Also remove the closing brace of the else
  // The remaining code should be the count-change branch
  fixes++;
  console.log('  ✓ HandleUpdater: removed viewChanged branch');
}

// Clean up: remove unnecessary block scope left from else removal
c = c.replace(
  '    {\n      // Node count change (project load): staggered updates\n      const t1 = setTimeout(() => { updateAll(); if (onReady) onReady(); }, 200);\n      const t2 = setTimeout(updateAll, 800);\n      return () => { clearTimeout(t1); clearTimeout(t2); };\n    }',
  '    // Node count change (project load): staggered updates\n    const t1 = setTimeout(() => { updateAll(); if (onReady) onReady(); }, 200);\n    const t2 = setTimeout(updateAll, 800);\n    return () => { clearTimeout(t1); clearTimeout(t2); };'
);

// Clean up: remove viewChanged variable and prevViewRef since they're unused
c = c.replace('    const viewChanged = viewMode !== prevViewRef.current;\n\n', '');
c = c.replace('  const prevViewRef = React.useRef(viewMode);\n', '');
// Remove viewMode from the type and deps
c = c.replace(
  'function HandleUpdater({ nodeIds, viewMode, onReady }: { nodeIds: string[], viewMode?: string, onReady?: () => void })',
  'function HandleUpdater({ nodeIds, onReady }: { nodeIds: string[], onReady?: () => void })'
);
c = c.replace(
  '  }, [nodeIds, viewMode, updateNodeInternals, onReady]);',
  '  }, [nodeIds, updateNodeInternals, onReady]);'
);
// Remove prevViewRef update from updateAll
c = c.replace('      prevViewRef.current = viewMode;\n', '');
fixes++;
console.log('  ✓ HandleUpdater: cleaned up unused viewMode props/refs');

// ── FIX 3: Update HandleUpdater JSX — remove viewMode prop ──
const oldJsx = /<HandleUpdater nodeIds=\{[^}]+\} viewMode=\{viewMode\} onReady=\{handleEdgesReady\} \/>/;
const jsxMatch = c.match(oldJsx);
if (jsxMatch) {
  c = c.replace(oldJsx, '<HandleUpdater nodeIds={nodes.map(n => n.id)} onReady={handleEdgesReady} />');
  fixes++;
  console.log('  ✓ HandleUpdater JSX: removed viewMode prop');
}

if (crlf) c = c.replace(/\n/g, '\r\n');
fs.writeFileSync(file, c, 'utf8');
console.log(`\n✅ Applied ${fixes} fixes`);
console.log('   View switch: setEdgesVisible(false) → setTimeout(300) → setEdgesVisible(true)');
console.log('   No updateNodeInternals on view switch = no 84 re-renders = instant edges');
