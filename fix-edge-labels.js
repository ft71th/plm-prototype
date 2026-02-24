#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// Fix: Edge LABELS visible at wrong positions during view switch
// Fix: Timing — double-rAF too early, need to wait for ResizeObserver
//
// Problem 1: Only hiding .react-flow__edges (SVG lines), but edge labels
//            are in separate .react-flow__edgelabel-renderer (HTML overlay)
// Problem 2: double-rAF fires ~32ms after render, but ReactFlow's internal
//            ResizeObserver needs ~2-5s to measure all 84 nodes
//
// Fix: Hide BOTH containers + use ResizeObserver debounce to detect
//      when all nodes have been measured, THEN show edges
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

// ── FIX 1: handleViewModeChange — hide BOTH edges + labels ──
const oldHVM = `  const handleViewModeChange = useCallback((newMode: string) => {
    // Synchronous DOM manipulation — happens BEFORE React starts re-rendering
    const edgeEl = document.querySelector('.react-flow__edges') as HTMLElement | null;
    if (edgeEl) edgeEl.style.visibility = 'hidden';
    setViewMode(newMode);
  }, [setViewMode]);`;

const newHVM = `  const handleViewModeChange = useCallback((newMode: string) => {
    // Synchronous DOM manipulation — happens BEFORE React starts re-rendering.
    // Must hide BOTH the SVG edge paths AND the HTML edge label overlay.
    const edgeSvg = document.querySelector('.react-flow__edges') as HTMLElement | null;
    const edgeLabels = document.querySelector('.react-flow__edgelabel-renderer') as HTMLElement | null;
    if (edgeSvg) edgeSvg.style.visibility = 'hidden';
    if (edgeLabels) edgeLabels.style.visibility = 'hidden';
    setViewMode(newMode);
  }, [setViewMode]);`;

if (c.includes(oldHVM)) {
  c = c.replace(oldHVM, newHVM);
  fixes++;
  console.log('  ✓ handleViewModeChange: hide both edges + labels');
}

// ── FIX 2: HandleUpdater — ResizeObserver debounce + show both containers ──
const oldHU = `function HandleUpdater({ nodeIds, viewMode }: { nodeIds: string[], viewMode?: string }) {
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

    const updateAllAndShowEdges = () => {
      nodeIds.forEach(id => {
        try { updateNodeInternals(id); } catch(e) {}
      });
      // Show edges after handle positions are recalculated
      requestAnimationFrame(() => {
        const el = document.querySelector('.react-flow__edges') as HTMLElement | null;
        if (el) el.style.visibility = '';
      });
    };

    if (viewChanged) {
      // Edges are already hidden by handleViewModeChange (synchronous DOM).
      // Wait for nodes to finish rendering, then batch-update handles.
      // Double-rAF ensures browser has painted new node layout.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateAllAndShowEdges();
          // Safety pass for late-rendering nodes (images, etc.)
          setTimeout(updateAllAndShowEdges, 400);
        });
      });
    } else {
      // Node count change (project load): staggered updates
      const t1 = setTimeout(updateAllAndShowEdges, 200);
      const t2 = setTimeout(updateAllAndShowEdges, 800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [nodeIds, viewMode, updateNodeInternals]);

  return null;
}`;

const newHU = `function HandleUpdater({ nodeIds, viewMode }: { nodeIds: string[], viewMode?: string }) {
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

    const showEdges = () => {
      const edgeSvg = document.querySelector('.react-flow__edges') as HTMLElement | null;
      const edgeLabels = document.querySelector('.react-flow__edgelabel-renderer') as HTMLElement | null;
      if (edgeSvg) edgeSvg.style.visibility = '';
      if (edgeLabels) edgeLabels.style.visibility = '';
    };

    const updateAllAndShow = () => {
      nodeIds.forEach(id => {
        try { updateNodeInternals(id); } catch(e) {}
      });
      requestAnimationFrame(showEdges);
    };

    if (viewChanged) {
      // Edges + labels are hidden by handleViewModeChange.
      // We need to wait until ReactFlow's ResizeObserver has measured
      // all nodes (can take seconds for 84+ nodes). Use our own
      // ResizeObserver on the nodes container with a debounce:
      // when no resize events fire for 150ms, nodes are done.
      const nodesContainer = document.querySelector('.react-flow__nodes');
      let debounceTimer: any = null;
      let ro: ResizeObserver | null = null;
      let safetyTimer: any = null;

      const finalize = () => {
        if (ro) ro.disconnect();
        if (safetyTimer) clearTimeout(safetyTimer);
        if (debounceTimer) clearTimeout(debounceTimer);
        updateAllAndShow();
      };

      if (nodesContainer) {
        ro = new ResizeObserver(() => {
          // Each time a node resizes, reset the debounce timer
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(finalize, 150);
        });

        // Observe all current node wrappers
        nodesContainer.querySelectorAll('.react-flow__node').forEach(node => {
          ro!.observe(node);
        });

        // Also kick off observation after React renders new nodes
        requestAnimationFrame(() => {
          if (nodesContainer && ro) {
            nodesContainer.querySelectorAll('.react-flow__node').forEach(node => {
              ro!.observe(node);
            });
          }
        });
      }

      // Safety fallback: always show edges after 6s max
      safetyTimer = setTimeout(finalize, 6000);

      return () => {
        if (ro) ro.disconnect();
        if (safetyTimer) clearTimeout(safetyTimer);
        if (debounceTimer) clearTimeout(debounceTimer);
      };
    } else {
      // Node count change (project load): staggered updates
      const t1 = setTimeout(updateAllAndShow, 200);
      const t2 = setTimeout(updateAllAndShow, 800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [nodeIds, viewMode, updateNodeInternals]);

  return null;
}`;

if (c.includes(oldHU)) {
  c = c.replace(oldHU, newHU);
  fixes++;
  console.log('  ✓ HandleUpdater: ResizeObserver debounce + show both containers');
}

if (fixes === 0) {
  console.log('⏭ Already applied');
} else {
  writeDenorm(file, c, crlf);
  console.log(`\n✅ Applied ${fixes} fixes:`);
  console.log('   - Edge labels hidden during view switch (not just SVG lines)');
  console.log('   - ResizeObserver debounce: waits for ALL nodes to be measured');
  console.log('   - Shows edges only after handle positions are correct');
}
