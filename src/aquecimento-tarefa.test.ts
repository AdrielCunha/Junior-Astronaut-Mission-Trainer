// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarAquecimento, cobrir, frioRestante, temperaturaDentro, tarefaConcluida, NUM_FRIOS, COLUNAS, LINHAS, TEMP_FRIA, TEMP_BOA } from './aquecimento-tarefa.ts';

test('there are NUM_FRIOS different cold spots inside the wall', () => {
  for (let s = 0; s < 30; s++) {
    const e = criarAquecimento(s);
    assert.equal(new Set(e.frios).size, NUM_FRIOS);
    assert.ok(e.frios.every((i) => i >= 0 && i < COLUNAS * LINHAS));
  }
  assert.deepEqual(criarAquecimento(4), criarAquecimento(4));
});

test('a blanket on a warm spot or twice on the same spot changes nothing', () => {
  const e = criarAquecimento(2);
  const quente = [...Array(COLUNAS * LINHAS).keys()].find((i) => !e.frios.includes(i))!;
  assert.equal(cobrir(e, quente).r, 'quente');
  assert.deepEqual(cobrir(e, quente).e, e);
  const um = cobrir(e, e.frios[0]);
  assert.equal(um.r, 'coberto');
  assert.equal(cobrir(um.e, e.frios[0]).r, 'ja');
});

test('covering every cold spot warms the inside from the cold to 20 °C', () => {
  let e = criarAquecimento(7);
  assert.equal(temperaturaDentro(e), TEMP_FRIA);
  for (const i of e.frios) { assert.ok(!tarefaConcluida(e)); e = cobrir(e, i).e; }
  assert.equal(frioRestante(e), 0);
  assert.equal(temperaturaDentro(e), TEMP_BOA);
  assert.ok(tarefaConcluida(e));
});
