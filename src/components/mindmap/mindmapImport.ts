// ═══════════════════════════════════════════════════════════════
// Northlight Mind Map — Import Parsers
// Supports: Indented text, Markdown, Miro CSV, PDF
// ═══════════════════════════════════════════════════════════════

import type { MindMapNodeData } from './mindmapTypes';

let idCounter = 0;
function uid() { return `imp_${Date.now()}_${++idCounter}_${Math.random().toString(36).slice(2, 5)}`; }

// ── Color palette for depth levels ──
const DEPTH_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6',
];

function colorForDepth(depth: number): string {
  return DEPTH_COLORS[depth % DEPTH_COLORS.length];
}

// ═══════════════════════════════════════════════════════════════
// 1) INDENTED TEXT / MARKDOWN PARSER
// ═══════════════════════════════════════════════════════════════

export function parseIndentedText(text: string): MindMapNodeData | null {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return null;

  // Detect format: markdown headings (# ## ###) vs indented text
  const hasMarkdownHeadings = lines.some(l => /^#{1,6}\s/.test(l.trim()));

  if (hasMarkdownHeadings) return parseMarkdownHeadings(lines);
  return parseIndentedLines(lines);
}

function parseMarkdownHeadings(lines: string[]): MindMapNodeData {
  // Also handle bullet lists under headings
  const root: MindMapNodeData = { id: uid(), label: 'Import', color: DEPTH_COLORS[0], children: [] };
  const stack: { node: MindMapNodeData; level: number }[] = [{ node: root, level: 0 }];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    const bulletMatch = line.match(/^(\s*)([-*+]|\d+[.)]) (.+)/);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const label = headingMatch[2].trim();
      const node: MindMapNodeData = { id: uid(), label, color: colorForDepth(level), children: [] };

      // Pop stack to find parent at lower level
      while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
      stack[stack.length - 1].node.children!.push(node);
      stack.push({ node, level });

    } else if (bulletMatch) {
      const indent = bulletMatch[1].length;
      const label = bulletMatch[3].trim();
      const level = 100 + Math.floor(indent / 2); // bullets nest under last heading
      const node: MindMapNodeData = { id: uid(), label, children: [] };

      while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
      stack[stack.length - 1].node.children!.push(node);
      stack.push({ node, level });

    } else if (line.trim()) {
      // Plain text line — add as leaf to current context
      const node: MindMapNodeData = { id: uid(), label: line.trim(), children: [] };
      stack[stack.length - 1].node.children!.push(node);
    }
  }

  // If root has exactly one child, promote it
  if (root.children!.length === 1) {
    const child = root.children![0];
    child.color = child.color || DEPTH_COLORS[0];
    return child;
  }
  root.label = root.children![0]?.label || 'Import';
  return root;
}

function parseIndentedLines(lines: string[]): MindMapNodeData {
  // Detect indent unit (tab or smallest space indent)
  let minIndent = Infinity;
  for (const line of lines) {
    const match = line.match(/^(\s+)/);
    if (match && match[1].length > 0 && match[1].length < minIndent) {
      minIndent = match[1].length;
    }
  }
  if (minIndent === Infinity) minIndent = 2;
  const useTabs = lines.some(l => l.startsWith('\t'));

  function getLevel(line: string): number {
    if (useTabs) {
      const m = line.match(/^(\t+)/);
      return m ? m[1].length : 0;
    }
    const m = line.match(/^(\s+)/);
    return m ? Math.round(m[1].length / minIndent) : 0;
  }

  function cleanLabel(line: string): string {
    return line.trim()
      .replace(/^[-*+]\s+/, '')       // remove bullet markers
      .replace(/^\d+[.)]\s+/, '');    // remove numbered list markers
  }

  const root: MindMapNodeData = {
    id: uid(), label: cleanLabel(lines[0]), color: DEPTH_COLORS[0], children: [],
  };
  const stack: { node: MindMapNodeData; level: number }[] = [{ node: root, level: getLevel(lines[0]) }];

  for (let i = 1; i < lines.length; i++) {
    const level = getLevel(lines[i]);
    const label = cleanLabel(lines[i]);
    if (!label) continue;

    const node: MindMapNodeData = { id: uid(), label, color: colorForDepth(level), children: [] };

    // Pop stack to find parent
    while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
    stack[stack.length - 1].node.children!.push(node);
    stack.push({ node, level });
  }

  return root;
}


// ═══════════════════════════════════════════════════════════════
// 2) MIRO CSV PARSER
// ═══════════════════════════════════════════════════════════════

export function parseMiroCSV(csvText: string): MindMapNodeData | null {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return null;

  // Parse CSV (handle quoted fields)
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        result.push(current.trim()); current = '';
      } else {
        current += line[i];
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, ''));
  const rows = lines.slice(1).map(parseCSVLine);

  // Detect Miro format: look for Id, Title/Content, Parent
  const idCol = headers.findIndex(h => h === 'id' || h === 'item id');
  const titleCol = headers.findIndex(h => h === 'title' || h === 'content' || h === 'text' || h === 'name');
  const parentCol = headers.findIndex(h => h === 'parent' || h === 'parent id' || h === 'parent_id');
  const typeCol = headers.findIndex(h => h === 'type' || h === 'item type');

  if (titleCol < 0) {
    // Fallback: treat as simple list, first column = items
    return parseSimpleCSV(rows.map(r => r[0]).filter(Boolean));
  }

  if (idCol >= 0 && parentCol >= 0) {
    // Hierarchical Miro export with parent references
    return parseMiroHierarchical(rows, idCol, titleCol, parentCol, typeCol);
  }

  // Flat list of items
  return parseSimpleCSV(rows.map(r => r[titleCol]).filter(Boolean));
}

