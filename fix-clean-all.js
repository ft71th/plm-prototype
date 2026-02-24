#!/usr/bin/env node
// Fixes:
// 1. HandleUpdater: remove all debug logs + viewChanged dead code
// 2. handleViewModeChange: add setTimeout(300) for edge restore
// 3. processedEdges: remove inline debug log
// 4. Use memoNodeIds in JSX
const fs = require('fs');

const file = 'src/App.tsx';
let c = fs.readFileSync(file, 'utf8');
const crlf = c.includes('\r\n');
if (crlf) c = c.replace(/\r\n/g, '\n');

let fixes = 0;

// ── 1. Replace entire HandleUpdater ──
const huRegex = /function HandleUpdater\(\{[^}]*\}[^{]*\{[\s\S]*?return null;\n\}\n/;
const huMatch = c.match(huRegex);
if (huMatch && (huMatch[0].includes('console.log') || huMatch[0].includes('viewChanged') || huMatch[0].includes('viewMode'))) {
  const cleanHU = `function HandleUpdater({ nodeIds, onReady }: { nodeIds: string[], onReady?: () => void }) {
  const updateNodeInternals = useUpdateNodeInternals();
  const prevCountRef = React.useRef(0);

  React.useEffect(() => {
    if (nodeIds.length === 0) return;
    const countChanged = nodeIds.length !== prevCountRef.current;
    if (!countChanged) return;

    const updateAll = () => {
      prevCountRef.current = nodeIds.length;
      nodeIds.forEach(id => {
        try { updateNodeInternals(id); } catch(e) {}
      });
    };

    // Node count change (initial load, add/remove nodes): staggered updates
    const t1 = setTimeout(() => { updateAll(); if (onReady) onReady(); }, 200);
    const t2 = setTimeout(updateAll, 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [nodeIds, updateNodeInternals, onReady]);

  return null;
}
`;
  c = c.replace(huMatch[0], cleanHU);
  fixes++;
  console.log('  ✓ HandleUpdater: clean (no debug, no viewChanged)');
}

// ── 2. handleViewModeChange: add setTimeout(300) ──
if (!c.includes('edgeTimerRef.current = setTimeout')) {
  // Add edgeTimerRef if not present
  if (!c.includes('edgeTimerRef')) {
    c = c.replace(
      '  const [edgesVisible, setEdgesVisible] = useState(true);\n\n  const handleViewModeChange',
      '  const [edgesVisible, setEdgesVisible] = useState(true);\n\n  const edgeTimerRef = useRef<any>(null);\n\n  const handleViewModeChange'
    );
  }

  // Replace handleViewModeChange — match ANY version (with/without debug logs/comments)
  const hvmRegex = /  const handleViewModeChange = useCallback\(\(newMode: string\) => \{[\s\S]*?\}, \[setViewMode\]\);/;
  const hvmMatch = c.match(hvmRegex);
  if (hvmMatch && !hvmMatch[0].includes('setTimeout')) {
    c = c.replace(hvmMatch[0],
      `  const handleViewModeChange = useCallback((newMode: string) => {\n    setEdgesVisible(false);\n    setViewMode(newMode);\n    if (edgeTimerRef.current) clearTimeout(edgeTimerRef.current);\n    edgeTimerRef.current = setTimeout(() => setEdgesVisible(true), 300);\n  }, [setViewMode]);`
    );
    fixes++;
    console.log('  ✓ handleViewModeChange: setTimeout(300) edge restore');
  }

  // Also clean handleEdgesReady (remove debug logs)
  const herRegex = /  const handleEdgesReady = useCallback\(\(\) => \{[\s\S]*?\}, \[\]\);/;
  const herMatch = c.match(herRegex);
  if (herMatch && herMatch[0].includes('console.log')) {
    c = c.replace(herMatch[0],
      `  const handleEdgesReady = useCallback(() => {\n    setEdgesVisible(true);\n  }, []);`
    );
  }
}

// ── 3. Remove debug logs ──
const beforeLen = c.length;
// Remove standalone debug log lines
c = c.replace(/\n\s*console\.log\(`\[EDGES\][^`]*`\);\n/g, '\n');
c = c.replace(/\n\s*console\.log\(`\[HU\][^`]*`\);\n/g, '\n');
// Fix inline debug in processedEdges  
const inlineDebugLine = c.match(/.*if \(!edgesVisible\).*console\.log.*return \[\].*\n/);
if (inlineDebugLine) {
  c = c.replace(inlineDebugLine[0], '    if (!edgesVisible) return [];\n');
}
if (c.length !== beforeLen) { fixes++; console.log('  ✓ Removed debug logs'); }

// ── 4. Use memoNodeIds in JSX ──
if (c.includes("nodeIds={nodes.map(n => n.id)}") && c.includes('memoNodeIds')) {
  c = c.replace(
    '<HandleUpdater nodeIds={nodes.map(n => n.id)}',
    '<HandleUpdater nodeIds={memoNodeIds}'
  );
  fixes++;
  console.log('  ✓ HandleUpdater JSX: using memoNodeIds');
}

if (fixes === 0) {
  console.log('⏭ Already clean');
} else {
  if (crlf) c = c.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, c, 'utf8');
  console.log(`\n✅ Applied ${fixes} fixes`);
}
