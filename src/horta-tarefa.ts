// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of "Grow the lettuce": 3 lettuce pots in the ship's veggie garden. Each needs the right amount of
// water (the green band of its gauge) and the grow light must be on. Too much water is not a fail: the pot
// drips the extra away slowly. When all 3 are happy the lettuce grows and gives off oxygen.
// Pure functions, no Phaser, so node --test can run them. The scene (cenas/HortaTarefa.ts) only draws.
export type Vaso = { agua: number };   // 0..1
export type EstadoHorta = { vasos: Vaso[]; luz: boolean; crescimento: number };

export const FAIXA_MIN = 0.55, FAIXA_MAX = 0.8;   // the green band
export const GOTA = 0.12;                          // water added by one drop
export const ESCORRER = 0.05;                      // water dripped away per second above the band
export const TEMPO_CRESCER = 4;                    // seconds with everything right to grow

const aleatorio = (semente: number) => {
  let x = (Math.imul(semente | 0, 1664525) + 1013904223) >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
};

export function criarHorta(semente = 1): EstadoHorta {
  const r = aleatorio(semente);
  return { vasos: [0, 1, 2].map(() => ({ agua: Math.round((0.05 + r() * 0.3) * 100) / 100 })), luz: false, crescimento: 0 };
}

export const vasoFeliz = (v: Vaso) => v.agua >= FAIXA_MIN && v.agua <= FAIXA_MAX;
export const tudoCerto = (e: EstadoHorta) => e.luz && e.vasos.every(vasoFeliz);

export function regar(e: EstadoHorta, i: number): EstadoHorta {
  if (e.crescimento >= 1 || !e.vasos[i]) return e;
  return { ...e, vasos: e.vasos.map((v, k) => (k === i ? { agua: Math.min(1, v.agua + GOTA) } : v)) };
}

export function alternarLuz(e: EstadoHorta): EstadoHorta {
  return e.crescimento >= 1 ? e : { ...e, luz: !e.luz };
}

// Time passes: extra water drips away; with everything right the lettuce grows (it never shrinks).
export function passo(e: EstadoHorta, dt: number): EstadoHorta {
  if (dt <= 0 || e.crescimento >= 1) return e;
  const vasos = e.vasos.map((v) => (v.agua > FAIXA_MAX ? { agua: Math.max(FAIXA_MAX, v.agua - ESCORRER * dt) } : v));
  const prox = { ...e, vasos };
  return tudoCerto(prox) ? { ...prox, crescimento: Math.min(1, e.crescimento + dt / TEMPO_CRESCER) } : prox;
}

export const tarefaConcluida = (e: EstadoHorta) => e.crescimento >= 1;
