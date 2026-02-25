// src/components/DocumentEngine/exportDocument.ts
// Export documents as PDF (via print) or DOCX

import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  PageBreak,
  Header,
  Footer,
  TabStopType,
  TabStopPosition,
} from 'docx';
import type { Document, SectionDef, ColumnDef } from './useDocuments';

// ═══════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════

function getReqNodes(nodes: any[], section: SectionDef) {
  const filter = section.filter || {};
  const activeReqTypes = filter.reqTypes || ['customer', 'platform', 'project', 'implementation'];
  const activeClassifications = filter.classifications || ['need', 'capability', 'requirement'];

  return (nodes || []).filter(n => {
    const d = n.data || {};
    const itemType = d.itemType || d.type || '';
    const reqType = d.reqType || '';
    const classification = d.classification || '';

    if (itemType === 'requirement' || d.reqId) {
      if (reqType && !activeReqTypes.includes(reqType)) return false;
      if (classification && !activeClassifications.includes(classification)) return false;
      return true;
    }
    if (['customer', 'platform', 'project', 'implementation'].includes(reqType)) return true;
    if (['need', 'capability', 'requirement'].includes(classification)) return true;
    return false;
  });
}

function getTracesTo(nodeId: string, edges: any[], nodes: any[]): string[] {
  return (edges || [])
    .filter(e => e.source === nodeId)
    .map(e => {
      const n = (nodes || []).find(n => n.id === e.target);
      return n?.data?.label || e.target;
    });
}

// ═══════════════════════════════════════════════════════════
// PDF EXPORT (via Print)
// ═══════════════════════════════════════════════════════════

export function exportPDF(doc: Document, sections: SectionDef[], metaFields: any[], nodes: any[], edges: any[]) {
  const w = window.open('', '_blank');
  if (!w) { alert('Please allow pop-ups to export PDF'); return; }

  const html = buildPrintHTML(doc, sections, metaFields, nodes, edges);
  w.document.write(html);
  w.document.close();
  // Delay to let styles load
  setTimeout(() => w.print(), 400);
}

