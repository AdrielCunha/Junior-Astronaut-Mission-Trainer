// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of "Scan for ice": the ground is a grid of spots. Scanning a spot shows how much ice is under it
// (0-100%), higher the closer it is to the ice. The child scans around, follows the numbers up and marks the
// spot with the most ice. A wrong mark only shows a hint. Pure functions, no Phaser.
// The scene (cenas/ScannerGeloTarefa.ts) only draws.
export const COLUNAS = 6, LINHAS = 4;
export type EstadoScanner = { gelo: number; leituras: (number | null)[]; escaneios: number; marcas: number; pronto: boolean };

const aleatorio = (semente: number) => {   // tiny deterministic generator, 0..1
  let x = (Math.imul(semente | 0, 1664525) + 1013904223) >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
};

export const coluna = (i: number) => i % COLUNAS;
export const linha = (i: number) => Math.floor(i / COLUNAS);

// How much ice a spot shows: 100 on the ice, 22 less for every spot of distance (a diagonal counts as 1.4).
export function leituraReal(gelo: number, i: number): number {
  const d = Math.hypot(coluna(i) - coluna(gelo), linha(i) - linha(gelo));
  return Math.max(0, Math.round(100 - d * 22));
}

export function criarScanner(semente = 1): EstadoScanner {
  const r = aleatorio(semente);
  // The ice is never on the edge, so there are neighbours to compare in every direction.
  const c = 1 + Math.floor(r() * (COLUNAS - 2)), l = 1 + Math.floor(r() * (LINHAS - 2));
  return { gelo: l * COLUNAS + c, leituras: Array(COLUNAS * LINHAS).fill(null), escaneios: 0, marcas: 0, pronto: false };
}

export function escanear(e: EstadoScanner, i: number): EstadoScanner {
  if (e.pronto || i < 0 || i >= e.leituras.length || e.leituras[i] !== null) return e;
  const leituras = e.leituras.map((v, k) => (k === i ? leituraReal(e.gelo, i) : v));
  return { ...e, leituras, escaneios: e.escaneios + 1 };
}

// Marks a spot as the ice. Only a spot that was scanned can be marked, so the child must look first.
export function marcar(e: EstadoScanner, i: number): { e: EstadoScanner; certo: boolean; dica: string } {
  if (e.pronto || e.leituras[i] === null || e.leituras[i] === undefined) return { e, certo: false, dica: 'Scan this spot first.' };
  if (i === e.gelo) return { e: { ...e, pronto: true }, certo: true, dica: 'Ice found!' };
  const v = e.leituras[i] as number;
  return { e: { ...e, marcas: e.marcas + 1 }, certo: false, dica: v >= 70 ? 'Very close! Scan the spots next to it.' : 'Not here. Follow the bigger numbers.' };
}

// The best reading so far, for the on-screen meter.
export const melhorLeitura = (e: EstadoScanner) => Math.max(0, ...e.leituras.map((v) => v ?? 0));
export const tarefaConcluida = (e: EstadoScanner) => e.pronto;
