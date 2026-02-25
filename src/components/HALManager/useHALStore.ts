// src/components/HALManager/useHALStore.ts
// Backend-persisted HAL storage with localStorage write-through cache

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../../api';
import type { HALConfig } from './halTypes';

let _idCounter = 0;
function genId() { return `hal_${Date.now()}_${++_idCounter}`; }

const LS_KEY = (pid: string) => `northlight_hal_${pid || 'default'}`;

function defaultConfig(projectId: string): HALConfig {
  return {
    id: genId(),
    projectId,
    name: 'HAL Configuration',
    version: '0.1',
    description: '',
    modules: [],
    comDevices: [],
    mappings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export interface HALVersionEntry {
  id: string;
  version: string;
  changes: string;
  created_by: string;
  created_at: string;
}

export function useHALStore(projectId: string | null) {
  const pid = projectId || '';
  const [config, setConfigState] = useState<HALConfig>(() => {
    // Load from localStorage instantly
    try {
      const raw = localStorage.getItem(LS_KEY(pid));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.comDevices) parsed.comDevices = []; // migrate
        parsed.mappings?.forEach((m: any) => { if (!m.source) m.source = 'hw'; if (!m.comRegisterId) m.comRegisterId = ''; }); // migrate
        return parsed;
      }
    } catch {}
    return defaultConfig(pid);
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<HALVersionEntry[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load from backend on mount ─────────────────────
  useEffect(() => {
    if (!pid) { setLoading(false); return; }

    (async () => {
      try {
        const res = await apiFetch(`/projects/${pid}/hal`);
        if (res && res.data) {
          const backendConfig = res.data as HALConfig;
          if (!backendConfig.comDevices) backendConfig.comDevices = [];
          backendConfig.mappings?.forEach((m: any) => { if (!m.source) m.source = 'hw'; if (!m.comRegisterId) m.comRegisterId = ''; });
          setConfigState(backendConfig);
          // Update cache
          try { localStorage.setItem(LS_KEY(pid), JSON.stringify(backendConfig)); } catch {}
          console.log('[HAL] Loaded from backend');
        } else {
          // Check if localStorage has data to migrate
          const cached = localStorage.getItem(LS_KEY(pid));
          if (cached) {
            const parsed = JSON.parse(cached);
            console.log('[HAL] Migrating localStorage to backend');
            await saveToBackend(pid, parsed);
          } else {
            console.log('[HAL] No saved HAL config');
          }
        }
      } catch (err: any) {
        console.warn('[HAL] Backend load failed, using localStorage:', err.message);
      } finally {
        setLoading(false);
      }
    })();

    // Load version history
    loadVersions(pid);
  }, [pid]);

  // ─── Debounced save ────────────────────────────────
  const debouncedSave = useCallback((newConfig: HALConfig) => {
    // Immediate localStorage write-through
    try { localStorage.setItem(LS_KEY(pid), JSON.stringify(newConfig)); } catch {}

    // Debounced backend save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!pid) return;
      setSaving(true);
      try {
        await saveToBackend(pid, newConfig);
        console.log('[HAL] Saved to backend');
      } catch (err: any) {
        console.warn('[HAL] Backend save failed:', err.message);
      } finally {
        setSaving(false);
      }
    }, 1500);
  }, [pid]);

  // ─── Config setter (auto-saves) ────────────────────
  const setConfig = useCallback((updater: HALConfig | ((prev: HALConfig) => HALConfig)) => {
    setConfigState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const stamped = { ...next, updatedAt: new Date().toISOString() };
      debouncedSave(stamped);
      return stamped;
    });
  }, [debouncedSave]);

  // ─── Version management ────────────────────────────
  async function loadVersions(projectId: string) {
    try {
      const res = await apiFetch(`/projects/${projectId}/hal/versions`);
      if (Array.isArray(res)) setVersions(res);
    } catch {}
  }

  async function createVersion(changes: string) {
    if (!pid) return;
    const nextVersion = bumpVersion(config.version);
    const versionedConfig = { ...config, version: nextVersion };

    try {
      setSaving(true);
      await apiFetch(`/projects/${pid}/hal/version`, {
        method: 'POST',
        body: JSON.stringify({ data: versionedConfig, version: nextVersion, changes }),
      });
      setConfigState(versionedConfig);
      try { localStorage.setItem(LS_KEY(pid), JSON.stringify(versionedConfig)); } catch {}
      await loadVersions(pid);
      console.log(`[HAL] Version ${nextVersion} created`);
    } catch (err: any) {
      console.error('[HAL] Version creation failed:', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadVersion(versionId: string) {
    if (!pid) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/projects/${pid}/hal/versions/${versionId}`);
      if (res?.data) {
        setConfigState(res.data as HALConfig);
        try { localStorage.setItem(LS_KEY(pid), JSON.stringify(res.data)); } catch {}
      }
    } catch (err: any) {
      console.error('[HAL] Version load failed:', err.message);
    } finally {
      setLoading(false);
    }
  }

  return {
    config,
    setConfig,
    saving,
    loading,
    versions,
    createVersion,
    loadVersion,
  };
}

// ─── Helpers ─────────────────────────────────────────

async function saveToBackend(projectId: string, config: HALConfig) {
  await apiFetch(`/projects/${projectId}/hal`, {
    method: 'PUT',
    body: JSON.stringify({ data: config, version: config.version }),
  });
}

function bumpVersion(current: string): string {
  const parts = current.split('.');
  if (parts.length === 2) {
    return `${parts[0]}.${parseInt(parts[1] || '0') + 1}`;
  }
  return `${parseInt(current || '0') + 1}.0`;
}
