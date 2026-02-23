#!/usr/bin/env node
// ═══════════════════════════════════════════════════════
// Fix DocumentViewEnhanced.jsx: Replace all hardcoded 
// dark-mode colors with CSS variables
// ═══════════════════════════════════════════════════════
const fs = require('fs');
const file = 'src/DocumentViewEnhanced.jsx';
let c = fs.readFileSync(file, 'utf8');
const original = c;

// ─── STRATEGY ────────────────────────────────────
// Map hardcoded dark colors → CSS variables:
//   #1a1a2e  (deep bg)     → var(--nl-bg-canvas, #1a1a2e)
//   #1e2a3a  (panel bg)    → var(--nl-bg-panel, #1e2a3a)
//   #2c3e50  (input bg)    → var(--nl-bg-input, #2c3e50)
//   #34495e  (border)      → var(--nl-border, #34495e)
//   #4a5f7f  (border light) → var(--nl-border-light, #4a5f7f)
//   #ecf0f1  (text primary) → var(--nl-text-primary, #ecf0f1)
//   #bdc3c7  (text secondary) → var(--nl-text-secondary, #bdc3c7)
//   #7f8c8d  (text muted)  → var(--nl-text-muted, #7f8c8d)
//   white (on dark inputs) → var(--nl-text-primary, white)
//
// DO NOT touch: #3498db (accent), #e74c3c/#27ae60/#f39c12 (semantic),
//   post-it colors, type badge colors, status badge colors

let count = 0;

