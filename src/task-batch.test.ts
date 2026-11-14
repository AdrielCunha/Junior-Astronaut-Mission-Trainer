import test from 'node:test';
import assert from 'node:assert/strict';
import { criarTarefaReator, alternarModulo, tarefaConcluida as reactorConcluida } from './reator-tarefa.ts';
import { criarTarefaDesviarEnergia, alternarRota, tarefaConcluida as energiaConcluida } from './desviar-energia-tarefa.ts';
import { criarTarefaFiacao, alternarPonto, tarefaConcluida as fiacaoConcluida } from './fiacao-tarefa.ts';
import { criarTarefaPotenciaMotor, ajustarNivel, tarefaConcluida as motorConcluida } from './potencia-motor-tarefa.ts';
import { criarTarefaDirecao, alternarDirecao, tarefaConcluida as direcaoConcluida } from './direcao-tarefa.ts';

test('reactor: all modules must be on to finish', () => {
  let tarefa = criarTarefaReator();
  for (const modulo of tarefa.modulos) tarefa = alternarModulo(tarefa, modulo.id);
  assert.equal(reactorConcluida(tarefa), true);
});

test('power: all routes must be active', () => {
  let tarefa = criarTarefaDesviarEnergia();
  for (const rota of tarefa.rotas) tarefa = alternarRota(tarefa, rota.id);
  assert.equal(energiaConcluida(tarefa), true);
});

test('wiring: all points must be fixed', () => {
  let tarefa = criarTarefaFiacao();
  for (const ponto of tarefa.pontos) tarefa = alternarPonto(tarefa, ponto.id);
  assert.equal(fiacaoConcluida(tarefa), true);
});

test('motor: all bars must reach level 2', () => {
  let tarefa = criarTarefaPotenciaMotor();
  for (const barra of tarefa.barras) tarefa = ajustarNivel(tarefa, barra.id, 2);
  assert.equal(motorConcluida(tarefa), true);
});

test('steering: north and east must align', () => {
  let tarefa = criarTarefaDirecao();
  tarefa = alternarDirecao(tarefa, 'norte');
  tarefa = alternarDirecao(tarefa, 'leste');
  assert.equal(direcaoConcluida(tarefa), true);
});
