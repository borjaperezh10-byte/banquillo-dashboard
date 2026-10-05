const G = { useGrouping: 'always' };
export const num = (n, d = 0) =>
  n == null || !isFinite(n) ? '—' : n.toLocaleString('es-ES', { ...G, minimumFractionDigits: d, maximumFractionDigits: d });
export const eur = (n, d = 0) => (n == null || !isFinite(n) ? '—' : `${num(n, d)} €`);
export const eurSigned = (n, d = 0) => (n == null || !isFinite(n) ? '—' : `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n), d)} €`);
export const pct = (x, d = 1) => (x == null || !isFinite(x) ? '—' : `${num(x * 100, d)} %`);
export const compact = (n) => {
  if (n == null || !isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 10000) return `${num(n / 1000, 0)}k`;
  if (a >= 1000) return num(n, 0);
  return num(n, 0);
};
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
