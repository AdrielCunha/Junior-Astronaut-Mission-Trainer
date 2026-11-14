// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarTarefaEscotilhas, soltarTampa, escotilhasAbertas, protecao, tarefaConcluida } from './fechar-escotilhas-tarefa.ts';

test('começa com todas as escotilhas abertas e sem proteção', () => {
  const t = criarTarefaEscotilhas();
  assert.equal(t.escotilhas.length, 4);
  assert.equal(t.tampas.length, 4);
  assert.equal(escotilhasAbertas(t), 4);
  assert.equal(protecao(t), 0);
  assert.equal(tarefaConcluida(t), false);
});

test('cada tampa serve em exatamente uma escotilha, e as tampas estão fora de ordem', () => {
  const t = criarTarefaEscotilhas();
  assert.deepEqual(t.tampas.map((x) => x.id).sort(), [0, 1, 2, 3]);
  assert.notDeepEqual(t.tampas.map((x) => x.id), [0, 1, 2, 3]);
});

test('soltar a tampa certa sobre a escotilha fecha e não muda o estado antigo', () => {
  const t = criarTarefaEscotilhas();
  const e = t.escotilhas[1];
  const r = soltarTampa(t, 1, { x: e.x + 10, y: e.y - 5 });
  assert.equal(r.resultado, 'fechou');
  assert.equal(escotilhasAbertas(r.tarefa), 3);
  assert.equal(protecao(r.tarefa), 0.25);
  assert.equal(t.escotilhas[1].fechada, false);
});

test('soltar sobre a escotilha errada não fecha nada', () => {
  const t = criarTarefaEscotilhas();
  const e = t.escotilhas[2];
  const r = soltarTampa(t, 0, { x: e.x, y: e.y });
  assert.equal(r.resultado, 'errou');
  assert.equal(r.tarefa, t);
});

test('soltar longe de qualquer escotilha não faz nada', () => {
  const t = criarTarefaEscotilhas();
  const r = soltarTampa(t, 0, { x: 300, y: 250 });
  assert.equal(r.resultado, 'longe');
  assert.equal(r.tarefa, t);
});

test('tampa de uma escotilha já fechada é ignorada', () => {
  let t = criarTarefaEscotilhas();
  t = soltarTampa(t, 0, { x: t.escotilhas[0].x, y: t.escotilhas[0].y }).tarefa;
  assert.equal(soltarTampa(t, 0, { x: t.escotilhas[0].x, y: t.escotilhas[0].y }).resultado, 'ignorada');
  assert.equal(soltarTampa(t, 99, { x: 0, y: 0 }).resultado, 'ignorada');
});

test('fechar todas conclui a tarefa e a proteção chega a 1', () => {
  let t = criarTarefaEscotilhas();
  let antes = 0;
  for (const e of criarTarefaEscotilhas().escotilhas) {
    t = soltarTampa(t, e.id, { x: e.x, y: e.y }).tarefa;
    assert.ok(protecao(t) > antes);
    antes = protecao(t);
  }
  assert.equal(tarefaConcluida(t), true);
  assert.equal(protecao(t), 1);
});
