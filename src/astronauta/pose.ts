import { MovimentoLab, cotovelo, somar, escalar, normalizar, cruzar, girar, type V3 } from './movimento.ts';
import type { PoseLocomocao } from './locomocao.ts';
export type Transformacao = (p: V3) => V3;
export type PartePose = { grupo: string; transformar: Transformacao; imaAtivo?:boolean };
export function matrizDe(f: Transformacao): Float32Array {
  const p=f([0,0,0]),x=somar(f([1,0,0]),escalar(p,-1)),y=somar(f([0,1,0]),escalar(p,-1)),z=somar(f([0,0,1]),escalar(p,-1));
  return new Float32Array([...x,0,...y,0,...z,0,...p,1]);
}
export function criarPose(m: MovimentoLab, reduzido=false,locomocao?:PoseLocomocao|null): PartePose[] {
  const ops: PartePose[]=[];
  const adicionar=(grupo:string,transformar:Transformacao)=>ops.push({grupo,transformar});
  const bone=(grupo:string,a:V3,b:V3)=>{
    const up=normalizar(somar(a,escalar(b,-1))),right=normalizar(cruzar(up,[0,0,1])),front=cruzar(right,up);
    adicionar(grupo,p=>somar(a,somar(escalar(right,p[0]),somar(escalar(up,p[1]),escalar(front,p[2])))));
  };
  const bob=reduzido?0:Math.abs(Math.sin(m.fase))*.012*m.mistura;
  const hip=.82+(locomocao?0:bob)-Math.max(m.compressao,locomocao?.compressao??0)*.11,pitch=-m.quantidade*.018+m.compressao*.045;
  const hipX=locomocao?.quadrilX??0;
  const torso=(p:V3):V3=>somar(girar(somar(p,[0,-.82,0]),0,pitch),[hipX,hip,0]);
  adicionar('torso',p=>torso(somar(p,[0,.82,0])));
  adicionar('head',p=>torso(somar(p,[0,1.68,0])));
  for(const [side,sign] of [['L',-1],['R',1]] as const){
    const h:V3=[sign*.155+hipX,hip,0],ankle=locomocao?.pes[side==='L'?0:1]??m.pe(sign),knee=cotovelo(h,ankle,.41,.40,[0,0,1]);
    bone(side+'thigh',h,knee);bone(side+'shin',knee,ankle);
    const foot=(p:V3)=>somar(girar(p,locomocao?.rotacoesPes[side==='L'?0:1]??0,locomocao?locomocao.inclinacoesPes[side==='L'?0:1]:m.pitchPe(sign)),ankle);
    adicionar(side+'foot',foot);
    if(m.mundo==='nave')ops.push({grupo:side+'magnet',transformar:foot,imaAtivo:locomocao?.imasAtivos?.[side==='L'?0:1]??m.noChao});
    const shoulder=torso([sign*.34,1.30,.06]);
    const hand=m.quantidade?torso(m.pontoCarga([sign*.28,-.018,0])):torso([sign*.34,.74,-(locomocao?.pes[side==='L'?0:1]??m.pe(sign))[2]*(locomocao?.bracosFator??.38)+m.bracosSalto*.16]);
    const elbow=cotovelo(shoulder,hand,.32,.34,[sign,-.4,-.5]);
    bone(side+'upperArm',shoulder,elbow);bone(side+'forearm',elbow,hand);
    adicionar(side+'hand',p=>somar(p,hand));
  }
  for(let i=0;i<m.quantidade;i++){
    const t=m.progresso(i),pickup:V3=[(1-t)*.65,-(1-t)*.8,(1-t)*.25];
    adicionar('battery',p=>torso(somar(m.pontoCarga(somar(p,[0,i*.245,0])),pickup)));
  }
  if(locomocao)return ops.map(item=>({...item,transformar:p=>somar(item.transformar(p),[0,locomocao.altura,0])}));
  return ops;
}
