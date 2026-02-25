// src/components/HALManager/comDevices.ts
// Standard COM/fieldbus device templates for marine automation

import type { COMDeviceTemplate } from './halTypes';

export const COM_DEVICES: COMDeviceTemplate[] = [

  // ─── Generator / Engine Controllers ──────────────────────

  {
    model: 'DEIF-AGC-4',
    manufacturer: 'DEIF',
    name: 'AGC-4 Genset Controller',
    protocol: 'modbus_tcp',
    icon: '⚡',
    color: '#ef4444',
    defaultRegisters: [
      { name: 'GenFrequency',     signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 1000, description: 'Generator frequency [Hz]', scaleFactor: 0.01 },
      { name: 'GenVoltageL1L2',   signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 1002, description: 'Voltage L1-L2 [V]' },
      { name: 'GenCurrentL1',     signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 1010, description: 'Current L1 [A]' },
      { name: 'GenActivePower',   signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 1020, description: 'Active power [kW]' },
      { name: 'GenReactivePower', signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 1022, description: 'Reactive power [kVAr]' },
      { name: 'EngineRPM',        signalType: 'AI', dataType: 'UINT16',  registerType: 'input_register', address: 1030, description: 'Engine speed [RPM]' },
      { name: 'EngineTemp',       signalType: 'AI', dataType: 'INT16',   registerType: 'input_register', address: 1032, description: 'Engine coolant temp [°C]', scaleFactor: 0.1 },
      { name: 'OilPressure',      signalType: 'AI', dataType: 'UINT16',  registerType: 'input_register', address: 1034, description: 'Oil pressure [kPa]' },
      { name: 'FuelLevel',        signalType: 'AI', dataType: 'UINT16',  registerType: 'input_register', address: 1036, description: 'Fuel level [%]' },
      { name: 'GenRunning',       signalType: 'DI', dataType: 'BOOL',    registerType: 'coil',           address: 100,  description: 'Generator running' },
      { name: 'GenReady',         signalType: 'DI', dataType: 'BOOL',    registerType: 'coil',           address: 101,  description: 'Generator ready' },
      { name: 'GenAlarm',         signalType: 'DI', dataType: 'BOOL',    registerType: 'coil',           address: 110,  description: 'Common alarm' },
      { name: 'GenTrip',          signalType: 'DI', dataType: 'BOOL',    registerType: 'coil',           address: 111,  description: 'Generator trip' },
      { name: 'CmdStart',         signalType: 'DO', dataType: 'BOOL',    registerType: 'coil',           address: 200,  description: 'Start command' },
      { name: 'CmdStop',          signalType: 'DO', dataType: 'BOOL',    registerType: 'coil',           address: 201,  description: 'Stop command' },
      { name: 'CmdBreakerClose',  signalType: 'DO', dataType: 'BOOL',    registerType: 'coil',           address: 210,  description: 'Breaker close cmd' },
      { name: 'SetpointPower',    signalType: 'AO', dataType: 'UINT16',  registerType: 'holding_register', address: 300, description: 'Power setpoint [%]' },
    ],
  },

  {
    model: 'ComAp-InteliGen',
    manufacturer: 'ComAp',
    name: 'InteliGen Genset Controller',
    protocol: 'modbus_tcp',
    icon: '⚡',
    color: '#f59e0b',
    defaultRegisters: [
      { name: 'GenFrequency',   signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 1100, description: 'Generator frequency [Hz]' },
      { name: 'GenVoltage',     signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 1102, description: 'Generator voltage [V]' },
      { name: 'GenPower',       signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 1108, description: 'Active power [kW]' },
      { name: 'EngineSpeed',    signalType: 'AI', dataType: 'UINT16',  registerType: 'input_register', address: 1120, description: 'Engine RPM' },
      { name: 'CoolantTemp',    signalType: 'AI', dataType: 'INT16',   registerType: 'input_register', address: 1122, description: 'Coolant temp [°C]' },
      { name: 'Running',        signalType: 'DI', dataType: 'BOOL',    registerType: 'discrete_input',  address: 200,  description: 'Engine running' },
      { name: 'Alarm',          signalType: 'DI', dataType: 'BOOL',    registerType: 'discrete_input',  address: 210,  description: 'Common alarm' },
      { name: 'CmdStart',       signalType: 'DO', dataType: 'BOOL',    registerType: 'coil',            address: 300,  description: 'Start command' },
      { name: 'CmdStop',        signalType: 'DO', dataType: 'BOOL',    registerType: 'coil',            address: 301,  description: 'Stop command' },
    ],
  },

  // ─── VFD / Drives ────────────────────────────────────────

  {
    model: 'ABB-ACS880',
    manufacturer: 'ABB',
    name: 'ACS880 Variable Freq. Drive',
    protocol: 'profinet',
    icon: '🔄',
    color: '#3b82f6',
    defaultRegisters: [
      { name: 'ActualSpeed',    signalType: 'AI', dataType: 'INT16',  slot: 1, subslot: 1, address: 0, description: 'Actual speed [RPM]', scaleFactor: 0.1 },
      { name: 'ActualTorque',   signalType: 'AI', dataType: 'INT16',  slot: 1, subslot: 1, address: 2, description: 'Actual torque [%]', scaleFactor: 0.1 },
      { name: 'MotorCurrent',   signalType: 'AI', dataType: 'UINT16', slot: 1, subslot: 1, address: 4, description: 'Motor current [A]', scaleFactor: 0.01 },
      { name: 'DCVoltage',      signalType: 'AI', dataType: 'UINT16', slot: 1, subslot: 1, address: 6, description: 'DC bus voltage [V]' },
      { name: 'DriveReady',     signalType: 'DI', dataType: 'BOOL',   slot: 1, subslot: 1, address: 10, bitOffset: 0, description: 'Drive ready' },
      { name: 'DriveRunning',   signalType: 'DI', dataType: 'BOOL',   slot: 1, subslot: 1, address: 10, bitOffset: 1, description: 'Drive running' },
      { name: 'DriveFault',     signalType: 'DI', dataType: 'BOOL',   slot: 1, subslot: 1, address: 10, bitOffset: 2, description: 'Drive fault' },
      { name: 'DriveWarning',   signalType: 'DI', dataType: 'BOOL',   slot: 1, subslot: 1, address: 10, bitOffset: 3, description: 'Drive warning' },
      { name: 'CmdRun',         signalType: 'DO', dataType: 'BOOL',   slot: 1, subslot: 2, address: 0, bitOffset: 0, description: 'Run command' },
      { name: 'CmdReverse',     signalType: 'DO', dataType: 'BOOL',   slot: 1, subslot: 2, address: 0, bitOffset: 1, description: 'Reverse command' },
      { name: 'CmdReset',       signalType: 'DO', dataType: 'BOOL',   slot: 1, subslot: 2, address: 0, bitOffset: 2, description: 'Fault reset' },
      { name: 'SpeedRef',       signalType: 'AO', dataType: 'INT16',  slot: 1, subslot: 2, address: 2, description: 'Speed reference [RPM]', scaleFactor: 0.1 },
    ],
  },

  // ─── Power Meters ────────────────────────────────────────

  {
    model: 'Janitza-UMG96',
    manufacturer: 'Janitza',
    name: 'UMG 96RM Power Analyzer',
    protocol: 'modbus_tcp',
    icon: '📊',
    color: '#8b5cf6',
    defaultRegisters: [
      { name: 'VoltageL1N',    signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 19000, description: 'Voltage L1-N [V]' },
      { name: 'VoltageL2N',    signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 19002, description: 'Voltage L2-N [V]' },
      { name: 'VoltageL3N',    signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 19004, description: 'Voltage L3-N [V]' },
      { name: 'CurrentL1',     signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 19012, description: 'Current L1 [A]' },
      { name: 'CurrentL2',     signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 19014, description: 'Current L2 [A]' },
      { name: 'CurrentL3',     signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 19016, description: 'Current L3 [A]' },
      { name: 'TotalPower',    signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 19026, description: 'Total active power [kW]' },
      { name: 'PowerFactor',   signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 19032, description: 'Power factor' },
      { name: 'Frequency',     signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 19050, description: 'Frequency [Hz]' },
      { name: 'TotalEnergy',   signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 19060, description: 'Total energy [kWh]' },
    ],
  },

  // ─── Tank Gauging ────────────────────────────────────────

  {
    model: 'Honeywell-Enraf',
    manufacturer: 'Honeywell',
    name: 'Enraf Tank Gauge',
    protocol: 'modbus_rtu',
    icon: '🛢️',
    color: '#10b981',
    defaultRegisters: [
      { name: 'Level',          signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 100, description: 'Level [mm]' },
      { name: 'Temperature',    signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 102, description: 'Product temp [°C]' },
      { name: 'Volume',         signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 104, description: 'Volume [m³]' },
      { name: 'Density',        signalType: 'AI', dataType: 'FLOAT32', registerType: 'input_register', address: 106, description: 'Density [kg/m³]' },
      { name: 'SensorFault',    signalType: 'DI', dataType: 'BOOL',    registerType: 'discrete_input',  address: 10,  description: 'Sensor fault' },
      { name: 'HighAlarm',      signalType: 'DI', dataType: 'BOOL',    registerType: 'discrete_input',  address: 11,  description: 'High level alarm' },
      { name: 'LowAlarm',       signalType: 'DI', dataType: 'BOOL',    registerType: 'discrete_input',  address: 12,  description: 'Low level alarm' },
    ],
  },

  // ─── WAGO Fieldbus Coupler (distributed I/O) ─────────────

  {
    model: 'WAGO-750-352',
    manufacturer: 'WAGO',
    name: '750-352 Ethernet Coupler (Dist. I/O)',
    protocol: 'modbus_tcp',
    icon: '🔌',
    color: '#06b6d4',
    defaultRegisters: [
      // Typical distributed I/O — user fills in per project
      { name: 'DI_Word0',  signalType: 'DI', dataType: 'UINT16', registerType: 'discrete_input',    address: 0,   description: 'DI word 0 (bits 0-15)' },
      { name: 'DI_Word1',  signalType: 'DI', dataType: 'UINT16', registerType: 'discrete_input',    address: 16,  description: 'DI word 1 (bits 16-31)' },
      { name: 'AI_Ch0',    signalType: 'AI', dataType: 'INT16',  registerType: 'input_register',    address: 0,   description: 'AI channel 0' },
      { name: 'AI_Ch1',    signalType: 'AI', dataType: 'INT16',  registerType: 'input_register',    address: 1,   description: 'AI channel 1' },
      { name: 'DO_Word0',  signalType: 'DO', dataType: 'UINT16', registerType: 'coil',              address: 512, description: 'DO word 0 (bits 0-15)' },
      { name: 'AO_Ch0',    signalType: 'AO', dataType: 'INT16',  registerType: 'holding_register',  address: 512, description: 'AO channel 0' },
    ],
  },

  // ─── Fire & Gas ──────────────────────────────────────────

  {
    model: 'Autronica-BS100',
    manufacturer: 'Autronica',
    name: 'BS-100 Fire Detection',
    protocol: 'modbus_tcp',
    icon: '🔥',
    color: '#dc2626',
    defaultRegisters: [
      { name: 'Zone1Fire',     signalType: 'DI', dataType: 'BOOL', registerType: 'discrete_input', address: 100, description: 'Zone 1 fire alarm' },
      { name: 'Zone2Fire',     signalType: 'DI', dataType: 'BOOL', registerType: 'discrete_input', address: 101, description: 'Zone 2 fire alarm' },
      { name: 'Zone3Fire',     signalType: 'DI', dataType: 'BOOL', registerType: 'discrete_input', address: 102, description: 'Zone 3 fire alarm' },
      { name: 'Zone4Fire',     signalType: 'DI', dataType: 'BOOL', registerType: 'discrete_input', address: 103, description: 'Zone 4 fire alarm' },
      { name: 'SystemFault',   signalType: 'DI', dataType: 'BOOL', registerType: 'discrete_input', address: 200, description: 'System fault' },
      { name: 'CommonAlarm',   signalType: 'DI', dataType: 'BOOL', registerType: 'discrete_input', address: 201, description: 'Common fire alarm' },
      { name: 'CmdAck',        signalType: 'DO', dataType: 'BOOL', registerType: 'coil',           address: 300, description: 'Acknowledge command' },
      { name: 'CmdReset',      signalType: 'DO', dataType: 'BOOL', registerType: 'coil',           address: 301, description: 'Reset command' },
    ],
  },

  // ─── Generic Modbus Device ───────────────────────────────

  {
    model: 'Generic-Modbus',
    manufacturer: 'Generic',
    name: 'Custom Modbus TCP Device',
    protocol: 'modbus_tcp',
    icon: '📡',
    color: '#64748b',
    defaultRegisters: [],
  },

  // ─── Generic PROFINET Device ─────────────────────────────

  {
    model: 'Generic-PROFINET',
    manufacturer: 'Generic',
    name: 'Custom PROFINET Device',
    protocol: 'profinet',
    icon: '🌐',
    color: '#64748b',
    defaultRegisters: [],
  },
];

