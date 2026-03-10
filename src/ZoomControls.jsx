/**
 * ZoomControls — Bottom-left zoom controls for the whiteboard.
 * Features: zoom in, zoom out, fit to content, reset to 100%, percentage display
 */

import React from 'react';
import useWhiteboardStore from '../../stores/whiteboardStore';

export default function ZoomControls() {
  const zoom = useWhiteboardStore((s) => s.zoom);
  const zoomIn = useWhiteboardStore((s) => s.zoomIn);
  const zoomOut = useWhiteboardStore((s) => s.zoomOut);
  const zoomToFit = useWhiteboardStore((s) => s.zoomToFit);
  const zoomReset = useWhiteboardStore((s) => s.zoomReset);
  const minimapVisible = useWhiteboardStore((s) => s.minimapVisible);
  const setMinimapVisible = useWhiteboardStore((s) => s.setMinimapVisible);

  const percent = Math.round(zoom * 100);

  return (
    <div style={styles.container}>
      <button onClick={zoomOut} style={styles.btn} title="Zooma ut (Ctrl+-)">
        −
      </button>

      <button onClick={zoomReset} style={styles.percentBtn} title="Återställ till 100%">
        {percent}%
      </button>

      <button onClick={zoomIn} style={styles.btn} title="Zooma in (Ctrl++)">
        +
      </button>

      <div style={styles.separator} />

      <button onClick={zoomToFit} style={styles.btn} title="Anpassa till innehåll (Ctrl+0)">
        ⊞
      </button>

      <button
        onClick={() => setMinimapVisible(!minimapVisible)}
        style={{ ...styles.btn, background: minimapVisible ? '#e3f2fd' : 'transparent' }}
        title={minimapVisible ? 'Dölj minimap' : 'Visa minimap'}
      >
        🗺
      </button>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    gap: '1px',
    background: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    border: '1px solid #e0e0e0',
    padding: '2px',
    userSelect: 'none',
  },
  btn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: '6px',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#333',
    transition: 'background 0.15s',
  },
  percentBtn: {
    minWidth: '48px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: '6px',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    color: '#555',
    padding: '0 4px',
  },
  separator: {
    width: '1px',
    height: '20px',
    background: '#e0e0e0',
    margin: '0 2px',
  },
};
