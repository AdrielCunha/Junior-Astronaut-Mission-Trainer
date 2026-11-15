import Phaser from 'phaser';
import { letra, criarPilula, criarBotaoPilula, botaoVerde } from '../tarefas/estilo';
import { alternarMudo, estaMudo, volumeMusica, definirVolumeMusica } from '../audio';
import { alternarEfeitos, efeitosEstaoMudos, volumeEfeitos, definirVolumeEfeitos, tocarSfx } from '../sfx';
import { video, atualizarVideo, type Video } from '../video';
import { SKINS } from '../dados/skins';
import { sessao, dataBonita } from './sessao';

type Pagina = 'menu' | 'settings' | 'video';
type DadosMenu = { aoSairTitulo: () => void };

// A separate overlay keeps the world, mission panels and tutorial timers paused together.
export class MenuJogo extends Phaser.Scene {
  private pagina: Pagina = 'menu';
  private pausadas: string[] = [];
  private aoSairTitulo!: () => void;
  private u = 1;
  private conteudo!: Phaser.GameObjects.Container;
  private largura = 0;
  private altura = 0;
  private proximoy = 0;

  constructor() { super({ key: 'MenuJogo' }); }

  create(dados: DadosMenu) {
    this.pagina = 'menu';
    this.aoSairTitulo = dados.aoSairTitulo;
    this.pausadas = [];
    for (const chave of ['Espaco', 'Superficie', 'Interface']) {
      if (!this.scene.isActive(chave)) continue;
      this.scene.get(chave).input.keyboard?.resetKeys();
      this.pausadas.push(chave);
      this.scene.pause(chave);
    }
    this.scene.bringToTop();
    const resize = () => this.desenhar();
    this.scale.on('resize', resize);
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.pagina === 'menu') this.fechar();
      else this.abrirPagina(this.pagina === 'video' ? 'settings' : 'menu');
    });
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

  private px(n: number) { return Math.round(n * this.u); }
  private fechar() { tocarSfx('fechar'); this.scene.stop(); }
  private abrirPagina(pagina: Pagina) { this.pagina = pagina; this.desenhar(); }

  private desenhar() {
    this.tweens.killAll();
    this.children.removeAll(true);
    const W = this.scale.width, H = this.scale.height;
    // Keep readable text on phones while fitting the tallest page in landscape.
    this.u = Math.min(1.2, (W - 32) / 420, (H - 32) / 520);
    const px = (n: number) => this.px(n);
    this.largura = px(420);
    this.altura = px(this.pagina === 'menu' ? 338 : this.pagina === 'settings' ? 490 : 506);
    const fundo = this.add.rectangle(0, 0, W, H, 0x050e25, 0.78).setOrigin(0).setInteractive();
    fundo.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => ev.stopPropagation());
    this.conteudo = this.add.container(Math.round((W - this.largura) / 2), Math.round((H - this.altura) / 2));
    const g = this.add.graphics()
      .fillStyle(0x050b1b, 0.65).fillRoundedRect(px(3), px(8), this.largura, this.altura, px(28))
      .fillStyle(0x14243e).fillRoundedRect(0, 0, this.largura, this.altura, px(28))
      .lineStyle(px(3), 0xffffff).strokeRoundedRect(0, 0, this.largura, this.altura, px(28))
      .lineStyle(px(1), 0x7dd3fc, 0.35).strokeRoundedRect(px(7), px(7), this.largura - px(14), this.altura - px(14), px(22));
    const titulo = this.pagina === 'menu' ? 'MISSION PAUSED' : this.pagina === 'settings' ? 'SETTINGS' : 'VIDEO & COMFORT';
    const texto = this.add.text(Math.round(this.largura / 2), px(40), titulo, letra(px(28), '#fde047', { stroke: '#07142f', strokeThickness: px(5) })).setOrigin(0.5);
    this.conteudo.add([g, texto]);
    const fechar = criarBotaoPilula(this, { x: this.largura - px(44), y: px(14), w: px(28), h: px(28) }, this.u, '\u00d7', () => this.fechar());
    fechar.caixa.setData('acao', 'close'); this.conteudo.add(fechar.caixa);
    this.proximoy = px(82);
    if (this.pagina === 'menu') this.menu();
    else if (this.pagina === 'settings') this.configuracoes();
    else this.configuracoesVideo();
  }

  private botao(texto: string, acao: () => void, id: string, verde = false) {
    const px = (n: number) => this.px(n);
    const b = { x: px(28), y: this.proximoy, w: this.largura - px(56), h: px(48) };
    let caixa: Phaser.GameObjects.Container;
    if (verde) caixa = botaoVerde(this, Math.round(b.x + b.w / 2), Math.round(b.y + b.h / 2), texto, px(20), b.h, this.u, acao,
      { largura: b.w, altura: b.h, pulsar: false, pararPropagacao: true, animarHover: true });
    else caixa = criarBotaoPilula(this, b, this.u, texto, acao).caixa;
    caixa.setData('acao', id); this.conteudo.add(caixa);
    this.proximoy += b.h + px(12);
  }

  private menu() {
    const px = (n: number) => this.px(n);
    const etiqueta = criarPilula(this, px(74), this.proximoy, this.largura - px(148), px(28), this.u, 0x0b1a4a, 0x334e83);
    const texto = sessao.fase === 'inicio' ? 'Exploring the Moon' : `Day ${sessao.estado.dia} \u00b7 ${dataBonita(sessao.data)}`;
    etiqueta.add(this.add.text(Math.round((this.largura - px(148)) / 2), px(14), texto, letra(px(12), '#bfdbfe')).setOrigin(0.5));
    this.conteudo.add(etiqueta); this.proximoy += px(46);
    this.botao('Continue  \u25b6', () => this.fechar(), 'continue', true);
    this.botao('Settings', () => this.abrirPagina('settings'), 'settings');
    this.botao('Save & main menu', () => { sessao.salvar(); this.aoSairTitulo(); this.fechar(); }, 'main-menu');
    this.conteudo.add(this.add.text(Math.round(this.largura / 2), this.altura - px(19), 'Autosave on this device · ESC to continue', letra(px(11), '#93a9ca')).setOrigin(0.5));
  }

  private alternancia(rotulo: string, valor: string, acao: () => void, id: string) {
    const px = (n: number) => this.px(n), y = this.proximoy;
    this.conteudo.add(this.add.text(px(30), y + px(19), rotulo, letra(px(18))).setOrigin(0, 0.5));
    const b = criarBotaoPilula(this, { x: this.largura - px(158), y, w: px(128), h: px(38) }, this.u, valor, () => { acao(); this.desenhar(); });
    b.caixa.setData('acao', id); this.conteudo.add(b.caixa);
    this.proximoy += px(50);
  }

  private volume(rotulo: string, obter: () => number, definir: (v: number) => void, id: string) {
    const px = (n: number) => this.px(n), y = this.proximoy;
    const label = this.add.text(px(30), y + px(12), rotulo, letra(px(13), '#a9bfdc')).setOrigin(0, 0.5);
    const numero = this.add.text(this.largura - px(30), y + px(12), `${Math.round(obter() * 100)}%`, letra(px(13), '#dbeafe')).setOrigin(1, 0.5);
    this.conteudo.add([label, numero]);
    const esquerda = px(30), w = this.largura - px(60), cy = y + px(34), h = px(8);
    const track = this.add.graphics(), area = this.add.zone(esquerda, cy - px(12), w, px(24)).setOrigin(0).setInteractive({ useHandCursor: true });
    area.setData('acao', id);
    const pintar = () => {
      track.clear().fillStyle(0x08152d).fillRoundedRect(esquerda, cy - Math.round(h / 2), w, h, Math.round(h / 2));
      const cheio = Math.round(w * obter());
      if (cheio) track.fillStyle(0x60a5fa).fillRoundedRect(esquerda, cy - Math.round(h / 2), cheio, h, Math.min(h / 2, cheio / 2));
      track.fillStyle(0xffffff).fillCircle(esquerda + cheio, cy, px(6));
      numero.setText(`${Math.round(obter() * 100)}%`);
    };
    let arrastando = false;
    const ajustar = (pointer: Phaser.Input.Pointer) => {
      const bounds = area.getBounds();
      definir(Phaser.Math.Clamp((pointer.x - bounds.x) / bounds.width, 0, 1)); pintar();
    };
    area.on('pointerdown', (pointer: Phaser.Input.Pointer, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => { ev.stopPropagation(); arrastando = true; ajustar(pointer); });
    const mover = (pointer: Phaser.Input.Pointer) => { if (arrastando && pointer.isDown) ajustar(pointer); };
    const soltar = () => { arrastando = false; };
    this.input.on('pointermove', mover).on('pointerup', soltar);
    area.once('destroy', () => { this.input.off('pointermove', mover).off('pointerup', soltar); });
    this.conteudo.add([track, area]); pintar();
    this.proximoy += px(52);
  }

  private configuracoes() {
    this.alternancia('Music', estaMudo() ? 'Off' : 'On', () => { alternarMudo(); }, 'music');
    this.volume('Music volume', volumeMusica, definirVolumeMusica, 'music-volume');
    this.alternancia('Sound effects', efeitosEstaoMudos() ? 'Off' : 'On', () => { alternarEfeitos(); }, 'effects');
    this.volume('Effects volume', volumeEfeitos, definirVolumeEfeitos, 'effects-volume');
    this.proximoy += this.px(8);
    this.botao('Video & comfort  \u203a', () => this.abrirPagina('video'), 'video');
    this.botao('\u2039  Back', () => this.abrirPagina('menu'), 'back');
  }

  private configuracoesVideo() {
    const qualidades: Video['qualidade'][] = ['auto', 'leve', 'alta'];
    const movimentos: Video['movimento'][] = ['sistema', 'reduzido', 'completo'];
    this.alternancia('Astronaut suit', SKINS.find(s => s.id === video.skin)!.nome, () => atualizarVideo({ skin: SKINS[(SKINS.findIndex(s => s.id === video.skin) + 1) % SKINS.length].id }), 'skin');
    this.alternancia('Video quality', { auto: 'Automatic', leve: 'Low', alta: 'High' }[video.qualidade], () => atualizarVideo({ qualidade: qualidades[(qualidades.indexOf(video.qualidade) + 1) % qualidades.length] }), 'quality');
    this.alternancia('Camera motion', { sistema: 'Device', reduzido: 'Reduced', completo: 'Full' }[video.movimento], () => atualizarVideo({ movimento: movimentos[(movimentos.indexOf(video.movimento) + 1) % movimentos.length] }), 'motion');
    this.alternancia('Decorative effects', video.efeitos ? 'On' : 'Off', () => atualizarVideo({ efeitos: !video.efeitos }), 'decorative');
    this.alternancia('Footprints', video.pegadas ? 'On' : 'Off', () => atualizarVideo({ pegadas: !video.pegadas }), 'footprints');
    this.conteudo.add(this.add.text(this.px(30), this.proximoy + this.px(6), 'Quality changes apply next time you open the game.', letra(this.px(12), '#a9bfdc', { wordWrap: { width: this.largura - this.px(60) } })));
    this.proximoy += this.px(60);
    this.botao('\u2039  Back', () => this.abrirPagina('settings'), 'back');
  }
}
