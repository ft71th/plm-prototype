#!/usr/bin/env node
// ═══════════════════════════════════════════════════════
// COMPREHENSIVE FIX: CSS vars, edges, backgrounds
// Run from project root: node fix-comprehensive.js
// ═══════════════════════════════════════════════════════
const fs = require('fs');
let fixed = 0;

function r(file, old, rep, label) {
  if (!fs.existsSync(file)) { console.log(`  ⚠ Missing: ${file}`); return false; }
  let c = fs.readFileSync(file, 'utf8');
  if (c.includes(old)) {
    c = c.replace(old, rep);
    fs.writeFileSync(file, c, 'utf8');
    console.log(`  ✅ ${label}`);
    fixed++;
    return true;
  }
  console.log(`  ⏭ Already done: ${label}`);
  return false;
}

console.log('🔧 Comprehensive fixes...\n');

// ═══════════════════════════════════════════════════════
// FIX 1: Propagate CSS variables to document.documentElement
// This is the ROOT CAUSE of theme not working in fixed components
// ═══════════════════════════════════════════════════════
console.log('📌 Fix 1: CSS variable propagation to :root');

r('src/App.tsx',
  `const theme = useMemo(() => getTheme(isDarkMode), [isDarkMode]);\n\n  // ─── Custom Hooks`,
  `const theme = useMemo(() => getTheme(isDarkMode), [isDarkMode]);\n\n  // ─── Sync CSS variables to :root for global inheritance ───\n  useEffect(() => {\n    const root = document.documentElement;\n    Object.entries({\n      '--nl-bg-app': theme.bgApp,\n      '--nl-bg-header': theme.bgHeader,\n      '--nl-bg-header-border': theme.bgHeaderBorder,\n      '--nl-bg-sidebar': theme.bgSidebar,\n      '--nl-bg-canvas': theme.bgCanvas,\n      '--nl-bg-panel': theme.bgPanel,\n      '--nl-bg-input': theme.bgInput,\n      '--nl-bg-hover': theme.bgHover,\n      '--nl-bg-accent': theme.bgAccent,\n      '--nl-bg-overlay': theme.bgOverlay,\n      '--nl-text-primary': theme.textPrimary,\n      '--nl-text-secondary': theme.textSecondary,\n      '--nl-text-muted': theme.textMuted,\n      '--nl-text-inverse': theme.textInverse,\n      '--nl-border': theme.border,\n      '--nl-border-light': theme.borderLight,\n      '--nl-border-focus': theme.borderFocus,\n      '--nl-accent': theme.accent,\n      '--nl-shadow': theme.shadow,\n      '--nl-shadow-lg': theme.shadowLg,\n    }).forEach(([key, value]) => root.style.setProperty(key, value));\n    root.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');\n  }, [theme, isDarkMode]);\n\n  // ─── Custom Hooks`,
  'Add useEffect to sync CSS vars to :root'
);

// ═══════════════════════════════════════════════════════
// FIX 2: Edge rendering - simplify to fixed delay
// The debounce approach causes cascading resets with many nodes
// ═══════════════════════════════════════════════════════
console.log('\n📌 Fix 2: Simplified edge rendering');

r('src/App.tsx',
  `let fallback: any;\n    let raf: any;\n    if (prevViewModeRef.current !== null && prevViewModeRef.current !== viewMode) {\n      setEdgesHidden(true);\n      dimensionMeasuredRef.current = false;\n      raf = requestAnimationFrame(() => {\n        fallback = setTimeout(() => {\n          if (!dimensionMeasuredRef.current) {\n            setEdgesHidden(false);\n          }\n        }, 300);\n      });\n    }\n    prevViewModeRef.current = viewMode;\n    return () => { \n      if (fallback) clearTimeout(fallback); \n      if (raf) cancelAnimationFrame(raf);\n    };`,
  `let timeout: any;\n    if (prevViewModeRef.current !== null && prevViewModeRef.current !== viewMode) {\n      setEdgesHidden(true);\n      dimensionMeasuredRef.current = false;\n      // Fixed delay: hide edges briefly during view switch, then force show\n      timeout = setTimeout(() => {\n        setEdges(eds => eds.map(e => ({ ...e }))); // force edge recalc\n        dimensionMeasuredRef.current = true;\n        requestAnimationFrame(() => setEdgesHidden(false));\n      }, 150);\n    }\n    prevViewModeRef.current = viewMode;\n    return () => { if (timeout) clearTimeout(timeout); };`,
  'Simplified edge rendering: fixed 150ms + force recalc'
);

