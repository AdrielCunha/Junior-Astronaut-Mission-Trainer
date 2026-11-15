// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of the "steady the heading" task. The first part (toggling directions) is the old model, kept because
// task-batch.test.ts uses it. The second part is the one the scene plays: turn the rocket towards each heading and hold.
// Pure functions, no Phaser, so node --test can run them.
export type Direcao = { id: string; alinhada: boolean };

export type TarefaDirecao = {
  direcoes: Direcao[];
};

export function criarTarefaDirecao(): TarefaDirecao {
  return {
    direcoes: [
      { id: 'norte', alinhada: false },
      { id: 'leste', alinhada: false },
      { id: 'sul', alinhada: false },
      { id: 'oeste', alinhada: false },
    ],
  };
}

export function alternarDirecao(tarefa: TarefaDirecao, id: string): TarefaDirecao {
  return {
    ...tarefa,
    direcoes: tarefa.direcoes.map((direcao) => direcao.id === id ? { ...direcao, alinhada: !direcao.alinhada } : direcao),
  };
}

export function tarefaConcluida(tarefa: TarefaDirecao) {
  return ['norte', 'leste'].every((id) => tarefa.direcoes.some((direcao) => direcao.id === id && direcao.alinhada));
}

// ---- Turn the rocket towards each heading and hold it. Angles in degrees, 0 = north, clockwise (90 = east).
export type AlvoRumo = { id: string; nome: string; angulo: number };

export type TarefaRumo = {
  alvos: AlvoRumo[];
  indice: number;       // index of the heading being sought; alvos.length when done
  rumo: number;         // where the rocket points now, 0 to 360
  seguro: number;       // seconds held inside the tolerance
  tolerancia: number;   // degrees
  tempo: number;        // seconds to hold to lock a heading
};

export function criarRumo(): TarefaRumo {
  return {
    alvos: [
      { id: 'norte', nome: 'North', angulo: 0 },
      { id: 'leste', nome: 'East', angulo: 90 },
      { id: 'sul', nome: 'South', angulo: 180 },
    ],
    indice: 0, rumo: 300, seguro: 0, tolerancia: 10, tempo: 0.8,
  };
}

// Smallest distance between two angles, 0 to 180.
export function diferencaAngular(a: number, b: number) {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

export function apontarPara(t: TarefaRumo, angulo: number): TarefaRumo {
  return { ...t, rumo: ((angulo % 360) + 360) % 360 };
}

export const alvoAtual = (t: TarefaRumo): AlvoRumo | undefined => t.alvos[t.indice];
export const rumoNoAlvo = (t: TarefaRumo) => { const a = alvoAtual(t); return !!a && diferencaAngular(t.rumo, a.angulo) <= t.tolerancia; };
export const rumoConcluido = (t: TarefaRumo) => t.indice >= t.alvos.length;
export const progressoDoAlvo = (t: TarefaRumo) => Math.min(1, t.seguro / t.tempo);

// `dt` seconds pass. Holding the heading fills the lock; leaving drains it. A full lock moves to the next heading.
export function avancarRumo(t: TarefaRumo, dt: number): TarefaRumo {
  if (rumoConcluido(t)) return t;
  if (!rumoNoAlvo(t)) return t.seguro === 0 ? t : { ...t, seguro: Math.max(0, t.seguro - dt * 2) };
  const seguro = t.seguro + dt;
  return seguro >= t.tempo ? { ...t, indice: t.indice + 1, seguro: 0 } : { ...t, seguro };
}
