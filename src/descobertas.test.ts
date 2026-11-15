import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerDescobertas, registrarDescoberta } from './descobertas.ts';

test('science facts survive reopening, are deduplicated and stay bounded', () => {
  let value: string | null=null;
  Object.assign(globalThis,{localStorage:{getItem:()=>value,setItem:(_k:string,v:string)=>{value=v;}}});
  registrarDescoberta('Ice found','Water ice can survive in permanent shadow.');
  registrarDescoberta('Ice found','Water ice can survive in permanent shadow.');
  assert.equal(lerDescobertas().length,1);
  for(let i=0;i<110;i++)registrarDescoberta(`Fact ${i}`,'Science');
  assert.equal(lerDescobertas().length,100);
  assert.equal(lerDescobertas().at(-1)?.titulo,'Fact 109');
});

test('malformed or unavailable journal storage never interrupts a task', () => {
  Object.assign(globalThis,{localStorage:{getItem:()=>'{broken',setItem:()=>{throw Error('full');}}});
  assert.deepEqual(lerDescobertas(),[]);
  assert.doesNotThrow(()=>registrarDescoberta('Shield','Water helps shield radiation.'));
});
