import Phaser from 'phaser';
import { sessao, dadosTerreno, S_MAPA, uDeS } from './sessao';
import { paraTela, paraChao, paraMapaNaAltura } from '../engine/iso';
import { tipoOrientado, type AvaliacaoMovimento } from '../engine/construcao';
import type { Superficie, ObjetoEditor } from './Superficie';
import { dimensoesDeco } from '../dados/decoracao';
import { criarIconeJogo, letra } from '../tarefas/estilo';
import { tocarSfx } from '../sfx';

type BotaoEditor = {caixa: Phaser.GameObjects.Container; habilitar: (ativo: boolean) => void};
type Motivo = AvaliacaoMovimento['motivo'] | 'tripulacao';
type AvaliacaoEditor = Omit<AvaliacaoMovimento,'motivo'> & {motivo:Motivo};
const TEXTOS: Record<Motivo,[string,string]> = {
  ok:['Ready to place','Stable ground. This object fits here.'],
  fora:['Outside the build area','Keep the whole object inside the terrain boundary.'],
  ocupado:['Space already occupied','Choose a clear spot away from buildings and equipment.'],
  rochas:['Rocky ground','Large rocks block the foundation. Choose another spot.'],
  instavel:['Unstable crater zone','Crater floors and rims cannot support this foundation.'],
  ingreme:['Slope is too steep','Move to flatter terrain for a stable foundation.'],
  passagem:['Keep a service gap','Leave room between buildings so the crew can get through.'],
  tripulacao:['Keep the crew clear','Move the object away from the astronaut or rover.'],
};
const GUIA = [
  {titulo:'Pick an object',icone:'wrench',cor:0xfddd45,teclas:'LEFT CLICK  →  SELECT',texto:'Click a building, solar panel or small surface object with the left mouse button. Move your mouse to preview its new position.',dica:'The mission and storm timer pause while you edit. Moving objects costs no batteries.'},
  {titulo:'Turn your object',icone:'energy',cor:0xc4b5fd,teclas:'R  →  ROTATE 90°',texto:'Press R once to turn the selected object by 90 degrees. Press it again for 180°, 270° and back to 0°.',dica:'Only the selected object turns, staying upright on the ground. Its ground footprint and placement checks update with each turn.'},
  {titulo:'Choose safe ground',icone:'shield',cor:0x86efac,teclas:'GREEN = READY  /  RED = BLOCKED',texto:'A green preview means the object fits. A red preview means the spot is blocked. The inspector explains why: rocks, crater zones, steep slopes or obstacles.',dica:'Leave space between buildings, and keep the astronaut and rover clear. Invalid clicks keep the preview active.'},
  {titulo:'Click to place',icone:'backpack',cor:0xfddd45,teclas:'LEFT CLICK OR E  →  CONFIRM',texto:'Click the chosen spot with the left mouse button, or press E, to place your object. A valid position saves automatically.',dica:'Esc or right click cancels the preview. Ctrl/Cmd+Z undoes a move or rotation. Help reopens this guide.'},
];
const CHAVE_GUIA='lunar-odyssey-base-planner-guide-v3';

// A paused-world planning overlay. Only a confirmed move mutates the occupancy grid.
// Terrain/grid/ghost geometry is rebuilt on tile or camera changes, never every frame.
export class EditorBase extends Phaser.Scene {
  private sup!: Superficie;
  private cameraMapa!: Phaser.Cameras.Scene2D.Camera;
  private mundo!: Phaser.GameObjects.Layer;
  private ui!: Phaser.GameObjects.Layer;
  private gradeVisual!: Phaser.GameObjects.Graphics;
  private area!: Phaser.GameObjects.Graphics;
  private origem!: Phaser.GameObjects.Graphics;
  private fantasma!: Phaser.GameObjects.Image;
  private selecionado: ObjetoEditor | null = null;
  private imagemOriginal: Phaser.GameObjects.Image | null = null;
  private alphaOriginal = 1;
  private gx = 0;
  private gy = 0;
  private motivo: Motivo = 'ok';
  private mostrarGrade = true;
  private historico: {id:number;gx:number;gy:number;rotacao:number}[] = [];
  private pausadas: {key:string;visivel:boolean;input:boolean;keyboard:boolean}[] = [];
  private inicioArrasto: {x:number;y:number} | null = null;
  private arrastou = false;
  private nome!: Phaser.GameObjects.Text;
  private instrucao!: Phaser.GameObjects.Text;
  private estado!: Phaser.GameObjects.Text;
  private detalhe!: Phaser.GameObjects.Text;
  private medida!: Phaser.GameObjects.Text;
  private selo!: Phaser.GameObjects.Image;
  private colocar!: BotaoEditor;
  private cancelar!: BotaoEditor;
  private undo!: BotaoEditor;
  private btGrade!: BotaoEditor;
  private cartao = new Phaser.Geom.Rectangle();
  private cabecalho = new Phaser.Geom.Rectangle();
  private u = 1;
  private centroGrade = '';
  private pontosGrade: {x:number;y:number}[][] = [];
  private bloqueiosGrade = new Uint8Array();
  private botoesArea: {caixa:Phaser.GameObjects.Container;w:number;h:number}[] = [];
  private toast?: Phaser.GameObjects.Text;
  private passoGuia = -1;
  private modalGuia?: Phaser.GameObjects.Container;
  private rotacao = 0;

