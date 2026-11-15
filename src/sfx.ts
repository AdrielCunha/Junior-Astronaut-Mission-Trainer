// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Sound effects, synthesized with the Web Audio API (no files to load). They follow the same mute
// switch as the music (audio.ts) and stay quiet until the browser allows sound (first click or key).

export type NomeSfx = 'clique' | 'ok' | 'erro' | 'aviso' | 'sucesso' | 'fechar'
  | 'pegar' | 'soltar' | 'encaixe' | 'girar' | 'ligar' | 'bip' | 'whoosh' | 'zap' | 'bolha' | 'tic' | 'suave';

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
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(VOLUME * volume * vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const SONS: Record<NomeSfx, (c: AudioContext) => void> = {
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
};

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
  if (mudo) return;
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
