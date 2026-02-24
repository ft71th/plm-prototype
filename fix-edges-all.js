#!/usr/bin/env node
// ═══════════════════════════════════════════════════════
// Comprehensive edge rendering fix
// 1. Remove edge hiding/debounce (instant view switch)  
// 2. Strip node dimensions on view change (force remeasure)
// 3. HandleUpdater triggers on viewMode with double-rAF
// ═══════════════════════════════════════════════════════
const fs = require('fs');
const file = 'src/App.tsx';
let c = fs.readFileSync(file, 'utf8');
const hadCRLF = c.includes('\r\n');
if (hadCRLF) c = c.replace(/\r\n/g, '\n');

let fixes = 0;

// ── FIX 1: Remove refs and state for edge hiding ──
const refsBlock = `  const dimensionMeasuredRef = useRef(false);
  const dimensionTimerRef = useRef<any>(null);
  
  // Hide edges briefly during PLM↔Simple transitions to avoid visual glitch.
  const [edgesHidden, setEdgesHidden] = useState(false);
  const prevViewModeRef = useRef<string | null>(null);`;

if (c.includes(refsBlock)) {
  c = c.replace(refsBlock, '');
  fixes++;
  console.log('  ✓ Removed edge hiding refs/state');
}

// ── FIX 2: Simplify handleNodesChange ──
const oldHandler = `  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
    
    if (!dimensionMeasuredRef.current) {
      const hasDimensionChange = changes.some((c: any) => c.type === 'dimensions');
      if (hasDimensionChange) {
        if (dimensionTimerRef.current) clearTimeout(dimensionTimerRef.current);
        dimensionTimerRef.current = setTimeout(() => {
          setEdges(eds => eds.map(e => ({ ...e })));
          dimensionMeasuredRef.current = true;
          // Use rAF to ensure DOM is settled before showing edges
          requestAnimationFrame(() => setEdgesHidden(false));
        }, 100);
      }
    }
  }, [onNodesChange, setEdges]);`;

if (c.includes(oldHandler)) {
  c = c.replace(oldHandler, `  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
  }, [onNodesChange]);`);
  fixes++;
  console.log('  ✓ Simplified handleNodesChange');
}

// ── FIX 3: Remove view transition useEffect ──
const viewEffect = `  // Hide edges during PLM↔Simple view transitions to prevent visual glitch.
  // Nodes change size when mode switches → handles move → edges draw to
  // old positions for a few frames before updateNodeInternals fires.
  useEffect(() => {
    let timeout: any;
    if (prevViewModeRef.current !== null && prevViewModeRef.current !== viewMode) {
      setEdgesHidden(true);
      dimensionMeasuredRef.current = false;
      // Fixed delay: hide edges briefly during view switch, then force show
      timeout = setTimeout(() => {
        setEdges(eds => eds.map(e => ({ ...e }))); // force edge recalc
        dimensionMeasuredRef.current = true;
        requestAnimationFrame(() => setEdgesHidden(false));
      }, 150);
    }
    prevViewModeRef.current = viewMode;
    return () => { if (timeout) clearTimeout(timeout); };
  }, [viewMode]);`;

if (c.includes(viewEffect)) {
  c = c.replace(viewEffect, '');
  fixes++;
  console.log('  ✓ Removed view transition edge hiding');
}

// ── FIX 4: Remove hidden: edgesHidden from edges ──
if (c.includes('hidden: edgesHidden,')) {
  c = c.replace(/\s*hidden: edgesHidden,\n/g, '\n');
  fixes++;
  console.log('  ✓ Removed hidden: edgesHidden');
}

// ── FIX 5: Remove dimension reset in project load ──
const dimReset = `    // Reset dimension measurement guard so edges refresh for new project's nodes
    dimensionMeasuredRef.current = false;`;
if (c.includes(dimReset)) {
  c = c.replace(dimReset, '');
  fixes++;
  console.log('  ✓ Removed project load dimension reset');
}

// Also remove any remaining dimensionMeasuredRef references
const dimReset2 = '    dimensionMeasuredRef.current = false;\n';
while (c.includes(dimReset2)) {
  c = c.replace(dimReset2, '');
  fixes++;
  console.log('  ✓ Removed additional dimensionMeasuredRef');
}
const dimReset3 = '        dimensionMeasuredRef.current = true;\n';
while (c.includes(dimReset3)) {
  c = c.replace(dimReset3, '');
  fixes++;
  console.log('  ✓ Removed additional dimensionMeasuredRef');
}

