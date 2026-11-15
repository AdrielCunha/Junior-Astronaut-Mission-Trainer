// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  criarTarefaIluminacao, girarPeca, conexoes, calcularEnergia, lampadasAcesas, tarefaConcluida, N, E, S, W,
  type TarefaIluminacao,
} from './iluminacao-tarefa.ts';

// Quarter turns needed to take a piece to a wanted rotation.
function girarAte(t: TarefaIluminacao, c: number, l: number, rot: number) {
  while (t.pecas[l * t.colunas + c].rot !== rot) t = girarPeca(t, c, l);
  return t;
}

function resolver(t: TarefaIluminacao) {
  t = girarAte(t, 0, 1, 0);
  t = girarAte(t, 1, 1, 1);
  t = girarAte(t, 1, 0, 1);
  for (const c of [2, 3, 4]) t = girarAte(t, c, 0, 0);
  t = girarAte(t, 1, 2, 0);
  for (const c of [2, 3, 4]) t = girarAte(t, c, 2, 0);
  return t;
}

test('connections rotate clockwise', () => {
  assert.equal(conexoes({ tipo: 'reta', rot: 0, fixa: false }), E | W);
  assert.equal(conexoes({ tipo: 'reta', rot: 1, fixa: false }), N | S);
  assert.equal(conexoes({ tipo: 'curva', rot: 1, fixa: false }), E | S);
  assert.equal(conexoes({ tipo: 'T', rot: 1, fixa: false }), W | N | S);
  assert.equal(conexoes({ tipo: 'T', rot: 4, fixa: false }), E | S | W);
});

test('everything starts off and the task is not complete', () => {
  const t = criarTarefaIluminacao();
  assert.equal(t.pecas.length, t.colunas * t.linhas);
  assert.equal(lampadasAcesas(t), 0);
  assert.equal(tarefaConcluida(t), false);
});

test('turning changes only the chosen piece and leaves the old state untouched', () => {
  const t = criarTarefaIluminacao();
  const g = girarPeca(t, 2, 1);
  assert.equal(g.pecas[7].rot, (t.pecas[7].rot + 1) % 4);
  assert.equal(g.pecas.filter((p, i) => p !== t.pecas[i]).length, 1);
  assert.equal(girarPeca(g, 2, 1).pecas[7].rot, (t.pecas[7].rot + 2) % 4);
  for (let i = 0; i < 4; i++) assert.ok(girarPeca(t, 0, 0).pecas[0].rot < 4);
  assert.equal(girarPeca(t, 9, 9), t);
});

test('only one connected branch lights one lamp', () => {
  let t = criarTarefaIluminacao();
  t = girarAte(t, 0, 1, 0);
  t = girarAte(t, 1, 1, 1);
  t = girarAte(t, 1, 0, 1);
  for (const c of [2, 3, 4]) t = girarAte(t, c, 0, 0);
  assert.equal(lampadasAcesas(t), 1);
  assert.deepEqual(calcularEnergia(t).lampadas, [true, false]);
  assert.equal(tarefaConcluida(t), false);
});

test('connecting the whole circuit lights both lamps and finishes', () => {
  const t = resolver(criarTarefaIluminacao());
  assert.deepEqual(calcularEnergia(t).lampadas, [true, true]);
  assert.equal(tarefaConcluida(t), true);
});

test('breaking a wire in the middle turns off whatever comes after', () => {
  const t = girarPeca(resolver(criarTarefaIluminacao()), 3, 2);
  assert.deepEqual(calcularEnergia(t).lampadas, [true, false]);
  assert.equal(tarefaConcluida(t), false);
});

test('fixed pieces do not turn', () => {
  const t = criarTarefaIluminacao();
  const f = { ...t, pecas: t.pecas.map((p, i) => (i === 0 ? { ...p, fixa: true } : p)) };
  assert.equal(girarPeca(f, 0, 0), f);
});
