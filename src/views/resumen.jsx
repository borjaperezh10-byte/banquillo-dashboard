import { SCENARIOS, RULES, HITOS } from '../data/plan.js';
import { LineChart, ColumnChart, Meter, Spark } from '../components/charts.jsx';
import { Card, Stat } from '../components/ui.jsx';
import { eur, eurSigned, num, pct } from '../lib/format.js';
import { fmtDate, fmtMonth, fmtMonthLong, daysBetween, monthOf } from '../lib/dates.js';
import { Alerts } from './common.jsx';

export const C = { real: 'var(--s1)', ads: 'var(--s2)', org: 'var(--s3)', plan: 'var(--plan)', plan2: 'var(--plan2)' };

export function planLines(ctx, { from = 0, to = 36 } = {}) {
  const rows = SCENARIOS.normal.rows.slice(from, to);
  const labels = rows.map((r) => fmtMonth(r.m));
  const byM = Object.fromEntries(ctx.monthly.map((x) => [x.m, x]));
  const lastReal = monthOf(ctx.asOf);
  const real = rows.map((r) => (byM[r.m] && r.m <= lastReal && ctx.hasData ? byM[r.m].acum : null));
  const series = [
    { id: 'real', label: 'Real', color: C.real, values: real, width: 2.5 },
    { id: 'normal', label: 'Plan normal', color: C.plan, values: SCENARIOS.normal.rows.slice(from, to).map((r) => r.acum), dash: '6 4' },
    { id: 'best', label: 'Plan best', color: C.plan2, values: SCENARIOS.best.rows.slice(from, to).map((r) => r.acum), dash: '2 4', width: 1.5 },
    { id: 'worst', label: 'Plan worst', color: C.plan2, values: SCENARIOS.worst.rows.slice(from, to).map((r) => r.acum), dash: '2 4', width: 1.5 },
  ];
  return { rows, labels, series };
}

