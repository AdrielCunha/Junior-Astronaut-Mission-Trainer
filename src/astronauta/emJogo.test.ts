import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('classic mode loads no model; unsupported procedural mode keeps physics and sprites intact',async()=>{
  let requests=0,shutdown=()=>{},textureChanges=0;
  Object.assign(globalThis,{matchMedia:()=>({matches:false}),localStorage:{getItem:()=>null,setItem(){}},WebGLRenderingContext:undefined,
    fetch:async()=>{requests++;return {ok:true,json:async()=>JSON.parse(readFileSync(new URL('../../public/lab/astronauta-modelo.json',import.meta.url),'utf8'))};}});
  const {video}=await import('../video.ts');
  const {AstronautaEmJogo,paletaSkin}=await import('./emJogo.ts');
  assert.deepEqual(paletaSkin('procedural'),paletaSkin('comandante'));
  const scene={sys:{settings:{key:'test'}},events:{once(_event:string,fn:()=>void){shutdown=fn;}},textures:{remove(){},createCanvas(){assert.fail('Unsupported WebGL must not allocate a texture');}}};
  const actor=new AstronautaEmJogo(scene as never);
  const sprite={texture:{key:'original'},setTexture(){textureChanges++;}};
  const body=Object.freeze({x:2,y:2,z:.4,vx:1,vy:0,vz:.2,raio:.22,noChao:false});
  const snapshot=JSON.stringify(body);
  video.skin='comandante';assert.equal(actor.atualizar(sprite as never,body,'lua',5,0,2,1/60,0),false);
  assert.equal(requests,0);video.skin='procedural';
  assert.equal(actor.atualizar(sprite as never,body,'lua',5,0,2,1/60,0),false);
  for(let i=0;i<6;i++)await Promise.resolve();
  for(let i=0;i<5;i++)assert.equal(actor.atualizar(sprite as never,body,'lua',5,0,2,1/60,0),false);
  assert.equal(requests,1);assert.equal(textureChanges,0);assert.equal(JSON.stringify(body),snapshot);
  video.skin='comandante';shutdown();assert.equal(actor.atualizar(sprite as never,body,'lua',0,0,0,1/60,0),false);
});
