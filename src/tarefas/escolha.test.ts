import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escolherEntre, CENAS_DA_SALA } from './escolha.ts';

const banco = [{ id: 'poeira-duto', sala: 'oxigenio' as const }, { id: 'escudo-sol', sala: 'blindagem' as const }];
const escolher = (sala: 'oxigenio' | 'blindagem' | 'meta', ultima?: string, sorte: () => number = Math.random) => escolherEntre(sala, ultima, banco, sorte);

const todas = (sala: 'oxigenio' | 'blindagem' | 'meta') => {
  const ids = new Set<string>();
  for (let i = 0; i < 200; i++) { const e = escolher(sala, undefined, () => i / 200); if (e) ids.add(e.id); }
  return ids;
};

test('every room gets tasks that match its job, and the Rocket Workshop is no longer empty', () => {
  assert.ok(todas('oxigenio').has('TrocarFiltroCo2Tarefa'));
  assert.ok(todas('oxigenio').has('poeira-duto'));
  assert.ok(todas('blindagem').has('FecharEscotilhasTarefa'));
  assert.ok(todas('blindagem').has('escudo-sol'));
  assert.deepEqual([...todas('meta')].sort(), [...CENAS_DA_SALA.meta!].sort());
});

test('a room never mixes in the tasks of another room', () => {
  for (const id of todas('oxigenio')) assert.ok(!CENAS_DA_SALA.blindagem!.includes(id) && !CENAS_DA_SALA.meta!.includes(id));
  for (const id of todas('meta')) assert.ok(!CENAS_DA_SALA.oxigenio!.includes(id));
});

test('the same task does not come twice in a row', () => {
  for (const sala of ['oxigenio', 'blindagem', 'meta'] as const) {
    for (const ultima of todas(sala)) for (let i = 0; i < 20; i++) assert.notEqual(escolher(sala, ultima, () => i / 20)!.id, ultima);
  }
});

test('the ship window task only comes on the ship, at the Engines', () => {
  const ids = (mundo?: string) => {
    const s = new Set<string>();
    for (let i = 0; i < 200; i++) { const e = escolherEntre('meta', undefined, banco, () => i / 200, mundo); if (e) s.add(e.id); }
    return s;
  };
  assert.ok(ids('nave').has('LimparJanelaTarefa'));
  assert.ok(!ids('lua').has('LimparJanelaTarefa'));
  assert.ok(!ids().has('LimparJanelaTarefa'));
});
