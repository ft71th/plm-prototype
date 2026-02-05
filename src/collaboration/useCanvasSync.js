/**
 * useCanvasSync - Synka React Flow canvas med Yjs
 * 
 * Brygga mellan React Flows noder/edges och Yjs Y.Map.
 * Hanterar bidirektionell synk: lokala ändringar → Yjs → andra klienter.
 * 
 * Användning:
 *   const { nodes, edges, onNodesChange, onEdgesChange } = useCanvasSync();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCollab } from './CollaborationProvider';

/**
 * Synka React Flow noder med Yjs
 */
export function useCanvasSync() {
  const { sharedData, ydoc } = useCollab();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const isRemoteUpdate = useRef(false);

  // ─────────────────────────────────────────
  // Synka noder: Yjs → React state
  // ─────────────────────────────────────────
  useEffect(() => {
    const yNodes = sharedData?.nodes;
    if (!yNodes) return;

    // Initial load
    const loadNodes = () => {
      const nodeArray = [];
      yNodes.forEach((value, key) => {
        nodeArray.push({ ...value, id: key });
      });
      setNodes(nodeArray);
    };

    loadNodes();

    // Lyssna på remote-ändringar
    const observer = (event) => {
      isRemoteUpdate.current = true;
      loadNodes();
      // Reset flaggan efter att React har processat uppdateringen
      requestAnimationFrame(() => {
        isRemoteUpdate.current = false;
      });
    };

    yNodes.observe(observer);
    return () => yNodes.unobserve(observer);
  }, [sharedData?.nodes]);

  // ─────────────────────────────────────────
  // Synka edges: Yjs → React state
  // ─────────────────────────────────────────
  useEffect(() => {
    const yEdges = sharedData?.edges;
    if (!yEdges) return;

    const loadEdges = () => {
      const edgeArray = [];
      yEdges.forEach((value, key) => {
        edgeArray.push({ ...value, id: key });
      });
      setEdges(edgeArray);
    };

    loadEdges();

    const observer = (event) => {
      isRemoteUpdate.current = true;
      loadEdges();
      requestAnimationFrame(() => {
        isRemoteUpdate.current = false;
      });
    };

    yEdges.observe(observer);
    return () => yEdges.unobserve(observer);
  }, [sharedData?.edges]);

  // ─────────────────────────────────────────
  // Hantera lokala node-ändringar → Yjs
  // ─────────────────────────────────────────
  const onNodesChange = useCallback(
    (changes) => {
      const yNodes = sharedData?.nodes;
      if (!yNodes || !ydoc) return;

      // Ignorera om detta är en remote-uppdatering
      if (isRemoteUpdate.current) return;

      ydoc.transact(() => {
        for (const change of changes) {
          switch (change.type) {
            case 'position': {
              const existing = yNodes.get(change.id);
              if (existing && change.position) {
                yNodes.set(change.id, {
                  ...existing,
                  position: change.position,
                });
              }
              break;
            }

            case 'dimensions': {
              const existing = yNodes.get(change.id);
              if (existing && change.dimensions) {
                yNodes.set(change.id, {
                  ...existing,
                  width: change.dimensions.width,
                  height: change.dimensions.height,
                });
              }
              break;
            }

            case 'select': {
              // Selektioner synkas inte — de är lokala per användare
              break;
            }

            case 'remove': {
              yNodes.delete(change.id);
              break;
            }

            case 'add': {
              if (change.item) {
                yNodes.set(change.item.id, change.item);
              }
              break;
            }

            default:
              break;
          }
        }
      });

      // Uppdatera lokalt state också (för omedelbar respons)
      setNodes((prev) => {
        const updated = [...prev];
        for (const change of changes) {
          const index = updated.findIndex((n) => n.id === change.id);
          if (index === -1) continue;

          if (change.type === 'position' && change.position) {
            updated[index] = { ...updated[index], position: change.position };
          } else if (change.type === 'remove') {
            updated.splice(index, 1);
          }
        }
        return updated;
      });
    },
    [sharedData?.nodes, ydoc]
  );

  // ─────────────────────────────────────────
  // Hantera lokala edge-ändringar → Yjs
  // ─────────────────────────────────────────
  const onEdgesChange = useCallback(
    (changes) => {
      const yEdges = sharedData?.edges;
      if (!yEdges || !ydoc) return;

      if (isRemoteUpdate.current) return;

      ydoc.transact(() => {
        for (const change of changes) {
          if (change.type === 'remove') {
            yEdges.delete(change.id);
          }
        }
      });

      setEdges((prev) => {
        const updated = [...prev];
        for (const change of changes) {
          if (change.type === 'remove') {
            const index = updated.findIndex((e) => e.id === change.id);
            if (index !== -1) updated.splice(index, 1);
          }
        }
        return updated;
      });
    },
    [sharedData?.edges, ydoc]
  );

  // ─────────────────────────────────────────
  // Lägg till node/edge (convenience methods)
  // ─────────────────────────────────────────
  const addNode = useCallback(
    (node) => {
      const yNodes = sharedData?.nodes;
      if (!yNodes) return;
      yNodes.set(node.id, node);
    },
    [sharedData?.nodes]
  );

  const addEdge = useCallback(
    (edge) => {
      const yEdges = sharedData?.edges;
      if (!yEdges) return;
      yEdges.set(edge.id, edge);
    },
    [sharedData?.edges]
  );

  const updateNode = useCallback(
    (nodeId, updates) => {
      const yNodes = sharedData?.nodes;
      if (!yNodes) return;
      const existing = yNodes.get(nodeId);
      if (existing) {
        yNodes.set(nodeId, { ...existing, ...updates });
      }
    },
    [sharedData?.nodes]
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addNode,
    addEdge,
    updateNode,
  };
}
