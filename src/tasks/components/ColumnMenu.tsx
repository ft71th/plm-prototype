// ============================================================================
// ColumnMenu — Context menu for column operations
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { TaskColumn } from '../types';
import { useTaskContext } from '../TaskContext';

interface ColumnMenuProps {
  column: TaskColumn;
  anchor: HTMLElement | null;
  onClose: () => void;
}

const COLUMN_COLORS = [
  '#6b7280', '#ef4444', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
  '#84cc16', '#f97316',
];

export default function ColumnMenu({ column, anchor, onClose }: ColumnMenuProps) {
  const { activeBoard, updateColumn, deleteColumn } = useTaskContext();
  const [view, setView] = useState<'menu' | 'rename' | 'color' | 'delete' | 'wip'>('menu');
  const [nameInput, setNameInput] = useState(column.name);
  const [wipInput, setWipInput] = useState(column.wipLimit?.toString() || '');
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view === 'rename') {
      setTimeout(() => renameRef.current?.select(), 50);
    }
  }, [view]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!anchor || !activeBoard) return null;

  const rect = anchor.getBoundingClientRect();
  const otherColumns = activeBoard.columns.filter((c) => c.id !== column.id);

  const handleRename = () => {
    if (nameInput.trim()) {
      updateColumn({ ...column, name: nameInput.trim() });
    }
    onClose();
  };

  const handleSetColor = (color: string) => {
    updateColumn({ ...column, color });
    onClose();
  };

  const handleSetWip = () => {
    const limit = parseInt(wipInput);
    updateColumn({ ...column, wipLimit: isNaN(limit) || limit <= 0 ? undefined : limit });
    onClose();
  };

  const handleToggleComplete = () => {
    updateColumn({ ...column, isComplete: !column.isComplete });
    onClose();
  };

  const handleDelete = (moveToId?: string) => {
    deleteColumn(column.id, moveToId);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="column-menu"
      style={{
        top: rect.bottom + 4,
        left: rect.left,
      }}
    >
      {view === 'menu' && (
        <>
          <button className="column-menu__item" onClick={() => setView('rename')}>
            ✏️ Rename
          </button>
          <button className="column-menu__item" onClick={() => setView('color')}>
            🎨 Change color
          </button>
          <button className="column-menu__item" onClick={() => setView('wip')}>
            🔢 Set WIP limit
          </button>
          <button className="column-menu__item" onClick={handleToggleComplete}>
            {column.isComplete ? '☐ Unmark as "Done"' : '☑ Mark as "Done" column'}
          </button>
          <div className="column-menu__divider" />
          <button
            className="column-menu__item column-menu__item--danger"
            onClick={() => setView('delete')}
          >
            🗑️ Delete column
          </button>
        </>
      )}

      {view === 'rename' && (
        <div className="column-menu__form">
          <label className="column-menu__form-label">Column name</label>
          <input
            ref={renameRef}
            className="column-menu__input"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') onClose();
            }}
          />
          <div className="column-menu__form-actions">
            <button className="column-menu__btn" onClick={handleRename}>Save</button>
            <button className="column-menu__btn column-menu__btn--ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {view === 'color' && (
        <div className="column-menu__form">
          <label className="column-menu__form-label">Column color</label>
          <div className="column-menu__colors">
            {COLUMN_COLORS.map((color) => (
              <button
                key={color}
                className={`column-menu__color-btn ${column.color === color ? 'column-menu__color-btn--active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleSetColor(color)}
              />
            ))}
          </div>
        </div>
      )}

      {view === 'wip' && (
        <div className="column-menu__form">
          <label className="column-menu__form-label">WIP limit (0 = no limit)</label>
          <input
            className="column-menu__input"
            type="number"
            min="0"
            value={wipInput}
            onChange={(e) => setWipInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSetWip();
              if (e.key === 'Escape') onClose();
            }}
          />
          <div className="column-menu__form-actions">
            <button className="column-menu__btn" onClick={handleSetWip}>Save</button>
            <button className="column-menu__btn column-menu__btn--ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {view === 'delete' && (
        <div className="column-menu__form">
          <label className="column-menu__form-label">
            Delete "{column.name}"?
          </label>
          <p className="column-menu__form-desc">
            Choose where to move existing tasks, or delete them:
          </p>
          {otherColumns.map((col) => (
            <button
              key={col.id}
              className="column-menu__item"
              onClick={() => handleDelete(col.id)}
            >
              Move tasks → {col.name}
            </button>
          ))}
          <button
            className="column-menu__item column-menu__item--danger"
            onClick={() => handleDelete()}
          >
            Delete tasks too
          </button>
          <div className="column-menu__divider" />
          <button
            className="column-menu__item"
            onClick={() => setView('menu')}
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