// ═══════════════════════════════════════════════════════
// FIX 3: Whiteboard background
// ═══════════════════════════════════════════════════════
console.log('\n📌 Fix 3: Whiteboard/Draw background');

let wb = fs.readFileSync('src/components/Whiteboard/Whiteboard.jsx', 'utf8');
// Find the main container background
const wbOld = wb.match(/background:\s*['"](?:rgba\(250,250,250[^'"]*|#f[0-9a-f]{5}|white)['"]/);
if (wbOld) {
  // Check all background references
}

r('src/components/Whiteboard/Whiteboard.jsx',
  `background: 'var(--nl-bg-canvas, rgba(250,250,250,0.8))', zIndex: 100,\n            fontSize: '14px', color: 'var(--nl-text-primary, #666)',`,
  `background: 'var(--nl-bg-canvas, rgba(250,250,250,0.8))', zIndex: 100,\n            fontSize: '14px', color: 'var(--nl-text-primary, #666)',`,
  'Whiteboard loading (already done)'
);

// Check Whiteboard main canvas bg
const wbContent = fs.readFileSync('src/components/Whiteboard/Whiteboard.jsx', 'utf8');
const wbBgMatches = [...wbContent.matchAll(/background[^,}]*(?:#f[0-9a-f]{5}|white|#fff)/g)];
if (wbBgMatches.length > 0) {
  console.log(`  ℹ Whiteboard has ${wbBgMatches.length} hardcoded light backgrounds - checking...`);
}

// ═══════════════════════════════════════════════════════
// FIX 4: FloatingPanel backgrounds for light mode
// ═══════════════════════════════════════════════════════
console.log('\n📌 Fix 4: FloatingPanel backgrounds');

const fp = fs.readFileSync('src/components/panels/FloatingPanel.tsx', 'utf8');
const fpBgMatches = (fp.match(/background:\s*['"]#[0-9a-f]{6}['"]/g) || []);
console.log(`  ℹ FloatingPanel has ${fpBgMatches.length} hardcoded backgrounds`);

// Replace common dark backgrounds in FloatingPanel
let fpContent = fp;
let fpCount = 0;

// Main panel backgrounds
const fpReplacements = [
  ["background: '#1e293b'", "background: 'var(--nl-bg-panel, #1e293b)'"],
  ["background: '#2c3e50'", "background: 'var(--nl-bg-input, #2c3e50)'"],
  ["background: '#1a1a2e'", "background: 'var(--nl-bg-canvas, #1a1a2e)'"],
  ["background: '#334155'", "background: 'var(--nl-border-light, #334155)'"],
  ["background: '#0f172a'", "background: 'var(--nl-bg-canvas, #0f172a)'"],
  ["background: '#1e1e3a'", "background: 'var(--nl-bg-panel, #1e1e3a)'"],
  ["border: '1px solid #4a5f7f'", "border: '1px solid var(--nl-border-light, #4a5f7f)'"],
  ["border: '1px solid #334155'", "border: '1px solid var(--nl-border-light, #334155)'"],
  ["borderBottom: '1px solid #334155'", "borderBottom: '1px solid var(--nl-border-light, #334155)'"],
  ["borderBottom: '2px solid #334155'", "borderBottom: '2px solid var(--nl-border-light, #334155)'"],
  ["color: '#94a3b8'", "color: 'var(--nl-text-secondary, #94a3b8)'"],
  ["color: '#64748b'", "color: 'var(--nl-text-muted, #64748b)'"],
  ["color: '#e2e8f0'", "color: 'var(--nl-text-primary, #e2e8f0)'"],
  ["color: '#cbd5e1'", "color: 'var(--nl-text-secondary, #cbd5e1)'"],
];

for (const [old, rep] of fpReplacements) {
  const n = fpContent.split(old).length - 1;
  if (n > 0) {
    fpContent = fpContent.split(old).join(rep);
    fpCount += n;
  }
}

if (fpCount > 0) {
  fs.writeFileSync('src/components/panels/FloatingPanel.tsx', fpContent, 'utf8');
  console.log(`  ✅ FloatingPanel: ${fpCount} color replacements`);
  fixed++;
}

// ═══════════════════════════════════════════════════════
// FIX 5: SequenceView backgrounds
// ═══════════════════════════════════════════════════════
console.log('\n📌 Fix 5: SequenceView backgrounds');

if (fs.existsSync('src/components/SequenceView/SequenceView.tsx')) {
  let sv = fs.readFileSync('src/components/SequenceView/SequenceView.tsx', 'utf8');
  let svCount = 0;
  
  const svReplacements = [
    ["background: '#f8fafc'", "background: 'var(--nl-bg-canvas, #f8fafc)'"],
    ["background: '#ffffff'", "background: 'var(--nl-bg-panel, #ffffff)'"],
    ["background: '#fff'", "background: 'var(--nl-bg-panel, #fff)'"],
    ["border: '1px solid #d1d5db'", "border: '1px solid var(--nl-border, #d1d5db)'"],
    ["border: '1px solid #e5e7eb'", "border: '1px solid var(--nl-border-light, #e5e7eb)'"],
    ["border: '2px solid #e5e7eb'", "border: '2px solid var(--nl-border-light, #e5e7eb)'"],
    ["borderBottom: '1px solid #e5e7eb'", "borderBottom: '1px solid var(--nl-border-light, #e5e7eb)'"],
    ["color: '#1e293b'", "color: 'var(--nl-text-primary, #1e293b)'"],
    ["color: '#374151'", "color: 'var(--nl-text-primary, #374151)'"],
    ["color: '#4b5563'", "color: 'var(--nl-text-secondary, #4b5563)'"],
    ["color: '#6b7280'", "color: 'var(--nl-text-muted, #6b7280)'"],
    ["color: '#9ca3af'", "color: 'var(--nl-text-muted, #9ca3af)'"],
    ["stroke: '#d1d5db'", "stroke: 'var(--nl-border, #d1d5db)'"],
    ["stroke: '#e2e8f0'", "stroke: 'var(--nl-border-light, #e2e8f0)'"],
    ["background: '#f1f5f9'", "background: 'var(--nl-bg-hover, #f1f5f9)'"],
  ];
  
  for (const [old, rep] of svReplacements) {
    const n = sv.split(old).length - 1;
    if (n > 0) {
      sv = sv.split(old).join(rep);
      svCount += n;
    }
  }
  
  if (svCount > 0) {
    fs.writeFileSync('src/components/SequenceView/SequenceView.tsx', sv, 'utf8');
    console.log(`  ✅ SequenceView: ${svCount} color replacements`);
    fixed++;
  } else {
    console.log('  ⏭ SequenceView: already done or no matches');
  }
}

// ═══════════════════════════════════════════════════════
// FIX 6: Whiteboard main canvas background
// ═══════════════════════════════════════════════════════
console.log('\n📌 Fix 6: Whiteboard canvas background');

if (fs.existsSync('src/components/Whiteboard/Whiteboard.jsx')) {
  let wbc = fs.readFileSync('src/components/Whiteboard/Whiteboard.jsx', 'utf8');
  let wbCount = 0;
  
  const wbReplacements = [
    ["background: '#1a1a2e'", "background: 'var(--nl-bg-canvas, #1a1a2e)'"],
    ["background: '#f0f0f0'", "background: 'var(--nl-bg-canvas, #f0f0f0)'"],
    ["background: 'white'", "background: 'var(--nl-bg-panel, white)'"],
    ["background: '#fff'", "background: 'var(--nl-bg-panel, #fff)'"],
    ["background: '#ffffff'", "background: 'var(--nl-bg-panel, #ffffff)'"],
    ["backgroundColor: '#1a1a2e'", "backgroundColor: 'var(--nl-bg-canvas, #1a1a2e)'"],
    ["backgroundColor: '#ffffff'", "backgroundColor: 'var(--nl-bg-panel, #ffffff)'"],
    ["backgroundColor: '#f0f0f0'", "backgroundColor: 'var(--nl-bg-canvas, #f0f0f0)'"],
  ];
  
  for (const [old, rep] of wbReplacements) {
    const n = wbc.split(old).length - 1;
    if (n > 0) {
      wbc = wbc.split(old).join(rep);
      wbCount += n;
    }
  }
  
  if (wbCount > 0) {
    fs.writeFileSync('src/components/Whiteboard/Whiteboard.jsx', wbc, 'utf8');
    console.log(`  ✅ Whiteboard: ${wbCount} color replacements`);
    fixed++;
  } else {
    console.log('  ⏭ Whiteboard: no hardcoded backgrounds found');
  }
}

// ═══════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(50)}`);
console.log(`✅ ${fixed} fixes applied.`);
console.log('');
console.log('Key fix: CSS variables now sync to document.documentElement (:root)');
console.log('This means ALL components inherit theme colors regardless of position.');
console.log('');
console.log('Restart dev server (npm start) and do Ctrl+Shift+R to test.');
