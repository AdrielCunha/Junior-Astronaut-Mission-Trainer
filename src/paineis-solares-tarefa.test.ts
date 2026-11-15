// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarPaineis, limparPoeira, inclinarPainel, potenciaPainel, painelPronto, potenciaTotal, tarefaConcluida } from './paineis-solares-tarefa.ts';

const limparTudo = (e: ReturnType<typeof criarPaineis>) => e.paineis.reduce((s, _p, i) => limparPoeira(s, i, 1), e);

test('starts dusty, in the cleaning phase, with no panel ready', () => {
  const e = criarPaineis(1);
  assert.equal(e.paineis.length, 3);
  assert.equal(e.fase, 'limpar');
  assert.ok(e.paineis.every((p) => p.poeira === 1 && !painelPronto(p, e.anguloSol)));
  assert.equal(potenciaTotal(e), 0);
});

test('the same seed gives the same Sun angle and panels', () => {
  assert.deepEqual(criarPaineis(7), criarPaineis(7));
});

test('wiping clamps dust at 0 and never goes negative', () => {
  const e = limparPoeira(criarPaineis(1), 0, 5);
  assert.equal(e.paineis[0].poeira, 0);
  assert.equal(limparPoeira(e, 0, 1).paineis[0].poeira, 0);
});

test('a panel with 10% dust or less snaps clean; more dust does not', () => {
  assert.equal(limparPoeira(criarPaineis(1), 0, 0.92).paineis[0].poeira, 0);
  assert.ok(limparPoeira(criarPaineis(1), 0, 0.5).paineis[0].poeira > 0.4);
});

test('power is 0 when fully dusty or facing away, and 1 when clean and aligned', () => {
  assert.equal(potenciaPainel({ poeira: 1, angulo: 30 }, 30), 0);
  assert.equal(potenciaPainel({ poeira: 0, angulo: -90 }, 90), 0);
  assert.equal(potenciaPainel({ poeira: 0, angulo: 30 }, 30), 1);
});

test('tilting is blocked until every panel is clean', () => {
  const e = criarPaineis(1);
  assert.equal(inclinarPainel(e, 0, 10), e);
  const meio = limparPoeira(e, 0, 1);
  assert.equal(meio.fase, 'limpar');
  assert.equal(inclinarPainel(meio, 0, 10), meio);
});

test('cleaning all panels moves to the tilt phase, and tilt angles are clamped', () => {
  const e = limparTudo(criarPaineis(1));
  assert.equal(e.fase, 'inclinar');
  assert.equal(inclinarPainel(e, 0, 500).paineis[0].angulo, 90);
  assert.equal(inclinarPainel(e, 0, -500).paineis[0].angulo, -90);
});

test('the task finishes only when all 3 panels face the Sun', () => {
  let e = limparTudo(criarPaineis(1));
  e = inclinarPainel(e, 0, e.anguloSol);
  e = inclinarPainel(e, 1, e.anguloSol);
  assert.equal(tarefaConcluida(e), false);
  e = inclinarPainel(e, 2, e.anguloSol + 10);
  assert.equal(tarefaConcluida(e), true);
  assert.equal(e.fase, 'pronto');
});

test('a panel tilted away again drops the task back to the tilt phase', () => {
  let e = limparTudo(criarPaineis(1));
  for (let i = 0; i < 3; i++) e = inclinarPainel(e, i, e.anguloSol);
  assert.equal(e.fase, 'pronto');
  e = inclinarPainel(e, 1, e.anguloSol + 60);
  assert.equal(e.fase, 'inclinar');
});
