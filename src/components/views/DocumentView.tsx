import type { PLMNode, PLMEdge, NodeData, Issue, IssueMap, HardwareType, Port } from '../../types';
import React, { useState } from 'react';
import { RELATIONSHIP_TYPES } from '../../constants/relationships';
import { ISSUE_CATEGORIES, ISSUE_PRIORITIES, ISSUE_STATUSES } from '../../constants/issues';

function DocumentView({ nodes, edges, onNodeClick }: any) {
  
  // Build hierarchy from nodes and edges
  const buildHierarchy = () => {
    // Find root nodes (nodes with no incoming "contains" edges)
    const containsEdges = edges.filter(e => 
      e.data?.relationType === 'contains' || 
      e.data?.relationType === 'provides'
    );
    
    const childIds = new Set(containsEdges.map(e => e.target));
    const rootNodes = nodes.filter((n: any) => !childIds.has(n.id));
    
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
    return nodes.filter((n: any) => relatedIds.includes(n.id) && n.data?.itemType === 'requirement');
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

  const hierarchy = buildHierarchy();

  // Render a node section
  const renderSection = (item, indices = []) => {
    const { node, children } = item;
    const sectionNum = getSectionNumber(indices);
    const requirements = getRelatedRequirements(node.id);
    
    return (
      <div key={node.id} style={{ marginBottom: '24px' }}>
        {/* Section Header */}
        <div 
          onClick={() => onNodeClick(node)}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            cursor: 'pointer',
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(52, 152, 219, 0.05)',
            borderLeft: `4px solid ${getTypeColor(node.data?.itemType)}`,
            marginBottom: '8px',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(52, 152, 219, 0.15)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(52, 152, 219, 0.05)'}
        >
          {/* Section Number */}
          <div style={{
            fontSize: indices.length === 1 ? '24px' : indices.length === 2 ? '20px' : '16px',
            fontWeight: 'bold',
            color: '#3498db',
            minWidth: '60px'
          }}>
            {sectionNum}
          </div>
          
          {/* Content */}
          <div style={{ flex: 1 }}>
            {/* Type Badge */}
            <span style={{
              display: 'inline-block',
              background: getTypeColor(node.data?.itemType),
              color: 'white',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 'bold',
              marginBottom: '6px'
            }}>
              {getTypeLabel(node.data?.itemType)}
            </span>
            
            {/* Title */}
            <h3 style={{
              margin: '4px 0',
              fontSize: indices.length === 1 ? '20px' : indices.length === 2 ? '17px' : '15px',
              color: '#ecf0f1'
            }}>
              {node.data?.label}
            </h3>
            
            {/* ID */}
            <div style={{ fontSize: '12px', color: '#3498db', marginBottom: '8px' }}>
              {node.data?.reqId} • v{node.data?.version || '1.0'}
            </div>
            
            {/* Description */}
            {node.data?.description && (
              <p style={{
                margin: '8px 0',
                color: '#bdc3c7',
                fontSize: '14px',
                lineHeight: '1.6'
              }}>
                {node.data.description}
              </p>
            )}
            
            {/* Rationale */}
            {node.data?.rationale && (
              <div style={{
                margin: '8px 0',
                padding: '10px',
                background: 'rgba(241, 196, 15, 0.1)',
                borderRadius: '4px',
                fontSize: '13px'
              }}>
                <strong style={{ color: '#f1c40f' }}>💡 Rationale:</strong>
                <span style={{ color: '#bdc3c7', marginLeft: '8px' }}>{node.data.rationale}</span>
              </div>
            )}
            
            {/* Related Requirements */}
            {requirements.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '6px' }}>
                  Related Requirements:
                </div>
                {requirements.map(req => (
                  <div 
                    key={req.id}
                    onClick={(e: any) => { e.stopPropagation(); onNodeClick(req); }}
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
        {children.length > 0 && (
          <div style={{ marginLeft: '24px' }}>
            {children.map((child, idx) => renderSection(child, [...indices, idx]))}
          </div>
        )}
      </div>
    );
  };

  // Export to Word
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
            children: [new TextRun({ text: node.data.description })],
            spacing: { after: 200 }
          })
        );
      }
      
      // Rationale
      if (node.data?.rationale) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Rationale: ', bold: true, color: 'f1c40f' }),
              new TextRun({ text: node.data.rationale })
            ],
            spacing: { after: 300 }
          })
        );
      }
      
      // Children
      children.forEach((child, idx) => addSection(child, [...indices, idx]));
    };

    // Add all sections
    hierarchy.forEach((item, idx) => addSection(item, [idx]));

    const doc = new Document({
      sections: [{
        properties: {},
        children: docChildren
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `System_Documentation_${new Date().toISOString().split('T')[0]}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export to PDF (Word-style, clean)
  const exportToPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    
    // Build clean HTML for PDF
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h1 style="text-align: center; color: #000; border-bottom: 2px solid #333; padding-bottom: 15px;">
          System Documentation
        </h1>
        <p style="text-align: center; color: #666; margin-bottom: 30px;">
          Generated on ${new Date().toLocaleDateString()} • ${nodes.length} items • ${edges.length} relationships
        </p>
    `;

    // Recursive function to add sections
    const addSection = (item, indices) => {
      const { node, children } = item;
      const sectionNum = indices.map(i => i + 1).join('.');
      const level = indices.length;
      const indent = (level - 1) * 20;
      
      const fontSize = level === 1 ? '18px' : level === 2 ? '15px' : '13px';
      const marginTop = level === 1 ? '25px' : '15px';
      
      htmlContent += `
        <div style="margin-left: ${indent}px; margin-top: ${marginTop};">
          <h${level + 1} style="color: #000; font-size: ${fontSize}; margin-bottom: 5px;">
            ${sectionNum} ${node.data?.label || 'Untitled'}
          </h${level + 1}>
          <p style="color: #333; font-size: 11px; margin: 0 0 8px 0;">
            [${(node.data?.itemType || 'item').toUpperCase()}] ${node.data?.reqId || ''} • v${node.data?.version || '1.0'}
          </p>
      `;
      
      if (node.data?.description) {
        htmlContent += `
          <p style="color: #333; font-size: 12px; line-height: 1.6; margin: 8px 0;">
            ${node.data.description}
          </p>
        `;
      }
      
      if (node.data?.rationale) {
        htmlContent += `
          <p style="color: #333; font-size: 11px; margin: 10px 0;">
            <strong>Rationale:</strong> ${node.data.rationale}
          </p>
        `;
      }
      
      htmlContent += `</div>`;
      
      // Add children
      children.forEach((child, idx) => addSection(child, [...indices, idx]));
    };

    // Add all sections
    hierarchy.forEach((item, idx) => addSection(item, [idx]));

    htmlContent += `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 10px;">
          PLM Prototype • Generated ${new Date().toLocaleString()}
        </div>
      </div>
    `;

    // Create temporary element
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.background = 'white';
    document.body.appendChild(tempDiv);

    const opt = {
      margin: [15, 15, 15, 15],
      filename: `System_Documentation_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    await html2pdf().set(opt).from(tempDiv).save();
    
    // Clean up
    document.body.removeChild(tempDiv);
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50px',
      left: '60px',
      right: 0,
      bottom: 0,
      background: '#1a1a2e',
      overflowY: 'auto',
      padding: '40px'
    }}>
      {/* Document Container */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: '#1e2a3a',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        padding: '40px 50px'
      }}>
        {/* Document Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          paddingBottom: '30px',
          borderBottom: '2px solid #34495e'
        }}>
          <h1 style={{
            fontSize: '28px',
            color: '#ecf0f1',
            margin: '0 0 10px 0'
          }}>
            📄 System Documentation
          </h1>
          <p style={{
            color: '#7f8c8d',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            Auto-generated from PLM data • {nodes.length} items • {edges.length} relationships
          </p>
          
          {/* Export Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={exportToWord}
              style={{
                padding: '10px 20px',
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📥 Export Word
            </button>
            <button
              onClick={exportToPDF}
              style={{
                padding: '10px 20px',
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📥 Export PDF
            </button>
          </div>
        </div>
        
        {/* Table of Contents */}
        <div style={{
          marginBottom: '40px',
          padding: '20px',
          background: '#2c3e50',
          borderRadius: '8px'
        }}>
          <h2 style={{ color: '#3498db', fontSize: '16px', marginBottom: '15px' }}>
            📑 Table of Contents
          </h2>
          {hierarchy.map((item, idx) => (
            <div key={item.node.id} style={{ marginBottom: '6px' }}>
              <a 
                href={`#section-${item.node.id}`}
                style={{ color: '#ecf0f1', textDecoration: 'none', fontSize: '14px' }}
              >
                {idx + 1}. {item.node.data?.label}
              </a>
            </div>
          ))}
        </div>
        
        {/* Content */}
        <div id="document-content">
          {hierarchy.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#7f8c8d', padding: '40px' }}>
              No items to display. Create some nodes in PLM or Whiteboard view.
            </div>
          ) : (
            hierarchy.map((item, idx) => renderSection(item, [idx]))
          )}
        </div>
        
        {/* Footer */}
        <div style={{
          marginTop: '40px',
          paddingTop: '20px',
          borderTop: '2px solid #34495e',
          textAlign: 'center',
          color: '#7f8c8d',
          fontSize: '12px'
        }}>
          Generated on {new Date().toLocaleDateString()} • PLM Prototype
        </div>
      </div>
    </div>
  );
}

// Manage Hardware Types Modal

export default DocumentView;
