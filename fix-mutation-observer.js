#!/usr/bin/env node
// Fix: Use MutationObserver (not ResizeObserver) to detect render completion
// ResizeObserver fails when nodes don't change size (just content).
// MutationObserver fires on ANY DOM change — React attribute/class updates.
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

// Replace ResizeObserver block with MutationObserver
const oldBlock = `    if (viewChanged) {
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
      };`;

const newBlock = `    if (viewChanged) {
      // Edges + labels are hidden by handleViewModeChange.
      // Use MutationObserver to detect when React finishes updating nodes.
      // When no DOM mutations for 200ms → nodes are rendered → update handles.
      const nodesContainer = document.querySelector('.react-flow__nodes');
      let debounceTimer: any = null;
      let mo: MutationObserver | null = null;
      let done = false;

      const finalize = () => {
        if (done) return;
        done = true;
        if (mo) mo.disconnect();
        if (debounceTimer) clearTimeout(debounceTimer);
        updateAllAndShow();
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

      // Start debounce immediately — if no mutations, fires after 200ms
      resetDebounce();

      return () => {
        if (mo) mo.disconnect();
        if (debounceTimer) clearTimeout(debounceTimer);
      };`;

if (c.includes(oldBlock)) {
  c = c.replace(oldBlock, newBlock);
  fixes++;
  writeDenorm(file, c, crlf);
  console.log('✅ Replaced ResizeObserver with MutationObserver');
} else if (c.includes('MutationObserver(resetDebounce)')) {
  console.log('⏭ Already applied');
} else {
  console.log('⚠ Could not find ResizeObserver block to replace');
}
