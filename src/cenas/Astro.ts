// Generated with AI assistance. See README, "Use of AI tools".
// One body of the solar system up close, full screen: click the Sun, a planet or the Moon in the
// solar system view (Espaco). The body turns on its axis (48 Blender frames, make_planetas_3d.py)
// over the real sky, with its facts (NASA planetary fact sheets). Esc, the button or a click
// outside the panel closes it.
import Phaser from 'phaser';
import planetas3d from '../dados/planetas3d.json';
import { fonte, sessao } from './sessao';
import { movimentoReduzido } from '../video';

export type DadosAstro = { nome: string };

type Ficha = { titulo: string; tipo: string; cor: string; dados: [string, string][]; fato: string };
// NASA planetary fact sheets (nssdc.gsfc.nasa.gov/planetary/factsheet) and NASA Science.
const FICHAS: Record<string, Ficha> = {
  sol: { titulo: 'The Sun', tipo: 'Our star', cor: '#fde68a', fato: 'Its light takes 8 minutes and 20 seconds to reach Earth. The dark spots are sunspots: cooler patches where magnetic fields hold the heat in.',
    dados: [['Radius', '696,000 km (109 Earths)'], ['Turns once in', 'about 25 days at its equator'], ['Surface', 'about 5,500 °C'], ['Gravity', '274 m/s² (28 times Earth)'], ['Age', '4.6 billion years']] },
  mercurio: { titulo: 'Mercury', tipo: 'The smallest planet, closest to the Sun', cor: '#cbd5e1', fato: 'It turns so slowly that one day, sunrise to sunrise, lasts 176 Earth days: two of its years.',
    dados: [['Radius', '2,440 km'], ['Day', '176 Earth days (sunrise to sunrise)'], ['Year', '88 Earth days'], ['From the Sun', '58 million km'], ['Gravity', '3.7 m/s²'], ['Moons', 'none'], ['Temperature', '-180 °C at night, 430 °C by day']] },
  venus: { titulo: 'Venus', tipo: 'The hottest planet', cor: '#fde68a', fato: 'It spins backward, and so slowly that its day is longer than its year. Its thick clouds of sulfuric acid trap the heat.',
    dados: [['Radius', '6,052 km'], ['Day', '243 Earth days, turning backward'], ['Year', '225 Earth days'], ['From the Sun', '108 million km'], ['Gravity', '8.9 m/s²'], ['Moons', 'none'], ['Temperature', '465 °C, day and night']] },
  terra: { titulo: 'Earth', tipo: 'Our home', cor: '#93c5fd', fato: 'Its magnetic field and thick air shield us from most space radiation. On the Moon and on the way to Mars there is no such shield.',
    dados: [['Radius', '6,371 km'], ['Day', '24 hours'], ['Year', '365.25 days'], ['From the Sun', '150 million km (1 AU)'], ['Gravity', '9.8 m/s²'], ['Moons', '1'], ['Temperature', 'about 15 °C on average']] },
  lua: { titulo: 'The Moon', tipo: "Earth's only natural satellite", cor: '#e2e8f0', fato: 'It turns once for every trip around Earth, so it always shows us the same face. Your base is at its south pole.',
    dados: [['Radius', '1,737 km'], ['Day', '29.5 Earth days, sunrise to sunrise'], ['From Earth', '384,400 km'], ['Gravity', '1.62 m/s² (one sixth of Earth)'], ['Air', 'almost none'], ['Temperature', '-173 °C at night, 127 °C by day']] },
  marte: { titulo: 'Mars', tipo: 'The red planet, your next stop', cor: '#fdba74', fato: 'Its red comes from rust: iron oxide in its dust. It has the tallest volcano in the solar system, Olympus Mons, about 22 km high.',
    dados: [['Radius', '3,390 km'], ['Day', '24 h 40 min (a sol)'], ['Year', '687 Earth days'], ['From the Sun', '228 million km'], ['Gravity', '3.7 m/s²'], ['Moons', '2: Phobos and Deimos'], ['Temperature', 'about -65 °C on average']] },
};

export class Astro extends Phaser.Scene {
  private nome = 'terra';
  private antesEmTarefa = false;

  constructor() {
    super({ key: 'Astro' });
  }

  init(d: DadosAstro) {
    this.nome = d.nome;
  }

  preload() {
    const g = (planetas3d as unknown as Record<string, { grande: { arquivo: string; quadro: number } }>)[this.nome].grande;
    if (!this.textures.exists(`pl3dg_${this.nome}`)) this.load.spritesheet(`pl3dg_${this.nome}`, g.arquivo, { frameWidth: g.quadro, frameHeight: g.quadro });
  }

