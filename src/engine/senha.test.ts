import test from 'node:test';
import assert from 'node:assert/strict';
import { senhaDoEscudo, digitar, confereSenha, lugarDaSenha, DIGITOS_SENHA, EVENTO_SENHA } from './senha.ts';
import { alarmeDoDia } from './eventos.ts';

test('the code has 4 digits and is always the same for the same day', () => {
  const s = senhaDoEscudo(2, 'lua');
  assert.match(s, /^[1-9][0-9]{3}$/);
  assert.equal(senhaDoEscudo(2, 'lua'), s);
  assert.equal(s.length, DIGITOS_SENHA);
});

test('typing takes digits only, up to 4, and erases', () => {
  let d = '';
  for (const t of ['1', 'x', '2', '3', '4', '5']) d = digitar(d, t);
  assert.equal(d, '1234');
  assert.equal(digitar(d, 'apagar'), '123');
  assert.equal(digitar('', 'apagar'), '');
});

test('only the full right code opens', () => {
  const s = senhaDoEscudo(2, 'lua');
  assert.ok(confereSenha(s, s));
  assert.ok(!confereSenha(s.slice(0, 3), s));
  assert.ok(!confereSenha(s === '1111' ? '2222' : '1111', s));
});

test('only the day-2 alarm is the code task, at the Radiation Shield', () => {
  const a = alarmeDoDia(2)!;
  assert.equal(a.id, EVENTO_SENHA);
  assert.equal(a.modulo, 'blindagem');
  assert.equal(a.cena, 'SenhaEscudoTarefa');
  for (const dia of [4, 5, 6, 7]) assert.notEqual(alarmeDoDia(dia)?.cena, 'SenhaEscudoTarefa', `day ${dia}`);
});

test('the code is painted in a corner of the map, the farthest free one from the Shield', () => {
  const escudo = { gx: 40, gy: 40, w: 2, h: 2 };
  const p = lugarDaSenha(escudo, () => true, 128);
  assert.deepEqual(p, { gx: 118, gy: 118 });                       // the corner opposite the Shield
  const ocupado = (gx: number, gy: number) => !(gx > 110 && gy > 110);   // a module in that corner
  const q = lugarDaSenha(escudo, ocupado, 128);
  assert.ok(ocupado(Math.floor(q.gx), Math.floor(q.gy)));
  assert.ok([10, 118].includes(q.gx) && [10, 118].includes(q.gy), 'still a corner');
});
