import Login from './Login';
import { auth, projects, realtime } from './api';
import { NorthlightSplash, NorthlightLogo } from './NorthlightLogo';
import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import dagre from 'dagre';
import ProjectSelector from './ProjectSelector';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  updateEdge,
  Panel,
  MarkerType,
  SelectionMode,
} from 'reactflow';
import '@reactflow/node-resizer/dist/style.css';
import 'reactflow/dist/style.css';
import * as XLSX from 'xlsx';
import Whiteboard from './components/Whiteboard/Whiteboard';
import { CollaborationProvider, UserAvatars } from './collaboration';
import ShareProjectModal from './components/ShareProjectModal';
import DocumentViewEnhanced from './DocumentViewEnhanced';
import { 
  useRequirementLinks, 
  CreateLinkModal, 
  LinkManagerPanel, 
  NodeLinkSection 
} from './RequirementLinks';

// ─── Extracted Constants ───
import { RELATIONSHIP_TYPES, defaultEdgeOptions, inferRelationshipType } from './constants/relationships';
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES, ISSUE_STATUSES } from './constants/issues';
import { defaultHardwareTypes } from './constants/hardwareDefaults';
import { initialNodes, initialEdges } from './constants/initialData';

// ─── Custom Hooks ───
import {
  useIdCounters, useIssueManager, useHardwareTypes, useWhiteboards,
  useUndoRedo, useClipboard, useNodeFactory, useNodeOperations,
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

// ─── Extracted Hardware Components ───
import ManageHardwareTypesModal from './components/hardware/ManageHardwareTypesModal';

// ─── Extracted Layout Components ───
import TopHeader from './components/layout/TopHeader';
import LeftIconStrip from './components/layout/LeftIconStrip';
import { Sidebar, SidebarSection, SidebarButton } from './components/layout/Sidebar';

// ─── Extracted Modal Components ───
import NewObjectModal from './components/modals/NewObjectModal';
import ChangePasswordModal from './components/modals/ChangePasswordModal';

// ─── Extracted View Components ───
import DocumentView from './components/views/DocumentView';

// API Base URL - same as api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function App() {
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

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [floatingPanelPosition, setFloatingPanelPosition] = useState({ x: 0, y: 0 });
  const [edgePanelPosition, setEdgePanelPosition] = useState({ x: 0, y: 0 });
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [showRelationshipLabels, setShowRelationshipLabels] = useState(true);
  const [viewMode, setViewMode] = useState('plm');

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
  } = useWhiteboards({ nodes, edges, setNodes, setEdges, setViewMode, setSelectedNode, setSelectedEdge });

  const {
    undo, redo, isUndoRedo, resetHistory, canUndo, canRedo,
  } = useUndoRedo({ nodes, edges, setNodes, setEdges });

  // Component Library State
  const [showLibraryPanel, setShowLibraryPanel] = useState(false);
  const [libraryItems, setLibraryItems] = useState([]);

  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [reqTypeFilter, setReqTypeFilter] = useState('all');
  const [classificationFilter, setClassificationFilter] = useState('all');

  const [objectName, setObjectName] = useState('MPV Propulsion System');
  const [objectVersion, setObjectVersion] = useState('1.0');
  const [objectDescription, setObjectDescription] = useState('Multi-Purpose Vessel propulsion control system');
  const [showNewObjectModal, setShowNewObjectModal] = useState(false);
  
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

  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);
  const [createLinkSourceId, setCreateLinkSourceId] = useState(null);
  const [showLinkManager, setShowLinkManager] = useState(false);

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



  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  

  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [showSplash, setShowSplash] = useState(true);

  const edgeUpdateSuccessful = useRef(true);
  const [showEdgePanel, setShowEdgePanel] = useState(false);

  // Auth state
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentProject, setCurrentProject] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);


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
    setObjectVersion(projectData.project?.version || projectData.version || '1.0');
    
    // Load nodes and edges if present
    if (projectData.nodes) {
      const loadedNodes = projectData.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          // Preserve reqType - don't override it!
          reqType: node.data.reqType,
          onChange: handleNodeLabelChange
        }
      }));
      setNodes(loadedNodes);
      
      // Update all ID counters based on loaded nodes (via hook)
      setCountersFromNodes(projectData.nodes);
      
      // Load issues (via hook)
      loadIssues(projectData.issues);
      
      // Process edges - validate handles exist on nodes
      if (projectData.edges) {
        const edgesWithArrows = projectData.edges.map(edge => {
          const sourceNode = loadedNodes.find(n => n.id === edge.source);
          const targetNode = loadedNodes.find(n => n.id === edge.target);
          
          // Check if handles exist on the nodes
          const sourcePorts = sourceNode?.data?.ports || [];
          const targetPorts = targetNode?.data?.ports || [];
          
          const validSourceHandle = !edge.sourceHandle || 
            edge.sourceHandle === 'default-source' ||
            sourcePorts.some(p => p.id === edge.sourceHandle);
          const validTargetHandle = !edge.targetHandle || 
            edge.targetHandle === 'default-target' ||
            targetPorts.some(p => p.id === edge.targetHandle);
          
          return {
            ...edge,
            // Convert invalid or null handles to undefined (use default)
            sourceHandle: validSourceHandle ? (edge.sourceHandle === null ? undefined : edge.sourceHandle) : undefined,
            targetHandle: validTargetHandle ? (edge.targetHandle === null ? undefined : edge.targetHandle) : undefined,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: '#95a5a6'
            }
          };
        });
        setEdges(edgesWithArrows);
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
  const saveProjectToDatabase = async () => {
    if (!currentProject) {
      alert('No project open');
      return;
      
    }
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 1000);
    
    try {
      // Prepare nodes - remove non-serializable functions and floating connectors
      const nodesToSave = nodes
        .filter(node => !node.data?.isFloatingConnector) // Remove floating connectors
        .map(node => ({
          ...node,
          data: {
            ...node.data,
            // Remove non-serializable functions
            onChange: undefined,
            onLabelChange: undefined,
          }
        }));
      
      // Remove edges connected to floating connectors
      const connectorIds = nodes
        .filter(n => n.data?.isFloatingConnector)
        .map(n => n.id);
      
      const edgesToSave = edges
        .filter(e => !connectorIds.includes(e.source) && !connectorIds.includes(e.target))
        .map(edge => ({
          ...edge,
          data: {
            ...edge.data,
            // Remove non-serializable functions
            onLabelChange: undefined,
            onEdgeDoubleClick: undefined,
          }
        }));
      
      await projects.save(currentProject.id, {
        name: objectName,
        description: objectDescription,
        version: objectVersion,
        nodes: nodesToSave,
        edges: edgesToSave,
        whiteboards: whiteboards,
        issues: issues,
        issueIdCounter: issueIdCounter,
        requirementLinks: requirementLinks,
      });

      // Removed alert - bottom notification will show instead
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save project: ' + err.message);
    }
  };

  // Auto-layout function
  const autoLayoutNodes = useCallback(() => {
    if (nodes.length === 0) return;

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    // Layout settings
    dagreGraph.setGraph({ 
      rankdir: 'LR',      // Left to Right layout
      nodesep: 80,        // Horizontal spacing between nodes
      ranksep: 150,       // Vertical spacing between ranks
      marginx: 50,
      marginy: 50
    });

    // Add nodes to dagre
    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { 
        width: node.width || 200, 
        height: node.height || 100 
      });
    });

    // Add edges to dagre
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Run the layout
    dagre.layout(dagreGraph);

    // Update node positions
    const newNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - (node.width || 200) / 2,
          y: nodeWithPosition.y - (node.height || 100) / 2,
        },
      };
    });

    setNodes(newNodes);
    
    // Fit view after layout
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2 });
      }
    }, 50);
  }, [nodes, edges, setNodes, reactFlowInstance]);

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

  // Edge update handlers - allow moving connections
  const onEdgeUpdateStart = useCallback(() => {
    console.log('🔵 Edge drag STARTED');
    edgeUpdateSuccessful.current = false;  // Use .current for refs
  }, []);

  const onEdgeUpdate = useCallback((oldEdge, newConnection) => {
    edgeUpdateSuccessful.current = true;
    
    // Check if we're reconnecting FROM a floating connector
    const oldTargetNode = nodes.find(n => n.id === oldEdge.target);
    const oldSourceNode = nodes.find(n => n.id === oldEdge.source);
    
    // Remove floating connector if edge was connected to one
    if (oldTargetNode?.data?.isFloatingConnector) {
      setNodes((nds) => nds.filter(n => n.id !== oldEdge.target));
    }
    if (oldSourceNode?.data?.isFloatingConnector) {
      setNodes((nds) => nds.filter(n => n.id !== oldEdge.source));
    }
    
    // Get port info for the new connection
    const sourceNode = nodes.find(n => n.id === newConnection.source);
    const targetNode = nodes.find(n => n.id === newConnection.target);
    const sourcePort = sourceNode?.data?.ports?.find(p => p.id === newConnection.sourceHandle);
    const targetPort = targetNode?.data?.ports?.find(p => p.id === newConnection.targetHandle);
    
    // Update signal name
    let signalName = '';
    if (sourcePort && targetPort) {
      const sourceName = sourcePort.name.replace(/\[\d+:\d+\]/, '').trim();
      const targetName = targetPort.name.replace(/\[\d+:\d+\]/, '').trim();
      if (sourceName.toLowerCase() === targetName.toLowerCase()) {
        signalName = sourceName;
      } else {
        signalName = `${sourceName} → ${targetName}`;
      }
    } else if (sourcePort) {
      signalName = sourcePort.name.replace(/\[\d+:\d+\]/, '').trim();
    } else if (targetPort) {
      signalName = targetPort.name.replace(/\[\d+:\d+\]/, '').trim();
    }
    
    setEdges((els) => updateEdge(oldEdge, {
      ...newConnection,
      data: {
        ...oldEdge.data,
        sourcePortId: newConnection.sourceHandle || null,
        targetPortId: newConnection.targetHandle || null,
        sourcePortName: sourcePort?.name || null,
        targetPortName: targetPort?.name || null,
        signalName: signalName,
      }
    }, els));
  }, [nodes, setEdges, setNodes]);

  const onEdgeUpdateEnd = useCallback((event, edge) => {
    if (!edgeUpdateSuccessful.current) {
      // Only create floating connector if this is a real user drag event
      // Check if event has valid coordinates (not triggered by loading)
      if (!event || !event.clientX || !event.clientY || !reactFlowInstance) {
        // Just delete the edge if we can't create a floating connector
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        edgeUpdateSuccessful.current = true;
        return;
      }
      
      // Get drop position using reactFlowInstance directly
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      if (!position) {
        // Fallback: just delete the edge if we can't get position
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        edgeUpdateSuccessful.current = true;
        return;
      }
      
      // Create a floating connector node
      const connectorId = `connector-${Date.now()}`;
      const newConnectorNode = {
        id: connectorId,
        type: 'custom',
        position: position,
        data: {
          label: '⚡',
          itemType: 'connector',
          type: 'connector',
          isFloatingConnector: true,
        }
      };
      
      // Add the connector node
      setNodes((nds) => [...nds, newConnectorNode]);
      
      // Update the edge to point to the connector
      setEdges((eds) => eds.map((e) => {
        if (e.id === edge.id) {
          return {
            ...e,
            target: connectorId,
            targetHandle: null,
          };
        }
        return e;
      }));
    }
    
    edgeUpdateSuccessful.current = true;
  }, [setEdges, setNodes, reactFlowInstance]);

  const onNodeDragStop = useCallback((event, node) => {
    // Only handle floating connectors
    if (!node.data?.isFloatingConnector) return;
    
    // Get the connector's position
    const connectorPos = node.position;
    
    // Find nearby nodes (excluding connectors)
    const nearbyThreshold = 50; // pixels
    
    for (const otherNode of nodes) {
      if (otherNode.id === node.id) continue;
      if (otherNode.data?.isFloatingConnector) continue;
      
      // Check if connector is dropped near this node
      const nodeWidth = 200; // approximate
      const nodeHeight = 100; // approximate
      
      const isNearNode = 
        connectorPos.x >= otherNode.position.x - nearbyThreshold &&
        connectorPos.x <= otherNode.position.x + nodeWidth + nearbyThreshold &&
        connectorPos.y >= otherNode.position.y - nearbyThreshold &&
        connectorPos.y <= otherNode.position.y + nodeHeight + nearbyThreshold;
      
      if (isNearNode) {
        // Find the edge connected to this connector
        const connectedEdge = edges.find(e => 
          e.target === node.id || e.source === node.id
        );
        
        if (connectedEdge) {
          // Determine which port to connect to (find nearest)
          const ports = otherNode.data?.ports || [];
          let targetHandle = null;
          
          // If node has ports, find the nearest input port
          if (ports.length > 0) {
            const inputPorts = ports.filter(p => p.direction === 'input' || p.type === 'input');
            if (inputPorts.length > 0) {
              targetHandle = inputPorts[0].id;
            }
          }
          
          // Update the edge to connect to the real node
          setEdges((eds) => eds.map((e) => {
            if (e.id === connectedEdge.id) {
              if (e.target === node.id) {
                // Connector was the target, update target
                return {
                  ...e,
                  target: otherNode.id,
                  targetHandle: targetHandle,
                };
              } else {
                // Connector was the source, update source
                const outputPorts = ports.filter(p => p.direction === 'output' || p.type === 'output');
                const sourceHandle = outputPorts.length > 0 ? outputPorts[0].id : null;
                return {
                  ...e,
                  source: otherNode.id,
                  sourceHandle: sourceHandle,
                };
              }
            }
            return e;
          }));
          
          // Remove the connector node
          setNodes((nds) => nds.filter((n) => n.id !== node.id));
          
          return; // Done!
        }
      }
    }
  }, [nodes, edges, setNodes, setEdges]);

  const onConnect = useCallback((params) => {
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
    const relationType = inferRelationshipType(sourceNode, targetNode);
    
    // Get port info if connecting to specific handles
    const sourcePort = sourceNode?.data?.ports?.find(p => p.id === params.sourceHandle);
    const targetPort = targetNode?.data?.ports?.find(p => p.id === params.targetHandle);
    
    // Smart signal name generation
    let signalName = '';
    if (sourcePort && targetPort) {
      // Both ports exist
      const sourceName = sourcePort.name.replace(/\[\d+:\d+\]/, '').trim();
      const targetName = targetPort.name.replace(/\[\d+:\d+\]/, '').trim();
      
      if (sourceName.toLowerCase() === targetName.toLowerCase()) {
        // Same name - just use it
        signalName = sourceName;
      } else {
        // Different names - show connection
        signalName = `${sourceName} → ${targetName}`;
      }
    } else if (sourcePort) {
      signalName = sourcePort.name.replace(/\[\d+:\d+\]/, '').trim();
    } else if (targetPort) {
      signalName = targetPort.name.replace(/\[\d+:\d+\]/, '').trim();
    }
    
    // Use larger bus width if different
    const busWidth = Math.max(sourcePort?.width || 0, targetPort?.width || 0) || null;
    
    const newEdge = {
      ...params,
      sourceHandle: params.sourceHandle || null,
      targetHandle: params.targetHandle || null,
      type: 'custom',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#95a5a6'
      },
      data: { 
        relationType, 
        notes: '',
        customLabel: signalName,
        sourcePortId: params.sourceHandle || null,
        targetPortId: params.targetHandle || null,
        sourcePortName: sourcePort?.name || null,
        targetPortName: targetPort?.name || null,
        signalName: signalName,
        signalType: sourcePort?.type || targetPort?.type || null,
        busWidth: busWidth,
      },
    };
    
    setEdges((eds) => addEdge(newEdge, eds));
  }, [nodes, setEdges]);

  const handleNodeLabelChange = useCallback((nodeId, field, value) => {
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

  // ─── Clipboard & Node Operations Hooks (depend on handleNodeLabelChange) ───
  const {
    clipboard, copySelectedNodes, pasteNodes, deleteSelectedNodes, duplicateSelectedNodes,
  } = useClipboard({
    nodes, edges, setNodes, setEdges,
    nodeId, setNodeId,
    counters, incrementCounter,
    handleNodeLabelChange,
    setSelectedNode,
  });

  const {
    alignSelectedNodes, toggleLockSelectedNodes, exportSelectedNodes,
    groupSelectedNodes, ungroupSelectedNodes,
  } = useNodeOperations({
    nodes, edges, setNodes, nodeId, setNodeId, handleNodeLabelChange,
  });

  // Keyboard shortcuts for copy/paste/delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
      
      // Ctrl+C or Cmd+C - Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copySelectedNodes();
      }
      
      // Ctrl+V or Cmd+V - Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        pasteNodes();
      }
      
      // Ctrl+X or Cmd+X - Cut
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        copySelectedNodes();
        deleteSelectedNodes();
      }
      
      // Ctrl+A or Cmd+A - Select All
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setNodes(nds => nds.map(n => ({ ...n, selected: true })));
      }
      
      // Ctrl+D or Cmd+D - Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        duplicateSelectedNodes();
      }
      
      // Ctrl+L or Cmd+L - Lock/Unlock
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        toggleLockSelectedNodes();
      }
      
      // Ctrl+G or Cmd+G - Group
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          ungroupSelectedNodes();
        } else {
          groupSelectedNodes();
        }
      }
      // Ctrl+Shift+L - Link Manager
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'l') {
        e.preventDefault();
        setShowLinkManager(true);
        return;
      }

    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copySelectedNodes, pasteNodes, deleteSelectedNodes, duplicateSelectedNodes, 
      toggleLockSelectedNodes, groupSelectedNodes, ungroupSelectedNodes, setNodes]);

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

  // Library management callbacks
  const fetchLibraryItems = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/library`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('plm_token')}`
        }
      });
      if (response.ok) {
        const items = await response.json();
        setLibraryItems(items);
      } else {
        console.log('Library API not available, using empty library');
        setLibraryItems([]);
      }
    } catch (error) {
      console.log('Library fetch error:', error);
      setLibraryItems([]);
    }
  }, []);

  const saveNodeToLibrary = useCallback(async (node) => {
    const libraryItem = {
      name: node.data.label,
      type: node.data.type || node.data.itemType,
      itemType: node.data.itemType || node.data.type,
      description: node.data.description || '',
      version: '1.0',
      nodeData: { ...node.data },
      createdAt: new Date().toISOString()
    };
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/library`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('plm_token')}`
        },
        body: JSON.stringify(libraryItem)
      });
      if (response.ok) {
        const saved = await response.json();
        setLibraryItems(prev => [...prev, saved]);
        return saved;
      }
    } catch (error) {
      console.log('Save to library error:', error);
    }
    // Fallback: save locally
    const localItem = { ...libraryItem, id: `lib-${Date.now()}` };
    setLibraryItems(prev => [...prev, localItem]);
    return localItem;
  }, []);

  const addLibraryItemToCanvas = useCallback((libraryItem) => {
    const newNode = {
      id: String(nodeId),
      type: 'custom',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        ...libraryItem.nodeData,
        label: libraryItem.name,
        libraryRef: libraryItem.id,
        libraryVersion: libraryItem.version,
      }
    };
    setNodes(nds => [...nds, newNode]);
    setNodeId(prev => prev + 1);
  }, [nodeId]);

  // Node resize handler
  const handleNodeResize = useCallback((nodeId, width, height) => {
    setNodes(nds => nds.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, nodeWidth: width, nodeHeight: height } }
        : node
    ));
  }, []);

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
          onShowIssues: (n) => {
            setIssueNodeId(n.id);
            setShowIssuePanel(true);
          }
        },
      };
    });
  }, [nodes, searchText, typeFilter, statusFilter, priorityFilter, stateFilter, reqTypeFilter, classificationFilter, handleNodeLabelChange, viewMode, issues]);

  const filteredCount = processedNodes.filter(n => n.data.isFiltered).length;

