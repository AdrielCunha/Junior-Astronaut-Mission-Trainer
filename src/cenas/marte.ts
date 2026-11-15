// Generated with AI assistance. See README, "Use of AI tools".
// Mars, shared by the landing (Viagem.ts), the base on the ground (Base.ts, chapter 3) and the
// view from space (MarteVista.ts): where the crew lands and the flat toon landscape.
import Phaser from 'phaser';

// Jezero crater: an old lake bed where NASA's Perseverance rover landed on 18 February 2021.
export const JEZERO = { lat: 18.38, lon: 77.58, nome: 'Jezero crater' };

// Mars facts used in captions (NASA Mars fact sheet).
export const DIA_MARTE_MS = 88775244;        // one sol: 24 h 39 min 35 s
export const RAIO_MARTE_KM = 3390;

// Toon colors. Daytime Mars sky is butterscotch (fine red dust in the air); near the Sun it turns
// bluish, which is why Martian sunsets are blue.
export const COR_MARTE = {
  ceu: [0xb9825c, 0xcc966b, 0xddab7f],       // top to horizon
  halo: 0xc7d2dc,
  sol: 0xfffbeb,
  longe: 0xa86a47,                            // far crater rim
  perto: 0x8d5234,                            // near hills
  chao: 0xa65f38,
  pedra: 0x6e3b22,
  pedraLuz: 0x9a5532,
  contorno: 0x2a160d,
};

// A wavy ridge line from x0 to x1 around height y, seeded so it is the same every time.
function crista(rnd: Phaser.Math.RandomDataGenerator, x0: number, x1: number, y: number, amp: number, passos: number) {
  const pts: Phaser.Types.Math.Vector2Like[] = [];
  const f1 = rnd.realInRange(1.5, 3), f2 = rnd.realInRange(4, 7), a1 = rnd.realInRange(0, 6), a2 = rnd.realInRange(0, 6);
  for (let i = 0; i <= passos; i++) {
    const s = i / passos;
    pts.push({ x: x0 + (x1 - x0) * s, y: y - amp * (0.6 * Math.sin(s * f1 * Math.PI + a1) + 0.4 * Math.sin(s * f2 * Math.PI + a2) + 1) / 2 });
  }
  return pts;
}

// Sky, a small Sun (Mars is half again as far from the Sun as Earth), the far rim of the crater,
// near hills and the ground down to the bottom of the screen. `u` scales line widths.
export function desenharPaisagemMarte(g: Phaser.GameObjects.Graphics, W: number, H: number, horizonte: number, u: number, sol = { x: 0.78, y: 0.35 }) {
  const C = COR_MARTE;
  const faixas = C.ceu.length;
  for (let i = 0; i < faixas; i++) {
    const y0 = (horizonte * i) / faixas, y1 = (horizonte * (i + 1)) / faixas;
    g.fillStyle(C.ceu[i]).fillRect(0, y0, W, y1 - y0 + 1);
  }
  const sx = W * sol.x, sy = horizonte * sol.y, r = 9 * u;
  g.fillStyle(C.halo, 0.35).fillCircle(sx, sy, r * 4.5);
  g.fillStyle(C.halo, 0.45).fillCircle(sx, sy, r * 2.4);
  g.fillStyle(C.sol).fillCircle(sx, sy, r);
  const rnd = new Phaser.Math.RandomDataGenerator(['jezero']);
  const longe = crista(rnd, 0, W, horizonte + 2 * u, 26 * u, 48);
  g.fillStyle(C.longe).fillPoints([...longe, { x: W, y: H }, { x: 0, y: H }], true);
  g.lineStyle(2 * u, C.contorno, 0.7).strokePoints(longe, false);
  const perto = crista(rnd, 0, W, horizonte + 22 * u, 18 * u, 36);
  g.fillStyle(C.perto).fillPoints([...perto, { x: W, y: H }, { x: 0, y: H }], true);
  g.lineStyle(2 * u, C.contorno, 0.8).strokePoints(perto, false);
  const chao = horizonte + 30 * u;
  g.fillStyle(C.chao).fillRect(0, chao, W, H - chao);
  g.lineStyle(2 * u, C.contorno, 0.6).lineBetween(0, chao, W, chao);
  // Rocks, bigger the closer they are.
  for (let i = 0; i < 70; i++) {
    const t = rnd.frac();
    const y = chao + 6 * u + (H - chao) * t * t;
    const x = rnd.between(0, W);
    const s = (2 + 9 * t) * u * rnd.realInRange(0.6, 1.3);
    g.fillStyle(C.pedra).fillEllipse(x, y, s * 2, s * 1.1);
    g.fillStyle(C.pedraLuz).fillEllipse(x - s * 0.25, y - s * 0.25, s * 1.1, s * 0.55);
  }
}
