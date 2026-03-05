import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { SWSignal } from '../../types';
import { useSWCRegistry } from '../../hooks/useSWCRegistry';

// ─── Constants ──────────────────────────────────────────────────────────────
const COLORS = {
  prg:  { primary: '#f59e0b', dim: '#92400e' },
  fb:   { primary: '#06b6d4', dim: '#164e63' },
  swc:  { primary: '#8b5cf6' },
};

const DATATYPES = ['BOOL', 'INT', 'DINT', 'REAL', 'LREAL', 'STRING', 'TIME', 'DATE_AND_TIME', 'BYTE', 'WORD', 'ARRAY', 'STRUCT', 'ENUM'];

const DTYPE_PREFIX: Record<string, string> = {
  BOOL: 'x_', INT: 'i_', DINT: 'di_', REAL: 'r_', LREAL: 'lr_',
  STRING: 's_', TIME: 't_', DATE_AND_TIME: 'dt_',
  BYTE: 'by_', WORD: 'w_', ARRAY: 'a_', STRUCT: 'st_', ENUM: 'e_',
};

const DTYPE_COLORS: Record<string, string> = {
  BOOL: '#22c55e', INT: '#a855f7', DINT: '#a855f7', REAL: '#3b82f6', LREAL: '#3b82f6',
  STRING: '#f97316', TIME: '#ec4899', DATE_AND_TIME: '#ec4899',
  BYTE: '#14b8a6', WORD: '#14b8a6', ARRAY: '#94a3b8', STRUCT: '#8b5cf6', ENUM: '#3b82f6',
};

const UNITS = [
  { prefix: '', label: '(none)' },
  { prefix: 'Nm_', label: 'Nm (Newton meter)' },
  { prefix: 'A_', label: 'A (Ampere)' },
  { prefix: 'V_', label: 'V (Volt)' },
  { prefix: 'Hz_', label: 'Hz (Hertz)' },
  { prefix: 'DegC_', label: '°C (Celsius)' },
  { prefix: 'rpm_', label: 'rpm (RPM)' },
  { prefix: 'm_', label: 'm (Meter)' },
  { prefix: 'ms_', label: 'ms (Milliseconds)' },
  { prefix: 'pct_', label: '% (Percent)' },
  { prefix: 'kW_', label: 'kW (Kilowatt)' },
  { prefix: 'bar_', label: 'bar (Bar)' },
  { prefix: 'md_', label: 'md (Mode)' },
];

const LANGUAGES = ['ST', 'FBD', 'SFC', 'LD', 'CFC'];
const TASK_TYPES = ['cyclic', 'event', 'freewheeling'];
const SW_STATUSES = ['draft', 'review', 'approved'];
const STATUS_COLORS: Record<string, string> = { draft: '#fbbf24', review: '#60a5fa', approved: '#34d399' };

const PACKML_STATES: {
  id: number; label: string; type: string; mandatory: boolean;
  group: string; groupLabel: string; description: string;
}[] = [
  { id: 0,  label: 'OFF',          type: 'wait',   mandatory: true,  group: 'core',     groupLabel: 'Core Cycle',    description: 'Equipment powered off' },
  { id: 1,  label: 'INITIALIZING', type: 'acting',  mandatory: false, group: 'init',     groupLabel: 'Initialization', description: 'Boot sequence, self-test' },
  { id: 2,  label: 'STOPPED',      type: 'wait',   mandatory: true,  group: 'core',     groupLabel: 'Core Cycle',    description: 'Equipment stopped, ready to reset' },
  { id: 3,  label: 'RESETTING',    type: 'acting',  mandatory: true,  group: 'core',     groupLabel: 'Core Cycle',    description: 'Pre-run checks, clearing faults' },
  { id: 4,  label: 'IDLE',         type: 'wait',   mandatory: true,  group: 'core',     groupLabel: 'Core Cycle',    description: 'Ready, awaiting start command' },
  { id: 5,  label: 'STARTING',     type: 'acting',  mandatory: true,  group: 'core',     groupLabel: 'Core Cycle',    description: 'Ramp-up sequence' },
  { id: 6,  label: 'EXECUTE',      type: 'acting',  mandatory: true,  group: 'core',     groupLabel: 'Core Cycle',    description: 'Normal operation' },
  { id: 7,  label: 'HOLDING',      type: 'acting',  mandatory: false, group: 'hold',     groupLabel: 'Hold Loop',     description: 'Transitioning to hold (e.g., load shed)' },
  { id: 8,  label: 'HELD',         type: 'wait',   mandatory: false, group: 'hold',     groupLabel: 'Hold Loop',     description: 'Paused, maintaining safe state' },
  { id: 9,  label: 'UNHOLDING',    type: 'acting',  mandatory: false, group: 'hold',     groupLabel: 'Hold Loop',     description: 'Resuming from hold' },
  { id: 10, label: 'COMPLETING',   type: 'acting',  mandatory: false, group: 'complete', groupLabel: 'Completion',    description: 'Finishing current cycle' },
  { id: 11, label: 'COMPLETE',     type: 'wait',   mandatory: false, group: 'complete', groupLabel: 'Completion',    description: 'Cycle finished, awaiting reset' },
  { id: 12, label: 'STOPPING',     type: 'acting',  mandatory: true,  group: 'core',     groupLabel: 'Core Cycle',    description: 'Graceful shutdown sequence' },
  { id: 13, label: 'ABORTING',     type: 'fault',  mandatory: false, group: 'abort',    groupLabel: 'Fault Handling', description: 'Emergency stop, safe shutdown' },
  { id: 14, label: 'ABORTED',      type: 'fault',  mandatory: false, group: 'abort',    groupLabel: 'Fault Handling', description: 'Aborted, requires clear + reset' },
];

// Groups are all-or-nothing: toggling one state in a group toggles all
const STATE_GROUPS: Record<string, { ids: number[]; label: string; description: string }> = {
  init:     { ids: [1],       label: 'Initialization',  description: 'Boot/self-test before STOPPED' },
  hold:     { ids: [7, 8, 9], label: 'Hold Loop',       description: 'Pause & resume from EXECUTE' },
  complete: { ids: [10, 11],  label: 'Completion',      description: 'Cycle-complete before RESETTING' },
  abort:    { ids: [13, 14],  label: 'Fault Handling',   description: 'Emergency stop from any state' },
};

const MANDATORY_STATE_IDS = PACKML_STATES.filter(s => s.mandatory).map(s => s.id); // [0,2,3,4,5,6,12]
const ALL_STATE_IDS = PACKML_STATES.map(s => s.id);

