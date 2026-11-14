// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Game rules for one chapter. Pure functions, no Phaser: easy to test and to tune.
// The numbers are starting values (GDD section 5), tuned by the test, not by play.

export type Estado = {
  dia: number; // 1-based
  oxigenio: number; // 0-100
  dose: number; // accumulated radiation, 0-100
  meta: number; // rocket progress, 0-100
};

export type Alocacao = { suporte: number; blindagem: number; oficina: number };
export type DadosDoDia = { nivel: number }; // radiation level 0-3 from real measured dose

export type Resultado = 'vitoria' | 'sem-oxigenio' | 'radiacao' | 'foguete-incompleto' | null;

export const REGRAS = {
  dias: 8,
  bateriasPorDia: 5,
  oxigenioInicial: 60,
  oxigenioPorBateria: 10,
  oxigenioPorNoite: 10, // the crew breathes this much every night
  dosePorNoite: 1, // background radiation, always there
  dosePorNivelSemBlindagem: 15,
  metaPorBateria: 4,
  dosePorAstronautaNaEnfermaria: 25,
  tripulacao: 4,
};

const limitar = (v: number) => Math.max(0, Math.min(100, v));

export const estadoInicial = (): Estado => ({ dia: 1, oxigenio: REGRAS.oxigenioInicial, dose: 0, meta: 0 });

export const naEnfermaria = (e: Estado) =>
  Math.min(REGRAS.tripulacao - 1, Math.floor(e.dose / REGRAS.dosePorAstronautaNaEnfermaria));

// Each astronaut in the infirmary is one less pair of hands: one less battery per day.
export const bateriasDoDia = (e: Estado) => REGRAS.bateriasPorDia - naEnfermaria(e);

export function fimDoDia(e: Estado, a: Alocacao, d: DadosDoDia): Estado {
  const desprotegido = Math.max(0, d.nivel - a.blindagem);
  return {
    dia: e.dia + 1,
    oxigenio: limitar(e.oxigenio + REGRAS.oxigenioPorBateria * a.suporte - REGRAS.oxigenioPorNoite),
    dose: limitar(e.dose + REGRAS.dosePorNoite + REGRAS.dosePorNivelSemBlindagem * desprotegido),
    meta: limitar(e.meta + REGRAS.metaPorBateria * a.oficina),
  };
}

// Called after fimDoDia. The launch window is the last day: finishing the rocket
// early does not end the chapter, the crew still has to get through the storm.
export function resultado(e: Estado): Resultado {
  if (e.oxigenio <= 0) return 'sem-oxigenio';
  if (e.dose >= 100) return 'radiacao';
  if (e.dia > REGRAS.dias) return e.meta >= 100 ? 'vitoria' : 'foguete-incompleto';
  return null;
}

export const pontuacao = (e: Estado) => Math.round(e.oxigenio + (100 - e.dose) + e.meta);
