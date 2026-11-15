// Generated with AI assistance. See README, "Use of AI tools".
// The trip from the Moon to Mars, shared by the departure (Espaco, after liftoff) and the arrival
// (Viagem): a Hohmann transfer, the path that uses the least fuel between two orbits. It is half
// an ellipse around the Sun, touching Earth's orbit where it leaves and Mars's where it arrives,
// so the ship goes exactly halfway round. It only works when Mars is about 44 degrees ahead of
// Earth at departure: a launch window, every 26 months. The chapters are set in May 2024, which
// is not one, so the trip uses the next real window (late October 2024), found below from the
// same orbital elements as the rest of the game.
import viagem from '../dados/viagem.json';
import { PLANETAS, posicao } from '../engine/astro';

export const DIA_MS = 86400000;
const K_GAUSS = 0.01720209895;            // the Sun's gravity in AU and days: n = k / a^1.5
const terra = PLANETAS.find((p) => p.nome === 'Earth')!;
const marte = PLANETAS.find((p) => p.nome === 'Mars')!;

export type PontoAU = { x: number; y: number };

// The transfer leaving on day t: perihelion at Earth, aphelion where Mars's orbit is on the far
// side. Returns its shape, its length in days and how far Mars misses the meeting point (radians).
function transferencia(t: number) {
  const e0 = posicao(terra, t);
  const th0 = Math.atan2(e0.y, e0.x);
  // Mars's distance from the Sun at the far side: from where Mars is when it gets there.
  let r2 = 1.52, dias = 259, erro = 0;
  for (let i = 0; i < 3; i++) {
    const a = (e0.r + r2) / 2;
    dias = Math.PI * Math.sqrt(a * a * a) / K_GAUSS;
    const m = posicao(marte, t + dias * DIA_MS);
    r2 = m.r;
    erro = Math.atan2(Math.sin(Math.atan2(m.y, m.x) - th0 - Math.PI), Math.cos(Math.atan2(m.y, m.x) - th0 - Math.PI));
  }
  return { th0, r1: e0.r, r2, dias, erro };
}

// The launch window: the day in late 2024 when Mars arrives exactly at the meeting point.
function janela() {
  let melhor = { t: 0, erro: Infinity };
  const inicio = Date.parse('2024-08-01T12:00:00Z');
  for (let k = 0; k < 180; k++) {
    const t = inicio + k * DIA_MS;
    const e = Math.abs(transferencia(t).erro);
    if (e < melhor.erro) melhor = { t, erro: e };
  }
  return melhor.t;
}

export const PARTIDA = janela();
const T = transferencia(PARTIDA);
export const DIAS_REAIS = T.dias;          // about 259 days

// The path, 121 points equally spaced in TIME (s = i / 120 is the fraction of the trip), so the
// ship moves at its real speed: fastest near the Sun when it leaves, slowest when it arrives.
export function caminhoTransferencia(): PontoAU[] {
  const a = (T.r1 + T.r2) / 2, e = (T.r2 - T.r1) / (T.r2 + T.r1);
  return Array.from({ length: 121 }, (_, i) => {
    const M = Math.PI * (i / 120);                        // mean anomaly: half an orbit
    let E = M;
    for (let k = 0; k < 8; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));   // Kepler
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const r = a * (1 - e * Math.cos(E));
    return { x: r * Math.cos(T.th0 + nu), y: r * Math.sin(T.th0 + nu) };
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