  constructor() { super({key:'EditorBase'}); }

  create() {
    if(sessao.mundo==='nave' || sessao.emTarefa || sessao.abastecendoRover) {this.scene.stop();return;}
    this.sup=this.scene.get('Superficie') as Superficie;
    this.sup.prepararEditor();
    sessao.editandoBase=true;
    this.selecionado=null;this.imagemOriginal=null;this.historico=[];this.pausadas=[];
    this.mostrarGrade=true;this.centroGrade='';this.inicioArrasto=null;this.arrastou=false;
    this.passoGuia=-1;this.modalGuia=undefined;this.rotacao=0;
    for(const key of ['Espaco','Superficie','Interface']) {
      const s=this.scene.get(key);
      this.pausadas.push({key,visivel:s.scene.isVisible(),input:s.input.enabled,keyboard:s.input.keyboard?.enabled??false});
      s.input.keyboard?.resetKeys();if(s.input.keyboard)s.input.keyboard.enabled=false;
      s.input.enabled=false;this.scene.pause(key);
    }
    this.scene.setVisible(false,'Interface');
    this.mundo=this.add.layer();this.ui=this.add.layer();
    this.gradeVisual=this.add.graphics();this.origem=this.add.graphics();this.area=this.add.graphics();
    this.fantasma=this.add.image(0,0,'mod_habitat').setVisible(false);
    this.mundo.add([this.gradeVisual,this.origem,this.area,this.fantasma]);
    const cam=this.sup.cameras.main;
    this.cameraMapa=this.cameras.add(0,0,this.scale.width,this.scale.height).setZoom(cam.zoom).setScroll(cam.scrollX,cam.scrollY);
    // Render world previews first, keeping the screen-space inspector above them.
    const cameras=this.cameras.cameras;
    cameras.splice(cameras.indexOf(this.cameraMapa),1);cameras.unshift(this.cameraMapa);
    this.cameraMapa.ignore(this.ui);this.cameras.main.ignore(this.mundo);
    const terreno=sessao.terreno,P=dadosTerreno.imagem;
    this.pontosGrade=Array.from({length:terreno.n+1},(_,y)=>Array.from({length:terreno.n+1},(_,x)=>paraTela(P,x,y,terreno.altura(x,y)+0.018)));
    this.bloqueiosGrade=new Uint8Array(terreno.n*terreno.n);
    for(let y=0;y<terreno.n;y++)for(let x=0;x<terreno.n;x++)this.bloqueiosGrade[y*terreno.n+x]=Number(!!terreno.obstaculoConstrucao(x,y,1,1)||terreno.inclinacaoEm(x,y)>terreno.maxConstruir);
    this.input.setDefaultCursor('default');
    this.cameras.main.setSize(this.scale.width,this.scale.height).setScroll(0,0).setZoom(1).setRotation(0);
    this.desenharUI();
    const centro=this.cameraMapa.getWorldPoint(this.scale.width/2,this.scale.height/2);
    const q=paraChao(dadosTerreno.imagem,sessao.terreno,centro.x,centro.y);
    this.desenharGrade(q?.gx??sessao.terreno.n/2,q?.gy??sessao.terreno.n/2,true);
    this.input.on('pointerdown',(p: Phaser.Input.Pointer)=>{
      if(this.passoGuia>=0)return;
      if(p.button===2){this.inicioArrasto=null;this.limparSelecao();return;}
      if(p.button!==0)return;
      if(this.sobreUI(p))return;
      this.inicioArrasto={x:p.x,y:p.y};this.arrastou=false;
    });
    this.input.on('pointermove',(p: Phaser.Input.Pointer)=>{
      if(this.inicioArrasto && p.isDown) {
        if(Phaser.Math.Distance.Between(this.inicioArrasto.x,this.inicioArrasto.y,p.x,p.y)>7)this.arrastou=true;
        if(this.arrastou && !this.selecionado)return;
      }
      if(this.selecionado && !this.sobreUI(p) && !p.wasTouch)this.apontar(p);
    });
    this.input.on('pointerup',(p: Phaser.Input.Pointer)=>{
      const clicar=!!this.inicioArrasto && !this.arrastou && !this.sobreUI(p) && p.button===0;
      this.inicioArrasto=null;this.arrastou=false;
      this.input.setDefaultCursor(this.selecionado?'crosshair':'default');
      if(clicar){if(this.selecionado){this.apontar(p);this.confirmar();}else this.selecionarEm(p);}
    });
    this.input.on('wheel',(p: Phaser.Input.Pointer,_o:unknown,_dx:number,dy:number)=>{if(!this.sobreUI(p))this.zoom(Math.exp(-dy*0.0015),p);});
    const kb=this.input.keyboard;
    kb?.on('keydown-ESC',()=>{if(this.passoGuia>=0)this.fecharGuia();else if(this.selecionado)this.limparSelecao();else this.scene.stop();});
    kb?.on('keydown-ENTER',()=>{if(this.passoGuia>=0)this.avancarGuia();else this.confirmar();});
    kb?.on('keydown-G',()=>{if(this.passoGuia<0)this.alternarGrade();});
    kb?.on('keydown-Z',(e: KeyboardEvent)=>{if(this.passoGuia<0 && (e.ctrlKey||e.metaKey)){e.preventDefault();this.desfazer();}});
    kb?.on('keydown-E',()=>{if(this.passoGuia<0)this.confirmar();});
    kb?.on('keydown-R',(e:KeyboardEvent)=>{if(!e.repeat && this.passoGuia<0)this.girarPredio();});
    kb?.on('keydown-H',()=>{if(this.passoGuia<0)this.abrirGuia();});
    const resize=()=>{
      this.cameras.main.setSize(this.scale.width,this.scale.height).setScroll(0,0).setZoom(1);
      this.cameraMapa.setSize(this.scale.width,this.scale.height);this.sup.cameras.main.setSize(this.scale.width,this.scale.height);
      this.desenharUI();this.atualizarFeedback();this.sincronizarCamera();
    };
    this.scale.on('resize',resize);
    this.events.once('shutdown',()=>{
      this.restaurarImagem();this.scale.off('resize',resize);sessao.editandoBase=false;
      this.sup.cameras.main.setRotation(0);
      this.input.setDefaultCursor('default');this.pontosGrade=[];this.bloqueiosGrade=new Uint8Array();
      for(const p of this.pausadas){const s=this.scene.get(p.key);s.input.enabled=p.input;if(s.input.keyboard){s.input.keyboard.resetKeys();s.input.keyboard.enabled=p.keyboard;}this.scene.setVisible(p.visivel,p.key);if(this.scene.isPaused(p.key))this.scene.resume(p.key);}
      sessao.salvar();
    });
    try {if(localStorage.getItem(CHAVE_GUIA)!=='done')this.abrirGuia();}catch{this.abrirGuia();}
  }

