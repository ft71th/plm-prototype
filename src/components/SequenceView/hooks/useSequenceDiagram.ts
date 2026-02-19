import { useState, useCallback, useMemo } from 'react';
import type {
  SequenceDiagram, SequenceParticipant, SequenceMessage,
  SequenceFragment, MessageType, FragmentType,
} from '../sequenceTypes';
import { LAYOUT, PARTICIPANT_COLORS } from '../sequenceTypes';

function uid() { return `sd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function createEmptyDiagram(name = 'New Sequence Diagram'): SequenceDiagram {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name,
    description: '',
    participants: [],
    messages: [],
    fragments: [],
    createdAt: now,
    updatedAt: now,
    version: '1.0',
  };
}

export default function useSequenceDiagram(projectId: string | null) {
  const storageKey = `northlight_seqdiagrams_${projectId || 'default'}`;

  // Load diagrams from localStorage
  const loadDiagrams = useCallback((): SequenceDiagram[] => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [storageKey]);

  const [diagrams, setDiagrams] = useState<SequenceDiagram[]>(() => loadDiagrams());
  const [activeDiagramId, setActiveDiagramId] = useState<string | null>(
    () => diagrams.length > 0 ? diagrams[0].id : null
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<'participant' | 'message' | 'fragment' | null>(null);

  // Persist
  const persist = useCallback((updated: SequenceDiagram[]) => {
    setDiagrams(updated);
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
  }, [storageKey]);

  // Active diagram
  const activeDiagram = useMemo(
    () => diagrams.find(d => d.id === activeDiagramId) || null,
    [diagrams, activeDiagramId]
  );

  const updateActive = useCallback((updater: (d: SequenceDiagram) => SequenceDiagram) => {
    if (!activeDiagramId) return;
    const updated = diagrams.map(d =>
      d.id === activeDiagramId ? { ...updater(d), updatedAt: new Date().toISOString() } : d
    );
    persist(updated);
  }, [activeDiagramId, diagrams, persist]);

  // ─── Diagram CRUD ───
  const createDiagram = useCallback((name?: string) => {
    const d = createEmptyDiagram(name);
    const updated = [...diagrams, d];
    persist(updated);
    setActiveDiagramId(d.id);
    return d;
  }, [diagrams, persist]);

  const deleteDiagram = useCallback((id: string) => {
    const updated = diagrams.filter(d => d.id !== id);
    persist(updated);
    if (activeDiagramId === id) {
      setActiveDiagramId(updated.length > 0 ? updated[0].id : null);
    }
  }, [diagrams, activeDiagramId, persist]);

  const renameDiagram = useCallback((id: string, name: string) => {
    const updated = diagrams.map(d => d.id === id ? { ...d, name } : d);
    persist(updated);
  }, [diagrams, persist]);

  // ─── Participants ───
  const addParticipant = useCallback((label: string, linkedNodeId?: string, linkedNodeType?: string) => {
    updateActive(d => {
      const order = d.participants.length;
      const x = LAYOUT.CANVAS_PADDING + order * LAYOUT.PARTICIPANT_GAP;
      const p: SequenceParticipant = {
        id: uid(),
        label,
        linkedNodeId,
        linkedNodeType,
        stereotype: linkedNodeType ? `<<${linkedNodeType}>>` : undefined,
        color: PARTICIPANT_COLORS[linkedNodeType || 'default'] || PARTICIPANT_COLORS.default,
        x,
        order,
      };
      return { ...d, participants: [...d.participants, p] };
    });
  }, [updateActive]);

  const updateParticipant = useCallback((id: string, changes: Partial<SequenceParticipant>) => {
    updateActive(d => ({
      ...d,
      participants: d.participants.map(p => p.id === id ? { ...p, ...changes } : p),
    }));
  }, [updateActive]);

  const removeParticipant = useCallback((id: string) => {
    updateActive(d => ({
      ...d,
      participants: d.participants
        .filter(p => p.id !== id)
        .map((p, i) => ({ ...p, order: i, x: LAYOUT.CANVAS_PADDING + i * LAYOUT.PARTICIPANT_GAP })),
      messages: d.messages.filter(m => m.fromId !== id && m.toId !== id),
    }));
  }, [updateActive]);

  const reorderParticipants = useCallback((fromIndex: number, toIndex: number) => {
    updateActive(d => {
      const arr = [...d.participants].sort((a, b) => a.order - b.order);
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return {
        ...d,
        participants: arr.map((p, i) => ({
          ...p,
          order: i,
          x: LAYOUT.CANVAS_PADDING + i * LAYOUT.PARTICIPANT_GAP,
        })),
      };
    });
  }, [updateActive]);

  // ─── Messages ───
  const addMessage = useCallback((fromId: string, toId: string, label: string, type: MessageType = 'sync') => {
    updateActive(d => {
      const orderIndex = d.messages.length > 0
        ? Math.max(...d.messages.map(m => m.orderIndex)) + 1
        : 0;
      const m: SequenceMessage = {
        id: uid(),
        fromId,
        toId,
        label,
        type,
        orderIndex,
      };
      return { ...d, messages: [...d.messages, m] };
    });
  }, [updateActive]);

  const updateMessage = useCallback((id: string, changes: Partial<SequenceMessage>) => {
    updateActive(d => ({
      ...d,
      messages: d.messages.map(m => m.id === id ? { ...m, ...changes } : m),
    }));
  }, [updateActive]);

  const removeMessage = useCallback((id: string) => {
    updateActive(d => {
      const msgs = d.messages
        .filter(m => m.id !== id)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((m, i) => ({ ...m, orderIndex: i }));
      return { ...d, messages: msgs };
    });
  }, [updateActive]);

  const reorderMessage = useCallback((msgId: string, newIndex: number) => {
    updateActive(d => {
      const sorted = [...d.messages].sort((a, b) => a.orderIndex - b.orderIndex);
      const oldIdx = sorted.findIndex(m => m.id === msgId);
      if (oldIdx === -1) return d;
      const [moved] = sorted.splice(oldIdx, 1);
      sorted.splice(newIndex, 0, moved);
      return {
        ...d,
        messages: sorted.map((m, i) => ({ ...m, orderIndex: i })),
      };
    });
  }, [updateActive]);

  // ─── Fragments ───
  const addFragment = useCallback((type: FragmentType, fromOrderIndex: number, toOrderIndex: number, participantIds: string[], label?: string) => {
    updateActive(d => {
      const f: SequenceFragment = {
        id: uid(),
        type,
        label: label || `[${type}]`,
        fromOrderIndex,
        toOrderIndex,
        participantIds,
        sections: type === 'alt' ? [
          { guard: '[condition]', fromOrderIndex, toOrderIndex },
        ] : undefined,
      };
      return { ...d, fragments: [...d.fragments, f] };
    });
  }, [updateActive]);

  const updateFragment = useCallback((id: string, changes: Partial<SequenceFragment>) => {
    updateActive(d => ({
      ...d,
      fragments: d.fragments.map(f => f.id === id ? { ...f, ...changes } : f),
    }));
  }, [updateActive]);

  const removeFragment = useCallback((id: string) => {
    updateActive(d => ({
      ...d,
      fragments: d.fragments.filter(f => f.id !== id),
    }));
  }, [updateActive]);

  // ─── Selection ───
  const select = useCallback((id: string | null, type: 'participant' | 'message' | 'fragment' | null = null) => {
    setSelectedElementId(id);
    setSelectedElementType(type);
  }, []);

  const selectedElement = useMemo(() => {
    if (!activeDiagram || !selectedElementId) return null;
    if (selectedElementType === 'participant') return activeDiagram.participants.find(p => p.id === selectedElementId) || null;
    if (selectedElementType === 'message') return activeDiagram.messages.find(m => m.id === selectedElementId) || null;
    if (selectedElementType === 'fragment') return activeDiagram.fragments.find(f => f.id === selectedElementId) || null;
    return null;
  }, [activeDiagram, selectedElementId, selectedElementType]);

  // ─── Auto-generate from PLM edges ───
  const generateFromEdges = useCallback((nodes: any[], edges: any[]) => {
    if (!activeDiagramId) {
      const d = createEmptyDiagram('Auto-generated');
      const updated = [...diagrams, d];
      persist(updated);
      setActiveDiagramId(d.id);
    }

    // Find nodes that have edges between them (provides, contains, realizedBy, etc.)
    const relevantTypes = new Set(['system', 'subsystem', 'function', 'actor', 'hardware']);
    const relevantNodes = nodes.filter(n => relevantTypes.has(n.data?.itemType || n.data?.type));
    const connectedNodeIds = new Set<string>();
    const msgEdges: Array<{ source: string; target: string; label: string }> = [];

    edges.forEach(e => {
      const src = relevantNodes.find(n => n.id === e.source);
      const tgt = relevantNodes.find(n => n.id === e.target);
      if (src && tgt) {
        connectedNodeIds.add(src.id);
        connectedNodeIds.add(tgt.id);
        msgEdges.push({
          source: src.id,
          target: tgt.id,
          label: e.data?.label || e.data?.relationshipType || 'call',
        });
      }
    });

    updateActive(d => {
      const participants: SequenceParticipant[] = [];
      let order = 0;
      connectedNodeIds.forEach(nid => {
        const node = relevantNodes.find(n => n.id === nid);
        if (!node) return;
        participants.push({
          id: uid(),
          label: node.data?.label || 'Unknown',
          linkedNodeId: nid,
          linkedNodeType: node.data?.itemType || node.data?.type,
          stereotype: `<<${node.data?.itemType || node.data?.type}>>`,
          color: PARTICIPANT_COLORS[node.data?.itemType || 'default'] || PARTICIPANT_COLORS.default,
          x: LAYOUT.CANVAS_PADDING + order * LAYOUT.PARTICIPANT_GAP,
          order,
        });
        order++;
      });

      // Map node IDs to participant IDs
      const nodeToParticipant: Record<string, string> = {};
      participants.forEach(p => { if (p.linkedNodeId) nodeToParticipant[p.linkedNodeId] = p.id; });

      const messages: SequenceMessage[] = msgEdges.map((e, i) => ({
        id: uid(),
        fromId: nodeToParticipant[e.source] || '',
        toId: nodeToParticipant[e.target] || '',
        label: e.label,
        type: 'sync' as MessageType,
        orderIndex: i,
      })).filter(m => m.fromId && m.toId);

      return { ...d, participants, messages, fragments: [] };
    });
  }, [activeDiagramId, diagrams, persist, updateActive]);

  // ─── Export PlantUML ───
  const exportPlantUML = useCallback((): string => {
    if (!activeDiagram) return '';
    const lines: string[] = [`@startuml ${activeDiagram.name}`];
    
    // Participants
    activeDiagram.participants
      .sort((a, b) => a.order - b.order)
      .forEach(p => {
        const stereo = p.stereotype ? `\\n${p.stereotype}` : '';
        lines.push(`participant "${p.label}${stereo}" as ${p.id.replace(/[^a-zA-Z0-9]/g, '_')}`);
      });
    lines.push('');

    // Messages (sorted by order)
    const sorted = [...activeDiagram.messages].sort((a, b) => a.orderIndex - b.orderIndex);
    
    // Track open fragments
    const fragmentStarts = new Map<number, SequenceFragment[]>();
    const fragmentEnds = new Map<number, SequenceFragment[]>();
    activeDiagram.fragments.forEach(f => {
      if (!fragmentStarts.has(f.fromOrderIndex)) fragmentStarts.set(f.fromOrderIndex, []);
      fragmentStarts.get(f.fromOrderIndex)!.push(f);
      if (!fragmentEnds.has(f.toOrderIndex)) fragmentEnds.set(f.toOrderIndex, []);
      fragmentEnds.get(f.toOrderIndex)!.push(f);
    });

    sorted.forEach(m => {
      const fId = (id: string) => id.replace(/[^a-zA-Z0-9]/g, '_');
      const from = fId(m.fromId);
      const to = fId(m.toId);

      // Open fragments at this index
      fragmentStarts.get(m.orderIndex)?.forEach(f => {
        if (f.type === 'alt') {
          lines.push(`alt ${f.sections?.[0]?.guard || f.label}`);
        } else {
          lines.push(`${f.type} ${f.label}`);
        }
      });

      const arrow = m.type === 'reply' || m.type === 'create' ? '-->' : '->';
      const guard = m.guard ? ` [${m.guard}]` : '';
      lines.push(`${from} ${arrow} ${to} :${guard} ${m.label}`);

      // Close fragments at this index
      fragmentEnds.get(m.orderIndex)?.forEach(() => {
        lines.push('end');
      });
    });

    lines.push('@enduml');
    return lines.join('\n');
  }, [activeDiagram]);

  return {
    // Diagrams
    diagrams, activeDiagram, activeDiagramId,
    setActiveDiagramId, createDiagram, deleteDiagram, renameDiagram,
    // Participants
    addParticipant, updateParticipant, removeParticipant, reorderParticipants,
    // Messages
    addMessage, updateMessage, removeMessage, reorderMessage,
    // Fragments
    addFragment, updateFragment, removeFragment,
    // Selection
    selectedElementId, selectedElementType, selectedElement,
    select,
    // Utilities
    generateFromEdges, exportPlantUML,
    // Load from project data
    loadDiagrams: (data: SequenceDiagram[]) => persist(data),
  };
}
