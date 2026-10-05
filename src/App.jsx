import { useMemo } from 'react';
import { useStore } from './lib/store.js';
import { useAuth } from './lib/auth.jsx';
import { buildCtx } from './lib/metrics.js';
import { addDays, monthOf } from './lib/dates.js';
import Resumen from './views/resumen.jsx';
import PlanView from './views/plan.jsx';
import Ads from './views/ads.jsx';
import Terminos from './views/terminos.jsx';
import Caja from './views/caja.jsx';
import Resenas from './views/resenas.jsx';
import Datos from './views/datos.jsx';

const TABS = [['resumen', 'Resumen'], ['plan', 'Plan vs real'], ['ads', 'Ads'], ['terminos', 'Términos'], ['caja', 'Caja'], ['resenas', 'Reseñas y ranking'], ['datos', 'Datos']];
const PRESETS = [['todo', 'Todo'], ['7', '7 días'], ['30', '30 días'], ['90', '90 días'], ['mes', 'Este mes']];

function rangeOf(preset, asOf) {
  if (preset === 'todo') return {};
  if (preset === 'mes') return { from: monthOf(asOf) + '-01', to: asOf };
  return { from: addDays(asOf, -(+preset - 1)), to: asOf };
}

export default function App() {
  const st = useStore();
  const auth = useAuth();
  const { data, asOf, view, preset, campana } = st;
  const range = useMemo(() => rangeOf(preset, asOf), [preset, asOf]);
  const ctx = useMemo(() => buildCtx({ data, settings: data.settings, asOf, range, campana }), [data, asOf, range, campana]);
  const urgent = ctx.alerts.filter((a) => a.level === 'critical' || a.level === 'warn').length;
  const showFilters = view === 'ads';
  const themes = { auto: 'Auto', light: 'Claro', dark: 'Oscuro' };

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><h1>El Banquillo</h1><span>Panel de ventas y publicidad</span></div>
        <div className="tools">
          <button type="button" className="btn" aria-pressed={st.demo} onClick={() => st.setDemo(!st.demo)}>{st.demo ? 'Salir del ejemplo' : 'Ver datos de ejemplo'}</button>
          <div className="seg" role="group" aria-label="Tema">
            {Object.entries(themes).map(([k, l]) => <button key={k} type="button" aria-pressed={st.theme === k} onClick={() => st.setTheme(k)}>{l}</button>)}
          </div>
          {auth.email && <button type="button" className="btn" onClick={auth.signOut} title={auth.email}>Cerrar sesión</button>}
        </div>
      </header>
      <nav className="nav" aria-label="Secciones">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" className="tab" aria-current={view === k ? 'page' : undefined} onClick={() => st.setView(k)}>
            {l}{k === 'resumen' && urgent > 0 ? <span className="dot" aria-label={`${urgent} avisos`}>{urgent}</span> : null}
          </button>
        ))}
      </nav>
      {st.demo && <div className="banner" role="status">Datos de ejemplo inventados, con fecha de corte 20 dic 2026. No se guardan ni se mezclan con los tuyos.<button type="button" className="btn" onClick={() => st.setDemo(false)}>Volver a mis datos</button></div>}
      {showFilters && (
        <div className="filters" role="group" aria-label="Filtros">
          <div className="seg">{PRESETS.map(([k, l]) => <button key={k} type="button" aria-pressed={preset === k} onClick={() => st.setPreset(k)}>{l}</button>)}</div>
          <select value={campana} onChange={(e) => st.setCampana(e.target.value)} aria-label="Campaña">
            <option value="">Todas las campañas</option>
            {ctx.campaignNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}
      <main>
        {view === 'resumen' && <Resumen ctx={ctx} data={data} st={st} />}
        {view === 'plan' && <PlanView ctx={ctx} />}
        {view === 'ads' && <Ads ctx={ctx} />}
        {view === 'terminos' && <Terminos ctx={ctx} />}
        {view === 'caja' && <Caja ctx={ctx} data={data} />}
        {view === 'resenas' && <Resenas ctx={ctx} data={data} />}
        {view === 'datos' && <Datos st={st} />}
      </main>
      <p className="footer">Tus datos se guardan solo en este navegador. Descarga una copia en Datos › Copia de seguridad.</p>
    </div>
  );
}
