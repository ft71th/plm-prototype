/**
 * Whiteboard — Main whiteboard component.
 * Assembles WhiteboardToolbar + WhiteboardCanvas + PropertiesPanel.
 *
 * Drop this into your existing CanvasEditor as the "Whiteboard" tab/mode.
 *
 * Usage:
 *   import Whiteboard from './components/Whiteboard/Whiteboard';
 *   <Whiteboard />
 */

import React from 'react';
import WhiteboardCanvas from './WhiteboardCanvas';
import WhiteboardToolbar from './WhiteboardToolbar';
import PropertiesPanel from './PropertiesPanel';

export default function Whiteboard({ className = '', style = {} }) {
  return (
    <div
      className={`whiteboard ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#fafafa',
        ...style,
      }}
    >
      {/* Toolbar */}
      <WhiteboardToolbar />

      {/* Main area: Canvas + Properties */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>
        {/* Canvas (expands to fill) */}
        <WhiteboardCanvas
          className="whiteboard-main-canvas"
        />

        {/* Properties panel (fixed width, right side) */}
        <PropertiesPanel />
      </div>
    </div>
  );
}
