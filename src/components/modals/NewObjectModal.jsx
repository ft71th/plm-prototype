import React, { useState } from 'react';

function NewObjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name, version, description);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000
    }}>
      <div style={{
        background: '#2c3e50',
        borderRadius: '12px',
        padding: '30px',
        width: '450px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ color: 'white', marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
          🚢 Create New Object Definition
        </h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            color: '#bdc3c7',
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            marginBottom: '6px'
          }}>
            Object Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Propulsion Control System"
            autoFocus
            style={{
              width: '100%',
              padding: '12px',
              background: '#34495e',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            color: '#bdc3c7',
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            marginBottom: '6px'
          }}>
            Version
          </label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0"
            style={{
              width: '100%',
              padding: '12px',
              background: '#34495e',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            color: '#bdc3c7',
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            marginBottom: '6px'
          }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this object? What does it control?"
            style={{
              width: '100%',
              padding: '12px',
              background: '#34495e',
              color: 'white',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#7f8c8d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            style={{
              padding: '10px 20px',
              background: name.trim() ? '#27ae60' : '#7f8c8d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🚀 Create Object
          </button>
        </div>
      </div>
    </div>
  );
}

// Collapsible Sidebar Component

export default NewObjectModal;
