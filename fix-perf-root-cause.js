#!/usr/bin/env node
/**
 * PERFORMANCE FIX — Root cause: CustomNode render cascade
 * 
 * Problems found:
 * 1. CustomNode has useEffect that calls updateNodeInternals(id) on EVERY render
 *    → 84 individual re-renders per view switch (ON TOP of the initial 84)
 * 2. Auto-heal useEffect fires on isWhiteboardMode change → data.onChange → 
 *    setNodes → processedNodes recomputes → ANOTHER 84 re-renders
 * 3. HandleUpdater calls updateNodeInternals 84 times individually instead of 
 *    once with an array
 * 4. CustomNode is NOT memoized (1559 lines × 84 nodes × 3 cycles = catastrophic)
 * 
 * Total: ~250 renders per view switch → should be ~84 (just the actual re-renders)
 * 
 * Fixes:
 * A. Remove per-node updateNodeInternals useEffect (HandleUpdater handles this)
 * B. Guard auto-heal effect to NOT fire on viewMode transitions
 * C. Wrap CustomNode in React.memo  
 * D. Batch updateNodeInternals in HandleUpdater (1 call vs 84)
 * E. CSS-based edge hiding during transition
 */
const fs = require('fs');
let fixes = 0;

// ─── Helper ───
function readFile(path) {
  let c = fs.readFileSync(path, 'utf8');
  const crlf = c.includes('\r\n');
  if (crlf) c = c.replace(/\r\n/g, '\n');
  return { content: c, crlf };
}
function writeFile(path, content, crlf) {
  if (crlf) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(path, content, 'utf8');
}

// ═══════════════════════════════════════════════════════════
// FIX A+B+C: CustomNode.tsx
// ═══════════════════════════════════════════════════════════
{
  const path = 'src/components/flow/CustomNode.tsx';
  let { content: c, crlf } = readFile(path);
  let changed = false;

  // A. Remove the per-node updateNodeInternals useEffect
  // This effect runs in EVERY node and calls updateNodeInternals individually,
  // causing 84 re-renders. HandleUpdater already handles this centrally.
  const updateEffect = /  \/\/ Force ReactFlow to recalculate handle positions[\s\S]*?}, \[id, updateNodeInternals[^\]]*\]\);/;
  if (c.match(updateEffect)) {
    c = c.replace(updateEffect, 
      '  // Handle position updates are done centrally by HandleUpdater.\n' +
      '  // Removed per-node updateNodeInternals to prevent 84 individual re-renders.');
    changed = true;
    fixes++;
    console.log('  ✓ A. Removed per-node updateNodeInternals useEffect');
  }

  // If updateNodeInternals is no longer used in the component, remove the import
  // Strip comments and the import/declaration lines before checking for remaining usage
  const cNoComments = c.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const cStripped = cNoComments
    .replace(/import.*useUpdateNodeInternals.*/g, '')
    .replace(/const updateNodeInternals\s*=\s*useUpdateNodeInternals\(\);?/g, '');
  const remainingUseOfUpdate = cStripped.includes('updateNodeInternals');
  if (!remainingUseOfUpdate && c.includes('useUpdateNodeInternals')) {
    c = c.replace(
      /import \{ Handle, Position, useUpdateNodeInternals \} from 'reactflow';/,
      "import { Handle, Position } from 'reactflow';"
    );
    // Remove the const declaration
    c = c.replace(/\s*const updateNodeInternals = useUpdateNodeInternals\(\);\n/, '\n');
    changed = true;
    fixes++;
    console.log('  ✓ A2. Removed unused useUpdateNodeInternals import');
  }

  // B. Guard auto-heal effect — add debounce to prevent firing during view transitions
  // The auto-heal fires when isWhiteboardMode changes and calls data.onChange which
  // causes setNodes → processedNodes recompute → another 84 re-renders
  const autoHealEffect = /  \/\/ Auto-heal: if the rendered node is larger than stored dimensions,[\s\S]*?}, \[data\.isWhiteboardMode\]\);/;
  const autoHealMatch = c.match(autoHealEffect);
  if (autoHealMatch && !autoHealMatch[0].includes('setTimeout')) {
    c = c.replace(autoHealEffect,
      `  // Auto-heal: if the rendered node is larger than stored dimensions,
  // update React Flow so edges connect to the correct positions.
  // Debounced to avoid cascade during view mode transitions.
  useEffect(() => {
    if (!data.isWhiteboardMode || !wbContainerRef.current || !data.onChange) return;
    // Wait for layout to stabilize after view switch before measuring
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        const el = wbContainerRef.current;
        if (!el) return;
        const actualW = el.offsetWidth;
        const actualH = el.offsetHeight;
        const storedW = data.nodeWidth || 0;
        const storedH = data.nodeHeight || 0;
        if (actualW > storedW + 5 || actualH > storedH + 5) {
          data.onChange(id, 'nodeWidth', actualW);
          data.onChange(id, 'nodeHeight', actualH);
        }
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [data.isWhiteboardMode]);`);
    changed = true;
    fixes++;
    console.log('  ✓ B. Debounced auto-heal effect (500ms)');
  }

  // C. Wrap in React.memo
  if (!c.includes('React.memo')) {
    // Replace the export
    c = c.replace(
      'export default CustomNode;',
      'export default React.memo(CustomNode);'
    );
    changed = true;
    fixes++;
    console.log('  ✓ C. Wrapped CustomNode in React.memo');
  }

  if (changed) writeFile(path, c, crlf);
}

