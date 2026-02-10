import { create } from 'zustand';

/**
 * Central Zustand store for Northlight PLM.
 * 
 * Organized in slices:
 *   - UI: modal/panel visibility, sidebar, view mode
 *   - Filters: search text and all filter dropdowns
 *   - Project: project metadata and object info
 *   - Auth: user and auth checking state
 *   - Selection: selected node/edge and panel positions
 */
const useStore = create((set, get) => ({

  // ═══════════════════════════════════════════
  // UI STATE
  // ═══════════════════════════════════════════
  sidebarOpen: false,
  filtersOpen: false,
  showShareModal: false,
  showNewObjectModal: false,
  showChangePassword: false,
  showSaveToast: false,
  showEdgePanel: false,
  showCreateLinkModal: false,
  showLinkManager: false,
  showSplash: true,
  showRelationshipLabels: true,
  viewMode: 'plm',  // 'plm' | 'whiteboard' | 'freeform' | 'document'

  // UI setters
  setSidebarOpen: (v) => set({ sidebarOpen: typeof v === 'function' ? v(get().sidebarOpen) : v }),
  setFiltersOpen: (v) => set({ filtersOpen: typeof v === 'function' ? v(get().filtersOpen) : v }),
  setShowShareModal: (v) => set({ showShareModal: v }),
  setShowNewObjectModal: (v) => set({ showNewObjectModal: v }),
  setShowChangePassword: (v) => set({ showChangePassword: v }),
  setShowSaveToast: (v) => set({ showSaveToast: v }),
  setShowEdgePanel: (v) => set({ showEdgePanel: v }),
  setShowCreateLinkModal: (v) => set({ showCreateLinkModal: v }),
  setShowLinkManager: (v) => set({ showLinkManager: v }),
  setShowSplash: (v) => set({ showSplash: v }),
  setShowRelationshipLabels: (v) => set({ showRelationshipLabels: typeof v === 'function' ? v(get().showRelationshipLabels) : v }),
  setViewMode: (v) => set({ viewMode: v }),

  // ═══════════════════════════════════════════
  // FILTER STATE
  // ═══════════════════════════════════════════
  searchText: '',
  typeFilter: 'all',
  statusFilter: 'all',
  priorityFilter: 'all',
  stateFilter: 'all',
  reqTypeFilter: 'all',
  classificationFilter: 'all',

  // Filter setters
  setSearchText: (v) => set({ searchText: v }),
  setTypeFilter: (v) => set({ typeFilter: v }),
  setStatusFilter: (v) => set({ statusFilter: v }),
  setPriorityFilter: (v) => set({ priorityFilter: v }),
  setStateFilter: (v) => set({ stateFilter: v }),
  setReqTypeFilter: (v) => set({ reqTypeFilter: v }),
  setClassificationFilter: (v) => set({ classificationFilter: v }),

  clearFilters: () => set({
    searchText: '',
    typeFilter: 'all',
    statusFilter: 'all',
    priorityFilter: 'all',
    stateFilter: 'all',
    reqTypeFilter: 'all',
    classificationFilter: 'all',
  }),

  // ═══════════════════════════════════════════
  // PROJECT STATE
  // ═══════════════════════════════════════════
  objectName: 'MPV Propulsion System',
  objectVersion: '1.0',
  objectDescription: 'Multi-Purpose Vessel propulsion control system',
  currentProject: null,
  currentProjectId: null,

  // Project setters
  setObjectName: (v) => set({ objectName: v }),
  setObjectVersion: (v) => set({ objectVersion: v }),
  setObjectDescription: (v) => set({ objectDescription: v }),
  setCurrentProject: (v) => set({ currentProject: v }),
  setCurrentProjectId: (v) => set({ currentProjectId: v }),

  // ═══════════════════════════════════════════
  // AUTH STATE
  // ═══════════════════════════════════════════
  user: null,
  isAuthChecking: true,

  setUser: (v) => set({ user: v }),
  setIsAuthChecking: (v) => set({ isAuthChecking: v }),

  // ═══════════════════════════════════════════
  // SELECTION STATE
  // ═══════════════════════════════════════════
  selectedNode: null,
  selectedEdge: null,
  floatingPanelPosition: { x: 0, y: 0 },
  edgePanelPosition: { x: 0, y: 0 },
  createLinkSourceId: null,

  setSelectedNode: (v) => set({ selectedNode: typeof v === 'function' ? v(get().selectedNode) : v }),
  setSelectedEdge: (v) => set({ selectedEdge: typeof v === 'function' ? v(get().selectedEdge) : v }),
  setFloatingPanelPosition: (v) => set({ floatingPanelPosition: v }),
  setEdgePanelPosition: (v) => set({ edgePanelPosition: v }),
  setCreateLinkSourceId: (v) => set({ createLinkSourceId: v }),

  /** Clear all selection state at once */
  clearSelection: () => set({
    selectedNode: null,
    selectedEdge: null,
  }),
}));

export default useStore;
