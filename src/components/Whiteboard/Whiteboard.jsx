/**
 * Whiteboard — Main whiteboard component.
 * Assembles WhiteboardToolbar + WhiteboardCanvas + PropertiesPanel
 * + Minimap + ZoomControls + ExportImportDialog + TemplateDialog
 *
 * Deliverable 4: Added minimap, zoom controls, export/import, templates
 */

import React, { useRef } from 'react';
import WhiteboardCanvas from './WhiteboardCanvas';
import WhiteboardToolbar from './WhiteboardToolbar';
import PropertiesPanel from './PropertiesPanel';
import Minimap from './Minimap';
import ZoomControls from './ZoomControls';
import ExportImportDialog from './ExportImportDialog';
import TemplateDialog from './TemplateDialog';

export default function Whiteboard({ className = '', style = {} }) {
  const canvasRef = useRef(null);

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
        position: 'relative',
      }}>
        {/* Canvas (expands to fill) */}
        <WhiteboardCanvas
          className="whiteboard-main-canvas"
          canvasRef={canvasRef}
        />

        {/* Overlays (inside the canvas area) */}
        <Minimap />
        <ZoomControls />

        {/* Properties panel (fixed width, right side) */}
        <PropertiesPanel />
      </div>

      {/* Dialogs */}
      <ExportImportDialog canvasRef={canvasRef} />
      <TemplateDialog />
    </div>
  );
}
