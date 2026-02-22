// src/components/DocumentEngine/useDocuments.ts
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../api';

export interface DocTemplate {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  version: string;
  schema: {
    metadata_fields: MetadataField[];
    sections: SectionDef[];
    header?: any;
    footer?: any;
    revision_history?: boolean;
  };
  company_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MetadataField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'number';
  required?: boolean;
  options?: string[];
  auto?: string;
}

export interface ColumnDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'date';
  options?: string[];
  editable?: boolean;
  auto_increment?: boolean;
  computed?: string;
  min?: number;
  max?: number;
}

export interface SectionDef {
  id: string;
  title: string;
  type: string;
  template_content?: string;
  required?: boolean;
  data_source?: string;
  filter?: Record<string, any>;
  columns?: ColumnDef[];
  linked_to?: string;
  procedure_fields?: string[];
  signatories?: { role: string; required: boolean }[];
}

export interface Document {
  id: string;
  template_id: string;
  project_id: string;
  title: string;
  doc_number: string;
  version: string;
  status: 'draft' | 'review' | 'approved' | 'released';
  metadata: Record<string, any>;
  section_data: Record<string, any>;
  revision_log: { version: string; date: string; author: string; changes: string }[];
  template_name?: string;
  template_type?: string;
  template_category?: string;
  template_schema?: DocTemplate['schema'];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useDocuments(projectId: string | null) {
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load templates
  const loadTemplates = useCallback(async () => {
    try {
      const res = await apiFetch('/doc-templates');
      setTemplates(res.templates || []);
    } catch (err: any) {
      console.error('Load templates error:', err);
      setError(err.message);
    }
  }, []);

  // Load project documents
  const loadDocuments = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/projects/${projectId}/documents`);
      setDocuments(res.documents || []);
    } catch (err: any) {
      console.error('Load documents error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load on mount
  useEffect(() => {
    loadTemplates();
    loadDocuments();
  }, [loadTemplates, loadDocuments]);

  // Create document from template
  const createDocument = useCallback(async (templateId: string, title: string, metadata?: Record<string, any>) => {
    if (!projectId) return null;
    try {
      const res = await apiFetch(`/projects/${projectId}/documents`, {
        method: 'POST',
        body: JSON.stringify({ template_id: templateId, title, metadata }),
      });
      await loadDocuments();
      return res.document;
    } catch (err: any) {
      console.error('Create document error:', err);
      setError(err.message);
      return null;
    }
  }, [projectId, loadDocuments]);

  // Open document (load full data with template schema)
  const openDocument = useCallback(async (docId: string) => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/projects/${projectId}/documents/${docId}`);
      setActiveDoc(res.document);
    } catch (err: any) {
      console.error('Open document error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Save document (debounced via caller)
  const saveDocument = useCallback(async (docId: string, updates: Partial<Document>) => {
    if (!projectId) return;
    try {
      setSaving(true);
      const res = await apiFetch(`/projects/${projectId}/documents/${docId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      // Update local state
      setActiveDoc(prev => prev?.id === docId ? { ...prev, ...res.document } : prev);
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, ...res.document } : d));
    } catch (err: any) {
      console.error('Save document error:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [projectId]);

  // Delete document
  const deleteDocument = useCallback(async (docId: string) => {
    if (!projectId) return;
    try {
      await apiFetch(`/projects/${projectId}/documents/${docId}`, { method: 'DELETE' });
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (activeDoc?.id === docId) setActiveDoc(null);
    } catch (err: any) {
      console.error('Delete document error:', err);
      setError(err.message);
    }
  }, [projectId, activeDoc]);

  // Create new version
  const createNewVersion = useCallback(async (docId: string, changes?: string) => {
    if (!projectId) return null;
    try {
      const res = await apiFetch(`/projects/${projectId}/documents/${docId}/new-version`, {
        method: 'POST',
        body: JSON.stringify({ changes }),
      });
      await loadDocuments();
      return res.document;
    } catch (err: any) {
      console.error('New version error:', err);
      setError(err.message);
      return null;
    }
  }, [projectId, loadDocuments]);

  // Clone template
  const cloneTemplate = useCallback(async (templateId: string, name?: string) => {
    try {
      const res = await apiFetch(`/doc-templates/${templateId}/clone`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      await loadTemplates();
      return res.template;
    } catch (err: any) {
      console.error('Clone template error:', err);
      setError(err.message);
      return null;
    }
  }, [loadTemplates]);

  return {
    templates,
    documents,
    activeDoc,
    loading,
    saving,
    error,
    setActiveDoc,
    setError,
    loadTemplates,
    loadDocuments,
    createDocument,
    openDocument,
    saveDocument,
    deleteDocument,
    createNewVersion,
    cloneTemplate,
  };
}
