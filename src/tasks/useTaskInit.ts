// useTaskInit.ts — Hook to initialize task data from backend
// Import and call this in whatever component renders the task board.
//
// Usage:
//   const ready = useTaskInit(projectId);
//   if (!ready) return <div>Loading tasks...</div>;

import { useState, useEffect } from 'react';
import { initProjectTasks } from './taskStore';

export function useTaskInit(projectId: string | null): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setReady(true);
      return;
    }

    setReady(false);
    initProjectTasks(projectId)
      .then(() => setReady(true))
      .catch((err) => {
        console.warn('[useTaskInit] Init failed, using cache:', err);
        setReady(true); // Still allow rendering with whatever cache exists
      });
  }, [projectId]);

  return ready;
}
