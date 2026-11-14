// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Run: npm test (Node 24 runs TypeScript directly).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import lua from './dados/lua.json' with { type: 'json' };
import { estadoInicial, fimDoDia, resultado, bateriasDoDia, type Alocacao, type Estado } from './regras.ts';

const niveis = lua.dias.map((d) => d.nivel);

// plano: what the player does on day i, given the state that morning.
function jogar(plano: (e: Estado, i: number) => Alocacao) {
  let e = estadoInicial();
  for (let i = 0; i < niveis.length; i++) {
    const a = plano(e, i);
    assert.ok(a.suporte + a.blindagem + a.oficina <= bateriasDoDia(e), `day ${i + 1}: too many batteries`);
    e = fimDoDia(e, a, { nivel: niveis[i] });
    if (resultado(e)) return { e, r: resultado(e) };
  }
  return { e, r: resultado(e) };
}

test('end of day applies the GDD formulas', () => {
  const e = fimDoDia(estadoInicial(), { suporte: 2, blindagem: 1, oficina: 2 }, { nivel: 3 });
  assert.deepEqual(e, { dia: 2, oxigenio: 70, dose: 31, meta: 8 });
});

test('a careful plan with the real May 2024 storm wins', () => {
  const p = (suporte: number, blindagem: number, oficina: number) => ({ suporte, blindagem, oficina });
  const plano = [p(0, 0, 5), p(0, 0, 5), p(1, 0, 4), p(1, 0, 4), p(1, 1, 3), p(0, 2, 3), p(0, 3, 2), p(0, 2, 3)];
  const { r, e } = jogar((_, i) => plano[i]);
  assert.equal(r, 'vitoria');
  assert.ok(e.dose < 25, 'nobody in the infirmary');
});

test('ignoring the shield during the storm sends the crew home', () => {
  const { r } = jogar((e) => ({ suporte: 1, blindagem: 0, oficina: bateriasDoDia(e) - 1 }));
  assert.equal(r, 'radiacao');
});

test('building only the rocket runs out of oxygen', () => {
  const { r } = jogar((e) => ({ suporte: 0, blindagem: 0, oficina: bateriasDoDia(e) }));
  assert.equal(r, 'sem-oxigenio');
});

test('every battery to the shield never finishes the rocket', () => {
  const { r } = jogar(() => ({ suporte: 1, blindagem: 4, oficina: 0 }));
  assert.equal(r, 'foguete-incompleto');
});
