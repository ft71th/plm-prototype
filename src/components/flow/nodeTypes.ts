import type { PLMNode, PLMEdge, NodeData } from '../../types';
import CustomNode from './CustomNode';
import TextAnnotationNode from './TextAnnotationNode';
import CustomEdge from './CustomEdge';

export const nodeTypes = {
  custom: CustomNode,
  textAnnotation: TextAnnotationNode,
};

export const edgeTypes = {
  custom: CustomEdge,
};
