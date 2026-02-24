#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// Fix: React-level edge hiding during view transitions
//
// All DOM-based approaches (CSS visibility, ResizeObserver,
// MutationObserver) fail because:
//   - CSS hides edges but labels leak through, timing is unreliable
//   - showEdges fires before ReactFlow processes updateNodeInternals
//   - Edge paths are computed from STALE handle positions
//
// Solution: Don't render edges at all during transition.
//   1. handleViewModeChange → set edgesVisible=false + change viewMode
//   2. processedEdges returns [] when !edgesVisible
//   3. ReactFlow gets empty edges → nothing to render wrong
//   4. HandleUpdater detects view change → waits for DOM to settle
//   5. Calls updateNodeInternals → then onReady callback
//   6. onReady sets edgesVisible=true → next render computes
//      edge paths from CURRENT (correct) handle positions
// ═══════════════════════════════════════════════════════════
const fs = require('fs');

function readNorm(f) {
  let c = fs.readFileSync(f, 'utf8');
  const crlf = c.includes('\r\n');
  if (crlf) c = c.replace(/\r\n/g, '\n');
  return { content: c, crlf };
}
function writeDenorm(f, c, crlf) {
  if (crlf) c = c.replace(/\n/g, '\r\n');
  fs.writeFileSync(f, c, 'utf8');
}

const file = 'src/App.tsx';
let { content: c, crlf } = readNorm(file);
let fixes = 0;

// ── FIX 1: Replace HandleUpdater with onReady callback version ──
// Match the MutationObserver version
const huStart = 'function HandleUpdater({ nodeIds, viewMode }: { nodeIds: string[], viewMode?: string }) {';
const huEnd = '  return null;\n}';

const huStartIdx = c.indexOf(huStart);
const huEndIdx = c.indexOf(huEnd, huStartIdx);

if (huStartIdx !== -1 && huEndIdx !== -1) {
  const oldHU = c.substring(huStartIdx, huEndIdx + huEnd.length);
  
  // Only replace if it hasn't been replaced yet
  if (!oldHU.includes('onReady')) {
    const newHU = `function HandleUpdater({ nodeIds, viewMode, onReady }: { nodeIds: string[], viewMode?: string, onReady?: () => void }) {
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

    const updateAll = () => {
      nodeIds.forEach(id => {
        try { updateNodeInternals(id); } catch(e) {}
      });
    };

    if (viewChanged) {
      // Edges are empty during transition (React-level, not CSS).
      // Use MutationObserver to detect when React finishes DOM updates.
      // After 200ms of no mutations → nodes are rendered → update handles.
      const nodesContainer = document.querySelector('.react-flow__nodes');
      let debounceTimer: any = null;
      let mo: MutationObserver | null = null;
      let done = false;

      const finalize = () => {
        if (done) return;
        done = true;
        if (mo) mo.disconnect();
        if (debounceTimer) clearTimeout(debounceTimer);
        // Update handle positions, then signal edges can be restored
        updateAll();
        // Wait one frame for ReactFlow to process the handle updates,
        // then tell parent to show edges on the NEXT render
        requestAnimationFrame(() => {
          if (onReady) onReady();
        });
      };

      const resetDebounce = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(finalize, 200);
      };

      if (nodesContainer) {
        mo = new MutationObserver(resetDebounce);
        mo.observe(nodesContainer, {
          childList: true, subtree: true,
          attributes: true, characterData: true
        });
      }

      // Start debounce — if no mutations at all, fires after 200ms
      resetDebounce();

      return () => {
        if (mo) mo.disconnect();
        if (debounceTimer) clearTimeout(debounceTimer);
      };
    } else {
      // Node count change (project load): staggered updates
      const t1 = setTimeout(() => { updateAll(); if (onReady) onReady(); }, 200);
      const t2 = setTimeout(updateAll, 800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [nodeIds, viewMode, updateNodeInternals, onReady]);

  return null;
}`;

    c = c.substring(0, huStartIdx) + newHU + c.substring(huEndIdx + huEnd.length);
    fixes++;
    console.log('  ✓ HandleUpdater: added onReady callback');
  }
}

// ── FIX 2: Replace handleViewModeChange (remove DOM manipulation, add state) ──
const oldHVM = c.includes('const handleViewModeChange = useCallback((newMode: string) => {')
  ? c.substring(
      c.indexOf('  const handleViewModeChange = useCallback((newMode: string) => {'),
      c.indexOf('}, [setViewMode]);', c.indexOf('handleViewModeChange')) + '}, [setViewMode]);'.length
    )
  : null;

if (oldHVM && !c.includes('setEdgesVisible')) {
  const newHVM = `  // State-based edge hiding: edges are removed from React tree during transition.
  // This guarantees they never render with wrong handle positions.
  const [edgesVisible, setEdgesVisible] = useState(true);

  const handleViewModeChange = useCallback((newMode: string) => {
    setEdgesVisible(false); // Remove edges from React tree
    setViewMode(newMode);
  }, [setViewMode]);

  const handleEdgesReady = useCallback(() => {
    setEdgesVisible(true); // Restore edges — will compute from current handle positions
  }, []);`;

  c = c.replace(oldHVM, newHVM);
  fixes++;
  console.log('  ✓ handleViewModeChange: React-state edge hiding');
}

// ── FIX 3: processedEdges returns [] when !edgesVisible ──
const oldPE = `  const processedEdges = useMemo(() => {
    const isWb = viewMode === 'whiteboard';
    return edges.map(e => ({`;

const newPE = `  const processedEdges = useMemo(() => {
    if (!edgesVisible) return [];
    const isWb = viewMode === 'whiteboard';
    return edges.map(e => ({`;

if (c.includes(oldPE)) {
  c = c.replace(oldPE, newPE);
  
  // Also add edgesVisible to the useMemo deps
  const oldPEDeps = `  }, [edges, showRelationshipLabels, viewMode, handleEdgeLabelChange, handleEdgeDoubleClickCb]);`;
  const newPEDeps = `  }, [edges, edgesVisible, showRelationshipLabels, viewMode, handleEdgeLabelChange, handleEdgeDoubleClickCb]);`;
  
  if (c.includes(oldPEDeps)) {
    c = c.replace(oldPEDeps, newPEDeps);
  }
  
  fixes++;
  console.log('  ✓ processedEdges: returns [] during transition');
}

// ── FIX 4: Pass onReady to HandleUpdater ──
const oldHUJsx = '<HandleUpdater nodeIds={nodes.map(n => n.id)} viewMode={viewMode} />';
const newHUJsx = '<HandleUpdater nodeIds={nodes.map(n => n.id)} viewMode={viewMode} onReady={handleEdgesReady} />';

if (c.includes(oldHUJsx)) {
  c = c.replace(oldHUJsx, newHUJsx);
  fixes++;
  console.log('  ✓ HandleUpdater JSX: passing onReady callback');
}

if (fixes === 0) {
  console.log('⏭ Already applied');
} else {
  writeDenorm(file, c, crlf);
  console.log(`\n✅ Applied ${fixes} fixes:`);
  console.log('   Edges are REMOVED from React tree during view transition.');
  console.log('   When restored, ReactFlow computes paths from CORRECT handle positions.');
  console.log('   No CSS/DOM hacks. Pure React state management.');
}
