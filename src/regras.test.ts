// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Run: npm test (Node 24 runs TypeScript directly).
// Balance checks: every chapter, played with the real NASA data, must have a costly trade-off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import lua from './dados/lua.json' with { type: 'json' };
import nave from './dados/nave.json' with { type: 'json' };
import marte from './dados/marte.json' with { type: 'json' };
import {
  inicioDoCapitulo, fimDoDia, resultado, bateriasDoDia, nenhuma,
  type Alocacao, type Config, type Estado,
} from './regras.ts';

// Same numbers as capitulos.ts (that file imports JSON without attributes, which Node needs).
const LUA: Config = { dias: 8, bateriasPorDia: 5, oxigenioInicial: 60, oxigenioPorBateria: 10, oxigenioPorNoite: 10, metaPorBateria: 4 };
const NAVE: Config = { dias: 5, bateriasPorDia: 4, oxigenioInicial: 60, oxigenioPorBateria: 10, oxigenioPorNoite: 15, metaPorBateria: 15 };
const MARTE: Config = { dias: 8, bateriasPorDia: 5, oxigenioInicial: 60, oxigenioPorBateria: 10, oxigenioPorNoite: 10, metaPorBateria: 6 };

type Dias = { nivel: number; frio?: number }[];
const a = (oxigenio: number, blindagem: number, meta: number, aquecimento = 0): Alocacao => ({ oxigenio, blindagem, meta, aquecimento });

// plano: what the player does on day i, given the state that morning.
function jogar(c: Config, dias: Dias, plano: (e: Estado, i: number) => Alocacao, dose = 0) {
  let e = inicioDoCapitulo(c, dose);
  for (let i = 0; i < c.dias; i++) {
    const x = plano(e, i);
    assert.ok(x.oxigenio + x.blindagem + x.meta + x.aquecimento <= bateriasDoDia(e, c), `day ${i + 1}: too many batteries`);
    e = fimDoDia(e, x, dias[i], c);
    if (resultado(e, c)) break;
  }
  return { e, r: resultado(e, c) };
}

// A careful player: shield what the storm needs, heat what the night needs,
// keep oxygen just above zero, put the rest into the goal.
const cuidadoso = (c: Config, dias: Dias) => (e: Estado, i: number) => {
  let livres = bateriasDoDia(e, c);
  const aquecimento = Math.min(livres, dias[i].frio ?? 0);
  livres -= aquecimento;
  const blindagem = Math.min(livres, dias[i].nivel);
  livres -= blindagem;
  const precisa = e.oxigenio - c.oxigenioPorNoite <= 5 ? Math.ceil((5 - (e.oxigenio - c.oxigenioPorNoite)) / c.oxigenioPorBateria) : 0;
  const oxigenio = Math.min(livres, precisa);
  return a(oxigenio, blindagem, livres - oxigenio, aquecimento);
};

test('end of day applies the formulas', () => {
  const e = fimDoDia(inicioDoCapitulo(LUA), a(2, 1, 2, 0), { nivel: 3, frio: 2 }, LUA);
  // oxygen 60 + 20 - 10 - 2 missing heat * 10; dose 1 + 2 missing shield * 15; goal 2 * 4
  assert.deepEqual(e, { dia: 2, oxigenio: 50, dose: 31, meta: 8 });
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
  assert.equal(jogar(LUA, lua.dias, (e) => a(1, 0, bateriasDoDia(e, LUA) - 1)).r, 'radiacao');
});

test('Moon: building only the rocket runs out of oxygen', () => {
  assert.equal(jogar(LUA, lua.dias, (e) => a(0, 0, bateriasDoDia(e, LUA))).r, 'sem-oxigenio');
});

test('Moon: every battery to the shield never finishes the rocket', () => {
  assert.equal(jogar(LUA, lua.dias, () => a(1, 4, 0)).r, 'meta-incompleta');
});

test('Trip: ignoring the shield in deep space sends the crew home', () => {
  assert.equal(jogar(NAVE, nave.dias, (e) => a(1, 0, bateriasDoDia(e, NAVE) - 1)).r, 'radiacao');
});

test('Trip: full shield and safe air every day leaves too little for the engines', () => {
  assert.equal(jogar(NAVE, nave.dias, (_, i) => a(2, Math.min(2, nave.dias[i].nivel), 0)).r, 'meta-incompleta');
});

test('Mars: skipping the heating runs out of oxygen', () => {
  assert.equal(jogar(MARTE, marte.dias, (e, i) => a(1, marte.dias[i].nivel, bateriasDoDia(e, MARTE) - 1 - marte.dias[i].nivel)).r, 'sem-oxigenio');
});

test('Mars: a crew that arrives with one astronaut in the infirmary can still win, carefully', () => {
  assert.equal(jogar(MARTE, marte.dias, cuidadoso(MARTE, marte.dias), 25).r, 'vitoria');
});

test('an empty day costs oxygen and dose only', () => {
  const e = fimDoDia(inicioDoCapitulo(NAVE), nenhuma(), { nivel: 0 }, NAVE);
  assert.deepEqual(e, { dia: 2, oxigenio: 45, dose: 1, meta: 0 });
});
