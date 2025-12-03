import { useCallback, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom node component with visible handles
function CustomNode({ data }) {
  return (
    <div style={{
      padding: '15px',
      borderRadius: '8px',
      border: `3px solid ${data.type === 'platform' ? '#3498db' : '#e67e22'}`,
      backgroundColor: '#2c3e50',
      color: 'white',
      minWidth: '180px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      position: 'relative'
    }}>
      {/* Connection handles - these let you connect nodes */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#555', width: 12, height: 12 }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ background: '#555', width: 12, height: 12 }}
      />
      
      <div style={{
        fontSize: '10px',
        textTransform: 'uppercase',
        color: data.type === 'platform' ? '#3498db' : '#e67e22',
        marginBottom: '5px',
        fontWeight: 'bold'
      }}>
        {data.type === 'platform' ? '🔷 PLATFORM' : '🔶 PROJECT'}
      </div>
      <div style={{
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        {data.label}
      </div>
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

const initialNodes = [
  { 
    id: '1', 
    type: 'custom',
    position: { x: 100, y: 100 }, 
    data: { label: 'Motor Control Library', type: 'platform' }
  },
  { 
    id: '2', 
    type: 'custom',
    position: { x: 400, y: 100 }, 
    data: { label: 'Speed Control Required', type: 'project' }
  },
  { 
    id: '3', 
    type: 'custom',
    position: { x: 400, y: 250 }, 
    data: { label: 'Safety Stop Function', type: 'project' }
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3', animated: true },
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [nodeId, setNodeId] = useState(4);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  // Add new platform node
  const addPlatformNode = () => {
    const newNode = {
      id: String(nodeId),
      type: 'custom',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: 'Platform Component ' + nodeId, type: 'platform' },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  };

  // Add new project node
  const addProjectNode = () => {
    const newNode = {
      id: String(nodeId),
      type: 'custom',
      position: { x: Math.random() * 400 + 300, y: Math.random() * 400 },
      data: { label: 'Requirement ' + nodeId, type: 'project' },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1e1e1e' }}>
      {/* Title */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        padding: '10px 20px',
        background: '#2C3E50',
        color: 'white',
        borderRadius: 8,
        fontSize: 20,
        fontWeight: 'bold',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
      }}>
        PLM Prototype - Week 1 🚀
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} color="#444" />
        
        {/* Button Panel */}
        <Panel position="top-left">
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={addPlatformNode}
                style={{
                  padding: '10px 20px',
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                + Platform Component
              </button>
              <button
                onClick={addProjectNode}
                style={{
                  padding: '10px 20px',
                  background: '#e67e22',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                + Project Requirement
              </button>
            </div>
            <div style={{
              background: '#2c3e50',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px'
            }}>
              💡 Drag from ● to ● to connect | Click + Delete to remove
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}