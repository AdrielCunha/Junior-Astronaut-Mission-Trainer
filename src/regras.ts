// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Game rules. Pure functions, no Phaser: easy to test and to tune.
// The numbers are tuned by regras.test.ts against the real NASA data, not by play.

export type Efeito = 'oxigenio' | 'blindagem' | 'meta' | 'aquecimento';
export type Alocacao = Record<Efeito, number>; // batteries delivered to each kind of room today

export type Estado = {
  dia: number; // 1-based
  oxigenio: number; // 0-100
  dose: number; // accumulated radiation, 0-100; carries over between chapters
  meta: number; // chapter goal progress, 0-100
  obras: Partial<Record<Efeito, number>>; // batteries already put into building each module
};

// Per-chapter numbers.
export type Config = {
  dias: number;
  bateriasPorDia: number;
  oxigenioInicial: number;
  oxigenioPorBateria: number;
  oxigenioPorNoite: number; // the crew breathes this much every night
  metaPorBateria: number;
  // Modules the crew must build first (Mars). Cost in batteries. While a module is unfinished,
  // batteries sent to it go into building it; the goal is then the share of the base that is built.
  obras?: Partial<Record<Efeito, number>>;
};

// nivel: radiation level 0-3 from the real measured dose.
// frio: heating batteries the night needs, from real Mars temperatures (0 outside Mars).
export type DadosDoDia = { nivel: number; frio?: number };

export type Resultado = 'vitoria' | 'sem-oxigenio' | 'radiacao' | 'meta-incompleta' | null;

export const COMUM = {
  dosePorNoite: 1, // background radiation, always there
  dosePorNivelSemBlindagem: 15,
  oxigenioPorFrioSemAquecimento: 10, // machines freeze and make less air
  dosePorAstronautaNaEnfermaria: 25,
  tripulacao: 4,
};

// Trying a lost chapter again: the crew rests first, so its dose is at most this.
// Without it, a crew that arrives at Mars too sick could be stuck in a chapter it cannot win.
export const DESCANSO = 20;

const limitar = (v: number) => Math.max(0, Math.min(100, v));

export const nenhuma = (): Alocacao => ({ oxigenio: 0, blindagem: 0, meta: 0, aquecimento: 0 });

export const inicioDoCapitulo = (c: Config, dose = 0): Estado => ({ dia: 1, oxigenio: c.oxigenioInicial, dose, meta: 0, obras: {} });

export const custo = (ef: Efeito, c: Config) => c.obras?.[ef] ?? 0;
export const pronto = (e: Estado, ef: Efeito, c: Config) => (e.obras[ef] ?? 0) >= custo(ef, c);

function construido(obras: Estado['obras'], c: Config) {
  const lista = Object.entries(c.obras ?? {}) as [Efeito, number][];
  const total = lista.reduce((s, [, n]) => s + n, 0);
  const feito = lista.reduce((s, [ef, n]) => s + Math.min(n, obras[ef] ?? 0), 0);
  return total ? Math.round((100 * feito) / total) : 0;
}

// One battery delivered to a room: it builds the module if unfinished, otherwise it powers it.
export function entregar(e: Estado, a: Alocacao, ef: Efeito, c: Config): [Estado, Alocacao] {
  if (pronto(e, ef, c)) return [e, { ...a, [ef]: a[ef] + 1 }];
  const obras = { ...e.obras, [ef]: (e.obras[ef] ?? 0) + 1 };
  return [{ ...e, obras, meta: construido(obras, c) }, a];
}

export const naEnfermaria = (e: Estado) =>
  Math.min(COMUM.tripulacao - 1, Math.floor(e.dose / COMUM.dosePorAstronautaNaEnfermaria));

// Each astronaut in the infirmary is one less pair of hands: one less battery per day.
export const bateriasDoDia = (e: Estado, c: Config) => c.bateriasPorDia - naEnfermaria(e);

export function fimDoDia(e: Estado, a: Alocacao, d: DadosDoDia, c: Config): Estado {
  const semBlindagem = Math.max(0, d.nivel - a.blindagem);
  const semAquecimento = Math.max(0, (d.frio ?? 0) - a.aquecimento);
  return {
    dia: e.dia + 1,
    oxigenio: limitar(
      e.oxigenio + c.oxigenioPorBateria * a.oxigenio - c.oxigenioPorNoite - COMUM.oxigenioPorFrioSemAquecimento * semAquecimento,
    ),
    dose: limitar(e.dose + COMUM.dosePorNoite + COMUM.dosePorNivelSemBlindagem * semBlindagem),
    meta: limitar(e.meta + c.metaPorBateria * a.meta),
    obras: e.obras,
  };
}

// Called after fimDoDia. The goal is checked only on the last night (launch window,
// arrival at Mars, base deadline): finishing early does not skip the storm.
export function resultado(e: Estado, c: Config): Resultado {
  if (e.oxigenio <= 0) return 'sem-oxigenio';
  if (e.dose >= 100) return 'radiacao';
  if (e.dia > c.dias) return e.meta >= 100 ? 'vitoria' : 'meta-incompleta';
  return null;
}

export const pontuacao = (e: Estado) => Math.round(e.oxigenio + (100 - e.dose) + e.meta);
