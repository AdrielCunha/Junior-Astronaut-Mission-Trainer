import test from 'node:test';
import assert from 'node:assert/strict';
import {
  forcarEvento,
  gerarPlanoAutomacao,
  proximoCapitulo,
  type EstadoTeste,
} from './test-harness.ts';
import { inicioDoCapitulo, nenhuma, entregar, fimDoDia, type Config } from './regras.ts';

const config: Config = {
  dias: 3,
  bateriasPorDia: 4,
  oxigenioInicial: 60,
  oxigenioPorBateria: 10,
  oxigenioPorNoite: 10,
  metaPorBateria: 5,
};

test('forcarEvento applies damage and keeps the state consistent', () => {
  const base: EstadoTeste = {
    capitulo: 1,
    dia: 1,
    estado: inicioDoCapitulo(config),
    evento: 'nenhum',
    dados: { nivel: 0, frio: 0 },
  };

  const result = forcarEvento(base, { tipo: 'tempestade', nivel: 3, frio: 4 });

  assert.equal(result.evento, 'tempestade');
  assert.equal(result.dados.nivel, 3);
  assert.equal(result.dados.frio, 4);
  assert.equal(result.estado.dia, 1);
});

test('gerarPlanoAutomacao creates an allocation big enough for the goal', () => {
  const base = inicioDoCapitulo(config);
  const plano = gerarPlanoAutomacao(config, base, { nivel: 2, frio: 1 });

  assert.ok(plano.oxigenio >= 1);
  assert.ok(plano.meta >= 1 || plano.blindagem >= 1 || plano.aquecimento >= 1);
  assert.equal(Object.values(plano).reduce((s, v) => s + v, 0) <= config.bateriasPorDia, true);
});

test('proximoCapitulo safely advances to the next chapter', () => {
  const estado = { capitulo: 1, dia: 3, estado: inicioDoCapitulo(config), evento: 'nenhum', dados: { nivel: 0, frio: 0 } };
  const result = proximoCapitulo(estado, 3);

  assert.equal(result.capitulo, 2);
  assert.equal(result.dia, 1);
  assert.equal(result.estado.dia, 1);
  assert.equal(result.evento, 'capitulo');
});