// ═══════════════════════════════════════════════════════════
// FIX D: HandleUpdater in App.tsx — batch updateNodeInternals
// ═══════════════════════════════════════════════════════════
{
  const path = 'src/App.tsx';
  let { content: c, crlf } = readFile(path);
  let changed = false;

  // D. Replace individual updateNodeInternals calls with batch
  const huRegex = /function HandleUpdater\(\{[^}]*\}[^{]*\{[\s\S]*?return null;\n\}/;
  const huMatch = c.match(huRegex);
  if (huMatch) {
    const old = huMatch[0];
    const hasBatch = old.includes('updateNodeInternals(nodeIds)');
    const hasIndividual = old.includes('nodeIds.forEach');
    
    if (hasIndividual && !hasBatch) {
      const cleanHU = `function HandleUpdater({ nodeIds }: { nodeIds: string[] }) {
  const updateNodeInternals = useUpdateNodeInternals();
  const prevCountRef = React.useRef(0);

  React.useEffect(() => {
    if (nodeIds.length === 0) return;
    if (nodeIds.length === prevCountRef.current) return;

    // Single batched call instead of 84 individual calls.
    // ReactFlow v11.8+ accepts an array of IDs.
    const t1 = setTimeout(() => {
      prevCountRef.current = nodeIds.length;
      updateNodeInternals(nodeIds);
    }, 200);
    const t2 = setTimeout(() => updateNodeInternals(nodeIds), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [nodeIds, updateNodeInternals]);

  return null;
}`;
      c = c.replace(old, cleanHU);
      changed = true;
      fixes++;
      console.log('  ✓ D. Batched updateNodeInternals (1 call vs 84)');
    }
    
    // Also clean up stale props
    if (old.includes('onReady')) {
      // Already handled by the replacement above
    }
  }

  // Fix HandleUpdater JSX — remove onReady prop if present
  c = c.replace(/<HandleUpdater nodeIds=\{[^}]+\} onReady=\{[^}]+\} \/>/g, (m) => {
    const nodeIdsMatch = m.match(/nodeIds=\{([^}]+)\}/);
    return `<HandleUpdater nodeIds={${nodeIdsMatch[1]}} />`;
  });

  // Use memoNodeIds if available
  if (c.includes('memoNodeIds') && c.includes('nodeIds={nodes.map(n => n.id)}')) {
    c = c.replace('nodeIds={nodes.map(n => n.id)}', 'nodeIds={memoNodeIds}');
  }

  // ═══════════════════════════════════════════════════════════
  // FIX E: CSS-based edge hiding
  // ═══════════════════════════════════════════════════════════
  
  // Remove ALL React-state edge transition code
  c = c.replace(/\n\s*const \[edgesVisible, setEdgesVisible\][^\n]*\n/g, '\n');
  c = c.replace(/\n\s*const edgeTimerRef[^\n]*\n/g, '\n');
  c = c.replace(/\n\s*const handleViewModeChange = useCallback\(\(newMode: string\) => \{[\s\S]*?\}, \[setViewMode\]\);\n/g, '\n');
  c = c.replace(/\n\s*const handleEdgesReady = useCallback\(\(\) => \{[\s\S]*?\}, \[\]\);\n/g, '\n');
  
  // Remove edgesVisible from processedEdges  
  const inlineDebug = c.match(/.*if \(!edgesVisible\).*\n/);
  if (inlineDebug) c = c.replace(inlineDebug[0], '');
  c = c.replace(/, edgesVisible,/g, ',');
  c = c.replace(/edgesVisible, /g, '');

  // Replace onViewModeChange with CSS-based handler
  if (c.includes('onViewModeChange={handleViewModeChange}')) {
    c = c.replace('onViewModeChange={handleViewModeChange}',
      `onViewModeChange={(newMode: string) => {
          const el = document.querySelector('.react-flow');
          if (el) el.setAttribute('data-transitioning', 'true');
          setViewMode(newMode);
          setTimeout(() => { if (el) el.removeAttribute('data-transitioning'); }, 400);
        }}`);
    changed = true;
    fixes++;
    console.log('  ✓ E. CSS-based edge hiding via data attribute');
  } else if (c.includes('onViewModeChange={setViewMode}') && !c.includes('data-transitioning')) {
    c = c.replace('onViewModeChange={setViewMode}',
      `onViewModeChange={(newMode: string) => {
          const el = document.querySelector('.react-flow');
          if (el) el.setAttribute('data-transitioning', 'true');
          setViewMode(newMode);
          setTimeout(() => { if (el) el.removeAttribute('data-transitioning'); }, 400);
        }}`);
    changed = true;
    fixes++;
    console.log('  ✓ E. CSS-based edge hiding via data attribute');
  }

  // Clean stale comments
  c = c.replace(/\s*\/\/ Wrap setViewMode to hide edges[^\n]*\n/g, '\n');
  c = c.replace(/\s*\/\/ This prevents edges from flashing[^\n]*\n/g, '');
  c = c.replace(/\s*\/\/ State-based edge hiding[^\n]*\n/g, '');
  c = c.replace(/\s*\/\/ This guarantees they never render[^\n]*\n/g, '');

  // Remove debug logs if any remain
  c = c.replace(/\n\s*console\.log\(`\[EDGES\][^`]*`\);\n/g, '\n');
  c = c.replace(/\n\s*console\.log\(`\[HU\][^`]*`\);\n/g, '\n');

  if (changed) writeFile(path, c, crlf);
}

