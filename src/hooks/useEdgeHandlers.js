import { useCallback, useRef } from 'react';
import { addEdge, updateEdge, MarkerType } from 'reactflow';
import { inferRelationshipType } from '../constants/relationships';

/**
 * Manages all edge-related event handlers:
 * onEdgeUpdateStart, onEdgeUpdate, onEdgeUpdateEnd, onNodeDragStop, onConnect
 */
export default function useEdgeHandlers({
  nodes, setNodes, setEdges, reactFlowInstance,
}) {
  const edgeUpdateSuccessful = useRef(true);

  const onEdgeUpdateStart = useCallback(() => {
    console.log('🔵 Edge drag STARTED');
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = useCallback((oldEdge, newConnection) => {
    edgeUpdateSuccessful.current = true;

    // Check if we're reconnecting FROM a floating connector
    const oldTargetNode = nodes.find(n => n.id === oldEdge.target);
    const oldSourceNode = nodes.find(n => n.id === oldEdge.source);

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
      if (!event || !event.clientX || !event.clientY || !reactFlowInstance) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        edgeUpdateSuccessful.current = true;
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (!position) {
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

      setNodes((nds) => [...nds, newConnectorNode]);

      setEdges((eds) => eds.map((e) => {
        if (e.id === edge.id) {
          return { ...e, target: connectorId, targetHandle: null };
        }
        return e;
      }));
    }

    edgeUpdateSuccessful.current = true;
  }, [setEdges, setNodes, reactFlowInstance]);

  const onNodeDragStop = useCallback((event, node) => {
    if (!node.data?.isFloatingConnector) return;

    const connectorPos = node.position;
    const nearbyThreshold = 50;

    for (const otherNode of nodes) {
      if (otherNode.id === node.id) continue;
      if (otherNode.data?.isFloatingConnector) continue;

      const nodeWidth = 200;
      const nodeHeight = 100;

      const isNearNode =
        connectorPos.x >= otherNode.position.x - nearbyThreshold &&
        connectorPos.x <= otherNode.position.x + nodeWidth + nearbyThreshold &&
        connectorPos.y >= otherNode.position.y - nearbyThreshold &&
        connectorPos.y <= otherNode.position.y + nodeHeight + nearbyThreshold;

      if (isNearNode) {
        // Find edges connected to this connector - need to access current edges
        setEdges((currentEdges) => {
          const connectedEdge = currentEdges.find(e =>
            e.target === node.id || e.source === node.id
          );

          if (connectedEdge) {
            const ports = otherNode.data?.ports || [];

            return currentEdges.map((e) => {
              if (e.id === connectedEdge.id) {
                if (e.target === node.id) {
                  const inputPorts = ports.filter(p => p.direction === 'input' || p.type === 'input');
                  const targetHandle = inputPorts.length > 0 ? inputPorts[0].id : null;
                  return { ...e, target: otherNode.id, targetHandle };
                } else {
                  const outputPorts = ports.filter(p => p.direction === 'output' || p.type === 'output');
                  const sourceHandle = outputPorts.length > 0 ? outputPorts[0].id : null;
                  return { ...e, source: otherNode.id, sourceHandle };
                }
              }
              return e;
            });
          }
          return currentEdges;
        });

        // Remove the connector node
        setNodes((nds) => nds.filter((n) => n.id !== node.id));
        return;
      }
    }
  }, [nodes, setNodes, setEdges]);

  const onConnect = useCallback((params) => {
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
    const relationType = inferRelationshipType(sourceNode, targetNode);

    const sourcePort = sourceNode?.data?.ports?.find(p => p.id === params.sourceHandle);
    const targetPort = targetNode?.data?.ports?.find(p => p.id === params.targetHandle);

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

  return {
    edgeUpdateSuccessful,
    onEdgeUpdateStart,
    onEdgeUpdate,
    onEdgeUpdateEnd,
    onNodeDragStop,
    onConnect,
  };
}
