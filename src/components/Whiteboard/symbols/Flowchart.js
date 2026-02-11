/**
 * Flowchart.js — Flowchart / process diagram symbols.
 */

export const FLOWCHART_SYMBOLS = [

  // ═══════════════════════════════════════════════
  //  BASIC FLOWCHART
  // ═══════════════════════════════════════════════

  {
    id: 'fc-process',
    label: 'Process',
    category: 'Grundläggande',
    width: 120, height: 60,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.beginPath(); ctx.rect(x, y, w, h);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
    },
  },

  {
    id: 'fc-decision',
    label: 'Beslut',
    category: 'Grundläggande',
    width: 100, height: 80,
    render(ctx, x, y, w, h, stroke, fill) {
      const cx = x + w / 2, cy = y + h / 2;
      ctx.beginPath();
      ctx.moveTo(cx, y); ctx.lineTo(x + w, cy); ctx.lineTo(cx, y + h); ctx.lineTo(x, cy);
      ctx.closePath();
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
    },
  },

  {
    id: 'fc-terminator',
    label: 'Start / Slut',
    category: 'Grundläggande',
    width: 120, height: 50,
    render(ctx, x, y, w, h, stroke, fill) {
      const r = h / 2;
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
      ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x + r, y + h);
      ctx.arc(x + r, y + r, r, Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
    },
  },

  {
    id: 'fc-data',
    label: 'Data (I/O)',
    category: 'Grundläggande',
    width: 120, height: 60,
    render(ctx, x, y, w, h, stroke, fill) {
      const skew = w * 0.15;
      ctx.beginPath();
      ctx.moveTo(x + skew, y); ctx.lineTo(x + w, y);
      ctx.lineTo(x + w - skew, y + h); ctx.lineTo(x, y + h);
      ctx.closePath();
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
    },
  },

  {
    id: 'fc-document',
    label: 'Dokument',
    category: 'Grundläggande',
    width: 120, height: 70,
    render(ctx, x, y, w, h, stroke, fill) {
      const waveH = h * 0.12;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h - waveH);
      // Wave bottom
      ctx.bezierCurveTo(
        x + w * 0.75, y + h - waveH * 3,
        x + w * 0.25, y + h + waveH,
        x, y + h - waveH
      );
      ctx.closePath();
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
    },
  },

  {
    id: 'fc-predefined',
    label: 'Fördef. process',
    category: 'Grundläggande',
    width: 120, height: 60,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.beginPath(); ctx.rect(x, y, w, h);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
      // Side bars
      const inset = w * 0.1;
      ctx.beginPath();
      ctx.moveTo(x + inset, y); ctx.lineTo(x + inset, y + h);
      ctx.moveTo(x + w - inset, y); ctx.lineTo(x + w - inset, y + h);
      ctx.stroke();
    },
  },

  {
    id: 'fc-manual-operation',
    label: 'Manuell operation',
    category: 'Grundläggande',
    width: 120, height: 60,
    render(ctx, x, y, w, h, stroke, fill) {
      const inset = w * 0.15;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y);
      ctx.lineTo(x + w - inset, y + h); ctx.lineTo(x + inset, y + h);
      ctx.closePath();
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
    },
  },

  {
    id: 'fc-preparation',
    label: 'Förberedelse',
    category: 'Grundläggande',
    width: 120, height: 60,
    render(ctx, x, y, w, h, stroke, fill) {
      const inset = w * 0.15;
      ctx.beginPath();
      ctx.moveTo(x + inset, y); ctx.lineTo(x + w - inset, y);
      ctx.lineTo(x + w, y + h / 2); ctx.lineTo(x + w - inset, y + h);
      ctx.lineTo(x + inset, y + h); ctx.lineTo(x, y + h / 2);
      ctx.closePath();
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
    },
  },

  // ═══════════════════════════════════════════════
  //  DATA & STORAGE
  // ═══════════════════════════════════════════════

  {
    id: 'fc-database',
    label: 'Databas',
    category: 'Data & Lagring',
    width: 80, height: 90,
    render(ctx, x, y, w, h, stroke, fill) {
      const ry = Math.min(h * 0.12, 14);
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Body
      ctx.beginPath();
      ctx.moveTo(x, y + ry); ctx.lineTo(x, y + h - ry);
      ctx.ellipse(x + w / 2, y + h - ry, w / 2, ry, 0, Math.PI, 0, true);
      ctx.lineTo(x + w, y + ry);
      ctx.ellipse(x + w / 2, y + ry, w / 2, ry, 0, 0, Math.PI, true);
      ctx.closePath();
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.stroke();
      // Top ellipse
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + ry, w / 2, ry, 0, 0, Math.PI * 2);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.stroke();
    },
  },

  {
    id: 'fc-internal-storage',
    label: 'Internminne',
    category: 'Data & Lagring',
    width: 80, height: 80,
    render(ctx, x, y, w, h, stroke, fill) {
      ctx.beginPath(); ctx.rect(x, y, w, h);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
      // Inner lines
      const inset = w * 0.15;
      ctx.beginPath();
      ctx.moveTo(x + inset, y); ctx.lineTo(x + inset, y + h);
      ctx.moveTo(x, y + inset); ctx.lineTo(x + w, y + inset);
      ctx.stroke();
    },
  },

  {
    id: 'fc-queue',
    label: 'Kö',
    category: 'Data & Lagring',
    width: 70, height: 80,
    render(ctx, x, y, w, h, stroke, fill) {
      const rx = w / 2;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, rx, h / 2, 0, 0, Math.PI * 2);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
      // Vertical center line
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
      ctx.stroke();
    },
  },

  // ═══════════════════════════════════════════════
  //  CONNECTORS & REFERENCES
  // ═══════════════════════════════════════════════

  {
    id: 'fc-connector',
    label: 'Kontakt (on-page)',
    category: 'Kopplingar',
    width: 50, height: 50,
    render(ctx, x, y, w, h, stroke, fill) {
      const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2 - 1;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
    },
  },

  {
    id: 'fc-off-page',
    label: 'Kontakt (off-page)',
    category: 'Kopplingar',
    width: 50, height: 60,
    render(ctx, x, y, w, h, stroke, fill) {
      const cx = x + w / 2;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h * 0.65);
      ctx.lineTo(cx, y + h); // point
      ctx.lineTo(x, y + h * 0.65);
      ctx.closePath();
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
    },
  },

  {
    id: 'fc-annotation',
    label: 'Anteckning',
    category: 'Kopplingar',
    width: 120, height: 60,
    render(ctx, x, y, w, h, stroke) {
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2;
      // Open bracket left side
      ctx.beginPath();
      ctx.moveTo(x + w * 0.15, y);
      ctx.lineTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w * 0.15, y + h);
      ctx.stroke();
      // Dashed connection line
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, y + h / 2); ctx.lineTo(x - 20, y + h / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    },
  },

  {
    id: 'fc-delay',
    label: 'Fördröjning',
    category: 'Kopplingar',
    width: 100, height: 50,
    render(ctx, x, y, w, h, stroke, fill) {
      const r = h / 2;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w - r, y);
      ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x, y + h); ctx.closePath();
      if (fill && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = 2; ctx.stroke();
    },
  },
];

// ─── Lookup helpers ────────────────────────────────────────

const _symbolMap = new Map();
FLOWCHART_SYMBOLS.forEach((s) => _symbolMap.set(s.id, s));

export function getSymbolById(id) {
  return _symbolMap.get(id) || null;
}

export function getCategories() {
  const seen = new Set();
  const cats = [];
  for (const s of FLOWCHART_SYMBOLS) {
    if (!seen.has(s.category)) { seen.add(s.category); cats.push(s.category); }
  }
  return cats;
}

export function getSymbolsByCategory(category) {
  return FLOWCHART_SYMBOLS.filter((s) => s.category === category);
}
