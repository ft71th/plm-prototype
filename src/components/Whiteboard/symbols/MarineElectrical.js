/**
 * MarineElectrical.js — Symbol definitions for marine electrical/PMS systems.
 *
 * Each symbol has:
 *   id       – unique key (used as shapeVariant: 'symbol-<id>')
 *   label    – display name
 *   category – grouping
 *   width/height – default size when placed
 *   render(ctx, x, y, w, h) – draws the symbol (works for both preview & canvas)
 *
 * Drawing convention: symbols are drawn within the bounding box (x, y, w, h).
 * Stroke/fill colors are set by the caller (or default to black/white).
 */

export const MARINE_ELECTRICAL_SYMBOLS = [

  // ═══════════════════════════════════════════════
  //  POWER GENERATION & CONVERSION
  // ═══════════════════════════════════════════════

  {
    id: 'generator',
    label: 'Generator',
    category: 'Kraftgenerering',
    width: 80, height: 80,
    render(ctx, x, y, w, h, stroke, fill) {
      const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2 - 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
      // "G" label
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${r * 0.9}px Inter, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('G', cx, cy);
      // Connection stubs top/bottom
      ctx.beginPath();
      ctx.moveTo(cx, y); ctx.lineTo(cx, y + (h / 2 - r));
      ctx.moveTo(cx, y + h); ctx.lineTo(cx, y + h / 2 + r);
      ctx.stroke();
    },
  },

  {
    id: 'motor',
    label: 'Motor',
    category: 'Kraftgenerering',
    width: 80, height: 80,
    render(ctx, x, y, w, h, stroke, fill) {
      const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2 - 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${r * 0.9}px Inter, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('M', cx, cy);
      ctx.beginPath();
      ctx.moveTo(cx, y); ctx.lineTo(cx, y + (h / 2 - r));
      ctx.moveTo(cx, y + h); ctx.lineTo(cx, y + h / 2 + r);
      ctx.stroke();
    },
  },

  {
    id: 'transformer',
    label: 'Transformator',
    category: 'Kraftgenerering',
    width: 80, height: 100,
    render(ctx, x, y, w, h, stroke) {
      const cx = x + w / 2, r = Math.min(w, h) * 0.2;
      const topCy = y + h * 0.33, botCy = y + h * 0.67;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Two coils (circles)
      ctx.beginPath(); ctx.arc(cx, topCy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, botCy, r, 0, Math.PI * 2); ctx.stroke();
      // Connection stubs
      ctx.beginPath();
      ctx.moveTo(cx, y); ctx.lineTo(cx, topCy - r);
      ctx.moveTo(cx, y + h); ctx.lineTo(cx, botCy + r);
      ctx.stroke();
    },
  },

  {
    id: 'frequency-converter',
    label: 'Frekvensomr. (VFD)',
    category: 'Kraftgenerering',
    width: 90, height: 70,
    render(ctx, x, y, w, h, stroke, fill) {
      // Rounded rectangle
      const r = 6;
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
      // "VFD" text
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${Math.min(w, h) * 0.3}px Inter, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('VFD', x + w / 2, y + h / 2);
      // Sine wave hint
      const waveY = y + h * 0.75, waveW = w * 0.5;
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - waveW / 2, waveY);
      ctx.bezierCurveTo(
        x + w / 2 - waveW / 4, waveY - 6,
        x + w / 2, waveY - 6,
        x + w / 2, waveY
      );
      ctx.bezierCurveTo(
        x + w / 2, waveY + 6,
        x + w / 2 + waveW / 4, waveY + 6,
        x + w / 2 + waveW / 2, waveY
      );
      ctx.lineWidth = 1.5; ctx.stroke();
    },
  },

  // ═══════════════════════════════════════════════
  //  DISTRIBUTION & SWITCHING
  // ═══════════════════════════════════════════════

  {
    id: 'circuit-breaker',
    label: 'Brytare (CB)',
    category: 'Distribution',
    width: 50, height: 80,
    render(ctx, x, y, w, h, stroke) {
      const cx = x + w / 2;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Vertical line top
      ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y + h * 0.3); ctx.stroke();
      // Angled line (open breaker)
      ctx.beginPath();
      ctx.moveTo(cx, y + h * 0.3);
      ctx.lineTo(cx + w * 0.25, y + h * 0.6);
      ctx.stroke();
      // Bottom terminal
      ctx.beginPath(); ctx.moveTo(cx, y + h * 0.6); ctx.lineTo(cx, y + h); ctx.stroke();
      // Cross mark (breaker symbol)
      const crossSize = 5;
      const crossY = y + h * 0.45;
      ctx.beginPath();
      ctx.moveTo(cx - crossSize, crossY - crossSize);
      ctx.lineTo(cx + crossSize, crossY + crossSize);
      ctx.moveTo(cx + crossSize, crossY - crossSize);
      ctx.lineTo(cx - crossSize, crossY + crossSize);
      ctx.stroke();
    },
  },

  {
    id: 'disconnector',
    label: 'Frånskiljare',
    category: 'Distribution',
    width: 50, height: 80,
    render(ctx, x, y, w, h, stroke) {
      const cx = x + w / 2;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y + h * 0.35); ctx.stroke();
      // Open blade
      ctx.beginPath();
      ctx.moveTo(cx, y + h * 0.35);
      ctx.lineTo(cx + w * 0.3, y + h * 0.6);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, y + h * 0.65); ctx.lineTo(cx, y + h); ctx.stroke();
      // Terminal dots
      ctx.fillStyle = stroke || '#000';
      ctx.beginPath(); ctx.arc(cx, y + h * 0.35, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, y + h * 0.65, 3, 0, Math.PI * 2); ctx.fill();
    },
  },

  {
    id: 'fuse',
    label: 'Säkring',
    category: 'Distribution',
    width: 40, height: 70,
    render(ctx, x, y, w, h, stroke) {
      const cx = x + w / 2;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Top wire
      ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y + h * 0.25); ctx.stroke();
      // Fuse body (rectangle)
      const bw = w * 0.5, bh = h * 0.5;
      ctx.strokeRect(cx - bw / 2, y + h * 0.25, bw, bh);
      // Wire through fuse
      ctx.beginPath();
      ctx.moveTo(cx, y + h * 0.25); ctx.lineTo(cx, y + h * 0.75);
      ctx.stroke();
      // Bottom wire
      ctx.beginPath(); ctx.moveTo(cx, y + h * 0.75); ctx.lineTo(cx, y + h); ctx.stroke();
    },
  },

  {
    id: 'busbar',
    label: 'Samlingsskena',
    category: 'Distribution',
    width: 200, height: 20,
    render(ctx, x, y, w, h, stroke) {
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 4;
      const cy = y + h / 2;
      ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + w, cy); ctx.stroke();
      // Terminal marks
      ctx.lineWidth = 2;
      const marks = 5;
      for (let i = 0; i < marks; i++) {
        const mx = x + (w / (marks - 1)) * i;
        ctx.beginPath();
        ctx.moveTo(mx, cy - h * 0.3); ctx.lineTo(mx, cy + h * 0.3);
        ctx.stroke();
      }
    },
  },

  {
    id: 'msb',
    label: 'Huvudtavla (MSB)',
    category: 'Distribution',
    width: 140, height: 80,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Double-border rectangle
      ctx.strokeRect(x, y, w, h);
      ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.globalAlpha = 0.3; ctx.fillRect(x + 3, y + 3, w - 6, h - 6); ctx.globalAlpha = 1; }
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${Math.min(w, h) * 0.25}px Inter, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('MSB', x + w / 2, y + h / 2);
    },
  },

  {
    id: 'esb',
    label: 'Nödtavla (ESB)',
    category: 'Distribution',
    width: 140, height: 80,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.globalAlpha = 0.3; ctx.fillRect(x + 3, y + 3, w - 6, h - 6); ctx.globalAlpha = 1; }
      ctx.fillStyle = '#d32f2f';
      ctx.font = `bold ${Math.min(w, h) * 0.25}px Inter, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('ESB', x + w / 2, y + h / 2);
      // Red emergency indicator
      ctx.strokeStyle = '#d32f2f'; ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
      ctx.setLineDash([]);
    },
  },

  // ═══════════════════════════════════════════════
  //  COMPONENTS
  // ═══════════════════════════════════════════════

  {
    id: 'resistor',
    label: 'Resistor',
    category: 'Komponenter',
    width: 70, height: 30,
    render(ctx, x, y, w, h, stroke) {
      const cy = y + h / 2;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Lead in
      ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + w * 0.15, cy); ctx.stroke();
      // Zigzag
      const zx = x + w * 0.15, zw = w * 0.7, segs = 6;
      ctx.beginPath(); ctx.moveTo(zx, cy);
      for (let i = 0; i < segs; i++) {
        const px = zx + (zw / segs) * (i + 0.5);
        const py = cy + (i % 2 === 0 ? -h * 0.35 : h * 0.35);
        ctx.lineTo(px, py);
      }
      ctx.lineTo(zx + zw, cy);
      ctx.stroke();
      // Lead out
      ctx.beginPath(); ctx.moveTo(x + w * 0.85, cy); ctx.lineTo(x + w, cy); ctx.stroke();
    },
  },

  {
    id: 'capacitor',
    label: 'Kondensator',
    category: 'Komponenter',
    width: 50, height: 60,
    render(ctx, x, y, w, h, stroke) {
      const cx = x + w / 2;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Top lead
      ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y + h * 0.35); ctx.stroke();
      // Top plate
      ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + h * 0.38); ctx.lineTo(x + w * 0.8, y + h * 0.38); ctx.stroke();
      // Bottom plate
      ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + h * 0.52); ctx.lineTo(x + w * 0.8, y + h * 0.52); ctx.stroke();
      // Bottom lead
      ctx.beginPath(); ctx.moveTo(cx, y + h * 0.55); ctx.lineTo(cx, y + h); ctx.stroke();
    },
  },

  {
    id: 'inductor',
    label: 'Spole / Induktor',
    category: 'Komponenter',
    width: 70, height: 30,
    render(ctx, x, y, w, h, stroke) {
      const cy = y + h / 2;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Lead in
      ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + w * 0.12, cy); ctx.stroke();
      // Coil bumps
      const bumps = 4, bStart = x + w * 0.12, bWidth = w * 0.76;
      ctx.beginPath(); ctx.moveTo(bStart, cy);
      for (let i = 0; i < bumps; i++) {
        const bx = bStart + (bWidth / bumps) * i;
        const bx2 = bStart + (bWidth / bumps) * (i + 1);
        ctx.arc((bx + bx2) / 2, cy, bWidth / bumps / 2, Math.PI, 0, false);
      }
      ctx.stroke();
      // Lead out
      ctx.beginPath(); ctx.moveTo(x + w * 0.88, cy); ctx.lineTo(x + w, cy); ctx.stroke();
    },
  },

  {
    id: 'diode',
    label: 'Diod',
    category: 'Komponenter',
    width: 50, height: 60,
    render(ctx, x, y, w, h, stroke) {
      const cx = x + w / 2;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Top lead
      ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y + h * 0.3); ctx.stroke();
      // Triangle
      ctx.beginPath();
      ctx.moveTo(x + w * 0.2, y + h * 0.3);
      ctx.lineTo(x + w * 0.8, y + h * 0.3);
      ctx.lineTo(cx, y + h * 0.65);
      ctx.closePath();
      ctx.stroke();
      // Bar
      ctx.beginPath();
      ctx.moveTo(x + w * 0.2, y + h * 0.65);
      ctx.lineTo(x + w * 0.8, y + h * 0.65);
      ctx.stroke();
      // Bottom lead
      ctx.beginPath(); ctx.moveTo(cx, y + h * 0.65); ctx.lineTo(cx, y + h); ctx.stroke();
    },
  },

  // ═══════════════════════════════════════════════
  //  GROUNDING & CONNECTIONS
  // ═══════════════════════════════════════════════

  {
    id: 'ground',
    label: 'Jord',
    category: 'Anslutningar',
    width: 40, height: 60,
    render(ctx, x, y, w, h, stroke) {
      const cx = x + w / 2;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Vertical line
      ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y + h * 0.5); ctx.stroke();
      // Three horizontal lines, decreasing width
      const lines = [0.8, 0.55, 0.3];
      lines.forEach((ratio, i) => {
        const ly = y + h * 0.5 + i * (h * 0.15);
        const lw = w * ratio;
        ctx.beginPath();
        ctx.moveTo(cx - lw / 2, ly); ctx.lineTo(cx + lw / 2, ly);
        ctx.stroke();
      });
    },
  },

  {
    id: 'shore-connection',
    label: 'Landanslutning',
    category: 'Anslutningar',
    width: 80, height: 80,
    render(ctx, x, y, w, h, stroke) {
      const cx = x + w / 2, cy = y + h / 2;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Circle
      const r = Math.min(w, h) * 0.35;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      // Plug symbol (two prongs)
      const pw = r * 0.3, ph = r * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx - pw, cy - ph / 2); ctx.lineTo(cx - pw, cy + ph / 2);
      ctx.moveTo(cx + pw, cy - ph / 2); ctx.lineTo(cx + pw, cy + ph / 2);
      ctx.lineWidth = 3; ctx.stroke();
      // Top connection
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, cy - r); ctx.stroke();
      // "Shore" label below
      ctx.fillStyle = stroke || '#000';
      ctx.font = `${Math.min(w, h) * 0.15}px Inter, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('Shore', cx, y + h * 0.82);
    },
  },

  {
    id: 'battery',
    label: 'Batteri',
    category: 'Anslutningar',
    width: 50, height: 70,
    render(ctx, x, y, w, h, stroke) {
      const cx = x + w / 2;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Top lead
      ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y + h * 0.3); ctx.stroke();
      // Long plate (+)
      ctx.beginPath(); ctx.moveTo(x + w * 0.15, y + h * 0.3); ctx.lineTo(x + w * 0.85, y + h * 0.3); ctx.lineWidth = 3; ctx.stroke();
      // Short plate (-)
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h * 0.45); ctx.lineTo(x + w * 0.7, y + h * 0.45); ctx.stroke();
      // Long plate
      ctx.beginPath(); ctx.moveTo(x + w * 0.15, y + h * 0.55); ctx.lineTo(x + w * 0.85, y + h * 0.55); ctx.lineWidth = 3; ctx.stroke();
      // Short plate
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h * 0.7); ctx.lineTo(x + w * 0.7, y + h * 0.7); ctx.stroke();
      // Bottom lead
      ctx.beginPath(); ctx.moveTo(cx, y + h * 0.7); ctx.lineTo(cx, y + h); ctx.stroke();
      // + and - labels
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${h * 0.12}px Inter, sans-serif`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('+', x + w * 0.88, y + h * 0.3);
      ctx.fillText('−', x + w * 0.88, y + h * 0.7);
    },
  },

  // ═══════════════════════════════════════════════
  //  CONTROL & AUTOMATION
  // ═══════════════════════════════════════════════

  {
    id: 'plc-controller',
    label: 'PLC / Kontroller',
    category: 'Automation',
    width: 100, height: 70,
    render(ctx, x, y, w, h, stroke, fill) {
      const r = 4;
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
      // "PLC" text
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${Math.min(w, h) * 0.28}px Inter, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('PLC', x + w / 2, y + h * 0.4);
      // I/O indicators (dots along bottom)
      const dots = 6, dotR = 3;
      const dotY = y + h * 0.75;
      for (let i = 0; i < dots; i++) {
        const dx = x + w * 0.15 + (w * 0.7 / (dots - 1)) * i;
        ctx.fillStyle = i < dots / 2 ? '#4caf50' : '#ff9800';
        ctx.beginPath(); ctx.arc(dx, dotY, dotR, 0, Math.PI * 2); ctx.fill();
      }
    },
  },

  {
    id: 'sensor',
    label: 'Sensor',
    category: 'Automation',
    width: 60, height: 60,
    render(ctx, x, y, w, h, stroke) {
      const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) * 0.35;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Diamond shape
      ctx.beginPath();
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.stroke();
      // "S" label
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${r * 0.8}px Inter, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('S', cx, cy);
      // Top connection
      ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, cy - r); ctx.stroke();
    },
  },

  {
    id: 'relay',
    label: 'Relä',
    category: 'Automation',
    width: 60, height: 60,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Rectangle body
      const bx = x + w * 0.15, by = y + h * 0.15;
      const bw = w * 0.7, bh = h * 0.7;
      ctx.strokeRect(bx, by, bw, bh);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      // Coil symbol inside (two bumps)
      const coilY = y + h / 2;
      ctx.beginPath();
      ctx.arc(x + w * 0.38, coilY, w * 0.1, Math.PI, 0, false);
      ctx.arc(x + w * 0.58, coilY, w * 0.1, Math.PI, 0, false);
      ctx.stroke();
      // Connection stubs
      ctx.beginPath();
      ctx.moveTo(x + w * 0.35, y); ctx.lineTo(x + w * 0.35, by);
      ctx.moveTo(x + w * 0.65, y); ctx.lineTo(x + w * 0.65, by);
      ctx.moveTo(x + w * 0.5, by + bh); ctx.lineTo(x + w * 0.5, y + h);
      ctx.stroke();
    },
  },

  {
    id: 'indicator',
    label: 'Indikator / LED',
    category: 'Automation',
    width: 40, height: 50,
    render(ctx, x, y, w, h, stroke) {
      const cx = x + w / 2, cy = y + h * 0.45;
      const r = Math.min(w, h) * 0.28;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Circle
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      // Cross inside
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.6, cy - r * 0.6); ctx.lineTo(cx + r * 0.6, cy + r * 0.6);
      ctx.moveTo(cx + r * 0.6, cy - r * 0.6); ctx.lineTo(cx - r * 0.6, cy + r * 0.6);
      ctx.lineWidth = 1.5; ctx.stroke();
      // Bottom lead
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy + r); ctx.lineTo(cx, y + h); ctx.stroke();
    },
  },

  // ═══════════════════════════════════════════════
  //  MARINE SPECIFIC
  // ═══════════════════════════════════════════════

  {
    id: 'thruster',
    label: 'Thruster',
    category: 'Marin',
    width: 80, height: 80,
    render(ctx, x, y, w, h, stroke, fill) {
      const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2 - 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
      // Propeller blades (3)
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 / 3) * i - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * r * 0.7, cy + Math.sin(angle) * r * 0.7);
        ctx.stroke();
      }
      // Center dot
      ctx.fillStyle = stroke || '#000';
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
      // Top connection
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, cy - r); ctx.stroke();
    },
  },

  {
    id: 'pump',
    label: 'Pump',
    category: 'Marin',
    width: 70, height: 70,
    render(ctx, x, y, w, h, stroke, fill) {
      const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) * 0.35;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Circle
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.stroke();
      // Triangle (flow direction) inside
      const ts = r * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx - ts / 2, cy - ts * 0.5);
      ctx.lineTo(cx + ts / 2, cy);
      ctx.lineTo(cx - ts / 2, cy + ts * 0.5);
      ctx.closePath();
      ctx.fillStyle = stroke || '#000'; ctx.fill();
      // Connections left/right
      ctx.beginPath();
      ctx.moveTo(x, cy); ctx.lineTo(cx - r, cy);
      ctx.moveTo(cx + r, cy); ctx.lineTo(x + w, cy);
      ctx.stroke();
    },
  },

  {
    id: 'valve',
    label: 'Ventil',
    category: 'Marin',
    width: 60, height: 40,
    render(ctx, x, y, w, h, stroke) {
      const cx = x + w / 2, cy = y + h / 2;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Two triangles forming bowtie
      ctx.beginPath();
      ctx.moveTo(x + w * 0.15, y + h * 0.15);
      ctx.lineTo(cx, cy);
      ctx.lineTo(x + w * 0.15, y + h * 0.85);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.85, y + h * 0.15);
      ctx.lineTo(cx, cy);
      ctx.lineTo(x + w * 0.85, y + h * 0.85);
      ctx.closePath();
      ctx.stroke();
      // Connections
      ctx.beginPath();
      ctx.moveTo(x, cy); ctx.lineTo(x + w * 0.15, cy);
      ctx.moveTo(x + w * 0.85, cy); ctx.lineTo(x + w, cy);
      ctx.stroke();
    },
  },
];

// ─── Lookup helpers ────────────────────────────────────────

/** Map: symbolId → symbol definition */
const _symbolMap = new Map();
MARINE_ELECTRICAL_SYMBOLS.forEach((s) => _symbolMap.set(s.id, s));

/** Get symbol definition by id */
export function getSymbolById(id) {
  return _symbolMap.get(id) || null;
}

/** Get unique categories in order */
export function getCategories() {
  const seen = new Set();
  const cats = [];
  for (const s of MARINE_ELECTRICAL_SYMBOLS) {
    if (!seen.has(s.category)) {
      seen.add(s.category);
      cats.push(s.category);
    }
  }
  return cats;
}

/** Get symbols for a category */
export function getSymbolsByCategory(category) {
  return MARINE_ELECTRICAL_SYMBOLS.filter((s) => s.category === category);
}
