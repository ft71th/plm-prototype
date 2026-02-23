#!/usr/bin/env node
// ═══════════════════════════════════════════════════════
// Final theme fix: DocView, Whiteboard, Tasks sync
// Run: node fix-theme-final.js
// ═══════════════════════════════════════════════════════
const fs = require('fs');
let fixed = 0;

function r(file, old, rep, label) {
  if (!fs.existsSync(file)) { console.log(`  ⚠ Missing: ${file}`); return; }
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

console.log('🎨 Final theme fixes...\n');

// ── 1. DocumentViewEnhanced: remaining #2c3e50 backgrounds ──
console.log('📌 DocumentViewEnhanced');
r('src/DocumentViewEnhanced.jsx',
  "background: '#2c3e50',",
  "background: 'var(--nl-bg-input, #2c3e50)',",
  'DocView #2c3e50 → var'
);
r('src/DocumentViewEnhanced.jsx',
  "border: '2px dashed #34495e'",
  "border: '2px dashed var(--nl-border, #34495e)'",
  'DocView dashed border'
);
r('src/DocumentViewEnhanced.jsx',
  "borderTop: '2px solid #34495e'",
  "borderTop: '2px solid var(--nl-border, #34495e)'",
  'DocView top border'
);
r('src/DocumentViewEnhanced.jsx',
  "border: '1px solid #4a5f7f'",
  "border: '1px solid var(--nl-border-light, #4a5f7f)'",
  'DocView border light'
);
r('src/DocumentViewEnhanced.jsx',
  "background: '#34495e'",
  "background: 'var(--nl-border, #34495e)'",
  'DocView #34495e bg'
);
r('src/DocumentViewEnhanced.jsx',
  "borderBottom: '2px solid #34495e'",
  "borderBottom: '2px solid var(--nl-border, #34495e)'",
  'DocView bottom border 2px'
);
r('src/DocumentViewEnhanced.jsx',
  "borderBottom: '1px solid #34495e22'",
  "borderBottom: '1px solid var(--nl-border, #34495e22)'",
  'DocView bottom border 1px'
);

// ── 2. Whiteboard background ──
console.log('\n📌 Whiteboard');
r('src/components/Whiteboard/Whiteboard.jsx',
  "background: '#fafafa',",
  "background: 'var(--nl-bg-canvas, #fafafa)',",
  'Whiteboard bg'
);

// ── 3. Pass isDarkMode to TaskProvider ──
console.log('\n📌 App.tsx → TaskProvider');
r('src/App.tsx',
  "currentUser={user?.name || 'user'}>",
  "currentUser={user?.name || 'user'} isDarkMode={isDarkMode}>",
  'TaskProvider isDarkMode prop'
);

// ── 4. TaskContext: sync appDarkMode ──
console.log('\n📌 TaskContext sync');
r('src/tasks/TaskContext.tsx',
  "try { return localStorage.getItem(PROJECT_THEME_KEY) || 'dark'; } catch { return 'dark'; }\n  });\n  const themeKey",
  `try { return localStorage.getItem(PROJECT_THEME_KEY) || 'dark'; } catch { return 'dark'; }
  });
  
  // Sync with app-level dark/light mode toggle
  useEffect(() => {
    if (appDarkMode !== undefined) {
      const newKey = appDarkMode ? 'dark' : 'light';
      setProjectThemeFallback(newKey);
      try { localStorage.setItem(PROJECT_THEME_KEY, newKey); } catch {}
    }
  }, [appDarkMode, PROJECT_THEME_KEY]);
  
  const themeKey`,
  'TaskContext appDarkMode sync'
);

console.log(`\n${'═'.repeat(50)}`);
console.log(`✅ ${fixed} fixes applied. Restart dev server.`);
