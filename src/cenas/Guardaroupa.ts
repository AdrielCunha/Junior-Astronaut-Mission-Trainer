// Generated with AI assistance (Claude). See README, "Use of AI tools".
// The wardrobe: opens when the commander uses the Habitat. Three full pages of 12:
//   ASTRONAUTS (different characters), HATS & GLASSES, FACES (little faces on the visor).
// The commander is free; everything else is a prize of side missions (engine/presentes.ts, acessorios.ts).
// What is not won yet shows as "?"; a picture still being made shows as "...". Click an item to wear it,
// click it again to take it off (the astronaut itself cannot be taken off). A preview shows the whole look.
// Like MenuJogo it pauses the scenes behind it and gives them back on close.
import Phaser from 'phaser';
import { CONTORNO, letra, moldura, botaoVerde, botaoFechar, type Caixa } from '../tarefas/estilo';
import { tocarSfx } from '../sfx';
import { video, atualizarVideo, type Video } from '../video';
import { SKINS, SKIN_PADRAO, chaveSkin } from '../dados/skins';
import { ACESSORIOS, daPagina, chaveAcessorio, type Acessorio } from '../dados/acessorios';
import { acessoriosGanhos, skinsGanhas } from '../acessorios';
import sprite from '../dados/astronauta.json';

const FRENTE = 7 * sprite.colunas;   // row facing the camera, standing (column 0)
type Aba = 'astronautas' | 'chapeus' | 'carinhas';
const ABAS: [Aba, string][] = [['astronautas', 'ASTRONAUTS'], ['chapeus', 'HATS & GLASSES'], ['carinhas', 'FACES']];
type Item = { id: string; nome: string; chave: string; ganho: boolean; pronto: boolean; vestido: boolean; pegar: () => void };

export class Guardaroupa extends Phaser.Scene {
  private pausadas: string[] = [];
  private u = 1;
  private aba: Aba = 'astronautas';

  constructor() { super({ key: 'Guardaroupa' }); }

  create() {
    this.pausadas = [];
    this.aba = 'astronautas';
    for (const chave of ['Espaco', 'Superficie', 'Interface']) {
      if (!this.scene.isActive(chave)) continue;
      this.scene.get(chave).input.keyboard?.resetKeys();
      this.pausadas.push(chave);
      this.scene.pause(chave);
    }
    this.scene.bringToTop();
    const resize = () => this.desenhar();
    this.scale.on('resize', resize);
    this.input.keyboard?.on('keydown-ESC', () => this.fechar());
    this.input.keyboard?.on('keydown-ENTER', () => this.fechar());
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

  // The astronaut being shown: the worn one, or the commander while its picture is not ready.
  private skinMostrada() { return this.textures.exists(chaveSkin(video.skin)) ? video.skin : SKIN_PADRAO; }

  private itens(aba: Aba): Item[] {
    if (aba === 'astronautas') {
      const ganhas = skinsGanhas();
      return SKINS.map((s) => ({
        id: s.id, nome: s.nome, chave: chaveSkin(s.id), ganho: ganhas.includes(s.id), pronto: this.textures.exists(chaveSkin(s.id)),
        vestido: video.skin === s.id, pegar: () => atualizarVideo({ skin: s.id }),
      }));
    }
    const ganhos = acessoriosGanhos();
    const campo = (a: Acessorio): keyof Video => a.espaco === 'cabeca' ? 'acessorio' : a.espaco === 'rosto' ? 'rosto' : 'carinha';
    return daPagina(aba).map((a) => ({
      id: a.id, nome: a.nome, chave: chaveAcessorio(a.id), ganho: ganhos.includes(a.id), pronto: this.textures.exists(chaveAcessorio(a.id)),
      vestido: video[campo(a)] === a.id, pegar: () => atualizarVideo({ [campo(a)]: video[campo(a)] === a.id ? '' : a.id } as Partial<Video>),
    }));
  }

  private desenhar() {
    this.tweens.killAll();
    this.children.removeAll(true);
    const W = this.scale.width, H = this.scale.height;
    const u = this.u = Phaser.Math.Clamp(Math.min(W / 1100, H / 650), 0.5, 1.4);
    this.add.rectangle(0, 0, W, H, 0x020617, 0.6).setOrigin(0).setInteractive()
      .on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => ev.stopPropagation());
    const largura = Math.min(W - 40 * u, 760 * u), altura = Math.min(H - 40 * u, 540 * u);
    const x0 = (W - largura) / 2, y0 = (H - altura) / 2 - 8 * u;
    const { tela, rodape: pe, borda } = moldura(this, { x: x0, y: y0, w: largura, h: altura }, u, 'WARDROBE');
    this.conteudo(tela);
    borda();
    botaoVerde(this, x0 + largura / 2, pe.y + pe.h / 2, 'DONE', 20 * u, Math.min(pe.h, 50 * u), u, () => { tocarSfx('clique'); this.fechar(); },
      { pulsar: false, animarHover: true }).setData('acao', 'done');
    botaoFechar(this, x0 + 4 * u, y0 + 4 * u, u, () => this.fechar()).setData('acao', 'close');
  }

