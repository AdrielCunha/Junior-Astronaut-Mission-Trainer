// Generated with AI assistance. See README, "Use of AI tools".
// Run: npm test. English is the default and leaves every text unchanged; Portuguese uses textosPt.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t, idioma, escolherIdioma } from './idioma.ts';

test('English is the default and changes nothing', () => {
  assert.equal(idioma, 'en');
  assert.equal(t('Heating'), 'Heating');
  assert.equal(t('Chapter 1 of 3: The Moon base'), 'Chapter 1 of 3: The Moon base');
});

test('Portuguese: exact texts, patterns and their parts', () => {
  escolherIdioma('pt');
  try {
    assert.equal(t('Heating'), 'Aquecimento');
    assert.equal(t('SCIENCE LOG'), 'DIÁRIO CIENTÍFICO');
    assert.equal(t('Try Mars again'), 'Tentar Marte novamente');
    assert.ok(t('Forecast: HIGH. Shield: 2 batteries.').startsWith('Previsão:'));
    assert.equal(t('Heating is built!'), 'Aquecimento está construído!');
    assert.equal(t('Chapter 1 of 3: The Moon base'), 'Capítulo 1 de 3: A base na Lua');
    assert.equal(t('Chapter 2'), 'Capítulo 2');
    assert.equal(t('1 battery'), '1 bateria');
    assert.equal(t('3 batteries'), '3 baterias');
    // Case changed by the scene, decorations around the text, lines translated one by one.
    assert.equal(t('heating'), 'aquecimento');
    assert.equal(t('HEATING'), 'AQUECIMENTO');
    assert.equal(t('— Heating —'), '— Aquecimento —');
    assert.equal(t('Heating\nChapter 2'), 'Aquecimento\nCapítulo 2');
    // Unknown text stays as it is.
    assert.equal(t('Zorblax 9000'), 'Zorblax 9000');
  } finally { escolherIdioma('en'); }
  assert.equal(t('Heating'), 'Heating');
});
