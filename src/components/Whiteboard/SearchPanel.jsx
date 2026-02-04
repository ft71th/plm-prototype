/**
 * SearchPanel — Sökpanel för att hitta element på canvasen.
 *
 * Sök efter text i former, text-element och linje-etiketter.
 * Visar träffar med navigering (föregående/nästa).
 * Markerar och zoomar till matchande element.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import useWhiteboardStore from '../../stores/whiteboardStore';

export default function SearchPanel() {
  const showSearch = useWhiteboardStore((s) => s.showSearch);
  const store = useWhiteboardStore;

  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const inputRef = useRef(null);

  // Fokusera input när panelen öppnas
  useEffect(() => {
    if (showSearch && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [showSearch]);

  // Sök vid query-ändring
  useEffect(() => {
    if (!query.trim()) {
      setMatches([]);
      setCurrentIdx(0);
      store.getState().setSearchHighlights([]);
      return;
    }

    const state = store.getState();
    const q = query.toLowerCase();
    const found = [];

    for (const id of state.elementOrder) {
      const el = state.elements[id];
      if (!el || !el.visible) continue;

      let text = '';
      if (el.type === 'text' && el.content?.text) text = el.content.text;
      else if (el.type === 'shape' && el.text?.text) text = el.text.text;
      else if (el.type === 'line' && el.label?.text) text = el.label.text;

      if (text.toLowerCase().includes(q)) {
        found.push({ id, text, type: el.type });
      }
    }

    setMatches(found);
    setCurrentIdx(found.length > 0 ? 0 : -1);
    store.getState().setSearchHighlights(found.map((m) => m.id));

    // Navigera till första träffen
    if (found.length > 0) {
      navigateToElement(found[0].id);
    }
  }, [query]);

  const navigateToElement = useCallback((id) => {
    const state = store.getState();
    const el = state.elements[id];
    if (!el) return;

    // Markera elementet
    state.selectElement(id);

    // Panorera till elementet
    const cx = el.type === 'line'
      ? ((el.x || 0) + (el.x2 || 0)) / 2
      : (el.x || 0) + (el.width || 0) / 2;
    const cy = el.type === 'line'
      ? ((el.y || 0) + (el.y2 || 0)) / 2
      : (el.y || 0) + (el.height || 0) / 2;

    const canvasWidth = window.innerWidth - 280;
    const canvasHeight = window.innerHeight - 100;
    const zoom = state.zoom;
    const panX = canvasWidth / 2 - cx * zoom;
    const panY = canvasHeight / 2 - cy * zoom;
    state.setPan(panX, panY);
  }, []);

  const goNext = useCallback(() => {
    if (matches.length === 0) return;
    const next = (currentIdx + 1) % matches.length;
    setCurrentIdx(next);
    navigateToElement(matches[next].id);
  }, [matches, currentIdx, navigateToElement]);

  const goPrev = useCallback(() => {
    if (matches.length === 0) return;
    const prev = (currentIdx - 1 + matches.length) % matches.length;
    setCurrentIdx(prev);
    navigateToElement(matches[prev].id);
  }, [matches, currentIdx, navigateToElement]);

  const handleKeyDown = useCallback((e) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      store.getState().setShowSearch(false);
      store.getState().setSearchHighlights([]);
    } else if (e.key === 'Enter') {
      if (e.shiftKey) goPrev();
      else goNext();
    }
  }, [goNext, goPrev]);

  const close = useCallback(() => {
    store.getState().setShowSearch(false);
    store.getState().setSearchHighlights([]);
    setQuery('');
    setMatches([]);
  }, []);

  if (!showSearch) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 100,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '13px',
        minWidth: '320px',
      }}
    >
      {/* Sökikon */}
      <span style={{ color: '#999', fontSize: '16px' }}>🔍</span>

      {/* Sökfält */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Sök element på canvas..."
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          fontSize: '13px',
          fontFamily: 'Inter, system-ui, sans-serif',
          background: 'transparent',
          padding: '4px 0',
        }}
      />

      {/* Resultaträknare */}
      {query.trim() && (
        <span style={{ color: '#999', fontSize: '12px', whiteSpace: 'nowrap' }}>
          {matches.length === 0
            ? 'Inga träffar'
            : `${currentIdx + 1} / ${matches.length}`
          }
        </span>
      )}

      {/* Navigation */}
      {matches.length > 0 && (
        <>
          <button
            onClick={goPrev}
            title="Föregående (Shift+Enter)"
            style={{
              background: 'none', border: '1px solid #ddd', borderRadius: '4px',
              cursor: 'pointer', padding: '2px 6px', fontSize: '14px', color: '#666',
            }}
          >
            ▲
          </button>
          <button
            onClick={goNext}
            title="Nästa (Enter)"
            style={{
              background: 'none', border: '1px solid #ddd', borderRadius: '4px',
              cursor: 'pointer', padding: '2px 6px', fontSize: '14px', color: '#666',
            }}
          >
            ▼
          </button>
        </>
      )}

      {/* Stäng */}
      <button
        onClick={close}
        title="Stäng (Esc)"
        style={{
          background: 'none', border: 'none',
          cursor: 'pointer', fontSize: '16px', color: '#999',
          padding: '2px 4px',
        }}
      >
        ✕
      </button>
    </div>
  );
}
