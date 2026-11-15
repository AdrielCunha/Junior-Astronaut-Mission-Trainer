import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gravarPartida,lerPartida,type DadosPartida } from './salvamento.ts';

const partida=():DadosPartida=>({versao:1,salvoEm:1,mundo:'nave',capIdx:1,fase:'dia',estado:{dia:2,oxigenio:60,dose:8,meta:24,obras:{}},
  entregas:{oxigenio:0,blindagem:0,meta:0,aquecimento:0},pontos:[202],carregando:2,noHabitat:2,tarefasHoje:[],ultimaTarefa:{},energiaHoje:true,
  curiosidadeRoverVista:true,diaCargaRover:null,rover:null,astronauta:null,modulos:[],decoracao:[],
  tempestade:{restante:45000,status:'inativa'},danoTempestade:0,bateriasTempestade:0,desfechoPendente:null,ultimoDia:null,
  evento:null,eventoEm:null,diasCalmos:0,pulou:false});
function memoria() {
  let value:string|null=null;
  Object.assign(globalThis,{localStorage:{getItem:()=>value,setItem:(_k:string,v:string)=>{value=v;}}});
}
test('old saves without exploration fields remain compatible',()=>{
  memoria();const d=partida();gravarPartida(d);assert.deepEqual(lerPartida(),d);
});
test('daily stations, pending exploration and expedition progress survive storage',()=>{
  memoria();const d=partida();
  Object.assign(d,{estacoesHoje:['nave_plantas'],exploracaoEm:2,corridaHoje:true,paralamaHoje:true,odometroRover:15,tempoExpedicao:7});
  d.expedicao={id:'sample-1',tipo:'amostra',titulo:'Sample',destino:'Habitat',pontos:[{x:2,y:3},{x:4,y:5}],atual:1,feitos:[true,false],livre:false,raio:1,deRover:false,segurar:2,espera:1,escondidoAte:1,fato:'A sample teaches us about the ground.'};
  gravarPartida(d);assert.deepEqual(lerPartida(),d);
});
test('invalid expedition progress, timers and scene names are rejected safely',()=>{
  memoria();const d=partida();
  for(const changes of [{exploracaoEm:-1},{estacoesHoje:['unknown']},{tempoExpedicao:Infinity},{expedicao:{tipo:'gelo',pontos:[]}}]) {
    gravarPartida({...d,...changes} as DadosPartida);assert.equal(lerPartida(),null);
  }
});
