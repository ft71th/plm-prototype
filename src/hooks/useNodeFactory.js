import { useCallback } from 'react';
import { defaultHardwareTypes } from '../constants/hardwareDefaults';

/**
 * Node template definitions. Each key maps to the default data fields for that node type.
 */
const NODE_TEMPLATES = {
  system: {
    label: 'New System',
    type: 'system',
    itemType: 'system',
    idType: 'system',
    classification: 'system',
    description: '', rationale: '', ports: [],
    priority: 'high', status: 'new', state: 'open',
    owner: '', attachment: null,
  },
  subsystem: {
    label: 'New Sub-System',
    type: 'subsystem',
    itemType: 'subsystem',
    idType: 'subsystem',
    classification: 'subsystem',
    description: '', rationale: '', ports: [],
    priority: 'medium', status: 'new', state: 'open',
    owner: '', attachment: null,
  },
  function: {
    label: 'New Function',
    type: 'function',
    itemType: 'function',
    idType: 'function',
    classification: 'function',
    description: '', rationale: '', ports: [],
    priority: 'medium', status: 'new', state: 'open',
    owner: '', attachment: null,
  },
  testcase: {
    label: 'New Test Case',
    type: 'testcase',
    itemType: 'testcase',
    idType: 'testcase',
    classification: 'testcase',
    description: '', rationale: '',
    purpose: '', preconditions: '', testSteps: '', expectedResults: '',
    priority: 'medium', status: 'draft', state: 'open',
    owner: '', attachment: null,
  },
  usecase: {
    label: 'New Use Case',
    type: 'usecase',
    itemType: 'usecase',
    idType: 'usecase',
    classification: 'usecase',
    description: '',
    preconditions: '', postconditions: '',
    mainFlow: '', alternativeFlows: '', actors: [],
    priority: 'medium', status: 'new', state: 'open',
    owner: '', attachment: null,
  },
  actor: {
    label: 'New Actor',
    type: 'actor',
    itemType: 'actor',
    idType: 'actor',
    classification: 'actor',
    description: '',
    actorType: 'primary',
    responsibilities: '',
    priority: 'medium', status: 'new', state: 'open',
    owner: '', attachment: null,
  },
};

/**
 * Consolidates all add*Node functions into a single factory hook.
 * 
 * Usage:
 *   const { addNode, addParameterNode, addHardwareNode, addTextAnnotationNode } = useNodeFactory(deps);
 *   addNode('system');  // replaces addSystemNode
 *   addNode('function');  // replaces addFunctionNode
 *   addParameterNode('configuration');  // has extra params
 *   addHardwareNode('motor');  // has extra params
 */
