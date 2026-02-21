import { create } from 'zustand';
import type { PLMNode, PLMEdge, ViewMode, User, Project } from './types';

// ═══════════════════════════════════════════
// Store State Interface
// ═══════════════════════════════════════════

type SetterOrValue<T> = T | ((prev: T) => T);

export interface StoreState {
  // UI
  sidebarOpen: boolean;
  filtersOpen: boolean;
  showShareModal: boolean;
  showNewObjectModal: boolean;
  showChangePassword: boolean;
  showSaveToast: boolean;
  showEdgePanel: boolean;
  showCreateLinkModal: boolean;
  showLinkManager: boolean;
  showHardwareTypesModal: boolean;
  showSplash: boolean;
  showRelationshipLabels: boolean;
  viewMode: ViewMode;
  isDarkMode: boolean;

  setSidebarOpen: (v: SetterOrValue<boolean>) => void;
  setFiltersOpen: (v: SetterOrValue<boolean>) => void;
  setShowShareModal: (v: boolean) => void;
  setShowNewObjectModal: (v: boolean) => void;
  setShowChangePassword: (v: boolean) => void;
  setShowSaveToast: (v: boolean) => void;
  setShowEdgePanel: (v: boolean) => void;
  setShowCreateLinkModal: (v: boolean) => void;
  setShowLinkManager: (v: boolean) => void;
  setShowHardwareTypesModal: (v: boolean) => void;
  setShowSplash: (v: boolean) => void;
  setShowRelationshipLabels: (v: SetterOrValue<boolean>) => void;
  setViewMode: (v: ViewMode) => void;
  setIsDarkMode: (v: boolean) => void;
  toggleTheme: () => void;

  // Filters
  searchText: string;
  typeFilter: string;
  statusFilter: string;
  priorityFilter: string;
  stateFilter: string;
  reqTypeFilter: string;
  classificationFilter: string;

  setSearchText: (v: string) => void;
  setTypeFilter: (v: string) => void;
  setStatusFilter: (v: string) => void;
  setPriorityFilter: (v: string) => void;
  setStateFilter: (v: string) => void;
  setReqTypeFilter: (v: string) => void;
  setClassificationFilter: (v: string) => void;
  clearFilters: () => void;

  // Project
  objectName: string;
  objectVersion: string;
  objectDescription: string;
  currentProject: Project | null;
  currentProjectId: string | null;

  setObjectName: (v: string) => void;
  setObjectVersion: (v: string) => void;
  setObjectDescription: (v: string) => void;
  setCurrentProject: (v: Project | null) => void;
  setCurrentProjectId: (v: string | null) => void;

  // Auth
  user: User | null;
  isAuthChecking: boolean;

  setUser: (v: User | null) => void;
  setIsAuthChecking: (v: boolean) => void;

  // Selection
  selectedNode: PLMNode | null;
  selectedEdge: PLMEdge | null;
  floatingPanelPosition: { x: number; y: number };
  edgePanelPosition: { x: number; y: number };
  createLinkSourceId: string | null;

  setSelectedNode: (v: SetterOrValue<PLMNode | null>) => void;
  setSelectedEdge: (v: SetterOrValue<PLMEdge | null>) => void;
  setFloatingPanelPosition: (v: { x: number; y: number }) => void;
  setEdgePanelPosition: (v: { x: number; y: number }) => void;
  setCreateLinkSourceId: (v: string | null) => void;
  clearSelection: () => void;
}

// ═══════════════════════════════════════════
// Store Implementation
// ═══════════════════════════════════════════

const useStore = create<StoreState>((set, get) => ({
  // UI STATE
  sidebarOpen: false,
  filtersOpen: false,
  showShareModal: false,
  showNewObjectModal: false,
  showChangePassword: false,
  showSaveToast: false,
  showEdgePanel: false,
  showCreateLinkModal: false,
  showLinkManager: false,
  showHardwareTypesModal: false,
  showSplash: true,
  showRelationshipLabels: true,
  viewMode: 'plm',
  isDarkMode: (() => {
    try { return localStorage.getItem('northlight-dark-mode') !== 'false'; } catch { return true; }
  })(),

  setSidebarOpen: (v) => set({ sidebarOpen: typeof v === 'function' ? v(get().sidebarOpen) : v }),
  setFiltersOpen: (v) => set({ filtersOpen: typeof v === 'function' ? v(get().filtersOpen) : v }),
  setShowShareModal: (v) => set({ showShareModal: v }),
  setShowNewObjectModal: (v) => set({ showNewObjectModal: v }),
  setShowChangePassword: (v) => set({ showChangePassword: v }),
  setShowSaveToast: (v) => set({ showSaveToast: v }),
  setShowEdgePanel: (v) => set({ showEdgePanel: v }),
  setShowCreateLinkModal: (v) => set({ showCreateLinkModal: v }),
  setShowLinkManager: (v) => set({ showLinkManager: v }),
  setShowHardwareTypesModal: (v) => set({ showHardwareTypesModal: v }),
  setShowSplash: (v) => set({ showSplash: v }),
  setShowRelationshipLabels: (v) => set({ showRelationshipLabels: typeof v === 'function' ? v(get().showRelationshipLabels) : v }),
  setViewMode: (v) => set({ viewMode: v }),
  setIsDarkMode: (v) => { localStorage.setItem('northlight-dark-mode', String(v)); set({ isDarkMode: v }); },
  toggleTheme: () => { const next = !get().isDarkMode; localStorage.setItem('northlight-dark-mode', String(next)); set({ isDarkMode: next }); },

  // FILTER STATE
  searchText: '',
  typeFilter: 'all',
  statusFilter: 'all',
  priorityFilter: 'all',
  stateFilter: 'all',
  reqTypeFilter: 'all',
  classificationFilter: 'all',

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

  // PROJECT STATE
  objectName: 'MPV Propulsion System',
  objectVersion: '1.0',
  objectDescription: 'Multi-Purpose Vessel propulsion control system',
  currentProject: null,
  currentProjectId: null,

  setObjectName: (v) => set({ objectName: v }),
  setObjectVersion: (v) => set({ objectVersion: v }),
  setObjectDescription: (v) => set({ objectDescription: v }),
  setCurrentProject: (v) => set({ currentProject: v }),
  setCurrentProjectId: (v) => set({ currentProjectId: v }),

  // AUTH STATE
  user: null,
  isAuthChecking: true,

  setUser: (v) => set({ user: v }),
  setIsAuthChecking: (v) => set({ isAuthChecking: v }),

  // SELECTION STATE
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

  clearSelection: () => set({
    selectedNode: null,
    selectedEdge: null,
  }),
}));

export default useStore;
