import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { mostrarContadoresHud } from './visibilidadeHud.ts';

test('mobile counters hide during flights and planet views and return after landing', () => {
  for (const mundo of ['lua', 'marte']) {
    assert.equal(mostrarContadoresHud(true, mundo, 'dia', 'chao', null, null), true);
    assert.equal(mostrarContadoresHud(true, mundo, 'dia', 'chao', { destino: 'lua' }, null), false);
    assert.equal(mostrarContadoresHud(true, mundo, 'dia', 'lua', null, null), false);
    assert.equal(mostrarContadoresHud(true, mundo, 'dia', 'sistema', null, null), false);
    assert.equal(mostrarContadoresHud(true, mundo, 'dia', 'lua', { destino: 'chao' }, null), false);
    assert.equal(mostrarContadoresHud(true, mundo, 'dia', 'chao', null, { destino: 'lua' }), false);
    assert.equal(mostrarContadoresHud(true, mundo, 'dia', 'lua', null, { destino: 'chao' }), false);
    assert.equal(mostrarContadoresHud(true, mundo, 'dia', 'chao', null, null), true);
  }
});

test('desktop, ship and non-day phases retain their existing behavior', () => {
  assert.equal(mostrarContadoresHud(false, 'lua', 'dia', 'lua', null, null), true);
  assert.equal(mostrarContadoresHud(true, 'nave', 'dia', 'sistema', null, null), true);
  assert.equal(mostrarContadoresHud(true, 'lua', 'inicio', 'chao', null, null), false);
});