function parseMiroHierarchical(
  rows: string[][], idCol: number, titleCol: number, parentCol: number, typeCol: number,
): MindMapNodeData {
  const nodeById = new Map<string, MindMapNodeData>();
  const parentMap = new Map<string, string>();

  for (const row of rows) {
    const id = row[idCol] || uid();
    const title = row[titleCol] || 'Untitled';
    const parentId = row[parentCol] || '';
    const type = typeCol >= 0 ? row[typeCol] : '';

    // Skip non-content types (connectors, frames, etc.)
    if (type && /connector|line|arrow/i.test(type)) continue;

    const node: MindMapNodeData = { id: uid(), label: title, children: [], sublabel: type || undefined };
    nodeById.set(id, node);
    if (parentId) parentMap.set(id, parentId);
  }

  // Build tree
  const roots: MindMapNodeData[] = [];
  for (const [origId, node] of nodeById) {
    const parentOrigId = parentMap.get(origId);
    if (parentOrigId && nodeById.has(parentOrigId)) {
      nodeById.get(parentOrigId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  // Assign colors by depth
  function assignColors(node: MindMapNodeData, depth: number) {
    node.color = colorForDepth(depth);
    (node.children || []).forEach(c => assignColors(c, depth + 1));
  }

  if (roots.length === 1) {
    assignColors(roots[0], 0);
    return roots[0];
  }

  const root: MindMapNodeData = { id: uid(), label: 'Miro Import', color: DEPTH_COLORS[0], children: roots };
  assignColors(root, 0);
  return root;
}

function parseSimpleCSV(items: string[]): MindMapNodeData {
  return {
    id: uid(), label: 'Import', color: DEPTH_COLORS[0],
    children: items.map((label, i) => ({
      id: uid(), label, color: colorForDepth(1), children: [],
    })),
  };
}


// ═══════════════════════════════════════════════════════════════
// 3) PDF TEXT EXTRACTION (loads PDF.js from CDN — no npm dep)
// ═══════════════════════════════════════════════════════════════

const PDFJS_VERSION = '3.11.174';
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

let pdfjsPromise: Promise<any> | null = null;

function loadPdfJs(): Promise<any> {
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as any).pdfjsLib) { resolve((window as any).pdfjsLib); return; }
    const script = document.createElement('script');
    script.src = `${PDFJS_CDN}/pdf.min.js`;
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (!lib) { reject(new Error('PDF.js failed to load')); return; }
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
      resolve(lib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'));
    document.head.appendChild(script);
  });
  return pdfjsPromise;
}

export async function extractPDFText(file: File): Promise<string> {
  const pdfjsLib = await loadPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group text items by vertical position to reconstruct lines
    const items = content.items as Array<{ str: string; transform: number[]; height: number }>;
    let currentY = -1;
    let currentLine = '';

    for (const item of items) {
      const y = Math.round(item.transform[5]); // vertical position
      const fontSize = item.height;

      if (currentY >= 0 && Math.abs(y - currentY) > 3) {
        // New line
        if (currentLine.trim()) textParts.push(currentLine.trim());
        currentLine = '';
      }

      // Add font size marker for headings detection
      if (fontSize > 14) {
        currentLine += `[H:${Math.round(fontSize)}]`;
      }
      currentLine += item.str;
      currentY = y;
    }
    if (currentLine.trim()) textParts.push(currentLine.trim());
    textParts.push(''); // page break
  }

  return textParts.join('\n');
}

export function parsePDFText(rawText: string): MindMapNodeData {
  // Detect headings from font size markers [H:xx] and structure
  const lines = rawText.split('\n').filter(l => l.trim().length > 0);

  // Extract heading levels from font size
  const parsed: { text: string; level: number }[] = [];
  for (const line of lines) {
    const hMatch = line.match(/\[H:(\d+)\]/);
    if (hMatch) {
      const fontSize = parseInt(hMatch[1]);
      const text = line.replace(/\[H:\d+\]/g, '').trim();
      if (!text) continue;
      // Map font size to heading level: >20=1, >16=2, >14=3
      const level = fontSize > 20 ? 1 : fontSize > 16 ? 2 : 3;
      parsed.push({ text, level });
    } else {
      // Check for numbered heading patterns: "1.", "1.1", "1.1.1"
      const numMatch = line.match(/^(\d+(?:\.\d+)*)[.)]\s+(.+)/);
      if (numMatch) {
        const level = numMatch[1].split('.').length;
        parsed.push({ text: numMatch[2].trim(), level });
      } else {
        parsed.push({ text: line.trim(), level: 99 }); // body text
      }
    }
  }

  if (parsed.length === 0) {
    return { id: uid(), label: 'Empty PDF', color: DEPTH_COLORS[0], children: [] };
  }

  // Build tree from heading levels
  const root: MindMapNodeData = {
    id: uid(), label: parsed[0].text, color: DEPTH_COLORS[0], children: [],
  };
  const stack: { node: MindMapNodeData; level: number }[] = [{ node: root, level: 0 }];

  for (let i = 1; i < parsed.length; i++) {
    const { text, level } = parsed[i];

    // Skip very short body text fragments
    if (level === 99 && text.length < 5) continue;

    // Body text → append as sublabel or skip
    if (level === 99) {
      const parent = stack[stack.length - 1].node;
      if (!parent.sublabel) {
        parent.sublabel = text.length > 80 ? text.slice(0, 80) + '…' : text;
      }
      continue;
    }

    const node: MindMapNodeData = { id: uid(), label: text, color: colorForDepth(level), children: [] };
    while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
    stack[stack.length - 1].node.children!.push(node);
    stack.push({ node, level });
  }

  return root;
}
