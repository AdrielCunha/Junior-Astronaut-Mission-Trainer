// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Where the Sun, planets, Earth and Moon are on a given date. No Phaser.
// Planets: Keplerian elements from NASA JPL "Approximate Positions of the Planets"
// (E. M. Standish, table 1, valid 1800-2050, error well under a degree for this use).
// Inclinations are ignored: everything is drawn on the ecliptic plane.

export type Planeta = {
  nome: string; cor: number; raioKm: number;
  a: number; e: number; L: number; varpi: number;   // AU, -, deg, deg at J2000
  dL: number;                                       // deg per Julian century
};

export const PLANETAS: Planeta[] = [
  { nome: 'Mercury', cor: 0x9ca3af, raioKm: 2440, a: 0.38709927, e: 0.20563593, L: 252.25032350, varpi: 77.45779628, dL: 149472.67411175 },
  { nome: 'Venus', cor: 0xe7c88a, raioKm: 6052, a: 0.72333566, e: 0.00677672, L: 181.97909950, varpi: 131.60246718, dL: 58517.81538729 },
  { nome: 'Earth', cor: 0x3b82f6, raioKm: 6371, a: 1.00000261, e: 0.01671123, L: 100.46457166, varpi: 102.93768193, dL: 35999.37244981 },
  { nome: 'Mars', cor: 0xc2410c, raioKm: 3390, a: 1.52371034, e: 0.09339410, L: -4.55343205, varpi: -23.94362959, dL: 19140.30268499 },
  { nome: 'Jupiter', cor: 0xd6a77a, raioKm: 69911, a: 5.20288700, e: 0.04838624, L: 34.39644051, varpi: 14.72847983, dL: 3034.74612775 },
  { nome: 'Saturn', cor: 0xe5d3a1, raioKm: 58232, a: 9.53667594, e: 0.05386179, L: 49.95424423, varpi: 92.59887831, dL: 1222.49362201 },
  { nome: 'Uranus', cor: 0x7dd3fc, raioKm: 25362, a: 19.18916464, e: 0.04725744, L: 313.23810451, varpi: 170.95427630, dL: 428.48202785 },
  { nome: 'Neptune', cor: 0x3b5bdb, raioKm: 24622, a: 30.06992276, e: 0.00859048, L: -55.12002969, varpi: 44.96476227, dL: 218.45945325 },
];

export const AU_KM = 149597870.7;
export const RAIO_SOL_KM = 695700;
export const RAIO_LUA_KM = 1737.4;
export const TERRA_LUA_KM = 384400;
export const LUA_NOVA = Date.parse('2024-05-08T03:22:00Z');
export const MES_SINODICO = 29.530589;   // days

const J2000 = Date.UTC(2000, 0, 1, 12);
const rad = (g: number) => (g * Math.PI) / 180;

// Heliocentric ecliptic position, AU.
export function posicao(p: Planeta, t: number): { x: number; y: number; lon: number; r: number } {
  const T = (t - J2000) / (36525 * 86400000);
  const L = p.L + p.dL * T;
  const M = rad((((L - p.varpi) % 360) + 360) % 360);
  let E = M;
  for (let i = 0; i < 8; i++) E = E - (E - p.e * Math.sin(E) - M) / (1 - p.e * Math.cos(E));
  const nu = 2 * Math.atan2(Math.sqrt(1 + p.e) * Math.sin(E / 2), Math.sqrt(1 - p.e) * Math.cos(E / 2));
  const r = p.a * (1 - p.e * Math.cos(E));
  const lon = nu + rad(p.varpi);
  return { x: r * Math.cos(lon), y: r * Math.sin(lon), lon: ((lon * 180) / Math.PI + 360) % 360, r };
}

// Moon around the Earth, from the phase: at new moon it sits between the Earth and the Sun.
// Returns its geocentric ecliptic direction (unit) and the phase 0..1 (0 = new, 0.5 = full).
export function lua(t: number): { x: number; y: number; fase: number } {
  const terra = posicao(PLANETAS[2], t);
  const fase = ((((t - LUA_NOVA) / 86400000) / MES_SINODICO) % 1 + 1) % 1;
  const sol = Math.atan2(-terra.y, -terra.x);               // direction Earth -> Sun
  const ang = sol + fase * 2 * Math.PI;
  return { x: Math.cos(ang), y: Math.sin(ang), fase };
}

export const nomeDaFase = (f: number) =>
  f < 0.03 || f > 0.97 ? 'New Moon' : f < 0.22 ? 'Waxing Crescent' : f < 0.28 ? 'First Quarter' : f < 0.47 ? 'Waxing Gibbous'
  : f < 0.53 ? 'Full Moon' : f < 0.72 ? 'Waning Gibbous' : f < 0.78 ? 'Last Quarter' : 'Waning Crescent';
