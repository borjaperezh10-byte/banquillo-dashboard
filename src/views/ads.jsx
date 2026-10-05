import { LineChart, ColumnChart, BarList } from '../components/charts.jsx';
import { Card, Stat, DataTable, Status } from '../components/ui.jsx';
import { eur, num, pct } from '../lib/format.js';
import { fmtDay, fmtDate, fmtMonth } from '../lib/dates.js';
import { budgetAt } from '../lib/metrics.js';
import { RULES } from '../data/plan.js';
import { C } from './resumen.jsx';

export default function Ads({ ctx }) {
  const r = ctx.rng;
  const be = ctx.eco.acosEquilibrio;
  const days = ctx.daily;
  const labels = days.map((d) => fmtDay(d.d));
  const last7 = days.slice(-7);
  const avg7 = last7.length ? last7.reduce((s, d) => s + d.gasto, 0) / last7.length : null;
  const plan = budgetAt(ctx.asOf);
  const weekly = [];
  if (days.length > 45) {
    // muchos días: agrupa por semana para que las columnas se lean
    for (let i = 0; i < days.length; i += 7) { const w = days.slice(i, i + 7); weekly.push({ d: w[0].d, gasto: w.reduce((s, x) => s + x.gasto, 0), ventas: w.reduce((s, x) => s + x.ventas, 0) }); }
  }
  const series = weekly.length ? weekly : days;
  const lab = series.map((d) => fmtDay(d.d));
  const acosPts = days.map((d) => (d.acos != null && d.clics >= 5 ? d.acos : null));
  const funnel = [
    { l: 'Impresiones', v: r.imp }, { l: 'Clics', v: r.clics }, { l: 'Pedidos', v: r.pedidos },
  ];
  if (!ctx.ads.length) return <Card title="Amazon Ads"><p className="empty">Todavía no hay datos de campañas. Importa el informe de campañas en la pestaña Datos o activa los datos de ejemplo.</p></Card>;
  const campCols = [
    { k: 'campana', label: 'Campaña', left: true }, { k: 'gasto', label: 'Gasto', fmt: (v) => eur(v, 2) }, { k: 'ventas', label: 'Ventas', fmt: (v) => eur(v, 2) },
    { k: 'acos', label: 'ACOS', fmt: (v) => pct(v) }, { k: 'clics', label: 'Clics', fmt: num }, { k: 'cpc', label: 'CPC', fmt: (v) => eur(v, 2) },
    { k: 'ctr', label: 'CTR', fmt: (v) => pct(v, 2) }, { k: 'conv', label: 'Conversión', fmt: (v) => pct(v) }, { k: 'pedidos', label: 'Pedidos', fmt: num }, { k: 'costeVenta', label: 'Coste por venta', fmt: (v) => eur(v, 2) },
  ];
  const campRows = ctx.byCamp.map((c) => ({ id: c.campana, ...c }));
  return (
    <>
      <div className="stats">
        <Stat label="Gasto sin IVA" value={eur(r.gasto, 2)} detail={`${eur(r.gastoIva, 2)} con IVA`} />
        <Stat label="Ventas atribuidas" value={eur(r.ventas, 2)} detail={`${num(r.pedidos)} pedidos`} />
        <Stat label="ACOS" value={pct(r.acos)} detail={r.acos == null ? '' : r.acos <= be ? <Status level="ok">Bajo el equilibrio</Status> : r.acos <= RULES.acosWorst ? <Status level="info">Sobre el equilibrio</Status> : <Status level="warn">Por encima de {pct(RULES.acosWorst, 0)}</Status>} />
        <Stat label="CPC medio" value={eur(r.cpc, 2)} detail={`${num(r.clics)} clics`} />
        <Stat label="CTR" value={pct(r.ctr, 2)} detail={`${num(r.imp)} impresiones`} />
        <Stat label="Conversión" value={pct(r.conv)} detail={`mínimo del plan ${pct(RULES.convWorst, 0)}`} />
        <Stat label="Gasto diario, 7 días" value={avg7 != null ? eur(avg7, 2) : '—'} detail={plan != null ? `plan: ${eur(plan, 0)} al día sin IVA` : 'sin presupuesto en el plan'} />
      </div>

      <div className="grid g21">
        <Card title="Gasto y ventas atribuidas" sub={weekly.length ? 'Por semana' : 'Por día'}
          table={{ cols: [{ k: 'p', label: 'Periodo', left: true }, { k: 'gasto', label: 'Gasto', fmt: (v) => eur(v, 2) }, { k: 'ventas', label: 'Ventas', fmt: (v) => eur(v, 2) }], rows: series.map((d, i) => ({ id: d.d, p: lab[i], gasto: d.gasto, ventas: d.ventas })) }}>
          <LineChart labels={lab} height={260} yFmt={(v) => eur(v)} area
            series={[{ id: 'v', label: 'Ventas atribuidas', color: C.real, values: series.map((d) => d.ventas), width: 2.5 }, { id: 'g', label: 'Gasto', color: C.ads, values: series.map((d) => d.gasto), area: false }]} ariaLabel="Gasto y ventas de Ads" />
        </Card>
        <Card title="Embudo" sub="De la impresión al pedido">
          <div className="funnel">
            <div className="fstep"><b>{num(funnel[0].v)}</b><span>impresiones</span></div>
            <div className="frate">CTR {pct(r.ctr, 2)}</div>
            <div className="fstep"><b>{num(funnel[1].v)}</b><span>clics · CPC {eur(r.cpc, 2)}</span></div>
            <div className="frate">conversión {pct(r.conv)}</div>
            <div className="fstep"><b>{num(funnel[2].v)}</b><span>pedidos · {eur(ctx.totals.costeVenta, 2)} cada uno con IVA</span></div>
          </div>
        </Card>
      </div>

      <Card title="ACOS diario" sub={`Solo días con 5 o más clics. La línea es el ACOS de equilibrio (${pct(be)}) al precio de ${eur(ctx.precio, 2)}`}
        table={{ cols: [{ k: 'p', label: 'Día', left: true }, { k: 'acos', label: 'ACOS', fmt: (v) => pct(v) }, { k: 'clics', label: 'Clics', fmt: num }], rows: days.map((d, i) => ({ id: d.d, p: labels[i], acos: acosPts[i], clics: d.clics })) }}>
        <LineChart labels={labels} height={220} yFmt={(v) => pct(v, 0)} tipFmt={(v) => pct(v)} refs={[{ y: be, label: 'equilibrio' }, { y: RULES.acosWorst, label: 'límite worst' }]}
          series={[{ id: 'acos', label: 'ACOS', color: C.ads, values: acosPts, width: 2 }]} ariaLabel="ACOS diario frente al equilibrio" />
      </Card>

      <div className="grid g2">
        <Card title="Campañas: gasto y ventas" sub="Dónde se va el dinero y qué devuelve">
          <div className="keyrow"><span><i className="key" style={{ background: C.ads }} />Gasto</span><span><i className="key" style={{ background: C.real }} />Ventas atribuidas</span></div>
          <BarList fmt={(v) => eur(v)} rows={ctx.byCamp.flatMap((c) => [{ label: c.campana, parts: [{ name: 'Gasto', v: c.gasto, color: C.ads }] }, { label: '', parts: [{ name: 'Ventas', v: c.ventas, color: C.real }] }])} />
        </Card>
        <Card title="CPC por campaña" sub="Lo que pagas por cada clic">
          <BarList fmt={(v) => eur(v, 2)} rows={ctx.byCamp.map((c) => ({ label: c.campana, parts: [{ name: 'CPC', v: c.cpc || 0, color: C.real }] }))} />
        </Card>
      </div>

      <Card title="Detalle por campaña" sub="Ordena pulsando en la cabecera">
        <DataTable cols={campCols} rows={campRows} initialSort={{ k: 'gasto', dir: 'desc' }} />
      </Card>
    </>
  );
}
