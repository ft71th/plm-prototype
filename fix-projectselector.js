#!/usr/bin/env node
// Fix 1: ProjectSelector always dark (don't inherit light theme vars)
// Fix 2: Load objectDescription from project data
const fs = require('fs');
let fixed = 0;

function r(file, old, rep, label) {
  let c = fs.readFileSync(file, 'utf8');
  const n = c.split(old).length - 1;
  if (n > 0) {
    c = c.split(old).join(rep);
    fs.writeFileSync(file, c, 'utf8');
    console.log(`  ✅ ${label} (${n}x)`);
    fixed += n;
  } else {
    console.log(`  ⏭ Already done: ${label}`);
  }
}

console.log('🔧 Fix ProjectSelector + objectDescription\n');

// Fix 1: ProjectSelector - revert CSS vars to hardcoded dark
console.log('📌 ProjectSelector: force dark theme');
r('src/ProjectSelector.jsx',
  "background: 'var(--nl-bg-panel, #2c3e50)'",
  "background: '#2c3e50'",
  'Card bg → hardcoded dark'
);
r('src/ProjectSelector.jsx',
  "background: 'var(--nl-bg-input, #34495e)'",
  "background: '#34495e'",
  'Input bg → hardcoded dark'
);
r('src/ProjectSelector.jsx',
  "border: '1px solid var(--nl-border, #4a5f7f)'",
  "border: '1px solid #4a5f7f'",
  'Border → hardcoded dark'
);

// Fix 2: Load objectDescription from project data
console.log('\n📌 App.tsx: load objectDescription');
r('src/App.tsx',
  "setObjectName(projectData.project?.name || projectData.name || 'New Project');\n    setObjectVersion",
  "setObjectName(projectData.project?.name || projectData.name || 'New Project');\n    setObjectDescription(projectData.project?.description || projectData.description || '');\n    setObjectVersion",
  'Load description from project'
);

console.log(`\n✅ ${fixed} fixes applied. Restart dev server.`);
