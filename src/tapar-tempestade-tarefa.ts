// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of the "cover the storm" task: water bags are placed on the wall that faces the solar storm.
// Pure functions, no Phaser, so node --test can run them. The scene (cenas/TaparTempestadeTarefa.ts) only draws.
export type Lado = 'esquerda' | 'direita';

export type EncaixeTempestade = { id: number; lado: Lado; fileira: number; ocupado: boolean };

export type TarefaTapar = {
  ladoTempestade: Lado;
  fileiras: number;            // slots per wall
  sacosNaPilha: number;        // bags still in the pile
  encaixes: EncaixeTempestade[];
};

export type ResultadoColocar = 'certo' | 'lado-errado' | 'ocupado' | 'sem-sacos';

const SACOS_TOTAL = 6;
const FILEIRAS = 4;
const DOSE_SEGURA = 0.25;      // felt radiation at or below this is "safe"
const REDUCAO_POR_SACO = 0.2;  // each bag on the right wall takes 20% off

export function criarTarefaTapar(ladoTempestade: Lado = 'esquerda'): TarefaTapar {
  const encaixes: EncaixeTempestade[] = [];
  let id = 0;
  for (const lado of ['esquerda', 'direita'] as Lado[]) {
    for (let fileira = 0; fileira < FILEIRAS; fileira++) encaixes.push({ id: id++, lado, fileira, ocupado: false });
  }
  return { ladoTempestade, fileiras: FILEIRAS, sacosNaPilha: SACOS_TOTAL, encaixes };
}

// Puts a bag in a slot. A bag on the wrong wall is not accepted (it goes back to the pile): there is no penalty.
export function colocarSaco(t: TarefaTapar, idEncaixe: number): { tarefa: TarefaTapar; resultado: ResultadoColocar } {
  const e = t.encaixes.find((x) => x.id === idEncaixe);
  if (!e || e.ocupado) return { tarefa: t, resultado: 'ocupado' };
  if (t.sacosNaPilha <= 0) return { tarefa: t, resultado: 'sem-sacos' };
  if (e.lado !== t.ladoTempestade) return { tarefa: t, resultado: 'lado-errado' };
  return {
    tarefa: { ...t, sacosNaPilha: t.sacosNaPilha - 1, encaixes: t.encaixes.map((x) => (x.id === idEncaixe ? { ...x, ocupado: true } : x)) },
    resultado: 'certo',
  };
}

// Takes a bag back from a slot to the pile.
export function removerSaco(t: TarefaTapar, idEncaixe: number): TarefaTapar {
  const e = t.encaixes.find((x) => x.id === idEncaixe);
  if (!e || !e.ocupado) return t;
  return { ...t, sacosNaPilha: t.sacosNaPilha + 1, encaixes: t.encaixes.map((x) => (x.id === idEncaixe ? { ...x, ocupado: false } : x)) };
}

export const sacosNoLadoCerto = (t: TarefaTapar) => t.encaixes.filter((e) => e.ocupado && e.lado === t.ladoTempestade).length;

// Share of the storm wall that is covered, 0 to 1.
export const cobertura = (t: TarefaTapar) => sacosNoLadoCerto(t) / t.fileiras;

// Radiation felt inside the base: 1 (full) down to 0.2 with the wall covered.
export function doseSentida(t: TarefaTapar) {
  return Math.max(0, Math.round((1 - REDUCAO_POR_SACO * sacosNoLadoCerto(t)) * 100) / 100);
}

export const tarefaConcluida = (t: TarefaTapar) => cobertura(t) >= 1 && doseSentida(t) <= DOSE_SEGURA;
