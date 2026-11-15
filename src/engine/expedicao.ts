// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Expeditions: a short trip across the map to one or more spots (the rover delivery run, and the exploration
// events of engine/exploracao.ts: find a lost sample, relight beacons, scout for ice, collect Mars tubes).
// The scene draws the markers and the HUD arrow; the rules live here. No Phaser, so node --test can run them.
export type Ponto = { x: number; y: number };
export type TipoExpedicao = 'corrida' | 'amostra' | 'balizas' | 'gelo' | 'tubos' | 'vazamentos' | 'ferramenta';

export type Expedicao = {
  id: string;
  tipo: TipoExpedicao;
  titulo: string;      // short HUD line, e.g. "Delivery run"
  destino: string;     // where it ends, e.g. "Rocket Workshop"
  pontos: Ponto[];
  atual: number;       // spots done (in order: also the index of the next one)
  feitos: boolean[];
  livre: boolean;      // spots in any order (otherwise one after the other)
  raio: number;        // tiles: how close counts as being at a spot
  deRover: boolean;    // only counts while driving the rover
  segurar: number;     // seconds to stay at a spot (0: just pass by)
  espera: number;      // seconds already spent at the current spot
  escondidoAte: number; // the first spots (index below this) have no arrow: only a hot/cold hint
  escala?: number;      // hot/cold distances are multiplied by this (the ship's deck is small: 0.35)
  cena?: string;       // task scene opened when the last spot is reached
  fato: string;        // shown at the end
};

export const RAIO_BANDEIRA = 1.6;
export const BANDEIRAS_CORRIDA = [4, 6];   // flags of a run: a random count in this range

export const terminada = (e: Expedicao) => e.atual >= e.pontos.length;
// The next spot of an ordered expedition.
export const proxima = (e: Expedicao): Ponto | undefined => (e.livre ? undefined : e.pontos[e.atual]);
const pendentes = (e: Expedicao) => (e.livre ? e.pontos.map((_p, i) => i).filter((i) => !e.feitos[i]) : e.atual < e.pontos.length ? [e.atual] : []);
const dist = (p: Ponto, x: number, y: number) => Math.hypot(x - p.x, y - p.y);

export type Passo = { e: Expedicao; passou: boolean; aPe: boolean; progresso: number; indice: number };

// Moves on when the player (or the rover) is close enough to a pending spot for long enough.
export function avancar(e: Expedicao, x: number, y: number, dirigindo: boolean, dt = 0): Passo {
  let melhor = -1, dm = Infinity;
  for (const i of pendentes(e)) { const d = dist(e.pontos[i], x, y); if (d <= e.raio && d < dm) { dm = d; melhor = i; } }
  if (melhor < 0) return { e: e.espera ? { ...e, espera: 0 } : e, passou: false, aPe: false, progresso: 0, indice: -1 };
  if (e.deRover && !dirigindo) return { e, passou: false, aPe: true, progresso: 0, indice: melhor };
  if (e.segurar > 0) {
    const espera = e.espera + Math.max(0, dt);
    if (espera < e.segurar) return { e: { ...e, espera }, passou: false, aPe: false, progresso: espera / e.segurar, indice: melhor };
  }
  const feitos = e.feitos.map((v, i) => v || i === melhor);
  return { e: { ...e, feitos, atual: e.atual + 1, espera: 0 }, passou: true, aPe: false, progresso: 1, indice: melhor };
}

// Where the HUD arrow points: the next spot, the nearest pending one (any order), or nothing while hidden.
export function alvoDaSeta(e: Expedicao, x: number, y: number): Ponto | null {
  if (terminada(e)) return null;
  const alvos = pendentes(e).filter((i) => i >= e.escondidoAte);
  if (!alvos.length) return null;
  return e.pontos[alvos.reduce((a, b) => (dist(e.pontos[b], x, y) < dist(e.pontos[a], x, y) ? b : a))];
}

// Hot/cold: how close to a spot that has no arrow (0 freezing ... 4 burning).
export const FAIXAS_QUENTE = [24, 14, 8, 4];
export const TEXTOS_QUENTE = ['Freezing', 'Cold', 'Warm', 'Hot', 'Burning!'];
export function temperatura(d: number): { nivel: number; texto: string } {
  const nivel = FAIXAS_QUENTE.filter((f) => d <= f).length;
  return { nivel, texto: TEXTOS_QUENTE[nivel] };
}

