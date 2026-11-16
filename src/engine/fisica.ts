// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Movement with lunar gravity and collision against the ground and the modules. No Phaser.
//
// Scale: the map is real (1 tile = 80 m of ground), but people and modules are drawn far bigger
// than that, like on any game map. Vertical physics uses the real lunar gravity at the size the
// astronaut is drawn (1.8 m tall = half a tile), so a jump looks and lasts like a real Moon jump.
// Walking speed is not to scale; it is set for play.
import { buscarSaida } from './recuperacao.ts';

export const G_LUA = 1.62;           // m/s^2, Moon surface gravity
export const G_MARTE = 3.71;         // m/s^2, Mars surface gravity (chapter 3)
export const G_TERRA = 9.81;         // m/s^2, for comparison on screen
export const METROS_POR_TILE_CORPO = 3.6;
// Magnetic soles hold the ship's deck: deliberate walking and a firm stop instead of coasting.
export let botasMagneticas = false;
export const definirBotasMagneticas = (ativas: boolean) => { botasMagneticas = ativas; };
export const BOTA_MAGNETICA = { velocidade: 3.2, aceleracao: 14, freio: 32 };
// tiles/s^2 at character scale. `let`: the world sets it (definirGravidade), and every module
// that imports G sees the new value (ES modules export live bindings).
export let G = G_LUA / METROS_POR_TILE_CORPO;
export const definirGravidade = (ms2: number) => { G = ms2 / METROS_POR_TILE_CORPO; };

export type Corpo = {
  x: number; y: number; z: number;     // tiles; z is the feet
  vx: number; vy: number; vz: number;  // tiles/s
  raio: number;                        // footprint radius, tiles
  noChao: boolean;
};

// A solid box standing on the ground (a module). x0..x1, y0..y1 in tiles, topo = roof height.
export type Caixa = { x0: number; y0: number; x1: number; y1: number; topo: number };

export type Chao = {
  altura(x: number, y: number): number;
  fatorVelocidade?(x: number, y: number): number;
  inclinacaoEm(x: number, y: number): number;
  readonly maxAndar: number;
  readonly n: number;
};

export type Entrada = { dx: number; dy: number; pular: boolean };   // dx, dy: wanted direction in map axes

export const AJUSTES = {
  velocidade: 3.2,       // tiles/s walking
  aceleracao: 14,        // tiles/s^2 on the ground
  controleNoAr: 0.15,    // fraction of ground control while airborne
  impulsoPulo: 2.2 / METROS_POR_TILE_CORPO,   // 2.2 m/s take-off speed
  colar: 0.12,           // tiles: walking down small drops stays on the ground
};

export const novoCorpo = (x: number, y: number, z: number, raio = 0.22): Corpo =>
  ({ x, y, z, vx: 0, vy: 0, vz: 0, raio, noChao: false });

// Ground under a point: the terrain, or a roof if the point is inside a box.
function chaoEm(c: Chao, caixas: Caixa[], x: number, y: number, z: number): number {
  let h = c.altura(x, y);
  for (const b of caixas) if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && z >= b.topo - 0.05) h = Math.max(h, b.topo);
  return h;
}

// Does a circle at (x, y) with feet at z hit any box side?
function bate(caixas: Caixa[], x: number, y: number, z: number, r: number): boolean {
  for (const b of caixas) {
    if (z >= b.topo - 0.05) continue;
    const px = Math.max(b.x0, Math.min(x, b.x1));
    const py = Math.max(b.y0, Math.min(y, b.y1));
    if ((x - px) ** 2 + (y - py) ** 2 < r * r) return true;
  }
  return false;
}

const esperaRecuperacao = new WeakMap<Corpo, number>();
function desprenderAstronauta(k: Corpo, c: Chao, caixas: Caixa[], dt: number) {
  const dentro = (x: number, y: number) => Number.isFinite(x) && Number.isFinite(y)
    && x >= k.raio && y >= k.raio && x <= c.n - k.raio && y <= c.n - k.raio;
  // Being on a roof is valid. Only recover actual penetration below its top.
  if (dentro(k.x, k.y) && !bate(caixas, k.x, k.y, k.z, k.raio)) {
    esperaRecuperacao.delete(k); return false;
  }
  k.vx = k.vy = k.vz = 0;
  const espera = Math.max(0, (esperaRecuperacao.get(k) ?? 0) - dt);
  if (espera > 0) { esperaRecuperacao.set(k, espera); return false; }
  esperaRecuperacao.set(k, 1);
  const livre = (x: number, y: number) => dentro(x, y)
    && c.inclinacaoEm(x, y) <= c.maxAndar && !bate(caixas, x, y, c.altura(x, y), k.raio);
  const destino = buscarSaida(k, c, caixas, livre);
  if (!destino) return false;
  k.x = destino.x; k.y = destino.y; k.z = c.altura(k.x, k.y); k.noChao = true;
  esperaRecuperacao.delete(k);
  return true;
}

