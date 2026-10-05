import { LineChart, ColumnChart } from '../components/charts.jsx';
import { Card, Stat, DataTable } from '../components/ui.jsx';
import { eur, eurSigned, num } from '../lib/format.js';
import { fmtMonth, fmtMonthLong, fmtDate } from '../lib/dates.js';
import { C } from './resumen.jsx';

export default function Caja({ ctx, data }) {
  const labels = ctx.cash.map((x) => fmtMonth(x.m));
  const last = ctx.cash.at(-1);
  const tabla = {
    cols: [{ k: 'p', label: 'Mes', left: true }, { k: 'cobrado', label: 'Cobrado acumulado', fmt: (v) => eur(v) }, { k: 'salidas', label: 'Salidas acumuladas', fmt: (v) => eur(v) }, { k: 'cash', label: 'Caja', fmt: (v) => eurSigned(v) }],
    rows: ctx.cash.map((x) => ({ id: x.m, p: fmtMonthLong(x.m), ...x })),
  };
  return (
    <>
      <div className="stats">
        <Stat label="Caja hoy" value={last ? eurSigned(last.cash) : '—'} detail="Lo cobrado menos Ads con IVA y gastos" tone={last && last.cash < 0 ? 'down' : 'up'} />
        <Stat label="Punto más bajo" value={eurSigned(ctx.cashMin)} detail="Lo máximo que has tenido que adelantar" />
        <Stat label="Regalías por cobrar" value={eur(ctx.pendiente)} detail={`Amazon paga a unos ${data.settings.pagoDias} días`} />
        <Stat label="Neto contable" value={eurSigned(ctx.totals.neto)} detail="Cuenta las regalías cuando se venden" />
      </div>
      <Card title="Caja mes a mes" sub="Los anuncios y los gastos salen al momento; las regalías entran con retraso" table={tabla}>
        {ctx.hasData ? (
          <LineChart labels={labels} height={260} yFmt={(v) => eur(v)} series={[
            { id: 'cash', label: 'Caja', color: C.real, values: ctx.cash.map((x) => x.cash), width: 2.5 },
            { id: 'cobr', label: 'Cobrado', color: C.org, values: ctx.cash.map((x) => x.cobrado) },
            { id: 'sal', label: 'Salidas', color: C.ads, values: ctx.cash.map((x) => x.salidas) },
          ]} ariaLabel="Caja, cobros y salidas acumuladas" />
        ) : <p className="empty">Sin datos todavía.</p>}
      </Card>
      <div className="grid g2">
        <Card title="Calendario de cobros" sub="Mes de las ventas y día aproximado en que Amazon las paga">
          <DataTable cols={[{ k: 'mes', label: 'Ventas de', left: true }, { k: 'pago', label: 'Se cobra hacia' }, { k: 'roy', label: 'Importe', fmt: (v) => eur(v) }]}
            rows={ctx.cobros.map((c) => ({ id: c.m, mes: fmtMonthLong(c.m), pago: fmtDate(c.pago), roy: c.roy }))} empty="Sin regalías todavía." />
        </Card>
        <Card title="Entradas y salidas por mes" sub="Regalías del mes frente a Ads con IVA y otros gastos">
          <ColumnChart stacked={false} labels={ctx.monthly.map((x) => fmtMonth(x.m))} yFmt={(v) => eur(v)}
            series={[{ id: 'roy', label: 'Regalías', color: C.org, values: ctx.monthly.map((x) => x.roy) }, { id: 'out', label: 'Ads y gastos', color: C.ads, values: ctx.monthly.map((x) => x.adsIva + x.otros) }]} ariaLabel="Regalías frente a gastos por mes" />
        </Card>
      </div>
      <p className="note">Es una estimación: el retraso de {num(ctx.lag)} meses sale de «días de pago» en Datos › Ajustes. Para el cobro real, mira Informes › Pagos en KDP.</p>
    </>
  );
}
