// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of "Out of the shadow": panels stand on a rail with VAGAS spots; long shadows of rocks cover some spots.
// The child slides each panel to a sunlit spot. Two panels never share a spot.
// Pure functions, no Phaser, so node --test can run them. The scene (cenas/ForaDaSombraTarefa.ts) only draws.
export type EstadoSombra = { sombra: boolean[]; paineis: number[] };

export const VAGAS = 8;
export const NUM_PAINEIS = 3;

// Hand-made layouts: true = shadow. Each has 4 sunny spots for the 3 panels, so there is always a choice.
export const LAYOUTS: boolean[][] = [
  [true, true, false, false, true, true, false, false],
  [false, true, true, false, false, true, true, false],
  [true, false, false, true, true, false, true, false],
  [false, false, true, true, true, false, false, true],
];

export function criarSombra(semente = 1): EstadoSombra {
  const sombra = [...LAYOUTS[Math.abs(semente) % LAYOUTS.length]];
  // Panels start on shaded spots first (at least 2 in the shadow), then on the first free sunny one.
  const escuras = sombra.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
  const claras = sombra.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
  const r = Math.abs(semente) % escuras.length;
  const ordem = [...escuras.slice(r), ...escuras.slice(0, r)];
  const paineis = [ordem[0], ordem[1], ordem.length > 2 ? ordem[2] : claras[0]].sort((a, b) => a - b);
  return { sombra, paineis };
}

export const painelNoSol = (e: EstadoSombra, i: number) => !e.sombra[e.paineis[i]];
export const ocupada = (e: EstadoSombra, vaga: number, exceto = -1) => e.paineis.some((v, i) => i !== exceto && v === vaga);

// Moves panel i to `vaga`. Out of the rail or onto another panel: nothing changes.
export function moverPainel(e: EstadoSombra, i: number, vaga: number): EstadoSombra {
  if (i < 0 || i >= e.paineis.length || vaga < 0 || vaga >= VAGAS || ocupada(e, vaga, i)) return e;
  return { ...e, paineis: e.paineis.map((v, k) => (k === i ? vaga : v)) };
}

export const paineisNoSol = (e: EstadoSombra) => e.paineis.filter((_v, i) => painelNoSol(e, i)).length;
export const tarefaConcluida = (e: EstadoSombra) => paineisNoSol(e) === e.paineis.length;
