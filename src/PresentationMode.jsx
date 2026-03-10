/**
 * PresentationMode — Fullskärm-presentationsläge.
 *
 * Navigerar mellan whiteboard-ramar (frames) som en slideshow.
 * Stöd för:
 * - Framåt/bakåt-navigering
 * - Tangentbord: Pil höger/nedåt/Space = nästa, Pil vänster/uppåt = föregående
 * - Escape = avsluta presentation
 * - Slide-indikator
 * - Animerad övergång (smooth zoom/pan)
 */

import React, { useEffect, useCallback, useRef } from 'react';
import useWhiteboardStore from '../../stores/whiteboardStore';

export default function PresentationMode() {
  const presentationMode = useWhiteboardStore((s) => s.presentationMode);
  const presentationFrameIndex = useWhiteboardStore((s) => s.presentationFrameIndex);
  const frames = useWhiteboardStore((s) => s.frames);
  const elements = useWhiteboardStore((s) => s.elements);
  const store = useWhiteboardStore;
  const containerRef = useRef(null);

  // Sort frames by order
  const sortedFrames = [...frames].sort((a, b) => a.order - b.order);
  const currentFrame = sortedFrames[presentationFrameIndex];

  const navigateTo = useCallback((index) => {
    if (index < 0 || index >= sortedFrames.length) return;
    store.getState().setPresentationFrameIndex(index);
    const frame = sortedFrames[index];
    if (frame) {
      store.getState().navigateToFrame(frame.id);
    }
  }, [sortedFrames, store]);

  const next = useCallback(() => {
    navigateTo(Math.min(presentationFrameIndex + 1, sortedFrames.length - 1));
  }, [presentationFrameIndex, sortedFrames.length, navigateTo]);

  const prev = useCallback(() => {
    navigateTo(Math.max(presentationFrameIndex - 1, 0));
  }, [presentationFrameIndex, navigateTo]);

  const exit = useCallback(() => {
    store.getState().setPresentationMode(false);
  }, [store]);

  // Keyboard navigation
  useEffect(() => {
    if (!presentationMode) return;
    const handleKey = (e) => {
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown':
          e.preventDefault(); next(); break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
          e.preventDefault(); prev(); break;
        case 'Escape':
          e.preventDefault(); exit(); break;
        case 'Home':
          e.preventDefault(); navigateTo(0); break;
        case 'End':
          e.preventDefault(); navigateTo(sortedFrames.length - 1); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [presentationMode, next, prev, exit, navigateTo, sortedFrames.length]);

  // Navigate to first frame on start
  useEffect(() => {
    if (presentationMode && sortedFrames.length > 0) {
      navigateTo(0);
    }
  }, [presentationMode]); // eslint-disable-line

  if (!presentationMode) return null;

  if (sortedFrames.length === 0) {
    return (
      <div style={styles.overlay}>
        <div style={styles.emptyMessage}>
          <p style={{ fontSize: 18, fontWeight: 600 }}>Inga ramar definierade</p>
          <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 8 }}>
            Skapa ramar med ram-verktyget (📐) för att använda presentationsläge.
          </p>
          <button onClick={exit} style={styles.exitBtn}>Avsluta</button>
        </div>
      </div>
    );
  }

  const frameEl = currentFrame ? elements[currentFrame.id] : null;

  return (
    <div style={styles.overlay} ref={containerRef}>
      {/* Top bar: slide title */}
      <div style={styles.topBar}>
        <span style={styles.slideTitle}>
          {frameEl?.label || `Ram ${presentationFrameIndex + 1}`}
        </span>
      </div>

      {/* Bottom controls */}
      <div style={styles.bottomBar}>
        <button onClick={prev} style={styles.navBtn} disabled={presentationFrameIndex === 0}>◀</button>
        
        {/* Slide indicators */}
        <div style={styles.indicators}>
          {sortedFrames.map((frame, i) => (
            <button
              key={frame.id}
              onClick={() => navigateTo(i)}
              style={{
                ...styles.dot,
                background: i === presentationFrameIndex ? '#6366f1' : '#d1d5db',
                width: i === presentationFrameIndex ? 24 : 8,
              }}
              title={elements[frame.id]?.label || `Ram ${i + 1}`}
            />
          ))}
        </div>

        <button onClick={next} style={styles.navBtn} disabled={presentationFrameIndex === sortedFrames.length - 1}>▶</button>

        <span style={styles.slideCount}>{presentationFrameIndex + 1} / {sortedFrames.length}</span>

        <button onClick={exit} style={styles.exitPresentBtn} title="Avsluta presentation (Esc)">✕ Avsluta</button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 200, pointerEvents: 'none',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
  },
  topBar: {
    pointerEvents: 'auto',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '12px 24px',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)',
  },
  slideTitle: {
    color: '#fff', fontSize: 18, fontWeight: 600,
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
  bottomBar: {
    pointerEvents: 'auto',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
    padding: '16px 24px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)',
  },
  navBtn: {
    width: 40, height: 40, borderRadius: 20,
    background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer',
    fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'transform 0.15s',
  },
  indicators: {
    display: 'flex', alignItems: 'center', gap: 4,
  },
  dot: {
    height: 8, borderRadius: 4, border: 'none', cursor: 'pointer',
    transition: 'all 0.2s',
  },
  slideCount: {
    color: '#fff', fontSize: 13, fontWeight: 600,
    textShadow: '0 1px 3px rgba(0,0,0,0.5)', minWidth: 40, textAlign: 'center',
  },
  exitPresentBtn: {
    padding: '8px 16px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  emptyMessage: {
    pointerEvents: 'auto',
    background: '#fff', borderRadius: 16, padding: 40,
    boxShadow: '0 8px 40px rgba(0,0,0,0.2)', textAlign: 'center',
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  },
  exitBtn: {
    marginTop: 16, padding: '10px 24px', background: '#6366f1', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
  },
};
