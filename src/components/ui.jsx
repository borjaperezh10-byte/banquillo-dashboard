import { useMemo, useState } from 'react';

export function Card({ title, sub, table, children, actions, className = '' }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={`card ${className}`}>
      {(title || table) && (
        <div className="card-head">
          <div>
            {title && <h2>{title}</h2>}
            {sub && <p>{sub}</p>}
          </div>
          {actions}
          {table && <button type="button" className="btn" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>{asTable ? 'Ver gráfico' : 'Ver tabla'}</button>}
        </div>
      )}
      {table && asTable ? <DataTable cols={table.cols} rows={table.rows} /> : children}
    </section>
  );
}

export function Stat({ label, value, detail, tone }) {
  return (
    <div className="stat">
      <span className="l">{label}</span>
      <span className="v">{value}</span>
      {detail != null && <span className={`d ${tone || ''}`}>{detail}</span>}
    </div>
  );
}

const ICON = { ok: '✓', warn: '!', critical: '✕', info: 'i' };
export function Status({ level = 'info', children }) {
  return (
    <span className={`status ${level}`}>
      <span aria-hidden="true">{ICON[level]}</span>
      {children}
    </span>
  );
}

// Tabla ordenable. cols: [{ k, label, fmt, left, sort }]; rows: objetos. `rowKey` identifica filas.
export function DataTable({ cols, rows, footer, initialSort, max = 500, empty = 'Sin datos todavía' }) {
  const [sort, setSort] = useState(initialSort || null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = cols.find((c) => c.k === sort.k);
    const get = (r) => (col?.sort ? col.sort(r) : r[sort.k]);
    return [...rows].sort((a, b) => {
      const x = get(a), y = get(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      const c = typeof x === 'string' ? x.localeCompare(y) : x - y;
      return sort.dir === 'asc' ? c : -c;
    });
  }, [rows, sort, cols]);
  if (!rows.length) return <p className="empty">{empty}</p>;
  const toggle = (k) => setSort((s) => (s?.k === k ? { k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { k, dir: 'desc' }));
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.k} className={c.left ? 'l' : ''} aria-sort={sort?.k === c.k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" onClick={() => toggle(c.k)}>{c.label}{sort?.k === c.k ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, max).map((r, i) => (
            <tr key={r.id ?? i}>
              {cols.map((c) => <td key={c.k} className={`${c.left ? 'l' : ''}${c.wrap ? ' wrap' : ''}`}>{c.render ? c.render(r) : c.fmt ? c.fmt(r[c.k]) : r[c.k]}</td>)}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot><tr>{cols.map((c) => <td key={c.k} className={c.left ? 'l' : ''}>{footer[c.k] ?? ''}</td>)}</tr></tfoot>}
      </table>
      {sorted.length > max && <p className="note">Se muestran {max} de {sorted.length} filas.</p>}
    </div>
  );
}

export const Delta = ({ value, fmt, invert = false, suffix = '' }) => {
  if (value == null || !isFinite(value) || Math.abs(value) < 1e-9) return <span>sin cambio</span>;
  const good = invert ? value < 0 : value > 0;
  return <b className={good ? 'up' : 'down'}>{value > 0 ? '▲' : '▼'} {fmt(Math.abs(value))}{suffix}</b>;
};
