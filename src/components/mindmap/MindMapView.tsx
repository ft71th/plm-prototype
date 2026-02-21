// ═══════════════════════════════════════════════════════════════
// Northlight Mind Map View
// SVG-based hierarchical kravträd, Miro-inspired
// Pan: right-click / middle-click (matches ReactFlow panOnDrag={[1,2]})
// Theme: reads from global Zustand store
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import useMindMapData from './useMindMapData';
import MindMapToolbar from './MindMapToolbar';
import type {
  MindMapNodeLayout, MindMapEdge as MMEdge, MindMapLayout,
  MindMapComment, ContextMenuAction,
} from './mindmapTypes';
import {
  getNodeWidth, getNodeHeight, getHorizontalBezier, getVerticalBezier,
} from './treeLayout';
import { HVAS_SAMPLE_DATA } from './hvasSampleData';
import useStore from '../../store';

// ─── Props (same pattern as SequenceView) ───

interface MindMapViewProps {
  projectId: string | null;
  nodes?: any[];
  edges?: any[];
  style?: React.CSSProperties;
}

// ─── Comment badge colors ───

const CSTYLES: Record<string, { bg: string; border: string; icon: string }> = {
  issue:    { bg: '#fef2f2', border: '#fca5a5', icon: '⚠️' },
  question: { bg: '#eff6ff', border: '#93c5fd', icon: '❓' },
  action:   { bg: '#fefce8', border: '#fde047', icon: '📋' },
  info:     { bg: '#f0fdf4', border: '#86efac', icon: 'ℹ️' },
};

// ═══════════════════════════════════════════════════════════════

