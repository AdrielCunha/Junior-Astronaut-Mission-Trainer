// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  criarTarefaComunicacoes, ajustarFrequencia, ajustarGanho, alinhamento, ondasAlinhadas, passar, progressoDaTrava,
  tarefaConcluida, ciclosDaOnda, amplitudeDaOnda, TEMPO_TRAVA,
} from './comunicacoes-tarefa.ts';

const certo = () => {
  const t = criarTarefaComunicacoes();
  return ajustarGanho(ajustarFrequencia(t, t.frequenciaAlvo), t.ganhoAlvo);
};

test('começa desalinhado e sem trava', () => {
  const t = criarTarefaComunicacoes();
  assert.ok(alinhamento(t) < 0.3);
  assert.equal(ondasAlinhadas(t), false);
  assert.equal(tarefaConcluida(t), false);
  assert.equal(progressoDaTrava(t), 0);
});

test('frequência e volume certos alinham as ondas por completo', () => {
  const t = certo();
  assert.equal(alinhamento(t), 1);
  assert.equal(ondasAlinhadas(t), true);
});

test('só um dos botões certo não basta', () => {
  const t = criarTarefaComunicacoes();
  assert.equal(ondasAlinhadas(ajustarFrequencia(t, t.frequenciaAlvo)), false);
  assert.equal(ondasAlinhadas(ajustarGanho(t, t.ganhoAlvo)), false);
});

test('um pouco fora ainda é aceito, muito fora não', () => {
  const t = certo();
  assert.equal(ondasAlinhadas(ajustarGanho(ajustarFrequencia(t, t.frequenciaAlvo + 0.04), t.ganhoAlvo - 0.04)), true);
  assert.equal(ondasAlinhadas(ajustarFrequencia(t, t.frequenciaAlvo + 0.2)), false);
});

test('os botões ficam entre 0 e 1 e o estado antigo não muda', () => {
  const t = criarTarefaComunicacoes();
  assert.equal(ajustarFrequencia(t, 3).frequencia, 1);
  assert.equal(ajustarFrequencia(t, -3).frequencia, 0);
  assert.equal(ajustarGanho(t, 3).ganho, 1);
  assert.equal(ajustarGanho(t, -3).ganho, 0);
  assert.equal(t.frequencia, 0.12);
});

test('a onda cresce com os botões', () => {
  assert.ok(ciclosDaOnda(1) > ciclosDaOnda(0));
  assert.ok(amplitudeDaOnda(1) > amplitudeDaOnda(0));
  assert.ok(amplitudeDaOnda(0) > 0);
});

test('alinhado por tempo suficiente conclui; desalinhado não', () => {
  let fraco = criarTarefaComunicacoes();
  for (let i = 0; i < 200; i++) fraco = passar(fraco, 0.05);
  assert.equal(tarefaConcluida(fraco), false);

  let t = certo();
  t = passar(t, TEMPO_TRAVA / 2);
  assert.equal(tarefaConcluida(t), false);
  assert.ok(Math.abs(progressoDaTrava(t) - 0.5) < 1e-9);
  t = passar(t, TEMPO_TRAVA);
  assert.equal(tarefaConcluida(t), true);
  assert.equal(progressoDaTrava(t), 1);
});

test('perder o alinhamento faz a trava recuar devagar, sem ficar negativa', () => {
  let t = passar(certo(), 1);
  const solto = ajustarFrequencia(t, 0);
  const depois = passar(solto, 0.5);
  assert.ok(depois.travado < t.travado && depois.travado > 0);
  assert.equal(passar(solto, 100).travado, 0);
});
