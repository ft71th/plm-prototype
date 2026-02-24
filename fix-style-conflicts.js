#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// Fix: Style property conflicts in CustomNode.tsx
// Problem: Mixed shorthand/non-shorthand (padding/paddingLeft,
//          background/backgroundColor) causes React to log
//          hundreds of warnings with full stack traces,
//          blocking the main thread for seconds
// ═══════════════════════════════════════════════════════════
const fs = require('fs');
const file = 'src/components/flow/CustomNode.tsx';
let c = fs.readFileSync(file, 'utf8');
const hadCRLF = c.includes('\r\n');
if (hadCRLF) c = c.replace(/\r\n/g, '\n');

let fixes = 0;

// ── FIX 1: PLM mode main div - padding shorthand + paddingLeft conflict ──
const oldPLM = `        padding: '15px',
        paddingLeft: (isSystemItem() || isTestItem() || isParameterItem() || isHardwareItem() || isUseCaseItem() || isActorItem()) ? '20px' : '15px',`;

const newPLM = `        paddingTop: '15px',
        paddingRight: '15px',
        paddingBottom: '15px',
        paddingLeft: (isSystemItem() || isTestItem() || isParameterItem() || isHardwareItem() || isUseCaseItem() || isActorItem()) ? '20px' : '15px',`;

if (c.includes(oldPLM)) {
  c = c.replace(oldPLM, newPLM);
  fixes++;
  console.log('  ✓ PLM mode: replaced padding shorthand with individual properties');
}

// ── FIX 2: Actor whiteboard node - backgroundColor + background conflict ──
const oldActor = `          backgroundColor: 'transparent',
          position: 'relative',
          cursor: 'pointer',
          padding: '10px',
          borderRadius: '8px',
          background: selected ? 'rgba(46, 204, 113, 0.1)' : 'transparent',`;

const newActor = `          position: 'relative',
          cursor: 'pointer',
          padding: '10px',
          borderRadius: '8px',
          backgroundColor: selected ? 'rgba(46, 204, 113, 0.1)' : 'transparent',`;

if (c.includes(oldActor)) {
  c = c.replace(oldActor, newActor);
  fixes++;
  console.log('  ✓ Actor node: removed duplicate backgroundColor, unified to backgroundColor');
}

// ── FIX 3: getNodeShape actor - background + padding conflicts with parent ──
// Actor returns `padding` (shorthand) and `background` which conflict with
// the PLM div's `paddingLeft` (non-shorthand) and `backgroundColor`
const oldActorShape = `      case 'actor':
        return {
          borderRadius: '8px',           // Rounded rectangle for actors
          borderWidth: '0px',           // No border - just background
          borderStyle: 'none',
          minHeight: '100px',           // Taller for stick figure + name
          minWidth: '80px',            // Wider for stick figure
          padding: '10px',
          background: 'transparent',    // Transparent background
        };`;

const newActorShape = `      case 'actor':
        return {
          borderRadius: '8px',           // Rounded rectangle for actors
          borderWidth: '0px',           // No border - just background
          borderStyle: 'none',
          minHeight: '100px',           // Taller for stick figure + name
          minWidth: '80px',            // Wider for stick figure
          paddingTop: '10px',
          paddingRight: '10px',
          paddingBottom: '10px',
          paddingLeft: '10px',
          backgroundColor: 'transparent',    // Transparent background
        };`;

if (c.includes(oldActorShape)) {
  c = c.replace(oldActorShape, newActorShape);
  fixes++;
  console.log('  ✓ getNodeShape actor: use non-shorthand padding + backgroundColor');
}

// ── FIX 4: getNodeShape usecase - paddingLeft/Right/Top/Bottom is fine,
// but parent has `padding` shorthand, so usecase adds more non-shorthands ──
// Actually usecase already uses non-shorthand which is fine after fix 1.

// ── FIX 5: getNodeShape function - paddingTop/Bottom conflicts with parent padding ──
// After fix 1, parent uses non-shorthand, so this is OK now.

// ── FIX 6: PLM mode border shorthand + borderLeft conflict ──
const oldBorder = `        border: '3px solid ' + getBorderColor(),
        borderLeft: (isSystemItem() || isTestItem() || isParameterItem() || isHardwareItem() || isUseCaseItem() || isActorItem()) ? \`6px solid \${getSystemAccentColor()}\` : '3px solid ' + getBorderColor(),`;

const newBorder = `        borderTop: '3px solid ' + getBorderColor(),
        borderRight: '3px solid ' + getBorderColor(),
        borderBottom: '3px solid ' + getBorderColor(),
        borderLeft: (isSystemItem() || isTestItem() || isParameterItem() || isHardwareItem() || isUseCaseItem() || isActorItem()) ? \`6px solid \${getSystemAccentColor()}\` : '3px solid ' + getBorderColor(),`;

if (c.includes(oldBorder)) {
  c = c.replace(oldBorder, newBorder);
  fixes++;
  console.log('  ✓ PLM mode: replaced border shorthand with individual properties');
}

// ── FIX 7: PLM mode backgroundColor conflicts with getNodeShape background ──
// Change parent to use `background` instead of `backgroundColor` 
const oldBg = `        backgroundColor: (isSystemItem() || isTestItem() || isParameterItem() || isHardwareItem() || isUseCaseItem() || isActorItem()) ? '#1a2634' : '#2c3e50',`;
const newBg = `        background: (isSystemItem() || isTestItem() || isParameterItem() || isHardwareItem() || isUseCaseItem() || isActorItem()) ? '#1a2634' : '#2c3e50',`;

if (c.includes(oldBg)) {
  // But wait - after fix 3, actor shape now uses backgroundColor instead of background
  // So now both parent and actor use non-shorthand backgroundColor. That's fine!
  // Actually we need to keep them consistent. Parent uses backgroundColor, actor uses backgroundColor.
  // No conflict. Skip this fix.
  console.log('  ℹ PLM backgroundColor: no conflict after actor shape fix');
}

// ── FIX 8: Whiteboard node - borderStyle + border shorthand conflict ──
const oldWbBorder = `            borderRadius: getNodeShape().borderRadius || '8px',
            borderStyle: getNodeShape().borderStyle || 'solid',
            border: selected ? '3px solid #3498db' : '2px solid rgba(255,255,255,0.3)',`;

const newWbBorder = `            borderRadius: getNodeShape().borderRadius || '8px',
            borderWidth: selected ? '3px' : '2px',
            borderStyle: getNodeShape().borderStyle || 'solid',
            borderColor: selected ? '#3498db' : 'rgba(255,255,255,0.3)',`;

if (c.includes(oldWbBorder)) {
  c = c.replace(oldWbBorder, newWbBorder);
  fixes++;
  console.log('  ✓ Whiteboard node: replaced border shorthand with individual properties');
}

if (fixes === 0) {
  console.log('⏭ Already applied');
} else {
  if (hadCRLF) c = c.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, c, 'utf8');
  console.log(`\n✅ Style conflicts fixed: ${fixes} changes`);
  console.log('   Eliminates hundreds of React warnings per render cycle');
}