export const PROTOCOL_INFO: Record<string, { label: string; icon: string; color: string; defaultPort: number }> = {
  modbus_tcp:  { label: 'Modbus TCP',   icon: '📡', color: '#f59e0b', defaultPort: 502 },
  modbus_rtu:  { label: 'Modbus RTU',   icon: '📡', color: '#d97706', defaultPort: 502 },
  profinet:    { label: 'PROFINET',      icon: '🌐', color: '#3b82f6', defaultPort: 34962 },
  canopen:     { label: 'CANopen',       icon: '🔗', color: '#22c55e', defaultPort: 0 },
  ethercat:    { label: 'EtherCAT',      icon: '⚡', color: '#8b5cf6', defaultPort: 0 },
  opc_ua:      { label: 'OPC UA',        icon: '🏭', color: '#06b6d4', defaultPort: 4840 },
};

export const REGISTER_TYPE_INFO: Record<string, { label: string; code: string; rw: string }> = {
  coil:              { label: 'Coil',              code: 'FC01/05', rw: 'R/W' },
  discrete_input:    { label: 'Discrete Input',    code: 'FC02',    rw: 'R' },
  holding_register:  { label: 'Holding Register',  code: 'FC03/06', rw: 'R/W' },
  input_register:    { label: 'Input Register',    code: 'FC04',    rw: 'R' },
};
