import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { LINK_TYPES, LINK_STATUSES, LinkBadge, NodeLinkSection } from './RequirementLinks';

// ─────────────────────────────────────────────────
// BLOCK TYPES
// ─────────────────────────────────────────────────
const BLOCK_TYPES = {
  text:     { label: 'Text',         icon: '📝', description: 'Free text paragraph' },
  heading:  { label: 'Heading',      icon: '📌', description: 'Section heading' },
  node:     { label: 'Node Block',   icon: '📋', description: 'Embed a node (requirement, system, function...)' },
  table:    { label: 'Query Table',  icon: '📊', description: 'Dynamic filtered table of nodes' },
  linkmap:  { label: 'Link Map',     icon: '🔗', description: 'Show all links for a node' },
  divider:  { label: 'Divider',      icon: '—',  description: 'Horizontal separator' },
  image:    { label: 'Image',        icon: '🖼️', description: 'Image reference' },
};

// ─────────────────────────────────────────────────
// COMMAND PALETTE
// ─────────────────────────────────────────────────
const COMMANDS = [
  { cmd: '/text',     type: 'text',    label: 'Text block',       icon: '📝', description: 'Add free text' },
  { cmd: '/heading',  type: 'heading', label: 'Heading',          icon: '📌', description: 'Add a section heading' },
  { cmd: '/req',      type: 'node',    label: 'Insert Requirement', icon: '📋', description: 'Embed existing requirement' },
  { cmd: '/node',     type: 'node',    label: 'Insert Node',      icon: '🔷', description: 'Embed any node' },
  { cmd: '/newreq',   type: 'newnode', label: 'New Requirement',  icon: '➕', description: 'Create new requirement inline' },
  { cmd: '/table',    type: 'table',   label: 'Query Table',      icon: '📊', description: 'Dynamic node table with filters' },
  { cmd: '/link',     type: 'link',    label: 'Create Link',      icon: '🔗', description: 'Link two requirements' },
  { cmd: '/linkmap',  type: 'linkmap', label: 'Link Map',         icon: '🗺️', description: 'Show all links for a node' },
  { cmd: '/impact',   type: 'impact',  label: 'Impact Analysis',  icon: '💥', description: 'Show what changes if node version changes' },
  { cmd: '/baseline', type: 'baseline',label: 'Baseline Links',   icon: '📌', description: 'Pin all floating links in document' },
  { cmd: '/divider',  type: 'divider', label: 'Divider',          icon: '—',  description: 'Horizontal line' },
  { cmd: '/postit',   type: 'postit',  label: 'Post-it',          icon: '📌', description: 'Add a sticky note' },
  { cmd: '/health',   type: 'health',  label: 'Health Check',     icon: '🏥', description: 'Show link health issues' },
];

let blockIdCounter = 0;
function newBlockId() {
  blockIdCounter++;
  return `block-${Date.now()}-${blockIdCounter}`;
}

