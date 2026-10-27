import { ColumnChart } from '../components/charts.jsx';
import { Card, Stat, DataTable } from '../components/ui.jsx';
import { eur, num, pct } from '../lib/format.js';
import { fmtDate, fmtMonth } from '../lib/dates.js';

export const PCOL = { YouTube: 'var(--s2)', TikTok: 'var(--s1)', Instagram: 'var(--s3)' };
const col = (p) => PCOL[p] || 'var(--plan)';

export default function Redes({ ctx }) {
  const R = ctx.redes;
  const t = R.tot;
  const labels = R.serie.map((x) => (R.mode === 'month' ? fmtMonth(x.b) : fmtDate(x.b)));
  const per = R.mode === 'month' ? 'mes' : 'semana';
  const ser = (prefix) => R.plats.map((p) => ({ id: p, label: p, color: col(p), values: R.serie.map((x) => x[`${prefix}_${p}`] || 0) }));
  const yt = R.byPlat.find((x) => x.plataforma === 'YouTube');
  const tk = R.byPlat.find((x) => x.plataforma === 'TikTok');
  const ig = R.byPlat.find((x) => x.plataforma === 'Instagram');
  const tablaSerie = (prefix, fmt) => ({
    cols: [{ k: 'p', label: per === 'mes' ? 'Mes' : 'Semana', left: true }, ...R.plats.map((p) => ({ k: p, label: p, fmt }))],
    rows: R.serie.map((x, i) => ({ id: x.b, p: labels[i], ...Object.fromEntries(R.plats.map((p) => [p, x[`${prefix}_${p}`] || 0])) })),
  });

  if (!R.hasData) {
    return (
      <Card title="Redes y enlaces de afiliado" sub="YouTube Shorts, TikTok e Instagram: visualizaciones, clics en el enlace, pedidos y comisión">
        <p className="empty">Todavía no hay datos. En la pestaña Datos puedes importar el CSV de estadísticas de YouTube Studio o de TikTok Studio y el de Afiliados de Amazon (tendencias diarias por ID de seguimiento), o anotarlos a mano.</p>
      </Card>
    );
  }

  return (
    <>
      <div className="stats">
        <Stat label="Visualizaciones" value={num(t.vis)} detail={`YouTube ${num(yt?.vis || 0)} · TikTok ${num(tk?.vis || 0)} · Instagram ${num(ig?.vis || 0)}`} />
        <Stat label="Clics en los enlaces" value={num(t.clics)} detail={t.clicsMil != null ? `${num(t.clicsMil, 1)} por cada 1.000 visualizaciones` : 'sin visualizaciones anotadas'} />
        <Stat label="Pedidos por afiliados" value={num(t.pedidos)} detail={t.conv != null ? `conversión ${pct(t.conv)} de los clics` : ''} />
        <Stat label="Comisión de afiliados" value={eur(t.comision, 2)} detail="Se suma a los ingresos y al neto" tone={t.comision > 0 ? 'up' : ''} />
        <Stat label="Seguidores nuevos" value={num(t.seguidores)} detail={`YouTube ${num(yt?.seguidores || 0)} · TikTok ${num(tk?.seguidores || 0)} · Instagram ${num(ig?.seguidores || 0)}`} />
      </div>

      <Card title="Por plataforma" sub="Del vídeo al enlace y del enlace a la compra">
        <DataTable
          cols={[
            { k: 'plataforma', label: 'Plataforma', left: true },
            { k: 'vis', label: 'Visualizaciones', fmt: num },
            { k: 'likes', label: 'Me gusta', fmt: num },
            { k: 'comentarios', label: 'Comentarios', fmt: num },
            { k: 'clics', label: 'Clics enlace', fmt: num },
            { k: 'clicsMil', label: 'Clics / 1.000 vis.', fmt: (v) => (v == null ? '—' : num(v, 1)) },
            { k: 'pedidos', label: 'Pedidos', fmt: num },
            { k: 'conv', label: 'Conversión', fmt: (v) => pct(v) },
            { k: 'comision', label: 'Comisión', fmt: (v) => eur(v, 2) },
            { k: 'eurMil', label: '€ / 1.000 vis.', fmt: (v) => (v == null ? '—' : eur(v, 2)) },
          ]}
          rows={R.byPlat.map((x) => ({ id: x.plataforma, ...x }))}
        />
      </Card>

      <div className="grid g2">
        <Card title={`Visualizaciones por ${per}`} sub="YouTube Shorts, TikTok e Instagram Reels" table={tablaSerie('v', num)}>
          <ColumnChart labels={labels} series={ser('v')} yFmt={(v) => num(v)} ariaLabel="Visualizaciones por periodo y plataforma" />
        </Card>
        <Card title={`Comisión de afiliados por ${per}`} sub="Tarifas por publicidad de cada enlace" table={tablaSerie('c', (v) => eur(v, 2))}>
          <ColumnChart labels={labels} series={ser('c')} yFmt={(v) => eur(v, v < 10 ? 2 : 0)} ariaLabel="Comisión de afiliados por periodo y plataforma" />
        </Card>
      </div>
      <Card title={`Clics en el enlace por ${per}`} sub="Cuántas personas pasan del vídeo a la ficha de Amazon" table={tablaSerie('k', num)}>
        <ColumnChart labels={labels} series={ser('k')} yFmt={(v) => num(v)} ariaLabel="Clics en los enlaces de afiliado por periodo y plataforma" />
      </Card>

      {R.topVideos.length > 0 && (
        <Card title="Vídeos con más visualizaciones" sub="Solo si el informe importado trae el título del vídeo">
          <DataTable cols={[{ k: 'video', label: 'Vídeo', left: true }, { k: 'plataforma', label: 'Plataforma', left: true }, { k: 'vis', label: 'Visualizaciones', fmt: num }, { k: 'likes', label: 'Me gusta', fmt: num }, { k: 'comentarios', label: 'Comentarios', fmt: num }]}
            rows={R.topVideos} initialSort={{ k: 'vis', dir: 'desc' }} max={30} />
        </Card>
      )}

      <p className="note">
        Los pedidos de Afiliados cuentan cualquier compra hecha en Amazon en las 24 horas siguientes al clic, no solo el libro. Si se compra el libro, además de la comisión cobras la regalía de KDP, que ya está en Ventas: no se cuenta dos veces.
        {R.lastVid ? ` Último dato de redes: ${fmtDate(R.lastVid)}.` : ''}{R.lastAfi ? ` Último dato de afiliados: ${fmtDate(R.lastAfi)}.` : ''}
      </p>
    </>
  );
}
