import Phaser from 'phaser';
import { CONTORNO, COR_BOTAO_TELA, letra, criarBotaoPilula, botaoVerde, botaoFechar, moldura, pilulaEscura, type Caixa } from '../tarefas/estilo';
import { volumeMusica, definirVolumeMusica } from '../audio';
import { volumeEfeitos, definirVolumeEfeitos, tocarSfx } from '../sfx';
import { video, atualizarVideo, type Video } from '../video';
import { skinUsaProcedural } from '../dados/skins';
import { skinsDisponiveis } from '../acessorios';
import { sessao, dataBonita } from './sessao';
import { lerDescobertas } from '../descobertas';
import { idioma, escolherIdioma } from '../idioma';

type Pagina = 'menu' | 'settings' | 'video' | 'science';
type DadosMenu = { aoSairTitulo: () => void };

// A separate overlay keeps the world, mission panels and tutorial timers paused together.
// Every page is a window of the title screen (Radar.janela): the task frame with its blue screen,
// the title pill, the red X and a green button in the footer; SETTINGS has the same rows as the
// title screen's gear.
export class MenuJogo extends Phaser.Scene {
  private pagina: Pagina = 'menu';
  private pausadas: string[] = [];
  private aoSairTitulo!: () => void;
  private u = 1;
  private descoberta = 0;
  private idiomaMudou = false;

  constructor() { super({ key: 'MenuJogo' }); }

  create(dados: DadosMenu) {
    this.pagina = 'menu';
    this.idiomaMudou = false;
    this.aoSairTitulo = dados.aoSairTitulo;
    this.pausadas = [];
    for (const chave of ['Espaco', 'Superficie', 'Interface', 'Viagem', 'Chegada', 'MarteVista']) {
      if (!this.scene.isActive(chave)) continue;
      this.scene.get(chave).input.keyboard?.resetKeys();
      this.pausadas.push(chave);
      this.scene.pause(chave);
    }
    this.scene.bringToTop();
    const resize = () => this.desenhar();
    this.scale.on('resize', resize);
    this.input.keyboard?.on('keydown-ESC', () => this.voltar());
    this.input.keyboard?.on('keydown-ENTER', () => this.voltar());
    this.events.once('shutdown', () => {
      this.scale.off('resize', resize);
      for (const chave of this.pausadas) {
        this.scene.get(chave).input.keyboard?.resetKeys();
        if (this.scene.isPaused(chave)) this.scene.resume(chave);
      }
      this.pausadas = [];
    });
    this.desenhar();
  }

  private fechar() { tocarSfx('fechar'); this.scene.stop(); }
  private voltar() {
    if (this.pagina === 'menu') this.fechar();
    else this.abrirPagina(this.pagina === 'video' ? 'settings' : 'menu');
  }
  private abrirPagina(pagina: Pagina) { this.pagina = pagina; this.desenhar(); }

