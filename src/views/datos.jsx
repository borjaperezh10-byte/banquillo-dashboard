import { useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import readXlsxFile from 'read-excel-file/browser';
import { Card, DataTable } from '../components/ui.jsx';
import { DATASETS, detectDataset, detectHeader, convertRows, autoMap } from '../lib/importer.js';
import { eur, num } from '../lib/format.js';
import { fmtDate } from '../lib/dates.js';

async function readFileRows(file) {
  const name = file.name || '';
  if (/\.xlsx?$/i.test(name)) {
    const res = await readXlsxFile(file);
    const list = Array.isArray(res) && res.length && res[0] && 'data' in res[0] ? res : [{ sheet: 'Hoja 1', data: res }];
    return list.map((s) => ({ name: s.sheet, rows: s.data }));
  }
  const buf = await file.arrayBuffer();
  const u = new Uint8Array(buf);
  let text;
  if (u[0] === 0xff && u[1] === 0xfe) text = new TextDecoder('utf-16le').decode(buf);
  else if (u[0] === 0xfe && u[1] === 0xff) text = new TextDecoder('utf-16be').decode(buf);
  else {
    text = new TextDecoder('utf-8').decode(buf);
    if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf);
  }
  text = text.replace(/^﻿/, '');
  const out = Papa.parse(text, { skipEmptyLines: 'greedy' });
  return [{ name: 'CSV', rows: out.data }];
}