// Can the body step from (x, y) to (nx, ny)? Blocked by boxes, map edges and slopes too steep
// to climb (going downhill is always allowed).
function podePassar(c: Chao, caixas: Caixa[], k: Corpo, nx: number, ny: number): boolean {
  if (nx < k.raio || ny < k.raio || nx > c.n - k.raio || ny > c.n - k.raio) return false;
  if (bate(caixas, nx, ny, k.z, k.raio)) return false;
  if (k.noChao && c.inclinacaoEm(nx, ny) > c.maxAndar && c.altura(nx, ny) > c.altura(k.x, k.y)) return false;
  return true;
}

// Advances one body by dt seconds. Returns what happened, for sounds and messages.
export function passo(k: Corpo, e: Entrada | null, c: Chao, caixas: Caixa[], dt: number): { pousou: boolean; bloqueado: boolean; recuperado: boolean } {
  // Recover slow frames with small collision steps, without repeating a jump on landing.
  if (dt > 1 / 30) {
    const tempo = Math.min(dt, 0.1), passos = Math.ceil(tempo * 60);
    let pousou = false, bloqueado = false;
    for (let i = 0; i < passos; i++) {
      const resultado = passo(k, i && e?.pular ? { ...e, pular: false } : e, c, caixas, tempo / passos);
      if (resultado.recuperado) return { pousou, bloqueado: true, recuperado: true };
      pousou ||= resultado.pousou; bloqueado ||= resultado.bloqueado;
    }
    return { pousou, bloqueado, recuperado: false };
  }
  if (desprenderAstronauta(k, c, caixas, dt)) return { pousou: false, bloqueado: true, recuperado: true };
  // Horizontal: steer toward the wanted velocity; little control in the air (no air on the Moon
  // to push against: once you jump, you mostly keep going).
  const len = e ? Math.hypot(e.dx, e.dy) : 0;
  const velocidade = (botasMagneticas ? BOTA_MAGNETICA.velocidade : AJUSTES.velocidade) * (k.noChao ? (c.fatorVelocidade?.(k.x, k.y) ?? 1) : 1);
  const wx = len > 0 ? (e!.dx / len) * velocidade : 0;
  const wy = len > 0 ? (e!.dy / len) * velocidade : 0;
  const aceleracao = botasMagneticas ? (len > 0 ? BOTA_MAGNETICA.aceleracao : BOTA_MAGNETICA.freio) : AJUSTES.aceleracao;
  const a = aceleracao * (k.noChao ? 1 : AJUSTES.controleNoAr) * dt;
  const ax = wx - k.vx, ay = wy - k.vy, al = Math.hypot(ax, ay);
  if (al > 0) { const f = Math.min(1, a / al); k.vx += ax * f; k.vy += ay * f; }
  if (e?.pular && k.noChao) { k.vz = AJUSTES.impulsoPulo; k.noChao = false; }

  // Vertical: gravity.
  k.vz -= G * dt;

  // Move each axis on its own, so a blocked body slides along walls.
  let bloqueado = false;
  const nx = k.x + k.vx * dt;
  if (podePassar(c, caixas, k, nx, k.y)) k.x = nx; else { k.vx = 0; bloqueado = true; }
  const ny = k.y + k.vy * dt;
  if (podePassar(c, caixas, k, k.x, ny)) k.y = ny; else { k.vy = 0; bloqueado = true; }

  const nz = k.z + k.vz * dt;
  const chao = chaoEm(c, caixas, k.x, k.y, k.z);
  let pousou = false;
  if (nz <= chao) {
    pousou = !k.noChao && k.vz < -0.05;
    k.z = chao; k.vz = 0; k.noChao = true;
  } else if (k.noChao && k.vz <= 0 && nz - chao < AJUSTES.colar) {
    k.z = chao; k.vz = 0;                       // walking downhill: stay on the ground
  } else {
    k.z = nz; k.noChao = false;
  }
  return { pousou, bloqueado, recuperado: false };
}

// Time in the air and peak height of a jump, for the "Moon vs Earth" fact.
export const pulo = (g: number, v0 = 2.2) => ({ altura: (v0 * v0) / (2 * g), tempo: (2 * v0) / g });