// Presets
const STATE_PRESETS: { id: string; label: string; icon: string; description: string; states: number[] }[] = [
  { id: 'full',     label: 'Full PackML',    icon: '🔷', description: 'All 15 states — generators, complex systems', states: ALL_STATE_IDS },
  { id: 'standard', label: 'Standard',       icon: '🔶', description: 'Core + abort — most equipment',             states: [...MANDATORY_STATE_IDS, 13, 14] },
  { id: 'withHold', label: 'With Hold',      icon: '⏸',  description: 'Standard + hold loop — load-dependent',     states: [...MANDATORY_STATE_IDS, 7, 8, 9, 13, 14] },
  { id: 'simple',   label: 'Simple Cycle',   icon: '🔄', description: 'Core + complete — pumps, batch processes',  states: [...MANDATORY_STATE_IDS, 10, 11] },
  { id: 'minimal',  label: 'Minimal',        icon: '▫',  description: 'Mandatory only — simple on/off equipment',  states: [...MANDATORY_STATE_IDS] },
];

// Transitions — only show between active states
const PACKML_TRANSITIONS: { from: number; to: number; cmd: string; fromAny?: boolean }[] = [
  { from: 0, to: 1, cmd: 'PowerOn' },      // OFF → INITIALIZING
  { from: 0, to: 2, cmd: 'PowerOn' },      // OFF → STOPPED (skip init)
  { from: 1, to: 2, cmd: 'InitDone' },     // INITIALIZING → STOPPED
  { from: 2, to: 3, cmd: 'Reset' },        // STOPPED → RESETTING
  { from: 3, to: 4, cmd: 'ResetDone' },    // RESETTING → IDLE
  { from: 4, to: 5, cmd: 'Start' },        // IDLE → STARTING
  { from: 5, to: 6, cmd: 'StartDone' },    // STARTING → EXECUTE
  { from: 6, to: 7, cmd: 'Hold' },         // EXECUTE → HOLDING
  { from: 7, to: 8, cmd: 'HoldDone' },     // HOLDING → HELD
  { from: 8, to: 9, cmd: 'Unhold' },       // HELD → UNHOLDING
  { from: 9, to: 6, cmd: 'UnholdDone' },   // UNHOLDING → EXECUTE
  { from: 6, to: 10, cmd: 'Complete' },    // EXECUTE → COMPLETING
  { from: 10, to: 11, cmd: 'CompleteDone' }, // COMPLETING → COMPLETE
  { from: 11, to: 3, cmd: 'Reset' },       // COMPLETE → RESETTING
  { from: 6, to: 12, cmd: 'Stop' },        // EXECUTE → STOPPING
  { from: 4, to: 12, cmd: 'Stop' },        // IDLE → STOPPING
  { from: 12, to: 2, cmd: 'StopDone' },    // STOPPING → STOPPED
  { from: -1, to: 13, cmd: 'Abort', fromAny: true },  // Any → ABORTING
  { from: 13, to: 14, cmd: 'AbortDone' },  // ABORTING → ABORTED
  { from: 14, to: 2, cmd: 'Clear' },       // ABORTED → STOPPED
];

// Signals generated based on active states
function getStateSignals(activeIds: number[]): { name: string; type: string; datatype: string; condition: string }[] {
  const sigs: { name: string; type: string; datatype: string; condition: string }[] = [
    // Always present when state machine is on
    { name: 'e_state',      type: 'OUT', datatype: 'E_STATE', condition: 'always' },
    { name: 'e_mode',       type: 'OUT', datatype: 'E_MODE',  condition: 'always' },
    { name: 'i_stateId',    type: 'OUT', datatype: 'INT',     condition: 'always' },
    { name: 't_stateTime',  type: 'OUT', datatype: 'TIME',    condition: 'always' },
    { name: 'x_ready',      type: 'OUT', datatype: 'BOOL',    condition: 'always' },
    { name: 'x_running',    type: 'OUT', datatype: 'BOOL',    condition: 'always' },
    { name: 'x_cmdStart',   type: 'IN',  datatype: 'BOOL',    condition: 'always' },
    { name: 'x_cmdStop',    type: 'IN',  datatype: 'BOOL',    condition: 'always' },
    { name: 'x_cmdReset',   type: 'IN',  datatype: 'BOOL',    condition: 'always' },
    { name: 'e_md_modeReq', type: 'IN',  datatype: 'E_MODE',  condition: 'always' },
  ];
  // Hold loop signals
  if (activeIds.includes(7)) {
    sigs.push({ name: 'x_held',       type: 'OUT', datatype: 'BOOL', condition: 'hold' });
    sigs.push({ name: 'x_cmdHold',    type: 'IN',  datatype: 'BOOL', condition: 'hold' });
    sigs.push({ name: 'x_cmdUnhold',  type: 'IN',  datatype: 'BOOL', condition: 'hold' });
  }
  // Abort signals
  if (activeIds.includes(13)) {
    sigs.push({ name: 'x_faulted',    type: 'OUT', datatype: 'BOOL', condition: 'abort' });
    sigs.push({ name: 'x_cmdAbort',   type: 'IN',  datatype: 'BOOL', condition: 'abort' });
  }
  // Complete signals
  if (activeIds.includes(10)) {
    sigs.push({ name: 'x_complete',   type: 'OUT', datatype: 'BOOL', condition: 'complete' });
  }
  // Init signals
  if (activeIds.includes(1)) {
    sigs.push({ name: 'x_initialized', type: 'OUT', datatype: 'BOOL', condition: 'init' });
  }
  return sigs;
}

const STATE_TYPE_COLORS: Record<string, string> = {
  wait: '#22c55e', acting: '#3b82f6', fault: '#ef4444',
};

// ─── Styling helpers ────────────────────────────────────────────────────────
const labelStyle = (color = 'var(--nl-text-secondary, #bdc3c7)'): React.CSSProperties => ({
  display: 'block', marginBottom: 5, fontSize: 10,
  color, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5,
});

const inputStyle = (editable = true): React.CSSProperties => ({
  width: '100%', padding: '7px 9px',
  background: editable ? 'var(--nl-bg-input, #34495e)' : 'var(--nl-bg-panel, #2c3e50)',
  color: 'var(--nl-text-primary, white)',
  border: '1px solid var(--nl-border, #4a5f7f)', borderRadius: 4, fontSize: 13,
  cursor: editable ? 'text' : 'not-allowed',
  fontFamily: 'inherit', boxSizing: 'border-box' as const,
});

const selectStyle = (editable = true): React.CSSProperties => ({
  ...inputStyle(editable), cursor: editable ? 'pointer' : 'not-allowed',
});

