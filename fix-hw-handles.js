#!/usr/bin/env node
const fs = require('fs');
const file = 'src/components/flow/CustomNode.tsx';
let c = fs.readFileSync(file, 'utf8');

// Only target the HW whiteboard section (opacity: 0 → 0.3)
const count = c.split("opacity: ports.length > 0 ? 0 : 1,").length - 1;
c = c.replace(
  /opacity: ports\.length > 0 \? 0 : 1,/g,
  "opacity: ports.length > 0 ? 0.3 : 1,"
);
fs.writeFileSync(file, c, 'utf8');
console.log(`✅ Default handles: opacity 0 → 0.3 (${count}x)`);
