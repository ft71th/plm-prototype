// ═══════════════════════════════════════════
// NORTHLIGHT GLOBAL THEME
// ═══════════════════════════════════════════

export interface NorthlightTheme {
  // Identity
  key: 'dark' | 'light';
  // Backgrounds
  bgApp: string;          // outermost wrapper
  bgHeader: string;       // top header bar
  bgHeaderBorder: string; // header bottom border
  bgSidebar: string;      // left icon strip / sidebar
  bgCanvas: string;       // ReactFlow / whiteboard canvas
  bgPanel: string;        // floating panels, modals
  bgInput: string;        // input fields
  bgHover: string;        // hover state
  bgAccent: string;       // active tab / selected item
  bgToast: string;        // toast / notification
  bgOverlay: string;      // modal overlay
  // Text
  textPrimary: string;    // main text
  textSecondary: string;  // labels, secondary info
  textMuted: string;      // placeholders, disabled
  textInverse: string;    // text on accent bg
  // Borders
  border: string;         // default border
  borderLight: string;    // subtle separator
  borderFocus: string;    // focused input
  // Accent (stays same in both themes)
  accent: string;         // primary action color
  accentHover: string;
  // Semantic
  success: string;
  warning: string;
  danger: string;
  info: string;
  // Minimap
  minimapBg: string;
  minimapMask: string;
  // Shadows
  shadow: string;
  shadowLg: string;
}

export const darkTheme: NorthlightTheme = {
  key: 'dark',
  bgApp: '#1a1a2e',
  bgHeader: '#2c3e50',
  bgHeaderBorder: '#34495e',
  bgSidebar: 'rgba(44, 62, 80, 0.92)',
  bgCanvas: '#1a1a2e',
  bgPanel: '#1e293b',
  bgInput: '#2c3e50',
  bgHover: 'rgba(255,255,255,0.08)',
  bgAccent: '#3498db',
  bgToast: '#2c3e50',
  bgOverlay: 'rgba(0,0,0,0.6)',
  textPrimary: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textInverse: '#ffffff',
  border: '#4a5f7f',
  borderLight: '#334155',
  borderFocus: '#3498db',
  accent: '#3498db',
  accentHover: '#2980b9',
  success: '#27ae60',
  warning: '#f39c12',
  danger: '#e74c3c',
  info: '#3498db',
  minimapBg: '#ecf0f1',
  minimapMask: 'rgba(0,0,0,0.2)',
  shadow: '0 2px 8px rgba(0,0,0,0.3)',
  shadowLg: '0 8px 24px rgba(0,0,0,0.4)',
};

export const lightTheme: NorthlightTheme = {
  key: 'light',
  bgApp: '#f1f5f9',
  bgHeader: '#ffffff',
  bgHeaderBorder: '#e2e8f0',
  bgSidebar: 'rgba(255, 255, 255, 0.95)',
  bgCanvas: '#f8fafc',
  bgPanel: '#ffffff',
  bgInput: '#f1f5f9',
  bgHover: 'rgba(0,0,0,0.04)',
  bgAccent: '#3498db',
  bgToast: '#ffffff',
  bgOverlay: 'rgba(0,0,0,0.3)',
  textPrimary: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textInverse: '#ffffff',
  border: '#cbd5e1',
  borderLight: '#e2e8f0',
  borderFocus: '#3498db',
  accent: '#3498db',
  accentHover: '#2980b9',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#2563eb',
  minimapBg: '#ffffff',
  minimapMask: 'rgba(0,0,0,0.08)',
  shadow: '0 2px 8px rgba(0,0,0,0.08)',
  shadowLg: '0 8px 24px rgba(0,0,0,0.12)',
};

export function getTheme(isDark: boolean): NorthlightTheme {
  return isDark ? darkTheme : lightTheme;
}
