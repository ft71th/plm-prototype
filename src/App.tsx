import type { PLMNode, PLMEdge, NodeData, ProjectData, ViewMode } from './types';
import Login from './Login';
import { auth, projects, realtime } from './api';
import { NorthlightSplash, NorthlightLogo } from './NorthlightLogo';
import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import useStore from './store';
import { getTheme } from './theme';
import ProjectSelector from './ProjectSelector';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useUpdateNodeInternals,
  Panel,
  MarkerType,
  SelectionMode,
} from 'reactflow';
import '@reactflow/node-resizer/dist/style.css';
import 'reactflow/dist/style.css';
import Whiteboard from './components/Whiteboard/Whiteboard';
import TraceabilityView3D from './components/TraceabilityView3D/TraceabilityView3D';
import { CollaborationProvider, UserAvatars } from './collaboration';
import ShareProjectModal from './components/ShareProjectModal';
import DocumentViewEnhanced from './DocumentViewEnhanced';
import ImportRequirements from './components/ImportRequirements';
import { 
  useRequirementLinks, 
  CreateLinkModal, 
  LinkManagerPanel, 
  NodeLinkSection 
} from './RequirementLinks';

// ─── Task Management ───
import { TaskProvider, KanbanBoard, GanttView } from './tasks';
import './tasks/taskManagement.css';

// ─── Extracted Constants ───
import { RELATIONSHIP_TYPES, defaultEdgeOptions, inferRelationshipType } from './constants/relationships';
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES, ISSUE_STATUSES } from './constants/issues';
import { defaultHardwareTypes } from './constants/hardwareDefaults';
// initialNodes/initialEdges removed — projects load from database

// ─── Custom Hooks ───
import {
  useIdCounters, useIssueManager, useHardwareTypes, useWhiteboards,
  useUndoRedo, useClipboard, useNodeFactory, useNodeOperations,
  useEdgeHandlers, useFATProtocol, useVoiceRecognition, useLibrary,
  useProjectIO, useKeyboardShortcuts,
} from './hooks';

// ─── Extracted Flow Components ───
import { nodeTypes, edgeTypes } from './components/flow/nodeTypes';
import TextAnnotationNode from './components/flow/TextAnnotationNode';

// ─── Extracted Panel Components ───
import FloatingPanel from './components/panels/FloatingPanel';
import RelationshipPanel from './components/panels/RelationshipPanel';
import TextAnnotationToolbar from './components/panels/TextAnnotationToolbar';

// ─── Extracted Issue Components ───
import CreateIssueModal from './components/issues/CreateIssueModal';
import IssueManagerModal from './components/issues/IssueManagerModal';
import IssuePanelModal from './components/issues/IssuePanelModal';

// ─── Extracted Library Components ───
import ComponentLibraryPanel from './components/library/ComponentLibraryPanel';
import METSLibraryPanel from './components/library/METSLibraryPanel';
import SystemCodePicker from './components/library/SystemCodePicker';

// ─── Extracted Hardware Components ───
import ManageHardwareTypesModal from './components/hardware/ManageHardwareTypesModal';

// ─── Extracted Layout Components ───
import TopHeader from './components/layout/TopHeader';
import LeftIconStrip from './components/layout/LeftIconStrip';
import ProjectSidebar from './components/layout/ProjectSidebar';
import SelectionToolbar from './components/layout/SelectionToolbar';

// ─── Extracted Modal Components ───
import NewObjectModal from './components/modals/NewObjectModal';
import ChangePasswordModal from './components/modals/ChangePasswordModal';

// ─── Extracted View Components ───
import DocumentView from './components/views/DocumentView';
import { SequenceView } from './components/SequenceView';
import { DocumentEngine } from './components/DocumentEngine';

// API Base URL - same as api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * HandleUpdater — placed inside <ReactFlow> to force re-measurement of all node
 * handle positions after nodes are loaded. Without this, handles are at (0,0) 
 * until a manual resize triggers ResizeObserver.
 */
function HandleUpdater({ nodeIds, viewMode }: { nodeIds: string[], viewMode?: string }) {
  const updateNodeInternals = useUpdateNodeInternals();
  const prevCountRef = React.useRef(0);
  const prevViewRef = React.useRef(viewMode);

  React.useEffect(() => {
    if (nodeIds.length === 0) return;
    const countChanged = nodeIds.length !== prevCountRef.current;
    const viewChanged = viewMode !== prevViewRef.current;
    prevCountRef.current = nodeIds.length;
    prevViewRef.current = viewMode;

    if (!countChanged && !viewChanged) return;

    const updateAllAndShowEdges = () => {
      nodeIds.forEach(id => {
        try { updateNodeInternals(id); } catch(e) {}
      });
      // Show edges after handle positions are recalculated
      requestAnimationFrame(() => {
        const el = document.querySelector('.react-flow__edges') as HTMLElement | null;
        if (el) el.style.visibility = '';
      });
    };

    if (viewChanged) {
      // Edges are already hidden by handleViewModeChange (synchronous DOM).
      // Wait for nodes to finish rendering, then batch-update handles.
      // Double-rAF ensures browser has painted new node layout.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateAllAndShowEdges();
          // Safety pass for late-rendering nodes (images, etc.)
          setTimeout(updateAllAndShowEdges, 400);
        });
      });
    } else {
      // Node count change (project load): staggered updates
      const t1 = setTimeout(updateAllAndShowEdges, 200);
      const t2 = setTimeout(updateAllAndShowEdges, 800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [nodeIds, viewMode, updateNodeInternals]);

  return null;
}

