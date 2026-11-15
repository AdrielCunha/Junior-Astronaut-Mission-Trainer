import test from 'node:test';
import assert from 'node:assert/strict';
import { sortearPremio, NIVEL, PESOS, CHANCE_PREMIO_SALA, skinsDePremio, textoDoPremio, type Posse } from './presentes.ts';
import { TIPOS_POR_MUNDO } from './exploracao.ts';
import { ACESSORIOS, daPagina, doEspaco } from '../dados/acessorios.ts';
import { CORES_BASE } from '../dados/cores.ts';
import { SKINS } from '../dados/skins.ts';

const nada: Posse = { oxigenio: 50, dose: 30, acessorios: [], cores: [], skins: [] };
// A small deterministic generator, so the numbers below do not change between runs.
const gerador = (semente: number) => () => { semente = (semente * 1664525 + 1013904223) % 4294967296; return semente / 4294967296; };

test('every exploration type has a level', () => {
  for (const t of new Set(Object.values(TIPOS_POR_MUNDO).flat())) assert.ok(NIVEL[t], `no level for ${t}`);
});

test('the wardrobe has three full pages of 12', () => {
  assert.equal(SKINS.length, 12);
  assert.equal(daPagina('chapeus').length, 12);
  assert.equal(daPagina('carinhas').length, 12);
  assert.equal(new Set(ACESSORIOS.map((a) => a.id)).size, ACESSORIOS.length);
  assert.ok(doEspaco('cabeca').length >= 7 && doEspaco('rosto').length >= 3);
  assert.equal(SKINS.filter((s) => !s.premio).length, 1);   // only the commander is free
});

test('one single prize per mission', () => {
  const p = sortearPremio('balizas', nada, gerador(1));
  assert.equal(typeof p.tipo, 'string');
  assert.equal(Object.keys(p).filter((k) => k !== 'tipo').length, 1);   // one amount or one id, never a mix
});

test('batteries are rare: under 5 in 100', () => {
  const rnd = gerador(7), n = 30000;
  let baterias = 0;
  for (let i = 0; i < n; i++) if (sortearPremio('amostra', nada, rnd).tipo === 'bateria') baterias++;
  const fracao = baterias / n;
  assert.ok(fracao > 0.01 && fracao < 0.05, `battery share ${fracao}`);
  assert.ok(PESOS.bateria < PESOS.oxigenio && PESOS.bateria < PESOS.radiacao);
});

test('customization is most of the prizes, more than resources', () => {
  const rnd = gerador(13), n = 30000;
  let personalizacao = 0, recursos = 0;
  for (let i = 0; i < n; i++) {
    const t = sortearPremio('amostra', nada, rnd).tipo;
    if (t === 'skin' || t === 'acessorio' || t === 'cor') personalizacao++; else recursos++;
  }
  assert.ok(personalizacao > recursos * 2, `${personalizacao} vs ${recursos}`);
});

test('harder missions make customization likelier', () => {
  const conta = (tipo: 'ferramenta' | 'gelo') => {
    const rnd = gerador(3); let c = 0;
    for (let i = 0; i < 20000; i++) if (['cor', 'acessorio', 'skin'].includes(sortearPremio(tipo, nada, rnd).tipo)) c++;
    return c;
  };
  assert.ok(conta('gelo') > conta('ferramenta'));
});

test('astronauts, hats and faces can all be drawn', () => {
  const rnd = gerador(21), vistos = new Set<string>();
  for (let i = 0; i < 5000; i++) {
    const p = sortearPremio('tubos', nada, rnd);
    if (p.tipo === 'acessorio') vistos.add(doEspaco('carinha').some((a) => a.id === p.id) ? 'carinha' : 'chapeu');
    else vistos.add(p.tipo);
  }
  for (const k of ['skin', 'chapeu', 'carinha', 'cor']) assert.ok(vistos.has(k), `never drew ${k}`);
});

test('oxygen is left out when full and radiation when there is none', () => {
  const cheio: Posse = { ...nada, oxigenio: 100, dose: 0 };
  const rnd = gerador(5);
  for (let i = 0; i < 2000; i++) {
    const t = sortearPremio('amostra', cheio, rnd).tipo;
    assert.ok(t !== 'oxigenio' && t !== 'radiacao', t);
  }
});

