import { useState, useCallback } from 'react';

/**
 * Voice recognition for commands and dictation.
 */
export default function useVoiceRecognition({
  addSystemNode, addSubSystemNode, addFunctionNode,
  addRequirementNode, addTestCaseNode, addPlatformNode,
  addUseCaseNode, addActorNode,
  exportProject, exportToExcel,
  undo, redo,
  setShowNewObjectModal,
}) {
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');

  const startVoiceRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus('🎤 Listening...');
    };

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase();
      setVoiceStatus(`Heard: "${command}"`);

      if (command.includes('create system') || command.includes('add system')) {
        addSystemNode();
        setVoiceStatus('✅ Created System node');
      } else if (command.includes('create subsystem') || command.includes('add subsystem') || command.includes('create sub system') || command.includes('add sub system')) {
        addSubSystemNode();
        setVoiceStatus('✅ Created Sub-System node');
      } else if (command.includes('create function') || command.includes('add function')) {
        addFunctionNode();
        setVoiceStatus('✅ Created Function node');
      } else if (command.includes('create requirement') || command.includes('add requirement')) {
        addRequirementNode();
        setVoiceStatus('✅ Created Requirement node');
      } else if (command.includes('create test') || command.includes('add test')) {
        addTestCaseNode();
        setVoiceStatus('✅ Created Test Case node');
      } else if (command.includes('create platform') || command.includes('add platform')) {
        addPlatformNode();
        setVoiceStatus('✅ Created Platform node');
      } else if (command.includes('save project') || command.includes('save')) {
        exportProject();
        setVoiceStatus('✅ Project saved');
      } else if (command.includes('export excel') || command.includes('excel export')) {
        exportToExcel();
        setVoiceStatus('✅ Exported to Excel');
      } else if (command.includes('fit view') || command.includes('fit screen') || command.includes('zoom fit')) {
        setVoiceStatus('💡 Press F to fit view');
      } else if (command.includes('new object') || command.includes('new project')) {
        setShowNewObjectModal(true);
        setVoiceStatus('✅ Opening New Object dialog');
      } else if (command.includes('undo')) {
        undo();
        setVoiceStatus('✅ Undo');
      } else if (command.includes('redo')) {
        redo();
        setVoiceStatus('✅ Redo');
      } else if (command.includes('help') || command.includes('commands')) {
        setVoiceStatus('💡 Say: create system/requirement/test, save, undo, redo');
      } else {
        setVoiceStatus(`❓ Unknown: "${command}"`);
      }

      setTimeout(() => setVoiceStatus(''), 3000);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setVoiceStatus(`❌ Error: ${event.error}`);
      setTimeout(() => setVoiceStatus(''), 3000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [addSystemNode, addSubSystemNode, addFunctionNode, addRequirementNode, addTestCaseNode, addPlatformNode, addUseCaseNode, addActorNode, exportProject, exportToExcel, undo, redo, setShowNewObjectModal]);

  const startVoiceDictation = useCallback((callback) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition not supported. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      callback(text);
    };

    recognition.onerror = (event) => {
      console.error('Voice error:', event.error);
    };

    recognition.start();
  }, []);

  return {
    isListening,
    voiceStatus,
    startVoiceRecognition,
    startVoiceDictation,
  };
}