export default function App(): React.ReactElement {
  // Suppress ResizeObserver loop error (common with React Flow, harmless)
  useEffect(() => {
    const resizeObserverErr = (e) => {
      if (e.message === 'ResizeObserver loop completed with undelivered notifications.' ||
          e.message === 'ResizeObserver loop limit exceeded') {
        e.stopImmediatePropagation();
        return;
      }
    };
    window.addEventListener('error', resizeObserverErr);
    return () => window.removeEventListener('error', resizeObserverErr);
  }, []);

  // ─── Dynamic viewport height (respects OS taskbar) ───
  const [appHeight, setAppHeight] = useState(window.innerHeight);
  useEffect(() => {
    const updateHeight = () => setAppHeight(window.innerHeight);
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Track whether initial node dimensions have been measured by ResizeObserver.
  // (Edge hiding removed — edges render instantly on view switch)
  
  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
  }, [onNodesChange]);
  
  // ─── Zustand Store (UI, filters, project, auth, selection) ───
  const {
    // Selection
    selectedNode, setSelectedNode, selectedEdge, setSelectedEdge,
    floatingPanelPosition, setFloatingPanelPosition,
    edgePanelPosition, setEdgePanelPosition,
    createLinkSourceId, setCreateLinkSourceId,
    // UI
    sidebarOpen, setSidebarOpen, filtersOpen, setFiltersOpen,
    showShareModal, setShowShareModal, showNewObjectModal, setShowNewObjectModal,
    showChangePassword, setShowChangePassword, showSaveToast,
    showEdgePanel, setShowEdgePanel, showCreateLinkModal, setShowCreateLinkModal,
    showLinkManager, setShowLinkManager, showSplash, setShowSplash,
    showRelationshipLabels, setShowRelationshipLabels,
    viewMode, setViewMode,
    // Filters
    searchText, setSearchText,
    typeFilter, setTypeFilter, statusFilter, setStatusFilter,
    priorityFilter, setPriorityFilter, stateFilter, setStateFilter,
    reqTypeFilter, setReqTypeFilter, classificationFilter, setClassificationFilter,
    clearFilters,
    // Project
    objectName, setObjectName, objectVersion, setObjectVersion,
    objectDescription, setObjectDescription,
    currentProject, setCurrentProject, currentProjectId, setCurrentProjectId,
    // Auth
    user, setUser, isAuthChecking, setIsAuthChecking,
    // Theme
    isDarkMode, toggleTheme,
  } = useStore();

  const theme = useMemo(() => getTheme(isDarkMode), [isDarkMode]);

  // ─── Sync CSS variables to :root for global inheritance ───
  useEffect(() => {
    const root = document.documentElement;
    Object.entries({
      '--nl-bg-app': theme.bgApp,
      '--nl-bg-header': theme.bgHeader,
      '--nl-bg-header-border': theme.bgHeaderBorder,
      '--nl-bg-sidebar': theme.bgSidebar,
      '--nl-bg-canvas': theme.bgCanvas,
      '--nl-bg-panel': theme.bgPanel,
      '--nl-bg-input': theme.bgInput,
      '--nl-bg-hover': theme.bgHover,
      '--nl-bg-accent': theme.bgAccent,
      '--nl-bg-overlay': theme.bgOverlay,
      '--nl-text-primary': theme.textPrimary,
      '--nl-text-secondary': theme.textSecondary,
      '--nl-text-muted': theme.textMuted,
      '--nl-text-inverse': theme.textInverse,
      '--nl-border': theme.border,
      '--nl-border-light': theme.borderLight,
      '--nl-border-focus': theme.borderFocus,
      '--nl-accent': theme.accent,
      '--nl-shadow': theme.shadow,
      '--nl-shadow-lg': theme.shadowLg,
    }).forEach(([key, value]) => root.style.setProperty(key, value));
    root.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [theme, isDarkMode]);

  // ─── Custom Hooks ───
  const {
    nodeId, setNodeId, generateItemId, setCountersFromNodes, incrementCounter, counters
  } = useIdCounters();

  const issueManager = useIssueManager();
  const {
    issues, issueIdCounter,
    addIssue, updateIssue, deleteIssue,
    getNodeIssues, getOpenIssueCount, getCriticalIssueCount,
    loadIssues,
    showIssuePanel, setShowIssuePanel,
    issueNodeId, setIssueNodeId,
    selectedIssue, setSelectedIssue,
    showCreateIssueModal, setShowCreateIssueModal,
    createIssueNodeId, setCreateIssueNodeId,
    showIssueManagerModal, setShowIssueManagerModal,
  } = issueManager;

  const {
    hardwareTypes, setHardwareTypes,
    showHardwareTypesModal, setShowHardwareTypesModal,
    fetchHardwareTypes, addHardwareType, deleteHardwareType, updateHardwareType,
  } = useHardwareTypes();

  const {
    whiteboards, setWhiteboards,
    activeWhiteboardId, setActiveWhiteboardId,
    whiteboardNodes, whiteboardEdges,
    showWhiteboardDropdown, setShowWhiteboardDropdown,
    createNewWhiteboard, switchWhiteboard, deleteWhiteboard,
    loadWhiteboards,
  } = useWhiteboards({ nodes, edges, setNodes, setEdges });

  const {
    undo, redo, isUndoRedo, resetHistory, canUndo, canRedo,
  } = useUndoRedo({ nodes, edges, setNodes, setEdges });


  
  // ─── Requirement Links ────────────────────────
  const {
    links: requirementLinks,
    setLinks: setRequirementLinks,
    addLink,
    removeLink,
    updateLink,
    updateLinkStatus,
    pinLink,
    unpinLink,
    baselineAllLinks,
    getLinksForNode,
    runHealthChecks,
    findOrphans,
    findCircularDeps,
    findUncoveredRequirements,
    getImpactAnalysis,
  } = useRequirementLinks([]);



  // Health checks (memoized)
  const linkHealthIssues = useMemo(() => runHealthChecks(nodes), [nodes, requirementLinks]);
  const orphanNodes = useMemo(() => findOrphans(nodes, edges), [nodes, edges, requirementLinks]);
  const uncoveredReqs = useMemo(() => findUncoveredRequirements(nodes), [nodes, requirementLinks]);
  const circularDeps = useMemo(() => findCircularDeps(), [requirementLinks]);

  // Handler for creating links from doc view or floating panel
  const handleCreateLinkFromNode = useCallback((nodeId) => {
    setCreateLinkSourceId(nodeId || null);
    setShowCreateLinkModal(true);
  }, []);





  const reactFlowWrapper = useRef<any>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [showImport, setShowImport] = useState(false);




   // Handle login
  const handleLogin = (userData) => {
    setUser(userData);
    realtime.connect();
    fetchHardwareTypes();  // Load hardware types from database
  };

  // Handle logout
  const handleLogout = () => {
    auth.logout();
    setUser(null);
    setCurrentProjectId(null);
  };

  // Handle project selection
  const handleSelectProject = (projectData) => {
    console.log('Opening project:', projectData);
    
    // Set project info
    setCurrentProject(projectData.project || projectData);
    setObjectName(projectData.project?.name || projectData.name || 'New Project');
    setObjectDescription(projectData.project?.description || projectData.description || '');
    setObjectVersion(projectData.project?.version || projectData.version || '1.0');
    
    // Load nodes and edges if present
    if (projectData.nodes) {
      const loadedNodes = projectData.nodes.map(node => {
        // Only set explicit width/height if the node has saved dimensions.
        // Do NOT use fallback defaults — they differ between PLM/Simple views
        // and would give ReactFlow incorrect handle positions.
        // Nodes without saved dimensions will be measured by ResizeObserver.
        const hasSavedWidth = node.data?.nodeWidth || node.width;
        const hasSavedHeight = node.data?.nodeHeight || node.height;
        
        return {
          ...node,
          // Only tell ReactFlow dimensions if we actually know them
          ...(hasSavedWidth ? { width: node.data?.nodeWidth || node.width } : {}),
          ...(hasSavedHeight ? { height: node.data?.nodeHeight || node.height } : {}),
          // Restore resized dimensions as style so ReactFlow renders at saved size
          style: {
            ...(node.style || {}),
            ...(node.data?.nodeWidth ? { width: node.data.nodeWidth } : {}),
            ...(node.data?.nodeHeight ? { height: node.data.nodeHeight } : {}),
          },
          data: {
            ...node.data,
            // Preserve reqType - don't override it!
            reqType: node.data.reqType,
            onChange: handleNodeLabelChange
          }
        };
      });
      setNodes(loadedNodes);
      
      // Update all ID counters based on loaded nodes (via hook)
      setCountersFromNodes(projectData.nodes);
      
      // Load issues (via hook)
      loadIssues(projectData.issues);
      
      // Process edges - validate handles and auto-resolve missing ones by geometry
      if (projectData.edges) {
        // Built-in handle IDs from ExtraHandles component in CustomNode
        const BUILTIN_HANDLES = new Set([
          'top-target', 'top-source',
          'bottom-target', 'bottom-source',
          'left-source', 'right-target',
        ]);

        // Pick the best source/target handle pair based on relative node positions
        const resolveHandles = (srcNode: any, tgtNode: any) => {
          if (!srcNode || !tgtNode) return { sourceHandle: 'default-source', targetHandle: 'default-target' };

          const sw = srcNode.width || srcNode.data?.nodeWidth || 160;
          const sh = srcNode.height || srcNode.data?.nodeHeight || 100;
          const tw = tgtNode.width || tgtNode.data?.nodeWidth || 160;
          const th = tgtNode.height || tgtNode.data?.nodeHeight || 100;

          // Center points of each node
          const sx = srcNode.position.x + sw / 2;
          const sy = srcNode.position.y + sh / 2;
          const tx = tgtNode.position.x + tw / 2;
          const ty = tgtNode.position.y + th / 2;

          const dx = tx - sx;
          const dy = ty - sy;

          // Choose handles based on dominant direction
          if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
              // Target is to the RIGHT → source right side, target left side
              return { sourceHandle: 'default-source', targetHandle: 'default-target' };
            } else {
              // Target is to the LEFT → source left side, target right side
              return { sourceHandle: 'left-source', targetHandle: 'right-target' };
            }
          } else {
            if (dy > 0) {
              // Target is BELOW → source bottom, target top
              return { sourceHandle: 'bottom-source', targetHandle: 'top-target' };
            } else {
              // Target is ABOVE → source top, target bottom
              return { sourceHandle: 'top-source', targetHandle: 'bottom-target' };
            }
          }
        };

        const edgesWithArrows = projectData.edges.map((edge, idx) => {
          const sourceNode = loadedNodes.find(n => n.id === edge.source);
          const targetNode = loadedNodes.find(n => n.id === edge.target);
          
          // Validate handles against custom ports + built-in handles
          const sourcePorts = sourceNode?.data?.ports || [];
          const targetPorts = targetNode?.data?.ports || [];
          
          const isValidSource = edge.sourceHandle && (
            edge.sourceHandle === 'default-source' ||
            BUILTIN_HANDLES.has(edge.sourceHandle) ||
            sourcePorts.some(p => p.id === edge.sourceHandle)
          );
          const isValidTarget = edge.targetHandle && (
            edge.targetHandle === 'default-target' ||
            BUILTIN_HANDLES.has(edge.targetHandle) ||
            targetPorts.some(p => p.id === edge.targetHandle)
          );

          // Use valid handles, or resolve geometrically for missing/invalid ones
          let finalSourceHandle = isValidSource ? edge.sourceHandle : null;
          let finalTargetHandle = isValidTarget ? edge.targetHandle : null;

          if (!finalSourceHandle || !finalTargetHandle) {
            const resolved = resolveHandles(sourceNode, targetNode);
            if (!finalSourceHandle) finalSourceHandle = resolved.sourceHandle;
            if (!finalTargetHandle) finalTargetHandle = resolved.targetHandle;
          }

          return {
            ...edge,
            // Ensure every edge has a unique id
            id: edge.id || `e-${edge.source}-${edge.target}-${idx}`,
            sourceHandle: finalSourceHandle,
            targetHandle: finalTargetHandle,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: '#95a5a6'
            }
          };
        });
        
        // Deduplicate edges by id
        const seenEdgeIds = new Set();
        const uniqueEdges = edgesWithArrows.filter(e => {
          if (seenEdgeIds.has(e.id)) return false;
          seenEdgeIds.add(e.id);
          return true;
        });
        setEdges(uniqueEdges);
      } else {
        setEdges([]);
      }
    } else {
      setNodes([]);
      setEdges([]);
      // Reset counters for empty project (via hook)
      setCountersFromNodes(null);
      setRequirementLinks([]);
    }
    
    // Load whiteboards (via hook)
    loadWhiteboards(projectData.whiteboards);

    // Load requirement links if present
    if (projectData.requirementLinks) {
      setRequirementLinks(projectData.requirementLinks);
    } else {
      setRequirementLinks([]);
    }
    
    // Clear selection state
    setSelectedNode(null);
    setSelectedEdge(null);
    
    // Connect to real-time
    realtime.connect();
    realtime.joinProject(projectData.project?.id || projectData.id, user);
  };

  // Handle close project (back to project list)
  const handleCloseProject = () => {
    if (currentProject) {
      realtime.leaveProject(currentProject.id);
    }
    setCurrentProject(null);
    setNodes([]);
    setEdges([]);
  };

  // Save project to database

  const stats = useMemo(() => {
    const floatingConnectors = nodes.filter(n => n.data?.isFloatingConnector).length;  // ADD THIS
    const total = nodes.length - floatingConnectors;  // Don't count connectors as items
    const stateOpen = nodes.filter(n => !n.data?.isFloatingConnector && (n.data.state === 'open' || !n.data.state)).length;
    const stateFrozen = nodes.filter(n => !n.data?.isFloatingConnector && n.data.state === 'frozen').length;
    const stateReleased = nodes.filter(n => !n.data?.isFloatingConnector && n.data.state === 'released').length;
    const connections = edges.length;
    
    const relationshipCounts = {};
    edges.forEach(e => {
      const type = e.data?.relationType || 'related';
      relationshipCounts[type] = (relationshipCounts[type] || 0) + 1;
    });
    
    return { total, stateOpen, stateFrozen, stateReleased, connections, relationshipCounts, floatingConnectors };  // ADD floatingConnectors
  }, [nodes, edges]);


  // ─── Edge Handlers Hook ───
  const {
    edgeUpdateSuccessful,
    onEdgeUpdateStart, onEdgeUpdate, onEdgeUpdateEnd,
    onNodeDragStop, onConnect,
  } = useEdgeHandlers({ nodes, setNodes, setEdges, reactFlowInstance });


  const handleNodeLabelChange = useCallback((nodeId: string, field: string, value: unknown) => {
  // Support both old format (nodeId, labelValue) and new format (nodeId, field, value)
  if (value === undefined) {
    // Old format: handleNodeLabelChange(id, 'new label')
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label: field } }
          : node
      )
    );
  } else {
    // New format: handleNodeLabelChange(id, 'width', 200)
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, [field]: value } }
          : node
      )
    );
  }
}, [setNodes]);

  // Handle importing requirements from documents
  const handleImportNodes = useCallback((newNodes) => {
    setNodes(nds => [...nds, ...newNodes.map(n => ({
      ...n,
      data: { ...n.data, onChange: handleNodeLabelChange }
    }))]);
    setShowImport(false);
  }, [setNodes, handleNodeLabelChange]);

  // ─── Clipboard & Node Operations Hooks (depend on handleNodeLabelChange) ───
  const {
    clipboard, copySelectedNodes, pasteNodes, deleteSelectedNodes, duplicateSelectedNodes,
  } = useClipboard({
    nodes, edges, setNodes, setEdges,
    nodeId, setNodeId,
    counters, incrementCounter,
    handleNodeLabelChange,
  });

  const {
    alignSelectedNodes, toggleLockSelectedNodes, exportSelectedNodes,
    groupSelectedNodes, ungroupSelectedNodes, autoLayoutNodes,
  } = useNodeOperations({
    nodes, edges, setNodes, nodeId, setNodeId, handleNodeLabelChange,
    reactFlowInstance,
  });


  const handleNodeClick = (event, node) => {
    // Single click just highlights/selects - doesn't open panel
    setSelectedEdge(null);
  };

  const handleNodeDoubleClick = (event, node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    
    // Position panel to the right of the clicked node
    const nodeElement = event.target.closest('.react-flow__node');
    if (nodeElement) {
      const rect = nodeElement.getBoundingClientRect();
      setFloatingPanelPosition({
        x: rect.right + 20,  // 20px to the right of node
        y: rect.top
      });
    } else {
      setFloatingPanelPosition({
        x: event.clientX + 20,
        y: event.clientY
      });
    }
  };

  // Single click - just select, don't show panel
   const onEdgeClick = useCallback((event, edge) => {
    setSelectedNode(null);
    setShowEdgePanel(false);
    
    // Bring selected edge to top by updating its zIndex
    setEdges((eds) => eds.map((e) => ({
      ...e,
      zIndex: e.id === edge.id ? 1000 : 0,
      selected: e.id === edge.id
    })));
    
    setSelectedEdge(edge);
  }, [setEdges]);

  // Double click - open edge panel
  const onEdgeDoubleClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setShowEdgePanel(true);   // ADD THIS
    
    // Position panel near the click
    setEdgePanelPosition({
      x: Math.min(event.clientX + 20, window.innerWidth - 350),
      y: Math.max(event.clientY - 100, 60)
    });
  }, []);

   const updateNodeData = useCallback((nodeId, field, value) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, [field]: value } };
        }
        return node;
      })
    );
    setSelectedNode((current) => {
      if (current && current.id === nodeId) {
        return { ...current, data: { ...current.data, [field]: value } };
      }
      return current;
    });
  }, [setNodes]);

  const updateEdgeData = (edgeId, field, value) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === edgeId) {
          return { ...edge, data: { ...edge.data, [field]: value } };
        }
        return edge;
      })
    );
    
    // Also update selectedEdge so the panel reflects the change
    if (selectedEdge && selectedEdge.id === edgeId) {
      setSelectedEdge({
        ...selectedEdge,
        data: { ...selectedEdge.data, [field]: value }
      });
    }
  };

  // ─── Library Hook ───
  const {
    showLibraryPanel, setShowLibraryPanel,
    libraryItems, setLibraryItems,
    fetchLibraryItems, saveNodeToLibrary, addLibraryItemToCanvas,
  } = useLibrary({ nodeId, setNodeId, setNodes });

  // Wrap setViewMode to hide edges SYNCHRONOUSLY before React re-renders.
  // This prevents edges from flashing at wrong positions during the render cycle.
  const handleViewModeChange = useCallback((newMode: string) => {
    // Synchronous DOM manipulation — happens BEFORE React starts re-rendering
    const edgeEl = document.querySelector('.react-flow__edges') as HTMLElement | null;
    if (edgeEl) edgeEl.style.visibility = 'hidden';
    setViewMode(newMode);
  }, [setViewMode]);


  // ── Stable node callbacks (avoid new refs per node per render) ──
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  const handleShowIssues = useCallback((n: any) => {
    setIssueNodeId(n.id);
    setShowIssuePanel(true);
  }, [setIssueNodeId, setShowIssuePanel]);

  // ── Stable edge callbacks (avoid new refs every render) ──
  const handleEdgeLabelChange = useCallback((edgeId: string, newLabel: string) => {
    setEdges(eds => eds.map(edge =>
      edge.id === edgeId
        ? { ...edge, data: { ...edge.data, customLabel: newLabel } }
        : edge
    ));
  }, [setEdges]);

  const handleEdgeDoubleClickCb = useCallback((edgeId: string, event: any) => {
    const edge = edges.find(ed => ed.id === edgeId);
    if (edge) {
      setSelectedEdge(edge);
      setEdgePanelPosition({ x: event.clientX, y: event.clientY });
    }
  }, [edges, setSelectedEdge, setEdgePanelPosition]);

  // ── Memoized edges (prevents 74 new objects per render) ──
  const processedEdges = useMemo(() => {
    const isWb = viewMode === 'whiteboard';
    return edges.map(e => ({
      ...e,
      data: {
        ...e.data,
        showLabel: showRelationshipLabels,
        isWhiteboardMode: isWb,
        onLabelChange: handleEdgeLabelChange,
        onEdgeDoubleClick: handleEdgeDoubleClickCb,
      }
    }));
  }, [edges, showRelationshipLabels, viewMode, handleEdgeLabelChange, handleEdgeDoubleClickCb]);

  const processedNodes = useMemo(() => {
    return nodes.map((node) => {
      const searchLower = searchText.toLowerCase();
      const matchesSearch = searchText === '' || 
        node.data.label.toLowerCase().includes(searchLower) ||
        (node.data.description && node.data.description.toLowerCase().includes(searchLower)) ||
        (node.data.reqId && node.data.reqId.toLowerCase().includes(searchLower));
      
      const matchesType = typeFilter === 'all' || node.data.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || node.data.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || node.data.priority === priorityFilter;
      const matchesState = stateFilter === 'all' || node.data.state === stateFilter || (stateFilter === 'open' && !node.data.state);
      const matchesReqType = reqTypeFilter === 'all' || node.data.reqType === reqTypeFilter;
      const matchesClassification = classificationFilter === 'all' || node.data.classification === classificationFilter;
      
      const isFiltered = matchesSearch && matchesType && matchesStatus && matchesPriority && matchesState && matchesReqType && matchesClassification;
      const isHighlighted = searchText !== '' && isFiltered;

      // Add issue counts
      const nodeIssues = issues[node.id] || [];
      const issueCount = nodeIssues.filter(i => i.status !== 'closed' && i.status !== 'resolved').length;
      const criticalIssueCount = nodeIssues.filter(i => 
        (i.severity === 'critical' || i.severity === 'high') && 
        i.status !== 'closed' && i.status !== 'resolved'
      ).length;

      return {
        ...node,
        data: { 
          ...node.data, 
          isFiltered, 
          isHighlighted, 
          isWhiteboardMode: viewMode === 'whiteboard', 
          onChange: handleNodeLabelChange,
          issueCount,
          criticalIssueCount,
          onDeleteNode: handleDeleteNode,
          onShowIssues: handleShowIssues
        },
      };
    });
  }, [nodes, searchText, typeFilter, statusFilter, priorityFilter, stateFilter, reqTypeFilter, classificationFilter, handleNodeLabelChange, viewMode, issues, isDarkMode]);

  const filteredCount = processedNodes.filter(n => n.data.isFiltered).length;

  // ─── Node Factory Hook (replaces 10 add*Node functions) ───
  const {
    addNode,
    addSystemNode, addSubSystemNode, addFunctionNode, addTestCaseNode,
    addUseCaseNode, addActorNode,
    addParameterNode, addHardwareNode, addTextAnnotationNode,
    addPlatformNode, addRequirementNode,
    addImageNode,
    addPostItNode,
    addSWComponentNode,
  } = useNodeFactory({
    nodeId, setNodeId, generateItemId, handleNodeLabelChange,
    setNodes, reactFlowInstance, hardwareTypes,
  });

  // ─── METS Library Panel state ───
  const [showMETSLibrary, setShowMETSLibrary] = useState(false);
  const [pendingMETSComponent, setPendingMETSComponent] = useState<{
    familyKey: string; variantKey: string; position?: { x: number; y: number };
  } | null>(null);



  // ─── Project I/O Hook (save/export/import) ───
  const { saveProjectToDatabase, exportProject, exportToExcel, importProject } = useProjectIO({
    nodes, edges, setNodes, setEdges,
    whiteboards, whiteboardNodes, whiteboardEdges,
    issues, issueIdCounter,
    handleNodeLabelChange,
    setCountersFromNodes, loadIssues, resetHistory,
    requirementLinks,
  });

  // ─── FAT Protocol Hook ───
  const { generateFATProtocol } = useFATProtocol({ nodes, edges });

  // ─── Voice Recognition Hook ───
  const {
    isListening, voiceStatus,
    startVoiceRecognition, startVoiceDictation,
  } = useVoiceRecognition({
    addSystemNode, addSubSystemNode, addFunctionNode,
    addRequirementNode, addTestCaseNode, addPlatformNode,
    addUseCaseNode, addActorNode,
    exportProject, exportToExcel,
    undo, redo,
  });

