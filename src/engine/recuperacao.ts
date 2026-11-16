import type { Corpo, Chao, Caixa } from './fisica.ts';

// Find free ground outside a newly appeared obstacle, checking every candidate against all solids.
export function buscarSaida(k: Pick<Corpo, 'x' | 'y' | 'raio'>, c: Chao, caixas: Caixa[], livre: (x: number, y: number) => boolean, ultimo?: { x: number; y: number }) {
  const margem = k.raio + 0.02;
  const x0 = Number.isFinite(k.x) ? k.x : c.n / 2;
  const y0 = Number.isFinite(k.y) ? k.y : c.n / 2;
  const limitar = (v: number) => Math.max(margem, Math.min(c.n - margem, v));
  const candidatos = [{ x: limitar(x0), y: limitar(y0) }];
  if (ultimo) candidatos.push(ultimo);
  for (const b of caixas) {
    // Try every side and corner against ALL solids, not just the containing box:
    // pushing through one wall must not put the driver in the next building.
    const xs = [b.x0 - margem, b.x1 + margem], ys = [b.y0 - margem, b.y1 + margem];
    for (const x of xs) candidatos.push({ x, y: limitar(y0) });
    for (const y of ys) candidatos.push({ x: limitar(x0), y });
    for (const x of xs) for (const y of ys) candidatos.push({ x, y });
  }
  const distancia = (p: { x: number; y: number }) => (p.x - x0) ** 2 + (p.y - y0) ** 2;
  const seguro = (p: { x: number; y: number }) => livre(p.x, p.y) && Number.isFinite(c.altura(p.x, p.y));
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
  return destino;
}
