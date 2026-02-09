import React, { useState } from 'react';

function PortEditor({ ports = [], onChange, disabled }) {
  const [newPortName, setNewPortName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const addPort = (direction) => {
    if (!newPortName.trim()) return;
    
    // Auto-infer type from name
    const inferType = (name) => {
      const n = name.toLowerCase();
      if (n.includes('clk') || n.includes('clock')) return 'clock';
      if (n.includes('rst') || n.includes('reset')) return 'reset';
      if (n.includes('en') || n.includes('enable')) return 'control';
      if (n.match(/\[\d+:\d+\]/) || n.includes('bus') || n.includes('data')) return 'bus';
      return 'signal';
    };

    // Extract bus width from name like "data[7:0]"
    const extractWidth = (name) => {
      const match = name.match(/\[(\d+):(\d+)\]/);
      if (match) {
        return Math.abs(parseInt(match[1]) - parseInt(match[2])) + 1;
      }
      return null;
    };

    // Clean name (remove bus notation for display)
    const cleanName = newPortName.replace(/\[\d+:\d+\]/, '').trim();
    
    const newPort = {
      id: `port-${Date.now()}`,
      name: cleanName || newPortName,
      direction: direction,
      type: inferType(newPortName),
      width: extractWidth(newPortName),
    };
    
    onChange([...ports, newPort]);
    setNewPortName('');
    setIsAdding(false);
  };

  const removePort = (portId) => {
    onChange(ports.filter(p => p.id !== portId));
  };

  const updatePort = (portId, field, value) => {
    onChange(ports.map(p => 
      p.id === portId ? { ...p, [field]: value } : p
    ));
  };

  const inputPorts = ports.filter(p => p.direction === 'input' || p.type === 'input');
  const outputPorts = ports.filter(p => p.direction === 'output' || p.type === 'output');

  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{
        display: 'block',
        marginBottom: '8px',
        fontSize: '11px',
        color: '#3498db',
        textTransform: 'uppercase',
        fontWeight: 'bold'
      }}>
        🔌 Interfaces / Ports
      </label>

      {/* Input Ports */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ 
          fontSize: '10px', 
          color: '#27ae60', 
          fontWeight: 'bold',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          ○ INPUTS ({inputPorts.length})
        </div>
        {inputPorts.map(port => (
          <div key={port.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            background: '#1a3a1a',
            borderRadius: '4px',
            marginBottom: '4px',
            fontSize: '12px'
          }}>
            <span style={{ color: '#27ae60' }}>○</span>
            <input
              type="text"
              value={port.name}
              onChange={(e) => updatePort(port.id, 'name', e.target.value)}
              disabled={disabled}
              onFocus={(e) => e.target.select()}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '12px',
                outline: 'none'
              }}
            />
            {port.width && (
              <span style={{ color: '#7f8c8d', fontSize: '10px' }}>
                [{port.width - 1}:0]
              </span>
            )}
            <span style={{ 
              color: '#7f8c8d', 
              fontSize: '9px',
              background: '#2c3e50',
              padding: '2px 6px',
              borderRadius: '3px'
            }}>
              {port.type}
            </span>
            {!disabled && (
              <button
                onClick={() => removePort(port.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#e74c3c',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '0 4px'
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Output Ports */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ 
          fontSize: '10px', 
          color: '#e67e22', 
          fontWeight: 'bold',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          ● OUTPUTS ({outputPorts.length})
        </div>
        {outputPorts.map(port => (
          <div key={port.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            background: '#3a2a1a',
            borderRadius: '4px',
            marginBottom: '4px',
            fontSize: '12px'
          }}>
            <span style={{ color: '#e67e22' }}>●</span>
            <input
              type="text"
              value={port.name}
              onChange={(e) => updatePort(port.id, 'name', e.target.value)}
              disabled={disabled}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '12px',
                outline: 'none'
              }}
            />
            {port.width && (
              <span style={{ color: '#7f8c8d', fontSize: '10px' }}>
                [{port.width - 1}:0]
              </span>
            )}
            <span style={{ 
              color: '#7f8c8d', 
              fontSize: '9px',
              background: '#2c3e50',
              padding: '2px 6px',
              borderRadius: '3px'
            }}>
              {port.type}
            </span>
            {!disabled && (
              <button
                onClick={() => removePort(port.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#e74c3c',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '0 4px'
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Port UI */}
      {!disabled && (
        <>
          {isAdding ? (
            <div style={{
              background: '#34495e',
              padding: '10px',
              borderRadius: '6px'
            }}>
              <input
                autoFocus
                type="text"
                value={newPortName}
                onChange={(e) => setNewPortName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewPortName('');
                  }
                }}
                placeholder="Port name (e.g., clk, data[7:0], enable)"
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#2c3e50',
                  color: 'white',
                  border: '1px solid #4a5f7f',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginBottom: '8px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => addPort('input')}
                  disabled={!newPortName.trim()}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: newPortName.trim() ? '#27ae60' : '#34495e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: newPortName.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                >
                  ○ Add Input
                </button>
                <button
                  onClick={() => addPort('output')}
                  disabled={!newPortName.trim()}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: newPortName.trim() ? '#e67e22' : '#34495e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: newPortName.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                >
                  ● Add Output
                </button>
              </div>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewPortName('');
                }}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '6px',
                  background: 'transparent',
                  color: '#7f8c8d',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              style={{
                width: '100%',
                padding: '8px',
                background: '#34495e',
                color: '#3498db',
                border: '1px dashed #3498db',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              + Add Port
            </button>
          )}
        </>
      )}

      {/* Help text */}
      <div style={{ 
        fontSize: '9px', 
        color: '#7f8c8d', 
        marginTop: '8px' 
      }}>
        💡 Tip: Use "clk", "rst", "data[7:0]" - type auto-detected!
      </div>
    </div>
  );
}

export default PortEditor;
