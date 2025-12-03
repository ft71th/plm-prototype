import { useCallback, useState, useEffect } from 'react';
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

// Custom node component
function CustomNode({ data, id, selected }) {
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
      boxShadow: selected ? '0 0 0 3px #f39c12' : '0 4px 6px rgba(0,0,0,0.3)',
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
        {data.priority && (
          <span style={{ marginLeft: '8px', fontSize: '9px' }}>
            {data.priority === 'high' && '🔴 HIGH'}
            {data.priority === 'medium' && '🟡 MED'}
            {data.priority === 'low' && '🟢 LOW'}
          </span>
        )}
        {data.status && (
          <span style={{ marginLeft: '8px', fontSize: '9px' }}>
            {data.status === 'done' && '✅'}
            {data.status === 'in-progress' && '⏳'}
            {data.status === 'new' && '🆕'}
          </span>
        )}
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
      
      {!isEditing && data.description && (
        <div style={{
          fontSize: '11px',
          color: '#bdc3c7',
          marginTop: '6px',
          fontStyle: 'italic',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {data.description}
        </div>
      )}
    </div>
  );
}

// Draggable Floating Panel Component
function FloatingPanel({ node, onClose, onUpdate, initialPosition }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState(initialPosition);

  // Reset position when initialPosition changes (new node clicked)
  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  const handleMouseDown = (e) => {
    // Don't start drag if clicking on input/textarea/select
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.tagName === 'SELECT' ||
        e.target.tagName === 'BUTTON') {
      return;
    }

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x + 'px',
        top: position.y + 'px',
        width: '320px',
        background: '#2c3e50',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 2000,
        color: 'white',
        userSelect: isDragging ? 'none' : 'auto'
      }}
    >
      <div 
        style={{
          padding: '12px 15px',
          borderBottom: '2px solid #34495e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#34495e',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>✋</span>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Edit Node</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 6px',
            lineHeight: '1'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '15px', maxHeight: '400px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Title
          </label>
          <div style={{
            padding: '8px',
            background: '#34495e',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {node.data.label}
          </div>
          <div style={{ fontSize: '9px', color: '#95a5a6', marginTop: '4px' }}>
            Double-click node to edit
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Description
          </label>
          <textarea
            value={node.data.description || ''}
            onChange={(e) => onUpdate(node.id, 'description', e.target.value)}
            placeholder="Add description..."
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '8px',
              background: '#34495e',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Priority
          </label>
          <select
            value={node.data.priority || 'medium'}
            onChange={(e) => onUpdate(node.id, 'priority', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              background: '#34495e',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <option value="low">🟢 Low</option>
            <option value="medium">🟡 Medium</option>
            <option value="high">🔴 High</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Status
          </label>
          <select
            value={node.data.status || 'new'}
            onChange={(e) => onUpdate(node.id, 'status', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              background: '#34495e',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <option value="new">🆕 New</option>
            <option value="in-progress">⏳ In Progress</option>
            <option value="done">✅ Done</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#bdc3c7',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Owner
          </label>
          <input
            type="text"
            value={node.data.owner || ''}
            onChange={(e) => onUpdate(node.id, 'owner', e.target.value)}
            placeholder="Who owns this?"
            style={{
              width: '100%',
              padding: '8px',
              background: '#34495e',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '4px',
              fontSize: '13px'
            }}
          />
        </div>

        <div style={{
          padding: '10px',
          background: '#34495e',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#95a5a6'
        }}>
          <div><strong>ID:</strong> {node.id}</div>
          <div style={{ marginTop: '4px' }}>
            <strong>Type:</strong> {node.data.type === 'platform' ? '🔷 Platform' : '🔶 Project'}
          </div>
        </div>
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
    data: { 
      label: 'Motor Control Library', 
      type: 'platform',
      description: 'Core library for motor control',
      priority: 'high',
      status: 'done',
      owner: 'Engineering Team'
    }
  },
  { 
    id: '2', 
    type: 'custom',
    position: { x: 400, y: 100 }, 
    data: { 
      label: 'Speed Control Required', 
      type: 'project',
      description: 'Variable speed control needed',
      priority: 'high',
      status: 'in-progress',
      owner: 'Fredrik'
    }
  },
  { 
    id: '3', 
    type: 'custom',
    position: { x: 400, y: 250 }, 
    data: { 
      label: 'Safety Stop Function', 
      type: 'project',
      description: 'Emergency stop within 2 seconds',
      priority: 'high',
      status: 'new',
      owner: 'Safety Team'
    }
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
  const [selectedNode, setSelectedNode] = useState(null);
  const [floatingPanelPosition, setFloatingPanelPosition] = useState({ x: 0, y: 0 });

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

  const handleNodeClick = useCallback((event, node) => {
    // Calculate position next to the clicked node
    const rect = event.target.getBoundingClientRect();
    const newX = rect.right + 20;
    const newY = rect.top;
    
    // Make sure panel doesn't go off screen
    const adjustedX = newX + 320 > window.innerWidth ? rect.left - 340 : newX;
    const adjustedY = newY + 400 > window.innerHeight ? window.innerHeight - 420 : newY;
    
    setFloatingPanelPosition({
      x: adjustedX,
      y: Math.max(10, adjustedY)
    });
    setSelectedNode(node);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const updateNodeData = (nodeId, field, value) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              [field]: value,
            },
          };
        }
        return node;
      })
    );
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode({
        ...selectedNode,
        data: {
          ...selectedNode.data,
          [field]: value,
        },
      });
    }
  };

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
        description: '',
        priority: 'medium',
        status: 'new',
        owner: '',
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
        description: '',
        priority: 'medium',
        status: 'new',
        owner: '',
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
          setSelectedNode(null);
        } catch (error) {
          alert('Error loading project file!');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1e1e1e', position: 'relative' }}>
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
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
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
              <button onClick={addPlatformNode} style={{
                padding: '10px 20px', background: '#3498db', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                + Platform
              </button>
              <button onClick={addProjectNode} style={{
                padding: '10px 20px', background: '#e67e22', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                + Project
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={exportProject} style={{
                padding: '8px 16px', background: '#27ae60', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                💾 Save
              </button>
              <label style={{
                padding: '8px 16px', background: '#9b59b6', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                display: 'inline-block'
              }}>
                📂 Load
                <input type="file" accept=".json" onChange={importProject} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {selectedNode && (
        <FloatingPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={updateNodeData}
          initialPosition={floatingPanelPosition}
        />
      )}
    </div>
  );
}