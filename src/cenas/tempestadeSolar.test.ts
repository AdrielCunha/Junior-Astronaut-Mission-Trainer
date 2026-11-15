import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DANO_POR_BATERIAS, PRAZO_TEMPESTADE_MS, TempestadeSolar, danoDaTempestade } from './tempestadeSolar.ts';

test('storm damage falls as batteries are delivered and reaches zero at full protection', () => {
  assert.deepEqual([0, 1, 2, 3].map(danoDaTempestade), [45, 35, 20, 0]);
});

test('storm damage clamps out-of-range battery counts', () => {
  assert.equal(danoDaTempestade(-1), DANO_POR_BATERIAS[0]);
  assert.equal(danoDaTempestade(2.9), 20);
  assert.equal(danoDaTempestade(99), 0);
});

test('only an extreme storm starts the warning', () => {
  const leve = new TempestadeSolar();
  leve.iniciar(2);
  assert.equal(leve.status, 'inativa');
  const extrema = new TempestadeSolar();
  extrema.iniciar(3);
  assert.equal(extrema.status, 'alerta');
});

test('three batteries protect the shield before the deadline ends', () => {
  const t = new TempestadeSolar();
  t.iniciar(3);
  assert.equal(t.passo(1000, 3, 3), 'protegida');
  assert.equal(t.status, 'protegida');
  assert.equal(t.passo(PRAZO_TEMPESTADE_MS, 0, 3), null);
});

test('partial protection still hits when the deadline runs out', () => {
  const t = new TempestadeSolar();
  t.iniciar(3);
  assert.equal(t.passo(PRAZO_TEMPESTADE_MS - 1, 2, 3), null);
  assert.equal(t.restante, 1);
  assert.equal(t.passo(1, 2, 3), 'atingida');
  assert.equal(t.status, 'atingida');
});

test('the deadline keeps the emergency tense for children without going negative', () => {
  assert.equal(PRAZO_TEMPESTADE_MS, 45_000);
  const t = new TempestadeSolar();
  t.iniciar(3);
  t.passo(PRAZO_TEMPESTADE_MS * 2, 0, 3);
  assert.equal(t.restante, 0);
});
