import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Port } from '../../types';
import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function ManageHardwareTypesModal({ onClose, hardwareTypes, onAddType, onDeleteType, onUpdateType, onRefresh }: any) {
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📦');
  const [newDescription, setNewDescription] = useState('');
  const [customIconUrl, setCustomIconUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  
  // Edit state
  const [editingId, setEditingId] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCustomIconUrl, setEditCustomIconUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if types are from database
  const hasDbTypes = hardwareTypes.some(t => t.dbId);

  const handleAdd = async () => {
    if (!newName.trim()) {
      setError('Name is required');
      return;
    }
    
    setIsAdding(true);
    setError('');
    
    const iconToSave = customIconUrl || newIcon;
    console.log('🔧 Adding HW type:', {
      name: newName.trim(),
      iconLength: iconToSave?.length,
      iconPreview: iconToSave?.substring(0, 50) + '...',
      description: newDescription.trim()
    });
    
    try {
      const result = await onAddType({
        name: newName.trim(),
        icon: iconToSave,
        description: newDescription.trim()
      });
      console.log('🔧 Add result:', result);
      setNewName('');
      setNewIcon('📦');
      setNewDescription('');
      setCustomIconUrl('');
      // Refresh after adding
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('🔧 Add error:', err);
      setError(err.message || 'Failed to add hardware type');
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (type) => {
    setEditingId(type.dbId);
    setEditName(type.name);
    setEditIcon(type.icon || '📦');
    setEditDescription(type.description || '');
    // Check if icon is a URL
    if (type.icon?.startsWith('http') || type.icon?.startsWith('data:')) {
      setEditCustomIconUrl(type.icon);
      setEditIcon('📦');
    } else {
      setEditCustomIconUrl('');
      setEditIcon(type.icon || '📦');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditIcon('📦');
    setEditDescription('');
    setEditCustomIconUrl('');
  };

  const handleUpdate = async () => {
    if (!editName.trim()) {
      setError('Name is required');
      return;
    }
    
    setIsUpdating(true);
    setError('');
    
    const iconToSave = editCustomIconUrl || editIcon;
    console.log('🔧 Updating HW type:', {
      dbId: editingId,
      name: editName.trim(),
      iconLength: iconToSave?.length,
      iconPreview: iconToSave?.substring(0, 50) + '...',
      description: editDescription.trim()
    });
    
    try {
      const result = await onUpdateType(editingId, {
        name: editName.trim(),
        icon: iconToSave,
        description: editDescription.trim()
      });
      console.log('🔧 Update result:', result);
      cancelEdit();
      // Refresh to get the updated data
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('🔧 Update error:', err);
      setError(err.message || 'Failed to update hardware type');
    } finally {
      setIsUpdating(false);
    }
  };

  const commonEmojis = ['📦', '⚙️', '🔄', '🔋', '📡', '🎛️', '💧', '🌀', '⚡', '🔌', '🖥️', '🚰', '🔥', '❄️', '🔧', '⛽', '🛢️', '🎚️', '📊', '🔩'];

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      style={{
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
      }}
      onClick={(e: any) => {
        // Close when clicking backdrop (not the modal content)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        style={{
          background: '#2c3e50',
          padding: '30px',
          borderRadius: '12px',
          width: '600px',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
        onClick={(e: any) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ color: 'white', margin: 0 }}>🔧 Manage Hardware Types</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {onRefresh && (
              <button
                onClick={onRefresh}
                style={{
                  background: '#3498db',
                  border: 'none',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                title="Refresh from database"
              >
                🔄 Refresh
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#95a5a6',
                fontSize: '24px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Database Status */}
        <div style={{
          padding: '8px 12px',
          marginBottom: '15px',
          borderRadius: '6px',
          fontSize: '12px',
          background: hasDbTypes ? 'rgba(39, 174, 96, 0.2)' : 'rgba(231, 76, 60, 0.2)',
          color: hasDbTypes ? '#27ae60' : '#e74c3c',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {hasDbTypes ? (
            <>✅ Connected to database - {hardwareTypes.filter(t => t.dbId).length} types loaded</>
          ) : (
            <>⚠️ Using default types - Add a new type to save to database</>
          )}
        </div>

        {/* Add New Type Section */}
        <div style={{
          background: '#34495e',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#3498db', marginTop: 0, fontSize: '14px' }}>➕ Add New Type</h3>
          
          {error && (
            <div style={{ color: '#e74c3c', marginBottom: '10px', fontSize: '13px' }}>
              {error}
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', marginBottom: '5px' }}>
                NAME *
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e: any) => setNewName(e.target.value)}
                placeholder="e.g., PLC, VFD, HMI..."
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#2c3e50',
                  color: 'white',
                  border: '1px solid #4a5f7f',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', marginBottom: '5px' }}>
                ICON
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Upload Button */}
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 12px',
                  background: '#795548',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  📁 Upload
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e: any) => {
                      const file = e.target.files[0];
                      if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setCustomIconUrl(event.target.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                
                {/* Emoji Select */}
                <select
                  value={newIcon}
                  onChange={(e: any) => {
                    setNewIcon(e.target.value);
                    setCustomIconUrl('');
                  }}
                  style={{
                    padding: '10px',
                    background: '#2c3e50',
                    color: 'white',
                    border: '1px solid #4a5f7f',
                    borderRadius: '4px',
                    fontSize: '18px',
                    cursor: 'pointer'
                  }}
                >
                  {commonEmojis.map(emoji => (
                    <option key={emoji} value={emoji}>{emoji}</option>
                  ))}
                </select>
                
                {/* Show uploaded image preview or clear button */}
                {customIconUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img 
                      src={customIconUrl} 
                      alt="icon" 
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        objectFit: 'contain',
                        borderRadius: '4px',
                        background: 'white'
                      }} 
                    />
                    <button
                      onClick={() => setCustomIconUrl('')}
                      style={{
                        background: '#e74c3c',
                        border: 'none',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px'
                      }}
                      title="Remove uploaded icon"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <div style={{ fontSize: '9px', color: '#7f8c8d', marginTop: '4px' }}>
                💡 PNG/SVG with transparent background recommended
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', color: '#bdc3c7', fontSize: '11px', marginBottom: '5px' }}>
              DESCRIPTION
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e: any) => setNewDescription(e.target.value)}
              placeholder="Short description..."
              style={{
                width: '100%',
                padding: '10px',
                background: '#2c3e50',
                color: 'white',
                border: '1px solid #4a5f7f',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          
          {/* Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <span style={{ color: '#7f8c8d', fontSize: '12px' }}>Preview:</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: '#2c3e50',
              borderRadius: '6px'
            }}>
              {customIconUrl ? (
                <img src={customIconUrl} alt="icon" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '24px' }}>{newIcon}</span>
              )}
              <span style={{ color: 'white', fontWeight: 'bold' }}>{newName || 'Type Name'}</span>
            </div>
          </div>
          
          <button
            onClick={handleAdd}
            disabled={isAdding || !newName.trim()}
            style={{
              width: '100%',
              padding: '12px',
              background: isAdding ? '#7f8c8d' : '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isAdding ? 'wait' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isAdding ? 'Adding...' : '➕ Add Hardware Type'}
          </button>
        </div>

        {/* Existing Types List */}
        <div>
          <h3 style={{ color: '#bdc3c7', marginBottom: '15px', fontSize: '14px' }}>
            📋 Existing Types ({hardwareTypes.length})
          </h3>
          
          <div style={{ display: 'grid', gap: '8px' }}>
            {hardwareTypes.map((type) => (
              <div
                key={type.id || type.name}
                style={{
                  padding: '12px 15px',
                  background: editingId === type.dbId ? '#2c3e50' : '#34495e',
                  borderRadius: '6px',
                  border: editingId === type.dbId ? '2px solid #3498db' : '2px solid transparent'
                }}
              >
                {editingId === type.dbId ? (
                  /* Edit Mode */
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <label style={{ display: 'block', color: '#bdc3c7', fontSize: '10px', marginBottom: '4px' }}>NAME</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e: any) => setEditName(e.target.value)}
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
                      <div>
                        <label style={{ display: 'block', color: '#bdc3c7', fontSize: '10px', marginBottom: '4px' }}>ICON</label>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* Upload Button */}
                          <label style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            background: '#795548',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}>
                            📁
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e: any) => {
                                const file = e.target.files[0];
                                if (file && file.type.startsWith('image/')) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    setEditCustomIconUrl(event.target.result);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <select
                            value={editIcon}
                            onChange={(e: any) => {
                              setEditIcon(e.target.value);
                              setEditCustomIconUrl('');
                            }}
                            style={{
                              padding: '8px',
                              background: '#34495e',
                              color: 'white',
                              border: '1px solid #4a5f7f',
                              borderRadius: '4px',
                              fontSize: '16px'
                            }}
                          >
                            {commonEmojis.map(emoji => (
                              <option key={emoji} value={emoji}>{emoji}</option>
                            ))}
                          </select>
                          {editCustomIconUrl && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <img 
                                src={editCustomIconUrl} 
                                alt="icon" 
                                style={{ 
                                  width: '24px', 
                                  height: '24px', 
                                  objectFit: 'contain',
                                  borderRadius: '3px',
                                  background: 'white'
                                }} 
                              />
                              <button
                                onClick={() => setEditCustomIconUrl('')}
                                style={{
                                  background: '#e74c3c',
                                  border: 'none',
                                  color: 'white',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontSize: '9px'
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', color: '#bdc3c7', fontSize: '10px', marginBottom: '4px' }}>DESCRIPTION</label>
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e: any) => setEditDescription(e.target.value)}
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
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={cancelEdit}
                        style={{
                          padding: '6px 12px',
                          background: '#7f8c8d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdate}
                        disabled={isUpdating}
                        style={{
                          padding: '6px 12px',
                          background: isUpdating ? '#7f8c8d' : '#27ae60',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: isUpdating ? 'wait' : 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        {isUpdating ? 'Saving...' : '✓ Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {type.icon?.startsWith('http') || type.icon?.startsWith('data:') ? (
                        <img src={type.icon} alt={type.name} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '24px' }}>{type.icon || '📦'}</span>
                      )}
                      <div>
                        <div style={{ color: 'white', fontWeight: 'bold' }}>{type.name}</div>
                        {type.description && (
                          <div style={{ color: '#7f8c8d', fontSize: '11px' }}>{type.description}</div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => type.dbId ? startEdit(type) : alert('Default types cannot be edited. Add a new type to customize.')}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${type.dbId ? '#3498db' : '#7f8c8d'}`,
                          color: type.dbId ? '#3498db' : '#7f8c8d',
                          padding: '5px 10px',
                          borderRadius: '4px',
                          cursor: type.dbId ? 'pointer' : 'not-allowed',
                          fontSize: '11px',
                          opacity: type.dbId ? 1 : 0.5
                        }}
                        title={type.dbId ? "Edit this type" : "Default type - cannot edit"}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => type.dbId ? onDeleteType(type.dbId) : alert('Default types cannot be deleted.')}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${type.dbId ? '#e74c3c' : '#7f8c8d'}`,
                          color: type.dbId ? '#e74c3c' : '#7f8c8d',
                          padding: '5px 10px',
                          borderRadius: '4px',
                          cursor: type.dbId ? 'pointer' : 'not-allowed',
                          fontSize: '11px',
                          opacity: type.dbId ? 1 : 0.5
                        }}
                        title={type.dbId ? "Delete this type" : "Default type - cannot delete"}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 30px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Change Password Modal

export default ManageHardwareTypesModal;
