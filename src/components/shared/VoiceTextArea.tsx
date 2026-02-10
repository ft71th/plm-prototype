import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Port } from '../../types';
import React, { useState } from 'react';

function VoiceTextArea({ value, onChange, placeholder, disabled, style, minHeight = '80px' }: any) {
  const [isRecording, setIsRecording] = useState(false);

  const handleVoice = () => {
    if (window.startVoiceDictation) {
      setIsRecording(true);
      window.startVoiceDictation((text) => {
        // Append to existing text with space
        const newValue = value ? value + ' ' + text : text;
        onChange(newValue);
        setIsRecording(false);
      });
      // Auto-stop recording state after 3 seconds (safety)
      setTimeout(() => setIsRecording(false), 3000);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          ...style,
          minHeight,
          paddingRight: '40px'
        }}
      />
      {!disabled && (
        <button
          onClick={handleVoice}
          type="button"
          style={{
            position: 'absolute',
            right: '8px',
            top: '8px',
            background: isRecording ? '#e74c3c' : '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {isRecording ? '⏺️' : '🎤'}
        </button>
      )}
    </div>
  );
}

export default VoiceTextArea;
