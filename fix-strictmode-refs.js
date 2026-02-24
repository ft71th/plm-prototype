#!/usr/bin/env node
// Fix: React StrictMode prevents edges from appearing.
// Refs were updated before timeouts started. StrictMode cleanup
// clears timeout, re-run sees refs already updated → early return → no edges.
// Fix: move ref updates inside the timeout callback.
const fs = require('fs');

const file = 'src/App.tsx';
let c = fs.readFileSync(file, 'utf8');
const crlf = c.includes('\r\n');
if (crlf) c = c.replace(/\r\n/g, '\n');

// The bug: refs updated in effect body, before timeout
const oldRefUpdate = `    const countChanged = nodeIds.length !== prevCountRef.current;
    const viewChanged = viewMode !== prevViewRef.current;
    prevCountRef.current = nodeIds.length;
    prevViewRef.current = viewMode;

    if (!countChanged && !viewChanged) return;

    const updateAll = () => {
      nodeIds.forEach(id => {
        try { updateNodeInternals(id); } catch(e) {}
      });
    };`;

// Fix: refs updated inside updateAll (only when timeout actually fires)
const newRefUpdate = `    const countChanged = nodeIds.length !== prevCountRef.current;
    const viewChanged = viewMode !== prevViewRef.current;

    if (!countChanged && !viewChanged) return;

    // Refs updated INSIDE updateAll, not here. Critical for StrictMode:
    //   Run 1: starts timeout → cleanup clears it (refs still stale)
    //   Run 2: still sees change → starts NEW timeout (this one fires)
    const updateAll = () => {
      prevCountRef.current = nodeIds.length;
      prevViewRef.current = viewMode;
      nodeIds.forEach(id => {
        try { updateNodeInternals(id); } catch(e) {}
      });
    };`;

if (c.includes(oldRefUpdate)) {
  c = c.replace(oldRefUpdate, newRefUpdate);
  if (crlf) c = c.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, c, 'utf8');
  console.log('✅ Moved ref updates inside timeout (StrictMode-safe)');
} else if (c.includes('// Refs updated INSIDE updateAll')) {
  console.log('⏭ Already applied');
} else {
  console.log('⚠ Could not find ref update pattern to replace');
}
