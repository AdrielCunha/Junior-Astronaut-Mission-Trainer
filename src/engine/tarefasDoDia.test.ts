import test from 'node:test';
import assert from 'node:assert/strict';
import { salasComTarefaHoje } from './tarefasDoDia.ts';
import type { Efeito } from '../regras.ts';

const lua: Efeito[] = ['oxigenio', 'blindagem', 'meta'];
const marte: Efeito[] = ['oxigenio', 'blindagem', 'meta', 'aquecimento'];

test('day 1 teaches the basics: every room has a task', () => {
  assert.deepEqual(salasComTarefaHoje(1, 'lua', lua), ['blindagem', 'meta', 'oxigenio']);
});

test('from day 2 only some rooms have a task, never all and never none', () => {
  for (let dia = 2; dia <= 9; dia++) {
    for (const [mundo, salas] of [['lua', lua], ['marte', marte]] as const) {
      const r = salasComTarefaHoje(dia, mundo, salas);
      assert.ok(r.length >= 1 && r.length < salas.length, `day ${dia} ${mundo}: ${r.join(',')}`);
      assert.ok(r.every((s) => salas.includes(s)));
    }
  }
});

test('the rooms change from one day to the next', () => {
  const conjuntos = new Set<string>();
  for (let dia = 2; dia <= 9; dia++) conjuntos.add(salasComTarefaHoje(dia, 'lua', lua).join('+'));
  assert.ok(conjuntos.size >= 3, `only ${conjuntos.size} different sets in 8 days`);
});

test('the same day always gives the same rooms (reload safe)', () => {
  assert.deepEqual(salasComTarefaHoje(5, 'marte', marte), salasComTarefaHoje(5, 'marte', marte));
});

test('every room gets a task on some day', () => {
  const vistas = new Set<string>();
  for (let dia = 2; dia <= 9; dia++) salasComTarefaHoje(dia, 'lua', lua).forEach((s) => vistas.add(s));
  assert.equal(vistas.size, lua.length);
});

test('a single room always has its task', () => {
  assert.deepEqual(salasComTarefaHoje(4, 'lua', ['meta']), ['meta']);
});
