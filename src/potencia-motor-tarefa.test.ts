// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarMotorAjuste, moverControle, controleNaZona, controlesNaZona, todosNaZona, avancarEstabilidade, estabilidade, motorAjustado, potenciaMedia, type MotorAjuste } from './potencia-motor-tarefa.ts';

const noMeio = (t: MotorAjuste) => t.controles.reduce((a, c) => moverControle(a, c.id, (c.zonaMin + c.zonaMax) / 2), t);

test('the engine starts outside the zones with no stability', () => {
  const t = criarMotorAjuste();
  assert.equal(controlesNaZona(t), 0);
  assert.equal(estabilidade(t), 0);
  assert.equal(motorAjustado(t), false);
});

test('moving the lever clamps the value between 0 and 1 without changing the old state', () => {
  const t = criarMotorAjuste();
  assert.equal(moverControle(t, 'turbo', 5).controles[0].valor, 1);
  assert.equal(moverControle(t, 'turbo', -2).controles[0].valor, 0);
  assert.equal(t.controles[0].valor, 0.1);
});

test('a lever in the middle of the green band counts as inside the zone', () => {
  const t = moverControle(criarMotorAjuste(), 'turbo', 0.7);
  assert.equal(controleNaZona(t.controles[0]), true);
  assert.equal(controlesNaZona(t), 1);
  assert.equal(todosNaZona(t), false);
});

test('stability only rises with all three levers in the zone and finishes after holding long enough', () => {
  let t = criarMotorAjuste();
  assert.equal(avancarEstabilidade(t, 1), t);
  t = noMeio(t);
  assert.equal(todosNaZona(t), true);
  t = avancarEstabilidade(t, 0.75);
  assert.equal(estabilidade(t), 0.5);
  assert.equal(motorAjustado(t), false);
  t = avancarEstabilidade(t, 5);
  assert.equal(estabilidade(t), 1);
  assert.equal(motorAjustado(t), true);
});

test('leaving the zone only drains stability slowly, not all at once', () => {
  let t = avancarEstabilidade(noMeio(criarMotorAjuste()), 1);
  t = moverControle(t, 'turbo', 0);
  const depois = avancarEstabilidade(t, 0.5);
  assert.ok(depois.estavel < t.estavel && depois.estavel > 0);
  assert.equal(avancarEstabilidade(t, 100).estavel, 0);
});

test('the average power stays between 0 and 1', () => {
  const t = criarMotorAjuste();
  assert.ok(potenciaMedia(t) > 0 && potenciaMedia(t) < 1);
  const topo = t.controles.reduce((a, c) => moverControle(a, c.id, 1), t);
  assert.equal(potenciaMedia(topo), 1);
});
