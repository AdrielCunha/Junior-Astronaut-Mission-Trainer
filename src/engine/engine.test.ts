// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Engine checks: projection round trip, physics (gravity, landing, walls, slopes), building
// rules and the planet positions. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Terreno, type DadosTerreno } from './terreno.ts';
import { paraTela, paraChao, type Projecao } from './iso.ts';
import { passo, novoCorpo, G, G_LUA, G_TERRA, pulo } from './fisica.ts';
import { Grade, TIPOS, BASE_PADRAO, montarBasePadrao } from './construcao.ts';
import { posicao, PLANETAS, lua } from './astro.ts';
import { SUPRIMENTOS, empuxoDePouso } from './suprimentos.ts';
import { encontrarCaminho } from './caminho.ts';

const dados = JSON.parse(readFileSync(new URL('../dados/terreno.json', import.meta.url), 'utf8')) as DadosTerreno & { imagem: Projecao };
const real = new Terreno(dados);

// A flat 10 x 10 test map with one steep tile column at gx = 5.
const plano = (): Terreno => {
  const n = 10;
  const alturas = Array.from({ length: n + 1 }, () => Array.from({ length: n + 1 }, (_, gx) => (gx >= 6 ? 3 : 0)));
  const inclinacao = Array.from({ length: n }, () => Array.from({ length: n }, (_, gx) => (gx === 5 ? 40 : 0)));
  return new Terreno({ n, metrosPorTile: 80, inclinacaoMaxAndar: 20, inclinacaoMaxConstruir: 10, alturas, inclinacao });
};

test('pixel -> ground -> pixel lands on the same point of the real map', () => {
  for (const [gx, gy] of [[10.5, 20.25], [40, 3], [63, 63], [32, 32]]) {
    const z = real.altura(gx, gy);
    const s = paraTela(dados.imagem, gx, gy, z);
    const q = paraChao(dados.imagem, real, s.x, s.y);
    assert.ok(q, 'ground found');
    assert.ok(Math.abs(q.gx - gx) < 0.05 && Math.abs(q.gy - gy) < 0.05, `${gx},${gy} -> ${q.gx},${q.gy}`);
  }
});

test('a dropped body falls with lunar gravity and lands', () => {
  const t = plano();
  const k = novoCorpo(2, 2, 5);
  let tempo = 0;
  while (!k.noChao && tempo < 30) { passo(k, null, t, [], 1 / 120); tempo += 1 / 120; }
  assert.equal(k.z, 0);
  const esperado = Math.sqrt((2 * 5) / G);              // h = g t^2 / 2
  assert.ok(Math.abs(tempo - esperado) < 0.05, `fell in ${tempo.toFixed(2)} s, expected ${esperado.toFixed(2)} s`);
});

test('a Moon jump is about six times higher than on Earth', () => {
  const r = pulo(G_LUA).altura / pulo(G_TERRA).altura;
  assert.ok(r > 5.9 && r < 6.2, `ratio ${r}`);
});

test('a module is a wall; walking slides along it', () => {
  const t = plano();
  const k = novoCorpo(1, 2.5, 0); k.noChao = true;
  const caixa = [{ x0: 2, y0: 2, x1: 3, y1: 3, topo: 1 }];
  for (let i = 0; i < 240; i++) passo(k, { dx: 1, dy: 0, pular: false }, t, caixa, 1 / 60);
  assert.ok(k.x < 2 - k.raio + 0.01, `stopped at the wall, x = ${k.x}`);
});

test('too steep to climb, fine to walk down', () => {
  const t = plano();
  const k = novoCorpo(4.5, 5, 0); k.noChao = true;
  for (let i = 0; i < 240; i++) passo(k, { dx: 1, dy: 0, pular: false }, t, [], 1 / 60);
  assert.ok(k.x < 5, `blocked before the steep tile, x = ${k.x}`);
});

test('modules need flat, free ground, and some only once', () => {
  const t = plano();
  const g = new Grade(t);
  assert.equal(g.pode(TIPOS.oficina, 4, 0).motivo, 'ingreme');
  assert.ok(g.construir(TIPOS.oficina, 0, 0));
  assert.equal(g.pode(TIPOS.painel, 1, 1).motivo, 'ocupado');
  assert.equal(g.pode(TIPOS.oficina, 0, 5).motivo, 'unico');
  assert.equal(g.pode(TIPOS.painel, 9, 0).motivo, 'fora');
  assert.ok(g.em(2.5, 2.5));
});

