// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Measures frame times like a weaker device would see them: headless Chrome with the CPU slowed
// down (DevTools "CPU throttling") and a phone-sized screen. Real time, real requestAnimationFrame.
//
//   node tools/dev/medir_desempenho.mjs [url] [cpu-slowdown=4] [WxH=412x915]
//   PERFIL=dir node tools/dev/medir_desempenho.mjs ...   also saves a CPU profile of every stage
//   (dir/<stage>.cpuprofile; summarize with python3 tools/dev/resumir_cpuprofile.py dir/x.cpuprofile)
//
// Prints, for each stage of a session (start, ground, flight, Moon, solar system), the average
// and 95th percentile frame time and the frames per second.
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const [url = 'http://localhost:5173/', lento = '4', tam = '412x915'] = process.argv.slice(2);
const [W, H] = tam.split('x').map(Number);
const porta = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('google-chrome-stable', [
  '--headless=new', `--remote-debugging-port=${porta}`, `--window-size=${W},${H}`,
  // GPU=1 renders on the real GPU (closer to a phone's texture uploads); default is SwiftShader,
  // a software GPU that makes every texture upload a slow CPU copy.
  ...(process.env.GPU ? ['--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
  '--hide-scrollbars',
  // Keep the page "in front": a background page gets no animation frames.
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  `--user-data-dir=${join(tmpdir(), 'perf-' + porta)}`, 'about:blank',
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
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

await cdp('Page.enable');
await cdp('Page.bringToFront');
await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 800 });
await cdp('Emulation.setCPUThrottlingRate', { rate: Number(lento) });
// Record every frame's duration from the moment the page starts.
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__q = []; let a = performance.now();
  const f = (t) => { window.__q.push(t - a); a = t; requestAnimationFrame(f); };
  requestAnimationFrame(f);` });
const t0 = Date.now();
await cdp('Page.navigate', { url });
const PERFIL = process.env.PERFIL;
if (PERFIL) { const { mkdirSync } = await import('node:fs'); mkdirSync(PERFIL, { recursive: true }); await cdp('Profiler.enable'); await cdp('Profiler.setSamplingInterval', { interval: 500 }); }
const etapa = async (nome, ms, acao) => {
  if (acao) await js(acao);
  await js('window.__q = []');
  if (PERFIL) await cdp('Profiler.start');
  await espera(ms);
  if (PERFIL) {
    const { writeFileSync } = await import('node:fs');
    const r = await cdp('Profiler.stop');
    writeFileSync(`${PERFIL}/${nome.replace(/[^a-z0-9]+/gi, '_')}.cpuprofile`, JSON.stringify(r.result.profile));
  }
  const q = (await js('window.__q')) || [];
  q.sort((x, y) => x - y);
  const media = q.reduce((s, v) => s + v, 0) / (q.length || 1);
  const p95 = q[Math.floor(q.length * 0.95)] ?? 0;
  console.log(`${nome.padEnd(22)} frames ${String(q.length).padStart(4)}  avg ${media.toFixed(1).padStart(6)} ms  p95 ${p95.toFixed(1).padStart(6)} ms  ~${(1000 / media).toFixed(0)} fps`);
};
console.log(`CPU ${lento}x slower, screen ${W}x${H}, GPU ${await js("(() => { const g = document.createElement('canvas').getContext('webgl'); const d = g && g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()")}`);
await etapa('start (first 6 s)', 6000);
for (let i = 0; i < 150; i++) { if (await js('!!(window.sessao && window.superficie)')) break; await espera(200); }
console.log(`game ready after ${((Date.now() - t0) / 1000).toFixed(1)} s`);
// Leave the title screen (it hides the game while open) and close the intro panel.
await js(`(() => { const r = superficie.scene.get('Radar'); if (r && r.scene.isActive()) r.scene.stop(); const ui = superficie.scene.get('Interface'); ui.fecharPainel && ui.fecharPainel(); return 1; })()`);
await espera(500);
await etapa('ground, idle', 4000);
await etapa('ground, walking', 4000, `(() => { const k = superficie.corpo; superficie.alvo = { gx: k.x + 6, gy: k.y + 2 }; return 1; })()`);
for (let i = 0; i < 100; i++) { if (await js('sessao.filmePronto')) break; await espera(300); }
await etapa('flight ground -> Moon', 4300, `(() => { sessao.voar('lua'); return 1; })()`);
await etapa('Moon view', 4000);
await etapa('flight Moon -> planets', 3000, `(() => { sessao.voar('sistema'); return 1; })()`);
await etapa('solar system', 4000);
ws.close(); chrome.kill(); process.exit(0);
