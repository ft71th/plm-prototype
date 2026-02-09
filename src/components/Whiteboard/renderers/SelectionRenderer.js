/**
 * SelectionRenderer — Draws selection handles, lasso, and alignment guides.
 */

import { getHandlePositions, getBoundingBox, getCombinedBoundingBox } from '../../../utils/geometry';

const HANDLE_SIZE = 8;
const HANDLE_COLOR = '#2196F3';
const HANDLE_FILL = '#ffffff';
const LASSO_STROKE = '#2196F3';
const LASSO_FILL = 'rgba(33, 150, 243, 0.1)';
const GUIDE_COLOR = '#FF4081';

export function renderSelection(ctx, state) {
  const { elements, selectedIds, selectionBox } = state;

  // Track which elements are group children (to skip individual rendering)
  const groupChildIds = new Set();
  const groupIds = new Set();
  
  for (const id of selectedIds) {
    const el = elements[id];
    if (!el) continue;
    if (el.type === 'group' && el.childIds) {
      groupIds.add(id);
      for (const childId of el.childIds) {
        groupChildIds.add(childId);
      }
    }
  }

  // Draw selection handles for each selected element (skip group children)
  for (const id of selectedIds) {
    if (groupChildIds.has(id)) continue; // Skip - will be covered by group outline
    const el = elements[id];
    if (!el) continue;
    
    if (el.type === 'group') {
      // Draw group outline using children's combined bounding box
      drawGroupOutline(ctx, el, elements);
    } else {
      drawSelectionOutline(ctx, el);
      drawHandles(ctx, el);
    }
  }

  // Draw combined bounding box if multiple selected (excluding group internals)
  const topLevelSelected = [...selectedIds].filter(id => !groupChildIds.has(id));
  if (topLevelSelected.length > 1) {
    const selectedElements = topLevelSelected
      .map((id) => {
        const el = elements[id];
        if (el?.type === 'group' && el.childIds) {
          // Use children's bounding box for groups
          const children = el.childIds.map(cid => elements[cid]).filter(Boolean);
          if (children.length > 0) {
            const bb = getCombinedBoundingBox(children);
            return bb ? { x: bb.x, y: bb.y, width: bb.width, height: bb.height } : el;
          }
        }
        return el;
      })
      .filter(Boolean);
    const combinedBox = getCombinedBoundingBox(selectedElements);
    if (combinedBox) {
      ctx.save();
      ctx.strokeStyle = HANDLE_COLOR;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(combinedBox.x, combinedBox.y, combinedBox.width, combinedBox.height);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // Draw lasso rectangle
  if (selectionBox) {
    drawLasso(ctx, selectionBox);
  }
}

export function renderAlignmentGuides(ctx, guides) {
  if (!guides || guides.length === 0) return;

  ctx.save();
  ctx.strokeStyle = GUIDE_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);

  for (const guide of guides) {
    ctx.beginPath();
    if (guide.type === 'vertical') {
      ctx.moveTo(guide.position, guide.from - 20);
      ctx.lineTo(guide.position, guide.to + 20);
    } else {
      ctx.moveTo(guide.from - 20, guide.position);
      ctx.lineTo(guide.to + 20, guide.position);
    }
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.restore();
}

function drawGroupOutline(ctx, groupEl, elements) {
  // Draw outline around all children of the group
  const children = (groupEl.childIds || []).map(id => elements[id]).filter(Boolean);
  if (children.length === 0) return;
  
  const bb = getCombinedBoundingBox(children);
  if (!bb) return;
  
  const padding = 8;
  
  ctx.save();
  ctx.strokeStyle = HANDLE_COLOR;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 3]);
  ctx.strokeRect(bb.x - padding, bb.y - padding, bb.width + padding * 2, bb.height + padding * 2);
  ctx.setLineDash([]);
  
  // Draw group label
  if (groupEl.label) {
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillStyle = HANDLE_COLOR;
    ctx.textAlign = 'left';
    ctx.fillText(groupEl.label || 'Group', bb.x - padding, bb.y - padding - 4);
  }
  
  // Draw corner handles on the group bounding box
  const handles = [
    { x: bb.x - padding, y: bb.y - padding },
    { x: bb.x + bb.width + padding, y: bb.y - padding },
    { x: bb.x - padding, y: bb.y + bb.height + padding },
    { x: bb.x + bb.width + padding, y: bb.y + bb.height + padding },
  ];
  const half = HANDLE_SIZE / 2;
  for (const pos of handles) {
    ctx.fillStyle = HANDLE_FILL;
    ctx.strokeStyle = HANDLE_COLOR;
    ctx.lineWidth = 1.5;
    ctx.fillRect(pos.x - half, pos.y - half, HANDLE_SIZE, HANDLE_SIZE);
    ctx.strokeRect(pos.x - half, pos.y - half, HANDLE_SIZE, HANDLE_SIZE);
  }
  
  ctx.restore();
}

