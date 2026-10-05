import { SCENARIOS, RULES, PLAN_TOTALS, EVENTOS_PLAN } from '../data/plan.js';
import { LineChart } from '../components/charts.jsx';
import { Card, Stat, DataTable, Status } from '../components/ui.jsx';
import { eur, eurSigned, num, pct } from '../lib/format.js';
import { fmtMonthLong, fmtMonth, monthOf } from '../lib/dates.js';
import { planLines } from './resumen.jsx';

const sign = (v) => (v == null ? '—' : eurSigned(v));

export default function PlanView({ ctx }) {
  const { labels, series, rows } = planLines(ctx);
  const brakeIdx = rows.findIndex((r) => r.m === monthOf(RULES.brakeDate));
  const marks = EVENTOS_PLAN.map((e) => ({ i: rows.findIndex((r) => r.m === monthOf(e.fecha)), text: e.texto })).filter((m) => m.i >= 0);
  const byM = Object.fromEntries(ctx.monthly.map((x) => [x.m, x]));
  const last = monthOf(ctx.asOf);
  const table = rows.filter((r) => r.m <= last).map((r) => {
    const x = byM[r.m];
    return {
      id: r.m, mes: fmtMonthLong(r.m), copR: x?.copias ?? 0, copP: r.copias, adsR: x?.adsIva ?? 0, adsP: r.ads, netoR: x?.neto ?? 0, netoP: r.neto, acumR: x?.acum ?? 0, acumP: r.acum,
    };
  });
  const cols = [
    { k: 'mes', label: 'Mes', left: true },
    { k: 'copR', label: 'Copias real', fmt: num }, { k: 'copP', label: 'Plan', fmt: num },
    { k: 'adsR', label: 'Ads real', fmt: (v) => eur(v) }, { k: 'adsP', label: 'Plan', fmt: (v) => eur(v) },
    { k: 'netoR', label: 'Neto real', fmt: sign }, { k: 'netoP', label: 'Plan', fmt: sign },
    { k: 'acumR', label: 'Acum. real', fmt: sign }, { k: 'acumP', label: 'Plan', fmt: sign },
  ];
  const sc = ['worst', 'normal', 'best'];
  return (
    <>
      <Card title="Neto acumulado: real frente a los tres escenarios" sub="36 meses desde octubre de 2026. El escenario best está oculto para ver la línea real: actívalo en la leyenda. Las marcas son hitos del calendario comercial; pasa el ratón por encima"
        table={{ cols: [{ k: 'mes', label: 'Mes', left: true }, { k: 'real', label: 'Real', fmt: sign }, { k: 'worst', label: 'Worst', fmt: sign }, { k: 'normal', label: 'Normal', fmt: sign }, { k: 'best', label: 'Best', fmt: sign }], rows: rows.map((r, i) => ({ id: r.m, mes: fmtMonthLong(r.m), real: series[0].values[i], worst: SCENARIOS.worst.rows[i].acum, normal: r.acum, best: SCENARIOS.best.rows[i].acum })) }}>
        <LineChart labels={labels} series={series} height={320} initialOff={{ best: true }} marks={marks} yFmt={(v) => eur(v)} refs={[{ y: RULES.brakeNet, label: `freno ${eur(RULES.brakeNet)} (desde mar 27)` }]} ariaLabel="Neto acumulado real y escenarios" />
        {brakeIdx >= 0 && <p className="chart-note">El freno de emergencia se evalúa a partir de {fmtMonth(RULES.brakeDate.slice(0, 7))}: si el neto acumulado sigue por debajo de {eur(RULES.brakeNet)}, se pausan los Ads salvo en picos.</p>}
      </Card>
      <div className="grid g3">
        {sc.map((id) => {
          const rs = SCENARIOS[id].rows;
          const pt = PLAN_TOTALS[id];
          const worstCash = Math.min(0, ...rs.map((r) => r.acum));
          return (
            <Stat key={id} label={`Plan ${SCENARIOS[id].label.toLowerCase()} a 36 meses`} value={sign(rs.at(-1).acum)} detail={<span>{num(pt.copias)} copias · Ads {eur(pt.ads)} · mínimo {sign(worstCash)}</span>} />
          );
        })}
      </div>
      <Card title="Mes a mes frente al plan normal" sub="Ads con IVA. El neto real descuenta Ads con IVA y otros gastos">
        <DataTable cols={cols} rows={table} empty="Aún no hay meses cerrados." />
      </Card>
      <Card title="Reglas de decisión del plan" sub="Se aplican sobre el total de clics acumulados">
        <ul className="stack" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Menos de {RULES.minClicksCampaign} clics en total: no se evalúa la campaña, se deja aprender.</li>
          <li>Worst si el ACOS supera {pct(RULES.acosWorst, 0)} o la conversión baja de {pct(RULES.convWorst, 0)}; best si el ACOS es menor de {pct(RULES.acosBest, 0)} y hay más copias orgánicas que de anuncios.</li>
          <li>Con {num(RULES.clicksForModeDecision)} clics el modo deja de ser provisional.</li>
          <li>Un término necesita {RULES.minClicksKeyword} clics antes de juzgarlo; sin pedidos se baja la puja un 20 % o se pausa.</li>
          <li>Con ACOS por debajo del {pct(RULES.keywordScaleAcos, 0)} se sube la puja un 10 % o se pasa a concordancia exacta.</li>
        </ul>
        <p style={{ marginTop: 10 }}><Status level={ctx.modo.id === 'worst' ? 'warn' : ctx.modo.id ? 'ok' : 'info'}>{ctx.modo.id ? `Modo sugerido hoy: ${ctx.modo.id}` : 'Aún sin modo'}</Status> <span className="note">{ctx.modo.texto}</span></p>
      </Card>
    </>
  );
}
