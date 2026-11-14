// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Fix the lighting": turn wire pieces so the current goes from the battery to every lamp.
// Pure rules, no Phaser.

export const N = 1, E = 2, S = 4, W = 8;
export type Tipo = 'reta' | 'curva' | 'T';

export type Peca = { tipo: Tipo; rot: number; fixa: boolean };

export type TarefaIluminacao = {
  colunas: number;
  linhas: number;
  /** Row-major (index = linha * colunas + coluna). */
  pecas: Peca[];
  /** The battery feeds the west side of the first column on this row. */
  linhaBateria: number;
  /** Each lamp sits to the east of the last column on this row. */
  linhasLampadas: number[];
};

const BASE: Record<Tipo, number> = { reta: E | W, curva: N | E, T: E | S | W };

/** Which sides of the piece have wire, after `rot` quarter turns clockwise. */
export function conexoes(p: Peca): number {
  let m = BASE[p.tipo];
  for (let i = 0; i < ((p.rot % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
}

const peca = (tipo: Tipo, rot: number): Peca => ({ tipo, rot, fixa: false });

export function criarTarefaIluminacao(): TarefaIluminacao {
  // Solution (rot in parentheses): row 1 goes straight from the battery to a T at column 1 that splits up and down,
  // the top branch reaches the lamp on row 0 and the bottom one the lamp on row 2. The rest are decoys.
  const pecas: Peca[] = [
    peca('curva', 1), peca('curva', 3), peca('reta', 1), peca('reta', 1), peca('reta', 1),
    peca('reta', 1), peca('T', 2), peca('curva', 0), peca('T', 3), peca('reta', 1),
    peca('curva', 0), peca('curva', 2), peca('reta', 1), peca('reta', 1), peca('reta', 1),
  ];
  return { colunas: 5, linhas: 3, pecas, linhaBateria: 1, linhasLampadas: [0, 2] };
}

/** One quarter turn clockwise. Returns a new state. */
export function girarPeca(t: TarefaIluminacao, coluna: number, linha: number): TarefaIluminacao {
  const i = linha * t.colunas + coluna;
  const p = t.pecas[i];
  if (!p || p.fixa) return t;
  return { ...t, pecas: t.pecas.map((q, k) => (k === i ? { ...q, rot: (q.rot + 1) % 4 } : q)) };
}

export type Energia = { energizadas: boolean[]; lampadas: boolean[] };

/** Follows the wire from the battery. */
export function calcularEnergia(t: TarefaIluminacao): Energia {
  const energizadas = t.pecas.map(() => false);
  const lampadas = t.linhasLampadas.map(() => false);
  const inicio = t.linhaBateria * t.colunas;
  if (!(conexoes(t.pecas[inicio]) & W)) return { energizadas, lampadas };
  const fila = [inicio];
  energizadas[inicio] = true;
  const passos: [number, number, number, number][] = [[N, S, 0, -1], [E, W, 1, 0], [S, N, 0, 1], [W, E, -1, 0]];
  while (fila.length) {
    const i = fila.shift()!;
    const c = i % t.colunas, l = Math.floor(i / t.colunas);
    const m = conexoes(t.pecas[i]);
    if (c === t.colunas - 1 && m & E) {
      const k = t.linhasLampadas.indexOf(l);
      if (k >= 0) lampadas[k] = true;
    }
    for (const [lado, oposto, dc, dl] of passos) {
      if (!(m & lado)) continue;
      const nc = c + dc, nl = l + dl;
      if (nc < 0 || nl < 0 || nc >= t.colunas || nl >= t.linhas) continue;
      const j = nl * t.colunas + nc;
      if (energizadas[j] || !(conexoes(t.pecas[j]) & oposto)) continue;
      energizadas[j] = true;
      fila.push(j);
    }
  }
  return { energizadas, lampadas };
}

export function lampadasAcesas(t: TarefaIluminacao): number {
  return calcularEnergia(t).lampadas.filter(Boolean).length;
}

export function tarefaConcluida(t: TarefaIluminacao): boolean {
  return calcularEnergia(t).lampadas.every(Boolean);
}