  // The head of an astronaut frame (hats, glasses and faces all live there): crop and center it in a tile.
  private cabeca(chave: string, cx: number, cy: number, escala: number, nome?: string) {
    const x = 52, y = 4, w = 88, h = 104;
    const img = this.add.image(cx, cy, chave, FRENTE).setCrop(x, y, w, h).setOrigin((x + w / 2) / sprite.frame, (y + h / 2) / sprite.frame).setScale(escala);
    if (nome) img.setName(nome);
    return img;
  }

  private conteudo(tela: Caixa) {
    const u = this.u, aba = this.aba, itens = this.itens(aba);

    // Tabs, with how many of each page are won.
    const wAba = (tela.w - 32 * u - 2 * 8 * u) / 3, hAba = 38 * u;
    ABAS.forEach(([id, rotulo], i) => {
      const x = tela.x + 16 * u + i * (wAba + 8 * u), y = tela.y + 10 * u, ativa = id === aba;
      const lista = this.itens(id);
      this.add.graphics().fillStyle(ativa ? 0x2563eb : 0x475569).fillRoundedRect(x, y, wAba, hAba, 12 * u)
        .lineStyle(3 * u, ativa ? 0xfde047 : CONTORNO).strokeRoundedRect(x, y, wAba, hAba, 12 * u);
      this.add.text(x + wAba / 2, y + hAba / 2 - 5 * u, rotulo, letra(13 * u, '#ffffff', { fontStyle: 'bold' })).setOrigin(0.5);
      this.add.text(x + wAba / 2, y + hAba / 2 + 9 * u, `${lista.filter((t) => t.ganho).length} / ${lista.length}`, letra(11 * u, '#fde68a', { fontStyle: '500' })).setOrigin(0.5);
      this.add.zone(x, y, wAba, hAba).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { tocarSfx('clique'); this.aba = id; this.desenhar(); });
    });

    // The page: 4 x 3 tiles.
    const gx = tela.x + 16 * u, gy = tela.y + 62 * u, gw = tela.w * 0.64, gh = tela.h - 62 * u - 34 * u, gap = 8 * u;
    const lado = Math.min((gw - 3 * gap) / 4, (gh - 2 * gap) / 3);
    const nomeLinha = this.add.text(gx, tela.y + tela.h - 16 * u, '', letra(14 * u, '#fde047', { fontStyle: 'bold' })).setOrigin(0, 0.5);
    const base = this.skinMostrada();
    itens.forEach((it, i) => {
      const x = gx + (i % 4) * (lado + gap), y = gy + Math.floor(i / 4) * (lado + gap), cx = x + lado / 2, cy = y + lado / 2;
      const g = this.add.graphics();
      if (it.vestido) g.lineStyle(4 * u, 0xfde047).strokeRoundedRect(x - 3 * u, y - 3 * u, lado + 6 * u, lado + 6 * u, 13 * u);
      g.fillStyle(it.ganho ? 0x334155 : 0x1e293b).fillRoundedRect(x, y, lado, lado, 10 * u).lineStyle(3 * u, CONTORNO).strokeRoundedRect(x, y, lado, lado, 10 * u);
      if (!it.ganho) this.add.text(cx, cy, '?', letra(28 * u, '#64748b', { fontStyle: 'bold' })).setOrigin(0.5);
      else if (!it.pronto) this.add.text(cx, cy, '…', letra(24 * u, '#94a3b8', { fontStyle: 'bold' })).setOrigin(0.5);
      else if (aba === 'astronautas') this.add.image(cx, cy, it.chave, FRENTE).setOrigin(0.5, 0.52).setScale(Math.min(0.62, (lado * 0.92) / sprite.frame * 1.15));
      else {
        const escala = Math.min(0.9, (lado * 0.9) / 104);
        this.cabeca(chaveSkin(base), cx, cy, escala);               // a head to wear it on
        this.cabeca(it.chave, cx, cy, escala);
      }
      const zona = this.add.zone(x, y, lado, lado).setOrigin(0).setInteractive({ useHandCursor: it.ganho && it.pronto });
      zona.on('pointerover', () => nomeLinha.setText(it.ganho ? it.nome : 'Win it in a side mission!'));
      zona.on('pointerout', () => nomeLinha.setText(''));
      if (it.ganho && it.pronto) zona.on('pointerdown', () => { tocarSfx('clique'); it.pegar(); this.desenhar(); });
    });

    // Preview: the whole look.
    const px = tela.x + tela.w * 0.82, topo = gy, painelW = tela.w * 0.28, painelH = gh;
    this.add.graphics().fillStyle(0x0f172a, 0.55).fillRoundedRect(px - painelW / 2, topo, painelW, painelH, 18 * u)
      .lineStyle(3 * u, CONTORNO).strokeRoundedRect(px - painelW / 2, topo, painelW, painelH, 18 * u);
    const escala = Math.min(1.1 * u, (painelH * 0.9) / sprite.frame * 1.0), pe = topo + painelH * 0.93;
    const origem = [sprite.pe[0] / sprite.frame, sprite.pe[1] / sprite.frame] as const;
    this.add.sprite(px, pe, chaveSkin(base), FRENTE).setOrigin(origem[0], origem[1]).setScale(escala);
    for (const id of [video.carinha, video.rosto, video.acessorio]) {
      if (id && this.textures.exists(chaveAcessorio(id))) this.add.sprite(px, pe, chaveAcessorio(id), FRENTE).setOrigin(origem[0], origem[1]).setScale(escala);
    }
    void ACESSORIOS;
  }
}
