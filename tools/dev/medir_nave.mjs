// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Frame times on the ship's deck (chapter 2), next to the Moon's ground as a baseline. Same setup
// as medir_desempenho.mjs: headless Chrome, CPU slowed down, phone-sized screen, real rAF.
//
//   node tools/dev/medir_nave.mjs [url] [cpu-slowdown=4] [WxH=412x915]
//   GPU=1 ...      render on the real GPU instead of SwiftShader
//   PERFIL=dir ... also saves a CPU profile of every stage (dir/<stage>.cpuprofile)
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, writeFileSync } from 'node:fs';

const [url = 'http://localhost:5173/', lento = '4', tam = '412x915'] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const porta = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('google-chrome-stable', [
  '--headless=new', `--remote-debugging-port=${porta}`, `--window-size=${W},${H}`,
  ...(process.env.GPU ? ['--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
  '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  `--user-data-dir=${join(tmpdir(), 'perf-nave-' + porta)}`, 'about:blank',
], { stdio: 'ignore' });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let alvo;
for (let i = 0; i < 50 && !alvo; i++) {
  await espera(200);
  try { alvo = (await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* not up */ }
}
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pend = new Map();
const erros = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') erros.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
});
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const ate = async (expr, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await js(expr)) return true; await espera(200); } return false; };

await cdp('Page.enable'); await cdp('Runtime.enable');
await cdp('Page.bringToFront');
await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 800 });
await cdp('Emulation.setCPUThrottlingRate', { rate: Number(lento) });
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__q = []; let a = performance.now();
  const f = (t) => { window.__q.push(t - a); a = t; requestAnimationFrame(f); };
  requestAnimationFrame(f);` });
await cdp('Page.navigate', { url });
const PERFIL = process.env.PERFIL;
if (PERFIL) { mkdirSync(PERFIL, { recursive: true }); await cdp('Profiler.enable'); await cdp('Profiler.setSamplingInterval', { interval: 500 }); }
const etapa = async (nome, ms, acao) => {
  if (acao) await js(acao);
  await js('window.__q = []');
  if (PERFIL) await cdp('Profiler.start');
  await espera(ms);
  if (PERFIL) {
    const r = await cdp('Profiler.stop');
    writeFileSync(`${PERFIL}/${nome.replace(/[^a-z0-9]+/gi, '_')}.cpuprofile`, JSON.stringify(r.result.profile));
  }
  const q = (await js('window.__q')) || [];
  q.sort((x, y) => x - y);
  const media = q.reduce((s, v) => s + v, 0) / (q.length || 1);
  const p95 = q[Math.floor(q.length * 0.95)] ?? 0;
  const objetos = await js(`(() => { const n = {}; for (const k of ['Espaco','Superficie','Interface']) { const c = superficie.scene.get(k); n[k] = c?.sys.displayList?.length ?? 0; } return JSON.stringify(n); })()`);
  console.log(`${nome.padEnd(20)} frames ${String(q.length).padStart(4)}  avg ${media.toFixed(1).padStart(6)} ms  p95 ${p95.toFixed(1).padStart(6)} ms  ~${(1000 / media).toFixed(0).padStart(3)} fps  objs ${objetos}`);
};
console.log(`CPU ${lento}x slower, screen ${W}x${H}, GPU ${await js("(() => { const g = document.createElement('canvas').getContext('webgl'); const d = g && g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()")}`);
await ate('!!(window.sessao && window.superficie && window.superficie.corpo)');
const sairDoTitulo = `(() => { const r = superficie.scene.get('Radar'); if (r && r.scene.isActive()) r.scene.stop(); const ui = superficie.scene.get('Interface'); ui.fecharPainel && ui.fecharPainel(); return 1; })()`;
await js(sairDoTitulo);
await espera(1500);
await etapa('moon idle', 4000);
await etapa('moon walking', 4000, `(() => { const k = superficie.corpo; superficie.alvo = { gx: k.x + 6, gy: k.y + 2 }; return 1; })()`);

if (process.env.DUMP) await js(`(() => { const sc = superficie.scene.get('Interface'); const g0 = sc.add.graphics(); const P = Object.getPrototypeOf(g0); g0.destroy();
  for (const m of ['fillStyle', 'lineStyle', 'fillRect', 'fillRoundedRect']) { const o = P[m]; P[m] = function (...a) { if (!this.__pilha) this.__pilha = new Error().stack.split('\n').slice(2, 6).map(l => l.trim().replace(/^at /, '').replace(/\(?https?:[^ ]*\/src\//, '').replace(/\?t=\d+/, '').replace(/\)$/, '')).filter(l => !l.includes('phaser')).join(' < '); return o.apply(this, a); }; }
  return 1; })()`);
// Chapter 2: the ship's deck, through the same path as the game (Interface.iniciarPrototipo).
await js(`(() => { superficie.scene.get('Interface').iniciarPrototipo(sessao.estado); return 1; })()`);
await ate(`sessao.mundo === 'nave' && !!window.superficie && superficie.scene.isActive() && !!superficie.corpo`);
await espera(2500);
await js(sairDoTitulo);
await espera(1500);
await etapa('ship idle', 5000);
await etapa('ship walking', 5000, `(() => { const k = superficie.corpo; superficie.alvo = { gx: k.x + 4, gy: k.y + 3 }; return 1; })()`);
await etapa('ship idle again', 4000);
if (process.env.FOTO) { const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(process.env.FOTO, Buffer.from(r.result.data, 'base64')); }
if (process.env.DUMP) console.log(await js(`(() => { const L = []; const visto = (o) => { let p = o; while (p) { if (!p.visible || p.alpha === 0) return false; p = p.parentContainer; } return true; };
  const andar = (lista, cena) => { for (const o of lista) { if (o.type === 'Graphics') L.push({ cena, assado: !!o.__cache?.img, desistiu: !!o.__cache?.desistiu, n: o.commandBuffer.length, vis: visto(o) && (!o.displayList || true), d: o.depth, onde: o.__pilha || '?' }); if (o.list) andar(o.list, cena); } };
  for (const c of superficie.game.scene.getScenes(true)) andar(c.sys.displayList.list, c.sys.settings.key);
  L.sort((a, b) => b.n - a.n); return JSON.stringify({ total: L.length, visiveis: L.filter(x => x.vis).length, assados: L.filter(x => x.assado).length, desistiu: L.filter(x => x.desistiu).length, cmdsVivos: L.filter(x => x.vis && !x.assado).reduce((s, x) => s + x.n, 0), cmds: L.filter(x => x.vis).reduce((s, x) => s + x.n, 0), top: Object.entries(L.filter(x => x.vis).reduce((m, x) => { const k = x.cena + ' ' + x.onde; m[k] = m[k] || { qtd: 0, cmds: 0 }; m[k].qtd++; m[k].cmds += x.n; return m; }, {})).sort((a, b) => b[1].cmds - a[1].cmds).slice(0, 20) }, null, 1); })()`));
if (erros.length) console.log('Errors:\n' + erros.slice(0, 5).join('\n'));
ws.close(); chrome.kill(); process.exit(0);
