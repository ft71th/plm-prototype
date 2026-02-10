import type { RelationshipDef, RelationshipKey, PLMNode } from '../types';

export const RELATIONSHIP_TYPES: Record<RelationshipKey, RelationshipDef> = {
  contains: { label: 'Contains', color: '#1abc9c', style: 'solid' },
  provides: { label: 'Provides', color: '#3498db', style: 'solid' },
  realizedBy: { label: 'Realized by', color: '#9b59b6', style: 'solid' },
  verifies: { label: 'Verifies', color: '#27ae60', style: 'solid' },
  allocatedTo: { label: 'Allocated to', color: '#e91e63', style: 'solid' },
  addresses: { label: 'Addresses', color: '#27ae60', style: 'solid' },
  implements: { label: 'Implements', color: '#2196f3', style: 'solid' },
  satisfies: { label: 'Satisfies', color: '#8e44ad', style: 'solid' },
  derives: { label: 'Derives from', color: '#e67e22', style: 'dashed' },
  depends: { label: 'Depends on', color: '#f1c40f', style: 'dashed' },
  conflicts: { label: 'Conflicts with', color: '#e74c3c', style: 'dotted' },
  related: { label: 'Related to', color: '#95a5a6', style: 'dotted' },
  flowsDown: { label: 'Flows down', color: '#00bcd4', style: 'solid' },
  reuses: { label: 'Reuses', color: '#16a085', style: 'solid' },
};

export const defaultEdgeOptions = {
  type: 'custom' as const,
  animated: false,
};

export function inferRelationshipType(
  sourceNode: PLMNode | null | undefined,
  targetNode: PLMNode | null | undefined,
): RelationshipKey {
  const sourceClass = sourceNode?.data?.classification || 'requirement';
  const targetClass = targetNode?.data?.classification || 'requirement';
  const sourceReqType = sourceNode?.data?.reqType || 'project';
  const targetReqType = targetNode?.data?.reqType || 'project';
  const sourceType = sourceNode?.data?.type || sourceNode?.data?.itemType || 'project';
  const targetType = targetNode?.data?.type || targetNode?.data?.itemType || 'project';
  const sourceItemType = sourceNode?.data?.itemType;
  const targetItemType = targetNode?.data?.itemType;

  if (sourceItemType === 'system' && targetItemType === 'subsystem') return 'contains';
  if (sourceItemType === 'subsystem' && targetItemType === 'function') return 'provides';
  if (sourceItemType === 'system' && targetItemType === 'function') return 'provides';
  if (sourceItemType === 'function' && !targetItemType) return 'realizedBy';
  if ((sourceItemType === 'system' || sourceItemType === 'subsystem') && !targetItemType) return 'allocatedTo';
  if (!sourceItemType && targetItemType === 'function') return 'implements';
  if (!sourceItemType && targetItemType === 'subsystem') return 'implements';
  if (!sourceItemType && targetItemType === 'system') return 'satisfies';
  if (sourceItemType === 'testcase' && !targetItemType) return 'verifies';
  if (!sourceItemType && targetItemType === 'testcase') return 'verifies';

  if (sourceClass === 'need' && targetClass === 'capability') return 'addresses';
  if (sourceClass === 'capability' && targetClass === 'requirement') return 'implements';
  if (sourceClass === 'need' && targetClass === 'requirement') return 'satisfies';
  if (sourceReqType === 'customer' && targetReqType === 'project') return 'flowsDown';
  if (sourceReqType === 'customer' && targetReqType === 'platform') return 'flowsDown';
  if (sourceType === 'platform' && targetType === 'project') return 'reuses';
  if (sourceReqType === 'implementation' && targetClass === 'requirement') return 'implements';
  if (sourceClass === targetClass && sourceClass === 'requirement') return 'derives';

  return 'related';
}
