import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { formaPegada, pegadaNoSolo } from '../engine/pegadas.ts';
import { paraTela } from '../engine/iso.ts';
import { LocomocaoLunar, pontoDoMapa, orientacaoDoMapa, pegadaDoContato } from '../astronauta/locomocao.ts';

function ambienteTeste(){
  const graphics=()=>({setDepth(){return this;},clear(){return this;},fillStyle(){return this;},fillPoints(){return this;},lineStyle(){return this;},lineBetween(){return this;},setVisible(){return this;},fillCircle(){return this;}});
  const scene={time:{now:0},add:{graphics}},map={add(){}},p={origem:[0,0],ex:[30,15],ey:[-30,15],ez:[0,-36.7423]},terrain={altura:()=>0};
  const raw=readFileSync(new URL('./ambiente.ts',import.meta.url),'utf8')
    .replace('constructor(private cena:', 'constructor(cena:').replace(', private mapa:', ', mapa:').replace(', private p:', ', p:').replace(', private terreno:', ', terreno:')
    .replace("    const marte = mundo === 'marte';", "    this.cena=cena;this.mapa=mapa;this.p=p;this.terreno=terreno;\n    const marte = mundo === 'marte';");
  const source=stripTypeScriptTypes(raw)
    .replace(/^import .*;\s*$/gm,'').replace('export class Ambiente','class Ambiente');
  const context:Record<string,any>={Phaser:{Math:{Clamp:(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v))}},
    paletaLua:JSON.parse(readFileSync(new URL('../dados/paleta_lua.json',import.meta.url),'utf8')),
    paletaMarte:JSON.parse(readFileSync(new URL('../dados/paleta_marte.json',import.meta.url),'utf8')),
    paraTela,formaPegada,pegadaNoSolo,movimentoReduzido:()=>true,video:{qualidade:'alta',efeitos:false,pegadas:true},LEVE:false};
  vm.runInNewContext(source+'\nglobalThis.Ambiente=Ambiente;',context);
  return {a:new context.Ambiente(scene,map,p,terrain),scene,p,context};
}

test('procedural Moon emits one footprint per alternating contact and none during visual flight',()=>{
  const {a,scene,p}=ambienteTeste(),walk=new LocomocaoLunar(),dt=1/60;
  const body={x:0,y:0,z:0,vx:3.2,vy:0,vz:0,noChao:true,raio:.22};
  let expected=0,lastSide=-1;
  for(let i=0;i<180;i++){
    body.x+=body.vx*dt;scene.time.now+=dt*1000;
    const yaw=orientacaoDoMapa(body.vx,body.vy,0,p);
    const pose=walk.atualizar(dt,pontoDoMapa(body.x,body.y,body.z,p),yaw,true,true,9.7);assert.ok(pose);
    const contact=pose.marca?pegadaDoContato(pose.marca,p):null;
    a.update(dt,body,[],null,{ativo:true,contato:contact});
    if(contact){assert.notEqual(contact.lado,lastSide);lastSide=contact.lado;expected++;}
    assert.equal(a.marcas.length,expected,'distance must never add an extra print between contacts');
  }
  assert.ok(expected>=7&&expected<=10);
});

test('the legacy sprite mode still generates its original distance-based footprints',()=>{
  const {a,scene}=ambienteTeste();
  const body={x:0,y:0,z:0,vx:1,vy:0,vz:0,noChao:true,raio:.22};
  for(let i=0;i<6;i++){body.x=i*.1;scene.time.now+=16;a.update(1/60,body,[]);}
  assert.equal(a.marcas.length,1);
});

test('animated footprints respect mute footprints, metal-independent soil masks and buildings',()=>{
  const {a,context}=ambienteTeste();
  const body={x:2,y:2,z:0,vx:1,vy:0,vz:0,noChao:true,raio:.22};
  const c={x:2,y:2,z:0,ux:1,uy:0,lado:0 as const,comprimento:.12,largura:.08};
  context.video.pegadas=false;a.update(1/60,body,[],null,{ativo:true,contato:c});assert.equal(a.marcas.length,0);
  context.video.pegadas=true;a.update(1/60,body,[{gx:1,gy:1,tipo:{w:2,h:2}}],null,{ativo:true,contato:c});assert.equal(a.marcas.length,0);
  a.update(1/60,body,[],null,{ativo:true,contato:{...c,z:1}});assert.equal(a.marcas.length,0);
  a.update(1/60,body,[],null,{ativo:true,contato:c});assert.equal(a.marcas.length,1);
});
