import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoCorpo, type Chao } from './fisica.ts';
import { dirigirRover, desprenderRover, desembarcar, estacionarRover, pontoLivre, RAIO_ROVER, type Rover } from './rover.ts';

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


test('a driver restored inside a building is pushed onto nearby ground and can drive away', () => {
  const r = rover(), body = r.corpo;
  const caixas = [{x0:4,y0:4,x1:6,y1:6,topo:4}];
  r.corpo.vx=6; r.corpo.vy=2; r.rodado=7;
  const elevado={...terreno,altura:(x:number,y:number)=>x*.01+y*.02};
  const result=dirigirRover(r,{dx:1,dy:0,pular:false},elevado,caixas,1/60);
  assert.equal(result.recuperado,true);assert.equal(result.bloqueado,true);
  assert.equal(r.corpo,body,'the player keeps the same body reference');
  assert.equal(r.dirigindo,true);assert.ok(pontoLivre(elevado,caixas,body.x,body.y,body.raio));
  assert.ok(Math.hypot(body.x-5,body.y-5)<1.8,'use a nearby side, not the map spawn');
  assert.equal(body.z,elevado.altura(body.x,body.y));assert.equal(body.noChao,true);
  assert.equal(body.vx,0);assert.equal(body.vy,0);assert.equal(body.vz,0);
  assert.equal(r.rodado,7,'a recovery is not distance driven');
  const start=body.x;
  for(let i=0;i<60;i++)dirigirRover(r,{dx:-1,dy:0,pular:false},elevado,caixas,1/60);
  assert.ok(body.x<start-.5,'normal controls work after recovery');
});

test('recovery checks adjacent buildings, boundaries and the complete footprint',()=>{
  const r=rover();r.corpo.x=.8;
  const caixas=[{x0:0,y0:4,x1:2,y1:6,topo:3},{x0:2,y0:4,x1:4,y1:6,topo:3},{x0:0,y0:2,x1:4,y1:4,topo:3}];
  assert.equal(dirigirRover(r,null,terreno,caixas,1/60).recuperado,true);
  assert.ok(pontoLivre(terreno,caixas,r.corpo.x,r.corpo.y,r.corpo.raio));
  const position={x:r.corpo.x,y:r.corpo.y};
  for(let i=0;i<60;i++)assert.equal(dirigirRover(r,null,terreno,caixas,1/60).recuperado,false);
  assert.equal(r.corpo.x,position.x);assert.equal(r.corpo.y,position.y);
});

test('a parked or unpowered rover recovers without requiring movement input',()=>{
  const caixas=[{x0:4,y0:4,x1:6,y1:6,topo:3}];
  const parked=rover();parked.dirigindo=false;
  assert.equal(desprenderRover(parked,terreno,caixas,1/60),true);
  assert.equal(parked.dirigindo,false);assert.ok(pontoLivre(terreno,caixas,parked.corpo.x,parked.corpo.y,RAIO_ROVER));
  const unpowered=rover();assert.equal(dirigirRover(unpowered,null,terreno,caixas,1/60).recuperado,true);
});

test('recovery can find ground when slopes block all projected building sides',()=>{
  const r=rover();
  const c={...terreno,inclinacaoEm:(x:number,y:number)=>x>=12&&x<=17&&y>=12&&y<=17?0:40};
  assert.equal(desprenderRover(r,c,[{x0:4,y0:4,x1:6,y1:6,topo:3}],1/60),true);
  assert.ok(pontoLivre(c,[],r.corpo.x,r.corpo.y,RAIO_ROVER));
});

test('an entirely blocked map stays finite and retries expensive recovery at most once a second',()=>{
  const r=rover(),caixas=[{x0:0,y0:0,x1:30,y1:30,topo:3}];
  let samples=0;
  const c={...terreno,inclinacaoEm:()=>{samples++;return 0;}};
  assert.equal(desprenderRover(r,c,caixas,1/60),false);
  samples=0;
  for(let i=0;i<20;i++)assert.equal(desprenderRover(r,c,caixas,1/60),false);
  assert.ok(samples<=100,'do not scan the map every frame when no exit exists');
  assert.deepEqual([r.corpo.x,r.corpo.y,r.corpo.z],[5,5,0]);
  for(let i=0;i<60;i++)desprenderRover(r,c,[{x0:4,y0:4,x1:6,y1:6,topo:3}],1/60);
  assert.ok(pontoLivre(c,[{x0:4,y0:4,x1:6,y1:6,topo:3}],r.corpo.x,r.corpo.y,RAIO_ROVER));
});