export default function MindMapView({ projectId, nodes: plmNodes, edges: plmEdges, style }: MindMapViewProps) {
  const mm = useMindMapData(projectId, HVAS_SAMPLE_DATA);
  const { colors, themeMode } = useStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const isDark = themeMode === 'dark';

  // Pan state — right-click (2) or middle-click (1)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  // Context menu (only on node right-click)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  // Drag state — left-click on nodes
  const [dragState, setDragState] = useState<{
    nodeId: string;
    startX: number;      // screen coords at drag start
    startY: number;
    lastX: number;       // last screen coords (for delta)
    lastY: number;
    isDragging: boolean;  // false until 5px threshold
  } | null>(null);

  // ── Fit to view ──
  const fitView = useCallback(() => {
    if (!svgRef.current || mm.nodes.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const padding = 80;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of mm.nodes) {
      const w = getNodeWidth(n);
      const h = getNodeHeight(n);
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + w + 30); // collapse button
      maxY = Math.max(maxY, n.y + h);
    }

    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const canvasW = rect.width;
    const canvasH = rect.height - 48; // toolbar height

    const zoom = Math.min(canvasW / contentW, canvasH / contentH, 1.2);
    const panX = (canvasW - contentW * zoom) / 2 - (minX - padding) * zoom;
    const panY = (canvasH - contentW * zoom) / 2 - (minY - padding) * zoom + 48;

    // Center vertically properly
    const panYFixed = (canvasH - contentH * zoom) / 2 - (minY - padding) * zoom;
    mm.setViewport(() => ({ panX, panY: panYFixed, zoom }));
  }, [mm.nodes]);

  // ── Pan & Zoom & Drag ──

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Right-click (2) or middle-click (1) on background → pan
    if (e.button === 2 || e.button === 1) {
      const t = e.target as SVGElement;
      if (t.tagName === 'svg' || t.classList.contains('mm-bg') || t.closest('[data-mm-grid]')) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - mm.viewport.panX, y: e.clientY - mm.viewport.panY });
        e.preventDefault();
      }
    }
    // Left-click on background → deselect
    if (e.button === 0) {
      const t = e.target as SVGElement;
      if (t.tagName === 'svg' || t.classList.contains('mm-bg') || t.closest('[data-mm-grid]')) {
        mm.setSelectedId(null);
        setCtxMenu(null);
      }
    }
  }, [mm.viewport.panX, mm.viewport.panY]);

  const startNodeDrag = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0 || editingId) return; // only left-click, not while editing
    e.stopPropagation();
    mm.setSelectedId(nodeId);
    setDragState({
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      isDragging: false,
    });
  }, [editingId]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      mm.setViewport(v => ({ ...v, panX: e.clientX - panStart.x, panY: e.clientY - panStart.y }));
      return;
    }
    if (dragState) {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!dragState.isDragging && dist < 5) return; // threshold

      // Delta since last move, in canvas coords (account for zoom)
      const moveDx = (e.clientX - dragState.lastX) / mm.viewport.zoom;
      const moveDy = (e.clientY - dragState.lastY) / mm.viewport.zoom;

      mm.moveNode(dragState.nodeId, moveDx, moveDy, true);

      setDragState(prev => prev ? {
        ...prev,
        lastX: e.clientX,
        lastY: e.clientY,
        isDragging: true,
      } : null);
    }
  }, [isPanning, panStart, dragState, mm.viewport.zoom]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) { setIsPanning(false); e.preventDefault(); }
    if (dragState) {
      // If we never crossed the 5px threshold, it's a click (already handled by startNodeDrag)
      setDragState(null);
    }
  }, [isPanning, dragState]);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    mm.setViewport(v => ({
      ...v,
      zoom: Math.max(0.1, Math.min(2.5, v.zoom + (e.deltaY > 0 ? -0.05 : 0.05))),
    }));
  }, []);

  // ── Inline edit ──

  useEffect(() => {
    if (editingId && editRef.current) { editRef.current.focus(); editRef.current.select(); }
  }, [editingId]);

  const startEdit = (nodeId: string, label: string) => { setEditingId(nodeId); setEditText(label); };
  const confirmEdit = () => {
    if (editingId && editText.trim()) mm.renameNode(editingId, editText.trim());
    setEditingId(null);
  };

  // ── Context menu actions ──

  const getActions = useCallback((nodeId: string): ContextMenuAction[] => {
    const n = mm.nodeMap.get(nodeId);
    if (!n) return [];
    const isRoot = n.depth === 0;
    const actions: ContextMenuAction[] = [
      { label: 'Add Child', icon: '➕', action: () => mm.addChild(nodeId) },
    ];
    if (!isRoot) actions.push({ label: 'Add Sibling', icon: '↔', action: () => mm.addSibling(nodeId) });
    if (n.hasChildren) actions.push({
      label: mm.collapsed.has(nodeId) ? 'Expand' : 'Collapse',
      icon: mm.collapsed.has(nodeId) ? '⊞' : '⊟',
      action: () => mm.toggleCollapse(nodeId), divider: true,
    });
    const clrs = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899'];
    actions.push({
      label: 'Change Color', icon: '🎨',
      action: () => mm.setNodeColor(nodeId, clrs[(clrs.indexOf(n.color) + 1) % clrs.length]),
      divider: true,
    });
    actions.push(
      { label: 'Question', icon: '❓', action: () => { const t = prompt('Enter question:'); if (t) mm.addComment(nodeId, { text: t, type: 'question', status: 'open' }); }},
      { label: 'Action', icon: '📋', action: () => { const t = prompt('Action:'); const a = prompt('Assigned to:'); if (t) mm.addComment(nodeId, { text: t, author: a || undefined, type: 'action', status: 'open' }); }},
      { label: 'Issue', icon: '⚠️', action: () => { const t = prompt('Issue:'); const a = prompt('Reported by:'); if (t) mm.addComment(nodeId, { text: t, author: a || undefined, type: 'issue', status: 'open' }); }},
    );
    actions.push({ label: 'Link Requirement ID', icon: '🔗', action: () => { const r = prompt('Requirement ID (e.g. 1.301.001 T):'); if (r) mm.setNodeReqId(nodeId, r); }, divider: true });
    if (!isRoot) actions.push({ label: 'Delete', icon: '🗑️', action: () => { if (confirm(`Delete "${n.label}"?`)) mm.deleteNode(nodeId); }, divider: true, danger: true });
    return actions;
  }, [mm]);

  // ── Keyboard shortcuts ──

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId) return;
      // Don't trigger shortcuts if typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const sel = mm.selectedId;
      if (e.key === 'Tab' && sel) { e.preventDefault(); mm.addChild(sel); }
      if (e.key === 'Enter' && sel && !e.shiftKey) { e.preventDefault(); mm.addSibling(sel); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
        const n = mm.nodeMap.get(sel);
        if (n && n.depth > 0) { e.preventDefault(); mm.deleteNode(sel); }
      }
      if (e.key === ' ' && sel) { e.preventDefault(); mm.toggleCollapse(sel); }
      if (e.key === 'Escape') { mm.setSelectedId(null); setCtxMenu(null); }
      if (e.key === 'F2' && sel) { const n = mm.nodeMap.get(sel); if (n) startEdit(sel, n.label); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        (document.querySelector('input[placeholder*="Search"]') as HTMLInputElement)?.focus();
      }
      // Auto-layout (reset manual positions)
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); mm.autoLayout(); }
      // Fit to view
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); fitView(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mm.selectedId, editingId, fitView]);

  // ── Export SVG ──

  const exportSVG = useCallback(() => {
    if (!svgRef.current || mm.nodes.length === 0) return;

    // Calculate bounding box of all nodes
    const padding = 60;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of mm.nodes) {
      const w = getNodeWidth(n);
      const h = getNodeHeight(n);
      // Account for collapse buttons (+20px right) and comment badges (+200px right)
      const extraRight = n.hasChildren ? 28 : 0;
      const commentW = n.comments?.length ? 200 : 0;
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y - 20); // reqId badge above
      maxX = Math.max(maxX, n.x + w + extraRight + commentW);
      maxY = Math.max(maxY, n.y + h);
    }

    const vx = minX - padding;
    const vy = minY - padding;
    const vw = maxX - minX + padding * 2;
    const vh = maxY - minY + padding * 2;

    // Clone the content group (edges + nodes) into a standalone SVG
    const contentG = svgRef.current.querySelector('g[transform]');
    if (!contentG) return;

    const clone = contentG.cloneNode(true) as SVGGElement;
    // Remove the pan/zoom transform — position content at origin
    clone.setAttribute('transform', `translate(${-vx},${-vy})`);

    const svgStr = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}"
     style="background:${colors.canvasBg}; font-family:'IBM Plex Sans',sans-serif">
  ${clone.outerHTML}
