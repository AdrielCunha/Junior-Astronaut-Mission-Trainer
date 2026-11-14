// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Isometric projection: the one place that turns map coordinates into pixels and back.
// Map coordinates: gx, gy in tiles (0..n), z = height in tiles (up). The numbers come from
// the Blender render (terreno.json "imagem"), so sprites drawn here sit exactly on the picture.
import type { Terreno } from './terreno.ts';

export type Vec2 = [number, number];
export type Projecao = { origem: Vec2; ex: Vec2; ey: Vec2; ez: Vec2 };

export function paraTela(p: Projecao, gx: number, gy: number, z = 0): { x: number; y: number } {
  return {
    x: p.origem[0] + gx * p.ex[0] + gy * p.ey[0] + z * p.ez[0],
    y: p.origem[1] + gx * p.ex[1] + gy * p.ey[1] + z * p.ez[1],
  };
}

// Pixel -> map point at height z (solves the 2 x 2 linear system).
export function paraMapaNaAltura(p: Projecao, x: number, y: number, z: number): { gx: number; gy: number } {
  const rx = x - p.origem[0] - z * p.ez[0];
  const ry = y - p.origem[1] - z * p.ez[1];
  const det = p.ex[0] * p.ey[1] - p.ey[0] * p.ex[1];
  return { gx: (rx * p.ey[1] - ry * p.ey[0]) / det, gy: (p.ex[0] * ry - p.ex[1] * rx) / det };
}

// Pixel -> the ground point under the cursor. The ground has height, so iterate: guess the
// height, find the point at that height, read the real height there, repeat.
export function paraChao(p: Projecao, t: Terreno, x: number, y: number): { gx: number; gy: number } | null {
  let z = 0;
  let q = paraMapaNaAltura(p, x, y, z);
  for (let i = 0; i < 12; i++) {
    const cx = Math.min(t.n, Math.max(0, q.gx));
    const cy = Math.min(t.n, Math.max(0, q.gy));
    z = t.altura(cx, cy);
    const nq = paraMapaNaAltura(p, x, y, z);
    if (Math.abs(nq.gx - q.gx) + Math.abs(nq.gy - q.gy) < 1e-3) { q = nq; break; }
    q = { gx: (q.gx + nq.gx) / 2, gy: (q.gy + nq.gy) / 2 };
  }
  return t.dentro(q.gx, q.gy) ? q : null;
}

// Draw order: things lower on the screen (closer to the viewer) go on top.
export const profundidade = (gx: number, gy: number) => (gx + gy) * 10;
