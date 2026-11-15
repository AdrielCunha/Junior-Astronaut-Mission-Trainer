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

// A retaining plinth follows each ground sample along the two visible footprint edges.
// The level model floor sits above the highest point; no soil can poke through its platform.
export function fundacao(g: G, p: Projecao, c: Construcao, altura: (x: number, y: number) => number) {
  const {gx: x, gy: y, tipo: {w, h}, z} = c;
  const q = (a: number, b: number, height: number) => paraTela(p, a, b, height);
  for (let i = 0; i < w; i++) {
    const a = x+i, b = a+1;
    poli(g, [q(a,y+h,altura(a,y+h)-0.015),q(b,y+h,altura(b,y+h)-0.015),q(b,y+h,z),q(a,y+h,z)], 0x8f8571, false);
  }
  for (let j = 0; j < h; j++) {
    const a=y+j,b=a+1;
    poli(g, [q(x+w,a,altura(x+w,a)-0.015),q(x+w,b,altura(x+w,b)-0.015),q(x+w,b,z),q(x+w,a,z)], 0x706655, false);
  }
  poli(g,[q(x,y,z),q(x+w,y,z),q(x+w,y+h,z),q(x,y+h,z)],0xaaa18c,false);
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
