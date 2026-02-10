import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Whiteboard, Clipboard } from '../types';
import { useState, useCallback } from 'react';
import useStore from '../store';

/**
 * Manages whiteboard list, active whiteboard, per-whiteboard node/edge storage,
 * and switching logic.
 * 
 * Requires nodes/edges/setNodes/setEdges from the parent since ReactFlow
 * state lives in App.
 */
interface UseWhiteboardsParams {
  nodes: PLMNode[];
  edges: PLMEdge[];
  setNodes: (fn: PLMNode[] | ((prev: PLMNode[]) => PLMNode[])) => void;
  setEdges: (fn: PLMEdge[] | ((prev: PLMEdge[]) => PLMEdge[])) => void;
}

export default function useWhiteboards({ nodes, edges, setNodes, setEdges }: UseWhiteboardsParams) {
  const setViewMode = useStore(s => s.setViewMode);
  const setSelectedNode = useStore(s => s.setSelectedNode);
  const setSelectedEdge = useStore(s => s.setSelectedEdge);
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([
    { id: 'plm', name: 'Project', type: 'plm' }
  ]);
  const [activeWhiteboardId, setActiveWhiteboardId] = useState('plm');
  const [whiteboardNodes, setWhiteboardNodes] = useState<Record<string, PLMNode[]>>({});
  const [whiteboardEdges, setWhiteboardEdges] = useState<Record<string, PLMEdge[]>>({});
  const [showWhiteboardDropdown, setShowWhiteboardDropdown] = useState(false);

  /** Save current view's data to the whiteboard store */
  const saveCurrentView = useCallback(() => {
    if (activeWhiteboardId === 'plm') {
      setWhiteboardNodes(prev => ({ ...prev, 'plm': nodes }));
      setWhiteboardEdges(prev => ({ ...prev, 'plm': edges }));
    } else {
      setWhiteboardNodes(prev => ({ ...prev, [activeWhiteboardId]: nodes }));
      setWhiteboardEdges(prev => ({ ...prev, [activeWhiteboardId]: edges }));
    }
  }, [activeWhiteboardId, nodes, edges]);

  const createNewWhiteboard = useCallback((name) => {
    const newId = `wb-${Date.now()}`;
    const newWhiteboard = {
      id: newId,
      name: name || `Whiteboard ${whiteboards.length}`,
      type: 'whiteboard'
    };

    // Save current data before switching
    saveCurrentView();

    // Add new whiteboard to list
    setWhiteboards(prev => [...prev, newWhiteboard]);
    setWhiteboardNodes(prev => ({ ...prev, [newId]: [] }));
    setWhiteboardEdges(prev => ({ ...prev, [newId]: [] }));

    // Switch to the new whiteboard immediately
    setNodes([]);
    setEdges([]);
    setViewMode('whiteboard');
    setActiveWhiteboardId(newId);
    setShowWhiteboardDropdown(false);
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [whiteboards.length, saveCurrentView, setNodes, setEdges, setViewMode, setSelectedNode, setSelectedEdge]);

  const switchWhiteboard = useCallback((whiteboardId: string) => {
    // Save current view's data before switching
    saveCurrentView();

    // Small delay to ensure state is saved before loading new view
    setTimeout(() => {
      if (whiteboardId === 'plm') {
        const plmNodes = whiteboardNodes['plm'] || nodes;
        const plmEdges = whiteboardEdges['plm'] || edges;
        setNodes(plmNodes);
        setEdges(plmEdges);
        setViewMode('plm');
      } else {
        const wbNodes = whiteboardNodes[whiteboardId] || [];
        const wbEdges = whiteboardEdges[whiteboardId] || [];
        setNodes(wbNodes);
        setEdges(wbEdges);
        setViewMode('whiteboard');
      }

      setActiveWhiteboardId(whiteboardId);
      setShowWhiteboardDropdown(false);
      setSelectedNode(null);
      setSelectedEdge(null);
    }, 50);
  }, [saveCurrentView, whiteboardNodes, whiteboardEdges, nodes, edges, setNodes, setEdges, setViewMode, setSelectedNode, setSelectedEdge]);

  const deleteWhiteboard = useCallback((whiteboardId: string) => {
    if (whiteboardId === 'plm') return; // Can't delete PLM view

    // If deleting active whiteboard, switch to PLM
    if (activeWhiteboardId === whiteboardId) {
      switchWhiteboard('plm');
    }

    setWhiteboards(prev => prev.filter(wb => wb.id !== whiteboardId));
    setWhiteboardNodes(prev => {
      const newNodes = { ...prev };
      delete newNodes[whiteboardId];
      return newNodes;
    });
    setWhiteboardEdges(prev => {
      const newEdges = { ...prev };
      delete newEdges[whiteboardId];
      return newEdges;
    });
  }, [activeWhiteboardId, switchWhiteboard]);

  /** Load whiteboards from project data */
  const loadWhiteboards = useCallback((projectWhiteboards: Whiteboard[]) => {
    if (projectWhiteboards) {
      setWhiteboards(projectWhiteboards);
    } else {
      setWhiteboards([{ id: 'plm', name: 'Project', type: 'plm' }]);
    }
  }, []);

  return {
    whiteboards,
    setWhiteboards,
    activeWhiteboardId,
    setActiveWhiteboardId,
    whiteboardNodes,
    whiteboardEdges,
    showWhiteboardDropdown,
    setShowWhiteboardDropdown,
    createNewWhiteboard,
    switchWhiteboard,
    deleteWhiteboard,
    loadWhiteboards,
  };
}