// ═══════════════════════════════════════════════════════════
// FIX E (CSS): App.css
// ═══════════════════════════════════════════════════════════
{
  const path = 'src/App.css';
  let { content: c, crlf } = readFile(path);

  if (!c.includes('data-transitioning')) {
    const rule = `\n/* Hide edges during view mode transition (prevents stale edge positions) */\n.react-flow[data-transitioning] .react-flow__edges {\n  visibility: hidden;\n}\n`;
    if (c.includes('/* Node Resizer Styles */')) {
      c = c.replace('/* Node Resizer Styles */', rule + '\n/* Node Resizer Styles */');
    } else {
      c += rule;
    }
    writeFile(path, c, crlf);
    fixes++;
    console.log('  ✓ E2. CSS rule for edge hiding');
  }
}

// ═══════════════════════════════════════════════════════════
// Also memo CustomEdge if not done
// ═══════════════════════════════════════════════════════════
{
  const path = 'src/components/flow/CustomEdge.tsx';
  if (fs.existsSync(path)) {
    let { content: c, crlf } = readFile(path);
    if (!c.includes('React.memo') && !c.includes('memo(')) {
      // Check import
      if (!c.includes('import React')) {
        if (c.includes("from 'react'")) {
          c = c.replace("from 'react'", "from 'react';\nimport React");
        }
      }
      // Find the export
      const exportMatch = c.match(/export default (\w+);/);
      if (exportMatch) {
        c = c.replace(exportMatch[0], `export default React.memo(${exportMatch[1]});`);
        writeFile(path, c, crlf);
        fixes++;
        console.log('  ✓ F. Wrapped CustomEdge in React.memo');
      }
    }
  }
}

if (fixes === 0) {
  console.log('⏭ All fixes already applied');
} else {
  console.log(`\n✅ Applied ${fixes} fixes`);
  console.log(`\nExpected improvement:`);
  console.log(`  View switch: ~250 renders → ~84 renders (3x faster)`);
  console.log(`  Return from other view: 84 individual updateNodeInternals → 1 batched call`);
  console.log(`  Edge flash: hidden via CSS during transition`);
}
