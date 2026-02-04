// Enhanced DocumentView with Inline Editing
// Replace the existing DocumentView function in App.js (around line 6964)

function DocumentView({ nodes, edges, onNodeClick, onUpdateNode }) {
  const [editingField, setEditingField] = React.useState(null); // { nodeId, field }
  const [expandedSections, setExpandedSections] = React.useState(new Set());
  const [showOutline, setShowOutline] = React.useState(true);
  const editRef = React.useRef(null);
  
  // Build hierarchy from nodes and edges
  const buildHierarchy = () => {
    // Find root nodes (nodes with no incoming "contains" edges)
    const containsEdges = edges.filter(e => 
      e.data?.relationType === 'contains' || 
      e.data?.relationType === 'provides'
    );
    
    const childIds = new Set(containsEdges.map(e => e.target));
    const rootNodes = nodes.filter(n => !childIds.has(n.id));
    
    // Sort by position (left to right, top to bottom)
    rootNodes.sort((a, b) => {
      if (Math.abs(a.position.y - b.position.y) < 50) {
        return a.position.x - b.position.x;
      }
      return a.position.y - b.position.y;
    });
    
    // Recursive function to get children
    const getChildren = (nodeId) => {
      const childEdges = containsEdges.filter(e => e.source === nodeId);
      const children = childEdges.map(e => nodes.find(n => n.id === e.target)).filter(Boolean);
      children.sort((a, b) => {
        if (Math.abs(a.position.y - b.position.y) < 50) {
          return a.position.x - b.position.x;
        }
        return a.position.y - b.position.y;
      });
      return children;
    };
    
    // Build tree structure
    const buildTree = (node, level = 0) => {
      const children = getChildren(node.id);
      return {
        node,
        level,
        children: children.map(child => buildTree(child, level + 1))
      };
    };
    
    return rootNodes.map(root => buildTree(root, 0));
  };

  // Get related requirements for a node
  const getRelatedRequirements = (nodeId) => {
    const relatedEdges = edges.filter(e => 
      (e.source === nodeId || e.target === nodeId) &&
      (e.data?.relationType === 'realizes' || 
       e.data?.relationType === 'satisfies' ||
       e.data?.relationType === 'allocated')
    );
    
    const relatedIds = relatedEdges.map(e => e.source === nodeId ? e.target : e.source);
    return nodes.filter(n => relatedIds.includes(n.id) && n.data?.itemType === 'requirement');
  };

  // Generate section number
  const getSectionNumber = (indices) => {
    return indices.map(i => i + 1).join('.');
  };

  // Get item type color
  const getTypeColor = (itemType) => {
    switch(itemType) {
      case 'system': return '#1abc9c';
      case 'subsystem': return '#3498db';
      case 'function': return '#00bcd4';
      case 'requirement': return '#e67e22';
      case 'testcase': return '#27ae60';
      default: return '#9b59b6';
    }
  };

  // Get item type label
  const getTypeLabel = (itemType) => {
    switch(itemType) {
      case 'system': return 'SYSTEM';
      case 'subsystem': return 'SUB-SYSTEM';
      case 'function': return 'FUNCTION';
      case 'requirement': return 'REQUIREMENT';
      case 'testcase': return 'TEST CASE';
      default: return 'ITEM';
    }
  };

  // Handle inline edit
  const handleEditStart = (nodeId, field, e) => {
    e.stopPropagation();
    setEditingField({ nodeId, field });
    // Focus will be set by useEffect
  };

  // Handle blur (save)
  const handleEditBlur = (nodeId, field, e) => {
    const newValue = e.target.innerText.trim();
    if (onUpdateNode) {
      onUpdateNode(nodeId, field, newValue);
    }
    setEditingField(null);
  };

  // Handle key press in editable field
  const handleEditKeyDown = (nodeId, field, e) => {
    if (e.key === 'Escape') {
      // Cancel edit - restore original value
      e.target.innerText = nodes.find(n => n.id === nodeId)?.data?.[field] || '';
      setEditingField(null);
      e.target.blur();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Save on Enter (Shift+Enter for newline)
      e.preventDefault();
      e.target.blur();
    }
  };

  // Focus editable element when editing starts
  React.useEffect(() => {
    if (editingField && editRef.current) {
      editRef.current.focus();
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [editingField]);

  const hierarchy = buildHierarchy();

  // Flatten hierarchy for outline
  const flattenHierarchy = (items, indices = []) => {
    const result = [];
    items.forEach((item, idx) => {
      const currentIndices = [...indices, idx];
      result.push({ ...item, indices: currentIndices, sectionNum: getSectionNumber(currentIndices) });
      if (item.children.length > 0) {
        result.push(...flattenHierarchy(item.children, currentIndices));
      }
    });
    return result;
  };

  const flatItems = flattenHierarchy(hierarchy);

  // Editable Text Component
  const EditableText = ({ nodeId, field, value, style, placeholder, multiline = false }) => {
    const isEditing = editingField?.nodeId === nodeId && editingField?.field === field;
    
    return (
      <div
        ref={isEditing ? editRef : null}
        contentEditable={isEditing}
        suppressContentEditableWarning={true}
        onClick={(e) => handleEditStart(nodeId, field, e)}
        onBlur={(e) => isEditing && handleEditBlur(nodeId, field, e)}
        onKeyDown={(e) => isEditing && handleEditKeyDown(nodeId, field, e)}
        style={{
          ...style,
          cursor: isEditing ? 'text' : 'pointer',
          outline: isEditing ? '2px solid #3498db' : 'none',
          borderRadius: '4px',
          padding: isEditing ? '4px 8px' : '4px',
          margin: isEditing ? '-4px -8px' : '-4px',
          background: isEditing ? 'rgba(52, 152, 219, 0.1)' : 'transparent',
          minHeight: multiline ? '60px' : 'auto',
          whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
          transition: 'all 0.15s ease'
        }}
        title={isEditing ? 'Tryck Enter för att spara, Escape för att avbryta' : 'Klicka för att redigera'}
      >
        {value || (isEditing ? '' : <span style={{ color: '#7f8c8d', fontStyle: 'italic' }}>{placeholder}</span>)}
      </div>
    );
  };

  // Render a node section
  const renderSection = (item, indices = []) => {
    const { node, children } = item;
    const sectionNum = getSectionNumber(indices);
    const requirements = getRelatedRequirements(node.id);
    const isExpanded = !expandedSections.has(node.id) || expandedSections.size === 0; // Default expanded
    
    return (
      <div key={node.id} style={{ marginBottom: '24px' }} id={`section-${node.id}`}>
        {/* Section Header */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(52, 152, 219, 0.05)',
            borderLeft: `4px solid ${getTypeColor(node.data?.itemType)}`,
            marginBottom: '8px',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(52, 152, 219, 0.1)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(52, 152, 219, 0.05)'}
        >
          {/* Section Number & Expand Toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
            <div style={{
              fontSize: indices.length === 1 ? '24px' : indices.length === 2 ? '20px' : '16px',
              fontWeight: 'bold',
              color: '#3498db'
            }}>
              {sectionNum}
            </div>
            {children.length > 0 && (
              <button
                onClick={() => {
                  const newExpanded = new Set(expandedSections);
                  if (newExpanded.has(node.id)) {
                    newExpanded.delete(node.id);
                  } else {
                    newExpanded.add(node.id);
                  }
                  setExpandedSections(newExpanded);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7f8c8d',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '4px'
                }}
                title={isExpanded ? 'Fäll ihop' : 'Expandera'}
              >
                {isExpanded ? '▼' : '▶'} {children.length}
              </button>
            )}
          </div>
          
          {/* Content */}
          <div style={{ flex: 1 }}>
            {/* Type Badge & Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{
                display: 'inline-block',
                background: getTypeColor(node.data?.itemType),
                color: 'white',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                {getTypeLabel(node.data?.itemType)}
              </span>
              
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onNodeClick && onNodeClick(node); }}
                  style={{
                    background: '#34495e',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#bdc3c7',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                  title="Öppna i panel"
                >
                  ⚙️ Egenskaper
                </button>
              </div>
            </div>
            
            {/* Title - Editable */}
            <EditableText
              nodeId={node.id}
              field="label"
              value={node.data?.label}
              placeholder="Klicka för att lägga till titel..."
              style={{
                margin: '4px 0',
                fontSize: indices.length === 1 ? '20px' : indices.length === 2 ? '17px' : '15px',
                color: '#ecf0f1',
                fontWeight: 'bold'
              }}
            />
            
            {/* ID & Version */}
            <div style={{ fontSize: '12px', color: '#3498db', marginBottom: '8px' }}>
              {node.data?.reqId} • v{node.data?.version || '1.0'}
            </div>
            
            {/* Description - Editable */}
            <EditableText
              nodeId={node.id}
              field="description"
              value={node.data?.description}
              placeholder="Klicka för att lägga till beskrivning..."
              multiline={true}
              style={{
                margin: '8px 0',
                color: '#bdc3c7',
                fontSize: '14px',
                lineHeight: '1.6'
              }}
            />
            
            {/* Rationale - Editable */}
            <div style={{
              margin: '8px 0',
              padding: '10px',
              background: 'rgba(241, 196, 15, 0.1)',
              borderRadius: '4px',
              fontSize: '13px'
            }}>
              <strong style={{ color: '#f1c40f' }}>💡 Rationale:</strong>
              <EditableText
                nodeId={node.id}
                field="rationale"
                value={node.data?.rationale}
                placeholder="Klicka för att lägga till motivering..."
                multiline={true}
                style={{
                  color: '#bdc3c7',
                  marginLeft: '8px',
                  display: 'inline'
                }}
              />
            </div>
            
            {/* Related Requirements */}
            {requirements.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '6px' }}>
                  🔗 Relaterade krav:
                </div>
                {requirements.map(req => (
                  <div 
                    key={req.id}
                    onClick={(e) => { e.stopPropagation(); onNodeClick && onNodeClick(req); }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      background: '#2c3e50',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginRight: '8px',
                      marginBottom: '4px',
                      cursor: 'pointer',
                      color: '#e67e22'
                    }}
                  >
                    📋 {req.data?.reqId}: {req.data?.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Children */}
        {children.length > 0 && isExpanded && (
          <div style={{ marginLeft: '24px' }}>
            {children.map((child, idx) => renderSection(child, [...indices, idx]))}
          </div>
        )}
      </div>
    );
  };

  // Export to Word (keep existing implementation)
  const exportToWord = async () => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
    
    const docChildren = [];
    
    // Title
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'System Documentation', bold: true, size: 48 })],
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 }
      })
    );
    
    // Subtitle
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ 
          text: `Generated on ${new Date().toLocaleDateString()} • ${nodes.length} items`, 
          color: '666666',
          size: 24 
        })],
        spacing: { after: 600 }
      })
    );

    // Recursive function to add sections
    const addSection = (item, indices) => {
      const { node, children } = item;
      const sectionNum = indices.map(i => i + 1).join('.');
      const level = indices.length;
      
      // Section heading
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${sectionNum}  `, bold: true }),
            new TextRun({ text: node.data?.label || 'Untitled', bold: true })
          ],
          heading: level === 1 ? HeadingLevel.HEADING_1 : 
                   level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
          spacing: { before: 400, after: 200 }
        })
      );
      
      // Type and ID
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ 
              text: `[${(node.data?.itemType || 'item').toUpperCase()}] ${node.data?.reqId || ''} • v${node.data?.version || '1.0'}`,
              color: '3498db',
              size: 20
            })
          ],
          spacing: { after: 200 }
        })
      );
      
      // Description
      if (node.data?.description) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: node.data.description, size: 24 })],
            spacing: { after: 200 }
          })
        );
      }
      
      // Rationale
      if (node.data?.rationale) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Rationale: ', bold: true, color: 'e67e22', size: 22 }),
              new TextRun({ text: node.data.rationale, italics: true, size: 22 })
            ],
            spacing: { after: 300 }
          })
        );
      }
      
      // Children
      children.forEach((child, idx) => addSection(child, [...indices, idx]));
    };
    
    hierarchy.forEach((item, idx) => addSection(item, [idx]));
    
    const doc = new Document({
      sections: [{ children: docChildren }]
    });
    
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-${new Date().toISOString().split('T')[0]}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 50px)',
      marginTop: '50px',
      background: '#1a1a2e'
    }}>
      {/* Outline Navigator */}
      {showOutline && (
        <div style={{
          width: '280px',
          background: '#16213e',
          borderRight: '1px solid #2c3e50',
          overflow: 'auto',
          padding: '16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: 0, color: '#ecf0f1', fontSize: '14px' }}>📑 Dokumentöversikt</h3>
            <button
              onClick={() => setShowOutline(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#7f8c8d',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
          
          <div style={{ fontSize: '12px' }}>
            {flatItems.map(item => (
              <div
                key={item.node.id}
                onClick={() => {
                  const el = document.getElementById(`section-${item.node.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                style={{
                  padding: '6px 8px',
                  paddingLeft: `${8 + item.level * 16}px`,
                  cursor: 'pointer',
                  color: '#bdc3c7',
                  borderRadius: '4px',
                  marginBottom: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(52, 152, 219, 0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: '#3498db', fontWeight: 'bold', minWidth: '40px' }}>
                  {item.sectionNum}
                </span>
                <span style={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  flex: 1 
                }}>
                  {item.node.data?.label || 'Untitled'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Main Document Area */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '40px'
      }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #2c3e50'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!showOutline && (
              <button
                onClick={() => setShowOutline(true)}
                style={{
                  background: '#34495e',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                📑 Visa översikt
              </button>
            )}
            <span style={{ color: '#7f8c8d', fontSize: '13px' }}>
              {nodes.length} objekt • Klicka på text för att redigera
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={exportToWord}
              style={{
                background: '#27ae60',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold'
              }}
            >
              📥 Exportera Word
            </button>
          </div>
        </div>
        
        {/* Document Content */}
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          background: '#1e2a3a',
          borderRadius: '12px',
          padding: '40px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          {/* Document Title */}
          <h1 style={{
            margin: '0 0 8px 0',
            color: '#ecf0f1',
            fontSize: '32px',
            fontWeight: 'bold'
          }}>
            System Documentation
          </h1>
          <p style={{
            margin: '0 0 32px 0',
            color: '#7f8c8d',
            fontSize: '14px'
          }}>
            Genererad: {new Date().toLocaleDateString('sv-SE')} • {nodes.length} objekt
          </p>
          
          <hr style={{ border: 'none', borderTop: '1px solid #34495e', margin: '24px 0' }} />
          
          {/* Sections */}
          {hierarchy.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#7f8c8d'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
              <p style={{ fontSize: '16px' }}>Inga objekt att visa</p>
              <p style={{ fontSize: '13px' }}>Lägg till system, krav eller funktioner i PLM-vyn</p>
            </div>
          ) : (
            hierarchy.map((item, idx) => renderSection(item, [idx]))
          )}
        </div>
      </div>
    </div>
  );
}
