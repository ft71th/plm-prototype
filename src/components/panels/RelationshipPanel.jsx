import React from 'react';
import { RELATIONSHIP_TYPES } from '../../constants/relationships';

function RelationshipPanel({ edge, onClose, onUpdate, position }) {
  return (
    <div 
      onClick={(e) => e.stopPropagation()}  
        style={{
        position: 'fixed',
        left: position.x + 'px',
        top: position.y + 'px',
        background: '#2c3e50',
        borderRadius: '8px',
        padding: '15px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 3000,
        color: 'white',
        minWidth: '250px'
      }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        borderBottom: '2px solid #34495e',
        paddingBottom: '8px'
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>🔗 Edit Relationship</span>
        <button onClick={onClose} style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          fontSize: '18px',
          cursor: 'pointer'
        }}>×</button>
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'block',
          fontSize: '11px',
          color: '#bdc3c7',
          marginBottom: '6px',
          textTransform: 'uppercase',
          fontWeight: 'bold'
        }}>
          Relationship Type
        </label>
        <select
          value={edge.data?.relationType || 'related'}
          onChange={(e) => onUpdate(edge.id, 'relationType', e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            background: '#34495e',
            color: 'white',
            border: '1px solid #4a5f7f',
            borderRadius: '4px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          {Object.entries(RELATIONSHIP_TYPES).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        marginTop: '12px'
      }}>
        {Object.entries(RELATIONSHIP_TYPES).map(([key, value]) => (
          <button
            key={key}
            onClick={() => onUpdate(edge.id, 'relationType', key)}
            style={{
              padding: '8px',
              background: edge.data?.relationType === key ? value.color : '#34495e',
              color: 'white',
              border: `2px solid ${value.color}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            {value.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '15px' }}>
        <label style={{
          display: 'block',
          fontSize: '11px',
          color: '#bdc3c7',
          marginBottom: '6px',
          textTransform: 'uppercase',
          fontWeight: 'bold'
        }}>

        {/* Custom Label - for Whiteboard mode */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{
          display: 'block',
          fontSize: '11px',
          color: '#3498db',
          marginBottom: '6px',
          textTransform: 'uppercase',
          fontWeight: 'bold'
        }}>
          🏷️ Custom Label (Whiteboard)
        </label>
        <input
          type="text"
          value={edge.data?.customLabel || ''}
          onChange={(e) => onUpdate(edge.id, 'customLabel', e.target.value)}
          placeholder="e.g., clock signal, data bus..."
          style={{
            width: '100%',
            padding: '8px',
            background: '#34495e',
            color: 'white',
            border: '1px solid #3498db',
            borderRadius: '4px',
            fontSize: '13px'
          }}
        />
        <div style={{ fontSize: '9px', color: '#7f8c8d', marginTop: '4px' }}>
          Shown instead of relationship type in Whiteboard mode
        </div>
      </div>

      {/* Signal Info - shown when ports are connected */}
      {(edge.data?.signalType || edge.data?.busWidth) && (
        <div style={{ 
          marginBottom: '15px',
          padding: '10px',
          background: '#1a2634',
          borderRadius: '6px'
        }}>
          <label style={{
            display: 'block',
            fontSize: '11px',
            color: '#9b59b6',
            marginBottom: '8px',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            📡 Signal Info
          </label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '8px',
            fontSize: '12px'
          }}>
            {edge.data?.signalType && (
              <div>
                <span style={{ color: '#7f8c8d' }}>Type: </span>
                <span style={{ color: '#3498db', fontWeight: 'bold' }}>
                  {edge.data.signalType}
                </span>
              </div>
            )}
            {edge.data?.busWidth && (
              <div>
                <span style={{ color: '#7f8c8d' }}>Width: </span>
                <span style={{ color: '#e67e22', fontWeight: 'bold' }}>
                  {edge.data.busWidth}-bit
                </span>
              </div>
            )}
          </div>
          {edge.data?.sourcePort && (
            <div style={{ marginTop: '6px', fontSize: '10px', color: '#7f8c8d' }}>
              From port: <span style={{ color: '#27ae60' }}>{edge.data.sourcePort}</span>
              {edge.data?.targetPort && (
                <> → To port: <span style={{ color: '#e67e22' }}>{edge.data.targetPort}</span></>
              )}
            </div>
          )}
        </div>
      )}

          📝 Notes / Rationale
        </label>
        <textarea
          value={edge.data?.notes || ''}
          onChange={(e) => onUpdate(edge.id, 'notes', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Why is this relationship needed? Add context..."
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '8px',
            background: '#34495e',
            color: 'white',
            border: '1px solid #4a5f7f',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      </div>
    </div>
  );
}

export default RelationshipPanel;
