/**
 * ContextMenu — Högerklicksmeny för whiteboard.
 *
 * Visar kontextuella åtgärder baserat på vad som är markerat.
 * Positioneras vid musklickets position.
 */

import React, { useEffect, useRef } from 'react';
import useWhiteboardStore from '../../stores/whiteboardStore';

const MENU_WIDTH = 200;

export default function ContextMenu() {
  const menuRef = useRef(null);
  const contextMenu = useWhiteboardStore((s) => s.contextMenu);
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const elements = useWhiteboardStore((s) => s.elements);
  const clipboard = useWhiteboardStore((s) => s.clipboard);

  const store = useWhiteboardStore;

  // Stäng vid klick utanför
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => store.getState().setContextMenu(null);
    const handleKeyDown = (e) => { if (e.key === 'Escape') store.getState().setContextMenu(null); };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  if (!contextMenu) return null;

  const hasSelection = selectedIds.size > 0;
  const multiSelection = selectedIds.size > 1;

  // Kolla om markerat element är låst
  const selectedArr = [...selectedIds];
  const firstEl = selectedArr.length > 0 ? elements[selectedArr[0]] : null;
  const isLocked = firstEl?.locked === true;
  const isGroup = firstEl?.type === 'group';

  // Beräkna position (håll inom viewport)
  const x = Math.min(contextMenu.x, window.innerWidth - MENU_WIDTH - 10);
  const y = Math.min(contextMenu.y, window.innerHeight - 400);

  const actions = [];

  // ─── Urklipp ─────────────────────────────────────────
  if (hasSelection) {
    actions.push({ label: 'Kopiera', shortcut: 'Ctrl+C', icon: '📋', action: () => store.getState().copyElements() });
  }
  if (clipboard.length > 0) {
    actions.push({ label: 'Klistra in', shortcut: 'Ctrl+V', icon: '📌', action: () => store.getState().pasteElements() });
  }
  if (hasSelection) {
    actions.push({ label: 'Duplicera', shortcut: 'Ctrl+D', icon: '⧉', action: () => store.getState().duplicateElements() });
  }

  if (actions.length > 0) actions.push(null); // Separator

  // ─── Z-ordning ───────────────────────────────────────
  if (hasSelection) {
    actions.push({ label: 'Framåt', shortcut: ']', icon: '⬆', action: () => store.getState().bringForward() });
    actions.push({ label: 'Bakåt', shortcut: '[', icon: '⬇', action: () => store.getState().sendBackward() });
    actions.push({ label: 'Längst fram', shortcut: 'Ctrl+]', icon: '⏫', action: () => store.getState().bringToFront() });
    actions.push({ label: 'Längst bak', shortcut: 'Ctrl+[', icon: '⏬', action: () => store.getState().sendToBack() });
    actions.push(null); // Separator
  }

  // ─── Gruppering ──────────────────────────────────────
  if (multiSelection) {
    actions.push({ label: 'Gruppera', shortcut: 'Ctrl+G', icon: '🔗', action: () => store.getState().groupElements() });
  }
  if (isGroup) {
    actions.push({ label: 'Avgruppera', shortcut: 'Ctrl+Shift+G', icon: '✂️', action: () => store.getState().ungroupElements() });
  }

  // ─── Lås ─────────────────────────────────────────────
  if (hasSelection) {
    actions.push({
      label: isLocked ? 'Lås upp' : 'Lås',
      icon: isLocked ? '🔓' : '🔒',
      action: () => store.getState().toggleLock([...selectedIds]),
    });
  }

  // ─── Rotation ─────────────────────────────────────────
  if (hasSelection && firstEl?.type !== 'line') {
    actions.push(null); // Separator
    actions.push({
      label: 'Rotera 90° medurs', icon: '↻',
      action: () => {
        const s = store.getState();
        for (const id of selectedIds) {
          const el = s.elements[id];
          if (el && el.type !== 'line') {
            s.updateElement(id, { rotation: ((el.rotation || 0) + Math.PI / 2) % (Math.PI * 2) });
          }
        }
      },
    });
    actions.push({
      label: 'Rotera 90° moturs', icon: '↺',
      action: () => {
        const s = store.getState();
        for (const id of selectedIds) {
          const el = s.elements[id];
          if (el && el.type !== 'line') {
            let r = ((el.rotation || 0) - Math.PI / 2);
            if (r < 0) r += Math.PI * 2;
            s.updateElement(id, { rotation: r });
          }
        }
      },
    });
    actions.push({
      label: 'Nollställ rotation', icon: '⟲',
      action: () => {
        const s = store.getState();
        for (const id of selectedIds) {
          s.updateElement(id, { rotation: 0 });
        }
      },
    });
  }

  if (hasSelection || multiSelection) actions.push(null); // Separator

  // ─── Ta bort ─────────────────────────────────────────
  if (hasSelection) {
    actions.push({
      label: 'Ta bort', shortcut: 'Del', icon: '🗑',
      action: () => store.getState().deleteElements([...selectedIds]),
      danger: true,
    });
  }

  // ─── Markera alla ────────────────────────────────────
  actions.push({ label: 'Markera alla', shortcut: 'Ctrl+A', icon: '☑', action: () => store.getState().selectAll() });

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        width: `${MENU_WIDTH}px`,
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        zIndex: 1000,
        padding: '4px 0',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '13px',
        userSelect: 'none',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {actions.map((item, idx) => {
        if (item === null) {
          return <div key={`sep-${idx}`} style={{ height: '1px', background: '#e8e8e8', margin: '4px 8px' }} />;
        }
        return (
          <div
            key={item.label}
            onClick={(e) => {
              e.stopPropagation();
              item.action();
              store.getState().setContextMenu(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              cursor: 'pointer',
              color: item.danger ? '#d32f2f' : '#333333',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = item.danger ? '#fef2f2' : '#f5f5f5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '18px', textAlign: 'center', fontSize: '14px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </span>
            {item.shortcut && (
              <span style={{ fontSize: '11px', color: '#999', marginLeft: '12px' }}>{item.shortcut}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
