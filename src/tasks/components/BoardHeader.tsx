// ============================================================================
// BoardHeader — Board selector, settings, and toolbar
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useTaskContext } from '../TaskContext';
import ThemePicker from './ThemePicker';

interface BoardHeaderProps {
  onShowMyTasks: () => void;
}

export default function BoardHeader({ onShowMyTasks }: BoardHeaderProps) {
  const {
    boards,
    activeBoard,
    setActiveBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    addColumn,
  } = useTaskContext();

  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [isRenamingBoard, setIsRenamingBoard] = useState(false);
  const [renameBoardValue, setRenameBoardValue] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowBoardPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCreateBoard = () => {
    if (newBoardName.trim()) {
      createBoard(newBoardName.trim());
      setNewBoardName('');
      setIsCreatingBoard(false);
      setShowBoardPicker(false);
    }
  };

  const handleRenameBoard = () => {
    if (renameBoardValue.trim() && activeBoard) {
      updateBoard({ ...activeBoard, name: renameBoardValue.trim() });
    }
    setIsRenamingBoard(false);
  };

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      addColumn(newColumnName.trim());
      setNewColumnName('');
      setShowAddColumn(false);
    }
  };

  return (
    <div className="board-header">
      <div className="board-header__left">
        {/* Board selector */}
        <div className="board-header__selector" ref={pickerRef}>
          {isRenamingBoard ? (
            <input
              className="board-header__rename-input"
              value={renameBoardValue}
              onChange={(e) => setRenameBoardValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameBoard();
                if (e.key === 'Escape') setIsRenamingBoard(false);
              }}
              onBlur={handleRenameBoard}
              autoFocus
            />
          ) : (
            <button
              className="board-header__board-btn"
              onClick={() => setShowBoardPicker(!showBoardPicker)}
            >
              <span className="board-header__board-icon">▦</span>
              <span className="board-header__board-name">
                {activeBoard?.name || 'Select board'}
              </span>
              <span className="board-header__board-arrow">▾</span>
            </button>
          )}

          {showBoardPicker && (
            <div className="board-header__dropdown">
              <div className="board-header__dropdown-label">Boards</div>
              {boards.map((board) => (
                <button
                  key={board.id}
                  className={`board-header__dropdown-item ${
                    board.id === activeBoard?.id ? 'board-header__dropdown-item--active' : ''
                  }`}
                  onClick={() => {
                    setActiveBoard(board);
                    setShowBoardPicker(false);
                  }}
                >
                  {board.name}
                </button>
              ))}
              <div className="board-header__dropdown-divider" />
              {isCreatingBoard ? (
                <div className="board-header__dropdown-create">
                  <input
                    className="board-header__dropdown-input"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateBoard();
                      if (e.key === 'Escape') setIsCreatingBoard(false);
                    }}
                    placeholder="Board name..."
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  className="board-header__dropdown-item board-header__dropdown-item--create"
                  onClick={() => setIsCreatingBoard(true)}
                >
                  + New board
                </button>
              )}
            </div>
          )}
        </div>

        {/* Rename */}
        {activeBoard && !isRenamingBoard && (
          <button
            className="board-header__icon-btn"
            onClick={() => {
              setRenameBoardValue(activeBoard.name);
              setIsRenamingBoard(true);
            }}
            title="Rename board"
          >
            ✏️
          </button>
        )}
      </div>

      <div className="board-header__right">
        {/* Add column */}
        {activeBoard && (
          <>
            {showAddColumn ? (
              <div className="board-header__add-column">
                <input
                  className="board-header__add-column-input"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn();
                    if (e.key === 'Escape') {
                      setShowAddColumn(false);
                      setNewColumnName('');
                    }
                  }}
                  placeholder="Column name..."
                  autoFocus
                />
                <button className="board-header__btn" onClick={handleAddColumn}>
                  Add
                </button>
              </div>
            ) : (
              <button
                className="board-header__btn board-header__btn--outline"
                onClick={() => setShowAddColumn(true)}
              >
                + Column
              </button>
            )}
          </>
        )}

        {/* My Tasks */}
        <button className="board-header__btn board-header__btn--outline" onClick={onShowMyTasks}>
          👤 My Tasks
        </button>

        {/* Theme */}
        <ThemePicker />

        {/* Delete board */}
        {activeBoard && boards.length > 1 && (
          <button
            className="board-header__icon-btn board-header__icon-btn--danger"
            onClick={() => {
              if (window.confirm(`Delete board "${activeBoard.name}" and all its tasks?`)) {
                deleteBoard(activeBoard.id);
              }
            }}
            title="Delete board"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}
