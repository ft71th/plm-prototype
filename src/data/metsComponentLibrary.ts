// ============================================================================
// METS Standard Component Library — Data Definitions
// Based on SPEC-MIAS-COMP-001 (METS_Components.library)
// ============================================================================

export interface METSSignal {
  name: string;
  type: 'DI' | 'DO' | 'AI' | 'AO';
  struct: string;
  desc: string;
  required?: boolean;
}

export interface METSConfigParam {
  name: string;
  type: string;
  default: string;
  desc: string;
}

export interface METSState {
  name: string;
  entry: string;
  actions: string;
  exit: string;
}

export interface METSInterfaceProp {
  name: string;
  type: string;
  desc: string;
}

export interface METSInterfaceMethod {
  name: string;
  returns: string;
  params?: string[];
  desc: string;
}

export interface METSVariant {
  name: string;
  description: string;
  additionalSignals: METSSignal[];
  additionalConfig: METSConfigParam[];
  additionalFeatures: string[];
}

export interface METSFamily {
  swc: string;
  name: string;
  suffix: string;
  icon: string;
  description: string;
  baseClass: string;
  interface: {
    name: string;
    extends: string;
    properties: METSInterfaceProp[];
    methods: METSInterfaceMethod[];
  };
  baseSignals: METSSignal[];
  states: METSState[];
  stateFlow: string;
  baseFeatures: string[];
  config: METSConfigParam[];
  usedBy: string[];
  variants: Record<string, METSVariant>;
}

export interface METSComponentInstance {
  family: string;
  variant: string;
  className: string;
  instanceName: string;
  posNo: string;
  system: string;
  signals: METSSignal[];
  config: METSConfigParam[];
  features: string[];
  states: METSState[];
  stateFlow: string;
}

// ─── Signal type rendering info ─────────────────────────────────────────────
export const SIGNAL_TYPES: Record<string, { label: string; color: string }> = {
  DI: { label: 'Digital Input',  color: '#10b981' },
  DO: { label: 'Digital Output', color: '#f59e0b' },
  AI: { label: 'Analog Input',  color: '#3b82f6' },
  AO: { label: 'Analog Output', color: '#8b5cf6' },
};

// ─── Family color palette ───────────────────────────────────────────────────
export const FAMILY_COLORS: Record<string, { primary: string; dim: string; bg: string }> = {
  VALVC: { primary: '#ef4444', dim: '#7f1d1d', bg: '#451a1a' },
  PUMPC: { primary: '#3b82f6', dim: '#1e3a5f', bg: '#172554' },
  TANKM: { primary: '#10b981', dim: '#064e3b', bg: '#052e16' },
  BRKC:  { primary: '#f59e0b', dim: '#78350f', bg: '#451a03' },
  FANC:  { primary: '#8b5cf6', dim: '#4c1d95', bg: '#2e1065' },
  DMPC:  { primary: '#06b6d4', dim: '#164e63', bg: '#083344' },
  MOTRC: { primary: '#ec4899', dim: '#831843', bg: '#500724' },
  HEATC: { primary: '#f97316', dim: '#7c2d12', bg: '#431407' },
};

