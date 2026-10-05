// Importación de informes de KDP y Amazon Ads: detecta la cabecera, propone un mapeo de columnas y convierte las filas.
// Funciones puras (sin DOM) para poder probarlas desde Node.
import { parseDate, parseNum } from './dates.js';

export const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const T = { date: 'date', num: 'num', text: 'text' };

export const DATASETS = {
  ventas: {
    id: 'ventas',
    label: 'Ventas de KDP',
    help: 'Informes › Ventas en KDP, con el desglose por fecha y tienda. Si importas el mismo periodo dos veces no se duplica.',
    fields: {
      fecha: { label: 'Fecha', type: T.date, req: true, aliases: ['fecha de regalia', 'royalty date', 'fecha', 'date', 'mes', 'month'] },
      mercado: { label: 'Tienda', type: T.text, aliases: ['tienda', 'marketplace', 'mercado', 'pais'] },
      titulo: { label: 'Título', type: T.text, aliases: ['titulo', 'title', 'nombre del libro'] },
      tipo: { label: 'Tipo de transacción', type: T.text, aliases: ['tipo de transaccion', 'transaction type', 'tipo de regalia', 'royalty type'] },
      neto: { label: 'Unidades netas', type: T.num, aliases: ['unidades netas vendidas', 'net units sold', 'unidades netas', 'net units'] },
      vendidas: { label: 'Unidades vendidas', type: T.num, aliases: ['unidades vendidas', 'units sold', 'unidades', 'units', 'pedidos'] },
      devueltas: { label: 'Unidades devueltas', type: T.num, aliases: ['unidades devueltas', 'units refunded', 'devoluciones', 'refunded'] },
      regalia: { label: 'Regalía', type: T.num, req: true, aliases: ['regalia', 'regalias', 'royalty', 'royalties'], exclude: ['fecha', 'date', 'tipo', 'type'] },
      moneda: { label: 'Moneda', type: T.text, aliases: ['moneda', 'currency'] },
    },
    needAny: [['neto', 'vendidas']],
    key: (r) => [r.fecha, r.mercado, r.titulo, r.tipo].join('|'),
    sum: ['unidades', 'devoluciones', 'regalia'],
  },
  ads: {
    id: 'ads',
    label: 'Amazon Ads: campañas',
    help: 'Consola de Amazon Ads › Informes › Campañas, con desglose diario. Al reimportar un periodo se actualizan las filas, no se duplican.',
    fields: {
      fecha: { label: 'Fecha', type: T.date, req: true, aliases: ['fecha', 'date', 'dia', 'day', 'fecha de inicio', 'start date'] },
      fechaFin: { label: 'Fecha de fin', type: T.date, aliases: ['fecha de finalizacion', 'fecha de fin', 'end date'] },
      campana: { label: 'Campaña', type: T.text, req: true, aliases: ['nombre de la campana', 'campaign name', 'campana', 'campaign'] },
      impresiones: { label: 'Impresiones', type: T.num, aliases: ['impresiones', 'impressions'] },
      clics: { label: 'Clics', type: T.num, req: true, aliases: ['clics', 'clicks', 'clic'], exclude: ['por clic', 'per click', 'cpc', 'ctr', 'tasa'] },
      gasto: { label: 'Gasto', type: T.num, req: true, aliases: ['gasto', 'spend', 'coste', 'cost', 'importe gastado'], exclude: ['por clic', 'per click', 'cpc', 'acos', 'roas', 'presupuesto'] },
      ventas: { label: 'Ventas atribuidas (€)', type: T.num, aliases: ['ventas totales de 7 dias', 'ventas de 7 dias', 'ventas totales de 14 dias', 'ventas de 14 dias', '7 day total sales', '14 day total sales', 'ventas totales', 'total sales', 'ventas', 'sales'], exclude: ['acos', 'roas', 'mismo sku', 'advertised sku', 'ratio'] },
      pedidos: { label: 'Pedidos', type: T.num, aliases: ['pedidos totales de 7 dias', 'pedidos de 7 dias', 'pedidos totales de 14 dias', 'pedidos de 14 dias', '7 day total orders', '14 day total orders', 'pedidos totales', 'pedidos', 'orders'], exclude: ['mismo sku', 'advertised sku'] },
      unidades: { label: 'Unidades', type: T.num, aliases: ['unidades totales de 7 dias', 'unidades de 7 dias', '7 day total units', 'unidades totales', 'unidades', 'units'], exclude: ['mismo sku', 'advertised sku'] },
    },
    key: (r) => [r.fecha, r.campana].join('|'),
    sum: ['impresiones', 'clics', 'gasto', 'ventas', 'pedidos', 'unidades'],
  },
  terminos: {
    id: 'terminos',
    label: 'Amazon Ads: términos de búsqueda',
    help: 'Informes › Términos de búsqueda (o Segmentación). Exporta siempre desde el lanzamiento: cada importación sustituye a la anterior.',
    fields: {
      termino: { label: 'Término o segmentación', type: T.text, req: true, aliases: ['termino de busqueda de cliente', 'customer search term', 'termino de busqueda', 'search term', 'palabra clave', 'keyword', 'segmentacion', 'targeting', 'objetivo'], exclude: ['tipo de coincidencia', 'match type', 'tipo de segmentacion'] },
      campana: { label: 'Campaña', type: T.text, aliases: ['nombre de la campana', 'campaign name', 'campana', 'campaign'] },
      concordancia: { label: 'Concordancia', type: T.text, aliases: ['tipo de coincidencia', 'match type', 'concordancia', 'coincidencia'] },
      impresiones: { label: 'Impresiones', type: T.num, aliases: ['impresiones', 'impressions'] },
      clics: { label: 'Clics', type: T.num, req: true, aliases: ['clics', 'clicks', 'clic'], exclude: ['por clic', 'per click', 'cpc', 'ctr', 'tasa'] },
      gasto: { label: 'Gasto', type: T.num, req: true, aliases: ['gasto', 'spend', 'coste', 'cost', 'importe gastado'], exclude: ['por clic', 'per click', 'cpc', 'acos', 'roas', 'presupuesto'] },
      ventas: { label: 'Ventas atribuidas (€)', type: T.num, aliases: ['ventas totales de 7 dias', 'ventas de 7 dias', 'ventas totales de 14 dias', 'ventas de 14 dias', '7 day total sales', '14 day total sales', 'ventas totales', 'total sales', 'ventas', 'sales'], exclude: ['acos', 'roas', 'mismo sku', 'advertised sku', 'ratio'] },
      pedidos: { label: 'Pedidos', type: T.num, aliases: ['pedidos totales de 7 dias', 'pedidos de 7 dias', 'pedidos totales de 14 dias', 'pedidos de 14 dias', '7 day total orders', '14 day total orders', 'pedidos totales', 'pedidos', 'orders'], exclude: ['mismo sku', 'advertised sku'] },
    },
    key: (r) => [r.campana, r.termino, r.concordancia].join('|'),
    sum: ['impresiones', 'clics', 'gasto', 'ventas', 'pedidos'],
    replaceAll: true,
  },
};

