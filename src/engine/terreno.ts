// Generated with AI assistance (Claude). See README, "Use of AI tools".
// The ground: real LOLA heights on a grid of tile corners, plus the real slope of each tile.
// Pure data, no Phaser.

import type { Caixa } from './fisica.ts';

export type Cratera = { x: number; y: number; raio: number; profundidade: number };
export type DadosTerreno = {
  relevo?: { crateras: Cratera[]; pedras: Caixa[] };
  n: number;
  metrosPorTile: number;
  inclinacaoMaxAndar: number;
  inclinacaoMaxConstruir: number;
  alturas: number[][];      // [gy][gx], (n + 1) x (n + 1) corners, in tiles
  inclinacao: number[][];   // [gy][gx], n x n tiles, degrees
};

export class Terreno {
  readonly crateras: readonly Cratera[];
  readonly pedras: readonly Caixa[];
  readonly n: number;
  readonly metrosPorTile: number;
  readonly maxAndar: number;
  readonly maxConstruir: number;
  private readonly h: number[][];
  private readonly s: number[][];

  constructor(d: DadosTerreno) {
    this.crateras = d.relevo?.crateras ?? [];
    this.pedras = d.relevo?.pedras ?? [];
    this.n = d.n;
    this.metrosPorTile = d.metrosPorTile;
    this.maxAndar = d.inclinacaoMaxAndar;
    this.maxConstruir = d.inclinacaoMaxConstruir;
    this.h = d.alturas;
    this.s = d.inclinacao;
  }

  dentro(gx: number, gy: number) {
    return gx >= 0 && gy >= 0 && gx <= this.n && gy <= this.n;
  }

  // Height at any point, bilinear between the four corners of its tile.
  altura(gx: number, gy: number): number {
    const x = Math.min(this.n - 1e-9, Math.max(0, gx));
    const y = Math.min(this.n - 1e-9, Math.max(0, gy));
    const i = Math.floor(x), j = Math.floor(y);
    const fx = x - i, fy = y - j;
    const a = this.h[j][i], b = this.h[j][i + 1], c = this.h[j + 1][i], d = this.h[j + 1][i + 1];
    let z = a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
    // Same analytic bowl and rim used by the Blender rendering mesh.
    for (const cr of this.crateras) {
      const t = Math.hypot(x - cr.x, y - cr.y) / cr.raio;
      if (t < 0.86) z -= cr.profundidade * (1 - (t / 0.86) ** 2) ** 1.3;
      if (t > 0.68 && t < 1.25) z += cr.profundidade * 0.32 * Math.sin(Math.PI * (t - 0.68) / 0.57) ** 2;
    }
    return z;
  }

  // Loose regolith slows grounded walking continuously toward the crater floor.
  fatorVelocidade(x: number, y: number): number {
    let factor = 1;
    for (const cr of this.crateras) {
      const t = Math.hypot(x - cr.x, y - cr.y) / cr.raio;
      if (t < 1.25) factor = Math.min(factor, 1 - 0.5 * Math.min(1, (1.25 - t) / 0.55));
    }
    return factor;
  }

  bloqueiaConstrucao(x: number, y: number, w: number, h: number): boolean {
    if (this.pedras.some(b => x < b.x1 && x + w > b.x0 && y < b.y1 && y + h > b.y0)) return true;
    return this.crateras.some(cr => {
      const px = Math.max(x, Math.min(x + w, cr.x));
      const py = Math.max(y, Math.min(y + h, cr.y));
      return Math.hypot(px - cr.x, py - cr.y) <= cr.raio * 1.25;
    });
  }

  // Real slope of the tile under a point, in degrees.
  inclinacaoEm(gx: number, gy: number): number {
    const i = Math.min(this.n - 1, Math.max(0, Math.floor(gx)));
    const j = Math.min(this.n - 1, Math.max(0, Math.floor(gy)));
    return this.s[j][i];
  }

  // Steepest tile in a rectangle of tiles (for building footprints).
  inclinacaoMax(gx: number, gy: number, w: number, h: number): number {
    let m = 0;
    for (let j = gy; j < gy + h; j++) for (let i = gx; i < gx + w; i++) m = Math.max(m, this.s[j]?.[i] ?? 90);
    return m;
  }

  alturaMax(gx: number, gy: number, w: number, h: number): number {
    let z = -Infinity;
    for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) z = Math.max(z, this.altura(gx + x, gy + y));
    return z;
  }

  alturaMedia(gx: number, gy: number, w: number, h: number): number {
    let t = 0;
    for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) t += this.h[gy + j][gx + i];
    return t / ((w + 1) * (h + 1));
  }
}
