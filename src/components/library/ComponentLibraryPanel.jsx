import React, { useState } from 'react';

function ComponentLibraryPanel({ isOpen, onClose, nodes, onAddFromLibrary, libraryItems, onSaveToLibrary, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);

  if (!isOpen) return null;

  // Group items by type
  const groupedItems = (libraryItems || []).reduce((acc, item) => {
    const type = item.itemType || item.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  const filteredItems = (libraryItems || []).filter(item => {
    const matchesSearch = !searchTerm || 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || item.itemType === typeFilter || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '380px',
      height: '100vh',
      backgroundColor: '#1a252f',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
      zIndex: 3500,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid #34495e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>📚 Component Library</h3>
          <p style={{ margin: '5px 0 0', color: '#7f8c8d', fontSize: '12px' }}>Reusable components with version control</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#95a5a6', fontSize: '24px', cursor: 'pointer' }}>×</button>
      </div>

      {/* Search & Filter */}
      <div style={{ padding: '15px', borderBottom: '1px solid #34495e' }}>
        <input
          type="text"
          placeholder="🔍 Search components..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px', backgroundColor: '#34495e', color: '#fff', border: '1px solid #4a5f7f', borderRadius: '6px', marginBottom: '10px', boxSizing: 'border-box' }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ width: '100%', padding: '10px', backgroundColor: '#34495e', color: '#fff', border: '1px solid #4a5f7f', borderRadius: '6px' }}
        >
          <option value="all">All Types</option>
          <option value="system">🔷 Systems</option>
          <option value="subsystem">🔶 Sub-Systems</option>
          <option value="function">⚡ Functions</option>
          <option value="hardware">📦 Hardware</option>
          <option value="requirement">📋 Requirements</option>
        </select>
      </div>

      {/* Library Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#7f8c8d' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>📚</div>
            <div style={{ fontSize: '14px' }}>No components in library</div>
            <div style={{ fontSize: '12px', marginTop: '10px' }}>Save components from the canvas to build your library</div>
          </div>
        ) : (
          filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
              style={{
                padding: '12px',
                backgroundColor: selectedItem?.id === item.id ? '#34495e' : '#2c3e50',
                borderRadius: '8px',
                marginBottom: '10px',
                cursor: 'pointer',
                borderLeft: `3px solid ${item.itemType === 'system' ? '#1abc9c' : item.itemType === 'function' ? '#00bcd4' : '#3498db'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>{item.name}</span>
                <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#27ae60', borderRadius: '4px', color: '#fff' }}>
                  v{item.version || '1.0'}
                </span>
              </div>
              <div style={{ color: '#7f8c8d', fontSize: '11px', marginBottom: '6px' }}>{item.description || 'No description'}</div>
              {selectedItem?.id === item.id && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddFromLibrary && onAddFromLibrary(item); }}
                    style={{ flex: 1, padding: '8px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                  >
                    ➕ Add to Canvas
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '15px', borderTop: '1px solid #34495e' }}>
        <button
          onClick={onRefresh}
          style={{ width: '100%', padding: '10px', backgroundColor: '#34495e', color: '#fff', border: '1px solid #4a5f7f', borderRadius: '6px', cursor: 'pointer' }}
        >
          🔄 Refresh Library
        </button>
      </div>
    </div>
  );
}

export default ComponentLibraryPanel;
