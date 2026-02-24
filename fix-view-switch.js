#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// Fix: Edge rendering lag on view switch (PLM ↔ Simple)
//
// Root cause: 252 individual updateNodeInternals calls
//   84 from CustomNode useEffect (rAF on isWhiteboardMode change)
//   84 from HandleUpdater at 50ms
//   84 from HandleUpdater at 200ms
// Each call triggers full edge recalculation → 5s of wrong edges
//
// Fix 1: Remove isWhiteboardMode from CustomNode's updateNodeInternals deps
//         (HandleUpdater already handles view switches)
// Fix 2: CSS-based edge hiding during transition (no React re-render)
// Fix 3: Single batch updateNodeInternals after render completes
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
// FILE 1: CustomNode.tsx
// Remove isWhiteboardMode from updateNodeInternals deps
// ═══════════════════════════════════════════════
{
  const file = 'src/components/flow/CustomNode.tsx';
  let { content: c, crlf } = readNorm(file);
  let fixes = 0;

  // Remove data.isWhiteboardMode from the useEffect dependency that calls updateNodeInternals
  const oldDeps = `  }, [id, updateNodeInternals, data.isWhiteboardMode, data.label, data.nodeWidth, data.nodeHeight]);`;
  const newDeps = `  }, [id, updateNodeInternals, data.label, data.nodeWidth, data.nodeHeight]);`;
  
  if (c.includes(oldDeps)) {
    c = c.replace(oldDeps, newDeps);
    fixes++;
    console.log('  ✓ CustomNode: removed isWhiteboardMode from updateNodeInternals deps');
  }

  if (fixes > 0) {
    writeDenorm(file, c, crlf);
    totalFixes += fixes;
  }
}

// ═══════════════════════════════════════════════
// FILE 2: App.tsx
// - Rewrite HandleUpdater: CSS hide edges → wait for render → batch update → show edges
// - Memoize edges & callbacks
// ═══════════════════════════════════════════════
{
  const file = 'src/App.tsx';
  let { content: c, crlf } = readNorm(file);
  let fixes = 0;

  // ── Fix HandleUpdater ──
  const oldHandleUpdater = `function HandleUpdater({ nodeIds, viewMode }: { nodeIds: string[], viewMode?: string }) {
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

  const newHandleUpdater = `function HandleUpdater({ nodeIds, viewMode }: { nodeIds: string[], viewMode?: string }) {
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

    // Hide edges via CSS during transition (no React re-render needed)
    const edgeSvg = document.querySelector('.react-flow__edges') as HTMLElement | null;
    if (viewChanged && edgeSvg) {
      edgeSvg.style.opacity = '0';
      edgeSvg.style.transition = 'none';
    }

    const batchUpdate = () => {
      nodeIds.forEach(id => {
        try { updateNodeInternals(id); } catch(e) {}
      });
      // Show edges after handle positions are recalculated
      if (edgeSvg) {
        requestAnimationFrame(() => {
          edgeSvg.style.transition = 'opacity 0.15s ease';
          edgeSvg.style.opacity = '1';
        });
      }
    };

    if (viewChanged) {
      // View switch: wait for React to finish rendering all nodes,
      // then do ONE batch update. Double-rAF ensures DOM is painted.
      const timer = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          batchUpdate();
          // Safety pass for late-rendering nodes
          setTimeout(batchUpdate, 300);
        });
      });
      return () => cancelAnimationFrame(timer);
    } else {
      // Node count change (project load): staggered updates
      const timers = [200, 600].map(d => setTimeout(batchUpdate, d));
      return () => timers.forEach(clearTimeout);
    }
  }, [nodeIds, viewMode, updateNodeInternals]);

  return null;
}`;

  if (c.includes(oldHandleUpdater)) {
    c = c.replace(oldHandleUpdater, newHandleUpdater);
    fixes++;
    console.log('  ✓ HandleUpdater: CSS edge hiding + double-rAF + single batch');
  }

  // ── Memoize edges.map that's inline in JSX ──
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
    fixes++;
    console.log('  ✓ Replaced inline edges.map with memoized processedEdges');
  }

  // Add processedEdges + callbacks before processedNodes
  const processedNodesLine = '  const processedNodes = useMemo(() => {';
  if (c.includes(processedNodesLine) && !c.includes('const processedEdges = useMemo')) {
    const idx = c.indexOf(processedNodesLine);
    const block = `  // ── Stable callbacks (avoid new refs every render) ──
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

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  const handleShowIssues = useCallback((n: any) => {
    setIssueNodeId(n.id);
    setShowIssuePanel(true);
  }, [setIssueNodeId, setShowIssuePanel]);

  // ── Memoized edges (prevents new objects per render) ──
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
    fixes++;
    console.log('  ✓ Added memoized processedEdges + stable callbacks');
  }

  // Extract inline node callbacks
  const oldNodeCbs = `          onDeleteNode: (nodeId: string) => {
            setNodes((nds) => nds.filter((n) => n.id !== nodeId));
            setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
          },
          onShowIssues: (n) => {
            setIssueNodeId(n.id);
            setShowIssuePanel(true);
          }`;

  if (c.includes(oldNodeCbs)) {
    c = c.replace(oldNodeCbs, `          onDeleteNode: handleDeleteNode,
          onShowIssues: handleShowIssues`);
    fixes++;
    console.log('  ✓ Replaced inline node callbacks with stable refs');
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
  console.log('   - CustomNode: removed 84 redundant updateNodeInternals on view switch');
  console.log('   - HandleUpdater: CSS edge hiding (instant, no React re-render)');
  console.log('   - HandleUpdater: double-rAF waits for actual paint before updating');
  console.log('   - Edges + node callbacks memoized (fewer allocations per render)');
}
