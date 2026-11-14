// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarTarefaColapsoReator, avancar, resfriar, tarefaConcluida, progresso, META, MAX_PONTOS, TEMPERATURA_INICIAL } from './colapso-reator-tarefa.ts';

const semente = (n: number) => () => { n = (n * 16807) % 2147483647; return n / 2147483647; };

test('começa sem pontos, morno e sem progresso', () => {
  const t = criarTarefaColapsoReator();
  assert.equal(t.pontos.length, 0);
  assert.equal(t.temperatura, TEMPERATURA_INICIAL);
  assert.equal(progresso(t), 0);
  assert.equal(tarefaConcluida(t), false);
});

test('pontos quentes aparecem com o tempo, nunca mais que o máximo, dentro do círculo e sem se sobrepor', () => {
  const rnd = semente(4);
  let t = criarTarefaColapsoReator();
  for (let i = 0; i < 60; i++) {
    t = avancar(t, 0.2, rnd);
    assert.ok(t.pontos.length <= MAX_PONTOS);
    t = { ...t, temperatura: 0.3 };   // keep it from melting for this check
  }
  assert.ok(t.pontos.length > 0);
  for (const p of t.pontos) assert.ok(Math.hypot(p.x, p.y) <= 1);
  const ids = new Set(t.pontos.map((p) => p.id));
  assert.equal(ids.size, t.pontos.length);
});

test('com pontos ativos o núcleo esquenta', () => {
  let t = avancar(criarTarefaColapsoReator(), 1, semente(2));
  assert.ok(t.pontos.length >= 1);
  const antes = t.temperatura;
  t = avancar({ ...t, espera: 5 }, 1, semente(2));
  assert.ok(t.temperatura > antes);
});

test('tocar num ponto esfria e conta; tocar no vazio não muda nada', () => {
  let t = avancar(criarTarefaColapsoReator(), 1, semente(2));
  const p = t.pontos[0];
  const antes = t.temperatura;
  const n = resfriar(t, p.id);
  assert.equal(n.pontos.length, t.pontos.length - 1);
  assert.equal(n.resfriados, 1);
  assert.ok(n.temperatura < antes);
  assert.equal(resfriar(t, 999), t);
  assert.equal(t.resfriados, 0, 'the old state does not change');
});

test('superaquecer limpa os pontos, volta a 0.6 e tira um pouco de progresso, sem derrota', () => {
  let t = { ...criarTarefaColapsoReator(), resfriados: 5, temperatura: 0.999 };
  t = avancar({ ...t, pontos: [{ id: 1, x: 0, y: 0 }], espera: 9 }, 1);
  assert.equal(t.pontos.length, 0);
  assert.equal(t.temperatura, 0.6);
  assert.equal(t.resfriados, 2);
  assert.equal(t.alarmes, 1);
});

test('esfriar 10 pontos conclui', () => {
  let t = criarTarefaColapsoReator();
  const rnd = semente(8);
  let guarda = 0;
  while (!tarefaConcluida(t) && guarda++ < 2000) {
    t = avancar(t, 0.3, rnd);
    if (t.pontos.length) t = resfriar(t, t.pontos[0].id);
  }
  assert.equal(tarefaConcluida(t), true);
  assert.equal(t.resfriados, META);
  assert.equal(avancar(t, 1), t);
});