export default function Resumen({ ctx, data, st }) {
  const t = ctx.totals;
  const plan = ctx.planAt.normal;
  const diff = plan && ctx.hasData ? t.neto - plan.acum : null;
  const idx = Math.max(0, SCENARIOS.normal.rows.findIndex((r) => r.m === monthOf(ctx.asOf)));
  const from = Math.max(0, idx - 3);
  const { labels, series, rows } = planLines(ctx, { from, to: Math.min(36, from + 12) });
  const lastRev = [...data.resenas].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1);
  const nRev = lastRev?.n || 0;
  const hito = HITOS.find((h) => h.fecha >= ctx.asOf) || HITOS.at(-1);
  const bsr = [...data.bsr].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const copiasLabels = ctx.copiasPeriodo.map((x) => (ctx.bmode === 'month' ? fmtMonth(x.b) : fmtDate(x.b)));
  const mon = ctx.monthly.find((x) => x.m === monthOf(ctx.asOf));
  const monthTable = {
    cols: [{ k: 'p', label: 'Mes', left: true }, { k: 'real', label: 'Neto acumulado real', fmt: (v) => eur(v) }, { k: 'plan', label: 'Plan normal', fmt: (v) => eur(v) }],
    rows: rows.map((r, i) => ({ id: r.m, p: fmtMonthLong(r.m), real: series[0].values[i], plan: r.acum })),
  };

  return (
    <>
      <div className="board" role="group" aria-label="Marcador: neto acumulado real frente al plan normal">
        <div className="side">
          <span className="t">Neto acumulado real</span>
          <span className="big">{eurSigned(t.neto).replace('+', '').replace(/^−0 €$/, '0 €')}</span>
          <span className="sub">{num(t.copias)} copias · regalías {eur(t.roy)} · Ads con IVA {eur(t.adsIva)}{t.otros ? ` · otros ${eur(t.otros)}` : ''}</span>
        </div>
        <div className="mid">
          {diff == null ? (ctx.hasData ? 'sin plan para este mes' : 'esperando los primeros datos') : <>{diff >= 0 ? 'por delante' : 'por detrás'}<b>{eurSigned(diff)}</b>del plan normal</>}
        </div>
        <div className="side right">
          <span className="t">Plan normal a {fmtDate(ctx.asOf)}</span>
          <span className="big">{plan ? eurSigned(plan.acum).replace('+', '') : '—'}</span>
          <span className="sub">{plan ? `${num(plan.copias)} copias previstas` : ''}</span>
        </div>
        <div className="pill-row">
          <span className="chip">Precio vigente {eur(ctx.precio, 2)} · regalía por copia {eur(ctx.eco.regalia, 2)}</span>
          <span className="chip">ACOS de equilibrio {pct(ctx.eco.acosEquilibrio)}</span>
          {ctx.modo.id ? <span className="chip">Modo sugerido: {ctx.modo.id}</span> : <span className="chip">{ctx.modo.texto}</span>}
        </div>
      </div>

      <Card title="Qué mirar hoy" sub="Se recalcula con cada importación, con las reglas del plan v3.0">
        <Alerts alerts={ctx.alerts.slice(0, 7)} go={st.setView} />
      </Card>

      <div className="stats">
        <Stat label="Copias vendidas" value={num(t.copias)} detail={mon ? `${num(mon.copias)} este mes` : ''} />
        <Stat label="Regalías" value={eur(t.roy)} detail={`${eur(t.regaliaMedia, 2)} de media por copia`} />
        <Stat label="Gasto en Ads (con IVA)" value={eur(t.adsIva)} detail={`${eur(t.adsSin)} sin IVA`} />
        <Stat label="ACOS" value={pct(t.acos)} detail={`equilibrio ${pct(ctx.eco.acosEquilibrio)}`} tone={t.acos != null && t.acos <= ctx.eco.acosEquilibrio ? 'up' : ''} />
        <Stat label="Coste por venta con Ads" value={t.costeVenta != null ? eur(t.costeVenta, 2) : '—'} detail={`${num(t.pedidos)} pedidos`} />
        <Stat label="Copias orgánicas" value={t.copias ? pct(t.org / t.copias, 0) : '—'} detail={`${num(t.org)} de ${num(t.copias)}`} />
      </div>

      <div className="grid g21">
        <Card title="Neto acumulado frente al plan" sub="Regalías menos Ads con IVA y otros gastos, mes a mes" table={monthTable}>
          <LineChart labels={labels} series={series} height={280} initialOff={{ best: true }} yFmt={(v) => eur(v)} refs={ctx.asOf < RULES.brakeDate ? [] : [{ y: RULES.brakeNet, label: 'umbral de freno' }]} ariaLabel="Neto acumulado real frente a los tres escenarios del plan" />
        </Card>
        <div className="grid">
          <Card title={`Reseñas: hito ${hito.label}`} sub={`${fmtDate(hito.fecha)}${ctx.asOf <= hito.fecha ? ` · faltan ${daysBetween(ctx.asOf, hito.fecha)} días` : ''}`}>
            <div style={{ font: '700 26px var(--f-body)', marginBottom: 8 }}>{nRev} <small style={{ font: '500 14px var(--f-body)', color: 'var(--muted)' }}>de {hito.resenas}</small></div>
            <Meter value={nRev} max={hito.resenas} label={`${nRev} de ${hito.resenas} reseñas`} />
            <p className="note" style={{ marginTop: 8 }}>{lastRev ? `Nota media ${num(lastRev.nota, 1)} a ${fmtDate(lastRev.fecha)}` : 'Anota las reseñas en la pestaña Datos.'}</p>
          </Card>
          <Card title="Posición en ventas (BSR)" sub="Más abajo es mejor">
            {bsr.length ? (
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ font: '700 26px var(--f-body)' }}>{num(bsr.at(-1).rank)}</span>
                <Spark values={bsr.map((x) => -x.rank)} w={120} h={36} />
              </div>
            ) : <p className="empty">Sin lecturas todavía.</p>}
          </Card>
        </div>
      </div>

      <Card title="Copias vendidas: orgánicas frente a anuncios" sub={`Por ${ctx.bmode === 'month' ? 'mes' : 'semana'}. Las de anuncios son los pedidos que Amazon Ads atribuye a las campañas`}
        table={{ cols: [{ k: 'p', label: ctx.bmode === 'month' ? 'Mes' : 'Semana', left: true }, { k: 'org', label: 'Orgánicas' }, { k: 'ads', label: 'Con anuncios' }, { k: 'total', label: 'Total' }], rows: ctx.copiasPeriodo.map((x, i) => ({ id: x.b, p: copiasLabels[i], ...x })) }}>
        {ctx.copiasPeriodo.length ? (
          <ColumnChart labels={copiasLabels} series={[{ id: 'org', label: 'Orgánicas', color: C.org, values: ctx.copiasPeriodo.map((x) => x.org) }, { id: 'ads', label: 'Con anuncios', color: C.ads, values: ctx.copiasPeriodo.map((x) => x.ads) }]} yFmt={(v) => num(v)} ariaLabel="Copias por periodo, orgánicas y con anuncios" />
        ) : <p className="empty">Todavía no hay ventas. Importa el informe de KDP en la pestaña Datos.</p>}
      </Card>
      {ctx.warnings.length > 0 && ctx.warnings.map((w) => <p key={w} className="note warn">{w}</p>)}
    </>
  );
}
