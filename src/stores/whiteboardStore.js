/**
 * WhiteboardStore — Zustand-baserad state management
 *
 * Alla whiteboard-element (former, text, linjer) lagras här,
 * HELT separerat från PLM-noder.
 *
 * Architecture ref: docs/architecture/whiteboard-freeform-drawing.md
 */

import { create } from 'zustand';
import { generateId, clamp, getBoundingBox, isContainedWithin } from '../utils/geometry';

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
  startConnection: null,
  endConnection: null,
  label: null,
};

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
  selectionBox: null, // { x, y, width, height } for lasso

  // ─── Active Tool ───────────────────────────────────────
  activeTool: 'select',          // 'select' | 'shape' | 'line' | 'text'
  activeShapeVariant: 'rectangle',
  activeLineStyle: 'solid',
  activeArrowHead: 'none',

  // ─── Styling Defaults (applied to new elements) ────────
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

  // ─── Clipboard ─────────────────────────────────────────
  clipboard: [],
  copiedStyle: null,

  // ─── Inline editing ────────────────────────────────────
  editingElementId: null,

  // ─── Undo/Redo History ─────────────────────────────────
  _undoStack: [],
  _redoStack: [],
  _skipHistory: false,

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
      _redoStack: [], // clear redo on new action
    }));
  },

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Undo / Redo
  // ═══════════════════════════════════════════════════════

  undo: () => set((state) => {
    if (state._undoStack.length === 0) return state;
    const stack = [...state._undoStack];
    const snapshot = stack.pop();

    // Save current state to redo
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

    // Save current state to undo
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
  // ACTIONS: Element CRUD (with history)
  // ═══════════════════════════════════════════════════════

  addElement: (element) => {
    get()._pushHistory();
    set((state) => {
      const id = element.id || generateId(element.type);
      const el = {
        ...element,
        id,
        zIndex: state.elementOrder.length,
        groupId: element.groupId ?? null,
        parentId: element.parentId ?? null,
        locked: element.locked ?? false,
        visible: element.visible ?? true,
      };
      return {
        elements: { ...state.elements, [id]: el },
        elementOrder: [...state.elementOrder, id],
      };
    });
  },

  updateElement: (id, updates) => set((state) => {
    if (!state.elements[id]) return state;

    // Clamp certain values
    if (updates.width !== undefined) updates.width = Math.max(10, updates.width);
    if (updates.height !== undefined) updates.height = Math.max(10, updates.height);
    if (updates.fillOpacity !== undefined) updates.fillOpacity = clamp(updates.fillOpacity, 0, 1);
    if (updates.strokeWidth !== undefined) updates.strokeWidth = clamp(updates.strokeWidth, 0.5, 20);

    return {
      elements: {
        ...state.elements,
        [id]: { ...state.elements[id], ...updates },
      },
    };
  }),

  // Push history before a batch of updateElement calls (for drag operations)
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
          newElements[el.groupId] = {
            ...group,
            childIds: group.childIds.filter((cid) => cid !== id),
          };
        }

        if (el.parentId && newElements[el.parentId]) {
          const parent = newElements[el.parentId];
          newElements[el.parentId] = {
            ...parent,
            childIds: parent.childIds.filter((cid) => cid !== id),
          };
        }

        for (const key of Object.keys(newElements)) {
          const other = newElements[key];
          if (other.type === 'line') {
            let changed = false;
            const lineUpdates = {};
            if (other.startConnection?.elementId === id) {
              lineUpdates.startConnection = null;
              changed = true;
            }
            if (other.endConnection?.elementId === id) {
              lineUpdates.endConnection = null;
              changed = true;
            }
            if (changed) {
              newElements[key] = { ...other, ...lineUpdates };
            }
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
      if (next.has(id)) {
        next.delete(id); // Toggle off
      } else {
        next.add(id);
      }
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
      if (intersectsRect(elBox, box)) {
        hits.add(id);
      }
    }

    return { selectedIds: hits, selectionBox: null };
  }),

  setSelectionBox: (box) => set({ selectionBox: box }),

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Tool
  // ═══════════════════════════════════════════════════════

  setActiveTool: (tool) => set({ activeTool: tool }),
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

      // Handle text content styling separately
      if (style.fontSize || style.fontWeight || style.fontStyle || style.color || style.align) {
        if (el.type === 'text') {
          newElements[id] = {
            ...el,
            content: { ...el.content, ...style },
          };
        } else if (el.type === 'shape' && el.text) {
          newElements[id] = {
            ...el,
            text: { ...el.text, ...style },
          };
        }
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
    const updated = [normalized, ...filtered].slice(0, 10);
    return { recentColors: updated };
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

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Canvas Transform
  // ═══════════════════════════════════════════════════════

  setPan: (x, y) => set({ panX: x, panY: y }),
  setZoom: (zoom) => set({ zoom: clamp(zoom, 0.1, 5) }),

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
      if (dimension === 'width') {
        newElements[idArray[i]] = { ...el, width: reference.width };
      } else if (dimension === 'height') {
        newElements[idArray[i]] = { ...el, height: reference.height };
      } else {
        newElements[idArray[i]] = { ...el, width: reference.width, height: reference.height };
      }
    }
    return { elements: newElements };
  }),

  // ═══════════════════════════════════════════════════════
  // ACTIONS: Copy / Paste / Duplicate
  // ═══════════════════════════════════════════════════════

  copyElements: () => set((state) => {
    const copies = [...state.selectedIds]
      .map((id) => state.elements[id])
      .filter(Boolean)
      .map((el) => JSON.parse(JSON.stringify(el)));
    return { clipboard: copies };
  }),

  pasteElements: () => {
    const state = get();
    if (state.clipboard.length === 0) return;

    get()._pushHistory();

    const idMap = {};
    const newElements = { ...state.elements };
    const newOrder = [...state.elementOrder];
    const newSelected = new Set();
    const offset = 20;

    for (const original of state.clipboard) {
      const newId = generateId(original.type);
      idMap[original.id] = newId;

      const copy = {
        ...JSON.parse(JSON.stringify(original)),
        id: newId,
        x: (original.x || 0) + offset,
        y: (original.y || 0) + offset,
        zIndex: newOrder.length,
      };
      if (copy.x2 !== undefined) copy.x2 = original.x2 + offset;
      if (copy.y2 !== undefined) copy.y2 = original.y2 + offset;

      // Clear connections (they reference old elements)
      if (copy.startConnection) copy.startConnection = null;
      if (copy.endConnection) copy.endConnection = null;
      copy.groupId = null;

      newElements[newId] = copy;
      newOrder.push(newId);
      newSelected.add(newId);
    }

    set({
      elements: newElements,
      elementOrder: newOrder,
      selectedIds: newSelected,
    });
  },

  duplicateElements: () => {
    const state = get();
    if (state.selectedIds.size === 0) return;

    get()._pushHistory();

    const newElements = { ...state.elements };
    const newOrder = [...state.elementOrder];
    const newSelected = new Set();
    const offset = 20;

    for (const id of state.selectedIds) {
      const original = state.elements[id];
      if (!original) continue;

      const newId = generateId(original.type);
      const copy = {
        ...JSON.parse(JSON.stringify(original)),
        id: newId,
        x: (original.x || 0) + offset,
        y: (original.y || 0) + offset,
        zIndex: newOrder.length,
        groupId: null,
      };
      if (copy.x2 !== undefined) copy.x2 = original.x2 + offset;
      if (copy.y2 !== undefined) copy.y2 = original.y2 + offset;
      if (copy.startConnection) copy.startConnection = null;
      if (copy.endConnection) copy.endConnection = null;

      newElements[newId] = copy;
      newOrder.push(newId);
      newSelected.add(newId);
    }

    set({
      elements: newElements,
      elementOrder: newOrder,
      selectedIds: newSelected,
    });
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

    // Create group container element
    const memberEls = ids.map((id) => state.elements[id]).filter(Boolean);
    const { getCombinedBoundingBox: getCBB } = require('../utils/geometry');
    const bb = getCBB(memberEls);

    newElements[groupId] = {
      type: 'group',
      id: groupId,
      x: bb.x,
      y: bb.y,
      width: bb.width,
      height: bb.height,
      childIds: ids,
      locked: false,
      visible: true,
      zIndex: state.elementOrder.length,
    };

    // Tag each child with groupId
    for (const id of ids) {
      if (newElements[id]) {
        newElements[id] = { ...newElements[id], groupId };
      }
    }

    set({
      elements: newElements,
      elementOrder: [...state.elementOrder, groupId],
      selectedIds: new Set([groupId]),
    });
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
      if (!el || el.type !== 'group') {
        newSelected.add(id);
        continue;
      }

      // Ungroup: remove group, free children
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

    set({
      elements: newElements,
      elementOrder: newOrder,
      selectedIds: newSelected,
    });
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
    // Move each selected element one step forward
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
  // FACTORY HELPERS — create elements with defaults
  // ═══════════════════════════════════════════════════════

  createShape: (x, y, width, height, overrides = {}) => {
    const state = get();
    return {
      ...DEFAULT_SHAPE,
      id: generateId('shape'),
      shapeVariant: state.activeShapeVariant,
      x, y, width, height,
      fill: state.defaultFill,
      stroke: state.defaultStroke,
      strokeWidth: state.defaultStrokeWidth,
      fillOpacity: state.defaultFillOpacity,
      zIndex: state.elementOrder.length,
      ...overrides,
    };
  },

  createTextElement: (x, y, overrides = {}) => {
    const state = get();
    return {
      type: 'text',
      id: generateId('text'),
      x, y,
      width: 150,
      height: 30,
      zIndex: state.elementOrder.length,
      groupId: null,
      parentId: null,
      locked: false,
      visible: true,
      content: {
        ...DEFAULT_TEXT_CONTENT,
        fontSize: state.defaultFontSize,
        color: state.defaultFontColor,
      },
      ...overrides,
    };
  },

  createLine: (x, y, x2, y2, overrides = {}) => {
    const state = get();
    return {
      ...DEFAULT_LINE,
      id: generateId('line'),
      x, y, x2, y2,
      stroke: state.defaultStroke,
      strokeWidth: state.defaultStrokeWidth,
      lineStyle: state.activeLineStyle,
      arrowHead: state.activeArrowHead,
      zIndex: state.elementOrder.length,
      groupId: null,
      parentId: null,
      locked: false,
      visible: true,
      ...overrides,
    };
  },
}));

export default useWhiteboardStore;
export { DEFAULT_SHAPE, DEFAULT_TEXT_CONTENT, DEFAULT_LINE };
