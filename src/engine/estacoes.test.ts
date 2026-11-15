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

test('cargo landers bring equipment only to the Moon: never to the ship or to Mars', async () => {
  const { suprimentoDoMundo, SUPRIMENTOS: lista } = await import('./suprimentos.ts');
  for (const s of lista) {
    assert.equal(suprimentoDoMundo('lua', s.dia)?.tipo, s.tipo);
    assert.equal(suprimentoDoMundo('nave', s.dia), undefined, `day ${s.dia} on the ship`);
    assert.equal(suprimentoDoMundo('marte', s.dia), undefined, `day ${s.dia} on Mars`);
  }
});

test('every station but the battery charging has its own themed item, a real astronaut or accessory, and gives it only sometimes', async () => {
  const { itemDaEstacao, CHANCE_ITEM_ESTACAO } = await import('./estacoes.ts');
  const { ACESSORIOS } = await import('../dados/acessorios.ts');
  const { SKINS } = await import('../dados/skins.ts');
  assert.equal(ESTACOES_MODULO.rover.item, undefined);   // charging the rover's battery gives no prize
  const todas = [...Object.values(ESTACOES), ...Object.values(ESTACOES_MODULO)].filter((e) => e !== ESTACOES_MODULO.rover);
  for (const e of todas) {
    assert.ok(e.item, `${e.acao}: no item`);
    const existe = e.item!.tipo === 'skin' ? SKINS.some((s) => s.id === e.item!.id && s.premio) : ACESSORIOS.some((a) => a.id === e.item!.id);
    assert.ok(existe, `${e.acao}: unknown item ${e.item!.id}`);
  }
  const radio = ESTACOES.nave_radio;
  assert.deepEqual(itemDaEstacao(radio, () => false, () => CHANCE_ITEM_ESTACAO - 0.01), radio.item);   // lucky
  assert.equal(itemDaEstacao(radio, () => false, () => CHANCE_ITEM_ESTACAO), undefined);              // not this time
  assert.equal(itemDaEstacao(radio, () => true, () => 0), undefined);                                 // already owned
});
