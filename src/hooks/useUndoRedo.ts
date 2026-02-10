import { useState, useCallback, useEffect, useRef } from 'react';
import type { PLMNode, PLMEdge } from '../types';

interface UndoRedoParams {
  nodes: PLMNode[];
  edges: PLMEdge[];
  setNodes: (nodes: PLMNode[] | ((prev: PLMNode[]) => PLMNode[])) => void;
  setEdges: (edges: PLMEdge[] | ((prev: PLMEdge[]) => PLMEdge[])) => void;
}

interface HistoryEntry {
  nodes: PLMNode[];
  edges: PLMEdge[];
}

export default function useUndoRedo({ nodes, edges, setNodes, setEdges }: UndoRedoParams) {
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const [, forceUpdate] = useState(0);

  const saveToHistory = useCallback(() => {
    if (isUndoRedoRef.current) return;
    const currentState: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(currentState);
    if (newHistory.length > 50) newHistory.shift();
    historyRef.current = newHistory;
    historyIndexRef.current = Math.min(historyIndexRef.current + 1, 49);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isUndoRedoRef.current = true;
    const prevIndex = historyIndexRef.current - 1;
    const prevState = historyRef.current[prevIndex];
    if (prevState) {
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      historyIndexRef.current = prevIndex;
      forceUpdate(n => n + 1);
    }
    setTimeout(() => { isUndoRedoRef.current = false; }, 100);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isUndoRedoRef.current = true;
    const nextIndex = historyIndexRef.current + 1;
    const nextState = historyRef.current[nextIndex];
    if (nextState) {
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      historyIndexRef.current = nextIndex;
      forceUpdate(n => n + 1);
    }
    setTimeout(() => { isUndoRedoRef.current = false; }, 100);
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (!isUndoRedoRef.current && nodes.length > 0) {
      const timeoutId = setTimeout(() => { saveToHistory(); }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, saveToHistory]);

  const resetHistory = useCallback(() => {
    historyRef.current = [];
    historyIndexRef.current = -1;
    forceUpdate(n => n + 1);
  }, []);

  return {
    undo, redo,
    isUndoRedo: isUndoRedoRef.current,
    resetHistory,
    canUndo: historyIndexRef.current > 0,
    canRedo: historyIndexRef.current < historyRef.current.length - 1,
  };
}
