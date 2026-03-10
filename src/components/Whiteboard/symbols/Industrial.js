/**
 * Industrial.js — Industriellt / P&ID symbolbibliotek för Northlight Draw
 * Alla symboler använder render(ctx, x, y, w, h, stroke, fill) canvas-mönster
 */

export const INDUSTRIAL_SYMBOLS = [

  // ═══════════════════════════════════════════════
  //  VENTILER
  // ═══════════════════════════════════════════════

  {
    id: 'pid-valve-2way',
    label: '2-vägs ventil',
    category: 'Ventiler',
    width: 64, height: 64,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      const mx = x + w / 2, my = y + h / 2;
      // Left triangle
      ctx.beginPath();
      ctx.moveTo(x + w * 0.12, y + h * 0.18);
      ctx.lineTo(x + w * 0.12, y + h * 0.82);
      ctx.lineTo(mx, my);
      ctx.closePath();
      ctx.fillStyle = stroke || '#000';
      ctx.fill();
      ctx.stroke();
      // Right triangle
      ctx.beginPath();
      ctx.moveTo(x + w * 0.88, y + h * 0.18);
      ctx.lineTo(x + w * 0.88, y + h * 0.82);
      ctx.lineTo(mx, my);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Pipe stubs
      ctx.beginPath();
      ctx.moveTo(x, my); ctx.lineTo(x + w * 0.12, my);
      ctx.moveTo(x + w * 0.88, my); ctx.lineTo(x + w, my);
      ctx.stroke();
    },
  },

  {
    id: 'pid-valve-2way-nc',
    label: '2-vägs ventil (NC)',
    category: 'Ventiler',
    width: 64, height: 64,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      const mx = x + w / 2, my = y + h / 2;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.12, y + h * 0.18);
      ctx.lineTo(x + w * 0.12, y + h * 0.82);
      ctx.lineTo(mx, my);
      ctx.closePath();
      ctx.fillStyle = stroke || '#000';
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.88, y + h * 0.18);
      ctx.lineTo(x + w * 0.88, y + h * 0.82);
      ctx.lineTo(mx, my);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // NC bar
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(mx, y + h * 0.18);
      ctx.lineTo(mx, y + h * 0.82);
      ctx.stroke();
      // Pipe stubs
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, my); ctx.lineTo(x + w * 0.12, my);
      ctx.moveTo(x + w * 0.88, my); ctx.lineTo(x + w, my);
      ctx.stroke();
    },
  },

  {
    id: 'pid-valve-3way',
    label: '3-vägs ventil',
    category: 'Ventiler',
    width: 64, height: 64,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.fillStyle = stroke || '#000';
      const mx = x + w / 2, my = y + h / 2;
      // Left triangle
      ctx.beginPath();
      ctx.moveTo(x + w * 0.12, y + h * 0.3);
      ctx.lineTo(x + w * 0.12, y + h * 0.7);
      ctx.lineTo(x + w * 0.4, my);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Right triangle
      ctx.beginPath();
      ctx.moveTo(x + w * 0.88, y + h * 0.3);
      ctx.lineTo(x + w * 0.88, y + h * 0.7);
      ctx.lineTo(x + w * 0.6, my);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Top triangle
      ctx.beginPath();
      ctx.moveTo(x + w * 0.3, y + h * 0.12);
      ctx.lineTo(x + w * 0.7, y + h * 0.12);
      ctx.lineTo(mx, y + h * 0.4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Stubs
      ctx.beginPath();
      ctx.moveTo(x, my); ctx.lineTo(x + w * 0.12, my);
      ctx.moveTo(x + w * 0.88, my); ctx.lineTo(x + w, my);
      ctx.moveTo(mx, y); ctx.lineTo(mx, y + h * 0.12);
      ctx.stroke();
    },
  },

  // ═══════════════════════════════════════════════
  //  INSTRUMENT
  // ═══════════════════════════════════════════════

  {
    id: 'pid-pressure-transmitter',
    label: 'Trycktransmitter (bar)',
    category: 'Instrument',
    width: 72, height: 72,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const cx = x + w / 2, cy = y + h * 0.46;
      const r = Math.min(w, h) * 0.38;
      // Circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = fill || '#fff';
      ctx.fill(); ctx.stroke();
      // Gauge arc
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.65, Math.PI * 0.75, Math.PI * 0.25);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      // Labels
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${Math.round(r * 0.45)}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('PT', cx, cy - r * 0.12);
      ctx.font = `${Math.round(r * 0.35)}px monospace`;
      ctx.fillText('bar', cx, cy + r * 0.3);
      // Pipe stub down
      ctx.beginPath();
      ctx.moveTo(cx, cy + r);
      ctx.lineTo(cx, y + h);
      ctx.stroke();
    },
  },

  {
    id: 'pid-level-switch',
    label: 'Nivåvakt',
    category: 'Instrument',
    width: 72, height: 72,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      // Vessel wall
      ctx.beginPath();
      ctx.moveTo(x + w * 0.22, y + h * 0.06);
      ctx.lineTo(x + w * 0.22, y + h * 0.94);
      ctx.stroke();
      // Arm
      ctx.beginPath();
      ctx.moveTo(x + w * 0.22, y + h * 0.4);
      ctx.lineTo(x + w * 0.55, y + h * 0.4);
      ctx.stroke();
      // Float
      ctx.beginPath();
      ctx.arc(x + w * 0.7, y + h * 0.55, w * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = fill || '#fff';
      ctx.fill(); ctx.stroke();
      // Pivot line
      ctx.beginPath();
      ctx.moveTo(x + w * 0.55, y + h * 0.4);
      ctx.lineTo(x + w * 0.55, y + h * 0.55);
      ctx.stroke();
      // Switch contacts
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.22, y + h * 0.18);
      ctx.lineTo(x + w * 0.78, y + h * 0.18);
      ctx.moveTo(x + w * 0.22, y + h * 0.29);
      ctx.lineTo(x + w * 0.78, y + h * 0.29);
      ctx.stroke();
      // Blade (open)
      ctx.beginPath();
      ctx.moveTo(x + w * 0.28, y + h * 0.18);
      ctx.lineTo(x + w * 0.72, y + h * 0.23);
      ctx.stroke();
    },
  },

  // ═══════════════════════════════════════════════
  //  MASKINER
  // ═══════════════════════════════════════════════

  {
    id: 'pid-combustion-engine',
    label: 'Förbränningsmotor',
    category: 'Maskiner',
    width: 88, height: 72,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      // Block
      ctx.beginPath();
      ctx.roundRect(x + w * 0.08, y + h * 0.22, w * 0.55, h * 0.56, 4);
      ctx.fillStyle = fill || '#fff';
      ctx.fill(); ctx.stroke();
      // Cylinder 1
      ctx.beginPath();
      ctx.rect(x + w * 0.14, y + h * 0.3, w * 0.16, h * 0.28);
      ctx.fillStyle = stroke ? `${stroke}22` : '#33334422';
      ctx.fill(); ctx.stroke();
      // Cylinder 2
      ctx.beginPath();
      ctx.rect(x + w * 0.35, y + h * 0.3, w * 0.16, h * 0.28);
      ctx.fillStyle = stroke ? `${stroke}22` : '#33334422';
      ctx.fill(); ctx.stroke();
      // Crankshaft output
      ctx.lineWidth = 2.5;
      ctx.fillStyle = fill || '#fff';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.63, y + h / 2);
      ctx.lineTo(x + w * 0.85, y + h / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + w * 0.88, y + h / 2, w * 0.07, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Exhaust stubs
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(x + w * 0.15, y + h * 0.1, w * 0.1, h * 0.12);
      ctx.fillStyle = fill || '#fff';
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.rect(x + w * 0.36, y + h * 0.1, w * 0.1, h * 0.12);
      ctx.fill(); ctx.stroke();
      // ICE label
      ctx.lineWidth = 2;
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${Math.round(h * 0.14)}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('ICE', x + w * 0.36, y + h * 0.86);
    },
  },

  {
    id: 'pid-linear-actuator',
    label: 'Linjärenhet',
    category: 'Maskiner',
    width: 88, height: 56,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const bodyTop = y + h * 0.28, bodyH = h * 0.44;
      // Cylinder body
      ctx.beginPath();
      ctx.roundRect(x + w * 0.04, bodyTop, w * 0.48, bodyH, 2);
      ctx.fillStyle = fill || '#fff';
      ctx.fill(); ctx.stroke();
      // Piston divider
      ctx.beginPath();
      ctx.moveTo(x + w * 0.3, bodyTop);
      ctx.lineTo(x + w * 0.3, bodyTop + bodyH);
      ctx.stroke();
      // Rod
      ctx.beginPath();
      ctx.rect(x + w * 0.52, bodyTop + bodyH * 0.25, w * 0.34, bodyH * 0.5);
      ctx.fill(); ctx.stroke();
      // End cap
      ctx.beginPath();
      ctx.arc(x + w * 0.88, y + h / 2, h * 0.07, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Port stubs
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.14, bodyTop);
      ctx.lineTo(x + w * 0.14, y + h * 0.12);
      ctx.moveTo(x + w * 0.42, bodyTop);
      ctx.lineTo(x + w * 0.42, y + h * 0.12);
      ctx.stroke();
    },
  },

  // ═══════════════════════════════════════════════
  //  ELEKTRO
  // ═══════════════════════════════════════════════

  {
    id: 'pid-relay',
    label: 'Relä',
    category: 'Elektro',
    width: 80, height: 72,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      // Coil box
      ctx.beginPath();
      ctx.roundRect(x + w * 0.04, y + h * 0.35, w * 0.38, h * 0.3, 2);
      ctx.fillStyle = fill || '#fff';
      ctx.fill(); ctx.stroke();
      // K label
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${Math.round(h * 0.18)}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('K', x + w * 0.23, y + h * 0.5);
      // Coil terminals
      ctx.beginPath();
      ctx.moveTo(x, y + h * 0.5); ctx.lineTo(x + w * 0.04, y + h * 0.5);
      ctx.moveTo(x + w * 0.42, y + h * 0.5); ctx.lineTo(x + w * 0.52, y + h * 0.5);
      ctx.stroke();
      // Coupling line (dashed)
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x + w * 0.52, y + h * 0.5);
      ctx.lineTo(x + w * 0.62, y + h * 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      // NO contact rails
      ctx.beginPath();
      ctx.moveTo(x + w * 0.62, y + h * 0.22);
      ctx.lineTo(x + w, y + h * 0.22);
      ctx.moveTo(x + w * 0.62, y + h * 0.38);
      ctx.lineTo(x + w, y + h * 0.38);
      ctx.stroke();
      // NO blade (open)
      ctx.beginPath();
      ctx.moveTo(x + w * 0.65, y + h * 0.22);
      ctx.lineTo(x + w * 0.9, y + h * 0.3);
      ctx.stroke();
      // NC contact rails
      ctx.beginPath();
      ctx.moveTo(x + w * 0.62, y + h * 0.62);
      ctx.lineTo(x + w, y + h * 0.62);
      ctx.moveTo(x + w * 0.62, y + h * 0.78);
      ctx.lineTo(x + w, y + h * 0.78);
      ctx.stroke();
      // NC blade (closed)
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.65, y + h * 0.62);
      ctx.lineTo(x + w * 0.95, y + h * 0.62);
      ctx.stroke();
      // Labels
      ctx.font = `${Math.round(h * 0.12)}px monospace`;
      ctx.fillText('NO', x + w * 0.81, y + h * 0.16);
      ctx.fillText('NC', x + w * 0.81, y + h * 0.86);
    },
  },

  // ═══════════════════════════════════════════════
  //  KOMMUNIKATION
  // ═══════════════════════════════════════════════

  {
    id: 'pid-gps-antenna',
    label: 'GPS-antenn',
    category: 'Kommunikation',
    width: 64, height: 72,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      const cx = x + w / 2;
      // Vertical rod
      ctx.beginPath();
      ctx.moveTo(cx, y + h * 0.1);
      ctx.lineTo(cx, y + h * 0.6);
      ctx.stroke();
      // Crossbar
      ctx.beginPath();
      ctx.moveTo(x + w * 0.28, y + h * 0.28);
      ctx.lineTo(x + w * 0.72, y + h * 0.28);
      ctx.stroke();
      // Radials
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.18, y + h * 0.18);
      ctx.lineTo(x + w * 0.28, y + h * 0.28);
      ctx.moveTo(x + w * 0.82, y + h * 0.18);
      ctx.lineTo(x + w * 0.72, y + h * 0.28);
      ctx.stroke();
      // Mount
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, y + h * 0.6);
      ctx.lineTo(cx, y + h * 0.78);
      ctx.moveTo(x + w * 0.3, y + h * 0.78);
      ctx.lineTo(x + w * 0.7, y + h * 0.78);
      ctx.stroke();
      // Signal arcs
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(cx, y + h * 0.28, w * 0.22, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(cx, y + h * 0.28, w * 0.38, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // GPS label
      ctx.lineWidth = 1.5;
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${Math.round(w * 0.18)}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('GPS', cx, y + h * 0.9);
    },
  },

  {
    id: 'pid-satellite-antenna',
    label: 'Satellitantenn',
    category: 'Kommunikation',
    width: 72, height: 72,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2;
      // Parabolic dish
      ctx.beginPath();
      ctx.moveTo(x + w * 0.1, y + h * 0.78);
      ctx.quadraticCurveTo(x + w / 2, y + h * 0.05, x + w * 0.9, y + h * 0.78);
      ctx.stroke();
      // Dish edge
      ctx.beginPath();
      ctx.moveTo(x + w * 0.1, y + h * 0.78);
      ctx.lineTo(x + w * 0.9, y + h * 0.78);
      ctx.stroke();
      // Feed arm
      const cx = x + w / 2;
      ctx.beginPath();
      ctx.moveTo(cx, y + h * 0.42);
      ctx.lineTo(cx, y + h * 0.2);
      ctx.stroke();
      // Feed horn
      ctx.beginPath();
      ctx.arc(cx, y + h * 0.18, w * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = fill || '#fff';
      ctx.fill(); ctx.stroke();
      // Support
      ctx.beginPath();
      ctx.moveTo(cx, y + h * 0.78);
      ctx.lineTo(cx, y + h * 0.95);
      ctx.stroke();
      // Satellite dot
      ctx.beginPath();
      ctx.arc(x + w * 0.82, y + h * 0.1, w * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = stroke || '#000';
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;
      // Signal line to satellite
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(cx, y + h * 0.18);
      ctx.lineTo(x + w * 0.8, y + h * 0.12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    },
  },

  {
    id: 'pid-antenna-4g',
    label: '4G-antenn',
    category: 'Kommunikation',
    width: 64, height: 72,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000';
      ctx.lineWidth = 2.5;
      const cx = x + w / 2;
      // Rod
      ctx.beginPath();
      ctx.moveTo(cx, y + h * 0.08);
      ctx.lineTo(cx, y + h * 0.72);
      ctx.stroke();
      // Cap
      ctx.fillStyle = stroke || '#000';
      ctx.beginPath();
      ctx.arc(cx, y + h * 0.08, w * 0.06, 0, Math.PI * 2);
      ctx.fill();
      // Signal waves (right)
      ctx.lineWidth = 1.5;
      const waves = [
        { r: w * 0.18, a: 0.75 }, { r: w * 0.3, a: 0.65 }, { r: w * 0.42, a: 0.55 }
      ];
      waves.forEach(({ r, a }, i) => {
        ctx.globalAlpha = 1 - i * 0.25;
        ctx.beginPath();
        ctx.arc(cx, y + h * 0.4, r, -Math.PI * a, Math.PI * a);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      // Mount
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, y + h * 0.72);
      ctx.lineTo(cx, y + h * 0.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(x + w * 0.3, y + h * 0.85, w * 0.4, h * 0.08, 2);
      ctx.fillStyle = fill || '#fff';
      ctx.fill(); ctx.stroke();
      // Label
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${Math.round(h * 0.16)}px monospace`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('4G', x + w * 0.06, y + h * 0.43);
    },
  },
];

export function getCategories() {
  return [...new Set(INDUSTRIAL_SYMBOLS.map((s) => s.category))];
}

export function getSymbolsByCategory(category) {
  return INDUSTRIAL_SYMBOLS.filter((s) => s.category === category);
}
