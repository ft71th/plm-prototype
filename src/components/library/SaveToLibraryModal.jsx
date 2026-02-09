import React, { useState } from 'react';

function SaveToLibraryModal({ node, onClose, onSave }) {
  const [name, setName] = useState(node?.data?.label || '');
  const [description, setDescription] = useState(node?.data?.description || '');
  const [version, setVersion] = useState('1.0');

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a name');
      return;
    }
    onSave({
      name: name.trim(),
      description: description.trim(),
      version,
      itemType: node?.data?.itemType || node?.data?.type,
      nodeData: node?.data,
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000,
    }}>
      <div style={{
        backgroundColor: '#2c3e50',
        borderRadius: '12px',
        padding: '30px',
        width: '450px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      }}>
        <h2 style={{ color: '#fff', marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
          📚 Save to Library
        </h2>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>
            Component Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#34495e',
              color: '#fff',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '12px',
              backgroundColor: '#34495e',
              color: '#fff',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>
            Version
          </label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#34495e',
              color: '#fff',
              border: '1px solid #4a5f7f',
              borderRadius: '6px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '12px 24px', backgroundColor: '#7f8c8d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{ padding: '12px 24px', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            📚 Save to Library
          </button>
        </div>
      </div>
    </div>
  );
}


export default SaveToLibraryModal;