// The hint for the spot being searched (empty when the spot has an arrow).
export function pista(e: Expedicao, x: number, y: number): { nivel: number; texto: string } | null {
  if (terminada(e)) return null;
  const alvos = pendentes(e).filter((i) => i < e.escondidoAte);
  if (!alvos.length) return null;
  return temperatura(Math.min(...alvos.map((i) => dist(e.pontos[i], x, y))) / (e.escala ?? 1));
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

// The number of flags and how much the route zig-zags change every time, so no two runs look the same.
export function criarCorridaEntrega(inicio: Ponto, destino: Ponto & { nome: string }, livre: (x: number, y: number) => boolean, sorte: () => number = Math.random): Expedicao | null {
  const [min, max] = BANDEIRAS_CORRIDA;
  const n = min + Math.floor(sorte() * (max - min + 1));
  const desvio = (2.5 + sorte() * 3.5) * (sorte() < 0.5 ? -1 : 1);
  const pontos = tracarRota(inicio, destino, n, livre, desvio);
  if (pontos.length < 2) return null;
  return {
    id: 'corrida', tipo: 'corrida', titulo: 'Delivery run', destino: destino.nome, pontos, atual: 0, feitos: pontos.map(() => false),
    livre: false, raio: RAIO_BANDEIRA, deRover: true, segurar: 0, espera: 0, escondidoAte: 0,
    fato: 'The Apollo 17 rover reached about 18 km/h, a speed record on the Moon!',
  };
}

// What to do, always as a verb + the thing, so a child who missed the notice still knows the goal.
export const OBJETIVOS: Record<TipoExpedicao, string> = {
  corrida: 'Drive through the flags',
  amostra: 'Find the lost sample case',
  balizas: 'Light up the beacons',
  gelo: 'Find the ice',
  tubos: 'Collect the sample tubes',
  vazamentos: 'Find and patch the air leaks',
  ferramenta: 'Find the lost wrench',
};
// How to do it, in one short line (shown on the start card).
export const COMO: Record<TipoExpedicao, string> = {
  corrida: 'Take the rover and follow the blue arrow.',
  amostra: 'No arrow this time! Cold = far away, Hot = very close.',
  balizas: 'Follow the blue arrow and stay by each beacon.',
  gelo: 'No arrow this time! Cold = far away, Hot = very close.',
  tubos: 'Follow the blue arrow. Number 1 first!',
  vazamentos: 'Listen! Cold = far away, Hot = very close. Stay by a leak to patch it.',
  ferramenta: 'No arrow this time! Cold = far away, Hot = very close.',
};

// The HUD box: the goal on top (it changes only when the goal changes) and how it is going below.
export function linha(e: Expedicao, p: { nivel: number; texto: string } | null, progresso: number): { titulo: string; detalhe: string } {
  const n = e.pontos.length;
  if (terminada(e)) return { titulo: OBJETIVOS[e.tipo], detalhe: 'Done!' };
  if (e.tipo === 'amostra' && e.atual >= 1) return { titulo: `Bring the case to the ${e.destino}`, detalhe: 'Follow the blue arrow' };
  if (e.tipo === 'ferramenta' && e.atual >= 1) return { titulo: `Bring the wrench to the ${e.destino}`, detalhe: 'Follow the blue arrow' };
  if (e.tipo === 'vazamentos') {
    const det = progresso > 0.01 ? `Patching… ${Math.round(progresso * 10) * 10}%` : p ? `${p.texto} · ${e.atual} of ${n} patched` : `${e.atual} of ${n} patched`;
    return { titulo: OBJETIVOS.vazamentos, detalhe: det };
  }
  const titulo = e.tipo === 'tubos' ? `Pick up tube ${e.atual + 1} of ${n}` : OBJETIVOS[e.tipo];
  if (p) return { titulo, detalhe: `${p.texto} · ${p.nivel <= 1 ? 'far away, keep looking' : p.nivel === 2 ? 'getting closer' : 'very close!'}` };
  if (progresso > 0.01) return { titulo, detalhe: `Stay here… ${Math.round(progresso * 10) * 10}%` };
  if (e.livre) return { titulo, detalhe: `${e.atual} of ${n} lit · follow the blue arrow` };
  if (e.tipo === 'corrida') return { titulo, detalhe: e.atual === n - 1 ? `Last flag: the ${e.destino}!` : `Flag ${e.atual + 1} of ${n}` };
  return { titulo, detalhe: 'Follow the blue arrow' };
}
