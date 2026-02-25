// src/components/HALManager/wagoModules.ts
// Standard WAGO 750-series I/O module templates

import type { HWModuleTemplate } from './halTypes';

export const WAGO_MODULES: HWModuleTemplate[] = [
  // ─── Digital Inputs ──────────────────────────────────────
  {
    model: '750-400',
    manufacturer: 'WAGO',
    name: '2-ch DI 24VDC',
    channels: [{ count: 2, signalType: 'DI', electricalType: '24VDC' }],
    color: '#3b82f6',
  },
  {
    model: '750-402',
    manufacturer: 'WAGO',
    name: '4-ch DI 24VDC',
    channels: [{ count: 4, signalType: 'DI', electricalType: '24VDC' }],
    color: '#3b82f6',
  },
  {
    model: '750-405',
    manufacturer: 'WAGO',
    name: '2-ch DI 24VDC (Diagnostic)',
    channels: [{ count: 2, signalType: 'DI', electricalType: '24VDC', resolution: 'diagnostic' }],
    color: '#3b82f6',
  },
  {
    model: '750-410',
    manufacturer: 'WAGO',
    name: '2-ch DI 230VAC',
    channels: [{ count: 2, signalType: 'DI', electricalType: '230VAC' }],
    color: '#6366f1',
  },

  // ─── Digital Outputs ─────────────────────────────────────
  {
    model: '750-501',
    manufacturer: 'WAGO',
    name: '2-ch DO 24VDC',
    channels: [{ count: 2, signalType: 'DO', electricalType: '24VDC / 0.5A' }],
    color: '#22c55e',
  },
  {
    model: '750-504',
    manufacturer: 'WAGO',
    name: '4-ch DO 24VDC',
    channels: [{ count: 4, signalType: 'DO', electricalType: '24VDC / 0.5A' }],
    color: '#22c55e',
  },
  {
    model: '750-512',
    manufacturer: 'WAGO',
    name: '2-ch Relay Output',
    channels: [{ count: 2, signalType: 'DO', electricalType: 'Relay 230V/6A' }],
    color: '#16a34a',
  },
  {
    model: '750-517',
    manufacturer: 'WAGO',
    name: '2-ch Relay CO',
    channels: [{ count: 2, signalType: 'DO', electricalType: 'Relay CO 230V/8A' }],
    color: '#16a34a',
  },

  // ─── Analog Inputs ───────────────────────────────────────
  {
    model: '750-455',
    manufacturer: 'WAGO',
    name: '4-ch AI 4-20mA',
    channels: [{ count: 4, signalType: 'AI', electricalType: '4-20mA', resolution: '16-bit' }],
    color: '#f59e0b',
  },
  {
    model: '750-456',
    manufacturer: 'WAGO',
    name: '2-ch AI 4-20mA (HART)',
    channels: [{ count: 2, signalType: 'AI', electricalType: '4-20mA HART', resolution: '16-bit' }],
    color: '#f59e0b',
  },
  {
    model: '750-459',
    manufacturer: 'WAGO',
    name: '4-ch AI 0-10V',
    channels: [{ count: 4, signalType: 'AI', electricalType: '0-10V', resolution: '16-bit' }],
    color: '#eab308',
  },
  {
    model: '750-461',
    manufacturer: 'WAGO',
    name: '2-ch AI ±10V',
    channels: [{ count: 2, signalType: 'AI', electricalType: '±10V', resolution: '16-bit' }],
    color: '#eab308',
  },
  {
    model: '750-469',
    manufacturer: 'WAGO',
    name: '2-ch AI Thermocouple',
    channels: [{ count: 2, signalType: 'AI', electricalType: 'TC K/J/T', resolution: '16-bit' }],
    color: '#d97706',
  },
  {
    model: '750-470',
    manufacturer: 'WAGO',
    name: '2-ch AI RTD Pt100',
    channels: [{ count: 2, signalType: 'AI', electricalType: 'Pt100 RTD', resolution: '16-bit' }],
    color: '#d97706',
  },

  // ─── Analog Outputs ──────────────────────────────────────
  {
    model: '750-550',
    manufacturer: 'WAGO',
    name: '2-ch AO 4-20mA',
    channels: [{ count: 2, signalType: 'AO', electricalType: '4-20mA', resolution: '16-bit' }],
    color: '#ef4444',
  },
  {
    model: '750-554',
    manufacturer: 'WAGO',
    name: '2-ch AO 0-10V',
    channels: [{ count: 2, signalType: 'AO', electricalType: '0-10V', resolution: '16-bit' }],
    color: '#ef4444',
  },

  // ─── Special ─────────────────────────────────────────────
  {
    model: '750-652',
    manufacturer: 'WAGO',
    name: 'RS-232/485 Serial',
    channels: [{ count: 1, signalType: 'DI', electricalType: 'RS-485/232' }],
    color: '#8b5cf6',
  },
  {
    model: '750-600',
    manufacturer: 'WAGO',
    name: 'End Module',
    channels: [],
    endModule: true,
    color: '#94a3b8',
  },
  {
    model: '750-352',
    manufacturer: 'WAGO',
    name: 'Ethernet Fieldbus Coupler',
    channels: [],
    busCoupler: true,
    color: '#0ea5e9',
  },
];

// Group by signal type for quick lookup
export function getModulesByType(type?: string): HWModuleTemplate[] {
  if (!type) return WAGO_MODULES.filter(m => !m.endModule && !m.busCoupler);
  return WAGO_MODULES.filter(m => m.channels.some(ch => ch.signalType === type));
}

// Default scaling presets for common conversions
export const SCALING_PRESETS: Record<string, { rawMin: number; rawMax: number; engMin: number; engMax: number; unit: string }> = {
  'pressure_bar':      { rawMin: 4, rawMax: 20, engMin: 0, engMax: 10,   unit: 'bar' },
  'pressure_kpa':      { rawMin: 4, rawMax: 20, engMin: 0, engMax: 1000, unit: 'kPa' },
  'temperature_c':     { rawMin: 4, rawMax: 20, engMin: 0, engMax: 200,  unit: '°C' },
  'temperature_rtd':   { rawMin: 0, rawMax: 32767, engMin: -50, engMax: 400, unit: '°C' },
  'level_percent':     { rawMin: 4, rawMax: 20, engMin: 0, engMax: 100,  unit: '%' },
  'level_m':           { rawMin: 4, rawMax: 20, engMin: 0, engMax: 10,   unit: 'm' },
  'flow_m3h':          { rawMin: 4, rawMax: 20, engMin: 0, engMax: 500,  unit: 'm³/h' },
  'speed_rpm':         { rawMin: 4, rawMax: 20, engMin: 0, engMax: 1800, unit: 'RPM' },
  'voltage_0_10':      { rawMin: 0, rawMax: 10, engMin: 0, engMax: 100,  unit: '%' },
  'current_a':         { rawMin: 4, rawMax: 20, engMin: 0, engMax: 500,  unit: 'A' },
  'valve_pos':         { rawMin: 4, rawMax: 20, engMin: 0, engMax: 100,  unit: '%' },
};
