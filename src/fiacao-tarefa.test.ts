// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarFiacao, tocarTrecho, escolherReparo, defeitoAtual, lampadaApagada, fiacaoConcluida, REPARO_DO_DANO, TRECHOS, RODADAS } from './fiacao-tarefa.ts';

const semente = (n: number) => () => { n = (n * 16807) % 2147483647; return n / 2147483647; };

test('a fiação sorteia 3 defeitos, um de cada tipo, com fios que se cruzam', () => {
  for (let n = 1; n < 40; n++) {
    const f = criarFiacao(semente(n));
    assert.equal(f.defeitos.length, RODADAS);
    assert.deepEqual(f.defeitos.map((d) => d.dano).sort(), ['cortado', 'descascado', 'queimado']);
    assert.deepEqual([...f.destino].sort(), [0, 1, 2, 3]);
    assert.ok(f.destino.some((d, i) => d !== i), 'precisa ter cruzamento');
    assert.ok(f.defeitos.every((d) => d.trecho >= 1 && d.trecho < TRECHOS - 1));
  }
});

test('testar um fio bom só diz que ele está bom', () => {
  const f = criarFiacao(semente(3));
  const bom = (defeitoAtual(f).fio + 1) % 4;
  assert.equal(tocarTrecho(f, bom, 2).resultado, 'bom');
  assert.equal(tocarTrecho(f, bom, 2).estado, f);
});

test('no fio quebrado, antes do defeito tem corrente e depois não', () => {
  const f = criarFiacao(semente(5));
  const d = defeitoAtual(f);
  assert.equal(tocarTrecho(f, d.fio, d.trecho - 1).resultado, 'com-corrente');
  assert.equal(tocarTrecho(f, d.fio, d.trecho + 1).resultado, 'sem-corrente');
  const r = tocarTrecho(f, d.fio, d.trecho);
  assert.equal(r.resultado, 'achou');
  assert.equal(r.estado.achado, true);
  assert.equal(f.achado, false, 'the old state does not change');
});

test('a lâmpada apagada é a do fio quebrado', () => {
  const f = criarFiacao(semente(7));
  assert.equal(lampadaApagada(f), f.destino[defeitoAtual(f).fio]);
});

test('só dá para reparar depois de achar, e o reparo errado não muda nada', () => {
  const f = criarFiacao(semente(9));
  const d = defeitoAtual(f);
  assert.equal(escolherReparo(f, REPARO_DO_DANO[d.dano]), f);
  const achado = tocarTrecho(f, d.fio, d.trecho).estado;
  const errado = (['emenda', 'fita', 'trocar'] as const).find((r) => r !== REPARO_DO_DANO[d.dano])!;
  assert.equal(escolherReparo(achado, errado), achado);
  const certo = escolherReparo(achado, REPARO_DO_DANO[d.dano]);
  assert.equal(certo.rodada, 1);
  assert.equal(certo.achado, false);
});

test('consertar os 3 defeitos conclui a tarefa', () => {
  let f = criarFiacao(semente(11));
  while (!fiacaoConcluida(f)) {
    const d = defeitoAtual(f);
    f = escolherReparo(tocarTrecho(f, d.fio, d.trecho).estado, REPARO_DO_DANO[d.dano]);
  }
  assert.equal(f.rodada, RODADAS);
  assert.equal(tocarTrecho(f, 0, 0).resultado, 'ignorado');
});
