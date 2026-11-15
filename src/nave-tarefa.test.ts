import test from 'node:test';
import assert from 'node:assert/strict';
import { criarTarefaNave, naveEmColisao, tarefaConcluida, moverAsteroides, distancia } from './nave-tarefa.ts';

test('the ship collides when it touches an asteroid', () => {
  const tarefa = criarTarefaNave();
  const a = tarefa.obstacles[0];
  assert.equal(naveEmColisao({ x: a.x, y: a.y }, tarefa), true);
});

test('the start and the destination begin free of asteroids', () => {
  const tarefa = criarTarefaNave();
  assert.equal(naveEmColisao(tarefa.start, tarefa), false);
  assert.equal(naveEmColisao(tarefa.end, tarefa), false);
});

test('the ship completes the route when it reaches the final planet', () => {
  const tarefa = criarTarefaNave();
  assert.equal(tarefaConcluida({ ...tarefa.end }, tarefa), true);
  assert.equal(tarefaConcluida({ ...tarefa.start }, tarefa), false);
});

test('the asteroids move, stay on the map and never enter the planets', () => {
  const tarefa = criarTarefaNave();
  const antes = tarefa.obstacles.map((o) => ({ x: o.x, y: o.y }));
  for (let i = 0; i < 6000; i++) {   // 100 s at 60 fps
    moverAsteroides(tarefa, 1 / 60);
    for (const o of tarefa.obstacles) {
      assert.ok(o.x >= o.r - 1e-6 && o.x <= tarefa.largura - o.r + 1e-6);
      assert.ok(o.y >= o.r - 1e-6 && o.y <= tarefa.altura - o.r + 1e-6);
      assert.ok(distancia(o, tarefa.start) >= tarefa.zonaPartida + o.r - 1e-6);
      assert.ok(distancia(o, tarefa.end) >= tarefa.alvoR + 30 + o.r - 1e-6);
    }
  }
  assert.ok(tarefa.obstacles.some((o, i) => distancia(o, antes[i]) > 1));
});
