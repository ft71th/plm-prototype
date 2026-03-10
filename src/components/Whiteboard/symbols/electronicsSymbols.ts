// src/components/Whiteboard/symbols/electronicsSymbols.ts
// IEC/IEEE-style electronics circuit symbols for Northlight Draw
// Symbols rendered in a 64×64 viewBox, stroke="currentColor" fill="none" unless noted
// Based on standard kretssymboler (IEC 60617)

export interface SymbolDef {
  id: string;
  name: string;
  category: string;
  tags: string[];
  svg: string;
  defaultWidth?: number;
  defaultHeight?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSIVA KOMPONENTER
// ─────────────────────────────────────────────────────────────────────────────

const RESISTOR: SymbolDef = {
  id: 'resistor',
  name: 'Resistor',
  category: 'Passiv',
  tags: ['resistor', 'motstånd', 'R', 'ohm'],
  svg: `
    <!-- Left wire -->
    <line x1="0" y1="32" x2="12" y2="32" stroke="currentColor" stroke-width="2"/>
    <!-- Resistor body (IEC rectangle) -->
    <rect x="12" y="24" width="40" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
    <!-- Right wire -->
    <line x1="52" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
  `,
  defaultWidth: 64,
  defaultHeight: 48,
};

const POTENTIOMETER: SymbolDef = {
  id: 'potentiometer',
  name: 'Potentiometer',
  category: 'Passiv',
  tags: ['pot', 'potentiometer', 'variable', 'resistor', 'variabel'],
  svg: `
    <line x1="0" y1="32" x2="12" y2="32" stroke="currentColor" stroke-width="2"/>
    <rect x="12" y="24" width="40" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
    <line x1="52" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
    <!-- Arrow (wiper) -->
    <line x1="32" y1="48" x2="32" y2="40" stroke="currentColor" stroke-width="1.5"/>
    <polyline points="28,44 32,40 36,44" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <line x1="32" y1="48" x2="32" y2="60" stroke="currentColor" stroke-width="1.5"/>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

const CAPACITOR: SymbolDef = {
  id: 'capacitor',
  name: 'Kondensator',
  category: 'Passiv',
  tags: ['capacitor', 'kondensator', 'C', 'farad'],
  svg: `
    <line x1="0" y1="32" x2="28" y2="32" stroke="currentColor" stroke-width="2"/>
    <!-- Plate 1 -->
    <line x1="28" y1="14" x2="28" y2="50" stroke="currentColor" stroke-width="3"/>
    <!-- Gap -->
    <!-- Plate 2 -->
    <line x1="36" y1="14" x2="36" y2="50" stroke="currentColor" stroke-width="3"/>
    <line x1="36" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

const CAPACITOR_ELECTROLYTIC: SymbolDef = {
  id: 'capacitor-electrolytic',
  name: 'Elektrolytisk kondensator',
  category: 'Passiv',
  tags: ['electrolytic', 'capacitor', 'polarized', 'kondensator', 'C'],
  svg: `
    <line x1="0" y1="32" x2="28" y2="32" stroke="currentColor" stroke-width="2"/>
    <!-- Flat plate (negative) -->
    <line x1="28" y1="14" x2="28" y2="50" stroke="currentColor" stroke-width="3"/>
    <!-- Curved plate (positive) -->
    <path d="M 36 14 Q 42 32 36 50" stroke="currentColor" stroke-width="3" fill="none"/>
    <line x1="36" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
    <!-- + sign -->
    <text x="20" y="14" font-size="10" fill="currentColor" font-family="monospace">+</text>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

const INDUCTOR: SymbolDef = {
  id: 'inductor',
  name: 'Induktor / Spole',
  category: 'Passiv',
  tags: ['inductor', 'coil', 'spole', 'L', 'henry'],
  svg: `
    <line x1="0" y1="32" x2="10" y2="32" stroke="currentColor" stroke-width="2"/>
    <!-- 4 bumps = coil -->
    <path d="M 10 32 A 6 6 0 0 1 22 32 A 6 6 0 0 1 34 32 A 6 6 0 0 1 46 32 A 6 6 0 0 1 54 32"
          stroke="currentColor" stroke-width="2" fill="none"/>
    <line x1="54" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
  `,
  defaultWidth: 64,
  defaultHeight: 48,
};

// ─────────────────────────────────────────────────────────────────────────────
// DIODER
// ─────────────────────────────────────────────────────────────────────────────

const DIODE: SymbolDef = {
  id: 'diode',
  name: 'Diod',
  category: 'Dioder',
  tags: ['diode', 'diod', 'D', 'rectifier'],
  svg: `
    <line x1="0" y1="32" x2="20" y2="32" stroke="currentColor" stroke-width="2"/>
    <!-- Triangle (anode→cathode) -->
    <polygon points="20,16 20,48 44,32" stroke="currentColor" stroke-width="2" fill="none"/>
    <!-- Cathode bar -->
    <line x1="44" y1="16" x2="44" y2="48" stroke="currentColor" stroke-width="2.5"/>
    <line x1="44" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

const DIODE_ZENER: SymbolDef = {
  id: 'diode-zener',
  name: 'Zener-diod',
  category: 'Dioder',
  tags: ['zener', 'diode', 'diod', 'voltage', 'regulation'],
  svg: `
    <line x1="0" y1="32" x2="20" y2="32" stroke="currentColor" stroke-width="2"/>
    <polygon points="20,16 20,48 44,32" stroke="currentColor" stroke-width="2" fill="none"/>
    <!-- Zener cathode bar with bent ends -->
    <path d="M 38 16 L 44 16 L 44 48 L 50 48" stroke="currentColor" stroke-width="2.5" fill="none"/>
    <line x1="44" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

const DIODE_LED: SymbolDef = {
  id: 'diode-led',
  name: 'LED',
  category: 'Dioder',
  tags: ['led', 'light', 'diode', 'ljus', 'emitter'],
  svg: `
    <line x1="0" y1="32" x2="20" y2="32" stroke="currentColor" stroke-width="2"/>
    <polygon points="20,16 20,48 44,32" stroke="currentColor" stroke-width="2" fill="none"/>
    <line x1="44" y1="16" x2="44" y2="48" stroke="currentColor" stroke-width="2.5"/>
    <line x1="44" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
    <!-- Light rays -->
    <line x1="50" y1="18" x2="58" y2="10" stroke="currentColor" stroke-width="1.5"/>
    <polyline points="56,10 58,10 58,12" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <line x1="56" y1="24" x2="62" y2="16" stroke="currentColor" stroke-width="1.5"/>
    <polyline points="60,16 62,16 62,18" stroke="currentColor" stroke-width="1.5" fill="none"/>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

const DIODE_SCHOTTKY: SymbolDef = {
  id: 'diode-schottky',
  name: 'Schottky-diod',
  category: 'Dioder',
  tags: ['schottky', 'diode', 'fast', 'switching'],
  svg: `
    <line x1="0" y1="32" x2="20" y2="32" stroke="currentColor" stroke-width="2"/>
    <polygon points="20,16 20,48 44,32" stroke="currentColor" stroke-width="2" fill="none"/>
    <!-- S-shaped cathode -->
    <path d="M 40 16 Q 44 16 44 20 L 44 44 Q 44 48 48 48" stroke="currentColor" stroke-width="2.5" fill="none"/>
    <line x1="44" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

// ─────────────────────────────────────────────────────────────────────────────
// TRANSISTORER
// ─────────────────────────────────────────────────────────────────────────────

const TRANSISTOR_NPN: SymbolDef = {
  id: 'transistor-npn',
  name: 'Transistor NPN (BJT)',
  category: 'Transistorer',
  tags: ['transistor', 'npn', 'bjt', 'T', 'switch'],
  svg: `
    <!-- Base lead -->
    <line x1="0" y1="32" x2="26" y2="32" stroke="currentColor" stroke-width="2"/>
    <!-- Vertical base bar -->
    <line x1="26" y1="18" x2="26" y2="46" stroke="currentColor" stroke-width="3"/>
    <!-- Collector line (upper) -->
    <line x1="26" y1="22" x2="48" y2="10" stroke="currentColor" stroke-width="2"/>
    <line x1="48" y1="10" x2="48" y2="4" stroke="currentColor" stroke-width="2"/>
    <!-- Emitter line (lower) with arrow -->
    <line x1="26" y1="42" x2="48" y2="54" stroke="currentColor" stroke-width="2"/>
    <line x1="48" y1="54" x2="48" y2="60" stroke="currentColor" stroke-width="2"/>
    <!-- Arrow on emitter (NPN = arrow pointing out) -->
    <polygon points="40,48 48,54 42,56" fill="currentColor"/>
    <!-- Labels -->
    <text x="56" y="8" font-size="9" fill="currentColor" font-family="monospace">C</text>
    <text x="56" y="62" font-size="9" fill="currentColor" font-family="monospace">E</text>
    <text x="2" y="28" font-size="9" fill="currentColor" font-family="monospace">B</text>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

const TRANSISTOR_PNP: SymbolDef = {
  id: 'transistor-pnp',
  name: 'Transistor PNP (BJT)',
  category: 'Transistorer',
  tags: ['transistor', 'pnp', 'bjt', 'T'],
  svg: `
    <line x1="0" y1="32" x2="26" y2="32" stroke="currentColor" stroke-width="2"/>
    <line x1="26" y1="18" x2="26" y2="46" stroke="currentColor" stroke-width="3"/>
    <line x1="26" y1="22" x2="48" y2="10" stroke="currentColor" stroke-width="2"/>
    <line x1="48" y1="10" x2="48" y2="4" stroke="currentColor" stroke-width="2"/>
    <line x1="26" y1="42" x2="48" y2="54" stroke="currentColor" stroke-width="2"/>
    <line x1="48" y1="54" x2="48" y2="60" stroke="currentColor" stroke-width="2"/>
    <!-- Arrow on emitter (PNP = arrow pointing in) -->
    <polygon points="30,43 38,37 34,48" fill="currentColor"/>
    <text x="56" y="8" font-size="9" fill="currentColor" font-family="monospace">C</text>
    <text x="56" y="62" font-size="9" fill="currentColor" font-family="monospace">E</text>
    <text x="2" y="28" font-size="9" fill="currentColor" font-family="monospace">B</text>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

const MOSFET_N: SymbolDef = {
  id: 'mosfet-n',
  name: 'N-MOSFET',
  category: 'Transistorer',
  tags: ['mosfet', 'n-channel', 'fet', 'transistor'],
  svg: `
    <!-- Gate -->
    <line x1="0" y1="32" x2="20" y2="32" stroke="currentColor" stroke-width="2"/>
    <line x1="20" y1="18" x2="20" y2="46" stroke="currentColor" stroke-width="3"/>
    <!-- Insulation gap -->
    <line x1="24" y1="18" x2="24" y2="46" stroke="currentColor" stroke-width="2"/>
    <!-- Drain connection top -->
    <line x1="24" y1="22" x2="36" y2="22" stroke="currentColor" stroke-width="2"/>
    <line x1="36" y1="22" x2="36" y2="4" stroke="currentColor" stroke-width="2"/>
    <!-- Source connection bottom -->
    <line x1="24" y1="42" x2="36" y2="42" stroke="currentColor" stroke-width="2"/>
    <line x1="36" y1="42" x2="36" y2="60" stroke="currentColor" stroke-width="2"/>
    <!-- Bulk/body -->
    <line x1="24" y1="32" x2="36" y2="32" stroke="currentColor" stroke-width="2" stroke-dasharray="3,2"/>
    <!-- Body diode -->
    <polygon points="30,30 36,26 36,34" fill="currentColor"/>
    <!-- Drain/source labels -->
    <text x="42" y="8" font-size="9" fill="currentColor" font-family="monospace">D</text>
    <text x="42" y="62" font-size="9" fill="currentColor" font-family="monospace">S</text>
    <text x="2" y="28" font-size="9" fill="currentColor" font-family="monospace">G</text>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

// ─────────────────────────────────────────────────────────────────────────────
// FÖRSTÄRKARE / INTEGRERADE KRETSAR
// ─────────────────────────────────────────────────────────────────────────────

const OP_AMP: SymbolDef = {
  id: 'op-amp',
  name: 'Operationsförstärkare',
  category: 'IC / Förstärkare',
  tags: ['op-amp', 'opamp', 'amplifier', 'förstärkare', 'OA', 'comparator'],
  svg: `
    <!-- Triangle body -->
    <polygon points="12,8 12,56 56,32" stroke="currentColor" stroke-width="2" fill="none"/>
    <!-- Non-inverting input (+) -->
    <line x1="0" y1="24" x2="12" y2="24" stroke="currentColor" stroke-width="2"/>
    <text x="15" y="27" font-size="10" fill="currentColor" font-family="monospace">+</text>
    <!-- Inverting input (-) -->
    <line x1="0" y1="40" x2="12" y2="40" stroke="currentColor" stroke-width="2"/>
    <text x="15" y="43" font-size="10" fill="currentColor" font-family="monospace">−</text>
    <!-- Output -->
    <line x1="56" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
  `,
  defaultWidth: 72,
  defaultHeight: 64,
};

const AND_GATE: SymbolDef = {
  id: 'and-gate',
  name: 'AND-grind',
  category: 'Logik',
  tags: ['and', 'gate', 'grind', 'logic', 'digital'],
  svg: `
    <!-- Body: flat left, rounded right -->
    <path d="M 10 14 L 38 14 A 18 18 0 0 1 38 50 L 10 50 Z"
          stroke="currentColor" stroke-width="2" fill="none"/>
    <!-- Input A -->
    <line x1="0" y1="22" x2="10" y2="22" stroke="currentColor" stroke-width="2"/>
    <!-- Input B -->
    <line x1="0" y1="42" x2="10" y2="42" stroke="currentColor" stroke-width="2"/>
    <!-- Output -->
    <line x1="56" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
    <!-- Label -->
    <text x="24" y="36" text-anchor="middle" font-size="10" fill="currentColor" font-family="monospace">&amp;</text>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

const OR_GATE: SymbolDef = {
  id: 'or-gate',
  name: 'OR-grind',
  category: 'Logik',
  tags: ['or', 'gate', 'grind', 'logic', 'digital'],
  svg: `
    <!-- OR gate body -->
    <path d="M 10 14 Q 26 14 38 32 Q 26 50 10 50 Q 22 32 10 14 Z"
          stroke="currentColor" stroke-width="2" fill="none"/>
    <!-- Inputs -->
    <line x1="0" y1="22" x2="14" y2="22" stroke="currentColor" stroke-width="2"/>
    <line x1="0" y1="42" x2="14" y2="42" stroke="currentColor" stroke-width="2"/>
    <!-- Output -->
    <line x1="38" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
    <text x="22" y="36" text-anchor="middle" font-size="10" fill="currentColor" font-family="monospace">≥1</text>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

const NOT_GATE: SymbolDef = {
  id: 'not-gate',
  name: 'NOT-grind (Inverterare)',
  category: 'Logik',
  tags: ['not', 'inverter', 'gate', 'grind', 'logic'],
  svg: `
    <line x1="0" y1="32" x2="12" y2="32" stroke="currentColor" stroke-width="2"/>
    <!-- Triangle -->
    <polygon points="12,14 12,50 48,32" stroke="currentColor" stroke-width="2" fill="none"/>
    <!-- Bubble (inversion circle) -->
    <circle cx="52" cy="32" r="4" stroke="currentColor" stroke-width="2" fill="none"/>
    <line x1="56" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
    <text x="24" y="36" text-anchor="middle" font-size="9" fill="currentColor" font-family="monospace">1</text>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

// ─────────────────────────────────────────────────────────────────────────────
// KÄLLOR / SUPPLIES
// ─────────────────────────────────────────────────────────────────────────────

const VOLTAGE_SOURCE: SymbolDef = {
  id: 'voltage-source',
  name: 'Spänningskälla (DC)',
  category: 'Källor',
  tags: ['voltage', 'source', 'battery', 'supply', 'spänning', 'VCC', 'DC'],
  svg: `
    <line x1="32" y1="0" x2="32" y2="22" stroke="currentColor" stroke-width="2"/>
    <!-- + plate (longer) -->
    <line x1="18" y1="22" x2="46" y2="22" stroke="currentColor" stroke-width="3"/>
    <!-- - plate (shorter) -->
    <line x1="24" y1="30" x2="40" y2="30" stroke="currentColor" stroke-width="2"/>
    <!-- More cells (optional) -->
    <line x1="18" y1="38" x2="46" y2="38" stroke="currentColor" stroke-width="3"/>
    <line x1="24" y1="46" x2="40" y2="46" stroke="currentColor" stroke-width="2"/>
    <line x1="32" y1="46" x2="32" y2="64" stroke="currentColor" stroke-width="2"/>
    <!-- + / - labels -->
    <text x="8" y="26" font-size="11" fill="currentColor" font-family="monospace">+</text>
    <text x="8" y="42" font-size="11" fill="currentColor" font-family="monospace">−</text>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

const GROUND: SymbolDef = {
  id: 'ground',
  name: 'Jord (GND)',
  category: 'Källor',
  tags: ['ground', 'gnd', 'jord', 'reference', 'earth'],
  svg: `
    <line x1="32" y1="0" x2="32" y2="28" stroke="currentColor" stroke-width="2"/>
    <!-- Three horizontal bars decreasing in width -->
    <line x1="12" y1="28" x2="52" y2="28" stroke="currentColor" stroke-width="2.5"/>
    <line x1="18" y1="36" x2="46" y2="36" stroke="currentColor" stroke-width="2"/>
    <line x1="24" y1="44" x2="40" y2="44" stroke="currentColor" stroke-width="1.5"/>
    <line x1="28" y1="52" x2="36" y2="52" stroke="currentColor" stroke-width="1"/>
  `,
  defaultWidth: 64,
  defaultHeight: 56,
};

const POWER_SUPPLY_VCC: SymbolDef = {
  id: 'power-vcc',
  name: 'VCC / +V',
  category: 'Källor',
  tags: ['vcc', 'vdd', 'supply', 'power', '+5V', '+3.3V', 'rail'],
  svg: `
    <line x1="32" y1="64" x2="32" y2="28" stroke="currentColor" stroke-width="2"/>
    <!-- Horizontal top bar -->
    <line x1="14" y1="28" x2="50" y2="28" stroke="currentColor" stroke-width="3"/>
    <!-- Arrow head (pointing up) -->
    <polyline points="24,14 32,8 40,14" stroke="currentColor" stroke-width="2" fill="none"/>
    <!-- Label -->
    <text x="32" y="6" text-anchor="middle" font-size="8" fill="currentColor" font-family="monospace">+V</text>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

// ─────────────────────────────────────────────────────────────────────────────
// SWITCHAR / KONTAKTER
// ─────────────────────────────────────────────────────────────────────────────

const SWITCH_SPST: SymbolDef = {
  id: 'switch-spst',
  name: 'Strömbrytare (SPST)',
  category: 'Switchar',
  tags: ['switch', 'spst', 'brytare', 'NO', 'contact'],
  svg: `
    <line x1="0" y1="32" x2="18" y2="32" stroke="currentColor" stroke-width="2"/>
    <!-- Fixed contact dot -->
    <circle cx="18" cy="32" r="3" fill="currentColor"/>
    <!-- Moving contact line (open) -->
    <line x1="18" y1="32" x2="46" y2="18" stroke="currentColor" stroke-width="2"/>
    <!-- Fixed contact right dot -->
    <circle cx="46" cy="32" r="3" fill="currentColor"/>
    <line x1="46" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
  `,
  defaultWidth: 64,
  defaultHeight: 48,
};

const SWITCH_PUSHBUTTON: SymbolDef = {
  id: 'switch-pushbutton',
  name: 'Tryckknappsbrytare (NO)',
  category: 'Switchar',
  tags: ['pushbutton', 'button', 'switch', 'trycknapp', 'NO', 'momentary'],
  svg: `
    <line x1="0" y1="40" x2="20" y2="40" stroke="currentColor" stroke-width="2"/>
    <circle cx="20" cy="40" r="3" fill="currentColor"/>
    <!-- Contact bar above -->
    <line x1="20" y1="28" x2="44" y2="28" stroke="currentColor" stroke-width="2"/>
    <!-- Button actuator -->
    <line x1="32" y1="28" x2="32" y2="18" stroke="currentColor" stroke-width="1.5"/>
    <line x1="24" y1="18" x2="40" y2="18" stroke="currentColor" stroke-width="2.5"/>
    <!-- Dashed push line -->
    <line x1="32" y1="10" x2="32" y2="18" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3,2"/>
    <circle cx="44" cy="40" r="3" fill="currentColor"/>
    <line x1="44" y1="40" x2="64" y2="40" stroke="currentColor" stroke-width="2"/>
  `,
  defaultWidth: 64,
  defaultHeight: 56,
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const ELECTRONICS_SYMBOLS: SymbolDef[] = [
  // Passiv
  RESISTOR,
  POTENTIOMETER,
  CAPACITOR,
  CAPACITOR_ELECTROLYTIC,
  INDUCTOR,
  // Dioder
  DIODE,
  DIODE_ZENER,
  DIODE_LED,
  DIODE_SCHOTTKY,
  // Transistorer
  TRANSISTOR_NPN,
  TRANSISTOR_PNP,
  MOSFET_N,
  // IC / Förstärkare
  OP_AMP,
  AND_GATE,
  OR_GATE,
  NOT_GATE,
  // Källor
  VOLTAGE_SOURCE,
  GROUND,
  POWER_SUPPLY_VCC,
  // Switchar
  SWITCH_SPST,
  SWITCH_PUSHBUTTON,
];

export const ELECTRONICS_CATEGORIES = [
  'Passiv',
  'Dioder',
  'Transistorer',
  'IC / Förstärkare',
  'Logik',
  'Källor',
  'Switchar',
] as const;

export type ElectronicsCategory = typeof ELECTRONICS_CATEGORIES[number];

export function getElectronicsByCategory(cat: ElectronicsCategory): SymbolDef[] {
  return ELECTRONICS_SYMBOLS.filter(s => s.category === cat);
}

export function searchElectronicsSymbols(query: string): SymbolDef[] {
  const q = query.toLowerCase();
  return ELECTRONICS_SYMBOLS.filter(
    s =>
      s.name.toLowerCase().includes(q) ||
      s.id.includes(q) ||
      s.tags.some(t => t.includes(q))
  );
}
