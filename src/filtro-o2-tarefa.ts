// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of the "clean the O2 filter" task: a vacuum passes over dust stains until the air quality is full.
// Pure functions, no Phaser, so node --test can run them. The scene (cenas/FiltroO2Tarefa.ts) only draws.
export type CelulaFiltroO2 = { x: number; y: number; sujeira: number };   // sujeira: 0 (clean) to 1 (very dirty)

export type TarefaFiltroO2 = {
  largura: number;
  altura: number;
  colunas: number;
  linhas: number;
  raio: number;            // reach of the vacuum, in pixels of the filter window
  velocidade: number;      // dirt removed per second inside the reach
  sujeiraInicial: number;  // sum of the dirt at the start (the air quality is measured against it)
  celulas: CelulaFiltroO2[];
};

const LIMPA = 0.05;

export const larguraDaCelula = (t: TarefaFiltroO2) => t.largura / t.colunas;
export const alturaDaCelula = (t: TarefaFiltroO2) => t.altura / t.linhas;

export function criarTarefaFiltroO2(): TarefaFiltroO2 {
  const largura = 600, altura = 300, colunas = 12, linhas = 8;
  const manchas = [{ x: 110, y: 80, r: 70 }, { x: 300, y: 190, r: 90 }, { x: 480, y: 90, r: 65 }, { x: 190, y: 250, r: 50 }, { x: 520, y: 240, r: 55 }];
  const celulas: CelulaFiltroO2[] = [];
  for (let y = 0; y < linhas; y++) {
    for (let x = 0; x < colunas; x++) {
      const cx = (x + 0.5) * (largura / colunas), cy = (y + 0.5) * (altura / linhas);
      const forca = Math.max(...manchas.map((m) => 1 - Math.hypot(cx - m.x, cy - m.y) / m.r));
      const sujeira = forca > 0.15 ? Math.round((0.6 + 0.4 * Math.min(1, forca)) * 100) / 100 : 0;
      celulas.push({ x, y, sujeira });
    }
  }
  const sujeiraInicial = celulas.reduce((a, c) => a + c.sujeira, 0);
  return { largura, altura, colunas, linhas, raio: 34, velocidade: 1.6, sujeiraInicial, celulas };
}

export function centroDaCelula(t: TarefaFiltroO2, c: CelulaFiltroO2) {
  return { x: (c.x + 0.5) * larguraDaCelula(t), y: (c.y + 0.5) * alturaDaCelula(t) };
}

// Distance from a point to the nearest point of the cell's rectangle: passing over any part of a cell cleans it.
function distanciaAteACelula(t: TarefaFiltroO2, c: CelulaFiltroO2, p: { x: number; y: number }) {
  const w = larguraDaCelula(t), h = alturaDaCelula(t);
  const nx = Math.min(Math.max(p.x, c.x * w), (c.x + 1) * w);
  const ny = Math.min(Math.max(p.y, c.y * h), (c.y + 1) * h);
  return Math.hypot(p.x - nx, p.y - ny);
}

// The vacuum is at point `p` (window coordinates) for `dt` seconds. Returns the new state; the old one is untouched.
export function limparEm(t: TarefaFiltroO2, p: { x: number; y: number }, dt: number): TarefaFiltroO2 {
  let mudou = false;
  const celulas = t.celulas.map((c) => {
    if (c.sujeira <= 0 || distanciaAteACelula(t, c, p) > t.raio) return c;
    mudou = true;
    const s = Math.max(0, c.sujeira - t.velocidade * dt);
    return { ...c, sujeira: s <= LIMPA ? 0 : s };
  });
  return mudou ? { ...t, celulas } : t;
}

// 0 (all the dirt still there) to 1 (clean).
export function qualidadeDoAr(t: TarefaFiltroO2) {
  if (t.sujeiraInicial <= 0) return 1;
  const resto = t.celulas.reduce((a, c) => a + c.sujeira, 0);
  return Math.min(1, Math.max(0, 1 - resto / t.sujeiraInicial));
}

export function tarefaConcluida(t: TarefaFiltroO2) {
  return t.celulas.every((c) => c.sujeira <= LIMPA);
}