const sectionStyle: React.CSSProperties = {
  marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--nl-border, #34495e22)',
};

const badgeStyle = (color: string): React.CSSProperties => ({
  display: 'inline-block', fontSize: 9, padding: '2px 6px', borderRadius: 3,
  background: `${color}15`, color, border: `1px solid ${color}40`, fontWeight: 700,
});

// ─── Name builder helper ────────────────────────────────────────────────────
function buildMETSName(swcCode: string, datatype: string, unit: string, descriptiveName: string): string {
  let name = '';
  if (swcCode) name += swcCode + '_';
  const prefix = DTYPE_PREFIX[datatype] || '';
  name += prefix;
  if (unit) name += unit;
  name += descriptiveName;
  return name;
}

function validateMETSName(name: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!name) { errors.push('Empty name'); return { errors, warnings }; }
  if (name.length > 30) errors.push(`Exceeds 30 chars (${name.length})`);
  if (/\s/.test(name)) errors.push('No spaces allowed');
  if (/[åäöÅÄÖ]/.test(name)) errors.push('No Swedish characters');
  return { errors, warnings };
}

// ─── Signal Editor Sub-Component ────────────────────────────────────────────
function SignalRow({ signal, index, onUpdate, onRemove, swcCode, disabled }: {
  signal: SWSignal; index: number; onUpdate: (i: number, s: SWSignal) => void;
  onRemove: (i: number) => void; swcCode: string; disabled: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const dirColor = signal.direction === 'IN' ? '#60a5fa' : signal.direction === 'OUT' ? '#f472b6' : '#fbbf24';
  const dtColor = DTYPE_COLORS[signal.datatype] || '#94a3b8';
  const validation = validateMETSName(signal.name);
  const hasErrors = validation.errors.length > 0;

  return (
    <div style={{
      background: 'var(--nl-bg-panel, #1e293b)',
      border: `1px solid ${hasErrors ? '#ef4444' : 'var(--nl-border, #334155)'}`,
      borderRadius: 6, marginBottom: 4, overflow: 'hidden',
    }}>
      {/* Compact row */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span style={{ fontSize: 9, color: dirColor, fontWeight: 700, width: 16, textAlign: 'center' }}>
          {signal.direction === 'IN' ? '→' : signal.direction === 'OUT' ? '←' : '↔'}
        </span>
        <span style={{
          fontSize: 11, color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        }}>{signal.name || '(unnamed)'}</span>
        <span style={{ ...badgeStyle(dtColor), fontSize: 8 }}>{signal.datatype}</span>
        {signal.unit && <span style={{ fontSize: 8, color: '#64748b' }}>{signal.unit}</span>}
        <span style={{ fontSize: 8, color: '#64748b' }}>{isExpanded ? '▼' : '▶'}</span>
      </div>

      {/* Expanded editor */}
      {isExpanded && (
        <div style={{ padding: '6px 8px', borderTop: '1px solid var(--nl-border, #334155)', background: 'var(--nl-bg-input, #0f172a)' }}>
          {/* Direction */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            {(['IN', 'OUT', 'IN_OUT'] as const).map(dir => (
              <button
                key={dir}
                onClick={() => !disabled && onUpdate(index, { ...signal, direction: dir })}
                style={{
                  flex: 1, padding: '4px 0', fontSize: 9, fontWeight: 700,
                  background: signal.direction === dir ? `${dir === 'IN' ? '#60a5fa' : dir === 'OUT' ? '#f472b6' : '#fbbf24'}20` : 'transparent',
                  color: signal.direction === dir ? (dir === 'IN' ? '#60a5fa' : dir === 'OUT' ? '#f472b6' : '#fbbf24') : '#64748b',
                  border: `1px solid ${signal.direction === dir ? (dir === 'IN' ? '#60a5fa' : dir === 'OUT' ? '#f472b6' : '#fbbf24') + '60' : '#33415540'}`,
                  borderRadius: 3, cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >{dir.replace('_', '/')}</button>
            ))}
          </div>

          {/* Datatype + Unit row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 6 }}>
            <div>
              <label style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>Datatype</label>
              <select
                value={signal.datatype}
                onChange={e => {
                  const dt = e.target.value;
                  const newName = buildMETSName(swcCode, dt, signal.unit || '', signal.description || 'signal');
                  onUpdate(index, { ...signal, datatype: dt, name: newName });
                }}
                disabled={disabled}
                style={{ ...selectStyle(!disabled), fontSize: 11, padding: '4px 6px' }}
              >
                {DATATYPES.map(dt => <option key={dt} value={dt}>{DTYPE_PREFIX[dt]} {dt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>Unit</label>
              <select
                value={signal.unit || ''}
                onChange={e => {
                  const unit = e.target.value;
                  const newName = buildMETSName(swcCode, signal.datatype, unit, signal.description || 'signal');
                  onUpdate(index, { ...signal, unit: unit.replace(/_$/, '') || undefined, name: newName });
                }}
                disabled={disabled}
                style={{ ...selectStyle(!disabled), fontSize: 11, padding: '4px 6px' }}
              >
                {UNITS.map(u => <option key={u.prefix} value={u.prefix}>{u.label}</option>)}
              </select>
            </div>
          </div>

          {/* Descriptive name */}
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>Descriptive Name (camelCase)</label>
            <input
              type="text"
              value={signal.description || ''}
              onChange={e => {
                const desc = e.target.value;
                const newName = buildMETSName(swcCode, signal.datatype, signal.unit ? signal.unit + '_' : '', desc);
                onUpdate(index, { ...signal, description: desc, name: newName });
              }}
              disabled={disabled}
              placeholder="e.g., startCmd, oilPressure"
              style={{ ...inputStyle(!disabled), fontSize: 11, padding: '4px 6px', fontFamily: "'JetBrains Mono', monospace" }}
            />
          </div>

          {/* Generated full name (read-only) */}
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>Full METS Name</label>
            <div style={{
              padding: '4px 6px', fontSize: 11, borderRadius: 3,
              background: hasErrors ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.08)',
              border: `1px solid ${hasErrors ? '#ef4444' : '#22c55e'}30`,
              color: hasErrors ? '#ef4444' : '#22c55e',
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
            }}>
              {signal.name || '—'}
              {signal.name && <span style={{ fontSize: 8, marginLeft: 6, color: '#64748b' }}>({signal.name.length}/30)</span>}
            </div>
            {validation.errors.map((err, i) => (
              <div key={i} style={{ fontSize: 8, color: '#ef4444', marginTop: 2 }}>⚠ {err}</div>
            ))}
          </div>

          {/* Default value */}
          <div style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>Default Value</label>
            <input
              type="text"
              value={signal.defaultValue || ''}
              onChange={e => onUpdate(index, { ...signal, defaultValue: e.target.value })}
              disabled={disabled}
              placeholder={signal.datatype === 'BOOL' ? 'FALSE' : signal.datatype === 'REAL' ? '0.0' : ''}
              style={{ ...inputStyle(!disabled), fontSize: 11, padding: '4px 6px' }}
            />
          </div>

          {/* Remove button */}
          {!disabled && (
            <button
              onClick={() => onRemove(index)}
              style={{
                width: '100%', padding: '4px', marginTop: 4, fontSize: 9, fontWeight: 600,
                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: 3, cursor: 'pointer',
              }}
            >✕ Remove Signal</button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Panel Component ───────────────────────────────────────────────────
export default function SWPouPropertiesPanel({
  node, onClose, onUpdate, initialPosition, projectId, nodes,
}: {
  node: any;
  onClose: () => void;
  onUpdate: (nodeId: string, field: string, value: any) => void;
  initialPosition: { x: number; y: number };
  projectId?: string | null;
  nodes?: any[];
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState(initialPosition);
  const [activeTab, setActiveTab] = useState<'general' | 'signals' | 'states'>('general');
  const [swcDropdownOpen, setSWCDropdownOpen] = useState(false);
  const [swcInput, setSWCInput] = useState(node.data.swcCode || '');
  const swcRef = useRef<HTMLDivElement>(null);

  const { entries: swcEntries, codes: swcCodes, registerSWC, backendAvailable } = useSWCRegistry(projectId || null, nodes);

  const isPrg = node.data.pouType === 'program';
  const colors = isPrg ? COLORS.prg : COLORS.fb;
  const icon = isPrg ? '▶' : '⚙';
  const typeLabel = isPrg ? 'Program (PRG)' : 'Function Block (FB)';
  const isEditable = node.data.state !== 'frozen' && node.data.state !== 'released';

  const signals: SWSignal[] = node.data.swSignals || [];
  const inputSignals = signals.filter(s => s.direction === 'IN' || s.direction === 'IN_OUT');
  const outputSignals = signals.filter(s => s.direction === 'OUT' || s.direction === 'IN_OUT');

  // Sync swcInput when node changes
  useEffect(() => setSWCInput(node.data.swcCode || ''), [node.data.swcCode]);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (swcRef.current && !swcRef.current.contains(e.target as Node)) setSWCDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => setPosition(initialPosition), [initialPosition]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return;
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Signal CRUD
  const handleSignalUpdate = (index: number, updated: SWSignal) => {
    const newSignals = [...signals];
    newSignals[index] = updated;
    onUpdate(node.id, 'swSignals', newSignals);
  };

  const handleSignalRemove = (index: number) => {
    const newSignals = signals.filter((_, i) => i !== index);
    onUpdate(node.id, 'swSignals', newSignals);
  };

  const handleAddSignal = (direction: 'IN' | 'OUT') => {
    const swc = node.data.swcCode || '';
    const dt = 'BOOL';
    const desc = direction === 'IN' ? 'input' : 'output';
    const name = buildMETSName(swc, dt, '', desc);
    const newSignal: SWSignal = { name, datatype: dt, direction, description: desc };
    onUpdate(node.id, 'swSignals', [...signals, newSignal]);
  };

  // Tab buttons
  const tabBtn = (key: typeof activeTab, label: string, count?: number) => (
    <button
      onClick={() => setActiveTab(key)}
      style={{
        flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 700,
        background: activeTab === key ? `${colors.primary}18` : 'transparent',
        color: activeTab === key ? colors.primary : '#64748b',
        border: `1px solid ${activeTab === key ? colors.primary + '50' : '#334155'}`,
        borderRadius: 4, cursor: 'pointer',
        borderBottom: activeTab === key ? `2px solid ${colors.primary}` : '2px solid transparent',
      }}
    >
      {label}{count != null ? ` (${count})` : ''}
    </button>
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        left: position.x, top: position.y,
        width: 360,
        maxHeight: '85vh',
        background: 'var(--nl-bg-surface, #1a202c)',
        border: `1px solid ${colors.primary}40`,
        borderRadius: 10,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${colors.primary}10`,
        zIndex: 1000,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 14px',
        background: `linear-gradient(135deg, ${colors.primary}12, transparent)`,
        borderBottom: `1px solid ${colors.primary}30`,
        cursor: isDragging ? 'grabbing' : 'grab',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        userSelect: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
              {node.data.label || 'Unnamed'}
            </div>
            <div style={{ fontSize: 9, color: colors.primary, fontWeight: 600, textTransform: 'uppercase' }}>
              {typeLabel} · {node.data.reqId || '—'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {node.data.swcCode && (
            <span style={{ ...badgeStyle(COLORS.swc.primary), fontFamily: "'JetBrains Mono', monospace" }}>
              {node.data.swcCode}
            </span>
          )}
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#94a3b8',
            fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 2px',
          }}>×</button>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 3, padding: '8px 12px 4px' }}>
        {tabBtn('general', 'General')}
        {tabBtn('signals', 'Signals', signals.length)}
        {tabBtn('states', 'States')}
      </div>

      {/* ── Content (scrollable) ───────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px 14px' }}>

        {/* ═══════ GENERAL TAB ═══════════════════════════════════════════ */}
        {activeTab === 'general' && (
          <>
            {/* Name */}
            <div style={sectionStyle}>
              <label style={labelStyle(colors.primary)}>Name</label>
              <input
                type="text"
                value={node.data.label || ''}
                onChange={e => onUpdate(node.id, 'label', e.target.value)}
                disabled={!isEditable}
                placeholder={isPrg ? 'PRG_Main' : 'FB_MotorCtrl'}
                style={{ ...inputStyle(isEditable), fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
              />
              {/* Naming hint */}
              <div style={{ fontSize: 8, color: '#64748b', marginTop: 3 }}>
                Convention: {isPrg ? 'PRG_<Description>' : 'FB_<Function>'}
              </div>
            </div>

            {/* SWC Code */}
            <div style={sectionStyle} ref={swcRef}>
              <label style={labelStyle(COLORS.swc.primary)}>
                SWC Tag
                {!backendAvailable && <span style={{ fontSize: 7, color: '#f59e0b', fontWeight: 400, marginLeft: 4 }}>local only</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    type="text"
                    value={swcInput}
                    onChange={e => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                      setSWCInput(val);
                      // Live update node
                      onUpdate(node.id, 'swcCode', val);
                    }}
                    onFocus={() => setSWCDropdownOpen(true)}
                    onBlur={() => {
                      // Auto-register on blur if it's a new code
                      setTimeout(() => {
                        if (swcInput && swcInput.length >= 2 && !swcCodes.includes(swcInput)) {
                          registerSWC(swcInput, node.data.label || swcInput);
                        }
                      }, 200);
                    }}
                    disabled={!isEditable}
                    placeholder="Type or select..."
                    maxLength={6}
                    style={{
                      ...inputStyle(isEditable),
                      fontFamily: "'JetBrains Mono', monospace",
                      textTransform: 'uppercase',
                      flex: 1,
                      borderColor: swcDropdownOpen ? COLORS.swc.primary + '60' : undefined,
                    }}
                  />
                  <button
                    onClick={() => setSWCDropdownOpen(!swcDropdownOpen)}
                    disabled={!isEditable}
                    style={{
                      width: 28, padding: 0,
                      background: 'var(--nl-bg-input, #34495e)',
                      border: '1px solid var(--nl-border, #4a5f7f)',
                      borderRadius: 4, cursor: isEditable ? 'pointer' : 'not-allowed',
                      color: '#94a3b8', fontSize: 10,
                    }}
                  >{swcDropdownOpen ? '▲' : '▼'}</button>
                </div>

                {/* Dropdown */}
                {swcDropdownOpen && isEditable && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    marginTop: 2, maxHeight: 180, overflow: 'auto', zIndex: 50,
                    background: 'var(--nl-bg-surface, #1a202c)',
                    border: `1px solid ${COLORS.swc.primary}40`,
                    borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}>
                    {swcEntries.length === 0 && !swcInput && (
                      <div style={{ padding: '8px 10px', fontSize: 9, color: '#64748b', fontStyle: 'italic' }}>
                        No SWC codes registered yet. Type to add one.
                      </div>
                    )}

                    {/* Filtered entries */}
                    {swcEntries
                      .filter(e => !swcInput || e.swc_code.includes(swcInput) || e.full_name.toLowerCase().includes(swcInput.toLowerCase()))
                      .map(entry => {
                        const isActive = entry.swc_code === node.data.swcCode;
                        const typeChar = entry.swc_code.slice(-1);
                        const SWC_TYPE_LABELS: Record<string, string> = { C: 'Control', D: 'Diagnostics', M: 'Monitoring', P: 'Priority', U: 'Utility' };
                        const typeLabel = SWC_TYPE_LABELS[typeChar] || '';
                        return (
                          <div
                            key={entry.swc_code}
                            onClick={() => {
                              onUpdate(node.id, 'swcCode', entry.swc_code);
                              setSWCInput(entry.swc_code);
                              setSWCDropdownOpen(false);
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '5px 10px', cursor: 'pointer',
                              background: isActive ? `${COLORS.swc.primary}15` : 'transparent',
                              borderBottom: '1px solid #33415520',
                            }}
                            onMouseEnter={e => { if (!isActive) (e.currentTarget.style.background = '#ffffff08'); }}
                            onMouseLeave={e => { if (!isActive) (e.currentTarget.style.background = 'transparent'); }}
                          >
                            <span style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 11, fontWeight: 700,
                              color: isActive ? COLORS.swc.primary : '#e2e8f0',
                              minWidth: 50,
                            }}>{entry.swc_code}</span>
                            <span style={{ fontSize: 9, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {entry.full_name !== entry.swc_code ? entry.full_name : ''}
                            </span>
                            {typeLabel && (
                              <span style={{ fontSize: 7, color: '#64748b', textTransform: 'uppercase' }}>{typeLabel}</span>
                            )}
                            {isActive && <span style={{ fontSize: 9, color: COLORS.swc.primary }}>✓</span>}
                          </div>
                        );
                      })}

                    {/* "Add new" option if typed value doesn't exist */}
                    {swcInput && swcInput.length >= 2 && !swcCodes.includes(swcInput) && (
                      <div
                        onClick={() => {
                          registerSWC(swcInput, node.data.label || swcInput);
                          onUpdate(node.id, 'swcCode', swcInput);
                          setSWCDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 10px', cursor: 'pointer',
                          borderTop: '1px solid #33415540',
                          background: `${COLORS.swc.primary}08`,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = `${COLORS.swc.primary}15`)}
                        onMouseLeave={e => (e.currentTarget.style.background = `${COLORS.swc.primary}08`)}
                      >
                        <span style={{ fontSize: 11, color: COLORS.swc.primary }}>+</span>
                        <span style={{ fontSize: 10, color: COLORS.swc.primary, fontWeight: 600 }}>
                          Register "{swcInput}" as new SWC
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 8, color: '#64748b', marginTop: 3 }}>
                Max 6 chars. Last char = type: C(ontrol) D(iagnostics) M(onitoring) P(riority) U(tility)
              </div>
            </div>

            {/* Language + Status row */}
            <div style={{ ...sectionStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle()}>Language</label>
                <select
                  value={node.data.swLanguage || 'ST'}
                  onChange={e => onUpdate(node.id, 'swLanguage', e.target.value)}
                  disabled={!isEditable}
                  style={selectStyle(isEditable)}
                >
                  {LANGUAGES.map(l => <option key={l} value={l}>{l} — {
                    l === 'ST' ? 'Structured Text' : l === 'FBD' ? 'Function Block Diagram' :
                    l === 'SFC' ? 'Sequential Function Chart' : l === 'LD' ? 'Ladder Diagram' : 'Continuous FC'
                  }</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle()}>Status</label>
                <select
                  value={node.data.swStatus || 'draft'}
                  onChange={e => onUpdate(node.id, 'swStatus', e.target.value)}
                  disabled={!isEditable}
                  style={selectStyle(isEditable)}
                >
                  {SW_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>

            {/* Version row */}
            <div style={{ ...sectionStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle()}>SW Version</label>
                <input
                  type="text"
                  value={node.data.swVersion || '0.1'}
                  onChange={e => onUpdate(node.id, 'swVersion', e.target.value)}
                  disabled={!isEditable}
                  style={inputStyle(isEditable)}
                />
              </div>
              <div>
                <label style={labelStyle()}>PLM Version</label>
                <input
                  type="text"
                  value={node.data.version || '1.0'}
                  onChange={e => onUpdate(node.id, 'version', e.target.value)}
                  disabled={!isEditable}
                  style={inputStyle(isEditable)}
                />
              </div>
            </div>

            {/* ── Task Config (PRG only) ──────────────────────────────── */}
            {isPrg && (
              <div style={{
                ...sectionStyle,
                background: `${colors.primary}08`, borderRadius: 6,
                padding: 10, border: `1px solid ${colors.primary}20`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 12 }}>⏱</span>
                  <label style={{ ...labelStyle(colors.primary), margin: 0 }}>Task Configuration</label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>Task Type</label>
                    <select
                      value={node.data.taskType || 'cyclic'}
                      onChange={e => onUpdate(node.id, 'taskType', e.target.value)}
                      disabled={!isEditable}
                      style={{ ...selectStyle(isEditable), fontSize: 12, padding: '5px 6px' }}
                    >
                      {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>Priority</label>
                    <input
                      type="number"
                      min={0} max={31}
                      value={node.data.taskPriority ?? 10}
                      onChange={e => onUpdate(node.id, 'taskPriority', parseInt(e.target.value) || 0)}
                      disabled={!isEditable}
                      style={{ ...inputStyle(isEditable), fontSize: 12, padding: '5px 6px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>
                    {node.data.taskType === 'event' ? 'Event Trigger' : 'Cycle Time'}
                  </label>
                  <input
                    type="text"
                    value={node.data.taskInterval || 'T#100ms'}
                    onChange={e => onUpdate(node.id, 'taskInterval', e.target.value)}
                    disabled={!isEditable}
                    placeholder={node.data.taskType === 'event' ? 'e.g., x_triggerEvent' : 'e.g., T#100ms, T#20ms'}
                    style={{ ...inputStyle(isEditable), fontSize: 12, padding: '5px 6px', fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>

                {/* Task name (auto-derived) */}
                <div style={{ marginTop: 6 }}>
                  <label style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>Task Name</label>
                  <input
                    type="text"
                    value={node.data.taskName || ''}
                    onChange={e => onUpdate(node.id, 'taskName', e.target.value)}
                    disabled={!isEditable}
                    placeholder="TSK_Main"
                    style={{ ...inputStyle(isEditable), fontSize: 11, padding: '4px 6px', fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div style={sectionStyle}>
              <label style={labelStyle()}>Description</label>
              <textarea
                value={node.data.description || ''}
                onChange={e => onUpdate(node.id, 'description', e.target.value)}
                disabled={!isEditable}
                rows={3}
                placeholder="Describe the purpose and functionality..."
                style={{ ...inputStyle(isEditable), resize: 'vertical', minHeight: 60 }}
              />
            </div>
          </>
        )}

        {/* ═══════ SIGNALS TAB ═══════════════════════════════════════════ */}
        {activeTab === 'signals' && (
          <>
            {/* Summary */}
            <div style={{ ...sectionStyle, display: 'flex', gap: 8, justifyContent: 'center' }}>
              <span style={badgeStyle('#60a5fa')}>
                {inputSignals.length} Input{inputSignals.length !== 1 ? 's' : ''}
              </span>
              <span style={badgeStyle('#f472b6')}>
                {outputSignals.length} Output{outputSignals.length !== 1 ? 's' : ''}
              </span>
              {node.data.swcCode && (
                <span style={badgeStyle(COLORS.swc.primary)}>SWC: {node.data.swcCode}</span>
              )}
            </div>

            {/* Add signal buttons */}
            {isEditable && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <button
                  onClick={() => handleAddSignal('IN')}
                  style={{
                    flex: 1, padding: '6px 0', fontSize: 10, fontWeight: 700,
                    background: 'rgba(96,165,250,0.1)', color: '#60a5fa',
                    border: '1px solid rgba(96,165,250,0.3)', borderRadius: 4, cursor: 'pointer',
                  }}
                >+ Add Input</button>
                <button
                  onClick={() => handleAddSignal('OUT')}
                  style={{
                    flex: 1, padding: '6px 0', fontSize: 10, fontWeight: 700,
                    background: 'rgba(244,114,182,0.1)', color: '#f472b6',
                    border: '1px solid rgba(244,114,182,0.3)', borderRadius: 4, cursor: 'pointer',
                  }}
                >+ Add Output</button>
              </div>
            )}

            {/* Signal list */}
            {signals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b', fontSize: 12 }}>
                No signals defined yet. Add inputs and outputs above.
              </div>
            ) : (
              <>
                {/* Inputs */}
                {inputSignals.length > 0 && (
                  <>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>
                      Inputs
                    </div>
                    {signals.map((s, i) => (s.direction === 'IN' || s.direction === 'IN_OUT') && (
                      <SignalRow
                        key={`sig-${i}`}
                        signal={s}
                        index={i}
                        onUpdate={handleSignalUpdate}
                        onRemove={handleSignalRemove}
                        swcCode={node.data.swcCode || ''}
                        disabled={!isEditable}
                      />
                    ))}
                  </>
                )}

                {/* Outputs */}
                {outputSignals.length > 0 && (
                  <>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#f472b6', textTransform: 'uppercase', marginTop: 8, marginBottom: 4, letterSpacing: 0.5 }}>
                      Outputs
                    </div>
                    {signals.map((s, i) => s.direction === 'OUT' && (
                      <SignalRow
                        key={`sig-${i}`}
                        signal={s}
                        index={i}
                        onUpdate={handleSignalUpdate}
                        onRemove={handleSignalRemove}
                        swcCode={node.data.swcCode || ''}
                        disabled={!isEditable}
                      />
                    ))}
                  </>
                )}
              </>
            )}

            {/* METS Naming Reference */}
            <div style={{
              marginTop: 12, padding: 8, background: 'var(--nl-bg-panel, #0f172a)',
              borderRadius: 6, border: '1px solid var(--nl-border, #334155)',
            }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                METS Naming Pattern
              </div>
              <div style={{
                fontSize: 10, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace",
                padding: '4px 6px', background: '#0f172a', borderRadius: 3,
              }}>
                <span style={{ color: COLORS.swc.primary }}>[SWC_]</span>
                <span style={{ color: '#22c55e' }}>[datatype_]</span>
                <span style={{ color: '#f59e0b' }}>[unit_]</span>
                <span style={{ color: '#e2e8f0' }}>descriptiveName</span>
              </div>
              <div style={{ fontSize: 8, color: '#475569', marginTop: 3 }}>
                Example: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#94a3b8' }}>
                  GENERC_r_bar_oilPressure
                </span>
              </div>
            </div>
          </>
        )}

        {/* ═══════ STATES TAB ════════════════════════════════════════════ */}
        {activeTab === 'states' && (
          <>
            {/* State machine toggle */}
            <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>PackML State Machine</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>ISA TR88.00.02 — Marine adaptation</div>
              </div>
              <button
                onClick={() => {
                  const enabling = !node.data.useStateMachine;
                  onUpdate(node.id, 'useStateMachine', enabling);
                  if (enabling && (!node.data.activeStates || node.data.activeStates.length === 0)) {
                    // Default to "Standard" preset (core + abort)
                    onUpdate(node.id, 'activeStates', [...MANDATORY_STATE_IDS, 13, 14]);
                  }
                }}
                disabled={!isEditable}
                style={{
                  width: 44, height: 24, borderRadius: 12, padding: 0,
                  background: node.data.useStateMachine ? '#22c55e' : '#334155',
                  border: 'none', cursor: isEditable ? 'pointer' : 'not-allowed',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: 'white',
                  position: 'absolute', top: 3,
                  left: node.data.useStateMachine ? 23 : 3,
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {node.data.useStateMachine && (() => {
              const activeIds: number[] = node.data.activeStates || [...MANDATORY_STATE_IDS, 13, 14];
              const stateActions: Record<string, string> = node.data.stateActions || {};
              const activeTransitions = PACKML_TRANSITIONS.filter(t => {
                if (t.fromAny) return activeIds.includes(t.to);
                return activeIds.includes(t.from) && activeIds.includes(t.to);
              });
              // Also filter: OFF→INIT only if INIT active, OFF→STOPPED if INIT not active
              const filteredTransitions = activeTransitions.filter(t => {
                if (t.from === 0 && t.to === 1) return activeIds.includes(1);
                if (t.from === 0 && t.to === 2) return !activeIds.includes(1);
                return true;
              });
              const generatedSignals = getStateSignals(activeIds);
              const activeCount = activeIds.length;

              // Toggle a state group
              const toggleGroup = (groupKey: string) => {
                if (!isEditable) return;
                const group = STATE_GROUPS[groupKey];
                if (!group) return;
                const allActive = group.ids.every(id => activeIds.includes(id));
                let newIds: number[];
                if (allActive) {
                  newIds = activeIds.filter(id => !group.ids.includes(id));
                } else {
                  newIds = [...new Set([...activeIds, ...group.ids])];
                }
                onUpdate(node.id, 'activeStates', newIds.sort((a, b) => a - b));
              };

              // Apply preset
              const applyPreset = (presetStates: number[]) => {
                if (!isEditable) return;
                onUpdate(node.id, 'activeStates', [...presetStates]);
              };

              // Update state action description
              const updateAction = (label: string, text: string) => {
                const updated = { ...stateActions, [label]: text };
                if (!text) delete updated[label];
                onUpdate(node.id, 'stateActions', updated);
              };

              // Find which preset matches current selection
              const currentPreset = STATE_PRESETS.find(p =>
                p.states.length === activeIds.length && p.states.every(id => activeIds.includes(id))
              );

              return (
                <>
                  {/* ── Presets ────────────────────────────────────── */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle()}>Preset Configuration</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {STATE_PRESETS.map(preset => {
                        const isActive = currentPreset?.id === preset.id;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => applyPreset(preset.states)}
                            disabled={!isEditable}
                            title={preset.description}
                            style={{
                              padding: '4px 8px', fontSize: 9, fontWeight: 600,
                              background: isActive ? `${colors.primary}20` : 'var(--nl-bg-panel, #0f172a)',
                              color: isActive ? colors.primary : '#94a3b8',
                              border: `1px solid ${isActive ? colors.primary + '60' : '#33415540'}`,
                              borderRadius: 4, cursor: isEditable ? 'pointer' : 'not-allowed',
                            }}
                          >
                            {preset.icon} {preset.label}
                          </button>
                        );
                      })}
                    </div>
                    {currentPreset && (
                      <div style={{ fontSize: 8, color: '#64748b', marginTop: 3 }}>
                        {currentPreset.description}
                      </div>
                    )}
                    {!currentPreset && (
                      <div style={{ fontSize: 8, color: '#f59e0b', marginTop: 3 }}>
                        Custom configuration ({activeCount} of 15 states)
                      </div>
                    )}
                  </div>

                  {/* ── Optional State Groups ─────────────────────── */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle()}>State Groups</label>

                    {/* Mandatory core — always on */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 8px', marginBottom: 3, borderRadius: 5,
                      background: '#22c55e08', border: '1px solid #22c55e20',
                    }}>
                      <span style={{ fontSize: 10 }}>🔒</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e' }}>Core Cycle</div>
                        <div style={{ fontSize: 8, color: '#64748b' }}>
                          OFF → STOPPED → RESETTING → IDLE → STARTING → EXECUTE → STOPPING
                        </div>
                      </div>
                      <span style={badgeStyle('#22c55e')}>7 states</span>
                    </div>

                    {/* Optional groups */}
                    {Object.entries(STATE_GROUPS).map(([key, group]) => {
                      const allActive = group.ids.every(id => activeIds.includes(id));
                      const groupStates = PACKML_STATES.filter(s => group.ids.includes(s.id));
                      const groupColor = groupStates[0]?.type === 'fault' ? '#ef4444' : '#3b82f6';
                      return (
                        <div
                          key={key}
                          onClick={() => toggleGroup(key)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 8px', marginBottom: 3, borderRadius: 5,
                            background: allActive ? `${groupColor}08` : 'var(--nl-bg-panel, #0f172a)',
                            border: `1px solid ${allActive ? groupColor + '30' : '#33415520'}`,
                            cursor: isEditable ? 'pointer' : 'not-allowed',
                            transition: 'all 0.15s',
                          }}
                        >
                          {/* Toggle indicator */}
                          <div style={{
                            width: 16, height: 16, borderRadius: 3,
                            border: `2px solid ${allActive ? groupColor : '#475569'}`,
                            background: allActive ? groupColor : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, color: 'white', fontWeight: 700, flexShrink: 0,
                          }}>
                            {allActive ? '✓' : ''}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: allActive ? groupColor : '#94a3b8' }}>
                              {group.label}
                            </div>
                            <div style={{ fontSize: 8, color: '#64748b' }}>
                              {groupStates.map(s => s.label).join(' → ')}
                            </div>
                          </div>
                          <span style={badgeStyle(allActive ? groupColor : '#475569')}>
                            {group.ids.length}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Active States + Action Descriptions ────────── */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle()}>
                      Active States ({activeCount})
                      <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 4 }}>
                        — describe what happens in each
                      </span>
                    </label>
                    <div style={{ maxHeight: 300, overflow: 'auto' }}>
                      {PACKML_STATES.filter(s => activeIds.includes(s.id)).map(state => {
                        const stColor = STATE_TYPE_COLORS[state.type];
                        const hasAction = !!stateActions[state.label];
                        return (
                          <div key={state.id} style={{
                            marginBottom: 3, borderRadius: 5, overflow: 'hidden',
                            border: `1px solid ${hasAction ? stColor + '30' : '#33415520'}`,
                            background: 'var(--nl-bg-panel, #0f172a)',
                          }}>
                            {/* State header */}
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px',
                            }}>
                              <span style={{
                                width: 7, height: 7, borderRadius: '50%',
                                background: stColor, flexShrink: 0,
                              }} />
                              <span style={{
                                fontSize: 10, fontWeight: 700, color: '#e2e8f0', flex: 1,
                                fontFamily: "'JetBrains Mono', monospace",
                              }}>{state.label}</span>
                              <span style={{ fontSize: 8, color: stColor, fontWeight: 600, textTransform: 'uppercase' }}>
                                {state.type}
                              </span>
                              {state.mandatory && (
                                <span style={{ fontSize: 7, color: '#475569' }}>🔒</span>
                              )}
                              <span style={{ fontSize: 8, color: '#475569' }}>#{state.id}</span>
                            </div>
                            {/* Action description input */}
                            <div style={{ padding: '0 8px 6px' }}>
                              <input
                                type="text"
                                value={stateActions[state.label] || ''}
                                onChange={e => updateAction(state.label, e.target.value)}
                                disabled={!isEditable}
                                placeholder={state.description}
                                style={{
                                  width: '100%', padding: '3px 6px', fontSize: 9,
                                  background: hasAction ? `${stColor}08` : 'var(--nl-bg-input, #1e293b)',
                                  color: hasAction ? '#e2e8f0' : '#64748b',
                                  border: `1px solid ${hasAction ? stColor + '25' : '#33415520'}`,
                                  borderRadius: 3, boxSizing: 'border-box' as const,
                                  fontStyle: hasAction ? 'normal' : 'italic',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Transition Chain (visual) ──────────────────── */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle()}>Transitions ({filteredTransitions.length})</label>
                    <div style={{
                      padding: 8, background: 'var(--nl-bg-panel, #0f172a)',
                      borderRadius: 6, border: '1px solid #33415520',
                      maxHeight: 160, overflow: 'auto',
                    }}>
                      {filteredTransitions.map((t, i) => {
                        const fromState = PACKML_STATES.find(s => s.id === t.from);
                        const toState = PACKML_STATES.find(s => s.id === t.to)!;
                        const fromColor = t.fromAny ? '#64748b' : STATE_TYPE_COLORS[fromState?.type || 'wait'];
                        const toColor = STATE_TYPE_COLORS[toState.type];
                        return (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 9, lineHeight: 1.8,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>
                            <span style={{ color: fromColor, fontWeight: 600, minWidth: 70 }}>
                              {t.fromAny ? 'Any' : fromState?.label}
                            </span>
                            <span style={{ color: '#475569' }}>→</span>
                            <span style={{ color: '#f59e0b', fontSize: 8, minWidth: 65 }}>{t.cmd}</span>
                            <span style={{ color: '#475569' }}>→</span>
                            <span style={{ color: toColor, fontWeight: 600 }}>{toState.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Generated Signals ──────────────────────────── */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle()}>Generated Signals ({generatedSignals.length})</label>
                    <div style={{
                      padding: 6, background: 'var(--nl-bg-panel, #0f172a)',
                      borderRadius: 6, border: '1px solid #33415520',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                    }}>
                      {generatedSignals.filter(s => s.type === 'OUT').map((sig, i) => (
                        <div key={`o${i}`} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <span style={{ color: '#f472b6', fontSize: 8, width: 22 }}>OUT</span>
                          <span style={{ color: '#e2e8f0', flex: 1 }}>{sig.name}</span>
                          <span style={{ color: '#475569', fontSize: 8 }}>{sig.datatype}</span>
                          {sig.condition !== 'always' && (
                            <span style={{
                              fontSize: 7, padding: '0 3px', borderRadius: 2,
                              background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30',
                            }}>{sig.condition}</span>
                          )}
                        </div>
                      ))}
                      <hr style={{ border: 'none', borderTop: '1px solid #33415530', margin: '3px 0' }} />
                      {generatedSignals.filter(s => s.type === 'IN').map((sig, i) => (
                        <div key={`i${i}`} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <span style={{ color: '#60a5fa', fontSize: 8, width: 22 }}>IN</span>
                          <span style={{ color: '#e2e8f0', flex: 1 }}>{sig.name}</span>
                          <span style={{ color: '#475569', fontSize: 8 }}>{sig.datatype}</span>
                          {sig.condition !== 'always' && (
                            <span style={{
                              fontSize: 7, padding: '0 3px', borderRadius: 2,
                              background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30',
                            }}>{sig.condition}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Modes ──────────────────────────────────────── */}
                  <div>
                    <label style={labelStyle()}>Operational Modes</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      {[
                        { id: 'AUTO', label: 'Automatic', color: '#22c55e', desc: 'Full auto execution' },
                        { id: 'SEMI', label: 'Semi-Auto', color: '#3b82f6', desc: 'Auto exec, manual approval' },
                        { id: 'MANUAL', label: 'Manual', color: '#f59e0b', desc: 'Operator controls all' },
                        { id: 'MAINT', label: 'Maintenance', color: '#8b5cf6', desc: 'Reduced states, interlocks' },
                      ].map(mode => (
                        <div key={mode.id} style={{
                          padding: '5px 8px', borderRadius: 4,
                          background: `${mode.color}08`, border: `1px solid ${mode.color}25`,
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: mode.color }}>{mode.id}</div>
                          <div style={{ fontSize: 7, color: '#64748b' }}>{mode.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}

            {!node.data.useStateMachine && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#475569' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>◻</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>State Machine Disabled</div>
                <div style={{ fontSize: 10, marginTop: 4 }}>
                  Enable PackML to add standardized state handling with configurable states and auto-generated signals.
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer status bar ─────────────────────────────────────────── */}
      <div style={{
        padding: '6px 14px',
        borderTop: '1px solid var(--nl-border, #334155)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 9, color: '#475569',
      }}>
        <span>
          {signals.length} signal{signals.length !== 1 ? 's' : ''}
          {node.data.useStateMachine ? ` · PackML (${(node.data.activeStates || []).length})` : ''}
          {isPrg ? ` · ${node.data.taskType || 'cyclic'} ${node.data.taskInterval || ''}` : ''}
        </span>
        <span style={{
          ...badgeStyle(STATUS_COLORS[node.data.swStatus] || '#94a3b8'),
        }}>{node.data.swStatus || 'draft'}</span>
      </div>
    </div>
  );
}
