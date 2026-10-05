import { HITOS } from '../data/plan.js';
import { LineChart, Meter } from '../components/charts.jsx';
import { Card, DataTable } from '../components/ui.jsx';
import { eur, num } from '../lib/format.js';
import { fmtDate, daysBetween, addDays } from '../lib/dates.js';
import { C } from './resumen.jsx';
import { EVENTOS_PLAN } from '../data/plan.js';

function dayLabels(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 7)) out.push(d);
  if (out.at(-1) !== to && to > from) out.push(to);
  return out;
}

const stepSeries = (pts, labels) => {
  let i = 0, cur = null;
  const sorted = [...pts].sort((a, b) => a.fecha.localeCompare(b.fecha));
  return labels.map((l) => { while (i < sorted.length && sorted[i].fecha <= l) { cur = sorted[i]; i++; } return cur; });
};

export default function Resenas({ ctx, data }) {
  const rev = [...data.resenas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const bsr = [...data.bsr].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const nRev = rev.at(-1)?.n || 0;
  const first = [rev[0]?.fecha, bsr[0]?.fecha].filter(Boolean).sort()[0];
  const labels = first ? dayLabels(first, ctx.asOf) : [];
  const revS = stepSeries(rev, labels);
  const bsrS = stepSeries(bsr, labels);
  const ev = [...data.eventos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const marks = ev.map((e) => ({ i: labels.findIndex((l, k) => l <= e.fecha && (labels[k + 1] || '9') > e.fecha), text: `${fmtDate(e.fecha)}: ${e.texto}` })).filter((m) => m.i >= 0);
  const lbl = labels.map(fmtDate);
  return (
    <>
      <div className="grid g2">
        {HITOS.map((h) => (
          <Card key={h.id} title={`Hito: ${h.label}`} sub={`${fmtDate(h.fecha)}${ctx.asOf <= h.fecha ? ` · faltan ${daysBetween(ctx.asOf, h.fecha)} días` : ' · ya pasó'}`}>
            <div style={{ font: '700 26px var(--f-body)', marginBottom: 8 }}>{nRev} <small style={{ font: '500 14px var(--f-body)', color: 'var(--muted)' }}>de {h.resenas} reseñas</small></div>
            <Meter value={nRev} max={h.resenas} label={`${nRev} de ${h.resenas}`} />
          </Card>
        ))}
      </div>
      <div className="grid g2">
        <Card title="Reseñas" sub="Valores anotados a mano en Datos; el gráfico los mantiene hasta la siguiente lectura" table={{ cols: [{ k: 'fecha', label: 'Fecha', left: true, fmt: fmtDate }, { k: 'n', label: 'Reseñas' }, { k: 'nota', label: 'Nota' }], rows: rev }}>
          {rev.length ? <LineChart labels={lbl} height={220} yFmt={num} series={[{ id: 'n', label: 'Reseñas', color: C.real, values: revS.map((x) => (x ? x.n : null)), width: 2.5 }]} marks={marks} ariaLabel="Reseñas acumuladas" /> : <p className="empty">Anota la primera reseña en Datos.</p>}
        </Card>
        <Card title="Posición en ventas (BSR)" sub="Más arriba es mejor: 1 es el libro más vendido" table={{ cols: [{ k: 'fecha', label: 'Fecha', left: true, fmt: fmtDate }, { k: 'rank', label: 'BSR', fmt: num }, { k: 'categoria', label: 'Categoría', left: true }], rows: bsr }}>
          {bsr.length ? <LineChart invert labels={lbl} height={220} yFmt={num} series={[{ id: 'r', label: 'BSR', color: C.org, values: bsrS.map((x) => (x ? x.rank : null)), width: 2.5 }]} marks={marks} ariaLabel="Posición en ventas" /> : <p className="empty">Anota la primera lectura de BSR en Datos.</p>}
        </Card>
      </div>
      <div className="grid g2">
        <Card title="Eventos y acciones" sub="Lo que has hecho, para relacionarlo con picos y caídas">
          <DataTable cols={[{ k: 'fecha', label: 'Fecha', left: true, fmt: fmtDate }, { k: 'tipo', label: 'Tipo', left: true }, { k: 'texto', label: 'Qué', left: true, wrap: true }]} rows={ev} initialSort={{ k: 'fecha', dir: 'desc' }} empty="Anota acciones (nota de prensa, envíos a creadores) en Datos." />
        </Card>
        <Card title="Gastos fuera de Ads" sub="Se descuentan del neto">
          <DataTable cols={[{ k: 'fecha', label: 'Fecha', left: true, fmt: fmtDate }, { k: 'concepto', label: 'Concepto', left: true, wrap: true }, { k: 'canal', label: 'Canal', left: true }, { k: 'importe', label: 'Importe', fmt: (v) => eur(v, 2) }]} rows={data.gastos} initialSort={{ k: 'fecha', dir: 'desc' }} empty="Sin gastos anotados." />
        </Card>
      </div>
      <Card title="Calendario del plan" sub="Fechas clave de la campaña, para planificar con tiempo">
        <DataTable cols={[{ k: 'fecha', label: 'Fecha', left: true, fmt: fmtDate }, { k: 'texto', label: 'Qué toca', left: true }]} rows={EVENTOS_PLAN} initialSort={{ k: 'fecha', dir: 'asc' }} />
      </Card>
    </>
  );
}