</svg>`;

    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${mm.doc.name.replace(/\s+/g, '_')}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [mm.doc.name, mm.nodes, colors.canvasBg]);

  const exportPNG = useCallback(() => {
    if (!svgRef.current || mm.nodes.length === 0) return;

    const padding = 60;
    const scale = 2; // 2x for retina quality
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of mm.nodes) {
      const w = getNodeWidth(n);
      const h = getNodeHeight(n);
      const extraRight = n.hasChildren ? 28 : 0;
      const commentW = n.comments?.length ? 200 : 0;
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y - 20);
      maxX = Math.max(maxX, n.x + w + extraRight + commentW);
      maxY = Math.max(maxY, n.y + h);
    }

    const vx = minX - padding;
    const vy = minY - padding;
    const vw = maxX - minX + padding * 2;
    const vh = maxY - minY + padding * 2;

    const contentG = svgRef.current.querySelector('g[transform]');
    if (!contentG) return;

    const clone = contentG.cloneNode(true) as SVGGElement;
    clone.setAttribute('transform', `translate(${-vx},${-vy})`);

    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}"
      style="background:${colors.canvasBg}; font-family:'IBM Plex Sans',Arial,sans-serif">
      ${clone.outerHTML}
    </svg>`;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = vw * scale;
      canvas.height = vh * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(scale, scale);
      // Fill background
      ctx.fillStyle = colors.canvasBg;
      ctx.fillRect(0, 0, vw, vh);
      ctx.drawImage(img, 0, 0, vw, vh);
      canvas.toBlob(blob => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${mm.doc.name.replace(/\s+/g, '_')}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  }, [mm.doc.name, mm.nodes, colors.canvasBg]);

  // ── Render helpers ──

  const renderEdge = (edge: MMEdge, i: number) => {
    const from = mm.nodeMap.get(edge.fromId);
    const to = mm.nodeMap.get(edge.toId);
    if (!from || !to) return null;

    let path: string;
    if (mm.layout === 'vertical') {
      path = getVerticalBezier(
        from.x + getNodeWidth(from) / 2, from.y + getNodeHeight(from),
        to.x + getNodeWidth(to) / 2, to.y,
      );
    } else {
      path = getHorizontalBezier(
        from.x + getNodeWidth(from), from.y + getNodeHeight(from) / 2,
        to.x, to.y + getNodeHeight(to) / 2,
      );
    }

    const hl = mm.highlighted.has(edge.fromId) || mm.highlighted.has(edge.toId);
    return (
      <path key={`e${i}`} d={path} fill="none" stroke={edge.color}
        strokeWidth={hl ? 2.5 : 1.8} strokeOpacity={hl ? 0.8 : isDark ? 0.4 : 0.5}
        strokeLinecap="round" />
    );
  };

  const renderNode = (node: MindMapNodeLayout) => {
    const w = getNodeWidth(node);
    const h = getNodeHeight(node);
    const isRoot = node.depth === 0;
    const isSel = mm.selectedId === node.id;
    const isHl = mm.highlighted.has(node.id);
    const isColl = mm.collapsed.has(node.id);
    const hiddenN = isColl ? node.descendantCount : 0;
    const comment = node.comments?.[0];

    const nodeBg = isRoot ? node.color
      : isSel ? `${node.color}${isDark ? '25' : '15'}`
      : colors.nodeBackground;
    const nodeStroke = isSel ? node.color : isHl ? '#fbbf24' : `${node.color}${isDark ? '50' : '35'}`;
    const labelColor = isRoot ? 'white' : colors.nodeText;
    const subColor = isRoot ? 'rgba(255,255,255,0.7)' : colors.textMuted;

    return (
      <g key={node.id} transform={`translate(${node.x},${node.y})`}
        style={{ cursor: dragState?.nodeId === node.id && dragState.isDragging ? 'grabbing' : 'pointer' }}
        onMouseDown={(e) => startNodeDrag(e, node.id)}
        onDoubleClick={(e) => { e.stopPropagation(); startEdit(node.id, node.label); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation();
          setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: node.id }); mm.setSelectedId(node.id); }}
      >
        {/* Glow */}
        {(isSel || isHl) && <rect x={-4} y={-4} width={w+8} height={h+8} rx={isRoot?14:12}
          fill={isHl ? '#fbbf24' : node.color} fillOpacity={isDark ? 0.12 : 0.08} />}

        {/* Background */}
        <rect x={0} y={0} width={w} height={h} rx={isRoot?10:8}
          fill={nodeBg} stroke={nodeStroke} strokeWidth={isSel||isHl ? 2 : 1} />

        {/* Depth bar */}
        {!isRoot && <rect x={0} y={0} width={3} height={h} rx={1.5} fill={node.color} fillOpacity={0.8} />}

        {/* Label or edit */}
        {editingId === node.id ? (
          <foreignObject x={isRoot?8:12} y={4} width={w-20} height={h-8}>
            <input ref={editRef} value={editText}
              onChange={e => setEditText(e.target.value)}
              onBlur={confirmEdit}
              onKeyDown={e => { if (e.key==='Enter') confirmEdit(); if (e.key==='Escape') setEditingId(null); }}
              style={{ width:'100%', background:'transparent', border:'none', outline:'none',
                color: colors.text, fontSize: isRoot?14:12, fontWeight: isRoot?600:400,
                fontFamily:"'IBM Plex Sans',sans-serif", padding:0 }} />
          </foreignObject>
        ) : (
          <>
            <text x={isRoot ? w/2 : 14} y={node.sublabel ? 17 : h/2+1}
              textAnchor={isRoot ? 'middle' : 'start'} dominantBaseline="middle"
              fontSize={isRoot?14:12} fontWeight={isRoot||node.depth===1?600:400}
              fill={labelColor}
              fontFamily="'IBM Plex Sans',sans-serif" style={{ pointerEvents:'none' }}>
              {node.label.length > 35 ? node.label.slice(0,35)+'…' : node.label}
            </text>
            {node.sublabel && (
              <text x={isRoot ? w/2 : 14} y={34} textAnchor={isRoot?'middle':'start'}
                fontSize={9} fill={subColor}
                fontFamily="'IBM Plex Sans',sans-serif" style={{ pointerEvents:'none' }}>
                {node.sublabel}
              </text>
            )}
          </>
        )}

        {/* Req ID badge */}
        {node.reqId && (
          <g transform={`translate(${w-6},-6)`}>
            <rect x={-(node.reqId.length*3.5+8)} y={-7} width={node.reqId.length*7+12} height={16}
              rx={4} fill={isDark ? '#0f172a' : '#f1f5f9'} stroke={colors.borderStrong} strokeWidth={0.5} />
            <text x={-(node.reqId.length*3.5+2)} y={3} fontSize={8} fill={colors.textSecondary}
              fontFamily="'IBM Plex Mono',monospace">{node.reqId}</text>
          </g>
        )}

        {/* Collapse toggle */}
        {node.hasChildren && (
          <g transform={`translate(${w+8},${h/2})`}
            onClick={(e) => { e.stopPropagation(); mm.toggleCollapse(node.id); }}
            style={{ cursor: 'pointer' }}>
            <circle r={11} fill={colors.surface} stroke={node.color} strokeWidth={1} />
            <text textAnchor="middle" dominantBaseline="middle"
              fontSize={isColl?9:12} fill={node.color} fontWeight={isColl?600:400}
              fontFamily="'IBM Plex Sans',sans-serif">
              {isColl ? `+${hiddenN}` : '−'}
            </text>
          </g>
        )}

        {/* Comment badge */}
        {comment && (() => {
          const cs = CSTYLES[comment.type] || CSTYLES.info;
          const tx = node.hasChildren ? w+28 : w+8;
          const txt = comment.text.length > 26 ? comment.text.slice(0,26)+'…' : comment.text;
          return (
            <g transform={`translate(${tx},-10)`}>
              <rect x={0} y={-2} width={190} height={comment.author?42:32} rx={6}
                fill={cs.bg} stroke={cs.border} strokeWidth={1} fillOpacity={0.95} />
              <text x={8} y={14} fontSize={11} fill="#334155"
                fontFamily="'IBM Plex Sans',sans-serif">{cs.icon} {txt}</text>
              {comment.author && (
                <text x={8} y={28} fontSize={9} fill="#94a3b8"
                  fontFamily="'IBM Plex Sans',sans-serif">— {comment.author}</text>
              )}
            </g>
          );
        })()}
      </g>
    );
  };

  // ═══════════════════════════════════════════════════════════════

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: colors.canvasBg, overflow: 'hidden',
      fontFamily: "'IBM Plex Sans',sans-serif",
      marginTop: '50px',
      ...(style?.height ? {} : { height: 'calc(100vh - 50px)' }),
      ...style,
    }}>

      <MindMapToolbar
        docId={mm.doc.id}
        docName={mm.doc.name}
        layout={mm.layout}
        zoom={mm.viewport.zoom}
        searchTerm={mm.searchTerm}
        mapEntries={mm.mapEntries}
        onSearchChange={mm.setSearchTerm}
        onLayoutChange={mm.setLayout}
        onZoomIn={() => mm.setViewport(v => ({ ...v, zoom: Math.min(2.5, v.zoom+0.1) }))}
        onZoomOut={() => mm.setViewport(v => ({ ...v, zoom: Math.max(0.1, v.zoom-0.1) }))}
        onZoomReset={() => mm.setViewport(v => ({ ...v, zoom: 0.55 }))}
        onExpandAll={mm.expandAll}
        onCollapseAll={mm.collapseAll}
        onCollapseToDepth={mm.collapseToDepth}
        onExport={exportSVG}
        onExportPNG={exportPNG}
        onAutoLayout={mm.autoLayout}
        onFitView={fitView}
        onCreateMap={mm.createNewMap}
        onRenameMap={mm.renameMap}
        onSwitchMap={mm.switchMap}
        onDeleteMap={mm.deleteMap}
      />

      <svg ref={svgRef} width="100%" height="100%"
        style={{ cursor: isPanning ? 'grabbing' : 'default', paddingTop: 48 }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onContextMenu={onContextMenu} onWheel={onWheel}>
        <rect className="mm-bg" x={0} y={0} width="100%" height="100%" fill={colors.canvasBg} />

        <defs>
          <pattern id="mm-grid" width={40} height={40} patternUnits="userSpaceOnUse"
            patternTransform={`translate(${mm.viewport.panX},${mm.viewport.panY}) scale(${mm.viewport.zoom})`}>
            <circle cx={20} cy={20} r={0.5} fill={colors.canvasDot} />
          </pattern>
        </defs>
        <rect data-mm-grid="true" width="100%" height="100%" fill="url(#mm-grid)" />

        <g transform={`translate(${mm.viewport.panX},${mm.viewport.panY + 64}) scale(${mm.viewport.zoom})`}>
          {mm.edges.map(renderEdge)}
          {mm.nodes.map(renderNode)}
        </g>
      </svg>

      {/* Keyboard legend */}
      <div style={{
        position:'absolute', bottom:12, left:12,
        background: colors.surfaceOverlay, border:`1px solid ${colors.borderSubtle}`,
        borderRadius:8, padding:'6px 12px', display:'flex', gap:14, alignItems:'center',
      }}>
        {[
          {k:'Tab',a:'Child'},{k:'Enter',a:'Sibling'},{k:'Space',a:'Collapse'},{k:'F2',a:'Edit'},
          {k:'Del',a:'Delete'},{k:'A',a:'Auto Layout'},{k:'F',a:'Fit View'},
          {k:'⌘F',a:'Search'},{k:'Right-click',a:'Pan'},
        ].map(s => (
          <div key={s.k} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <kbd style={{ background: colors.surfaceHover, borderRadius:3, padding:'1px 5px',
              fontSize:9, color: colors.textSecondary, fontFamily:"'IBM Plex Mono',monospace",
              border:`1px solid ${colors.borderStrong}` }}>{s.k}</kbd>
            <span style={{ color: colors.textMuted, fontSize:10 }}>{s.a}</span>
          </div>
        ))}
      </div>

      {/* Status bar */}
      <div style={{
        position:'absolute', bottom:12, right:12,
        background: colors.surfaceOverlay, border:`1px solid ${colors.borderSubtle}`,
        borderRadius:8, padding:'6px 12px', display:'flex', gap:12, alignItems:'center',
      }}>
        <span style={{ color: colors.textMuted, fontSize:10, fontFamily:"'IBM Plex Mono',monospace" }}>
          {mm.nodes.length} nodes
        </span>
        {mm.highlighted.size > 0 && (
          <span style={{ color:'#fbbf24', fontSize:10, fontFamily:"'IBM Plex Mono',monospace" }}>
            {mm.highlighted.size} matches
          </span>
        )}
      </div>

      {ctxMenu && <ContextMenuOverlay state={ctxMenu} actions={getActions(ctxMenu.nodeId)}
        onClose={() => setCtxMenu(null)} colors={colors} />}
    </div>
  );
}

