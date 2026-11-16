import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LocomocaoLunar, orientacaoDoMapa, pontoDoMapa, cameraIsometrica, pegadaDoContato, mapaDoPonto, type EixosMapa } from './locomocao.ts';
import { girar, somar, ALTURA_TORNOZELO, type V3 } from './movimento.ts';
const close=(a:number,b:number,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);

for(const mundo of ['terreno','terreno_marte','terreno_nave'])test(`${mundo}: the actual isometric basis keeps all eight headings facing their displacement`,()=>{
  const p=JSON.parse(readFileSync(new URL(`../dados/${mundo}.json`,import.meta.url),'utf8')).imagem as EixosMapa;
  const camera=cameraIsometrica(p);
  for(const [vx,vy] of [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]){
    const theta=Math.atan2(-vy,vx),direcao=(Math.round(theta/(Math.PI/4))+8)%8;
    for(const yaw of [orientacaoDoMapa(vx,vy,direcao,p),orientacaoDoMapa(0,0,direcao,p)]){
      const front=girar(girar([0,0,1],yaw),-camera.azimuth);
      const screen=[front[0],front[2]*Math.sin(camera.elevation)];
      const wanted=[vx*p.ex[0]+vy*p.ey[0],vx*p.ex[1]+vy*p.ey[1]];
      close(screen[0]*wanted[1]-screen[1]*wanted[0],0);
      assert.ok(screen[0]*wanted[0]+screen[1]*wanted[1]>0,'facing must agree with direction, never mirror it');
    }
  }
  const right=orientacaoDoMapa(1,-1,1,p),left=orientacaoDoMapa(-1,1,5,p);
  assert.ok(girar(girar([0,0,1],right),-camera.azimuth)[0]>.99);
  assert.ok(girar(girar([0,0,1],left),-camera.azimuth)[0]<-.99);
});

test('map positions project to exactly the same pixels as the actor renderer, including height',()=>{
  const p={ex:[30,15],ey:[-30,15],ez:[0,-36.7423]},cam=cameraIsometrica(p);
  for(const [x,y,z] of [[1,0,0],[0,1,0],[2,-3,.5]]){
    const v=girar(pontoDoMapa(x,y,z,p),-cam.azimuth);
    close(v[0]*56*.25,x*30-y*30);
    close((-v[1]*Math.cos(cam.elevation)+v[2]*Math.sin(cam.elevation))*56*.25,x*15+y*15-z*36.7423);
  }
});

for(const fps of [20,30,60,120])test(`lunar stance alternates a single planted boot in world space at ${fps} FPS`,()=>{
  const m=new LocomocaoLunar(),dt=1/fps,speed=8;
  let previous:V3[]|null=null,wasSupport=false,previousSide=-1,lastContact=-1,contacts=0,flightFrames=0,maxHeight=0;
  for(let i=0;i<fps*3;i++){
    const root:V3=[speed*i*dt,0,0],yaw=Math.PI/2;
    const pose=m.atualizar(dt,root,yaw,true,true,speed);assert.ok(pose);
    assert.equal(pose.contato,!!pose.marca);
    if(pose.marca){assert.notEqual(pose.marca.pe,lastContact);lastContact=pose.marca.pe;contacts++;}
    if(!pose.apoio)flightFrames++;
    maxHeight=Math.max(maxHeight,pose.altura);
    const world=pose.pes.map(p=>somar(root,girar(p,yaw)));
    if(pose.apoio){
      close(pose.altura,0);
      const side=pose.peApoio,other=1-side;
      close(world[side][1],ALTURA_TORNOZELO);
      assert.ok(world[other][1]>ALTURA_TORNOZELO+.1,'the other boot must stay lifted');
      if(pose.contato)assert.ok(pose.pes[side][2]-pose.pes[other][2]>.12,'the landing leg must reach forward while the other is folded back');
      if(wasSupport&&!pose.contato&&previous&&previousSide===side)for(let axis=0;axis<3;axis++)close(world[side][axis],previous[side][axis]);
      if(pose.marca)for(let axis=0;axis<3;axis++)close(world[side][axis],pose.marca.posicao[axis]);
    }
    if(!pose.apoio&&pose.fase>Math.PI*1.2)assert.ok(pose.pes[1-pose.peApoio][2]-pose.pes[pose.peApoio][2]>.12,'the next leg must advance independently in flight');
    for(const foot of pose.pes)assert.ok(foot.every(Number.isFinite));
    previous=world;wasSupport=pose.apoio;previousSide=pose.peApoio;
  }
  assert.ok(contacts>=7&&contacts<=10,`${contacts} contacts`);
  assert.ok(flightFrames>fps*2,'long airborne portion instead of skating on planted soles');
  assert.ok(maxHeight>.23&&maxHeight<=.24);
});