export default function useNodeFactory({
  nodeId, setNodeId, generateItemId, handleNodeLabelChange,
  setNodes, setSelectedNode, reactFlowInstance, hardwareTypes,
}) {
  /** Get viewport center position with jitter */
  const getCenterPosition = useCallback(() => {
    let position = { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 };
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      position = {
        x: centerX + (Math.random() * 100 - 50),
        y: centerY + (Math.random() * 100 - 50)
      };
    }
    return position;
  }, [reactFlowInstance]);

  /** Clear selection before adding a new node */
  const clearSelection = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
  }, [setNodes, setSelectedNode]);

  /** Generic add node for simple types (system, subsystem, function, testcase, usecase, actor) */
  const addNode = useCallback((nodeType) => {
    const template = NODE_TEMPLATES[nodeType];
    if (!template) {
      console.error(`Unknown node type: ${nodeType}`);
      return;
    }

    clearSelection();
    const position = getCenterPosition();
    const itemId = generateItemId(template.idType);

    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'custom',
        position,
        selected: false,
        data: {
          ...template,
          reqId: itemId,
          version: '1.0',
          onChange: handleNodeLabelChange,
        },
      };
      // Remove the internal idType field
      delete newNode.data.idType;
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, setSelectedNode, generateItemId, clearSelection, getCenterPosition, setNodeId]);

  /** Add parameter node (has extra paramType argument) */
  const addParameterNode = useCallback((paramType = 'configuration') => {
    clearSelection();
    const position = getCenterPosition();
    const itemId = generateItemId('parameter');

    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'custom',
        position,
        selected: false,
        data: {
          label: 'New Parameter',
          type: 'parameter',
          itemType: 'parameter',
          reqId: itemId,
          version: '1.0',
          classification: 'parameter',
          paramType,
          paramValue: '', paramUnit: '', paramMin: '', paramMax: '', paramDefault: '',
          description: '', rationale: '', ports: [],
          priority: 'medium', status: 'new', state: 'open',
          owner: '', attachment: null,
          onChange: handleNodeLabelChange,
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, generateItemId, clearSelection, getCenterPosition, setNodeId]);

  /** Add hardware node (has extra hwType argument + icon lookup) */
  const addHardwareNode = useCallback((hwType = 'generic') => {
    clearSelection();
    const position = getCenterPosition();
    const itemId = generateItemId('hardware');

    const typesToSearch = hardwareTypes.length > 0 ? hardwareTypes : defaultHardwareTypes;
    const hwTypeInfo = typesToSearch.find(t => t.id === hwType) || { name: 'Generic', icon: '📦' };

    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'custom',
        position,
        selected: false,
        data: {
          label: `New ${hwTypeInfo.name}`,
          type: 'hardware',
          itemType: 'hardware',
          reqId: itemId,
          version: '1.0',
          classification: 'hardware',
          hwType,
          hwIcon: hwTypeInfo.icon,
          hwIconSize: 64,
          hwCustomIcon: null,
          manufacturer: '', partNumber: '', serialNumber: '', specifications: '',
          description: '', rationale: '', ports: [],
          priority: 'medium', status: 'new', state: 'open',
          owner: '', attachment: null,
          onChange: handleNodeLabelChange,
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, generateItemId, hardwareTypes, clearSelection, getCenterPosition, setNodeId]);

  /** Add text annotation node */
  const addTextAnnotationNode = useCallback(() => {
    clearSelection();
    const position = getCenterPosition();

    setTimeout(() => {
      const newNode = {
        id: String(nodeId),
        type: 'textAnnotation',
        position,
        selected: true,
        data: {
          text: 'Double-click to edit',
          itemType: 'textAnnotation',
          fontSize: 14,
          textColor: '#333333',
          bgColor: 'rgba(255, 255, 200, 0.9)',
          fontWeight: 'normal',
          fontStyle: 'normal',
          nodeWidth: 200,
          nodeHeight: 60,
          onChange: handleNodeLabelChange,
          onResize: (resizeNodeId, width, height) => {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === resizeNodeId
                  ? { ...node, data: { ...node.data, nodeWidth: width, nodeHeight: height } }
                  : node
              )
            );
          }
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setNodeId((id) => id + 1);
    }, 0);
  }, [nodeId, handleNodeLabelChange, setNodes, clearSelection, getCenterPosition, setNodeId]);

  // Convenience aliases matching old API
  const addSystemNode = useCallback(() => addNode('system'), [addNode]);
  const addSubSystemNode = useCallback(() => addNode('subsystem'), [addNode]);
  const addFunctionNode = useCallback(() => addNode('function'), [addNode]);
  const addTestCaseNode = useCallback(() => addNode('testcase'), [addNode]);
  const addUseCaseNode = useCallback(() => addNode('usecase'), [addNode]);
  const addActorNode = useCallback(() => addNode('actor'), [addNode]);

  return {
    addNode,
    addParameterNode,
    addHardwareNode,
    addTextAnnotationNode,
    addSystemNode,
    addSubSystemNode,
    addFunctionNode,
    addTestCaseNode,
    addUseCaseNode,
    addActorNode,
  };
}
