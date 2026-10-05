import { useEffect, useId, useRef, useState } from 'react';
import { compact } from '../lib/format.js';

export function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function niceTicks(min, max, count = 4) {
  if (!isFinite(min) || !isFinite(max)) return [0, 1];
  if (min === max) { max = min + 1; }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  const start = Math.floor(min / step) * step;
  const out = [];
  for (let v = start; v <= max + step * 0.999; v += step) out.push(+v.toFixed(10));
  return out;
}

const roundTop = (x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
};

function Legend({ items, off, toggle }) {
  if (items.length < 2) return null;
  return (
    <div className="legend" role="group" aria-label="Series">
      {items.map((s) => (
        <button key={s.id} type="button" className={`legend-item${off?.[s.id] ? ' is-off' : ''}`} onClick={() => toggle?.(s.id)} aria-pressed={!off?.[s.id]}>
          <i className="key" style={{ background: s.dash ? 'transparent' : s.color, border: s.dash ? `2px dashed ${s.color}` : 0, height: s.dash ? 0 : 10, borderRadius: s.dash ? 0 : 3, width: s.dash ? 14 : 10 }} />
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  );
}

function Tip({ x, w, rows, title, extra }) {
  const left = Math.min(Math.max(x, 8), w - 8);
  const flip = left > w * 0.62;
  return (
    <div className="tip" style={{ left, transform: `translateX(${flip ? 'calc(-100% - 12px)' : '12px'})` }} role="status">
      <div className="tip-title">{title}</div>
      {rows.map((r) => (
        <div className="tip-row" key={r.id}>
          <i className="key" style={{ background: r.color }} />
          <strong>{r.value}</strong>
          <span>{r.label}</span>
        </div>
      ))}
      {extra?.map((t, i) => (
        <div className="tip-extra" key={i}>{t}</div>
      ))}
    </div>
  );
}

// Líneas sobre un eje de categorías (días, semanas o meses). Un solo eje Y; los valores nulos cortan la línea.
export function LineChart({ labels, series, height = 260, yFmt = compact, tipFmt, refs = [], marks = [], area = false, invert = false, initialOff, ariaLabel, note }) {
  const [ref, W] = useWidth();
  const uid = useId().replace(/:/g, '');
  const [hover, setHover] = useState(null);
  const [off, setOff] = useState(initialOff || {});
  const visible = series.filter((s) => !off[s.id]);
  const ends = visible.length <= 4 && W > 560;
  const m = { l: 54, r: ends ? 112 : 18, t: 14, b: 30 };
  const iw = W - m.l - m.r;
  const ih = height - m.t - m.b;
  const n = labels.length;
  const X = (i) => m.l + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const vals = visible.filter((s) => !s.offscale).flatMap((s) => s.values).filter((v) => v != null && isFinite(v));
  refs.forEach((r) => vals.push(r.y));
  let lo = vals.length ? Math.min(...vals) : 0;
  let hi = vals.length ? Math.max(...vals) : 1;
  if (lo > 0) lo = 0;
  if (hi < 0) hi = 0;
  const pad = (hi - lo) * 0.06 || 1;
  const ticks = niceTicks(lo, hi + (hi > 0 ? pad : 0), 4);
  const yMin = Math.min(lo, ticks[0]);
  const yMax = ticks[ticks.length - 1];
  const Y = (v) => { const f = (v - yMin) / (yMax - yMin || 1); return invert ? m.t + f * ih : m.t + ih - f * ih; };
  const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 58))));
  const path = (vs) => {
    let d = '';
    let pen = false;
    vs.forEach((v, i) => {
      if (v == null || !isFinite(v)) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / (iw || 1)) * (n - 1)))));
  };
  const key = (e) => {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === 'Escape') setHover(null);
  };
  const lastIdx = (vs) => { for (let i = vs.length - 1; i >= 0; i--) if (vs[i] != null) return i; return -1; };
  const offs = series.filter((s) => s.offscale && !off[s.id]);
  const evAt = (i) => marks.filter((k) => k.i === i).map((k) => k.text);

  return (
    <div className="chart" ref={ref} style={{ position: 'relative' }}>
      <Legend items={series} off={off} toggle={(id) => setOff((o) => ({ ...o, [id]: !o[id] }))} />
      <svg width={W} height={height} role="img" aria-label={ariaLabel}>
        <defs><clipPath id={`c${uid}`}><rect x={m.l} y={m.t} width={iw} height={ih} /></clipPath></defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={Y(t)} y2={Y(t)} className={t === 0 ? 'axis' : 'grid'} />
            <text x={m.l - 8} y={Y(t) + 4} textAnchor="end" className="tick">{yFmt(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => (i % step === 0 ? <text key={i} x={X(i)} y={height - 8} textAnchor="middle" className="tick">{l}</text> : null))}
        {refs.map((r, i) => (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={Y(r.y)} y2={Y(r.y)} className="ref" />
            <text x={W - m.r - 4} y={Y(r.y) - 5} textAnchor="end" className="reflabel">{r.label}</text>
          </g>
        ))}
        {marks.map((k, i) => (
          <g key={i}>
            <line x1={X(k.i)} x2={X(k.i)} y1={m.t} y2={m.t + ih} className="mark" />
            <circle cx={X(k.i)} cy={m.t + ih} r="3.5" className="markdot" />
          </g>
        ))}
        <g clipPath={`url(#c${uid})`}>
          {visible.map((s) => area && !s.offscale && s.area !== false ? (
            <path key={`a${s.id}`} d={`${path(s.values)} L${X(lastIdx(s.values))},${Y(0)} L${X(s.values.findIndex((v) => v != null))},${Y(0)} Z`} fill={s.color} opacity="0.10" />
          ) : null)}
          {visible.map((s) => <path key={s.id} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={s.width || 2} strokeDasharray={s.dash} strokeLinejoin="round" strokeLinecap="round" />)}
        </g>
        {visible.map((s) => {
          const li = lastIdx(s.values);
          if (li < 0 || s.offscale) return null;
          return <circle key={`d${s.id}`} cx={X(li)} cy={Y(s.values[li])} r="4" fill={s.color} className="enddot" />;
        })}
        {ends && (() => {
          const items = visible.filter((s) => lastIdx(s.values) >= 0 && !s.offscale).map((s) => ({ s, y: Y(s.values[lastIdx(s.values)]) })).sort((a, b) => a.y - b.y);
          let prev = -99;
          return items.map(({ s, y }) => {
            if (y - prev < 15) return null;
            prev = y;
            return (
              <g key={`l${s.id}`}>
                <line x1={W - m.r + 8} x2={W - m.r + 20} y1={y} y2={y} stroke={s.color} strokeWidth="2" strokeLinecap="round" />
                <text x={W - m.r + 25} y={y + 4} className="endlabel">{s.label}</text>
              </g>
            );
          });
        })()}
        {hover != null && <line x1={X(hover)} x2={X(hover)} y1={m.t} y2={m.t + ih} className="cross" />}
        {hover != null && visible.map((s) => (s.values[hover] != null && !s.offscale ? <circle key={`h${s.id}`} cx={X(hover)} cy={Y(Math.min(s.values[hover], yMax))} r="4" fill={s.color} className="enddot" /> : null))}
        <rect x={m.l} y={m.t} width={iw} height={ih} fill="transparent" tabIndex={0} onPointerMove={move} onPointerLeave={() => setHover(null)} onKeyDown={key} onFocus={() => setHover((h) => h ?? n - 1)} onBlur={() => setHover(null)} aria-label={`${ariaLabel || 'Gráfico'}. Usa las flechas para recorrer los valores.`} style={{ outline: 'none' }} />
      </svg>
      {hover != null && (
        <Tip x={X(hover)} w={W} title={labels[hover]} extra={evAt(hover)}
          rows={visible.filter((s) => s.values[hover] != null).map((s) => ({ id: s.id, color: s.color, label: s.label, value: (tipFmt || yFmt)(s.values[hover]) }))} />
      )}
      {offs.length > 0 && <p className="chart-note">{offs.map((s) => `${s.label} sube hasta ${(tipFmt || yFmt)(Math.max(...s.values.filter((v) => v != null)))} y queda fuera de escala.`).join(' ')}</p>}
      {note && <p className="chart-note">{note}</p>}
    </div>
  );
}

