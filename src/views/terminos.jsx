import { useState } from 'react';
import { BarList } from '../components/charts.jsx';
import { Card, Stat, DataTable, Status } from '../components/ui.jsx';
import { eur, num, pct } from '../lib/format.js';
import { RULES } from '../data/plan.js';
import { C } from './resumen.jsx';

const FILTERS = [['todos', 'Todos'], ['bajar', 'Bajar o pausar'], ['subir', 'Subir o pasar a exacta'], ['esperar', 'Esperar']];

export default function Terminos({ ctx }) {
  const [f, setF] = useState('todos');
  if (!ctx.terminos.length) return <Card title="Términos de búsqueda"><p className="empty">Todavía no hay informe de términos. Importa «Términos de búsqueda» en la pestaña Datos o activa los datos de ejemplo.</p></Card>;
  const rows = ctx.terminos.filter((t) => f === 'todos' || (f === 'subir' ? t.cls.k === 'subir' || t.cls.k === 'exacta' : t.cls.k === f)).map((t, i) => ({ id: i, ...t }));
  const top = [...ctx.terminos].sort((a, b) => b.gasto - a.gasto).slice(0, 8);
  const cnt = (k) => ctx.terminos.filter((t) => (k === 'subir' ? t.cls.k === 'subir' || t.cls.k === 'exacta' : t.cls.k === k)).length;
  const gastoT = ctx.terminos.reduce((s, t) => s + t.gasto, 0);
  const cols = [
    { k: 'termino', label: 'Término', left: true, wrap: true },
    { k: 'campana', label: 'Campaña', left: true }, { k: 'concordancia', label: 'Tipo', left: true },
    { k: 'clics', label: 'Clics', fmt: num }, { k: 'gasto', label: 'Gasto', fmt: (v) => eur(v, 2) }, { k: 'pedidos', label: 'Pedidos', fmt: num },
    { k: 'acos', label: 'ACOS', fmt: (v) => (v == null ? '—' : pct(v)) },
    { k: 'cls', label: 'Qué hacer', left: true, sort: (r) => r.cls.k, render: (r) => <Status level={r.cls.level}>{r.cls.label}</Status> },
  ];
  return (
    <>
      <div className="stats">
        <Stat label="Términos" value={num(ctx.terminos.length)} detail={`${eur(gastoT, 2)} de gasto`} />
        <Stat label="Gasto sin ventas" value={eur(ctx.gastoSinVentas, 2)} detail={gastoT ? `${pct(ctx.gastoSinVentas / gastoT, 0)} del gasto en términos` : ''} tone={ctx.gastoSinVentas > 0 ? 'down' : ''} />
        <Stat label="Bajar o pausar" value={num(cnt('bajar'))} detail={`${RULES.minClicksKeyword}+ clics y 0 pedidos`} />
        <Stat label="Listos para subir" value={num(cnt('subir'))} detail={`ACOS bajo ${pct(RULES.keywordScaleAcos, 0)}`} />
        <Stat label="Esperar datos" value={num(cnt('esperar'))} detail={`menos de ${RULES.minClicksKeyword} clics`} />
      </div>
      <Card title="Dónde se va el gasto" sub="Los 8 términos que más gastan. Los de color naranja no han vendido nada">
        <div className="keyrow"><span><i className="key" style={{ background: C.real }} />Con pedidos</span><span><i className="key" style={{ background: C.ads }} />Sin pedidos</span></div>
        <BarList fmt={(v) => eur(v, 2)} rows={top.map((t) => ({ label: t.termino, parts: [{ name: t.pedidos > 0 ? 'Con pedidos' : 'Sin pedidos', v: t.gasto, color: t.pedidos > 0 ? C.real : C.ads }] }))} />
      </Card>
      <Card title="Todos los términos" sub="Las reglas son las del plan: se juzga a partir de 15 clics"
        actions={<div className="seg" role="group" aria-label="Filtrar por acción">{FILTERS.map(([k, l]) => <button key={k} type="button" aria-pressed={f === k} onClick={() => setF(k)}>{l}</button>)}</div>}>
        <DataTable cols={cols} rows={rows} initialSort={{ k: 'gasto', dir: 'desc' }} max={300} empty="Ningún término en este filtro." />
      </Card>
    </>
  );
}
