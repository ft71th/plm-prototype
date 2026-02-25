// src/components/HALManager/halTypes.ts

export type SignalType = 'DI' | 'DO' | 'AI' | 'AO';
export type MappingStatus = 'mapped' | 'grounded' | 'unmapped';
export type MappingSource = 'hw' | 'com';

// ─── Hardware Side ───────────────────────────────────────

export interface HWModuleTemplate {
  model: string;
  manufacturer: string;
  name: string;
  channels: {
    count: number;
    signalType: SignalType;
    electricalType: string;
    resolution?: string;
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
  terminal: string;
  tag: string;
  description: string;
}

export interface HWModule {
  id: string;
  templateModel: string;
  manufacturer: string;
  name: string;
  rackPosition: number;
  rackId: string;
  channels: HWChannel[];
  color: string;
}

// ─── COM / Fieldbus Side ─────────────────────────────────

export type ProtocolType = 'modbus_tcp' | 'modbus_rtu' | 'profinet' | 'canopen' | 'ethercat' | 'opc_ua';
export type ModbusRegisterType = 'coil' | 'discrete_input' | 'holding_register' | 'input_register';

export interface COMDeviceTemplate {
  model: string;
  manufacturer: string;
  name: string;
  protocol: ProtocolType;
  defaultRegisters: COMRegisterDef[];
  color: string;
  icon: string;
}

export interface COMRegisterDef {
  name: string;
  signalType: SignalType;
  dataType: string;
  registerType?: ModbusRegisterType;
  address?: number;
  slot?: number;
  subslot?: number;
  description: string;
  byteOrder?: 'big_endian' | 'little_endian';
  bitOffset?: number;
  scaleFactor?: number;
}

export interface COMRegister {
  id: string;
  deviceId: string;
  name: string;
  signalType: SignalType;
  dataType: string;
  registerType?: ModbusRegisterType;
  address: number;
  slot?: number;
  subslot?: number;
  description: string;
  byteOrder: 'big_endian' | 'little_endian';
  bitOffset?: number;
  scaleFactor?: number;
  tag: string;
}

export interface COMDevice {
  id: string;
  templateModel: string;
  manufacturer: string;
  name: string;
  instanceName: string;
  protocol: ProtocolType;
  ipAddress: string;
  port: number;
  unitId: number;
  pollRateMs: number;
  registers: COMRegister[];
  color: string;
}

// ─── Application Side ────────────────────────────────────

export interface AppSignal {
  id: string;
  nodeId: string;
  componentName: string;
  componentFamily: string;
  signalName: string;
  signalType: SignalType;
  dataType: string;
  description: string;
  required: boolean;
}

// ─── Scaling / Conditioning ──────────────────────────────

export interface SignalScaling {
  rawMin: number;
  rawMax: number;
  engMin: number;
  engMax: number;
  unit: string;
  clampEnabled: boolean;
  filterMs: number;
}

// ─── Mapping ─────────────────────────────────────────────

export interface HALMapping {
  id: string;
  source: MappingSource;
  hwChannelId: string;
  comRegisterId: string;
  appSignalId: string;
  scaling?: SignalScaling;
  grounded: boolean;
  groundValue: string;
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
  comDevices: COMDevice[];
  mappings: HALMapping[];
  createdAt: string;
  updatedAt: string;
}

// ─── Validation ──────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: 'type_mismatch' | 'unmapped_required' | 'unmapped_hw' | 'unmapped_com' | 'duplicate' | 'scaling' | 'grounded' | 'com_config';
  message: string;
  hwChannelId?: string;
  comRegisterId?: string;
  appSignalId?: string;
  mappingId?: string;
}
