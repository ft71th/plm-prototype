// src/hooks/useSWCRegistry.ts
// Manages SWC component registry per project — backend + local fallback

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../api';

export interface SWCEntry {
  swc_code: string;
  full_name: string;
  system_part: string;
  swc_type: string;  // C/D/M/P/U
  description: string;
}

const SWC_TYPES: Record<string, string> = {
  C: 'Control', D: 'Diagnostics', M: 'Monitoring', P: 'Priority', U: 'Utility',
};

function inferSWCType(code: string): string {
  const last = code.slice(-1);
  return SWC_TYPES[last] ? last : '';
}

export function useSWCRegistry(projectId: string | null, nodes?: any[]) {
  const [entries, setEntries] = useState<SWCEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const fetchedRef = useRef(false);

  // ─── Fetch from backend ───────────────────────────────
  const fetchRegistry = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/projects/${projectId}/swc`);
      if (Array.isArray(res)) {
        setEntries(res);
        setBackendAvailable(true);
      }
    } catch {
      setBackendAvailable(false);
      // Fallback: extract SWC codes from node data
      if (nodes?.length) {
        extractFromNodes(nodes);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, nodes]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchRegistry();
      fetchedRef.current = true;
    }
  }, [fetchRegistry]);

  // ─── Fallback: extract from existing nodes ────────────
  function extractFromNodes(nodeList: any[]) {
    const seen = new Set<string>();
    const extracted: SWCEntry[] = [];
    (nodeList || []).forEach(n => {
      const code = n.data?.swcCode;
      if (code && !seen.has(code)) {
        seen.add(code);
        extracted.push({
          swc_code: code,
          full_name: n.data?.label || code,
          system_part: '',
          swc_type: inferSWCType(code),
          description: '',
        });
      }
    });
    setEntries(prev => {
      // Merge: keep backend entries, add node-only entries
      const backendCodes = new Set(prev.map(e => e.swc_code));
      const merged = [...prev, ...extracted.filter(e => !backendCodes.has(e.swc_code))];
      return merged;
    });
  }

  // ─── Register new SWC code ────────────────────────────
  const registerSWC = useCallback(async (
    code: string,
    fullName?: string,
    description?: string,
  ): Promise<SWCEntry | null> => {
    if (!code || !projectId) return null;

    const upperCode = code.toUpperCase().slice(0, 6);
    const swcType = inferSWCType(upperCode);

    // Check if already exists locally
    const existing = entries.find(e => e.swc_code === upperCode);
    if (existing) return existing;

    const newEntry: SWCEntry = {
      swc_code: upperCode,
      full_name: fullName || upperCode,
      system_part: '',
      swc_type: swcType,
      description: description || '',
    };

    // Optimistic local update
    setEntries(prev => [...prev, newEntry]);

    // Try backend
    if (backendAvailable) {
      try {
        const res = await apiFetch(`/projects/${projectId}/swc`, {
          method: 'POST',
          body: JSON.stringify({
            swc_code: upperCode,
            full_name: fullName || upperCode,
            swc_type: swcType,
            description: description || '',
          }),
        });
        return res as SWCEntry;
      } catch {
        // Backend failed but local update succeeded
      }
    }

    return newEntry;
  }, [projectId, entries, backendAvailable]);

  // ─── Remove SWC code ──────────────────────────────────
  const removeSWC = useCallback(async (code: string) => {
    if (!projectId) return;
    setEntries(prev => prev.filter(e => e.swc_code !== code));
    if (backendAvailable) {
      try {
        await apiFetch(`/projects/${projectId}/swc/${code}`, { method: 'DELETE' });
      } catch {}
    }
  }, [projectId, backendAvailable]);

  // ─── Get all unique codes ─────────────────────────────
  const codes = entries.map(e => e.swc_code);

  return {
    entries,
    codes,
    loading,
    backendAvailable,
    registerSWC,
    removeSWC,
    refresh: fetchRegistry,
  };
}
