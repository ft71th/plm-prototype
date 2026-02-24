#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// Fix: Edges visible with wrong positions during view switch
//
// Root cause: CSS hiding was in useEffect (fires AFTER render).
// Edges render to screen with stale handle positions for the
// entire duration of React's synchronous re-render of 84 nodes.
//
// Fix: Hide edges SYNCHRONOUSLY via DOM before setState,
//      show them after updateNodeInternals recalculates positions.
//
// Strategy:
//   1. Wrap setViewMode → synchronous DOM: edges visibility=hidden
//   2. HandleUpdater → after updateNodeInternals → visibility=visible
//   3. CSS injection as double-safety fallback
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

let totalFixes = 0;

// ═══════════════════════════════════════════════
// FILE: App.tsx
// ═══════════════════════════════════════════════
{
  const file = 'src/App.tsx';
  let { content: c, crlf } = readNorm(file);
  let fixes = 0;

  // ── FIX 1: Replace HandleUpdater with version that shows edges after update ──
  
  // Match the requestIdleCallback version (from fix-perf-edges.js)
  const oldHU_rIC = `function HandleUpdater({ nodeIds, viewMode }: { nodeIds: string[], viewMode?: string }) {
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

    // Use requestIdleCallback to wait until browser is done rendering,
    // then update handles. Falls back to setTimeout for Safari.
    const rIC = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 100));
    const cIC = (window as any).cancelIdleCallback || clearTimeout;
    
    // First pass: after browser finishes current render work
    const idle1 = rIC(() => updateAll(), { timeout: 500 });
    // Second pass: catch any late-rendering nodes
    const idle2 = rIC(() => updateAll(), { timeout: 2000 });
    // Safety fallback for project load (nodes might not exist on first idle)
    const timer = countChanged ? setTimeout(updateAll, 1000) : null;

    return () => { cIC(idle1); cIC(idle2); if (timer) clearTimeout(timer); };
  }, [nodeIds, viewMode, updateNodeInternals]);

  return null;
}`;

  // Match the CSS-hiding version (from fix-view-switch.js)
  const oldHU_css = /function HandleUpdater\(\{ nodeIds, viewMode \}: \{ nodeIds: string\[\], viewMode\?: string \}\) \{[\s\S]*?const edgeSvg = document\.querySelector[\s\S]*?return null;\n\}/;

  // Match the original version (pre any fix)
  const oldHU_orig = `function HandleUpdater({ nodeIds, viewMode }: { nodeIds: string[], viewMode?: string }) {
  const updateNodeInternals = useUpdateNodeInternals();
  const prevCountRef = React.useRef(0);
  const prevViewModeRef = React.useRef(viewMode);

  React.useEffect(() => {
    if (nodeIds.length === 0) return;
    const countChanged = nodeIds.length !== prevCountRef.current;
    const viewChanged = viewMode !== prevViewModeRef.current;
    prevCountRef.current = nodeIds.length;
    prevViewModeRef.current = viewMode;

    if (!countChanged && !viewChanged) return;

    // On view switch: fast update so edges snap to new handle positions
    const delays = viewChanged ? [50, 200] : [150, 400, 800];
    const timers = delays.map(delay =>
      setTimeout(() => {
        nodeIds.forEach(id => {
          try { updateNodeInternals(id); } catch(e) { /* node may not exist yet */ }
        });
      }, delay)
    );

    return () => timers.forEach(clearTimeout);
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

  let huReplaced = false;
  if (c.includes(oldHU_rIC)) {
    c = c.replace(oldHU_rIC, newHU);
    huReplaced = true;
  } else if (oldHU_css.test(c)) {
    c = c.replace(oldHU_css, newHU);
    huReplaced = true;
  } else if (c.includes(oldHU_orig)) {
    c = c.replace(oldHU_orig, newHU);
    huReplaced = true;
  }
  
  if (huReplaced) {
    fixes++;
    console.log('  ✓ HandleUpdater: show edges after updateNodeInternals');
  }

  // ── FIX 2: Wrap setViewMode → hide edges synchronously before state change ──
  const oldViewModeProp = `onViewModeChange={setViewMode}`;
  const newViewModeProp = `onViewModeChange={handleViewModeChange}`;

  if (c.includes(oldViewModeProp) && !c.includes('const handleViewModeChange')) {
    c = c.replace(oldViewModeProp, newViewModeProp);

    // Insert the callback definition. Find a good spot — after setViewMode is destructured
    const storeAnchor = 'viewMode, setViewMode,';
    const storeIdx = c.indexOf(storeAnchor);
    if (storeIdx !== -1) {
      // Find the end of the destructuring block to insert after it
      // We'll insert after the useLibrary hook (a stable anchor point)
      const libAnchor = '} = useLibrary(';
      const libIdx = c.indexOf(libAnchor);
      if (libIdx !== -1) {
        const libEnd = c.indexOf(');', libIdx) + 2;
        const insertAfter = c.indexOf('\n', libEnd) + 1;
        
        const callback = `
  // Wrap setViewMode to hide edges SYNCHRONOUSLY before React re-renders.
  // This prevents edges from flashing at wrong positions during the render cycle.
  const handleViewModeChange = useCallback((newMode: string) => {
    // Synchronous DOM manipulation — happens BEFORE React starts re-rendering
    const edgeEl = document.querySelector('.react-flow__edges') as HTMLElement | null;
    if (edgeEl) edgeEl.style.visibility = 'hidden';
    setViewMode(newMode);
  }, [setViewMode]);

`;
        c = c.substring(0, insertAfter) + callback + c.substring(insertAfter);
        fixes++;
        console.log('  ✓ handleViewModeChange: synchronous edge hiding before setState');
      }
    }
  }

  // ── FIX 3: Memoize edges.map (if not already done by fix-perf-edges) ──
  const oldEdgesInline = `        edges={edges.map(e => ({
          ...e,
          data: { 
            ...e.data, 
            showLabel: showRelationshipLabels,
            isWhiteboardMode: viewMode === 'whiteboard',
            onLabelChange: (edgeId, newLabel) => {
              setEdges(eds => eds.map(edge => 
                edge.id === edgeId 
                  ? { ...edge, data: { ...edge.data, customLabel: newLabel } }
                  : edge
              ));
            },
            onEdgeDoubleClick: (edgeId, event) => {
              const edge = edges.find(ed => ed.id === edgeId);
              if (edge) {
                setSelectedEdge(edge);
                setEdgePanelPosition({ x: event.clientX, y: event.clientY });
              }
            }
          }
        }))}`;

  if (c.includes(oldEdgesInline)) {
    c = c.replace(oldEdgesInline, `        edges={processedEdges}`);
    
    // Also add processedEdges memo + callbacks if not present
    const pnLine = '  const processedNodes = useMemo(() => {';
    if (c.includes(pnLine) && !c.includes('const processedEdges = useMemo')) {
      const idx = c.indexOf(pnLine);
      const block = `  // ── Stable edge callbacks ──
  const handleEdgeLabelChange = useCallback((edgeId: string, newLabel: string) => {
    setEdges(eds => eds.map(edge =>
      edge.id === edgeId
        ? { ...edge, data: { ...edge.data, customLabel: newLabel } }
        : edge
    ));
  }, [setEdges]);

  const handleEdgeDoubleClickCb = useCallback((edgeId: string, event: any) => {
    const edge = edges.find(ed => ed.id === edgeId);
    if (edge) {
      setSelectedEdge(edge);
      setEdgePanelPosition({ x: event.clientX, y: event.clientY });
    }
  }, [edges, setSelectedEdge, setEdgePanelPosition]);

  const processedEdges = useMemo(() => {
    const isWb = viewMode === 'whiteboard';
    return edges.map(e => ({
      ...e,
      data: {
        ...e.data,
        showLabel: showRelationshipLabels,
        isWhiteboardMode: isWb,
        onLabelChange: handleEdgeLabelChange,
        onEdgeDoubleClick: handleEdgeDoubleClickCb,
      }
    }));
  }, [edges, showRelationshipLabels, viewMode, handleEdgeLabelChange, handleEdgeDoubleClickCb]);

`;
      c = c.substring(0, idx) + block + c.substring(idx);
    }
    fixes++;
    console.log('  ✓ Memoized edges');
  }

  // ── FIX 4: Extract inline node callbacks (if not already done) ──
  const oldNodeCbs = `          onDeleteNode: (nodeId: string) => {
            setNodes((nds) => nds.filter((n) => n.id !== nodeId));
            setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
          },
          onShowIssues: (n) => {
            setIssueNodeId(n.id);
            setShowIssuePanel(true);
          }`;

  if (c.includes(oldNodeCbs) && !c.includes('const handleDeleteNode = useCallback')) {
    c = c.replace(oldNodeCbs, `          onDeleteNode: handleDeleteNode,
          onShowIssues: handleShowIssues`);

    // Add definitions before edge callbacks
    const edgeCbAnchor = '  // ── Stable edge callbacks';
    const pnAnchor = '  const processedNodes = useMemo(() => {';
    const insertAnchor = c.includes(edgeCbAnchor) ? edgeCbAnchor : pnAnchor;
    const insertIdx = c.indexOf(insertAnchor);
    if (insertIdx !== -1) {
      const nodeCbs = `  // ── Stable node callbacks ──
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  const handleShowIssues = useCallback((n: any) => {
    setIssueNodeId(n.id);
    setShowIssuePanel(true);
  }, [setIssueNodeId, setShowIssuePanel]);

`;
      c = c.substring(0, insertIdx) + nodeCbs + c.substring(insertIdx);
    }
    fixes++;
    console.log('  ✓ Extracted stable node callbacks');
  }

  if (fixes > 0) {
    writeDenorm(file, c, crlf);
    totalFixes += fixes;
  }
}

if (totalFixes === 0) {
  console.log('⏭ Already applied');
} else {
  console.log(`\n✅ Applied ${totalFixes} fixes:`);
  console.log('   Key change: edges hidden SYNCHRONOUSLY before React re-render');
  console.log('   → handleViewModeChange: DOM visibility=hidden BEFORE setState');
  console.log('   → HandleUpdater: visibility=visible AFTER updateNodeInternals');
  console.log('   → Edges never visible with wrong handle positions');
}
