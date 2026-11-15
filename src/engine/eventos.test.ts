import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alarmeDoDia, EVENTOS, chanceDoDia, chanceDaDemora, eventoPorDemora, DEMORA_MIN, DEMORA_MAX, haEventoHoje, esperaDoEvento, sortearEvento, ESPERA_MIN, ESPERA_MAX } from './eventos.ts';

test('there are no events on day 1, and the chance grows after calm days up to certain', () => {
  assert.equal(chanceDoDia(1, 0), 0);
  assert.equal(haEventoHoje(1, 5, () => 0), false);
  assert.equal(chanceDoDia(2, 0), 0.6);
  assert.ok(chanceDoDia(3, 1) > chanceDoDia(3, 0));
  assert.equal(chanceDoDia(4, 10), 1);
  assert.equal(haEventoHoje(2, 0, () => 0.59), true);
  assert.equal(haEventoHoje(2, 0, () => 0.61), false);
});

test('the wait before the event stays in its window', () => {
  assert.equal(esperaDoEvento(() => 0), ESPERA_MIN);
  assert.ok(esperaDoEvento(() => 0.999) <= ESPERA_MAX);
});

test('an event only happens at a module that is on the base (cargo items need to have landed)', () => {
  assert.equal(sortearEvento([], undefined, () => 0), undefined);
  for (let i = 0; i < 50; i++) assert.equal(sortearEvento(['antena'], undefined, () => i / 50)!.modulo, 'antena');
  const sem = new Set<string>();
  for (let i = 0; i < 100; i++) sem.add(sortearEvento(['estufa', 'rover'], undefined, () => i / 100)!.modulo);
  assert.deepEqual([...sem].sort(), ['estufa', 'rover']);
});

test('the radio task is fixed at the Comms Antenna, and every cargo item has an event', () => {
  const radio = EVENTOS.find((e) => e.id === 'radio')!;
  assert.equal(radio.modulo, 'antena');
  assert.equal(radio.cena, 'ComunicacoesTarefa');
  for (const tipo of ['antena', 'estufa', 'perfuratriz', 'rover'] as const) assert.ok(EVENTOS.some((e) => e.modulo === tipo), tipo);
});

test('heavier events come up more often, and the same one does not repeat in a row', () => {
  const cont: Record<string, number> = {};
  for (let i = 0; i < 1000; i++) { const e = sortearEvento(['antena'], undefined, () => i / 1000)!; cont[e.id] = (cont[e.id] ?? 0) + 1; }
  assert.ok(cont.radio > cont.dados);   // weights 3 and 2
  for (let i = 0; i < 50; i++) assert.notEqual(sortearEvento(['antena'], 'radio', () => i / 50)!.id, 'radio');
});

test('radiation alarms follow the real NASA days and send you to the Radiation Shield', () => {
  assert.equal(alarmeDoDia(1), undefined);   // day 1 is for learning
  assert.equal(alarmeDoDia(3), undefined);   // only small flares that day
  for (const dia of [2, 4, 5, 7]) {
    const a = alarmeDoDia(dia)!;
    assert.equal(a.modulo, 'blindagem'); assert.equal(a.alarme, true); assert.equal(a.efeito, 'radiacao');
    assert.ok(a.aviso.includes('{nasa}'));
  }
  // May 10: the Kp 9 geomagnetic storm jams the radio, so that day's alarm is at the antenna.
  assert.equal(alarmeDoDia(6)!.modulo, 'antena');
  assert.equal(alarmeDoDia(6)!.cena, 'ComunicacoesTarefa');
});

test('energy tasks come with the batteries, not as random events', () => {
  assert.ok(!EVENTOS.some((e) => e.cena === 'PaineisSolaresTarefa' || e.cena === 'DesviarEnergiaTarefa'));
});

test('staying long on the same day makes an event more and more likely, up to certain', () => {
  assert.equal(chanceDaDemora(1, 1000), 0);              // day 1 is for learning
  assert.equal(chanceDaDemora(3, DEMORA_MIN - 1), 0);    // a short calm is fine
  assert.ok(chanceDaDemora(3, DEMORA_MIN + 60) > chanceDaDemora(3, DEMORA_MIN + 10));
  assert.equal(chanceDaDemora(3, DEMORA_MAX), 1);
  assert.equal(eventoPorDemora(3, DEMORA_MAX, () => 0.999), true);
  assert.equal(eventoPorDemora(3, DEMORA_MIN, () => 0), false);
});
