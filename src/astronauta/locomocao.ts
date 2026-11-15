import type { ContatoPegada } from '../engine/pegadas.ts';
import { ALTURA_TORNOZELO, GRAVIDADE, girar, somar, escalar, type V3 } from './movimento.ts';
export type EixosMapa = { ex: readonly number[]; ey: readonly number[]; ez: readonly number[] };
export const PROJECAO_PADRAO: EixosMapa = {ex:[30,15],ey:[-30,15],ez:[0,-36.7423]};
export function cameraIsometrica(p:EixosMapa){
  const horizontal=Math.hypot(p.ex[0],p.ey[0]);
  return {azimuth:Math.atan2(-p.ey[0],p.ex[0]),elevation:Math.asin(Math.min(.98,Math.max(.05,Math.hypot(p.ex[1],p.ey[1])/horizontal)))};
}
// Invert the renderer's ground projection using the ACTUAL map basis, not compass angles.
export function pontoDoMapa(x:number,y:number,z:number,p:EixosMapa,pixelsPorMetro=56,escala=.25):V3 {
  const {azimuth:a,elevation:e}=cameraIsometrica(p),s=pixelsPorMetro*escala;
  const sx=(x*p.ex[0]+y*p.ey[0])/s,sy=(x*p.ex[1]+y*p.ey[1])/s/Math.sin(e);
  return [Math.cos(a)*sx+Math.sin(a)*sy,-z*p.ez[1]/(s*Math.cos(e)),-Math.sin(a)*sx+Math.cos(a)*sy];
}
export function orientacaoDoMapa(vx:number,vy:number,direcao:number,p:EixosMapa=PROJECAO_PADRAO):number {
  const theta=direcao*Math.PI/4;
  const d=pontoDoMapa(Math.hypot(vx,vy)>.001?vx:Math.cos(theta),Math.hypot(vx,vy)>.001?vy:-Math.sin(theta),0,p);
  return Math.atan2(d[0],d[2]);
}
export function mapaDoPonto(v:V3,p:EixosMapa,pixelsPorMetro=56,escala=.25){
  const c=cameraIsometrica(p),s=pixelsPorMetro*escala;
  const sx=(v[0]*Math.cos(c.azimuth)-v[2]*Math.sin(c.azimuth))*s;
  const sy=(v[0]*Math.sin(c.azimuth)+v[2]*Math.cos(c.azimuth))*Math.sin(c.elevation)*s;
  const d=p.ex[0]*p.ey[1]-p.ey[0]*p.ex[1];
  return {x:(sx*p.ey[1]-p.ey[0]*sy)/d,y:(p.ex[0]*sy-sx*p.ex[1])/d,z:v[1]*s*Math.cos(c.elevation)/(-p.ez[1])};
}
export function pegadaDoContato(c:ContatoBota,p:EixosMapa,pixelsPorMetro=56,escala=.25):ContatoPegada {
  // The ankle is above the sole; its centre is six centimetres forward in the source model.
  const pos=mapaDoPonto(somar(c.posicao,girar([0,-ALTURA_TORNOZELO,.06],c.yaw)),p,pixelsPorMetro,escala);
  const d=mapaDoPonto(girar([0,0,1],c.yaw),p,pixelsPorMetro,escala),len=Math.hypot(d.x,d.y);
  return {...pos,ux:d.x/len,uy:d.y/len,lado:c.pe,comprimento:.37*len,largura:.24*len};
}
export type ContatoBota = { pe:0|1; posicao:V3; yaw:number };
export type PoseLocomocao = { exigeAtualizacao?:boolean; quadrilX?:number; bracosFator?:number; imasAtivos?:[boolean,boolean]; peApoio:0|1; marca:ContatoBota|null; inclinacoesPes:[number,number]; rotacoesPes:[number,number]; altura:number; compressao:number; pes:[V3,V3]; contato:boolean; apoio:boolean; fase:number };
const suave=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const neutros: [V3,V3]=[[-.155,ALTURA_TORNOZELO,0],[.155,ALTURA_TORNOZELO,0]];
const copiar=(p:V3):V3=>[...p];

