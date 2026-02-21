// ============================================================================
// METS Naming Standards Engine
// Based on MIAS naming conventions for marine automation systems
// ============================================================================

// ─── System Codes ───────────────────────────────────────────────────────────
// Standard marine system abbreviations used as prefixes in component naming
export interface SystemCode {
  code: string;
  name: string;
  nameEn: string;
  description: string;
  color: string;
  relatedFamilies: string[];   // METS family keys commonly used in this system
}

export const SYSTEM_CODES: Record<string, SystemCode> = {
  BW: {
    code: 'BW', name: 'Ballastvatten', nameEn: 'Ballast Water',
    description: 'Ballast water management and transfer',
    color: '#3b82f6',
    relatedFamilies: ['VALVC', 'PUMPC', 'TANKM'],
  },
  FO: {
    code: 'FO', name: 'Brännolja', nameEn: 'Fuel Oil',
    description: 'Fuel oil storage, transfer and treatment',
    color: '#f59e0b',
    relatedFamilies: ['VALVC', 'PUMPC', 'TANKM', 'HEATC'],
  },
  FW: {
    code: 'FW', name: 'Färskvatten', nameEn: 'Fresh Water',
    description: 'Fresh water generation and distribution',
    color: '#06b6d4',
    relatedFamilies: ['VALVC', 'PUMPC', 'TANKM'],
  },
  FI: {
    code: 'FI', name: 'Brand', nameEn: 'Fire Fighting',
    description: 'Fire detection and suppression systems',
    color: '#ef4444',
    relatedFamilies: ['VALVC', 'PUMPC'],
  },
  HV: {
    code: 'HV', name: 'HVAC', nameEn: 'HVAC',
    description: 'Heating, ventilation and air conditioning',
    color: '#8b5cf6',
    relatedFamilies: ['VALVC', 'FANC', 'HEATC'],
  },
  BI: {
    code: 'BI', name: 'Läns', nameEn: 'Bilge',
    description: 'Bilge water management',
    color: '#64748b',
    relatedFamilies: ['VALVC', 'PUMPC'],
  },
  CO: {
    code: 'CO', name: 'Kylning', nameEn: 'Cooling',
    description: 'Cooling water systems (HT/LT)',
    color: '#0ea5e9',
    relatedFamilies: ['VALVC', 'PUMPC', 'HEATC'],
  },
  ER: {
    code: 'ER', name: 'Maskinrum', nameEn: 'Engine Room',
    description: 'Engine room ventilation and monitoring',
    color: '#78716c',
    relatedFamilies: ['FANC', 'HEATC'],
  },
  EL: {
    code: 'EL', name: 'Elkraft', nameEn: 'Electrical',
    description: 'Electrical power distribution',
    color: '#eab308',
    relatedFamilies: ['BRKC'],
  },
  PM: {
    code: 'PM', name: 'PMS', nameEn: 'Power Management',
    description: 'Power management and generator control',
    color: '#f97316',
    relatedFamilies: ['BRKC'],
  },
  LO: {
    code: 'LO', name: 'Smörjolja', nameEn: 'Lube Oil',
    description: 'Lubrication oil systems',
    color: '#a16207',
    relatedFamilies: ['VALVC', 'PUMPC', 'TANKM', 'HEATC'],
  },
  SW: {
    code: 'SW', name: 'Sjövatten', nameEn: 'Sea Water',
    description: 'Sea water intake and distribution',
    color: '#0284c7',
    relatedFamilies: ['VALVC', 'PUMPC'],
  },
  ST: {
    code: 'ST', name: 'Ånga', nameEn: 'Steam',
    description: 'Steam generation and distribution',
    color: '#d1d5db',
    relatedFamilies: ['VALVC', 'HEATC'],
  },
  SE: {
    code: 'SE', name: 'Avlopp', nameEn: 'Sewage',
    description: 'Sewage treatment and discharge',
    color: '#57534e',
    relatedFamilies: ['VALVC', 'PUMPC', 'TANKM'],
  },
  CA: {
    code: 'CA', name: 'Tryckluft', nameEn: 'Compressed Air',
    description: 'Compressed air generation and distribution',
    color: '#94a3b8',
    relatedFamilies: ['VALVC'],
  },
};

