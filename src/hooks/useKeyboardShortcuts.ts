import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Whiteboard, Clipboard } from '../types';
import { useEffect } from 'react';
import useStore from '../store';

/**
 * Registers all keyboard shortcuts for the application.
 * Merges the copy/paste shortcuts and the general shortcuts into a single effect.
 */
interface UseKeyboardShortcutsParams {
  copySelectedNodes: () => void;
  pasteNodes: () => void;
  deleteSelectedNodes: () => void;
  duplicateSelectedNodes: () => void;
  toggleLockSelectedNodes: () => void;
  groupSelectedNodes: () => void;
  ungroupSelectedNodes: () => void;
  addPlatformNode: () => void;
  addRequirementNode: () => void;
  autoLayoutNodes: () => void;
  saveProjectToDatabase: () => void;
  exportProject: () => void;
  undo: () => void;
  redo: () => void;
  duplicateNode: (node: PLMNode) => void;
  nodes: PLMNode[];
  setNodes: (fn: PLMNode[] | ((prev: PLMNode[]) => PLMNode[])) => void;
}

export default function useKeyboardShortcuts({
  copySelectedNodes, pasteNodes, deleteSelectedNodes, duplicateSelectedNodes,
  toggleLockSelectedNodes, groupSelectedNodes, ungroupSelectedNodes,
  addPlatformNode, addRequirementNode,
  autoLayoutNodes,
  saveProjectToDatabase, exportProject,
  undo, redo,
  duplicateNode,
  nodes, setNodes,
}: UseKeyboardShortcutsParams) {
  const selectedNode = useStore(s => s.selectedNode);
  const setSelectedNode = useStore(s => s.setSelectedNode);
  const setSelectedEdge = useStore(s => s.setSelectedEdge);
  const setShowLinkManager = useStore(s => s.setShowLinkManager);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
      const isSelect = e.target.tagName === 'SELECT';
      const mod = e.ctrlKey || e.metaKey;

      // Escape always works
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setSelectedEdge(null);
        if (isInput || isSelect) e.target.blur();
        return;
      }

      // Don't trigger shortcuts when typing in input fields
      if (isInput || isSelect) return;

      // ─── Clipboard shortcuts ───
      if (mod && e.key === 'c') {
        e.preventDefault();
        copySelectedNodes();
      }
      if (mod && e.key === 'v') {
        e.preventDefault();
        pasteNodes();
      }
      if (mod && e.key === 'x') {
        e.preventDefault();
        copySelectedNodes();
        deleteSelectedNodes();
      }
      if (mod && e.key === 'a') {
        e.preventDefault();
        setNodes(nds => nds.map((n: any) => ({ ...n, selected: true })));
      }

      // ─── Duplicate ───
      if (mod && e.key === 'd') {
        e.preventDefault();
        duplicateSelectedNodes();
        const selectedNodes = nodes.filter((n: any) => n.selected);
        if (selectedNodes.length === 1) {
          duplicateNode(selectedNodes[0]);
        } else if (selectedNodes.length === 0 && selectedNode) {
          duplicateNode(selectedNode);
        }
      }

      // ─── Lock / Group ───
      if (mod && !e.shiftKey && e.key === 'l') {
        e.preventDefault();
        toggleLockSelectedNodes();
      }
      if (mod && e.key === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          ungroupSelectedNodes();
        } else {
          groupSelectedNodes();
        }
      }
      if (mod && e.shiftKey && e.key === 'l') {
        e.preventDefault();
        setShowLinkManager(true);
        return;
      }

      // ─── Undo / Redo ───
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }

      // ─── Save / Export / Import ───
      if (mod && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        saveProjectToDatabase();
        return;
      }
      if (mod && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        exportProject();
        return;
      }
      if (mod && e.key === 'o') {
        e.preventDefault();
        document.getElementById('file-import-input')?.click();
        return;
      }

      // ─── Search ───
      if (mod && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="🔍 Search..."]');
        if (searchInput) searchInput.focus();
      }

      // ─── Single-key shortcuts (no modifier) ───
      if (!mod) {
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          autoLayoutNodes();
        }
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          addPlatformNode();
        }
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          addRequirementNode();
        }
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          const fitViewButton = document.querySelector('.react-flow__controls-fitview');
          if (fitViewButton) fitViewButton.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    copySelectedNodes, pasteNodes, deleteSelectedNodes, duplicateSelectedNodes,
    toggleLockSelectedNodes, groupSelectedNodes, ungroupSelectedNodes,
    addPlatformNode, addRequirementNode, autoLayoutNodes,
    saveProjectToDatabase, exportProject,
    duplicateNode, undo, redo,
    nodes, selectedNode, setNodes, setSelectedNode, setSelectedEdge,
    setShowLinkManager,
  ]);
}
