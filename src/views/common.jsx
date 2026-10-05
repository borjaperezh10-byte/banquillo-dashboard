import { Status } from '../components/ui.jsx';

const LBL = { critical: 'Urgente', warn: 'Atención', info: 'Aviso', ok: 'Bien' };
export function Alerts({ alerts, go }) {
  if (!alerts.length) return <p className="empty">Todo en orden: ninguna regla del plan está saltando.</p>;
  return (
    <div className="alerts">
      {alerts.map((a, i) => (
        <div key={i} className={`alert ${a.level}`}>
          <Status level={a.level}>{LBL[a.level]}</Status>
          <div><h3>{a.title}</h3><p>{a.detail}</p></div>
          {a.view && <button type="button" className="go" onClick={() => go(a.view)}>Ver</button>}
        </div>
      ))}
    </div>
  );
}
