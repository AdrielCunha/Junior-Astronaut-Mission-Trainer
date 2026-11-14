// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  criarDivisao, alternarSistema, consumoTotal, metaAtingida, rodadaAtual, divisaoConcluida,
  SISTEMAS, RODADAS, CAPACIDADE_MAXIMA, type TarefaDivisao, type IdSistema,
} from './desviar-energia-tarefa.ts';

function ligar(t: TarefaDivisao, ...ids: IdSistema[]) {
  let r = { tarefa: t, resultado: 'ignorado' as string };
  for (const id of ids) r = alternarSistema(r.tarefa, id);
  return r;
}

test('começa na primeira rodada, tudo desligado', () => {
  const t = criarDivisao();
  assert.equal(t.rodada, 0);
  assert.equal(consumoTotal(t), 0);
  assert.equal(divisaoConcluida(t), false);
});

test('há 5 sistemas, só o suporte de vida é essencial e toda meta o inclui', () => {
  assert.equal(SISTEMAS.length, 5);
  assert.deepEqual(SISTEMAS.filter((s) => s.essencial).map((s) => s.id), ['vida']);
  for (const r of RODADAS) {
    assert.ok(r.meta.includes('vida'));
    assert.ok(r.capacidade <= CAPACIDADE_MAXIMA);
  }
});

test('as 3 rodadas têm capacidades diferentes e cada meta cabe na bateria', () => {
  assert.equal(RODADAS.length, 3);
  assert.equal(new Set(RODADAS.map((r) => r.capacidade)).size, 3);
  for (const r of RODADAS) {
    const custo = r.meta.reduce((s, id) => s + SISTEMAS.find((x) => x.id === id)!.consumo, 0);
    assert.ok(custo <= r.capacidade);
  }
});

test('tocar liga e tocar de novo desliga', () => {
  const a = alternarSistema(criarDivisao(), 'luzes');
  assert.equal(a.resultado, 'ligou');
  assert.deepEqual(a.tarefa.ligados, ['luzes']);
  assert.equal(consumoTotal(a.tarefa), 2);
  const b = alternarSistema(a.tarefa, 'luzes');
  assert.equal(b.resultado, 'desligou');
  assert.deepEqual(b.tarefa.ligados, []);
});

test('estourar a capacidade desarma o disjuntor e reinicia a rodada', () => {
  const r = ligar(criarDivisao(), 'motor', 'aquecedor', 'luzes'); // 4 + 3 + 2 = 9 fits in 10
  assert.equal(r.resultado, 'ligou');
  const d = alternarSistema(r.tarefa, 'vida'); // 12 > 10
  assert.equal(d.resultado, 'desarmou');
  assert.deepEqual(d.tarefa.ligados, []);
  assert.equal(d.tarefa.desarmes, 1);
  assert.equal(d.tarefa.rodada, 0);
});

test('atingir a meta sem estourar passa para a próxima rodada', () => {
  const r = ligar(criarDivisao(), 'vida', 'comunicacao');
  assert.equal(r.resultado, 'rodada');
  assert.equal(r.tarefa.rodada, 1);
  assert.deepEqual(r.tarefa.ligados, []);
  assert.equal(rodadaAtual(r.tarefa).capacidade, 6);
});

test('na tempestade (6 unidades) ligar o motor antes estoura', () => {
  const t = ligar(criarDivisao(), 'vida', 'comunicacao').tarefa;
  const r = ligar(t, 'vida', 'motor'); // 3 + 4 = 7 > 6
  assert.equal(r.resultado, 'desarmou');
  assert.equal(r.tarefa.rodada, 1);
});

test('só ter a meta não basta se passar da capacidade (metaAtingida)', () => {
  const t: TarefaDivisao = { ...criarDivisao(), rodada: 1, ligados: ['vida', 'comunicacao', 'aquecedor'] };
  assert.equal(metaAtingida(t), false);
  assert.equal(metaAtingida({ ...t, ligados: ['vida', 'comunicacao'] }), true);
});

test('vencer as 3 rodadas conclui a tarefa e depois ignora toques', () => {
  let t = ligar(criarDivisao(), 'vida', 'comunicacao').tarefa;
  t = ligar(t, 'comunicacao', 'vida').tarefa;
  assert.equal(t.rodada, 2);
  const f = ligar(t, 'vida', 'comunicacao', 'luzes'); // 3 + 2 + 2 = 7
  assert.equal(f.resultado, 'concluida');
  assert.equal(divisaoConcluida(f.tarefa), true);
  assert.equal(alternarSistema(f.tarefa, 'motor').resultado, 'ignorado');
});

test('toque num sistema desconhecido não muda nada', () => {
  const t = criarDivisao();
  const r = alternarSistema(t, 'xyz' as IdSistema);
  assert.equal(r.tarefa, t);
  assert.equal(r.resultado, 'ignorado');
});
