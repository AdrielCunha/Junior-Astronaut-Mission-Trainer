// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarTarefaFiltroCo2, abrirTrava, soltarFiltroVelho, soltarFiltroNovo, passarTempo, arSeguro, tarefaConcluida } from './trocar-filtro-co2-tarefa.ts';

const aberta = () => abrirTrava(abrirTrava(criarTarefaFiltroCo2(), 0), 1);

test('starts with the latches closed and CO2 high', () => {
  const t = criarTarefaFiltroCo2();
  assert.equal(t.fase, 'travas');
  assert.ok(t.co2 > t.limiteSeguro);
  assert.equal(arSeguro(t), 0);
  assert.equal(tarefaConcluida(t), false);
});

test('the old filter can only come out with both latches open', () => {
  const t = criarTarefaFiltroCo2();
  const uma = abrirTrava(t, 0);
  assert.equal(uma.fase, 'travas');
  assert.equal(soltarFiltroVelho(uma, t.lixo), uma);
  assert.equal(abrirTrava(uma, 0), uma, 'opening again changes nothing');
  assert.equal(abrirTrava(uma, 7), uma);
  assert.equal(abrirTrava(uma, 1).fase, 'remover');
  assert.equal(t.travas.some(Boolean), false, 'the old state does not change');
});

test('dropping the old filter outside the trash does nothing; over the trash it leaves', () => {
  const t = aberta();
  assert.equal(soltarFiltroVelho(t, { x: 0, y: 200 }), t);
  assert.equal(soltarFiltroVelho(t, t.lixo).fase, 'instalar');
});

test('the new filter only goes in after the old one is out, and only in the slot', () => {
  const t = aberta();
  assert.equal(soltarFiltroNovo(t, t.encaixe), t);
  const livre = soltarFiltroVelho(t, t.lixo);
  const errado = soltarFiltroNovo(livre, { x: 200, y: 150 });
  assert.equal(errado.fase, 'instalar');
  assert.equal(errado.erros, 1);
  const certo = soltarFiltroNovo(errado, { x: t.encaixe.x + 20, y: t.encaixe.y - 10 });
  assert.equal(certo.fase, 'respirando');
  assert.equal(certo.travas.some(Boolean), false, 'the latches close');
});

test('CO2 only drops after installation and never goes negative', () => {
  const t = aberta();
  assert.equal(passarTempo(t, 5), t);
  let r = soltarFiltroNovo(soltarFiltroVelho(t, t.lixo), t.encaixe);
  let ant = arSeguro(r);
  for (let i = 0; i < 400 && !tarefaConcluida(r); i++) {
    r = passarTempo(r, 0.05);
    assert.ok(r.co2 >= 0 && arSeguro(r) >= ant - 1e-9);
    ant = arSeguro(r);
  }
  assert.equal(tarefaConcluida(r), true);
  assert.ok(r.co2 <= r.limiteSeguro);
  assert.equal(arSeguro(r), 1);
  assert.equal(passarTempo(r, 1), r);
});
