import { ALTURA_TORNOZELO, girar, somar, escalar, type V3 } from './movimento.ts';
import type { PoseLocomocao } from './locomocao.ts';
const neutro=(i:number):V3=>[i===0?-.17:.17,ALTURA_TORNOZELO,0];
const suave=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export type PoseMagnetica = PoseLocomocao & { soltou:boolean; fixou:boolean; peMovel:0|1 };

/** One sole stays locked while the other peels off, advances and clamps onto the deck. */
export class LocomocaoMagnetica {
  private ancoras:[V3,V3]|null=null;
  private yawSolas:[number,number]=[0,0];
  private peMovel:0|1=1;
  private tempo=0;
  private emPasso=false;
  private fixouNoPasso=false;
  private origemMovel:V3=[0,0,0];
  private destinoMovel:V3=[0,0,0];
  private yawInicio=0;
  private duracao=.38;
  private raizAnterior:V3|null=null;
  reiniciar(){this.ancoras=null;this.emPasso=false;this.tempo=0;this.fixouNoPasso=false;this.raizAnterior=null;}
  atualizar(dt:number,raiz:V3,yaw:number,andando:boolean,noChao:boolean):PoseMagnetica|null {
    dt=Math.max(0,Math.min(.05,dt));
    if(!noChao){this.reiniciar();return null;}
    const velocidade=this.raizAnterior&&dt>0?escalar(somar(raiz,escalar(this.raizAnterior,-1)),1/dt):[0,0,0] as V3;
    this.raizAnterior=[...raiz];
    if(!this.ancoras){
      this.ancoras=[0,1].map(i=>somar(raiz,girar(somar(neutro(i),[0,0,.16]),yaw))) as [V3,V3];
      this.yawSolas=[yaw,yaw];
    }
    let soltou=false,fixou=false;
    if(!this.emPasso&&andando){
      this.emPasso=true;this.tempo=0;this.fixouNoPasso=false;
      // A released sole can advance immediately; never stretch the leg to an old deck anchor.
      const local=girar(somar(this.ancoras[this.peMovel],escalar(raiz,-1)),-yaw);
      local[0]=Math.max(-.22,Math.min(.22,local[0]));local[2]=Math.max(-.22,Math.min(.22,local[2]));
      this.origemMovel=somar(raiz,girar(local,yaw));this.yawInicio=this.yawSolas[this.peMovel];soltou=true;
    }else if(this.emPasso)this.tempo+=dt;
    // Shorten the mechanical cycle as movement accelerates, preserving the planted sole.
    if(this.emPasso&&!this.fixouNoPasso)this.duracao=Math.max(.055,Math.min(.38,.44/Math.max(.5,Math.hypot(velocidade[0],velocidade[2]))));
    let t=this.emPasso?Math.min(1,this.tempo/this.duracao):0;
    const apoio=(1-this.peMovel) as 0|1;
    const ancoraApoio=girar(somar(this.ancoras[apoio],escalar(raiz,-1)),-yaw);
    const transferir=this.emPasso&&!this.fixouNoPasso&&Math.hypot(ancoraApoio[0],ancoraApoio[2])>.31;
    if(transferir)t=Math.max(t,.8);
    let movel=[...this.ancoras[this.peMovel]] as V3;
    const imas:[boolean,boolean]=[true,true],pitch:[number,number]=[0,0];
    if(this.emPasso&&!this.fixouNoPasso){
      imas[this.peMovel]=false;
      const destino=somar(somar(raiz,girar(somar(neutro(this.peMovel),[0,0,andando?.16:0]),yaw)),andando?escalar(velocidade,(1-t)*this.duracao):[0,0,0]);
      // Keep tracking only while airborne; the target is frozen before the final downward clamp.
      if(t<.65||this.tempo===0||t>=.8)this.destinoMovel=destino;
      const advance=suave((t-.15)/.55);
      movel=somar(escalar(this.origemMovel,1-advance),escalar(this.destinoMovel,advance));
      const lift=t<.22?.015+.075*suave(t/.22):t<.55?.09:.09*(1-suave((t-.55)/.25));
      movel[1]+=lift;pitch[this.peMovel]=.10*Math.sin(Math.PI*Math.min(1,t/.8));
      if(t>=.8){
        this.ancoras[this.peMovel]=[...this.destinoMovel];this.yawSolas[this.peMovel]=yaw;
        this.fixouNoPasso=true;fixou=true;movel=[...this.ancoras[this.peMovel]];imas[this.peMovel]=true;pitch[this.peMovel]=0;
      }
    }
    const pes=this.ancoras.map(p=>girar(somar(p,escalar(raiz,-1)),-yaw)) as [V3,V3];
    pes[this.peMovel]=girar(somar(movel,escalar(raiz,-1)),-yaw);
    if(fixou&&transferir){
      // At arcade map speed, hand over support as soon as the incoming magnet clamps.
      imas[apoio]=false;pes[apoio][2]=Math.max(-.22,Math.min(.22,pes[apoio][2]));pes[apoio][1]+=.02;
    }
    const rotacoes=this.yawSolas.map(v=>v-yaw) as [number,number];
    if(this.emPasso&&!this.fixouNoPasso)rotacoes[this.peMovel]=(this.yawInicio-yaw)*(1-suave(t/.7));
    const peso=this.emPasso?Math.sin(Math.PI*t):0;
    const pose:PoseMagnetica={altura:0,compressao:this.emPasso?.25+.08*peso:.25,exigeAtualizacao:this.emPasso||andando,quadrilX:(apoio===0?-1:1)*.025*peso,
      bracosFator:.16,peApoio:apoio,pes,marca:null,contato:fixou,apoio:true,fase:t*Math.PI*2,
      rotacoesPes:rotacoes,inclinacoesPes:pitch,imasAtivos:imas,soltou,fixou,peMovel:this.peMovel};
    if(this.emPasso&&(t>=1||(fixou&&(transferir||this.duracao<.13)))){this.emPasso=false;this.peMovel=(1-this.peMovel) as 0|1;}
    return pose;
  }
}
