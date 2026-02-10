import { useCallback } from 'react';

/**
 * Batch operations on selected nodes: align, lock, export, group, ungroup.
 */
export default function useNodeOperations({
  nodes, edges, setNodes, nodeId, setNodeId, handleNodeLabelChange,
}) {
  const alignSelectedNodes = useCallback((direction) => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length < 2) return;

    const lockedNodes = selectedNodes.filter(n => n.data?.locked);
    if (lockedNodes.length > 0) {
      alert(`Cannot align - ${lockedNodes.length} node(s) are locked.`);
      return;
    }

    const positions = selectedNodes.map(n => n.position);
    let targetValue;

    switch (direction) {
      case 'left':
        targetValue = Math.min(...positions.map(p => p.x));
        setNodes(nds => nds.map(n => n.selected ? { ...n, position: { ...n.position, x: targetValue } } : n));
        break;
      case 'right':
        targetValue = Math.max(...positions.map(p => p.x));
        setNodes(nds => nds.map(n => n.selected ? { ...n, position: { ...n.position, x: targetValue } } : n));
        break;
      case 'top':
        targetValue = Math.min(...positions.map(p => p.y));
        setNodes(nds => nds.map(n => n.selected ? { ...n, position: { ...n.position, y: targetValue } } : n));
        break;
      case 'bottom':
        targetValue = Math.max(...positions.map(p => p.y));
        setNodes(nds => nds.map(n => n.selected ? { ...n, position: { ...n.position, y: targetValue } } : n));
        break;
      case 'centerH':
        targetValue = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
        setNodes(nds => nds.map(n => n.selected ? { ...n, position: { ...n.position, x: targetValue } } : n));
        break;
      case 'centerV':
        targetValue = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
        setNodes(nds => nds.map(n => n.selected ? { ...n, position: { ...n.position, y: targetValue } } : n));
        break;
      case 'distributeH': {
        const sortedByX = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
        const minX = sortedByX[0].position.x;
        const maxX = sortedByX[sortedByX.length - 1].position.x;
        const stepX = (maxX - minX) / (sortedByX.length - 1);
        const xMapping = {};
        sortedByX.forEach((n, i) => { xMapping[n.id] = minX + i * stepX; });
        setNodes(nds => nds.map(n => n.selected ? { ...n, position: { ...n.position, x: xMapping[n.id] } } : n));
        break;
      }
      case 'distributeV': {
        const sortedByY = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
        const minY = sortedByY[0].position.y;
        const maxY = sortedByY[sortedByY.length - 1].position.y;
        const stepY = (maxY - minY) / (sortedByY.length - 1);
        const yMapping = {};
        sortedByY.forEach((n, i) => { yMapping[n.id] = minY + i * stepY; });
        setNodes(nds => nds.map(n => n.selected ? { ...n, position: { ...n.position, y: yMapping[n.id] } } : n));
        break;
      }
      default:
        break;
    }
  }, [nodes, setNodes]);

  const toggleLockSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return;

    const anyUnlocked = selectedNodes.some(n => !n.data?.locked);

    setNodes(nds => nds.map(n => {
      if (n.selected) {
        return {
          ...n,
          draggable: anyUnlocked ? false : true,
          data: { ...n.data, locked: anyUnlocked }
        };
      }
      return n;
    }));

    console.log(anyUnlocked ? 'Locked selected nodes' : 'Unlocked selected nodes');
  }, [nodes, setNodes]);

  const exportSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return;

    const selectedIds = selectedNodes.map(n => n.id);
    const relatedEdges = edges.filter(e =>
      selectedIds.includes(e.source) && selectedIds.includes(e.target)
    );

    const exportData = {
      name: `Selection_${new Date().toISOString().slice(0, 10)}`,
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes: selectedNodes.map(n => ({
        ...n,
        data: { ...n.data, onChange: undefined }
      })),
      edges: relatedEdges
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plm_selection_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`Exported ${selectedNodes.length} nodes and ${relatedEdges.length} edges`);
  }, [nodes, edges]);

  const groupSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length < 2) {
      alert('Select at least 2 nodes to group');
      return;
    }

    const lockedNodes = selectedNodes.filter(n => n.data?.locked);
    if (lockedNodes.length > 0) {
      alert(`Cannot group - ${lockedNodes.length} node(s) are locked.`);
      return;
    }

    const padding = 40;
    const positions = selectedNodes.map(n => n.position);
    const minX = Math.min(...positions.map(p => p.x)) - padding;
    const minY = Math.min(...positions.map(p => p.y)) - padding;
    const maxX = Math.max(...positions.map(p => p.x)) + 200 + padding;
    const maxY = Math.max(...positions.map(p => p.y)) + 100 + padding;

    const groupName = prompt('Enter group name:', 'Group');
    if (!groupName) return;

    const groupId = String(nodeId);

    const groupNode = {
      id: groupId,
      type: 'custom',
      position: { x: minX, y: minY },
      style: { zIndex: -1 },
      data: {
        label: groupName,
        type: 'group',
        itemType: 'group',
        reqId: `GRP-${String(nodeId).padStart(3, '0')}`,
        version: '1.0',
        isGroup: true,
        groupWidth: maxX - minX,
        groupHeight: maxY - minY,
        groupColor: '#3498db',
        childIds: selectedNodes.map(n => n.id),
        description: `Group containing ${selectedNodes.length} items`,
        onChange: handleNodeLabelChange
      }
    };

    setNodes(nds => [groupNode, ...nds.map(n => ({ ...n, selected: false }))]);
    setNodeId(prev => prev + 1);

    console.log(`Created group with ${selectedNodes.length} nodes`);
  }, [nodes, nodeId, handleNodeLabelChange, setNodes, setNodeId]);

  const ungroupSelectedNodes = useCallback(() => {
    const selectedGroups = nodes.filter(n => n.selected && n.data?.isGroup);
    if (selectedGroups.length === 0) return;

    const groupIds = selectedGroups.map(g => g.id);
    setNodes(nds => nds.filter(n => !groupIds.includes(n.id)));

    console.log(`Removed ${selectedGroups.length} group(s)`);
  }, [nodes, setNodes]);

  return {
    alignSelectedNodes,
    toggleLockSelectedNodes,
    exportSelectedNodes,
    groupSelectedNodes,
    ungroupSelectedNodes,
  };
}
