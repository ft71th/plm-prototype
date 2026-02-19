import React from 'react';
import type { SequenceParticipant, SequenceMessage, SequenceFragment } from '../sequenceTypes';
import { LAYOUT, MESSAGE_STYLES, PARTICIPANT_COLORS } from '../sequenceTypes';

// ============================================================================
// Participant (box + lifeline)
// ============================================================================
interface ParticipantProps {
  participant: SequenceParticipant;
  maxY: number;
  isSelected: boolean;
  isDragTarget: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}

export function ParticipantRenderer({
  participant: p, maxY, isSelected, isDragTarget, onMouseDown, onClick, onDoubleClick,
}: ParticipantProps) {
  const color = p.color || PARTICIPANT_COLORS.default;
  const cx = p.x + LAYOUT.PARTICIPANT_WIDTH / 2;

  return (
    <g>
      {/* Lifeline (dashed) */}
      <line
        x1={cx} y1={LAYOUT.LIFELINE_START_Y}
        x2={cx} y2={maxY + 40}
        stroke="#475569"
        strokeWidth={1.5}
        strokeDasharray="6,4"
        opacity={0.5}
      />

      {/* Participant box */}
      <rect
        x={p.x} y={LAYOUT.PARTICIPANT_Y}
        width={LAYOUT.PARTICIPANT_WIDTH}
        height={LAYOUT.PARTICIPANT_HEIGHT}
        rx={6}
        fill={isSelected ? `${color}30` : isDragTarget ? `${color}15` : '#0f172a'}
        stroke={isSelected ? color : `${color}80`}
        strokeWidth={isSelected ? 2.5 : 1.5}
        cursor="grab"
        onMouseDown={onMouseDown}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      />

      {/* Stereotype */}
      {p.stereotype && (
        <text
          x={cx} y={LAYOUT.PARTICIPANT_Y + 16}
          textAnchor="middle"
          fill={`${color}99`}
          fontSize={9}
          fontFamily="monospace"
        >
          {p.stereotype}
        </text>
      )}

      {/* Label */}
      <text
        x={cx} y={LAYOUT.PARTICIPANT_Y + (p.stereotype ? 32 : 27)}
        textAnchor="middle"
        fill="#e2e8f0"
        fontSize={12}
        fontWeight={600}
        style={{ pointerEvents: 'none' }}
      >
        {p.label.length > 16 ? p.label.slice(0, 15) + '…' : p.label}
      </text>

      {/* Icon (top-left corner) */}
      {p.icon && (
        <text
          x={p.x + 6} y={LAYOUT.PARTICIPANT_Y + 14}
          fontSize={12}
        >
          {p.icon}
        </text>
      )}

      {/* Bottom repeat box (UML convention) */}
      <rect
        x={p.x} y={maxY + 20}
        width={LAYOUT.PARTICIPANT_WIDTH}
        height={24}
        rx={4}
        fill="#0f172a"
        stroke={`${color}50`}
        strokeWidth={1}
      />
      <text
        x={cx} y={maxY + 36}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={10}
      >
        {p.label.length > 16 ? p.label.slice(0, 15) + '…' : p.label}
      </text>
    </g>
  );
}

// ============================================================================
// Message (arrow)
// ============================================================================
interface MessageProps {
  message: SequenceMessage;
  participants: SequenceParticipant[];
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}

export function MessageRenderer({ message: m, participants, isSelected, onClick, onDoubleClick }: MessageProps) {
  const fromP = participants.find(p => p.id === m.fromId);
  const toP = participants.find(p => p.id === m.toId);
  if (!fromP || !toP) return null;

  const y = LAYOUT.MESSAGE_START_Y + m.orderIndex * LAYOUT.MESSAGE_SPACING;
  const fromX = fromP.x + LAYOUT.PARTICIPANT_WIDTH / 2;
  const toX = toP.x + LAYOUT.PARTICIPANT_WIDTH / 2;
  const style = MESSAGE_STYLES[m.type];

  const isSelfCall = fromP.id === toP.id;

  if (isSelfCall) {
    // Self-call: a loopback arrow
    const loopW = LAYOUT.SELF_CALL_WIDTH;
    const loopH = 25;
    const path = `M ${fromX} ${y} H ${fromX + loopW} V ${y + loopH} H ${fromX}`;
    return (
      <g onClick={onClick} onDoubleClick={onDoubleClick} style={{ cursor: 'pointer' }}>
        {/* Hit area */}
        <path d={path} fill="none" stroke="transparent" strokeWidth={14} />
        <path
          d={path}
          fill="none"
          stroke={isSelected ? '#3b82f6' : '#94a3b8'}
          strokeWidth={isSelected ? 2 : 1.5}
          strokeDasharray={style.dash || undefined}
          markerEnd="url(#arrowOpen)"
        />
        {/* Label */}
        <text
          x={fromX + loopW + 6} y={y + loopH / 2 + 4}
          fill={isSelected ? '#93c5fd' : '#e2e8f0'}
          fontSize={11}
          fontFamily="'DM Sans', sans-serif"
        >
          {m.label}
        </text>
      </g>
    );
  }

  const isLeftToRight = fromX < toX;
  const arrowId = style.arrowType === 'filled' ? 'arrowFilled' :
                  style.arrowType === 'x' ? 'arrowX' : 'arrowOpen';

  return (
    <g onClick={onClick} onDoubleClick={onDoubleClick} style={{ cursor: 'pointer' }}>
      {/* Hit area (wider invisible line) */}
      <line
        x1={fromX} y1={y} x2={toX} y2={y}
        stroke="transparent" strokeWidth={14}
      />

      {/* Actual arrow */}
      <line
        x1={fromX} y1={y} x2={toX} y2={y}
        stroke={isSelected ? '#3b82f6' : '#94a3b8'}
        strokeWidth={isSelected ? 2 : 1.5}
        strokeDasharray={style.dash || undefined}
        markerEnd={`url(#${arrowId})`}
      />

      {/* Label */}
      <text
        x={(fromX + toX) / 2}
        y={y - 8}
        textAnchor="middle"
        fill={isSelected ? '#93c5fd' : '#e2e8f0'}
        fontSize={11}
        fontWeight={500}
        fontFamily="'DM Sans', sans-serif"
        style={{ pointerEvents: 'none' }}
      >
        {m.guard && <tspan fill="#f59e0b" fontSize={10}>[{m.guard}] </tspan>}
        {m.label}
      </text>

      {/* Message type badge */}
      {m.type !== 'sync' && (
        <text
          x={(fromX + toX) / 2}
          y={y + 14}
          textAnchor="middle"
          fill="#475569"
          fontSize={8}
          fontFamily="monospace"
          style={{ pointerEvents: 'none' }}
        >
          {m.type}
        </text>
      )}

      {/* Signal ref badge */}
      {m.signalRef && (
        <rect
          x={(fromX + toX) / 2 - 20} y={y + 4}
          width={40} height={13}
          rx={3}
          fill="#10b98120"
          stroke="#10b98150"
          strokeWidth={0.5}
        />
      )}
      {m.signalRef && (
        <text
          x={(fromX + toX) / 2}
          y={y + 14}
          textAnchor="middle"
          fill="#10b981"
          fontSize={8}
          fontFamily="monospace"
        >
          {m.signalRef}
        </text>
      )}
    </g>
  );
}

