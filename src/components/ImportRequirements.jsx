/**
 * ImportRequirements - Import kravdokument och skapa noder automatiskt
 * 
 * Stöder: CSV, Excel (.xlsx), Word (.docx), PDF (.pdf), text (.txt)
 * 
 * PDF-parsning: Detekterar mönstret Titel → REQ-ID → Beskrivning
 * som används i MIAS/METS kravspecifikationer.
 * 
 * Alla dropdowns matchar Northlights faktiska datamodell:
 *   reqType: customer | platform | project | implementation
 *   classification: need | capability | requirement
 *   priority: high | medium | low
 *   state: open | frozen | released
 */

import React, { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';

// ─── Constants matching Northlight's actual data model ───
const ITEM_TYPES = [
  { value: 'requirement', label: 'Krav', prefix: 'REQ', color: '#e74c3c' },
  { value: 'system', label: 'System', prefix: 'SYS', color: '#1abc9c' },
  { value: 'subsystem', label: 'Subsystem', prefix: 'SUB', color: '#3498db' },
  { value: 'function', label: 'Funktion', prefix: 'FUN', color: '#2ecc71' },
  { value: 'hardware', label: 'Hårdvara', prefix: 'HW', color: '#f39c12' },
  { value: 'actor', label: 'Aktör', prefix: 'ACT', color: '#e67e22' },
  { value: 'usecase', label: 'Use Case', prefix: 'UC', color: '#9b59b6' },
  { value: 'testcase', label: 'Testfall', prefix: 'TC', color: '#f1c40f' },
];

// Matches getReqTypeColor() in CustomNode.tsx
const REQ_TYPES = [
  { value: 'customer', label: 'Kund', color: '#9b59b6' },
  { value: 'platform', label: 'Plattform', color: '#2c3e50' },
  { value: 'project', label: 'Projekt', color: '#e67e22' },
  { value: 'implementation', label: 'Implementation', color: '#f1c40f' },
];

// Matches getBorderColor() in CustomNode.tsx
const PRIORITIES = [
  { value: 'high', label: 'Hög', color: '#e74c3c' },
  { value: 'medium', label: 'Medium', color: '#f39c12' },
  { value: 'low', label: 'Låg', color: '#27ae60' },
];

// Matches getStateColor() in CustomNode.tsx
const STATES = [
  { value: 'open', label: 'Öppen', color: '#f39c12' },
  { value: 'frozen', label: 'Fryst', color: '#3498db' },
  { value: 'released', label: 'Släppt', color: '#27ae60' },
];

// Matches getClassificationIcon() in CustomNode.tsx
const CLASSIFICATIONS = [
  { value: 'need', label: '🎯 Behov (Need)' },
  { value: 'capability', label: '⚙️ Förmåga (Capability)' },
  { value: 'requirement', label: '📋 Krav (Requirement)' },
];

const STATUSES = [
  { value: 'draft', label: 'Utkast' },
  { value: 'review', label: 'Granskning' },
  { value: 'approved', label: 'Godkänd' },
  { value: 'rejected', label: 'Avvisad' },
];

// Field definitions for CSV/Excel column mapping
const MAPPABLE_FIELDS = [
  { key: 'label', label: 'Namn / Titel', required: true, description: 'Kravets rubrik' },
  { key: 'reqId', label: 'Krav-ID', required: false, description: 'Befintligt ID (t.ex. REQ-001)' },
  { key: 'description', label: 'Beskrivning', required: false, description: 'Detaljerad kravtext' },
  { key: 'rationale', label: 'Motivering', required: false, description: 'Varför kravet behövs' },
  { key: 'priority', label: 'Prioritet', required: false, description: 'high/medium/low' },
  { key: 'status', label: 'Status', required: false, description: 'draft/review/approved/rejected' },
  { key: 'reqType', label: 'Kravtyp', required: false, description: 'customer/platform/project/implementation' },
  { key: 'classification', label: 'Klassificering', required: false, description: 'need/capability/requirement' },
  { key: 'source', label: 'Källa', required: false, description: 'Varifrån kravet kommer' },
  { key: 'notes', label: 'Anteckningar', required: false, description: 'Övriga kommentarer' },
];

function autoDetectMapping(headers) {
  const mapping = {};
  const patterns = {
    label: /^(name|title|label|namn|titel|rubrik|requirement|krav|subject|summary)$/i,
    reqId: /^(id|req.?id|krav.?id|number|nummer|no\.?|#|code|ref|reference)$/i,
    description: /^(desc|description|text|body|detail|details|beskrivning|detalj|content|spec)$/i,
    rationale: /^(rationale|reason|motivation|motivering|why|bakgrund)$/i,
    priority: /^(prio|priority|prioritet|importance|vikt)$/i,
    status: /^(status|state|tillstånd|phase|fas)$/i,
    reqType: /^(type|typ|category|kategori|kind|req.?type|krav.?typ)$/i,
    classification: /^(class|classification|klassificering|level|nivå)$/i,
    source: /^(source|källa|origin|from|document|dokument)$/i,
    notes: /^(note|notes|comment|comments|remark|remarks|anteckning|kommentar)$/i,
  };
  headers.forEach((header, index) => {
    const h = header.trim();
    for (const [field, pattern] of Object.entries(patterns)) {
      if (!mapping[field] && pattern.test(h)) { mapping[field] = index; break; }
    }
  });
  if (mapping.label === undefined) {
    const usedIndices = new Set(Object.values(mapping));
    const firstFree = headers.findIndex((_, i) => !usedIndices.has(i));
    if (firstFree >= 0) mapping.label = firstFree;
  }
  return mapping;
}

function normalizePriority(val) {
  if (!val) return null;
  const v = String(val).toLowerCase().trim();
  if (/^(high|hög|h|1|p1|critical|kritisk)$/.test(v)) return 'high';
  if (/^(medium|medel|m|2|p2|normal|mid)$/.test(v)) return 'medium';
  if (/^(low|låg|l|3|p3)$/.test(v)) return 'low';
  return null;
}

function normalizeStatus(val) {
  if (!val) return null;
  const v = String(val).toLowerCase().trim();
  if (/^(draft|utkast|new|ny)$/.test(v)) return 'draft';
  if (/^(review|granskning|pending)$/.test(v)) return 'review';
  if (/^(approved|godkänd|accepted|active|aktiv)$/.test(v)) return 'approved';
  if (/^(rejected|avvisad|declined|obsolete)$/.test(v)) return 'rejected';
  return null;
}

// ─── PDF/Doc Requirement Extraction ──────────────────────
// Detects the MIAS/METS pattern:
//   Title line      (e.g. "MIAS PMS Priority range")
//   REQ-XXXXXXXX    (ID on its own line)
//   Description...  (one or more lines, until next title+REQ or end)

function extractRequirementsFromText(lines) {
  const requirements = [];

  // Filter noise
  const noisePatterns = [
    /^\{\{.*\}\}$/,
    /^Page \d+ of \d+$/i,
    /^Table of Contents$/i,
    /^\d+$/,
    /^https?:\/\//,
    /^(Document Number|Version|Prepared By|Date):/i,
  ];
  const cleanLines = lines.filter(l => {
    const t = l.trim();
    if (!t) return false;
    return !noisePatterns.some(p => p.test(t));
  });

  // Find all lines that are REQ IDs on their own
  const reqIdPattern = /^((?:REQ|SYS|FUN|SUB|HW|UC|TC|ACT)[-_]?\d{3,})$/i;
  const reqIdIndices = [];
  cleanLines.forEach((line, i) => {
    if (reqIdPattern.test(line.trim())) reqIdIndices.push(i);
  });

  if (reqIdIndices.length > 0) {
    // Strategy 1: Title → REQ-ID → Description (MIAS/METS format)
    const seen = new Set();
    for (let k = 0; k < reqIdIndices.length; k++) {
      const idIdx = reqIdIndices[k];
      const nextIdIdx = k + 1 < reqIdIndices.length ? reqIdIndices[k + 1] : cleanLines.length;
      const reqId = cleanLines[idIdx].trim().match(/((?:REQ|SYS|FUN|SUB|HW|UC|TC|ACT)[-_]?\d{3,})/i)?.[1] || '';

      // Deduplicate: PDF may repeat reqs in both Definitions and Requirements sections
      if (seen.has(reqId)) continue;
      seen.add(reqId);

      // Title: exactly 1 line before REQ-ID (the heading line)
      let title = '';
      if (idIdx > 0) {
        const candidate = cleanLines[idIdx - 1].trim();
        // Only use if it looks like a heading, not body text
        if (candidate.length < 100 &&
            !/\.\s*$/.test(candidate) &&
            !/^(Requirements|Definitions|Purpose|Definition|Functionality|Interfaces)$/i.test(candidate)) {
          title = candidate;
        }
      }

      // Description: lines after REQ-ID until 1 line before next REQ-ID
      // (that last line is the title of the next requirement)
      const descEnd = k + 1 < reqIdIndices.length ? nextIdIdx - 1 : cleanLines.length;
      const descLines = [];
      for (let d = idIdx + 1; d < descEnd; d++) {
        const dLine = cleanLines[d].trim();
        if (/^(Requirements|Definitions)$/i.test(dLine)) continue;
        descLines.push(dLine);
      }
      const description = descLines.join('\n').trim();

      if (title || description) {
        requirements.push({ reqId, title: title || reqId, description });
      }
    }
    return requirements;
  }

  // Strategy 2: Inline format "REQ-001: Description text"
  const inlinePattern = /^((?:REQ|SYS|FUN|SUB|HW|UC|TC|ACT)[-_]?\d+)[:\.\s]+\s*(.*)/i;
  for (const line of cleanLines) {
    const match = line.match(inlinePattern);
    if (match) {
      requirements.push({ reqId: match[1], title: match[2].trim(), description: '' });
    }
  }
  if (requirements.length > 0) return requirements;

  // Strategy 3: Numbered list "1. Requirement text"
  for (const line of cleanLines) {
    const match = line.match(/^(\d+[\.\)])\s+(.*)/);
    if (match) {
      requirements.push({ reqId: '', title: match[2].trim(), description: '' });
    }
  }
  return requirements;
}

// ─── Main Component ─────────────────────────────────────
export default function ImportRequirements({ onImport, onClose, nodeId, setNodeId, generateItemId }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [parseMode, setParseMode] = useState('csv');
  const [parsedData, setParsedData] = useState({ headers: [], rows: [] });
  const [extractedReqs, setExtractedReqs] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [defaults, setDefaults] = useState({
    itemType: 'requirement',
    reqType: 'platform',
    priority: 'medium',
    status: 'draft',
    classification: 'requirement',
    state: 'open',
    version: '1.0',
  });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState(null);
  const fileInputRef = useRef(null);

  // ─── File Parsing ──────────────────────────────────────
  const parseFile = useCallback(async (f) => {
    setFile(f);
    setParseError(null);
    const ext = f.name.split('.').pop().toLowerCase();
    try {
      if (ext === 'csv' || ext === 'tsv') {
        const text = await f.text();
        const sep = ext === 'tsv' ? '\t' : detectSeparator(text);
        const lines = parseCSV(text, sep);
        if (lines.length < 2) throw new Error('Filen innehåller för lite data');
        setParsedData({ headers: lines[0], rows: lines.slice(1).filter(r => r.some(c => c.trim())) });
        setColumnMapping(autoDetectMapping(lines[0]));
        setSelectedRows(new Set(lines.slice(1).filter(r => r.some(c => c.trim())).map((_, i) => i)));
        setParseMode('csv');
        setStep(2);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await f.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (data.length < 2) throw new Error('Kalkylbladet innehåller för lite data');
        const headers = data[0].map(h => String(h || ''));
        const rows = data.slice(1).filter(r => r.some(c => c != null && String(c).trim())).map(r => {
          const row = [...r]; while (row.length < headers.length) row.push('');
          return row.map(c => String(c ?? ''));
        });
        setParsedData({ headers, rows });
        setColumnMapping(autoDetectMapping(headers));
        setSelectedRows(new Set(rows.map((_, i) => i)));
        setParseMode('csv');
        setStep(2);
      } else if (ext === 'docx') {
        await parseDocx(f);
      } else if (ext === 'pdf') {
        await parsePdf(f);
      } else if (ext === 'txt' || ext === 'md') {
        parseDocument(await f.text());
      } else {
        throw new Error('Filtypen .' + ext + ' stöds inte.');
      }
    } catch (err) {
      console.error('Parse error:', err);
      setParseError(err.message);
    }
  }, []);

  const parsePdf = async (f) => {
    const buffer = await f.arrayBuffer();
    if (!window.pdfjsLib) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve();
        };
        script.onerror = () => reject(new Error('Kunde inte ladda PDF-biblioteket'));
        document.head.appendChild(script);
      });
    }
    const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
    const allLines = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const lineMap = {};
      content.items.forEach(item => {
        const y = Math.round(item.transform[5]);
        if (!lineMap[y]) lineMap[y] = [];
        lineMap[y].push({ x: item.transform[4], text: item.str });
      });
      const sortedYs = Object.keys(lineMap).map(Number).sort((a, b) => b - a);
      for (const y of sortedYs) {
        const items = lineMap[y].sort((a, b) => a.x - b.x);
        const text = items.map(i => i.text).join(' ').trim();
        if (text) allLines.push(text);
      }
    }
    if (allLines.length === 0) throw new Error('Kunde inte extrahera text. Filen kan vara skannad.');
    parseDocument(allLines.join('\n'));
  };

  const parseDocx = async (f) => {
    const buffer = await f.arrayBuffer();
    if (!window.mammoth) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Kunde inte ladda Word-biblioteket'));
        document.head.appendChild(script);
      });
    }
    const result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
    parseDocument(result.value);
  };

  const parseDocument = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const reqs = extractRequirementsFromText(lines);
    if (reqs.length === 0) throw new Error('Hittade inga krav. Dokumentet måste innehålla REQ-ID:n (t.ex. REQ-000001).');
    setExtractedReqs(reqs);
    setSelectedRows(new Set(reqs.map((_, i) => i)));
    setParseMode('document');
    setStep(2);
  };

  function detectSeparator(text) {
    const fl = text.split('\n')[0];
    const s = (fl.match(/;/g) || []).length;
    const c = (fl.match(/,/g) || []).length;
    const t = (fl.match(/\t/g) || []).length;
    if (t > s && t > c) return '\t'; if (s > c) return ';'; return ',';
  }

  function parseCSV(text, sep) {
    const rows = []; let current = []; let cell = ''; let inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) {
        if (ch === '"' && text[i+1] === '"') { cell += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cell += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === sep) { current.push(cell); cell = ''; }
        else if (ch === '\n' || (ch === '\r' && text[i+1] === '\n')) {
          current.push(cell); cell = '';
          if (current.some(c => c.trim())) rows.push(current);
          current = []; if (ch === '\r') i++;
        } else cell += ch;
      }
    }
    current.push(cell);
    if (current.some(c => c.trim())) rows.push(current);
    return rows;
  }

  // ─── Import Execution ─────────────────────────────────
  const doImport = useCallback(() => {
    setImporting(true);
    const itemTypeInfo = ITEM_TYPES.find(t => t.value === defaults.itemType);
    const prefix = itemTypeInfo?.prefix || 'REQ';
    const newNodes = [];
    let currentId = nodeId;

    for (const rowIndex of selectedRows) {
      let label, reqId, description;
      if (parseMode === 'document') {
        const req = extractedReqs[rowIndex];
        if (!req) continue;
        label = req.title; reqId = req.reqId; description = req.description;
      } else {
        const row = parsedData.rows[rowIndex];
        if (!row) continue;
        const gv = (k) => { const ci = columnMapping[k]; return ci !== undefined && ci !== -1 ? (row[ci]?.trim() || '') : ''; };
        label = gv('label'); reqId = gv('reqId'); description = gv('description');
      }
      if (!label) continue;

      if (!reqId) {
        if (generateItemId) reqId = generateItemId(defaults.itemType);
        else { reqId = prefix + '-' + String(currentId).padStart(3, '0'); currentId++; }
      }

      newNodes.push({
        id: 'node-' + currentId,
        type: 'custom',
        position: { x: 100 + (newNodes.length % 4) * 280, y: 100 + Math.floor(newNodes.length / 4) * 180 },
        data: {
          label, reqId, description: description || '',
          rationale: '', status: defaults.status, priority: defaults.priority,
          reqType: defaults.reqType, classification: defaults.classification,
          state: defaults.state, version: defaults.version,
          itemType: defaults.itemType, source: file?.name || '',
          verificationMethod: '', acceptance: '', notes: '',
          importedAt: new Date().toISOString(), importedFrom: file?.name || 'unknown',
        },
      });
      currentId++;
    }

    if (setNodeId) setNodeId(currentId);
    setImportResult({ count: newNodes.length });
    if (onImport) onImport(newNodes);
    setImporting(false);
    setStep(4);
  }, [selectedRows, parsedData, extractedReqs, columnMapping, defaults, nodeId, setNodeId, generateItemId, onImport, file, parseMode]);

  const handleDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) parseFile(e.dataTransfer.files[0]); }, [parseFile]);
  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const toggleRow = (idx) => setSelectedRows(prev => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; });
  const toggleAll = () => {
    const total = parseMode === 'document' ? extractedReqs.length : parsedData.rows.length;
    setSelectedRows(prev => prev.size === total ? new Set() : new Set(Array.from({ length: total }, (_, i) => i)));
  };

  const totalRows = parseMode === 'document' ? extractedReqs.length : parsedData.rows.length;

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        {/* Header */}
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📥</span>
            <div>
              <h2 style={S.title}>Importera krav</h2>
              <p style={S.subtitle}>
                {step === 1 && 'Ladda upp ett kravdokument'}
                {step === 2 && 'Konfigurera import — ' + (file?.name || '')}
                {step === 3 && 'Förhandsvisning — ' + selectedRows.size + ' av ' + totalRows + ' krav'}
                {step === 4 && 'Import klar — ' + (importResult?.count || 0) + ' krav skapade'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>

        {/* Steps */}
        <div style={S.steps}>
          {['Fil', 'Konfigurera', 'Förhandsvisa', 'Klar'].map((lbl, i) => (
            <div key={i} style={{ ...S.stepItem, opacity: step > i ? 1 : 0.4, fontWeight: step === i + 1 ? 700 : 400 }}>
              <div style={{ ...S.stepDot, background: step > i ? '#1abc9c' : step === i + 1 ? '#3498db' : '#334155' }}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              {lbl}
            </div>
          ))}
        </div>

        <div style={S.content}>
          {/* STEP 1: Upload */}
          {step === 1 && (
            <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              style={{ ...S.dropZone, borderColor: dragOver ? '#3498db' : '#334155', background: dragOver ? 'rgba(52,152,219,0.08)' : 'rgba(30,41,59,0.5)' }}>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.docx,.pdf,.txt,.md,.tsv"
                onChange={(e) => e.target.files[0] && parseFile(e.target.files[0])} style={{ display: 'none' }} />
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.6 }}>📄</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', margin: '0 0 6px' }}>Dra och släpp en fil här</p>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>eller klicka för att välja fil</p>
              <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['.csv', '.xlsx', '.pdf', '.docx', '.txt'].map(ext => <span key={ext} style={S.badge}>{ext}</span>)}
              </div>
              {parseError && <div style={S.error}><span>⚠️</span> {parseError}</div>}
            </div>
          )}

          {/* STEP 2: Configure */}
          {step === 2 && (
            <div>
              <div style={S.defaultsBar}>
                <h3 style={S.sectionTitle}>Egenskaper för importerade poster</h3>
                <p style={{ fontSize: 11, color: '#64748b', margin: '-6px 0 12px' }}>
                  Dessa värden sätts på alla importerade krav. Du kan ändra individuellt efteråt.
                </p>
                <div style={S.defaultsGrid}>
                  <Sel label="Nodtyp" value={defaults.itemType} onChange={(v) => setDefaults(d => ({ ...d, itemType: v }))}
                    options={ITEM_TYPES.map(t => ({ value: t.value, label: t.label + ' (' + t.prefix + ')', color: t.color }))} showColor />
                  <Sel label="Kravtyp" value={defaults.reqType} onChange={(v) => setDefaults(d => ({ ...d, reqType: v }))}
                    options={REQ_TYPES} showColor />
                  <Sel label="Klassificering" value={defaults.classification} onChange={(v) => setDefaults(d => ({ ...d, classification: v }))}
                    options={CLASSIFICATIONS} />
                  <Sel label="Prioritet" value={defaults.priority} onChange={(v) => setDefaults(d => ({ ...d, priority: v }))}
                    options={PRIORITIES} showColor />
                  <Sel label="Status" value={defaults.status} onChange={(v) => setDefaults(d => ({ ...d, status: v }))}
                    options={STATUSES} />
                  <Sel label="Tillstånd" value={defaults.state} onChange={(v) => setDefaults(d => ({ ...d, state: v }))}
                    options={STATES} showColor />
                </div>
              </div>

              {parseMode === 'document' && (
                <>
                  <h3 style={S.sectionTitle}>Extraherade krav ({extractedReqs.length} st)</h3>
                  <div style={S.tableWrapper}>
                    <table style={S.table}>
                      <thead><tr>
                        <th style={{ ...S.th, width: 40, textAlign: 'center' }}><input type="checkbox" checked={selectedRows.size === extractedReqs.length} onChange={toggleAll} /></th>
                        <th style={S.th}>REQ-ID</th><th style={S.th}>Titel</th><th style={S.th}>Beskrivning</th>
                      </tr></thead>
                      <tbody>
                        {extractedReqs.map((req, i) => (
                          <tr key={i} style={{ background: selectedRows.has(i) ? 'rgba(26,188,156,0.06)' : 'transparent', opacity: selectedRows.has(i) ? 1 : 0.4 }}>
                            <td style={{ ...S.td, textAlign: 'center' }}><input type="checkbox" checked={selectedRows.has(i)} onChange={() => toggleRow(i)} /></td>
                            <td style={S.td}><span style={{ ...S.tag, background: 'rgba(52,152,219,0.15)', color: '#3498db', border: '1px solid rgba(52,152,219,0.3)' }}>{req.reqId}</span></td>
                            <td style={{ ...S.td, fontWeight: 600, color: '#e2e8f0' }}>{req.title}</td>
                            <td style={{ ...S.td, maxWidth: 350, fontSize: 11, whiteSpace: 'pre-wrap' }}>{req.description.length > 200 ? req.description.substring(0, 200) + '…' : req.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {parseMode === 'csv' && (
                <>
                  <h3 style={S.sectionTitle}>Kolumnmappning</h3>
                  <div style={S.mappingGrid}>
                    {MAPPABLE_FIELDS.map(field => (
                      <div key={field.key} style={S.mappingRow}>
                        <div style={S.mappingLabel}>
                          <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{field.label}{field.required && <span style={{ color: '#e74c3c', marginLeft: 2 }}>*</span>}</span>
                          <span style={{ fontSize: 10, color: '#64748b' }}>{field.description}</span>
                        </div>
                        <select style={S.select} value={columnMapping[field.key] ?? -1}
                          onChange={(e) => { const v = parseInt(e.target.value); setColumnMapping(p => ({ ...p, [field.key]: v === -1 ? undefined : v })); }}>
                          <option value={-1}>— Inte mappad —</option>
                          {parsedData.headers.map((h, i) => <option key={i} value={i}>{h || 'Kolumn ' + (i+1)}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 3: Preview */}
          {step === 3 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{selectedRows.size} av {totalRows} valda</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Tag color={REQ_TYPES.find(r => r.value === defaults.reqType)?.color}>{REQ_TYPES.find(r => r.value === defaults.reqType)?.label}</Tag>
                  <Tag color={PRIORITIES.find(p => p.value === defaults.priority)?.color}>{PRIORITIES.find(p => p.value === defaults.priority)?.label}</Tag>
                  <Tag>{CLASSIFICATIONS.find(c => c.value === defaults.classification)?.label}</Tag>
                  <Tag color={STATES.find(s => s.value === defaults.state)?.color}>{STATES.find(s => s.value === defaults.state)?.label}</Tag>
                  <button onClick={toggleAll} style={S.smallBtn}>{selectedRows.size === totalRows ? 'Avmarkera alla' : 'Markera alla'}</button>
                </div>
              </div>
              <div style={S.tableWrapper}>
                <table style={S.table}>
                  <thead><tr>
                    <th style={{ ...S.th, width: 40, textAlign: 'center' }}><input type="checkbox" checked={selectedRows.size === totalRows} onChange={toggleAll} /></th>
                    <th style={S.th}>ID</th><th style={S.th}>Namn</th><th style={S.th}>Beskrivning</th>
                    <th style={S.th}>Kravtyp</th><th style={S.th}>Prioritet</th><th style={S.th}>Klass.</th>
                  </tr></thead>
                  <tbody>
                    {(parseMode === 'document' ? extractedReqs : parsedData.rows).map((row, i) => {
                      const isDoc = parseMode === 'document';
                      const reqId = isDoc ? row.reqId : (columnMapping.reqId !== undefined ? row[columnMapping.reqId] : '');
                      const label = isDoc ? row.title : (columnMapping.label !== undefined ? row[columnMapping.label] : '');
                      const desc = isDoc ? row.description : (columnMapping.description !== undefined ? row[columnMapping.description] : '');
                      const sel = selectedRows.has(i);
                      return (
                        <tr key={i} style={{ background: sel ? 'rgba(26,188,156,0.06)' : 'transparent', opacity: sel ? 1 : 0.4 }}>
                          <td style={{ ...S.td, textAlign: 'center' }}><input type="checkbox" checked={sel} onChange={() => toggleRow(i)} /></td>
                          <td style={S.td}><span style={{ ...S.tag, background: 'rgba(52,152,219,0.15)', color: '#3498db' }}>{reqId || '(auto)'}</span></td>
                          <td style={{ ...S.td, fontWeight: 600, color: '#e2e8f0', maxWidth: 180 }}>{String(label||'').substring(0,50)}</td>
                          <td style={{ ...S.td, maxWidth: 220, fontSize: 11 }}>{String(desc||'').substring(0,80)}{String(desc||'').length > 80 ? '…' : ''}</td>
                          <td style={S.td}><Tag color={REQ_TYPES.find(r => r.value === defaults.reqType)?.color}>{REQ_TYPES.find(r => r.value === defaults.reqType)?.label}</Tag></td>
                          <td style={S.td}><Tag color={PRIORITIES.find(p => p.value === defaults.priority)?.color}>{PRIORITIES.find(p => p.value === defaults.priority)?.label}</Tag></td>
                          <td style={S.td}><Tag>{CLASSIFICATIONS.find(c => c.value === defaults.classification)?.label}</Tag></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: Done */}
          {step === 4 && importResult && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
              <h3 style={{ color: '#e2e8f0', fontSize: 18, margin: '0 0 8px' }}>{importResult.count} krav importerade</h3>
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>Från: {file?.name}</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Tag color={REQ_TYPES.find(r => r.value === defaults.reqType)?.color}>{REQ_TYPES.find(r => r.value === defaults.reqType)?.label}</Tag>
                <Tag color={PRIORITIES.find(p => p.value === defaults.priority)?.color}>{PRIORITIES.find(p => p.value === defaults.priority)?.label}</Tag>
                <Tag>{CLASSIFICATIONS.find(c => c.value === defaults.classification)?.label}</Tag>
                <Tag color={STATES.find(s => s.value === defaults.state)?.color}>{STATES.find(s => s.value === defaults.state)?.label}</Tag>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={S.footer}>
          {step > 1 && step < 4 && <button onClick={() => setStep(s => s - 1)} style={S.secondaryBtn}>← Tillbaka</button>}
          <div style={{ flex: 1 }} />
          {step === 2 && (
            <button onClick={() => {
              if (parseMode === 'csv' && columnMapping.label === undefined) { alert('Mappa minst "Namn / Titel"'); return; }
              setStep(3);
            }} style={S.primaryBtn}>Förhandsvisning →</button>
          )}
          {step === 3 && (
            <button onClick={doImport} disabled={importing || selectedRows.size === 0}
              style={{ ...S.primaryBtn, background: importing ? '#334155' : '#1abc9c', cursor: importing ? 'wait' : 'pointer' }}>
              {importing ? 'Importerar...' : 'Importera ' + selectedRows.size + ' krav'}
            </button>
          )}
          {step === 4 && <button onClick={onClose} style={S.primaryBtn}>Stäng</button>}
        </div>
      </div>
    </div>
  );
}

// ─── Small UI helpers ───────────────────────────────────
function Tag({ color, children }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      fontSize: 10, fontWeight: 600,
      background: color ? color + '22' : 'rgba(30,41,59,0.5)',
      color: color || '#94a3b8',
      border: '1px solid ' + (color ? color + '55' : '#334155'),
    }}>{children}</span>
  );
}

function Sel({ label, value, onChange, options, showColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <select
        style={{ ...S.select, ...(showColor ? { borderLeft: '4px solid ' + (options.find(o => o.value === value)?.color || '#334155') } : {}) }}
        value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────
const S = {
  overlay: { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { width: '90vw', maxWidth: 960, maxHeight: '90vh', background: '#0f172a', borderRadius: 14, border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1e293b', background: 'rgba(30,41,59,0.4)' },
  title: { margin: 0, fontSize: 16, fontWeight: 700, color: '#e2e8f0' },
  subtitle: { margin: '2px 0 0', fontSize: 11, color: '#64748b' },
  closeBtn: { background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', padding: '4px 8px', borderRadius: 6 },
  steps: { display: 'flex', gap: 0, padding: '12px 20px', borderBottom: '1px solid #1e293b', background: 'rgba(15,23,42,0.8)' },
  stepItem: { flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8' },
  stepDot: { width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' },
  content: { flex: 1, overflow: 'auto', padding: 20, minHeight: 300 },
  dropZone: { border: '2px dashed #334155', borderRadius: 12, padding: '60px 40px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  badge: { background: '#1e293b', color: '#64748b', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, fontFamily: 'monospace', border: '1px solid #334155' },
  error: { marginTop: 16, padding: '10px 16px', background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 8, color: '#e74c3c', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 },
  defaultsBar: { background: 'rgba(30,41,59,0.5)', borderRadius: 10, border: '1px solid #1e293b', padding: 16, marginBottom: 20 },
  defaultsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#e2e8f0', margin: '0 0 10px' },
  mappingGrid: { display: 'flex', flexDirection: 'column', gap: 6 },
  mappingRow: { display: 'grid', gridTemplateColumns: '200px 1fr', gap: 10, alignItems: 'center', padding: '6px 10px', background: 'rgba(30,41,59,0.3)', borderRadius: 6, border: '1px solid #1e293b' },
  mappingLabel: { display: 'flex', flexDirection: 'column', gap: 1 },
  select: { background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', padding: '6px 10px', fontSize: 12, outline: 'none', cursor: 'pointer', minWidth: 140 },
  tableWrapper: { overflow: 'auto', maxHeight: 350, borderRadius: 8, border: '1px solid #1e293b' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', background: '#1e293b', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 1 },
  td: { padding: '6px 10px', borderBottom: '1px solid #1e293b11', color: '#cbd5e1', fontSize: 12 },
  tag: { display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, border: '1px solid #334155', background: 'rgba(30,41,59,0.5)', color: '#94a3b8' },
  footer: { display: 'flex', gap: 10, padding: '12px 20px', borderTop: '1px solid #1e293b', background: 'rgba(30,41,59,0.4)', alignItems: 'center' },
  primaryBtn: { background: '#3498db', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer' },
  smallBtn: { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', padding: '4px 10px', borderRadius: 6, fontSize: 10, cursor: 'pointer', fontWeight: 600 },
};
