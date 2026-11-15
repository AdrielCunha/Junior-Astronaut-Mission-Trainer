import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import type Phaser from 'phaser';
import { prepararConclusaoTarefa, concluirTarefa, fecharTarefa, TEMPO_SUCESSO } from './conclusaoTarefa.ts';

function painel() {
  const events = new EventEmitter();
  const timers: { delay: number; callback: () => void; removido: boolean; remove: () => void }[] = [];
  let paradas = 0;
  const cena = {
    events,
    scene: { stop() { paradas++; events.emit('shutdown'); } },
    time: { delayedCall(delay: number, callback: () => void) {
      const timer = { delay, callback, removido: false, remove() { this.removido = true; } };
      timers.push(timer); return timer;
    } },
  } as unknown as Phaser.Scene;
  prepararConclusaoTarefa(cena);
  return { cena, events, timers, paradas: () => paradas };
}

test('success closes within 500 ms and delivers once even if the timer fires twice', () => {
  const p = painel(); let entregas = 0;
  concluirTarefa(p.cena, () => entregas++);
  concluirTarefa(p.cena, () => entregas++);
  assert.equal(p.timers.length, 1);
  assert.equal(p.timers[0].delay, TEMPO_SUCESSO);
  assert.ok(TEMPO_SUCESSO >= 300 && TEMPO_SUCESSO <= 500);
  p.timers[0].callback(); p.timers[0].callback(); fecharTarefa(p.cena);
  assert.equal(entregas, 1); assert.equal(p.paradas(), 1);
});

test('closing during success preserves the reward and cancels the timer', () => {
  const p = painel(); let entregas = 0;
  concluirTarefa(p.cena, () => entregas++);
  fecharTarefa(p.cena);
  assert.equal(entregas, 1); assert.equal(p.timers[0].removido, true);
  p.timers[0].callback();
  assert.equal(entregas, 1); assert.equal(p.paradas(), 1);
});

test('cancellation before success does not grant completion', () => {
  const p = painel(); let entregas = 0;
  fecharTarefa(p.cena);
  concluirTarefa(p.cena, () => entregas++);
  assert.equal(entregas, 0); assert.equal(p.timers.length, 0);
});

test('shutdown completes a confirmed success without stopping the scene recursively', () => {
  const p = painel(); let entregas = 0;
  concluirTarefa(p.cena, () => entregas++);
  p.events.emit('shutdown');
  assert.equal(entregas, 1); assert.equal(p.paradas(), 0);
  assert.equal(p.timers[0].removido, true);
});

test('reopening a scene gives a fresh guard and ignores callbacks from its previous run', () => {
  const p = painel(); let entregas = 0;
  concluirTarefa(p.cena, () => entregas++);
  p.events.emit('shutdown');
  prepararConclusaoTarefa(p.cena);
  concluirTarefa(p.cena, () => entregas++);
  p.timers[0].callback();
  assert.equal(entregas, 1); assert.equal(p.paradas(), 0);
  p.timers[1].callback();
  assert.equal(entregas, 2); assert.equal(p.paradas(), 1);
});
