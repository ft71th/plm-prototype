// ============================================================================
// Sequence Diagram Types
// ============================================================================

export type MessageType = 'sync' | 'async' | 'reply' | 'create' | 'destroy';
export type FragmentType = 'alt' | 'opt' | 'loop' | 'par' | 'break' | 'critical' | 'ref';

export interface SequenceParticipant {
  id: string;
  label: string;
  linkedNodeId?: string;
  linkedNodeType?: string;
  stereotype?: string;
  color?: string;
  icon?: string;
  x: number;              // horizontal position (auto-calculated or manual)
  order: number;          // left-to-right ordering
}

export interface SequenceMessage {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  type: MessageType;
  orderIndex: number;
  guard?: string;
  signalRef?: string;
  description?: string;
  activationStart?: boolean;
  activationEnd?: boolean;
}

export interface FragmentSection {
  guard: string;
  fromOrderIndex: number;
  toOrderIndex: number;
}

export interface SequenceFragment {
  id: string;
  type: FragmentType;
  label: string;
  fromOrderIndex: number;
  toOrderIndex: number;
  participantIds: string[];   // which participants it spans
  sections?: FragmentSection[];
  color?: string;
}

export interface SequenceDiagram {
  id: string;
  name: string;
  description?: string;
  participants: SequenceParticipant[];
  messages: SequenceMessage[];
  fragments: SequenceFragment[];
  createdAt: string;
  updatedAt: string;
  version: string;
}

// Layout constants
export const LAYOUT = {
  HEADER_Y: 30,
  PARTICIPANT_Y: 50,
  PARTICIPANT_WIDTH: 130,
  PARTICIPANT_HEIGHT: 44,
  PARTICIPANT_GAP: 200,
  LIFELINE_START_Y: 94,      // PARTICIPANT_Y + PARTICIPANT_HEIGHT
  MESSAGE_START_Y: 130,
  MESSAGE_SPACING: 50,
  ACTIVATION_WIDTH: 12,
  SELF_CALL_WIDTH: 40,
  FRAGMENT_PADDING: 14,
  CANVAS_PADDING: 60,
} as const;

// Color map for PLM node types
export const PARTICIPANT_COLORS: Record<string, string> = {
  system: '#1abc9c',
  subsystem: '#3498db',
  function: '#00bcd4',
  hardware: '#795548',
  actor: '#2ecc71',
  requirement: '#e67e22',
  platform: '#9b59b6',
  default: '#607d8b',
};

// Message rendering styles
export const MESSAGE_STYLES: Record<MessageType, { dash: string; arrowType: 'filled' | 'open' | 'x' }> = {
  sync:    { dash: '',      arrowType: 'filled' },
  async:   { dash: '',      arrowType: 'open' },
  reply:   { dash: '6,4',   arrowType: 'open' },
  create:  { dash: '6,4',   arrowType: 'open' },
  destroy: { dash: '',      arrowType: 'x' },
};
