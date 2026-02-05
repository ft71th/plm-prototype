/**
 * PLM Collaboration Module
 * 
 * Exporterar alla collaboration-komponenter och hooks.
 * 
 * Import:
 *   import { CollaborationProvider, useCollab, UserAvatars } from './collaboration';
 */

// Provider & Context
export { CollaborationProvider, useCollab } from './CollaborationProvider';

// Hooks
export { useCollaboration } from './useCollaboration';
export { useCanvasSync } from './useCanvasSync';
export { useYMap, useYArray } from './useCollaboration';

// Components
export { UserAvatars, UserCursors, CursorTracker } from './UserPresence';
