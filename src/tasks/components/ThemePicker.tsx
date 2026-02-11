// ============================================================================
// ThemePicker — Dropdown for switching themes + creating custom ones
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { THEMES, ThemeKey, BoardTheme } from '../types';
import { useTaskContext } from '../TaskContext';

const DEFAULT_CUSTOM_BASE: BoardTheme = {
  name: '',
  bgPrimary: '#1a1d23',
  bgSecondary: '#22262e',
  bgTertiary: '#2a2f38',
  bgHover: '#323842',
  bgCard: '#282c34',
  bgCardHover: '#2e3440',
  border: '#383e4a',
  borderLight: '#2e3440',
  textPrimary: '#e4e8ef',
  textSecondary: '#9ca3b0',
  textMuted: '#6b7280',
  accent: '#3b82f6',
};

const FIELD_GROUPS: { label: string; keys: (keyof BoardTheme)[] }[] = [
  { label: 'Backgrounds', keys: ['bgPrimary', 'bgSecondary', 'bgTertiary', 'bgHover', 'bgCard', 'bgCardHover'] },
  { label: 'Borders', keys: ['border', 'borderLight'] },
  { label: 'Text', keys: ['textPrimary', 'textSecondary', 'textMuted'] },
  { label: 'Accent', keys: ['accent'] },
];

const FIELD_LABELS: Record<string, string> = {
  bgPrimary: 'Background',
  bgSecondary: 'Panels',
  bgTertiary: 'Menus',
  bgHover: 'Hover',
  bgCard: 'Card',
  bgCardHover: 'Card hover',
  border: 'Border',
  borderLight: 'Border light',
  textPrimary: 'Primary text',
  textSecondary: 'Secondary text',
  textMuted: 'Muted text',
  accent: 'Accent',
};

