import React from 'react';

function TextAnnotationToolbar({ node, onUpdate }) {
  const data = node.data;

  const updateData = (key, value) => {
    onUpdate(node.id, key, value);
  };

  const fontSizes = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48];
  const colors = ['#333333', '#e74c3c', '#e67e22', '#f1c40f', '#27ae60', '#3498db', '#9b59b6', '#ffffff'];
  const bgColors = [
    'transparent', 
    'rgba(255,255,200,0.9)', 
    'rgba(200,255,200,0.9)', 
    'rgba(200,220,255,0.9)',
    'rgba(255,200,200,0.9)',
    'rgba(220,200,255,0.9)',
    '#ffffff'
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#2c3e50',
      borderRadius: '12px',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      zIndex: 3000,
    }}>
      {/* Font Size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#7f8c8d', fontSize: '11px' }}>Size:</span>
        <select
          value={data.fontSize || 14}
          onChange={(e) => updateData('fontSize', parseInt(e.target.value))}
          style={{
            padding: '6px 10px',
            backgroundColor: '#34495e',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          {fontSizes.map(size => (
            <option key={size} value={size}>{size}px</option>
          ))}
        </select>
      </div>

      <div style={{ width: '1px', height: '24px', backgroundColor: '#4a5f7f' }} />

      {/* Text Color */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#7f8c8d', fontSize: '11px' }}>Color:</span>
        {colors.map(color => (
          <button
            key={color}
            onClick={() => updateData('textColor', color)}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              backgroundColor: color,
              border: data.textColor === color ? '2px solid #3498db' : '1px solid #4a5f7f',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>

      <div style={{ width: '1px', height: '24px', backgroundColor: '#4a5f7f' }} />

      {/* Background Color */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#7f8c8d', fontSize: '11px' }}>Bg:</span>
        {bgColors.map((color, i) => (
          <button
            key={i}
            onClick={() => updateData('bgColor', color)}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              backgroundColor: color === 'transparent' ? '#34495e' : color,
              border: data.bgColor === color ? '2px solid #3498db' : '1px solid #4a5f7f',
              cursor: 'pointer',
            }}
          >
            {color === 'transparent' && <span style={{ fontSize: '10px' }}>∅</span>}
          </button>
        ))}
      </div>

      <div style={{ width: '1px', height: '24px', backgroundColor: '#4a5f7f' }} />

      {/* Bold/Italic */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => updateData('fontWeight', data.fontWeight === 'bold' ? 'normal' : 'bold')}
          style={{
            padding: '6px 10px',
            backgroundColor: data.fontWeight === 'bold' ? '#3498db' : '#34495e',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          B
        </button>
        <button
          onClick={() => updateData('fontStyle', data.fontStyle === 'italic' ? 'normal' : 'italic')}
          style={{
            padding: '6px 10px',
            backgroundColor: data.fontStyle === 'italic' ? '#3498db' : '#34495e',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontStyle: 'italic',
          }}
        >
          I
        </button>
      </div>
    </div>
  );
}

export default TextAnnotationToolbar;
