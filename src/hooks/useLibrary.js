import { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Manages the component library: fetch, save, add-to-canvas.
 */
export default function useLibrary({ nodeId, setNodeId, setNodes }) {
  const [showLibraryPanel, setShowLibraryPanel] = useState(false);
  const [libraryItems, setLibraryItems] = useState([]);

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
  }, [nodeId, setNodeId, setNodes]);

  return {
    showLibraryPanel,
    setShowLibraryPanel,
    libraryItems,
    setLibraryItems,
    fetchLibraryItems,
    saveNodeToLibrary,
    addLibraryItemToCanvas,
  };
}