// ============================================================================
// Fragment (frame)
// ============================================================================
interface FragmentProps {
  fragment: SequenceFragment;
  participants: SequenceParticipant[];
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export function FragmentRenderer({ fragment: f, participants, isSelected, onClick }: FragmentProps) {
  // Find bounding box
  const participantXs = f.participantIds
    .map(pid => participants.find(p => p.id === pid))
    .filter(Boolean)
    .map(p => p!.x);

  if (participantXs.length === 0) return null;

  const minX = Math.min(...participantXs) - LAYOUT.FRAGMENT_PADDING;
  const maxX = Math.max(...participantXs) + LAYOUT.PARTICIPANT_WIDTH + LAYOUT.FRAGMENT_PADDING;
  const topY = LAYOUT.MESSAGE_START_Y + f.fromOrderIndex * LAYOUT.MESSAGE_SPACING - 20;
  const bottomY = LAYOUT.MESSAGE_START_Y + f.toOrderIndex * LAYOUT.MESSAGE_SPACING + 25;

  const typeColors: Record<string, string> = {
    alt: '#f59e0b', opt: '#3b82f6', loop: '#10b981',
    par: '#8b5cf6', break: '#ef4444', critical: '#ef4444', ref: '#06b6d4',
  };
  const color = f.color || typeColors[f.type] || '#607d8b';

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Frame */}
      <rect
        x={minX} y={topY}
        width={maxX - minX}
        height={bottomY - topY}
        rx={3}
        fill={isSelected ? `${color}10` : 'none'}
        stroke={isSelected ? color : `${color}60`}
        strokeWidth={isSelected ? 2 : 1}
        strokeDasharray="4,2"
      />

      {/* Type label (pentagon tab) */}
      <polygon
        points={`${minX},${topY} ${minX + 50},${topY} ${minX + 56},${topY + 10} ${minX + 50},${topY + 20} ${minX},${topY + 20}`}
        fill={`${color}30`}
        stroke={`${color}60`}
        strokeWidth={1}
      />
      <text
        x={minX + 8} y={topY + 14}
        fill={color}
        fontSize={10}
        fontWeight={700}
        fontFamily="monospace"
      >
        {f.type}
      </text>

      {/* Guard / label */}
      <text
        x={minX + 62} y={topY + 14}
        fill={`${color}cc`}
        fontSize={10}
        fontFamily="'DM Sans', sans-serif"
      >
        {f.label}
      </text>

      {/* Alt sections dividers */}
      {f.sections && f.sections.length > 1 && f.sections.slice(1).map((sec, i) => {
        const divY = LAYOUT.MESSAGE_START_Y + sec.fromOrderIndex * LAYOUT.MESSAGE_SPACING - 15;
        return (
          <g key={i}>
            <line
              x1={minX} y1={divY} x2={maxX} y2={divY}
              stroke={`${color}50`} strokeDasharray="6,3" strokeWidth={1}
            />
            <text
              x={minX + 12} y={divY + 12}
              fill={`${color}bb`} fontSize={9} fontFamily="monospace"
            >
              {sec.guard}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ============================================================================
// SVG Marker Defs (arrow heads)
// ============================================================================
export function MarkerDefs() {
  return (
    <defs>
      {/* Filled triangle (sync) */}
      <marker id="arrowFilled" viewBox="0 0 10 10" refX="10" refY="5"
        markerWidth={8} markerHeight={8} orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
      </marker>
      {/* Open arrow (async, reply) */}
      <marker id="arrowOpen" viewBox="0 0 10 10" refX="10" refY="5"
        markerWidth={8} markerHeight={8} orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="#94a3b8" strokeWidth={1.5} />
      </marker>
      {/* X marker (destroy) */}
      <marker id="arrowX" viewBox="0 0 10 10" refX="5" refY="5"
        markerWidth={10} markerHeight={10} orient="auto">
        <path d="M 1 1 L 9 9 M 9 1 L 1 9" fill="none" stroke="#ef4444" strokeWidth={2} />
      </marker>
    </defs>
  );
}
