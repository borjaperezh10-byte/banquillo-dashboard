import assert from 'node:assert/strict';
import Papa from 'papaparse';
import { parseDate, parseNum } from '../src/lib/dates.js';
import { DATASETS, detectDataset, convertRows } from '../src/lib/importer.js';
import { buildCtx } from '../src/lib/metrics.js';
import { buildDemo, DEMO_ASOF } from '../src/lib/demo.js';
import { DEFAULTS } from '../src/lib/store.js';

const eq = (a, b, m) => assert.deepEqual(a, b, m);
eq(parseDate('05/10/2026'), '2026-10-05'); eq(parseDate('2026-10-05'), '2026-10-05'); eq(parseDate('5 oct 2026'), '2026-10-05'); eq(parseDate('Oct 5, 2026'), '2026-10-05');
eq(parseNum('1.234,56 €'), 1234.56); eq(parseNum('1,234.56'), 1234.56); eq(parseNum('(12,5)'), -12.5); eq(parseNum('$3.85'), 3.85);

const run = (csv, expectDs) => {
  const rows = Papa.parse(csv.trim(), { skipEmptyLines: 'greedy' }).data;
  const det = detectDataset(rows);
  eq(det.best.id, expectDs, `tipo detectado ${det.best.id}`);
  const ds = DATASETS[expectDs];
  return convertRows(rows, det.best.header.idx, det.best.header.mapping, ds);
};

// KDP en español, con filas de preámbulo
let r = run(`Informe de ventas
Generado el 01/12/2026
Fecha de regalía,Título,Tienda,Tipo de transacción,Unidades vendidas,Unidades devueltas,Unidades netas vendidas,Regalía,Moneda
2026-11-03,El Banquillo,Amazon.es,Estándar,2,0,2,"7,60",EUR
2026-11-03,El Banquillo,Amazon.com,Estándar,1,0,1,"3,85",USD
2026-11-04,El Banquillo,Amazon.es,Estándar,3,1,2,"7,60",EUR`, 'ventas');
eq(r.records.length, 3); eq(r.records[0].unidades, 2); eq(r.records[1].moneda, 'USD'); eq(r.records[2].regalia, 7.6);

// KDP en inglés
r = run(`Royalty Date,Title,Marketplace,Transaction Type,Net Units Sold,Royalty,Currency
11/03/2026,El Banquillo,Amazon.com,Standard,2,"7.70",USD`, 'ventas');
eq(r.records.length, 1); eq(r.records[0].regalia, 7.7);

// Ads campañas (español, desglose diario)
r = run(`Fecha,Nombre de la campaña,Impresiones,Clics,Gasto,Ventas totales de 7 días,Pedidos totales de 7 días,ACOS,Coste por clic (CPC)
2026-11-03,Auto,1200,6,"1,80","20,98",2,"8,6 %","0,30"
2026-11-03,Manual,500,4,"1,60","10,49",1,"15 %","0,40"
2026-11-04,Auto,1000,5,"1,50","0",0,"0 %","0,30"`, 'ads');
eq(r.records.length, 3); eq(r.records[0].gasto, 1.8); eq(r.records[0].pedidos, 2); eq(r.records[0].clics, 6);

// Ads campañas (inglés)
r = run(`Start Date,Campaign Name,Impressions,Clicks,Spend,7 Day Total Sales,7 Day Total Orders (#)
Nov 3 2026,Auto,1200,6,1.80,20.98,2`, 'ads');
eq(r.records[0].ventas, 20.98); eq(r.records[0].campana, 'Auto');

// Términos
r = run(`Nombre de la campaña,Tipo de coincidencia,Término de búsqueda de cliente,Impresiones,Clics,Gasto,Ventas totales de 7 días,Pedidos totales de 7 días
Auto,AMPLIA,murdle,100,16,"5,00","10,49",1
Auto,AMPLIA,regalo futbolero,80,3,"1,00","0",0`, 'terminos');
eq(r.records.length, 2); eq(r.records[0].termino, 'murdle');

// Reimportar no duplica (clave estable)
const ds = DATASETS.ads;
eq(new Set(run(`Fecha,Campaña,Clics,Gasto
2026-11-03,A,1,1
2026-11-03,A,2,2
2026-11-04,A,1,1`, 'ads').records.map(ds.key)).size, 2, 'filas repetidas se suman');

// Métricas con datos de ejemplo
const d = { ...DEFAULTS, ...buildDemo() };
const c = buildCtx({ data: d, settings: d.settings, asOf: DEMO_ASOF, range: {}, campana: '' });
assert.ok(c.totals.copias > 100 && c.totals.adsSin > 0);
assert.ok(Math.abs(c.totals.neto - (c.totals.roy - c.totals.adsIva - c.totals.otros)) < 1e-6);
assert.ok(Math.abs(c.monthly.at(-1).acum - c.totals.neto) < 1e-6, 'acumulado = neto total');
assert.ok(c.byCamp.length === 3 && c.terminos.length === 26);
const vacio = buildCtx({ data: DEFAULTS, settings: DEFAULTS.settings, asOf: '2026-10-05', range: {}, campana: '' });
assert.ok(!vacio.hasData && vacio.alerts.length === 1);
console.log('test-lib: todo correcto');