// ─────────────────────────────────────────────────
// MAIN COMPONENT: DocumentViewEnhanced
// ─────────────────────────────────────────────────
export default function DocumentViewEnhanced({
  nodes,
  edges,
  onNodeClick,
  onUpdateNodeData,
  requirementLinks = [],
  onCreateLink,
  onRemoveLink,
  onPinLink,
  onUnpinLink,
  onUpdateLinkStatus,
  onUpdateLink,
  onBaselineAll,
  onCreateNode,
  onCreatePostIt,
  healthIssues = [],
  user = 'unknown',
}) {
  // Document blocks state
  const [blocks, setBlocks] = useState(() => buildInitialBlocks(nodes, edges));
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [commandInsertIdx, setCommandInsertIdx] = useState(null);
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [nodePickerCallback, setNodePickerCallback] = useState(null);
  const [showLinkCreator, setShowLinkCreator] = useState(false);
  const [linkCreatorSourceId, setLinkCreatorSourceId] = useState(null);
  const commandInputRef = useRef(null);

  // Rebuild blocks when nodes change significantly
  const nodeCount = nodes.length;
  useEffect(() => {
    // Only auto-rebuild if there are no custom blocks yet (initial state)
    if (blocks.length <= 1 && nodeCount > 0) {
      setBlocks(buildInitialBlocks(nodes, edges));
      return;
    }

    // Auto-add blocks for newly created nodes not yet in any block
    const existingNodeIds = new Set();
    blocks.forEach(b => {
      if (b.type === 'node' && b.data.nodeId) existingNodeIds.add(b.data.nodeId);
      if (b.type === 'postit' && b.data.nodeId) existingNodeIds.add(b.data.nodeId);
    });

    const newNodes = nodes.filter(n => 
      !existingNodeIds.has(n.id) && 
      !n.data?.isFloatingConnector &&
      n.type !== 'imageNode' // skip images in doc view
    );

    if (newNodes.length > 0) {
      setBlocks(prev => {
        const additions = [];
        newNodes.forEach(node => {
          if (node.data?.itemType === 'postIt') {
            additions.push({
              id: newBlockId(),
              type: 'postit',
              data: { nodeId: node.id },
            });
          } else {
            additions.push({
              id: newBlockId(),
              type: 'node',
              data: { nodeId: node.id, expanded: false },
            });
          }
        });
        return [...prev, ...additions];
      });
    }
  }, [nodeCount]);

  // ─── Block CRUD ────────────────────────────────
  const addBlock = useCallback((type, data = {}, afterIdx = null) => {
    const newBlock = { id: newBlockId(), type, data };
    setBlocks(prev => {
      if (afterIdx !== null && afterIdx >= 0) {
        const copy = [...prev];
        copy.splice(afterIdx + 1, 0, newBlock);
        return copy;
      }
      return [...prev, newBlock];
    });
    return newBlock.id;
  }, []);

  const updateBlock = useCallback((blockId, updates) => {
    setBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, data: { ...b.data, ...updates } } : b
    ));
  }, []);

  const removeBlock = useCallback((blockId) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
  }, []);

  const moveBlock = useCallback((blockId, direction) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId);
      if (idx < 0) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;
      const copy = [...prev];
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      [copy[idx], copy[swap]] = [copy[swap], copy[idx]];
      return copy;
    });
  }, []);

  // ─── Command palette ──────────────────────────
  const openCommandPalette = useCallback((afterIdx) => {
    setCommandInsertIdx(afterIdx);
    setCommandSearch('');
    setShowCommandPalette(true);
    setTimeout(() => commandInputRef.current?.focus(), 50);
  }, []);

  const executeCommand = useCallback((cmd) => {
    setShowCommandPalette(false);
    const idx = commandInsertIdx ?? blocks.length - 1;

    switch (cmd.type) {
      case 'text':
        addBlock('text', { content: '' }, idx);
        break;
      case 'heading':
        addBlock('heading', { content: '', level: 2 }, idx);
        break;
      case 'node':
        // Open node picker, then insert node block
        setNodePickerCallback(() => (nodeId) => {
          addBlock('node', { nodeId, expanded: false }, idx);
          setShowNodePicker(false);
        });
        setShowNodePicker(true);
        break;
      case 'newnode':
        if (onCreateNode) {
          const newNode = onCreateNode();
          if (newNode) {
            addBlock('node', { nodeId: newNode.id, expanded: true }, idx);
          }
        }
        break;
      case 'table':
        addBlock('table', {
          filters: { type: 'all', status: 'all', priority: 'all', reqType: 'all' },
          sortBy: 'reqId',
          columns: ['reqId', 'label', 'status', 'priority', 'version'],
        }, idx);
        break;
      case 'link':
        setLinkCreatorSourceId(null);
        setShowLinkCreator(true);
        break;
      case 'linkmap':
        setNodePickerCallback(() => (nodeId) => {
          addBlock('linkmap', { nodeId }, idx);
          setShowNodePicker(false);
        });
        setShowNodePicker(true);
        break;
      case 'impact':
        setNodePickerCallback(() => (nodeId) => {
          addBlock('linkmap', { nodeId, showImpact: true }, idx);
          setShowNodePicker(false);
        });
        setShowNodePicker(true);
        break;
      case 'baseline':
        if (onBaselineAll) onBaselineAll(nodes);
        break;
      case 'divider':
        addBlock('divider', {}, idx);
        break;
      case 'postit':
        if (onCreatePostIt) {
          onCreatePostIt();
          // The useEffect for nodeCount will auto-add the block
        }
        break;
      case 'health':
        addBlock('table', {
          filters: { type: 'all', status: 'all' },
          mode: 'health',
        }, idx);
        break;
      default:
        break;
    }
  }, [commandInsertIdx, blocks.length, addBlock, nodes, onCreateNode, onCreatePostIt, onBaselineAll]);

  const filteredCommands = COMMANDS.filter(c =>
    !commandSearch || 
    c.cmd.includes(commandSearch.toLowerCase()) ||
    c.label.toLowerCase().includes(commandSearch.toLowerCase())
  );

  // ─── Export functions ─────────────────────────
  const exportToWord = async () => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
    const docChildren = [];
    
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'System Documentation', bold: true, size: 48 })],
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 }
      })
    );
    
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ 
          text: `Generated on ${new Date().toLocaleDateString()} • ${nodes.length} items • ${requirementLinks.length} links`, 
          color: '666666', size: 24 
        })],
        spacing: { after: 600 }
      })
    );

    blocks.forEach(block => {
      if (block.type === 'heading') {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: block.data.content || 'Untitled', bold: true })],
            heading: block.data.level === 1 ? HeadingLevel.HEADING_1 : 
                     block.data.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 200 }
          })
        );
      } else if (block.type === 'text') {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: block.data.content || '' })],
            spacing: { after: 200 }
          })
        );
      } else if (block.type === 'node') {
        const node = nodes.find(n => n.id === block.data.nodeId);
        if (node) {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: `[${(node.data?.itemType || 'REQ').toUpperCase()}] `, bold: true, color: '3498db' }),
                new TextRun({ text: `${node.data?.reqId || ''} — ${node.data?.label || ''}`, bold: true }),
                new TextRun({ text: ` (v${node.data?.version || '1.0'})`, color: '666666' }),
              ],
              spacing: { before: 200, after: 100 }
            })
          );
          if (node.data?.description) {
            docChildren.push(
              new Paragraph({
                children: [new TextRun({ text: node.data.description })],
                spacing: { after: 200 }
              })
            );
          }
        }
      }
    });

    const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `System_Doc_${new Date().toISOString().split('T')[0]}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const el = document.getElementById('doc-content-area');
    if (!el) return;
    
    const clone = el.cloneNode(true);
    clone.style.background = 'white';
    clone.style.color = '#333';
    clone.querySelectorAll('*').forEach(node => {
      if (node.style) {
        if (node.style.color === 'rgb(236, 240, 241)' || node.style.color === '#ecf0f1') node.style.color = '#333';
        if (node.style.color === 'rgb(189, 195, 199)' || node.style.color === '#bdc3c7') node.style.color = '#555';
      }
    });
    
    document.body.appendChild(clone);
    await html2pdf().set({
      margin: [15, 15, 15, 15],
      filename: `System_Doc_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(clone).save();
    document.body.removeChild(clone);
  };

  // ─── Render ───────────────────────────────────
  return (
    <div style={{
      position: 'fixed',
      top: '50px',
      left: 0,
      right: 0,
      bottom: 0,
      background: '#1a1a2e',
      overflowY: 'auto',
      padding: '40px',
    }}>
      {/* Document Container */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: '#1e2a3a',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        padding: '40px 50px',
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px',
          paddingBottom: '20px',
          borderBottom: '2px solid var(--nl-border, #34495e)',
        }}>
          <h1 style={{ fontSize: '28px', color: 'var(--nl-text-primary, #ecf0f1)', margin: '0 0 10px 0' }}>
            📄 System Documentation
          </h1>
          <p style={{ color: 'var(--nl-text-secondary, #7f8c8d)', fontSize: '13px', marginBottom: '16px' }}>
            {nodes.length} items • {edges.length} relationships • {requirementLinks.length} requirement links • {blocks.length} blocks
          </p>
          
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={exportToWord} style={toolbarBtnStyle('#3498db')}>📥 Export Word</button>
            <button onClick={exportToPDF} style={toolbarBtnStyle('#e74c3c')}>📥 Export PDF</button>
            <button onClick={() => openCommandPalette(blocks.length - 1)} style={toolbarBtnStyle('#27ae60')}>
              ➕ Add Block
            </button>
            <button onClick={() => setBlocks(buildInitialBlocks(nodes, edges))} style={toolbarBtnStyle('#9b59b6')}>
              🔄 Rebuild from PLM
            </button>
          </div>
        </div>

        {/* Block Content */}
        <div id="doc-content-area">
          {blocks.length === 0 ? (
            <EmptyState onAddBlock={() => openCommandPalette(-1)} />
          ) : (
            blocks.map((block, idx) => (
              <BlockWrapper
                key={block.id}
                block={block}
                index={idx}
                nodes={nodes}
                edges={edges}
                requirementLinks={requirementLinks}
                healthIssues={healthIssues}
                onUpdate={updateBlock}
                onRemove={removeBlock}
                onMove={moveBlock}
                onInsertAfter={() => openCommandPalette(idx)}
                onNodeClick={onNodeClick}
                onUpdateNodeData={onUpdateNodeData}
                onCreateLink={onCreateLink}
                onRemoveLink={onRemoveLink}
                onPinLink={onPinLink}
                onUnpinLink={onUnpinLink}
                onUpdateLinkStatus={onUpdateLinkStatus}
                onUpdateLink={onUpdateLink}
              />
            ))
          )}
        </div>

        {/* Add block button at bottom */}
        <div
          onClick={() => openCommandPalette(blocks.length - 1)}
          style={{
            textAlign: 'center',
            padding: '20px',
            margin: '20px 0',
            border: '2px dashed var(--nl-border, #34495e)',
            borderRadius: '8px',
            color: 'var(--nl-text-muted, #7f8c8d)',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.2s',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#3498db'; e.currentTarget.style.color = '#3498db'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = '#34495e'; e.currentTarget.style.color = '#7f8c8d'; }}
        >
          ➕ Add block (or type / for commands)
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '30px',
          paddingTop: '15px',
          borderTop: '2px solid var(--nl-border, #34495e)',
          textAlign: 'center',
          color: 'var(--nl-text-muted, #7f8c8d)',
          fontSize: '11px',
        }}>
          Generated on {new Date().toLocaleDateString()} • Northlight PLM
        </div>
      </div>

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <CommandPaletteModal
          ref={commandInputRef}
          search={commandSearch}
          onSearchChange={setCommandSearch}
          commands={filteredCommands}
          onSelect={executeCommand}
          onClose={() => setShowCommandPalette(false)}
        />
      )}

      {/* Node Picker Modal */}
      {showNodePicker && (
        <NodePickerModal
          nodes={nodes}
          onSelect={(nodeId) => {
            if (nodePickerCallback) nodePickerCallback(nodeId);
            setShowNodePicker(false);
          }}
          onClose={() => setShowNodePicker(false)}
        />
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────
// BUILD INITIAL BLOCKS FROM PLM DATA
// ─────────────────────────────────────────────────
function buildInitialBlocks(nodes, edges) {
  const blocks = [];
  
  // Build hierarchy (same logic as original DocumentView)
  const containsEdges = edges.filter(e =>
    e.data?.relationType === 'contains' || e.data?.relationType === 'provides'
  );
  const childIds = new Set(containsEdges.map(e => e.target));
  const rootNodes = nodes.filter(n => !childIds.has(n.id) && !n.data?.isFloatingConnector);
  
  rootNodes.sort((a, b) => {
    if (Math.abs(a.position.y - b.position.y) < 50) return a.position.x - b.position.x;
    return a.position.y - b.position.y;
  });

  const getChildren = (nodeId) => {
    const childEdges = containsEdges.filter(e => e.source === nodeId);
    const children = childEdges.map(e => nodes.find(n => n.id === e.target)).filter(Boolean);
    children.sort((a, b) => {
      if (Math.abs(a.position.y - b.position.y) < 50) return a.position.x - b.position.x;
      return a.position.y - b.position.y;
    });
    return children;
  };

  const addNodeBlocks = (node, level) => {
    // Skip images in doc view
    if (node.type === 'imageNode' || node.data?.itemType === 'image') return;

    // Post-it notes get their own block type
    if (node.type === 'postIt' || node.data?.itemType === 'postIt') {
      blocks.push({
        id: newBlockId(),
        type: 'postit',
        data: { nodeId: node.id },
      });
      return;
    }

    // Add heading for systems/subsystems/functions
    if (['system', 'subsystem', 'function'].includes(node.data?.itemType)) {
      blocks.push({
        id: newBlockId(),
        type: 'heading',
        data: {
          content: node.data?.label || 'Untitled',
          level: Math.min(level + 1, 3),
          autoGenerated: true,
        },
      });
    }

    // Add node block
    blocks.push({
      id: newBlockId(),
      type: 'node',
      data: { nodeId: node.id, expanded: false },
    });

    // Add description as text if exists
    if (node.data?.description) {
      blocks.push({
        id: newBlockId(),
        type: 'text',
        data: { content: node.data.description, autoGenerated: true },
      });
    }

    // Recurse into children
    const children = getChildren(node.id);
    children.forEach(child => addNodeBlocks(child, level + 1));
  };

  rootNodes.forEach(root => addNodeBlocks(root, 0));

  // If no nodes, add a welcome block
  if (blocks.length === 0) {
    blocks.push({
      id: newBlockId(),
      type: 'text',
      data: { content: 'Start adding blocks using the + button or type / for commands.' },
    });
  }

  return blocks;
}


// ─────────────────────────────────────────────────
// BLOCK WRAPPER (handles common controls)
// ─────────────────────────────────────────────────
function BlockWrapper({
  block, index, nodes, edges, requirementLinks, healthIssues,
  onUpdate, onRemove, onMove, onInsertAfter,
  onNodeClick, onUpdateNodeData,
  onCreateLink, onRemoveLink, onPinLink, onUnpinLink, onUpdateLinkStatus, onUpdateLink,
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ position: 'relative', marginBottom: '4px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Block controls (left gutter) */}
      {hovered && (
        <div style={{
          position: 'absolute',
          left: '-40px',
          top: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          zIndex: 10,
        }}>
          <button onClick={() => onMove(block.id, 'up')} style={gutterBtnStyle} title="Move up">▲</button>
          <button onClick={() => onMove(block.id, 'down')} style={gutterBtnStyle} title="Move down">▼</button>
          <button onClick={onInsertAfter} style={gutterBtnStyle} title="Insert block after">➕</button>
          <button onClick={() => onRemove(block.id)} style={{ ...gutterBtnStyle, color: '#e74c3c' }} title="Remove block">✕</button>
        </div>
      )}

      {/* Render block by type */}
      {block.type === 'text' && (
        <TextBlock block={block} onUpdate={onUpdate} />
      )}
      {block.type === 'heading' && (
        <HeadingBlock block={block} onUpdate={onUpdate} />
      )}
      {block.type === 'node' && (
        <NodeBlock
          block={block}
          nodes={nodes}
          edges={edges}
          requirementLinks={requirementLinks}
          onUpdate={onUpdate}
          onNodeClick={onNodeClick}
          onUpdateNodeData={onUpdateNodeData}
          onCreateLink={onCreateLink}
          onRemoveLink={onRemoveLink}
          onPinLink={onPinLink}
          onUnpinLink={onUnpinLink}
          onUpdateLinkStatus={onUpdateLinkStatus}
          onUpdateLink={onUpdateLink}
        />
      )}
      {block.type === 'table' && (
        <TableBlock
          block={block}
          nodes={nodes}
          edges={edges}
          requirementLinks={requirementLinks}
          healthIssues={healthIssues}
          onUpdate={onUpdate}
          onNodeClick={onNodeClick}
        />
      )}
      {block.type === 'linkmap' && (
        <LinkMapBlock
          block={block}
          nodes={nodes}
          requirementLinks={requirementLinks}
          onNodeClick={onNodeClick}
          onRemoveLink={onRemoveLink}
          onPinLink={onPinLink}
          onUnpinLink={onUnpinLink}
          onUpdateLinkStatus={onUpdateLinkStatus}
          onUpdateLink={onUpdateLink}
        />
      )}
      {block.type === 'divider' && (
        <div style={{ borderTop: '1px solid var(--nl-border, #34495e)', margin: '16px 0' }} />
      )}
      {block.type === 'postit' && (
        <PostItBlock
          block={block}
          nodes={nodes}
          onUpdateNodeData={onUpdateNodeData}
        />
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────
// TEXT BLOCK
// ─────────────────────────────────────────────────
function TextBlock({ block, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const textRef = useRef(null);

  if (editing) {
    return (
      <textarea
        ref={textRef}
        autoFocus
        value={block.data.content || ''}
        onChange={e => onUpdate(block.id, { content: e.target.value })}
        onBlur={() => setEditing(false)}
        onKeyDown={e => {
          if (e.key === 'Escape') setEditing(false);
        }}
        style={{
          width: '100%',
          minHeight: '60px',
          padding: '10px',
          background: 'var(--nl-bg-input, #2c3e50)',
          border: '1px solid #3498db',
          borderRadius: '6px',
          color: 'var(--nl-text-primary, #ecf0f1)',
          fontSize: '14px',
          lineHeight: '1.6',
          resize: 'vertical',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        padding: '8px 10px',
        color: 'var(--nl-text-secondary, #bdc3c7)',
        fontSize: '14px',
        lineHeight: '1.6',
        cursor: 'text',
        borderRadius: '4px',
        minHeight: '30px',
        transition: 'background 0.2s',
      }}
      onMouseOver={e => e.currentTarget.style.background = 'rgba(52, 152, 219, 0.05)'}
      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
    >
      {block.data.content || <span style={{ color: '#555', fontStyle: 'italic' }}>Click to edit text...</span>}
    </div>
  );
}


// ─────────────────────────────────────────────────
// HEADING BLOCK
// ─────────────────────────────────────────────────
function HeadingBlock({ block, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const level = block.data.level || 2;
  const fontSize = level === 1 ? '22px' : level === 2 ? '18px' : '15px';

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <select
          value={level}
          onChange={e => onUpdate(block.id, { level: parseInt(e.target.value) })}
          style={{
            padding: '4px',
            background: 'var(--nl-border, #34495e)',
            border: '1px solid var(--nl-border-light, #4a5f7f)',
            borderRadius: '4px',
            color: 'white',
            fontSize: '11px',
          }}
        >
          <option value={1}>H1</option>
          <option value={2}>H2</option>
          <option value={3}>H3</option>
        </select>
        <input
          autoFocus
          value={block.data.content || ''}
          onChange={e => onUpdate(block.id, { content: e.target.value })}
          onBlur={() => setEditing(false)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(false); }}
          style={{
            flex: 1,
            padding: '6px 10px',
            background: 'var(--nl-bg-input, #2c3e50)',
            border: '1px solid #3498db',
            borderRadius: '4px',
            color: 'var(--nl-text-primary, #ecf0f1)',
            fontSize,
            fontWeight: 'bold',
          }}
        />
      </div>
    );
  }

  const Tag = `h${level}`;
  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        cursor: 'text',
        padding: '4px 0',
        borderRadius: '4px',
      }}
      onMouseOver={e => e.currentTarget.style.background = 'rgba(52, 152, 219, 0.05)'}
      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
    >
      <Tag style={{ color: 'var(--nl-text-primary, #ecf0f1)', fontSize, fontWeight: 'bold', margin: '8px 0 4px 0' }}>
        {block.data.content || <span style={{ color: '#555', fontStyle: 'italic' }}>Untitled heading</span>}
      </Tag>
    </div>
  );
}


// ─────────────────────────────────────────────────
// POST-IT BLOCK (sticky note in doc view)
// ─────────────────────────────────────────────────
const DOC_POSTIT_COLORS = {
  yellow: { bg: '#fff9c4', border: '#f9e547' },
  pink:   { bg: '#f8bbd0', border: '#e91e63' },
  green:  { bg: '#c8e6c9', border: '#4caf50' },
  blue:   { bg: '#bbdefb', border: '#2196f3' },
  orange: { bg: '#ffe0b2', border: '#ff9800' },
  purple: { bg: '#e1bee7', border: '#9c27b0' },
};

function PostItBlock({ block, nodes, onUpdateNodeData }) {
  const node = nodes.find(n => n.id === block.data.nodeId);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const textRef = useRef(null);

  if (!node) {
    return (
      <div style={{
        padding: '10px',
        background: '#e74c3c22',
        border: '1px solid #e74c3c44',
        borderRadius: '6px',
        color: '#e74c3c',
        fontSize: '12px',
      }}>
        ⚠️ Post-it not found: {block.data.nodeId}
      </div>
    );
  }

  const d = node.data || {};
  const colorId = d.postItColor || 'yellow';
  const color = DOC_POSTIT_COLORS[colorId] || DOC_POSTIT_COLORS.yellow;
  const noteText = d.text || '';

  const handleStartEdit = () => {
    setText(noteText);
    setEditing(true);
  };

  const handleSave = () => {
    setEditing(false);
    if (onUpdateNodeData) {
      onUpdateNodeData(node.id, 'text', text);
    }
  };

  return (
    <div
      style={{
        background: color.bg,
        border: `1px solid ${color.border}`,
        borderLeft: `4px solid ${color.border}`,
        borderRadius: '4px',
        padding: '14px 16px',
        marginBottom: '8px',
        maxWidth: '400px',
        position: 'relative',
        boxShadow: '2px 2px 6px rgba(0,0,0,0.08)',
        fontFamily: "'Segoe UI', sans-serif",
      }}
      onDoubleClick={handleStartEdit}
    >
      {/* Badge */}
      <div style={{
        position: 'absolute',
        top: '-8px',
        left: '12px',
        background: color.border,
        color: 'white',
        padding: '1px 8px',
        borderRadius: '4px',
        fontSize: '9px',
        fontWeight: 'bold',
      }}>
        📌 POST-IT
      </div>

      {editing ? (
        <textarea
          ref={textRef}
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => {
            if (e.key === 'Escape') handleSave();
          }}
          style={{
            width: '100%',
            minHeight: '60px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            fontSize: '13px',
            color: '#333',
            lineHeight: '1.6',
            fontFamily: 'inherit',
          }}
        />
      ) : (
        <div
          style={{
            fontSize: '13px',
            color: '#333',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: '1.6',
            minHeight: '20px',
            cursor: 'text',
            opacity: noteText ? 1 : 0.4,
          }}
        >
          {noteText || 'Dubbelklicka för att skriva...'}
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────
// NODE BLOCK (embedded requirement/node card)
// ─────────────────────────────────────────────────
function NodeBlock({
  block, nodes, edges, requirementLinks,
  onUpdate, onNodeClick, onUpdateNodeData,
  onCreateLink, onRemoveLink, onPinLink, onUnpinLink, onUpdateLinkStatus, onUpdateLink,
}) {
  const node = nodes.find(n => n.id === block.data.nodeId);
  const [expanded, setExpanded] = useState(block.data.expanded || false);
  const [editing, setEditing] = useState(false);

  if (!node) {
    return (
      <div style={{
        padding: '10px',
        background: '#e74c3c22',
        border: '1px solid #e74c3c44',
        borderRadius: '6px',
        color: '#e74c3c',
        fontSize: '12px',
      }}>
        ⚠️ Node not found: {block.data.nodeId}
      </div>
    );
  }

  const d = node.data || {};
  const typeColor = getTypeColor(d.itemType);
  const typeLabel = getTypeLabel(d.itemType);
  const nodeLinks = requirementLinks.filter(l => 
    l.source.itemId === node.id || l.target.itemId === node.id
  );

  return (
    <div style={{
      background: '#1e2a3a',
      borderRadius: '8px',
      border: `1px solid ${typeColor}33`,
      borderLeft: `4px solid ${typeColor}`,
      marginBottom: '8px',
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{
          display: 'inline-block',
          background: typeColor,
          color: 'white',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '9px',
          fontWeight: 'bold',
        }}>
          {typeLabel}
        </span>
        
        <span style={{ color: '#3498db', fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold' }}>
          {d.reqId || node.id}
        </span>
        
        <span style={{ color: 'var(--nl-text-primary, #ecf0f1)', fontSize: '14px', fontWeight: 'bold', flex: 1 }}>
          {d.label}
        </span>

        <span style={{ fontSize: '11px', color: 'var(--nl-text-muted, #7f8c8d)' }}>
          v{d.version || '1.0'}
        </span>

        {d.status && (
          <span style={{
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '10px',
            background: d.status === 'approved' ? '#27ae6033' : d.status === 'draft' ? '#f39c1233' : '#3498db33',
            color: d.status === 'approved' ? '#27ae60' : d.status === 'draft' ? '#f39c12' : '#3498db',
          }}>
            {d.status}
          </span>
        )}

        {nodeLinks.length > 0 && <LinkBadge count={nodeLinks.length} />}

        <span style={{ fontSize: '10px', color: 'var(--nl-text-muted, #7f8c8d)' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--nl-border, #34495e)' }}>
          {/* Inline editing */}
          {editing ? (
            <div style={{ marginTop: '10px' }}>
              <EditableField
                label="Name"
                value={d.label || ''}
                onChange={val => onUpdateNodeData(node.id, 'label', val)}
              />
              <EditableField
                label="Description"
                value={d.description || ''}
                onChange={val => onUpdateNodeData(node.id, 'description', val)}
                multiline
              />
              <EditableField
                label="Rationale"
                value={d.rationale || ''}
                onChange={val => onUpdateNodeData(node.id, 'rationale', val)}
                multiline
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <EditableSelect
                  label="Status"
                  value={d.status || 'open'}
                  options={['open', 'draft', 'review', 'approved', 'rejected']}
                  onChange={val => onUpdateNodeData(node.id, 'status', val)}
                />
                <EditableSelect
                  label="Priority"
                  value={d.priority || 'medium'}
                  options={['low', 'medium', 'high']}
                  onChange={val => onUpdateNodeData(node.id, 'priority', val)}
                />
                <EditableSelect
                  label="State"
                  value={d.state || 'open'}
                  options={['open', 'frozen', 'released']}
                  onChange={val => onUpdateNodeData(node.id, 'state', val)}
                />
              </div>
              <button
                onClick={() => setEditing(false)}
                style={{ ...miniBtn('#3498db'), marginTop: '8px' }}
              >
                ✓ Done Editing
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '10px' }}>
              {d.description && (
                <p style={{ color: 'var(--nl-text-secondary, #bdc3c7)', fontSize: '13px', lineHeight: '1.6', margin: '0 0 8px 0' }}>
                  {d.description}
                </p>
              )}
              {d.rationale && (
                <div style={{
                  padding: '8px 10px',
                  background: '#f1c40f11',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginBottom: '8px',
                }}>
                  <strong style={{ color: '#f1c40f' }}>💡 Rationale:</strong>
                  <span style={{ color: 'var(--nl-text-secondary, #bdc3c7)', marginLeft: '6px' }}>{d.rationale}</span>
                </div>
              )}

              {/* Requirement Links section */}
              {requirementLinks.length > 0 && (
                <NodeLinkSection
                  nodeId={node.id}
                  links={requirementLinks}
                  nodes={nodes}
                  onCreateLink={onCreateLink}
                  onRemoveLink={onRemoveLink}
                  onPinLink={onPinLink}
                  onUnpinLink={onUnpinLink}
                  onUpdateLinkStatus={onUpdateLinkStatus}
                  onUpdateLink={onUpdateLink}
                />
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <button onClick={() => setEditing(true)} style={miniBtn('#3498db')}>✏️ Edit</button>
                <button onClick={() => onNodeClick(node)} style={miniBtn('#9b59b6')}>🔍 PLM View</button>
                <button onClick={() => onCreateLink(node.id)} style={miniBtn('#27ae60')}>🔗 Add Link</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────
// TABLE BLOCK (dynamic query table)
// ─────────────────────────────────────────────────
function TableBlock({ block, nodes, edges, requirementLinks, healthIssues, onUpdate, onNodeClick }) {
  const filters = block.data.filters || {};
  const isHealthMode = block.data.mode === 'health';

  // Filter nodes
  const filteredNodes = useMemo(() => {
    if (isHealthMode) return [];
    return nodes.filter(n => {
      if (n.data?.isFloatingConnector) return false;
      const d = n.data || {};
      if (filters.type && filters.type !== 'all' && d.itemType !== filters.type) return false;
      if (filters.status && filters.status !== 'all' && d.status !== filters.status) return false;
      if (filters.priority && filters.priority !== 'all' && d.priority !== filters.priority) return false;
      if (filters.reqType && filters.reqType !== 'all' && d.reqType !== filters.reqType) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!(d.label || '').toLowerCase().includes(s) && !(d.reqId || '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [nodes, filters, isHealthMode]);

  const updateFilter = (key, value) => {
    onUpdate(block.id, { filters: { ...filters, [key]: value } });
  };

  if (isHealthMode) {
    return (
      <div style={{ ...tableContainerStyle }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--nl-text-primary, #ecf0f1)', marginBottom: '10px' }}>
          🏥 Link Health Check
        </div>
        {healthIssues.length === 0 ? (
          <div style={{ color: '#27ae60', fontSize: '12px' }}>✅ All links healthy</div>
        ) : (
          healthIssues.map((issue, i) => (
            <div key={i} style={{
              padding: '6px 10px',
              background: 'var(--nl-bg-input, #2c3e50)',
              borderLeft: `3px solid ${issue.severity === 'critical' ? '#e74c3c' : '#f39c12'}`,
              borderRadius: '4px',
              marginBottom: '4px',
              fontSize: '11px',
              color: 'var(--nl-text-secondary, #bdc3c7)',
            }}>
              {issue.icon} <strong>{issue.type}</strong>: {issue.message}
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div style={tableContainerStyle}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="🔍 Search..."
          value={filters.search || ''}
          onChange={e => updateFilter('search', e.target.value)}
          style={{ ...tinyInputStyle, flex: 1, minWidth: '120px' }}
        />
        <select value={filters.type || 'all'} onChange={e => updateFilter('type', e.target.value)} style={tinySelectStyle}>
          <option value="all">All Types</option>
          {['system', 'subsystem', 'function', 'requirement', 'testcase', 'parameter', 'hardware', 'usecase', 'actor'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={filters.status || 'all'} onChange={e => updateFilter('status', e.target.value)} style={tinySelectStyle}>
          <option value="all">All Status</option>
          {['open', 'draft', 'review', 'approved', 'rejected'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={filters.priority || 'all'} onChange={e => updateFilter('priority', e.target.value)} style={tinySelectStyle}>
          <option value="all">All Priority</option>
          {['low', 'medium', 'high'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <span style={{ fontSize: '11px', color: 'var(--nl-text-muted, #7f8c8d)', alignSelf: 'center' }}>
          {filteredNodes.length} items
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              {['ID', 'Name', 'Type', 'Status', 'Priority', 'Version', 'Links'].map(col => (
                <th key={col} style={thStyle}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredNodes.slice(0, 50).map(n => {
              const d = n.data || {};
              const linkCount = requirementLinks.filter(l => 
                l.source.itemId === n.id || l.target.itemId === n.id
              ).length;
              
              return (
                <tr
                  key={n.id}
                  onClick={() => onNodeClick(n)}
                  style={{ cursor: 'pointer' }}
                  onMouseOver={e => e.currentTarget.style.background = '#2c3e50'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={tdStyle}>
                    <span style={{ color: '#3498db', fontFamily: 'monospace' }}>{d.reqId || n.id}</span>
                  </td>
                  <td style={tdStyle}>{d.label}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '1px 6px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      background: `${getTypeColor(d.itemType)}33`,
                      color: getTypeColor(d.itemType),
                    }}>
                      {getTypeLabel(d.itemType)}
                    </span>
                  </td>
                  <td style={tdStyle}>{d.status || '-'}</td>
                  <td style={tdStyle}>{d.priority || '-'}</td>
                  <td style={tdStyle}>v{d.version || '1.0'}</td>
                  <td style={tdStyle}>
                    {linkCount > 0 ? <LinkBadge count={linkCount} /> : <span style={{ color: '#555' }}>-</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredNodes.length > 50 && (
          <div style={{ color: 'var(--nl-text-muted, #7f8c8d)', fontSize: '11px', padding: '6px' }}>
            Showing 50 of {filteredNodes.length} items
          </div>
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────
// LINK MAP BLOCK
// ─────────────────────────────────────────────────
function LinkMapBlock({
  block, nodes, requirementLinks,
  onNodeClick, onRemoveLink, onPinLink, onUnpinLink, onUpdateLinkStatus, onUpdateLink,
}) {
  const nodeId = block.data.nodeId;
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return <div style={{ color: '#e74c3c', fontSize: '12px' }}>⚠️ Node not found</div>;

  return (
    <div style={{
      background: '#1e2a3a',
      borderRadius: '8px',
      border: '1px solid #34495e',
      padding: '12px',
      marginBottom: '8px',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--nl-text-primary, #ecf0f1)', marginBottom: '10px' }}>
        🗺️ Link Map: {node.data?.reqId || nodeId} — {node.data?.label}
      </div>
      <NodeLinkSection
        nodeId={nodeId}
        links={requirementLinks}
        nodes={nodes}
        onCreateLink={() => {}}
        onRemoveLink={onRemoveLink}
        onPinLink={onPinLink}
        onUnpinLink={onUnpinLink}
        onUpdateLinkStatus={onUpdateLinkStatus}
        onUpdateLink={onUpdateLink}
      />
    </div>
  );
}


// ─────────────────────────────────────────────────
// COMMAND PALETTE MODAL
// ─────────────────────────────────────────────────
const CommandPaletteModal = React.forwardRef(({ search, onSearchChange, commands, onSelect, onClose }, ref) => {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, commands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (commands[selectedIdx]) onSelect(commands[selectedIdx]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '20vh',
      zIndex: 6000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--nl-bg-input, #2c3e50)',
        borderRadius: '10px',
        width: '450px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px' }}>
          <input
            ref={ref}
            autoFocus
            value={search}
            onChange={e => { onSearchChange(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command (e.g. /req, /table, /link)..."
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'var(--nl-border, #34495e)',
              border: '1px solid var(--nl-border-light, #4a5f7f)',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {commands.map((cmd, i) => (
            <div
              key={cmd.cmd}
              onClick={() => onSelect(cmd)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                cursor: 'pointer',
                background: i === selectedIdx ? '#3498db33' : 'transparent',
              }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{cmd.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--nl-text-primary, #ecf0f1)', fontSize: '13px', fontWeight: 'bold' }}>{cmd.label}</div>
                <div style={{ color: 'var(--nl-text-muted, #7f8c8d)', fontSize: '11px' }}>{cmd.description}</div>
              </div>
              <span style={{ color: 'var(--nl-text-muted, #7f8c8d)', fontSize: '11px', fontFamily: 'monospace' }}>{cmd.cmd}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});


// ─────────────────────────────────────────────────
// NODE PICKER MODAL
// ─────────────────────────────────────────────────
function NodePickerModal({ nodes, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = nodes.filter(n => {
    if (n.data?.isFloatingConnector) return false;
    const d = n.data || {};
    if (typeFilter !== 'all' && d.itemType !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (d.label || '').toLowerCase().includes(s) || (d.reqId || '').toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '15vh',
      zIndex: 6000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--nl-bg-input, #2c3e50)',
        borderRadius: '10px',
        width: '500px',
        maxHeight: '60vh',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px', display: 'flex', gap: '8px' }}>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes..."
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'var(--nl-border, #34495e)',
              border: '1px solid var(--nl-border-light, #4a5f7f)',
              borderRadius: '6px',
              color: 'white',
              fontSize: '13px',
            }}
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{
              padding: '8px',
              background: 'var(--nl-border, #34495e)',
              border: '1px solid var(--nl-border-light, #4a5f7f)',
              borderRadius: '6px',
              color: 'white',
              fontSize: '12px',
            }}
          >
            <option value="all">All Types</option>
            {['system', 'subsystem', 'function', 'requirement', 'testcase', 'parameter', 'hardware'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div style={{ maxHeight: 'calc(60vh - 60px)', overflowY: 'auto' }}>
          {filtered.map(n => (
            <div
              key={n.id}
              onClick={() => onSelect(n.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--nl-border, #34495e)',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#3498db22'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '9px',
                fontWeight: 'bold',
                background: `${getTypeColor(n.data?.itemType)}33`,
                color: getTypeColor(n.data?.itemType),
              }}>
                {getTypeLabel(n.data?.itemType)}
              </span>
              <span style={{ color: '#3498db', fontSize: '11px', fontFamily: 'monospace' }}>
                {n.data?.reqId || n.id}
              </span>
              <span style={{ color: 'var(--nl-text-primary, #ecf0f1)', fontSize: '12px', flex: 1 }}>
                {n.data?.label}
              </span>
              <span style={{ color: 'var(--nl-text-muted, #7f8c8d)', fontSize: '10px' }}>
                v{n.data?.version || '1.0'}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--nl-text-muted, #7f8c8d)' }}>No matching nodes</div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────
// EDITABLE FIELD HELPERS (for inline editing)
// ─────────────────────────────────────────────────
function EditableField({ label, value, onChange, multiline = false }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div style={{ marginBottom: '8px' }}>
      <label style={{ display: 'block', fontSize: '10px', color: 'var(--nl-text-muted, #7f8c8d)', marginBottom: '3px', textTransform: 'uppercase' }}>
        {label}
      </label>
      <Tag
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 8px',
          background: 'var(--nl-bg-input, #2c3e50)',
          border: '1px solid var(--nl-border-light, #4a5f7f)',
          borderRadius: '4px',
          color: 'var(--nl-text-primary, #ecf0f1)',
          fontSize: '12px',
          boxSizing: 'border-box',
          ...(multiline ? { minHeight: '50px', resize: 'vertical', fontFamily: 'inherit' } : {}),
        }}
      />
    </div>
  );
}

function EditableSelect({ label, value, options, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ display: 'block', fontSize: '10px', color: 'var(--nl-text-muted, #7f8c8d)', marginBottom: '3px', textTransform: 'uppercase' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 8px',
          background: 'var(--nl-bg-input, #2c3e50)',
          border: '1px solid var(--nl-border-light, #4a5f7f)',
          borderRadius: '4px',
          color: 'var(--nl-text-primary, #ecf0f1)',
          fontSize: '12px',
        }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function EmptyState({ onAddBlock }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      color: 'var(--nl-text-muted, #7f8c8d)',
    }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
      <div style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--nl-text-primary, #ecf0f1)' }}>
        Empty Document
      </div>
      <div style={{ fontSize: '13px', marginBottom: '20px' }}>
        Add blocks to build your document. Use / commands or click the button below.
      </div>
      <button onClick={onAddBlock} style={toolbarBtnStyle('#3498db')}>
        ➕ Add First Block
      </button>
    </div>
  );
}


// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────
function getTypeColor(itemType) {
  const map = {
    system: '#1abc9c', subsystem: '#3498db', function: '#00bcd4',
    requirement: '#e67e22', testcase: '#27ae60', parameter: '#00bcd4',
    hardware: '#795548', usecase: '#f39c12', actor: '#2ecc71',
    postIt: '#f9e547', image: '#607d8b',
  };
  return map[itemType] || '#9b59b6';
}

function getTypeLabel(itemType) {
  const map = {
    system: 'SYSTEM', subsystem: 'SUB-SYSTEM', function: 'FUNCTION',
    requirement: 'REQ', testcase: 'TEST', parameter: 'PARAM',
    hardware: 'HW', usecase: 'UC', actor: 'ACTOR',
    postIt: 'POST-IT', image: 'IMAGE',
  };
  return map[itemType] || 'ITEM';
}

// ─── Shared styles ──────────────────────────────
const toolbarBtnStyle = (color) => ({
  padding: '8px 16px',
  background: color,
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
});

const miniBtn = (color) => ({
  padding: '4px 10px',
  background: `${color}33`,
  border: `1px solid ${color}66`,
  borderRadius: '4px',
  color,
  fontSize: '10px',
  cursor: 'pointer',
  fontWeight: 'bold',
});

const gutterBtnStyle = {
  width: '22px',
  height: '22px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--nl-border, #34495e)',
  border: '1px solid var(--nl-border-light, #4a5f7f)',
  borderRadius: '4px',
  color: 'var(--nl-text-secondary, #bdc3c7)',
  cursor: 'pointer',
  fontSize: '10px',
  padding: 0,
};

const tableContainerStyle = {
  background: '#1e2a3a',
  borderRadius: '8px',
  border: '1px solid #34495e',
  padding: '14px',
  marginBottom: '8px',
};

const tinyInputStyle = {
  padding: '5px 8px',
  background: 'var(--nl-bg-input, #2c3e50)',
  border: '1px solid var(--nl-border-light, #4a5f7f)',
  borderRadius: '4px',
  color: 'white',
  fontSize: '11px',
};

const tinySelectStyle = {
  padding: '5px 6px',
  background: 'var(--nl-bg-input, #2c3e50)',
  border: '1px solid var(--nl-border-light, #4a5f7f)',
  borderRadius: '4px',
  color: 'white',
  fontSize: '11px',
};

const thStyle = {
  padding: '6px 10px',
  textAlign: 'left',
  borderBottom: '2px solid var(--nl-border, #34495e)',
  color: 'var(--nl-text-muted, #7f8c8d)',
  fontSize: '10px',
  textTransform: 'uppercase',
  fontWeight: 'bold',
};

const tdStyle = {
  padding: '6px 10px',
  borderBottom: '1px solid var(--nl-border, #34495e22)',
  color: 'var(--nl-text-secondary, #bdc3c7)',
};
