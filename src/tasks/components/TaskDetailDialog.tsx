// ============================================================================
// TaskDetailDialog — Full task editor modal
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Task, PRIORITY_CONFIG, Priority } from '../types';
import { useTaskContext } from '../TaskContext';

interface TaskDetailDialogProps {
  task: Task | null;
  onClose: () => void;
}

export default function TaskDetailDialog({ task, onClose }: TaskDetailDialogProps) {
  const {
    activeBoard,
    updateTask,
    deleteTask,
    unlinkItem,
    addLabel,
    updateLabel,
    deleteLabel,
    theme,
  } = useTaskContext();

  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editLabelName, setEditLabelName] = useState('');
  const [editLabelColor, setEditLabelColor] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      setEditedTask({ ...task });
      setTimeout(() => titleRef.current?.focus(), 100);
    } else {
      setEditedTask(null);
    }
    setShowDeleteConfirm(false);
  }, [task]);

  if (!editedTask || !activeBoard) return null;

  const column = activeBoard.columns.find((c) => c.id === editedTask.columnId);

  const handleSave = () => {
    if (editedTask) {
      updateTask(editedTask);
    }
    onClose();
  };

  const handleDelete = () => {
    if (editedTask) {
      deleteTask(editedTask.id);
    }
    onClose();
  };

  const handleFieldChange = (field: keyof Task, value: any) => {
    setEditedTask((prev) => prev ? { ...prev, [field]: value } : null);
  };

  const handleAddCheckItem = () => {
    if (newCheckItem.trim() && editedTask) {
      const updated = { ...editedTask };
      if (!updated.checklist) updated.checklist = [];
      updated.checklist = [...updated.checklist, {
        id: Date.now().toString(),
        text: newCheckItem.trim(),
        done: false,
      }];
      setEditedTask(updated);
      setNewCheckItem('');
    }
  };

  const handleToggleLabel = (labelId: string) => {
    setEditedTask((prev) => {
      if (!prev) return null;
      const labels = prev.labels.includes(labelId)
        ? prev.labels.filter((id) => id !== labelId)
        : [...prev.labels, labelId];
      return { ...prev, labels };
    });
  };

  const checklistDone = editedTask.checklist?.filter((i) => i.done).length ?? 0;
  const checklistTotal = editedTask.checklist?.length ?? 0;
  const checklistPercent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  return (
    <div className="task-dialog-overlay" onClick={onClose}>
      <div className="task-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="task-dialog__header">
          <div className="task-dialog__header-left">
            {column && (
              <span
                className="task-dialog__column-badge"
                style={{ backgroundColor: column.color }}
              >
                {column.name}
              </span>
            )}
          </div>
          <div className="task-dialog__header-right">
            <button className="task-dialog__close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="task-dialog__body">
          {/* Main content (left) */}
          <div className="task-dialog__main">
            {/* Title */}
            <input
              ref={titleRef}
              className="task-dialog__title-input"
              value={editedTask.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Task title"
            />

            {/* Description */}
            <textarea
              className="task-dialog__description"
              value={editedTask.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Add a description..."
              rows={4}
            />

            {/* Checklist */}
            <div className="task-dialog__section">
              <div className="task-dialog__section-header">
                <span className="task-dialog__section-title">
                  Checklist {checklistTotal > 0 && `(${checklistPercent}%)`}
                </span>
              </div>
              {checklistTotal > 0 && (
                <div className="task-dialog__checklist-bar">
                  <div
                    className="task-dialog__checklist-bar-fill"
                    style={{ width: `${checklistPercent}%` }}
                  />
                </div>
              )}
              <div className="task-dialog__checklist">
                {editedTask.checklist?.map((item) => (
                  <label key={item.id} className="task-dialog__checklist-item">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => {
                        setEditedTask((prev) => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            checklist: prev.checklist?.map((i) =>
                              i.id === item.id ? { ...i, done: !i.done } : i
                            ),
                          };
                        });
                      }}
                    />
                    <span className={item.done ? 'task-dialog__checklist-text--done' : ''}>
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
              <div className="task-dialog__checklist-add">
                <input
                  value={newCheckItem}
                  onChange={(e) => setNewCheckItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCheckItem()}
                  placeholder="Add checklist item..."
                  className="task-dialog__checklist-input"
                />
                <button
                  className="task-dialog__checklist-add-btn"
                  onClick={handleAddCheckItem}
                  disabled={!newCheckItem.trim()}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Linked items */}
            {editedTask.linkedItems.length > 0 && (
              <div className="task-dialog__section">
                <span className="task-dialog__section-title">Linked Items</span>
                <div className="task-dialog__linked-items">
                  {editedTask.linkedItems.map((li) => (
                    <div key={li.itemId} className="task-dialog__linked-item">
                      <span className="task-dialog__linked-item-type">{li.itemType}</span>
                      <span className="task-dialog__linked-item-title">{li.title}</span>
                      <button
                        className="task-dialog__linked-item-remove"
                        onClick={() => {
                          unlinkItem(editedTask.id, li.itemId);
                          setEditedTask((prev) =>
                            prev
                              ? { ...prev, linkedItems: prev.linkedItems.filter((x) => x.itemId !== li.itemId) }
                              : null
                          );
                        }}
                        title="Remove link"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar (right) */}
          <div className="task-dialog__sidebar">
            {/* Column/Status */}
            <div className="task-dialog__field">
              <label className="task-dialog__field-label">Status</label>
              <select
                className="task-dialog__select"
                value={editedTask.columnId}
                onChange={(e) => handleFieldChange('columnId', e.target.value)}
              >
                {activeBoard.columns
                  .sort((a, b) => a.order - b.order)
                  .map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Category */}
            <div className="task-dialog__field">
              <label className="task-dialog__field-label">Category</label>
              <select
                className="task-dialog__select"
                value={editedTask.categoryId || ''}
                onChange={(e) => handleFieldChange('categoryId', e.target.value)}
              >
                <option value="">None</option>
                {(activeBoard.categories || []).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="task-dialog__field">
              <label className="task-dialog__field-label">Priority</label>
              <select
                className="task-dialog__select"
                value={editedTask.priority}
                onChange={(e) => handleFieldChange('priority', e.target.value as Priority)}
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.icon} {cfg.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div className="task-dialog__field">
              <label className="task-dialog__field-label">Assignee</label>
              <input
                className="task-dialog__input"
                value={editedTask.assignee || ''}
                onChange={(e) => handleFieldChange('assignee', e.target.value)}
                placeholder="Assign to..."
              />
            </div>

            {/* Due date */}
            <div className="task-dialog__field">
              <label className="task-dialog__field-label">Due date</label>
              <input
                type="date"
                className="task-dialog__input"
                value={editedTask.dueDate || ''}
                onChange={(e) => handleFieldChange('dueDate', e.target.value)}
              />
            </div>

            {/* Labels */}
            <div className="task-dialog__field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="task-dialog__field-label" style={{ margin: 0 }}>Labels</label>
                <button
                  onClick={() => setShowLabelManager(!showLabelManager)}
                  style={{
                    background: 'none', border: 'none',
                    color: theme.textMuted, cursor: 'pointer',
                    fontSize: 11, padding: '2px 4px',
                  }}
                  title="Manage labels"
                >
                  {showLabelManager ? '✕' : '⚙️'}
                </button>
              </div>

              {/* Toggle existing labels */}
              <div className="task-dialog__labels-list">
                {activeBoard.labels.map((label) => (
                  <button
                    key={label.id}
                    className={`task-dialog__label-toggle ${
                      editedTask.labels.includes(label.id) ? 'task-dialog__label-toggle--active' : ''
                    }`}
                    style={{
                      borderColor: label.color,
                      backgroundColor: editedTask.labels.includes(label.id) ? label.color : 'transparent',
                    }}
                    onClick={() => handleToggleLabel(label.id)}
                  >
                    {label.name}
                  </button>
                ))}
              </div>

              {/* Label manager */}
              {showLabelManager && (
                <div style={{
                  marginTop: 8, padding: 10,
                  background: theme.bgPrimary,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 6,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.04em', color: theme.textMuted, marginBottom: 6,
                  }}>
                    Manage Labels
                  </div>

                  {/* Existing labels — edit/delete */}
                  {activeBoard.labels.map((label) => (
                    <div key={label.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 0', borderBottom: `1px solid ${theme.border}`,
                    }}>
                      {editingLabelId === label.id ? (
                        <>
                          <input
                            type="color" value={editLabelColor}
                            onChange={(e) => setEditLabelColor(e.target.value)}
                            style={{
                              width: 24, height: 20, padding: 0,
                              border: `1px solid ${theme.border}`,
                              borderRadius: 3, cursor: 'pointer', background: 'none',
                            }}
                          />
                          <input
                            style={{
                              flex: 1, padding: '3px 6px',
                              background: theme.bgTertiary,
                              border: `1px solid ${theme.border}`,
                              borderRadius: 3, color: theme.textPrimary,
                              fontSize: 11, outline: 'none',
                            }}
                            value={editLabelName}
                            onChange={(e) => setEditLabelName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && editLabelName.trim()) {
                                updateLabel({ id: label.id, name: editLabelName.trim(), color: editLabelColor });
                                setEditingLabelId(null);
                              }
                              if (e.key === 'Escape') setEditingLabelId(null);
                            }}
                            autoFocus
                          />
                          <button onClick={() => {
                            if (editLabelName.trim()) {
                              updateLabel({ id: label.id, name: editLabelName.trim(), color: editLabelColor });
                            }
                            setEditingLabelId(null);
                          }} style={{
                            background: 'none', border: 'none',
                            color: theme.accent, cursor: 'pointer', fontSize: 11,
                          }}>✓</button>
                        </>
                      ) : (
                        <>
                          <span style={{
                            width: 12, height: 12, borderRadius: '50%',
                            background: label.color, flexShrink: 0,
                          }} />
                          <span style={{
                            flex: 1, fontSize: 12, color: theme.textPrimary,
                          }}>{label.name}</span>
                          <button onClick={() => {
                            setEditingLabelId(label.id);
                            setEditLabelName(label.name);
                            setEditLabelColor(label.color);
                          }} style={{
                            background: 'none', border: 'none',
                            color: theme.textMuted, cursor: 'pointer', fontSize: 10,
                          }}>✏️</button>
                          <button onClick={() => deleteLabel(label.id)} style={{
                            background: 'none', border: 'none',
                            color: '#ef4444', cursor: 'pointer', fontSize: 10,
                          }}>✕</button>
                        </>
                      )}
                    </div>
                  ))}

                  {/* Add new label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <input
                      type="color" value={newLabelColor}
                      onChange={(e) => setNewLabelColor(e.target.value)}
                      style={{
                        width: 24, height: 20, padding: 0,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 3, cursor: 'pointer', background: 'none',
                      }}
                    />
                    <input
                      style={{
                        flex: 1, padding: '4px 6px',
                        background: theme.bgTertiary,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 3, color: theme.textPrimary,
                        fontSize: 11, outline: 'none',
                      }}
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="New label name..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newLabelName.trim()) {
                          addLabel(newLabelName.trim(), newLabelColor);
                          setNewLabelName('');
                          setNewLabelColor('#3b82f6');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (newLabelName.trim()) {
                          addLabel(newLabelName.trim(), newLabelColor);
                          setNewLabelName('');
                          setNewLabelColor('#3b82f6');
                        }
                      }}
                      disabled={!newLabelName.trim()}
                      style={{
                        padding: '3px 8px', border: 'none', borderRadius: 3,
                        background: theme.accent, color: 'white',
                        fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        opacity: newLabelName.trim() ? 1 : 0.5,
                      }}
                    >Add</button>
                  </div>
                </div>
              )}
            </div>

            {/* Meta info */}
            <div className="task-dialog__meta-info">
              <div>Created: {new Date(editedTask.createdAt).toLocaleDateString('sv-SE')}</div>
              <div>Updated: {new Date(editedTask.updatedAt).toLocaleDateString('sv-SE')}</div>
              <div>By: {editedTask.createdBy}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="task-dialog__footer">
          <div className="task-dialog__footer-left">
            {showDeleteConfirm ? (
              <div className="task-dialog__delete-confirm">
                <span>Delete this task?</span>
                <button className="task-dialog__btn task-dialog__btn--danger" onClick={handleDelete}>
                  Yes, delete
                </button>
                <button
                  className="task-dialog__btn task-dialog__btn--ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="task-dialog__btn task-dialog__btn--ghost task-dialog__btn--danger-text"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete task
              </button>
            )}
          </div>
          <div className="task-dialog__footer-right">
            <button className="task-dialog__btn task-dialog__btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="task-dialog__btn task-dialog__btn--primary" onClick={handleSave}>
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