export default function ThemePicker() {
  const {
    themeKey, setThemeKey, theme,
    allThemes, customThemes,
    addCustomTheme, deleteCustomTheme,
  } = useTaskContext();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [newName, setNewName] = useState('');
  const [newTheme, setNewTheme] = useState<BoardTheme>({ ...DEFAULT_CUSTOM_BASE });
  const [baseKey, setBaseKey] = useState<string>('dark');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setView('list');
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLoadBase = (key: string) => {
    const base = allThemes[key] || THEMES.dark;
    setNewTheme({ ...base, name: newName || '' });
    setBaseKey(key);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    addCustomTheme(newName.trim(), newTheme);
    setNewName('');
    setNewTheme({ ...DEFAULT_CUSTOM_BASE });
    setView('list');
  };

  const setField = (key: keyof BoardTheme, val: string) => {
    setNewTheme((prev) => ({ ...prev, [key]: val }));
  };

  const allKeys = Object.keys(allThemes);
  const builtinKeys = Object.keys(THEMES);
  const customKeys = Object.keys(customThemes);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '5px 10px', background: theme.bgTertiary,
          border: `1px solid ${theme.border}`, borderRadius: 6,
          color: theme.textSecondary, fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
        }}
        title="Change theme"
      >
        🎨 Theme
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          minWidth: view === 'create' ? 320 : 180,
          maxHeight: view === 'create' ? '70vh' : 'none',
          overflowY: view === 'create' ? 'auto' : 'visible',
          background: theme.bgTertiary, border: `1px solid ${theme.border}`,
          borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 300, padding: '4px 0',
        }}>
          {view === 'list' && (
            <>
              {/* Built-in themes */}
              <div style={{
                padding: '6px 12px 4px', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                color: theme.textMuted,
              }}>
                Built-in
              </div>
              {builtinKeys.map((key) => {
                const t = THEMES[key as ThemeKey];
                return (
                  <button key={key}
                    onClick={() => { setThemeKey(key); setOpen(false); }}
                    style={themeItemStyle(themeKey === key, theme, t)}
                  >
                    <span style={swatchStyle(t)} />
                    {t.name}
                  </button>
                );
              })}

              {/* Custom themes */}
              {customKeys.length > 0 && (
                <>
                  <div style={{
                    padding: '8px 12px 4px', fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: theme.textMuted,
                  }}>
                    Custom
                  </div>
                  {customKeys.map((key) => {
                    const t = customThemes[key];
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                          onClick={() => { setThemeKey(key); setOpen(false); }}
                          style={{ ...themeItemStyle(themeKey === key, theme, t), flex: 1 }}
                        >
                          <span style={swatchStyle(t)} />
                          {t.name}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteCustomTheme(key); }}
                          style={{
                            background: 'none', border: 'none',
                            color: '#ef4444', cursor: 'pointer',
                            fontSize: 11, padding: '4px 8px',
                          }}
                          title="Delete theme"
                        >✕</button>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Create new */}
              <div style={{ height: 1, background: theme.border, margin: '4px 0' }} />
              <button
                onClick={() => {
                  setView('create');
                  setNewTheme({ ...THEMES.dark, name: '' });
                  setBaseKey('dark');
                }}
                style={{
                  display: 'block', width: '100%', padding: '8px 12px',
                  background: 'none', border: 'none',
                  color: theme.accent, fontSize: 13, textAlign: 'left' as const,
                  cursor: 'pointer',
                }}
              >
                + New theme
              </button>
            </>
          )}

          {view === 'create' && (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: theme.textPrimary,
                marginBottom: 2,
              }}>
                Create Custom Theme
              </div>

              {/* Name */}
              <input
                style={inputStyle(theme)}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Theme name..."
                autoFocus
              />

              {/* Base from existing */}
              <div>
                <div style={fieldLabelStyle(theme)}>Start from</div>
                <select
                  style={inputStyle(theme)}
                  value={baseKey}
                  onChange={(e) => handleLoadBase(e.target.value)}
                >
                  {allKeys.map((k) => (
                    <option key={k} value={k}>{allThemes[k].name}</option>
                  ))}
                </select>
              </div>

              {/* Color fields */}
              {FIELD_GROUPS.map((group) => (
                <div key={group.label}>
                  <div style={{
                    ...fieldLabelStyle(theme), marginTop: 4, marginBottom: 4,
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    {group.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {group.keys.map((key) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="color"
                          value={newTheme[key] as string}
                          onChange={(e) => setField(key, e.target.value)}
                          style={{
                            width: 28, height: 24, padding: 0,
                            border: `1px solid ${theme.border}`,
                            borderRadius: 4, cursor: 'pointer',
                            background: 'none',
                          }}
                        />
                        <span style={{ fontSize: 11, color: theme.textSecondary, flex: 1 }}>
                          {FIELD_LABELS[key] || key}
                        </span>
                        <span style={{
                          fontSize: 10, fontFamily: 'monospace',
                          color: theme.textMuted,
                        }}>
                          {(newTheme[key] as string).toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Preview mini */}
              <div style={{
                padding: 10, borderRadius: 6, marginTop: 4,
                background: newTheme.bgPrimary, border: `1px solid ${newTheme.border}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: newTheme.textMuted, marginBottom: 4 }}>
                  Preview
                </div>
                <div style={{
                  background: newTheme.bgCard, border: `1px solid ${newTheme.borderLight}`,
                  borderRadius: 4, padding: 8,
                }}>
                  <div style={{ fontSize: 11, color: newTheme.textPrimary, fontWeight: 500, marginBottom: 4 }}>
                    Sample task card
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{
                      fontSize: 9, padding: '1px 6px', borderRadius: 3,
                      background: newTheme.accent, color: 'white', fontWeight: 600,
                    }}>Label</span>
                    <span style={{ fontSize: 9, color: newTheme.textMuted }}>
                      📅 2026-03-01
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                <button
                  onClick={() => { setView('list'); setNewName(''); }}
                  style={{
                    flex: 1, padding: '7px 12px',
                    border: `1px solid ${theme.border}`, borderRadius: 6,
                    background: 'transparent', color: theme.textSecondary,
                    fontSize: 12, cursor: 'pointer',
                  }}
                >Cancel</button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  style={{
                    flex: 1, padding: '7px 12px',
                    border: 'none', borderRadius: 6,
                    background: theme.accent, color: 'white',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    opacity: newName.trim() ? 1 : 0.5,
                  }}
                >Create</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helpers
function themeItemStyle(active: boolean, theme: any, t: BoardTheme): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: '8px 12px',
    background: active ? theme.accent + '22' : 'none',
    border: 'none',
    color: active ? theme.accent : theme.textPrimary,
    fontSize: 13, textAlign: 'left', cursor: 'pointer',
  };
}

function swatchStyle(t: BoardTheme): React.CSSProperties {
  return {
    width: 16, height: 16, borderRadius: 4,
    background: t.bgPrimary, border: `2px solid ${t.border}`,
    flexShrink: 0,
  };
}

function inputStyle(theme: any): React.CSSProperties {
  return {
    padding: '6px 10px', background: theme.bgPrimary,
    border: `1px solid ${theme.border}`, borderRadius: 4,
    color: theme.textPrimary, fontSize: 12, outline: 'none',
    width: '100%', boxSizing: 'border-box',
  };
}

function fieldLabelStyle(theme: any): React.CSSProperties {
  return {
    fontSize: 11, color: theme.textMuted, marginBottom: 3,
  };
}