// ─── Equipment Type Abbreviations ───────────────────────────────────────────
// Short codes used in tag names (PosNo format)
export const EQUIPMENT_ABBREV: Record<string, Record<string, string>> = {
  VALVC: {
    '2Way':     'VLV',
    '3Way':     'V3W',
    'Prop':     'VPR',
    'Butterfly': 'VBF',
  },
  PUMPC: {
    'Fixed':  'PMP',
    'VFD':    'PVF',
  },
  TANKM: {
    'Ballast':    'TNK',
    'Fuel':       'TNK',
    'FreshWater': 'TNK',
  },
  BRKC: {
    'ACB':       'BRK',
    'MCB':       'MCB',
    'Contactor': 'CTR',
  },
  FANC: {
    'Fixed': 'FAN',
    'VFD':   'FVF',
  },
  HEATC: {
    'OnOff': 'HTR',
    'PID':   'HTP',
  },
};

// ─── Naming Format Templates ────────────────────────────────────────────────
export interface NamingFormat {
  id: string;
  label: string;
  description: string;
  // Template tokens: {SYS}, {EQ}, {NUM}, {FAM}, {VAR}, {SEQ}
  instanceTemplate: string;   // e.g. "fb_{SYS}_{EQ}{NUM}"
  posNoTemplate: string;      // e.g. "{SYS}-{EQ}-{NUM}"
  labelTemplate: string;      // e.g. "{SYS} {EQ}{NUM}"
  example: string;
}

export const NAMING_FORMATS: NamingFormat[] = [
  {
    id: 'mets-standard',
    label: 'METS Standard',
    description: 'fb_SYS_EQnnn — Standard MIAS namngivning',
    instanceTemplate: 'fb_{SYS}_{EQ}{NUM:3}',
    posNoTemplate: '{SYS}-{EQ}-{NUM:3}',
    labelTemplate: '{SYS}_{EQ}{NUM:3}',
    example: 'fb_BW_VLV001 / BW-VLV-001',
  },
  {
    id: 'compact',
    label: 'Kompakt',
    description: 'fbSYSEQnn — Kortformat utan understreck',
    instanceTemplate: 'fb{SYS}{EQ}{NUM:2}',
    posNoTemplate: '{SYS}{EQ}{NUM:2}',
    labelTemplate: '{SYS}{EQ}{NUM:2}',
    example: 'fbBWVLV01 / BWVLV01',
  },
  {
    id: 'descriptive',
    label: 'Beskrivande',
    description: 'fb_SYS_FamilyVariant_nnn — Med familj+variant',
    instanceTemplate: 'fb_{SYS}_{FAM}_{VAR}_{NUM:3}',
    posNoTemplate: '{SYS}-{FAM}-{VAR}-{NUM:3}',
    labelTemplate: '{SYS}_{FAM}_{VAR}{NUM:3}',
    example: 'fb_BW_Valve_2Way_001 / BW-Valve-2Way-001',
  },
];

// ─── Position Counter State ─────────────────────────────────────────────────
// Tracks next available number per system+equipment combination
export interface PositionCounters {
  [systemEquipKey: string]: number;  // e.g. "BW_VLV" -> 3 (next is 003)
}

// ─── Naming Engine ──────────────────────────────────────────────────────────
export class NamingEngine {
  private counters: PositionCounters;
  private format: NamingFormat;

  constructor(format?: NamingFormat, existingCounters?: PositionCounters) {
    this.format = format || NAMING_FORMATS[0];
    this.counters = existingCounters || {};
  }

  /** Set naming format */
  setFormat(format: NamingFormat) {
    this.format = format;
  }

  getFormat(): NamingFormat {
    return this.format;
  }

  /** Get current counters (for persistence) */
  getCounters(): PositionCounters {
    return { ...this.counters };
  }

  /** Load counters (from persistence) */
  loadCounters(counters: PositionCounters) {
    this.counters = { ...counters };
  }

  /** Get equipment abbreviation */
  getEquipAbbrev(familyKey: string, variantKey: string): string {
    return EQUIPMENT_ABBREV[familyKey]?.[variantKey] || familyKey.slice(0, 3).toUpperCase();
  }

  /** Get the counter key for a system+equipment combo */
  private counterKey(systemCode: string, equipAbbrev: string): string {
    return `${systemCode}_${equipAbbrev}`;
  }

  /** Get next position number (1-based) and increment counter */
  nextNumber(systemCode: string, familyKey: string, variantKey: string): number {
    const eq = this.getEquipAbbrev(familyKey, variantKey);
    const key = this.counterKey(systemCode, eq);
    const num = (this.counters[key] || 0) + 1;
    this.counters[key] = num;
    return num;
  }

  /** Peek at next number without incrementing */
  peekNumber(systemCode: string, familyKey: string, variantKey: string): number {
    const eq = this.getEquipAbbrev(familyKey, variantKey);
    const key = this.counterKey(systemCode, eq);
    return (this.counters[key] || 0) + 1;
  }

