// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Dividir a energia": the battery holds a limited number of units; the child switches systems on and off
// so the goal systems run without going over the capacity (otherwise the breaker trips and the round restarts).
// The first part (rotas) is the original toggle model, kept because other tests import it.
// The second part (divisao) is the real game used by the scene. No Phaser here.
export type RotaEnergia = { id: string; ligada: boolean };

export type TarefaDesviarEnergia = {
  rotas: RotaEnergia[];
};

export function criarTarefaDesviarEnergia(): TarefaDesviarEnergia {
  return {
    rotas: [
      { id: 'rota-1', ligada: false },
      { id: 'rota-2', ligada: false },
      { id: 'rota-3', ligada: false },
      { id: 'rota-4', ligada: false },
    ],
  };
}

export function alternarRota(tarefa: TarefaDesviarEnergia, id: string): TarefaDesviarEnergia {
  return {
    ...tarefa,
    rotas: tarefa.rotas.map((rota) => rota.id === id ? { ...rota, ligada: !rota.ligada } : rota),
  };
}

export function tarefaConcluida(tarefa: TarefaDesviarEnergia) {
  return tarefa.rotas.every((rota) => rota.ligada);
}

// ---- Dividing the energy ----------------------------------------------------------------------
export type IdSistema = 'vida' | 'comunicacao' | 'aquecedor' | 'luzes' | 'motor';
export type Sistema = { id: IdSistema; nome: string; consumo: number; essencial: boolean };
export type Rodada = { evento: string; capacidade: number; meta: IdSistema[] };
export type Resultado = 'ligou' | 'desligou' | 'desarmou' | 'rodada' | 'concluida' | 'ignorado';
export type TarefaDivisao = {
  rodada: number;          // index of the current round
  ligados: IdSistema[];
  desarmes: number;        // how many times the breaker tripped (all rounds)
  concluida: boolean;
};

export const SISTEMAS: Sistema[] = [
  { id: 'vida', nome: 'Life support', consumo: 3, essencial: true },
  { id: 'comunicacao', nome: 'Communications', consumo: 2, essencial: false },
  { id: 'aquecedor', nome: 'Heater', consumo: 3, essencial: false },
  { id: 'luzes', nome: 'Lights', consumo: 2, essencial: false },
  { id: 'motor', nome: 'Engine', consumo: 4, essencial: false },
];

export const CAPACIDADE_MAXIMA = 10;

// Every goal includes life support, which is mandatory.
export const RODADAS: Rodada[] = [
  { evento: 'Strong Sun: the battery is full, with 10 units.', capacidade: 10, meta: ['vida', 'comunicacao'] },
  { evento: 'A dust storm covered the panels: only 6 units!', capacidade: 6, meta: ['vida', 'comunicacao'] },
  { evento: 'Eclipse: the battery is almost empty, only 7 units!', capacidade: 7, meta: ['vida', 'comunicacao', 'luzes'] },
];

export function criarDivisao(): TarefaDivisao {
  return { rodada: 0, ligados: [], desarmes: 0, concluida: false };
}

export function rodadaAtual(t: TarefaDivisao): Rodada {
  return RODADAS[Math.min(t.rodada, RODADAS.length - 1)];
}

export function consumoDe(id: IdSistema) {
  return SISTEMAS.find((s) => s.id === id)!.consumo;
}

export function consumoTotal(t: TarefaDivisao) {
  return t.ligados.reduce((soma, id) => soma + consumoDe(id), 0);
}

export function metaAtingida(t: TarefaDivisao) {
  const r = rodadaAtual(t);
  return r.meta.every((id) => t.ligados.includes(id)) && consumoTotal(t) <= r.capacidade;
}

// Taps a system. Turning on one that does not fit trips the breaker: everything goes off and the round restarts.
export function alternarSistema(t: TarefaDivisao, id: IdSistema): { tarefa: TarefaDivisao; resultado: Resultado } {
  if (t.concluida || !SISTEMAS.some((s) => s.id === id)) return { tarefa: t, resultado: 'ignorado' };
  if (t.ligados.includes(id)) {
    return { tarefa: { ...t, ligados: t.ligados.filter((x) => x !== id) }, resultado: 'desligou' };
  }
  const ligados = [...t.ligados, id];
  const candidato = { ...t, ligados };
  if (consumoTotal(candidato) > rodadaAtual(t).capacidade) {
    return { tarefa: { ...t, ligados: [], desarmes: t.desarmes + 1 }, resultado: 'desarmou' };
  }
  if (metaAtingida(candidato)) {
    const ultima = t.rodada >= RODADAS.length - 1;
    return {
      tarefa: ultima ? { ...candidato, concluida: true } : { ...candidato, rodada: t.rodada + 1, ligados: [] },
      resultado: ultima ? 'concluida' : 'rodada',
    };
  }
  return { tarefa: candidato, resultado: 'ligou' };
}

export function divisaoConcluida(t: TarefaDivisao) {
  return t.concluida;
}
