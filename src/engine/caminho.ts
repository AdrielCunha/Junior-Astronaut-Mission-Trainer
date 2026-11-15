// Generated with AI assistance (Gemini). See README, "Use of AI tools".
// A* pathfinding on the tile grid. Finds a route from the commander to a click point that goes
// around modules and avoids steep slopes, so the astronaut never gets stuck against a wall.
//
// The grid is the same n × n tile map the physics already uses. Each tile is walkable if it is
// not inside a module's footprint and its real LOLA slope is <= the walking limit.
//
// Line-of-sight smoothing: if a straight line between two waypoints is collision-free,
// intermediate waypoints are skipped, resulting in smooth, natural paths.

import type { Caixa } from './fisica';
import type { Terreno } from './terreno';

/** A waypoint the commander walks through on the way to the click point. */
export type Ponto = { gx: number; gy: number };

// Pre-allocated scratch buffers reused across calls (up to 64 x 64 = 4096 cells).
let _n = 0;
let _custo: Float32Array;
let _de: Int32Array;
let _fechado: Uint8Array;

function alocar(n: number) {
  if (n === _n) return;
  _n = n;
  const t = n * n;
  _custo = new Float32Array(t);
  _de = new Int32Array(t);
  _fechado = new Uint8Array(t);
}

// Binary min-heap for A* priority queue.
const HEAP_CAP = 8192;
const _hf = new Float32Array(HEAP_CAP);
const _hi = new Int32Array(HEAP_CAP);
let _hn = 0;

function hReset() { _hn = 0; }
function hPush(f: number, idx: number) {
  let k = _hn++;
  _hf[k] = f; _hi[k] = idx;
  while (k > 0) {
    const p = (k - 1) >> 1;
    if (_hf[p] <= _hf[k]) break;
    _hf[k] = _hf[p]; _hi[k] = _hi[p];
    _hf[p] = f; _hi[p] = idx;
    k = p;
  }
}
function hPop(): number {
  const r = _hi[0];
  _hn--;
  if (_hn > 0) {
    _hf[0] = _hf[_hn]; _hi[0] = _hi[_hn];
    let k = 0;
    for (;;) {
      let s = k;
      const l = 2 * k + 1, ri = l + 1;
      if (l < _hn && _hf[l] < _hf[s]) s = l;
      if (ri < _hn && _hf[ri] < _hf[s]) s = ri;
      if (s === k) break;
      const tf = _hf[k]; _hf[k] = _hf[s]; _hf[s] = tf;
      const ti = _hi[k]; _hi[k] = _hi[s]; _hi[s] = ti;
      k = s;
    }
  }
  return r;
}

const SQRT2 = Math.SQRT2;
const VIZ: [number, number, number][] = [
  [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],
  [-1, -1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [1, 1, SQRT2],
];

/**
 * Checks if a point with body radius collides with any module box.
 */
function bateCaixas(caixas: Caixa[], x: number, y: number, r: number): boolean {
  for (const b of caixas) {
    const px = Math.max(b.x0, Math.min(x, b.x1));
    const py = Math.max(b.y0, Math.min(y, b.y1));
    if ((x - px) ** 2 + (y - py) ** 2 < r * r) return true;
  }
  return false;
}

/**
 * Tests whether a continuous straight-line segment from (x0, y0) to (x1, y1) is
 * free of obstacles, box collisions, map boundary limits and steep slopes.
 */
// A body's own test of a free spot (the rover checks its whole footprint: engine/rover.ts
// pontoLivre). Without one, the walker's test: the point's slope and the modules.
export type Livre = (x: number, y: number) => boolean;

export function segmentoLivre(
  t: Terreno, caixas: Caixa[], raio: number,
  x0: number, y0: number, x1: number, y1: number, livre?: Livre,
): boolean {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  if (dist < 1e-4) return true;
  const passos = Math.max(1, Math.ceil(dist / 0.25));
  const r = raio + 0.05;
  for (let s = 0; s <= passos; s++) {
    const f = s / passos;
    const x = x0 + f * (x1 - x0);
    const y = y0 + f * (y1 - y0);
    if (livre) { if (!livre(x, y)) return false; continue; }
    if (x < r || y < r || x > t.n - r || y > t.n - r) return false;
    if (t.inclinacaoEm(x, y) > t.maxAndar) return false;
    if (bateCaixas(caixas, x, y, r)) return false;
  }
  return true;
}

/**
 * Builds the tile walkability grid. A tile (i, j) is walkable if its center + body radius
 * does not collide with any module box and slope <= maxAndar.
 */
function construirGrade(n: number, t: Terreno, caixas: Caixa[], raio: number, livre?: Livre): Uint8Array {
  const g = new Uint8Array(n * n);
  if (livre) {
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) g[j * n + i] = livre(i + 0.5, j + 0.5) ? 1 : 0;
    return g;
  }
  g.fill(1);
  const r = raio + 0.05;

  for (const b of caixas) {
    const x0 = Math.max(0, Math.floor(b.x0 - r));
    const y0 = Math.max(0, Math.floor(b.y0 - r));
    const x1 = Math.min(n - 1, Math.floor(b.x1 + r));
    const y1 = Math.min(n - 1, Math.floor(b.y1 + r));
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        if (bateCaixas([b], i + 0.5, j + 0.5, r)) g[j * n + i] = 0;
      }
    }
  }

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (t.inclinacaoEm(i, j) > t.maxAndar) g[j * n + i] = 0;
    }
  }

  return g;
}

