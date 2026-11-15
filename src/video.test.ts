import { test } from 'node:test';
import assert from 'node:assert/strict';

const memory=new Map<string,string>();
Object.assign(globalThis,{matchMedia:()=>({matches:false}),localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v)}});
test('Explorer 3D persists as a skin and leaves quality and comfort preferences unchanged',async()=>{
  const prefs=await import('./video.ts');
  assert.equal(prefs.video.skin,'comandante');const quality=prefs.video.qualidade,motion=prefs.video.movimento;
  prefs.escolherSkin('procedural');assert.equal(prefs.video.skin,'procedural');
  assert.equal(prefs.video.qualidade,quality);assert.equal(prefs.video.movimento,motion);
  const saved=JSON.parse(memory.get('lunar-odyssey-video')!);assert.equal(saved.skin,'procedural');assert.equal(saved.animacao,undefined);
  prefs.escolherSkin('robo');assert.equal(prefs.video.skin,'robo');
  prefs.escolherSkin('unknown');assert.equal(prefs.video.skin,'robo');
});
test('the former experimental procedural toggle migrates into the new skin',async()=>{
  memory.set('lunar-odyssey-video',JSON.stringify({animacao:'procedural',skin:'robo',qualidade:'leve'}));
  const file=new URL('./video.ts?migration',import.meta.url).href;
  const prefs=await import(file);assert.equal(prefs.video.skin,'procedural');assert.equal(prefs.video.qualidade,'leve');
  prefs.escolherSkin('comandante');
  const saved=JSON.parse(memory.get('lunar-odyssey-video')!);assert.equal(saved.skin,'comandante');assert.equal(saved.animacao,undefined);
});