/** Short planted contacts, long low-gravity flights. Purely visual: never moves the game body. */
export class LocomocaoLunar {
  private estado:'parado'|'apoio'|'voo'='parado';
  private tempo=0;
  private duracaoApoio=.05;
  private duracaoVoo=2*Math.sqrt(2*.24/GRAVIDADE.lua)/3.2; // lunar ballistic arc, played 3.2× faster
  private ancoras:[V3,V3]=neutros.map(copiar) as [V3,V3];
  private inicioVoo:[V3,V3]=neutros.map(copiar) as [V3,V3];
  private raizAnterior:V3|null=null;
  private lado=1;
  private yawSolas:[number,number]=[0,0];
  private tempoParado=0;
  private repousoCompleto=false;
  reiniciar(){this.estado='parado';this.tempo=0;this.lado=1;this.tempoParado=0;this.repousoCompleto=false;this.raizAnterior=null;}
  atualizar(dt:number,raiz:V3,yaw:number,andando:boolean,noChao:boolean,velocidadeInicial=0):PoseLocomocao|null {
    dt=Math.max(0,Math.min(.05,dt));
    const tinhaRaiz=!!this.raizAnterior;
    const delta=this.raizAnterior?somar(raiz,escalar(this.raizAnterior,-1)):[0,0,0] as V3;
    this.raizAnterior=copiar(raiz);
    if(!noChao){this.estado='parado';this.tempo=0;return null;}
    const velocidade=tinhaRaiz&&dt>0?Math.hypot(delta[0],delta[2])/dt:velocidadeInicial;
    let marca:ContatoBota|null=null;
    const peAtivo=()=>this.lado%2 as 0|1;
    const pousar=()=>{
      this.estado='apoio';this.tempo=0;this.lado++;this.tempoParado=0;this.repousoCompleto=false;
      // Limit stance travel to 30 cm: a boot cannot remain planted beyond leg reach.
      this.duracaoApoio=Math.max(.026,Math.min(.085,.30/Math.max(.25,velocidade)));
      const frente=Math.min(.15,velocidade*this.duracaoApoio*.5);
      this.ancoras=neutros.map((p,i)=>somar(raiz,girar(somar(p,i===peAtivo()?[0,0,frente]:[0,.16,-.16]),yaw))) as [V3,V3];
      this.yawSolas[peAtivo()]=yaw;
      marca={pe:peAtivo(),posicao:copiar(this.ancoras[peAtivo()]),yaw};
    };
    if(this.estado==='parado'){
      if(!andando)return null;
      pousar();
    }else this.tempo+=dt;
    if(this.estado==='apoio'){
      const ativo=peAtivo(),outro=(1-ativo) as 0|1;
      if(!andando)this.tempo=Math.min(this.tempo,this.duracaoApoio);
      const pes=this.ancoras.map(p=>girar(somar(p,escalar(raiz,-1)),-yaw)) as [V3,V3];
      if(andando){
        this.tempoParado=0;
        // Only the supporting sole is planted. The other knee stays flexed behind the body.
        pes[outro]=somar(neutros[outro],[0,.16,-.16]);
      }else if(!this.repousoCompleto){
        this.tempo=Math.min(this.tempo,this.duracaoApoio);
        this.tempoParado+=dt;
        const t=suave(this.tempoParado/.16);
        pes[outro]=somar(neutros[outro],[0,.16*(1-t),-.16*(1-t)]);
        if(t>=1){
          this.ancoras[outro]=somar(raiz,girar(pes[outro],yaw));this.repousoCompleto=true;this.yawSolas[outro]=yaw;this.lado++;
          marca={pe:outro,posicao:copiar(this.ancoras[outro]),yaw};
        }
      }
      const a=pes[ativo];
      const foraDoAlcance=Math.hypot(a[0],a[2])>.31||Math.hypot(a[0]-neutros[ativo][0],.82-a[1],a[2])>.805;
      if(andando&&(this.tempo>=this.duracaoApoio||foraDoAlcance)){
        this.estado='voo';this.tempo=Math.max(0,this.tempo-this.duracaoApoio);
        this.inicioVoo=pes.map(p=>[Math.max(-.2,Math.min(.2,p[0])),Math.max(ALTURA_TORNOZELO,p[1]),Math.max(-.20,Math.min(.20,p[2]))]) as [V3,V3];
      }else{
        const inclinacoes:[number,number]=[0,0];if(andando)inclinacoes[outro]=.12;
        const rotacoes:[number,number]=[0,0];rotacoes[peAtivo()]=this.yawSolas[peAtivo()]-yaw;
        if(this.repousoCompleto)rotacoes[1-peAtivo()]=this.yawSolas[1-peAtivo()]-yaw;
        return {altura:0,compressao:andando?.22*Math.sin(Math.PI*Math.min(1,this.tempo/this.duracaoApoio)):0,pes,contato:!!marca,marca,peApoio:peAtivo(),inclinacoesPes:inclinacoes,rotacoesPes:rotacoes,apoio:true,fase:0};
      }
    }
    if(this.tempo>=this.duracaoVoo){
      pousar();
      const pes=this.ancoras.map(p=>girar(somar(p,escalar(raiz,-1)),-yaw)) as [V3,V3];
      const outro=(1-peAtivo()) as 0|1;pes[outro]=somar(neutros[outro],[0,.16,-.16]);
      const inclinacoes:[number,number]=[0,0];inclinacoes[outro]=.12;
      return {altura:0,compressao:0,pes,contato:true,marca,peApoio:peAtivo(),inclinacoesPes:inclinacoes,rotacoesPes:[0,0],apoio:true,fase:0};
    }
    const t=this.tempo/this.duracaoVoo,arco=4*t*(1-t),s=suave(t);
    const frentePrevista=andando?Math.min(.15,velocidade*Math.max(.026,Math.min(.085,.30/Math.max(.25,velocidade)))*.5):0;
    const pes=this.inicioVoo.map((p,i)=>{
      const proximo=i!==peAtivo();
      const destino:V3=[neutros[i][0],ALTURA_TORNOZELO+(proximo?0:.16),proximo?frentePrevista:-.16];
      return somar(somar(escalar(p,1-s),escalar(destino,s)),[0,(proximo?.065:.02)*Math.sin(Math.PI*t),0]);
    }) as [V3,V3];
    const inclinacoes=pes.map((_,i)=>i===peAtivo()?.12*s:-.08*Math.sin(Math.PI*t)) as [number,number];
    return {altura:.24*arco,compressao:0,pes,contato:!!marca,marca,peApoio:peAtivo(),inclinacoesPes:inclinacoes,rotacoesPes:[0,0],apoio:false,fase:t*Math.PI*2};
  }
}
