#!/usr/bin/env node
// Fix: Drop MutationObserver (fires infinitely, edges never shown).
// Use simple setTimeout instead. React's synchronous render blocks
// the main thread, so setTimeout(50) fires AFTER render completes.
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

const oldBlock = `    if (viewChanged) {
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
      };`;

const newBlock = `    if (viewChanged) {
      // Edges are empty (React-level) during transition.
      // React's synchronous render of 84 nodes blocks the main thread.
      // Any setTimeout will fire AFTER that render completes.
      // So even a short timeout guarantees nodes have their new dimensions.
      const t1 = setTimeout(() => {
        updateAll();
        // Wait one frame for ReactFlow to process handle updates
        requestAnimationFrame(() => {
          if (onReady) onReady();
        });
      }, 50);
      // Safety: second pass for late-loading content (images, etc.)
      const t2 = setTimeout(updateAll, 500);
      return () => { clearTimeout(t1); clearTimeout(t2); };`;

if (c.includes(oldBlock)) {
  c = c.replace(oldBlock, newBlock);
  writeDenorm(file, c, crlf);
  console.log('✅ Replaced MutationObserver with simple setTimeout(50)');
} else if (c.includes('// React\'s synchronous render of 84 nodes blocks the main thread.')) {
  console.log('⏭ Already applied');
} else {
  console.log('⚠ Could not find MutationObserver block');
}
