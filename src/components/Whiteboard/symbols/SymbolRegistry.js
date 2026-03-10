/**
 * SymbolRegistry.js — Central registry for all symbol libraries.
 *
 * Aggregates symbols from all library modules and provides unified lookup.
 * New libraries are added here — one import + one entry in LIBRARIES.
 */

import { MARINE_ELECTRICAL_SYMBOLS, getCategories as getMarineCats, getSymbolsByCategory as getMarineByCategory } from './MarineElectrical';
import { FLOWCHART_SYMBOLS, getCategories as getFlowCats, getSymbolsByCategory as getFlowByCategory } from './Flowchart';
import { NETWORK_IT_SYMBOLS, getCategories as getNetCats, getSymbolsByCategory as getNetByCategory } from './NetworkIT';
import { INDUSTRIAL_SYMBOLS, getCategories as getIndustrialCats, getSymbolsByCategory as getIndustrialByCategory } from './Industrial';
import { ELECTRONICS_SYMBOLS, getCategories as getElCats, getSymbolsByCategory as getElByCategory } from './Electronics';

/**
 * Library definitions — each with id, label, icon, symbols array and helpers.
 */
export const LIBRARIES = [
  {
    id: 'marine-electrical',
    label: 'Marin El',
    icon: '⚡',
    symbols: MARINE_ELECTRICAL_SYMBOLS,
    getCategories: getMarineCats,
    getSymbolsByCategory: getMarineByCategory,
  },
  {
    id: 'flowchart',
    label: 'Flödesschema',
    icon: '◇',
    symbols: FLOWCHART_SYMBOLS,
    getCategories: getFlowCats,
    getSymbolsByCategory: getFlowByCategory,
  },
  {
    id: 'network-it',
    label: 'Nätverk & IT',
    icon: '🌐',
    symbols: NETWORK_IT_SYMBOLS,
    getCategories: getNetCats,
    getSymbolsByCategory: getNetByCategory,
  },
  {
    id: 'industrial',
    label: 'Industriellt',
    icon: '⚙️',
    symbols: INDUSTRIAL_SYMBOLS,
    getCategories: getIndustrialCats,
    getSymbolsByCategory: getIndustrialByCategory,
  },
  {
    id: 'electronics',
    label: 'Elektronik',
    icon: '🔌',
    symbols: ELECTRONICS_SYMBOLS,
    getCategories: getElCats,
    getSymbolsByCategory: getElByCategory,
  },
];

// ─── Unified symbol lookup (used by ShapeRenderer) ────────

const _globalMap = new Map();

for (const lib of LIBRARIES) {
  for (const sym of lib.symbols) {
    _globalMap.set(sym.id, sym);
  }
}

/**
 * Look up any symbol by id across all libraries.
 * Used by ShapeRenderer for 'symbol-<id>' variants.
 */
export function getSymbolById(id) {
  return _globalMap.get(id) || null;
}

/**
 * Get a library definition by id.
 */
export function getLibraryById(id) {
  return LIBRARIES.find((l) => l.id === id) || null;
}
