import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Whiteboard, Clipboard } from '../types';
import { useState, useCallback } from 'react';
import useStore from '../store';

/**
 * Manages clipboard operations: copy, paste, delete, and duplicate selected nodes.
 */
interface UseClipboardParams {
  nodes: PLMNode[];
  edges: PLMEdge[];
  setNodes: (fn: PLMNode[] | ((prev: PLMNode[]) => PLMNode[])) => void;
  setEdges: (fn: PLMEdge[] | ((prev: PLMEdge[]) => PLMEdge[])) => void;
  nodeId: number;
  setNodeId: (v: number | ((prev: number) => number)) => void;
  counters: Record<string, number>;
  incrementCounter: (type: string) => void;
  handleNodeLabelChange: (nodeId: string, field: string, value: unknown) => void;
}

export default function useClipboard({
  nodes, edges, setNodes, setEdges,
  nodeId, setNodeId,
  counters, incrementCounter,
  handleNodeLabelChange,
}: UseClipboardParams) {
  const setSelectedNode = useStore(s => s.setSelectedNode);
  const [clipboard, setClipboard] = useState<Clipboard>({ nodes: [], edges: [] });

  const copySelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter((n: any) => n.selected);
    if (selectedNodes.length === 0) {
      console.log('No nodes selected to copy');
      return;
    }

    const selectedNodeIds = selectedNodes.map((n: any) => n.id);
    const relatedEdges = edges.filter(e =>
      selectedNodeIds.includes(e.source) && selectedNodeIds.includes(e.target)
    );

    setClipboard({
      nodes: JSON.parse(JSON.stringify(selectedNodes)),
      edges: JSON.parse(JSON.stringify(relatedEdges))
    });

    console.log(`Copied ${selectedNodes.length} nodes and ${relatedEdges.length} edges`);
  }, [nodes, edges]);

  const pasteNodes = useCallback(() => {
    if (clipboard.nodes.length === 0) {
      console.log('Clipboard is empty');
      return;
    }

    const pad = (n) => String(n).padStart(3, '0');
    const {
      sysIdCounter, subIdCounter, funIdCounter, hwIdCounter, parIdCounter, tcIdCounter,
      cusIdCounter, pltIdCounter, prjIdCounter, impIdCounter
    } = counters;

    const idMapping = {};
    const offset = { x: 50, y: 50 };

    const newNodes = clipboard.nodes.map(node => {
      const newId = String(nodeId + Object.keys(idMapping).length);
      idMapping[node.id] = newId;

      let newReqId = node.data.reqId;
      const itemType = node.data.itemType || node.data.type;
      if (itemType === 'system') newReqId = `SYS-${pad(sysIdCounter)}`;
      else if (itemType === 'subsystem') newReqId = `SUB-${pad(subIdCounter)}`;
      else if (itemType === 'function') newReqId = `FUN-${pad(funIdCounter)}`;
      else if (itemType === 'hardware') newReqId = `HW-${pad(hwIdCounter)}`;
      else if (itemType === 'parameter') newReqId = `PAR-${pad(parIdCounter)}`;
      else if (itemType === 'testcase') newReqId = `TC-${pad(tcIdCounter)}`;
      else if (itemType === 'requirement') {
        const reqType = node.data.reqType || 'project';
        if (reqType === 'customer') newReqId = `CUS-${pad(cusIdCounter)}`;
        else if (reqType === 'platform') newReqId = `PLT-${pad(pltIdCounter)}`;
        else if (reqType === 'implementation') newReqId = `IMP-${pad(impIdCounter)}`;
        else newReqId = `PRJ-${pad(prjIdCounter)}`;
      }

      return {
        ...node,
        id: newId,
        position: { x: node.position.x + offset.x, y: node.position.y + offset.y },
        selected: true,
        data: {
          ...node.data,
          reqId: newReqId,
          label: `${node.data.label} (copy)`,
          onChange: handleNodeLabelChange
        }
      };
    });

    const newEdges = clipboard.edges.map(edge => ({
      ...edge,
      id: `e${idMapping[edge.source]}-${idMapping[edge.target]}-${Date.now()}`,
      source: idMapping[edge.source],
      target: idMapping[edge.target]
    }));

    setNodeId(prev => prev + newNodes.length);
    newNodes.forEach(node => {
      const itemType = node.data.itemType || node.data.type;
      if (itemType === 'requirement') {
        incrementCounter(node.data.reqType || 'project');
      } else {
        incrementCounter(itemType);
      }
    });

    setNodes(nds => [
      ...nds.map((n: any) => ({ ...n, selected: false })),
      ...newNodes
    ]);
    if (newEdges.length > 0) {
      setEdges(eds => [...eds, ...newEdges]);
    }

    console.log(`Pasted ${newNodes.length} nodes and ${newEdges.length} edges`);
  }, [clipboard, nodeId, handleNodeLabelChange, setNodes, setEdges, counters, setNodeId, incrementCounter]);

  const deleteSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter((n: any) => n.selected);
    const selectedNodeIds = selectedNodes.map((n: any) => n.id);

    if (selectedNodeIds.length === 0) return;

    const lockedNodes = selectedNodes.filter((n: any) => n.data?.locked);
    if (lockedNodes.length > 0) {
      alert(`Cannot delete ${lockedNodes.length} locked node(s). Unlock them first.`);
      return;
    }

    setNodes(nds => nds.filter((n: any) => !n.selected));
    setEdges(eds => eds.filter(e =>
      !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target)
    ));
    setSelectedNode(null);

    console.log(`Deleted ${selectedNodeIds.length} nodes`);
  }, [nodes, setNodes, setEdges, setSelectedNode]);

  const duplicateSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter((n: any) => n.selected);
    if (selectedNodes.length === 0) return;

    const pad = (n) => String(n).padStart(3, '0');
    const {
      sysIdCounter, subIdCounter, funIdCounter, hwIdCounter, parIdCounter, tcIdCounter,
      ucIdCounter, actIdCounter
    } = counters;

    const idMapping = {};
    const offset = { x: 30, y: 30 };

    const newNodes = selectedNodes.map(node => {
      const newId = String(nodeId + Object.keys(idMapping).length);
      idMapping[node.id] = newId;

      let newReqId = node.data.reqId;
      const itemType = node.data.itemType || node.data.type;
      if (itemType === 'system') newReqId = `SYS-${pad(sysIdCounter + Object.keys(idMapping).length - 1)}`;
      else if (itemType === 'subsystem') newReqId = `SUB-${pad(subIdCounter + Object.keys(idMapping).length - 1)}`;
      else if (itemType === 'function') newReqId = `FUN-${pad(funIdCounter + Object.keys(idMapping).length - 1)}`;
      else if (itemType === 'hardware') newReqId = `HW-${pad(hwIdCounter + Object.keys(idMapping).length - 1)}`;
      else if (itemType === 'parameter') newReqId = `PAR-${pad(parIdCounter + Object.keys(idMapping).length - 1)}`;
      else if (itemType === 'testcase') newReqId = `TC-${pad(tcIdCounter + Object.keys(idMapping).length - 1)}`;
      else if (itemType === 'usecase') newReqId = `UC-${pad(ucIdCounter + Object.keys(idMapping).length - 1)}`;
      else if (itemType === 'actor') newReqId = `ACT-${pad(actIdCounter + Object.keys(idMapping).length - 1)}`;

      return {
        ...node,
        id: newId,
        position: { x: node.position.x + offset.x, y: node.position.y + offset.y },
        selected: true,
        data: {
          ...node.data,
          reqId: newReqId,
          locked: false,
          onChange: handleNodeLabelChange
        }
      };
    });

    const selectedIds = selectedNodes.map((n: any) => n.id);
    const relatedEdges = edges.filter(e =>
      selectedIds.includes(e.source) && selectedIds.includes(e.target)
    );
    const newEdges = relatedEdges.map(edge => ({
      ...edge,
      id: `e${idMapping[edge.source]}-${idMapping[edge.target]}-${Date.now()}`,
      source: idMapping[edge.source],
      target: idMapping[edge.target]
    }));

    setNodeId(prev => prev + newNodes.length);
    newNodes.forEach(node => {
      const itemType = node.data.itemType || node.data.type;
      incrementCounter(itemType);
    });

    setNodes(nds => [...nds.map((n: any) => ({ ...n, selected: false })), ...newNodes]);
    if (newEdges.length > 0) setEdges(eds => [...eds, ...newEdges]);

    console.log(`Duplicated ${newNodes.length} nodes`);
  }, [nodes, edges, nodeId, handleNodeLabelChange, setNodes, setEdges, counters, setNodeId, incrementCounter]);

  return {
    clipboard,
    copySelectedNodes,
    pasteNodes,
    deleteSelectedNodes,
    duplicateSelectedNodes,
  };
}