test('the default base fits on the real map, every room within a short walk of the habitat', () => {
  const g = new Grade(real);
  const feitas = montarBasePadrao(g);
  assert.equal(feitas.length, BASE_PADRAO.length);
  const hab = feitas.find((c) => c.tipo.id === 'habitat')!;
  for (const c of feitas.filter((m) => m.tipo.sala)) {
    const d = Math.hypot(c.gx - hab.gx, c.gy - hab.gy);
    assert.ok(d < 12, `${c.tipo.nome} is ${d.toFixed(1)} tiles from the habitat`);
  }
});

test('the real map has room for every module', () => {
  const g = new Grade(real);
  for (const tipo of Object.values(TIPOS)) {
    const p = g.procurar(tipo, 32, 32);
    assert.ok(p, `${tipo.nome} fits`);
    g.construir(tipo, p.gx, p.gy);
  }
});

test('planets: Earth is opposite the Sun seen from the Moon on 8 May 2024 (new moon)', () => {
  const t = Date.parse('2024-05-08T03:22:00Z');
  const terra = posicao(PLANETAS[2], t);
  // The Sun's geocentric longitude is the Earth's heliocentric one + 180: about 48 deg that day.
  const sol = (terra.lon + 180) % 360;
  assert.ok(Math.abs(sol - 48) < 1.5, `sun at ${sol.toFixed(1)}`);
  assert.ok(Math.abs(terra.r - 1.009) < 0.005, `earth at ${terra.r.toFixed(4)} AU`);
  assert.ok(lua(t).fase < 0.01);
  const marte = posicao(PLANETAS[3], t);
  assert.ok(marte.r > 1.38 && marte.r < 1.67);
});

test('a cargo lander with only its engine to brake touches down softly', () => {
  let z = 14, vz = -3, t = 0, queimou = false;
  const dt = 1 / 120;
  while (z > 0 && t < 30) {
    const a = empuxoDePouso(z, vz, G);
    if (a > 0) queimou = true;
    vz += (a - G) * dt; z += vz * dt; t += dt;
  }
  assert.ok(queimou, 'the engine fired');
  assert.ok(vz > -0.6, `touchdown at ${vz.toFixed(2)} tiles/s`);
});

test('every supply drop fits next to the default base', () => {
  const g = new Grade(real);
  montarBasePadrao(g);
  for (const s of SUPRIMENTOS) assert.ok(g.procurar(TIPOS[s.tipo], 32, 32), s.tipo);
});

test('pathfinding routes around a module instead of walking into it', () => {
  const n = 10;
  const alturas = Array.from({ length: n + 1 }, () => Array.from({ length: n + 1 }, () => 0));
  const inclinacao = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
  const t = new Terreno({ n, metrosPorTile: 80, inclinacaoMaxAndar: 20, inclinacaoMaxConstruir: 10, alturas, inclinacao });

  // Place a 2x2 box right in the way between start (2, 5) and goal (8, 5)
  const caixa = [{ x0: 4.08, y0: 4.08, x1: 5.92, y1: 5.92, topo: 1 }];
  const caminho = encontrarCaminho(t, caixa, 0.22, 2, 5, 8, 5);
  assert.ok(caminho, 'a path exists');
  assert.ok(caminho.length >= 2, `path has at least 2 waypoints, got ${caminho.length}`);
  // End point reaches goal
  const fim = caminho[caminho.length - 1];
  assert.ok(Math.hypot(fim.gx - 8, fim.gy - 5) < 0.1, 'reaches the goal');
  // Every waypoint must be outside the box
  for (const p of caminho) {
    const inside = p.gx >= 4.08 && p.gx <= 5.92 && p.gy >= 4.08 && p.gy <= 5.92;
    assert.ok(!inside, `waypoint (${p.gx}, ${p.gy}) is inside the box`);
  }
});

test('pathfinding on the real map goes from the habitat to every room', () => {
  const g = new Grade(real);
  montarBasePadrao(g);
  const caixas = g.caixas();
  const hab = g.lista.find((c) => c.tipo.id === 'habitat')!;
  const hx = hab.gx + hab.tipo.w + 0.7, hy = hab.gy + hab.tipo.h / 2;
  for (const c of g.lista.filter((m) => m.tipo.sala)) {
    const destino = { gx: c.gx + c.tipo.w / 2, gy: c.gy + c.tipo.h + 0.6 };
    const caminho = encontrarCaminho(real, caixas, 0.22, hx, hy, destino.gx, destino.gy);
    assert.ok(caminho && caminho.length >= 1, `path from habitat to ${c.tipo.nome}`);
  }
});
