import { novoCorpo, type Corpo, type Caixa, type Chao, type Entrada } from './fisica.ts';

// rodado: tiles rolled so far (the wheels turn and the suspension bounces by it, desenharRover.ts).
export type Rover = { corpo: Corpo; dirigindo: boolean; angulo: number; rodado?: number };
export const RAIO_ROVER = 0.7;

export function pontoLivre(c: Chao, caixas: Caixa[], x: number, y: number, raio: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x < raio || y < raio || x > c.n - raio || y > c.n - raio) return false;
  // Sample the footprint as well as its center so wheels cannot cut across steep rims.
  for (const [dx, dy] of [[0, 0], [raio, 0], [-raio, 0], [0, raio], [0, -raio]]) {
    if (c.inclinacaoEm(x + dx, y + dy) > c.maxAndar) return false;
  }
  return !caixas.some(b => {
    const px = Math.max(b.x0, Math.min(x, b.x1));
    const py = Math.max(b.y0, Math.min(y, b.y1));
    return (x - px) ** 2 + (y - py) ** 2 < raio ** 2;
  });
}

// A restored save or a moved building can leave the vehicle inside a solid. Ordinary
// collision only rejects the next step, so recover before trying to drive again.
const recuperacoes = new WeakMap<Rover, { livre?: { x: number; y: number }; espera: number }>();
export function desprenderRover(r: Rover, c: Chao, caixas: Caixa[], dt: number) {
  const k = r.corpo;
  let estado = recuperacoes.get(r);
  if (!estado) recuperacoes.set(r, estado = { espera: 0 });
  if (pontoLivre(c, caixas, k.x, k.y, k.raio)) {
    estado.livre = { x: k.x, y: k.y }; estado.espera = 0;
    return false;
  }
  k.vx = k.vy = k.vz = 0;
  estado.espera = Math.max(0, estado.espera - Math.max(0, dt));
  if (estado.espera > 0) return false;
  // An entirely blocked map must not trigger a full search on every frame.
  estado.espera = 1;
  const margem = k.raio + 0.02;
  const x0 = Number.isFinite(k.x) ? k.x : c.n / 2;
  const y0 = Number.isFinite(k.y) ? k.y : c.n / 2;
  const limitar = (v: number) => Math.max(margem, Math.min(c.n - margem, v));
  const candidatos = [{ x: limitar(x0), y: limitar(y0) }];
  if (estado.livre) candidatos.push(estado.livre);
  for (const b of caixas) {
    // Try every side and corner against ALL solids, not just the containing box:
    // pushing through one wall must not put the driver in the next building.
    const xs = [b.x0 - margem, b.x1 + margem], ys = [b.y0 - margem, b.y1 + margem];
    for (const x of xs) candidatos.push({ x, y: limitar(y0) });
    for (const y of ys) candidatos.push({ x: limitar(x0), y });
    for (const x of xs) for (const y of ys) candidatos.push({ x, y });
  }
  const distancia = (p: { x: number; y: number }) => (p.x - x0) ** 2 + (p.y - y0) ** 2;
  const seguro = (p: { x: number; y: number }) => pontoLivre(c, caixas, p.x, p.y, k.raio) && Number.isFinite(c.altura(p.x, p.y));
  candidatos.sort((a, b) => distancia(a) - distancia(b));
  let destino = candidatos.find(seguro);
  if (!destino) {
    // Slopes or several overlapping obstacles may rule out their projected sides.
    // Search the bounded map, keeping the nearest valid full vehicle footprint.
    let menor = Infinity;
    for (let x = margem; x <= c.n - margem; x += 0.25) {
      for (let y = margem; y <= c.n - margem; y += 0.25) {
        const p = { x, y }, d = distancia(p);
        if (d < menor && seguro(p)) { destino = p; menor = d; }
      }
    }
  }
  if (!destino) return false;
  k.x = destino.x; k.y = destino.y; k.z = c.altura(k.x, k.y); k.noChao = true;
  estado.livre = destino; estado.espera = 0;
  return true;
}

export function estacionarRover(c: Chao, caixas: Caixa[], x: number, y: number): Rover | null {
  for (let r = 1.5; r < 15; r += 0.75) {
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (!pontoLivre(c, caixas, px, py, RAIO_ROVER + 0.2)) continue;
      const corpo = novoCorpo(px, py, c.altura(px, py), RAIO_ROVER);
      corpo.noChao = true;
      return { corpo, dirigindo: false, angulo: Math.PI / 4 };
    }
  }
  return null;
}

// Ground vehicle: acceleration, braking, sliding along walls and small collision steps.
// It stays on the terrain and cannot jump or use a roof as a shortcut.
export function dirigirRover(r: Rover, e: Entrada | null, c: Chao, caixas: Caixa[], dt: number) {
  const k = r.corpo, tempo = Math.max(0, Math.min(0.05, dt));
  if (desprenderRover(r, c, caixas, tempo)) return { bloqueado: true, recuperado: true };
  const len = e ? Math.hypot(e.dx, e.dy) : 0;
  const velocidade = 6.4 * (c.fatorVelocidade?.(k.x, k.y) ?? 1);
  // A short input (the route easing into a waypoint, Superficie) asks for less speed; keys are >= 1.
  const pedido = velocidade * Math.min(1, len);
  const vx = len ? e!.dx / len * pedido : 0, vy = len ? e!.dy / len * pedido : 0;
  const ax = vx - k.vx, ay = vy - k.vy, dist = Math.hypot(ax, ay);
  const fator = dist ? Math.min(1, (len ? 9 : 18) * tempo / dist) : 0;
  k.vx += ax * fator; k.vy += ay * fator;
  if (Math.hypot(k.vx, k.vy) > 0.1) {
    const alvo = Math.atan2(k.vy, k.vx);
    const delta = Math.atan2(Math.sin(alvo - r.angulo), Math.cos(alvo - r.angulo));
    r.angulo += delta * (1 - Math.pow(1 - 10 / 60, tempo * 60));
  }
  const x0 = k.x, y0 = k.y;
  const passos = Math.max(1, Math.ceil(Math.hypot(k.vx, k.vy) * tempo / 0.1));
  let bloqueado = false;
  for (let i = 0; i < passos; i++) {
    const nx = k.x + k.vx * tempo / passos;
    if (pontoLivre(c, caixas, nx, k.y, k.raio)) k.x = nx;
    else { k.vx = 0; bloqueado = true; }
    const ny = k.y + k.vy * tempo / passos;
    if (pontoLivre(c, caixas, k.x, ny, k.raio)) k.y = ny;
    else { k.vy = 0; bloqueado = true; }
  }
  k.z = c.altura(k.x, k.y); k.vz = 0; k.noChao = true;
  r.rodado = (r.rodado ?? 0) + Math.hypot(k.x - x0, k.y - y0);
  return { bloqueado, recuperado: false };
}

export function desembarcar(r: Rover, c: Chao, caixas: Caixa[]): Corpo | null {
  for (const distancia of [1.25, 1.65, 2]) {
    for (let i = 0; i < 8; i++) {
      const a = r.angulo + Math.PI / 2 + i * Math.PI / 4;
      const x = r.corpo.x + Math.cos(a) * distancia, y = r.corpo.y + Math.sin(a) * distancia;
      if (!pontoLivre(c, caixas, x, y, 0.25)) continue;
      const k = novoCorpo(x, y, c.altura(x, y)); k.noChao = true;
      r.corpo.vx = r.corpo.vy = 0;
      r.dirigindo = false;
      return k;
    }
  }
  return null;
}
