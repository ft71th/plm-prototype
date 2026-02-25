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
  isDragging?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}

export function ParticipantRenderer({
  participant: p, maxY, isSelected, isDragTarget, isDragging, onMouseDown, onClick, onDoubleClick,
}: ParticipantProps) {
  const color = p.color || PARTICIPANT_COLORS.default;
  const cx = p.x + LAYOUT.PARTICIPANT_WIDTH / 2;

  // Selection: light tinted background, always dark text
  const boxFill = isSelected ? '#e0f2fe' : isDragTarget ? '#fef3c7' : '#ffffff';
  const boxStroke = isSelected ? '#2563eb' : `${color}aa`;
  const boxStrokeWidth = isSelected ? 2.5 : 1.5;

  return (
    <g opacity={isDragging ? 0.4 : 1}>
      {/* Lifeline (dashed) */}
      <line
        x1={cx} y1={LAYOUT.LIFELINE_START_Y}
        x2={cx} y2={maxY + 40}
        stroke="#bbb"
        strokeWidth={1.5}
        strokeDasharray="6,4"
        opacity={0.7}
      />

      {/* Participant box */}
      <rect
        x={p.x} y={LAYOUT.PARTICIPANT_Y}
        width={LAYOUT.PARTICIPANT_WIDTH}
        height={LAYOUT.PARTICIPANT_HEIGHT}
        rx={6}
        fill={boxFill}
        stroke={boxStroke}
        strokeWidth={boxStrokeWidth}
        cursor="grab"
        onMouseDown={onMouseDown}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        filter="url(#boxShadow)"
      />

      {/* Color accent bar (left edge) */}
      <rect
        x={p.x} y={LAYOUT.PARTICIPANT_Y}
        width={4} height={LAYOUT.PARTICIPANT_HEIGHT}
        rx={2}
        fill={color}
        style={{ pointerEvents: 'none' }}
      />

      {/* Stereotype */}
      {p.stereotype && (
        <text
          x={cx} y={LAYOUT.PARTICIPANT_Y + 16}
          textAnchor="middle"
          fill="#64748b"
          fontSize={9}
          fontFamily="monospace"
        >
          {p.stereotype}
        </text>
      )}

      {/* Label — always dark for readability */}
      <text
        x={cx} y={LAYOUT.PARTICIPANT_Y + (p.stereotype ? 32 : 27)}
        textAnchor="middle"
        fill="#0f172a"
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
        fill="#ffffff"
        stroke={`${color}60`}
        strokeWidth={1}
      />
      <text
        x={cx} y={maxY + 36}
        textAnchor="middle"
        fill="#64748b"
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
  isDragging?: boolean;
  isDropTarget?: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function MessageRenderer({ message: m, participants, isSelected, isDragging, isDropTarget, onClick, onDoubleClick, onMouseDown }: MessageProps) {
  const fromP = participants.find(p => p.id === m.fromId);
  const toP = participants.find(p => p.id === m.toId);
  if (!fromP || !toP) return null;

  const y = LAYOUT.MESSAGE_START_Y + m.orderIndex * LAYOUT.MESSAGE_SPACING;
  const fromX = fromP.x + LAYOUT.PARTICIPANT_WIDTH / 2;
  const toX = toP.x + LAYOUT.PARTICIPANT_WIDTH / 2;
  const style = MESSAGE_STYLES[m.type];

  const isSelfCall = fromP.id === toP.id;

  if (isSelfCall) {
    const loopW = LAYOUT.SELF_CALL_WIDTH;
    const loopH = 25;
    const path = `M ${fromX} ${y} H ${fromX + loopW} V ${y + loopH} H ${fromX}`;
    return (
      <g onClick={onClick} onDoubleClick={onDoubleClick} onMouseDown={onMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }} opacity={isDragging ? 0.35 : 1}>
        <path d={path} fill="none" stroke="transparent" strokeWidth={14} />
        <path
          d={path}
          fill="none"
          stroke={isSelected ? '#2563eb' : '#475569'}
          strokeWidth={isSelected ? 2 : 1.5}
          strokeDasharray={style.dash || undefined}
          markerEnd="url(#arrowOpen)"
        />
        <text
          x={fromX + loopW + 6} y={y + loopH / 2 + 4}
          fill={isSelected ? '#1d4ed8' : '#1e293b'}
          fontSize={11}
          fontFamily="'DM Sans', sans-serif"
        >
          {m.label}
        </text>
      </g>
    );
  }

  const arrowId = style.arrowType === 'filled' ? 'arrowFilled' :
                  style.arrowType === 'x' ? 'arrowX' : 'arrowOpen';

  return (
    <g onClick={onClick} onDoubleClick={onDoubleClick} onMouseDown={onMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }} opacity={isDragging ? 0.35 : 1}>
      {/* Hit area */}
      <line
        x1={fromX} y1={y} x2={toX} y2={y}
        stroke="transparent" strokeWidth={14}
      />

      {/* Actual arrow */}
      <line
        x1={fromX} y1={y} x2={toX} y2={y}
        stroke={isSelected ? '#2563eb' : '#475569'}
        strokeWidth={isSelected ? 2 : 1.5}
        strokeDasharray={style.dash || undefined}
        markerEnd={`url(#${arrowId})`}
      />

      {/* Label */}
      <text
        x={(fromX + toX) / 2}
        y={y - 8}
        textAnchor="middle"
        fill={isSelected ? '#1d4ed8' : '#1e293b'}
        fontSize={11}
        fontWeight={500}
        fontFamily="'DM Sans', sans-serif"
        style={{ pointerEvents: 'none' }}
      >
        {m.guard && <tspan fill="#b45309" fontSize={10}>[{m.guard}] </tspan>}
        {m.label}
      </text>

      {/* Message type badge */}
      {m.type !== 'sync' && (
        <text
          x={(fromX + toX) / 2}
          y={y + 14}
          textAnchor="middle"
          fill="#94a3b8"
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
          fill="#dcfce7"
          stroke="#86efac"
          strokeWidth={0.5}
        />
      )}
      {m.signalRef && (
        <text
          x={(fromX + toX) / 2}
          y={y + 14}
          textAnchor="middle"
          fill="#15803d"
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
    alt: '#b45309', opt: '#1d4ed8', loop: '#15803d',
    par: '#7c3aed', break: '#dc2626', critical: '#dc2626', ref: '#0e7490',
  };
  const color = f.color || typeColors[f.type] || '#64748b';

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Frame */}
      <rect
        x={minX} y={topY}
        width={maxX - minX}
        height={bottomY - topY}
        rx={3}
        fill={isSelected ? `${color}08` : `${color}04`}
        stroke={isSelected ? color : `${color}80`}
        strokeWidth={isSelected ? 2 : 1}
        strokeDasharray="4,2"
      />

      {/* Type label (pentagon tab) */}
      <polygon
        points={`${minX},${topY} ${minX + 50},${topY} ${minX + 56},${topY + 10} ${minX + 50},${topY + 20} ${minX},${topY + 20}`}
        fill={`${color}15`}
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
        fill={`${color}`}
        fontSize={10}
        fontFamily="'DM Sans', sans-serif"
        opacity={0.8}
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
              stroke={`${color}60`} strokeDasharray="6,3" strokeWidth={1}
            />
            <text
              x={minX + 12} y={divY + 12}
              fill={color} fontSize={9} fontFamily="monospace" opacity={0.8}
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
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
      </marker>
      {/* Open arrow (async, reply) */}
      <marker id="arrowOpen" viewBox="0 0 10 10" refX="10" refY="5"
        markerWidth={8} markerHeight={8} orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="#475569" strokeWidth={1.5} />
      </marker>
      {/* X marker (destroy) */}
      <marker id="arrowX" viewBox="0 0 10 10" refX="5" refY="5"
        markerWidth={10} markerHeight={10} orient="auto">
        <path d="M 1 1 L 9 9 M 9 1 L 1 9" fill="none" stroke="#dc2626" strokeWidth={2} />
      </marker>
      {/* Box shadow for participant boxes */}
      <filter id="boxShadow" x="-4%" y="-4%" width="108%" height="112%">
        <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#00000012" />
      </filter>
    </defs>
  );
}
