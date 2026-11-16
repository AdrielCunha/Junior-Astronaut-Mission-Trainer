import type { ContatoPegada } from '../engine/pegadas.ts';
import type Phaser from 'phaser';
import type { Corpo } from '../engine/fisica.ts';
import { METROS_POR_TILE_CORPO } from '../engine/fisica.ts';
import { skinBase, skinUsaProcedural } from '../dados/skins.ts';
import { video, movimentoReduzido } from '../video.ts';
import { MovimentoLab } from './movimento.ts';
import { criarPose } from './pose.ts';
import { LocomocaoMagnetica } from './magnetica.ts';
import { LocomocaoLunar, orientacaoDoMapa, pontoDoMapa, cameraIsometrica, PROJECAO_PADRAO, pegadaDoContato, type EixosMapa } from './locomocao.ts';
import { RenderizadorAstronauta, type ModeloAstronauta, type PaletaAstronauta } from './renderizador.ts';
let carregamento: Promise<ModeloAstronauta|null>|null=null;
function carregar(){
  return carregamento??=fetch(`${(import.meta.env?.BASE_URL??'./')}lab/astronauta-modelo.json`).then(async r=>{
    if(!r.ok)return null;const m=await r.json() as ModeloAstronauta;
    return m.version===2&&m.groups.head&&m.groups.battery?m:null;
  }).catch(()=>null);
}
const cores: Record<string,[string,string]>={comandante:['#cbd5e1','#38bdf8'],marte:['#fb923c','#fde68a'],floresta:['#86efac','#bef264'],nebulosa:['#c4b5fd','#f0abfc'],solar:['#fde047','#ffffff'],oceano:['#67e8f9','#a5f3fc']};
export function paletaSkin(id:string): PaletaAstronauta {
  const skin=skinBase(id),extra=cores[skin.id];
  return {suit:skin.traje,accent:skin.cor,boot:skin.botas,pack:extra[0],glint:extra[1]};
}

