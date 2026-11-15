// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarHorta, regar, alternarLuz, passo, vasoFeliz, tudoCerto, tarefaConcluida, FAIXA_MIN, FAIXA_MAX, TEMPO_CRESCER } from './horta-tarefa.ts';

test('pots start dry and the light off', () => {
  const e = criarHorta(5);
  assert.equal(e.vasos.length, 3);
  assert.ok(e.vasos.every((v) => !vasoFeliz(v) && v.agua < FAIXA_MIN));
  assert.equal(e.luz, false);
  assert.deepEqual(criarHorta(5), criarHorta(5));
});

test('watering fills a pot up to the band; too much drips back to the band', () => {
  let e = criarHorta(1);
  while (!vasoFeliz(e.vasos[0])) e = regar(e, 0);
  assert.ok(vasoFeliz(e.vasos[0]));
  for (let i = 0; i < 5; i++) e = regar(e, 0);
  assert.ok(e.vasos[0].agua > FAIXA_MAX);
  for (let i = 0; i < 100; i++) e = passo(e, 0.1);
  assert.equal(e.vasos[0].agua, FAIXA_MAX);
});

test('the lettuce only grows with all pots happy AND the light on', () => {
  let e = criarHorta(2);
  for (let i = 0; i < 3; i++) while (!vasoFeliz(e.vasos[i])) e = regar(e, i);
  e = passo(e, 1);
  assert.equal(e.crescimento, 0);   // light still off
  e = alternarLuz(e);
  assert.ok(tudoCerto(e));
  let t = 0;
  while (!tarefaConcluida(e) && t < 30) { e = passo(e, 0.1); t += 0.1; }
  assert.ok(Math.abs(t - TEMPO_CRESCER) < 0.2);
  assert.deepEqual(regar(e, 0), e);
});
