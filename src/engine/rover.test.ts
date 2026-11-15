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

test('steering follows the same heading at 30, 60 and 120 FPS', () => {
  const angulos = [30,60,120].map(fps => {
    const r = rover(); r.corpo.vy = 6.4;
    for (let i=0;i<fps/5;i++) dirigirRover(r,{dx:0,dy:1,pular:false},terreno,[],1/fps);
    return r.angulo;
  });
  assert.ok(Math.abs(angulos[0]-angulos[1])<1e-10);
  assert.ok(Math.abs(angulos[1]-angulos[2])<1e-10);
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
