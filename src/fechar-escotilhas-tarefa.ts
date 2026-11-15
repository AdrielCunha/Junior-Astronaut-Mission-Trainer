// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of the "close the hatches" task: drag each coloured lid onto the open hatch of the same colour.
// Pure functions, no Phaser, so node --test can run them. The scene (cenas/FecharEscotilhasTarefa.ts) only draws.
export type Escotilha = { id: number; cor: number; x: number; y: number; fechada: boolean };
export type Tampa = { id: number; xCasa: number; yCasa: number };   // id = id of the hatch it fits
export type TarefaEscotilhas = {
  largura: number;
  altura: number;
  raioEscotilha: number;
  alcance: number;          // how close (px) the lid must be dropped to a hatch centre
  escotilhas: Escotilha[];
  tampas: Tampa[];
};
export type ResultadoSolta = 'fechou' | 'errou' | 'longe' | 'ignorada';

export function criarTarefaEscotilhas(): TarefaEscotilhas {
  const cores = [0xef4444, 0x3b82f6, 0xfacc15, 0x22c55e];
  const escotilhas = cores.map((cor, id) => ({ id, cor, x: 75 + id * 150, y: 95, fechada: false }));
  const ordem = [2, 0, 3, 1];   // lids sit in a different order than the hatches
  const tampas = ordem.map((id, i) => ({ id, xCasa: 75 + i * 150, yCasa: 245 }));
  return { largura: 600, altura: 310, raioEscotilha: 58, alcance: 52, escotilhas, tampas };
}

// The lid `id` was dropped at point `p` (window coordinates). Returns the new state and what happened; the old state is untouched.
export function soltarTampa(t: TarefaEscotilhas, id: number, p: { x: number; y: number }): { tarefa: TarefaEscotilhas; resultado: ResultadoSolta } {
  const alvo = t.escotilhas.find((e) => e.id === id);
  if (!alvo || alvo.fechada) return { tarefa: t, resultado: 'ignorada' };
  const perto = t.escotilhas
    .filter((e) => !e.fechada && Math.hypot(p.x - e.x, p.y - e.y) <= t.alcance)
    .sort((a, b) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y))[0];
  if (!perto) return { tarefa: t, resultado: 'longe' };
  if (perto.id !== id) return { tarefa: t, resultado: 'errou' };
  return { tarefa: { ...t, escotilhas: t.escotilhas.map((e) => (e.id === id ? { ...e, fechada: true } : e)) }, resultado: 'fechou' };
}

export const escotilhasAbertas = (t: TarefaEscotilhas) => t.escotilhas.filter((e) => !e.fechada).length;

// 0 (all hatches open, full radiation) to 1 (all closed, protected).
export function protecao(t: TarefaEscotilhas) {
  return t.escotilhas.length === 0 ? 1 : 1 - escotilhasAbertas(t) / t.escotilhas.length;
}

export const tarefaConcluida = (t: TarefaEscotilhas) => escotilhasAbertas(t) === 0;
