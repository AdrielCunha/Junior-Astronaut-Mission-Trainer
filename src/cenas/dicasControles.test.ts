import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PreferenciaDicas, CHAVE_DICAS } from './dicasControles.ts';
const memoria = () => {
  const dados = new Map<string, string>();
  return { getItem: (k: string) => dados.get(k) ?? null, setItem: (k: string, v: string) => { dados.set(k, v); } };
};
test('hints default to open on desktop and collapsed on narrow screens', () => {
  assert.equal(new PreferenciaDicas(null).inicial(false), false);
  assert.equal(new PreferenciaDicas(null).inicial(true), true);
});
test('both user choices survive reload, and a resize retains the current state', () => {
  const storage = memoria(), p = new PreferenciaDicas(storage);
  p.inicial(false); p.definir(true);
  assert.equal(p.inicial(false), true);
  assert.equal(new PreferenciaDicas(storage).inicial(false), true);
  p.definir(false);
  assert.equal(new PreferenciaDicas(storage).inicial(true), false);
  assert.equal(storage.getItem(CHAVE_DICAS), '0');
});
test('storage access failures never prevent opening or collapsing hints', () => {
  const p = new PreferenciaDicas({ getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } });
  assert.equal(p.inicial(false), false);
  assert.doesNotThrow(() => p.definir(true));
  assert.equal(p.inicial(false), true);
});
test('auto-hide fires once at twelve seconds, retaining time across layout rebuilds', () => {
  const p = new PreferenciaDicas(null); p.inicial(false);
  assert.equal(p.passo(6000), false); p.inicial(true);
  assert.equal(p.passo(5999), false);
  assert.equal(p.passo(1), true);
  assert.equal(p.passo(12000), false);
});
test('both movement and jump are needed for early auto-hide, in either order', () => {
  for (const ordem of [['movimento', 'pulo'], ['pulo', 'movimento']] as const) {
    const p = new PreferenciaDicas(null); p.inicial(false);
    assert.equal(p.usar(ordem[0]), false);
    assert.equal(p.usar(ordem[0]), false);
    assert.equal(p.usar(ordem[1]), true);
  }
});
test('manual expansion prevents every subsequent automatic collapse in the session', () => {
  const p = new PreferenciaDicas(null); p.inicial(false);
  p.definir(true); p.definir(false);
  assert.equal(p.passo(12000), false);
  assert.equal(p.usar('movimento'), false);
  assert.equal(p.usar('pulo'), false);
  p.inicial(true);
  assert.equal(p.passo(12000), false);
  assert.equal(p.inicial(true), false);
});