function Importer({ st, data }) {
  const [sheets, setSheets] = useState(null);
  const [sheetIx, setSheetIx] = useState(0);
  const [dsId, setDsId] = useState('ventas');
  const [hdr, setHdr] = useState(0);
  const [map, setMap] = useState({});
  const [msg, setMsg] = useState('');
  const [over, setOver] = useState(false);
  const [fname, setFname] = useState('');
  const inp = useRef(null);
  const rows = sheets?.[sheetIx]?.rows || [];
  const ds = DATASETS[dsId];

  const setup = (r, id) => {
    const h = detectHeader(r, DATASETS[id]);
    const headers = (r[h.idx] || []).map((c) => (c == null ? '' : String(c)));
    const saved = data.mappings?.[id];
    let m = h.mapping;
    if (saved) {
      const m2 = {};
      Object.entries(saved).forEach(([fid, name]) => { const ci = headers.indexOf(name); if (ci >= 0) m2[fid] = ci; });
      if (Object.keys(m2).length >= Object.keys(m).length) m = { ...m, ...m2 };
    }
    setHdr(h.idx);
    setMap(m);
  };
  const load = async (file) => {
    setMsg('');
    try {
      const s = await readFileRows(file);
      if (!s.length || !s[0].rows.length) { setMsg('El archivo está vacío o no se pudo leer.'); return; }
      setSheets(s); setFname(file.name); setSheetIx(0);
      const det = detectDataset(s[0].rows);
      setDsId(det.best.id);
      setup(s[0].rows, det.best.id);
    } catch (e) {
      setMsg(`No se pudo leer el archivo: ${e.message || e}. Prueba a exportarlo como CSV o XLSX.`);
    }
  };
  const headers = (rows[hdr] || []).map((c) => (c == null ? '' : String(c)));
  const conv = useMemo(() => (rows.length ? convertRows(rows, hdr, map, ds) : null), [rows, hdr, map, ds]);
  const missing = Object.entries(ds.fields).filter(([k, f]) => f.req && map[k] === undefined).map(([, f]) => f.label);
  (ds.needAny || []).forEach((g) => { if (!g.some((k) => map[k] !== undefined)) missing.push(g.map((k) => ds.fields[k].label).join(' o ')); });

  const apply = () => {
    if (!conv || !conv.records.length) return;
    if (ds.replaceAll) st.dispatch({ type: 'replaceDs', ds: dsId, records: conv.records });
    else st.dispatch({ type: 'upsert', ds: dsId, records: conv.records, key: ds.key });
    const savedMap = {};
    Object.entries(map).forEach(([fid, ci]) => { if (headers[ci]) savedMap[fid] = headers[ci]; });
    st.dispatch({ type: 'mapping', ds: dsId, mapping: savedMap });
    st.dispatch({ type: 'log', entry: { fecha: new Date().toISOString().slice(0, 16).replace('T', ' '), ds: dsId, archivo: fname, filas: conv.records.length, omitidas: conv.skipped } });
    setMsg(`Importadas ${num(conv.records.length)} filas de «${ds.label}».`);
    setSheets(null);
  };

  const preview = conv ? conv.records.slice(0, 6) : [];
  const pcols = Object.keys(preview[0] || {});
  return (
    <Card title="Importar informes" sub="Sube el CSV o el XLSX tal como lo descargas. El panel reconoce el tipo y propone las columnas; puedes corregirlas.">
      <div className="stack">
        <div className={`drop${over ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) load(f); }}>
          <p>Arrastra aquí un informe o</p>
          <button type="button" className="btn primary" style={{ marginTop: 8 }} onClick={() => inp.current?.click()}>Elegir archivo</button>
          <input ref={inp} type="file" accept=".csv,.xlsx,.xls,.txt,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); e.target.value = ''; }} />
        </div>
        {msg && <p className="note" role="status">{msg}</p>}
        {sheets && (
          <div className="stack">
            <div className="form-row">
              <label className="field"><span>Tipo de informe</span>
                <select value={dsId} onChange={(e) => { setDsId(e.target.value); setup(rows, e.target.value); }}>
                  {Object.values(DATASETS).map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select></label>
              {sheets.length > 1 && (
                <label className="field"><span>Hoja</span>
                  <select value={sheetIx} onChange={(e) => { const i = +e.target.value; setSheetIx(i); setup(sheets[i].rows, dsId); }}>
                    {sheets.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
                  </select></label>
              )}
              <label className="field"><span>Fila de cabecera</span>
                <input type="number" min="1" max={Math.min(rows.length, 50)} value={hdr + 1} onChange={(e) => { const i = Math.max(0, +e.target.value - 1); setHdr(i); setMap(autoMap((rows[i] || []).map((c) => (c == null ? '' : String(c))), ds)); }} style={{ width: 90 }} /></label>
            </div>
            <p className="note">{ds.help}</p>
            <div>
              {Object.entries(ds.fields).map(([fid, f]) => (
                <div className="maprow" key={fid}>
                  <label htmlFor={`m-${fid}`} className={f.req ? 'req' : ''}>{f.label}</label>
                  <select id={`m-${fid}`} value={map[fid] ?? ''} onChange={(e) => setMap((m) => { const n = { ...m }; if (e.target.value === '') delete n[fid]; else n[fid] = +e.target.value; return n; })}>
                    <option value="">— sin columna —</option>
                    {headers.map((h, i) => (h ? <option key={i} value={i}>{h}</option> : null))}
                  </select>
                </div>
              ))}
            </div>
            {missing.length > 0 && <p className="note warn">Falta asignar: {missing.join(', ')}.</p>}
            {conv && missing.length === 0 && (
              <>
                <p className="note"><b>{num(conv.records.length)}</b> filas listas{conv.skipped ? ` · ${num(conv.skipped)} omitidas por no tener fecha o datos clave` : ''}. {ds.replaceAll ? 'Sustituirá el informe de términos anterior.' : 'Las filas con la misma fecha se actualizan, no se duplican.'}</p>
                {conv.warnings.map((w) => <p key={w} className="note warn">{w}</p>)}
                {preview.length > 0 && <DataTable cols={pcols.map((k) => ({ k, label: k, left: typeof preview[0][k] === 'string' }))} rows={preview.map((r, i) => ({ id: i, ...r }))} />}
              </>
            )}
            <div className="row">
              <button type="button" className="btn primary" disabled={!conv || !conv.records.length || missing.length > 0 || st.demo} onClick={apply}>Importar {conv ? num(conv.records.length) : 0} filas</button>
              <button type="button" className="btn" onClick={() => setSheets(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

const FORMS = {
  resenas: { title: 'Reseñas', fields: [['fecha', 'Fecha', 'date'], ['n', 'Reseñas en total', 'number'], ['nota', 'Nota media', 'number']], cols: [{ k: 'fecha', label: 'Fecha', left: true, fmt: fmtDate }, { k: 'n', label: 'Reseñas' }, { k: 'nota', label: 'Nota' }] },
  bsr: { title: 'Posición en ventas (BSR)', fields: [['fecha', 'Fecha', 'date'], ['rank', 'BSR', 'number'], ['categoria', 'Categoría', 'text']], cols: [{ k: 'fecha', label: 'Fecha', left: true, fmt: fmtDate }, { k: 'rank', label: 'BSR', fmt: num }, { k: 'categoria', label: 'Categoría', left: true }] },
  gastos: { title: 'Gastos fuera de Ads', fields: [['fecha', 'Fecha', 'date'], ['concepto', 'Concepto', 'text'], ['importe', 'Importe (€)', 'number'], ['canal', 'Canal', 'text']], cols: [{ k: 'fecha', label: 'Fecha', left: true, fmt: fmtDate }, { k: 'concepto', label: 'Concepto', left: true }, { k: 'importe', label: 'Importe', fmt: (v) => eur(v, 2) }, { k: 'canal', label: 'Canal', left: true }] },
  eventos: { title: 'Eventos y acciones', fields: [['fecha', 'Fecha', 'date'], ['texto', 'Qué has hecho', 'text'], ['tipo', 'Tipo', 'text']], cols: [{ k: 'fecha', label: 'Fecha', left: true, fmt: fmtDate }, { k: 'texto', label: 'Qué', left: true }, { k: 'tipo', label: 'Tipo', left: true }] },
  precios: { title: 'Cambios de precio', fields: [['desde', 'Desde', 'date'], ['precio', 'Precio con IVA (€)', 'number']], cols: [{ k: 'desde', label: 'Desde', left: true, fmt: fmtDate }, { k: 'precio', label: 'Precio', fmt: (v) => eur(v, 2) }] },
};

function QuickAdd({ ds, st, data }) {
  const cfg = FORMS[ds];
  const [v, setV] = useState({});
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const rec = {};
    for (const [k, , type] of cfg.fields) {
      const raw = v[k];
      if (raw === undefined || raw === '') { if (k === 'categoria' || k === 'tipo' || k === 'canal' || k === 'nota') continue; setErr('Rellena todos los campos.'); return; }
      rec[k] = type === 'number' ? Number(String(raw).replace(',', '.')) : raw;
      if (type === 'number' && !isFinite(rec[k])) { setErr('Hay un número que no se entiende.'); return; }
    }
    setErr('');
    st.dispatch({ type: 'add', ds, record: rec });
    setV({});
  };
  return (
    <Card title={cfg.title}>
      <form className="form-row" onSubmit={submit}>
        {cfg.fields.map(([k, label, type]) => (
          <label className="field" key={k}><span>{label}</span>
            <input type={type} step={type === 'number' ? 'any' : undefined} value={v[k] ?? ''} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))} style={{ width: type === 'text' ? 170 : 130 }} />
          </label>
        ))}
        <button type="submit" className="btn primary" disabled={st.demo}>Añadir</button>
      </form>
      {err && <p className="note warn" role="alert">{err}</p>}
      <div style={{ marginTop: 10 }}>
        <DataTable cols={[...cfg.cols, { k: '_x', label: '', render: (r) => <button type="button" className="btn danger" disabled={st.demo} onClick={() => st.dispatch({ type: 'remove', ds, id: r.id })} aria-label="Borrar fila">Borrar</button> }]}
          rows={data[ds]} initialSort={{ k: cfg.cols[0].k, dir: 'desc' }} empty="Nada anotado todavía." max={50} />
      </div>
    </Card>
  );
}

function Settings({ st, data }) {
  const s = data.settings;
  const set = (key, value) => st.dispatch({ type: 'setting', key, value });
  return (
    <Card title="Ajustes" sub="Se usan en todos los cálculos">
      <div className="form-row">
        <label className="field"><span>IVA de los anuncios (0 si tienes NIF-IVA)</span>
          <input type="number" step="0.01" min="0" max="1" value={s.ivaAds} onChange={(e) => set('ivaAds', Math.max(0, +e.target.value || 0))} style={{ width: 120 }} /></label>
        <label className="field"><span>Días hasta el cobro de regalías</span>
          <input type="number" step="1" min="0" value={s.pagoDias} onChange={(e) => set('pagoDias', Math.max(0, +e.target.value || 0))} style={{ width: 120 }} /></label>
        <label className="field"><span>Fecha de lanzamiento</span>
          <input type="date" value={s.lanzamiento || ''} onChange={(e) => set('lanzamiento', e.target.value)} /></label>
      </div>
      <p className="note" style={{ margin: '12px 0 6px' }}>Tipos de cambio a euros (para las regalías de Amazon.com, .co.uk y otras tiendas)</p>
      <div className="form-row">
        {Object.entries(s.fx).map(([cur, val]) => (
          <label className="field" key={cur}><span>1 {cur} en €</span>
            <input type="number" step="0.0001" min="0" value={val} onChange={(e) => st.dispatch({ type: 'fx', cur, value: +e.target.value || 0 })} style={{ width: 100 }} /></label>
        ))}
      </div>
    </Card>
  );
}

function Backup({ st, data }) {
  const inp = useRef(null);
  const [msg, setMsg] = useState('');
  const download = () => {
    const blob = new Blob([JSON.stringify(st.real, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `banquillo-panel-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const restore = async (file) => {
    try {
      const j = JSON.parse(await file.text());
      if (!j || typeof j !== 'object' || !Array.isArray(j.ventas) || !Array.isArray(j.ads)) throw new Error('no parece una copia del panel');
      st.dispatch({ type: 'replaceAll', state: j });
      setMsg('Copia restaurada.');
    } catch (e) { setMsg(`No se pudo restaurar: ${e.message}`); }
  };
  const n = st.real;
  return (
    <Card title="Copia de seguridad" sub="Tus datos viven solo en este navegador. Descarga una copia de vez en cuando y úsala para pasar los datos a otro equipo.">
      <div className="row">
        <button type="button" className="btn primary" onClick={download}>Descargar copia (.json)</button>
        <button type="button" className="btn" onClick={() => inp.current?.click()}>Restaurar copia</button>
        <input ref={inp} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ''; }} />
        <button type="button" className="btn danger" onClick={() => { if (window.confirm('Se borrarán todos los datos guardados en este navegador. ¿Seguro?')) st.dispatch({ type: 'reset' }); }}>Borrar todo</button>
      </div>
      {msg && <p className="note" role="status" style={{ marginTop: 8 }}>{msg}</p>}
      <p className="note" style={{ marginTop: 8 }}>Guardado ahora: {num(n.ventas.length)} filas de ventas, {num(n.ads.length)} de campañas, {num(n.terminos.length)} términos.</p>
    </Card>
  );
}

export default function Datos({ st }) {
  const data = st.real;
  return (
    <>
      {st.demo && <p className="note warn">Ahora mismo ves datos de ejemplo. Esta pestaña trabaja siempre con tus datos reales: para importar o anotar, desactiva el modo ejemplo (arriba).</p>}
      <Importer st={st} data={data} />
      <div className="grid g2">
        {['resenas', 'bsr', 'gastos', 'eventos'].map((k) => <QuickAdd key={k} ds={k} st={st} data={data} />)}
        <QuickAdd ds="precios" st={st} data={data} />
        <Card title="Últimas importaciones">
          <DataTable cols={[{ k: 'fecha', label: 'Cuándo', left: true }, { k: 'ds', label: 'Tipo', left: true, fmt: (v) => DATASETS[v]?.label || v }, { k: 'archivo', label: 'Archivo', left: true }, { k: 'filas', label: 'Filas', fmt: num }]} rows={(st.real.importLog || []).map((r, i) => ({ id: i, ...r }))} empty="Aún no has importado nada." />
        </Card>
      </div>
      <Settings st={st} data={data} />
      <Backup st={st} data={data} />
    </>
  );
}

