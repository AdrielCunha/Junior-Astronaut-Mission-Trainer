// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Code-drawn bits that go with the Blender pictures on the map: foundations, the commander's
// shadow and batteries, falling cargo. Flat colors and a dark outline, like the renders.
import Phaser from 'phaser';
import { paraTela, type Projecao } from '../engine/iso';
import type { Construcao } from '../engine/construcao';
import { COR } from './sessao';

type G = Phaser.GameObjects.Graphics;
type P = { x: number; y: number };

const escuro = (cor: number, pct: number) => Phaser.Display.Color.ValueToColor(cor).darken(pct).color;

function poli(g: G, pts: P[], cor: number, contorno = true) {
  g.fillStyle(cor).fillPoints(pts, true);
  if (contorno) g.lineStyle(2, COR.contorno).strokePoints(pts, true);
}

// A box on the map: footprint x0..x1, y0..y1 (tiles), from height b to t. Only the three faces
// the camera can see are drawn: the roof, the +gx side and the +gy side.
export function caixa(g: G, p: Projecao, x0: number, y0: number, x1: number, y1: number, b: number, t: number, cor: number) {
  const q = (x: number, y: number, z: number) => paraTela(p, x, y, z);
  poli(g, [q(x1, y0, b), q(x1, y1, b), q(x1, y1, t), q(x1, y0, t)], escuro(cor, 22));
  poli(g, [q(x0, y1, b), q(x1, y1, b), q(x1, y1, t), q(x0, y1, t)], escuro(cor, 10));
  poli(g, [q(x0, y0, t), q(x1, y0, t), q(x1, y1, t), q(x0, y1, t)], cor);
}

// Lowest ground under a footprint, so modules on a slope get a foundation instead of floating.
export const baseDe = (c: Construcao, altura: (x: number, y: number) => number) => {
  let m = Infinity;
  for (let j = 0; j <= c.tipo.h; j++) for (let i = 0; i <= c.tipo.w; i++) m = Math.min(m, altura(c.gx + i, c.gy + j));
  return m;
};

// Concrete under a module standing on a slope, from its floor down to the lowest corner, so it
// never floats. The module itself is a Blender picture (tools/lua3d/make_modules.py).
export function fundacao(g: G, p: Projecao, c: Construcao, base: number) {
  if (c.z - base <= 0.02) return;
  const m = 0.12;
  caixa(g, p, c.gx + m, c.gy + m, c.gx + c.tipo.w - m, c.gy + c.tipo.h - m, base, c.z, 0x57534e);
}

// What goes with the commander sprite (tools/lua3d/make_astronaut.py): the shadow on the ground,
// which shows how high a jump is, and the batteries being carried above the helmet.
export function sombraECarga(g: G, pe: P, sombra: P, escala: number, carregando: number) {
  const s = escala;
  const alto = Math.max(0, sombra.y - pe.y);
  g.fillStyle(0x000000, Phaser.Math.Clamp(0.35 - alto / 300, 0.08, 0.35)).fillEllipse(sombra.x, sombra.y, s * 16, s * 7);
  for (let i = 0; i < carregando; i++) {
    const bx = pe.x - (carregando * s * 5) / 2 + i * s * 5 + s * 0.5, by = pe.y - s * 44;
    g.fillStyle(0x22c55e).fillRect(bx, by, s * 4, s * 7);
    g.lineStyle(1.5, COR.contorno).strokeRect(bx, by, s * 4, s * 7);
    g.fillStyle(0xf8fafc).fillRect(bx + s * 1.2, by - s * 1.2, s * 1.6, s * 1.2);
  }
}

// Cargo falling from the lander: a crate, nothing to slow it (no air, no parachute).
export function carga(g: G, pe: P, sombra: P, escala: number) {
  const s = escala;
  g.fillStyle(0x000000, 0.25).fillEllipse(sombra.x, sombra.y, s * 26, s * 11);
  g.fillStyle(0xa16207).fillRect(pe.x - s * 10, pe.y - s * 18, s * 20, s * 18);
  g.lineStyle(2, COR.contorno).strokeRect(pe.x - s * 10, pe.y - s * 18, s * 20, s * 18);
  g.lineStyle(2, 0x713f12).lineBetween(pe.x - s * 10, pe.y - s * 18, pe.x + s * 10, pe.y).lineBetween(pe.x + s * 10, pe.y - s * 18, pe.x - s * 10, pe.y);
}
