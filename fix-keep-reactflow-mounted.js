#!/usr/bin/env node
/**
 * Keep ReactFlow always mounted — hide with CSS instead of unmounting.
 * 
 * Problem: Switching to Tasks/Gantt/Docs unmounts ReactFlow entirely.
 * Returning to PLM/Simple remounts 84 nodes from scratch (10-15s).
 * 
 * Fix: Change ternary chain to individual {condition && ...} blocks
 * + always-rendered ReactFlow wrapper with conditional display.
 */
const fs = require('fs');

const path = 'src/App.tsx';
let c = fs.readFileSync(path, 'utf8');
const crlf = c.includes('\r\n');
if (crlf) c = c.replace(/\r\n/g, '\n');

// Check if already applied
if (c.includes('isCanvasView') && c.includes("display: isCanvasView")) {
  console.log('⏭ Already applied');
  process.exit(0);
}

let fixes = 0;

// 1. Add isCanvasView const
if (!c.includes('isCanvasView')) {
  c = c.replace(
    '  // Stable nodeIds',
    "  // Canvas views keep ReactFlow mounted; non-canvas views hide it via CSS.\n  const isCanvasView = viewMode === 'plm' || viewMode === 'whiteboard' || viewMode === 'simple';\n\n  // Stable nodeIds"
  );
  fixes++;
  console.log('  ✓ Added isCanvasView const');
}

// 2. Convert ternary chain to individual conditional blocks
// Pattern: `) : viewMode === 'X' ? (` → `)}\n      {viewMode === 'X' && (`
const ternaryViews = ['tasks', 'gantt', '3d', 'sequence', 'docs', 'freeform'];
for (const view of ternaryViews) {
  const from = `) : viewMode === '${view}' ? (`;
  const to = `)}\n      {viewMode === '${view}' && (`;
  if (c.includes(from)) {
    c = c.replace(from, to);
    fixes++;
  }
}

// Convert first branch from ternary to conditional
if (c.includes("viewMode === 'document' ? (")) {
  c = c.replace("viewMode === 'document' ? (", "viewMode === 'document' && (");
  fixes++;
}

// 3. Replace the else branch `) : (` before ReactFlow with wrapper div
// Find the pattern: freeform close + else + ReactFlow
const elsePattern = /(\s*<Whiteboard[^/]*\/>\n\s*)\) : \(\s*\n\s*(<ReactFlow)/;
const elseMatch = c.match(elsePattern);
if (elseMatch) {
  c = c.replace(elsePattern, 
    `$1)}\n\n      {/* ReactFlow canvas — always mounted, hidden via CSS when non-canvas view active */}\n      <div style={{ display: isCanvasView ? undefined : 'none', width: '100%', height: '100%' }}>\n      $2`
  );
  fixes++;
  console.log('  ✓ Wrapped ReactFlow in persistent div');
}

// 4. Replace closing `)}` after `</ReactFlow>` with `</div>`
if (c.includes('</ReactFlow>\n      )}')) {
  c = c.replace('</ReactFlow>\n      )}', '</ReactFlow>\n      </div>');
  fixes++;
  console.log('  ✓ Closed wrapper div');
}

if (fixes > 0) {
  if (crlf) c = c.replace(/\n/g, '\r\n');
  fs.writeFileSync(path, c, 'utf8');
  console.log(`\n✅ Applied ${fixes} changes — ReactFlow stays mounted during view switches`);
} else {
  console.log('⏭ No changes needed');
}