// ─── Context Menu ───

function ContextMenuOverlay({ state, actions, onClose, colors }: {
  state: { x: number; y: number; nodeId: string };
  actions: ContextMenuAction[];
  onClose: () => void;
  colors: any;
}) {
  useEffect(() => {
    const h = () => onClose();
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, [onClose]);

  return (
    <div style={{
      position:'fixed', left:state.x, top:state.y,
      background: colors.surface, border:`1px solid ${colors.border}`, borderRadius:8,
      padding:'4px 0', zIndex:100, minWidth:180,
      boxShadow: colors.shadowStrong,
    }} onClick={e => e.stopPropagation()}>
      {actions.map((a, i) => (
        <React.Fragment key={i}>
          {a.divider && <div style={{ height:1, background: colors.border, margin:'4px 0' }} />}
          <button onClick={() => { a.action(); onClose(); }}
            style={{
              display:'flex', alignItems:'center', gap:8, width:'100%',
              background:'none', border:'none',
              color: a.danger ? '#f87171' : colors.text,
              padding:'6px 14px', fontSize:12, cursor:'pointer', textAlign:'left',
              fontFamily:"'IBM Plex Sans',sans-serif",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = colors.surfaceHover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <span style={{ fontSize:14, width:20, textAlign:'center' }}>{a.icon}</span>
            {a.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
