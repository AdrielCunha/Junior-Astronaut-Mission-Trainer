// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of "Fix the fender": after the rover drives a while, a fender breaks and throws dust everywhere.
// The child covers the 4 gaps with folded maps, then closes 4 clamps to hold them (true Apollo 17 story).
// Pure functions, no Phaser, so node --test can run them. The scene (cenas/ParalamaTarefa.ts) only draws.
export type FaseParalama = 'cobrir' | 'prender' | 'pronto';
export type EstadoParalama = { mapas: (number | null)[]; presilhas: boolean[]; fase: FaseParalama };

export const NUM_PECAS = 4;
export const DISTANCIA_QUEBRA = 40;   // tiles of driving in a day before the fender breaks (about 6 s at full speed)

// The fender breaks once a day, while playing the day, after enough driving.
export const deveQuebrar = (odometro: number, jaQuebrouHoje: boolean) => !jaQuebrouHoje && odometro >= DISTANCIA_QUEBRA;

export function criarParalama(): EstadoParalama {
  return { mapas: Array(NUM_PECAS).fill(null), presilhas: Array(NUM_PECAS).fill(false), fase: 'cobrir' };
}

export const vagaOcupada = (e: EstadoParalama, vaga: number) => e.mapas.includes(vaga);

// Puts map `mapa` over gap `vaga`. A gap takes one map; a map already placed stays where it is.
export function colocarMapa(e: EstadoParalama, mapa: number, vaga: number): EstadoParalama {
  if (e.fase !== 'cobrir' || mapa < 0 || mapa >= NUM_PECAS || vaga < 0 || vaga >= NUM_PECAS) return e;
  if (e.mapas[mapa] !== null || vagaOcupada(e, vaga)) return e;
  const mapas = e.mapas.map((v, i) => (i === mapa ? vaga : v));
  return { ...e, mapas, fase: mapas.every((v) => v !== null) ? 'prender' : 'cobrir' };
}

// Closes clamp `i` (only once every gap is covered).
export function prender(e: EstadoParalama, i: number): EstadoParalama {
  if (e.fase !== 'prender' || i < 0 || i >= NUM_PECAS || e.presilhas[i]) return e;
  const presilhas = e.presilhas.map((v, k) => v || k === i);
  return { ...e, presilhas, fase: presilhas.every(Boolean) ? 'pronto' : 'prender' };
}

export const mapasColocados = (e: EstadoParalama) => e.mapas.filter((v) => v !== null).length;
export const tarefaConcluida = (e: EstadoParalama) => e.fase === 'pronto';
