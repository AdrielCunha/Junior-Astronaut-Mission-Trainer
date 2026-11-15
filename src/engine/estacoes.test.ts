// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { ESTACOES, estacaoDisponivel, textoEstacao } from './estacoes.ts';

test('the cockpit, window, radio and garden are stations; other props are not', () => {
  for (const id of ['nave_cockpit', 'nave_janela', 'nave_radio', 'nave_plantas']) assert.ok(ESTACOES[id], id);
  assert.equal(ESTACOES.nave_beliche, undefined);
  assert.equal(textoEstacao('nave_beliche', new Set(), 'dia'), '');
});

test('a station works once a day, only while playing the day', () => {
  assert.ok(estacaoDisponivel('nave_cockpit', new Set(), 'dia'));
  assert.ok(!estacaoDisponivel('nave_cockpit', new Set(['nave_cockpit']), 'dia'));
  assert.ok(!estacaoDisponivel('nave_cockpit', new Set(), 'noite'));
  assert.equal(textoEstacao('nave_cockpit', new Set(), 'dia'), 'Press E: Steer the ship');
  assert.equal(textoEstacao('nave_cockpit', new Set(['nave_cockpit']), 'dia'), '✓ Done today');
});
