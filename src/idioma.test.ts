// Generated with AI assistance. See README, "Use of AI tools".
// Run: npm test. Browser locale and saved choices select the language; Portuguese uses textosPt.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t, idioma, escolherIdioma, detectarIdioma } from './idioma.ts';

test('English leaves source texts unchanged', () => {
  escolherIdioma('en');   // the default follows the machine's locale (detectarIdioma), so set it here
  assert.equal(idioma, 'en');
  assert.equal(t('Heating'), 'Heating');
  assert.equal(t('EXPLORE THE BASE'), 'EXPLORE THE BASE');
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
    assert.equal(t('CONTINUE MISSION'), 'CONTINUAR MISSÃO');
    assert.equal(t('LAUNCH MISSION'), 'LANÇAR MISSÃO');
    assert.equal(t('NEXT MORNING'), 'PRÓXIMA MANHÃ');
    assert.equal(t('EXPLORE THE BASE'), 'EXPLORAR A BASE');
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


test('browser language preferences select Portuguese or English in order, unless explicitly saved',()=>{
  assert.equal(detectarIdioma(null,['pt-BR','en-US']),'pt');
  assert.equal(detectarIdioma(undefined,['pt-PT']),'pt');
  assert.equal(detectarIdioma(null,['en-GB','pt-BR']),'en');
  assert.equal(detectarIdioma(null,['fr-FR','pt-BR','en-US']),'pt');
  assert.equal(detectarIdioma(null,['fr-FR']),'en');
  assert.equal(detectarIdioma(null,[]),'en');
  assert.equal(detectarIdioma('en',['pt-BR']),'en');
  assert.equal(detectarIdioma('pt',['en-US']),'pt');
  assert.equal(detectarIdioma('invalid',['PT-BR']),'pt');
});

test('startup uses browser locale without storage and preserves an explicit saved English choice',async()=>{
  const nav=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  const storage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const values=new Map<string,string>();
  try {
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{languages:['pt-BR','en-US'],language:'pt-BR'}});
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)}});
    const first=await import(new URL('./idioma.ts?browser-pt',import.meta.url).href);
    assert.equal(first.idioma,'pt');assert.equal(first.t('Heating'),'Aquecimento');
    assert.equal(values.size,0,'automatic detection does not become a permanent override');
    first.escolherIdioma('pt');assert.equal(values.get('lunar-odyssey-idioma'),'pt');
    values.set('lunar-odyssey-idioma','en');
    const saved=await import(new URL('./idioma.ts?saved-en',import.meta.url).href);
    assert.equal(saved.idioma,'en');
    Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('blocked');}});
    const blocked=await import(new URL('./idioma.ts?blocked-storage',import.meta.url).href);
    assert.equal(blocked.idioma,'pt');
  } finally {
    if(nav)Object.defineProperty(globalThis,'navigator',nav);else Reflect.deleteProperty(globalThis,'navigator');
    if(storage)Object.defineProperty(globalThis,'localStorage',storage);else Reflect.deleteProperty(globalThis,'localStorage');
  }
});
