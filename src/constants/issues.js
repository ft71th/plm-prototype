// Issue Categories
export const ISSUE_CATEGORIES = {
  bug: { icon: '🐛', label: 'Bug', color: '#e74c3c' },
  requirement: { icon: '📋', label: 'Requirement Issue', color: '#3498db' },
  design: { icon: '✏️', label: 'Design Issue', color: '#9b59b6' },
  safety: { icon: '⚠️', label: 'Safety Concern', color: '#e67e22' },
  performance: { icon: '⚡', label: 'Performance', color: '#f1c40f' },
  documentation: { icon: '📄', label: 'Documentation', color: '#1abc9c' },
  question: { icon: '❓', label: 'Question', color: '#95a5a6' },
  enhancement: { icon: '✨', label: 'Enhancement', color: '#27ae60' },
};

// Issue Priorities
export const ISSUE_PRIORITIES = {
  critical: { icon: '🔴', label: 'Critical', color: '#9b59b6' },
  high: { icon: '🟠', label: 'High', color: '#e74c3c' },
  medium: { icon: '🟡', label: 'Medium', color: '#f39c12' },
  low: { icon: '🟢', label: 'Low', color: '#27ae60' },
};

// Issue Statuses
export const ISSUE_STATUSES = {
  open: { icon: '📬', label: 'Open', color: '#e74c3c' },
  investigating: { icon: '🔍', label: 'Investigating', color: '#f39c12' },
  inProgress: { icon: '🔄', label: 'In Progress', color: '#3498db' },
  resolved: { icon: '✅', label: 'Resolved', color: '#27ae60' },
  closed: { icon: '📪', label: 'Closed', color: '#95a5a6' },
};
