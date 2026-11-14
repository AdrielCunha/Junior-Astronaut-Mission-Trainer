// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Run: npm test (Node 24 runs TypeScript directly).
// Balance checks: every chapter, played with the real NASA data, must have a costly trade-off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import lua from './dados/lua.json' with { type: 'json' };
import nave from './dados/nave.json' with { type: 'json' };
import marte from './dados/marte.json' with { type: 'json' };
import {
  inicioDoCapitulo, fimDoDia, resultado, bateriasDoDia, nenhuma, entregar, pronto, custo, DESCANSO,
  type Config, type Efeito, type Estado,
} from './regras.ts';

// Same numbers as capitulos.ts (that file imports JSON without attributes, which Node needs).
const LUA: Config = { dias: 8, bateriasPorDia: 5, oxigenioInicial: 60, oxigenioPorBateria: 10, oxigenioPorNoite: 10, metaPorBateria: 4 };
const NAVE: Config = { dias: 5, bateriasPorDia: 4, oxigenioInicial: 60, oxigenioPorBateria: 10, oxigenioPorNoite: 15, metaPorBateria: 15 };
const MARTE: Config = {
  dias: 8, bateriasPorDia: 5, oxigenioInicial: 60, oxigenioPorBateria: 10, oxigenioPorNoite: 10, metaPorBateria: 0,
  obras: { aquecimento: 2, blindagem: 3, oxigenio: 3, meta: 12 },
};

type Dias = { nivel: number; frio?: number }[];
const vezes = (ef: Efeito, n: number): Efeito[] => Array(Math.max(0, n)).fill(ef);

// plano: the batteries the player delivers on day i, in order, given the state that morning.
function jogar(c: Config, dias: Dias, plano: (e: Estado, i: number) => Efeito[], dose = 0) {
  let e = inicioDoCapitulo(c, dose);
  for (let i = 0; i < c.dias; i++) {
    const lista = plano(e, i);
    assert.ok(lista.length <= bateriasDoDia(e, c), `day ${i + 1}: too many batteries`);
    let a = nenhuma();
    for (const ef of lista) [e, a] = entregar(e, a, ef, c);
    e = fimDoDia(e, a, dias[i], c);
    if (resultado(e, c)) break;
  }
  return { e, r: resultado(e, c) };
}

// A careful player: build the module a need depends on, then power it (heat, shield),
// keep oxygen just above zero, and put the rest into the goal.
const cuidadoso = (c: Config, dias: Dias) => (e: Estado, i: number): Efeito[] => {
  let livres = bateriasDoDia(e, c);
  let s = e;
  let a = nenhuma();
  const lista: Efeito[] = [];
  const usar = (ef: Efeito, n: number) => {
    const falta = pronto(s, ef, c) ? 0 : custo(ef, c) - (s.obras[ef] ?? 0);
    const k = Math.min(livres, falta + n);
    for (let j = 0; j < k; j++) [s, a] = entregar(s, a, ef, c);
    lista.push(...vezes(ef, k));
    livres -= k;
  };
  usar('aquecimento', dias[i].frio ?? 0);
  // Mars: build the shield early; ENLIL warns the day before the storm.
  usar('blindagem', dias[i].nivel);
  const frioSemCalor = Math.max(0, (dias[i].frio ?? 0) - a.aquecimento) * 10;
  const depois = e.oxigenio - c.oxigenioPorNoite - frioSemCalor;
  usar('oxigenio', depois <= 5 ? Math.ceil((5 - depois) / c.oxigenioPorBateria) : 0);
  lista.push(...vezes('meta', livres));
  return lista;
};

test('end of day applies the formulas', () => {
  const a = { oxigenio: 2, blindagem: 1, meta: 2, aquecimento: 0 };
  const e = fimDoDia(inicioDoCapitulo(LUA), a, { nivel: 3, frio: 2 }, LUA);
  // oxygen 60 + 20 - 10 - 2 missing heat * 10; dose 1 + 2 missing shield * 15; goal 2 * 4
  assert.deepEqual(e, { dia: 2, oxigenio: 50, dose: 31, meta: 8, obras: {} });
});

test('a battery builds an unfinished module, then powers it', () => {
  let e = inicioDoCapitulo(MARTE);
  let a = nenhuma();
  [e, a] = entregar(e, a, 'aquecimento', MARTE);
  assert.equal(pronto(e, 'aquecimento', MARTE), false);
  [e, a] = entregar(e, a, 'aquecimento', MARTE);
  assert.equal(pronto(e, 'aquecimento', MARTE), true);
  [e, a] = entregar(e, a, 'aquecimento', MARTE);
  assert.equal(a.aquecimento, 1);
  assert.equal(e.meta, 10); // 2 of 20 batteries of the base
});

test('the whole campaign can be won with the real May 2024 storm', () => {
  const um = jogar(LUA, lua.dias, cuidadoso(LUA, lua.dias));
  assert.equal(um.r, 'vitoria');
  const dois = jogar(NAVE, nave.dias, cuidadoso(NAVE, nave.dias), um.e.dose);
  assert.equal(dois.r, 'vitoria');
  const tres = jogar(MARTE, marte.dias, cuidadoso(MARTE, marte.dias), dois.e.dose);
  assert.equal(tres.r, 'vitoria');
  assert.ok(tres.e.dose < 25, `nobody in the infirmary (dose ${tres.e.dose})`);
});

test('Moon: ignoring the shield sends the crew home', () => {
  assert.equal(jogar(LUA, lua.dias, (e) => [...vezes('oxigenio', 1), ...vezes('meta', bateriasDoDia(e, LUA) - 1)]).r, 'radiacao');
});

test('Moon: building only the rocket runs out of oxygen', () => {
  assert.equal(jogar(LUA, lua.dias, (e) => vezes('meta', bateriasDoDia(e, LUA))).r, 'sem-oxigenio');
});

test('Moon: every battery to the shield never finishes the rocket', () => {
  assert.equal(jogar(LUA, lua.dias, () => [...vezes('oxigenio', 1), ...vezes('blindagem', 4)]).r, 'meta-incompleta');
});

test('Trip: ignoring the shield in deep space sends the crew home', () => {
  assert.equal(jogar(NAVE, nave.dias, (e) => [...vezes('oxigenio', 1), ...vezes('meta', bateriasDoDia(e, NAVE) - 1)]).r, 'radiacao');
});

test('Trip: full shield and safe air every day leaves too little for the engines', () => {
  assert.equal(jogar(NAVE, nave.dias, (_, i) => [...vezes('oxigenio', 2), ...vezes('blindagem', Math.min(2, nave.dias[i].nivel))]).r, 'meta-incompleta');
});

test('Mars: building the dome first loses the crew to the cold', () => {
  assert.equal(jogar(MARTE, marte.dias, (e) => vezes('meta', bateriasDoDia(e, MARTE))).r, 'sem-oxigenio');
});

test('Mars: after resting (a retry lowers the dose to DESCANSO), the crew can still win, carefully', () => {
  assert.equal(jogar(MARTE, marte.dias, cuidadoso(MARTE, marte.dias), DESCANSO).r, 'vitoria');
});

test('an empty day costs oxygen and dose only', () => {
  const e = fimDoDia(inicioDoCapitulo(NAVE), nenhuma(), { nivel: 0 }, NAVE);
  assert.deepEqual(e, { dia: 2, oxigenio: 45, dose: 1, meta: 0, obras: {} });
});
