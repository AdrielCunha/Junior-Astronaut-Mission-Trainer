// Generated with AI assistance (Claude). See README, "Use of AI tools".
// The ground: real LOLA heights on a grid of tile corners, plus the real slope of each tile.
// Pure data, no Phaser.

export type DadosTerreno = {
  n: number;
  metrosPorTile: number;
  inclinacaoMaxAndar: number;
  inclinacaoMaxConstruir: number;
  alturas: number[][];      // [gy][gx], (n + 1) x (n + 1) corners, in tiles
  inclinacao: number[][];   // [gy][gx], n x n tiles, degrees
};

export class Terreno {
  readonly n: number;
  readonly metrosPorTile: number;
  readonly maxAndar: number;
  readonly maxConstruir: number;
  private readonly h: number[][];
  private readonly s: number[][];

  constructor(d: DadosTerreno) {
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
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
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

  alturaMedia(gx: number, gy: number, w: number, h: number): number {
    let t = 0;
    for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) t += this.h[gy + j][gx + i];
    return t / ((w + 1) * (h + 1));
  }
}