/**
 * Finds a path from (ax, ay) to (bx, by) in map tile coordinates.
 */
export function encontrarCaminho(
  t: Terreno, caixas: Caixa[], raio: number,
  ax: number, ay: number, bx: number, by: number, livre?: Livre,
): Ponto[] | null {
  // Direct line-of-sight check first: if unobstructed, walk straight to the goal!
  if (segmentoLivre(t, caixas, raio, ax, ay, bx, by, livre)) {
    return [{ gx: bx, gy: by }];
  }

  const n = t.n;
  alocar(n);
  const grade = construirGrade(n, t, caixas, raio, livre);

  let si = Math.min(n - 1, Math.max(0, Math.floor(ax)));
  let sj = Math.min(n - 1, Math.max(0, Math.floor(ay)));
  let gi = Math.min(n - 1, Math.max(0, Math.floor(bx)));
  let gj = Math.min(n - 1, Math.max(0, Math.floor(by)));

  if (!grade[sj * n + si]) {
    const s = maisProximoLivre(grade, n, si, sj);
    if (!s) return null;
    si = s[0]; sj = s[1];
  }
  if (!grade[gj * n + gi]) {
    const g = maisProximoLivre(grade, n, gi, gj);
    if (!g) return null;
    gi = g[0]; gj = g[1];
  }

  const sIdx = sj * n + si;
  const gIdx = gj * n + gi;

  if (sIdx === gIdx) {
    return [{ gx: bx, gy: by }];
  }

  _custo.fill(Infinity);
  _de.fill(-1);
  _fechado.fill(0);

  _custo[sIdx] = 0;
  hReset();
  hPush(heuristica(si, sj, gi, gj), sIdx);

  while (_hn > 0) {
    const cur = hPop();
    if (cur === gIdx) break;
    if (_fechado[cur]) continue;
    _fechado[cur] = 1;
    const cx = cur % n, cy = (cur - cx) / n;
    const gc = _custo[cur];

    for (const [dx, dy, custo] of VIZ) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const ni = ny * n + nx;
      if (_fechado[ni] || !grade[ni]) continue;
      // Prevent diagonal cutting through corners
      if (dx !== 0 && dy !== 0 && (!grade[cy * n + nx] || !grade[ny * n + cx])) continue;

      const ng = gc + custo;
      if (ng < _custo[ni]) {
        _custo[ni] = ng;
        _de[ni] = cur;
        hPush(ng + heuristica(nx, ny, gi, gj), ni);
      }
    }
  }

  if (_de[gIdx] === -1 && sIdx !== gIdx) return null;

  const raw: number[] = [];
  for (let c = gIdx; c !== -1; c = _de[c]) raw.push(c);
  raw.reverse();

  const waypoints: Ponto[] = raw.map((c) => ({
    gx: (c % n) + 0.5,
    gy: Math.floor(c / n) + 0.5,
  }));

  // Smooth waypoints using continuous segment collision checks
  // A destination the body cannot stand on (a rover's footprint on a crater rim) ends at the
  // nearest free tile instead, so the route never asks for the impossible last step.
  const fim = livre && !livre(bx, by) ? waypoints[waypoints.length - 1] : { gx: bx, gy: by };
  const suavizado = suavizarCaminho(t, caixas, raio, { gx: ax, gy: ay }, waypoints, fim, livre);
  return suavizado;
}

function heuristica(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx), dy = Math.abs(ay - by);
  return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
}

function maisProximoLivre(grade: Uint8Array, n: number, cx: number, cy: number): [number, number] | null {
  for (let r = 1; r < n; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = cx + dx, y = cy + dy;
        if (x >= 0 && y >= 0 && x < n && y < n && grade[y * n + x]) return [x, y];
      }
    }
  }
  return null;
}

/**
 * Simplifies and smooths waypoints: drops unnecessary turns by checking
 * direct line of sight between points.
 */
function suavizarCaminho(
  t: Terreno, caixas: Caixa[], raio: number,
  inicio: Ponto, waypoints: Ponto[], fim: Ponto, livre?: Livre,
): Ponto[] {
  if (!waypoints.length) return [fim];

  // Try to connect directly to the end if possible
  const todos: Ponto[] = [...waypoints];
  if (segmentoLivre(t, caixas, raio, todos[todos.length - 1].gx, todos[todos.length - 1].gy, fim.gx, fim.gy, livre)) {
    todos[todos.length - 1] = fim;
  } else {
    todos.push(fim);
  }

  const resultado: Ponto[] = [];
  let cur = inicio;
  let idx = 0;

  while (idx < todos.length) {
    // Look ahead as far as possible
    let melhor = idx;
    for (let j = todos.length - 1; j >= idx; j--) {
      if (segmentoLivre(t, caixas, raio, cur.gx, cur.gy, todos[j].gx, todos[j].gy, livre)) {
        melhor = j;
        break;
      }
    }
    resultado.push(todos[melhor]);
    cur = todos[melhor];
    idx = melhor + 1;
  }

  return resultado.length ? resultado : [fim];
}
