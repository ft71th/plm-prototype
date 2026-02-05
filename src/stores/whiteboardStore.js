/**
 * WhiteboardStore — Zustand-baserad state management
 *
 * Alla whiteboard-element (former, text, linjer, banor, bilder) lagras här,
 * HELT separerat från PLM-noder.
 *
 * Deliverable 5: Pennverktyg, sticky notes, bilder, högerklicksmeny,
 * ortogonala kopplingar, sök
 *
 * Architecture ref: docs/architecture/whiteboard-freeform-drawing.md
 */

import { create } from 'zustand';
import { generateId, clamp, getBoundingBox, isContainedWithin, getCombinedBoundingBox } from '../utils/geometry';

// ============================================================
// Default values for new elements
// ============================================================

const DEFAULT_SHAPE = {
  type: 'shape',
  shapeVariant: 'rectangle',
  fill: '#ffffff',
  fillOpacity: 1,
  stroke: '#000000',
  strokeWidth: 2,
  cornerRadius: 8,
  text: null,
  isContainer: false,
  childIds: [],
  shadow: null, // { color, blur, offsetX, offsetY }
};

const DEFAULT_TEXT_CONTENT = {
  text: '',
  fontSize: 14,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
  align: 'center',
  verticalAlign: 'middle',
};

const DEFAULT_LINE = {
  type: 'line',
  stroke: '#000000',
  strokeWidth: 2,
  lineStyle: 'solid',
  arrowHead: 'none',
  routing: 'straight', // 'straight' | 'orthogonal'
  startConnection: null,
  endConnection: null,
  label: null,
};

const DEFAULT_PATH = {
  type: 'path',
  stroke: '#000000',
  strokeWidth: 2,
  fill: 'none',
  points: [],
};

const DEFAULT_IMAGE = {
  type: 'image',
  imageData: null, // dataURL
  opacity: 1,
};

const DEFAULT_FRAME = {
  type: 'frame',
  label: 'Frame',
  fill: 'transparent',
  stroke: '#6366f1',
  strokeWidth: 2,
  cornerRadius: 8,
  showLabel: true,
};

// ============================================================
// Layer system defaults
// ============================================================

const DEFAULT_LAYER = {
  id: 'default',
  name: 'Standard',
  visible: true,
  locked: false,
  color: '#6366f1',
  opacity: 1,
};

const LAYER_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
];

// ============================================================
// Sticky note colors (klisterlapps-färger)
// ============================================================

export const STICKY_COLORS = [
  { id: 'yellow', fill: '#FFF9C4', stroke: '#F9A825', label: 'Gul' },
  { id: 'pink',   fill: '#F8BBD0', stroke: '#C2185B', label: 'Rosa' },
  { id: 'green',  fill: '#C8E6C9', stroke: '#388E3C', label: 'Grön' },
  { id: 'blue',   fill: '#BBDEFB', stroke: '#1976D2', label: 'Blå' },
  { id: 'purple', fill: '#E1BEE7', stroke: '#7B1FA2', label: 'Lila' },
  { id: 'orange', fill: '#FFE0B2', stroke: '#E65100', label: 'Orange' },
];

// ============================================================
// Font families
// ============================================================

