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

  // Draw selection handles for each selected element
  for (const id of selectedIds) {
    const el = elements[id];
    if (!el) continue;
    drawSelectionOutline(ctx, el);
    drawHandles(ctx, el);
  }

  // Draw combined bounding box if multiple selected
  if (selectedIds.size > 1) {
    const selectedElements = [...selectedIds]
      .map((id) => elements[id])
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

  ctx.save();
  for (const pos of Object.values(handles)) {
    ctx.fillStyle = HANDLE_FILL;
    ctx.strokeStyle = HANDLE_COLOR;
    ctx.lineWidth = 1.5;
    ctx.fillRect(pos.x - half, pos.y - half, HANDLE_SIZE, HANDLE_SIZE);
    ctx.strokeRect(pos.x - half, pos.y - half, HANDLE_SIZE, HANDLE_SIZE);
  }
  ctx.restore();
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
