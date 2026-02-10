import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Whiteboard, Clipboard } from '../types';
import { useCallback } from 'react';
import { MarkerType } from 'reactflow';
import * as XLSX from 'xlsx';
import { projects } from '../api';
import useStore from '../store';

/**
 * Handles project save, export (JSON + Excel) and import.
 * 
 * Uses useStore.getState() inside callbacks to avoid stale closures
 * for store values that change after the hook is created.
 */
interface UseProjectIOParams {
  nodes: PLMNode[];
  edges: PLMEdge[];
  setNodes: (fn: PLMNode[] | ((prev: PLMNode[]) => PLMNode[])) => void;
  setEdges: (fn: PLMEdge[] | ((prev: PLMEdge[]) => PLMEdge[])) => void;
  whiteboards: Whiteboard[];
  whiteboardNodes: Record<string, PLMNode[]>;
  whiteboardEdges: Record<string, PLMEdge[]>;
  issues: IssueMap;
  issueIdCounter: number;
  handleNodeLabelChange: (nodeId: string, field: string, value: unknown) => void;
  setCountersFromNodes: (nodes: PLMNode[]) => void;
  loadIssues: (issues: IssueMap, counter: number) => void;
  resetHistory: () => void;
  requirementLinks: any[];
}

export default function useProjectIO({
  nodes, edges, setNodes, setEdges,
  whiteboards, whiteboardNodes, whiteboardEdges,
  issues, issueIdCounter,
  handleNodeLabelChange,
  setCountersFromNodes, loadIssues, resetHistory,
  requirementLinks,
}: UseProjectIOParams) {

  const saveProjectToDatabase = useCallback(async () => {
    const { currentProject, objectName, objectDescription, objectVersion, setShowSaveToast } = useStore.getState();
    if (!currentProject) {
      alert('No project open');
      return;
    }
    setShowSaveToast(true);
    setTimeout(() => useStore.getState().setShowSaveToast(false), 1000);

    try {
      const nodesToSave = nodes
        .filter(node => !node.data?.isFloatingConnector)
        .map(node => ({
          ...node,
          data: {
            ...node.data,
            onChange: undefined,
            onLabelChange: undefined,
          }
        }));

      const connectorIds = nodes
        .filter((n: any) => n.data?.isFloatingConnector)
        .map((n: any) => n.id);

      const edgesToSave = edges
        .filter(e => !connectorIds.includes(e.source) && !connectorIds.includes(e.target))
        .map(edge => ({
          ...edge,
          data: {
            ...edge.data,
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
    } catch (err: any) {
      console.error('Save error:', err);
      alert('Failed to save project: ' + err.message);
    }
  }, [nodes, edges, whiteboards, issues, issueIdCounter, requirementLinks]);


  const exportProject = useCallback(() => {
    const { objectName, objectVersion } = useStore.getState();
    const defaultName = objectName.replace(/[^a-z0-9]/gi, '_') || 'project';
    const filename = prompt('Save project as:', defaultName);

    if (!filename) return;

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
  }, [nodes, edges, whiteboards, whiteboardNodes, whiteboardEdges, issues, issueIdCounter]);

  const exportToExcel = useCallback(() => {
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

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    ws['!cols'] = [
      { wch: 12 }, { wch: 30 }, { wch: 8 }, { wch: 15 }, { wch: 15 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 50 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Requirements');

    const date = new Date().toISOString().split('T')[0];
    const filename = `PLM-Requirements-${date}.xlsx`;
    XLSX.writeFile(wb, filename);
  }, [nodes]);

  const importProject = useCallback((event: any) => {
    const { setObjectName, setObjectVersion, setObjectDescription, setSelectedNode, setSelectedEdge } = useStore.getState();
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const project = JSON.parse(e.target.result);

          if (project.objectName) setObjectName(project.objectName);
          if (project.objectVersion) setObjectVersion(project.objectVersion);
          if (project.objectDescription) setObjectDescription(project.objectDescription);

          const updatedNodes = (project.nodes || []).map((node: any) => {
            let itemType = node.data.itemType || node.data.type;

            if (['project', 'customer', 'platform', 'implementation'].includes(itemType)) {
              itemType = 'requirement';
            }

            if (!itemType || itemType === 'requirement') {
              if (node.data.reqId?.startsWith('SYS')) itemType = 'system';
              else if (node.data.reqId?.startsWith('SUB')) itemType = 'subsystem';
              else if (node.data.reqId?.startsWith('FUN')) itemType = 'function';
              else if (node.data.reqId?.startsWith('TC')) itemType = 'testcase';
              else itemType = 'requirement';
            }

            return {
              ...node,
              style: {
                ...(node.style || {}),
                ...(node.data?.nodeWidth ? { width: node.data.nodeWidth } : {}),
                ...(node.data?.nodeHeight ? { height: node.data.nodeHeight } : {}),
              },
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

          const edgesWithArrows = (project.edges || []).map((edge: any) => {
            const sourceNode = updatedNodes.find((n: any) => n.id === edge.source);
            const targetNode = updatedNodes.find((n: any) => n.id === edge.target);

            const sourcePorts = sourceNode?.data?.ports || [];
            const targetPorts = targetNode?.data?.ports || [];

            const validSourceHandle = !edge.sourceHandle ||
              edge.sourceHandle === 'default-source' ||
              sourcePorts.some((p: any) => p.id === edge.sourceHandle);
            const validTargetHandle = !edge.targetHandle ||
              edge.targetHandle === 'default-target' ||
              targetPorts.some((p: any) => p.id === edge.targetHandle);

            return {
              ...edge,
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

          setCountersFromNodes(project.nodes);
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
  }, [handleNodeLabelChange, setNodes, setEdges, setCountersFromNodes, loadIssues, resetHistory]);

  return { saveProjectToDatabase, exportProject, exportToExcel, importProject };
}
