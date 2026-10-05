// Datos de ejemplo para ver el panel antes de tener ventas reales. Son inventados y nunca se mezclan con los reales.
import { addDays, daysRange } from './dates.js';
import { unitEconomics } from './metrics.js';

export const DEMO_ASOF = '2026-12-20';
const LAUNCH = '2026-10-12';

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDemo() {
  const rnd = mulberry(2610);
  const poisson = (l) => { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return k - 1; };
  const binom = (n, p) => { let k = 0; for (let i = 0; i < n; i++) if (rnd() < p) k++; return k; };
  const price = (d) => (d >= '2026-11-12' ? 12.99 : 10.49);
  const settings = { ivaAds: 0.21 };
  const camps = [
    { n: 'Banquillo · Automática', share: 0.33, cpc: 0.31, ctr: 0.0046, conv: 0.052 },
    { n: 'Banquillo · Palabras clave', share: 0.38, cpc: 0.42, ctr: 0.0078, conv: 0.115 },
    { n: 'Banquillo · Fichas de producto', share: 0.29, cpc: 0.35, ctr: 0.0056, conv: 0.088 },
  ];
  const budget = (d) => (d >= '2026-12-06' ? 8 : d >= '2026-11-10' ? 5 : 3);
  const days = daysRange(LAUNCH, DEMO_ASOF);
  const ads = [];
  const ventas = [];
  days.forEach((d, i) => {
    const boost = d >= '2026-11-25' && d <= '2026-11-30' ? 1.5 : d >= '2026-12-01' ? 1.2 : 1;
    const maduro = d >= '2026-11-15' ? 1.1 : 1;
    let adUnits = 0;
    camps.forEach((c) => {
      const gasto = +(budget(d) * c.share * (0.8 + rnd() * 0.2)).toFixed(2);
      const clics = Math.max(0, Math.round(gasto / (c.cpc * (0.9 + rnd() * 0.2))));
      const imp = Math.round(clics / (c.ctr * (0.85 + rnd() * 0.3)));
      const pedidos = binom(clics, Math.min(0.3, c.conv * boost * maduro * (0.9 + 0.01 * Math.min(i, 30))));
      adUnits += pedidos;
      ads.push({ fecha: d, campana: c.n, impresiones: imp, clics, gasto: +(clics * c.cpc).toFixed(2), ventas: +(pedidos * price(d)).toFixed(2), pedidos, unidades: pedidos });
    });
    const lambda = Math.min(1.5, 0.22 + 0.016 * i) * boost;
    const org = poisson(lambda);
    const total = adUnits + org;
    if (total > 0) ventas.push({ fecha: d, mercado: 'Amazon.es', titulo: 'El Banquillo', tipo: 'Venta', unidades: total, devoluciones: 0, regalia: +(total * unitEconomics(price(d), settings).regalia).toFixed(2), moneda: 'EUR' });
  });
  ['2026-12-02', '2026-12-09', '2026-12-14', '2026-12-18'].forEach((d) =>
    ventas.push({ fecha: d, mercado: 'Amazon.com', titulo: 'El Banquillo', tipo: 'Venta', unidades: 1, devoluciones: 0, regalia: 3.85, moneda: 'USD' }));

  const termsSpec = [
    ['libro misterio futbol', 'Banquillo · Automática', 'amplia', 1.0, 1.1], ['regalo futbolero', 'Banquillo · Automática', 'amplia', 1.4, 1.3],
    ['murdle', 'Banquillo · Automática', 'amplia', 1.6, 0.6], ['libro logica adultos', 'Banquillo · Automática', 'amplia', 0.8, 0.9],
    ['acertijos deduccion', 'Banquillo · Automática', 'amplia', 0.7, 0.8], ['juegos detectives', 'Banquillo · Automática', 'amplia', 0.9, 0.3],
    ['pasatiempos adultos', 'Banquillo · Automática', 'amplia', 1.1, 0.2], ['regalo hombre original', 'Banquillo · Automática', 'amplia', 1.5, 0.15],
    ['libro entretenimiento', 'Banquillo · Automática', 'amplia', 0.6, 0.0], ['crimen resolver libro', 'Banquillo · Automática', 'amplia', 0.5, 0.7],
    ['regalo futbolero hombre', 'Banquillo · Palabras clave', 'frase', 2.0, 1.4], ['libro de acertijos de lógica para adultos', 'Banquillo · Palabras clave', 'frase', 1.1, 1.0],
    ['pasatiempos de misterio', 'Banquillo · Palabras clave', 'frase', 1.0, 0.8], ['murdle resuelve el crimen', 'Banquillo · Palabras clave', 'exacta', 0.9, 0.9],
    ['murdoku', 'Banquillo · Palabras clave', 'frase', 1.3, 0.5], ['libro de casos para resolver', 'Banquillo · Palabras clave', 'frase', 0.7, 1.2],
    ['regalo día del padre fútbol', 'Banquillo · Palabras clave', 'frase', 0.5, 1.6], ['libro de misterio con humor', 'Banquillo · Palabras clave', 'frase', 0.6, 1.0],
    ['regalo aficionado al fútbol', 'Banquillo · Palabras clave', 'frase', 1.2, 1.2], ['juegos de detectives para adultos', 'Banquillo · Palabras clave', 'frase', 0.8, 0.0],
    ['ASIN B0DEMO0001 (Murdle: Resuelve el crimen)', 'Banquillo · Fichas de producto', 'producto', 1.6, 0.9], ['ASIN B0DEMO0002 (Murdoku)', 'Banquillo · Fichas de producto', 'producto', 1.5, 0.8],
    ['ASIN B0DEMO0003 (Busca al Asesino)', 'Banquillo · Fichas de producto', 'producto', 0.8, 1.0], ['ASIN B0DEMO0004 (Trivia de fútbol)', 'Banquillo · Fichas de producto', 'producto', 0.9, 1.1],
    ['ASIN B0DEMO0005 (Sopa de letras fútbol)', 'Banquillo · Fichas de producto', 'producto', 0.6, 0.0], ['Categoría: Misterio y detectives infantil', 'Banquillo · Fichas de producto', 'categoría', 1.0, 0.7],
  ];
  const terminos = [];
  camps.forEach((c) => {
    const rows = ads.filter((r) => r.campana === c.n);
    const clicsT = rows.reduce((s, r) => s + r.clics, 0);
    const impT = rows.reduce((s, r) => s + r.imp ?? 0, 0) || rows.reduce((s, r) => s + r.impresiones, 0);
    const spec = termsSpec.filter((x) => x[1] === c.n);
    const wSum = spec.reduce((s, x) => s + x[3], 0);
    spec.forEach(([termino, campana, concordancia, w, mult]) => {
      const clics = Math.max(1, Math.round((clicsT * w) / wSum));
      const pedidos = binom(clics, Math.min(0.4, c.conv * mult));
      const gasto = +(clics * c.cpc * (0.9 + rnd() * 0.2)).toFixed(2);
      terminos.push({ termino, campana, concordancia, impresiones: Math.round((impT * w) / wSum), clics, gasto, ventas: +(pedidos * 12.2).toFixed(2), pedidos });
    });
  });

  return {
    ventas, ads, terminos,
    resenas: [['2026-10-26', 1, 5], ['2026-11-03', 2, 4.5], ['2026-11-12', 4, 4.5], ['2026-11-26', 7, 4.6], ['2026-12-05', 10, 4.6], ['2026-12-16', 13, 4.7]].map(([fecha, n, nota], i) => ({ id: 'r' + i, fecha, n, nota })),
    bsr: [['2026-10-14', 182000], ['2026-10-21', 96000], ['2026-10-28', 71000], ['2026-11-04', 54000], ['2026-11-11', 41000], ['2026-11-18', 28000], ['2026-11-25', 17500], ['2026-12-02', 9800], ['2026-12-09', 12400], ['2026-12-16', 8700]].map(([fecha, rank], i) => ({ id: 'b' + i, fecha, rank, categoria: 'Libros' })),
    gastos: [['2026-10-12', '20 ejemplares de autor', 74.2, 'Ejemplares'], ['2026-10-19', 'Envíos a creadores', 46, 'Envíos'], ['2026-12-03', 'Anuncio en Instagram', 80, 'Redes']].map(([fecha, concepto, importe, canal], i) => ({ id: 'g' + i, fecha, concepto, importe, canal })),
    eventos: [['2026-10-12', 'Publicación del libro', 'hito'], ['2026-10-19', 'Envío a 15 creadores', 'accion'], ['2026-10-20', 'Nota de prensa', 'accion'], ['2026-11-12', 'Subida a 12,99 €', 'precio'], ['2026-12-03', 'Anuncio en Instagram', 'accion']].map(([fecha, texto, tipo], i) => ({ id: 'e' + i, fecha, texto, tipo })),
    precios: [{ id: 'p0', desde: '2026-10-12', precio: 10.49 }, { id: 'p1', desde: '2026-11-12', precio: 12.99 }],
    settings: { ivaAds: 0.21, pagoDias: 60, fx: { USD: 0.92, GBP: 1.17, CAD: 0.66, JPY: 0.0061, MXN: 0.05 }, lanzamiento: LAUNCH },
  };
}
