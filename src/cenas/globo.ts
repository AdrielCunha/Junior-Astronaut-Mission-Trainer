// Generated with AI assistance (Claude). See README, "Use of AI tools".
// The Moon globe as rendered by tools/lua3d/make_moon.py: where a lat/lon lands in a frame, how
// much the Moon has turned on a date, and how to turn the globe so the base region lines up
// with the map (used by the zoom flight).
import vista from '../dados/moon_view.json';

export type V3 = [number, number, number];
export const VISTA = vista;
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const rad = (g: number) => (g * Math.PI) / 180;

// Spin of the Moon relative to the Sun on a date, degrees (same formula as make_moon.py).
export const giroEm = (t: number) =>
  vista.sunLon - (180 - (360 * ((t - Date.parse(vista.newMoon)) / 86400000)) / vista.synodicDays);

// A point (or direction) on the Moon, moon-fixed lat/lon, after the Moon turned by giro degrees.
export const pontoNaLua = (lat: number, lon: number, giro: number): V3 => {
  const f = rad(lat), l = rad(lon + giro);
  return [Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f)];
};

// World vector -> offset from the frame center, in frame widths (-0.5..0.5 across the frame).
export const naTela = (p: V3) => ({
  x: dot(p, vista.right as V3) / (2 * vista.halfExtent),
  y: -dot(p, vista.up as V3) / (2 * vista.halfExtent),
});

export const visivel = (p: V3) => dot(p, vista.toCamera as V3) > 0.02;

// Angle (radians) to turn the globe picture so that, at the south pole, the map's +gx axis points
// the same way on screen as on the map. The map's ground axes are the LOLA polar grid axes:
// +gx = polar x = toward longitude 90 E; on the globe that is the moon-fixed +Y axis.
export function alinhamento(giro: number, exMapa: [number, number]) {
  const g = rad(giro);
  const eixo: V3 = [-Math.sin(g), Math.cos(g), 0];
  const s = naTela(eixo);
  return Math.atan2(exMapa[1], exMapa[0]) - Math.atan2(s.y, s.x);
}

export const solSobreBase = (giro: number) =>
  (Math.asin(Math.max(-1, Math.min(1, dot(pontoNaLua(vista.base.lat, vista.base.lon, giro), vista.toSun as V3)))) * 180) / Math.PI;