// ── FIX 6: Update HandleUpdater to trigger on viewMode + strip dimensions ──
const oldUpdater = `function HandleUpdater({ nodeIds }: { nodeIds: string[] }) {
  const updateNodeInternals = useUpdateNodeInternals();
  const prevCountRef = React.useRef(0);

  React.useEffect(() => {
    if (nodeIds.length === 0) return;
    // Only trigger when node count changes (project load / import)
    if (nodeIds.length === prevCountRef.current) return;
    prevCountRef.current = nodeIds.length;

    // Need multiple passes — DOM elements may not be ready on first frame
    const timers = [150, 400, 800].map(delay =>
      setTimeout(() => {
        nodeIds.forEach(id => {
          try { updateNodeInternals(id); } catch(e) { /* node may not exist yet */ }
        });
      }, delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [nodeIds, updateNodeInternals]);

  return null;
}`;

const newUpdater = `function HandleUpdater({ nodeIds, viewMode }: { nodeIds: string[], viewMode?: string }) {
  const updateNodeInternals = useUpdateNodeInternals();
  const prevCountRef = React.useRef(0);
  const prevViewRef = React.useRef(viewMode);

  React.useEffect(() => {
    if (nodeIds.length === 0) return;
    const countChanged = nodeIds.length !== prevCountRef.current;
    const viewChanged = viewMode !== prevViewRef.current;
    prevCountRef.current = nodeIds.length;
    prevViewRef.current = viewMode;

    if (!countChanged && !viewChanged) return;

    // Use double-rAF to ensure browser has painted new layout before measuring
    const updateAll = () => {
      nodeIds.forEach(id => {
        try { updateNodeInternals(id); } catch(e) {}
      });
    };

    if (viewChanged) {
      // Double rAF: first rAF schedules after current paint, second after next paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateAll();
        });
      });
    }

    // Fallback pass for slow-rendering nodes
    const timer = setTimeout(updateAll, viewChanged ? 300 : 400);
    const timer2 = countChanged ? setTimeout(updateAll, 800) : null;

    return () => { clearTimeout(timer); if (timer2) clearTimeout(timer2); };
  }, [nodeIds, viewMode, updateNodeInternals]);

  return null;
}`;

if (c.includes(oldUpdater)) {
  c = c.replace(oldUpdater, newUpdater);
  fixes++;
  console.log('  ✓ HandleUpdater: viewMode trigger + double-rAF');
}

// ── FIX 7: Pass viewMode to HandleUpdater ──
const oldJsx = '<HandleUpdater nodeIds={nodes.map(n => n.id)} />';
const newJsx = '<HandleUpdater nodeIds={nodes.map(n => n.id)} viewMode={viewMode} />';
if (c.includes(oldJsx)) {
  c = c.replace(oldJsx, newJsx);
  fixes++;
  console.log('  ✓ Passing viewMode to HandleUpdater');
}

// ── FIX 8: Strip saved node dimensions on view switch ──
// Add useEffect that clears width/height when viewMode changes
const processedNodesMemo = 'const processedNodes = useMemo(() => {';
if (c.includes(processedNodesMemo) && !c.includes('// Strip saved dimensions on view switch')) {
  const insertPoint = c.indexOf(processedNodesMemo);
  const viewStripper = `// Strip saved dimensions on view switch so ReactFlow measures fresh
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
  c = c.substring(0, insertPoint) + viewStripper + c.substring(insertPoint);
  fixes++;
  console.log('  ✓ Strip node dimensions on view switch');
}

// ── FIX 9: Memoize nodeTypes/edgeTypes (fix React Flow warning) ──
// Check if they're already memoized
if (!c.includes('useMemo(() => nodeTypes') && !c.includes('useMemo(() => edgeTypes')) {
  // They're imported as constants - the warning is likely from dev/strict mode
  // Add a comment but no code change needed since they're module-level
  console.log('  ℹ nodeTypes/edgeTypes are module constants (warning is from strict mode)');
}

if (fixes === 0) {
  console.log('⏭ Already applied');
} else {
  if (hadCRLF) c = c.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, c, 'utf8');
  console.log(`\n✅ Edge rendering fix: ${fixes} changes applied`);
  console.log('   - No more edge hiding/debounce');
  console.log('   - Node dimensions cleared on view switch');
  console.log('   - Handles recalculated via double-rAF');
}
