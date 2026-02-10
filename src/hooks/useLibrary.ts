import { useState, useCallback } from 'react';
import type { PLMNode, LibraryItem, NodeData } from '../types';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface UseLibraryParams {
  nodeId: number;
  setNodeId: (v: number | ((prev: number) => number)) => void;
  setNodes: (fn: (nodes: PLMNode[]) => PLMNode[]) => void;
}

export default function useLibrary({ nodeId, setNodeId, setNodes }: UseLibraryParams) {
  const [showLibraryPanel, setShowLibraryPanel] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);

  const fetchLibraryItems = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/library`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('plm_token')}` },
      });
      if (response.ok) {
        const items = await response.json();
        setLibraryItems(items);
      } else {
        setLibraryItems([]);
      }
    } catch {
      setLibraryItems([]);
    }
  }, []);

  const saveNodeToLibrary = useCallback(async (node: PLMNode) => {
    const libraryItem = {
      name: node.data.label,
      type: node.data.type || node.data.itemType || '',
      itemType: node.data.itemType || node.data.type,
      description: node.data.description || '',
      version: '1.0',
      nodeData: { ...node.data },
      createdAt: new Date().toISOString(),
    };
    try {
      const response = await fetch(`${API_BASE_URL}/api/library`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('plm_token')}`,
        },
        body: JSON.stringify(libraryItem),
      });
      if (response.ok) {
        const saved = await response.json();
        setLibraryItems(prev => [...prev, saved]);
        return saved;
      }
    } catch { /* fallback below */ }
    const localItem = { ...libraryItem, id: `lib-${Date.now()}` };
    setLibraryItems(prev => [...prev, localItem as any]);
    return localItem;
  }, []);

  const addLibraryItemToCanvas = useCallback((libraryItem: any) => {
    const newNode: PLMNode = {
      id: String(nodeId),
      type: 'custom',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        ...libraryItem.nodeData,
        label: libraryItem.name,
      },
    };
    setNodes(nds => [...nds, newNode]);
    setNodeId((prev: number) => prev + 1);
  }, [nodeId, setNodeId, setNodes]);

  return {
    showLibraryPanel, setShowLibraryPanel,
    libraryItems, setLibraryItems,
    fetchLibraryItems, saveNodeToLibrary, addLibraryItemToCanvas,
  };
}
