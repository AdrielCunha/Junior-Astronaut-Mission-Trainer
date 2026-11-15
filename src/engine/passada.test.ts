import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CicloPassada } from './passada.ts';

for (const [mundo, ritmo, esperados] of [['Lua', 12, 6], ['Marte', 18, 9]] as const) {
  for (const fps of [20, 30, 60, 120]) {
    test(`${mundo}: contacts match displayed boot frames at ${fps} FPS`, () => {
      const ciclo = new CicloPassada();
      let anterior = 0, contatos = 0;
      for (let i = 0; i < fps * 2; i++) {
        const { coluna, contato } = ciclo.atualizar(1 / fps, ritmo, true, true, false);
        assert.equal(contato, coluna !== anterior && (coluna === 1 || coluna === 5));
        if (contato) contatos++;
        anterior = coluna;
      }
      assert.equal(contatos, esperados);
    });
  }
}

test('stop/start returns to a planted boot rather than sounding over a mid-swing pose', () => {
  const ciclo = new CicloPassada();
  ciclo.atualizar(0, 12, true, true, false);
  for (let i = 0; i < 4; i++) ciclo.atualizar(0.05, 12, true, true, false);
  assert.deepEqual(ciclo.atualizar(0.05, 12, false, true, false), { coluna: 0, contato: false });
  assert.deepEqual(ciclo.atualizar(0.05, 12, true, true, false), { coluna: 1, contato: true });
  assert.deepEqual(ciclo.atualizar(1 / 60, 12, true, true, false), { coluna: 1, contato: false });
});

test('jump and landing never add a walking sound over the landing effect', () => {
  const ciclo = new CicloPassada();
  ciclo.atualizar(0, 18, true, true, false);
  for (let i = 0; i < 60; i++) {
    assert.deepEqual(ciclo.atualizar(1 / 60, 18, false, false, false), { coluna: 3, contato: false });
  }
  assert.deepEqual(ciclo.atualizar(1 / 60, 18, true, true, true), { coluna: 1, contato: false });
  assert.equal(ciclo.atualizar(1 / 60, 18, true, true, false).contato, false);
  let contatos = 0;
  for (let i = 0; i < 13; i++) if (ciclo.atualizar(1 / 60, 18, true, true, false).contato) contatos++;
  assert.equal(contatos, 1);
});

test('scene pause/restart resets the walk and does not queue missed steps', () => {
  const ciclo = new CicloPassada();
  for (let i = 0; i < 6; i++) ciclo.atualizar(0.05, 12, true, true, false);
  ciclo.reiniciar();
  assert.deepEqual(ciclo.atualizar(5, 12, true, true, false), { coluna: 1, contato: true });
  assert.equal(ciclo.atualizar(5, 12, true, true, false).contato, false);
});
