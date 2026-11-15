// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Stop the reactor meltdown": hot spots pop up on the reactor core; tap them to cool them before the core overheats.
// Pure functions (no Phaser), used by the scene and by the tests.
export type Ponto = { id: number; x: number; y: number };   // x and y inside the unit circle (-1 to 1)

export type TarefaColapsoReator = {
  pontos: Ponto[];
  temperatura: number;      // 0 (cold) to 1 (meltdown)
  resfriados: number;       // spots cooled so far
  alarmes: number;          // how many times the core overheated and was reset
  proximoId: number;
  espera: number;           // seconds until the next spot
};

export const META = 10;
export const MAX_PONTOS = 4;
export const INTERVALO = 1.1;
export const CALOR_POR_PONTO = 0.025;   // per second, for each active spot
export const FRIO_POR_TOQUE = 0.05;
export const TEMPERATURA_INICIAL = 0.3;

const limitar = (v: number) => Math.max(0, Math.min(1, v));

export function criarTarefaColapsoReator(): TarefaColapsoReator {
  return { pontos: [], temperatura: TEMPERATURA_INICIAL, resfriados: 0, alarmes: 0, proximoId: 1, espera: 0.6 };
}

function novoPonto(t: TarefaColapsoReator, rnd: () => number): Ponto | null {
  for (let tentativa = 0; tentativa < 12; tentativa++) {
    const ang = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.78;
    const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
    if (t.pontos.every((p) => Math.hypot(p.x - x, p.y - y) > 0.4)) return { id: t.proximoId, x, y };
  }
  return null;
}

// `dt` seconds go by: spots heat the core and new ones appear. If the core melts, the spots are wiped and it restarts
// warm (no hard fail), losing a little progress.
export function avancar(t: TarefaColapsoReator, dt: number, rnd: () => number = Math.random): TarefaColapsoReator {
  if (tarefaConcluida(t)) return t;
  let r: TarefaColapsoReator = { ...t, temperatura: limitar(t.temperatura + t.pontos.length * CALOR_POR_PONTO * dt), espera: t.espera - dt };
  if (r.espera <= 0 && r.pontos.length < MAX_PONTOS) {
    const p = novoPonto(r, rnd);
    if (p) r = { ...r, pontos: [...r.pontos, p], proximoId: r.proximoId + 1, espera: INTERVALO };
    else r = { ...r, espera: 0.2 };
  } else if (r.espera <= 0) r = { ...r, espera: 0.2 };
  if (r.temperatura >= 1) r = { ...r, pontos: [], temperatura: 0.6, resfriados: Math.max(0, r.resfriados - 3), alarmes: r.alarmes + 1, espera: 1.2 };
  return r;
}

// Tapping a spot cools it and the core a bit. Tapping something else changes nothing (the same object comes back).
export function resfriar(t: TarefaColapsoReator, id: number): TarefaColapsoReator {
  if (tarefaConcluida(t) || !t.pontos.some((p) => p.id === id)) return t;
  return { ...t, pontos: t.pontos.filter((p) => p.id !== id), temperatura: limitar(t.temperatura - FRIO_POR_TOQUE), resfriados: t.resfriados + 1 };
}

export const tarefaConcluida = (t: TarefaColapsoReator) => t.resfriados >= META;
export const progresso = (t: TarefaColapsoReator) => Math.min(1, t.resfriados / META);