function r(old, rep, label) {
  const before = c;
  c = c.split(old).join(rep);
  const changes = (before.length - c.length + rep.length * ((before.length - c.replace(new RegExp(rep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '').length) / old.length || 0));
  const n = before.split(old).length - 1;
  if (n > 0) {
    console.log(`  ✅ ${label} (${n}x)`);
    count += n;
  }
}

console.log('🎨 Fixing DocumentViewEnhanced theme colors...\n');

// ═══════════════════════════════════════════════════════
// 1. STYLE CONSTANTS AT BOTTOM (shared across components)
// ═══════════════════════════════════════════════════════
console.log('── Style Constants ──');

// gutterBtnStyle
r(
  `background: '#34495e',\n  border: '1px solid #4a5f7f',\n  borderRadius: '4px',\n  color: '#bdc3c7',`,
  `background: 'var(--nl-border, #34495e)',\n  border: '1px solid var(--nl-border-light, #4a5f7f)',\n  borderRadius: '4px',\n  color: 'var(--nl-text-secondary, #bdc3c7)',`,
  'gutterBtnStyle'
);

// tableContainerStyle
r(
  `background: '#1e2a3a',\n  borderRadius: '8px',\n  border: '1px solid #34495e',`,
  `background: 'var(--nl-bg-panel, #1e2a3a)',\n  borderRadius: '8px',\n  border: '1px solid var(--nl-border, #34495e)',`,
  'tableContainerStyle'
);

// tinyInputStyle
r(
  `background: '#2c3e50',\n  border: '1px solid #4a5f7f',\n  borderRadius: '4px',\n  color: 'white',\n  fontSize: '11px',\n};`,
  `background: 'var(--nl-bg-input, #2c3e50)',\n  border: '1px solid var(--nl-border-light, #4a5f7f)',\n  borderRadius: '4px',\n  color: 'var(--nl-text-primary, white)',\n  fontSize: '11px',\n};`,
  'tinyInputStyle'
);

// tinySelectStyle
r(
  `background: '#2c3e50',\n  border: '1px solid #4a5f7f',\n  borderRadius: '4px',\n  color: 'white',\n  fontSize: '11px',\n};\n\nconst thStyle`,
  `background: 'var(--nl-bg-input, #2c3e50)',\n  border: '1px solid var(--nl-border-light, #4a5f7f)',\n  borderRadius: '4px',\n  color: 'var(--nl-text-primary, white)',\n  fontSize: '11px',\n};\n\nconst thStyle`,
  'tinySelectStyle'
);

// thStyle
r(
  `borderBottom: '2px solid #34495e',\n  color: '#7f8c8d',`,
  `borderBottom: '2px solid var(--nl-border, #34495e)',\n  color: 'var(--nl-text-muted, #7f8c8d)',`,
  'thStyle'
);

// tdStyle
r(
  `borderBottom: '1px solid #34495e22',\n  color: '#bdc3c7',`,
  `borderBottom: '1px solid var(--nl-border, #34495e22)',\n  color: 'var(--nl-text-secondary, #bdc3c7)',`,
  'tdStyle'
);

// ═══════════════════════════════════════════════════════
// 2. MAIN CONTAINER
// ═══════════════════════════════════════════════════════
console.log('\n── Main Container ──');

// Outer background
r(
  `background: '#1a1a2e',\n      overflowY: 'auto',`,
  `background: 'var(--nl-bg-canvas, #1a1a2e)',\n      overflowY: 'auto',`,
  'Outer container bg'
);

// Document container
r(
  `background: '#1e2a3a',\n        borderRadius: '12px',`,
  `background: 'var(--nl-bg-panel, #1e2a3a)',\n        borderRadius: '12px',`,
  'Document container bg'
);

// ═══════════════════════════════════════════════════════
// 3. ADD BLOCK BUTTON & FOOTER
// ═══════════════════════════════════════════════════════
console.log('\n── Add Block & Footer ──');

// Add block dashed border
r(
  `border: '2px dashed #34495e',\n            borderRadius: '8px',\n            color: '#7f8c8d',`,
  `border: '2px dashed var(--nl-border, #34495e)',\n            borderRadius: '8px',\n            color: 'var(--nl-text-muted, #7f8c8d)',`,
  'Add block button'
);

// Add block hover handlers
r(
  `onMouseOver={e => { e.currentTarget.style.borderColor = '#3498db'; e.currentTarget.style.color = '#3498db'; }}\n          onMouseOut={e => { e.currentTarget.style.borderColor = '#34495e'; e.currentTarget.style.color = '#7f8c8d'; }}`,
  `onMouseOver={e => { e.currentTarget.style.borderColor = '#3498db'; e.currentTarget.style.color = '#3498db'; }}\n          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--nl-border, #34495e)'; e.currentTarget.style.color = 'var(--nl-text-muted, #7f8c8d)'; }}`,
  'Add block hover reset'
);

// Footer
r(
  `borderTop: '2px solid #34495e',\n          textAlign: 'center',\n          color: '#7f8c8d',`,
  `borderTop: '2px solid var(--nl-border, #34495e)',\n          textAlign: 'center',\n          color: 'var(--nl-text-muted, #7f8c8d)',`,
  'Footer'
);

// Divider
r(
  `borderTop: '1px solid #34495e', margin: '16px 0'`,
  `borderTop: '1px solid var(--nl-border, #34495e)', margin: '16px 0'`,
  'Divider line'
);

// ═══════════════════════════════════════════════════════
// 4. TEXT BLOCK
// ═══════════════════════════════════════════════════════
console.log('\n── Text Block ──');

// Text editing textarea
r(
  `background: '#2c3e50',\n          border: '1px solid #3498db',\n          borderRadius: '6px',\n          color: '#ecf0f1',`,
  `background: 'var(--nl-bg-input, #2c3e50)',\n          border: '1px solid #3498db',\n          borderRadius: '6px',\n          color: 'var(--nl-text-primary, #ecf0f1)',`,
  'Text block textarea'
);

// Text display color
r(
  `color: '#bdc3c7',\n        fontSize: '14px',\n        lineHeight: '1.6',\n        cursor: 'text',`,
  `color: 'var(--nl-text-secondary, #bdc3c7)',\n        fontSize: '14px',\n        lineHeight: '1.6',\n        cursor: 'text',`,
  'Text block display'
);

// Table row hover
r(
  `onMouseOver={e => e.currentTarget.style.background = '#2c3e50'}\n                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}`,
  `onMouseOver={e => e.currentTarget.style.background = 'var(--nl-bg-hover, #2c3e50)'}\n                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}`,
  'Table row hover'
);

// ═══════════════════════════════════════════════════════
// 5. HEADING BLOCK
// ═══════════════════════════════════════════════════════
console.log('\n── Heading Block ──');

// Level select
r(
  `background: '#34495e',\n            border: '1px solid #4a5f7f',\n            borderRadius: '4px',\n            color: 'white',\n            fontSize: '11px',`,
  `background: 'var(--nl-border, #34495e)',\n            border: '1px solid var(--nl-border-light, #4a5f7f)',\n            borderRadius: '4px',\n            color: 'var(--nl-text-primary, white)',\n            fontSize: '11px',`,
  'Heading level select'
);

// Heading input
r(
  `background: '#2c3e50',\n            border: '1px solid #3498db',\n            borderRadius: '4px',\n            color: '#ecf0f1',`,
  `background: 'var(--nl-bg-input, #2c3e50)',\n            border: '1px solid #3498db',\n            borderRadius: '4px',\n            color: 'var(--nl-text-primary, #ecf0f1)',`,
  'Heading input'
);

// Heading display text
r(
  `color: '#ecf0f1', fontSize, fontWeight: 'bold', margin: '8px 0 4px 0'`,
  `color: 'var(--nl-text-primary, #ecf0f1)', fontSize, fontWeight: 'bold', margin: '8px 0 4px 0'`,
  'Heading display text'
);

// ═══════════════════════════════════════════════════════
// 6. NODE BLOCK (card)
// ═══════════════════════════════════════════════════════
console.log('\n── Node Block ──');

// Node card background
r(
  `background: '#1e2a3a',\n      borderRadius: '8px',\n      border: \`1px solid \${typeColor}33\`,`,
  `background: 'var(--nl-bg-panel, #1e2a3a)',\n      borderRadius: '8px',\n      border: \`1px solid \${typeColor}33\`,`,
  'Node card bg'
);

// Node card title
r(
  `color: '#ecf0f1', fontSize: '14px', fontWeight: 'bold', flex: 1`,
  `color: 'var(--nl-text-primary, #ecf0f1)', fontSize: '14px', fontWeight: 'bold', flex: 1`,
  'Node card title'
);

// Node expanded border
r(
  `padding: '0 14px 14px', borderTop: '1px solid #34495e'`,
  `padding: '0 14px 14px', borderTop: '1px solid var(--nl-border, #34495e)'`,
  'Node expanded border'
);

// Node description text  
r(
  `color: '#bdc3c7', fontSize: '13px', lineHeight: '1.6', margin: '0 0 8px 0'`,
  `color: 'var(--nl-text-secondary, #bdc3c7)', fontSize: '13px', lineHeight: '1.6', margin: '0 0 8px 0'`,
  'Node description text'
);

// Node rationale
r(
  `color: '#bdc3c7', marginLeft: '6px'`,
  `color: 'var(--nl-text-secondary, #bdc3c7)', marginLeft: '6px'`,
  'Node rationale text'
);

// ═══════════════════════════════════════════════════════
// 7. LINK MAP BLOCK
// ═══════════════════════════════════════════════════════
console.log('\n── Link Map Block ──');

r(
  `background: '#1e2a3a',\n      borderRadius: '8px',\n      border: '1px solid #34495e',\n      padding: '12px',`,
  `background: 'var(--nl-bg-panel, #1e2a3a)',\n      borderRadius: '8px',\n      border: '1px solid var(--nl-border, #34495e)',\n      padding: '12px',`,
  'Link map bg + border'
);

// ═══════════════════════════════════════════════════════
// 8. COMMAND PALETTE MODAL
// ═══════════════════════════════════════════════════════
console.log('\n── Command Palette Modal ──');

// Modal background
r(
  `background: '#2c3e50',\n        borderRadius: '10px',\n        width: '450px',`,
  `background: 'var(--nl-bg-panel, #2c3e50)',\n        borderRadius: '10px',\n        width: '450px',`,
  'Command palette bg'
);

// Command palette input
r(
  `background: '#34495e',\n              border: '1px solid #4a5f7f',\n              borderRadius: '6px',\n              color: 'white',\n              fontSize: '14px',`,
  `background: 'var(--nl-bg-input, #34495e)',\n              border: '1px solid var(--nl-border-light, #4a5f7f)',\n              borderRadius: '6px',\n              color: 'var(--nl-text-primary, white)',\n              fontSize: '14px',`,
  'Command palette input'
);

// Command palette labels
r(
  `color: '#ecf0f1', fontSize: '13px', fontWeight: 'bold'`,
  `color: 'var(--nl-text-primary, #ecf0f1)', fontSize: '13px', fontWeight: 'bold'`,
  'Command palette label'
);

// ═══════════════════════════════════════════════════════
// 9. NODE PICKER MODAL
// ═══════════════════════════════════════════════════════
console.log('\n── Node Picker Modal ──');

// Picker modal bg
r(
  `background: '#2c3e50',\n        borderRadius: '10px',\n        width: '500px',`,
  `background: 'var(--nl-bg-panel, #2c3e50)',\n        borderRadius: '10px',\n        width: '500px',`,
  'Node picker bg'
);

// Picker search input
r(
  `background: '#34495e',\n              border: '1px solid #4a5f7f',\n              borderRadius: '6px',\n              color: 'white',\n              fontSize: '13px',`,
  `background: 'var(--nl-bg-input, #34495e)',\n              border: '1px solid var(--nl-border-light, #4a5f7f)',\n              borderRadius: '6px',\n              color: 'var(--nl-text-primary, white)',\n              fontSize: '13px',`,
  'Node picker search'
);

// Picker type select
r(
  `background: '#34495e',\n              border: '1px solid #4a5f7f',\n              borderRadius: '6px',\n              color: 'white',\n              fontSize: '12px',`,
  `background: 'var(--nl-bg-input, #34495e)',\n              border: '1px solid var(--nl-border-light, #4a5f7f)',\n              borderRadius: '6px',\n              color: 'var(--nl-text-primary, white)',\n              fontSize: '12px',`,
  'Node picker type select'
);

// Picker row border
r(
  `borderBottom: '1px solid #34495e',`,
  `borderBottom: '1px solid var(--nl-border, #34495e)',`,
  'Node picker row border'
);

// Picker hover
r(
  `onMouseOver={e => e.currentTarget.style.background = '#3498db22'}\n              onMouseOut={e => e.currentTarget.style.background = 'transparent'}`,
  `onMouseOver={e => e.currentTarget.style.background = 'var(--nl-bg-hover, #3498db22)'}\n              onMouseOut={e => e.currentTarget.style.background = 'transparent'}`,
  'Node picker hover'
);

// Picker node name
r(
  `color: '#ecf0f1', fontSize: '12px', flex: 1`,
  `color: 'var(--nl-text-primary, #ecf0f1)', fontSize: '12px', flex: 1`,
  'Node picker name'
);

// ═══════════════════════════════════════════════════════
// 10. EDITABLE FIELDS
// ═══════════════════════════════════════════════════════
console.log('\n── Editable Fields ──');

// EditableField input
r(
  `background: '#2c3e50',\n          border: '1px solid #4a5f7f',\n          borderRadius: '4px',\n          color: '#ecf0f1',\n          fontSize: '12px',`,
  `background: 'var(--nl-bg-input, #2c3e50)',\n          border: '1px solid var(--nl-border-light, #4a5f7f)',\n          borderRadius: '4px',\n          color: 'var(--nl-text-primary, #ecf0f1)',\n          fontSize: '12px',`,
  'EditableField input'
);

// EditableSelect
r(
  `background: '#2c3e50',\n          border: '1px solid #4a5f7f',\n          borderRadius: '4px',\n          color: '#ecf0f1',\n          fontSize: '12px',\n        }}\n      >\n        {options`,
  `background: 'var(--nl-bg-input, #2c3e50)',\n          border: '1px solid var(--nl-border-light, #4a5f7f)',\n          borderRadius: '4px',\n          color: 'var(--nl-text-primary, #ecf0f1)',\n          fontSize: '12px',\n        }}\n      >\n        {options`,
  'EditableSelect'
);

// EmptyState colors
r(
  `color: '#ecf0f1' }}>\n        Empty Document`,
  `color: 'var(--nl-text-primary, #ecf0f1)' }}>\n        Empty Document`,
  'EmptyState title'
);

// ═══════════════════════════════════════════════════════
// 11. REMAINING GENERIC color: patterns
// ═══════════════════════════════════════════════════════
console.log('\n── Remaining text colors ──');

// All remaining #7f8c8d that aren't already wrapped in var()
// These are label colors, versions, etc.
const remaining7f = c.split("color: '#7f8c8d'").length - 1;
c = c.split("color: '#7f8c8d'").join("color: 'var(--nl-text-muted, #7f8c8d)'");
if (remaining7f > 0) { console.log(`  ✅ Remaining #7f8c8d text (${remaining7f}x)`); count += remaining7f; }

// Remaining #ecf0f1
const remainingEcf = c.split("color: '#ecf0f1'").length - 1;
c = c.split("color: '#ecf0f1'").join("color: 'var(--nl-text-primary, #ecf0f1)'");
if (remainingEcf > 0) { console.log(`  ✅ Remaining #ecf0f1 text (${remainingEcf}x)`); count += remainingEcf; }

// Remaining #bdc3c7
const remainingBdc = c.split("color: '#bdc3c7'").length - 1;
c = c.split("color: '#bdc3c7'").join("color: 'var(--nl-text-secondary, #bdc3c7)'");
if (remainingBdc > 0) { console.log(`  ✅ Remaining #bdc3c7 text (${remainingBdc}x)`); count += remainingBdc; }

// Health check issue cards
r(
  `background: '#2c3e50',\n              borderLeft:`,
  `background: 'var(--nl-bg-input, #2c3e50)',\n              borderLeft:`,
  'Health issue card bg'
);

// ═══════════════════════════════════════════════════════
// WRITE FILE
// ═══════════════════════════════════════════════════════
fs.writeFileSync(file, c, 'utf8');

console.log(`\n${'═'.repeat(50)}`);
console.log(`✅ ${count} color replacements made in DocumentViewEnhanced.jsx`);

// Verify no remaining bare hardcoded colors in style contexts
const remaining = (c.match(/(?:background|color|border[^R])[^}]*?'#(1a1a2e|1e2a3a|2c3e50|ecf0f1|bdc3c7)'/g) || []);
if (remaining.length > 0) {
  console.log(`\n⚠ ${remaining.length} possible remaining hardcoded colors:`);
  remaining.forEach(m => console.log(`   ${m.substring(0, 60)}`));
} else {
  console.log('✨ No remaining hardcoded theme colors found!');
}
console.log('\nRestart dev server (npm start) to see changes.');
