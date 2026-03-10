import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type {
  SequenceDiagram, SequenceParticipant, SequenceMessage,
  SequenceFragment, MessageType, FragmentType,
} from '../sequenceTypes';
import { LAYOUT, PARTICIPANT_COLORS } from '../sequenceTypes';
import { apiFetch } from '../../../api';

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

// Storage keys (localStorage as write-through cache)
function getStorageKey(projectId: string | null) {
  return `northlight_seqdiagrams_${projectId || 'default'}`;
}

// Debounced backend save timer (module level to survive re-renders)
let _backendSaveTimer: ReturnType<typeof setTimeout> | null = null;

export default function useSequenceDiagram(projectId: string | null) {
  const storageKey = getStorageKey(projectId);

  // Load from localStorage cache (instant)
  const loadFromCache = useCallback((): SequenceDiagram[] => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [storageKey]);

  const [diagrams, setDiagrams] = useState<SequenceDiagram[]>(() => loadFromCache());
  const [activeDiagramId, setActiveDiagramId] = useState<string | null>(
    () => {
      const cached = loadFromCache();
      return cached.length > 0 ? cached[0].id : null;
    }
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<'participant' | 'message' | 'fragment' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const loadedProjectRef = useRef<string | null>(null);

  // ─── Save to backend (debounced) ───
  const saveToBackend = useCallback((data: SequenceDiagram[], pid?: string | null) => {
    const effectivePid = pid ?? projectId;
    if (!effectivePid) return;

    // Write-through cache to localStorage
    try {
      localStorage.setItem(getStorageKey(effectivePid), JSON.stringify(data));
    } catch {}

    // Debounced backend save
    if (_backendSaveTimer) clearTimeout(_backendSaveTimer);
    _backendSaveTimer = setTimeout(() => {
      apiFetch(`/projects/${effectivePid}/sequences`, {
        method: 'PUT',
        body: JSON.stringify({ data }),
      })
        .then(() => console.log('[SequenceDiagram] Saved to backend'))
        .catch((err: any) => console.warn('[SequenceDiagram] Backend save failed:', err.message));
    }, 1000);
  }, [projectId]);

  // ─── Persist (write to state + cache + backend) ───
  const persist = useCallback((updated: SequenceDiagram[]) => {
    setDiagrams(updated);
    saveToBackend(updated);
  }, [saveToBackend]);

  // ─── Load from backend on mount / projectId change ───
  useEffect(() => {
    let cancelled = false;

    async function loadSequences() {
      if (!projectId) {
        const cached = loadFromCache();
        setDiagrams(cached);
        setActiveDiagramId(cached.length > 0 ? cached[0].id : null);
        loadedProjectRef.current = projectId;
        return;
      }

      setIsLoading(true);

      // 1. Load from cache immediately (fast UX)
      const cached = loadFromCache();
      if (cached.length > 0) {
        setDiagrams(cached);
        setActiveDiagramId(prev => prev && cached.find(d => d.id === prev) ? prev : cached[0].id);
        console.log(`[SequenceDiagram] Loaded ${cached.length} diagrams from cache`);
      }

      // 2. Try backend (source of truth)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await apiFetch(`/projects/${projectId}/sequences`, { signal: controller.signal })
          .finally(() => clearTimeout(timeout));
        if (cancelled) return;

        const backendData = response?.data;
        if (Array.isArray(backendData) && backendData.length > 0) {
          setDiagrams(backendData);
          setActiveDiagramId(prev => prev && backendData.find((d: any) => d.id === prev) ? prev : backendData[0].id);
          try { localStorage.setItem(storageKey, JSON.stringify(backendData)); } catch {}
          console.log(`[SequenceDiagram] Loaded ${backendData.length} diagrams from backend`);
        } else if (cached.length > 0) {
          // Backend empty but cache has data — migrate
          console.log(`[SequenceDiagram] Migrating ${cached.length} diagrams from cache to backend`);
          saveToBackend(cached);
        } else {
          console.log(`[SequenceDiagram] No saved diagrams for project "${projectId}"`);
        }
      } catch (err: any) {
        console.warn('[SequenceDiagram] Backend load failed, using cache:', err.message);
      }

      if (!cancelled) {
        setIsLoading(false);
        loadedProjectRef.current = projectId;
      }
    }

    loadSequences();

    const safetyTimer = setTimeout(() => setIsLoading(false), 8000);
    return () => { cancelled = true; clearTimeout(safetyTimer); };
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Active diagram ───
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

  const updateDiagramDescription = useCallback((id: string, description: string) => {
    const updated = diagrams.map(d => d.id === id ? { ...d, description } : d);
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

  // ─── Auto-generate from PackML state machine ───
  const generateFromPackML = useCallback((node: any, scenarioType: 'normal' | 'hold' | 'abort' | 'complete' | 'full' = 'full') => {
    const d = node?.data;
    if (!d?.useStateMachine) return null;

    const label = d.label || 'FB';
    const swc = d.swcCode || '';
    const activeIds: number[] = d.activeStates || [];
    const actions: Record<string, string> = d.stateActions || {};

    // PackML state info
    const S: Record<number, string> = {
      0: 'OFF', 1: 'INITIALIZING', 2: 'STOPPED', 3: 'RESETTING', 4: 'IDLE',
      5: 'STARTING', 6: 'EXECUTE', 7: 'HOLDING', 8: 'HELD', 9: 'UNHOLDING',
      10: 'COMPLETING', 11: 'COMPLETE', 12: 'STOPPING', 13: 'ABORTING', 14: 'ABORTED',
    };

    const diagramName = scenarioType === 'full'
      ? `${label} — PackML State Sequence`
      : `${label} — ${scenarioType.charAt(0).toUpperCase() + scenarioType.slice(1)} Scenario`;

    const newDiagram = createEmptyDiagram(diagramName);
    newDiagram.description = `Auto-generated from PackML state machine on ${label}${swc ? ` (${swc})` : ''}`;

    // Participants: Operator, the FB/Controller, Equipment/Process
    const pOperator: SequenceParticipant = {
      id: uid(), label: 'Operator / PMS', stereotype: '<<actor>>',
      color: '#2ecc71', icon: '👤',
      x: LAYOUT.CANVAS_PADDING, order: 0,
    };
    const pController: SequenceParticipant = {
      id: uid(), label, linkedNodeId: node.id,
      linkedNodeType: d.itemType,
      stereotype: `<<${d.pouType === 'program' ? 'PRG' : 'FB'}>>`,
      color: d.pouType === 'program' ? '#f59e0b' : '#06b6d4',
      x: LAYOUT.CANVAS_PADDING + LAYOUT.PARTICIPANT_GAP, order: 1,
    };
    const pEquipment: SequenceParticipant = {
      id: uid(), label: swc ? `${swc} Equipment` : 'Equipment', stereotype: '<<hardware>>',
      color: '#795548',
      x: LAYOUT.CANVAS_PADDING + 2 * LAYOUT.PARTICIPANT_GAP, order: 2,
    };

    newDiagram.participants = [pOperator, pController, pEquipment];

    const msgs: SequenceMessage[] = [];
    const frags: SequenceFragment[] = [];
    let idx = 0;

    function msg(from: string, to: string, lbl: string, type: MessageType = 'sync', guard?: string) {
      msgs.push({ id: uid(), fromId: from, toId: to, label: lbl, type, orderIndex: idx++, guard });
    }
    function note(from: string, to: string, lbl: string) {
      msg(from, to, lbl, 'reply');
    }

    const has = (id: number) => activeIds.includes(id);

    // ── Build scenario-specific sequences ──

    // Init sequence (if INITIALIZING is active)
    if ((scenarioType === 'full' || scenarioType === 'normal') && has(1)) {
      msg(pOperator.id, pController.id, 'PowerOn');
      msg(pController.id, pEquipment.id, actions['INITIALIZING'] || 'Initialize');
      note(pEquipment.id, pController.id, 'InitDone');
      note(pController.id, pController.id, '→ STOPPED');
    }

    // Normal startup sequence (always available in core)
    if (scenarioType === 'full' || scenarioType === 'normal') {
      if (!has(1)) {
        msg(pOperator.id, pController.id, 'PowerOn');
        note(pController.id, pController.id, '→ STOPPED');
      }
      msg(pOperator.id, pController.id, 'Reset');
      if (actions['RESETTING']) msg(pController.id, pEquipment.id, actions['RESETTING']);
      note(pController.id, pController.id, '→ IDLE');
      msg(pOperator.id, pController.id, 'Start');
      msg(pController.id, pEquipment.id, actions['STARTING'] || 'Start sequence');
      note(pController.id, pController.id, '→ EXECUTE');
      if (actions['EXECUTE']) msg(pController.id, pEquipment.id, actions['EXECUTE']);
    }

    // Hold scenario
    if ((scenarioType === 'full' || scenarioType === 'hold') && has(7)) {
      const fragStart = idx;
      msg(pOperator.id, pController.id, 'Hold', 'sync', 'load shed / pause');
      msg(pController.id, pEquipment.id, actions['HOLDING'] || 'Transition to hold');
      note(pController.id, pController.id, '→ HELD');
      if (actions['HELD']) msg(pController.id, pEquipment.id, actions['HELD']);
      msg(pOperator.id, pController.id, 'Unhold');
      msg(pController.id, pEquipment.id, actions['UNHOLDING'] || 'Resume');
      note(pController.id, pController.id, '→ EXECUTE');
      frags.push({
        id: uid(), type: 'opt', label: 'Hold / Resume',
        fromOrderIndex: fragStart, toOrderIndex: idx - 1,
        participantIds: [pOperator.id, pController.id, pEquipment.id],
        color: '#f59e0b',
      });
    }

    // Complete scenario
    if ((scenarioType === 'full' || scenarioType === 'complete') && has(10)) {
      const fragStart = idx;
      msg(pController.id, pController.id, 'Complete', 'sync', 'cycle done');
      msg(pController.id, pEquipment.id, actions['COMPLETING'] || 'Finish cycle');
      note(pController.id, pController.id, '→ COMPLETE');
      if (actions['COMPLETE']) note(pEquipment.id, pController.id, actions['COMPLETE']);
      msg(pOperator.id, pController.id, 'Reset');
      note(pController.id, pController.id, '→ IDLE');
      frags.push({
        id: uid(), type: 'opt', label: 'Completion Cycle',
        fromOrderIndex: fragStart, toOrderIndex: idx - 1,
        participantIds: [pOperator.id, pController.id, pEquipment.id],
        color: '#22c55e',
      });
    }

    // Normal stop
    if (scenarioType === 'full' || scenarioType === 'normal') {
      msg(pOperator.id, pController.id, 'Stop');
      msg(pController.id, pEquipment.id, actions['STOPPING'] || 'Shutdown sequence');
      note(pController.id, pController.id, '→ STOPPED');
    }

    // Abort scenario
    if ((scenarioType === 'full' || scenarioType === 'abort') && has(13)) {
      const fragStart = idx;
      msg(pOperator.id, pController.id, 'Abort', 'sync', 'emergency / fault');
      msg(pController.id, pEquipment.id, actions['ABORTING'] || 'Emergency stop');
      note(pController.id, pController.id, '→ ABORTED');
      if (actions['ABORTED']) msg(pController.id, pEquipment.id, actions['ABORTED']);
      msg(pOperator.id, pController.id, 'Clear');
      note(pController.id, pController.id, '→ STOPPED');
      frags.push({
        id: uid(), type: 'break', label: 'Abort / Emergency',
        fromOrderIndex: fragStart, toOrderIndex: idx - 1,
        participantIds: [pOperator.id, pController.id, pEquipment.id],
        color: '#ef4444',
      });
    }

    newDiagram.messages = msgs;
    newDiagram.fragments = frags;

    // Add to diagrams and activate
    const updated = [...diagrams, newDiagram];
    persist(updated);
    setActiveDiagramId(newDiagram.id);
    return newDiagram;
  }, [diagrams, persist]);

  // ─── Export PlantUML ───
  const exportPlantUML = useCallback((): string => {
    if (!activeDiagram) return '';
    const lines: string[] = [`@startuml ${activeDiagram.name}`];
    
    activeDiagram.participants
      .sort((a, b) => a.order - b.order)
      .forEach(p => {
        const stereo = p.stereotype ? `\\n${p.stereotype}` : '';
        lines.push(`participant "${p.label}${stereo}" as ${p.id.replace(/[^a-zA-Z0-9]/g, '_')}`);
      });
    lines.push('');

    const sorted = [...activeDiagram.messages].sort((a, b) => a.orderIndex - b.orderIndex);
    
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

      fragmentEnds.get(m.orderIndex)?.forEach(() => {
        lines.push('end');
      });
    });

    lines.push('@enduml');
    return lines.join('\n');
  }, [activeDiagram]);

  return {
    // Diagrams
    diagrams, activeDiagram, activeDiagramId, isLoading,
    setActiveDiagramId, createDiagram, deleteDiagram, renameDiagram, updateDiagramDescription,
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
    generateFromEdges, generateFromPackML, exportPlantUML,
    // Load from project data
    loadDiagrams: (data: SequenceDiagram[]) => persist(data),
  };
}
