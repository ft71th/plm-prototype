import { useState, useCallback } from 'react';
import { defaultHardwareTypes } from '../constants/hardwareDefaults';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Manages hardware type definitions: fetch from DB, add, update, delete.
 * Falls back to defaultHardwareTypes when DB is empty or unavailable.
 */
export default function useHardwareTypes() {
  const [hardwareTypes, setHardwareTypes] = useState([]);
  const [showHardwareTypesModal, setShowHardwareTypesModal] = useState(false);

  const getAuthHeader = () => ({
    'Authorization': `Bearer ${localStorage.getItem('plm_token')}`
  });

  const fetchHardwareTypes = useCallback(async () => {
    console.log('🔧 Fetching hardware types from database...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/hardware-types`, {
        headers: getAuthHeader()
      });
      console.log('🔧 Hardware types response status:', response.status);
      if (response.ok) {
        const types = await response.json();
        console.log('🔧 Hardware types from DB:', types);
        if (types.length > 0) {
          const mappedTypes = types.map(t => ({
            id: t.name.toLowerCase().replace(/\s+/g, '-'),
            dbId: t.id,
            name: t.name,
            icon: t.icon,
            description: t.description
          }));
          console.log('🔧 Mapped hardware types:', mappedTypes);
          setHardwareTypes(mappedTypes);
        } else {
          console.log('🔧 Database empty, using defaults');
          setHardwareTypes(defaultHardwareTypes);
        }
      } else {
        console.error('🔧 Failed to fetch hardware types, status:', response.status);
        setHardwareTypes(defaultHardwareTypes);
      }
    } catch (error) {
      console.error('🔧 Error fetching hardware types:', error);
      setHardwareTypes(defaultHardwareTypes);
    }
  }, []);

  const addHardwareType = useCallback(async (typeData) => {
    console.log('🔧 API: Adding hardware type', {
      name: typeData.name,
      iconLength: typeData.icon?.length,
      isBase64: typeData.icon?.startsWith('data:')
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/hardware-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(typeData)
      });

      console.log('🔧 API: Response status', response.status);

      if (response.ok) {
        const newType = await response.json();
        console.log('🔧 API: Saved type', {
          id: newType.id,
          name: newType.name,
          iconLength: newType.icon?.length,
          iconPreview: newType.icon?.substring(0, 30)
        });
        setHardwareTypes(prev => [...prev, {
          id: newType.name.toLowerCase().replace(/\s+/g, '-'),
          dbId: newType.id,
          name: newType.name,
          icon: newType.icon,
          description: newType.description
        }]);
        return newType;
      } else {
        const error = await response.json();
        console.error('🔧 API: Error response', error);
        throw new Error(error.error || 'Failed to add hardware type');
      }
    } catch (error) {
      console.error('Error adding hardware type:', error);
      throw error;
    }
  }, []);

  const deleteHardwareType = useCallback(async (dbId) => {
    if (!window.confirm('Delete this hardware type?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/hardware-types/${dbId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (response.ok) {
        setHardwareTypes(prev => prev.filter(t => t.dbId !== dbId));
      } else {
        alert('Failed to delete hardware type');
      }
    } catch (error) {
      console.error('Error deleting hardware type:', error);
      alert('Error deleting hardware type');
    }
  }, []);

  const updateHardwareType = useCallback(async (dbId, typeData) => {
    console.log('🔧 API: Updating hardware type', {
      dbId,
      name: typeData.name,
      iconLength: typeData.icon?.length,
      isBase64: typeData.icon?.startsWith('data:')
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/hardware-types/${dbId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(typeData)
      });

      console.log('🔧 API: Update response status', response.status);

      if (response.ok) {
        const updatedType = await response.json();
        console.log('🔧 API: Updated type from server', {
          id: updatedType.id,
          name: updatedType.name,
          iconLength: updatedType.icon?.length,
          iconPreview: updatedType.icon?.substring(0, 30)
        });
        setHardwareTypes(prev => prev.map(t =>
          t.dbId === dbId
            ? {
                id: updatedType.name.toLowerCase().replace(/\s+/g, '-'),
                dbId: updatedType.id,
                name: updatedType.name,
                icon: updatedType.icon,
                description: updatedType.description
              }
            : t
        ));
        return updatedType;
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update hardware type');
      }
    } catch (error) {
      console.error('Error updating hardware type:', error);
      throw error;
    }
  }, []);

  return {
    hardwareTypes,
    setHardwareTypes,
    showHardwareTypesModal,
    setShowHardwareTypesModal,
    fetchHardwareTypes,
    addHardwareType,
    deleteHardwareType,
    updateHardwareType,
  };
}
