// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Sound effects, synthesized with the Web Audio API (no files to load). They follow the same mute
// switch as the music (audio.ts) and stay quiet until the browser allows sound (first click or key).

export type NomeSfx = 'alarme' | 'clique' | 'ok' | 'erro' | 'aviso' | 'sucesso' | 'fechar'
  | 'pegar' | 'soltar' | 'encaixe' | 'girar' | 'ligar' | 'bip' | 'whoosh' | 'zap' | 'bolha' | 'tic' | 'suave'
  | 'pouso' | 'fumaca';

const VOLUME = 0.55;
const CHAVE_MUDO = 'lunar-odyssey-efeitos-mudos';
const CHAVE_VOLUME = 'lunar-odyssey-volume-efeitos';
let mudo = (() => { try { return localStorage.getItem(CHAVE_MUDO) === '1'; } catch { return false; } })();
let volume = (() => { try { const salvo = localStorage.getItem(CHAVE_VOLUME); if (salvo === null) return 0.7; const n = Number(salvo); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.7; } catch { return 0.7; } })();
let ctx: AudioContext | null = null;
const ultimo: Partial<Record<NomeSfx, number>> = {};

function contexto(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx.state === 'closed' ? null : ctx;
  } catch { return null; }
}

// One note: a short tone with a quick attack and a fade-out.
function nota(c: AudioContext, freq: number, inicio: number, dur: number, tipo: OscillatorType = 'sine', vol = 1, ate?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  const t = c.currentTime + inicio;
  o.type = tipo;
  o.frequency.setValueAtTime(freq, t);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
  // An exponential ramp cannot target 0 (nor a denormal), so keep the peak just above zero.
  const pico = Math.max(0.0001, VOLUME * volume * vol);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pico, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// White noise through a filter: rumbles, thuds and puffs. The filter sweeps from 'de' to 'ate' Hz.
function ruido(c: AudioContext, inicio: number, dur: number, vol: number, de: number, ate: number, ataque = 0.02, tipo: BiquadFilterType = 'lowpass') {
  const n = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = tipo;
  const t = c.currentTime + inicio;
  f.frequency.setValueAtTime(de, t);
  f.frequency.exponentialRampToValueAtTime(ate, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(VOLUME * volume * vol, t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
  src.stop(t + dur + 0.02);
  return g;
}

const SONS: Record<NomeSfx, (c: AudioContext) => void> = {
  // A classic warning klaxon: crisp two-tone beeps alternating high/low, like an emergency siren.
  alarme: (c) => {
    const t = c.currentTime, vol = Math.max(0.0001, VOLUME * volume * 0.42);
    const filtro = c.createBiquadFilter();
    filtro.type = 'lowpass'; filtro.frequency.value = 2600; filtro.Q.value = 1.1;
    filtro.connect(c.destination);
    const tons = [760, 540, 760, 540, 760, 540];
    const dur = 0.16, passo = 0.2, ultimo = tons.length - 1;
    tons.forEach((freq, i) => {
      const osc = c.createOscillator(), ganho = c.createGain();
      const ini = t + i * passo;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ini);
      ganho.gain.setValueAtTime(0.0001, ini);
      ganho.gain.exponentialRampToValueAtTime(vol, ini + 0.015);
      ganho.gain.setValueAtTime(vol, ini + dur - 0.03);
      ganho.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
      osc.connect(ganho).connect(filtro);
      osc.start(ini); osc.stop(ini + dur + 0.02);
      osc.onended = () => {
        osc.disconnect(); ganho.disconnect();
        if (i === ultimo) filtro.disconnect();
      };
    });
  },
  clique: (c) => nota(c, 520, 0, 0.07, 'triangle', 0.7),
  ok: (c) => { nota(c, 660, 0, 0.12, 'sine'); nota(c, 880, 0.08, 0.16, 'sine'); },
  erro: (c) => { nota(c, 200, 0, 0.22, 'sawtooth', 0.6, 120); },
  aviso: (c) => { nota(c, 440, 0, 0.1, 'square', 0.35); nota(c, 440, 0.14, 0.1, 'square', 0.35); },
  sucesso: (c) => { [523, 659, 784, 1047].forEach((f, i) => nota(c, f, i * 0.1, 0.28, 'triangle')); },
  fechar: (c) => nota(c, 380, 0, 0.09, 'triangle', 0.6, 240),
  pegar: (c) => nota(c, 330, 0, 0.08, 'triangle', 0.6, 520),          // pick something up
  soltar: (c) => nota(c, 300, 0, 0.09, 'triangle', 0.6, 200),         // let it go
  encaixe: (c) => { nota(c, 180, 0, 0.08, 'square', 0.5); nota(c, 720, 0.05, 0.1, 'triangle', 0.8); }, // snaps into place
  girar: (c) => nota(c, 900, 0, 0.03, 'square', 0.25),                // knob / wheel tick
  ligar: (c) => nota(c, 220, 0, 0.35, 'sawtooth', 0.5, 660),          // power up
  bip: (c) => nota(c, 1000, 0, 0.06, 'sine', 0.6),
  whoosh: (c) => nota(c, 1200, 0, 0.25, 'sine', 0.35, 250),
  zap: (c) => { nota(c, 1500, 0, 0.12, 'sawtooth', 0.4, 200); },
  bolha: (c) => nota(c, 400, 0, 0.1, 'sine', 0.7, 900),
  tic: (c) => nota(c, 1400, 0, 0.02, 'square', 0.2),
  suave: (c) => nota(c, 640, 0, 0.09, 'sine', 0.22, 760),            // gentle hover
  pouso: (c) => { ruido(c, 0, 0.5, 1.1, 900, 60, 0.005); nota(c, 90, 0, 0.35, 'sine', 0.9, 45); },   // touchdown thud
  fumaca: (c) => { ruido(c, 0, 1.1, 0.7, 2400, 300, 0.06, 'bandpass'); nota(c, 300, 0.02, 0.4, 'sine', 0.25, 120); }, // puff of smoke
};

/**
 * Rocket engine: a low rumble of 'dur' seconds that builds up for 'ataque' s. 'forte' scales the
 * volume. Returns a function that fades it out early (e.g. when the scene is skipped).
 */
export function tocarMotor(dur: number, forte = 1, ataque = 0.6): () => void {
  if (mudo) return () => {};
  const c = contexto();
  if (!c) return () => {};
  const g = ruido(c, 0, dur, 0.9 * forte, 500, 140, ataque);
  const tom = c.createOscillator();
  const gt = c.createGain();
  const t = c.currentTime;
  tom.type = 'sawtooth';
  tom.frequency.setValueAtTime(55, t);
  tom.frequency.linearRampToValueAtTime(42, t + dur);
  gt.gain.setValueAtTime(0.0001, t);
  gt.gain.exponentialRampToValueAtTime(VOLUME * volume * 0.12 * forte, t + ataque);
  gt.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  tom.connect(gt).connect(c.destination);
  tom.start(t);
  tom.stop(t + dur + 0.02);
  return () => {
    const agora = c.currentTime;
    for (const ganho of [g.gain, gt.gain]) {
      ganho.cancelScheduledValues(agora);
      ganho.setValueAtTime(Math.max(0.0001, ganho.value), agora);
      ganho.exponentialRampToValueAtTime(0.0001, agora + 0.3);
    }
  };
}

// Browsers keep sound locked until the first click or key. Unlock it on that first gesture, so even the very first hover afterwards has sound.
function destravar() {
  window.removeEventListener('pointerdown', destravar);
  window.removeEventListener('keydown', destravar);
  contexto();
}
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', destravar);
  window.addEventListener('keydown', destravar);
}

/** Plays a sound effect. Silent when muted; the same sound is not repeated within 90 ms. */
export function tocarSfx(nome: NomeSfx) {
  if (mudo || volume <= 0) return;
  const agora = performance.now();
  if (agora - (ultimo[nome] ?? -1e9) < 90) return;
  ultimo[nome] = agora;
  const c = contexto();
  if (c) SONS[nome](c);
}

export function efeitosEstaoMudos() { return mudo; }
export function volumeEfeitos() { return volume; }
export function definirVolumeEfeitos(valor: number) {
  volume = Math.max(0, Math.min(1, valor));
  try { localStorage.setItem(CHAVE_VOLUME, String(volume)); } catch { /* private mode */ }
}
export function alternarEfeitos() {
  mudo = !mudo;
  try { localStorage.setItem(CHAVE_MUDO, mudo ? '1' : '0'); } catch { /* private mode */ }
  return mudo;
}

/** Picks a sound from the colour of a task status message (green good, red wrong, yellow careful). */
export function sfxDaMensagem(cor: string): NomeSfx | null {
  const c = cor.toLowerCase();
  if (c === '#86efac' || c === '#bbf7d0') return 'ok';
  if (c === '#fca5a5' || c === '#fecaca') return 'erro';
  if (c === '#fde68a' || c === '#fb923c') return 'aviso';
  return null;
}
