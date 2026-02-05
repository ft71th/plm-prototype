/**
 * UserPresence - Visar andra användares cursors och online-status
 * 
 * Två delar:
 * 1. <UserCursors /> - Overlay som visar cursors på canvas/whiteboard
 * 2. <UserAvatars /> - Liten toolbar som visar vilka som är online
 */

import React, { useEffect, useState, useRef } from 'react';
import { useCollab } from './CollaborationProvider';

// ─────────────────────────────────────────────
// UserAvatars: Visar online-användare i en toolbar
// ─────────────────────────────────────────────
export function UserAvatars({ style }) {
  const { users, connected } = useCollab();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        ...style,
      }}
    >
      {/* Connection indicator */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: connected ? '#10B981' : '#EF4444',
          marginRight: 4,
        }}
        title={connected ? 'Connected' : 'Disconnected'}
      />

      {/* User avatars */}
      {users.map((user, i) => (
        <div
          key={user.clientId}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: user.color || '#6B7280',
            border: '2px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: 'default',
            marginLeft: i > 0 ? -6 : 0,
            zIndex: users.length - i,
            position: 'relative',
          }}
          title={`${user.name}${user.activeView ? ` (${user.activeView})` : ''}`}
        >
          {getInitials(user.name)}
        </div>
      ))}

      {users.length > 0 && (
        <span
          style={{
            fontSize: 11,
            color: '#94A3B8',
            marginLeft: 4,
          }}
        >
          {users.length} online
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// UserCursors: Overlay som renderar andras cursors
// ─────────────────────────────────────────────
export function UserCursors({ containerRef, viewTransform }) {
  const { users } = useCollab();

  // Filtrera användare som har en cursor-position
  const cursors = users.filter((u) => u.cursor?.x != null && u.cursor?.y != null);

  if (cursors.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      {cursors.map((user) => {
        // Om vi har en canvas-transform (pan/zoom), applicera den
        let x = user.cursor.x;
        let y = user.cursor.y;

        if (viewTransform) {
          x = x * viewTransform.zoom + viewTransform.x;
          y = y * viewTransform.zoom + viewTransform.y;
        }

        return (
          <div
            key={user.clientId}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transition: 'left 0.1s ease-out, top 0.1s ease-out',
              pointerEvents: 'none',
            }}
          >
            {/* Cursor SVG */}
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              fill="none"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
            >
              <path
                d="M0 0L16 12L8 12L4 20L0 0Z"
                fill={user.color || '#3B82F6'}
              />
            </svg>

            {/* Name label */}
            <div
              style={{
                position: 'absolute',
                left: 16,
                top: 12,
                background: user.color || '#3B82F6',
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: 500,
                padding: '2px 6px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              {user.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// CursorTracker: Rapporterar cursor-position
// ─────────────────────────────────────────────
export function CursorTracker({ containerRef, viewTransform, children }) {
  const { updateCursor } = useCollab();
  const throttleRef = useRef(null);

  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;

    const handleMouseMove = (e) => {
      // Throttle till 30fps
      if (throttleRef.current) return;
      throttleRef.current = setTimeout(() => {
        throttleRef.current = null;
      }, 33);

      const rect = container.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      // Omvänd canvas-transform för att få "world" koordinater
      if (viewTransform) {
        x = (x - viewTransform.x) / viewTransform.zoom;
        y = (y - viewTransform.y) / viewTransform.zoom;
      }

      updateCursor({ x, y });
    };

    const handleMouseLeave = () => {
      updateCursor(null);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      if (throttleRef.current) clearTimeout(throttleRef.current);
    };
  }, [containerRef, viewTransform, updateCursor]);

  return children || null;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
