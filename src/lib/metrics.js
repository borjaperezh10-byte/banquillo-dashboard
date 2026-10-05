import { SCENARIOS, RULES, HITOS, BUDGET_PHASES, PLAN_START } from '../data/plan.js';
import { addDays, addMonths, daysBetween, daysInMonth, monthEnd, monthOf, monthsRange, daysRange, weekStart, fmtDate } from './dates.js';
import { eur, num, pct } from './format.js';

export const sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);
const div = (a, b) => (b > 0 ? a / b : null);

export function fxRate(settings, cur) {
  const c = String(cur || 'EUR').toUpperCase();
  if (c === 'EUR') return 1;
  return settings.fx?.[c] ?? null;
}

export function priceAt(precios, d) {
  const list = [...precios].sort((a, b) => a.desde.localeCompare(b.desde));
  let p = list.length ? list[0].precio : 10.49;
  for (const x of list) if (x.desde <= d) p = x.precio;
  return p;
}

// Regalía por copia y ACOS de equilibrio directo para un precio con IVA (fórmulas del plan v3.0).
export function unitEconomics(precio, settings) {
  const lista = precio / (1 + RULES.bookVat);
  const regalia = RULES.kdpRoyaltyRate * lista - RULES.printCost;
  const acosEquilibrio = regalia / (precio * (1 + settings.ivaAds));
  return { lista, regalia, acosEquilibrio };
}

export function classifyTerm(t) {
  const acos = t.ventas > 0 ? t.gasto / t.ventas : null;
  if (t.clics < RULES.minClicksKeyword)
    return { k: 'esperar', level: 'info', label: `Esperar: faltan ${RULES.minClicksKeyword - t.clics} clics para juzgar` };
  if (t.pedidos === 0) return { k: 'bajar', level: 'warn', label: 'Bajar la puja un 20 % o pausar' };
  if (acos != null && acos < RULES.keywordScaleAcos) {
    if (/auto/i.test(t.campana)) return { k: 'exacta', level: 'ok', label: 'Pasar a exacta en la campaña manual' };
    return { k: 'subir', level: 'ok', label: 'Subir la puja un 10 %' };
  }
  return { k: 'mantener', level: 'info', label: 'Mantener y vigilar' };
}

export function bucketKey(d, mode) {
  return mode === 'month' ? monthOf(d) : weekStart(d);
}