function buildPrintHTML(doc: Document, sections: SectionDef[], metaFields: any[], nodes: any[], edges: any[]): string {
  const status = doc.status?.toUpperCase() || 'DRAFT';
  const today = new Date().toLocaleDateString('en-GB');

  let sectionsHTML = '';
  sections.forEach((sec, idx) => {
    const data = doc.section_data?.[sec.id];
    sectionsHTML += `<div class="section">
      <h2>${idx + 1}. ${esc(sec.title)}</h2>
      ${renderSectionHTML(sec, data, nodes, edges)}
    </div>`;
  });

  // Revision log
  let revisionHTML = '';
  if (doc.revision_log?.length) {
    revisionHTML = `<div class="section">
      <h2>Revision History</h2>
      <table><thead><tr><th>Version</th><th>Date</th><th>Author</th><th>Changes</th></tr></thead><tbody>
      ${doc.revision_log.map(r => `<tr><td>${esc(r.version)}</td><td>${esc(r.date)}</td><td>${esc(r.author)}</td><td>${esc(r.changes)}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
  }

  // Metadata table
  const metaRows = metaFields
    .filter(f => doc.metadata?.[f.key])
    .map(f => `<tr><td class="meta-label">${esc(f.label)}</td><td>${esc(doc.metadata[f.key])}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${esc(doc.title)}</title>
<style>
  @page { margin: 20mm; size: A4; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.5; margin: 0; padding: 0; }

  .cover { page-break-after: always; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 90vh; text-align: center; }
  .cover h1 { font-size: 28pt; margin-bottom: 8px; color: #1e293b; }
  .cover .doc-number { font-size: 14pt; color: #3b82f6; font-family: monospace; margin-bottom: 24px; }
  .cover .meta-table { margin: 0 auto; border-collapse: collapse; font-size: 10pt; }
  .cover .meta-table td { padding: 4px 16px; border: 1px solid #e2e8f0; }
  .cover .meta-table .meta-label { font-weight: 600; background: #f8fafc; text-align: right; }
  .cover .status-badge { display: inline-block; padding: 4px 16px; border-radius: 4px; font-weight: 700; font-size: 10pt; margin-top: 16px;
    background: ${status === 'RELEASED' ? '#dcfce7' : status === 'APPROVED' ? '#d1fae5' : status === 'REVIEW' ? '#fef3c7' : '#dbeafe'};
    color: ${status === 'RELEASED' ? '#16a34a' : status === 'APPROVED' ? '#059669' : status === 'REVIEW' ? '#d97706' : '#2563eb'}; }

  .section { margin-bottom: 24px; }
  h2 { font-size: 14pt; color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; margin: 24px 0 12px; page-break-after: avoid; }
  h3 { font-size: 12pt; color: #334155; margin: 16px 0 8px; }

  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 8px 0; page-break-inside: auto; }
  th { background: #f1f5f9; font-weight: 600; text-align: left; padding: 6px 8px; border: 1px solid #cbd5e1; }
  td { padding: 5px 8px; border: 1px solid #e2e8f0; vertical-align: top; }
  tr { page-break-inside: avoid; }
  tr:nth-child(even) { background: #f8fafc; }

  .badge { display: inline-block; padding: 1px 8px; border-radius: 3px; font-size: 8.5pt; font-weight: 600; }
  .badge-high { background: #fee2e2; color: #dc2626; }
  .badge-medium { background: #fef3c7; color: #d97706; }
  .badge-low { background: #dcfce7; color: #16a34a; }
  .badge-type { background: #ede9fe; color: #7c3aed; }

  .checklist-item { padding: 3px 0; }
  .check { font-size: 13pt; margin-right: 6px; }

  .sig-block { display: inline-block; width: 45%; margin: 16px 2%; vertical-align: top; }
  .sig-line { border-bottom: 1px solid #1e293b; height: 40px; margin-bottom: 4px; }
  .sig-label { font-size: 9pt; color: #64748b; }

  .prose { white-space: pre-wrap; line-height: 1.6; }

  .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 8pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding: 4px; }

  @media print {
    .no-print { display: none; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head><body>

<!-- Cover Page -->
<div class="cover">
  <h1>${esc(doc.title)}</h1>
  <div class="doc-number">${esc(doc.doc_number)} — v${esc(doc.version)}</div>
  ${metaRows ? `<table class="meta-table">${metaRows}</table>` : ''}
  <div class="status-badge">${status}</div>
  <div style="margin-top:24px;font-size:9pt;color:#94a3b8;">Generated ${today} · Northlight PLM</div>
</div>

<!-- Table of Contents -->
<div class="section">
  <h2>Table of Contents</h2>
  <div style="line-height:2;">
    ${sections.map((sec, i) => `<div>${i + 1}. ${esc(sec.title)}</div>`).join('')}
    ${doc.revision_log?.length ? '<div>Revision History</div>' : ''}
  </div>
</div>

${sectionsHTML}
${revisionHTML}

</body></html>`;
}

function renderSectionHTML(sec: SectionDef, data: any, nodes: any[], edges: any[]): string {
  switch (sec.type) {
    case 'static':
      return `<div class="prose">${esc(data?.content || sec.template_content || '')}</div>`;

    case 'dynamic_table':
      if (sec.data_source === 'manual') return renderManualTableHTML(sec, data);
      return renderDynamicReqHTML(sec, nodes, edges);

    case 'architecture_view':
      return renderArchitectureHTML(sec, nodes, edges);

    case 'component_list':
      return renderComponentListHTML(sec, nodes);

    case 'io_list':
      return renderIOListHTML(sec, nodes);

    case 'alarm_list':
      return renderAlarmListHTML(sec, nodes);

    case 'sequence_embed':
      return renderSequenceEmbedHTML(sec);

    case 'manual_table':
      return renderManualTableHTML(sec, data);

    case 'risk_matrix':
      return renderRiskMatrixHTML(sec, data);

    case 'test_procedures':
      return renderTestProcHTML(sec, data);

    case 'signature_block':
      return renderSignatureHTML(sec, data);

    case 'checklist':
      return renderChecklistHTML(sec, data);

    case 'reference_list':
      return renderRefListHTML(sec, data);

    default:
      return `<div style="color:#94a3b8;font-style:italic;">Section type "${sec.type}" — content available in Northlight</div>`;
  }
}

function renderManualTableHTML(sec: SectionDef, data: any): string {
  const cols = sec.columns || [];
  const rows = data?.rows || [];
  if (!cols.length) return '<p>No columns defined</p>';
  return `<table>
    <thead><tr>${cols.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? rows.map((row: any) =>
      `<tr>${cols.map(c => `<td>${esc(String(row[c.key] || ''))}</td>`).join('')}</tr>`
    ).join('') : `<tr><td colspan="${cols.length}" style="text-align:center;color:#94a3b8;">No data</td></tr>`}</tbody>
  </table>`;
}

function renderDynamicReqHTML(sec: SectionDef, nodes: any[], edges: any[]): string {
  const reqs = getReqNodes(nodes, sec);
  if (!reqs.length) return '<p style="color:#94a3b8;">No requirements found in PLM canvas</p>';

  const typeLabels: Record<string, string> = {
    customer: 'Customer', platform: 'Platform', project: 'Project', implementation: 'Implementation',
    need: 'Need', capability: 'Capability', requirement: 'Requirement',
  };

  return `<table>
    <thead><tr><th>ID</th><th>Requirement</th><th>Type</th><th>Priority</th><th>Status</th><th>Version</th><th>Traces To</th></tr></thead>
    <tbody>${reqs.map(n => {
      const d = n.data || {};
      const pClass = d.priority === 'high' ? 'badge-high' : d.priority === 'medium' ? 'badge-medium' : 'badge-low';
      const typeName = typeLabels[d.reqType] || typeLabels[d.classification] || d.itemType || 'Requirement';
      const traces = getTracesTo(n.id, edges, nodes);
      return `<tr>
        <td style="font-family:monospace;font-weight:600;color:#3b82f6;">${esc(d.reqId || n.id.slice(0, 8))}</td>
        <td><strong>${esc(d.label || '')}</strong>${d.description ? `<br><span style="font-size:8.5pt;color:#64748b;">${esc(d.description)}</span>` : ''}</td>
        <td><span class="badge badge-type">${esc(typeName)}</span></td>
        <td><span class="badge ${pClass}">${esc((d.priority || '—').charAt(0).toUpperCase() + (d.priority || '—').slice(1))}</span></td>
        <td>${esc(d.state || 'draft')}</td>
        <td>${d.version ? 'v' + esc(d.version) : '—'}</td>
        <td style="font-size:8.5pt;">${traces.length ? traces.map(t => esc(t)).join(', ') : '—'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function getArchNodes(nodes: any[]) {
  const archTypes = ['system', 'subsystem', 'function', 'hardware', 'parameter'];
  return (nodes || []).filter(n => {
    const t = n.data?.itemType || n.data?.type || '';
    return archTypes.includes(t);
  });
}

function buildArchTree(archNodes: any[], edges: any[]) {
  const parentOf = new Map<string, string>();
  (edges || []).forEach(e => parentOf.set(e.target, e.source));
  const archIds = new Set(archNodes.map(n => n.id));
  const typeOrder: Record<string, number> = { system: 0, subsystem: 1, function: 2, hardware: 3, parameter: 4 };
  const childrenOf = new Map<string, string[]>();
  (edges || []).forEach(e => {
    if (!childrenOf.has(e.source)) childrenOf.set(e.source, []);
    childrenOf.get(e.source)!.push(e.target);
  });

  const flat: { node: any; depth: number }[] = [];
  const visited = new Set<string>();
  function walk(id: string, depth: number) {
    if (visited.has(id)) return;
    visited.add(id);
    const node = archNodes.find(n => n.id === id);
    if (!node) return;
    flat.push({ node, depth });
    (childrenOf.get(id) || [])
      .map(cid => archNodes.find(n => n.id === cid))
      .filter(Boolean)
      .sort((a, b) => (typeOrder[a!.data?.itemType || ''] ?? 9) - (typeOrder[b!.data?.itemType || ''] ?? 9))
      .forEach(kid => walk(kid!.id, depth + 1));
  }
  const roots = archNodes.filter(n => { const p = parentOf.get(n.id); return !p || !archIds.has(p); });
  roots.sort((a, b) => (typeOrder[a.data?.itemType || ''] ?? 9) - (typeOrder[b.data?.itemType || ''] ?? 9));
  roots.forEach(n => walk(n.id, 0));
  archNodes.forEach(n => { if (!visited.has(n.id)) flat.push({ node: n, depth: 0 }); });
  return { flat, parentOf };
}

function renderArchitectureHTML(sec: SectionDef, nodes: any[], edges: any[]): string {
  const archNodes = getArchNodes(nodes);
  if (!archNodes.length) return '<p style="color:#94a3b8;">No architecture nodes found in PLM canvas</p>';

  const { flat, parentOf } = buildArchTree(archNodes, edges);
  const typeLabels: Record<string, string> = {
    system: 'System', subsystem: 'Sub-system', function: 'Function', hardware: 'Hardware', parameter: 'Parameter',
  };
  const typeColors: Record<string, string> = {
    system: '#1abc9c', subsystem: '#3498db', function: '#00bcd4', hardware: '#795548', parameter: '#607d8b',
  };

  return `<table>
    <thead><tr><th>Component</th><th>Type</th><th>Ports</th><th>Parent</th></tr></thead>
    <tbody>${flat.map(({ node, depth }) => {
      const d = node.data || {};
      const itemType = d.itemType || d.type || '';
      const ports = d.ports || [];
      const inP = ports.filter((p: any) => p.direction === 'input').length;
      const outP = ports.filter((p: any) => p.direction === 'output').length;
      const parentId = parentOf.get(node.id);
      const parentNode = parentId ? (nodes || []).find(n => n.id === parentId) : null;
      const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(depth);
      const prefix = depth > 0 ? '└ ' : '';
      return `<tr>
        <td>${indent}${prefix}<strong>${esc(d.label || '')}</strong>${d.description ? `<br><span style="font-size:8.5pt;color:#64748b;">${indent}&nbsp;&nbsp;${esc(d.description)}</span>` : ''}</td>
        <td><span class="badge" style="background:${typeColors[itemType] || '#64748b'}20;color:${typeColors[itemType] || '#64748b'};">${esc(typeLabels[itemType] || itemType)}</span></td>
        <td>${ports.length ? `${inP}↓ ${outP}↑` : '—'}</td>
        <td>${parentNode ? esc(parentNode.data?.label || '') : '—'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function renderComponentListHTML(sec: SectionDef, nodes: any[]): string {
  const comps = (nodes || []).filter(n => n.type === 'swComponent' || n.data?.metsFamily);
  if (!comps.length) return '<p style="color:#94a3b8;">No METS components found in PLM canvas</p>';

  return `<table>
    <thead><tr><th>Instance</th><th>Family</th><th>Variant</th><th>Pos No</th><th>System</th><th>DI</th><th>DO</th><th>AI</th><th>AO</th></tr></thead>
    <tbody>${comps.map(n => {
      const d = n.data || {};
      const sigs = d.metsSignals || [];
      return `<tr>
        <td style="font-family:monospace;font-weight:600;">${esc(d.metsInstanceName || 'fb_unnamed')}</td>
        <td><span class="badge badge-type">${esc(d.metsFamily || '—')}</span></td>
        <td>${esc(d.metsVariant || '—')}</td>
        <td style="font-family:monospace;">${esc(d.metsPosNo || '—')}</td>
        <td>${esc(d.metsSystem || '—')}</td>
        <td style="text-align:center;">${sigs.filter((s: any) => s.type === 'DI').length || '—'}</td>
        <td style="text-align:center;">${sigs.filter((s: any) => s.type === 'DO').length || '—'}</td>
        <td style="text-align:center;">${sigs.filter((s: any) => s.type === 'AI').length || '—'}</td>
        <td style="text-align:center;">${sigs.filter((s: any) => s.type === 'AO').length || '—'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function renderIOListHTML(sec: SectionDef, nodes: any[]): string {
  const signals: { name: string; type: string; struct: string; source: string; desc: string }[] = [];
  (nodes || []).forEach(n => {
    const d = n.data || {};
    const src = d.metsInstanceName || d.label || n.id.slice(0, 8);
    if (d.metsSignals?.length) {
      d.metsSignals.forEach((sig: any) => signals.push({ name: sig.name, type: sig.type, struct: sig.struct || '', source: src, desc: sig.desc || '' }));
    }
    if (d.ports?.length && !d.metsFamily) {
      d.ports.forEach((p: any) => signals.push({
        name: p.label || p.name || p.id, type: p.direction === 'input' ? 'DI' : 'DO', struct: p.dataType || '', source: src, desc: p.description || '',
      }));
    }
  });
  if (!signals.length) return '<p style="color:#94a3b8;">No I/O signals found in PLM canvas</p>';

  const typeColors: Record<string, string> = { DI: '#2563eb', DO: '#16a34a', AI: '#d97706', AO: '#dc2626' };
  const order: Record<string, number> = { DI: 0, AI: 1, DO: 2, AO: 3 };
  signals.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));

  return `<table>
    <thead><tr><th>#</th><th>Signal Name</th><th>Type</th><th>Data Type</th><th>Source</th><th>Description</th></tr></thead>
    <tbody>${signals.map((s, i) =>
      `<tr><td>${i + 1}</td>
       <td style="font-family:monospace;font-weight:500;">${esc(s.name)}</td>
       <td><span class="badge" style="background:${typeColors[s.type] || '#64748b'}20;color:${typeColors[s.type] || '#64748b'};">${esc(s.type)}</span></td>
       <td style="font-family:monospace;font-size:9pt;">${esc(s.struct || '—')}</td>
       <td>${esc(s.source)}</td>
       <td>${esc(s.desc || '—')}</td></tr>`
    ).join('')}</tbody>
  </table>`;
}

function deriveAlarmsExport(nodes: any[]) {
  const alarms: { tag: string; source: string; family: string; condition: string; action: string; priority: string; setpoint: string; type: string }[] = [];
  (nodes || []).filter(n => n.type === 'swComponent' || n.data?.metsFamily).forEach(n => {
    const d = n.data || {};
    const inst = d.metsInstanceName || 'fb_unnamed';
    const fam = d.metsFamily || '';
    (d.metsStates || []).forEach((s: any) => {
      const act = (s.actions || '').toLowerCase();
      if (act.includes('alarm') || act.includes('trip') || act.includes('all off')) {
        const pri = act.includes('critical') ? 'critical' : act.includes('trip') || act.includes('all off') ? 'high' : 'medium';
        alarms.push({ tag: `${inst}.${s.name}`, source: inst, family: fam, condition: s.entry || s.name, action: s.actions, priority: pri, setpoint: '', type: 'state' });
      }
    });
    (d.metsConfig || []).forEach((c: any) => {
      const desc = (c.desc || '').toLowerCase();
      if (desc.includes('alarm') || desc.includes('limit') || desc.includes('trip') || desc.includes('max') || desc.includes('min')) {
        alarms.push({ tag: `${inst}.${c.name}`, source: inst, family: fam, condition: c.desc, action: `Setpoint: ${c.default}`, priority: desc.includes('max') || desc.includes('overload') ? 'high' : 'medium', setpoint: c.default, type: 'limit' });
      }
    });
    (d.metsSignals || []).forEach((sig: any) => {
      const nm = (sig.name || '').toLowerCase();
      const ds = (sig.desc || '').toLowerCase();
      if ((nm.includes('trip') || nm.includes('fault') || nm.includes('alarm') || ds.includes('trip') || ds.includes('fault')) && sig.type === 'DI') {
        alarms.push({ tag: `${inst}.${sig.name}`, source: inst, family: fam, condition: sig.desc || sig.name, action: 'Digital input alarm', priority: nm.includes('trip') ? 'high' : 'medium', setpoint: 'TRUE', type: 'signal' });
      }
    });
  });
  return alarms;
}

function renderAlarmListHTML(sec: SectionDef, nodes: any[]): string {
  const alarms = deriveAlarmsExport(nodes);
  if (!alarms.length) return '<p style="color:#94a3b8;">No alarms found in PLM canvas</p>';

  const priColors: Record<string, string> = { critical: '#dc2626', high: '#f59e0b', medium: '#eab308', low: '#22c55e', info: '#3b82f6' };
  return `<table>
    <thead><tr><th>#</th><th>Alarm Tag</th><th>Priority</th><th>Condition</th><th>Action</th><th>Setpoint</th><th>Source</th><th>Type</th></tr></thead>
    <tbody>${alarms.map((a, i) =>
      `<tr><td>${i + 1}</td>
       <td style="font-family:monospace;font-weight:500;">${esc(a.tag)}</td>
       <td><span class="badge" style="background:${priColors[a.priority] || '#64748b'}20;color:${priColors[a.priority] || '#64748b'};">${esc(a.priority)}</span></td>
       <td>${esc(a.condition)}</td><td>${esc(a.action)}</td>
       <td style="font-family:monospace;">${esc(a.setpoint || '—')}</td>
       <td>${esc(a.source)}</td><td style="text-transform:capitalize;">${esc(a.type)}</td></tr>`
    ).join('')}</tbody>
  </table>`;
}

function renderSequenceEmbedHTML(sec: SectionDef): string {
  return `<div style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;text-align:center;">
    <div style="font-size:14pt;margin-bottom:4px;">📊 Sequence Diagram</div>
    <div style="font-size:9pt;color:#94a3b8;">See interactive sequence diagram in Northlight application</div>
  </div>`;
}

function renderRiskMatrixHTML(sec: SectionDef, data: any): string {
  const rows = data?.rows || [];
  return `<table>
    <thead><tr><th>ID</th><th>Failure Mode</th><th>Effect</th><th>Cause</th><th>S</th><th>O</th><th>D</th><th>RPN</th><th>Action</th></tr></thead>
    <tbody>${rows.length ? rows.map((r: any) =>
      `<tr><td>${esc(r.id || '')}</td><td>${esc(r.failure_mode || '')}</td><td>${esc(r.effect || '')}</td><td>${esc(r.cause || '')}</td>
       <td>${r.severity || ''}</td><td>${r.occurrence || ''}</td><td>${r.detection || ''}</td>
       <td style="font-weight:600;">${r.rpn || ''}</td><td>${esc(r.action || '')}</td></tr>`
    ).join('') : '<tr><td colspan="9" style="text-align:center;color:#94a3b8;">No entries</td></tr>'}</tbody>
  </table>`;
}

function renderTestProcHTML(sec: SectionDef, data: any): string {
  const steps = data?.steps || [];
  return `<table>
    <thead><tr><th>#</th><th>Procedure</th><th>Expected Result</th><th>Pass/Fail</th><th>Comment</th></tr></thead>
    <tbody>${steps.length ? steps.map((s: any, i: number) =>
      `<tr><td>${i + 1}</td><td>${esc(s.procedure || '')}</td><td>${esc(s.expected || '')}</td>
       <td>${esc(s.result || '—')}</td><td>${esc(s.comment || '')}</td></tr>`
    ).join('') : '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">No test steps</td></tr>'}</tbody>
  </table>`;
}

function renderSignatureHTML(sec: SectionDef, data: any): string {
  const sigs = sec.signatories || [];
  return `<div style="margin-top:24px;">
    ${sigs.map(s => `<div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">${esc(s.role)}${s.required ? ' *' : ''}</div>
      <div style="font-size:8pt;color:#94a3b8;">Date: _______________</div>
    </div>`).join('')}
  </div>`;
}

function renderChecklistHTML(sec: SectionDef, data: any): string {
  const items = data?.items || [];
  if (!items.length) return '<p style="color:#94a3b8;">No checklist items</p>';
  return items.map((item: any) =>
    `<div class="checklist-item"><span class="check">${item.checked ? '☑' : '☐'}</span>${esc(item.label || item.text || '')}</div>`
  ).join('');
}

function renderRefListHTML(sec: SectionDef, data: any): string {
  const refs = data?.references || [];
  if (!refs.length) return '<p style="color:#94a3b8;">No references</p>';
  return `<table>
    <thead><tr><th>Ref</th><th>Title</th><th>Version</th></tr></thead>
    <tbody>${refs.map((r: any) =>
      `<tr><td>${esc(r.id || '')}</td><td>${esc(r.title || '')}</td><td>${esc(r.version || '')}</td></tr>`
    ).join('')}</tbody>
  </table>`;
}

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


// ═══════════════════════════════════════════════════════════
// DOCX EXPORT
// ═══════════════════════════════════════════════════════════

const BLUE = '3B82F6';
const DARK = '1E293B';
const GRAY = '64748B';
const LIGHT_BG = 'F1F5F9';

function cellBorder() {
  const b = { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' } as const;
  return { top: b, bottom: b, left: b, right: b };
}

function headerCell(text: string, width?: number): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, font: 'Segoe UI', color: DARK })] })],
    shading: { type: ShadingType.SOLID, color: LIGHT_BG },
    borders: cellBorder(),
    ...(width ? { width: { size: width, type: WidthType.PERCENTAGE } } : {}),
  });
}