/** Optional visual layer. Never changes the body, collision, inventory or jump timing. */
export class AstronautaEmJogo {
  private modelo: ModeloAstronauta|null=null;
  private pedido=false;
  private fechado=false;
  private renderer: RenderizadorAstronauta|null=null;
  private textura: Phaser.Textures.CanvasTexture|null=null;
  private contexto: CanvasRenderingContext2D|null=null;
  private movimento=new MovimentoLab();
  private lunar=new LocomocaoLunar();
  private magnetica=new LocomocaoMagnetica();
  private usaPassosMagneticos=false;
  private eventosMagneticos={soltou:false,fixou:false};
  get passosPropriosAtivos(){return skinUsaProcedural(video.skin)&&(this.usaPassosLunares||this.usaPassosMagneticos);}
  consumirEventosMagneticos(){const e=this.eventosMagneticos;this.eventosMagneticos={soltou:false,fixou:false};return e;}
  private contatoLunar:ContatoPegada|null=null;
  private usaPassosLunares=false;
  get passosLunaresAtivos(){return this.usaPassosLunares&&skinUsaProcedural(video.skin);}
  consumirContatoLunar(){const contato=this.contatoLunar;this.contatoLunar=null;return contato;}
  private tempo=0;
  private temQuadro=false;
  private ultimaSkin='';
  private yaw=0;
  private falhou=false;
  private chave: string;
  private scene: Phaser.Scene;
  constructor(scene:Phaser.Scene){
    this.scene=scene;this.chave=`astronauta-procedural-${scene.sys.settings.key}`;
    scene.events.once('shutdown',()=>{this.fechado=true;this.liberar();});
  }
  private liberar(){
    const tinhaModelo=!!this.renderer;
    this.renderer?.destruir();this.renderer=null;
    if(tinhaModelo)this.movimento=new MovimentoLab();
    if(this.textura)this.scene.textures.remove(this.chave);
    this.textura=null;this.contexto=null;this.tempo=0;this.temQuadro=false;this.lunar.reiniciar();this.usaPassosLunares=false;this.contatoLunar=null;this.magnetica.reiniciar();this.usaPassosMagneticos=false;this.eventosMagneticos={soltou:false,fixou:false};
  }
  atualizar(sprite:Phaser.GameObjects.Sprite,corpo:Corpo,mundo:'lua'|'marte'|'nave',carga:number,direcao:number,fase:number,dt:number,chao:number,projecao:EixosMapa=PROJECAO_PADRAO,escala=.25):boolean {
    this.contatoLunar=null;this.eventosMagneticos={soltou:false,fixou:false};
    if(this.fechado)return false;
    if(!skinUsaProcedural(video.skin)){this.liberar();return false;}
    if(this.falhou)return false;
    if(!this.pedido){this.pedido=true;void carregar().then(m=>{if(!this.fechado)this.modelo=m;});}
    if(!this.modelo)return false;
    if(!this.renderer){
      this.renderer=RenderizadorAstronauta.criar(this.modelo);
      if(!this.renderer){this.falhou=true;return false;}
      const texture=this.scene.textures.createCanvas(this.chave,192,192);
      if(!texture){this.liberar();this.falhou=true;return false;}
      this.textura=texture;this.contexto=texture.context;this.yaw=orientacaoDoMapa(0,0,direcao,projecao);
    }
    this.movimento.mundo=mundo;
    if(this.movimento.quantidade!==Math.min(5,Math.max(0,carga)))this.movimento.definirCarga(carga,this.temQuadro);
    this.movimento.sincronizarFisica(corpo.noChao,corpo.vz*METROS_POR_TILE_CORPO,Math.max(0,corpo.z-chao)*METROS_POR_TILE_CORPO);
    const limiteMovimento=mundo==='nave'?.035:.3;
    this.movimento.atualizar(dt,Math.hypot(corpo.vx,corpo.vy)>limiteMovimento&&corpo.noChao);
    // Share the mission gait's continuous clock: foot contacts and existing SFX stay in sync.
    if(this.movimento.estadoSalto==='solo')this.movimento.fase=fase/8*Math.PI*2+.45*Math.PI*2;
    const andando=Math.hypot(corpo.vx,corpo.vy)>limiteMovimento&&corpo.noChao;
    // Velocity already turns smoothly in the physics engine; a second yaw lag causes moonwalking.
    if(Math.hypot(corpo.vx,corpo.vy)>limiteMovimento)this.yaw=orientacaoDoMapa(corpo.vx,corpo.vy,direcao,projecao);
    const camera=cameraIsometrica(projecao);
    const raiz=pontoDoMapa(corpo.x,corpo.y,corpo.z,projecao,56,escala);
    const lunar=mundo==='lua'?this.lunar.atualizar(dt,raiz,this.yaw,andando,corpo.noChao,Math.hypot(...pontoDoMapa(corpo.vx,corpo.vy,0,projecao,56,escala))):null;
    const magnetica=mundo==='nave'?this.magnetica.atualizar(dt,raiz,this.yaw,andando,corpo.noChao):null;
    const locomocao=lunar??magnetica;
    if(mundo!=='lua')this.lunar.reiniciar();
    if(mundo!=='nave')this.magnetica.reiniciar();
    this.usaPassosLunares=!!lunar;this.usaPassosMagneticos=!!magnetica;
    this.eventosMagneticos={soltou:magnetica?.soltou??false,fixou:magnetica?.fixou??false};
    this.contatoLunar=lunar?.marca?pegadaDoContato(lunar.marca,projecao,56,escala):null;
    if(locomocao)this.movimento.fase=locomocao.fase;
    this.tempo+=dt;
    const fps=locomocao?(video.qualidade==='leve'?30:60):(video.qualidade==='leve'?15:30);
    if(this.tempo+1e-6>=1/fps||!this.temQuadro||this.ultimaSkin!==video.skin||(locomocao?.exigeAtualizacao??locomocao?.apoio)){
      this.tempo=Math.max(0,this.tempo-1/fps);this.temQuadro=true;this.ultimaSkin=video.skin;
      const ok=this.renderer.desenhar(criarPose(this.movimento,movimentoReduzido(),locomocao),{largura:192,altura:192,pixelsPorMetro:56,origemX:96,origemY:164.19,alvoY:0,azimuth:camera.azimuth,elevation:camera.elevation,yaw:this.yaw},paletaSkin(video.skin));
      if(!ok){this.liberar();this.falhou=true;return false;}
      this.contexto!.clearRect(0,0,192,192);this.contexto!.drawImage(this.renderer.canvas,0,0);this.textura!.refresh();
    }
    sprite.setTexture(this.chave);
    return true;
  }
}
