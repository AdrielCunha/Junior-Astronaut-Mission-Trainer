import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoCorpo, type Chao } from './fisica.ts';
import { dirigirRover, desembarcar, estacionarRover, pontoLivre, RAIO_ROVER, type Rover } from './rover.ts';

const terreno: Chao = { n: 30, maxAndar: 20, altura: () => 0, inclinacaoEm: () => 0 };
const rover = (): Rover => ({ corpo: { ...novoCorpo(5,5,0,RAIO_ROVER), noChao: true }, dirigindo: true, angulo: 0 });

test('rover accelerates, brakes and stays grounded even with jump pressed', () => {
  const r = rover();
  for (let i = 0; i < 120; i++) dirigirRover(r, { dx: 1, dy: 0, pular: true }, terreno, [], 1/120);
  assert.ok(r.corpo.x > 8 && r.corpo.vx > 6);
  assert.equal(r.corpo.z, 0); assert.equal(r.corpo.noChao, true);
  for (let i = 0; i < 120; i++) dirigirRover(r, null, terreno, [], 1/120);
  assert.equal(r.corpo.vx, 0);
});

test('rover cannot drive through walls or outside the map', () => {
  const r = rover();
  const caixas = [{ x0: 8, y0: 0, x1: 9, y1: 30, topo: 0.1 }];
  for (let i = 0; i < 300; i++) dirigirRover(r, { dx: 1, dy: 0, pular: false }, terreno, caixas, 0.05);
  assert.ok(r.corpo.x <= 8-RAIO_ROVER+1e-6);
  for (let i = 0; i < 300; i++) dirigirRover(r, { dx: -1, dy: 0, pular: false }, terreno, [], 0.05);
  assert.ok(r.corpo.x >= RAIO_ROVER);
});

test('diagonal driving has the same speed and steep terrain blocks the wheels', () => {
  const r = rover();
  for (let i = 0; i < 120; i++) dirigirRover(r, { dx: 1, dy: 1, pular: false }, terreno, [], 1/120);
  assert.ok(Math.abs(Math.hypot(r.corpo.vx,r.corpo.vy)-6.4)<1e-6);
  const inclinado = { ...terreno, inclinacaoEm: (x: number) => x >= 8 ? 40 : 0 };
  const s = rover();
  for (let i = 0; i < 300; i++) dirigirRover(s, { dx: 1, dy: 0, pular: false }, inclinado, [], 0.05);
  assert.ok(s.corpo.x+RAIO_ROVER < 8);
});

test('parking finds free ground and disembarking avoids walls and stops the vehicle', () => {
  const caixas = [{ x0: 6, y0: 0, x1: 7, y1: 30, topo: 3 }];
  const r = estacionarRover(terreno, caixas, 5,5)!;
  assert.ok(r); assert.ok(pontoLivre(terreno, caixas, r.corpo.x,r.corpo.y,RAIO_ROVER));
  r.dirigindo = true; r.corpo.vx = 4;
  const astronauta = desembarcar(r, terreno, caixas)!;
  assert.ok(astronauta); assert.ok(pontoLivre(terreno,caixas,astronauta.x,astronauta.y,astronauta.raio));
  assert.ok(Math.hypot(astronauta.x-r.corpo.x,astronauta.y-r.corpo.y)>1);
  assert.equal(r.dirigindo,false); assert.equal(r.corpo.vx,0);
});

test('no safe exit leaves the astronaut inside the rover', () => {
  const r = rover();
  assert.equal(desembarcar(r, terreno, [{x0:0,y0:0,x1:30,y1:30,topo:3}]),null);
  assert.equal(r.dirigindo,true);
});

// The flag route while driving: the A* uses the rover's own footprint test, so it never sends the
// rover through a gap only a walker fits (it used to, and the rover got stuck at the rim).
test('rover routes keep its whole footprint on free ground', async () => {
  const { encontrarCaminho, segmentoLivre } = await import('./caminho.ts');
  // A steep ridge across the map at x 10..11, with a 1 tile gap at y 14..15 and a 4 tile gap at y 22..26.
  const fenda = { ...terreno, n: 30, inclinacaoEm: (x: number, y: number) => (x >= 10 && x < 11 && !(y >= 14 && y < 15) && !(y >= 22 && y < 26) ? 40 : 0) };
  const t = fenda as unknown as Parameters<typeof encontrarCaminho>[0];
  const livre = (x: number, y: number) => pontoLivre(fenda, [], x, y, RAIO_ROVER);
  const rota = encontrarCaminho(t, [], RAIO_ROVER, 5, 14.5, 16, 14.5, livre);
  assert.ok(rota && rota.length > 1, 'the rover goes around through the wide gap');
  let x = 5, y = 14.5;
  for (const p of rota!) { assert.ok(segmentoLivre(t, [], RAIO_ROVER, x, y, p.gx, p.gy, livre)); x = p.gx; y = p.gy; }
  assert.ok(rota!.some((p) => p.gy > 20), 'through the 4 tile gap, not the 1 tile one');
});

test('a short input asks the rover for less speed (easing into a waypoint)', () => {
  const r = rover();
  for (let i = 0; i < 240; i++) dirigirRover(r, { dx: 0.5, dy: 0, pular: false }, terreno, [], 1/120);
  assert.ok(Math.abs(r.corpo.vx - 3.2) < 0.05);
});