function aliasScore(header, field) {
  const h = norm(header);
  if (!h) return 0;
  if (field.exclude && field.exclude.some((x) => h.includes(x))) return 0;
  let best = 0;
  for (const a of field.aliases) {
    if (h === a) best = Math.max(best, 100 + a.length);
    else if ((' ' + h + ' ').includes(' ' + a + ' ')) best = Math.max(best, 50 + a.length);
  }
  return best;
}

// Asigna a cada campo la columna con mejor puntuación; cada columna se usa una sola vez.
export function autoMap(headers, ds) {
  const pairs = [];
  Object.entries(ds.fields).forEach(([fid, f]) => {
    headers.forEach((h, ci) => {
      const s = aliasScore(h, f);
      if (s > 0) pairs.push({ fid, ci, s });
    });
  });
  pairs.sort((a, b) => b.s - a.s);
  const mapping = {};
  const used = new Set();
  for (const p of pairs) {
    if (mapping[p.fid] !== undefined || used.has(p.ci)) continue;
    mapping[p.fid] = p.ci;
    used.add(p.ci);
  }
  return mapping;
}

const missingReq = (ds, mapping) => {
  const miss = Object.entries(ds.fields).filter(([k, f]) => f.req && mapping[k] === undefined).map(([, f]) => f.label);
  (ds.needAny || []).forEach((group) => {
    if (!group.some((k) => mapping[k] !== undefined)) miss.push(group.map((k) => ds.fields[k].label).join(' o '));
  });
  return miss;
};

// Busca la fila de cabecera (entre las primeras 25) que mejor encaja con un conjunto de datos.
export function detectHeader(rows, ds) {
  let best = { idx: 0, score: -1, mapping: {} };
  rows.slice(0, 25).forEach((row, idx) => {
    if (!row || row.filter((c) => c !== null && c !== '' && c !== undefined).length < 3) return;
    const headers = row.map((c) => (c == null ? '' : String(c)));
    const mapping = autoMap(headers, ds);
    const score = Object.keys(mapping).length + (missingReq(ds, mapping).length === 0 ? 10 : 0);
    if (score > best.score) best = { idx, score, mapping };
  });
  return best;
}

