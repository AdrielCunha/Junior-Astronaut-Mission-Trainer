import test from 'node:test';
import assert from 'node:assert/strict';
import { criarTarefaFiltroO2, limparEm, qualidadeDoAr, tarefaConcluida, centroDaCelula } from './filtro-o2-tarefa.ts';

test('o filtro começa sujo, com a qualidade do ar baixa', () => {
  const t = criarTarefaFiltroO2();
  assert.equal(t.celulas.length, t.colunas * t.linhas);
  const sujas = t.celulas.filter((c) => c.sujeira > 0).length;
  assert.ok(sujas >= 12 && sujas <= 60);
  assert.equal(tarefaConcluida(t), false);
  assert.equal(qualidadeDoAr(t), 0);
});

test('limpar longe das manchas não muda nada', () => {
  const t = criarTarefaFiltroO2();
  const livre = t.celulas.find((c) => c.sujeira === 0)!;
  // find a clean cell whose surroundings (reach) are all clean
  const longe = t.celulas.filter((c) => c.sujeira === 0).find((c) => {
    const p = centroDaCelula(t, c);
    return limparEm(t, p, 1) === t;
  });
  assert.ok(livre && longe, 'deve existir um ponto sem sujeira por perto');
  assert.equal(limparEm(t, centroDaCelula(t, longe!), 1), t);
});

test('limpar em cima de uma mancha reduz a sujeira e nunca fica negativa', () => {
  const t = criarTarefaFiltroO2();
  const suja = t.celulas.find((c) => c.sujeira > 0)!;
  const p = centroDaCelula(t, suja);
  const depois = limparEm(t, p, 0.1);
  const nova = depois.celulas.find((c) => c.x === suja.x && c.y === suja.y)!;
  assert.ok(nova.sujeira < suja.sujeira);
  assert.ok(depois.celulas.every((c) => c.sujeira >= 0));
  assert.equal(t.celulas.find((c) => c.x === suja.x && c.y === suja.y)!.sujeira, suja.sujeira, 'o estado antigo não muda');
});

test('passar o aspirador por todas as células conclui a tarefa e a qualidade chega a 1', () => {
  let t = criarTarefaFiltroO2();
  for (const c of t.celulas) t = limparEm(t, centroDaCelula(t, c), 2);
  assert.equal(tarefaConcluida(t), true);
  assert.equal(qualidadeDoAr(t), 1);
});

test('a qualidade do ar só sobe enquanto se limpa', () => {
  let t = criarTarefaFiltroO2();
  let anterior = qualidadeDoAr(t);
  for (const c of t.celulas) {
    t = limparEm(t, centroDaCelula(t, c), 0.2);
    const q = qualidadeDoAr(t);
    assert.ok(q >= anterior - 1e-9);
    anterior = q;
  }
});