const addPlatformNode = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
    
    const reqId = generateItemId ('platform');
    
    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'custom',
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        selected: false,
        data: { 
          label: 'New Platform Component', 
          type: 'platform',
          reqType: 'platform',
          reqId: reqId,
          version: '1.0',
          classification: 'capability',
          description: '',
          priority: 'medium',
          status: 'new',
          state: 'open',
          owner: '',
          attachment: null,
          onChange: handleNodeLabelChange
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, setSelectedNode, generateItemId ]);

 const addRequirementNode = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
    
    let position = { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 };
    
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      position = { 
        x: centerX + (Math.random() * 100 - 50), 
        y: centerY + (Math.random() * 100 - 50) 
      };
    }
    const itemId = generateItemId('project');
    
    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'custom',
        position: position,
        selected: false,
        data: { 
          label: 'New Requirement',
          type: 'requirement',
          itemType: 'requirement',
          reqId: itemId,
          version: '1.0',
          reqType: 'project',
          origin: 'internal',
          classification: 'requirement',
          description: '',
          rationale: '',
          priority: 'medium',
          status: 'new',
          state: 'open',
          owner: '',
          attachment: null,
          onChange: handleNodeLabelChange
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, setSelectedNode, generateItemId, reactFlowInstance]);

  // ─── Node Factory Hook (replaces 10 add*Node functions) ───
  const {
    addNode,
    addSystemNode, addSubSystemNode, addFunctionNode, addTestCaseNode,
    addUseCaseNode, addActorNode,
    addParameterNode, addHardwareNode, addTextAnnotationNode,
  } = useNodeFactory({
    nodeId, setNodeId, generateItemId, handleNodeLabelChange,
    setNodes, setSelectedNode, reactFlowInstance, hardwareTypes,
  });


  const exportProject = useCallback(() => {
  // Ask user for filename
  const defaultName = objectName.replace(/[^a-z0-9]/gi, '_') || 'project';
  const filename = prompt('Save project as:', defaultName);
  
  if (!filename) return;  // User cancelled
  
  const data = {
    objectName,
    objectVersion,
    nodes,
    edges,
    whiteboards,
    whiteboardNodes,
    whiteboardEdges,
    issues,
    issueIdCounter,
    savedAt: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  link.click();
  URL.revokeObjectURL(url);
}, [objectName, objectVersion, nodes, edges, whiteboards, whiteboardNodes, whiteboardEdges, issues, issueIdCounter]);

 const exportToExcel = useCallback(() => {
    // Prepare data for Excel
    const excelData = nodes.map(node => ({
      'Requirement ID': node.data.reqId || '',
      'Title': node.data.label || '',
      'Version': node.data.version || '1.0',
      'Type': node.data.reqType || '',
      'Classification': node.data.classification || '',
      'State': node.data.state || 'open',
      'Priority': node.data.priority || 'medium',
      'Status': node.data.status || 'new',
      'Owner': node.data.owner || '',
      'Description': node.data.description || ''
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 },  // Requirement ID
      { wch: 30 },  // Title
      { wch: 8 },   // Version
      { wch: 15 },  // Type
      { wch: 15 },  // Classification
      { wch: 10 },  // State
      { wch: 10 },  // Priority
      { wch: 12 },  // Status
      { wch: 15 },  // Owner
      { wch: 50 },  // Description
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Requirements');

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `PLM-Requirements-${date}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
  }, [nodes]);

  const generateFATProtocol = useCallback(async (testCaseNode) => {
    // Dynamic import of docx library
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
            Header, Footer, AlignmentType, BorderStyle, WidthType, 
            ShadingType, PageNumber, HeadingLevel } = await import('docx');
    
    const tc = testCaseNode.data;
    const steps = (tc.testSteps || '').split('\n').filter(s => s.trim());
    const expected = (tc.expectedResults || '').split('\n').filter(s => s.trim());
    const preconditions = (tc.preconditions || '').split('\n').filter(s => s.trim());
    
    // Find linked requirements
    const linkedReqs = edges
      .filter(e => e.source === testCaseNode.id || e.target === testCaseNode.id)
      .map(e => {
        const otherId = e.source === testCaseNode.id ? e.target : e.source;
        return nodes.find(n => n.id === otherId);
      })
      .filter(n => n && !['testcase', 'testrun', 'testresult'].includes(n.data.itemType));

    const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
    const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };
    
    // Build test steps rows
    const stepRows = steps.map((step, index) => {
      return new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: 600, type: WidthType.DXA },
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: String(index + 1), bold: true })]
            })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 4000, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun(step.trim())] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 3000, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun(expected[index]?.trim() || '')] })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 800, type: WidthType.DXA },
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: '☐', size: 28 })]
            })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 800, type: WidthType.DXA },
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: '☐', size: 28 })]
            })]
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: 1800, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun('')] })]
          }),
        ]
      });
    });

    const doc = new Document({
      styles: {
        default: { document: { run: { font: "Arial", size: 22 } } },
        paragraphStyles: [
          { id: "Title", name: "Title", basedOn: "Normal",
            run: { size: 48, bold: true, color: "1a5276" },
            paragraph: { spacing: { before: 0, after: 200 }, alignment: AlignmentType.CENTER } },
          { id: "Heading1", name: "Heading 1", basedOn: "Normal",
            run: { size: 28, bold: true, color: "2c3e50" },
            paragraph: { spacing: { before: 300, after: 120 } } },
        ]
      },
      sections: [{
        properties: {
          page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } }
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: objectName + ' | ', size: 18, color: "666666" }),
                new TextRun({ text: 'FAT Protocol', size: 18, color: "666666", bold: true })
              ]
            })]
          })
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Page ', size: 18 }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
                new TextRun({ text: ' of ', size: 18 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 })
              ]
            })]
          })
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [new TextRun({ text: 'FACTORY ACCEPTANCE TEST PROTOCOL', bold: true })]
          }),
          
          new Table({
            columnWidths: [2500, 8500],
            rows: [
              new TableRow({
                children: [
                  new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Project:', bold: true })] })] }),
                  new TableCell({ borders: cellBorders,
                    children: [new Paragraph({ children: [new TextRun(objectName)] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Version:', bold: true })] })] }),
                  new TableCell({ borders: cellBorders,
                    children: [new Paragraph({ children: [new TextRun(objectVersion)] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Date:', bold: true })] })] }),
                  new TableCell({ borders: cellBorders,
                    children: [new Paragraph({ children: [new TextRun(new Date().toISOString().split('T')[0])] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Test Case ID:', bold: true })] })] }),
                  new TableCell({ borders: cellBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: tc.reqId || 'N/A', bold: true, color: "2980b9" })] })] })
                ]
              }),
            ]
          }),
          
          new Paragraph({ children: [] }),
          
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: tc.label || 'Test Case' })]
          }),
          
          new Paragraph({
            spacing: { before: 200 },
            children: [
              new TextRun({ text: 'Verifies: ', bold: true }),
              new TextRun(linkedReqs.map(r => `${r.data.reqId} - ${r.data.label}`).join(', ') || 'No linked requirements')
            ]
          }),
          
          new Paragraph({
            spacing: { before: 300 },
            children: [new TextRun({ text: 'PURPOSE', bold: true, size: 24 })]
          }),
          new Paragraph({
            children: [new TextRun(tc.purpose || 'Not specified')]
          }),
          
          new Paragraph({
            spacing: { before: 300 },
            children: [new TextRun({ text: 'PRECONDITIONS', bold: true, size: 24 })]
          }),
          ...(preconditions.length > 0 
            ? preconditions.map(p => new Paragraph({
                children: [new TextRun({ text: '• ' + p })]
              }))
            : [new Paragraph({ children: [new TextRun('None specified')] })]
          ),
          
          new Paragraph({
            spacing: { before: 400 },
            children: [new TextRun({ text: 'TEST PROCEDURE', bold: true, size: 24 })]
          }),
          new Paragraph({ children: [] }),
          
          new Table({
            columnWidths: [600, 4000, 3000, 800, 800, 1800],
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({ borders: cellBorders, shading: { fill: "2c3e50", type: ShadingType.CLEAR },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, 
                      children: [new TextRun({ text: '#', bold: true, color: "ffffff" })] })] }),
                  new TableCell({ borders: cellBorders, shading: { fill: "2c3e50", type: ShadingType.CLEAR },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'Step', bold: true, color: "ffffff" })] })] }),
                  new TableCell({ borders: cellBorders, shading: { fill: "2c3e50", type: ShadingType.CLEAR },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'Expected Result', bold: true, color: "ffffff" })] })] }),
                  new TableCell({ borders: cellBorders, shading: { fill: "27ae60", type: ShadingType.CLEAR },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'Pass', bold: true, color: "ffffff" })] })] }),
                  new TableCell({ borders: cellBorders, shading: { fill: "e74c3c", type: ShadingType.CLEAR },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'Fail', bold: true, color: "ffffff" })] })] }),
                  new TableCell({ borders: cellBorders, shading: { fill: "2c3e50", type: ShadingType.CLEAR },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'Comments', bold: true, color: "ffffff" })] })] }),
                ]
              }),
              ...stepRows
            ]
          }),
          
          new Paragraph({
            spacing: { before: 400 },
            children: [new TextRun({ text: 'OVERALL RESULT', bold: true, size: 24 })]
          }),
          new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ text: '☐ PASS     ☐ FAIL     ☐ BLOCKED', size: 28 })]
          }),
          
          new Paragraph({
            spacing: { before: 300 },
            children: [new TextRun({ text: 'COMMENTS / OBSERVATIONS', bold: true, size: 24 })]
          }),
          new Paragraph({ borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" } }, spacing: { before: 200 }, children: [new TextRun('')] }),
          new Paragraph({ borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" } }, spacing: { before: 400 }, children: [new TextRun('')] }),
          new Paragraph({ borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" } }, spacing: { before: 400 }, children: [new TextRun('')] }),
          
          new Paragraph({
            spacing: { before: 500 },
            children: [new TextRun({ text: 'SIGN-OFF', bold: true, size: 24 })]
          }),
          new Table({
            columnWidths: [2750, 2750, 2750, 2750],
            rows: [
              new TableRow({
                children: [
                  new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Tested by:', bold: true })] })] }),
                  new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun('')] })] }),
                  new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Date:', bold: true })] })] }),
                  new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun('')] })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Signature:', bold: true })] })] }),
                  new TableCell({ borders: cellBorders, children: [new Paragraph({ spacing: { before: 400 }, children: [new TextRun('')] })] }),
                  new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Witness:', bold: true })] })] }),
                  new TableCell({ borders: cellBorders, children: [new Paragraph({ spacing: { before: 400 }, children: [new TextRun('')] })] }),
                ]
              }),
            ]
          }),
        ]
      }]
    });

    // Generate and download
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FAT-${tc.reqId || 'TestCase'}-${new Date().toISOString().split('T')[0]}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, objectName, objectVersion]);

  // Voice Recognition Setup
  const startVoiceRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus('🎤 Listening...');
    };

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase();
      setVoiceStatus(`Heard: "${command}"`);
      
      // Process commands
      if (command.includes('create system') || command.includes('add system')) {
        addSystemNode();
        setVoiceStatus('✅ Created System node');
      } else if (command.includes('create subsystem') || command.includes('add subsystem') || command.includes('create sub system') || command.includes('add sub system')) {
        addSubSystemNode();
        setVoiceStatus('✅ Created Sub-System node');
      } else if (command.includes('create function') || command.includes('add function')) {
        addFunctionNode();
        setVoiceStatus('✅ Created Function node');
      } else if (command.includes('create requirement') || command.includes('add requirement')) {
        addRequirementNode();
        setVoiceStatus('✅ Created Requirement node');
      } else if (command.includes('create test') || command.includes('add test')) {
        addTestCaseNode();
        setVoiceStatus('✅ Created Test Case node');
      } else if (command.includes('create platform') || command.includes('add platform')) {
        addPlatformNode();
        setVoiceStatus('✅ Created Platform node');
      } else if (command.includes('save project') || command.includes('save')) {
        exportProject();
        setVoiceStatus('✅ Project saved');
      } else if (command.includes('export excel') || command.includes('excel export')) {
        exportToExcel();
        setVoiceStatus('✅ Exported to Excel');
      } else if (command.includes('fit view') || command.includes('fit screen') || command.includes('zoom fit')) {
        // We'll need to expose fitView - for now just show message
        setVoiceStatus('💡 Press F to fit view');
      } else if (command.includes('new object') || command.includes('new project')) {
        setShowNewObjectModal(true);
        setVoiceStatus('✅ Opening New Object dialog');
      } else if (command.includes('undo')) {
        undo();
        setVoiceStatus('✅ Undo');
      } else if (command.includes('redo')) {
        redo();
        setVoiceStatus('✅ Redo');
      } else if (command.includes('help') || command.includes('commands')) {
        setVoiceStatus('💡 Say: create system/requirement/test, save, undo, redo');
      } else {
        setVoiceStatus(`❓ Unknown: "${command}"`);
      }

      // Clear status after 3 seconds
      setTimeout(() => setVoiceStatus(''), 3000);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setVoiceStatus(`❌ Error: ${event.error}`);
      setTimeout(() => setVoiceStatus(''), 3000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [addSystemNode, addSubSystemNode, addFunctionNode, addRequirementNode, addTestCaseNode, addPlatformNode, addUseCaseNode, addActorNode, exportProject, exportToExcel, undo, redo]);

// Voice Dictation for text fields
  const startVoiceDictation = useCallback((callback) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition not supported. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      callback(text);
    };

    recognition.onerror = (event) => {
      console.error('Voice error:', event.error);
    };

    recognition.start();
  }, []);
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
    const newNode = {
      id: String(nodeId),
      type: 'custom',
      position: { 
        x: nodeToDuplicate.position.x + 50, 
        y: nodeToDuplicate.position.y + 50 
      },
      data: { 
        ...nodeToDuplicate.data,
        label: nodeToDuplicate.data.label + ' (Copy)',
        reqId: reqId,
        state: 'open',
        onChange: handleNodeLabelChange
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  }, [nodeId, handleNodeLabelChange, setNodes, generateItemId ]);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('plm_token');
      const savedUser = localStorage.getItem('plm_user');
      
      console.log('Auth check - Token exists:', !!token, 'User exists:', !!savedUser);
      
      if (token && savedUser) {
        try {
          const userData = await auth.me();
          setUser(userData);
          realtime.connect();
          fetchHardwareTypes();  // Load hardware types from database
        } catch (err) {
          console.error('Auth check failed:', err);
          // Token is invalid - clear everything
          localStorage.removeItem('plm_token');
          localStorage.removeItem('plm_user');
          setUser(null);
        }
      } else {
        // No token - make sure user is null
        setUser(null);
      }
      
      setIsAuthChecking(false);
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        if (e.key === 'Escape') {
          setSelectedNode(null);
          setSelectedEdge(null);
          e.target.blur();
        }
        return;
      }

      // Auto-layout with 'A'
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey) {
        // Don't trigger if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        autoLayoutNodes();
      }

      // P = New Platform
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        addPlatformNode();
      }

      // R = New Requirement
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        addRequirementNode();
      }

      // Escape = Close panels
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setSelectedEdge(null);
      }

      // Ctrl+D = Duplicate selected node
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        // Find selected nodes from ReactFlow's selection
        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length > 0) {
          duplicateNode(selectedNodes[0]);
        } else if (selectedNode) {
          // Fallback to panel's selected node
          duplicateNode(selectedNode);
        }
      }

      // Ctrl+Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Y or Ctrl+Shift+Z = Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }

      // Ctrl+S = Save to Database
      if (e.ctrlKey && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        saveProjectToDatabase();
        return;
      }
      
      // Ctrl+Shift+S = Export to File
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        exportProject();
        return;
      }
      
      // Ctrl+O = Import from File
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        document.getElementById('file-import-input')?.click();
        return;
      }

      // Ctrl+F = Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="🔍 Search..."]');
        if (searchInput) {
          searchInput.focus();
        }
      }

      // F = Fit view (only if not Ctrl+F)
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const fitViewButton = document.querySelector('.react-flow__controls-fitview');
        if (fitViewButton) {
          fitViewButton.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addPlatformNode, addRequirementNode, exportProject, duplicateNode, selectedNode, undo, redo]);
    
  const importProject = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const project = JSON.parse(e.target.result);
          
          // Load object definition
          if (project.objectName) setObjectName(project.objectName);
          if (project.objectVersion) setObjectVersion(project.objectVersion);
          if (project.objectDescription) setObjectDescription(project.objectDescription);
          
           // Load nodes and edges (add missing fields for backwards compatibility)
          const updatedNodes = (project.nodes || []).map(node => {
            // Determine correct itemType
            let itemType = node.data.itemType || node.data.type;
            
            // Normalize: project/customer/platform/implementation are all "requirement" itemType
            if (['project', 'customer', 'platform', 'implementation'].includes(itemType)) {
              itemType = 'requirement';
            }
            
            // Detect from reqId prefix if still not set
            if (!itemType || itemType === 'requirement') {
              if (node.data.reqId?.startsWith('SYS')) itemType = 'system';
              else if (node.data.reqId?.startsWith('SUB')) itemType = 'subsystem';
              else if (node.data.reqId?.startsWith('FUN')) itemType = 'function';
              else if (node.data.reqId?.startsWith('TC')) itemType = 'testcase';
              else itemType = 'requirement';
            }
            
            return {
              ...node,
              data: {
                ...node.data,
                itemType: itemType,
                origin: node.data.origin || 'internal',
                classification: node.data.classification || 'requirement',
                onChange: handleNodeLabelChange
              }
            };
          });
          setNodes(updatedNodes);
          
          // Process edges - validate handles and add arrows
          const edgesWithArrows = (project.edges || []).map(edge => {
            const sourceNode = updatedNodes.find(n => n.id === edge.source);
            const targetNode = updatedNodes.find(n => n.id === edge.target);
            
            // Check if handles exist on the nodes
            const sourcePorts = sourceNode?.data?.ports || [];
            const targetPorts = targetNode?.data?.ports || [];
            
            const validSourceHandle = !edge.sourceHandle || 
              edge.sourceHandle === 'default-source' ||
              sourcePorts.some(p => p.id === edge.sourceHandle);
            const validTargetHandle = !edge.targetHandle || 
              edge.targetHandle === 'default-target' ||
              targetPorts.some(p => p.id === edge.targetHandle);
            
            return {
              ...edge,
              // Convert invalid or null handles to undefined (use default)
              sourceHandle: validSourceHandle ? (edge.sourceHandle === null ? undefined : edge.sourceHandle) : undefined,
              targetHandle: validTargetHandle ? (edge.targetHandle === null ? undefined : edge.targetHandle) : undefined,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: '#95a5a6'
              }
            };
          });
          setEdges(edgesWithArrows);
          
          // Update all ID counters via hook
          setCountersFromNodes(project.nodes);
          
          // Load issues via hook
          loadIssues(project.issues);
          
          setSelectedNode(null);
          setSelectedEdge(null);
          resetHistory();
        } catch (error) {
          alert('Error loading project file!');
        }
      };
      reader.readAsText(file);
    }
  };

  const clearFilters = () => {
    setSearchText('');
    setTypeFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setStateFilter('all');
    setReqTypeFilter('all');
    setClassificationFilter('all');
  };
  
  if (showSplash) {
      return <NorthlightSplash onComplete={() => setShowSplash(false)} duration={5000} />;
    }
  // Show loading while checking auth
  
  if (isAuthChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#1a1a2e',
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
    background: '#4a5f7f',
    border: 'none',
    color: 'white',
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
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e',overflow: 'hidden' }}>
      
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
        onViewModeChange={setViewMode}
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
      />
      
      {/* Left Icon Strip - hidden in freeform drawing mode */}
      {viewMode !== 'freeform' && <LeftIconStrip
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
        onOpenLibrary={() => setShowLibraryPanel(true)}
        onOpenIssueManager={() => setShowIssueManagerModal(true)}
        onVoice={startVoiceRecognition}
        isListening={isListening}
        voiceStatus={voiceStatus}
      />}
      
      {/* Sidebar - hidden in freeform drawing mode */}
      {viewMode !== 'freeform' && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <SidebarSection title="📁 Project">
          <SidebarButton 
            icon="💾" 
            label="Save Project" 
            onClick={() => { 
              saveProjectToDatabase(); 
              setSidebarOpen(false); 
            }} 
          />
          <SidebarButton 
            icon="🔗" 
            label="Share Project" 
            onClick={() => { 
            setShowShareModal(true); 
            setSidebarOpen(false); 
            }} 
          />
          <SidebarButton 
            icon="📂" 
            label="Open Project" 
            onClick={() => {
              if (window.confirm('Save current project before opening another?')) {
                saveProjectToDatabase();
              }
              handleCloseProject();
              setSidebarOpen(false);
            }} 
          />

          <SidebarButton 
            icon="📁" 
            label="Close Project" 
            onClick={() => {
              if (window.confirm('Save before closing?')) {
                saveProjectToDatabase().then(() => handleCloseProject());
              } else {
                handleCloseProject();
              }
              setSidebarOpen(false);
            }} 
          />
          <div style={{ 
              borderTop: '1px solid #34495e', 
              margin: '10px 0',
              paddingTop: '10px'
            }}>
              <div style={{ 
                fontSize: '10px', 
                color: '#7f8c8d', 
                marginBottom: '6px',
                paddingLeft: '10px'
              }}>
                FILE OPERATIONS
              </div>
              <SidebarButton 
                icon="📤" 
                label="Export to File (Ctrl+Shift+S)" 
                onClick={() => {
                  exportProject();
                  setSidebarOpen(false);
                }} 
              />
              <SidebarButton 
                icon="📥" 
                label="Import from File (Ctrl+O)" 
                onClick={() => {
                  document.getElementById('file-import-input')?.click();
                  setSidebarOpen(false);
                }} 
              />
            </div>
          <SidebarButton icon="📊" label="Export to Excel" onClick={() => { exportToExcel(); setSidebarOpen(false); }} />
          <SidebarButton icon="🆕" label="New Object" onClick={() => { setShowNewObjectModal(true); setSidebarOpen(false); }} />
          <SidebarButton 
            icon="🔗" 
            label="Link Manager" 
            onClick={() => { 
              setShowLinkManager(true); 
              setSidebarOpen(false); 
            }} 
          />

          <SidebarButton 
            icon="🔧" 
            label="Manage HW Types" 
            onClick={() => { 
              setShowHardwareTypesModal(true); 
              setSidebarOpen(false); 
            }} 
          />
        </SidebarSection>
        
        <SidebarSection title="👁️ View">
          <SidebarButton 
            icon="🏷️" 
            label={showRelationshipLabels ? 'Labels: ON' : 'Labels: OFF'} 
            onClick={() => setShowRelationshipLabels(!showRelationshipLabels)}
            active={showRelationshipLabels}
          />
          <SidebarButton 
            icon="📐" 
            label="Auto-Arrange (A)" 
            onClick={() => {
              autoLayoutNodes();
              setSidebarOpen(false);
            }} 
          />
        </SidebarSection>
        
        <SidebarSection title="📊 Statistics">
          <div style={{ 
            padding: '10px', 
            background: '#2c3e50', 
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#7f8c8d' }}>Total Items:</span>
              <span style={{ float: 'right', fontWeight: 'bold' }}>{stats.total}</span>
            </div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#7f8c8d' }}>Filtered:</span>
              <span style={{ float: 'right', fontWeight: 'bold' }}>{filteredCount}</span>
            </div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#7f8c8d' }}>Relationships:</span>
              <span style={{ float: 'right', fontWeight: 'bold' }}>{edges.length}</span>
            </div>
            {stats.floatingConnectors > 0 && (
              <div style={{ 
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px solid #34495e'
              }}>
                <span style={{ color: '#e74c3c' }}>⚠️ Unconnected:</span>
                <span style={{ float: 'right', fontWeight: 'bold', color: '#e74c3c' }}>
                  {stats.floatingConnectors}
                </span>
              </div>
            )}
          </div>
        </SidebarSection>
        
        <SidebarSection title="↩️ History">
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={undo}
              disabled={!canUndo}
              style={{
                flex: 1,
                padding: '8px',
                background: !canUndo ? '#34495e' : '#3498db',
                color: !canUndo ? '#666' : 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: !canUndo ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              ⏪ Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              style={{
                flex: 1,
                padding: '8px',
                background: !canRedo ? '#34495e' : '#3498db',
                color: !canRedo ? '#666' : 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: !canRedo ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              Redo ⏩
            </button>
          </div>
          <div style={{ fontSize: '10px', color: '#7f8c8d', marginTop: '6px', textAlign: 'center' }}>
            Ctrl+Z / Ctrl+Y
          </div>
        </SidebarSection>
        
        <SidebarSection title="💡 Help">
          <div style={{ 
            padding: '10px', 
            background: '#2c3e50', 
            borderRadius: '6px',
            fontSize: '11px',
            color: '#bdc3c7'
          }}>
            <div><strong>Double-click:</strong> Edit node</div>
            <div><strong>Connect:</strong> Drag from handle</div>
            <div><strong>Delete:</strong> Select + Del</div>
            <div><strong>Duplicate:</strong> Ctrl+D</div>
          </div>
        </SidebarSection>
      </Sidebar>}
      
      {/* Show Document View, Freeform Whiteboard, OR PLM Canvas */}
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
        healthIssues={linkHealthIssues}
        user={user?.name || 'unknown'}
      />
      ) : viewMode === 'freeform' ? (
        <Whiteboard style={{ marginTop: '50px', height: 'calc(100vh - 50px)' }} projectId={currentProject?.id || null} />
      ) : (
      
      <ReactFlow
        nodes={processedNodes}
        edges={edges.map(e => ({
          ...e,
          data: { 
            ...e.data, 
            showLabel: showRelationshipLabels,
            isWhiteboardMode: viewMode === 'whiteboard',
            onLabelChange: (edgeId, newLabel) => {
              setEdges(eds => eds.map(edge => 
                edge.id === edgeId 
                  ? { ...edge, data: { ...edge.data, customLabel: newLabel } }
                  : edge
              ));
            },
            onEdgeDoubleClick: (edgeId, event) => {
              const edge = edges.find(ed => ed.id === edgeId);
              if (edge) {
                setSelectedEdge(edge);
                setEdgePanelPosition({ x: event.clientX, y: event.clientY });
              }
            }
          }
        }))}
        onInit={setReactFlowInstance}
        onNodesChange={onNodesChange}
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
        panOnDrag={[1, 2]}
        selectionKeyCode={null}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        style={{ 
          background: viewMode === 'whiteboard' ? '#f5f5f5' : '#1a1a2e',
          marginTop: '50px',
          height: 'calc(100vh - 50px)'
        }}
      >
        <Controls style={{ bottom: 20, left: 70 }} />
        <MiniMap 
          style={{ 
            position: 'absolute',
            bottom: 120,
            right: 10,
            width: 150,
            height: 100,
            background: '#ecf0f1',
            borderRadius: '8px',
            border: '1px solid #34495e'
          }}
          maskColor="rgba(0,0,0,0.2)"
        />
        
        {/* Selection Toolbar - shows when multiple nodes selected */}
        {nodes.filter(n => n.selected).length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#2c3e50',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            flexWrap: 'wrap',
            maxWidth: '90vw'
          }}>
            {/* Selection count */}
            <span style={{ color: '#3498db', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>
              {nodes.filter(n => n.selected).length} selected
              {nodes.filter(n => n.selected && n.data?.locked).length > 0 && (
                <span style={{ color: '#e74c3c', marginLeft: '4px' }}>
                  ({nodes.filter(n => n.selected && n.data?.locked).length} 🔒)
                </span>
              )}
            </span>
            
            <div style={{ width: '1px', height: '24px', background: '#4a5f7f' }} />
            
            {/* Copy/Cut/Paste/Delete Group */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={copySelectedNodes} style={toolbarBtnStyle('#3498db')} title="Copy (Ctrl+C)">
                📋
              </button>
              <button onClick={() => { copySelectedNodes(); deleteSelectedNodes(); }} style={toolbarBtnStyle('#e67e22')} title="Cut (Ctrl+X)">
                ✂️
              </button>
              <button onClick={duplicateSelectedNodes} style={toolbarBtnStyle('#9b59b6')} title="Duplicate (Ctrl+D)">
                ⧉
              </button>
              <button onClick={deleteSelectedNodes} style={toolbarBtnStyle('#e74c3c')} title="Delete (Del)">
                🗑️
              </button>
            </div>
            
            <div style={{ width: '1px', height: '24px', background: '#4a5f7f' }} />
            
            {/* Align Group */}
            <div style={{ display: 'flex', gap: '2px' }}>
              <button onClick={() => alignSelectedNodes('left')} style={toolbarBtnSmall} title="Align Left">⬅</button>
              <button onClick={() => alignSelectedNodes('centerH')} style={toolbarBtnSmall} title="Align Center H">⬌</button>
              <button onClick={() => alignSelectedNodes('right')} style={toolbarBtnSmall} title="Align Right">➡</button>
              <button onClick={() => alignSelectedNodes('top')} style={toolbarBtnSmall} title="Align Top">⬆</button>
              <button onClick={() => alignSelectedNodes('centerV')} style={toolbarBtnSmall} title="Align Center V">⬍</button>
              <button onClick={() => alignSelectedNodes('bottom')} style={toolbarBtnSmall} title="Align Bottom">⬇</button>
            </div>
            
            {/* Distribute */}
            <div style={{ display: 'flex', gap: '2px' }}>
              <button onClick={() => alignSelectedNodes('distributeH')} style={toolbarBtnSmall} title="Distribute Horizontally">↔</button>
              <button onClick={() => alignSelectedNodes('distributeV')} style={toolbarBtnSmall} title="Distribute Vertically">↕</button>
            </div>
            
            <div style={{ width: '1px', height: '24px', background: '#4a5f7f' }} />
            
            {/* Lock/Group/Export */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                onClick={toggleLockSelectedNodes} 
                style={toolbarBtnStyle(nodes.filter(n => n.selected).some(n => n.data?.locked) ? '#e74c3c' : '#27ae60')} 
                title={nodes.filter(n => n.selected).some(n => !n.data?.locked) ? "Lock (Ctrl+L)" : "Unlock (Ctrl+L)"}
              >
                {nodes.filter(n => n.selected).some(n => !n.data?.locked) ? '🔒' : '🔓'}
              </button>
              <button onClick={groupSelectedNodes} style={toolbarBtnStyle('#1abc9c')} title="Group (Ctrl+G)">
                📁
              </button>
              {nodes.filter(n => n.selected && n.data?.isGroup).length > 0 && (
                <button onClick={ungroupSelectedNodes} style={toolbarBtnStyle('#95a5a6')} title="Ungroup (Ctrl+Shift+G)">
                  📂
                </button>
              )}
              <button onClick={exportSelectedNodes} style={toolbarBtnStyle('#f39c12')} title="Export Selection">
                📤
              </button>
            </div>
                                    
            <div style={{ width: '1px', height: '24px', background: '#4a5f7f' }} />
            
            {/* Clear */}
            <button
              onClick={() => setNodes(nds => nds.map(n => ({ ...n, selected: false })))}
              style={{
                background: 'transparent',
                border: '1px solid #7f8c8d',
                color: '#bdc3c7',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
              title="Clear selection (Esc)"
            >
              ✕
            </button>
          </div>
        )}
        
        {/* Paste indicator - shows if clipboard has content */}
        {clipboard.nodes.length > 0 && nodes.filter(n => n.selected).length === 0 && (
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#27ae60',
            borderRadius: '8px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000
          }}>
            <span style={{ color: 'white', fontSize: '13px' }}>
              📋 {clipboard.nodes.length} item{clipboard.nodes.length > 1 ? 's' : ''} in clipboard
            </span>
            <button
              onClick={pasteNodes}
              style={{
                background: 'white',
                border: 'none',
                color: '#27ae60',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
              title="Paste (Ctrl+V)"
            >
              📥 Paste
            </button>
          </div>
        )}
        
        <Background 
          variant="dots" 
          gap={12} 
          size={1} 
          color={viewMode === 'whiteboard' ? '#ccc' : '#444'} 
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
            background: '#2c3e50',
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
                  background: selectedNode.data.fontWeight === 'bold' ? '#3498db' : '#34495e',
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
                  background: selectedNode.data.fontStyle === 'italic' ? '#3498db' : '#34495e',
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
    </div>
    </CollaborationProvider>
  );
}
