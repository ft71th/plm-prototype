import { useCallback } from 'react';
import { MarkerType } from 'reactflow';
import * as XLSX from 'xlsx';
import { projects } from '../api';

/**
 * Handles project save, export (JSON + Excel) and import.
 */
export default function useProjectIO({
  objectName, objectVersion, objectDescription,
  setObjectName, setObjectVersion, setObjectDescription,
  nodes, edges, setNodes, setEdges,
  whiteboards, whiteboardNodes, whiteboardEdges,
  issues, issueIdCounter,
  handleNodeLabelChange,
  setCountersFromNodes, loadIssues, resetHistory,
  setSelectedNode, setSelectedEdge,
  // Save to database
  currentProject, setShowSaveToast, requirementLinks,
}) {
  const saveProjectToDatabase = useCallback(async () => {
    if (!currentProject) {
      alert('No project open');
      return;
    }
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 1000);

    try {
      // Prepare nodes - remove non-serializable functions and floating connectors
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
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save project: ' + err.message);
    }
  }, [currentProject, objectName, objectDescription, objectVersion, nodes, edges, whiteboards, issues, issueIdCounter, requirementLinks, setShowSaveToast]);


  const exportProject = useCallback(() => {
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
  }, [objectName, objectVersion, nodes, edges, whiteboards, whiteboardNodes, whiteboardEdges, issues, issueIdCounter]);

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

  const importProject = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const project = JSON.parse(e.target.result);

          if (project.objectName) setObjectName(project.objectName);
          if (project.objectVersion) setObjectVersion(project.objectVersion);
          if (project.objectDescription) setObjectDescription(project.objectDescription);

          const updatedNodes = (project.nodes || []).map(node => {
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
              // Restore resized dimensions as style so ReactFlow renders at saved size
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

          const edgesWithArrows = (project.edges || []).map(edge => {
            const sourceNode = updatedNodes.find(n => n.id === edge.source);
            const targetNode = updatedNodes.find(n => n.id === edge.target);

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
  }, [handleNodeLabelChange, setNodes, setEdges, setObjectName, setObjectVersion, setObjectDescription,
      setCountersFromNodes, loadIssues, resetHistory, setSelectedNode, setSelectedEdge]);

  return { saveProjectToDatabase, exportProject, exportToExcel, importProject };
}
