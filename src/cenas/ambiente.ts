// Generated with AI assistance. See README, "Use of AI tools".
// Grounded footprints and ballistic lunar dust. Building illumination is rendered in Blender.
import Phaser from 'phaser';
import paletaLua from '../dados/paleta_lua.json';
import paletaMarte from '../dados/paleta_marte.json';
const cor=(h: string)=>Number.parseInt(h.slice(1),16);
import { paraTela, type Projecao } from '../engine/iso';
import type { Corpo } from '../engine/fisica';
import type { Rover } from '../engine/rover';
import type { Terreno } from '../engine/terreno';
import type { Construcao } from '../engine/construcao';
import { movimentoReduzido, video } from '../video';
import { LEVE } from './qualidade';

type P2 = { x: number; y: number };
// A footprint keeps its screen shape, computed once when it is made (the ground does not move).
type Marca = { nascimento: number; contorno: P2[]; riscos: [P2, P2][]; pneu?: boolean };
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
  private ultimoRastro: {x: number; y: number; angulo: number} | null = null;

  // Mars: rust-colored prints and dust, shorter steps, and dust that hangs in the thin air and
  // drifts with the wind instead of falling straight back as on the airless Moon.
  private readonly corImpressao: number;
  private readonly corPoeira: number;
  private readonly corSulco: number;
  private readonly passoTiles: number;
  private readonly gPoeiraTiles: number;
  private readonly vidaPoeira: number;
  private readonly vento: number;

  private readonly metal: boolean;              // the ship's deck: no prints, no dust

  constructor(private cena: Phaser.Scene, private mapa: Phaser.GameObjects.Layer, private p: Projecao, private terreno: Terreno, mundo: 'lua' | 'marte' | 'nave' = 'lua') {
    const marte = mundo === 'marte';
    this.metal = mundo === 'nave';
    const pal = marte ? paletaMarte : paletaLua;
    this.corImpressao = cor(pal.sombraSolo); this.corPoeira = cor(String(pal.solo[2][1])); this.corSulco = cor(String(pal.solo[0][1]));
    this.passoTiles = marte ? 0.26 : 0.32;
    this.gPoeiraTiles = marte ? 0.12 : 0.23;     // tiles/s2 for the grains: the air holds Mars dust up
    this.vidaPoeira = marte ? 1.3 : 0.55;
    this.vento = marte ? 0.12 : 0;
    this.gPegadas=cena.add.graphics().setDepth(-800_000);
    this.gPoeira=cena.add.graphics().setDepth(-600_000);
    mapa.add([this.gPegadas,this.gPoeira]);
  }

  update(dt: number, corpo: Corpo, construcoes: readonly Construcao[], rover?: Rover | null) {
    const leve = video.qualidade === 'leve' || (video.qualidade === 'auto' && LEVE);
    const reduzido = movimentoReduzido();
    if (rover?.dirigindo) {
      this.ultimo = null; this.distancia = 0;
      this.rastrosRover(rover,leve,reduzido);
    } else {
      this.ultimoRastro = null;
      this.passos(corpo,construcoes,leve,reduzido);
    }
    // Age continues even while standing still or looking at space; no count-based eviction.
    const agora=this.cena.time.now/1000;
    // Full redraw (for the fade) once a second; a new step is only appended in between.
    if(this.marcas.length && agora-this.ultimaAtualizacaoPegadas>=1) this.redesenharPegadas();
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
      const z=Math.max(gr.z+gr.vz*gr.t-this.gPoeiraTiles*gr.t*gr.t, this.vento ? this.terreno.altura(gr.x,gr.y)+0.01 : -Infinity);
      const x=gr.x+gr.vx*gr.t+this.vento*gr.t,y=gr.y+gr.vy*gr.t-this.vento*0.5*gr.t;
      if(gr.t>this.vidaPoeira || z<this.terreno.altura(x,y))return false;
      const pos=paraTela(this.p,x,y,z);
      this.gPoeira.fillStyle(this.corPoeira,0.55*(1-gr.t/this.vidaPoeira)).fillCircle(pos.x,pos.y,this.vento ? 1.2 : 0.9);
      return true;
    });
  }

  private rastrosRover(rover: Rover, leve: boolean, reduzido: boolean) {
    const k = rover.corpo;
    const atual = {x:k.x,y:k.y,angulo:rover.angulo};
    const anterior = this.ultimoRastro;
    if (!anterior || !video.pegadas || !k.noChao) { this.ultimoRastro = atual; return; }
    const dist = Math.hypot(k.x-anterior.x,k.y-anterior.y);
    if (dist > 1.5) { this.ultimoRastro = atual; return; }
    const espaco = leve ? 0.24 : 0.18;
    if (dist < espaco) return;
    const giro = Math.atan2(Math.sin(atual.angulo-anterior.angulo),Math.cos(atual.angulo-anterior.angulo));
    const contato = (pose: typeof atual, lado: number, deslocamento = 0) => ({
      x:pose.x-Math.cos(pose.angulo)*0.60-Math.sin(pose.angulo)*(lado*0.50+deslocamento),
      y:pose.y-Math.sin(pose.angulo)*0.60+Math.cos(pose.angulo)*(lado*0.50+deslocamento),
    });
    const projetar = (p: {x:number;y:number}) => paraTela(this.p,p.x,p.y,this.terreno.altura(p.x,p.y)+0.008);
    const segmentos = Math.ceil(dist/espaco);
    let inicio = anterior;
    for (let i=1;i<=segmentos;i++) {
      const t=i/segmentos;
      const fim={x:anterior.x+(atual.x-anterior.x)*t,y:anterior.y+(atual.y-anterior.y)*t,angulo:anterior.angulo+giro*t};
      for (const lado of [-1,1]) {
        const centro=contato(fim,lado);
        // Each strip follows a rear wheel, with V-shaped tread impressions in the dust.
        const ponta={x:centro.x+Math.cos(fim.angulo)*0.055,y:centro.y+Math.sin(fim.angulo)*0.055};
        const marca: Marca={nascimento:this.cena.time.now/1000,pneu:true,
          contorno:[projetar(contato(inicio,lado,-0.10)),projetar(contato(inicio,lado,0.10)),projetar(contato(fim,lado,0.10)),projetar(contato(fim,lado,-0.10))],
          riscos:[[projetar(contato(fim,lado,-0.09)),projetar(ponta)],[projetar(ponta),projetar(contato(fim,lado,0.09))]],
        };
        this.marcas.push(marca);
        this.desenharMarca(this.gPegadas,marca,1);
        if (video.efeitos && !reduzido && i===segmentos) {
          this.graos.push({x:centro.x,y:centro.y,z:this.terreno.altura(centro.x,centro.y)+0.015,
            vx:-k.vx*0.045+(Math.random()-0.5)*0.10,vy:-k.vy*0.045+(Math.random()-0.5)*0.10,vz:0.12,t:0});
        }
      }
      inicio=fim;
    }
    if(this.graos.length>40)this.graos.splice(0,this.graos.length-40);
    this.ultimoRastro=atual;
  }

  private passos(k: Corpo, construcoes: readonly Construcao[], leve: boolean, reduzido: boolean) {
    const now={x:k.x,y:k.y};
    const previous=this.ultimo;this.ultimo=now;
    if(!previous)return;
    const dx=k.x-previous.x,dy=k.y-previous.y,dist=Math.hypot(dx,dy);
    const soil=k.noChao && Math.abs(k.z-this.terreno.altura(k.x,k.y))<0.08 &&
      !construcoes.some(c=>k.x>=c.gx && k.x<=c.gx+c.tipo.w && k.y>=c.gy && k.y<=c.gy+c.tipo.h);
    if(!soil || dist>1 || dist<0.0001) {this.distancia=0;return;}
    if(!video.pegadas || this.metal)return;
    this.distancia+=dist;
    if(this.distancia<this.passoTiles)return;
    this.distancia%=this.passoTiles;
    this.lado*=-1;
    const ux=dx/dist,uy=dy/dist;
    const x=k.x-uy*0.10*this.lado,y=k.y+ux*0.10*this.lado;
    const q=(forward:number,side:number)=>{
      const px=x+ux*forward-uy*side,py=y+uy*forward+ux*side;
      return paraTela(this.p,px,py,this.terreno.altura(px,py)+0.006);
    };
    const marca: Marca={nascimento:this.cena.time.now/1000,
      contorno:[q(-0.095,-0.045),q(0.08,-0.045),q(0.115,-0.025),q(0.115,0.025),q(0.08,0.045),q(-0.095,0.045)],
      riscos:[-0.055,0,0.055].map(f=>[q(f,-0.03),q(f,0.03)] as [P2,P2])};
    this.marcas.push(marca);
    this.desenharMarca(this.gPegadas,marca,1);
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
      this.desenharMarca(g,m,1-t*t*(3-2*t));
    }
  }

  private desenharMarca(g: Phaser.GameObjects.Graphics, m: Marca, alpha: number) {
    const o=m.contorno;
    if (m.pneu) {
      g.fillStyle(this.corImpressao,0.30*alpha).fillPoints(o,true);
      g.lineStyle(0.7,this.corPoeira,0.40*alpha).lineBetween(o[0].x,o[0].y,o[3].x,o[3].y);
      for (const [a,b] of m.riscos) g.lineStyle(0.85,this.corSulco,0.65*alpha).lineBetween(a.x,a.y,b.x,b.y);
      return;
    }
    g.fillStyle(this.corImpressao,0.40*alpha).fillPoints(o,true);
    g.lineStyle(0.8,this.corPoeira,0.5*alpha).lineBetween(o[4].x,o[4].y,o[5].x,o[5].y);
    for(const [a,b] of m.riscos) g.lineStyle(0.7,this.corSulco,0.65*alpha).lineBetween(a.x,a.y,b.x,b.y);
  }
}
