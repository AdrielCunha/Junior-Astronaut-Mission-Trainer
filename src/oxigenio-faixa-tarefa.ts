// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of the "keep the oxygen in the safe range" task: the O2 level leaks away by itself, the child injects O2 to
// raise it, and has to hold it inside the green band for a total number of seconds. Too much O2 is dangerous (alert).
// Pure functions, no Phaser, so node --test can run them. The scene (cenas/OxigenioFaixaTarefa.ts) only draws.
export type TarefaOxigenioFaixa = {
  nivel: number;          // O2 level, 0 (empty) to 1 (full tank)
  faixaMin: number;       // the green band
  faixaMax: number;
  vazamento: number;      // level lost per second
  injecao: number;        // level gained per second while injecting (must beat the leak)
  tempoNaFaixa: number;   // seconds accumulated inside the band
  meta: number;           // seconds needed to win
  perdaNoAlerta: number;  // seconds of progress lost per second while above the band
};

export function criarTarefaOxigenioFaixa(): TarefaOxigenioFaixa {
  return { nivel: 0.3, faixaMin: 0.45, faixaMax: 0.7, vazamento: 0.1, injecao: 0.4, tempoNaFaixa: 0, meta: 8, perdaNoAlerta: 0.5 };
}

export const naFaixa = (t: TarefaOxigenioFaixa) => t.nivel >= t.faixaMin && t.nivel <= t.faixaMax;
export const emAlerta = (t: TarefaOxigenioFaixa) => t.nivel > t.faixaMax;   // too much oxygen
export const faltaOxigenio = (t: TarefaOxigenioFaixa) => t.nivel < t.faixaMin;

// `dt` seconds pass; `injetando` says whether the button is held. Returns the new state; the old one is untouched.
export function passo(t: TarefaOxigenioFaixa, injetando: boolean, dt: number): TarefaOxigenioFaixa {
  if (tarefaConcluida(t) || dt <= 0) return t;
  const nivel = Math.min(1, Math.max(0, t.nivel + ((injetando ? t.injecao : 0) - t.vazamento) * dt));
  const depois = { ...t, nivel };
  let tempo = t.tempoNaFaixa;
  if (naFaixa(depois)) tempo += dt;
  else if (emAlerta(depois)) tempo -= t.perdaNoAlerta * dt;
  return { ...depois, tempoNaFaixa: Math.min(t.meta, Math.max(0, tempo)) };
}

// 0 to 1.
export const progresso = (t: TarefaOxigenioFaixa) => Math.min(1, Math.max(0, t.tempoNaFaixa / t.meta));

export const tarefaConcluida = (t: TarefaOxigenioFaixa) => t.tempoNaFaixa >= t.meta;
