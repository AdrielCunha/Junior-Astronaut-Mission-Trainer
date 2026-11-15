// Random conditions of the day: low sunlight, a delayed signal from Earth, or a greenhouse problem.
// At most one per day, never two days in a row, and day 1 is always calm (time to learn the basics).
// No Phaser; the chances live here, the scenes only read them.

export type Condicao = 'sol' | 'sinal' | 'estufa';

export const ESTUFA_OXIGENIO = 5;      // oxygen lost tonight when the greenhouse has a problem
const CHANCE_DIA = 0.35;               // chance that a day (after day 1) has a condition
const TIPOS_CONDICAO: Condicao[] = ['sol', 'sinal', 'estufa'];

// Index 0 is day 1. `sorte` is a random number in [0, 1), injected so tests can repeat a sequence.
export function sortearCondicoes(dias: number, sorte: () => number = Math.random): (Condicao | null)[] {
  const lista: (Condicao | null)[] = [];
  for (let i = 0; i < dias; i++) {
    const livre = i > 0 && lista[i - 1] === null;
    const tipo = livre && sorte() < CHANCE_DIA
      ? TIPOS_CONDICAO[Math.min(TIPOS_CONDICAO.length - 1, Math.floor(sorte() * TIPOS_CONDICAO.length))]
      : null;
    lista.push(tipo);
  }
  return lista;
}

// aviso: the notice in the morning ('mundo' picks the Mars or Moon/ship text for the Sun).
// fato: shown the next night. conceito: the STEM idea added to the end-of-chapter list.
export const CONDICOES: Record<Condicao, { aviso: (mundo: string) => string; fato: string; conceito: string }> = {
  sol: {
    aviso: (mundo) => mundo === 'marte'
      ? 'Dust storm: the solar panels are dusty. 1 battery fewer today.'
      : 'Little sunlight: the panels are in shadow. 1 battery fewer today.',
    fato: 'Solar panels make less power when dust or shadow covers them.',
    conceito: 'Solar power depends on sunlight',
  },
  sinal: {
    aviso: () => 'Signal delayed: no storm forecast today. Guess what the Shield needs!',
    fato: 'Radio signals travel at the speed of light. Far from Earth, messages take minutes.',
    conceito: 'Signals take time to cross space',
  },
  estufa: {
    aviso: () => 'The greenhouse lights broke: 5 less oxygen tonight.',
    fato: 'Plants help make oxygen on a base. Fewer plants, less fresh air.',
    conceito: 'Plants help make air in space',
  },
};
