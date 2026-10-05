import { SCENARIOS, PLAN_TOTALS } from '../src/data/plan.js';
let bad = 0;
for (const [id, sc] of Object.entries(SCENARIOS)) {
  const rows = sc.rows;
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  const t = { copias: sum('copias'), roy: sum('roy'), ads: sum('ads'), otros: sum('otros'), neto: rows.at(-1).acum };
  console.log(id, rows.length, 'meses', rows[0].m, '->', rows.at(-1).m, JSON.stringify(t), 'plan:', JSON.stringify(PLAN_TOTALS[id]));
  for (const k of Object.keys(t)) {
    const tol = 8; // las filas mensuales del plan están redondeadas; el total publicado no
    if (Math.abs(t[k] - PLAN_TOTALS[id][k]) > tol) { console.log('  DESAJUSTE', id, k, t[k], PLAN_TOTALS[id][k]); bad++; }
  }
  let acc = 0;
  rows.forEach((r, i) => {
    const neto = r.roy - r.ads - r.otros; acc += neto;
    const ratio = r.roy / r.copias; if (ratio < 2.2 || ratio > 4.2) { console.log('  regalía por copia fuera de rango', id, r.m, ratio.toFixed(2)); bad++; }
    if (Math.abs(neto - r.neto) > 2) { console.log('  neto mes', id, r.m, 'calc', neto, 'tabla', r.neto); bad++; }
    if (Math.abs(acc - r.acum) > 8) { console.log('  acum', id, r.m, 'calc', acc, 'tabla', r.acum); bad++; }
  });
  // peor punto de caja: royalties de un mes se cobran a fin del mes+2
  let min = 0, cash = 0, cumOut = 0;
  rows.forEach((r, i) => {
    cumOut += r.ads + r.otros;
    const cobrado = rows.slice(0, Math.max(0, i - 1)).reduce((a, x) => a + x.roy, 0);
    cash = cobrado - cumOut; if (cash < min) min = cash;
  });
  console.log('  peor caja', min);
}
console.log(bad ? `FALLOS: ${bad}` : 'Plan transcrito: todos los totales y acumulados cuadran');
process.exit(bad ? 1 : 0);
