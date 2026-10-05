// Capturas del panel con el Chromium preinstalado. Uso: node scripts/shots.mjs <carpeta de salida> [demo|vacio]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || './shots';
const mode = process.argv[3] || 'demo';
mkdirSync(out, { recursive: true });
const srv = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const errors = [];
const tabs = ['Resumen', 'Plan vs real', 'Ads', 'Términos', 'Caja', 'Reseñas y ranking', 'Datos'];
for (const [theme, w, h, tag] of [['light', 1280, 900, 'd-light'], ['dark', 1280, 900, 'd-dark'], ['light', 390, 844, 'm-light']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${tag}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${tag} pageerror: ${e.message}`));
  await page.goto('http://localhost:4173/');
  if (mode === 'demo') await page.getByRole('button', { name: 'Ver datos de ejemplo' }).click();
  await page.waitForTimeout(400);
  for (const t of tabs) {
    try { await page.getByRole('button', { name: new RegExp('^' + t) }).first().click({ timeout: 4000 }); } catch { errors.push(`${tag}: no se pudo abrir ${t}`); break; }
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${tag}-${t.split(' ')[0].toLowerCase()}.png`, fullPage: true });
  }
  await ctx.close();
}
await browser.close();
srv.kill();
console.log(errors.length ? 'ERRORES:\n' + errors.join('\n') : 'sin errores de consola');
