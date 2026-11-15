// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Loading screen: loads everything the game needs before it starts (terrain, modules, commander,
// sky, the live Moon's maps), with a live spinning Moon, a progress ring and real facts, so the
// first seconds of play are smooth. The flight film is not here: filme.ts downloads it in the
// background once the game runs.
import Phaser from 'phaser';
import { movimentoReduzido } from '../video';
import { fonte, dadosTerreno } from './sessao';
import { carregarLua, criarLua, LADO } from './luaShader';
import { giroEm } from './globo';
import modelos from '../dados/modulos.json';
import bandeiras from '../dados/bandeiras.json';
import sprite from '../dados/astronauta.json';
import dadosViagem from '../dados/viagem.json';
import { SKINS, chaveSkin } from '../dados/skins';
import constelacoes from '../dados/constelacoes.json';
import { ICONES, chaveIcone } from '../dados/icones';

const FATOS = [
  'The ground in this game is real: NASA\'s LRO spacecraft measured it with a laser.',
  'Your base sits on the rim of Shackleton crater, near the Moon\'s south pole.',
  'On the Moon you weigh one sixth of what you weigh on Earth.',
  'At the lunar south pole the Sun never climbs high: it circles the horizon.',
  'The stars you will see are in their real places, from NASA star maps.',
];

const GIRO_INICIAL = giroEm(Date.parse('2024-05-05T12:00:00Z'));

export class Carregar extends Phaser.Scene {
  private luaPreview: ReturnType<typeof criarLua> | null = null;
  private luaPlaceholder!: Phaser.GameObjects.Graphics;
  private anel!: Phaser.GameObjects.Graphics;
  private progresso!: Phaser.GameObjects.Text;
  private giro = GIRO_INICIAL;

  constructor() {
    super({ key: 'Carregar', active: true });
  }

