// Generated with AI assistance. See README, "Use of AI tools".
// The trip from the Moon to Mars, shared by the departure (Espaco, after liftoff) and the arrival
// (Viagem): the dates, the transfer path and the ship picture for a heading.
import viagem from '../dados/viagem.json';
import { PLANETAS, posicao } from '../engine/astro';

export const PARTIDA = Date.parse('2024-05-13T12:00:00Z');   // chapter 2 starts (capitulos.ts)
export const DIAS_REAIS = 259;                               // a typical Earth-Mars transfer, ~8.5 months
export const DIA_MS = 86400000;
const terra = PLANETAS.find((p) => p.nome === 'Earth')!;
const marte = PLANETAS.find((p) => p.nome === 'Mars')!;

export type PontoAU = { x: number; y: number };

// From Earth on the departure day to Mars on the arrival day (real positions, AU): the radius grows
// from Earth's orbit to Mars's while it turns the short way around the Sun. A simplified transfer
// arc, not a computed trajectory. 121 points, s = i / 120.
export function caminhoTransferencia(): PontoAU[] {
  const e0 = posicao(terra, PARTIDA), m1 = posicao(marte, PARTIDA + DIAS_REAIS * DIA_MS);
  const a0 = Math.atan2(e0.y, e0.x);
  let da = Math.atan2(m1.y, m1.x) - a0;
  while (da <= 0) da += 2 * Math.PI;
  if (da > 1.6 * Math.PI) da -= 2 * Math.PI;
  return Array.from({ length: 121 }, (_, i) => {
    const s = i / 120;
    const r = e0.r + (m1.r - e0.r) * (0.5 - 0.5 * Math.cos(Math.PI * s));
    const a = a0 + da * s;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
}

// Point along the path at s (0..1), linear between the 121 points.
export function noCaminho(c: PontoAU[], s: number): PontoAU {
  const i = Math.min(Math.max(s, 0) * 120, 119.999);
  const a = c[Math.floor(i)], b = c[Math.floor(i) + 1], f = i - Math.floor(i);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

// The rendered ship picture (make_ship.py, 16 headings) closest to `rumo` (radians,
// counterclockwise from screen right), with its origin at the ship's center.
export function quadroNave(rumo: number) {
  const k = ((Math.round(rumo / (Math.PI / 8)) % 16) + 16) % 16;
  const n = viagem.nave.direcoes[k];
  return { chave: `nave_d${k}`, ox: n.centro[0] / n.w, oy: n.centro[1] / n.h };
}
