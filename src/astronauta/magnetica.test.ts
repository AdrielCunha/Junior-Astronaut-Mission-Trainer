import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocomocaoMagnetica } from './magnetica.ts';
import { ALTURA_TORNOZELO, girar, somar, type V3 } from './movimento.ts';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
for(const fps of [20,30,60,120])test(`magnetic soles lock in world space and alternate at ${fps} FPS`,()=>{
  const m=new LocomocaoMagnetica(),dt=1/fps,speed=1.15,yaw=Math.PI/2;
  let prior:V3[]|null=null,locked:[boolean,boolean]=[false,false],release=-1,fix=-1,releases=0,fixes=0;
  for(let i=0;i<fps*4;i++){
    const root:V3=[speed*i*dt,0,0],p=m.atualizar(dt,root,yaw,true,true);assert.ok(p);assert.equal(p.altura,0,'no lunar hopping on the ship');
    assert.ok(p.imasAtivos?.some(Boolean),'at least one boot must remain magnetically attached');
    const world=p.pes.map(foot=>somar(root,girar(foot,yaw)));
    for(let side=0;side<2;side++){
      if(p.imasAtivos?.[side]){
        close(world[side][1],ALTURA_TORNOZELO);
        if(prior&&locked[side]&&!(p.fixou&&p.peMovel===side))for(let a=0;a<3;a++)close(world[side][a],prior[side][a]);
      }
    }
    if(p.soltou){assert.notEqual(p.peMovel,release);release=p.peMovel;releases++;assert.equal(p.imasAtivos![p.peMovel],false);}
    if(p.fixou){assert.notEqual(p.peMovel,fix);assert.equal(p.peMovel,release);fix=p.peMovel;fixes++;assert.equal(p.imasAtivos![p.peMovel],true);}
    prior=world;locked=p.imasAtivos!;
  }
  assert.ok(releases>=8&&releases<=12);assert.ok(fixes>=8&&fixes<=12);assert.ok(releases-fixes<=1);
});

test('a released boot lifts before moving forward; landing clamps both soles briefly',()=>{
  const m=new LocomocaoMagnetica(),dt=1/120;
  let lifted=false,clamped=false;
  for(let i=0;i<60;i++){
    const p=m.atualizar(dt,[0,0,i*dt],0,true,true);assert.ok(p);
    if(!p.imasAtivos![p.peMovel]&&p.pes[p.peMovel][1]>.08)lifted=true;
    if(p.fixou){assert.ok(lifted);assert.deepEqual(p.imasAtivos,[true,true]);assert.equal(p.inclinacoesPes[p.peMovel],0);clamped=true;break;}
  }
  assert.ok(clamped);
});

test('stopping finishes the current heavy step and never releases another boot',()=>{
  const m=new LocomocaoMagnetica();let root:V3=[0,0,0];
  for(let i=0;i<12;i++){root=[0,0,i/60];m.atualizar(1/60,root,0,true,true);}
  let release=0,fix=0;
  for(let i=0;i<120;i++){
    const p=m.atualizar(1/60,root,0,false,true);assert.ok(p);if(p.soltou)release++;if(p.fixou)fix++;
    if(i>60){assert.deepEqual(p.imasAtivos,[true,true]);for(const foot of p.pes)close(foot[1],ALTURA_TORNOZELO);}
  }
  assert.equal(release,0);assert.ok(fix<=1);
  assert.equal(m.atualizar(1/60,root,0,true,false),null,'manual jump detaches the visual magnetic locks');
});

test('a planted magnetic sole keeps its position and yaw during a body turn',()=>{
  const m=new LocomocaoMagnetica(),root:V3=[0,0,0];
  const a=m.atualizar(1/120,root,0,true,true),b=m.atualizar(1/120,root,.2,true,true);assert.ok(a&&b);
  const support=a.peApoio;
  const sole=(p:typeof a,yaw:number)=>somar(girar(p.pes[support],yaw),girar(girar([0,0,.06],p.rotacoesPes[support]),yaw));
  const x=sole(a,0),y=sole(b,.2);for(let axis=0;axis<3;axis++)close(x[axis],y[axis]);
});


test('faster ship movement shortens the boot cycle without floating or losing alternate contacts',()=>{
  const counts=[];
  for(const speed of [1.15,9.7]){
    const m=new LocomocaoMagnetica();let contacts=0,last=-1;
    for(let i=0;i<240;i++){
      const p=m.atualizar(1/120,[i*speed/120,0,0],Math.PI/2,true,true);assert.ok(p);
      assert.equal(p.altura,0);assert.ok(p.imasAtivos!.some(Boolean));
      if(p.fixou){assert.notEqual(p.peMovel,last);last=p.peMovel;contacts++;}
    }
    counts.push(contacts);
  }
  assert.ok(counts[1]>counts[0]);
});