  create() {
    const W = this.scale.width, H = this.scale.height, M = Math.min(W, H);
    const info = (planetas3d as unknown as Record<string, { grande: { quadro: number; quadros: number; raio: number } }>)[this.nome].grande;
    const ficha = FICHAS[this.nome];
    this.antesEmTarefa = sessao.emTarefa;
    sessao.emTarefa = true;                                // the map and the zoom wait

    const ceu = this.add.image(W / 2, H / 2, 'ceu_sistema');
    ceu.setScale(Math.max(W / ceu.width, H / ceu.height)).setAlpha(0.9);
    this.add.rectangle(0, 0, W, H, 0x020617, 0.45).setOrigin(0).setInteractive().on('pointerdown', () => this.fechar());

    // The body, big, turning.
    const lado = W > H * 1.2;                              // panel beside it on wide screens, under it otherwise
    const cx = lado ? W * 0.36 : W / 2, cy = lado ? H / 2 : H * 0.36;
    const raio = M * (lado ? 0.34 : 0.26);
    if (this.nome === 'sol') {
      // The Sun's own light: soft glow rings, breathing.
      // Same soft radial glow as the solar system view (texture made by Espaco).
      if (this.textures.exists('brilho_sol')) {
        const brilho = this.add.image(cx, cy, 'brilho_sol').setBlendMode(Phaser.BlendModes.ADD).setScale((raio * 3) / 128).setAlpha(0.85);
        if (!movimentoReduzido()) this.tweens.add({ targets: brilho, scale: (raio * 3.3) / 128, alpha: 0.65, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    const chave = `pl3dg_${this.nome}`;
    const corpo = this.add.sprite(cx, cy, chave, 0).setScale(raio / info.raio);
    if (!this.anims.exists(chave)) {
      this.anims.create({ key: chave, frames: this.anims.generateFrameNumbers(chave, { start: 0, end: info.quadros - 1 }), frameRate: this.nome === 'sol' ? 10 : 14, repeat: -1 });
    }
    if (!movimentoReduzido()) corpo.play(chave);
    corpo.setAlpha(0); this.tweens.add({ targets: corpo, alpha: 1, duration: 300 });

    // The facts.
    const px = lado ? W * 0.62 : W * 0.08, py = lado ? H * 0.18 : H * 0.66, larg = lado ? W * 0.33 : W * 0.84;
    const caixa = this.add.graphics();                     // drawn once the text is laid out, to fit it
    let y = py;
    const linha = (s: string, tam: number, cor: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) => {
      const t = this.add.text(px, y, s, fonte(tam, cor, { wordWrap: { width: larg }, ...extra }));
      y += t.height + 6;
      return t;
    };
    linha(ficha.titulo, Math.max(22, M * 0.05), ficha.cor, { fontStyle: 'bold' });
    linha(ficha.tipo, Math.max(13, M * 0.022), '#bfdbfe');
    y += 6;
    for (const [k, v] of ficha.dados) linha(`${k}:  ${v}`, Math.max(12, M * 0.021), '#e2e8f0');
    y += 6;
    linha(ficha.fato, Math.max(12, M * 0.021), '#86efac');
    linha('Source: NASA planetary fact sheets', 11, '#94a3b8');
    // Fit the panel to the text, centered beside the body on wide screens.
    const alto = y - py, dy = lado ? Math.max(0, H / 2 - py - alto / 2) : 0;
    if (dy) for (const o of this.children.list) if (o instanceof Phaser.GameObjects.Text && o.y >= py) o.y += dy;
    const caixaR = new Phaser.Geom.Rectangle(px - 18, py + dy - 18, larg + 36, alto + 30);
    caixa.fillStyle(0x0b1a4a, 0.82).fillRoundedRect(caixaR.x, caixaR.y, caixaR.width, caixaR.height, 18)
      .lineStyle(2, 0x7dd3fc, 0.8).strokeRoundedRect(caixaR.x, caixaR.y, caixaR.width, caixaR.height, 18)
      .setInteractive(caixaR, Phaser.Geom.Rectangle.Contains);   // a click on the panel does not close it

    const sair = this.add.text(W - 20, 20, 'Close  ✕', fonte(16, '#ffffff', { fontStyle: 'bold', backgroundColor: '#2563eb', padding: { x: 14, y: 8 } }))
      .setOrigin(1, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.fechar());
    sair.setDepth(10);
    this.input.keyboard?.on('keydown-ESC', () => this.fechar());
    this.cameras.main.fadeIn(250, 2, 6, 23);
  }

  private fechar() {
    sessao.emTarefa = this.antesEmTarefa;
    this.scene.stop();
  }
}