// ============================================================================
// COMPONENT FAMILIES
// ============================================================================
export const COMPONENT_FAMILIES: Record<string, METSFamily> = {

  VALVC: {
    swc: 'VALVC', name: 'Valve', suffix: 'C', icon: '🔴',
    description: 'Valve control — state machine, interlock, travel monitoring',
    baseClass: 'FB_VALVC_Base',
    interface: {
      name: 'I_Valve', extends: 'I_Component',
      properties: [
        { name: 'x_isOpen', type: 'BOOL', desc: 'Fully open' },
        { name: 'x_isClosed', type: 'BOOL', desc: 'Fully closed' },
        { name: 'x_isMoving', type: 'BOOL', desc: 'In motion' },
        { name: 'r_pct_position', type: 'REAL', desc: 'Position 0–100%' },
      ],
      methods: [
        { name: 'Open', returns: 'BOOL', desc: 'Command open' },
        { name: 'Close', returns: 'BOOL', desc: 'Command close' },
        { name: 'Stop', returns: 'BOOL', desc: 'Stop movement' },
        { name: 'SetPosition', returns: 'BOOL', params: ['r_pct : REAL'], desc: 'Set position' },
      ],
    },
    baseSignals: [
      { name: 'st_sigFbkOpen', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'End position: OPEN' },
      { name: 'st_sigFbkClosed', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'End position: CLOSED' },
      { name: 'st_sigCmdOpen', type: 'DO', struct: 'ST_SIGO_Digital', desc: 'Command: OPEN' },
      { name: 'st_sigCmdClose', type: 'DO', struct: 'ST_SIGO_Digital', desc: 'Command: CLOSE' },
      { name: 'st_sigFault', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'External fault' },
    ],
    states: [
      { name: 'CLOSED', entry: 'Feedback closed', actions: 'Cmds OFF', exit: 'Open cmd' },
      { name: 'OPENING', entry: 'Open cmd accepted', actions: 'Cmd open=TRUE', exit: 'Fbk open → OPEN' },
      { name: 'OPEN', entry: 'Feedback open', actions: 'Hold', exit: 'Close cmd' },
      { name: 'CLOSING', entry: 'Close cmd accepted', actions: 'Cmd close=TRUE', exit: 'Fbk closed → CLOSED' },
      { name: 'FAULT', entry: 'Timeout / ext fault', actions: 'All OFF', exit: 'Reset' },
    ],
    stateFlow: 'CLOSED → OPENING → OPEN → CLOSING → CLOSED',
    baseFeatures: ['Travel time monitoring', 'Interlock with reason text', 'Cycle counter', 'Run time tracking'],
    config: [
      { name: 't_ms_travelTimeout', type: 'TIME', default: 'T#30s', desc: 'Max travel time' },
      { name: 'x_interlockOpen', type: 'BOOL', default: 'FALSE', desc: 'Interlock open' },
      { name: 'x_interlockClose', type: 'BOOL', default: 'FALSE', desc: 'Interlock close' },
    ],
    usedBy: ['Ballast', 'Fuel', 'Fire', 'HVAC', 'Bilge'],
    variants: {
      '2Way': { name: 'FB_VALVC_2Way', description: 'Simple on/off valve', additionalSignals: [], additionalConfig: [], additionalFeatures: [] },
      '3Way': { name: 'FB_VALVC_3Way', description: 'Three-way with port selection',
        additionalSignals: [
          { name: 'st_sigFbkPortA', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'Port A feedback' },
          { name: 'st_sigFbkPortB', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'Port B feedback' },
          { name: 'st_sigCmdPortA', type: 'DO', struct: 'ST_SIGO_Digital', desc: 'Port A command' },
          { name: 'st_sigCmdPortB', type: 'DO', struct: 'ST_SIGO_Digital', desc: 'Port B command' },
        ], additionalConfig: [], additionalFeatures: ['Port selection (A/B)'] },
      'Prop': { name: 'FB_VALVC_Prop', description: 'Proportional position control',
        additionalSignals: [
          { name: 'st_sigPosition', type: 'AI', struct: 'ST_SIGO_Analog', desc: 'Position 0–100%' },
          { name: 'st_sigSetpoint', type: 'AO', struct: 'ST_SIGO_Analog', desc: 'Setpoint 0–100%' },
        ],
        additionalConfig: [
          { name: 'r_pct_deadband', type: 'REAL', default: '2.0', desc: 'Deadband [%]' },
          { name: 'r_pct_rampRate', type: 'REAL', default: '10.0', desc: 'Ramp rate [%/s]' },
        ], additionalFeatures: ['Analog position control', 'Ramp generator'] },
      'Butterfly': { name: 'FB_VALVC_Butterfly', description: 'Discrete cmd + analog position',
        additionalSignals: [
          { name: 'st_sigPosition', type: 'AI', struct: 'ST_SIGO_Analog', desc: 'Position 0–100%' },
        ], additionalConfig: [], additionalFeatures: ['Analog position sensing'] },
    },
  },

  PUMPC: {
    swc: 'PUMPC', name: 'Pump', suffix: 'C', icon: '🔵',
    description: 'Pump control — start protection, run time, dry run detection',
    baseClass: 'FB_PUMPC_Base',
    interface: {
      name: 'I_Pump', extends: 'I_Component',
      properties: [
        { name: 'x_isRunning', type: 'BOOL', desc: 'Running' },
        { name: 'x_isReady', type: 'BOOL', desc: 'Ready to start' },
        { name: 'r_pct_speed', type: 'REAL', desc: 'Speed [%]' },
        { name: 'r_A_current', type: 'REAL', desc: 'Current [A]' },
      ],
      methods: [
        { name: 'Start', returns: 'BOOL', desc: 'Start pump' },
        { name: 'Stop', returns: 'BOOL', desc: 'Stop pump' },
        { name: 'SetSpeed', returns: 'BOOL', params: ['r_pct : REAL'], desc: 'Set speed' },
      ],
    },
    baseSignals: [
      { name: 'st_sigCmdStart', type: 'DO', struct: 'ST_SIGO_Digital', desc: 'Start command' },
      { name: 'st_sigFbkRunning', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'Running feedback' },
      { name: 'st_sigFault', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'Fault signal' },
    ],
    states: [
      { name: 'OFF', entry: 'Init / stop', actions: 'Cmd OFF', exit: 'Start cmd' },
      { name: 'STARTING', entry: 'Start accepted', actions: 'Cmd ON', exit: 'Fbk running' },
      { name: 'RUNNING', entry: 'Fbk running', actions: 'Hold', exit: 'Stop cmd / fault' },
      { name: 'STOPPING', entry: 'Stop accepted', actions: 'Cmd OFF', exit: 'Fbk stopped' },
      { name: 'FAULT', entry: 'Timeout / ext fault', actions: 'All OFF', exit: 'Reset' },
    ],
    stateFlow: 'OFF → STARTING → RUNNING → STOPPING → OFF',
    baseFeatures: ['Start timeout', 'Min run time', 'Min stop time', 'Max starts/hour', 'Dry run protection'],
    config: [
      { name: 't_ms_startTimeout', type: 'TIME', default: 'T#10s', desc: 'Max start time' },
      { name: 't_ms_minRunTime', type: 'TIME', default: 'T#30s', desc: 'Min run time' },
      { name: 'i_maxStartsPerHour', type: 'INT', default: '6', desc: 'Max starts/hour' },
    ],
    usedBy: ['Ballast', 'Fuel', 'Fire', 'Bilge', 'Cooling'],
    variants: {
      'Fixed': { name: 'FB_PUMPC_Fixed', description: 'Fixed speed, contactor control', additionalSignals: [], additionalConfig: [], additionalFeatures: [] },
      'VFD': { name: 'FB_PUMPC_VFD', description: 'Variable frequency drive',
        additionalSignals: [
          { name: 'st_sigSpeedRef', type: 'AO', struct: 'ST_SIGO_Analog', desc: 'Speed ref 0–100%' },
          { name: 'st_sigSpeedFbk', type: 'AI', struct: 'ST_SIGO_Analog', desc: 'Speed fbk 0–100%' },
          { name: 'st_sigCurrentFbk', type: 'AI', struct: 'ST_SIGO_Analog', desc: 'Current [A]' },
          { name: 'st_sigVFDReady', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'VFD ready' },
          { name: 'st_sigVFDFault', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'VFD fault' },
        ],
        additionalConfig: [
          { name: 'r_pct_rampRate', type: 'REAL', default: '10.0', desc: 'Speed ramp [%/s]' },
          { name: 'r_A_overloadLimit', type: 'REAL', default: '0.0', desc: 'Overload alarm [A]' },
        ], additionalFeatures: ['Speed ramp', 'Current monitoring', 'VFD comm'] },
    },
  },

  TANKM: {
    swc: 'TANKM', name: 'Tank', suffix: 'M', icon: '🟢',
    description: 'Tank measurement — level, volume, flow rate, geometry',
    baseClass: 'FB_TANKM_Base',
    interface: {
      name: 'I_Tank', extends: 'I_Component',
      properties: [
        { name: 'r_pct_level', type: 'REAL', desc: 'Level [%]' },
        { name: 'r_m3_volume', type: 'REAL', desc: 'Volume [m³]' },
        { name: 'r_m3_ullage', type: 'REAL', desc: 'Ullage [m³]' },
        { name: 'r_m3_flowRate', type: 'REAL', desc: 'Flow [m³/h]' },
      ],
      methods: [],
    },
    baseSignals: [
      { name: 'st_sigLevel', type: 'AI', struct: 'ST_SIGO_Analog', desc: 'Level (primary)' },
      { name: 'st_sigTemperature', type: 'AI', struct: 'ST_SIGO_Analog', desc: 'Temperature' },
      { name: 'st_sigLevelHigh', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'High level switch' },
      { name: 'st_sigLevelLow', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'Low level switch' },
    ],
    states: [
      { name: 'NORMAL', entry: 'Level within limits', actions: 'Monitor', exit: 'Level crosses limit' },
      { name: 'HIGH', entry: 'Level > high', actions: 'High alarm', exit: 'Level drops' },
      { name: 'LOW', entry: 'Level < low', actions: 'Low alarm', exit: 'Level rises' },
      { name: 'OVERFLOW', entry: 'Level > overflow', actions: 'Critical alarm', exit: 'Level drops' },
      { name: 'FAULT', entry: 'Sensor fault', actions: 'Quality fail', exit: 'Reset' },
    ],
    stateFlow: 'NORMAL ↔ HIGH / LOW / OVERFLOW',
    baseFeatures: ['Volume calculation', 'Ullage', 'Flow rate', 'Multi-sensor'],
    config: [
      { name: 'r_m3_totalVolume', type: 'REAL', default: '0.0', desc: 'Total volume [m³]' },
      { name: 'r_m_height', type: 'REAL', default: '0.0', desc: 'Height [m]' },
    ],
    usedBy: ['Ballast', 'Fuel', 'FreshWater'],
    variants: {
      'Ballast': { name: 'FB_TANKM_Ballast', description: 'Density & heeling moment', additionalSignals: [],
        additionalConfig: [
          { name: 'r_kgm3_density', type: 'REAL', default: '1025', desc: 'Water density' },
          { name: 'r_m_momentArm', type: 'REAL', default: '0.0', desc: 'Moment arm [m]' },
        ], additionalFeatures: ['Mass calc', 'Heeling moment', 'LCG'] },
      'Fuel': { name: 'FB_TANKM_Fuel', description: 'Temp-compensated density', additionalSignals: [],
        additionalConfig: [{ name: 'r_kgm3_refDensity', type: 'REAL', default: '850', desc: 'Ref density @15°C' }],
        additionalFeatures: ['Temp-compensated density', 'Water-in-fuel'] },
      'FreshWater': { name: 'FB_TANKM_FreshWater', description: 'Consumption tracking', additionalSignals: [], additionalConfig: [], additionalFeatures: ['Days-remaining'] },
    },
  },

  BRKC: {
    swc: 'BRKC', name: 'Breaker', suffix: 'C', icon: '🟡',
    description: 'Circuit breaker — PMS connect/disconnect, trip',
    baseClass: 'FB_BRKC_Base',
    interface: {
      name: 'I_Breaker', extends: 'I_Component',
      properties: [
        { name: 'x_isClosed', type: 'BOOL', desc: 'Closed' },
        { name: 'x_isOpen', type: 'BOOL', desc: 'Open' },
        { name: 'x_isTripped', type: 'BOOL', desc: 'Tripped' },
        { name: 'r_A_current', type: 'REAL', desc: 'Current [A]' },
      ],
      methods: [
        { name: 'Close', returns: 'BOOL', desc: 'Close breaker' },
        { name: 'Open', returns: 'BOOL', desc: 'Open breaker' },
        { name: 'Trip', returns: 'BOOL', desc: 'Emergency open' },
      ],
    },
    baseSignals: [
      { name: 'st_sigCmdClose', type: 'DO', struct: 'ST_SIGO_Digital', desc: 'Close cmd' },
      { name: 'st_sigCmdOpen', type: 'DO', struct: 'ST_SIGO_Digital', desc: 'Open cmd' },
      { name: 'st_sigFbkClosed', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'Closed fbk' },
      { name: 'st_sigFbkOpen', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'Open fbk' },
      { name: 'st_sigTripped', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'Trip fbk' },
    ],
    states: [
      { name: 'OPEN', entry: 'Fbk open', actions: 'Cmds OFF', exit: 'Close cmd' },
      { name: 'CLOSING', entry: 'Close cmd', actions: 'Cmd close', exit: 'Fbk closed' },
      { name: 'CLOSED', entry: 'Fbk closed', actions: 'Hold', exit: 'Open cmd / trip' },
      { name: 'OPENING', entry: 'Open cmd', actions: 'Cmd open', exit: 'Fbk open' },
      { name: 'TRIPPED', entry: 'Trip signal', actions: 'All OFF', exit: 'Reset + spring' },
      { name: 'FAULT', entry: 'Timeout', actions: 'All OFF', exit: 'Reset' },
    ],
    stateFlow: 'OPEN → CLOSING → CLOSED → OPENING → OPEN',
    baseFeatures: ['Travel monitoring', 'Trip bypass', 'Spring charge', 'Op counter'],
    config: [{ name: 't_ms_travelTimeout', type: 'TIME', default: 'T#5s', desc: 'Max travel time' }],
    usedBy: ['PMS', 'Electrical'],
    variants: {
      'ACB': { name: 'FB_BRKC_ACB', description: 'Air circuit breaker',
        additionalSignals: [{ name: 'st_sigSpringCharged', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'Spring charged' }],
        additionalConfig: [], additionalFeatures: ['Spring charge', 'Anti-pumping'] },
      'MCB': { name: 'FB_BRKC_MCB', description: 'Moulded case breaker', additionalSignals: [], additionalConfig: [], additionalFeatures: ['Thermal trip'] },
      'Contactor': { name: 'FB_BRKC_Contactor', description: 'Fast operation, coil monitoring',
        additionalSignals: [{ name: 'st_sigCoilStatus', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'Coil status' }],
        additionalConfig: [], additionalFeatures: ['Coil monitoring'] },
    },
  },

  FANC: {
    swc: 'FANC', name: 'Fan', suffix: 'C', icon: '🟣',
    description: 'Fan control — HVAC and engine room ventilation',
    baseClass: 'FB_FANC_Base',
    interface: {
      name: 'I_Fan', extends: 'I_Component',
      properties: [
        { name: 'x_isRunning', type: 'BOOL', desc: 'Running' },
        { name: 'r_pct_speed', type: 'REAL', desc: 'Speed [%]' },
      ],
      methods: [
        { name: 'Start', returns: 'BOOL', desc: 'Start fan' },
        { name: 'Stop', returns: 'BOOL', desc: 'Stop fan' },
      ],
    },
    baseSignals: [
      { name: 'st_sigCmdStart', type: 'DO', struct: 'ST_SIGO_Digital', desc: 'Start cmd' },
      { name: 'st_sigFbkRunning', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'Running fbk' },
    ],
    states: [
      { name: 'OFF', entry: 'Init', actions: 'Cmd OFF', exit: 'Start cmd' },
      { name: 'STARTING', entry: 'Start cmd', actions: 'Cmd ON', exit: 'Fbk running' },
      { name: 'RUNNING', entry: 'Fbk running', actions: 'Hold', exit: 'Stop cmd' },
      { name: 'STOPPING', entry: 'Stop cmd', actions: 'Cmd OFF', exit: 'Fbk stopped' },
      { name: 'FAULT', entry: 'Timeout', actions: 'All OFF', exit: 'Reset' },
    ],
    stateFlow: 'OFF → STARTING → RUNNING → STOPPING → OFF',
    baseFeatures: ['Start timeout', 'Run time tracking'],
    config: [{ name: 't_ms_startTimeout', type: 'TIME', default: 'T#10s', desc: 'Max start time' }],
    usedBy: ['HVAC', 'Engine Room'],
    variants: {
      'Fixed': { name: 'FB_FANC_Fixed', description: 'Fixed speed', additionalSignals: [], additionalConfig: [], additionalFeatures: [] },
      'VFD': { name: 'FB_FANC_VFD', description: 'Variable speed',
        additionalSignals: [
          { name: 'st_sigSpeedRef', type: 'AO', struct: 'ST_SIGO_Analog', desc: 'Speed ref' },
          { name: 'st_sigSpeedFbk', type: 'AI', struct: 'ST_SIGO_Analog', desc: 'Speed fbk' },
        ], additionalConfig: [], additionalFeatures: ['Speed control'] },
    },
  },

  HEATC: {
    swc: 'HEATC', name: 'Heater', suffix: 'C', icon: '🟠',
    description: 'Heater control — on/off and PID variants',
    baseClass: 'FB_HEATC_Base',
    interface: {
      name: 'I_Heater', extends: 'I_Component',
      properties: [
        { name: 'x_isHeating', type: 'BOOL', desc: 'Active' },
        { name: 'r_DegC_actual', type: 'REAL', desc: 'Actual [°C]' },
        { name: 'r_DegC_setpoint', type: 'REAL', desc: 'Setpoint [°C]' },
      ],
      methods: [
        { name: 'Start', returns: 'BOOL', desc: 'Start heating' },
        { name: 'Stop', returns: 'BOOL', desc: 'Stop heating' },
      ],
    },
    baseSignals: [
      { name: 'st_sigCmdOn', type: 'DO', struct: 'ST_SIGO_Digital', desc: 'On cmd' },
      { name: 'st_sigFbkOn', type: 'DI', struct: 'ST_SIGO_Digital', desc: 'On fbk' },
      { name: 'st_sigTempFbk', type: 'AI', struct: 'ST_SIGO_Analog', desc: 'Temp [°C]' },
    ],
    states: [
      { name: 'OFF', entry: 'Init', actions: 'Cmd OFF', exit: 'Start cmd' },
      { name: 'HEATING', entry: 'Start cmd', actions: 'Cmd ON', exit: 'At temp / stop' },
      { name: 'AT_TEMP', entry: 'Setpoint reached', actions: 'Regulate', exit: 'Temp drops / stop' },
      { name: 'FAULT', entry: 'Overtemp / fault', actions: 'All OFF', exit: 'Reset' },
    ],
    stateFlow: 'OFF → HEATING → AT_TEMP ↔ HEATING',
    baseFeatures: ['Overtemp protection', 'Run time tracking'],
    config: [{ name: 'r_DegC_maxTemp', type: 'REAL', default: '100.0', desc: 'Max temp alarm' }],
    usedBy: ['Fuel', 'HVAC'],
    variants: {
      'OnOff': { name: 'FB_HEATC_OnOff', description: 'With hysteresis', additionalSignals: [],
        additionalConfig: [{ name: 'r_DegC_hysteresis', type: 'REAL', default: '2.0', desc: 'Hysteresis' }],
        additionalFeatures: ['Hysteresis control'] },
      'PID': { name: 'FB_HEATC_PID', description: 'PID temperature control',
        additionalSignals: [{ name: 'st_sigHeatOutput', type: 'AO', struct: 'ST_SIGO_Analog', desc: 'Output 0–100%' }],
        additionalConfig: [
          { name: 'r_Kp', type: 'REAL', default: '1.0', desc: 'P gain' },
          { name: 'r_Ti', type: 'REAL', default: '10.0', desc: 'I time [s]' },
        ], additionalFeatures: ['PID regulation', 'Anti-windup'] },
    },
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getSignalsForVariant(familyKey: string, variantKey: string): METSSignal[] {
  const f = COMPONENT_FAMILIES[familyKey];
  if (!f) return [];
  const v = f.variants[variantKey];
  if (!v) return [...f.baseSignals];
  return [...f.baseSignals, ...v.additionalSignals];
}

export function getConfigForVariant(familyKey: string, variantKey: string): METSConfigParam[] {
  const f = COMPONENT_FAMILIES[familyKey];
  if (!f) return [];
  const v = f.variants[variantKey];
  if (!v) return [...f.config];
  return [...f.config, ...v.additionalConfig];
}

export function getFeaturesForVariant(familyKey: string, variantKey: string): string[] {
  const f = COMPONENT_FAMILIES[familyKey];
  if (!f) return [];
  const v = f.variants[variantKey];
  if (!v) return [...f.baseFeatures];
  return [...f.baseFeatures, ...v.additionalFeatures];
}

export function countSignals(familyKey: string, variantKey: string) {
  const sigs = getSignalsForVariant(familyKey, variantKey);
  return {
    total: sigs.length,
    DI: sigs.filter(s => s.type === 'DI').length,
    DO: sigs.filter(s => s.type === 'DO').length,
    AI: sigs.filter(s => s.type === 'AI').length,
    AO: sigs.filter(s => s.type === 'AO').length,
  };
}

export function searchLibrary(query: string) {
  const q = query.toLowerCase();
  const results: Array<{ familyKey: string; variantKey: string }> = [];
  Object.entries(COMPONENT_FAMILIES).forEach(([fk, f]) => {
    const fMatch = f.swc.toLowerCase().includes(q) || f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q);
    Object.entries(f.variants).forEach(([vk, v]) => {
      if (fMatch || v.name.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)) {
        results.push({ familyKey: fk, variantKey: vk });
      }
    });
  });
  return results;
}

/** Generate CODESYS VAR declaration */
export function generateDeclaration(familyKey: string, variantKey: string, instanceName: string): string {
  const v = COMPONENT_FAMILIES[familyKey]?.variants[variantKey];
  if (!v) return '';
  return `${instanceName.padEnd(24)}: ${v.name};`;
}

/** Count total variants */
export function getTotalVariantCount(): number {
  return Object.values(COMPONENT_FAMILIES).reduce((acc, f) => acc + Object.keys(f.variants).length, 0);
}