// Columnas apiladas o agrupadas, máx. 24 px de grosor, esquina superior redondeada y 2 px de separación.
export function ColumnChart({ labels, series, stacked = true, height = 240, yFmt = compact, tipFmt, refs = [], ariaLabel }) {
  const [ref, W] = useWidth();
  const [hover, setHover] = useState(null);
  const [off, setOff] = useState({});
  const vis = series.filter((s) => !off[s.id]);
  const m = { l: 54, r: 16, t: 14, b: 30 };
  const iw = W - m.l - m.r;
  const ih = height - m.t - m.b;
  const n = labels.length;
  const band = iw / Math.max(1, n);
  const totals = labels.map((_, i) => vis.reduce((a, s) => a + (s.values[i] || 0), 0));
  const maxV = Math.max(1, ...(stacked ? totals : vis.flatMap((s) => s.values.map((v) => v || 0))), ...refs.map((r) => r.y));
  const ticks = niceTicks(0, maxV * 1.04, 4);
  const yMax = ticks[ticks.length - 1];
  const Y = (v) => m.t + ih - (v / yMax) * ih;
  const bw = Math.min(24, (band * 0.72) / (stacked ? 1 : Math.max(1, vis.length)));
  const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 54))));
  return (
    <div className="chart" ref={ref} style={{ position: 'relative' }}>
      <Legend items={series} off={off} toggle={(id) => setOff((o) => ({ ...o, [id]: !o[id] }))} />
      <svg width={W} height={height} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={Y(t)} y2={Y(t)} className={t === 0 ? 'axis' : 'grid'} />
            <text x={m.l - 8} y={Y(t) + 4} textAnchor="end" className="tick">{yFmt(t)}</text>
          </g>
        ))}
        {refs.map((r, i) => (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={Y(r.y)} y2={Y(r.y)} className="ref" />
            <text x={W - m.r - 4} y={Y(r.y) - 5} textAnchor="end" className="reflabel">{r.label}</text>
          </g>
        ))}
        {labels.map((l, i) => {
          const cx = m.l + band * i + band / 2;
          let acc = 0;
          const k = vis.length;
          return (
            <g key={i}>
              {hover === i && <rect x={m.l + band * i} y={m.t} width={band} height={ih} className="band" />}
              {vis.map((s, si) => {
                const v = s.values[i] || 0;
                if (v <= 0) return null;
                if (stacked) {
                  const y0 = Y(acc + v);
                  const y1 = Y(acc);
                  acc += v;
                  const gap = si === 0 || y1 - y0 < 3 ? 0 : 2;
                  const top = vis.slice(si + 1).every((q) => !(q.values[i] > 0));
                  const h = Math.max(1, y1 - y0 - gap);
                  return top ? <path key={s.id} d={roundTop(cx - bw / 2, y0, bw, h, 4)} fill={s.color} /> : <rect key={s.id} x={cx - bw / 2} y={y0} width={bw} height={h} fill={s.color} />;
                }
                const gw = (bw * k + 2 * (k - 1)) / 2;
                const x = cx - gw + si * (bw + 2);
                return <path key={s.id} d={roundTop(x, Y(v), bw, Y(0) - Y(v), 4)} fill={s.color} />;
              })}
              {i % step === 0 && <text x={cx} y={height - 8} textAnchor="middle" className="tick">{l}</text>}
              <rect x={m.l + band * i} y={m.t} width={band} height={ih + 18} fill="transparent" tabIndex={0}
                onPointerEnter={() => setHover(i)} onPointerMove={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                aria-label={`${l}: ${vis.map((s) => `${s.label} ${(tipFmt || yFmt)(s.values[i] || 0)}`).join(', ')}`} style={{ outline: 'none' }} />
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <Tip x={m.l + band * hover + band / 2} w={W} title={labels[hover]}
          rows={[...vis.map((s) => ({ id: s.id, color: s.color, label: s.label, value: (tipFmt || yFmt)(s.values[hover] || 0) })), ...(stacked && vis.length > 1 ? [{ id: 'tot', color: 'transparent', label: 'Total', value: (tipFmt || yFmt)(totals[hover]) }] : [])]} />
      )}
    </div>
  );
}

// Lista de barras horizontales (una o varias partes apiladas), con el valor en la punta.
export function BarList({ rows, fmt = compact, max, empty = 'Sin datos todavía' }) {
  if (!rows.length) return <p className="empty">{empty}</p>;
  const mx = max || Math.max(1, ...rows.map((r) => r.parts.reduce((a, p) => a + p.v, 0)));
  return (
    <ul className="barlist">
      {rows.map((r) => {
        const tot = r.parts.reduce((a, p) => a + p.v, 0);
        return (
          <li key={r.label} title={`${r.label}: ${r.parts.map((p) => `${p.name} ${fmt(p.v)}`).join(' · ')}`}>
            <span className="bl-label">{r.label}</span>
            <span className="bl-track">
              {r.parts.map((p) => (p.v > 0 ? <i key={p.name} className="bl-seg" style={{ width: `${(p.v / mx) * 100}%`, background: p.color }} /> : null))}
            </span>
            <span className="bl-val">{fmt(tot)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function Meter({ value, max, markers = [], label }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <i className="meter-fill" style={{ width: `${pct * 100}%` }} />
      {markers.map((k) => <b key={k} className="meter-mark" style={{ left: `${(k / max) * 100}%` }} />)}
    </div>
  );
}

export function Spark({ values, w = 96, h = 28 }) {
  const v = values.filter((x) => x != null);
  if (v.length < 2) return <svg width={w} height={h} aria-hidden="true" />;
  const lo = Math.min(...v), hi = Math.max(...v);
  const X = (i) => 3 + (i * (w - 6)) / (v.length - 1);
  const Y = (x) => h - 4 - ((x - lo) / (hi - lo || 1)) * (h - 8);
  const d = v.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(x).toFixed(1)}`).join('');
  return (
    <svg width={w} height={h} aria-hidden="true" className="spark">
      <path d={d} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spark-line" />
      <circle cx={X(v.length - 1)} cy={Y(v[v.length - 1])} r="3.5" className="spark-dot" />
    </svg>
  );
}
