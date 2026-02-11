/**
 * NetworkIT.js — Network & IT infrastructure symbols.
 */

export const NETWORK_IT_SYMBOLS = [

  // ═══════════════════════════════════════════════
  //  SERVERS & COMPUTE
  // ═══════════════════════════════════════════════

  {
    id: 'net-server',
    label: 'Server',
    category: 'Servrar',
    width: 70, height: 90,
    render(ctx, x, y, w, h, stroke, fill) {
      const r = 4, slotH = h * 0.22, gap = 3;
      // Main box
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
      // Drive slots
      for (let i = 0; i < 3; i++) {
        const sy = y + 6 + i * (slotH + gap);
        ctx.strokeRect(x + 6, sy, w - 12, slotH);
        // LED dot
        ctx.fillStyle = i === 0 ? '#4caf50' : '#ccc';
        ctx.beginPath(); ctx.arc(x + w - 12, sy + slotH / 2, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    },
  },

  {
    id: 'net-workstation',
    label: 'Arbetsstation',
    category: 'Servrar',
    width: 80, height: 80,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Monitor
      const mw = w * 0.85, mh = h * 0.55;
      const mx = x + (w - mw) / 2, my = y;
      ctx.beginPath(); ctx.rect(mx, my, mw, mh);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.stroke();
      // Screen inner
      ctx.strokeRect(mx + 3, my + 3, mw - 6, mh - 8);
      // Stand
      const cx = x + w / 2;
      ctx.beginPath();
      ctx.moveTo(cx - 5, my + mh); ctx.lineTo(cx + 5, my + mh);
      ctx.lineTo(cx + 3, my + mh + h * 0.15); ctx.lineTo(cx - 3, my + mh + h * 0.15);
      ctx.closePath(); ctx.stroke();
      // Keyboard
      const ky = my + mh + h * 0.2;
      ctx.fillStyle = fill || '#fff';
      ctx.fillRect(x + w * 0.1, ky, w * 0.8, h * 0.15);
      ctx.strokeRect(x + w * 0.1, ky, w * 0.8, h * 0.15);
    },
  },

  {
    id: 'net-cloud',
    label: 'Moln (Cloud)',
    category: 'Servrar',
    width: 110, height: 70,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.25, y + h * 0.65);
      ctx.bezierCurveTo(x + w * 0.05, y + h * 0.65, x, y + h * 0.4, x + w * 0.15, y + h * 0.3);
      ctx.bezierCurveTo(x + w * 0.05, y + h * 0.1, x + w * 0.25, y - h * 0.02, x + w * 0.4, y + h * 0.1);
      ctx.bezierCurveTo(x + w * 0.45, y - h * 0.08, x + w * 0.7, y - h * 0.05, x + w * 0.72, y + h * 0.12);
      ctx.bezierCurveTo(x + w * 0.95, y + h * 0.08, x + w * 1.05, y + h * 0.32, x + w * 0.9, y + h * 0.42);
      ctx.bezierCurveTo(x + w, y + h * 0.55, x + w * 0.9, y + h * 0.72, x + w * 0.75, y + h * 0.65);
      ctx.bezierCurveTo(x + w * 0.65, y + h * 0.78, x + w * 0.35, y + h * 0.78, x + w * 0.25, y + h * 0.65);
      ctx.closePath();
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
    },
  },

  {
    id: 'net-database',
    label: 'Databas',
    category: 'Servrar',
    width: 70, height: 85,
    render(ctx, x, y, w, h, stroke, fill) {
      const ry = Math.min(h * 0.12, 12);
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Body
      ctx.beginPath();
      ctx.moveTo(x, y + ry); ctx.lineTo(x, y + h - ry);
      ctx.ellipse(x + w / 2, y + h - ry, w / 2, ry, 0, Math.PI, 0, true);
      ctx.lineTo(x + w, y + ry);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.stroke();
      // Top ellipse
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + ry, w / 2, ry, 0, 0, Math.PI * 2);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.stroke();
      // Middle ellipse line
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h * 0.4, w / 2, ry * 0.7, 0, 0, Math.PI);
      ctx.stroke();
    },
  },

  // ═══════════════════════════════════════════════
  //  NETWORKING DEVICES
  // ═══════════════════════════════════════════════

  {
    id: 'net-router',
    label: 'Router',
    category: 'Nätverk',
    width: 80, height: 80,
    render(ctx, x, y, w, h, stroke, fill) {
      const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2 - 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
      // Cross arrows
      const ar = r * 0.55, headSize = 6;
      ctx.lineWidth = 2;
      // Horizontal
      ctx.beginPath(); ctx.moveTo(cx - ar, cy); ctx.lineTo(cx + ar, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + ar - headSize, cy - headSize); ctx.lineTo(cx + ar, cy); ctx.lineTo(cx + ar - headSize, cy + headSize); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - ar + headSize, cy - headSize); ctx.lineTo(cx - ar, cy); ctx.lineTo(cx - ar + headSize, cy + headSize); ctx.stroke();
      // Vertical
      ctx.beginPath(); ctx.moveTo(cx, cy - ar); ctx.lineTo(cx, cy + ar); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - headSize, cy - ar + headSize); ctx.lineTo(cx, cy - ar); ctx.lineTo(cx + headSize, cy - ar + headSize); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - headSize, cy + ar - headSize); ctx.lineTo(cx, cy + ar); ctx.lineTo(cx + headSize, cy + ar - headSize); ctx.stroke();
    },
  },

  {
    id: 'net-switch',
    label: 'Switch',
    category: 'Nätverk',
    width: 100, height: 50,
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
      // Arrows (bi-directional)
      const cy = y + h / 2;
      ctx.lineWidth = 1.5;
      // Right arrow
      ctx.beginPath(); ctx.moveTo(x + w * 0.3, cy - 6); ctx.lineTo(x + w * 0.7, cy - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w * 0.65, cy - 10); ctx.lineTo(x + w * 0.7, cy - 6); ctx.lineTo(x + w * 0.65, cy - 2); ctx.stroke();
      // Left arrow
      ctx.beginPath(); ctx.moveTo(x + w * 0.3, cy + 6); ctx.lineTo(x + w * 0.7, cy + 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w * 0.35, cy + 2); ctx.lineTo(x + w * 0.3, cy + 6); ctx.lineTo(x + w * 0.35, cy + 10); ctx.stroke();
      // Port indicators
      const ports = 4;
      for (let i = 0; i < ports; i++) {
        const px = x + 8 + (w - 16) / (ports - 1) * i;
        ctx.fillStyle = '#4caf50';
        ctx.beginPath(); ctx.arc(px, y + h - 8, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    },
  },

  {
    id: 'net-firewall',
    label: 'Brandvägg',
    category: 'Nätverk',
    width: 80, height: 70,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.rect(x, y, w, h);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.stroke();
      // Brick pattern
      const brickH = h / 4;
      ctx.lineWidth = 1;
      for (let row = 1; row < 4; row++) {
        const by = y + row * brickH;
        ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x + w, by); ctx.stroke();
        // Vertical splits (offset every other row)
        const offset = row % 2 === 0 ? 0 : w / 4;
        for (let col = 1; col < 4; col++) {
          const bx = x + (w / 4) * col + (row % 2 === 0 ? 0 : w / 8) - w / 8;
          if (bx > x && bx < x + w) {
            ctx.beginPath();
            ctx.moveTo(bx, by - brickH); ctx.lineTo(bx, by);
            ctx.stroke();
          }
        }
      }
      // Flame icon hint
      ctx.fillStyle = '#ff5722';
      ctx.font = `${Math.min(w, h) * 0.25}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🔥', x + w / 2, y + h / 2);
    },
  },

  {
    id: 'net-hub',
    label: 'Hubb',
    category: 'Nätverk',
    width: 90, height: 40,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
      // Horizontal line through center
      ctx.beginPath(); ctx.moveTo(x + w * 0.15, y + h / 2); ctx.lineTo(x + w * 0.85, y + h / 2); ctx.stroke();
      // Port dots
      const dots = 5;
      for (let i = 0; i < dots; i++) {
        const dx = x + w * 0.2 + (w * 0.6 / (dots - 1)) * i;
        ctx.fillStyle = stroke || '#000';
        ctx.beginPath(); ctx.arc(dx, y + h / 2, 3, 0, Math.PI * 2); ctx.fill();
      }
    },
  },

  {
    id: 'net-wireless-ap',
    label: 'Trådlös AP',
    category: 'Nätverk',
    width: 70, height: 80,
    render(ctx, x, y, w, h, stroke) {
      const cx = x + w / 2;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Base unit (small rect)
      const bw = w * 0.4, bh = h * 0.2;
      ctx.strokeRect(cx - bw / 2, y + h * 0.55, bw, bh);
      // Antenna line
      ctx.beginPath(); ctx.moveTo(cx, y + h * 0.55); ctx.lineTo(cx, y + h * 0.35); ctx.stroke();
      // Signal waves (arcs)
      for (let i = 1; i <= 3; i++) {
        const r = i * w * 0.12;
        ctx.beginPath();
        ctx.arc(cx, y + h * 0.35, r, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // Bottom connection
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, y + h * 0.75); ctx.lineTo(cx, y + h); ctx.stroke();
    },
  },

  // ═══════════════════════════════════════════════
  //  SECURITY & MONITORING
  // ═══════════════════════════════════════════════

  {
    id: 'net-lock',
    label: 'Säkerhet / Lås',
    category: 'Säkerhet',
    width: 60, height: 70,
    render(ctx, x, y, w, h, stroke, fill) {
      const cx = x + w / 2;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Shackle
      const shackleR = w * 0.28;
      ctx.beginPath();
      ctx.arc(cx, y + h * 0.32, shackleR, Math.PI, 0);
      ctx.stroke();
      // Body
      const bw = w * 0.75, bh = h * 0.45;
      const bx = cx - bw / 2, by = y + h * 0.32;
      ctx.beginPath(); ctx.rect(bx, by, bw, bh);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.stroke();
      // Keyhole
      ctx.fillStyle = stroke || '#000';
      ctx.beginPath(); ctx.arc(cx, by + bh * 0.4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - 2, by + bh * 0.45); ctx.lineTo(cx + 2, by + bh * 0.45);
      ctx.lineTo(cx + 1, by + bh * 0.7); ctx.lineTo(cx - 1, by + bh * 0.7);
      ctx.closePath(); ctx.fill();
    },
  },

  {
    id: 'net-monitor',
    label: 'Övervakning',
    category: 'Säkerhet',
    width: 80, height: 70,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Screen
      const sw = w * 0.9, sh = h * 0.6;
      const sx = x + (w - sw) / 2, sy = y;
      ctx.beginPath(); ctx.rect(sx, sy, sw, sh);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.stroke();
      // EKG-style line inside
      const ey = sy + sh / 2;
      ctx.strokeStyle = '#4caf50'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx + 5, ey);
      ctx.lineTo(sx + sw * 0.25, ey);
      ctx.lineTo(sx + sw * 0.35, ey - sh * 0.3);
      ctx.lineTo(sx + sw * 0.45, ey + sh * 0.25);
      ctx.lineTo(sx + sw * 0.55, ey - sh * 0.15);
      ctx.lineTo(sx + sw * 0.65, ey);
      ctx.lineTo(sx + sw - 5, ey);
      ctx.stroke();
      // Stand
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      const cx = x + w / 2;
      ctx.beginPath(); ctx.moveTo(cx, sy + sh); ctx.lineTo(cx, sy + sh + h * 0.15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - w * 0.2, y + h); ctx.lineTo(cx + w * 0.2, y + h); ctx.lineWidth = 3; ctx.stroke();
    },
  },

  // ═══════════════════════════════════════════════
  //  CONNECTIONS & INTERFACES
  // ═══════════════════════════════════════════════

  {
    id: 'net-ethernet',
    label: 'Ethernet-port',
    category: 'Gränssnitt',
    width: 50, height: 50,
    render(ctx, x, y, w, h, stroke) {
      const cx = x + w / 2, cy = y + h / 2;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // RJ45 shape
      const pw = w * 0.6, ph = h * 0.5;
      ctx.strokeRect(cx - pw / 2, cy - ph / 2, pw, ph);
      // Tab on top
      ctx.strokeRect(cx - pw * 0.25, cy - ph / 2 - 4, pw * 0.5, 4);
      // Pins
      const pins = 4;
      for (let i = 0; i < pins; i++) {
        const px = cx - pw / 2 + 4 + (pw - 8) / (pins - 1) * i;
        ctx.beginPath(); ctx.moveTo(px, cy - 2); ctx.lineTo(px, cy + ph * 0.3); ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.lineWidth = 2;
      // Bottom cable
      ctx.beginPath(); ctx.moveTo(cx, cy + ph / 2); ctx.lineTo(cx, y + h); ctx.stroke();
    },
  },

  {
    id: 'net-serial',
    label: 'Seriell (RS-485)',
    category: 'Gränssnitt',
    width: 60, height: 40,
    render(ctx, x, y, w, h, stroke, fill) {
      // D-shape connector
      const cx = x + w / 2, cy = y + h / 2;
      const pw = w * 0.8, ph = h * 0.7;
      ctx.beginPath();
      ctx.moveTo(cx - pw / 2 + 5, cy - ph / 2);
      ctx.lineTo(cx + pw / 2 - 5, cy - ph / 2);
      ctx.arcTo(cx + pw / 2, cy - ph / 2, cx + pw / 2, cy, 5);
      ctx.lineTo(cx + pw / 2, cy + ph / 2 - 3);
      ctx.lineTo(cx - pw / 2, cy + ph / 2 - 3);
      ctx.lineTo(cx - pw / 2, cy - ph / 2 + 5);
      ctx.arcTo(cx - pw / 2, cy - ph / 2, cx - pw / 2 + 5, cy - ph / 2, 5);
      ctx.closePath();
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
      // Pins
      ctx.fillStyle = stroke || '#000';
      const pins = [[0.3, 0.35], [0.5, 0.35], [0.7, 0.35], [0.4, 0.6], [0.6, 0.6]];
      for (const [px, py] of pins) {
        ctx.beginPath(); ctx.arc(x + w * px, y + h * py, 2, 0, Math.PI * 2); ctx.fill();
      }
    },
  },

  {
    id: 'net-fiber',
    label: 'Fiber-anslutning',
    category: 'Gränssnitt',
    width: 60, height: 50,
    render(ctx, x, y, w, h, stroke) {
      const cx = x + w / 2, cy = y + h / 2;
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Two circles (TX/RX)
      const r = Math.min(w, h) * 0.18;
      ctx.beginPath(); ctx.arc(cx - r * 1.2, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + r * 1.2, cy, r, 0, Math.PI * 2); ctx.stroke();
      // Arrows
      ctx.lineWidth = 1.5;
      // TX arrow (right)
      ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r * 1.8); ctx.lineTo(cx + r * 0.8, cy - r * 1.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + r * 0.4, cy - r * 2.2); ctx.lineTo(cx + r * 0.8, cy - r * 1.8); ctx.lineTo(cx + r * 0.4, cy - r * 1.4); ctx.stroke();
      // RX arrow (left)
      ctx.beginPath(); ctx.moveTo(cx + r * 0.3, cy + r * 1.8); ctx.lineTo(cx - r * 0.8, cy + r * 1.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy + r * 1.4); ctx.lineTo(cx - r * 0.8, cy + r * 1.8); ctx.lineTo(cx - r * 0.4, cy + r * 2.2); ctx.stroke();
      // Labels
      ctx.fillStyle = stroke || '#000';
      ctx.font = `bold ${r * 0.7}px Inter, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('TX', cx - r * 1.2, cy);
      ctx.fillText('RX', cx + r * 1.2, cy);
    },
  },
];

// ─── Lookup helpers ────────────────────────────────────────

const _symbolMap = new Map();
NETWORK_IT_SYMBOLS.forEach((s) => _symbolMap.set(s.id, s));

export function getSymbolById(id) {
  return _symbolMap.get(id) || null;
}

export function getCategories() {
  const seen = new Set();
  const cats = [];
  for (const s of NETWORK_IT_SYMBOLS) {
    if (!seen.has(s.category)) { seen.add(s.category); cats.push(s.category); }
  }
  return cats;
}

export function getSymbolsByCategory(category) {
  return NETWORK_IT_SYMBOLS.filter((s) => s.category === category);
}
