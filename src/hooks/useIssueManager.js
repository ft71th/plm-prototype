import { useState, useCallback } from 'react';

/**
 * Manages all issue state: CRUD operations, counters, and modal visibility.
 */
export default function useIssueManager() {
  // Issue data
  const [issues, setIssues] = useState({});  // { nodeId: [issue1, issue2, ...] }
  const [issueIdCounter, setIssueIdCounter] = useState(1);

  // Modal states
  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const [issueNodeId, setIssueNodeId] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showCreateIssueModal, setShowCreateIssueModal] = useState(false);
  const [createIssueNodeId, setCreateIssueNodeId] = useState(null);
  const [showIssueManagerModal, setShowIssueManagerModal] = useState(false);

  const addIssue = useCallback((nodeId, issueData) => {
    const newIssue = {
      id: `ISS-${String(issueIdCounter).padStart(3, '0')}`,
      title: issueData.title || 'New Issue',
      description: issueData.description || '',
      severity: issueData.severity || 'medium',
      status: issueData.status || 'open',
      type: issueData.type || 'bug',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignee: issueData.assignee || '',
      dueDate: issueData.dueDate || '',
      comments: []
    };

    setIssues(prev => ({
      ...prev,
      [nodeId]: [...(prev[nodeId] || []), newIssue]
    }));
    setIssueIdCounter(prev => prev + 1);
    return newIssue;
  }, [issueIdCounter]);

  const updateIssue = useCallback((nodeId, issueId, updates) => {
    setIssues(prev => ({
      ...prev,
      [nodeId]: (prev[nodeId] || []).map(issue =>
        issue.id === issueId
          ? { ...issue, ...updates, updatedAt: new Date().toISOString() }
          : issue
      )
    }));
  }, []);

  const deleteIssue = useCallback((nodeId, issueId) => {
    setIssues(prev => ({
      ...prev,
      [nodeId]: (prev[nodeId] || []).filter(issue => issue.id !== issueId)
    }));
  }, []);

  const getNodeIssues = useCallback((nodeId) => {
    return issues[nodeId] || [];
  }, [issues]);

  const getOpenIssueCount = useCallback((nodeId) => {
    return (issues[nodeId] || []).filter(i => i.status !== 'closed' && i.status !== 'resolved').length;
  }, [issues]);

  const getCriticalIssueCount = useCallback((nodeId) => {
    return (issues[nodeId] || []).filter(i =>
      (i.severity === 'critical' || i.severity === 'high') &&
      i.status !== 'closed' && i.status !== 'resolved'
    ).length;
  }, [issues]);

  /** Load issues from project data */
  const loadIssues = useCallback((projectIssues) => {
    if (projectIssues) {
      setIssues(projectIssues);
      let maxIssueId = 0;
      Object.values(projectIssues).forEach(nodeIssues => {
        nodeIssues.forEach(issue => {
          const idNum = parseInt(issue.id.replace('ISS-', '')) || 0;
          if (idNum > maxIssueId) maxIssueId = idNum;
        });
      });
      setIssueIdCounter(maxIssueId + 1);
    } else {
      setIssues({});
      setIssueIdCounter(1);
    }
  }, []);

  /** Open issue panel for a specific node */
  const openIssuePanel = useCallback((nodeId) => {
    setIssueNodeId(nodeId);
    setShowIssuePanel(true);
  }, []);

  /** Open create-issue modal for a specific node */
  const openCreateIssue = useCallback((nodeId) => {
    setCreateIssueNodeId(nodeId);
    setShowCreateIssueModal(true);
  }, []);

  return {
    // Data
    issues,
    setIssues,
    issueIdCounter,

    // CRUD
    addIssue,
    updateIssue,
    deleteIssue,
    getNodeIssues,
    getOpenIssueCount,
    getCriticalIssueCount,
    loadIssues,

    // Modal states
    showIssuePanel,
    setShowIssuePanel,
    issueNodeId,
    setIssueNodeId,
    selectedIssue,
    setSelectedIssue,
    showCreateIssueModal,
    setShowCreateIssueModal,
    createIssueNodeId,
    setCreateIssueNodeId,
    showIssueManagerModal,
    setShowIssueManagerModal,
    openIssuePanel,
    openCreateIssue,
  };
}
