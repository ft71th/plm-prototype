/**
 * Electronics.js — Elektronik kretssymboler (IEC 60617) för Northlight Draw
 * Alla symboler använder render(ctx, x, y, w, h, stroke, fill) canvas-mönster
 */

export const ELECTRONICS_SYMBOLS = [

  // ═══════════════════════════════════════════════
  //  PASSIVA KOMPONENTER
  // ═══════════════════════════════════════════════

  {
    id: 'el-resistor',
    label: 'Resistor',
    category: 'Passiv',
    width: 96, height: 48,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const my = y + h / 2;
      // Left wire
      ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x + w * 0.18, my); ctx.stroke();
      // IEC rectangle
      ctx.beginPath();
      ctx.roundRect(x + w * 0.18, y + h * 0.25, w * 0.64, h * 0.5, 2);
      ctx.fillStyle = fill || '#fff';
      ctx.fill(); ctx.stroke();
      // Right wire
      ctx.beginPath(); ctx.moveTo(x + w * 0.82, my); ctx.lineTo(x + w, my); ctx.stroke();
    },
  },

  {
    id: 'el-potentiometer',
    label: 'Potentiometer',
    category: 'Passiv',
    width: 96, height: 64,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const my = y + h * 0.42;
      ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x + w * 0.18, my); ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(x + w * 0.18, my - h * 0.17, w * 0.64, h * 0.34, 2);
      ctx.fillStyle = fill || '#fff';
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w * 0.82, my); ctx.lineTo(x + w, my); ctx.stroke();
      // Wiper arrow
      ctx.beginPath();
      ctx.moveTo(x + w / 2, my + h * 0.2);
      ctx.lineTo(x + w / 2, my + h * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.42, my + h * 0.17);
      ctx.lineTo(x + w / 2, my + h * 0.1);
      ctx.lineTo(x + w * 0.58, my + h * 0.17);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w / 2, my + h * 0.2);
      ctx.lineTo(x + w / 2, my + h * 0.36);
      ctx.stroke();
    },
  },

  {
    id: 'el-capacitor',
    label: 'Kondensator',
    category: 'Passiv',
    width: 72, height: 64,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const cx = x + w / 2, my = y + h / 2;
      const gap = w * 0.08;
      ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(cx - gap, my); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - gap, my - h * 0.32); ctx.lineTo(cx - gap, my + h * 0.32); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + gap, my - h * 0.32); ctx.lineTo(cx + gap, my + h * 0.32); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + gap, my); ctx.lineTo(x + w, my); ctx.stroke();
    },
  },

  {
    id: 'el-capacitor-electrolytic',
    label: 'Elektrolytisk kondensator',
    category: 'Passiv',
    width: 72, height: 64,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const cx = x + w / 2, my = y + h / 2;
      const gap = w * 0.08;
      ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(cx - gap, my); ctx.stroke();
      // Flat plate (-)
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - gap, my - h * 0.32); ctx.lineTo(cx - gap, my + h * 0.32); ctx.stroke();
      // Curved plate (+)
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx + gap, my - h * 0.32); ctx.quadraticCurveTo(cx + gap + w * 0.12, my, cx + gap, my + h * 0.32); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + gap, my); ctx.lineTo(x + w, my); ctx.stroke();
      // + sign
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${Math.round(h * 0.22)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+', cx - gap - w * 0.14, my - h * 0.32);
    },
  },

  {
    id: 'el-inductor',
    label: 'Induktor / Spole',
    category: 'Passiv',
    width: 96, height: 48,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const my = y + h / 2;
      ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x + w * 0.14, my); ctx.stroke();
      // 4 bumps
      const bumpW = w * 0.18, bumpR = bumpW / 2;
      for (let i = 0; i < 4; i++) {
        const bx = x + w * 0.14 + i * bumpW + bumpR;
        ctx.beginPath();
        ctx.arc(bx, my, bumpR, Math.PI, 0);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(x + w * 0.86, my); ctx.lineTo(x + w, my); ctx.stroke();
    },
  },

  // ═══════════════════════════════════════════════
  //  DIODER
  // ═══════════════════════════════════════════════

  {
    id: 'el-diode',
    label: 'Diod',
    category: 'Dioder',
    width: 80, height: 64,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const my = y + h / 2;
      ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x + w * 0.28, my); ctx.stroke();
      // Triangle
      ctx.beginPath();
      ctx.moveTo(x + w * 0.28, y + h * 0.22);
      ctx.lineTo(x + w * 0.28, y + h * 0.78);
      ctx.lineTo(x + w * 0.72, my);
      ctx.closePath();
      ctx.fillStyle = stroke || '#000';
      ctx.fill(); ctx.stroke();
      // Cathode bar
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x + w * 0.72, y + h * 0.22); ctx.lineTo(x + w * 0.72, y + h * 0.78); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + w * 0.72, my); ctx.lineTo(x + w, my); ctx.stroke();
    },
  },

  {
    id: 'el-diode-zener',
    label: 'Zener-diod',
    category: 'Dioder',
    width: 80, height: 64,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const my = y + h / 2;
      ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x + w * 0.28, my); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.28, y + h * 0.22);
      ctx.lineTo(x + w * 0.28, y + h * 0.78);
      ctx.lineTo(x + w * 0.72, my);
      ctx.closePath();
      ctx.fillStyle = stroke || '#000';
      ctx.fill(); ctx.stroke();
      // Zener S-cathode
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = stroke || '#000';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.58, y + h * 0.22);
      ctx.lineTo(x + w * 0.72, y + h * 0.22);
      ctx.lineTo(x + w * 0.72, y + h * 0.78);
      ctx.lineTo(x + w * 0.86, y + h * 0.78);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + w * 0.72, my); ctx.lineTo(x + w, my); ctx.stroke();
    },
  },

  {
    id: 'el-diode-led',
    label: 'LED',
    category: 'Dioder',
    width: 80, height: 64,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const my = y + h / 2;
      ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x + w * 0.28, my); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.28, y + h * 0.22);
      ctx.lineTo(x + w * 0.28, y + h * 0.78);
      ctx.lineTo(x + w * 0.72, my);
      ctx.closePath();
      ctx.fillStyle = stroke || '#000';
      ctx.fill(); ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x + w * 0.72, y + h * 0.22); ctx.lineTo(x + w * 0.72, y + h * 0.78); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + w * 0.72, my); ctx.lineTo(x + w, my); ctx.stroke();
      // Light rays
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.78, y + h * 0.28);
      ctx.lineTo(x + w * 0.95, y + h * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.9, y + h * 0.1);
      ctx.lineTo(x + w * 0.95, y + h * 0.1);
      ctx.lineTo(x + w * 0.95, y + h * 0.17);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.88, y + h * 0.38);
      ctx.lineTo(x + w, y + h * 0.22);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.96, y + h * 0.22);
      ctx.lineTo(x + w, y + h * 0.22);
      ctx.lineTo(x + w, y + h * 0.29);
      ctx.stroke();
    },
  },

  // ═══════════════════════════════════════════════
  //  TRANSISTORER
  // ═══════════════════════════════════════════════

  {
    id: 'el-transistor-npn',
    label: 'Transistor NPN',
    category: 'Transistorer',
    width: 72, height: 80,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const bx = x + w * 0.35, by = y + h / 2;
      // Base lead
      ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(bx, by); ctx.stroke();
      // Base bar
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx, y + h * 0.22); ctx.lineTo(bx, y + h * 0.78); ctx.stroke();
      ctx.lineWidth = 2;
      // Collector
      ctx.beginPath();
      ctx.moveTo(bx, y + h * 0.3);
      ctx.lineTo(x + w * 0.78, y + h * 0.1);
      ctx.lineTo(x + w * 0.78, y); ctx.stroke();
      // Emitter
      ctx.beginPath();
      ctx.moveTo(bx, y + h * 0.7);
      ctx.lineTo(x + w * 0.78, y + h * 0.9);
      ctx.lineTo(x + w * 0.78, y + h); ctx.stroke();
      // Arrow on emitter (NPN pointing out)
      ctx.fillStyle = stroke || '#000';
      ctx.save();
      ctx.translate(x + w * 0.6, y + h * 0.8);
      ctx.rotate(Math.atan2(h * 0.2, w * 0.43));
      ctx.beginPath();
      ctx.moveTo(8, 0); ctx.lineTo(0, -4); ctx.lineTo(0, 4); ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Labels
      ctx.font = `${Math.round(h * 0.13)}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('B', x + w * 0.12, by - h * 0.08);
      ctx.fillText('C', x + w * 0.88, y + h * 0.05);
      ctx.fillText('E', x + w * 0.88, y + h * 0.95);
    },
  },

  {
    id: 'el-transistor-pnp',
    label: 'Transistor PNP',
    category: 'Transistorer',
    width: 72, height: 80,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const bx = x + w * 0.35, by = y + h / 2;
      ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(bx, by); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx, y + h * 0.22); ctx.lineTo(bx, y + h * 0.78); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, y + h * 0.3); ctx.lineTo(x + w * 0.78, y + h * 0.1); ctx.lineTo(x + w * 0.78, y); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx, y + h * 0.7); ctx.lineTo(x + w * 0.78, y + h * 0.9); ctx.lineTo(x + w * 0.78, y + h); ctx.stroke();
      // Arrow on emitter (PNP pointing in — at base end)
      ctx.fillStyle = stroke || '#000';
      ctx.save();
      ctx.translate(x + w * 0.42, y + h * 0.63);
      ctx.rotate(Math.atan2(h * 0.2, w * 0.43));
      ctx.beginPath();
      ctx.moveTo(-8, 0); ctx.lineTo(0, -4); ctx.lineTo(0, 4); ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.font = `${Math.round(h * 0.13)}px monospace`;
      ctx.fillStyle = stroke || '#000';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('B', x + w * 0.12, by - h * 0.08);
      ctx.fillText('C', x + w * 0.88, y + h * 0.05);
      ctx.fillText('E', x + w * 0.88, y + h * 0.95);
    },
  },

  // ═══════════════════════════════════════════════
  //  IC / FÖRSTÄRKARE
  // ═══════════════════════════════════════════════

  {
    id: 'el-op-amp',
    label: 'Op-amp',
    category: 'IC / Förstärkare',
    width: 88, height: 72,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      // Triangle
      ctx.beginPath();
      ctx.moveTo(x + w * 0.14, y + h * 0.08);
      ctx.lineTo(x + w * 0.14, y + h * 0.92);
      ctx.lineTo(x + w * 0.86, y + h / 2);
      ctx.closePath();
      ctx.fillStyle = fill || '#fff';
      ctx.fill(); ctx.stroke();
      // + input
      ctx.beginPath(); ctx.moveTo(x, y + h * 0.33); ctx.lineTo(x + w * 0.14, y + h * 0.33); ctx.stroke();
      // - input
      ctx.beginPath(); ctx.moveTo(x, y + h * 0.67); ctx.lineTo(x + w * 0.14, y + h * 0.67); ctx.stroke();
      // Output
      ctx.beginPath(); ctx.moveTo(x + w * 0.86, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
      // Labels
      ctx.fillStyle = stroke || '#000';
      ctx.font = `${Math.round(h * 0.18)}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+', x + w * 0.26, y + h * 0.33);
      ctx.fillText('−', x + w * 0.26, y + h * 0.67);
    },
  },

  {
    id: 'el-and-gate',
    label: 'AND-grind',
    category: 'Logik',
    width: 80, height: 64,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const bodyR = h * 0.5;
      // Body: flat left + D-shape
      ctx.beginPath();
      ctx.moveTo(x + w * 0.18, y + h * 0.18);
      ctx.lineTo(x + w * 0.55, y + h * 0.18);
      ctx.arc(x + w * 0.55, y + h / 2, bodyR * 0.66, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x + w * 0.18, y + h * 0.82);
      ctx.closePath();
      ctx.fillStyle = fill || '#fff';
      ctx.fill(); ctx.stroke();
      // Inputs
      ctx.beginPath(); ctx.moveTo(x, y + h * 0.33); ctx.lineTo(x + w * 0.18, y + h * 0.33); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + h * 0.67); ctx.lineTo(x + w * 0.18, y + h * 0.67); ctx.stroke();
      // Output
      ctx.beginPath(); ctx.moveTo(x + w * 0.82, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
      // Label
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${Math.round(h * 0.22)}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('&', x + w * 0.38, y + h / 2);
    },
  },

  {
    id: 'el-or-gate',
    label: 'OR-grind',
    category: 'Logik',
    width: 80, height: 64,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      // OR shape
      ctx.beginPath();
      ctx.moveTo(x + w * 0.14, y + h * 0.18);
      ctx.quadraticCurveTo(x + w * 0.36, y + h * 0.18, x + w * 0.76, y + h / 2);
      ctx.quadraticCurveTo(x + w * 0.36, y + h * 0.82, x + w * 0.14, y + h * 0.82);
      ctx.quadraticCurveTo(x + w * 0.3, y + h / 2, x + w * 0.14, y + h * 0.18);
      ctx.closePath();
      ctx.fillStyle = fill || '#fff';
      ctx.fill(); ctx.stroke();
      // Inputs (offset for the curve)
      ctx.beginPath(); ctx.moveTo(x, y + h * 0.33); ctx.lineTo(x + w * 0.2, y + h * 0.33); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + h * 0.67); ctx.lineTo(x + w * 0.2, y + h * 0.67); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w * 0.76, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${Math.round(h * 0.2)}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('≥1', x + w * 0.38, y + h / 2);
    },
  },

  {
    id: 'el-not-gate',
    label: 'NOT / Inverterare',
    category: 'Logik',
    width: 72, height: 64,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const my = y + h / 2;
      ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x + w * 0.16, my); ctx.stroke();
      // Triangle
      ctx.beginPath();
      ctx.moveTo(x + w * 0.16, y + h * 0.2);
      ctx.lineTo(x + w * 0.16, y + h * 0.8);
      ctx.lineTo(x + w * 0.72, my);
      ctx.closePath();
      ctx.fillStyle = fill || '#fff';
      ctx.fill(); ctx.stroke();
      // Bubble
      ctx.beginPath(); ctx.arc(x + w * 0.78, my, w * 0.07, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w * 0.85, my); ctx.lineTo(x + w, my); ctx.stroke();
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${Math.round(h * 0.2)}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('1', x + w * 0.36, my);
    },
  },

  // ═══════════════════════════════════════════════
  //  KÄLLOR
  // ═══════════════════════════════════════════════

  {
    id: 'el-voltage-source',
    label: 'Spänningskälla (DC)',
    category: 'Källor',
    width: 56, height: 80,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const cx = x + w / 2;
      ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y + h * 0.3); ctx.stroke();
      // 2 cells
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + h * 0.3); ctx.lineTo(x + w * 0.8, y + h * 0.3); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h * 0.42); ctx.lineTo(x + w * 0.7, y + h * 0.42); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + h * 0.54); ctx.lineTo(x + w * 0.8, y + h * 0.54); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h * 0.66); ctx.lineTo(x + w * 0.7, y + h * 0.66); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, y + h * 0.66); ctx.lineTo(cx, y + h); ctx.stroke();
      // +/- labels
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${Math.round(h * 0.16)}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+', x + w * 0.12, y + h * 0.3);
      ctx.fillText('−', x + w * 0.12, y + h * 0.54);
    },
  },

  {
    id: 'el-ground',
    label: 'Jord (GND)',
    category: 'Källor',
    width: 56, height: 56,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const cx = x + w / 2;
      ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y + h * 0.42); ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x + w * 0.12, y + h * 0.42); ctx.lineTo(x + w * 0.88, y + h * 0.42); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + w * 0.24, y + h * 0.58); ctx.lineTo(x + w * 0.76, y + h * 0.58); ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + w * 0.36, y + h * 0.74); ctx.lineTo(x + w * 0.64, y + h * 0.74); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + w * 0.44, y + h * 0.9); ctx.lineTo(x + w * 0.56, y + h * 0.9); ctx.stroke();
    },
  },

  // ═══════════════════════════════════════════════
  //  SWITCHAR
  // ═══════════════════════════════════════════════

  {
    id: 'el-switch-spst',
    label: 'Strömbrytare (SPST)',
    category: 'Switchar',
    width: 88, height: 48,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const my = y + h / 2;
      ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x + w * 0.3, my); ctx.stroke();
      // Left dot
      ctx.beginPath(); ctx.arc(x + w * 0.3, my, 3, 0, Math.PI * 2);
      ctx.fillStyle = stroke || '#000'; ctx.fill();
      // Switch blade (open)
      ctx.beginPath();
      ctx.moveTo(x + w * 0.3, my);
      ctx.lineTo(x + w * 0.7, my - h * 0.3);
      ctx.stroke();
      // Right dot
      ctx.beginPath(); ctx.arc(x + w * 0.7, my, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + w * 0.7, my); ctx.lineTo(x + w, my); ctx.stroke();
    },
  },

  {
    id: 'el-switch-pushbutton',
    label: 'Trycknapp (NO)',
    category: 'Switchar',
    width: 80, height: 64,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const my = y + h * 0.65;
      ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x + w * 0.28, my); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + w * 0.28, my, 3, 0, Math.PI * 2);
      ctx.fillStyle = stroke || '#000'; ctx.fill();
      // Contact bar
      ctx.beginPath(); ctx.moveTo(x + w * 0.28, my - h * 0.2); ctx.lineTo(x + w * 0.72, my - h * 0.2); ctx.stroke();
      // Actuator rod
      ctx.beginPath(); ctx.moveTo(x + w / 2, my - h * 0.2); ctx.lineTo(x + w / 2, my - h * 0.36); ctx.stroke();
      // Actuator cap
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x + w * 0.34, my - h * 0.36); ctx.lineTo(x + w * 0.66, my - h * 0.36); ctx.stroke();
      // Push arrow (dashed)
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath(); ctx.moveTo(x + w / 2, my - h * 0.5); ctx.lineTo(x + w / 2, my - h * 0.36); ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + w * 0.72, my, 3, 0, Math.PI * 2);
      ctx.fillStyle = stroke || '#000'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + w * 0.72, my); ctx.lineTo(x + w, my); ctx.stroke();
    },
  },
];

export function getCategories() {
  return [...new Set(ELECTRONICS_SYMBOLS.map((s) => s.category))];
}

export function getSymbolsByCategory(category) {
  return ELECTRONICS_SYMBOLS.filter((s) => s.category === category);
}
