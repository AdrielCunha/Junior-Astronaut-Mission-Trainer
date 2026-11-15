// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Expeditions: a short trip across the map through flags in order (the rover delivery run now; finding
// things out on the ground later). The scene draws the flags and the HUD arrow; the rules live here.
// No Phaser, so node --test can run them.
export type Ponto = { x: number; y: number };
export type Expedicao = {
  id: string;
  titulo: string;      // short HUD line, e.g. "Delivery run"
  destino: string;     // where it ends, e.g. "Rocket Workshop"
  pontos: Ponto[];     // flags, in order
  atual: number;       // index of the next flag (pontos.length = finished)
  raio: number;        // tiles: how close counts as passing a flag
  deRover: boolean;    // only counts while driving the rover
  fato: string;        // shown at the end
};

export const RAIO_BANDEIRA = 1.6;
export const BANDEIRAS_CORRIDA = 4;

export const terminada = (e: Expedicao) => e.atual >= e.pontos.length;
export const proxima = (e: Expedicao): Ponto | undefined => e.pontos[e.atual];

// Moves on when the player (or the rover) is close to the next flag.
export function avancar(e: Expedicao, x: number, y: number, dirigindo: boolean): { e: Expedicao; passou: boolean; aPe: boolean } {
  const p = proxima(e);
  if (!p) return { e, passou: false, aPe: false };
  const perto = Math.hypot(x - p.x, y - p.y) <= e.raio;
  if (!perto) return { e, passou: false, aPe: false };
  if (e.deRover && !dirigindo) return { e, passou: false, aPe: true };
  return { e: { ...e, atual: e.atual + 1 }, passou: true, aPe: false };
}

// The nearest free spot to (x, y), searching rings up to `alcance` tiles away.
export function pontoLivrePerto(x: number, y: number, livre: (x: number, y: number) => boolean, alcance = 5): Ponto | null {
  if (livre(x, y)) return { x, y };
  for (let r = 0.5; r <= alcance; r += 0.5) {
    const passos = Math.max(8, Math.round(r * 8));
    for (let k = 0; k < passos; k++) {
      const a = (k / passos) * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (livre(px, py)) return { x: px, y: py };
    }
  }
  return null;
}

// n flags from just after `inicio` to `fim`, zig-zagging a little so the route is not a straight line.
// Flags that land on rocks or buildings move to the nearest free spot; flags with no free spot are dropped.
export function tracarRota(inicio: Ponto, fim: Ponto, n: number, livre: (x: number, y: number) => boolean, desvio = 3): Ponto[] {
  const dx = fim.x - inicio.x, dy = fim.y - inicio.y, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const pontos: Ponto[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n, lado = i === n ? 0 : (i % 2 ? 1 : -1) * desvio;
    const p = pontoLivrePerto(inicio.x + dx * t + nx * lado, inicio.y + dy * t + ny * lado, livre);
    if (p) pontos.push(p);
  }
  return pontos;
}

// The module farthest from the start, so the run crosses the base.
export function maisLonge<T extends { x: number; y: number }>(inicio: Ponto, alvos: T[]): T | undefined {
  let melhor: T | undefined, d = -1;
  for (const a of alvos) { const k = Math.hypot(a.x - inicio.x, a.y - inicio.y); if (k > d) { d = k; melhor = a; } }
  return melhor;
}

export function criarCorridaEntrega(inicio: Ponto, destino: Ponto & { nome: string }, livre: (x: number, y: number) => boolean): Expedicao | null {
  const pontos = tracarRota(inicio, destino, BANDEIRAS_CORRIDA, livre);
  if (pontos.length < 2) return null;
  return {
    id: 'corrida', titulo: 'Delivery run', destino: destino.nome, pontos, atual: 0, raio: RAIO_BANDEIRA, deRover: true,
    fato: 'The Apollo 17 rover reached about 18 km/h, a speed record on the Moon!',
  };
}