  private botao(x:number,y:number,w:number,h:number,texto:string,acao:()=>void,principal=false): BotaoEditor {
    const g=this.add.graphics(),t=this.add.text(w/2,h/2,texto,letra(14*this.u,'#ffffff',{fontStyle:'bold'})).setOrigin(0.5);
    g.fillStyle(principal?0x168656:0x203956).fillRoundedRect(0,0,w,h,10*this.u)
      .lineStyle(1.5,principal?0x86efac:0x58728f).strokeRoundedRect(0,0,w,h,10*this.u);
    const zona=this.add.zone(0,0,w,h).setOrigin(0).setInteractive({useHandCursor:true});
    const caixa=this.add.container(x,y,[g,t,zona]);this.ui.add(caixa);
    this.botoesArea.push({caixa,w,h});
    let armado=false;
    zona.on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e: Phaser.Types.Input.EventData)=>{e.stopPropagation();armado=true;});
    zona.on('pointerup',(_p:unknown,_x:unknown,_y:unknown,e: Phaser.Types.Input.EventData)=>{e.stopPropagation();if(armado){armado=false;tocarSfx('clique');acao();}});
    zona.on('pointerover',()=>t.setColor('#fddd45')).on('pointerout',()=>{t.setColor('#ffffff');armado=false;});
    return {caixa,habilitar:(ativo)=>{zona.input!.enabled=ativo;caixa.setAlpha(ativo?1:0.38);}};
  }

  private desenharUI() {
    this.ui.removeAll(true);this.toast=undefined;this.botoesArea=[];
    const W=this.scale.width,H=this.scale.height;this.u=Math.min(1,Math.max(0.82,W/900));
    const compacto=H<460;
    const u=this.u,m=14*u,hh=72*u,cw=Math.min(400,W-2*m),ch=(compacto?190:244)*u,cy=H-m-ch;
    this.cabecalho.setTo(m,m,W-2*m,hh);this.cartao.setTo(m,cy,cw,ch);
    const fundo=this.add.graphics().fillStyle(0x10223a,0.97).fillRoundedRect(m,m,W-2*m,hh,16*u)
      .lineStyle(1.5,0x55758e).strokeRoundedRect(m,m,W-2*m,hh,16*u)
      .fillStyle(0x10223a,0.97).fillRoundedRect(m,cy,cw,ch,16*u)
      .lineStyle(1.5,0x55758e).strokeRoundedRect(m,cy,cw,ch,16*u);
    this.ui.add(fundo);
    const icone=criarIconeJogo(this,m+30*u,m+hh/2,'wrench',34*u);
    const titulo=this.add.text(m+56*u,m+15*u,'BASE PLANNER',letra(20*u,'#fddd45',{fontStyle:'bold'}));
    const subtitulo=this.add.text(m+56*u,m+42*u,'Mission paused · Move objects',letra(11*u,'#bdd4e5'));
    this.ui.add([icone,titulo,subtitulo]);
    this.botao(W-m-86*u,m+16*u,72*u,40*u,'Done',()=>this.scene.stop(),true);
    this.botao(W-m-166*u,m+16*u,72*u,40*u,'Help',()=>this.abrirGuia());
    if(W<580){titulo.setFontSize(16*u);subtitulo.setText('Mission paused');titulo.setPosition(m+48*u,m+17*u);subtitulo.setX(m+48*u);}
    const px=m+18*u;
    this.nome=this.add.text(px,cy+17*u,'Select an object',letra(20*u,'#ffffff',{fontStyle:'bold'}));
    this.instrucao=this.add.text(px,cy+48*u,'Left click to select, then click a valid spot to place.',letra(12*u,'#bdd4e5',{wordWrap:{width:cw-36*u}})).setVisible(!compacto);
    this.selo=criarIconeJogo(this,px+14*u,cy+(compacto?65:104)*u,'shield',29*u);
    this.estado=this.add.text(px+37*u,cy+(compacto?48:86)*u,'Build on stable ground',letra(15*u,'#86efac',{fontStyle:'bold'}));
    this.detalhe=this.add.text(px+37*u,cy+(compacto?70:110)*u,'Crater zones, rocks and steep slopes are blocked.',letra(12*u,'#bdd4e5',{wordWrap:{width:cw-73*u}}));
    this.medida=this.add.text(px,cy+(compacto?112:151)*u,'No batteries spent · Existing buildings only',letra(11*u,'#8ca6bd'));
    this.ui.add([this.nome,this.instrucao,this.selo,this.estado,this.detalhe,this.medida]);
    const bw=(cw-46*u)/2;
    this.colocar=this.botao(px,cy+(compacto?132:178)*u,bw,(compacto?38:43)*u,'Place object',()=>this.confirmar(),true);
    this.cancelar=this.botao(px+bw+10*u,cy+(compacto?132:178)*u,bw,(compacto?38:43)*u,'Cancel',()=>this.limparSelecao());
    this.undo=this.botao(W-m-94*u,cy+ch-43*u,94*u,38*u,'Undo',()=>this.desfazer());
    this.btGrade=this.botao(W-m-94*u,cy+ch-87*u,94*u,38*u,this.mostrarGrade?'Grid: ON':'Grid: OFF',()=>this.alternarGrade());
    this.botao(W-m-94*u,cy+ch-131*u,42*u,38*u,'−',()=>this.zoom(0.85));
    this.botao(W-m-42*u,cy+ch-131*u,42*u,38*u,'+',()=>this.zoom(1.18));
    // On narrow screens tools sit above the inspector so their hit areas never overlap.
    if(W<cw+130*u){[this.undo.caixa,this.btGrade.caixa].forEach((c,i)=>c.setPosition(m+i*112*u,cy-45*u));
      const botoes=this.ui.list.filter(o=>o instanceof Phaser.GameObjects.Container).slice(-2) as Phaser.GameObjects.Container[];
      botoes.forEach((c,i)=>c.setPosition(W-m-(94-i*52)*u,cy-45*u));}
    this.atualizarFeedback();this.cameraMapa.ignore(this.ui);
    if(this.passoGuia>=0)this.desenharGuia();
  }

  private sobreUI(p: Phaser.Input.Pointer) {
    return this.passoGuia>=0 || this.cabecalho.contains(p.x,p.y) || this.cartao.contains(p.x,p.y)
      || this.botoesArea.some(b=>p.x>=b.caixa.x && p.x<=b.caixa.x+b.w && p.y>=b.caixa.y && p.y<=b.caixa.y+b.h);
  }

  private tipoAlvo(c:ObjetoEditor) {return c.deco?{...c.tipo,...dimensoesDeco(c.deco,this.rotacao)}:tipoOrientado(c.tipo,this.rotacao);}

  private girarPredio() {
    if(!this.selecionado)return;
    this.rotacao=(this.rotacao+1)%4;
    this.posicionar(this.gx,this.gy,true);
    tocarSfx('clique');
  }

  private abrirGuia() {this.inicioArrasto=null;this.passoGuia=0;this.desenharUI();}
  private avancarGuia() {if(this.passoGuia<GUIA.length-1){this.passoGuia++;this.desenharUI();}else this.fecharGuia();}
  private fecharGuia() {
    this.passoGuia=-1;this.modalGuia=undefined;this.desenharUI();
    try{localStorage.setItem(CHAVE_GUIA,'done');}catch{/* Help remains available without storage. */}
  }
  private desenharGuia() {
    const W=this.scale.width,H=this.scale.height,u=this.u;
    const w=Math.min(600*u,W-24),p=24*u,largura=w-2*p,etapa=GUIA[this.passoGuia];
    const fundo=this.add.rectangle(0,0,W,H,0x040b18,0.86).setOrigin(0).setInteractive();
    for(const evento of ['pointerdown','pointerup','pointermove'])fundo.on(evento,(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());
    // Measure a single centered content column before sizing the card. No absolute text rows.
    const conteudo=this.add.container(0,0);
    const icone=criarIconeJogo(this,0,23*u,etapa.icone,46*u);conteudo.add(icone);
    let linha=58*u;
    const texto=(valor:string,tamanho:number,cor:string,bold=false)=>{
      const t=this.add.text(0,linha,valor,letra(tamanho*u,cor,{fontStyle:bold?'bold':'normal',align:'center',wordWrap:{width:largura},lineSpacing:3*u})).setOrigin(0.5,0);
      conteudo.add(t);linha+=t.height+14*u;return t;
    };
    texto(`FIELD GUIDE  /  ${this.passoGuia+1} OF ${GUIA.length}`,11,'#9cb9d0',true);
    texto(etapa.titulo,23,'#ffffff',true);
    texto(etapa.teclas,13,'#fddd45',true);
    texto(etapa.texto,15,'#e2e8f0');
    texto(etapa.dica,12,'#9cb9d0');
    const rodape=64*u,maxAltura=H-24;
    const escala=Math.min(1,Math.max(1,maxAltura-rodape-2*p)/linha);
    conteudo.setScale(escala);
    const h=linha*escala+rodape+2*p,x=(W-w)/2,y=(H-h)/2;
    conteudo.setPosition(W/2,y+p);
    const g=this.add.graphics().fillStyle(0x13283f,1).fillRoundedRect(x,y,w,h,18*u)
      .lineStyle(2,etapa.cor,0.8).strokeRoundedRect(x,y,w,h,18*u);
    const objetos:Phaser.GameObjects.GameObject[]=[fundo,g,conteudo];
    for(let i=0;i<GUIA.length;i++)objetos.push(this.add.circle(W/2+(i-(GUIA.length-1)/2)*15*u,y+h-rodape+2*u,3.5*u,i===this.passoGuia?etapa.cor:0x456079));
    this.modalGuia=this.add.container(0,0,objetos);this.ui.add(this.modalGuia);
    const anterior=this.botao(x+p,y+h-48*u,82*u,34*u,this.passoGuia?'Back':'Skip',()=>{if(this.passoGuia){this.passoGuia--;this.desenharUI();}else this.fecharGuia();});
    const proximo=this.botao(x+w-p-122*u,y+h-48*u,122*u,34*u,this.passoGuia===GUIA.length-1?'Start planning':'Next',()=>this.avancarGuia(),true);
    this.modalGuia.add([anterior.caixa,proximo.caixa]);this.cameraMapa.ignore(this.ui);
  }

  private selecionarEm(p: Phaser.Input.Pointer) {
    const mundo=this.cameraMapa.getWorldPoint(p.x,p.y);
    const objetos=this.sup.objetosParaEditor();
    const candidatos=objetos.map(c=>({c,d:this.sup.dadosParaEditor(c)}))
      .filter(v=>{
        const img=v.d?.imagem;if(!img || !img.getBounds().contains(mundo.x,mundo.y))return false;
        const local=img.getWorldTransformMatrix().applyInverse(mundo.x,mundo.y);
        const x=Math.floor(local.x+img.displayOriginX),y=Math.floor(local.y+img.displayOriginY);
        return (this.textures.getPixelAlpha(x,y,img.texture.key,img.frame.name)??255)>24;
      }).sort((a,b)=>b.d!.imagem.depth-a.d!.imagem.depth);
    const q=paraChao(dadosTerreno.imagem,sessao.terreno,mundo.x,mundo.y);
    const c=candidatos[0]?.c ?? (q?objetos.find(c=>q.gx>=c.gx && q.gy>=c.gy && q.gx<c.gx+c.tipo.w && q.gy<c.gy+c.tipo.h):undefined);
    if(!c){this.aviso('Select a building, solar panel or surface object.');return;}
    const d=this.sup.dadosParaEditor(c);if(!d)return;
    this.selecionado=c;this.rotacao=c.rotacao??0;this.imagemOriginal=d.imagem;this.alphaOriginal=d.imagem.alpha;d.imagem.setAlpha(0.22);
    this.input.setDefaultCursor('crosshair');
    this.fantasma.setTexture(d.imagem.texture.key,d.imagem.frame.name).setOrigin(d.imagem.originX,d.imagem.originY)
      .setScale(d.imagem.scaleX,d.imagem.scaleY).setVisible(true);
    this.origem.clear();this.retangulo(this.origem,c.gx,c.gy,c.tipo.w,c.tipo.h,c.z,0x7dd3fc,0.12);
    this.posicionar(c.gx,c.gy,true);tocarSfx('pegar');
  }

  private apontar(p: Phaser.Input.Pointer) {
    if(!this.selecionado)return;
    const w=this.cameraMapa.getWorldPoint(p.x,p.y),t=sessao.terreno,P=dadosTerreno.imagem;
    const q=paraChao(P,t,w.x,w.y) ?? paraMapaNaAltura(P,w.x,w.y,this.selecionado.z);
    const tipo=this.tipoAlvo(this.selecionado);
    this.posicionar(Math.floor(q.gx-tipo.w/2),Math.floor(q.gy-tipo.h/2));
  }

  private avaliar(gx:number,gy:number,manterPassagem=true): AvaliacaoEditor {
    const c=this.selecionado!;
    const a=c.deco?sessao.grade.podeMoverDeco(c.deco,gx,gy,this.rotacao,manterPassagem):sessao.grade.podeMover(c,gx,gy,manterPassagem,this.rotacao);
    const tipo=this.tipoAlvo(c);
    if(a.motivo!=='ok' || gx===c.gx && gy===c.gy && tipo.w===c.tipo.w && tipo.h===c.tipo.h)return a;
    for(const k of [sessao.posicaoAstronauta,sessao.rover?.corpo])if(k){
      const px=Phaser.Math.Clamp(k.x,gx,gx+tipo.w),py=Phaser.Math.Clamp(k.y,gy,gy+tipo.h);
      if(Math.hypot(k.x-px,k.y-py)<k.raio+0.15)return {...a,motivo:'tripulacao'};
    }
    return a;
  }

  private posicionar(gx:number,gy:number,forcar=false) {
    if(!this.selecionado || (!forcar && gx===this.gx && gy===this.gy))return;
    this.gx=gx;this.gy=gy;
    const c=this.selecionado,a=this.avaliar(gx,gy);this.motivo=a.motivo;
    const tipo=this.tipoAlvo(c);
    const z=sessao.terreno.alturaMax(gx,gy,tipo.w,tipo.h)+0.035;
    this.sup.posicionarPreviaEditor(this.fantasma,c,gx,gy,this.rotacao);
    this.fantasma.setTint(a.motivo==='ok'?0xd2ffe4:0xffa6a6).setAlpha(0.78);
    this.area.clear();this.retangulo(this.area,gx,gy,tipo.w,tipo.h,z,a.motivo==='ok'?0x4ade80:0xf87171,0.22);
    this.desenharGrade(gx,gy);this.atualizarFeedback();
  }

  private atualizarFeedback() {
    if(!this.nome)return;
    const c=this.selecionado;
    this.colocar.habilitar(!!c && this.motivo==='ok');this.cancelar.habilitar(!!c);this.undo.habilitar(this.historico.length>0);
    if(!c){this.nome.setText('Select an object');this.instrucao.setText('Left click to select, then click a valid spot to place.');
      this.estado.setText('Build on stable ground').setColor('#86efac');this.detalhe.setText('Crater zones, rocks and steep slopes are blocked.');
      this.medida.setText('Left click: select · R: rotate · E: place');this.selo.setTexture('icon_shield');return;}
    const d=this.sup.dadosParaEditor(c),a=this.avaliar(this.gx,this.gy),ok=a.motivo==='ok';this.motivo=a.motivo;
    this.nome.setText(d?.nome??c.tipo.nome).setScale(1);
    this.nome.setScale(Math.min(1,(this.cartao.width-36*this.u)/this.nome.width));
    this.instrucao.setText('Left click / E: place · R: rotate 90°');
    const [titulo,detalhe]=TEXTOS[a.motivo];this.estado.setText(titulo).setColor(ok?'#86efac':'#fca5a5');this.detalhe.setText(detalhe);
    const tipo=this.tipoAlvo(c);
    this.medida.setText(`${this.rotacao*90}° · ${tipo.w} × ${tipo.h} tiles · Slope ${a.inclinacao.toFixed(1)}° / ${a.limite}°`);
    this.selo.setTexture(ok?'icon_shield':'icon_radiation');this.colocar.habilitar(ok);
  }

  private confirmar() {
    const c=this.selecionado;if(!c || this.passoGuia>=0)return;
    const a=this.avaliar(this.gx,this.gy);
    if(a.motivo!=='ok'){tocarSfx('erro');this.atualizarFeedback();return;}
    const antes={id:c.id,gx:c.gx,gy:c.gy,rotacao:c.rotacao??0};
    const r=c.deco?sessao.grade.moverDeco(c.deco,this.gx,this.gy,this.rotacao):sessao.grade.mover(c,this.gx,this.gy,true,this.rotacao);
    if(r.motivo!=='ok'){this.atualizarFeedback();return;}
    const alvo=c.deco??c;
    const mudou=antes.gx!==alvo.gx || antes.gy!==alvo.gy || antes.rotacao!==(alvo.rotacao??0);
    this.restaurarImagem();const salvo=this.sup.concluirMovimentoEditor(c);
    if(mudou){this.historico.push(antes);if(this.historico.length>100)this.historico.shift();}
    this.limparSelecao();this.aviso(mudou?`Object moved${salvo?' · Layout saved':''}`:'Position kept');tocarSfx('encaixe');
    this.desenharGrade(c.gx,c.gy,true);
  }

  private desfazer() {
    const h=this.historico.at(-1);if(!h)return;
    this.limparSelecao();const c=this.sup.objetosParaEditor().find(c=>c.id===h.id);if(!c)return;
    const r=c.deco?sessao.grade.moverDeco(c.deco,h.gx,h.gy,h.rotacao,false):sessao.grade.mover(c,h.gx,h.gy,false,h.rotacao);
    if(r.motivo!=='ok'){this.aviso('The previous spot is no longer available.');return;}
    this.historico.pop();const salvo=this.sup.concluirMovimentoEditor(c);this.atualizarFeedback();
    this.desenharGrade(c.gx,c.gy,true);this.aviso(`Move undone${salvo?' · Layout saved':''}`);tocarSfx('soltar');
  }

  private restaurarImagem() {if(this.imagemOriginal?.active)this.imagemOriginal.setAlpha(this.alphaOriginal);this.imagemOriginal=null;}
  private limparSelecao() {this.restaurarImagem();this.selecionado=null;this.fantasma.setVisible(false);this.area.clear();this.origem.clear();this.nome?.setScale(1);this.input.setDefaultCursor('default');this.atualizarFeedback();}
  private aviso(texto:string) {
    this.toast?.destroy();this.toast=this.add.text(this.scale.width/2,this.cabecalho.bottom+12*this.u,texto,letra(13*this.u,'#ffffff',{
      backgroundColor:'#203956',padding:{x:14,y:8},wordWrap:{width:this.scale.width-50},align:'center',
    })).setOrigin(0.5,0);this.ui.add(this.toast);this.cameraMapa.ignore(this.toast);
    const t=this.toast;this.time.delayedCall(2200,()=>t.destroy());
  }

  private retangulo(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,z:number,cor:number,alpha:number) {
    const q=(gx:number,gy:number)=>paraTela(dadosTerreno.imagem,gx,gy,z);
    const pts=[q(x,y),q(x+w,y),q(x+w,y+h),q(x,y+h)];
    g.fillStyle(cor,alpha).fillPoints(pts,true).lineStyle(2/this.cameraMapa.zoom,cor,0.9).strokePoints(pts,true);
  }

  private desenharGrade(gx:number,gy:number,forcar=false) {
    const x=Math.floor(gx),y=Math.floor(gy),chave=`${x},${y},${this.mostrarGrade}`;
    if(!forcar && chave===this.centroGrade)return;this.centroGrade=chave;
    const g=this.gradeVisual.clear();if(!this.mostrarGrade)return;
    const t=sessao.terreno;
    for(let j=Math.max(0,y-10);j<Math.min(t.n,y+12);j++)for(let i=Math.max(0,x-10);i<Math.min(t.n,x+12);i++) {
      const bloqueado=!!this.bloqueiosGrade[j*t.n+i];
      const cor=bloqueado?0xf87171:0x7dd3fc;
      const pts=[this.pontosGrade[j][i],this.pontosGrade[j][i+1],this.pontosGrade[j+1][i+1],this.pontosGrade[j+1][i]];
      if(bloqueado)g.fillStyle(cor,0.055).fillPoints(pts,true);
      g.lineStyle(0.65/this.cameraMapa.zoom,cor,bloqueado?0.27:0.15).strokePoints(pts,true);
    }
  }

  private alternarGrade() {this.mostrarGrade=!this.mostrarGrade;this.centroGrade='';this.desenharUI();this.sincronizarCamera();}
  private sincronizarCamera() {
    const c=this.cameraMapa;c.preRender();this.sup.cameras.main.setZoom(c.zoom).setRotation(0).setScroll(c.scrollX,c.scrollY);
    sessao.u=sessao.alvo=uDeS(c.zoom*S_MAPA);sessao.ancora=null;
    const p=c.getWorldPoint(this.scale.width/2,this.scale.height/2),q=paraChao(dadosTerreno.imagem,sessao.terreno,p.x,p.y);
    this.desenharGrade(q?.gx??this.gx,q?.gy??this.gy);
  }
  private zoom(fator:number,p?:Phaser.Input.Pointer) {
    const c=this.cameraMapa,x=p?.x??this.scale.width/2,y=p?.y??this.scale.height/2,antes=c.getWorldPoint(x,y);
    c.setZoom(Phaser.Math.Clamp(c.zoom*fator,0.45,2.4));c.preRender();const depois=c.getWorldPoint(x,y);
    c.scrollX+=antes.x-depois.x;c.scrollY+=antes.y-depois.y;
    this.centroGrade='';this.sincronizarCamera();
    if(this.selecionado)this.posicionar(this.gx,this.gy,true);
  }
}