export function buildCtx({ data, settings, asOf, range, campana }) {
  const warnings = [];
  const unknownCur = new Set();
  const ventas = data.ventas.map((r) => {
    const k = fxRate(settings, r.moneda);
    if (k == null) unknownCur.add(r.moneda);
    return { ...r, roy: (r.regalia || 0) * (k ?? 1) };
  });
  if (unknownCur.size) warnings.push(`Moneda sin tipo de cambio (${[...unknownCur].join(', ')}): se cuenta 1 a 1. Defínelo en Ajustes.`);
  const iva = 1 + settings.ivaAds;
  const ads = data.ads.map((r) => ({ ...r, gastoIva: r.gasto * iva }));
  const inR = (d) => (!range.from || d >= range.from) && (!range.to || d <= range.to);

  // --- Mensual (todo el histórico, sin filtros)
  const firstData = [...ventas.map((r) => r.fecha), ...ads.map((r) => r.fecha), ...data.gastos.map((r) => r.fecha)].sort()[0];
  const startMonth = !firstData || monthOf(firstData) > PLAN_START ? PLAN_START : monthOf(firstData);
  const endMonth = monthOf(asOf) > startMonth ? monthOf(asOf) : startMonth;
  const months = monthsRange(startMonth, endMonth);
  const M = Object.fromEntries(months.map((m) => [m, { m, copias: 0, roy: 0, ads: 0, adsIva: 0, otros: 0, clics: 0, imp: 0, adsVentas: 0, adsUds: 0, pedidos: 0 }]));
  ventas.forEach((r) => { const x = M[monthOf(r.fecha)]; if (x) { x.copias += r.unidades; x.roy += r.roy; } });
  ads.forEach((r) => {
    const x = M[monthOf(r.fecha)];
    if (x) { x.ads += r.gasto; x.adsIva += r.gastoIva; x.clics += r.clics; x.imp += r.impresiones; x.adsVentas += r.ventas; x.adsUds += r.unidades; x.pedidos += r.pedidos; }
  });
  data.gastos.forEach((r) => { const x = M[monthOf(r.fecha)]; if (x) x.otros += r.importe; });
  let acum = 0;
  const monthly = months.map((m) => {
    const x = M[m];
    x.neto = x.roy - x.adsIva - x.otros;
    acum += x.neto;
    x.acum = acum;
    x.org = Math.max(0, x.copias - x.adsUds);
    return x;
  });

  // --- Plan prorrateado a la fecha de corte
  const planAt = {};
  Object.values(SCENARIOS).forEach((sc) => {
    const idx = sc.rows.findIndex((r) => r.m === monthOf(asOf));
    if (idx < 0) { planAt[sc.id] = null; return; }
    const prev = idx > 0 ? sc.rows[idx - 1].acum : 0;
    const frac = +asOf.slice(8, 10) / daysInMonth(monthOf(asOf));
    planAt[sc.id] = { acum: prev + sc.rows[idx].neto * frac, copias: sum(sc.rows.slice(0, idx), (r) => r.copias) + sc.rows[idx].copias * frac };
  });

  // --- Totales (todo el histórico)
  const t = {
    copias: sum(ventas, (r) => r.unidades), roy: sum(ventas, (r) => r.roy),
    adsSin: sum(ads, (r) => r.gasto), adsIva: sum(ads, (r) => r.gastoIva), otros: sum(data.gastos, (r) => r.importe),
    clics: sum(ads, (r) => r.clics), imp: sum(ads, (r) => r.impresiones), adsVentas: sum(ads, (r) => r.ventas),
    pedidos: sum(ads, (r) => r.pedidos), adsUds: sum(ads, (r) => r.unidades),
  };
  t.neto = t.roy - t.adsIva - t.otros;
  t.acos = div(t.adsSin, t.adsVentas);
  t.cpc = div(t.adsSin, t.clics);
  t.ctr = div(t.clics, t.imp);
  t.conv = div(t.pedidos, t.clics);
  t.org = Math.max(0, t.copias - t.adsUds);
  t.costeVenta = div(t.adsIva, t.pedidos);
  t.regaliaMedia = div(t.roy, t.copias);

  const precio = priceAt(data.precios, asOf);
  const eco = unitEconomics(precio, settings);

  // --- Caja: las regalías de un mes se cobran a fin del mes siguiente al siguiente (60 días)
  const lag = Math.max(0, Math.round(settings.pagoDias / 30));
  let cashMin = 0;
  const cash = months.map((m, i) => {
    const cobrado = sum(monthly.slice(0, Math.max(0, i - lag + 1)), (x) => x.roy);
    const salidas = sum(monthly.slice(0, i + 1), (x) => x.adsIva + x.otros);
    const c = cobrado - salidas;
    cashMin = Math.min(cashMin, c);
    return { m, cash: c, cobrado, salidas };
  });
  const pendiente = sum(monthly.slice(Math.max(0, months.length - lag)), (x) => x.roy);
  const cobros = monthly.filter((x) => x.roy > 0).map((x) => ({ m: x.m, roy: x.roy, pago: monthEnd(addMonths(x.m, lag)) }));

  // --- Filtros (Ads)
  const adsR = ads.filter((r) => inR(r.fecha) && (!campana || r.campana === campana));
  const campaignNames = [...new Set(ads.map((r) => r.campana))].sort();
  const byCamp = campaignNames.filter((n) => !campana || n === campana).map((n) => {
    const rows = adsR.filter((r) => r.campana === n);
    const c = {
      campana: n, imp: sum(rows, (r) => r.impresiones), clics: sum(rows, (r) => r.clics), gasto: sum(rows, (r) => r.gasto),
      ventas: sum(rows, (r) => r.ventas), pedidos: sum(rows, (r) => r.pedidos), uds: sum(rows, (r) => r.unidades),
    };
    c.ctr = div(c.clics, c.imp); c.cpc = div(c.gasto, c.clics); c.conv = div(c.pedidos, c.clics); c.acos = div(c.gasto, c.ventas);
    c.costeVenta = div(c.gasto * iva, c.pedidos);
    return c;
  });
  const adsFrom = range.from || adsR.map((r) => r.fecha).sort()[0];
  const adsTo = range.to && range.to < asOf ? range.to : asOf;
  const days = adsFrom ? daysRange(adsFrom, adsTo < adsFrom ? adsFrom : adsTo) : [];
  const D = Object.fromEntries(days.map((d) => [d, { d, imp: 0, clics: 0, gasto: 0, ventas: 0, pedidos: 0 }]));
  adsR.forEach((r) => { const x = D[r.fecha]; if (x) { x.imp += r.impresiones; x.clics += r.clics; x.gasto += r.gasto; x.ventas += r.ventas; x.pedidos += r.pedidos; } });
  const daily = days.map((d) => ({ ...D[d], acos: div(D[d].gasto, D[d].ventas), cpc: div(D[d].gasto, D[d].clics), conv: div(D[d].pedidos, D[d].clics) }));
  const rng = {
    imp: sum(adsR, (r) => r.impresiones), clics: sum(adsR, (r) => r.clics), gasto: sum(adsR, (r) => r.gasto), gastoIva: sum(adsR, (r) => r.gastoIva),
    ventas: sum(adsR, (r) => r.ventas), pedidos: sum(adsR, (r) => r.pedidos),
  };
  rng.acos = div(rng.gasto, rng.ventas); rng.cpc = div(rng.gasto, rng.clics); rng.ctr = div(rng.clics, rng.imp); rng.conv = div(rng.pedidos, rng.clics);

  // --- Términos
  const terminos = data.terminos.map((r) => ({ ...r, acos: r.ventas > 0 ? r.gasto / r.ventas : null, cls: classifyTerm(r) }));
  const gastoSinVentas = sum(terminos.filter((r) => r.pedidos === 0), (r) => r.gasto);

  // --- Copias por periodo: orgánicas frente a anuncios
  const span = adsFrom ? daysBetween(adsFrom, asOf) : 0;
  const mensual = ventas.length > 0 && ventas.every((r) => r.fecha.endsWith('-01'));
  const bmode = mensual || span > 120 ? 'month' : 'week';
  const first = [...ventas.map((r) => r.fecha), ...ads.map((r) => r.fecha)].sort()[0];
  const buckets = [];
  if (first) {
    if (bmode === 'month') monthsRange(monthOf(first), monthOf(asOf)).forEach((m) => buckets.push(m));
    else for (let w = weekStart(first); w <= asOf; w = addDays(w, 7)) buckets.push(w);
  }
  const B = Object.fromEntries(buckets.map((b) => [b, { b, total: 0, ads: 0 }]));
  ventas.forEach((r) => { const x = B[bucketKey(r.fecha, bmode)]; if (x) x.total += r.unidades; });
  ads.forEach((r) => { const x = B[bucketKey(r.fecha, bmode)]; if (x) x.ads += r.unidades; });
  const copiasPeriodo = buckets.map((b) => ({ b, ads: Math.min(B[b].ads, B[b].total), org: Math.max(0, B[b].total - B[b].ads), total: B[b].total }));

  // --- Modo sugerido (reglas del plan v3.0)
  let modo;
  if (t.clics < RULES.minClicksCampaign) modo = { id: null, texto: `Aprendiendo: faltan ${RULES.minClicksCampaign - t.clics} clics para evaluar la campaña`, definitivo: false };
  else {
    let id = 'normal';
    if ((t.acos != null && t.acos > RULES.acosWorst) || (t.conv != null && t.conv < RULES.convWorst)) id = 'worst';
    else if (t.acos != null && t.acos < RULES.acosBest && t.org > t.adsUds) id = 'best';
    modo = { id, definitivo: t.clics >= RULES.clicksForModeDecision, texto: '' };
    modo.texto = t.clics >= RULES.clicksForModeDecision ? 'Datos suficientes para decidir el modo' : `Provisional: con ${num(RULES.clicksForModeDecision - t.clics)} clics más será definitivo`;
  }

  const ctx = { asOf, ventas, ads, months, monthly, planAt, totals: t, precio, eco, cash, cashMin, pendiente, cobros, lag, adsR, byCamp, campaignNames, daily, rng, terminos, gastoSinVentas, copiasPeriodo, bmode, modo, warnings, adsFrom, hasData: ventas.length + ads.length > 0 };
  ctx.alerts = buildAlerts(ctx, data, settings);
  return ctx;
}

