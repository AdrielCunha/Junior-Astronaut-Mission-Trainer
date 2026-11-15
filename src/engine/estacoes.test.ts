// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { ESTACOES, ESTACOES_MODULO, estacaoDisponivel, textoEstacao, chaveModulo } from './estacoes.ts';
import { SUPRIMENTOS } from './suprimentos.ts';
import { EVENTOS } from './eventos.ts';

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

test('every piece of equipment that lands by cargo lander is a station, with a task other than its fix-it event', () => {
  for (const s of SUPRIMENTOS) {
    const e = ESTACOES_MODULO[s.tipo];
    assert.ok(e, s.tipo);
    for (const ev of EVENTOS.filter((x) => x.modulo === s.tipo)) assert.notEqual(ev.cena, e.cena, s.tipo);
  }
  assert.equal(ESTACOES_MODULO.estufa.cena, 'HortaTarefa');
  assert.ok(estacaoDisponivel(chaveModulo('estufa'), new Set(), 'dia'));
  assert.ok(!estacaoDisponivel(chaveModulo('estufa'), new Set([chaveModulo('estufa')]), 'dia'));
  assert.ok(!estacaoDisponivel(chaveModulo('habitat'), new Set(), 'dia'));
});
