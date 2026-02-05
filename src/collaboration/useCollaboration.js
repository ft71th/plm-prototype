/**
 * useCollaboration - React hook för Yjs realtidssamarbete
 * 
 * Hanterar:
 * - WebSocket-anslutning till Hocuspocus
 * - Offline persistence via IndexedDB
 * - Awareness (cursors, selektioner)
 * - Delade datastrukturer för canvas, dokument och whiteboard
 * 
 * Användning:
 *   const { ydoc, provider, awareness, connected, users } = useCollaboration(projectId);
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { IndexeddbPersistence } from 'y-indexeddb';

// WebSocket URL — använd proxy via Vite i dev
const COLLAB_URL = import.meta.env.VITE_COLLAB_URL || 'ws://localhost:1235';

/**
 * Huvudhook för samarbete
 */
export function useCollaboration(projectId, user) {
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);
  const [users, setUsers] = useState([]);
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const indexeddbRef = useRef(null);

  // Skapa Yjs-dokument och providers
  useEffect(() => {
    if (!projectId || !user) return;

    const roomName = `project-${projectId}`;

    // 1. Skapa Yjs-dokument
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // 2. Offline persistence (IndexedDB)
    const indexeddb = new IndexeddbPersistence(roomName, ydoc);
    indexeddbRef.current = indexeddb;

    indexeddb.on('synced', () => {
      console.log(`[collab] IndexedDB synced for ${roomName}`);
    });

    // 3. WebSocket-anslutning till Hocuspocus
    const provider = new HocuspocusProvider({
      url: COLLAB_URL,
      name: roomName,
      document: ydoc,
      token: user.token, // JWT token

      // Återanslutning
      connect: true,
      preserveConnection: true,
      
      onConnect: () => {
        console.log(`[collab] Connected to ${roomName}`);
        setConnected(true);
      },

      onDisconnect: () => {
        console.log(`[collab] Disconnected from ${roomName}`);
        setConnected(false);
      },

      onSynced: ({ state }) => {
        console.log(`[collab] Synced with server: ${state}`);
        setSynced(true);
      },

      onAuthenticationFailed: ({ reason }) => {
        console.error(`[collab] Auth failed: ${reason}`);
      },
    });

    providerRef.current = provider;

    // 4. Awareness: sätt lokal användarinfo
    provider.awareness.setLocalStateField('user', {
      id: user.id,
      name: user.name,
      email: user.email,
      color: user.color || generateColor(user.id),
      cursor: null,
    });

    // 5. Lyssna på awareness-ändringar (andra användares cursors etc.)
    const handleAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const activeUsers = [];

      states.forEach((state, clientId) => {
        if (state.user && clientId !== provider.awareness.clientID) {
          activeUsers.push({
            clientId,
            ...state.user,
          });
        }
      });

      setUsers(activeUsers);
    };

    provider.awareness.on('change', handleAwarenessChange);

    // Cleanup
    return () => {
      provider.awareness.off('change', handleAwarenessChange);
      provider.destroy();
      indexeddb.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      providerRef.current = null;
      indexeddbRef.current = null;
      setConnected(false);
      setSynced(false);
      setUsers([]);
    };
  }, [projectId, user?.id]);

  // Delade datastrukturer
  const sharedData = useMemo(() => {
    const ydoc = ydocRef.current;
    if (!ydoc) return null;

    return {
      // Canvas-noder (React Flow)
      nodes: ydoc.getMap('canvas-nodes'),
      edges: ydoc.getMap('canvas-edges'),

      // Dokument-innehåll
      documentContent: ydoc.getXmlFragment('document-content'),

      // Whiteboard
      whiteboardStrokes: ydoc.getArray('whiteboard-strokes'),
      whiteboardShapes: ydoc.getArray('whiteboard-shapes'),

      // Projekt-metadata
      projectMeta: ydoc.getMap('project-meta'),

      // Issues
      issues: ydoc.getArray('issues'),

      // Chat
      chat: ydoc.getArray('chat-messages'),
    };
  }, [ydocRef.current]);

  // Uppdatera cursor-position
  const updateCursor = useCallback((position) => {
    const provider = providerRef.current;
    if (!provider) return;

    provider.awareness.setLocalStateField('user', {
      ...provider.awareness.getLocalState()?.user,
      cursor: position,
    });
  }, []);

  // Uppdatera aktiv vy
  const updateActiveView = useCallback((view) => {
    const provider = providerRef.current;
    if (!provider) return;

    provider.awareness.setLocalStateField('user', {
      ...provider.awareness.getLocalState()?.user,
      activeView: view,
    });
  }, []);

  return {
    ydoc: ydocRef.current,
    provider: providerRef.current,
    awareness: providerRef.current?.awareness,
    connected,
    synced,
    users,
    sharedData,
    updateCursor,
    updateActiveView,
  };
}

/**
 * Hook för att synka en Y.Map med React state
 * Perfekt för canvas-noder och edges
 */
export function useYMap(ymap) {
  const [data, setData] = useState(new Map());

  useEffect(() => {
    if (!ymap) return;

    // Initial load
    const initial = new Map();
    ymap.forEach((value, key) => initial.set(key, value));
    setData(initial);

    // Observera ändringar
    const observer = (event) => {
      setData(new Map(ymap.entries()));
    };

    ymap.observe(observer);
    return () => ymap.unobserve(observer);
  }, [ymap]);

  const set = useCallback((key, value) => {
    if (ymap) ymap.set(key, value);
  }, [ymap]);

  const remove = useCallback((key) => {
    if (ymap) ymap.delete(key);
  }, [ymap]);

  return { data, set, remove };
}

/**
 * Hook för att synka en Y.Array med React state
 * Perfekt för whiteboard-strokes och issues
 */
export function useYArray(yarray) {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!yarray) return;

    setData(yarray.toArray());

    const observer = () => {
      setData(yarray.toArray());
    };

    yarray.observeDeep(observer);
    return () => yarray.unobserveDeep(observer);
  }, [yarray]);

  const push = useCallback((item) => {
    if (yarray) yarray.push([item]);
  }, [yarray]);

  const remove = useCallback((index) => {
    if (yarray) yarray.delete(index, 1);
  }, [yarray]);

  const update = useCallback((index, value) => {
    if (!yarray) return;
    yarray.doc.transact(() => {
      yarray.delete(index, 1);
      yarray.insert(index, [value]);
    });
  }, [yarray]);

  return { data, push, remove, update };
}

/**
 * Generera färg från användar-ID
 */
function generateColor(userId) {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  ];
  let hash = 0;
  const str = String(userId);
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