test('amounts are cut to what fits', () => {
  const tudo = { acessorios: ACESSORIOS.map((a) => a.id), cores: CORES_BASE.map((c) => c.id), skins: skinsDePremio() };
  const quase: Posse = { oxigenio: 99, dose: 1, ...tudo };
  const rnd = gerador(9);
  for (let i = 0; i < 500; i++) {
    const p = sortearPremio('gelo', quase, rnd);
    if (p.tipo === 'oxigenio') assert.equal(p.qtd, 1);
    if (p.tipo === 'radiacao') assert.equal(p.qtd, 1);
  }
});

test('something already owned is never drawn again; with everything owned only resources are left', () => {
  const tudo: Posse = { oxigenio: 50, dose: 30, acessorios: ACESSORIOS.map((a) => a.id), cores: CORES_BASE.map((c) => c.id), skins: skinsDePremio() };
  const rnd = gerador(11);
  for (let i = 0; i < 2000; i++) assert.ok(['oxigenio', 'radiacao', 'bateria'].includes(sortearPremio('tubos', tudo, rnd).tipo));
  const falta: Posse = { ...tudo, acessorios: ACESSORIOS.slice(1).map((a) => a.id) };
  for (let i = 0; i < 2000; i++) {
    const p = sortearPremio('tubos', falta, rnd);
    if (p.tipo === 'acessorio') assert.equal(p.id, ACESSORIOS[0].id);
  }
});

test('prize text', () => {
  assert.equal(textoDoPremio({ tipo: 'bateria', qtd: 1 }), '🎁 Rare prize: +1 battery!');
  assert.equal(textoDoPremio({ tipo: 'acessorio', id: 'coroa' }), '🎁 Prize: Golden Crown!');
  assert.equal(textoDoPremio({ tipo: 'skin', id: 'gato' }), '🎁 Prize: a new astronaut, Space Kitty!');
  assert.equal(textoDoPremio({ tipo: 'oxigenio', qtd: 3 }), '🎁 Prize: +3 oxygen!');
});

test('a standard room task gives a prize 70% of the times, as a one-prize draw of the lowest level', () => {
  assert.equal(CHANCE_PREMIO_SALA, 0.7);
  assert.equal(NIVEL.sala, 1);
  const p = sortearPremio('sala', nada, gerador(2));
  assert.equal(Object.keys(p).filter((k) => k !== 'tipo').length, 1);
});

test('each world has its own third of every page', () => {
  for (const mundo of ['lua', 'nave', 'marte'] as const) {
    assert.equal(daPagina('chapeus').filter((a) => a.fase === mundo).length, 4, `hats & glasses on ${mundo}`);
    assert.equal(daPagina('carinhas').filter((a) => a.fase === mundo).length, 4, `faces on ${mundo}`);
    assert.ok(SKINS.filter((k) => k.premio && k.fase === mundo).length >= 3, `astronauts on ${mundo}`);
  }
  assert.ok(SKINS.filter((k) => k.premio).every((k) => k.fase), 'every prize astronaut belongs to a world');
});

test('a world only draws its own astronauts and accessories', () => {
  for (const mundo of ['lua', 'nave', 'marte'] as const) {
    const rnd = gerador(31);
    for (let i = 0; i < 3000; i++) {
      const p = sortearPremio('tubos', { ...nada, mundo }, rnd);
      if (p.tipo === 'acessorio') assert.equal(ACESSORIOS.find((a) => a.id === p.id)!.fase, mundo, `${p.id} on ${mundo}`);
      if (p.tipo === 'skin') assert.equal(SKINS.find((k) => k.id === p.id)!.fase, mundo, `${p.id} on ${mundo}`);
    }
  }
});

test('the stations give an item of their own world', async () => {
  const { ESTACOES, ESTACOES_MODULO } = await import('./estacoes.ts');
  const fase = (i: { tipo: string; id: string }) => i.tipo === 'skin' ? SKINS.find((k) => k.id === i.id)!.fase : ACESSORIOS.find((a) => a.id === i.id)!.fase;
  for (const e of Object.values(ESTACOES)) if (e.item) assert.equal(fase(e.item), 'nave', `${e.acao}`);          // ship stations
  for (const e of Object.values(ESTACOES_MODULO)) if (e.item) assert.equal(fase(e.item), 'lua', `${e.acao}`);   // Moon equipment
});
