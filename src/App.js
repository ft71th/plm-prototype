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

// Custom node component with editing capability
function CustomNode({ data, id }) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onChange) {
      data.onChange(id, label);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (data.onChange) {
        data.onChange(id, label);
      }
    }
    if (e.key === 'Escape') {
      setLabel(data.label);
      setIsEditing(false);
    }
  };

  return (
    <div style={{
      padding: '15px',
      borderRadius: '8px',
      border: '3px solid ' + (data.type === 'platform' ? '#3498db' : '#e67e22'),
      backgroundColor: '#2c3e50',
      color: 'white',
      minWidth: '180px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      position: 'relative'
    }}>
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
      
      {isEditing ? (
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            fontSize: '14px',
            fontWeight: 'bold',
            background: '#34495e',
            color: 'white',
            border: '1px solid #3498db',
            borderRadius: '4px',
            padding: '4px 8px',
            outline: 'none'
          }}
        />
      ) : (
        <div 
          onDoubleClick={handleDoubleClick}
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'text',
            minHeight: '20px'
          }}
        >
          {data.label}
        </div>
      )}
      
      {!isEditing && (
        <div style={{
          fontSize: '9px',
          color: '#95a5a6',
          marginTop: '4px',
          fontStyle: 'italic'
        }}>
          Double-click to edit
        </div>
      )}
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

  const handleNodeLabelChange = useCallback((nodeId, newLabel) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              label: newLabel,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const nodesWithHandlers = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onChange: handleNodeLabelChange,
    },
  }));

  const addPlatformNode = () => {
    const newNode = {
      id: String(nodeId),
      type: 'custom',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: 'New Platform Component', 
        type: 'platform',
        onChange: handleNodeLabelChange
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  };

  const addProjectNode = () => {
    const newNode = {
      id: String(nodeId),
      type: 'custom',
      position: { x: Math.random() * 400 + 300, y: Math.random() * 400 },
      data: { 
        label: 'New Requirement', 
        type: 'project',
        onChange: handleNodeLabelChange
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  };

  const exportProject = () => {
    const project = {
      nodes: nodes,
      edges: edges,
    };
    const dataStr = JSON.stringify(project, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plm-project.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importProject = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const project = JSON.parse(e.target.result);
          setNodes(project.nodes || []);
          setEdges(project.edges || []);
          const maxId = Math.max(...project.nodes.map(n => parseInt(n.id) || 0), 0);
          setNodeId(maxId + 1);
        } catch (error) {
          alert('Error loading project file!');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1e1e1e' }}>
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
        PLM Prototype - Week 2 🚀
      </div>
      
      <ReactFlow
        nodes={nodesWithHandlers}
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
                + Platform
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
                + Project
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={exportProject}
                style={{
                  padding: '8px 16px',
                  background: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                💾 Save
              </button>
              <label style={{
                padding: '8px 16px',
                background: '#9b59b6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                display: 'inline-block'
              }}>
                📂 Load
                <input
                  type="file"
                  accept=".json"
                  onChange={importProject}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            
            <div style={{
              background: '#2c3e50',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '11px'
            }}>
              💡 Double-click to edit | Drag ● to connect
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}