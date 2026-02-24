#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// Comprehensive performance fix for view switching
//
// Problem 1: edges.map inline in JSX → 74 new objects EVERY render
// Problem 2: HandleUpdater fires at 50/200ms, nodes take 3-5s to render
// Problem 3: processedNodes creates inline functions per node
//
// Fix 1: Memoize edges with useMemo
// Fix 2: HandleUpdater uses requestIdleCallback (waits for render done)
// Fix 3: Extract stable callbacks for onDeleteNode/onShowIssues
// ═══════════════════════════════════════════════════════════
const fs = require('fs');
const file = 'src/App.tsx';
let c = fs.readFileSync(file, 'utf8');
const hadCRLF = c.includes('\r\n');
if (hadCRLF) c = c.replace(/\r\n/g, '\n');

let fixes = 0;

// ── FIX 1: Memoize the edges for ReactFlow ──
// Replace inline edges.map with a memoized version
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

const newEdgesInline = `        edges={processedEdges}`;

if (c.includes(oldEdgesInline)) {
  c = c.replace(oldEdgesInline, newEdgesInline);
  fixes++;
  console.log('  ✓ Replaced inline edges.map with processedEdges ref');
}

// Now add the memoized processedEdges + callbacks before processedNodes
const processedNodesLine = '  const processedNodes = useMemo(() => {';
if (c.includes(processedNodesLine) && !c.includes('const processedEdges = useMemo')) {
  const insertIdx = c.indexOf(processedNodesLine);
  const edgesMemo = `  // ── Stable edge callbacks (avoid new refs every render) ──
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

  // ── Memoized edges (prevents 74 new objects per render) ──
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
  c = c.substring(0, insertIdx) + edgesMemo + c.substring(insertIdx);
  fixes++;
  console.log('  ✓ Added memoized processedEdges + stable callbacks');
}

// ── FIX 2: Extract stable node callbacks from processedNodes ──
const oldNodeCallbacks = `          onDeleteNode: (nodeId: string) => {
            setNodes((nds) => nds.filter((n) => n.id !== nodeId));
            setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
          },
          onShowIssues: (n) => {
            setIssueNodeId(n.id);
            setShowIssuePanel(true);
          }`;

const newNodeCallbacks = `          onDeleteNode: handleDeleteNode,
          onShowIssues: handleShowIssues`;

if (c.includes(oldNodeCallbacks)) {
  c = c.replace(oldNodeCallbacks, newNodeCallbacks);
  fixes++;
  console.log('  ✓ Replaced inline node callbacks with stable refs');

  // Add the useCallback definitions before processedEdges
  const edgesCallbackLine = '  // ── Stable edge callbacks';
  if (c.includes(edgesCallbackLine) && !c.includes('const handleDeleteNode = useCallback')) {
    const insertIdx = c.indexOf(edgesCallbackLine);
    const nodeCallbacks = `  // ── Stable node callbacks (avoid new refs per node per render) ──
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  const handleShowIssues = useCallback((n: any) => {
    setIssueNodeId(n.id);
    setShowIssuePanel(true);
  }, [setIssueNodeId, setShowIssuePanel]);

`;
    c = c.substring(0, insertIdx) + nodeCallbacks + c.substring(insertIdx);
    fixes++;
    console.log('  ✓ Added stable handleDeleteNode/handleShowIssues callbacks');
  }
}

// ── FIX 3: HandleUpdater — use requestIdleCallback to wait for render ──
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

if (c.includes(oldHandleUpdater)) {
  c = c.replace(oldHandleUpdater, newHandleUpdater);
  fixes++;
  console.log('  ✓ HandleUpdater: requestIdleCallback (waits for render completion)');
}

// Also handle the earlier version of HandleUpdater (pre fix-edges-all)
const oldHandleUpdaterV1 = `function HandleUpdater({ nodeIds }: { nodeIds: string[] }) {
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

if (c.includes(oldHandleUpdaterV1)) {
  c = c.replace(oldHandleUpdaterV1, newHandleUpdater);
  fixes++;
  console.log('  ✓ HandleUpdater V1: upgraded to viewMode + requestIdleCallback');

  // Also update the JSX to pass viewMode
  if (c.includes('<HandleUpdater nodeIds={nodes.map(n => n.id)} />')) {
    c = c.replace(
      '<HandleUpdater nodeIds={nodes.map(n => n.id)} />',
      '<HandleUpdater nodeIds={nodes.map(n => n.id)} viewMode={viewMode} />'
    );
    fixes++;
    console.log('  ✓ Passing viewMode to HandleUpdater');
  }
}

if (fixes === 0) {
  console.log('⏭ Already applied');
} else {
  if (hadCRLF) c = c.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, c, 'utf8');
  console.log(`\n✅ Performance fix: ${fixes} changes`);
  console.log('   - Edges memoized (74 fewer object allocations per render)');
  console.log('   - Node callbacks stable (84 fewer function allocations)');
  console.log('   - HandleUpdater waits for actual render completion');
}
