import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RenderizadorAstronauta, type ModeloAstronauta } from './renderizador.ts';
import { criarPose } from './pose.ts';
import { MovimentoLab } from './movimento.ts';
const model=JSON.parse(readFileSync(new URL('../../public/lab/astronauta-modelo.json',import.meta.url),'utf8')) as ModeloAstronauta;

test('polished model retains the original helmet/torso, smooth normals and all articulated groups',()=>{
  assert.equal(model.version,2);assert.equal(model.maxBatteries,5);
  assert.ok(model.groups.head.some(m=>m.name==='Original | capacete'));
  assert.ok(model.groups.torso.some(m=>m.name==='Original | tronco'));
  for(const meshes of Object.values(model.groups))for(const mesh of meshes){
    assert.equal(mesh.normals?.length,mesh.vertices.length);
    assert.ok(mesh.vertices.every(v=>v.every(Number.isFinite)));
    assert.ok(mesh.faces.every(f=>f.every(i=>i>=0&&i<mesh.vertices.length)));
  }
  const rig=JSON.parse(readFileSync(new URL('../../public/lab/modelo-relatorio.json',import.meta.url),'utf8'));
  assert.equal(rig.bones,16);assert.ok(rig.riggedObjects>30);
});

test('every articulated pose is finite through a complete loaded jump',()=>{
  const m=new MovimentoLab();m.definirCarga(5);m.pular();
  for(let i=0;i<600;i++){
    m.atualizar(1/120,i>500);
    const pose=criarPose(m);assert.equal(pose.filter(p=>p.grupo==='battery').length,5);
    for(const part of pose)for(const p of [[0,0,0],[1,0,0],[0,1,0],[0,0,1]] as [number,number,number][])assert.ok(part.transformar(p).every(Number.isFinite));
  }
});

test('no WebGL support produces an explicit sprite fallback',()=>{
  const original=globalThis.WebGLRenderingContext;
  Object.assign(globalThis,{WebGLRenderingContext:undefined});
  try{assert.equal(RenderizadorAstronauta.criar(model),null);}finally{Object.assign(globalThis,{WebGLRenderingContext:original});}
});

test('external mission physics stays authoritative during procedural playback',()=>{
  const m=new MovimentoLab();m.sincronizarFisica(false,-1.2,.3);m.atualizar(.03,true);
  assert.equal(m.altura,.3);assert.equal(m.velocidadeVertical,-1.2);assert.equal(m.noChao,false);
  m.sincronizarFisica(true,0,0);m.atualizar(.03,true);
  assert.equal(m.estadoSalto,'pouso');assert.equal(m.altura,0);assert.equal(m.noChao,true);
  for(let i=0;i<60;i++){m.sincronizarFisica(true,0,0);m.atualizar(1/120,true);}
  assert.ok(m.estadoSalto==='recuperacao'||m.estadoSalto==='solo');assert.equal(m.altura,0);
});

test('GPU buffers are reused, transforms are finite, and context loss requests sprite fallback',()=>{
  const before={document:globalThis.document,WebGLRenderingContext:globalThis.WebGLRenderingContext};
  let uploads=0,draws=0,buffers=0,deleted=0,lost=false;
  const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,STATIC_DRAW:6,DEPTH_TEST:7,LEQUAL:8,CULL_FACE:9,BACK:10,BLEND:11,FLOAT:12,TRIANGLES:13,NO_ERROR:0,COLOR_BUFFER_BIT:1,DEPTH_BUFFER_BIT:2,
    createShader:()=>({}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,deleteShader(){},createProgram:()=>({}),attachShader(){},linkProgram(){},getProgramParameter:()=>true,
    getAttribLocation:()=>0,getUniformLocation:()=>({}),createBuffer:()=>{buffers++;return {};},bindBuffer(){},bufferData(_t:number,data:Float32Array){uploads++;assert.ok([...data].every(Number.isFinite));},
    isContextLost:()=>lost,viewport(){},clearColor(){},clear(){},enable(){},depthFunc(){},cullFace(){},disable(){},useProgram(){},uniformMatrix4fv(_loc:unknown,_transpose:boolean,data:Float32Array){assert.ok([...data].every(Number.isFinite));},
    enableVertexAttribArray(){},vertexAttribPointer(){},uniform3fv(){},uniform1f(){},drawArrays(){draws++;},getError:()=>0,deleteBuffer(){deleted++;},deleteProgram(){},getExtension:()=>null};
  Object.assign(globalThis,{WebGLRenderingContext:function(){},document:{createElement:()=>({width:0,height:0,getContext:()=>gl,addEventListener(){},removeEventListener(){}})}});
  try{
    const renderer=RenderizadorAstronauta.criar(model);assert.ok(renderer);
    const m=new MovimentoLab();m.definirCarga(5);
    const camera={largura:192,altura:192,pixelsPorMetro:56,origemX:96,origemY:164,azimuth:Math.PI/4,elevation:Math.PI/6,alvoY:0,yaw:.3};
    const initial=uploads;
    for(let i=0;i<5;i++){m.atualizar(1/30,true);assert.equal(renderer.desenhar(criarPose(m),camera),true);}
    assert.ok(draws>0);assert.equal(uploads,initial,'static geometry must not be uploaded every frame');
    lost=true;assert.equal(renderer.desenhar(criarPose(m),camera),false);
    renderer.destruir();assert.equal(deleted,buffers);
  }finally{Object.assign(globalThis,before);}
});
