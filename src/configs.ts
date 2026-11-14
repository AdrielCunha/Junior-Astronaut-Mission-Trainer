// Generated with AI assistance (Claude). See README, "Use of AI tools".
// The rule numbers of each chapter, in one place. The game scenes (capitulos.ts) and the
// balance tests (regras.test.ts) both read them here, so the two can never drift apart.
import type { Config } from './regras';

export const LUA: Config = {
  dias: 8, bateriasPorDia: 5, oxigenioInicial: 60, oxigenioPorBateria: 10, oxigenioPorNoite: 10, metaPorBateria: 5,
};

export const NAVE: Config = {
  dias: 5, bateriasPorDia: 4, oxigenioInicial: 60, oxigenioPorBateria: 10, oxigenioPorNoite: 15, metaPorBateria: 12,
};

// Mars starts empty: every module is built first (cost in batteries), then powered.
// The goal is the share of the base that is built; the dome is the crew's new home.
export const MARTE: Config = {
  dias: 8, bateriasPorDia: 5, oxigenioInicial: 60, oxigenioPorBateria: 10, oxigenioPorNoite: 10, metaPorBateria: 0,
  obras: { aquecimento: 2, blindagem: 3, oxigenio: 3, meta: 12 },
};
