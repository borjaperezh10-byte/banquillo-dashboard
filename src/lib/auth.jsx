import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID, ALLOWED_EMAILS } from '../config.js';

const KEY = 'banquillo.auth.v1';
const DAYS = 7;
const Ctx = createContext({ email: null, signOut: null });
export const useAuth = () => useContext(Ctx);

function decodeJwt(token) {
  const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(atob(part).split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
  return JSON.parse(json);
}

function stored() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.until > Date.now() && ALLOWED_EMAILS.includes(s.email)) return s.email;
  } catch { /* sin almacenamiento */ }
  return null;
}

function loadGsi() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar el inicio de sesión de Google.'));
    document.head.appendChild(s);
  });
}

export function AuthGate({ children }) {
  const [email, setEmail] = useState(stored);
  const [err, setErr] = useState('');
  const btn = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || email) return undefined;
    let dead = false;
    loadGsi().then(() => {
      if (dead) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: ({ credential }) => {
          try {
            const p = decodeJwt(credential);
            const okIss = p.iss === 'accounts.google.com' || p.iss === 'https://accounts.google.com';
            if (p.aud !== GOOGLE_CLIENT_ID || !okIss || p.exp * 1000 < Date.now()) throw new Error('La sesión de Google no es válida. Inténtalo de nuevo.');
            if (!p.email_verified || !ALLOWED_EMAILS.includes(p.email)) throw new Error(`La cuenta ${p.email} no tiene acceso a este panel.`);
            try { localStorage.setItem(KEY, JSON.stringify({ email: p.email, until: Date.now() + DAYS * 864e5 })); } catch { /* idem */ }
            setErr('');
            setEmail(p.email);
          } catch (e) { setErr(e.message); }
        },
      });
      if (btn.current) window.google.accounts.id.renderButton(btn.current, { theme: 'outline', size: 'large', text: 'signin_with', locale: 'es', width: 280 });
    }).catch((e) => setErr(e.message));
    return () => { dead = true; };
  }, [email]);

  if (!GOOGLE_CLIENT_ID) return <Ctx.Provider value={{ email: null, signOut: null }}>{children}</Ctx.Provider>;

  const signOut = () => {
    try { localStorage.removeItem(KEY); } catch { /* idem */ }
    window.google?.accounts?.id?.disableAutoSelect();
    setEmail(null);
  };
  if (!email) {
    return (
      <div className="login">
        <div className="login-card">
          <h1>El Banquillo</h1>
          <p>Panel privado de ventas y publicidad. Entra con tu cuenta de Google.</p>
          <div ref={btn} className="login-btn" />
          {err && <p className="note warn" role="alert">{err}</p>}
        </div>
      </div>
    );
  }
  return <Ctx.Provider value={{ email, signOut }}>{children}</Ctx.Provider>;
}
