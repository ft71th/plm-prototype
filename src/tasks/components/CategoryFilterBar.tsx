// ============================================================================
// CategoryFilterBar — Search + category pill filter for task board
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useTaskContext } from '../TaskContext';

export default function CategoryFilterBar() {
  const {
    activeBoard, allTasks, categoryFilter, setCategoryFilter,
    searchFilter, setSearchFilter, theme,
    addCategory, updateCategory, deleteCategory,
  } = useTaskContext();

  const [showManage, setShowManage] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [newIcon, setNewIcon] = useState('📁');

  const categories = activeBoard?.categories || [];

  // Count tasks per category (unfiltered)
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: allTasks.length };
    allTasks.forEach((t) => {
      if (t.categoryId) {
        map[t.categoryId] = (map[t.categoryId] || 0) + 1;
      }
    });
    return map;
  }, [allTasks]);

  const PRESET_COLORS = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
    '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1',
  ];
  const PRESET_ICONS = ['⚡', '📡', '🛡️', '🖥️', '🔧', '✓', '📄', '📁', '🔌', '⚙️', '🧪', '📊'];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 16px',
      background: theme.bgSecondary,
      borderBottom: `1px solid ${theme.border}`,
      flexShrink: 0, flexWrap: 'wrap',
    }}>
      {/* Search */}
      <div style={{ position: 'relative', marginRight: 8 }}>
        <input
          style={{
            padding: '5px 10px 5px 28px',
            background: theme.bgTertiary,
            border: `1px solid ${theme.border}`,
            borderRadius: 6, color: theme.textPrimary,
            fontSize: 12, outline: 'none', width: 180,
            boxSizing: 'border-box',
          }}
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Search tasks..."
        />
        <span style={{
          position: 'absolute', left: 8, top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 12, color: theme.textMuted, pointerEvents: 'none',
        }}>🔍</span>
      </div>

      {/* "All" pill */}
      <PillButton
        active={categoryFilter === 'all'}
        color={theme.accent}
        theme={theme}
        onClick={() => setCategoryFilter('all')}
      >
        All ({counts.all || 0})
      </PillButton>

      {/* Category pills */}
      {categories.map((cat) => (
        <PillButton
          key={cat.id}
          active={categoryFilter === cat.id}
          color={cat.color}
          theme={theme}
          onClick={() => setCategoryFilter(categoryFilter === cat.id ? 'all' : cat.id)}
        >
          {cat.icon} {cat.name} {counts[cat.id] ? `(${counts[cat.id]})` : ''}
        </PillButton>
      ))}

      {/* Manage categories */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowManage(!showManage)}
          style={{
            padding: '4px 8px', borderRadius: 20,
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            border: `1px dashed ${theme.border}`,
            background: 'transparent', color: theme.textMuted,
          }}
          title="Manage categories"
        >
          +
        </button>
        {showManage && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            minWidth: 260, background: theme.bgTertiary,
            border: `1px solid ${theme.border}`, borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 300,
            padding: 12,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.04em', color: theme.textMuted, marginBottom: 8,
            }}>
              Manage Categories
            </div>

            {/* Existing categories */}
            {categories.map((cat) => (
              <div key={cat.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 0', borderBottom: `1px solid ${theme.border}`,
              }}>
                <span style={{ fontSize: 14 }}>{cat.icon}</span>
                <span style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: cat.color, flexShrink: 0,
                }} />
                <span style={{ flex: 1, fontSize: 12, color: theme.textPrimary }}>{cat.name}</span>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  style={{
                    background: 'none', border: 'none',
                    color: '#ef4444', cursor: 'pointer',
                    fontSize: 12, padding: '2px 4px',
                  }}
                  title="Delete"
                >✕</button>
              </div>
            ))}

            {/* Add new */}
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                style={{
                  padding: '6px 10px', background: theme.bgPrimary,
                  border: `1px solid ${theme.border}`, borderRadius: 4,
                  color: theme.textPrimary, fontSize: 12, outline: 'none',
                  boxSizing: 'border-box', width: '100%',
                }}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) {
                    addCategory(newName.trim(), newColor, newIcon);
                    setNewName('');
                  }
                }}
              />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map((c) => (
                  <button key={c} onClick={() => setNewColor(c)} style={{
                    width: 20, height: 20, borderRadius: '50%', background: c,
                    border: newColor === c ? '2px solid white' : '2px solid transparent',
                    cursor: 'pointer',
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {PRESET_ICONS.map((ic) => (
                  <button key={ic} onClick={() => setNewIcon(ic)} style={{
                    width: 24, height: 24, borderRadius: 4,
                    background: newIcon === ic ? theme.bgHover : 'transparent',
                    border: newIcon === ic ? `1px solid ${theme.accent}` : '1px solid transparent',
                    cursor: 'pointer', fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{ic}</button>
                ))}
              </div>
              <button
                disabled={!newName.trim()}
                onClick={() => {
                  if (newName.trim()) {
                    addCategory(newName.trim(), newColor, newIcon);
                    setNewName('');
                  }
                }}
                style={{
                  padding: '6px 12px', border: 'none', borderRadius: 4,
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  background: theme.accent, color: 'white',
                  opacity: newName.trim() ? 1 : 0.5,
                }}
              >Add Category</button>
            </div>

            <button
              onClick={() => setShowManage(false)}
              style={{
                marginTop: 8, display: 'block', width: '100%',
                padding: '5px', background: 'none',
                border: `1px solid ${theme.border}`, borderRadius: 4,
                color: theme.textMuted, fontSize: 11, cursor: 'pointer',
              }}
            >Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

function PillButton({ active, color, theme, onClick, children }: {
  active: boolean; color: string; theme: any;
  onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, cursor: 'pointer',
      border: '1px solid', transition: 'all 150ms',
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: active ? color + '22' : 'transparent',
      borderColor: active ? color : theme.border,
      color: active ? color : theme.textSecondary,
    }}>{children}</button>
  );
}
