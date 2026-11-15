// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Records the zoom flight frame by frame at a fixed 30 fps clock, so we can look at every frame.
// Needs the dev server running (npm run dev) and Google Chrome. No npm packages: Node's own
// WebSocket talks to Chrome's DevTools protocol.
//
//   node tools/dev/capturar_voo.mjs [url] [outDir] [destino=lua] [fps=30] [WxH=1280x720]
//
// DEMO=1 builds a small base first (to see the colony during the flight).
// Frames land in outDir as f000.jpg ...; make a contact sheet with ImageMagick:
//   magick montage outDir/f*.jpg -tile 8x -geometry 320x180+2+2 sheet.jpg
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const [url = 'http://localhost:5173/', out = 'flight-frames', destino = 'lua', fps = '30', tam = '1280x720'] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
mkdirSync(out, { recursive: true });
const porta = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('google-chrome-stable', [
  '--headless=new', `--remote-debugging-port=${porta}`, `--window-size=${W},${H}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars',
  `--user-data-dir=${join(tmpdir(), 'voo-' + porta)}`, 'about:blank',
], { stdio: 'ignore' });

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let alvo;
for (let i = 0; i < 50 && !alvo; i++) {
  await espera(200);
  try { alvo = (await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
}
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pendentes = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m); pendentes.delete(m.id); }
});
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pendentes.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expr) => {
  const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
};

await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url });
for (let i = 0; i < 200; i++) { await espera(200); if (await js('!!(window.sessao && window.superficie && sessao.filmePronto)')) break; }
await espera(1500);
// Freeze the real clock: from here the game only moves when we step it.
await js(`(async () => {
  const g = superficie.game; g.loop.sleep();
  window.__T = performance.now();
  window.__passo = (ms) => { window.__T += ms; g.step(window.__T, ms); };
  const r = superficie.scene.get('Radar'); if (r && r.scene.isActive()) r.scene.stop();   // leave the title screen
  const ui = superficie.scene.get('Interface'); ui.fecharPainel && ui.fecharPainel();
  if ('${destino}' === 'chao') { sessao.vista = 'lua'; sessao.alvo = sessao.u = sessao.uGlobo; } else sessao.alvo = sessao.u = 2.0;
  if (${process.env.DEMO ? 'true' : 'false'}) {   // DEMO=1: build a base first, to see the colony during the flight
    const { TIPOS } = await import('/src/engine/construcao.ts');
    const hab = sessao.grade.lista[0];
    for (const [id, dx, dy] of [['suporte', 5, -1], ['blindagem', -4, 0], ['oficina', 0, 5], ['plataforma', 6, 6], ['painel', -3, -4], ['painel', 0, -5]]) {
      const t = TIPOS[id]; const p = sessao.grade.procurar(t, hab.gx + dx, hab.gy + dy);
      superficie.colocar(t, { gx: p.gx + t.w / 2, gy: p.gy + t.h / 2 });
    }
    sessao.estado.meta = 60; sessao.emitir('estado');
    for (let i = 0; i < 360; i++) window.__passo(1000 / 60);
  }
  for (let i = 0; i < 60; i++) window.__passo(1000 / 60);
  sessao.voar('${destino}');
  return true;
})()`);
const dt = 1000 / Number(fps);
let n = 0;
for (; n < 400; n++) {
  const shot = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
  writeFileSync(join(out, `f${String(n).padStart(3, '0')}.jpg`), Buffer.from(shot.result.data, 'base64'));
  const info = await js(`(() => { window.__passo(${dt}); return [sessao.u.toFixed(3), !!sessao.voo]; })()`);
  if (!info[1]) { n++; break; }
}
const shot = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
writeFileSync(join(out, `f${String(n).padStart(3, '0')}.jpg`), Buffer.from(shot.result.data, 'base64'));
console.log(`${n + 1} frames in ${out}`);
ws.close();
chrome.kill();
