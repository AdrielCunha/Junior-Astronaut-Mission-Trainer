import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MovimentoLab, cotovelo, somar, escalar, GRAVIDADE, passoTraje, direcaoEntrada, girar, produto, ALTURA_TORNOZELO, type V3 } from '../../astronauta/movimento.ts';

test('inventory stays in 0..5 and pickup settles without exceeding the limit',()=>{
  const m=new MovimentoLab();m.definirCarga(99);assert.equal(m.quantidade,5);
  assert.equal(m.progresso(4),0);for(let i=0;i<120;i++)m.atualizar(1/120,false);
  for(let i=0;i<5;i++)assert.equal(m.progresso(i),1);
  m.definirCarga(-2);assert.equal(m.quantidade,0);m.definirCarga(NaN);assert.equal(m.quantidade,0);
});
test('both hands use exactly the same moving anchor as the stack',()=>{
  const m=new MovimentoLab();m.definirCarga(5);
  for(let i=0;i<600;i++){
    m.atualizar(1/120,i<300);if(i===20)m.pular();
    const left=m.pontoCarga([-.28,-.018,0]),right=m.pontoCarga([.28,-.018,0]);
    assert.ok(Math.abs(Math.hypot(...somar(left,escalar(right,-1)))-.56)<1e-10);
    assert.ok(Math.abs(m.inclinacaoCarga)<=.055);
    for(const sign of [-1,1]){
      const shoulder:V3=[sign*.34,1.30,.06],hand=m.pontoCarga([sign*.28,-.018,0]);
      const elbow=cotovelo(shoulder,hand,.32,.34,[sign,-.4,-.5]);
      assert.ok(Math.abs(Math.hypot(...somar(elbow,escalar(shoulder,-1)))-.32)<1e-9);
      assert.ok(Math.abs(Math.hypot(...somar(hand,escalar(elbow,-1)))-.34)<1e-9);
    }
  }
});
for(const world of ['lua','marte','nave'] as const)test(`${world}: preparation then ballistic flight then braced landing`,()=>{
  const m=new MovimentoLab();m.mundo=world;m.pular();
  assert.equal(m.estadoSalto,'preparacao');assert.equal(m.velocidadeVertical,0);assert.equal(m.noChao,true);
  for(let i=0;i<12;i++)m.atualizar(1/120,true);
  assert.ok(m.compressao>0);assert.equal(m.altura,0);
  const clock=m.tempoNaEtapa;m.pular();assert.equal(m.tempoNaEtapa,clock,'cannot restart preparation');
  while(m.noChao)m.atualizar(1/120,true);
  assert.equal(m.estadoSalto,'voo');assert.equal(m.velocidadeVertical,2.2);
  m.pular();assert.equal(m.velocidadeVertical,2.2,'cannot jump again in midair');
  let time=0,max=0;while(!m.noChao&&time<4){m.atualizar(1/120,true);time+=1/120;max=Math.max(max,m.altura);}
  assert.ok(m.noChao);assert.equal(m.altura,0);assert.equal(m.estadoSalto,'pouso');
  assert.ok(Math.abs(time-4.4/GRAVIDADE[world])<.02);
  assert.ok(Math.abs(max-2.2**2/(2*GRAVIDADE[world]))<.02);
  for(let i=0;i<16;i++)m.atualizar(1/120,true);
  assert.ok(m.compressao>.85);assert.equal(m.altura,0);
  for(const side of [-1,1])assert.deepEqual(m.pe(side),[side*.155,ALTURA_TORNOZELO,0]);
  while(m.estadoSalto!=='solo')m.atualizar(1/120,true);
  assert.equal(m.compressao,0);assert.equal(m.altura,0);
});
test('stack settles after stopping instead of accumulating drift',()=>{
  const m=new MovimentoLab();m.definirCarga(5);
  for(let i=0;i<300;i++)m.atualizar(1/120,true);
  for(let i=0;i<600;i++)m.atualizar(1/120,false);
  assert.ok(Math.abs(m.inclinacaoCarga)<.0001);assert.ok(m.mistura<.0001);
});


test('the lifted boot goes from back to front, while the planted boot goes back',()=>{
  const amplitude=.13;
  let previous=-amplitude;
  for(let i=1;i<45;i++){
    const p=passoTraje(i/100*Math.PI*2,amplitude,.085);
    assert.equal(p.apoio,false);assert.ok(p.y>0);assert.ok(p.z>previous);previous=p.z;
  }
  previous=amplitude;
  for(let i=46;i<100;i++){
    const p=passoTraje(i/100*Math.PI*2,amplitude,.085);
    assert.equal(p.apoio,true);assert.equal(p.y,0);assert.ok(p.z<previous);previous=p.z;
  }
});

test('stance speed cancels forward movement instead of moonwalking',()=>{
  for(const world of ['lua','marte','nave'] as const){
    const m=new MovimentoLab();m.mundo=world;m.definirCarga(5);
    for(let i=0;i<500;i++)m.atualizar(1/120,true);
    const rate=m.ritmoPassada, dt=.001;
    const a=passoTraje(.6*Math.PI*2,m.amplitudePassada,.085);
    const b=passoTraje((.6+dt*rate)*Math.PI*2,m.amplitudePassada,.085);
    assert.ok(Math.abs((b.z-a.z)/dt+m.velocidadeCaminhada)<1e-8);
  }
});

test('W and D follow the orbit camera, with the visor facing the movement direction',()=>{
  for(const camera of [0,.48,Math.PI/2,Math.PI,Math.PI*1.7]){
    const w=direcaoEntrada(0,1,camera),d=direcaoEntrada(1,0,camera);
    assert.ok(Math.abs(produto(w,d))<1e-10);
    assert.ok(Math.abs(Math.hypot(...w)-1)<1e-10);
    const viewW=girar(w,-camera),viewD=girar(d,-camera);
    assert.ok(viewW[2]<-.999);assert.ok(viewD[0]>.999);
    const yaw=Math.atan2(w[0],w[2]),heading=girar([0,0,1],yaw);
    assert.ok(produto(w,heading)>.999);
  }
});

test('jump joins ground poses without lifting a planted boot during compression',()=>{
  const m=new MovimentoLab();m.definirCarga(5);
  for(let i=0;i<100;i++)m.atualizar(1/120,true);
  const before=m.pe(-1);m.pular();assert.deepEqual(m.pe(-1),before);
  for(let i=0;i<30;i++)m.atualizar(1/120,true);
  assert.deepEqual(m.pe(-1),[-.155,ALTURA_TORNOZELO,0]);
  assert.deepEqual(m.pe(1),[.155,ALTURA_TORNOZELO,0]);
});