  preload() {
    const W = this.scale.width, H = this.scale.height;
    const u = Phaser.Math.Clamp(Math.min(W / 1100, H / 650), 0.62, 1.4);
    const cx = W / 2, cy = H * 0.44;
    const diametro = Math.min(W * 0.46, H * 0.34, 300 * u);
    const raio = diametro / 2;
    const raioAnel = raio + 14 * u;
    const tituloY = Math.max(H * 0.10, cy - raioAnel - 90 * u);
    const progressoY = cy + raioAnel + 16 * u;

    this.add.rectangle(0, 0, W, H, 0x05070f).setOrigin(0).setDepth(-100);

    const rnd = new Phaser.Math.RandomDataGenerator(['lunar-odyssey-loading']);
    const ceu = this.add.graphics().setDepth(-90);
    for (let i = 0; i < 90; i++) {
      const x = rnd.between(0, W), y = rnd.between(0, H);
      ceu.fillStyle(0xffffff, rnd.realInRange(0.08, 0.55)).fillCircle(x, y, rnd.realInRange(0.4, 1.4) * u);
    }

    const chaveBrilho = 'brilhoCarregamento';
    if (!this.textures.exists(chaveBrilho)) {
      const textura = this.textures.createCanvas(chaveBrilho, 256, 256);
      if (textura) {
        const ctx = textura.context;
        const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        grad.addColorStop(0, 'rgba(96, 165, 250, 0.20)');
        grad.addColorStop(0.45, 'rgba(96, 165, 250, 0.07)');
        grad.addColorStop(1, 'rgba(96, 165, 250, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
        textura.refresh();
      }
    }
    if (this.textures.exists(chaveBrilho)) {
      this.add.image(cx, cy, chaveBrilho).setDisplaySize(diametro * 2.4, diametro * 2.4).setDepth(-80);
    }

    this.luaPlaceholder = this.add.graphics().setDepth(-70);
    this.luaPlaceholder.fillStyle(0x1e293b).fillCircle(cx, cy, raio);
    this.luaPlaceholder.lineStyle(2 * u, 0x334155, 0.85).strokeCircle(cx, cy, raio);

    this.anel = this.add.graphics().setDepth(-50);
    this.progresso = this.add.text(cx, progressoY, '0%', fonte(12 * u, '#93c5fd', { fontStyle: 'bold', letterSpacing: 1.5 * u })).setOrigin(0.5).setDepth(1);

    this.add.text(cx, tituloY, 'LUNAR ODYSSEY', fonte(30 * u, '#f8fafc', {
      fontStyle: 'bold',
      shadow: { offsetX: 0, offsetY: 0, color: '#2563eb', blur: 20, fill: true },
    })).setOrigin(0.5).setDepth(1);
    this.add.text(cx, tituloY + 36 * u, 'PREPARING THE MISSION', fonte(11 * u, '#93c5fd', {
      fontStyle: 'bold', letterSpacing: 2.2 * u,
    })).setOrigin(0.5).setDepth(1);

    const yFato = Math.max(H * 0.68, progressoY + 70 * u);
    const linha = this.add.graphics().setDepth(1);
    linha.lineStyle(1, 0x334155, 0.65).lineBetween(cx - 42 * u, yFato - 40 * u, cx + 42 * u, yFato - 40 * u);
    this.add.text(cx, yFato - 26 * u, 'DID YOU KNOW?', fonte(10 * u, '#60a5fa', {
      fontStyle: 'bold', letterSpacing: 2 * u,
    })).setOrigin(0.5).setDepth(1);
    const fato = this.add.text(cx, yFato, FATOS[0], fonte(15 * u, '#cbd5e1', {
      align: 'center',
      wordWrap: { width: Math.min(W - 48, 560 * u) },
      lineSpacing: 4 * u,
    })).setOrigin(0.5, 0).setDepth(1);
    let i = 0;
    this.time.addEvent({ delay: 3200, loop: true, callback: () => fato.setText(FATOS[++i % FATOS.length]) });

    const desenhar = (p: number) => {
      this.giro = GIRO_INICIAL + (movimentoReduzido() ? 0 : p * 120);
      this.luaPreview?.setGiro(this.giro);
      this.anel.clear();
      this.anel.lineStyle(2 * u, 0x1e293b, 0.9).strokeCircle(cx, cy, raioAnel);
      this.anel.lineStyle(3 * u, 0x60a5fa, 0.95);
      this.anel.beginPath();
      this.anel.arc(cx, cy, raioAnel, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p, false);
      this.anel.strokePath();
      const ang = -Math.PI / 2 + Math.PI * 2 * p;
      this.anel.fillStyle(0xf8fafc, 1).fillCircle(cx + Math.cos(ang) * raioAnel, cy + Math.sin(ang) * raioAnel, 2.5 * u);
      this.progresso.setText(`${Math.round(p * 100)}%`);
    };
    desenhar(0);
    this.load.on('progress', desenhar);

    carregarLua(this);
    this.load.image('terreno', dadosTerreno.imagem.arquivo);
    for (const [id, m] of Object.entries(modelos)) this.load.image(`mod_${id}`, m.arquivo);
    this.load.image('foguete_voo', 'lua/modulos/foguete_voo.png');   // launch film and landing (Chegada.ts)
    for (const [id, b] of Object.entries(bandeiras)) this.load.image(`bandeira_${id}`, b.arquivo);
    for (const sk of SKINS) this.load.spritesheet(chaveSkin(sk.id), sk.arquivo, { frameWidth: sprite.frame, frameHeight: sprite.frame });
    this.load.image('viagem_foguete', dadosViagem.foguete.arquivo);
    // The Mars ship, 16 headings (128 KB in all): it waits in lunar orbit after liftoff (Espaco).
    dadosViagem.nave.direcoes.forEach((n, k) => this.load.image(`nave_d${k}`, n.arquivo));
    this.load.image('planeta_marte', 'lua/planetas/marte.png');   // live Mars in the solar system view
    this.load.image('ceu', 'lua/sky.jpg');
    constelacoes.forEach((c, k) => this.load.image(`const${k}`, c.arquivo));
    for (const [id, arquivo] of Object.entries(ICONES)) this.load.image(chaveIcone(id as keyof typeof ICONES), arquivo);

    const criarPreview = () => {
      if (this.luaPreview || !this.textures.exists('luaAlbedo') || !this.textures.exists('luaAltura')) return;
      this.luaPlaceholder.setVisible(false);
      this.luaPreview = criarLua(this, cx, cy);
      this.luaPreview.setScale(diametro / LADO).setDepth(-60).setGiro(this.giro);
    };
    this.load.on('filecomplete', criarPreview);
  }

  update(_time: number, delta: number) {
    if (!this.luaPreview || movimentoReduzido()) return;
    this.giro = (this.giro + delta * 0.012) % 360;
    this.luaPreview.setGiro(this.giro);
  }

  create() {
    this.scene.launch('Espaco');
    this.scene.launch('Superficie');
    this.scene.launch('Interface');
    this.scene.bringToTop();
    let parou = false;
    const parar = () => {
      if (parou) return;
      parou = true;
      if (this.scene.isActive()) this.scene.stop();
    };
    this.cameras.main.fadeOut(450, 5, 7, 15);
    this.cameras.main.once('camerafadeoutcomplete', parar);
    window.setTimeout(parar, 1200);
  }
}
