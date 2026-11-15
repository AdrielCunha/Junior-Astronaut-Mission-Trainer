// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of "Thruster puffs": the ship flies up the screen through a lane that bends. Tapping the left or right
// thruster gives a small push sideways, and in space the ship KEEPS drifting until a push the other way stops
// it. Staying in the lane fills the "On course" bar; leaving it only pauses the bar (no penalty).
// Pure functions, no Phaser, so node --test can run them. The scene (cenas/ManobraNaveTarefa.ts) only draws.
export type EstadoManobra = { x: number; v: number; t: number; progresso: number; semente: number };

export const IMPULSO = 0.12;        // lane widths per second added by one puff
export const V_MAX = 0.5;
export const META = 12;             // seconds inside the lane to arrive
export const MEIA_FAIXA = 0.16;     // half the lane width (in screen widths, 0..1)

// The lane's centre at time t (seconds): a slow, smooth bend that differs with the seed.
export function centroFaixa(t: number, semente = 1): number {
  const a = 0.6 + (semente % 5) * 0.11, b = 1.3 + (semente % 3) * 0.2;
  return 0.5 + 0.18 * Math.sin(t * 0.32 * a + semente) + 0.08 * Math.sin(t * 0.21 * b + semente * 2);
}

export function criarManobra(semente = 1): EstadoManobra {
  return { x: centroFaixa(0, semente), v: 0, t: 0, progresso: 0, semente };
}

export const naFaixa = (e: EstadoManobra) => Math.abs(e.x - centroFaixa(e.t, e.semente)) <= MEIA_FAIXA;

// One puff: -1 = push left, +1 = push right.
export function soprar(e: EstadoManobra, lado: -1 | 1): EstadoManobra {
  if (e.progresso >= 1) return e;
  return { ...e, v: Math.max(-V_MAX, Math.min(V_MAX, e.v + lado * IMPULSO)) };
}

// Time passes: the ship keeps its sideways speed (no air to slow it down) and bounces softly off the edges.
export function passo(e: EstadoManobra, dt: number): EstadoManobra {
  if (dt <= 0 || e.progresso >= 1) return e;
  let x = e.x + e.v * dt, v = e.v;
  if (x < 0.04) { x = 0.04; v = Math.abs(v) * 0.4; }
  if (x > 0.96) { x = 0.96; v = -Math.abs(v) * 0.4; }
  const prox = { ...e, x, v, t: e.t + dt };
  return { ...prox, progresso: naFaixa(prox) ? Math.min(1, e.progresso + dt / META) : e.progresso };
}

export const tarefaConcluida = (e: EstadoManobra) => e.progresso >= 1;
