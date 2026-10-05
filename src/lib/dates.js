export const pad = (n) => String(n).padStart(2, '0');
export const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromYmd = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
export const today = () => ymd(new Date());
export const addDays = (s, n) => {
  const d = fromYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const daysBetween = (a, b) => Math.round((fromYmd(b) - fromYmd(a)) / 86400000);
export const monthOf = (s) => s.slice(0, 7);
export const addMonths = (mk, n) => {
  const [y, m] = mk.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
export const daysInMonth = (mk) => {
  const [y, m] = mk.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};
export const monthEnd = (mk) => `${mk}-${pad(daysInMonth(mk))}`;
export const monthsRange = (a, b) => {
  const out = [];
  for (let m = a; m <= b; m = addMonths(m, 1)) out.push(m);
  return out;
};
export const daysRange = (a, b) => {
  const out = [];
  for (let d = a; d <= b; d = addDays(d, 1)) out.push(d);
  return out;
};
export const weekStart = (s) => {
  const d = fromYmd(s);
  const wd = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - wd);
  return ymd(d);
};
export const fmtDate = (s) => (s ? `${+s.slice(8, 10)} ${MES[+s.slice(5, 7) - 1]} ${s.slice(2, 4)}` : '');
export const fmtDay = (s) => (s ? `${+s.slice(8, 10)} ${MES[+s.slice(5, 7) - 1]}` : '');
export const fmtMonth = (mk) => (mk ? `${MES[+mk.slice(5, 7) - 1]} ${mk.slice(2, 4)}` : '');
export const fmtMonthLong = (mk) => `${MES_LARGO[+mk.slice(5, 7) - 1]} ${mk.slice(0, 4)}`;

const MES_ALIAS = {
  ene: 1, jan: 1, enero: 1, january: 1, feb: 2, febrero: 2, february: 2, mar: 3, marzo: 3, march: 3,
  abr: 4, apr: 4, abril: 4, april: 4, may: 5, mayo: 5, jun: 6, junio: 6, june: 6, jul: 7, julio: 7, july: 7,
  ago: 8, aug: 8, agosto: 8, august: 8, sep: 9, sept: 9, set: 9, septiembre: 9, september: 9,
  oct: 10, octubre: 10, october: 10, nov: 11, noviembre: 11, november: 11, dic: 12, dec: 12, diciembre: 12, december: 12,
};
const quitarTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const valid = (y, m, d) => y > 2000 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
const mk = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// Acepta fechas ISO, DD/MM/AAAA, "12 oct 2026", "Oct 12, 2026", "2026-10", objetos Date y números de serie de Excel.
export function parseDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) {
    if (isNaN(v)) return null;
    const utcMidnight = v.getUTCHours() === 0 && v.getUTCMinutes() === 0;
    return utcMidnight ? mk(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate()) : ymd(v);
  }
  if (typeof v === 'number') {
    if (v > 30000 && v < 80000) {
      const d = new Date(Math.round((v - 25569) * 86400000));
      return mk(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
    return null;
  }
  const s = quitarTildes(String(v).trim().toLowerCase());
  let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return valid(+m[1], +m[2], +m[3]) ? mk(+m[1], +m[2], +m[3]) : null;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})$/))) return valid(+m[1], +m[2], 1) ? mk(+m[1], +m[2], 1) : null;
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))) {
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return valid(y, +m[2], +m[1]) ? mk(y, +m[2], +m[1]) : null;
  }
  if ((m = s.match(/^(\d{1,2})\s*(?:de\s+)?([a-z]+)\.?,?\s*(?:de\s+)?(\d{4})/)) && MES_ALIAS[m[2]])
    return valid(+m[3], MES_ALIAS[m[2]], +m[1]) ? mk(+m[3], MES_ALIAS[m[2]], +m[1]) : null;
  if ((m = s.match(/^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/)) && MES_ALIAS[m[1]])
    return valid(+m[3], MES_ALIAS[m[1]], +m[2]) ? mk(+m[3], MES_ALIAS[m[1]], +m[2]) : null;
  if ((m = s.match(/^([a-z]+)\.?\s+(\d{4})$/)) && MES_ALIAS[m[1]]) return mk(+m[2], MES_ALIAS[m[1]], 1);
  return null;
}

// Números con formato español (1.234,56) o inglés (1,234.56), con símbolos de moneda y paréntesis negativos.
export function parseNum(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (v == null) return null;
  let s = String(v).trim();
  if (!s || s === '-' || s === '—') return null;
  s = s.replace(/EUR|USD|GBP|CAD|JPY|[€$£¥%\s ]/gi, '');
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  const lc = s.lastIndexOf(',');
  const ld = s.lastIndexOf('.');
  if (lc > -1 && ld > -1) s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (lc > -1) s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  else if (ld > -1 && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isFinite(n) ? (neg ? -n : n) : null;
}