  /** Format a number with zero-padding based on template */
  private formatNum(num: number, template: string): string {
    const match = template.match(/\{NUM:(\d+)\}/);
    const width = match ? parseInt(match[1]) : 3;
    return String(num).padStart(width, '0');
  }

  /** Apply template with values */
  private applyTemplate(template: string, vars: Record<string, string>): string {
    let result = template;
    // Handle {NUM:N} patterns
    const numMatch = result.match(/\{NUM:(\d+)\}/);
    if (numMatch) {
      const width = parseInt(numMatch[1]);
      result = result.replace(/\{NUM:\d+\}/, vars.NUM?.padStart(width, '0') || '000');
    }
    result = result.replace(/\{NUM\}/, vars.NUM || '000');
    // Replace other tokens
    Object.entries(vars).forEach(([key, val]) => {
      if (key !== 'NUM') {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
      }
    });
    return result;
  }

  /** Generate all names for a component */
  generate(
    systemCode: string,
    familyKey: string,
    variantKey: string,
    familyName: string,
  ): { instanceName: string; posNo: string; label: string; number: number } {
    const eq = this.getEquipAbbrev(familyKey, variantKey);
    const num = this.nextNumber(systemCode, familyKey, variantKey);

    const vars: Record<string, string> = {
      SYS: systemCode,
      EQ: eq,
      NUM: String(num),
      FAM: familyName,
      VAR: variantKey,
      SEQ: String(num),
    };

    return {
      instanceName: this.applyTemplate(this.format.instanceTemplate, vars),
      posNo: this.applyTemplate(this.format.posNoTemplate, vars),
      label: this.applyTemplate(this.format.labelTemplate, vars),
      number: num,
    };
  }

  /** Preview names without incrementing counter */
  preview(
    systemCode: string,
    familyKey: string,
    variantKey: string,
    familyName: string,
  ): { instanceName: string; posNo: string; label: string; number: number } {
    const eq = this.getEquipAbbrev(familyKey, variantKey);
    const num = this.peekNumber(systemCode, familyKey, variantKey);

    const vars: Record<string, string> = {
      SYS: systemCode,
      EQ: eq,
      NUM: String(num),
      FAM: familyName,
      VAR: variantKey,
      SEQ: String(num),
    };

    return {
      instanceName: this.applyTemplate(this.format.instanceTemplate, vars),
      posNo: this.applyTemplate(this.format.posNoTemplate, vars),
      label: this.applyTemplate(this.format.labelTemplate, vars),
      number: num,
    };
  }

  /** Scan existing nodes and rebuild counters */
  rebuildFromNodes(nodes: Array<{ data: any }>) {
    this.counters = {};
    nodes.forEach(node => {
      const sys = node.data?.metsSystem;
      const fam = node.data?.metsFamily;
      const vari = node.data?.metsVariant;
      if (!sys || !fam || !vari) return;

      const eq = this.getEquipAbbrev(fam, vari);
      const key = this.counterKey(sys, eq);

      // Try to extract number from posNo or instanceName
      const posNo = node.data?.metsPosNo || '';
      const numMatch = posNo.match(/(\d+)$/);
      const num = numMatch ? parseInt(numMatch[1]) : 0;

      if (num > (this.counters[key] || 0)) {
        this.counters[key] = num;
      }
    });
  }

  /** Get suggested system code based on component family */
  suggestSystems(familyKey: string): SystemCode[] {
    return Object.values(SYSTEM_CODES).filter(
      sc => sc.relatedFamilies.includes(familyKey)
    );
  }
}

// ─── Singleton with localStorage persistence ────────────────────────────────
let _engineInstance: NamingEngine | null = null;

export function getNamingEngine(projectId?: string | null): NamingEngine {
  if (!_engineInstance) {
    _engineInstance = new NamingEngine();
    // Load persisted state
    try {
      const key = `northlight_naming_${projectId || 'default'}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.counters) _engineInstance.loadCounters(data.counters);
        if (data.formatId) {
          const fmt = NAMING_FORMATS.find(f => f.id === data.formatId);
          if (fmt) _engineInstance.setFormat(fmt);
        }
      }
    } catch {}
  }
  return _engineInstance;
}

export function persistNamingEngine(projectId?: string | null) {
  if (!_engineInstance) return;
  try {
    const key = `northlight_naming_${projectId || 'default'}`;
    localStorage.setItem(key, JSON.stringify({
      counters: _engineInstance.getCounters(),
      formatId: _engineInstance.getFormat().id,
    }));
  } catch {}
}

/** Reset singleton (e.g. on project switch) */
export function resetNamingEngine() {
  _engineInstance = null;
}
