import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import useSequenceDiagram from './hooks/useSequenceDiagram';
import {
  ParticipantRenderer, MessageRenderer, FragmentRenderer, MarkerDefs,
} from './renderers/SequenceRenderers';
import SequenceToolbar from './SequenceToolbar';
import SequenceProperties from './SequenceProperties';
import { LAYOUT } from './sequenceTypes';
import type { MessageType, FragmentType } from './sequenceTypes';

interface SequenceViewProps {
  projectId: string | null;
  nodes?: any[];     // PLM nodes for linking
  edges?: any[];     // PLM edges for auto-generate
  style?: React.CSSProperties;
}

type Tool = 'select' | 'addParticipant' | 'addMessage' | 'addFragment';

export default function SequenceView({ projectId, nodes = [], edges = [], style }: SequenceViewProps) {
  const sd = useSequenceDiagram(projectId);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & zoom state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1400, h: 800 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 });

  // Tools
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [messageType, setMessageType] = useState<MessageType>('sync');
  const [fragmentType, setFragmentType] = useState<FragmentType>('alt');

  // Message creation state (click source → click target)
  const [msgSource, setMsgSource] = useState<string | null>(null);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Participant dragging
  const [dragParticipantId, setDragParticipantId] = useState<string | null>(null);
  const [dragTargetOrder, setDragTargetOrder] = useState<number | null>(null);

  // Show node picker for adding participant from PLM
  const [showNodePicker, setShowNodePicker] = useState(false);

  // Diagram selector
  const [showDiagramMenu, setShowDiagramMenu] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  // Create initial diagram if none exist
  useEffect(() => {
    if (sd.diagrams.length === 0) {
      sd.createDiagram('Sequence Diagram 1');
    }
  }, []);

  const diagram = sd.activeDiagram;
  const participants = useMemo(
    () => diagram ? [...diagram.participants].sort((a, b) => a.order - b.order) : [],
    [diagram]
  );
  const messages = useMemo(
    () => diagram ? [...diagram.messages].sort((a, b) => a.orderIndex - b.orderIndex) : [],
    [diagram]
  );

  // Calculate canvas bounds
  const maxMessageY = useMemo(() => {
    if (messages.length === 0) return LAYOUT.MESSAGE_START_Y + 100;
    return LAYOUT.MESSAGE_START_Y + (Math.max(...messages.map(m => m.orderIndex)) + 1) * LAYOUT.MESSAGE_SPACING;
  }, [messages]);

  const canvasWidth = useMemo(() => {
    if (participants.length === 0) return 600;
    return Math.max(600, participants.length * LAYOUT.PARTICIPANT_GAP + LAYOUT.CANVAS_PADDING * 2);
  }, [participants]);

  // ─── Fit to window ───
  const fitToWindow = useCallback(() => {
    const pad = 40;
    const contentMinX = participants.length > 0
      ? Math.min(...participants.map(p => p.x)) - pad
      : -pad;
    const contentMaxX = participants.length > 0
      ? Math.max(...participants.map(p => p.x)) + LAYOUT.PARTICIPANT_WIDTH + pad
      : canvasWidth + pad;
    const contentMinY = LAYOUT.PARTICIPANT_Y - pad;
    const contentMaxY = maxMessageY + 60 + pad;

    const contentW = Math.max(200, contentMaxX - contentMinX);
    const contentH = Math.max(200, contentMaxY - contentMinY);

    // Maintain aspect ratio based on container
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const aspect = rect.width / rect.height;
      const contentAspect = contentW / contentH;
      if (contentAspect > aspect) {
        // Content is wider — fit width, center vertically
        const h = contentW / aspect;
        setViewBox({ x: contentMinX, y: contentMinY - (h - contentH) / 2, w: contentW, h });
      } else {
        // Content is taller — fit height, center horizontally
        const w = contentH * aspect;
        setViewBox({ x: contentMinX - (w - contentW) / 2, y: contentMinY, w, h: contentH });
      }
    } else {
      setViewBox({ x: contentMinX, y: contentMinY, w: contentW, h: contentH });
    }
  }, [participants, maxMessageY, canvasWidth]);

  // ─── Pan & Zoom ───
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x;
    const my = ((e.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y;

    const newW = viewBox.w * scaleFactor;
    const newH = viewBox.h * scaleFactor;
    setViewBox({
      x: mx - (mx - viewBox.x) * scaleFactor,
      y: my - (my - viewBox.y) * scaleFactor,
      w: Math.max(200, Math.min(5000, newW)),
      h: Math.max(200, Math.min(5000, newH)),
    });
  }, [viewBox]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Right-click, middle-button, or alt+click for pan
    if (e.button === 2 || e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y });
      e.preventDefault();
    }
  }, [viewBox]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - panStart.x) / rect.width) * viewBox.w;
      const dy = ((e.clientY - panStart.y) / rect.height) * viewBox.h;
      setViewBox(vb => ({ ...vb, x: panStart.vx - dx, y: panStart.vy - dy }));
      return;
    }

    // Participant dragging — reorder by x position
    if (dragParticipantId && participants.length > 1) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x;
      // Find which order slot this x maps to
      const targetOrder = Math.round(Math.max(0, Math.min(
        participants.length - 1,
        (svgX - LAYOUT.CANVAS_PADDING + LAYOUT.PARTICIPANT_GAP / 2) / LAYOUT.PARTICIPANT_GAP
      )));
      setDragTargetOrder(targetOrder);
    }
  }, [isPanning, panStart, viewBox, dragParticipantId, participants]);

  const handleMouseUp = useCallback(() => {
    // Finish participant drag — actually reorder
    if (dragParticipantId && dragTargetOrder !== null) {
      const draggedP = participants.find(p => p.id === dragParticipantId);
      if (draggedP && draggedP.order !== dragTargetOrder) {
        sd.reorderParticipants(draggedP.order, dragTargetOrder);
      }
    }
    setIsPanning(false);
    setDragParticipantId(null);
    setDragTargetOrder(null);
  }, [dragParticipantId, dragTargetOrder, participants, sd]);

  // Prevent context menu on canvas (so right-click pan works)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // ─── SVG coordinate helper ───
  const svgPoint = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x,
      y: ((e.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y,
    };
  }, [viewBox]);

  // ─── Click handlers ───
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'select') {
      sd.select(null);
      setMsgSource(null);
    }
    // If we're in message mode with a source but clicking canvas — cancel
    if (activeTool === 'addMessage' && msgSource) {
      setMsgSource(null);
    }
  }, [activeTool, msgSource, sd]);

  const handleParticipantClick = useCallback((e: React.MouseEvent, pid: string) => {
    e.stopPropagation();

    if (activeTool === 'addMessage') {
      if (!msgSource) {
        // First click — set source
        setMsgSource(pid);
      } else {
        // Second click — create message
        const label = prompt('Meddelandetext:', 'call()') || 'call()';
        sd.addMessage(msgSource, pid, label, messageType);
        setMsgSource(null);
      }
      return;
    }

    sd.select(pid, 'participant');
  }, [activeTool, msgSource, messageType, sd]);

  const handleParticipantDoubleClick = useCallback((e: React.MouseEvent, pid: string) => {
    e.stopPropagation();
    const p = participants.find(x => x.id === pid);
    if (!p) return;
    setEditingId(pid);
    setEditText(p.label);
    setTimeout(() => editInputRef.current?.focus(), 50);
  }, [participants]);

  const handleParticipantDragStart = useCallback((e: React.MouseEvent, pid: string) => {
    if (e.button !== 0 || activeTool !== 'select') return;
    e.stopPropagation();
    setDragParticipantId(pid);
  }, [activeTool]);

  const handleMessageClick = useCallback((e: React.MouseEvent, mid: string) => {
    e.stopPropagation();
    sd.select(mid, 'message');
  }, [sd]);

  const handleMessageDoubleClick = useCallback((e: React.MouseEvent, mid: string) => {
    e.stopPropagation();
    const m = messages.find(x => x.id === mid);
    if (!m) return;
    setEditingId(mid);
    setEditText(m.label);
    setTimeout(() => editInputRef.current?.focus(), 50);
  }, [messages]);

  const handleFragmentClick = useCallback((e: React.MouseEvent, fid: string) => {
    e.stopPropagation();
    sd.select(fid, 'fragment');
  }, [sd]);

  // ─── Finish inline edit ───
  const finishEdit = useCallback(() => {
    if (!editingId) return;
    // Check if it's a participant or message
    const p = participants.find(x => x.id === editingId);
    if (p) {
      sd.updateParticipant(editingId, { label: editText });
    }
    const m = messages.find(x => x.id === editingId);
    if (m) {
      sd.updateMessage(editingId, { label: editText });
    }
    setEditingId(null);
    setEditText('');
  }, [editingId, editText, participants, messages, sd]);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when editing inline or typing in any input
      if (editingId) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'v' || e.key === 'Escape') setActiveTool('select');
      if (e.key === 'p') setActiveTool('addParticipant');
      if (e.key === 'm') setActiveTool('addMessage');
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey) { fitToWindow(); return; }
      if (e.key === 'g') setActiveTool('addFragment');
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (sd.selectedElementType === 'participant' && sd.selectedElementId) sd.removeParticipant(sd.selectedElementId);
        if (sd.selectedElementType === 'message' && sd.selectedElementId) sd.removeMessage(sd.selectedElementId);
        if (sd.selectedElementType === 'fragment' && sd.selectedElementId) sd.removeFragment(sd.selectedElementId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingId, sd, fitToWindow]);

  // ─── Export helpers ───
  const handleExportPlantUML = useCallback(() => {
    const uml = sd.exportPlantUML();
    navigator.clipboard.writeText(uml).then(() => {
      alert('PlantUML kopierat till urklipp!');
    }).catch(() => {
      // Fallback: show in a prompt
      prompt('PlantUML:', uml);
    });
  }, [sd]);

  const handleExportSVG = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diagram?.name || 'sequence'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [diagram]);

  // ─── Auto-generate from PLM ───
  const handleAutoGenerate = useCallback(() => {
    if (nodes.length === 0) {
      alert('Inga PLM-noder att generera från. Öppna ett projekt med noder först.');
      return;
    }
    if (diagram && (diagram.participants.length > 0 || diagram.messages.length > 0)) {
      if (!confirm('Detta ersätter befintligt diagram. Fortsätt?')) return;
    }
    sd.generateFromEdges(nodes, edges);
  }, [nodes, edges, diagram, sd]);

  // ─── Render ───
  return (
    <div ref={containerRef} style={{
      position: 'relative', width: '100%', height: '100%',
      background: 'var(--nl-bg-canvas, #f8fafc)', overflow: 'hidden',
      ...style,
    }}>
      {/* Diagram selector (top bar) */}
      <div style={{
        position: 'absolute', top: 8, left: 180, right: 310, zIndex: 2300,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDiagramMenu(!showDiagramMenu)}
            style={{
              padding: '6px 12px', background: 'var(--nl-bg-panel, #ffffff)', border: '1px solid var(--nl-border, #d1d5db)',
              borderRadius: 6, color: 'var(--nl-text-primary, #1e293b)', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            📊 {diagram?.name || 'Inget diagram'}
            <span style={{ fontSize: 9, color: '#94a3b8' }}>▼</span>
          </button>

          {showDiagramMenu && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4,
              background: 'var(--nl-bg-panel, #ffffff)', border: '1px solid var(--nl-border, #d1d5db)', borderRadius: 6,
              minWidth: 220, zIndex: 3000, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}>
              {sd.diagrams.map(d => (
                <div key={d.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 10px', cursor: 'pointer',
                    background: d.id === sd.activeDiagramId ? '#f1f5f9' : 'transparent',
                  }}
                >
                  {renamingId === d.id ? (
                    <input
                      value={renameText}
                      onChange={e => setRenameText(e.target.value)}
                      onBlur={() => { sd.renameDiagram(d.id, renameText); setRenamingId(null); }}
                      onKeyDown={e => { if (e.key === 'Enter') { sd.renameDiagram(d.id, renameText); setRenamingId(null); } }}
                      autoFocus
                      style={{ background: 'var(--nl-bg-canvas, #f8fafc)', border: '1px solid #3b82f6', borderRadius: 3, color: 'var(--nl-text-primary, #1e293b)', fontSize: 11, padding: '2px 6px', outline: 'none', width: '70%' }}
                    />
                  ) : (
                    <span
                      onClick={() => { sd.setActiveDiagramId(d.id); setShowDiagramMenu(false); }}
                      onDoubleClick={() => { setRenamingId(d.id); setRenameText(d.name); }}
                      style={{ color: 'var(--nl-text-primary, #1e293b)', fontSize: 11, flex: 1 }}
                    >
                      {d.name}
                    </span>
                  )}
                  {sd.diagrams.length > 1 && (
                    <button
                      onClick={e => { e.stopPropagation(); sd.deleteDiagram(d.id); }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}
                    >×</button>
                  )}
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e2e8f0', padding: '6px 10px' }}>
                <button
                  onClick={() => { sd.createDiagram(`Sequence Diagram ${sd.diagrams.length + 1}`); setShowDiagramMenu(false); }}
                  style={{
                    width: '100%', padding: '4px 8px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: 4, color: '#15803d', fontSize: 10, cursor: 'pointer',
                  }}
                >+ Nytt diagram</button>
              </div>
            </div>
          )}
        </div>

        {/* Message creation hint */}
        {activeTool === 'addMessage' && msgSource && (
          <div style={{
            padding: '4px 10px', background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: 6, color: '#1d4ed8', fontSize: 11,
          }}>
            Klicka på mål-deltagare →
            {' '}
            <button onClick={() => setMsgSource(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11 }}>Avbryt</button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <SequenceToolbar
        activeTool={activeTool}
        onToolChange={t => { setActiveTool(t); setMsgSource(null); }}
        onAddParticipant={label => sd.addParticipant(label)}
        onAddParticipantFromNode={() => setShowNodePicker(true)}
        messageType={messageType}
        onMessageTypeChange={setMessageType}
        fragmentType={fragmentType}
        onFragmentTypeChange={setFragmentType}
        onAutoGenerate={handleAutoGenerate}
        onFitToWindow={fitToWindow}
        onExportPlantUML={handleExportPlantUML}
        onExportSVG={handleExportSVG}
        participantCount={participants.length}
        messageCount={messages.length}
      />

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        style={{
          width: '100%', height: '100%',
          cursor: isPanning ? 'grabbing'
            : dragParticipantId ? 'grabbing'
            : activeTool === 'addMessage' && msgSource ? 'crosshair'
            : 'default',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        onContextMenu={handleContextMenu}
      >
        <MarkerDefs />

        {/* Grid */}
        <defs>
          <pattern id="seqGrid" width="50" height="50" patternUnits="userSpaceOnUse">
            <line x1="50" y1="0" x2="50" y2="50" stroke="#e2e8f0" strokeWidth={0.5} />
            <line x1="0" y1="50" x2="50" y2="50" stroke="#e2e8f0" strokeWidth={0.5} />
          </pattern>
        </defs>
        <rect x={viewBox.x - 500} y={viewBox.y - 500} width={viewBox.w + 1000} height={viewBox.h + 1000}
          fill="url(#seqGrid)" />

        {/* Fragments (behind messages) */}
        {diagram?.fragments.map(f => (
          <FragmentRenderer
            key={f.id}
            fragment={f}
            participants={participants}
            isSelected={sd.selectedElementId === f.id}
            onClick={e => handleFragmentClick(e, f.id)}
          />
        ))}

        {/* Participants + lifelines */}
        {participants.map(p => (
          <ParticipantRenderer
            key={p.id}
            participant={p}
            maxY={maxMessageY}
            isSelected={sd.selectedElementId === p.id}
            isDragTarget={activeTool === 'addMessage' && msgSource === p.id}
            isDragging={dragParticipantId === p.id}
            onMouseDown={e => handleParticipantDragStart(e, p.id)}
            onClick={e => handleParticipantClick(e, p.id)}
            onDoubleClick={e => handleParticipantDoubleClick(e, p.id)}
          />
        ))}

        {/* Drag drop indicator */}
        {dragParticipantId && dragTargetOrder !== null && (
          <line
            x1={LAYOUT.CANVAS_PADDING + dragTargetOrder * LAYOUT.PARTICIPANT_GAP + LAYOUT.PARTICIPANT_WIDTH / 2}
            y1={LAYOUT.PARTICIPANT_Y - 8}
            x2={LAYOUT.CANVAS_PADDING + dragTargetOrder * LAYOUT.PARTICIPANT_GAP + LAYOUT.PARTICIPANT_WIDTH / 2}
            y2={LAYOUT.PARTICIPANT_Y + LAYOUT.PARTICIPANT_HEIGHT + 8}
            stroke="#3b82f6" strokeWidth={3} strokeLinecap="round"
            opacity={0.6}
          />
        )}

        {/* Messages */}
        {messages.map(m => (
          <MessageRenderer
            key={m.id}
            message={m}
            participants={participants}
            isSelected={sd.selectedElementId === m.id}
            onClick={e => handleMessageClick(e, m.id)}
            onDoubleClick={e => handleMessageDoubleClick(e, m.id)}
          />
        ))}

        {/* Empty state */}
        {participants.length === 0 && (
          <g>
            <text x={viewBox.x + viewBox.w / 2} y={viewBox.y + viewBox.h / 2 - 20}
              textAnchor="middle" fill="#94a3b8" fontSize={16}>
              📊 Tomt sekvensdiagram
            </text>
            <text x={viewBox.x + viewBox.w / 2} y={viewBox.y + viewBox.h / 2 + 10}
              textAnchor="middle" fill="#cbd5e1" fontSize={12}>
              Lägg till deltagare med 👤-verktyget eller tryck P
            </text>
            <text x={viewBox.x + viewBox.w / 2} y={viewBox.y + viewBox.h / 2 + 30}
              textAnchor="middle" fill="#cbd5e1" fontSize={12}>
              Eller klicka ⚡ Auto-gen för att generera från PLM-noder
            </text>
          </g>
        )}
      </svg>

      {/* Inline edit overlay */}
      {editingId && (() => {
        // Position the input over the element
        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        const p = participants.find(x => x.id === editingId);
        const m = messages.find(x => x.id === editingId);
        let cx = 0, cy = 0;
        if (p) {
          cx = p.x + LAYOUT.PARTICIPANT_WIDTH / 2;
          cy = LAYOUT.PARTICIPANT_Y + LAYOUT.PARTICIPANT_HEIGHT / 2;
        } else if (m) {
          const fromP = participants.find(x => x.id === m.fromId);
          const toP = participants.find(x => x.id === m.toId);
          if (fromP && toP) {
            cx = (fromP.x + toP.x + LAYOUT.PARTICIPANT_WIDTH) / 2;
            cy = LAYOUT.MESSAGE_START_Y + m.orderIndex * LAYOUT.MESSAGE_SPACING - 8;
          }
        }

        // Convert SVG coords to screen coords
        const screenX = ((cx - viewBox.x) / viewBox.w) * rect.width + rect.left;
        const screenY = ((cy - viewBox.y) / viewBox.h) * rect.height + rect.top;

        return (
          <input
            ref={editInputRef}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onBlur={finishEdit}
            onKeyDown={e => { if (e.key === 'Enter') finishEdit(); if (e.key === 'Escape') { setEditingId(null); setEditText(''); } }}
            style={{
              position: 'fixed',
              left: screenX - 80, top: screenY - 12,
              width: 160, padding: '4px 8px',
              background: 'var(--nl-bg-panel, #ffffff)', border: '2px solid #3b82f6', borderRadius: 4,
              color: 'var(--nl-text-primary, #1e293b)', fontSize: 12, textAlign: 'center', outline: 'none',
              zIndex: 3000,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          />
        );
      })()}

      {/* Node picker modal */}
      {showNodePicker && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'var(--nl-bg-panel, #ffffff)', border: '1px solid var(--nl-border, #d1d5db)', borderRadius: 10,
          padding: 20, width: 340, maxHeight: 400, overflowY: 'auto', zIndex: 3500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--nl-text-primary, #1e293b)', fontSize: 14, fontWeight: 600 }}>Välj PLM-nod</span>
            <button onClick={() => setShowNodePicker(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
          {nodes
            .filter(n => ['system','subsystem','function','actor','hardware'].includes(n.data?.itemType || n.data?.type))
            .map(n => (
              <div
                key={n.id}
                onClick={() => {
                  sd.addParticipant(n.data?.label || 'Unknown', n.id, n.data?.itemType || n.data?.type);
                  setShowNodePicker(false);
                }}
                style={{
                  padding: '8px 10px', cursor: 'pointer', borderRadius: 4,
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 2, transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: n.data?.itemType === 'system' ? '#1abc9c' :
                              n.data?.itemType === 'function' ? '#00bcd4' :
                              n.data?.itemType === 'actor' ? '#2ecc71' : '#795548',
                }} />
                <div>
                  <div style={{ color: 'var(--nl-text-primary, #1e293b)', fontSize: 12 }}>{n.data?.label}</div>
                  <div style={{ color: '#94a3b8', fontSize: 9 }}>{n.data?.itemType || n.data?.type} · {n.data?.reqId || n.id}</div>
                </div>
              </div>
            ))
          }
          {nodes.filter(n => ['system','subsystem','function','actor','hardware'].includes(n.data?.itemType || n.data?.type)).length === 0 && (
            <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 20 }}>Inga PLM-noder tillgängliga</div>
          )}
        </div>
      )}

      {/* Properties Panel */}
      <SequenceProperties
        elementType={sd.selectedElementType}
        element={sd.selectedElement}
        participants={participants}
        onUpdateParticipant={sd.updateParticipant}
        onUpdateMessage={sd.updateMessage}
        onUpdateFragment={sd.updateFragment}
        onRemoveParticipant={sd.removeParticipant}
        onRemoveMessage={sd.removeMessage}
        onRemoveFragment={sd.removeFragment}
        plmNodes={nodes}
      />
    </div>
  );
}