function textCell(text: string, opts?: { mono?: boolean; bold?: boolean; color?: string }): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({
      text: text || '—',
      size: 18,
      font: opts?.mono ? 'Consolas' : 'Segoe UI',
      bold: opts?.bold,
      color: opts?.color || DARK,
    })] })],
    borders: cellBorder(),
  });
}

export async function exportDOCX(doc: Document, sections: SectionDef[], metaFields: any[], nodes: any[], edges: any[]) {
  const today = new Date().toLocaleDateString('en-GB');

  // Cover page elements
  const coverElements: (Paragraph | Table)[] = [
    new Paragraph({ spacing: { before: 4000 } }),
    new Paragraph({
      children: [new TextRun({ text: doc.title, bold: true, size: 56, font: 'Segoe UI', color: DARK })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `${doc.doc_number} — v${doc.version}`, size: 28, font: 'Consolas', color: BLUE })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: (doc.status || 'draft').toUpperCase(), bold: true, size: 22, font: 'Segoe UI', color: BLUE })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
  ];

  // Metadata table on cover
  const metaRowsWithData = metaFields.filter(f => doc.metadata?.[f.key]);
  if (metaRowsWithData.length > 0) {
    coverElements.push(new Table({
      rows: metaRowsWithData.map(f => new TableRow({
        children: [
          headerCell(f.label, 30),
          textCell(String(doc.metadata[f.key])),
        ],
      })),
      width: { size: 60, type: WidthType.PERCENTAGE },
    }));
  }

  coverElements.push(
    new Paragraph({ spacing: { before: 800 } }),
    new Paragraph({
      children: [new TextRun({ text: `Generated ${today} · Northlight PLM`, size: 16, color: GRAY, font: 'Segoe UI' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // TOC
  const tocElements: (Paragraph | Table)[] = [
    new Paragraph({ text: 'Table of Contents', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
    ...sections.map((sec, i) => new Paragraph({
      children: [new TextRun({ text: `${i + 1}. ${sec.title}`, size: 22, font: 'Segoe UI', color: DARK })],
      spacing: { after: 80 },
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    })),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // Sections
  const sectionElements: (Paragraph | Table)[] = [];
  sections.forEach((sec, idx) => {
    const data = doc.section_data?.[sec.id];
    sectionElements.push(
      new Paragraph({
        text: `${idx + 1}. ${sec.title}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      })
    );
    const rendered = renderSectionDOCX(sec, data, nodes, edges);
    sectionElements.push(...rendered);
  });

  // Revision log
  const revElements: (Paragraph | Table)[] = [];
  if (doc.revision_log?.length) {
    revElements.push(
      new Paragraph({ text: 'Revision History', heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
      new Table({
        rows: [
          new TableRow({ children: [headerCell('Version'), headerCell('Date'), headerCell('Author'), headerCell('Changes')] }),
          ...doc.revision_log.map(r => new TableRow({
            children: [textCell(r.version, { bold: true }), textCell(r.date), textCell(r.author), textCell(r.changes)],
          })),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
    );
  }

  // Build document
  const docx = new DocxDocument({
    sections: [{
      properties: {
        page: { margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 } },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              new TextRun({ text: doc.doc_number, size: 16, color: GRAY, font: 'Segoe UI' }),
              new TextRun({ text: `\tv${doc.version}`, size: 16, color: GRAY, font: 'Segoe UI' }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [new TextRun({ text: `${doc.title} — Northlight PLM`, size: 14, color: GRAY, font: 'Segoe UI' })],
            alignment: AlignmentType.CENTER,
          })],
        }),
      },
      children: [
        ...coverElements,
        ...tocElements,
        ...sectionElements,
        ...revElements,
      ],
    }],
  });

  // Generate and download
  const blob = await Packer.toBlob(docx);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.doc_number || doc.title}_v${doc.version}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}


function renderSectionDOCX(sec: SectionDef, data: any, nodes: any[], edges: any[]): (Paragraph | Table)[] {
  switch (sec.type) {
    case 'static':
      return renderStaticDOCX(data, sec);
    case 'dynamic_table':
      return sec.data_source === 'manual'
        ? renderManualTableDOCX(sec, data)
        : renderDynamicReqDOCX(sec, nodes, edges);
    case 'architecture_view':
      return renderArchitectureDOCX(sec, nodes, edges);
    case 'component_list':
      return renderComponentListDOCX(sec, nodes);
    case 'io_list':
      return renderIOListDOCX(sec, nodes);
    case 'alarm_list':
      return renderAlarmListDOCX(sec, nodes);
    case 'sequence_embed':
      return renderSequenceEmbedDOCX(sec);
    case 'manual_table':
      return renderManualTableDOCX(sec, data);
    case 'risk_matrix':
      return renderRiskMatrixDOCX(sec, data);
    case 'test_procedures':
      return renderTestProcDOCX(sec, data);
    case 'signature_block':
      return renderSignatureDOCX(sec);
    case 'checklist':
      return renderChecklistDOCX(sec, data);
    case 'reference_list':
      return renderRefListDOCX(sec, data);
    default:
      return [new Paragraph({
        children: [new TextRun({ text: `[${sec.type}] — content available in Northlight`, italics: true, color: GRAY, size: 18 })],
      })];
  }
}

function renderStaticDOCX(data: any, sec: SectionDef): Paragraph[] {
  const content = data?.content || sec.template_content || '';
  return content.split('\n').map((line: string) =>
    new Paragraph({
      children: [new TextRun({ text: line, size: 22, font: 'Segoe UI', color: DARK })],
      spacing: { after: 80 },
    })
  );
}

function renderManualTableDOCX(sec: SectionDef, data: any): (Paragraph | Table)[] {
  const cols = sec.columns || [];
  const rows = data?.rows || [];
  if (!cols.length) return [new Paragraph({ children: [new TextRun({ text: 'No columns defined', italics: true, color: GRAY, size: 18 })] })];

  return [new Table({
    rows: [
      new TableRow({ children: cols.map(c => headerCell(c.label)) }),
      ...(rows.length ? rows.map((row: any) => new TableRow({
        children: cols.map(c => textCell(String(row[c.key] || ''))),
      })) : [new TableRow({
        children: [new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'No data', italics: true, color: GRAY, size: 18 })] })],
          borders: cellBorder(),
          columnSpan: cols.length,
        })],
      })]),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })];
}

function renderDynamicReqDOCX(sec: SectionDef, nodes: any[], edges: any[]): (Paragraph | Table)[] {
  const reqs = getReqNodes(nodes, sec);
  if (!reqs.length) return [new Paragraph({
    children: [new TextRun({ text: 'No requirements found in PLM canvas', italics: true, color: GRAY, size: 18 })],
  })];

  const typeLabels: Record<string, string> = {
    customer: 'Customer', platform: 'Platform', project: 'Project', implementation: 'Implementation',
    need: 'Need', capability: 'Capability', requirement: 'Requirement',
  };

  return [new Table({
    rows: [
      new TableRow({ children: [headerCell('ID', 12), headerCell('Requirement', 30), headerCell('Type', 14), headerCell('Priority', 10), headerCell('Status', 10), headerCell('Ver', 6), headerCell('Traces To', 18)] }),
      ...reqs.map(n => {
        const d = n.data || {};
        const typeName = typeLabels[d.reqType] || typeLabels[d.classification] || d.itemType || 'Requirement';
        const traces = getTracesTo(n.id, edges, nodes);
        return new TableRow({
          children: [
            textCell(d.reqId || n.id.slice(0, 8), { mono: true, bold: true, color: BLUE }),
            textCell(d.label || ''),
            textCell(typeName),
            textCell((d.priority || '—').charAt(0).toUpperCase() + (d.priority || '—').slice(1)),
            textCell(d.state || 'draft'),
            textCell(d.version ? `v${d.version}` : '—', { mono: true }),
            textCell(traces.length ? traces.join(', ') : '—'),
          ],
        });
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })];
}

function renderArchitectureDOCX(sec: SectionDef, nodes: any[], edges: any[]): (Paragraph | Table)[] {
  const archNodes = getArchNodes(nodes);
  if (!archNodes.length) return [new Paragraph({
    children: [new TextRun({ text: 'No architecture nodes found in PLM canvas', italics: true, color: GRAY, size: 18 })],
  })];

  const { flat, parentOf } = buildArchTree(archNodes, edges);
  const typeLabels: Record<string, string> = {
    system: 'System', subsystem: 'Sub-system', function: 'Function', hardware: 'Hardware', parameter: 'Parameter',
  };

  return [new Table({
    rows: [
      new TableRow({ children: [headerCell('Component', 35), headerCell('Type', 15), headerCell('Ports', 10), headerCell('Parent', 20), headerCell('Description', 20)] }),
      ...flat.map(({ node, depth }) => {
        const d = node.data || {};
        const itemType = d.itemType || d.type || '';
        const ports = d.ports || [];
        const inP = ports.filter((p: any) => p.direction === 'input').length;
        const outP = ports.filter((p: any) => p.direction === 'output').length;
        const parentId = parentOf.get(node.id);
        const parentNode = parentId ? (nodes || []).find(n => n.id === parentId) : null;
        const indent = '  '.repeat(depth);
        const prefix = depth > 0 ? '└ ' : '';
        return new TableRow({
          children: [
            textCell(`${indent}${prefix}${d.label || ''}`, { bold: depth === 0 }),
            textCell(typeLabels[itemType] || itemType),
            textCell(ports.length ? `${inP}↓ ${outP}↑` : '—'),
            textCell(parentNode?.data?.label || '—'),
            textCell(d.description || '—'),
          ],
        });
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })];
}

function renderComponentListDOCX(sec: SectionDef, nodes: any[]): (Paragraph | Table)[] {
  const comps = (nodes || []).filter(n => n.type === 'swComponent' || n.data?.metsFamily);
  if (!comps.length) return [new Paragraph({ children: [new TextRun({ text: 'No METS components found', italics: true, color: GRAY, size: 18 })] })];

  return [new Table({
    rows: [
      new TableRow({ children: [headerCell('Instance', 18), headerCell('Family', 10), headerCell('Variant', 14), headerCell('Pos No', 10), headerCell('System', 14), headerCell('DI', 6), headerCell('DO', 6), headerCell('AI', 6), headerCell('AO', 6)] }),
      ...comps.map(n => {
        const d = n.data || {};
        const sigs = d.metsSignals || [];
        return new TableRow({
          children: [
            textCell(d.metsInstanceName || 'fb_unnamed', { mono: true, bold: true }),
            textCell(d.metsFamily || '—'),
            textCell(d.metsVariant || '—'),
            textCell(d.metsPosNo || '—', { mono: true }),
            textCell(d.metsSystem || '—'),
            textCell(String(sigs.filter((s: any) => s.type === 'DI').length || '—')),
            textCell(String(sigs.filter((s: any) => s.type === 'DO').length || '—')),
            textCell(String(sigs.filter((s: any) => s.type === 'AI').length || '—')),
            textCell(String(sigs.filter((s: any) => s.type === 'AO').length || '—')),
          ],
        });
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })];
}

function renderIOListDOCX(sec: SectionDef, nodes: any[]): (Paragraph | Table)[] {
  const signals: { name: string; type: string; struct: string; source: string; desc: string }[] = [];
  (nodes || []).forEach(n => {
    const d = n.data || {};
    const src = d.metsInstanceName || d.label || n.id.slice(0, 8);
    if (d.metsSignals?.length) {
      d.metsSignals.forEach((sig: any) => signals.push({ name: sig.name, type: sig.type, struct: sig.struct || '', source: src, desc: sig.desc || '' }));
    }
    if (d.ports?.length && !d.metsFamily) {
      d.ports.forEach((p: any) => signals.push({
        name: p.label || p.name || p.id, type: p.direction === 'input' ? 'DI' : 'DO', struct: p.dataType || '', source: src, desc: p.description || '',
      }));
    }
  });
  if (!signals.length) return [new Paragraph({ children: [new TextRun({ text: 'No I/O signals found', italics: true, color: GRAY, size: 18 })] })];

  const order: Record<string, number> = { DI: 0, AI: 1, DO: 2, AO: 3 };
  signals.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));

  return [new Table({
    rows: [
      new TableRow({ children: [headerCell('#', 5), headerCell('Signal', 22), headerCell('Type', 8), headerCell('Data Type', 14), headerCell('Source', 18), headerCell('Description', 33)] }),
      ...signals.map((s, i) => new TableRow({
        children: [
          textCell(String(i + 1)),
          textCell(s.name, { mono: true, bold: true }),
          textCell(s.type, { bold: true }),
          textCell(s.struct || '—', { mono: true }),
          textCell(s.source),
          textCell(s.desc || '—'),
        ],
      })),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })];
}

function renderAlarmListDOCX(sec: SectionDef, nodes: any[]): (Paragraph | Table)[] {
  const alarms = deriveAlarmsExport(nodes);
  if (!alarms.length) return [new Paragraph({ children: [new TextRun({ text: 'No alarms found', italics: true, color: GRAY, size: 18 })] })];

  return [new Table({
    rows: [
      new TableRow({ children: [headerCell('#', 4), headerCell('Alarm Tag', 20), headerCell('Priority', 10), headerCell('Condition', 18), headerCell('Action', 18), headerCell('Setpoint', 10), headerCell('Source', 12), headerCell('Type', 8)] }),
      ...alarms.map((a, i) => new TableRow({
        children: [
          textCell(String(i + 1)),
          textCell(a.tag, { mono: true, bold: true }),
          textCell(a.priority.charAt(0).toUpperCase() + a.priority.slice(1), { bold: true }),
          textCell(a.condition),
          textCell(a.action),
          textCell(a.setpoint || '—', { mono: true }),
          textCell(a.source),
          textCell(a.type.charAt(0).toUpperCase() + a.type.slice(1)),
        ],
      })),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })];
}

function renderSequenceEmbedDOCX(sec: SectionDef): (Paragraph | Table)[] {
  return [new Paragraph({
    children: [new TextRun({ text: '[Sequence Diagram — see interactive view in Northlight]', italics: true, color: GRAY, size: 20 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
  })];
}

function renderRiskMatrixDOCX(sec: SectionDef, data: any): (Paragraph | Table)[] {
  const rows = data?.rows || [];
  return [new Table({
    rows: [
      new TableRow({ children: ['ID', 'Failure Mode', 'Effect', 'Cause', 'S', 'O', 'D', 'RPN', 'Action'].map(h => headerCell(h)) }),
      ...(rows.length ? rows.map((r: any) => new TableRow({
        children: [
          textCell(r.id || ''), textCell(r.failure_mode || ''), textCell(r.effect || ''),
          textCell(r.cause || ''), textCell(String(r.severity || '')), textCell(String(r.occurrence || '')),
          textCell(String(r.detection || '')), textCell(String(r.rpn || ''), { bold: true }), textCell(r.action || ''),
        ],
      })) : []),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })];
}

function renderTestProcDOCX(sec: SectionDef, data: any): (Paragraph | Table)[] {
  const steps = data?.steps || [];
  return [new Table({
    rows: [
      new TableRow({ children: ['#', 'Procedure', 'Expected Result', 'Pass/Fail', 'Comment'].map(h => headerCell(h)) }),
      ...(steps.length ? steps.map((s: any, i: number) => new TableRow({
        children: [textCell(String(i + 1)), textCell(s.procedure || ''), textCell(s.expected || ''), textCell(s.result || '—'), textCell(s.comment || '')],
      })) : []),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })];
}

function renderSignatureDOCX(sec: SectionDef): Paragraph[] {
  const sigs = sec.signatories || [];
  const out: Paragraph[] = [new Paragraph({ spacing: { before: 400 } })];
  sigs.forEach(s => {
    out.push(
      new Paragraph({ spacing: { before: 600 } }),
      new Paragraph({
        children: [new TextRun({ text: '_'.repeat(50), color: DARK, size: 20 })],
      }),
      new Paragraph({
        children: [new TextRun({ text: `${s.role}${s.required ? ' *' : ''}`, size: 18, color: GRAY, font: 'Segoe UI' })],
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Date: _______________', size: 16, color: GRAY, font: 'Segoe UI' })],
      }),
    );
  });
  return out;
}

function renderChecklistDOCX(sec: SectionDef, data: any): Paragraph[] {
  const items = data?.items || [];
  if (!items.length) return [new Paragraph({ children: [new TextRun({ text: 'No checklist items', italics: true, color: GRAY, size: 18 })] })];
  return items.map((item: any) => new Paragraph({
    children: [new TextRun({ text: `${item.checked ? '☑' : '☐'}  ${item.label || item.text || ''}`, size: 20, font: 'Segoe UI', color: DARK })],
    spacing: { after: 60 },
  }));
}

function renderRefListDOCX(sec: SectionDef, data: any): (Paragraph | Table)[] {
  const refs = data?.references || [];
  if (!refs.length) return [new Paragraph({ children: [new TextRun({ text: 'No references', italics: true, color: GRAY, size: 18 })] })];
  return [new Table({
    rows: [
      new TableRow({ children: [headerCell('Ref'), headerCell('Title'), headerCell('Version')] }),
      ...refs.map((r: any) => new TableRow({
        children: [textCell(r.id || ''), textCell(r.title || ''), textCell(r.version || '')],
      })),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })];
}
