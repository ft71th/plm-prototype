import type { PLMNode, PLMEdge, NodeData } from '../../types';
import CustomNode from './CustomNode';
import TextAnnotationNode from './TextAnnotationNode';
import ImageNode from './ImageNode';
import PostItNode from './PostItNode';
import CustomEdge from './CustomEdge';

export const nodeTypes = {
  custom: CustomNode,
  textAnnotation: TextAnnotationNode,
  imageNode: ImageNode,
  postIt: PostItNode,
};

export const edgeTypes = {
  custom: CustomEdge,
};
