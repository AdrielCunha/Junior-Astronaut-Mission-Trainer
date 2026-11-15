// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of "Follow the Sun": the Sun slides along the sky arc and the child turns the panel to keep facing it.
// The charge only grows while the panel faces the Sun; looking away just pauses it (no penalty).
// Pure functions, no Phaser, so node --test can run them. The scene (cenas/SeguirSolTarefa.ts) only draws.
export type EstadoSeguirSol = { sol: number; sentido: 1 | -1; painel: number; carga: number };

export const ARCO = 70;            // the Sun moves between -ARCO and +ARCO degrees (0 = straight up)
export const VELOCIDADE_SOL = 9;   // degrees per second
export const TOLERANCIA = 14;      // the panel faces the Sun within this many degrees
export const TEMPO_CARGA = 8;      // seconds facing the Sun to fill the battery
export const ANGULO_MAX = 85;

const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function criarSeguirSol(semente = 1): EstadoSeguirSol {
  const sentido: 1 | -1 = semente % 2 ? 1 : -1;
  // The Sun starts low on one side and the panel points the other way, so the child must act first.
  return { sol: -sentido * (ARCO - 10), sentido, painel: sentido * 40, carga: 0 };
}

export const alinhado = (e: EstadoSeguirSol) => Math.abs(e.painel - e.sol) <= TOLERANCIA;

// Moves the Sun dt seconds (it turns back at the ends of the arc) and charges while the panel faces it.
export function passo(e: EstadoSeguirSol, dt: number): EstadoSeguirSol {
  if (dt <= 0 || e.carga >= 1) return e;
  let sol = e.sol + e.sentido * VELOCIDADE_SOL * dt, sentido = e.sentido;
  if (sol > ARCO) { sol = 2 * ARCO - sol; sentido = -1; }
  if (sol < -ARCO) { sol = -2 * ARCO - sol; sentido = 1; }
  const carga = alinhado(e) ? Math.min(1, e.carga + dt / TEMPO_CARGA) : e.carga;
  return { ...e, sol, sentido, carga };
}

export function girarPainel(e: EstadoSeguirSol, angulo: number): EstadoSeguirSol {
  if (e.carga >= 1) return e;
  return { ...e, painel: limitar(angulo, -ANGULO_MAX, ANGULO_MAX) };
}

export const tarefaConcluida = (e: EstadoSeguirSol) => e.carga >= 1;
