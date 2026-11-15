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
type AlvoVisivel = {objeto:ObjetoEditor;imagem:Phaser.GameObjects.Image;nome:string;bounds:Phaser.Geom.Rectangle};
type Mascara = {dados:Uint8ClampedArray;w:number;h:number} | null;
type Edicao = {tipo:'mover';id:number;gx:number;gy:number;rotacao:number}|{tipo:'duplicar';id:number};
const ORDEM_CONSTRUCAO=['barris','baliza','generator','canister','toolkit','caixas'];
const NOMES_CONSTRUCAO:Record<string,string>={barris:'Fuel barrels',baliza:'Beacon',generator:'Generator',canister:'Canister',toolkit:'Tool kit',caixas:'Supply crate'};
const GUIA = [
  {titulo:'Explore your base',icone:'wrench',cor:0x7dd3fc,teclas:'HOLD LEFT CLICK + DRAG  →  MOVE THE VIEW',texto:'Hold the left mouse button and drag to move the map in any direction. Release to stop. A short click selects or places an object; dragging only moves the view.',dica:'You can pan with an object selected. Its preview stays on the ground while you drag. Use the wheel or + / − to zoom.'},
  {titulo:'Pick an object',icone:'wrench',cor:0xfddd45,teclas:'CLICK THE MAP OR THE OBJECT LIST',texto:'Click an object on the map or in the Objects list. The first page shows the six construction objects. The selected row says Moving; move your mouse over the map to preview a new position.',dica:'F centers your selected object. The list scrolls independently from the map; page arrows reach the other objects. On small screens, Objects shows or hides the browser.'},
  {titulo:'Turn your object',icone:'energy',cor:0xc4b5fd,teclas:'R  →  ROTATE 90°',texto:'Press R once to turn the selected object by 90 degrees. Press it again for 180°, 270° and back to 0°.',dica:'Only the selected object turns, staying upright on the ground. Its ground footprint and placement checks update with each turn.'},
  {titulo:'Make a copy',icone:'backpack',cor:0xf5b533,teclas:'DUPLICATE / C  →  CHOOSE A SPOT  →  PLACE / E',texto:'Select an existing object and press Duplicate or C. Move its copy to a free spot, rotate with R if needed, and confirm with Place, E or a map click.',dica:'The original stays in place. Cancel drops only the preview. Undo removes the last confirmed copy.'},
  {titulo:'Choose safe ground',icone:'shield',cor:0x86efac,teclas:'GREEN = READY  /  RED = BLOCKED',texto:'A green preview means the object fits. A red preview means the spot is blocked. The inspector explains why: rocks, crater zones, steep slopes or obstacles.',dica:'Leave space between buildings, and keep the astronaut and rover clear. Invalid clicks keep the preview active.'},
  {titulo:'Click to place',icone:'backpack',cor:0xfddd45,teclas:'LEFT CLICK OR E  →  CONFIRM',texto:'Click the chosen spot with the left mouse button, or press E, to place your object. A valid position saves automatically.',dica:'Esc or right click cancels the preview. Place/E confirms, Rotate/R turns, and Cancel/Esc drops the preview. Ctrl/Cmd+Z undoes a move or rotation.'},
];
const CHAVE_GUIA='lunar-odyssey-base-planner-guide-v6';

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
  private historico: Edicao[] = [];
  private pausadas: {key:string;visivel:boolean;input:boolean;keyboard:boolean}[] = [];
  private inicioArrasto: {x:number;y:number;scrollX:number;scrollY:number;id:number} | null = null;
  private arrastou = false;
  private nome!: Phaser.GameObjects.Text;
  private instrucao!: Phaser.GameObjects.Text;
  private estado!: Phaser.GameObjects.Text;
  private detalhe!: Phaser.GameObjects.Text;
  private medida!: Phaser.GameObjects.Text;
  private selo!: Phaser.GameObjects.Image;
  private validacaoIcone!:Phaser.GameObjects.Graphics;
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
  private alvos:AlvoVisivel[]=[];
  private mascaras=new Map<string,Mascara>();
  private alvoPressionado:ObjetoEditor|null=null;
  private pairado:AlvoVisivel|null=null;
  private realce!:Phaser.GameObjects.Graphics;
  private brilho!:Phaser.GameObjects.Image;
  private etiqueta!:Phaser.GameObjects.Text;
  private ponteiroPendente:Phaser.Input.Pointer|null=null;
  private ultimoHover=0;
  private cameraPendente=false;
  private listaPainel=new Phaser.Geom.Rectangle();
  private legendaPainel=new Phaser.Geom.Rectangle();
  private listaConteudo?:Phaser.GameObjects.Container;
  private linhasLista:{id:number;fundo:Phaser.GameObjects.Graphics;status:Phaser.GameObjects.Text;w:number;h:number}[]=[];
  private indiceLista=0;
  private painelObjetosAberto=true;
  private quantidadeLinhas=0;
  private girarBotao?:BotaoEditor;
  private colocarBotao?:BotaoEditor;
  private cancelarBotao?:BotaoEditor;
  private duplicarBotao?:BotaoEditor;
  private duplicando=false;
  private hoverLista:number|null=null;
  private inspectorVisivel=true;
  private idListaMarcado:number|null|undefined=undefined;
  private ferramentasPainel=new Phaser.Geom.Rectangle();

  constructor() { super({key:'EditorBase'}); }

  create() {
    if(sessao.mundo==='nave' || sessao.emTarefa || sessao.abastecendoRover) {this.scene.stop();return;}
    this.sup=this.scene.get('Superficie') as Superficie;
    this.sup.prepararEditor();
    sessao.editandoBase=true;
    this.game.events.emit('base-planner-visibility',true);
    this.selecionado=null;this.imagemOriginal=null;this.historico=[];this.pausadas=[];
    this.mostrarGrade=true;this.centroGrade='';this.inicioArrasto=null;this.arrastou=false;
    this.passoGuia=-1;this.modalGuia=undefined;this.rotacao=0;
    this.duplicando=false;
    this.alvos=[];this.mascaras.clear();this.alvoPressionado=null;this.pairado=null;this.ponteiroPendente=null;this.ultimoHover=0;this.cameraPendente=false;
    this.indiceLista=0;this.painelObjetosAberto=this.scale.width>=680;this.linhasLista=[];this.listaConteudo=undefined;this.hoverLista=null;
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
    this.realce=this.add.graphics();this.brilho=this.add.image(0,0,'mod_habitat').setVisible(false);
    this.etiqueta=this.add.text(0,0,'',letra(15,'#17263f',{fontStyle:'bold',align:'center',backgroundColor:'#fde047',padding:{x:12,y:7},stroke:'#ffffff',strokeThickness:1})).setOrigin(0.5,1).setVisible(false);
    this.mundo.add([this.gradeVisual,this.origem,this.area,this.brilho,this.fantasma,this.realce,this.etiqueta]);
    const cam=this.sup.cameras.main;
    this.cameraMapa=this.cameras.add(0,0,this.scale.width,this.scale.height).setZoom(cam.zoom).setScroll(cam.scrollX,cam.scrollY);
    // Render world previews first, keeping the screen-space inspector above them.
    const cameras=this.cameras.cameras;
    cameras.splice(cameras.indexOf(this.cameraMapa),1);cameras.unshift(this.cameraMapa);
    this.cameraMapa.ignore(this.ui);this.cameras.main.ignore(this.mundo);
    this.cameraMapa.preRender();this.atualizarAlvos();
    const terreno=sessao.terreno,P=dadosTerreno.imagem;
    this.pontosGrade=Array.from({length:terreno.n+1},(_,y)=>Array.from({length:terreno.n+1},(_,x)=>paraTela(P,x,y,terreno.altura(x,y)+0.018)));
    this.bloqueiosGrade=new Uint8Array(terreno.n*terreno.n);
    for(let y=0;y<terreno.n;y++)for(let x=0;x<terreno.n;x++)this.bloqueiosGrade[y*terreno.n+x]=Number(!!terreno.obstaculoConstrucao(x,y,1,1)||terreno.inclinacaoEm(x,y)>terreno.maxConstruir);
    this.input.setDefaultCursor('grab');
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
      this.alvoPressionado=this.selecionado?null:this.alvoEm(p)?.objeto??null;
      this.ponteiroPendente=null;
      this.inicioArrasto={x:p.x,y:p.y,scrollX:this.cameraMapa.scrollX,scrollY:this.cameraMapa.scrollY,id:p.id};this.arrastou=false;
    });
    this.input.on('pointermove',(p: Phaser.Input.Pointer)=>{
      const inicio=this.inicioArrasto;
      if(inicio && p.id===inicio.id) {
        // A queued move may already see the released pointer. Only pointerup ends the click.
        if(!p.isDown)return;
        const limite=p.wasTouch?18:12;
        if(Phaser.Math.Distance.Squared(inicio.x,inicio.y,p.x,p.y)>limite*limite)this.arrastou=true;
        if(this.arrastou){
          this.cameraMapa.setScroll(inicio.scrollX-(p.x-inicio.x)/this.cameraMapa.zoom,inicio.scrollY-(p.y-inicio.y)/this.cameraMapa.zoom);
          this.cameraPendente=true;this.mostrarHover(null);this.input.setDefaultCursor('grabbing');
        }
        return;
      }
      this.ponteiroPendente=p;
    });
    this.input.on('pointerup',(p: Phaser.Input.Pointer)=>{
      if(p.id!==this.inicioArrasto?.id)return;
      const clicar=!this.arrastou && !this.sobreUI(p) && p.button===0;
      const alvo=this.alvoPressionado;
      this.encerrarArrasto();
      this.ponteiroPendente=null;
      if(clicar){if(this.selecionado){this.apontar(p);this.confirmar();}else this.selecionarEm(p,alvo);}
    });
    this.input.on('pointerupoutside',()=>this.encerrarArrasto());
    this.input.on('gameout',()=>this.encerrarArrasto());
    this.input.on('wheel',(p: Phaser.Input.Pointer,_o:unknown,_dx:number,dy:number)=>{
      if(this.passoGuia>=0 || this.inicioArrasto || !dy)return;
      if(this.painelObjetosAberto && this.listaPainel.contains(p.x,p.y)){this.rolarLista(dy>0?2:-2);return;}
      if(!this.sobreUI(p))this.zoom(Math.exp(-dy*0.0015),p);
    });
    const kb=this.input.keyboard;
    kb?.on('keydown-ESC',()=>{if(this.passoGuia>=0)this.fecharGuia();else if(this.selecionado)this.limparSelecao();else this.scene.stop();});
    kb?.on('keydown-ENTER',()=>{if(this.passoGuia>=0)this.avancarGuia();else this.confirmar();});
    kb?.on('keydown-G',()=>{if(this.passoGuia<0)this.alternarGrade();});
    kb?.on('keydown-Z',(e: KeyboardEvent)=>{if(this.passoGuia<0 && (e.ctrlKey||e.metaKey)){e.preventDefault();this.desfazer();}});
    kb?.on('keydown-E',()=>{if(this.passoGuia<0)this.confirmar();});
    kb?.on('keydown-R',(e:KeyboardEvent)=>{if(!e.repeat && this.passoGuia<0)this.girarPredio();});
    kb?.on('keydown-H',()=>{if(this.passoGuia<0)this.abrirGuia();});
    kb?.on('keydown-F',()=>{if(this.passoGuia<0)this.localizarSelecionado();});
    kb?.on('keydown-C',(e:KeyboardEvent)=>{if(!e.repeat && !e.ctrlKey && !e.metaKey && this.passoGuia<0)this.duplicarSelecionado();});
    const resize=()=>{
      this.encerrarArrasto();
      this.cameras.main.setSize(this.scale.width,this.scale.height).setScroll(0,0).setZoom(1);
      this.cameraMapa.setSize(this.scale.width,this.scale.height);this.sup.cameras.main.setSize(this.scale.width,this.scale.height);
      this.desenharUI();this.atualizarFeedback();this.sincronizarCamera();
      this.atualizarDestaque();
    };
    this.scale.on('resize',resize);
    this.events.once('shutdown',()=>{
      this.restaurarImagem();this.scale.off('resize',resize);sessao.editandoBase=false;
      this.game.events.emit('base-planner-visibility',false);
      this.sup.cameras.main.setRotation(0);
      this.input.setDefaultCursor('default');this.pontosGrade=[];this.bloqueiosGrade=new Uint8Array();
      this.mascaras.clear();this.alvos=[];this.pairado=null;this.ponteiroPendente=null;
      for(const p of this.pausadas){const s=this.scene.get(p.key);s.input.enabled=p.input;if(s.input.keyboard){s.input.keyboard.resetKeys();s.input.keyboard.enabled=p.keyboard;}this.scene.setVisible(p.visivel,p.key);if(this.scene.isPaused(p.key))this.scene.resume(p.key);}
      sessao.salvar();
    });
    try {if(localStorage.getItem(CHAVE_GUIA)!=='done')this.abrirGuia();}catch{this.abrirGuia();}
  }

  update(tempo:number) {
    if(this.cameraPendente){this.cameraPendente=false;this.sincronizarCamera();}
    const p=this.ponteiroPendente;if(!p || this.inicioArrasto)return;
    if(this.sobreUI(p)){this.ponteiroPendente=null;this.mostrarHover(null);return;}
    if(this.selecionado){this.ponteiroPendente=null;if(!p.wasTouch)this.apontar(p);return;}
    if(tempo-this.ultimoHover<45)return;
    this.ultimoHover=tempo;this.ponteiroPendente=null;this.mostrarHover(this.alvoEm(p));
  }

  private atualizarAlvos() {
    this.alvos=[];
    for(const objeto of this.sup.objetosParaEditor()) {
      const d=this.sup.dadosParaEditor(objeto);
      if(d)this.alvos.push({objeto,imagem:d.imagem,nome:objeto.deco?NOMES_CONSTRUCAO[objeto.deco.id]??d.nome:d.nome,bounds:d.imagem.getBounds()});
    }
    this.alvos.sort((a,b)=>b.imagem.depth-a.imagem.depth);
    if(this.listaConteudo?.active)this.desenharLista();
  }

  private mascara(img:Phaser.GameObjects.Image): Mascara {
    const f=img.frame,chave=`${img.texture.key}:${f.name}`;
    if(this.mascaras.has(chave))return this.mascaras.get(chave)!;
    let mascara:Mascara=null;
    try {
      const fator=Math.min(1,128/Math.max(f.cutWidth,f.cutHeight)),w=Math.max(1,Math.ceil(f.cutWidth*fator)),h=Math.max(1,Math.ceil(f.cutHeight*fator));
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      if(ctx){ctx.drawImage(f.source.image as CanvasImageSource,f.cutX,f.cutY,f.cutWidth,f.cutHeight,0,0,w,h);mascara={dados:ctx.getImageData(0,0,w,h).data,w,h};}
    }catch{/* If pixel data is unavailable, use the padded image bounds. */}
    this.mascaras.set(chave,mascara);return mascara;
  }

  private alvoEm(p:Phaser.Input.Pointer): AlvoVisivel|null {
    const q=this.cameraMapa.getWorldPoint(p.x,p.y),folga=6/this.cameraMapa.zoom;
    for(const alvo of this.alvos) {
      const b=alvo.bounds;if(q.x<b.left-folga || q.x>b.right+folga || q.y<b.top-folga || q.y>b.bottom+folga)continue;
      const img=alvo.imagem,local=img.getWorldTransformMatrix().applyInverse(q.x,q.y),f=img.frame,m=this.mascara(img);
      if(!m)return alvo;
      const x=(local.x+img.displayOriginX-f.x)*m.w/f.cutWidth,y=(local.y+img.displayOriginY-f.y)*m.h/f.cutHeight;
      const rx=Math.max(1,Math.ceil(folga/Math.abs(img.scaleX)*m.w/f.cutWidth)),ry=Math.max(1,Math.ceil(folga/Math.abs(img.scaleY)*m.h/f.cutHeight));
      for(let j=Math.max(0,Math.floor(y)-ry);j<=Math.min(m.h-1,Math.floor(y)+ry);j++)for(let i=Math.max(0,Math.floor(x)-rx);i<=Math.min(m.w-1,Math.floor(x)+rx);i++)if(m.dados[(j*m.w+i)*4+3]>20)return alvo;
    }
    const chao=paraChao(dadosTerreno.imagem,sessao.terreno,q.x,q.y);
    return chao?this.alvos.find(a=>{const c=a.objeto;return chao.gx>=c.gx && chao.gy>=c.gy && chao.gx<c.gx+c.tipo.w && chao.gy<c.gy+c.tipo.h;})??null:null;
  }

  private mostrarHover(alvo:AlvoVisivel|null) {
    if(this.selecionado)return;
    if(this.pairado===alvo)return;
    this.pairado=alvo;this.realce.clear();this.brilho.setVisible(false);this.etiqueta.setVisible(false);
    this.input.setDefaultCursor(alvo?'pointer':'grab');
    if(!alvo)return;
    const img=alvo.imagem,b=alvo.bounds,z=this.cameraMapa.zoom;
    this.brilho.setTexture(img.texture.key,img.frame.name).setOrigin(img.originX,img.originY).setPosition(img.x,img.y).setScale(img.scaleX*1.045,img.scaleY*1.045).setTintFill(0xfde047).setAlpha(0.35).setVisible(true);
    this.realce.lineStyle(7/z,0x17263f,0.9).strokeRoundedRect(b.x-5/z,b.y-5/z,b.width+10/z,b.height+10/z,12/z)
      .lineStyle(4/z,0xfde047,1).strokeRoundedRect(b.x-5/z,b.y-5/z,b.width+10/z,b.height+10/z,12/z);
    this.etiqueta.setText(`${alvo.nome}\nClick to move!`).setBackgroundColor('#fde047').setColor('#17263f').setScale(1/z).setPosition(b.centerX,b.top-12/z).setVisible(true);
  }

  private atualizarDestaque() {
    if(!this.selecionado){const alvo=this.pairado;this.pairado=null;this.mostrarHover(alvo);return;}
    const b=this.fantasma.getBounds(),z=this.cameraMapa.zoom,ok=this.motivo==='ok',cor=ok?0x4ade80:0xff6b6b;
    this.realce.clear().lineStyle(7/z,0x17263f,0.9).strokeRoundedRect(b.x-4/z,b.y-4/z,b.width+8/z,b.height+8/z,12/z)
      .lineStyle(4/z,cor,1).strokeRoundedRect(b.x-4/z,b.y-4/z,b.width+8/z,b.height+8/z,12/z);
    this.etiqueta.setText(ok?'READY! Click or E to place':'BLOCKED! Try another spot').setBackgroundColor(ok?'#86efac':'#fca5a5').setColor('#17263f').setScale(1/z).setPosition(b.centerX,b.top-12/z).setVisible(true);
  }

  private botao(x:number,y:number,w:number,h:number,texto:string,acao:()=>void,principal=false): BotaoEditor {
    const g=this.add.graphics(),t=this.add.text(w/2,h/2,texto,letra(14*this.u,'#ffffff',{fontStyle:'bold'})).setOrigin(0.5);
    g.fillStyle(principal?0x168656:0x203956).fillRoundedRect(0,0,w,h,12*this.u)
      .lineStyle(2*this.u,principal?0x86efac:0x58728f).strokeRoundedRect(0,0,w,h,12*this.u);
    const zona=this.add.zone(0,0,w,h).setOrigin(0).setInteractive({useHandCursor:true});
    const caixa=this.add.container(x,y,[g,t,zona]);this.ui.add(caixa);
    this.botoesArea.push({caixa,w,h});
    let armado=false;
    zona.on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e: Phaser.Types.Input.EventData)=>{e.stopPropagation();armado=true;});
    zona.on('pointerup',(_p:unknown,_x:unknown,_y:unknown,e: Phaser.Types.Input.EventData)=>{e.stopPropagation();this.encerrarArrasto();if(armado){armado=false;tocarSfx('clique');acao();}});
    zona.on('pointerover',()=>t.setColor('#fddd45')).on('pointerout',()=>{t.setColor('#ffffff');armado=false;});
    return {caixa,habilitar:(ativo)=>{zona.input!.enabled=ativo;caixa.setAlpha(ativo?1:0.38);}};
  }

  private botaoAcao(x:number,y:number,w:number,h:number,titulo:string,tecla:string,simbolo:string,acao:()=>void,principal=false,centralizarCopia=false):BotaoEditor {
    const u=this.u,g=this.add.graphics(),bw=(tecla==='Esc'?28:21)*u;
    const texto=this.add.text((w-bw-16*u)/2+6*u,h/2,titulo,letra((principal?18:14)*u,'#ffffff',{fontStyle:'bold'})).setOrigin(0.5);
    if(principal)texto.setX(w/2-3*u);
    const icone=this.add.text(principal?w/2-texto.width/2-17*u:10*u,h/2,simbolo,letra((principal?22:18)*u,'#ffffff')).setOrigin(0.5);
    const badge=this.add.graphics(),key=this.add.text(w-8*u-bw/2,h/2,tecla,letra((tecla==='Esc'?10:13)*u,'#17263f',{fontStyle:'bold'})).setOrigin(0.5);
    const zona=this.add.zone(0,0,w,h).setOrigin(0).setInteractive({useHandCursor:true});
    const caixa=this.add.container(x,y,[g,icone,texto,badge,key,zona]);this.ui.add(caixa);this.botoesArea.push({caixa,w,h});
    if(centralizarCopia){
      const esquerda=(w-texto.width-24*u)/2;
      texto.setX(esquerda+24*u+texto.width/2);icone.setVisible(false);
      const folhas=this.add.graphics().setPosition(esquerda+8*u,h/2).lineStyle(2*u,0xffffff);
      folhas.strokeRoundedRect(-7*u,-7*u,10*u,10*u,1.5*u)
        .strokeRoundedRect(-3*u,-3*u,10*u,10*u,1.5*u);
      caixa.addAt(folhas,2);
    }
    if(simbolo==='\u21bb' || simbolo==='\u00d7'){
      const larguraGrupo=texto.width+20*u;
      const esquerda=8*u+(w-bw-24*u-larguraGrupo)/2;
      texto.setX(esquerda+20*u+texto.width/2);icone.setVisible(false);
      const vetor=this.add.graphics().setPosition(esquerda+7*u,h/2).lineStyle(2*u,0xffffff).fillStyle(0xffffff);
      if(simbolo==='\u00d7'){
        vetor.beginPath().moveTo(-4*u,-4*u).lineTo(4*u,4*u)
          .moveTo(-4*u,4*u).lineTo(4*u,-4*u).strokePath();
      }else{
        const angulo=Math.PI*1.85,r=5.5*u;
        vetor.beginPath().arc(0,0,r,Math.PI*0.2,angulo,false).strokePath();
        const x=Math.cos(angulo)*r,y=Math.sin(angulo)*r;
        const bx=x+Math.sin(angulo)*3*u,by=y-Math.cos(angulo)*3*u;
        vetor.fillPoints([{x,y},{x:bx+Math.cos(angulo)*2.5*u,y:by+Math.sin(angulo)*2.5*u},
          {x:bx-Math.cos(angulo)*2.5*u,y:by-Math.sin(angulo)*2.5*u}],true);
      }
      caixa.addAt(vetor,2);
    }
    let ativo=true,sobre=false,pressionado=false;
    const pintar=()=>{
      g.clear();if(principal)g.fillStyle(0x9e4b12,ativo?0.5:0.15).fillRoundedRect(0,3*u,w,h,10*u);
      g.fillStyle(!ativo?0x3b4559:principal?(pressionado?0xdb7111:sobre?0xffa13c:0xf58a1f):(sobre?0x21314f:0x101a33))
        .fillRoundedRect(0,0,w,h,10*u).lineStyle(1.25*u,principal?0xf5b533:0x25345a).strokeRoundedRect(0,0,w,h,10*u);
      badge.clear().fillStyle(0xfff4df).fillRoundedRect(w-8*u-bw,(h-22*u)/2,bw,22*u,5*u);
      caixa.setAlpha(ativo?1:.48);
    };
    zona.on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();pressionado=true;pintar();});
    zona.on('pointerup',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();const executar=pressionado&&ativo;pressionado=false;this.encerrarArrasto();pintar();if(executar){tocarSfx('clique');acao();}});
    zona.on('pointerover',()=>{sobre=true;pintar();}).on('pointerout',()=>{sobre=false;pressionado=false;pintar();});
    pintar();return {caixa,habilitar:(habilitado)=>{if(ativo===habilitado)return;ativo=habilitado;sobre=false;pressionado=false;zona.input!.enabled=ativo;pintar();}};
  }

  private desenharUI() {
    // Explicit destruction also removes modal input blockers (Layer.removeAll does not).
    for(const objeto of [...this.ui.list])objeto.destroy();
    this.modalGuia=undefined;this.toast=undefined;this.botoesArea=[];this.linhasLista=[];
    const W=this.scale.width,H=this.scale.height;
    this.u=Math.min(1,W/360);
    const u=this.u,m=10*u,hh=56*u,estreito=W<680,cw=Math.min(300*u,W-2*m-(estreito?58*u:0)),ch=270*u,topo=m+hh+12*u;
    const legendaEmpilhada=W<680,legendaDuasLinhas=W<940,alturaLegenda=(legendaEmpilhada?104:legendaDuasLinhas?82:50)*u;
    const listaY=topo+(estreito?44*u:0),rodape=alturaLegenda+12*u;
    this.inspectorVisivel=H>=listaY+122*u+ch+rodape+m || !this.painelObjetosAberto;
    const disponivel=H-m-rodape-listaY-(this.inspectorVisivel?ch+12*u:0);
    this.quantidadeLinhas=Math.max(1,Math.min(10,Math.floor((disponivel-78*u)/(46*u))));
    const listaH=(78+this.quantidadeLinhas*46)*u;
    const cy=this.painelObjetosAberto?listaY+listaH+12*u:(estreito?topo+44*u:topo);
    this.cabecalho.setTo(m,m,W-2*m,hh);
    this.cartao.setTo(m,cy,cw,ch);
    const painel=(x:number,y:number,w:number,h:number)=>this.add.graphics().fillStyle(0x101a33,0.98).fillRoundedRect(x,y,w,h,14*u)
      .lineStyle(1*u,0x25345a,1).strokeRoundedRect(x,y,w,h,14*u);
    this.ui.add(painel(m,m,W-2*m,hh));
    this.ui.add(criarIconeJogo(this,m+23*u,m+hh/2,'wrench',27*u));
    this.ui.add(this.add.text(m+46*u,m+8*u,estreito?'PLANNER':'BASE PLANNER',letra((estreito?18:22)*u,'#fddd45',{fontStyle:'bold'})));
    if(!estreito)this.ui.add(this.add.text(m+46*u,m+34*u,'Mission paused - Move objects',letra(12*u,'#aec6e4')));
    const by=m+8*u,bh=40*u;
    this.botao(W-m-78*u,by,68*u,bh,'Done',()=>this.scene.stop(),true);
    this.botao(W-m-146*u,by,60*u,bh,'Help',()=>this.abrirGuia());
    this.undo=this.botao(W-m-(estreito?222:266)*u,by,(estreito?68:112)*u,bh,'Undo',()=>this.desfazer());
    if(!estreito){
      const texto=this.undo.caixa.list.find(o=>o instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text;
      texto.setX(43*u).setFontSize(15*u);
      this.undo.caixa.add(this.add.text(15*u,bh/2,'\u21b6',letra(18*u,'#ffffff')).setOrigin(0.5));
      this.undo.caixa.add(this.add.text(88*u,bh/2,'Ctrl+Z',letra(10*u,'#dbeafe',{backgroundColor:'#0b152a',padding:{x:4*u,y:3*u}})).setOrigin(0.5));
    }
    const ex=W-m-44*u,ey=topo+7*u;
    this.ferramentasPainel.setTo(ex-7*u,ey-7*u,58*u,170*u);
    this.ui.add(painel(ex-7*u,ey-7*u,58*u,170*u));
    const mais=this.botao(ex,ey,44*u,44*u,'+',()=>this.zoom(1.18));
    const menos=this.botao(ex,ey+52*u,44*u,44*u,'\u2212',()=>this.zoom(0.85));
    for(const b of [mais,menos])(b.caixa.list.find(o=>o instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text).setFontSize(28*u);
    this.btGrade=this.botao(ex,ey+104*u,44*u,52*u,'',()=>this.alternarGrade());
    const corGrade=this.mostrarGrade?0x4ade80:0x94a3b8;
    const grade=this.add.graphics().lineStyle(2*u,this.mostrarGrade?0xe2e8f0:0x94a3b8);
    for(let j=0;j<2;j++)for(let i=0;i<2;i++)grade.strokeRect((14+i*9)*u,(9+j*9)*u,7*u,7*u);
    grade.lineStyle(2*u,corGrade).strokeRoundedRect(0,0,44*u,52*u,11*u);
    this.btGrade.caixa.add([grade,this.add.text(22*u,40*u,this.mostrarGrade?'ON':'OFF',letra(12*u,this.mostrarGrade?'#4ade80':'#aec6e4',{fontStyle:'bold'})).setOrigin(0.5)]);
    this.botao(estreito?m:m+230*u,estreito?topo:m+8*u,(estreito?128:88)*u,estreito?36*u:40*u,this.painelObjetosAberto?'Hide list':'Objects',()=>{this.painelObjetosAberto=!this.painelObjetosAberto;this.desenharUI();});
    if(this.painelObjetosAberto){
      this.listaPainel.setTo(m,listaY,cw,listaH);this.ui.add(painel(m,listaY,cw,listaH));
      this.ui.add(this.add.text(m+16*u,listaY+16*u,'OBJECTS',letra(14*u,'#f5b533',{fontStyle:'bold',letterSpacing:1.2*u})));
      this.ui.add(this.add.text(m+cw-16*u,listaY+18*u,`${this.alvos.length} on map`,letra(11*u,'#8d9ab8')).setOrigin(1,0));
      this.listaConteudo=this.add.container(0,0);this.ui.add(this.listaConteudo);this.desenharLista();
    }else {this.listaPainel.setTo(0,0,0,0);this.listaConteudo=undefined;}
    const inspector=this.add.container(0,0).setVisible(this.inspectorVisivel);this.ui.add(inspector);
    inspector.add(painel(m,cy,cw,ch));
    inspector.add(this.add.text(m+16*u,cy+15*u,'SELECTED',letra(11*u,'#8d9ab8',{fontStyle:'bold',letterSpacing:1.3*u})));
    const px=m+16*u;
    this.nome=this.add.text(px,cy+36*u,'Select an object',letra(24*u,'#ffffff',{fontStyle:'bold'}));
    this.instrucao=this.add.text(px,cy+54*u,'',letra(10*u,'#8d9ab8')).setVisible(false);
    this.selo=criarIconeJogo(this,px+9*u,cy+84*u,'shield',20*u).setVisible(false);
    this.validacaoIcone=this.add.graphics().setPosition(px+2*u,cy+77*u);
    this.estado=this.add.text(px+25*u,cy+77*u,'Choose an object',letra(13*u,'#8d9ab8',{fontStyle:'bold',wordWrap:{width:cw-57*u}}));
    this.detalhe=this.add.text(px,cy+77*u,'',letra(10*u,'#8d9ab8')).setVisible(false);
    this.medida=this.add.text(px,cy+77*u,'',letra(10*u,'#8d9ab8')).setVisible(false);
    inspector.add([this.nome,this.instrucao,this.selo,this.validacaoIcone,this.estado,this.detalhe,this.medida]);
    const bw=cw-32*u;
    this.colocarBotao=this.botaoAcao(px,cy+109*u,bw,48*u,'Place','E','\u2713',()=>this.confirmar(),true);
    this.duplicarBotao=this.botaoAcao(px,cy+169*u,bw,36*u,'Duplicate','C','',()=>this.duplicarSelecionado(),false,true);
    this.girarBotao=this.botaoAcao(px,cy+217*u,(bw-12*u)/2,40*u,'Rotate','R','\u21bb',()=>this.girarPredio());
    this.cancelarBotao=this.botaoAcao(px+(bw+12*u)/2,cy+217*u,(bw-12*u)/2,40*u,'Cancel','Esc','\u00d7',()=>this.limparSelecao());
    inspector.add([this.colocarBotao.caixa,this.duplicarBotao.caixa,this.girarBotao.caixa,this.cancelarBotao.caixa]);
    const lw=Math.min(W-2*m,840*u),lh=alturaLegenda,lx=(W-lw)/2,fy=H-m-lh;
    this.legendaPainel.setTo(lx,fy,lw,lh);this.ui.add(painel(lx,fy,lw,lh));
    const fonteLegenda=(legendaEmpilhada?12:14)*u;
    const estadoLegenda=(x:number,y:number,titulo:string,cor:number,corTexto:string)=>{
      const g=this.add.graphics().fillStyle(cor,0.2).fillRoundedRect(x,y-8*u,16*u,16*u,4*u)
        .lineStyle(2*u,cor).strokeRoundedRect(x,y-8*u,16*u,16*u,4*u);
      this.ui.add([g,this.add.text(x+26*u,y,titulo,letra(fonteLegenda,corTexto,{fontStyle:'bold'})).setOrigin(0,0.5)]);
    };
    const atalho=(x:number,y:number,key:string,label:string,empilhado=false)=>{
      const badge=this.add.text(x,y,key,letra((legendaEmpilhada?12:13)*u,'#17263f',{
        fontStyle:'bold',backgroundColor:'#fff4df',padding:{x:7*u,y:5*u},
      })).setOrigin(empilhado?0.5:0,0.5);
      const nome=this.add.text(empilhado?x:x+badge.width+9*u,empilhado?y+26*u:y,label,letra(fonteLegenda,'#e2e8f0',{fontStyle:'bold'})).setOrigin(empilhado?0.5:0,0.5);
      this.ui.add([badge,nome]);
    };
    if(!legendaDuasLinhas){
      const y=fy+lh/2;
      estadoLegenda(lx+16*u,y,'Crater / rock / slope',0xf87171,'#fecaca');
      estadoLegenda(lx+224*u,y,'Valid ground',0x4ade80,'#bbf7d0');
      this.ui.add(this.add.graphics().lineStyle(1.5*u,0x456184).lineBetween(lx+354*u,fy+12*u,lx+354*u,fy+lh-12*u));
      atalho(lx+372*u,y,'Drag','Pan');atalho(lx+480*u,y,'Left click','Select');atalho(lx+634*u,y,'R','Rotate');atalho(lx+744*u,y,'E','Place');
    }else{
      estadoLegenda(lx+16*u,fy+21*u,'Crater / rock / slope',0xf87171,'#fecaca');
      estadoLegenda(lx+lw-(legendaEmpilhada?126:166)*u,fy+21*u,'Valid ground',0x4ade80,'#bbf7d0');
      const passo=(lw-24*u)/4;
      for(const [i,key,label] of [[0,'Drag','Pan'],[1,'Left click','Select'],[2,'R','Rotate'],[3,'E','Place']] as const){
        const x=lx+12*u+(i+(legendaEmpilhada?0.5:0))*passo;
        atalho(x,fy+(legendaEmpilhada?55:59)*u,key,label,legendaEmpilhada);
      }
    }
    this.atualizarFeedback();this.cameraMapa.ignore(this.ui);
    if(this.passoGuia>=0)this.desenharGuia();
  }

  private objetosFiltrados() {
    const primeiros:AlvoVisivel[]=[];
    for(const id of ORDEM_CONSTRUCAO){const alvo=this.alvos.find(a=>a.objeto.deco?.id===id);if(alvo)primeiros.push(alvo);}
    const ids=new Set(primeiros.map(a=>a.objeto.id));
    return [...primeiros,...this.alvos.filter(a=>!ids.has(a.objeto.id))];
  }

  private desenharLista() {
    const c=this.listaConteudo;if(!c)return;
    for(const item of [...c.list])item.destroy();
    this.botoesArea=this.botoesArea.filter(b=>b.caixa.active);this.linhasLista=[];this.idListaMarcado=undefined;
    const u=this.u,p=this.listaPainel,lista=this.objetosFiltrados();
    this.indiceLista=Phaser.Math.Clamp(this.indiceLista,0,Math.max(0,lista.length-this.quantidadeLinhas));
    for(const [i,alvo] of lista.slice(this.indiceLista,this.indiceLista+this.quantidadeLinhas).entries()) {
      const w=p.width-24*u,h=42*u,x=p.x+12*u,y=p.y+42*u+i*46*u;
      const bt=this.botao(x,y,w,h,'',()=>this.selecionarDaLista(alvo.objeto.id));
      c.add(bt.caixa);
      const fundo=bt.caixa.list[0] as Phaser.GameObjects.Graphics;
      bt.caixa.addAt(this.add.graphics().fillStyle(0x263f61,0.8).fillRoundedRect(7*u,5*u,32*u,32*u,8*u),1);
      const img=this.add.image(23*u,h/2,alvo.imagem.texture.key,alvo.imagem.frame.name).setOrigin(0.5);
      img.setScale(Math.min(30*u/img.width,30*u/img.height));bt.caixa.add(img);
      const nome=this.add.text(48*u,h/2,alvo.nome,letra(15*u,'#ffffff',{fontStyle:'bold'})).setOrigin(0,0.5);
      let letras=alvo.nome.length;while(nome.width>w-110*u && letras>2)nome.setText(alvo.nome.slice(0,--letras)+'...');
      bt.caixa.add(nome);
      const status=this.add.text(w-10*u,h/2,'Placed',letra(11*u,'#8d9ab8')).setOrigin(1,0.5);bt.caixa.add(status);
      this.linhasLista.push({id:alvo.objeto.id,fundo,status,w,h});
      const zona=bt.caixa.list.find(o=>o.type==='Zone')!;
      zona.on('pointerover',()=>{this.hoverLista=alvo.objeto.id;this.marcarLista(true);})
        .on('pointerout',()=>{if(this.hoverLista===alvo.objeto.id)this.hoverLista=null;this.marcarLista(true);});
    }
    const y=p.bottom-31*u;
    const voltar=this.botao(p.x+12*u,y,34*u,24*u,'<',()=>this.rolarLista(-this.quantidadeLinhas));
    const proximo=this.botao(p.right-46*u,y,34*u,24*u,'>',()=>this.rolarLista(this.quantidadeLinhas));
    c.add([voltar.caixa,proximo.caixa]);voltar.habilitar(this.indiceLista>0);proximo.habilitar(this.indiceLista+this.quantidadeLinhas<lista.length);
    c.add(this.add.text(p.centerX,y+12*u,lista.length?`${this.indiceLista+1}-${Math.min(lista.length,this.indiceLista+this.quantidadeLinhas)} / ${lista.length}`:'No objects',letra(11*u,'#8d9ab8')).setOrigin(0.5));
    this.marcarLista();this.cameraMapa.ignore(this.ui);
  }

  private marcarLista(forcar=false) {
    const id=this.selecionado?.id??null;if(id===this.idListaMarcado && !forcar)return;this.idListaMarcado=id;
    for(const linha of this.linhasLista){
      const ativa=linha.id===this.selecionado?.id;
      const hover=linha.id===this.hoverLista;
      linha.fundo.clear().fillStyle(ativa?0x202d47:0x1a2844,ativa||hover?1:0).fillRoundedRect(0,0,linha.w,linha.h,8*this.u);
      if(ativa)linha.fundo.lineStyle(1.5*this.u,0xf5c542).strokeRoundedRect(0,0,linha.w,linha.h,8*this.u);
      linha.status.setText(ativa?(this.duplicando?'Copying':'Moving'):'Placed').setColor(ativa?'#f5b533':'#8d9ab8').setFontStyle(ativa?'bold':'600');
    }
  }

  private rolarLista(delta:number) {
    if(!this.listaConteudo)return;
    this.indiceLista+=delta;this.desenharLista();
  }

  private selecionarDaLista(id:number) {
    const alvo=this.alvos.find(a=>a.objeto.id===id);if(!alvo)return;
    if(this.selecionado?.id!==id){this.limparSelecao(false);this.selecionarAlvo(alvo);}
    this.localizarSelecionado();
  }

  private localizarSelecionado() {
    if(!this.selecionado)return;
    this.encerrarArrasto();this.ponteiroPendente=null;
    const b=this.fantasma.getBounds(),cam=this.cameraMapa;
    const esquerda=this.painelObjetosAberto?this.cartao.right+20*this.u:20*this.u;
    const destino=cam.getWorldPoint((esquerda+this.scale.width-70*this.u)/2,(this.cabecalho.bottom+this.legendaPainel.top)/2);
    cam.setScroll(cam.scrollX+b.centerX-destino.x,cam.scrollY+b.centerY-destino.y);
    this.sincronizarCamera();this.atualizarDestaque();
  }

  private sobreUI(p: Phaser.Input.Pointer) {
    return this.passoGuia>=0 || this.cabecalho.contains(p.x,p.y) || this.ferramentasPainel.contains(p.x,p.y) || this.inspectorVisivel && this.cartao.contains(p.x,p.y)
      || this.painelObjetosAberto && this.listaPainel.contains(p.x,p.y) || this.legendaPainel.contains(p.x,p.y)
      || this.botoesArea.some(b=>b.caixa.visible && (!b.caixa.parentContainer || b.caixa.parentContainer.visible)
        && p.x>=b.caixa.x && p.x<=b.caixa.x+b.w && p.y>=b.caixa.y && p.y<=b.caixa.y+b.h);
  }

  private encerrarArrasto() {
    if(this.cameraPendente){this.cameraPendente=false;this.sincronizarCamera();}
    this.inicioArrasto=null;this.arrastou=false;
    this.alvoPressionado=null;
    this.input.setDefaultCursor(this.selecionado?'crosshair':'grab');
  }

  private tipoAlvo(c:ObjetoEditor) {return c.deco?{...c.tipo,...dimensoesDeco(c.deco,this.rotacao)}:tipoOrientado(c.tipo,this.rotacao);}

  private girarPredio() {
    if(!this.selecionado)return;
    this.rotacao=(this.rotacao+1)%4;
    this.posicionar(this.gx,this.gy,true);
    tocarSfx('clique');
  }

  private duplicarSelecionado() {
    if(!this.selecionado || this.duplicando || this.passoGuia>=0)return;
    this.encerrarArrasto();this.ponteiroPendente=null;
    this.restaurarImagem();this.duplicando=true;
    this.marcarLista(true);this.posicionar(this.gx,this.gy,true);
    this.aviso('Copy ready - choose a free spot, then Place or E.');
  }

  private abrirGuia() {
    this.encerrarArrasto();this.ponteiroPendente=null;this.mostrarHover(null);
    this.passoGuia=0;this.desenharUI();
  }
  private avancarGuia() {if(this.passoGuia<GUIA.length-1){this.passoGuia++;this.desenharUI();}else this.fecharGuia();}
  private fecharGuia() {
    this.encerrarArrasto();this.ponteiroPendente=null;
    this.passoGuia=-1;this.desenharUI();
    this.atualizarDestaque();
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

  private selecionarEm(p: Phaser.Input.Pointer,pressionado:ObjetoEditor|null=null) {
    const alvo=pressionado?this.alvos.find(a=>a.objeto.id===pressionado.id):this.alvoEm(p);
    if(!alvo){this.aviso('Click a highlighted building or surface object.');return;}
    this.selecionarAlvo(alvo);
  }

  private selecionarAlvo(alvo:AlvoVisivel) {
    this.mostrarHover(null);
    this.duplicando=false;
    const c=alvo.objeto,img=alvo.imagem;
    this.selecionado=c;this.rotacao=c.rotacao??0;this.imagemOriginal=img;this.alphaOriginal=img.alpha;img.setAlpha(0.4);
    this.input.setDefaultCursor('crosshair');
    this.fantasma.setTexture(img.texture.key,img.frame.name).setOrigin(img.originX,img.originY).setScale(img.scaleX,img.scaleY).setVisible(true);
    this.origem.clear();this.retangulo(this.origem,c.gx,c.gy,c.tipo.w,c.tipo.h,c.z,0xfde047,0.3);
    this.posicionar(c.gx,c.gy,true);this.desenharUI();tocarSfx('pegar');
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
    const a=c.deco?sessao.grade.podeMoverDeco(c.deco,gx,gy,this.rotacao,manterPassagem,this.duplicando):sessao.grade.podeMover(c,gx,gy,manterPassagem,this.rotacao,this.duplicando);
    const tipo=this.tipoAlvo(c);
    if(a.motivo!=='ok' || !this.duplicando && gx===c.gx && gy===c.gy && tipo.w===c.tipo.w && tipo.h===c.tipo.h)return a;
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
    this.fantasma.setTint(a.motivo==='ok'?0xd2ffe4:0xffa6a6).setAlpha(0.95);
    this.area.clear();this.retangulo(this.area,gx,gy,tipo.w,tipo.h,z,a.motivo==='ok'?0x4ade80:0xf87171,0.22);
    this.atualizarFeedback(a);this.atualizarDestaque();
  }

  private atualizarFeedback(avaliacao?:AvaliacaoEditor) {
    if(!this.nome)return;
    const c=this.selecionado;
    this.undo.habilitar(this.historico.length>0);
    this.girarBotao?.habilitar(!!c);this.cancelarBotao?.habilitar(!!c);this.marcarLista();
    this.duplicarBotao?.habilitar(!!c && !this.duplicando);
    this.medida.setVisible(false);
    if(!c){this.nome.setScale(1).setText('Select an object');this.instrucao.setText('Click the map or choose from the list.');
      this.estado.setText('Choose an object from the list').setColor('#8d9ab8');this.colocarBotao?.habilitar(false);this.validacaoIcone.clear();return;}
    const a=avaliacao??this.avaliar(this.gx,this.gy),ok=a.motivo==='ok';this.motivo=a.motivo;
    const nome=this.alvos.find(v=>v.objeto.id===c.id)?.nome??c.tipo.nome;
    this.nome.setText(this.duplicando?`${nome} (copy)`:nome).setScale(1);
    this.nome.setScale(Math.min(1,(this.cartao.width-28*this.u)/this.nome.width));
    const motivos:Record<Motivo,string>={ok:'stable ground',fora:'outside map',ocupado:'occupied',rochas:'rocky ground',instavel:'unstable ground',ingreme:'steep slope',passagem:'keep a gap',tripulacao:'crew nearby',limite:'object limit reached'};
    this.estado.setText(`${ok?'Valid':'Invalid'} spot · ${motivos[a.motivo]}`).setColor(ok?'#3ddc84':'#f87171');
    const u=this.u,g=this.validacaoIcone.clear().lineStyle(1.5*u,ok?0x3ddc84:0xf87171);
    g.strokePoints([{x:7*u,y:0},{x:13*u,y:3*u},{x:12*u,y:10*u},{x:7*u,y:14*u},{x:2*u,y:10*u},{x:1*u,y:3*u}],true);
    if(ok)g.beginPath().moveTo(4*u,6*u).lineTo(6*u,8*u).lineTo(10*u,4*u).strokePath();
    else g.beginPath().moveTo(5*u,4*u).lineTo(9*u,8*u).moveTo(9*u,4*u).lineTo(5*u,8*u).strokePath();
    this.colocarBotao?.habilitar(ok);
  }

  private confirmar() {
    const c=this.selecionado;if(!c || this.passoGuia>=0 || this.inicioArrasto)return;
    const a=this.avaliar(this.gx,this.gy);
    if(a.motivo!=='ok'){tocarSfx('erro');this.atualizarFeedback();return;}
    if(this.duplicando){
      const copia=c.deco?sessao.grade.duplicarDeco(c.deco,this.gx,this.gy,this.rotacao):sessao.grade.duplicar(c,this.gx,this.gy,this.rotacao);
      if(!copia){this.atualizarFeedback();return;}
      const alvo=this.sup.objetosParaEditor().find(v=>c.deco?v.deco===copia:v===copia)!;
      const salvo=this.sup.concluirMovimentoEditor(alvo);
      this.historico.push({tipo:'duplicar',id:alvo.id});if(this.historico.length>100)this.historico.shift();
      this.atualizarAlvos();this.limparSelecao();this.desenharGrade(alvo.gx,alvo.gy,true);
      this.aviso(`Copy placed${salvo?' - Layout saved':''}`);tocarSfx('encaixe');return;
    }
    const antes={tipo:'mover' as const,id:c.id,gx:c.gx,gy:c.gy,rotacao:c.rotacao??0};
    const r=c.deco?sessao.grade.moverDeco(c.deco,this.gx,this.gy,this.rotacao):sessao.grade.mover(c,this.gx,this.gy,true,this.rotacao);
    if(r.motivo!=='ok'){this.atualizarFeedback();return;}
    const alvo=c.deco??c;
    const mudou=antes.gx!==alvo.gx || antes.gy!==alvo.gy || antes.rotacao!==(alvo.rotacao??0);
    if(!mudou){this.limparSelecao();return;}
    this.restaurarImagem();const salvo=this.sup.concluirMovimentoEditor(c);this.atualizarAlvos();
    if(mudou){this.historico.push(antes);if(this.historico.length>100)this.historico.shift();}
    this.limparSelecao();this.aviso(mudou?`Object moved${salvo?' · Layout saved':''}`:'Position kept');tocarSfx('encaixe');
    this.desenharGrade(c.gx,c.gy,true);
  }

  private desfazer() {
    const h=this.historico.at(-1);if(!h)return;
    this.limparSelecao();const c=this.sup.objetosParaEditor().find(c=>c.id===h.id);if(!c)return;
    if(h.tipo==='duplicar'){
      const removido=c.deco?sessao.grade.removerDeco(c.deco):sessao.grade.remover(c);if(!removido)return;
      this.historico.pop();const salvo=this.sup.removerCopiaEditor(c);
      this.atualizarAlvos();this.desenharUI();this.desenharGrade(c.gx,c.gy,true);
      this.aviso(`Duplication undone${salvo?' - Layout saved':''}`);tocarSfx('soltar');return;
    }
    const r=c.deco?sessao.grade.moverDeco(c.deco,h.gx,h.gy,h.rotacao,false):sessao.grade.mover(c,h.gx,h.gy,false,h.rotacao);
    if(r.motivo!=='ok'){this.aviso('The previous spot is no longer available.');return;}
    this.historico.pop();const salvo=this.sup.concluirMovimentoEditor(c);this.atualizarAlvos();this.atualizarFeedback();
    this.desenharGrade(c.gx,c.gy,true);this.aviso(`Move undone${salvo?' · Layout saved':''}`);tocarSfx('soltar');
  }

  private restaurarImagem() {if(this.imagemOriginal?.active)this.imagemOriginal.setAlpha(this.alphaOriginal);this.imagemOriginal=null;}
  private limparSelecao(redesenhar=true) {
    const haviaSelecao=!!this.selecionado;
    this.encerrarArrasto();this.restaurarImagem();this.selecionado=null;this.duplicando=false;
    this.fantasma.setVisible(false);this.area.clear();this.origem.clear();this.realce.clear();this.brilho.setVisible(false);this.etiqueta.setVisible(false);
    this.pairado=null;this.nome?.setScale(1);this.input.setDefaultCursor('grab');
    if(redesenhar && haviaSelecao)this.desenharUI();else this.atualizarFeedback();
  }
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
    else this.atualizarDestaque();
  }
}