const ROTATION_HANDLE_DISTANCE = 25;
const ROTATION_HANDLE_RADIUS = 6;

function drawSelectionOutline(ctx, element) {
  ctx.save();
  ctx.strokeStyle = HANDLE_COLOR;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);

  if (element.type === 'line') {
    // Draw a highlight along the line
    ctx.lineWidth = (element.strokeWidth || 2) + 4;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(element.x, element.y);
    if (element.curvature) {
      const midX = (element.x + element.x2) / 2;
      const midY = (element.y + element.y2) / 2;
      const dx = element.x2 - element.x;
      const dy = element.y2 - element.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      ctx.quadraticCurveTo(
        midX + nx * element.curvature,
        midY + ny * element.curvature,
        element.x2, element.y2
      );
    } else {
      ctx.lineTo(element.x2, element.y2);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    const bb = getBoundingBox(element);
    const rotation = element.rotation || 0;
    const cx = bb.x + bb.width / 2;
    const cy = bb.y + bb.height / 2;

    if (rotation !== 0) {
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.translate(-cx, -cy);
    }
    ctx.strokeRect(bb.x - 1, bb.y - 1, bb.width + 2, bb.height + 2);
  }

  ctx.restore();
}

function drawHandles(ctx, element) {
  if (element.type === 'line') {
    // Draw circle handles at line endpoints
    const endpoints = [
      { x: element.x, y: element.y },
      { x: element.x2, y: element.y2 },
    ];
    ctx.save();
    for (const pt of endpoints) {
      ctx.fillStyle = HANDLE_FILL;
      ctx.strokeStyle = HANDLE_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const handles = getHandlePositions(element);
  const half = HANDLE_SIZE / 2;
  const rotation = element.rotation || 0;
  const bb = getBoundingBox(element);
  const cx = bb.x + bb.width / 2;
  const cy = bb.y + bb.height / 2;

  ctx.save();

  // Apply rotation to handles
  if (rotation !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);
  }

  // Draw resize handles
  for (const pos of Object.values(handles)) {
    ctx.fillStyle = HANDLE_FILL;
    ctx.strokeStyle = HANDLE_COLOR;
    ctx.lineWidth = 1.5;
    ctx.fillRect(pos.x - half, pos.y - half, HANDLE_SIZE, HANDLE_SIZE);
    ctx.strokeRect(pos.x - half, pos.y - half, HANDLE_SIZE, HANDLE_SIZE);
  }

  // Draw rotation handle — circle above the top-center with a connecting line
  const topCenter = handles.n || { x: cx, y: bb.y };
  const rotHandleY = topCenter.y - ROTATION_HANDLE_DISTANCE;

  // Connecting line
  ctx.strokeStyle = HANDLE_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(topCenter.x, topCenter.y);
  ctx.lineTo(topCenter.x, rotHandleY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Rotation handle circle
  ctx.fillStyle = HANDLE_FILL;
  ctx.strokeStyle = HANDLE_COLOR;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(topCenter.x, rotHandleY, ROTATION_HANDLE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw rotation icon (↻) inside the handle
  ctx.fillStyle = HANDLE_COLOR;
  ctx.font = `${ROTATION_HANDLE_RADIUS * 1.4}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('↻', topCenter.x, rotHandleY);

  ctx.restore();
}

/**
 * Get the rotation handle position for an element (in world coords, accounting for rotation).
 */
export function getRotationHandlePosition(element) {
  const bb = getBoundingBox(element);
  const cx = bb.x + bb.width / 2;
  const cy = bb.y + bb.height / 2;
  const rotation = element.rotation || 0;

  // The handle is above the top-center in the element's local space
  let hx = cx;
  let hy = bb.y - ROTATION_HANDLE_DISTANCE;

  // Rotate the handle position around the center
  if (rotation !== 0) {
    const dx = hx - cx;
    const dy = hy - cy;
    hx = cx + dx * Math.cos(rotation) - dy * Math.sin(rotation);
    hy = cy + dx * Math.sin(rotation) + dy * Math.cos(rotation);
  }

  return { x: hx, y: hy, radius: ROTATION_HANDLE_RADIUS };
}

function drawLasso(ctx, box) {
  ctx.save();
  ctx.fillStyle = LASSO_FILL;
  ctx.strokeStyle = LASSO_STROKE;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.setLineDash([]);
  ctx.restore();
}
