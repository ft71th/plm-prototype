// src/components/HALManager/halTypes.ts

export type SignalType = 'DI' | 'DO' | 'AI' | 'AO';
export type MappingStatus = 'mapped' | 'grounded' | 'unmapped';

// ─── Hardware Side ───────────────────────────────────────

export interface HWModuleTemplate {
  model: string;
  manufacturer: string;
  name: string;
  channels: {
    count: number;
    signalType: SignalType;
    electricalType: string;   // '4-20mA', '0-10V', '24VDC', 'Relay', etc.
    resolution?: string;      // '16-bit', '12-bit'
  }[];
  busCoupler?: boolean;
  endModule?: boolean;
  color: string;
}

export interface HWChannel {
  id: string;
  moduleId: string;
  channelNumber: number;
  signalType: SignalType;
  electricalType: string;
  terminal: string;           // e.g. 'X100:3.1'
  tag: string;                // field device tag, e.g. 'PT-101'
  description: string;
}

export interface HWModule {
  id: string;
  templateModel: string;
  manufacturer: string;
  name: string;
  rackPosition: number;
  rackId: string;             // e.g. 'Rack-1', 'Field-Cabinet-2'
  channels: HWChannel[];
  color: string;
}

// ─── Application Side ────────────────────────────────────

export interface AppSignal {
  id: string;
  nodeId: string;             // PLM node reference
  componentName: string;      // e.g. 'fb_PumpC_01'
  componentFamily: string;    // e.g. 'PUMPC'
  signalName: string;         // e.g. 'st_sigRunFbk'
  signalType: SignalType;
  dataType: string;           // e.g. 'ST_SIGO_Digital'
  description: string;
  required: boolean;
}

// ─── Scaling / Conditioning ──────────────────────────────

export interface SignalScaling {
  rawMin: number;
  rawMax: number;
  engMin: number;
  engMax: number;
  unit: string;               // e.g. 'bar', '°C', 'RPM'
  clampEnabled: boolean;
  filterMs: number;           // low-pass filter in ms, 0 = none
}

// ─── Mapping ─────────────────────────────────────────────

export interface HALMapping {
  id: string;
  hwChannelId: string;
  appSignalId: string;
  scaling?: SignalScaling;
  grounded: boolean;
  groundValue: string;        // e.g. '0', 'FALSE', '0.0'
  notes: string;
  status: MappingStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── HAL Configuration (top-level) ──────────────────────

export interface HALConfig {
  id: string;
  projectId: string;
  name: string;
  version: string;
  description: string;
  modules: HWModule[];
  mappings: HALMapping[];
  createdAt: string;
  updatedAt: string;
}

// ─── Validation ──────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: 'type_mismatch' | 'unmapped_required' | 'unmapped_hw' | 'duplicate' | 'scaling' | 'grounded';
  message: string;
  hwChannelId?: string;
  appSignalId?: string;
  mappingId?: string;
}