// Elige qué tipo de informe es. Devuelve el conjunto con más campos obligatorios cubiertos.
export function detectDataset(rows) {
  const results = Object.values(DATASETS).map((ds) => {
    const h = detectHeader(rows, ds);
    const ok = missingReq(ds, h.mapping).length === 0;
    return { id: ds.id, ok, score: h.score + (ok ? 5 : 0), header: h };
  });
  // Un informe de términos tiene la columna de término; uno de ventas, la de regalía.
  const withTerm = results.find((r) => r.id === 'terminos' && r.ok && r.header.mapping.termino !== undefined);
  const withRoy = results.find((r) => r.id === 'ventas' && r.ok);
  if (withRoy) return { best: withRoy, results };
  if (withTerm) return { best: withTerm, results };
  results.sort((a, b) => b.score - a.score);
  return { best: results[0], results };
}

export function convertRows(rows, headerIdx, mapping, ds) {
  const out = new Map();
  let skipped = 0;
  let agregadas = 0;
  const warnings = [];
  const get = (row, fid) => {
    const ci = mapping[fid];
    if (ci === undefined || ci === '' || ci === null) return undefined;
    const raw = row[ci];
    const t = ds.fields[fid].type;
    if (t === T.date) return parseDate(raw);
    if (t === T.num) return parseNum(raw);
    return raw == null ? '' : String(raw).trim();
  };
  for (const row of rows.slice(headerIdx + 1)) {
    if (!row || row.every((c) => c == null || c === '')) continue;
    let rec = {};
    let bad = false;
    for (const [fid, f] of Object.entries(ds.fields)) {
      const v = get(row, fid);
      if (f.req && (v === undefined || v === null || v === '')) bad = true;
      rec[fid] = v;
    }
    if (bad) {
      skipped++;
      continue;
    }
    if (ds.id === 'ventas') {
      const neto = rec.neto ?? (rec.vendidas ?? 0) - (rec.devueltas ?? 0);
      rec = {
        fecha: rec.fecha, mercado: rec.mercado || 'Amazon.es', titulo: rec.titulo || '', tipo: rec.tipo || '',
        unidades: neto, devoluciones: rec.devueltas ?? 0, regalia: rec.regalia ?? 0, moneda: (rec.moneda || 'EUR').toUpperCase().replace(/[^A-Z]/g, '') || 'EUR',
      };
      if (/total|resumen/i.test(rec.titulo) && !rec.fecha) continue;
    } else if (ds.id === 'ads') {
      if (/^total/i.test(rec.campana)) continue;
      if (rec.fechaFin && rec.fechaFin !== rec.fecha) agregadas++;
      rec = {
        fecha: rec.fecha, campana: rec.campana, impresiones: rec.impresiones ?? 0, clics: rec.clics ?? 0, gasto: rec.gasto ?? 0,
        ventas: rec.ventas ?? 0, pedidos: rec.pedidos ?? rec.unidades ?? 0, unidades: rec.unidades ?? rec.pedidos ?? 0,
      };
    } else {
      if (/^total/i.test(rec.termino)) continue;
      rec = {
        termino: rec.termino, campana: rec.campana || '', concordancia: rec.concordancia || '', impresiones: rec.impresiones ?? 0,
        clics: rec.clics ?? 0, gasto: rec.gasto ?? 0, ventas: rec.ventas ?? 0, pedidos: rec.pedidos ?? 0,
      };
    }
    const k = ds.key(rec);
    const prev = out.get(k);
    if (prev) ds.sum.forEach((f) => (prev[f] = (prev[f] || 0) + (rec[f] || 0)));
    else out.set(k, rec);
  }
  if (agregadas > 0)
    warnings.push(`${agregadas} filas agrupan varios días: se anotan en su fecha de inicio. Para ver la evolución diaria, exporta el informe con desglose diario.`);
  if (ds.id === 'ventas' && out.size) {
    const todas1 = [...out.values()].every((r) => r.fecha.endsWith('-01'));
    if (todas1) warnings.push('Todas las fechas caen en día 1: parece un informe mensual. Los gráficos semanales se agruparán por mes.');
  }
  return { records: [...out.values()], skipped, warnings };
}