export const FONT_FAMILIES = [
  { id: 'Inter, system-ui, sans-serif', label: 'Inter (Standard)' },
  { id: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { id: 'Georgia, serif', label: 'Georgia' },
  { id: '"Times New Roman", Times, serif', label: 'Times New Roman' },
  { id: '"Courier New", Courier, monospace', label: 'Courier New' },
  { id: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
  { id: '"Trebuchet MS", Helvetica, sans-serif', label: 'Trebuchet MS' },
  { id: 'Impact, Charcoal, sans-serif', label: 'Impact' },
];

// ============================================================
// Template definitions
// ============================================================

export const TEMPLATES = [
  {
    id: 'flowchart-basic',
    label: 'Flödesschema (grund)',
    icon: '📊',
    create: () => {
      const startId = generateId('shape');
      const processId = generateId('shape');
      const decisionId = generateId('shape');
      const endId = generateId('shape');
      const line1Id = generateId('line');
      const line2Id = generateId('line');
      const line3Id = generateId('line');

      return {
        elements: {
          [startId]: { ...DEFAULT_SHAPE, type: 'shape', id: startId, shapeVariant: 'rounded-rectangle', x: 200, y: 40, width: 160, height: 60, fill: '#e8f5e9', stroke: '#4caf50', strokeWidth: 2, cornerRadius: 30, text: { ...DEFAULT_TEXT_CONTENT, text: 'Start', fontWeight: 'bold' }, zIndex: 0, groupId: null, parentId: null, locked: false, visible: true },
          [processId]: { ...DEFAULT_SHAPE, type: 'shape', id: processId, shapeVariant: 'rectangle', x: 200, y: 160, width: 160, height: 80, fill: '#e3f2fd', stroke: '#2196f3', strokeWidth: 2, text: { ...DEFAULT_TEXT_CONTENT, text: 'Process', fontSize: 14 }, zIndex: 1, groupId: null, parentId: null, locked: false, visible: true },
          [decisionId]: { ...DEFAULT_SHAPE, type: 'shape', id: decisionId, shapeVariant: 'diamond', x: 180, y: 300, width: 200, height: 120, fill: '#fff3e0', stroke: '#ff9800', strokeWidth: 2, text: { ...DEFAULT_TEXT_CONTENT, text: 'Beslut?', fontSize: 14 }, zIndex: 2, groupId: null, parentId: null, locked: false, visible: true },
          [endId]: { ...DEFAULT_SHAPE, type: 'shape', id: endId, shapeVariant: 'rounded-rectangle', x: 200, y: 480, width: 160, height: 60, fill: '#ffebee', stroke: '#f44336', strokeWidth: 2, cornerRadius: 30, text: { ...DEFAULT_TEXT_CONTENT, text: 'Slut', fontWeight: 'bold' }, zIndex: 3, groupId: null, parentId: null, locked: false, visible: true },
          [line1Id]: { ...DEFAULT_LINE, id: line1Id, x: 280, y: 100, x2: 280, y2: 160, arrowHead: 'arrow', startConnection: { elementId: startId, side: 'bottom' }, endConnection: { elementId: processId, side: 'top' }, zIndex: 4, groupId: null, parentId: null, locked: false, visible: true },
          [line2Id]: { ...DEFAULT_LINE, id: line2Id, x: 280, y: 240, x2: 280, y2: 300, arrowHead: 'arrow', startConnection: { elementId: processId, side: 'bottom' }, endConnection: { elementId: decisionId, side: 'top' }, zIndex: 5, groupId: null, parentId: null, locked: false, visible: true },
          [line3Id]: { ...DEFAULT_LINE, id: line3Id, x: 280, y: 420, x2: 280, y2: 480, arrowHead: 'arrow', startConnection: { elementId: decisionId, side: 'bottom' }, endConnection: { elementId: endId, side: 'top' }, zIndex: 6, groupId: null, parentId: null, locked: false, visible: true },
        },
        elementOrder: [startId, processId, decisionId, endId, line1Id, line2Id, line3Id],
      };
    },
  },
  {
    id: 'architecture-layers',
    label: 'Arkitektur (lager)',
    icon: '🏗️',
    create: () => {
      const layers = [
        { label: 'Presentation Layer', fill: '#e3f2fd', stroke: '#2196f3', y: 40 },
        { label: 'Application Layer', fill: '#e8f5e9', stroke: '#4caf50', y: 140 },
        { label: 'Business Logic', fill: '#fff3e0', stroke: '#ff9800', y: 240 },
        { label: 'Data Access Layer', fill: '#fce4ec', stroke: '#e91e63', y: 340 },
        { label: 'Database', fill: '#f3e5f5', stroke: '#9c27b0', y: 440 },
      ];

      const elements = {};
      const order = [];

      layers.forEach((layer, i) => {
        const id = generateId('shape');
        elements[id] = {
          ...DEFAULT_SHAPE, type: 'shape', id, shapeVariant: 'rounded-rectangle',
          x: 80, y: layer.y, width: 400, height: 80,
          fill: layer.fill, stroke: layer.stroke, strokeWidth: 2, cornerRadius: 10,
          text: { ...DEFAULT_TEXT_CONTENT, text: layer.label, fontSize: 16, fontWeight: 'bold' },
          zIndex: i, groupId: null, parentId: null, locked: false, visible: true,
        };
        order.push(id);
      });

      // Arrows between layers
      for (let i = 0; i < layers.length - 1; i++) {
        const lineId = generateId('line');
        elements[lineId] = {
          ...DEFAULT_LINE, id: lineId,
          x: 280, y: layers[i].y + 80,
          x2: 280, y2: layers[i + 1].y,
          arrowHead: 'arrow', stroke: '#888',
          zIndex: layers.length + i,
          groupId: null, parentId: null, locked: false, visible: true,
        };
        order.push(lineId);
      }

      return { elements, elementOrder: order };
    },
  },
  {
    id: 'mindmap-simple',
    label: 'Mind Map',
    icon: '🧠',
    create: () => {
      const centerId = generateId('shape');
      const branches = [
        { label: 'Idé 1', angle: -60, fill: '#e3f2fd', stroke: '#2196f3' },
        { label: 'Idé 2', angle: 0, fill: '#e8f5e9', stroke: '#4caf50' },
        { label: 'Idé 3', angle: 60, fill: '#fff3e0', stroke: '#ff9800' },
        { label: 'Idé 4', angle: 120, fill: '#fce4ec', stroke: '#e91e63' },
        { label: 'Idé 5', angle: 180, fill: '#f3e5f5', stroke: '#9c27b0' },
        { label: 'Idé 6', angle: -120, fill: '#e0f7fa', stroke: '#00bcd4' },
      ];

      const cx = 300, cy = 300, radius = 200;
      const elements = {};
      const order = [];

      elements[centerId] = {
        ...DEFAULT_SHAPE, type: 'shape', id: centerId, shapeVariant: 'ellipse',
        x: cx - 70, y: cy - 40, width: 140, height: 80,
        fill: '#ffeb3b', stroke: '#f57f17', strokeWidth: 3,
        text: { ...DEFAULT_TEXT_CONTENT, text: 'Huvudtema', fontSize: 16, fontWeight: 'bold' },
        zIndex: 0, groupId: null, parentId: null, locked: false, visible: true,
      };
      order.push(centerId);

      branches.forEach((b, i) => {
        const rad = (b.angle * Math.PI) / 180;
        const bx = cx + radius * Math.cos(rad);
        const by = cy + radius * Math.sin(rad);

        const branchId = generateId('shape');
        elements[branchId] = {
          ...DEFAULT_SHAPE, type: 'shape', id: branchId, shapeVariant: 'rounded-rectangle',
          x: bx - 60, y: by - 25, width: 120, height: 50,
          fill: b.fill, stroke: b.stroke, strokeWidth: 2, cornerRadius: 25,
          text: { ...DEFAULT_TEXT_CONTENT, text: b.label, fontSize: 13 },
          zIndex: i + 1, groupId: null, parentId: null, locked: false, visible: true,
        };
        order.push(branchId);

        const lineId = generateId('line');
        elements[lineId] = {
          ...DEFAULT_LINE, id: lineId,
          x: cx, y: cy,
          x2: bx, y2: by,
          stroke: b.stroke, strokeWidth: 2,
          zIndex: branches.length + i + 1,
          groupId: null, parentId: null, locked: false, visible: true,
        };
        order.push(lineId);
      });

      return { elements, elementOrder: order };
    },
  },
  {
    id: 'swimlane',
    label: 'Swimlane-diagram',
    icon: '🏊',
    create: () => {
      const elements = {};
      const order = [];

      const lanes = ['Frontend', 'Backend', 'Database'];
      const laneColors = ['#e3f2fd', '#e8f5e9', '#fff3e0'];
      const laneStrokes = ['#2196f3', '#4caf50', '#ff9800'];

      lanes.forEach((label, i) => {
        const id = generateId('shape');
        elements[id] = {
          ...DEFAULT_SHAPE, type: 'shape', id, shapeVariant: 'rectangle',
          x: 40, y: 80 + i * 160, width: 500, height: 140,
          fill: laneColors[i], fillOpacity: 0.3, stroke: laneStrokes[i], strokeWidth: 2,
          text: null, zIndex: i,
          groupId: null, parentId: null, locked: false, visible: true,
        };
        order.push(id);

        // Lane label
        const labelId = generateId('text');
        elements[labelId] = {
          type: 'text', id: labelId,
          x: 50, y: 85 + i * 160, width: 80, height: 30,
          content: { ...DEFAULT_TEXT_CONTENT, text: label, fontSize: 12, fontWeight: 'bold', align: 'left', color: laneStrokes[i] },
          zIndex: lanes.length + i,
          groupId: null, parentId: null, locked: false, visible: true,
        };
        order.push(labelId);
      });

      return { elements, elementOrder: order };
    },
  },
];

// ============================================================
// Store
// ============================================================

const HISTORY_LIMIT = 50;

const useWhiteboardStore = create((set, get) => ({
  // ─── Elements ──────────────────────────────────────────
  elements: {},
  elementOrder: [],

  // ─── Selection ─────────────────────────────────────────
  selectedIds: new Set(),
  selectionBox: null,

  // ─── Active Tool ───────────────────────────────────────
  activeTool: 'select',
  activeShapeVariant: 'rectangle',
  activeLineStyle: 'solid',
  activeArrowHead: 'none',
  enhanceInkedShapes: true,

  // ─── Styling Defaults ─────────────────────────────────
  defaultFill: '#ffffff',
  defaultStroke: '#000000',
  defaultStrokeWidth: 2,
  defaultFontSize: 14,
  defaultFontColor: '#000000',
  defaultFillOpacity: 1,

  // ─── Recent Colors ─────────────────────────────────────
  recentColors: [],

  // ─── Grid ──────────────────────────────────────────────
  gridEnabled: true,
  gridSize: 20,
  snapToGrid: true,
  showAlignmentGuides: true,

  // ─── Canvas Transform ──────────────────────────────────
  panX: 0,
  panY: 0,
  zoom: 1,

  // ─── Minimap ───────────────────────────────────────────
  minimapVisible: true,

  // ─── Clipboard ─────────────────────────────────────────
  clipboard: [],
  copiedStyle: null,

  // ─── Inline editing ────────────────────────────────────
  editingElementId: null,

  // ─── Undo/Redo History ─────────────────────────────────
  _undoStack: [],
  _redoStack: [],
  _skipHistory: false,

  // ─── Dialogs ───────────────────────────────────────────
  showExportDialog: false,
  showTemplateDialog: false,
  saveNotification: null, // { message: 'Saved!', time: Date.now() }

  // ─── Context Menu ──────────────────────────────────────
  contextMenu: null, // { x, y } screen coords, null = hidden

  // ─── Search ────────────────────────────────────────────
  showSearch: false,
  searchHighlights: [], // [elementId, ...]

  // ─── Line Routing Default ──────────────────────────────
  activeLineRouting: 'straight', // 'straight' | 'orthogonal'

  // ─── Layers ────────────────────────────────────────────
  layers: [{ ...DEFAULT_LAYER }],
  activeLayerId: 'default',
  showLayersPanel: false,
  showPropertiesPanel: true, // Default to visible

  // ─── Frames & Presentation ────────────────────────────
  frames: [], // [{ id, label, order }] – frame elements are also in elements{}
  presentationMode: false,
  presentationFrameIndex: 0,

  // ─── Element Metadata ──────────────────────────────────
  showMetadataPanel: false,

  // ─── Rulers & Measurement ─────────────────────────────
  showRulers: true,
  showMeasurements: false,
  measurementUnit: 'px', // 'px' | 'mm' | 'cm'

  // ─── Alignment & Distribution ─────────────────────────
  showAlignBar: false,

  // ═══════════════════════════════════════════════════════
  // INTERNAL: History snapshot
  // ═══════════════════════════════════════════════════════

  _pushHistory: () => {
    const state = get();
    if (state._skipHistory) return;
    const snapshot = {
      elements: JSON.parse(JSON.stringify(state.elements)),
      elementOrder: [...state.elementOrder],
    };
    set((s) => ({
      _undoStack: [...s._undoStack.slice(-(HISTORY_LIMIT - 1)), snapshot],
      _redoStack: [],
    }));
  },

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Undo / Redo
  // ═══════════════════════════════════════════════════════

  undo: () => set((state) => {
    if (state._undoStack.length === 0) return state;
    const stack = [...state._undoStack];
    const snapshot = stack.pop();
    const currentSnapshot = {
      elements: JSON.parse(JSON.stringify(state.elements)),
      elementOrder: [...state.elementOrder],
    };
    return {
      _undoStack: stack,
      _redoStack: [...state._redoStack, currentSnapshot],
      elements: snapshot.elements,
      elementOrder: snapshot.elementOrder,
      selectedIds: new Set(),
      editingElementId: null,
    };
  }),

  redo: () => set((state) => {
    if (state._redoStack.length === 0) return state;
    const stack = [...state._redoStack];
    const snapshot = stack.pop();
    const currentSnapshot = {
      elements: JSON.parse(JSON.stringify(state.elements)),
      elementOrder: [...state.elementOrder],
    };
    return {
      _redoStack: stack,
      _undoStack: [...state._undoStack, currentSnapshot],
      elements: snapshot.elements,
      elementOrder: snapshot.elementOrder,
      selectedIds: new Set(),
      editingElementId: null,
    };
  }),

  canUndo: () => get()._undoStack.length > 0,
  canRedo: () => get()._redoStack.length > 0,

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Element CRUD
  // ═══════════════════════════════════════════════════════

  addElement: (element) => {
    get()._pushHistory();
    set((state) => {
      const id = element.id || generateId(element.type);
      const el = {
        ...element, id,
        zIndex: state.elementOrder.length,
        groupId: element.groupId ?? null,
        parentId: element.parentId ?? null,
        locked: element.locked ?? false,
        visible: element.visible ?? true,
        layerId: element.layerId ?? state.activeLayerId,
      };
      return {
        elements: { ...state.elements, [id]: el },
        elementOrder: [...state.elementOrder, id],
      };
    });
  },

  updateElement: (id, updates) => set((state) => {
    if (!state.elements[id]) return state;
    if (updates.width !== undefined) updates.width = Math.max(10, updates.width);
    if (updates.height !== undefined) updates.height = Math.max(10, updates.height);
    if (updates.fillOpacity !== undefined) updates.fillOpacity = clamp(updates.fillOpacity, 0, 1);
    if (updates.strokeWidth !== undefined) updates.strokeWidth = clamp(updates.strokeWidth, 0.5, 20);
    return {
      elements: { ...state.elements, [id]: { ...state.elements[id], ...updates } },
    };
  }),

  pushHistoryCheckpoint: () => { get()._pushHistory(); },

  deleteElements: (ids) => {
    get()._pushHistory();
    set((state) => {
      const idSet = new Set(ids);
      const newElements = { ...state.elements };
      const newSelectedIds = new Set(state.selectedIds);

      for (const id of ids) {
        if (!newElements[id]) continue;
        const el = newElements[id];

        if (el.childIds && el.childIds.length > 0) {
          for (const childId of el.childIds) {
            delete newElements[childId];
            newSelectedIds.delete(childId);
            idSet.add(childId);
          }
        }

        if (el.groupId && newElements[el.groupId]) {
          const group = newElements[el.groupId];
          newElements[el.groupId] = { ...group, childIds: group.childIds.filter((cid) => cid !== id) };
        }

        if (el.parentId && newElements[el.parentId]) {
          const parent = newElements[el.parentId];
          newElements[el.parentId] = { ...parent, childIds: parent.childIds.filter((cid) => cid !== id) };
        }

        for (const key of Object.keys(newElements)) {
          const other = newElements[key];
          if (other.type === 'line') {
            let changed = false;
            const lineUpdates = {};
            if (other.startConnection?.elementId === id) { lineUpdates.startConnection = null; changed = true; }
            if (other.endConnection?.elementId === id) { lineUpdates.endConnection = null; changed = true; }
            if (changed) newElements[key] = { ...other, ...lineUpdates };
          }
        }

        delete newElements[id];
        newSelectedIds.delete(id);
      }

      return {
        elements: newElements,
        elementOrder: state.elementOrder.filter((eid) => !idSet.has(eid)),
        selectedIds: newSelectedIds,
      };
    });
  },

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Selection
  // ═══════════════════════════════════════════════════════

  selectElement: (id, addToSelection = false) => set((state) => {
    if (!state.elements[id]) return state;
    if (addToSelection) {
      const next = new Set(state.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }
    return { selectedIds: new Set([id]) };
  }),

  selectAll: () => set((state) => ({
    selectedIds: new Set(state.elementOrder.filter((id) => {
      const el = state.elements[id];
      return el && !el.locked && el.visible;
    })),
  })),

  clearSelection: () => set({ selectedIds: new Set(), selectionBox: null }),

  selectByLasso: (box) => set((state) => {
    const { intersectsRect } = require('../utils/geometry');
    const hits = new Set();
    for (const id of state.elementOrder) {
      const el = state.elements[id];
      if (!el || el.locked || !el.visible) continue;
      const elBox = getBoundingBox(el);
      if (intersectsRect(elBox, box)) hits.add(id);
    }
    return { selectedIds: hits, selectionBox: null };
  }),

  setSelectionBox: (box) => set({ selectionBox: box }),

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Tool
  // ═══════════════════════════════════════════════════════

  setActiveTool: (tool) => set({ activeTool: tool }),
  setEnhanceInkedShapes: (enabled) => set({ enhanceInkedShapes: enabled }),
  setActiveShapeVariant: (variant) => set({ activeShapeVariant: variant }),
  setActiveLineStyle: (style) => set({ activeLineStyle: style }),
  setActiveArrowHead: (arrowHead) => set({ activeArrowHead: arrowHead }),

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Styling
  // ═══════════════════════════════════════════════════════

  applyStyle: (ids, style) => set((state) => {
    const newElements = { ...state.elements };
    for (const id of ids) {
      if (!newElements[id]) continue;
      const el = newElements[id];
      if (style.fontSize || style.fontWeight || style.fontStyle || style.color || style.align || style.fontFamily) {
        if (el.type === 'text') newElements[id] = { ...el, content: { ...el.content, ...style } };
        else if (el.type === 'shape' && el.text) newElements[id] = { ...el, text: { ...el.text, ...style } };
      } else {
        newElements[id] = { ...el, ...style };
      }
    }
    return { elements: newElements };
  }),

  copyStyle: (sourceId) => set((state) => {
    const el = state.elements[sourceId];
    if (!el) return state;
    const style = {};
    if (el.fill !== undefined) style.fill = el.fill;
    if (el.fillOpacity !== undefined) style.fillOpacity = el.fillOpacity;
    if (el.stroke !== undefined) style.stroke = el.stroke;
    if (el.strokeWidth !== undefined) style.strokeWidth = el.strokeWidth;
    return { copiedStyle: style };
  }),

  pasteStyle: (targetIds) => set((state) => {
    if (!state.copiedStyle) return state;
    const newElements = { ...state.elements };
    for (const id of targetIds) {
      if (!newElements[id]) continue;
      newElements[id] = { ...newElements[id], ...state.copiedStyle };
    }
    return { elements: newElements };
  }),

  addRecentColor: (color) => set((state) => {
    const normalized = color.toLowerCase();
    const filtered = state.recentColors.filter((c) => c !== normalized);
    return { recentColors: [normalized, ...filtered].slice(0, 10) };
  }),

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Defaults
  // ═══════════════════════════════════════════════════════

  setDefaultFill: (fill) => set({ defaultFill: fill }),
  setDefaultStroke: (stroke) => set({ defaultStroke: stroke }),
  setDefaultStrokeWidth: (w) => set({ defaultStrokeWidth: w }),
  setDefaultFontSize: (s) => set({ defaultFontSize: s }),

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Grid
  // ═══════════════════════════════════════════════════════

  setGridEnabled: (enabled) => set({ gridEnabled: enabled }),
  setSnapToGrid: (snap) => set({ snapToGrid: snap }),
  setShowAlignmentGuides: (show) => set({ showAlignmentGuides: show }),
  setGridSize: (size) => set({ gridSize: clamp(size, 5, 100) }),

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Canvas Transform
  // ═══════════════════════════════════════════════════════

  setPan: (x, y) => set({ panX: x, panY: y }),
  setZoom: (zoom) => set({ zoom: clamp(zoom, 0.1, 5) }),

  zoomIn: () => {
    const z = get().zoom;
    const steps = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5];
    set({ zoom: steps.find((s) => s > z + 0.01) || 5 });
  },

  zoomOut: () => {
    const z = get().zoom;
    const steps = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5];
    set({ zoom: [...steps].reverse().find((s) => s < z - 0.01) || 0.1 });
  },

  zoomToFit: () => {
    const state = get();
    if (state.elementOrder.length === 0) { set({ zoom: 1, panX: 0, panY: 0 }); return; }
    const allElements = state.elementOrder.map((id) => state.elements[id]).filter(Boolean);
    const bb = getCombinedBoundingBox(allElements);
    if (!bb || bb.width === 0 || bb.height === 0) return;
    const canvasWidth = window.innerWidth - 280;
    const canvasHeight = window.innerHeight - 100;
    const padding = 60;
    const scaleX = (canvasWidth - padding * 2) / bb.width;
    const scaleY = (canvasHeight - padding * 2) / bb.height;
    const zoom = clamp(Math.min(scaleX, scaleY), 0.1, 3);
    const panX = (canvasWidth / 2) - (bb.x + bb.width / 2) * zoom;
    const panY = (canvasHeight / 2) - (bb.y + bb.height / 2) * zoom;
    set({ zoom, panX, panY });
  },

  zoomReset: () => set({ zoom: 1, panX: 0, panY: 0 }),
  setMinimapVisible: (v) => set({ minimapVisible: v }),

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Inline Editing
  // ═══════════════════════════════════════════════════════

  setEditingElementId: (id) => set({ editingElementId: id }),

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Match Size
  // ═══════════════════════════════════════════════════════

  matchSize: (ids, dimension) => set((state) => {
    const idArray = [...ids];
    if (idArray.length < 2) return state;
    const reference = state.elements[idArray[0]];
    if (!reference || reference.type === 'line') return state;
    const newElements = { ...state.elements };
    for (let i = 1; i < idArray.length; i++) {
      const el = newElements[idArray[i]];
      if (!el || el.type === 'line') continue;
      if (dimension === 'width') newElements[idArray[i]] = { ...el, width: reference.width };
      else if (dimension === 'height') newElements[idArray[i]] = { ...el, height: reference.height };
      else newElements[idArray[i]] = { ...el, width: reference.width, height: reference.height };
    }
    return { elements: newElements };
  }),

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Copy / Paste / Duplicate
  // ═══════════════════════════════════════════════════════

  copyElements: () => set((state) => ({
    clipboard: [...state.selectedIds].map((id) => state.elements[id]).filter(Boolean).map((el) => JSON.parse(JSON.stringify(el))),
  })),

  pasteElements: () => {
    const state = get();
    if (state.clipboard.length === 0) return;
    get()._pushHistory();
    const newElements = { ...state.elements };
    const newOrder = [...state.elementOrder];
    const newSelected = new Set();
    const offset = 20;
    for (const original of state.clipboard) {
      const newId = generateId(original.type);
      const copy = {
        ...JSON.parse(JSON.stringify(original)), id: newId,
        x: (original.x || 0) + offset, y: (original.y || 0) + offset,
        zIndex: newOrder.length,
      };
      if (copy.x2 !== undefined) copy.x2 = original.x2 + offset;
      if (copy.y2 !== undefined) copy.y2 = original.y2 + offset;
      if (copy.startConnection) copy.startConnection = null;
      if (copy.endConnection) copy.endConnection = null;
      copy.groupId = null;
      newElements[newId] = copy;
      newOrder.push(newId);
      newSelected.add(newId);
    }
    set({ elements: newElements, elementOrder: newOrder, selectedIds: newSelected });
  },

  duplicateElements: () => {
    const state = get();
    if (state.selectedIds.size === 0) return;
    get()._pushHistory();
    const newElements = { ...state.elements };
    const newOrder = [...state.elementOrder];
    const newSelected = new Set();
    const offset = 20;
    const idMapping = {}; // old id -> new id
    
    // First pass: collect all elements to duplicate (including group children)
    const elementsToDuplicate = [];
    for (const id of state.selectedIds) {
      const original = state.elements[id];
      if (!original) continue;
      elementsToDuplicate.push(original);
      
      // If this is a group, also add its children
      if (original.type === 'group' && original.childIds) {
        for (const childId of original.childIds) {
          const child = state.elements[childId];
          if (child && !elementsToDuplicate.find(e => e.id === childId)) {
            elementsToDuplicate.push(child);
          }
        }
      }
    }
    
    // Second pass: create ID mapping
    for (const original of elementsToDuplicate) {
      idMapping[original.id] = generateId(original.type);
    }
    
    // Third pass: create duplicates with updated references
    for (const original of elementsToDuplicate) {
      const newId = idMapping[original.id];
      const copy = {
        ...JSON.parse(JSON.stringify(original)), 
        id: newId,
        x: (original.x || 0) + offset, 
        y: (original.y || 0) + offset,
        zIndex: newOrder.length,
      };
      
      // Update line endpoints
      if (copy.x2 !== undefined) copy.x2 = original.x2 + offset;
      if (copy.y2 !== undefined) copy.y2 = original.y2 + offset;
      
      // Clear connections (they reference old elements)
      if (copy.startConnection) copy.startConnection = null;
      if (copy.endConnection) copy.endConnection = null;
      
      // Update group references
      if (copy.type === 'group' && copy.childIds) {
        // Map old child IDs to new child IDs
        copy.childIds = copy.childIds.map(oldId => idMapping[oldId] || oldId);
      }
      
      // Update groupId to point to new group (if it was duplicated)
      if (copy.groupId && idMapping[copy.groupId]) {
        copy.groupId = idMapping[copy.groupId];
      } else {
        copy.groupId = null;
      }
      
      newElements[newId] = copy;
      newOrder.push(newId);
      
      // Only select top-level duplicates (groups, not their children)
      if (state.selectedIds.has(original.id)) {
        newSelected.add(newId);
      }
    }
    
    set({ elements: newElements, elementOrder: newOrder, selectedIds: newSelected });
  },

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Grouping
  // ═══════════════════════════════════════════════════════

  groupElements: () => {
    const state = get();
    const ids = [...state.selectedIds];
    if (ids.length < 2) return;
    get()._pushHistory();
    const groupId = generateId('group');
    const newElements = { ...state.elements };
    const memberEls = ids.map((id) => state.elements[id]).filter(Boolean);
    const bb = getCombinedBoundingBox(memberEls);
    newElements[groupId] = {
      type: 'group', id: groupId, x: bb.x, y: bb.y, width: bb.width, height: bb.height,
      childIds: ids, locked: false, visible: true, zIndex: state.elementOrder.length,
    };
    for (const id of ids) {
      if (newElements[id]) newElements[id] = { ...newElements[id], groupId };
    }
    set({ elements: newElements, elementOrder: [...state.elementOrder, groupId], selectedIds: new Set([groupId]) });
  },

  ungroupElements: () => {
    const state = get();
    const ids = [...state.selectedIds];
    if (ids.length === 0) return;
    get()._pushHistory();
    const newElements = { ...state.elements };
    const newOrder = [...state.elementOrder];
    const newSelected = new Set();
    for (const id of ids) {
      const el = newElements[id];
      if (!el || el.type !== 'group') { newSelected.add(id); continue; }
      for (const childId of (el.childIds || [])) {
        if (newElements[childId]) {
          newElements[childId] = { ...newElements[childId], groupId: null };
          newSelected.add(childId);
        }
      }
      delete newElements[id];
      const idx = newOrder.indexOf(id);
      if (idx !== -1) newOrder.splice(idx, 1);
    }
    set({ elements: newElements, elementOrder: newOrder, selectedIds: newSelected });
  },

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Z-Order
  // ═══════════════════════════════════════════════════════

  bringToFront: () => set((state) => {
    if (state.selectedIds.size === 0) return state;
    const selected = [...state.selectedIds];
    const remaining = state.elementOrder.filter((id) => !state.selectedIds.has(id));
    return { elementOrder: [...remaining, ...selected] };
  }),

  sendToBack: () => set((state) => {
    if (state.selectedIds.size === 0) return state;
    const selected = [...state.selectedIds];
    const remaining = state.elementOrder.filter((id) => !state.selectedIds.has(id));
    return { elementOrder: [...selected, ...remaining] };
  }),

  bringForward: () => set((state) => {
    if (state.selectedIds.size === 0) return state;
    const order = [...state.elementOrder];
    for (let i = order.length - 2; i >= 0; i--) {
      if (state.selectedIds.has(order[i]) && !state.selectedIds.has(order[i + 1])) {
        [order[i], order[i + 1]] = [order[i + 1], order[i]];
      }
    }
    return { elementOrder: order };
  }),

  sendBackward: () => set((state) => {
    if (state.selectedIds.size === 0) return state;
    const order = [...state.elementOrder];
    for (let i = 1; i < order.length; i++) {
      if (state.selectedIds.has(order[i]) && !state.selectedIds.has(order[i - 1])) {
        [order[i], order[i - 1]] = [order[i - 1], order[i]];
      }
    }
    return { elementOrder: order };
  }),

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Lock / Unlock
  // ═══════════════════════════════════════════════════════

  toggleLock: (ids) => set((state) => {
    const newElements = { ...state.elements };
    for (const id of ids) {
      if (!newElements[id]) continue;
      newElements[id] = { ...newElements[id], locked: !newElements[id].locked };
    }
    return { elements: newElements };
  }),

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Export / Import
  // ═══════════════════════════════════════════════════════

  setShowExportDialog: (show) => set({ showExportDialog: show }),
  setShowTemplateDialog: (show) => set({ showTemplateDialog: show }),
  setSaveNotification: (notification) => set({ saveNotification: notification }),

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Context Menu
  // ═══════════════════════════════════════════════════════

  setContextMenu: (menu) => set({ contextMenu: menu }),

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Search
  // ═══════════════════════════════════════════════════════

  setShowSearch: (show) => set({ showSearch: show }),
  setSearchHighlights: (ids) => set({ searchHighlights: ids }),

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Line Routing
  // ═══════════════════════════════════════════════════════

  setActiveLineRouting: (routing) => set({ activeLineRouting: routing }),

  exportToJSON: () => {
    const state = get();
    return JSON.stringify({
      version: '2.0', timestamp: new Date().toISOString(),
      elements: state.elements, elementOrder: state.elementOrder,
      gridSize: state.gridSize, layers: state.layers, frames: state.frames,
    }, null, 2);
  },

  importFromJSON: (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.elements || !data.elementOrder) throw new Error('Ogiltigt filformat');
      get()._pushHistory();
      set({
        elements: data.elements, elementOrder: data.elementOrder,
        gridSize: data.gridSize || 20,
        layers: data.layers || [{ ...DEFAULT_LAYER }],
        frames: data.frames || [],
        selectedIds: new Set(), editingElementId: null,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  loadTemplate: (templateId) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    get()._pushHistory();
    const data = template.create();
    set((state) => ({
      elements: { ...state.elements, ...data.elements },
      elementOrder: [...state.elementOrder, ...data.elementOrder],
      selectedIds: new Set(data.elementOrder),
      showTemplateDialog: false,
    }));
  },

  clearCanvas: () => {
    get()._pushHistory();
    set({ elements: {}, elementOrder: [], selectedIds: new Set(), editingElementId: null });
  },

  // ═══════════════════════════════════════════════════════
  // PLM Integration — export snapshot
  // ═══════════════════════════════════════════════════════

  getSnapshotForPLM: () => {
    const state = get();
    return {
      elements: JSON.parse(JSON.stringify(state.elements)),
      elementOrder: [...state.elementOrder],
      bounds: getCombinedBoundingBox(state.elementOrder.map((id) => state.elements[id]).filter(Boolean)),
    };
  },

  // ═══════════════════════════════════════════════════════
  // FACTORY HELPERS
  // ═══════════════════════════════════════════════════════

  // ─── Layer Actions ───────────────────────────────────
  setShowLayersPanel: (show) => set({ showLayersPanel: show }),
  setShowPropertiesPanel: (show) => set({ showPropertiesPanel: show }),
  setActiveLayerId: (id) => set({ activeLayerId: id }),

  addLayer: (name) => {
    const id = generateId('layer');
    const colorIdx = get().layers.length % LAYER_COLORS.length;
    set((state) => ({
      layers: [...state.layers, { id, name: name || `Lager ${state.layers.length + 1}`, visible: true, locked: false, color: LAYER_COLORS[colorIdx], opacity: 1 }],
      activeLayerId: id,
    }));
    return id;
  },

  removeLayer: (layerId) => {
    if (layerId === 'default') return; // Can't remove default
    get()._pushHistory();
    set((state) => {
      // Move elements on deleted layer to default
      const newElements = { ...state.elements };
      for (const id of state.elementOrder) {
        if (newElements[id]?.layerId === layerId) {
          newElements[id] = { ...newElements[id], layerId: 'default' };
        }
      }
      return {
        layers: state.layers.filter((l) => l.id !== layerId),
        activeLayerId: state.activeLayerId === layerId ? 'default' : state.activeLayerId,
        elements: newElements,
      };
    });
  },

  updateLayer: (layerId, updates) => set((state) => ({
    layers: state.layers.map((l) => l.id === layerId ? { ...l, ...updates } : l),
  })),

  reorderLayers: (fromIndex, toIndex) => set((state) => {
    const arr = [...state.layers];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    return { layers: arr };
  }),

  moveElementsToLayer: (elementIds, layerId) => {
    get()._pushHistory();
    set((state) => {
      const newElements = { ...state.elements };
      for (const id of elementIds) {
        if (newElements[id]) newElements[id] = { ...newElements[id], layerId };
      }
      return { elements: newElements };
    });
  },

  isElementVisible: (elementId) => {
    const state = get();
    const el = state.elements[elementId];
    if (!el || !el.visible) return false;
    const layerId = el.layerId || 'default';
    const layer = state.layers.find((l) => l.id === layerId);
    return layer ? layer.visible : true;
  },

  isElementLayerLocked: (elementId) => {
    const state = get();
    const el = state.elements[elementId];
    if (!el) return false;
    const layerId = el.layerId || 'default';
    const layer = state.layers.find((l) => l.id === layerId);
    return layer ? layer.locked : false;
  },

  // ─── Alignment & Distribution ────────────────────────
  setShowAlignBar: (show) => set({ showAlignBar: show }),

  alignElements: (direction) => {
    const state = get();
    const ids = [...state.selectedIds];
    if (ids.length < 2) return;
    get()._pushHistory();
    const els = ids.map((id) => state.elements[id]).filter(Boolean);
    const boxes = els.map((el) => getBoundingBox(el));
    const newElements = { ...state.elements };

    switch (direction) {
      case 'left': {
        const minX = Math.min(...boxes.map((b) => b.x));
        els.forEach((el) => { newElements[el.id] = { ...el, x: minX }; });
        break;
      }
      case 'center-h': {
        const allBox = getCombinedBoundingBox(els);
        const centerX = allBox.x + allBox.width / 2;
        els.forEach((el) => {
          const box = getBoundingBox(el);
          newElements[el.id] = { ...el, x: centerX - box.width / 2 };
        });
        break;
      }
      case 'right': {
        const maxRight = Math.max(...boxes.map((b) => b.x + b.width));
        els.forEach((el) => {
          const box = getBoundingBox(el);
          newElements[el.id] = { ...el, x: maxRight - box.width };
        });
        break;
      }
      case 'top': {
        const minY = Math.min(...boxes.map((b) => b.y));
        els.forEach((el) => { newElements[el.id] = { ...el, y: minY }; });
        break;
      }
      case 'center-v': {
        const allBox = getCombinedBoundingBox(els);
        const centerY = allBox.y + allBox.height / 2;
        els.forEach((el) => {
          const box = getBoundingBox(el);
          newElements[el.id] = { ...el, y: centerY - box.height / 2 };
        });
        break;
      }
      case 'bottom': {
        const maxBottom = Math.max(...boxes.map((b) => b.y + b.height));
        els.forEach((el) => {
          const box = getBoundingBox(el);
          newElements[el.id] = { ...el, y: maxBottom - box.height };
        });
        break;
      }
    }
    set({ elements: newElements });
  },

  distributeElements: (direction) => {
    const state = get();
    const ids = [...state.selectedIds];
    if (ids.length < 3) return;
    get()._pushHistory();
    const els = ids.map((id) => state.elements[id]).filter(Boolean);
    const newElements = { ...state.elements };

    if (direction === 'horizontal') {
      const sorted = [...els].sort((a, b) => (a.x || 0) - (b.x || 0));
      const boxes = sorted.map((el) => getBoundingBox(el));
      const totalWidth = boxes.reduce((sum, b) => sum + b.width, 0);
      const minX = Math.min(...boxes.map((b) => b.x));
      const maxRight = Math.max(...boxes.map((b) => b.x + b.width));
      const totalSpace = maxRight - minX - totalWidth;
      const gap = totalSpace / (sorted.length - 1);
      let currentX = minX;
      sorted.forEach((el, i) => {
        const box = boxes[i];
        newElements[el.id] = { ...el, x: currentX };
        currentX += box.width + gap;
      });
    } else {
      const sorted = [...els].sort((a, b) => (a.y || 0) - (b.y || 0));
      const boxes = sorted.map((el) => getBoundingBox(el));
      const totalHeight = boxes.reduce((sum, b) => sum + b.height, 0);
      const minY = Math.min(...boxes.map((b) => b.y));
      const maxBottom = Math.max(...boxes.map((b) => b.y + b.height));
      const totalSpace = maxBottom - minY - totalHeight;
      const gap = totalSpace / (sorted.length - 1);
      let currentY = minY;
      sorted.forEach((el, i) => {
        const box = boxes[i];
        newElements[el.id] = { ...el, y: currentY };
        currentY += box.height + gap;
      });
    }
    set({ elements: newElements });
  },

  // ─── Auto-Layout ─────────────────────────────────────
  autoLayout: (mode) => {
    const state = get();
    const ids = [...state.selectedIds];
    if (ids.length < 2) return;
    get()._pushHistory();
    const els = ids.map((id) => state.elements[id]).filter((el) => el && el.type !== 'line');
    if (els.length < 2) return;
    const newElements = { ...state.elements };
    const padding = 30;

    switch (mode) {
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(els.length));
        const maxW = Math.max(...els.map((e) => e.width || 100));
        const maxH = Math.max(...els.map((e) => e.height || 60));
        const startX = els[0].x || 100;
        const startY = els[0].y || 100;
        els.forEach((el, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          newElements[el.id] = { ...el, x: startX + col * (maxW + padding), y: startY + row * (maxH + padding) };
        });
        break;
      }
      case 'tree': {
        const rootEl = els[0];
        const children = els.slice(1);
        const rootX = rootEl.x || 300;
        const rootY = rootEl.y || 60;
        const childWidth = Math.max(...children.map((e) => e.width || 100));
        const totalWidth = children.length * (childWidth + padding) - padding;
        const startX = rootX + (rootEl.width || 100) / 2 - totalWidth / 2;
        newElements[rootEl.id] = { ...rootEl, x: rootX, y: rootY };
        children.forEach((el, i) => {
          newElements[el.id] = { ...el, x: startX + i * (childWidth + padding), y: rootY + (rootEl.height || 60) + padding * 3 };
        });
        break;
      }
      case 'circle': {
        const bb = getCombinedBoundingBox(els);
        const cx = bb.x + bb.width / 2;
        const cy = bb.y + bb.height / 2;
        const maxDim = Math.max(...els.map((e) => Math.max(e.width || 100, e.height || 60)));
        const radius = Math.max(maxDim * 1.5, els.length * (maxDim + padding) / (2 * Math.PI));
        els.forEach((el, i) => {
          const angle = (2 * Math.PI * i) / els.length - Math.PI / 2;
          newElements[el.id] = {
            ...el,
            x: cx + radius * Math.cos(angle) - (el.width || 100) / 2,
            y: cy + radius * Math.sin(angle) - (el.height || 60) / 2,
          };
        });
        break;
      }
      case 'horizontal': {
        const startY = els[0].y || 100;
        const startX = els[0].x || 100;
        const maxH = Math.max(...els.map((e) => e.height || 60));
        let currentX = startX;
        els.forEach((el) => {
          newElements[el.id] = { ...el, x: currentX, y: startY + maxH / 2 - (el.height || 60) / 2 };
          currentX += (el.width || 100) + padding;
        });
        break;
      }
      case 'vertical': {
        const startX = els[0].x || 100;
        const startY = els[0].y || 100;
        const maxW = Math.max(...els.map((e) => e.width || 100));
        let currentY = startY;
        els.forEach((el) => {
          newElements[el.id] = { ...el, x: startX + maxW / 2 - (el.width || 100) / 2, y: currentY };
          currentY += (el.height || 60) + padding;
        });
        break;
      }
    }
    set({ elements: newElements });
  },

  // ─── Frame Actions ───────────────────────────────────
  createFrame: (x, y, width, height, label) => {
    const state = get();
    const id = generateId('frame');
    const frame = {
      ...DEFAULT_FRAME, id, x, y, width: width || 800, height: height || 600,
      label: label || `Ram ${state.frames.length + 1}`,
      zIndex: 0, // Frames render behind everything
      groupId: null, parentId: null, locked: false, visible: true,
      layerId: state.activeLayerId,
    };
    get()._pushHistory();
    set((state) => ({
      elements: { ...state.elements, [id]: frame },
      elementOrder: [id, ...state.elementOrder], // Insert at beginning (behind)
      frames: [...state.frames, { id, label: frame.label, order: state.frames.length }],
    }));
    return frame;
  },

  updateFrameOrder: (frameId, newOrder) => set((state) => ({
    frames: state.frames.map((f) => f.id === frameId ? { ...f, order: newOrder } : f)
      .sort((a, b) => a.order - b.order),
  })),

  // ─── Presentation Mode ───────────────────────────────
  setPresentationMode: (active) => set({ presentationMode: active, presentationFrameIndex: 0 }),
  setPresentationFrameIndex: (idx) => set({ presentationFrameIndex: idx }),

  navigateToFrame: (frameId) => {
    const state = get();
    const el = state.elements[frameId];
    if (!el) return;
    const canvasW = window.innerWidth;
    const canvasH = window.innerHeight;
    const padX = 40, padY = 40;
    const scaleX = (canvasW - padX * 2) / el.width;
    const scaleY = (canvasH - padY * 2) / el.height;
    const zoom = clamp(Math.min(scaleX, scaleY), 0.1, 3);
    const panX = canvasW / 2 - (el.x + el.width / 2) * zoom;
    const panY = canvasH / 2 - (el.y + el.height / 2) * zoom;
    set({ zoom, panX, panY });
  },

  // ─── Element Metadata ────────────────────────────────
  setShowMetadataPanel: (show) => set({ showMetadataPanel: show }),

  setElementMetadata: (elementId, key, value) => set((state) => {
    const el = state.elements[elementId];
    if (!el) return state;
    const metadata = { ...(el.metadata || {}), [key]: value };
    if (value === '' || value === null || value === undefined) delete metadata[key];
    return { elements: { ...state.elements, [elementId]: { ...el, metadata } } };
  }),

  setElementPLMLink: (elementId, plmNodeId) => set((state) => {
    const el = state.elements[elementId];
    if (!el) return state;
    return { elements: { ...state.elements, [elementId]: { ...el, plmNodeId: plmNodeId || null } } };
  }),

  getLinkedPLMElements: () => {
    const state = get();
    return state.elementOrder
      .map((id) => state.elements[id])
      .filter((el) => el && el.plmNodeId);
  },

  // ─── Ruler & Measurements ────────────────────────────
  setShowRulers: (show) => set({ showRulers: show }),
  setShowMeasurements: (show) => set({ showMeasurements: show }),
  setMeasurementUnit: (unit) => set({ measurementUnit: unit }),

  getMeasurementBetween: (id1, id2) => {
    const state = get();
    const el1 = state.elements[id1];
    const el2 = state.elements[id2];
    if (!el1 || !el2) return null;
    const b1 = getBoundingBox(el1);
    const b2 = getBoundingBox(el2);
    const c1 = { x: b1.x + b1.width / 2, y: b1.y + b1.height / 2 };
    const c2 = { x: b2.x + b2.width / 2, y: b2.y + b2.height / 2 };
    const distance = Math.hypot(c2.x - c1.x, c2.y - c1.y);
    const dx = Math.abs(b2.x - (b1.x + b1.width));
    const dy = Math.abs(b2.y - (b1.y + b1.height));
    return { distance: Math.round(distance), gapX: Math.round(dx), gapY: Math.round(dy), c1, c2 };
  },

  createShape: (x, y, width, height, overrides = {}) => {
    const state = get();
    return {
      ...DEFAULT_SHAPE, id: generateId('shape'), shapeVariant: state.activeShapeVariant,
      x, y, width, height,
      fill: state.defaultFill, stroke: state.defaultStroke, strokeWidth: state.defaultStrokeWidth,
      fillOpacity: state.defaultFillOpacity, zIndex: state.elementOrder.length, ...overrides,
    };
  },

  createTextElement: (x, y, overrides = {}) => {
    const state = get();
    return {
      type: 'text', id: generateId('text'), x, y, width: 150, height: 30,
      zIndex: state.elementOrder.length, groupId: null, parentId: null, locked: false, visible: true,
      content: { ...DEFAULT_TEXT_CONTENT, fontSize: state.defaultFontSize, color: state.defaultFontColor },
      ...overrides,
    };
  },

  createLine: (x, y, x2, y2, overrides = {}) => {
    const state = get();
    return {
      ...DEFAULT_LINE, id: generateId('line'), x, y, x2, y2,
      stroke: state.defaultStroke, strokeWidth: state.defaultStrokeWidth,
      lineStyle: state.activeLineStyle, arrowHead: state.activeArrowHead,
      routing: state.activeLineRouting,
      zIndex: state.elementOrder.length, groupId: null, parentId: null, locked: false, visible: true,
      ...overrides,
    };
  },

  // ─── Sticky Note Factory ─────────────────────────────
  createStickyNote: (x, y, colorId = 'yellow', overrides = {}) => {
    const state = get();
    const color = STICKY_COLORS.find((c) => c.id === colorId) || STICKY_COLORS[0];
    return {
      ...DEFAULT_SHAPE,
      id: generateId('shape'),
      shapeVariant: 'sticky-note',
      x, y, width: 150, height: 150,
      fill: color.fill,
      stroke: color.stroke,
      strokeWidth: 1,
      fillOpacity: 1,
      cornerRadius: 2,
      shadow: { color: 'rgba(0,0,0,0.15)', blur: 8, offsetX: 2, offsetY: 3 },
      text: {
        ...DEFAULT_TEXT_CONTENT,
        text: '',
        fontSize: 14,
        align: 'left',
        verticalAlign: 'top',
        color: '#333333',
      },
      stickyColorId: colorId,
      zIndex: state.elementOrder.length,
      groupId: null, parentId: null, locked: false, visible: true,
      ...overrides,
    };
  },

  // ─── Image Factory ───────────────────────────────────
  createImageElement: (x, y, width, height, imageData, overrides = {}) => {
    const state = get();
    return {
      ...DEFAULT_IMAGE,
      id: generateId('image'),
      x, y, width, height,
      imageData,
      zIndex: state.elementOrder.length,
      groupId: null, parentId: null, locked: false, visible: true,
      ...overrides,
    };
  },
}));

export default useWhiteboardStore;
export { DEFAULT_SHAPE, DEFAULT_TEXT_CONTENT, DEFAULT_LINE, DEFAULT_PATH, DEFAULT_IMAGE, DEFAULT_FRAME, DEFAULT_LAYER, LAYER_COLORS };
