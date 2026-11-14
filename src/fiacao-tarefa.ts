// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Fix the wiring": plug each cable into the socket of the same colour.
// The first part (pontos) is the original toggle model, kept because other tests import it.
// The second part (circuito) is the real puzzle used by the scene. No Phaser here.
export type PontoFiacao = { id: string; consertado: boolean };

export type TarefaFiacao = {
  pontos: PontoFiacao[];
};

export function criarTarefaFiacao(): TarefaFiacao {
  return {
    pontos: [
      { id: 'a', consertado: false },
      { id: 'b', consertado: false },
      { id: 'c', consertado: false },
      { id: 'd', consertado: false },
    ],
  };
}

export function alternarPonto(tarefa: TarefaFiacao, id: string): TarefaFiacao {
  return {
    ...tarefa,
    pontos: tarefa.pontos.map((ponto) => ponto.id === id ? { ...ponto, consertado: !ponto.consertado } : ponto),
  };
}

export function tarefaConcluida(tarefa: TarefaFiacao) {
  return tarefa.pontos.every((ponto) => ponto.consertado);
}

// ---- Find the broken wire ---------------------------------------------------------------------
// Four tangled wires run from the battery boxes (left) to the lamps (right). One lamp is dark: its wire is damaged
// in one of five stretches. The child finds the wire, tests stretch by stretch, then picks the right repair.
export type Dano = 'cortado' | 'descascado' | 'queimado';
export type Reparo = 'emenda' | 'fita' | 'trocar';
export const REPARO_DO_DANO: Record<Dano, Reparo> = { cortado: 'emenda', descascado: 'fita', queimado: 'trocar' };
export const TRECHOS = 5;
export const FIOS = 4;
export const RODADAS = 3;

export type Defeito = { fio: number; trecho: number; dano: Dano };
export type Fiacao = {
  destino: number[];      // destino[fio] = row of the lamp the wire ends in (a shuffle that always has crossings)
  defeitos: Defeito[];    // one per round
  rodada: number;
  achado: boolean;        // the break of the current round was found: time to choose the repair
};
export type ResultadoToque = 'bom' | 'com-corrente' | 'sem-corrente' | 'achou' | 'ignorado';

function embaralhar<T>(a: T[], rnd: () => number): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

export function criarFiacao(rnd: () => number = Math.random): Fiacao {
  let destino: number[];
  do destino = embaralhar([0, 1, 2, 3], rnd); while (destino.every((d, i) => d === i) || destino.filter((d, i) => d === i).length > 1);
  const danos = embaralhar<Dano>(['cortado', 'descascado', 'queimado'], rnd);
  const defeitos = danos.map((dano) => ({ fio: Math.floor(rnd() * FIOS), trecho: 1 + Math.floor(rnd() * (TRECHOS - 2)), dano }));
  return { destino, defeitos, rodada: 0, achado: false };
}

export const defeitoAtual = (f: Fiacao) => f.defeitos[f.rodada];
export const lampadaApagada = (f: Fiacao) => f.destino[defeitoAtual(f).fio];
export const fiacaoConcluida = (f: Fiacao) => f.rodada >= f.defeitos.length;

// Testing a stretch of a wire. Stretches before the break still carry current, the ones after it do not.
export function tocarTrecho(f: Fiacao, fio: number, trecho: number): { estado: Fiacao; resultado: ResultadoToque } {
  if (fiacaoConcluida(f) || f.achado || fio < 0 || fio >= FIOS || trecho < 0 || trecho >= TRECHOS) return { estado: f, resultado: 'ignorado' };
  const d = defeitoAtual(f);
  if (fio !== d.fio) return { estado: f, resultado: 'bom' };
  if (trecho < d.trecho) return { estado: f, resultado: 'com-corrente' };
  if (trecho > d.trecho) return { estado: f, resultado: 'sem-corrente' };
  return { estado: { ...f, achado: true }, resultado: 'achou' };
}

// Choosing a repair. A wrong one changes nothing (the same object comes back).
export function escolherReparo(f: Fiacao, reparo: Reparo): Fiacao {
  if (fiacaoConcluida(f) || !f.achado) return f;
  if (REPARO_DO_DANO[defeitoAtual(f).dano] !== reparo) return f;
  return { ...f, rodada: f.rodada + 1, achado: false };
}