  private desenhar() {
    this.tweens.killAll();
    this.children.removeAll(true);
    const W = this.scale.width, H = this.scale.height;
    const u = this.u = Phaser.Math.Clamp(Math.min(W / 1100, H / 650), 0.5, 1.4);
    this.add.rectangle(0, 0, W, H, 0x020617, 0.6).setOrigin(0).setInteractive()
      .on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => ev.stopPropagation());
    const [titulo, lw, lh, rodape] = this.pagina === 'menu' ? ['MISSION PAUSED', 520, 400, 'CONTINUE  ▶']
      : this.pagina === 'settings' ? ['SETTINGS', 520, 540, 'DONE'] : this.pagina==='science' ? ['SCIENCE LOG',600,490,'BACK'] : ['VIDEO & COMFORT', 560, 470, 'DONE'];
    const largura = Math.min(W - 40 * u, lw * u), altura = Math.min(H - 40 * u, lh * u);
    const x0 = (W - largura) / 2, y0 = (H - altura) / 2 - 8 * u;
    const { tela, rodape: pe, borda } = moldura(this, { x: x0, y: y0, w: largura, h: altura }, u, titulo);
    if (this.pagina === 'menu') this.menu(tela);
    else if (this.pagina === 'settings') this.configuracoes(tela);
    else if(this.pagina==='science') this.descobertas(tela);
    else this.configuracoesVideo(tela);
    borda();
    botaoVerde(this, x0 + largura / 2, pe.y + pe.h / 2, rodape, 20 * u, Math.min(pe.h, 50 * u), u, () => { tocarSfx('clique'); this.voltar(); },
      { pulsar: false, animarHover: true }).setData('acao', this.pagina === 'menu' ? 'continue' : 'back');
    botaoFechar(this, x0 + 4 * u, y0 + 4 * u, u, () => this.fechar()).setData('acao', 'close');
  }

  // A full-width button inside the screen, centred on y.
  private botao(tela: Caixa, y: number, texto: string, acao: () => void, id: string, cor?: number) {
    const u = this.u, w = Math.min(tela.w - 80 * u, 340 * u), h = 52 * u;
    const b = criarBotaoPilula(this, { x: tela.x + (tela.w - w) / 2, y: y - h / 2, w, h }, u, texto, () => { tocarSfx('clique'); acao(); }, cor);
    b.texto.setFontSize(Math.round(20 * u));
    b.caixa.setData('acao', id);
  }

  private menu(tela: Caixa) {
    const u = this.u, cx = tela.x + tela.w / 2;
    const texto = sessao.fase === 'inicio' ? `Exploring ${sessao.mundo==='lua'?'the Moon':sessao.mundo==='nave'?'the ship':'Mars'}` : `Day ${sessao.estado.dia} · ${dataBonita(sessao.data)}`;
    const t = this.add.text(cx, tela.y + tela.h * 0.2, texto, letra(17 * u, '#ffffff')).setOrigin(0.5).setDepth(1);
    const pw = t.width + 44 * u, ph = t.height + 14 * u;
    pilulaEscura(this.add.graphics(), cx - pw / 2, t.y - ph / 2, pw, ph, u);
    this.botao(tela, tela.y + tela.h * 0.42, 'SETTINGS', () => this.abrirPagina('settings'), 'settings');
    this.botao(tela, tela.y + tela.h * 0.61, 'SCIENCE LOG', () => { this.descoberta=Math.max(0,lerDescobertas().length-1);this.abrirPagina('science'); }, 'science');
    this.botao(tela, tela.y + tela.h * 0.81, sessao.explorando ? 'MAIN MENU' : 'SAVE & MAIN MENU', () => {
      sessao.salvar();
      // Return from a cinematic at its saved chapter checkpoint.
      if (sessao.explorando || this.pausadas.some(k => ['Viagem','Chegada','MarteVista'].includes(k)) || sessao.partida) { location.reload(); return; }
      this.aoSairTitulo(); this.fechar();
    }, 'main-menu', 0x475569);
    this.add.text(cx, tela.y + tela.h - 14 * u, 'Autosave on this device · ESC to continue', letra(12 * u, '#bfdbfe', { fontStyle: '500' })).setOrigin(0.5);
  }

  private descobertas(tela: Caixa) {
    const lista=lerDescobertas(),u=this.u;
    this.descoberta=Phaser.Math.Clamp(this.descoberta,0,Math.max(0,lista.length-1));
    const d=lista[this.descoberta];
    const fonte=Math.max(14,Math.round(18*u));
    this.add.text(tela.x+18*u,tela.y+18*u,d?.titulo??'Your discoveries',letra(fonte+2,'#fde047',{wordWrap:{width:tela.w-36*u},fontStyle:'bold'}));
    this.add.text(tela.x+18*u,tela.y+70*u,d?.fato??'Complete a task to save its science fact here. You can read it any time.',letra(fonte,'#ffffff',{wordWrap:{width:tela.w-36*u},lineSpacing:4*u}));
    if(lista.length>1) {
      const y=tela.y+tela.h-28*u;
      botaoVerde(this,tela.x+55*u,y,'◀',20*u,40*u,u,()=>{this.descoberta=(this.descoberta-1+lista.length)%lista.length;this.desenhar();},{pulsar:false});
      botaoVerde(this,tela.x+tela.w-55*u,y,'▶',20*u,40*u,u,()=>{this.descoberta=(this.descoberta+1)%lista.length;this.desenhar();},{pulsar:false});
      this.add.text(tela.x+tela.w/2,y,`${this.descoberta+1} / ${lista.length}`,letra(16*u)).setOrigin(0.5);
    }
  }

  // Same rows as the title screen's gear (Radar.configurarAudio), plus the way to the video options.
  private configuracoes(tela: Caixa) {
    const u = this.u, linhas = 6;
    const yLinha = (i: number) => tela.y + tela.h * (i + 0.5) / linhas;
    const volumes: [string, () => number, (v: number) => void, string][] = [
      ['Music', volumeMusica, definirVolumeMusica, 'music-volume'], ['Sound effects', volumeEfeitos, definirVolumeEfeitos, 'effects-volume']];
    volumes.forEach(([nome, ler, definir, id], i) => {
      const y = yLinha(i);
      this.add.text(tela.x + 20 * u, y, nome, letra(18 * u, '#ffffff', { fontStyle: 'bold' })).setOrigin(0, 0.5);
      const valor = this.add.text(tela.x + tela.w - 132 * u, y, '', letra(16 * u, '#fde047', { fontStyle: 'bold' })).setOrigin(0.5);
      const atualizar = () => valor.setText(`${Math.round(ler() * 100)}%`);
      for (const [x, s, d] of [[tela.x + tela.w - 215 * u, '−', -0.1], [tela.x + tela.w - 48 * u, '+', 0.1]] as const) {
        const b = criarBotaoPilula(this, { x: x - 21 * u, y: y - 19 * u, w: 42 * u, h: 38 * u }, u, s, () => { tocarSfx('clique'); definir(ler() + d); atualizar(); }, COR_BOTAO_TELA);
        b.texto.setFontSize(Math.round(20 * u));
        b.caixa.setData('acao', `${id}-${d > 0 ? 'up' : 'down'}`);
      }
      atualizar();
    });
    // Language: the whole menu redraws, the paused scenes behind it are rewritten by idiomaPhaser.
    const yI = yLinha(2), wI = 160 * u, hI = 40 * u;
    this.add.text(tela.x + 20 * u, this.idiomaMudou ? yI - 10 * u : yI, 'Language', letra(18 * u, '#ffffff', { fontStyle: 'bold' })).setOrigin(0, 0.5);
    criarBotaoPilula(this, { x: tela.x + tela.w - 20 * u - wI, y: yI - hI / 2, w: wI, h: hI }, u, idioma === 'pt' ? 'Português' : 'English', () => {
      tocarSfx('clique'); escolherIdioma(idioma === 'pt' ? 'en' : 'pt'); this.idiomaMudou = true; this.desenhar();
    }, COR_BOTAO_TELA).caixa.setData('acao', 'language');
    // Like the video quality note: texts built from other values (dates) switch on their next update.
    if (this.idiomaMudou) this.add.text(tela.x + 20 * u, yI + 13 * u, 'Some texts update tomorrow.', letra(12 * u, '#bfdbfe', { fontStyle: '500' })).setOrigin(0, 0.5);
    // Astronaut: one swatch per astronaut won (the Habitat's wardrobe has the full pages), sized to fit the row.
    const lista = skinsDisponiveis();
    const yS = yLinha(3);
    this.add.text(tela.x + 20 * u, yS, 'Astronaut', letra(18 * u, '#ffffff', { fontStyle: 'bold' })).setOrigin(0, 0.5);
    const nome = this.add.text(tela.x + tela.w - 20 * u, yS, '', letra(16 * u, '#fde047', { fontStyle: 'bold' })).setOrigin(1, 0.5);
    const hex = (c: string) => Number.parseInt(c.slice(1), 16);
    const lado = Math.min(42 * u, (tela.w - 40 * u) / lista.length - 10 * u), raio = Math.min(9 * u, lado / 4);
    const aneis: Phaser.GameObjects.Graphics[] = [];
    const atualizarSkin = () => {
      aneis.forEach((a, i) => a.setAlpha(lista[i].id === video.skin ? 1 : 0));
      nome.setText(lista.find((s) => s.id === video.skin)?.nome ?? '');
    };
    lista.forEach((s, i) => {
      const m = 20 * u + lado / 2 + 4 * u;
      const x = lista.length > 1 ? tela.x + m + (tela.w - 2 * m) * i / (lista.length - 1) : tela.x + tela.w / 2, y = yLinha(4);
      aneis.push(this.add.graphics().lineStyle(4 * u, 0xfde047)
        .strokeRoundedRect(x - lado / 2 - 5 * u, y - lado / 2 - 5 * u, lado + 10 * u, lado + 10 * u, raio + 4 * u));
      this.add.graphics().fillStyle(hex(s.cor)).fillRoundedRect(x - lado / 2, y - lado / 2, lado, lado, raio)
        .lineStyle(3 * u, CONTORNO).strokeRoundedRect(x - lado / 2, y - lado / 2, lado, lado, raio)
        .setInteractive(new Phaser.Geom.Rectangle(x - lado / 2, y - lado / 2, lado, lado), Phaser.Geom.Rectangle.Contains)
        .on('pointerover', () => tocarSfx('suave'))
        .on('pointerdown', () => { tocarSfx('clique'); atualizarVideo({ skin: s.id }); atualizarSkin(); });
      if(skinUsaProcedural(s.id))this.add.text(x,y,'3D',letra(12*u,'#0f172a',{fontStyle:'bold'})).setOrigin(.5);
    });
    atualizarSkin();
    this.botao(tela, yLinha(5), 'VIDEO & COMFORT  ›', () => this.abrirPagina('video'), 'video', COR_BOTAO_TELA);
  }

  private configuracoesVideo(tela: Caixa) {
    const u = this.u, linhas = 5;
    const yLinha = (i: number) => tela.y + tela.h * (i + 0.5) / linhas;
    const qualidades: Video['qualidade'][] = ['auto', 'leve', 'alta'];
    const movimentos: Video['movimento'][] = ['sistema', 'reduzido', 'completo'];
    const opcoes: [string, () => string, () => void, string][] = [
      ['Video quality', () => ({ auto: 'Automatic', leve: 'Low', alta: 'High' }[video.qualidade]), () => atualizarVideo({ qualidade: qualidades[(qualidades.indexOf(video.qualidade) + 1) % qualidades.length] }), 'quality'],
      ['Camera motion', () => ({ sistema: 'Device', reduzido: 'Reduced', completo: 'Full' }[video.movimento]), () => atualizarVideo({ movimento: movimentos[(movimentos.indexOf(video.movimento) + 1) % movimentos.length] }), 'motion'],
      ['Decorative effects', () => video.efeitos ? 'On' : 'Off', () => atualizarVideo({ efeitos: !video.efeitos }), 'decorative'],
      ['Footprints', () => video.pegadas ? 'On' : 'Off', () => atualizarVideo({ pegadas: !video.pegadas }), 'footprints'],
    ];
    opcoes.forEach(([rotulo, valor, mudar, id], i) => {
      const y = yLinha(i), w = 150 * u, h = 40 * u;
      this.add.text(tela.x + 20 * u, y, rotulo, letra(18 * u, '#ffffff', { fontStyle: 'bold' })).setOrigin(0, 0.5);
      const b = criarBotaoPilula(this, { x: tela.x + tela.w - 20 * u - w, y: y - h / 2, w, h }, u, valor(), () => { tocarSfx('clique'); mudar(); b.texto.setText(valor()); }, COR_BOTAO_TELA);
      b.caixa.setData('acao', id);
    });
    this.add.text(tela.x + tela.w / 2, yLinha(4), 'Quality changes apply next time you open the game.',
      letra(14 * u, '#bfdbfe', { fontStyle: '500', align: 'center', wordWrap: { width: tela.w - 40 * u } })).setOrigin(0.5);
  }
}
