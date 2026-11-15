// Grounded footprints and ballistic lunar dust. Building illumination is rendered in Blender.
import Phaser from 'phaser';
import paletaLua from '../dados/paleta_lua.json';
const COR_IMPRESSAO=Number.parseInt(paletaLua.sombraSolo.slice(1),16);
const COR_POEIRA=Number.parseInt(String(paletaLua.solo[2][1]).slice(1),16);
const COR_SULCO=Number.parseInt(String(paletaLua.solo[0][1]).slice(1),16);
import { paraTela, type Projecao } from '../engine/iso';
import type { Corpo } from '../engine/fisica';
import type { Terreno } from '../engine/terreno';
import type { Construcao } from '../engine/construcao';
import { movimentoReduzido, video } from '../video';
import { LEVE } from './qualidade';

type Marca = { x: number; y: number; dx: number; dy: number; nascimento: number };
const VIDA_PEGADA = 60;
const FADE_PEGADA = 20;
type Grao = { x: number; y: number; z: number; vx: number; vy: number; vz: number; t: number };

export class Ambiente {
  private marcas: Marca[] = [];
  private graos: Grao[] = [];
  private gPegadas: Phaser.GameObjects.Graphics;
  private gPoeira: Phaser.GameObjects.Graphics;
  private ultimo: {x:number;y:number} | null = null;
  private distancia = 0;
  private lado = 1;
  private intervalo = 0;
  private pegadasVisiveis = true;
  private ultimaAtualizacaoPegadas = 0;

  constructor(private cena: Phaser.Scene, private mapa: Phaser.GameObjects.Layer, private p: Projecao, private terreno: Terreno) {
    this.gPegadas=cena.add.graphics().setDepth(-800_000);
    this.gPoeira=cena.add.graphics().setDepth(-600_000);
    mapa.add([this.gPegadas,this.gPoeira]);
  }

  update(dt: number, corpo: Corpo, construcoes: readonly Construcao[]) {
    const leve = video.qualidade === 'leve' || (video.qualidade === 'auto' && LEVE);
    const reduzido = movimentoReduzido();
    this.passos(corpo,construcoes,leve,reduzido);
    // Age continues even while standing still or looking at space; no count-based eviction.
    const agora=this.cena.time.now/1000;
    if(this.marcas.length && agora-this.ultimaAtualizacaoPegadas>=0.2) this.redesenharPegadas();
    if (this.pegadasVisiveis !== video.pegadas) {
      this.pegadasVisiveis=video.pegadas;
      this.gPegadas.setVisible(video.pegadas);
    }
    this.intervalo+=dt;
    if(this.intervalo < (leve ? 1/24 : 1/40)) return;
    const elapsed=this.intervalo; this.intervalo=0;
    this.gPoeira.clear();
    if(!video.efeitos || reduzido) {this.graos=[];return;}
    this.graos=this.graos.filter(gr=>{
      gr.t+=elapsed;
      const z=gr.z+gr.vz*gr.t-0.23*gr.t*gr.t;
      const x=gr.x+gr.vx*gr.t,y=gr.y+gr.vy*gr.t;
      if(gr.t>0.55 || z<this.terreno.altura(x,y))return false;
      const pos=paraTela(this.p,x,y,z);
      this.gPoeira.fillStyle(COR_POEIRA,0.55*(1-gr.t/0.55)).fillCircle(pos.x,pos.y,0.9);
      return true;
    });
  }

  private passos(k: Corpo, construcoes: readonly Construcao[], leve: boolean, reduzido: boolean) {
    const now={x:k.x,y:k.y};
    const previous=this.ultimo;this.ultimo=now;
    if(!previous)return;
    const dx=k.x-previous.x,dy=k.y-previous.y,dist=Math.hypot(dx,dy);
    const soil=k.noChao && Math.abs(k.z-this.terreno.altura(k.x,k.y))<0.08 &&
      !construcoes.some(c=>k.x>=c.gx && k.x<=c.gx+c.tipo.w && k.y>=c.gy && k.y<=c.gy+c.tipo.h);
    if(!soil || dist>1 || dist<0.0001) {this.distancia=0;return;}
    if(!video.pegadas)return;
    this.distancia+=dist;
    if(this.distancia<0.32)return;
    this.distancia%=0.32;
    this.lado*=-1;
    const ux=dx/dist,uy=dy/dist;
    const x=k.x-uy*0.10*this.lado,y=k.y+ux*0.10*this.lado;
    this.marcas.push({x,y,dx:ux,dy:uy,nascimento:this.cena.time.now/1000});
    this.redesenharPegadas();
    if(video.efeitos && !reduzido) {
      for(let i=0;i<(leve?2:4);i++) this.graos.push({x,y,z:this.terreno.altura(x,y)+0.01,vx:-ux*0.10+(Math.random()-0.5)*0.12,vy:-uy*0.10+(Math.random()-0.5)*0.12,vz:0.10+Math.random()*0.10,t:0});
      if(this.graos.length>40)this.graos.splice(0,this.graos.length-40);
    }
  }

  private redesenharPegadas() {
    const g=this.gPegadas.clear();
    const agora=this.cena.time.now/1000;
    this.ultimaAtualizacaoPegadas=agora;
    this.marcas=this.marcas.filter(m=>agora-m.nascimento<VIDA_PEGADA);
    for(const m of this.marcas) {
      const t=Phaser.Math.Clamp((agora-m.nascimento-(VIDA_PEGADA-FADE_PEGADA))/FADE_PEGADA,0,1);
      const alpha=1-t*t*(3-2*t);
      const q=(forward:number,side:number)=>{
        const x=m.x+m.dx*forward-m.dy*side,y=m.y+m.dy*forward+m.dx*side;
        return paraTela(this.p,x,y,this.terreno.altura(x,y)+0.006);
      };
      const outline=[q(-0.095,-0.045),q(0.08,-0.045),q(0.115,-0.025),q(0.115,0.025),q(0.08,0.045),q(-0.095,0.045)];
      g.fillStyle(COR_IMPRESSAO,0.40*alpha).fillPoints(outline,true);
      g.lineStyle(0.8,COR_POEIRA,0.5*alpha).lineBetween(outline[4].x,outline[4].y,outline[5].x,outline[5].y);
      for(const forward of [-0.055,0,0.055]) {
        const a=q(forward,-0.03),b=q(forward,0.03);
        g.lineStyle(0.7,COR_SULCO,0.65*alpha).lineBetween(a.x,a.y,b.x,b.y);
      }
    }
  }
}
