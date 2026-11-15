import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passo,novoCorpo,definirBotasMagneticas,BOTA_MAGNETICA,AJUSTES } from './fisica.ts';
const floor={n:100,maxAndar:45,altura:()=>0,inclinacaoEm:()=>0};
test('magnetic boots preserve original walking speed and acceleration while braking firmly',()=>{
  try{
    const body=novoCorpo(5,5,0);body.noChao=true;
    definirBotasMagneticas(true);
    for(let i=0;i<120;i++)passo(body,{dx:1,dy:0,pular:false},floor,[],1/60);
    assert.ok(Math.abs(body.vx-BOTA_MAGNETICA.velocidade)<1e-9);
    assert.equal(BOTA_MAGNETICA.velocidade,AJUSTES.velocidade);assert.equal(BOTA_MAGNETICA.aceleracao,AJUSTES.aceleracao);
    const start=body.x;
    for(let i=0;i<7;i++)passo(body,null,floor,[],1/60);
    assert.equal(body.vx,0);assert.equal(body.vy,0);assert.ok(body.x-start<.17,'the heavy sole must not coast after stopping');
    const stopped=body.x;for(let i=0;i<30;i++)passo(body,null,floor,[],1/60);assert.equal(body.x,stopped);
    definirBotasMagneticas(false);
    for(let i=0;i<120;i++)passo(body,{dx:1,dy:0,pular:false},floor,[],1/60);
    assert.ok(Math.abs(body.vx-AJUSTES.velocidade)<1e-9);
  }finally{definirBotasMagneticas(false);}
});