const createNewObject = (name, version, description) => {
    setObjectName(name);
    setObjectVersion(version);
    setObjectDescription(description);
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setSelectedEdge(null);
    setCountersFromNodes(null); // Reset all counters via hook
    resetHistory();
  };

  const duplicateNode = useCallback((nodeToDuplicate) => {
    if (!nodeToDuplicate) return;
    
    const reqId = generateItemId (nodeToDuplicate.data.reqType || 'project');
    
    // Use functional setNodes + timestamp ID to avoid stale nodeId closures
    // that caused cascading duplicates when called rapidly
    const newId = `dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    
    // Clean data: only copy content properties, re-attach fresh callbacks
    const { onChange, onShowIssues, onDeleteNode, isHighlighted, isFiltered, ...cleanData } = nodeToDuplicate.data;
    
    const newNode = {
      id: newId,
      type: 'custom',
      position: { 
        x: nodeToDuplicate.position.x + 50, 
        y: nodeToDuplicate.position.y + 50 
      },
      data: { 
        ...cleanData,
        label: nodeToDuplicate.data.label.replace(/ \(Copy\)$/, '') + ' (Copy)',
        reqId: reqId,
        state: 'open',
        onChange: handleNodeLabelChange
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  }, [handleNodeLabelChange, setNodes, generateItemId ]);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('plm_token');
      const savedUser = localStorage.getItem('plm_user');
      
      console.log('Auth check - Token exists:', !!token, 'User exists:', !!savedUser);
      
      if (token && savedUser) {
        try {
          const userData = await auth.me();
          useStore.getState().setUser(userData);
          realtime.connect();
          fetchHardwareTypes();
        } catch (err) {
          console.error('Auth check failed:', err);
          localStorage.removeItem('plm_token');
          localStorage.removeItem('plm_user');
          useStore.getState().setUser(null);
        }
      } else {
        useStore.getState().setUser(null);
      }
      
      useStore.getState().setIsAuthChecking(false);
    };
    checkAuth();
  }, []);

 // Expose duplicateNode and generateFATProtocol to window for FloatingPanel buttons
  useEffect(() => {
    window.duplicateNodeFunction = duplicateNode;
    window.generateFATFunction = generateFATProtocol;
    window.startVoiceDictation = startVoiceDictation;
    return () => {
      delete window.duplicateNodeFunction;
      delete window.generateFATFunction;
      delete window.startVoiceDictation;
    };
  }, [duplicateNode, generateFATProtocol, startVoiceDictation]);

  // ─── Keyboard Shortcuts Hook ───
  useKeyboardShortcuts({
    copySelectedNodes, pasteNodes, deleteSelectedNodes, duplicateSelectedNodes,
    toggleLockSelectedNodes, groupSelectedNodes, ungroupSelectedNodes,
    addPlatformNode, addRequirementNode,
    autoLayoutNodes,
    saveProjectToDatabase, exportProject,
    undo, redo,
    duplicateNode,
    nodes, setNodes,
    addImageNode,
  });

  if (showSplash) {
      return <NorthlightSplash onComplete={() => setShowSplash(false)} duration={5000} />;
    }
  // Show loading while checking auth
  
  if (isAuthChecking) {
    return (
      <div style={{
        minHeight: `${appHeight}px`,
        background: theme.bgApp,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  // Show login if NOT authenticated (user is null or undefined)
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Show project selector if no project open
  if (!currentProject) {
    return (
      <ProjectSelector
        user={user}
        onSelectProject={handleSelectProject}
        onLogout={handleLogout}
      />
    );
  }

  // Toolbar button styles
  const toolbarBtnStyle = (bgColor) => ({
    background: bgColor,
    border: 'none',
    color: 'white',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px'
  });
  
  const toolbarBtnSmall = {
    background: 'var(--nl-bg-input, #4a5f7f)',
    border: 'none',
    color: 'var(--nl-text-primary, white)',
    padding: '4px 6px',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px',
    minWidth: '24px'
  };
  
  //APP return

  return (
    <CollaborationProvider
      projectId={currentProject?.id}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        token: localStorage.getItem('plm_token'),
      }}
    >
    <div style={{
      width: '100vw', height: `${appHeight}px`, background: theme.bgApp, overflow: 'hidden',
      // CSS custom properties for deep component theming
      '--nl-bg-app': theme.bgApp,
      '--nl-bg-header': theme.bgHeader,
      '--nl-bg-header-border': theme.bgHeaderBorder,
      '--nl-bg-sidebar': theme.bgSidebar,
      '--nl-bg-canvas': theme.bgCanvas,
      '--nl-bg-panel': theme.bgPanel,
      '--nl-bg-input': theme.bgInput,
      '--nl-bg-hover': theme.bgHover,
      '--nl-bg-accent': theme.bgAccent,
      '--nl-bg-overlay': theme.bgOverlay,
      '--nl-text-primary': theme.textPrimary,
      '--nl-text-secondary': theme.textSecondary,
      '--nl-text-muted': theme.textMuted,
      '--nl-text-inverse': theme.textInverse,
      '--nl-border': theme.border,
      '--nl-border-light': theme.borderLight,
      '--nl-border-focus': theme.borderFocus,
      '--nl-accent': theme.accent,
      '--nl-shadow': theme.shadow,
      '--nl-shadow-lg': theme.shadowLg,
    } as any}>
      
      {/* Top Header */}
      <TopHeader
        objectName={objectName}
        objectVersion={objectVersion}
        onMenuClick={() => {
          setSidebarOpen(true);
          setSelectedNode(null);
          setSelectedEdge(null);
        }}
        searchText={searchText}
        onSearchChange={setSearchText}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => {
          setFiltersOpen(!filtersOpen);
          setSelectedNode(null);
          setSelectedEdge(null);
        }}
        filters={{
          type: reqTypeFilter,
          state: stateFilter,
          priority: priorityFilter,
          classification: classificationFilter
        }}
        onFilterChange={(filterType, value) => {
          if (filterType === 'type') setReqTypeFilter(value);
          if (filterType === 'state') setStateFilter(value);
          if (filterType === 'priority') setPriorityFilter(value);
          if (filterType === 'classification') setClassificationFilter(value);
        }}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        whiteboards={whiteboards}
        activeWhiteboardId={activeWhiteboardId}
        showWhiteboardDropdown={showWhiteboardDropdown}
        onWhiteboardDropdownToggle={() => setShowWhiteboardDropdown(!showWhiteboardDropdown)}
        onWhiteboardSelect={switchWhiteboard}
        onNewWhiteboard={createNewWhiteboard}
        onDeleteWhiteboard={deleteWhiteboard}
        user={user}
        onLogout={handleLogout}
        onChangePassword={() => setShowChangePassword(true)}
        UserAvatarsComponent={UserAvatars}
        theme={theme}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
      
      {/* Left Icon Strip - hidden in freeform drawing mode */}
      {viewMode !== 'freeform' && viewMode !== 'tasks' && viewMode !== 'gantt' && viewMode !== '3d' && viewMode !== 'sequence' && viewMode !== 'docs' && <LeftIconStrip
        onAddSystem={addSystemNode}
        onAddSubSystem={addSubSystemNode}
        onAddFunction={addFunctionNode}
        onAddTestCase={addTestCaseNode}
        onAddRequirement={addRequirementNode}
        onAddPlatform={addPlatformNode}
        onAddParameter={addParameterNode}
        onAddHardware={addHardwareNode}
        onAddUseCase={addUseCaseNode}
        onAddActor={addActorNode}
        onAddTextAnnotation={addTextAnnotationNode}
        onAddPostIt={addPostItNode}
        onOpenLibrary={() => setShowLibraryPanel(true)}
        onOpenMETSLibrary={() => setShowMETSLibrary(true)}
        onOpenIssueManager={() => setShowIssueManagerModal(true)}
        onVoice={startVoiceRecognition}
        isListening={isListening}
        voiceStatus={voiceStatus}
        theme={theme}
      />}
      
      {/* Sidebar */}
      <ProjectSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          saveProjectToDatabase={saveProjectToDatabase}
          handleCloseProject={handleCloseProject}
          exportProject={exportProject}
          exportToExcel={exportToExcel}
          onImportRequirements={() => { setSidebarOpen(false); setShowImport(true); }}
          autoLayoutNodes={autoLayoutNodes}
          stats={stats}
          filteredCount={filteredCount}
          edges={edges}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      
      {/* Show Document View, Tasks Board, Freeform Whiteboard, OR PLM Canvas */}
      {viewMode === 'document' ? (
      <DocumentViewEnhanced 
        nodes={nodes} 
        edges={edges} 
        onNodeClick={(node) => {
          setSelectedNode(node);
          setFloatingPanelPosition({ x: window.innerWidth - 350, y: 100 });
        }}
        onUpdateNodeData={updateNodeData}
        requirementLinks={requirementLinks}
        onCreateLink={handleCreateLinkFromNode}
        onRemoveLink={removeLink}
        onPinLink={pinLink}
        onUnpinLink={unpinLink}
        onUpdateLinkStatus={updateLinkStatus}
        onUpdateLink={updateLink}
        onBaselineAll={baselineAllLinks}
        onCreateNode={() => {
          // Reuse existing createNewObject logic
          const id = `node-${nodeId}`;
          setNodeId(prev => prev + 1);
          const newNode = {
            id,
            type: 'custom',
            position: { x: 100, y: 100 },
            data: {
              label: 'New Requirement',
              reqId: `REQ-${String(nodeId).padStart(3, '0')}`,
              description: '',
              status: 'draft',
              priority: 'medium',
              state: 'open',
              version: '1.0',
              itemType: 'requirement',
            },
          };
          setNodes(nds => [...nds, newNode]);
          return newNode;
        }}
        onCreatePostIt={() => addPostItNode('yellow')}
        healthIssues={linkHealthIssues}
        user={user?.name || 'unknown'}
      />
      ) : viewMode === 'tasks' ? (
        <TaskProvider projectId={currentProject?.id || 'default'} currentUser={user?.name || 'user'} isDarkMode={isDarkMode}>
          <div style={{ 
            marginTop: '50px', 
            height: `${appHeight - 50}px`,
            overflow: 'hidden'
          }}>
            <KanbanBoard
              allProjectIds={[currentProject?.id || 'default']}
              getProjectName={() => currentProject?.name || objectName || 'Project'}
            />
          </div>
        </TaskProvider>
      ) : viewMode === 'gantt' ? (
        <TaskProvider projectId={currentProject?.id || 'default'} currentUser={user?.name || 'user'} isDarkMode={isDarkMode}>
          <div style={{ 
            marginTop: '50px', 
            height: `${appHeight - 50}px`,
            overflow: 'hidden'
          }}>
            <GanttView />
          </div>
        </TaskProvider>
      ) : viewMode === '3d' ? (
        <TraceabilityView3D 
          projectId={currentProject?.id || null}
          nodes={nodes}
          edges={edges}
          requirementLinks={requirementLinks}
          style={{ marginTop: '50px', height: `${appHeight - 50}px` }} 
        />
      ) : viewMode === 'sequence' ? (
        <SequenceView
          projectId={currentProject?.id || null}
          nodes={nodes}
          edges={edges}
          style={{ marginTop: '50px', height: `${appHeight - 50}px` }}
        />
      ) : viewMode === 'docs' ? (
        <div style={{ marginTop: '50px', height: `${appHeight - 50}px`, overflow: 'hidden' }}>
          <DocumentEngine
            projectId={currentProject?.id || null}
            theme={theme}
          />
        </div>
      ) : viewMode === 'freeform' ? (
        <Whiteboard style={{ marginTop: '50px', height: `${appHeight - 50}px` }} projectId={currentProject?.id || null} />
      ) : (
      
      <ReactFlow
        nodes={processedNodes}
        edges={processedEdges}
        onInit={setReactFlowInstance}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeUpdate={onEdgeUpdate}
        onEdgeUpdateStart={onEdgeUpdateStart}
        onEdgeUpdateEnd={onEdgeUpdateEnd} 
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeDragStop={onNodeDragStop} 
        onEdgeClick={onEdgeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onPaneClick={() => {
          setSelectedNode(null);
          setSelectedEdge(null);
          setShowEdgePanel(false);
          setFiltersOpen(false);
          setShowWhiteboardDropdown(false);
        }}
        connectOnClick={false}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
        selectionOnDrag={true}
        selectionMode={SelectionMode.Partial}
        autoPanSpeed={15}
        panOnDrag={[1, 2]}
        selectionKeyCode={null}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();

          // ── Handle METS component drag from library panel ──
          const metsData = e.dataTransfer?.getData('application/northlight-mets-component');
          if (metsData) {
            try {
              const { familyKey, variantKey } = JSON.parse(metsData);
              let position = { x: 200, y: 200 };
              if (reactFlowInstance) {
                position = reactFlowInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
              }
              setPendingMETSComponent({ familyKey, variantKey, position });
            } catch (err) {
              console.error('Failed to drop METS component:', err);
            }
            return;
          }

          // ── Handle image file drops ──
          const files = e.dataTransfer?.files;
          if (!files || files.length === 0) return;
          const file = files[0];
          if (!file.type.startsWith('image/')) return;

          const reader = new FileReader();
          reader.onload = (evt) => {
            const dataUrl = evt.target?.result as string;
            const img = new Image();
            img.onload = () => {
              // Convert screen coords to flow position
              let position = { x: 200, y: 200 };
              if (reactFlowInstance) {
                position = reactFlowInstance.screenToFlowPosition({
                  x: e.clientX,
                  y: e.clientY,
                });
              }
              addImageNode(dataUrl, img.width, img.height, position);
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
        }}
        style={{ 
          background: theme.bgCanvas,
          marginTop: '50px',
          height: `${appHeight - 50}px`
        }}
      >
        <Controls style={{ bottom: 20, left: 70 }} />
        <HandleUpdater nodeIds={nodes.map(n => n.id)} viewMode={viewMode} />
        <MiniMap 
          style={{ 
            position: 'absolute',
            bottom: 120,
            right: 10,
            width: 150,
            height: 100,
            background: theme.minimapBg,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`
          }}
          maskColor={theme.minimapMask}
        />
        
        <SelectionToolbar
          nodes={nodes}
          setNodes={setNodes}
          clipboard={clipboard}
          copySelectedNodes={copySelectedNodes}
          deleteSelectedNodes={deleteSelectedNodes}
          duplicateSelectedNodes={duplicateSelectedNodes}
          pasteNodes={pasteNodes}
          alignSelectedNodes={alignSelectedNodes}
          toggleLockSelectedNodes={toggleLockSelectedNodes}
          groupSelectedNodes={groupSelectedNodes}
          ungroupSelectedNodes={ungroupSelectedNodes}
          exportSelectedNodes={exportSelectedNodes}
          toolbarBtnStyle={toolbarBtnStyle}
          toolbarBtnSmall={toolbarBtnSmall}
        />
        
        <Background 
          variant="dots" 
          gap={12} 
          size={1} 
          color={isDarkMode ? '#444' : '#cbd5e1'} 
        />
        
        {/* Arrow markers for relationships */}
        <svg>
          <defs>
            {Object.entries(RELATIONSHIP_TYPES).map(([key, value]) => (
              <marker
                key={key}
                id={`arrow-${key}`}
                viewBox="0 0 20 20"
                refX="20"
                refY="10"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 20 10 L 0 20 z" fill={value.color} />
              </marker>
            ))}
          </defs>
        </svg>
      </ReactFlow>
      )}

      {/* Floating Panel for Text Annotations */}
      {selectedNode && selectedNode.data?.itemType === 'textAnnotation' && (
        <div
          style={{
            position: 'fixed',
            right: '20px',
            top: '80px',
            width: '280px',
            background: 'var(--nl-bg-panel, #2c3e50)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 2000,
            color: 'white',
            padding: '15px'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '1px solid #34495e'
          }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>📝 Text Annotation</span>
            <button
              onClick={() => setSelectedNode(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer'
              }}
            >×</button>
          </div>

          {/* Font Size */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#bdc3c7', display: 'block', marginBottom: '4px' }}>
              Font Size
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="range"
                min="10"
                max="48"
                value={selectedNode.data.fontSize || 14}
                onChange={(e) => updateNodeData(selectedNode.id, 'fontSize', parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '12px', width: '30px' }}>{selectedNode.data.fontSize || 14}px</span>
            </div>
          </div>

          {/* Text Color */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#bdc3c7', display: 'block', marginBottom: '4px' }}>
              Text Color
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['#333333', '#e74c3c', '#e67e22', '#f1c40f', '#27ae60', '#3498db', '#9b59b6', '#ffffff'].map(color => (
                <button
                  key={color}
                  onClick={() => updateNodeData(selectedNode.id, 'textColor', color)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    background: color,
                    border: selectedNode.data.textColor === color ? '3px solid #3498db' : '2px solid #4a5f7f',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Background Color */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#bdc3c7', display: 'block', marginBottom: '4px' }}>
              Background
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                'transparent', 
                'rgba(255,255,200,0.9)', 
                'rgba(200,255,200,0.9)', 
                'rgba(200,220,255,0.9)',
                'rgba(255,200,200,0.9)',
                'rgba(255,220,180,0.9)',
                'rgba(220,200,255,0.9)',
                '#ffffff'
              ].map(color => (
                <button
                  key={color}
                  onClick={() => updateNodeData(selectedNode.id, 'bgColor', color)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    background: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)' : color,
                    backgroundSize: color === 'transparent' ? '8px 8px' : 'auto',
                    backgroundPosition: color === 'transparent' ? '0 0, 4px 4px' : 'auto',
                    border: selectedNode.data.bgColor === color ? '3px solid #3498db' : '2px solid #4a5f7f',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Font Style */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#bdc3c7', display: 'block', marginBottom: '4px' }}>
              Style
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => updateNodeData(selectedNode.id, 'fontWeight', selectedNode.data.fontWeight === 'bold' ? 'normal' : 'bold')}
                style={{
                  padding: '6px 12px',
                  background: selectedNode.data.fontWeight === 'bold' ? 'var(--nl-accent, #3498db)' : 'var(--nl-bg-input, #34495e)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                B
              </button>
              <button
                onClick={() => updateNodeData(selectedNode.id, 'fontStyle', selectedNode.data.fontStyle === 'italic' ? 'normal' : 'italic')}
                style={{
                  padding: '6px 12px',
                  background: selectedNode.data.fontStyle === 'italic' ? 'var(--nl-accent, #3498db)' : 'var(--nl-bg-input, #34495e)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  fontStyle: 'italic'
                }}
              >
                I
              </button>
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={() => {
              setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
              setSelectedNode(null);
            }}
            style={{
              width: '100%',
              padding: '8px',
              background: '#e74c3c',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            🗑️ Delete Annotation
          </button>
        </div>
      )}

      {/* Floating Panel for Regular Nodes */}
      {selectedNode && selectedNode.data?.itemType !== 'textAnnotation' && (
        <FloatingPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={updateNodeData}
          initialPosition={floatingPanelPosition}
          hardwareTypes={hardwareTypes.length > 0 ? hardwareTypes : defaultHardwareTypes}
          onManageTypes={() => setShowHardwareTypesModal(true)}
          requirementLinks={requirementLinks}
          nodes={nodes}
          onCreateLink={handleCreateLinkFromNode}
          onRemoveLink={removeLink}
          onPinLink={pinLink}
          onUnpinLink={unpinLink}
          onUpdateLinkStatus={updateLinkStatus}
          onUpdateLink={updateLink}
        />
      )}

      {/* Issue Panel Modal */}
      {showIssuePanel && issueNodeId && (
        <IssuePanelModal
          node={nodes.find(n => n.id === issueNodeId) || { id: issueNodeId, data: { label: 'Unknown', reqId: '' } }}
          issues={issues}
          onClose={() => {
            setShowIssuePanel(false);
            setIssueNodeId(null);
          }}
          onAddIssue={addIssue}
          onUpdateIssue={updateIssue}
          onDeleteIssue={deleteIssue}
        />
      )}

      {/* Manage Hardware Types Modal */}
      {showHardwareTypesModal && (
        <ManageHardwareTypesModal
          onClose={() => setShowHardwareTypesModal(false)}
          hardwareTypes={hardwareTypes.length > 0 ? hardwareTypes : defaultHardwareTypes}
          onAddType={addHardwareType}
          onDeleteType={deleteHardwareType}
          onUpdateType={updateHardwareType}
          onRefresh={fetchHardwareTypes}
        />
      )}

      {showShareModal && currentProject && (
        <ShareProjectModal
        project={currentProject}
        currentUser={user}
        onClose={() => setShowShareModal(false)}
        />
      )}

      {showChangePassword && (
          <ChangePasswordModal
            onClose={() => setShowChangePassword(false)}
            onSuccess={() => alert('Password changed successfully!')}
          />
        )}

      {/* Save Toast */}
      {showSaveToast && (
        <div style={{
          position: 'fixed',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#27ae60',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          ✅ Project saved successfully!
        </div>
      )}  

      {/* Relationship Panel for Edges */}
      {selectedEdge && showEdgePanel && !selectedNode && (
        <RelationshipPanel
          edge={selectedEdge}
          onClose={() => {
            setSelectedEdge(null);
            setShowEdgePanel(false);
          }}
          onUpdate={updateEdgeData}
          position={edgePanelPosition}
        />
      )}

      {/* New Object Modal */}
      {showNewObjectModal && (
        <NewObjectModal
          onClose={() => setShowNewObjectModal(false)}
          onCreate={createNewObject}
        />
      )}

      

      {/* Issue Manager Modal */}
      {showIssueManagerModal && (
        <IssueManagerModal
          issues={issues}
          nodes={nodes}
          onClose={() => setShowIssueManagerModal(false)}
          onIssueClick={(issue) => {
            setShowIssueManagerModal(false);
            // Optionally select the node
            const node = nodes.find(n => n.id === issue.nodeId);
            if (node) {
              setSelectedNode(node);
            }
          }}
          onUpdateIssue={(updatedIssue) => {
            updateIssue(updatedIssue.nodeId, updatedIssue.id, updatedIssue);
          }}
          onDeleteIssue={(issue) => {
            deleteIssue(issue.nodeId, issue.id);
          }}
        />
      )}

      {/* Create Issue Modal */}
      {showCreateIssueModal && createIssueNodeId && (
        <CreateIssueModal
          nodeId={createIssueNodeId}
          nodeName={nodes.find(n => n.id === createIssueNodeId)?.data?.label || 'Unknown'}
          onClose={() => {
            setShowCreateIssueModal(false);
            setCreateIssueNodeId(null);
          }}
          onCreate={(issueData) => {
            addIssue(createIssueNodeId, issueData);
            setShowCreateIssueModal(false);
            setCreateIssueNodeId(null);
          }}
        />
      )}

      {/* Component Library Panel */}
      <ComponentLibraryPanel
        isOpen={showLibraryPanel}
        onClose={() => setShowLibraryPanel(false)}
        nodes={nodes}
        libraryItems={libraryItems}
        onAddFromLibrary={addLibraryItemToCanvas}
        onSaveToLibrary={saveNodeToLibrary}
        onRefresh={fetchLibraryItems}
      />

      {/* METS Standard Component Library */}
      <METSLibraryPanel
        isOpen={showMETSLibrary}
        onClose={() => setShowMETSLibrary(false)}
        onAddComponent={(familyKey, variantKey) => setPendingMETSComponent({ familyKey, variantKey })}
      />

      {/* METS Naming — System Code Picker */}
      <SystemCodePicker
        isOpen={!!pendingMETSComponent}
        familyKey={pendingMETSComponent?.familyKey || ''}
        variantKey={pendingMETSComponent?.variantKey || ''}
        projectId={currentProject?.id}
        onConfirm={(systemCode, names) => {
          if (pendingMETSComponent) {
            addSWComponentNode(
              pendingMETSComponent.familyKey,
              pendingMETSComponent.variantKey,
              pendingMETSComponent.position,
              { ...names, systemCode },
            );
          }
          setPendingMETSComponent(null);
        }}
        onCancel={() => setPendingMETSComponent(null)}
      />

      {/* Text Annotation Toolbar - shows when text annotation is selected */}
      {selectedNode && selectedNode.type === 'textAnnotation' && (
        <TextAnnotationToolbar
          node={selectedNode}
          onUpdate={(nodeId, key, value) => {
            setNodes(nds => nds.map(n => 
              n.id === nodeId 
                ? { ...n, data: { ...n.data, [key]: value } }
                : n
            ));
          }}
        />
      )}

      <input
      id="file-import-input"
      type="file"
      accept=".json"
      style={{ display: 'none' }}
      onChange={importProject}
      />

      {/* Requirement Link Modals */}
      {showCreateLinkModal && (
        <CreateLinkModal
          nodes={nodes}
          onClose={() => setShowCreateLinkModal(false)}
          onCreate={(linkData) => addLink(linkData)}
          preselectedSourceId={createLinkSourceId}
          user={user?.name || 'unknown'}
        />
      )}

      {showLinkManager && (
        <LinkManagerPanel
          links={requirementLinks}
          nodes={nodes}
          edges={edges}
          onClose={() => setShowLinkManager(false)}
          onRemoveLink={removeLink}
          onPinLink={pinLink}
          onUnpinLink={unpinLink}
          onUpdateLinkStatus={updateLinkStatus}
          onUpdateLink={updateLink}
          onCreateLink={() => {
            setCreateLinkSourceId(null);
            setShowCreateLinkModal(true);
          }}
          onBaselineAll={() => baselineAllLinks(nodes)}
          healthIssues={linkHealthIssues}
          orphanNodes={orphanNodes}
          uncoveredReqs={uncoveredReqs}
          circularDeps={circularDeps}
        />
      )}

      {showImport && (
        <ImportRequirements
          onImport={handleImportNodes}
          onClose={() => setShowImport(false)}
          nodeId={nodeId}
          setNodeId={setNodeId}
          generateItemId={generateItemId}
        />
      )}
    </div>
    </CollaborationProvider>
  );
}