test('stopping completes the small hop, rests on the ground and stops generating contacts',()=>{
  const m=new LocomocaoLunar(),dt=1/60;
  let root:V3=[0,0,0];
  for(let i=0;i<10;i++){root=[i*.12,0,0];m.atualizar(dt,root,Math.PI/2,true,true,7.2);}
  let contacts=0;
  for(let i=0;i<120;i++){const p=m.atualizar(dt,root,Math.PI/2,false,true);assert.ok(p);if(p.contato)contacts++;if(i>60){close(p.altura,0);assert.equal(p.apoio,true);}}
  assert.ok(contacts<=2,'the last stride lands, then the other boot settles once');
  assert.equal(m.atualizar(dt,root,Math.PI/2,true,false),null,'real jump owns the pose while airborne');
});

test('a turning body cannot rotate the planted boot across the surface',()=>{
  const m=new LocomocaoLunar(),root:V3=[0,0,0];
  const initial=m.atualizar(1/120,root,0,true,true,.1);assert.ok(initial);
  const next=m.atualizar(1/120,root,.3,true,true,.1);assert.ok(next);assert.equal(next.apoio,true);
  const side=initial.peApoio;
  const a=girar(initial.pes[side],0),b=girar(next.pes[side],.3);
  for(let axis=0;axis<3;axis++)close(a[axis],b[axis]);
  const sole0=somar(a,girar(girar([0,0,.06],initial.rotacoesPes[side]),0));
  const sole1=somar(b,girar(girar([0,0,.06],next.rotacoesPes[side]),.3));
  for(let axis=0;axis<3;axis++)close(sole0[axis],sole1[axis]);
});


test('each mark uses the supporting sole centre and true model dimensions',()=>{
  const p={ex:[30,15],ey:[-30,15],ez:[0,-36.7423]};
  for(const [x,y,z] of [[2,3,0],[-1,5,.3],[4,-2,1]]){
    const roundtrip=mapaDoPonto(pontoDoMapa(x,y,z,p),p);
    close(roundtrip.x,x);close(roundtrip.y,y);close(roundtrip.z,z);
  }
  const walk=new LocomocaoLunar(),dt=1/60;let marks=0;
  for(let i=0;i<180;i++){
    const yaw=orientacaoDoMapa(1,-1,1,p),root=pontoDoMapa(i*.04,-i*.04,0,p);
    const pose=walk.atualizar(dt,root,yaw,true,true,8);assert.ok(pose);
    if(!pose.marca){assert.equal(pose.contato,false);continue;}
    const mark=pegadaDoContato(pose.marca,p);marks++;
    assert.equal(mark.lado,pose.peApoio);close(mark.z,0);
    const sole=somar(somar(root,girar(pose.pes[pose.peApoio],yaw)),girar([0,-ALTURA_TORNOZELO,.06],yaw));
    const projected=pontoDoMapa(mark.x,mark.y,mark.z,p);
    for(let axis=0;axis<3;axis++)close(sole[axis],projected[axis]);
    close(Math.hypot(mark.ux,mark.uy),1);assert.ok(mark.ux>0&&mark.uy<0);
    assert.ok(mark.comprimento>.10&&mark.comprimento<.14);
  }
  assert.ok(marks>=7);
});
