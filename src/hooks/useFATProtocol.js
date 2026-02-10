import { useCallback } from 'react';

/**
 * Generates a FAT (Factory Acceptance Test) protocol document (.docx)
 * from a test case node's data.
 */
export default function useFATProtocol({ nodes, edges, objectName, objectVersion }) {
const generateFATProtocol = useCallback(async (testCaseNode) => {
  // Dynamic import of docx library
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
          Header, Footer, AlignmentType, BorderStyle, WidthType, 
          ShadingType, PageNumber, HeadingLevel } = await import('docx');
  
  const tc = testCaseNode.data;
  const steps = (tc.testSteps || '').split('\n').filter(s => s.trim());
  const expected = (tc.expectedResults || '').split('\n').filter(s => s.trim());
  const preconditions = (tc.preconditions || '').split('\n').filter(s => s.trim());
  
  // Find linked requirements
  const linkedReqs = edges
    .filter(e => e.source === testCaseNode.id || e.target === testCaseNode.id)
    .map(e => {
      const otherId = e.source === testCaseNode.id ? e.target : e.source;
      return nodes.find(n => n.id === otherId);
    })
    .filter(n => n && !['testcase', 'testrun', 'testresult'].includes(n.data.itemType));

  const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
  const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };
  
  // Build test steps rows
  const stepRows = steps.map((step, index) => {
    return new TableRow({
      children: [
        new TableCell({
          borders: cellBorders,
          width: { size: 600, type: WidthType.DXA },
          children: [new Paragraph({ 
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: String(index + 1), bold: true })]
          })]
        }),
        new TableCell({
          borders: cellBorders,
          width: { size: 4000, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun(step.trim())] })]
        }),
        new TableCell({
          borders: cellBorders,
          width: { size: 3000, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun(expected[index]?.trim() || '')] })]
        }),
        new TableCell({
          borders: cellBorders,
          width: { size: 800, type: WidthType.DXA },
          children: [new Paragraph({ 
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '☐', size: 28 })]
          })]
        }),
        new TableCell({
          borders: cellBorders,
          width: { size: 800, type: WidthType.DXA },
          children: [new Paragraph({ 
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '☐', size: 28 })]
          })]
        }),
        new TableCell({
          borders: cellBorders,
          width: { size: 1800, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun('')] })]
        }),
      ]
    });
  });

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        { id: "Title", name: "Title", basedOn: "Normal",
          run: { size: 48, bold: true, color: "1a5276" },
          paragraph: { spacing: { before: 0, after: 200 }, alignment: AlignmentType.CENTER } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal",
          run: { size: 28, bold: true, color: "2c3e50" },
          paragraph: { spacing: { before: 300, after: 120 } } },
      ]
    },
    sections: [{
      properties: {
        page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: objectName + ' | ', size: 18, color: "666666" }),
              new TextRun({ text: 'FAT Protocol', size: 18, color: "666666", bold: true })
            ]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Page ', size: 18 }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
              new TextRun({ text: ' of ', size: 18 }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 })
            ]
          })]
        })
      },
      children: [
        new Paragraph({
          heading: HeadingLevel.TITLE,
          children: [new TextRun({ text: 'FACTORY ACCEPTANCE TEST PROTOCOL', bold: true })]
        }),
        
        new Table({
          columnWidths: [2500, 8500],
          rows: [
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text: 'Project:', bold: true })] })] }),
                new TableCell({ borders: cellBorders,
                  children: [new Paragraph({ children: [new TextRun(objectName)] })] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text: 'Version:', bold: true })] })] }),
                new TableCell({ borders: cellBorders,
                  children: [new Paragraph({ children: [new TextRun(objectVersion)] })] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text: 'Date:', bold: true })] })] }),
                new TableCell({ borders: cellBorders,
                  children: [new Paragraph({ children: [new TextRun(new Date().toISOString().split('T')[0])] })] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text: 'Test Case ID:', bold: true })] })] }),
                new TableCell({ borders: cellBorders,
                  children: [new Paragraph({ children: [new TextRun({ text: tc.reqId || 'N/A', bold: true, color: "2980b9" })] })] })
              ]
            }),
          ]
        }),
        
        new Paragraph({ children: [] }),
        
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: tc.label || 'Test Case' })]
        }),
        
        new Paragraph({
          spacing: { before: 200 },
          children: [
            new TextRun({ text: 'Verifies: ', bold: true }),
            new TextRun(linkedReqs.map(r => `${r.data.reqId} - ${r.data.label}`).join(', ') || 'No linked requirements')
          ]
        }),
        
        new Paragraph({
          spacing: { before: 300 },
          children: [new TextRun({ text: 'PURPOSE', bold: true, size: 24 })]
        }),
        new Paragraph({
          children: [new TextRun(tc.purpose || 'Not specified')]
        }),
        
        new Paragraph({
          spacing: { before: 300 },
          children: [new TextRun({ text: 'PRECONDITIONS', bold: true, size: 24 })]
        }),
        ...(preconditions.length > 0 
          ? preconditions.map(p => new Paragraph({
              children: [new TextRun({ text: '• ' + p })]
            }))
          : [new Paragraph({ children: [new TextRun('None specified')] })]
        ),
        
        new Paragraph({
          spacing: { before: 400 },
          children: [new TextRun({ text: 'TEST PROCEDURE', bold: true, size: 24 })]
        }),
        new Paragraph({ children: [] }),
        
        new Table({
          columnWidths: [600, 4000, 3000, 800, 800, 1800],
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: "2c3e50", type: ShadingType.CLEAR },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, 
                    children: [new TextRun({ text: '#', bold: true, color: "ffffff" })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: "2c3e50", type: ShadingType.CLEAR },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'Step', bold: true, color: "ffffff" })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: "2c3e50", type: ShadingType.CLEAR },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'Expected Result', bold: true, color: "ffffff" })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: "27ae60", type: ShadingType.CLEAR },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'Pass', bold: true, color: "ffffff" })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: "e74c3c", type: ShadingType.CLEAR },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'Fail', bold: true, color: "ffffff" })] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: "2c3e50", type: ShadingType.CLEAR },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'Comments', bold: true, color: "ffffff" })] })] }),
              ]
            }),
            ...stepRows
          ]
        }),
        
        new Paragraph({
          spacing: { before: 400 },
          children: [new TextRun({ text: 'OVERALL RESULT', bold: true, size: 24 })]
        }),
        new Paragraph({
          spacing: { before: 100 },
          children: [new TextRun({ text: '☐ PASS     ☐ FAIL     ☐ BLOCKED', size: 28 })]
        }),
        
        new Paragraph({
          spacing: { before: 300 },
          children: [new TextRun({ text: 'COMMENTS / OBSERVATIONS', bold: true, size: 24 })]
        }),
        new Paragraph({ borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" } }, spacing: { before: 200 }, children: [new TextRun('')] }),
        new Paragraph({ borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" } }, spacing: { before: 400 }, children: [new TextRun('')] }),
        new Paragraph({ borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" } }, spacing: { before: 400 }, children: [new TextRun('')] }),
        
        new Paragraph({
          spacing: { before: 500 },
          children: [new TextRun({ text: 'SIGN-OFF', bold: true, size: 24 })]
        }),
        new Table({
          columnWidths: [2750, 2750, 2750, 2750],
          rows: [
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text: 'Tested by:', bold: true })] })] }),
                new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun('')] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text: 'Date:', bold: true })] })] }),
                new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun('')] })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text: 'Signature:', bold: true })] })] }),
                new TableCell({ borders: cellBorders, children: [new Paragraph({ spacing: { before: 400 }, children: [new TextRun('')] })] }),
                new TableCell({ borders: cellBorders, shading: { fill: "ecf0f1", type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text: 'Witness:', bold: true })] })] }),
                new TableCell({ borders: cellBorders, children: [new Paragraph({ spacing: { before: 400 }, children: [new TextRun('')] })] }),
              ]
            }),
          ]
        }),
      ]
    }]
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `FAT-${tc.reqId || 'TestCase'}-${new Date().toISOString().split('T')[0]}.docx`;
  link.click();
  URL.revokeObjectURL(url);
}, [nodes, edges, objectName, objectVersion]);

  return { generateFATProtocol };
}
