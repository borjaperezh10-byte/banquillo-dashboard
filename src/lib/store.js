import { createContext, createElement, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { uid } from './format.js';
import { buildDemo, DEMO_ASOF } from './demo.js';
import { today } from './dates.js';

const KEY = 'banquillo.dashboard.v1';

export const DEFAULTS = {
  settings: { ivaAds: 0.21, pagoDias: 60, fx: { USD: 0.92, GBP: 1.17, CAD: 0.66, JPY: 0.0061, MXN: 0.05 }, lanzamiento: '' },
  ventas: [], ads: [], terminos: [], resenas: [], gastos: [], eventos: [], bsr: [],
  precios: [{ id: 'p0', desde: '2026-10-01', precio: 10.49 }],
  mappings: {}, importLog: [],
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw);
    return { ...DEFAULTS, ...p, settings: { ...DEFAULTS.settings, ...(p.settings || {}), fx: { ...DEFAULTS.settings.fx, ...(p.settings?.fx || {}) } } };
  } catch {
    return DEFAULTS;
  }
}

function reducer(s, a) {
  switch (a.type) {
    case 'replaceAll':
      return { ...DEFAULTS, ...a.state, settings: { ...DEFAULTS.settings, ...(a.state.settings || {}) } };
    case 'upsert': {
      // a.ds, a.records, a.key: mezcla por clave; las filas nuevas sustituyen a las existentes
      const map = new Map(s[a.ds].map((r) => [a.key(r), r]));
      a.records.forEach((r) => map.set(a.key(r), r));
      return { ...s, [a.ds]: [...map.values()] };
    }
    case 'replaceDs':
      return { ...s, [a.ds]: a.records };
    case 'add':
      return { ...s, [a.ds]: [...s[a.ds], { id: uid(), ...a.record }] };
    case 'remove':
      return { ...s, [a.ds]: s[a.ds].filter((r) => r.id !== a.id) };
    case 'setting':
      return { ...s, settings: { ...s.settings, [a.key]: a.value } };
    case 'fx':
      return { ...s, settings: { ...s.settings, fx: { ...s.settings.fx, [a.cur]: a.value } } };
    case 'mapping':
      return { ...s, mappings: { ...s.mappings, [a.ds]: a.mapping } };
    case 'log':
      return { ...s, importLog: [a.entry, ...s.importLog].slice(0, 30) };
    case 'reset':
      return DEFAULTS;
    default:
      return s;
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [real, dispatch] = useReducer(reducer, undefined, load);
  const [demo, setDemo] = useState(() => { try { return new URLSearchParams(window.location.search).has('demo'); } catch { return false; } });
  const [view, setView] = useState('resumen');
  const [preset, setPreset] = useState('todo');
  const [campana, setCampana] = useState('');
  const [theme, setThemeState] = useState(() => {
    try { return localStorage.getItem('banquillo.theme') || 'auto'; } catch { return 'auto'; }
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(real)); } catch { /* sin almacenamiento: el panel funciona igual, pero no recuerda los datos */ }
  }, [real]);
  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'auto') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', theme);
    try { localStorage.setItem('banquillo.theme', theme); } catch { /* idem */ }
  }, [theme]);

  const demoData = useMemo(() => (demo ? buildDemo() : null), [demo]);
  const data = demo ? { ...DEFAULTS, ...demoData } : real;
  const asOf = demo ? DEMO_ASOF : today();
  const value = useMemo(
    () => ({ data, real, dispatch, demo, setDemo, view, setView, preset, setPreset, campana, setCampana, theme, setTheme: setThemeState, asOf }),
    [data, real, demo, view, preset, campana, theme, asOf],
  );
  return createElement(Ctx.Provider, { value }, children);
}

export const useStore = () => useContext(Ctx);
