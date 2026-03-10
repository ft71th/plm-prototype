// src/components/Whiteboard/symbols/industrialSymbols.ts
// Industrial / Marine / P&ID symbol library for Northlight Draw

export interface SymbolDef {
  id: string;
  name: string;
  category: string;
  tags: string[];
  /** SVG path/elements rendered inside a 64×64 viewBox, stroke="currentColor" fill="none" unless specified */
  svg: string;
  /** Default size when dropped onto canvas */
  defaultWidth?: number;
  defaultHeight?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALVES
// ─────────────────────────────────────────────────────────────────────────────

const VALVE_2WAY: SymbolDef = {
  id: 'valve-2way',
  name: '2-vägs ventil',
  category: 'Ventiler',
  tags: ['valve', 'ventil', '2way', 'pid'],
  svg: `
    <!-- Left triangle -->
    <polygon points="8,12 8,52 32,32" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <!-- Right triangle -->
    <polygon points="56,12 56,52 32,32" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <!-- Left pipe stub -->
    <line x1="0" y1="32" x2="8" y2="32" stroke="currentColor" stroke-width="2"/>
    <!-- Right pipe stub -->
    <line x1="56" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

const VALVE_3WAY: SymbolDef = {
  id: 'valve-3way',
  name: '3-vägs ventil',
  category: 'Ventiler',
  tags: ['valve', 'ventil', '3way', 'pid', 'tee'],
  svg: `
    <!-- Left triangle -->
    <polygon points="8,20 8,44 26,32" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <!-- Right triangle -->
    <polygon points="56,20 56,44 38,32" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <!-- Top triangle (3rd port) -->
    <polygon points="20,8 44,8 32,26" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <!-- Left pipe stub -->
    <line x1="0" y1="32" x2="8" y2="32" stroke="currentColor" stroke-width="2"/>
    <!-- Right pipe stub -->
    <line x1="56" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
    <!-- Top pipe stub -->
    <line x1="32" y1="0" x2="32" y2="8" stroke="currentColor" stroke-width="2"/>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

const VALVE_2WAY_NORMALLY_CLOSED: SymbolDef = {
  id: 'valve-2way-nc',
  name: '2-vägs ventil (NC)',
  category: 'Ventiler',
  tags: ['valve', 'ventil', '2way', 'nc', 'normally closed'],
  svg: `
    <!-- Left triangle -->
    <polygon points="8,12 8,52 32,32" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <!-- Right triangle -->
    <polygon points="56,12 56,52 32,32" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <!-- Closed line across center -->
    <line x1="32" y1="12" x2="32" y2="52" stroke="currentColor" stroke-width="2.5"/>
    <!-- Left pipe stub -->
    <line x1="0" y1="32" x2="8" y2="32" stroke="currentColor" stroke-width="2"/>
    <!-- Right pipe stub -->
    <line x1="56" y1="32" x2="64" y2="32" stroke="currentColor" stroke-width="2"/>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

// ─────────────────────────────────────────────────────────────────────────────
// SENSORS / INSTRUMENTS
// ─────────────────────────────────────────────────────────────────────────────

const PRESSURE_TRANSMITTER: SymbolDef = {
  id: 'pressure-transmitter',
  name: 'Trycktransmitter (bar)',
  category: 'Instrument',
  tags: ['pressure', 'tryck', 'transmitter', 'PT', 'bar', 'sensor', 'pid'],
  svg: `
    <!-- Instrument circle -->
    <circle cx="32" cy="32" r="22" stroke="currentColor" stroke-width="2" fill="none"/>
    <!-- PT label -->
    <text x="32" y="27" text-anchor="middle" font-size="9" fill="currentColor" font-family="monospace" font-weight="bold">PT</text>
    <!-- "bar" unit -->
    <text x="32" y="39" text-anchor="middle" font-size="8" fill="currentColor" font-family="monospace">bar</text>
    <!-- Pipe connection stub below -->
    <line x1="32" y1="54" x2="32" y2="64" stroke="currentColor" stroke-width="2"/>
    <!-- Gauge arc (decorative) -->
    <path d="M 16 38 A 16 16 0 0 1 48 38" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.4"/>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

const LEVEL_SWITCH: SymbolDef = {
  id: 'level-switch',
  name: 'Nivåvakt',
  category: 'Instrument',
  tags: ['level', 'nivå', 'switch', 'vakt', 'LS', 'float', 'pid'],
  svg: `
    <!-- Vertical pipe/vessel wall -->
    <line x1="16" y1="4" x2="16" y2="60" stroke="currentColor" stroke-width="2.5"/>
    <!-- Horizontal arm -->
    <line x1="16" y1="28" x2="36" y2="28" stroke="currentColor" stroke-width="2"/>
    <!-- Float (circle) -->
    <circle cx="44" cy="36" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
    <!-- Float arm to switch point -->
    <line x1="36" y1="28" x2="36" y2="36" stroke="currentColor" stroke-width="1.5"/>
    <!-- Switch contacts -->
    <line x1="48" y1="12" x2="60" y2="12" stroke="currentColor" stroke-width="2"/>
    <line x1="48" y1="22" x2="60" y2="22" stroke="currentColor" stroke-width="2"/>
    <line x1="48" y1="12" x2="50" y2="20" stroke="currentColor" stroke-width="1.5"/>
    <!-- Output stub -->
    <line x1="54" y1="12" x2="54" y2="4" stroke="currentColor" stroke-width="1.5"/>
    <line x1="54" y1="22" x2="54" y2="30" stroke="currentColor" stroke-width="1.5"/>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

// ─────────────────────────────────────────────────────────────────────────────
// MACHINERY
// ─────────────────────────────────────────────────────────────────────────────

const COMBUSTION_ENGINE: SymbolDef = {
  id: 'combustion-engine',
  name: 'Förbränningsmotor',
  category: 'Maskiner',
  tags: ['engine', 'motor', 'diesel', 'förbränning', 'ICE', 'combustion'],
  svg: `
    <!-- Engine block -->
    <rect x="8" y="18" width="36" height="28" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>
    <!-- Cylinder bore -->
    <rect x="14" y="22" width="10" height="16" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <rect x="28" y="22" width="10" height="16" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <!-- Piston -->
    <rect x="16" y="28" width="6" height="6" stroke="currentColor" stroke-width="1" fill="currentColor" opacity="0.3"/>
    <rect x="30" y="24" width="6" height="6" stroke="currentColor" stroke-width="1" fill="currentColor" opacity="0.3"/>
    <!-- Crankshaft output -->
    <line x1="44" y1="32" x2="56" y2="32" stroke="currentColor" stroke-width="2.5"/>
    <circle cx="56" cy="32" r="4" stroke="currentColor" stroke-width="2" fill="none"/>
    <!-- Exhaust stub top -->
    <rect x="12" y="10" width="6" height="8" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <rect x="26" y="10" width="6" height="8" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <!-- ICE label -->
    <text x="26" y="56" text-anchor="middle" font-size="8" fill="currentColor" font-family="monospace">ICE</text>
  `,
  defaultWidth: 72,
  defaultHeight: 64,
};

const LINEAR_ACTUATOR: SymbolDef = {
  id: 'linear-actuator',
  name: 'Linjärenhet',
  category: 'Maskiner',
  tags: ['linear', 'actuator', 'linjär', 'cylinder', 'pneumatic', 'hydraulic'],
  svg: `
    <!-- Cylinder body -->
    <rect x="4" y="20" width="36" height="24" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
    <!-- Piston line inside -->
    <line x1="22" y1="20" x2="22" y2="44" stroke="currentColor" stroke-width="2"/>
    <!-- Rod extending right -->
    <rect x="40" y="28" width="22" height="8" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <!-- Rod cap / attachment point -->
    <circle cx="63" cy="32" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <!-- Port top (air/fluid) -->
    <line x1="12" y1="20" x2="12" y2="12" stroke="currentColor" stroke-width="1.5"/>
    <line x1="30" y1="20" x2="30" y2="12" stroke="currentColor" stroke-width="1.5"/>
    <!-- Arrow showing motion -->
    <polyline points="44,38 50,38 50,42 58,32 50,22 50,26 44,26" fill="currentColor" opacity="0.25" stroke="none"/>
  `,
  defaultWidth: 72,
  defaultHeight: 64,
};

// ─────────────────────────────────────────────────────────────────────────────
// ELECTRICAL / CONTROL
// ─────────────────────────────────────────────────────────────────────────────

const RELAY: SymbolDef = {
  id: 'relay',
  name: 'Relä',
  category: 'Elektro',
  tags: ['relay', 'relä', 'coil', 'contact', 'spole'],
  svg: `
    <!-- Coil (left side) -->
    <rect x="4" y="24" width="24" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
    <text x="16" y="35" text-anchor="middle" font-size="9" fill="currentColor" font-family="monospace">K</text>
    <!-- Coil terminals -->
    <line x1="4" y1="32" x2="0" y2="32" stroke="currentColor" stroke-width="1.5"/>
    <line x1="28" y1="32" x2="32" y2="32" stroke="currentColor" stroke-width="1.5"/>
    <!-- Dashed coupling line -->
    <line x1="32" y1="32" x2="38" y2="32" stroke="currentColor" stroke-width="1" stroke-dasharray="3,2"/>
    <!-- NO contact (top) -->
    <line x1="40" y1="16" x2="64" y2="16" stroke="currentColor" stroke-width="1.5"/>
    <line x1="40" y1="16" x2="40" y2="24" stroke="currentColor" stroke-width="1.5"/>
    <line x1="64" y1="16" x2="64" y2="24" stroke="currentColor" stroke-width="1.5"/>
    <!-- Switch blade (open = NO) -->
    <line x1="40" y1="24" x2="60" y2="20" stroke="currentColor" stroke-width="2"/>
    <!-- NC contact (bottom) -->
    <line x1="40" y1="48" x2="64" y2="48" stroke="currentColor" stroke-width="1.5"/>
    <line x1="40" y1="40" x2="40" y2="48" stroke="currentColor" stroke-width="1.5"/>
    <line x1="64" y1="40" x2="64" y2="48" stroke="currentColor" stroke-width="1.5"/>
    <!-- NC blade (closed) -->
    <line x1="40" y1="40" x2="64" y2="40" stroke="currentColor" stroke-width="2"/>
    <!-- Labels -->
    <text x="52" y="14" text-anchor="middle" font-size="7" fill="currentColor" font-family="monospace">NO</text>
    <text x="52" y="60" text-anchor="middle" font-size="7" fill="currentColor" font-family="monospace">NC</text>
  `,
  defaultWidth: 72,
  defaultHeight: 64,
};

// ─────────────────────────────────────────────────────────────────────────────
// ANTENNAS / COMMS
// ─────────────────────────────────────────────────────────────────────────────

const GPS_ANTENNA: SymbolDef = {
  id: 'gps-antenna',
  name: 'GPS-antenn',
  category: 'Kommunikation',
  tags: ['gps', 'antenna', 'antenn', 'navigation', 'gnss'],
  svg: `
    <!-- Antenna element (vertical rod) -->
    <line x1="32" y1="8" x2="32" y2="40" stroke="currentColor" stroke-width="2.5"/>
    <!-- Horizontal crossbar -->
    <line x1="20" y1="20" x2="44" y2="20" stroke="currentColor" stroke-width="2"/>
    <!-- Short radials -->
    <line x1="14" y1="14" x2="20" y2="20" stroke="currentColor" stroke-width="1.5"/>
    <line x1="50" y1="14" x2="44" y2="20" stroke="currentColor" stroke-width="1.5"/>
    <!-- Mount / base -->
    <line x1="32" y1="40" x2="32" y2="52" stroke="currentColor" stroke-width="2"/>
    <line x1="24" y1="52" x2="40" y2="52" stroke="currentColor" stroke-width="2"/>
    <!-- GPS signal arcs -->
    <path d="M 20 8 A 14 14 0 0 1 44 8" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.6"/>
    <path d="M 12 4 A 22 22 0 0 1 52 4" stroke="currentColor" stroke-width="1" fill="none" opacity="0.4"/>
    <!-- GPS label -->
    <text x="32" y="62" text-anchor="middle" font-size="8" fill="currentColor" font-family="monospace">GPS</text>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

const SATELLITE_ANTENNA: SymbolDef = {
  id: 'satellite-antenna',
  name: 'Satellitantenn',
  category: 'Kommunikation',
  tags: ['satellite', 'dish', 'antenn', 'parabola', 'vsat', 'iridium'],
  svg: `
    <!-- Parabolic dish (arc) -->
    <path d="M 8 52 Q 32 4 56 52" stroke="currentColor" stroke-width="2.5" fill="none"/>
    <!-- Dish edge line -->
    <line x1="8" y1="52" x2="56" y2="52" stroke="currentColor" stroke-width="2"/>
    <!-- Feed arm -->
    <line x1="32" y1="28" x2="32" y2="14" stroke="currentColor" stroke-width="1.5"/>
    <!-- Feed horn -->
    <circle cx="32" cy="12" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <!-- Support strut -->
    <line x1="32" y1="52" x2="32" y2="60" stroke="currentColor" stroke-width="2"/>
    <!-- Signal dot (satellite in sky) -->
    <circle cx="52" cy="8" r="3" fill="currentColor" opacity="0.6"/>
    <!-- Signal lines to satellite -->
    <line x1="32" y1="12" x2="50" y2="9" stroke="currentColor" stroke-width="1" stroke-dasharray="3,2" opacity="0.6"/>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

const ANTENNA_4G: SymbolDef = {
  id: 'antenna-4g',
  name: '4G-antenn',
  category: 'Kommunikation',
  tags: ['4g', 'lte', 'cellular', 'antenna', 'antenn', 'mobile'],
  svg: `
    <!-- Vertical antenna rod -->
    <line x1="32" y1="6" x2="32" y2="48" stroke="currentColor" stroke-width="2.5"/>
    <!-- Top cap -->
    <circle cx="32" cy="6" r="3" fill="currentColor"/>
    <!-- Signal waves (right side) -->
    <path d="M 38 20 A 8 8 0 0 1 38 36" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <path d="M 44 14 A 16 16 0 0 1 44 42" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.7"/>
    <path d="M 50 10 A 22 22 0 0 1 50 46" stroke="currentColor" stroke-width="1" fill="none" opacity="0.4"/>
    <!-- Mount -->
    <line x1="32" y1="48" x2="32" y2="56" stroke="currentColor" stroke-width="2"/>
    <rect x="24" y="56" width="16" height="4" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <!-- 4G label -->
    <text x="14" y="34" text-anchor="middle" font-size="9" fill="currentColor" font-family="monospace" font-weight="bold">4G</text>
  `,
  defaultWidth: 64,
  defaultHeight: 64,
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const INDUSTRIAL_SYMBOLS: SymbolDef[] = [
  // Ventiler
  VALVE_2WAY,
  VALVE_2WAY_NORMALLY_CLOSED,
  VALVE_3WAY,
  // Instrument
  PRESSURE_TRANSMITTER,
  LEVEL_SWITCH,
  // Maskiner
  COMBUSTION_ENGINE,
  LINEAR_ACTUATOR,
  // Elektro
  RELAY,
  // Kommunikation
  GPS_ANTENNA,
  SATELLITE_ANTENNA,
  ANTENNA_4G,
];

export const INDUSTRIAL_CATEGORIES = [
  'Ventiler',
  'Instrument',
  'Maskiner',
  'Elektro',
  'Kommunikation',
] as const;

export type IndustrialCategory = typeof INDUSTRIAL_CATEGORIES[number];

export function getIndustrialByCategory(cat: IndustrialCategory): SymbolDef[] {
  return INDUSTRIAL_SYMBOLS.filter(s => s.category === cat);
}

export function searchIndustrialSymbols(query: string): SymbolDef[] {
  const q = query.toLowerCase();
  return INDUSTRIAL_SYMBOLS.filter(
    s =>
      s.name.toLowerCase().includes(q) ||
      s.id.includes(q) ||
      s.tags.some(t => t.includes(q))
  );
}