export function budgetAt(d) {
  const p = BUDGET_PHASES.find((x) => d >= x.desde && d <= x.hasta);
  return p ? p.dia : null;
}

function buildAlerts(c, data, settings) {
  const A = [];
  const t = c.totals;
  const push = (level, title, detail, view) => A.push({ level, title, detail, view });
  if (!c.hasData) {
    push('info', 'Aún no hay datos', 'Importa el primer informe de KDP o de Amazon Ads en la pestaña Datos, o activa los datos de ejemplo para ver cómo queda.', 'datos');
    return A;
  }
  // frescura
  const lastAds = c.ads.map((r) => r.fecha).sort().at(-1);
  const lastKdp = c.ventas.map((r) => r.fecha).sort().at(-1);
  const last = [lastAds, lastKdp].filter(Boolean).sort().at(-1);
  if (last && daysBetween(last, c.asOf) > 7) push('warn', 'Datos sin actualizar', `El último dato es del ${fmtDate(last)}. Importa los informes de esta semana.`, 'datos');
  // freno de emergencia
  const brake = c.asOf >= RULES.brakeDate;
  if (brake && t.neto < RULES.brakeNet) push('critical', 'Freno de emergencia del plan', `El neto acumulado (${eur(t.neto)}) está por debajo de ${eur(RULES.brakeNet)} pasado marzo de 2027: pausa los Ads salvo en picos.`, 'plan');
  else if (t.neto < RULES.brakeNet) push('warn', 'Neto por debajo del umbral de freno', `Llevas ${eur(t.neto)}. El plan lo evalúa en marzo de 2027 (umbral ${eur(RULES.brakeNet)}); hoy no obliga a nada.`, 'plan');
  // modo
  if (c.modo.id) push(c.modo.id === 'worst' ? 'warn' : 'ok', `Modo sugerido: ${c.modo.id}`, c.modo.texto, 'ads');
  else if (t.clics > 0) push('info', 'Campañas en aprendizaje', c.modo.texto, 'ads');
  // ACOS frente a equilibrio
  if (t.acos != null && t.clics >= RULES.minClicksCampaign) {
    const be = c.eco.acosEquilibrio;
    push(t.acos <= be ? 'ok' : t.acos <= RULES.acosWorst ? 'info' : 'warn', `ACOS ${pct(t.acos)} frente al equilibrio ${pct(be)}`, t.acos <= be ? 'Los anuncios se pagan solos con la venta directa.' : 'Por encima del equilibrio pagas visibilidad: tiene sentido solo si el arrastre orgánico lo compensa.', 'ads');
  }
  // campañas
  c.byCamp.forEach((k) => {
    if (k.clics >= RULES.minClicksCampaign && k.acos != null && k.acos > RULES.acosWorst) push('warn', `Campaña con ACOS alto: ${k.campana}`, `ACOS ${pct(k.acos)} con ${num(k.clics)} clics. Revisa pujas y términos antes de seguir gastando.`, 'ads');
  });
  // términos
  const bajar = c.terminos.filter((x) => x.cls.k === 'bajar');
  if (bajar.length) push('warn', `${bajar.length} términos con 15 o más clics y ninguna venta`, `Han gastado ${eur(sum(bajar, (x) => x.gasto), 2)} sin pedidos. Baja la puja un 20 % o pausa.`, 'terminos');
  const sube = c.terminos.filter((x) => x.cls.k === 'subir' || x.cls.k === 'exacta');
  if (sube.length) push('ok', `${sube.length} términos listos para subir o pasar a exacta`, 'Tienen ventas y un ACOS por debajo del 40 %.', 'terminos');
  // reseñas
  const rev = [...data.resenas].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1);
  const nRev = rev ? rev.n : 0;
  HITOS.forEach((h) => {
    if (c.asOf <= h.fecha) {
      const faltan = daysBetween(c.asOf, h.fecha);
      if (nRev < h.resenas) push(faltan < 21 ? 'warn' : 'info', `Reseñas: ${nRev} de ${h.resenas} para ${h.label}`, `Faltan ${faltan} días. Sin pedirlas con incentivos: la carta final y los creadores son el camino.`, 'resenas');
    }
  });
  // precio
  if (c.asOf >= '2026-11-10' && c.precio < 12.99) push('warn', 'Toca subir el precio a 12,99 €', 'El plan lo sitúa hacia el 10 de noviembre, con las primeras reseñas. Cuando lo cambies en KDP, anótalo en Datos.', 'datos');
  // ritmo frente al plan normal
  const idx = SCENARIOS.normal.rows.findIndex((r) => r.m === monthOf(c.asOf));
  if (idx > 0) {
    const real = c.monthly.find((x) => x.m === monthOf(c.asOf));
    const frac = +c.asOf.slice(8, 10) / daysInMonth(monthOf(c.asOf));
    const planCop = SCENARIOS.normal.rows[idx].copias * frac;
    if (real && frac > 0.5 && planCop > 5 && real.copias < planCop * 0.7) push('warn', 'Ventas del mes por debajo del plan normal', `${num(real.copias)} copias frente a ${num(planCop)} esperadas a estas alturas.`, 'plan');
  }
  if (c.warnings.length) c.warnings.forEach((w) => push('info', 'Aviso de datos', w, 'datos'));
  const order = { critical: 0, warn: 1, info: 2, ok: 3 };
  return A.sort((a, b) => order[a.level] - order[b.level]);
}
