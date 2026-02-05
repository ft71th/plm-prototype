/**
 * CollaborationProvider - React Context för samarbete
 * 
 * Wrappa din app (eller projekt-vy) med denna provider
 * för att ge alla child-komponenter tillgång till samarbetsdata.
 * 
 * Användning:
 *   <CollaborationProvider projectId="42" user={currentUser}>
 *     <App />
 *   </CollaborationProvider>
 * 
 *   // I vilken child-komponent som helst:
 *   const { connected, users, sharedData } = useCollab();
 */

import React, { createContext, useContext } from 'react';
import { useCollaboration } from './useCollaboration';

const CollaborationContext = createContext(null);

export function CollaborationProvider({ projectId, user, children }) {
  const collab = useCollaboration(projectId, user);

  return (
    <CollaborationContext.Provider value={collab}>
      {children}
    </CollaborationContext.Provider>
  );
}

/**
 * Hook för att använda samarbetskontext
 */
export function useCollab() {
  const context = useContext(CollaborationContext);
  if (!context) {
    // Returnera en dummy så att komponenter fungerar utan provider
    return {
      ydoc: null,
      provider: null,
      awareness: null,
      connected: false,
      synced: false,
      users: [],
      sharedData: null,
      updateCursor: () => {},
      updateActiveView: () => {},
    };
  }
  return context;
}

export default CollaborationProvider;
