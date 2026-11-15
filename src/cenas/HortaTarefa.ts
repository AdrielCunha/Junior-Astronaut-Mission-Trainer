// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Ship - Grow the lettuce": water 3 pots until each gauge is in the green band and switch the grow light on;
// then the lettuce grows and bubbles of oxygen come out. The rules live in ../horta-tarefa.ts (pure
// functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { criarHorta, regar, alternarLuz, passo, vasoFeliz, tudoCerto, tarefaConcluida, FAIXA_MIN, FAIXA_MAX, type EstadoHorta } from '../horta-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, texto, vitoria } from './moldura';
import { PAINEL } from './PaineisSolaresTarefa';

const { JANELA_W, JANELA_H, QUADRO_W, QUADRO_H, FOLGA } = PAINEL;
const XS = [150, 300, 450], VASO_Y = 238;
const MEDIDOR = { y0: 60, h: 120, w: 16 };   // water gauge next to each pot

export class HortaTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;
  private estado!: EstadoHorta;
  private acabou = false;
  private desenhar?: () => void;
  private vencer = () => {};
  private bolhas = (_dt: number) => {};

  constructor() { super('HortaTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  create() {
    this.estado = criarHorta(Math.floor(Math.random() * 100000));
    this.acabou = false;
    const { raiz } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Grow the lettuce');
    const msg = barraStatus(this, raiz, QUADRO_H, 'Tap a pot to water it. Fill each gauge to the green band.');
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    const JX = -JANELA_W / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    raiz.add(janela);
    // Ship wall panel with a shelf.
    janela.add(this.add.graphics()
      .fillStyle(0xcbd5e1, 1).fillRoundedRect(0, 0, JANELA_W, JANELA_H, 18)
      .fillStyle(0x94a3b8, 1).fillRect(0, 262, JANELA_W, 10)
      .fillStyle(0xe2e8f0, 1).fillRect(20, 20, JANELA_W - 40, 6)
      .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(0, 0, JANELA_W, JANELA_H, 18));
    const brilho = this.add.graphics();       // pink grow light glow
    const plantas = this.add.graphics();
    const medidores = this.add.graphics();
    janela.add([brilho, plantas, medidores]);

    // The grow light bar at the top, and its switch.
    const lampada = this.add.graphics();
    janela.add(lampada);
    const interruptor = this.add.container(JANELA_W - 58, 52, [
      this.add.circle(0, 0, 24, 0x475569).setStrokeStyle(4, 0xffffff),
      this.add.circle(0, 0, 27).setStrokeStyle(2, 0x1e293b),
      texto(this, 0, 0, '💡', 22, '#ffffff'),
    ]).setSize(54, 54).setInteractive({ useHandCursor: true });
    const rotuloLuz = texto(this, JANELA_W - 58, 90, 'LIGHT', 12, '#1e293b', 0xffffff);
    janela.add([interruptor, rotuloLuz]);

    // Each pot is a big tap target.
    XS.forEach((x, i) => {
      const z = this.add.zone(x, VASO_Y - 60, 130, 170).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        if (this.acabou) return;
        const antes = vasoFeliz(this.estado.vasos[i]);
        this.estado = regar(this.estado, i);
        tocarSfx('bolha');
        // A falling drop.
        const gota = this.add.circle(x, 40, 6, 0x38bdf8).setStrokeStyle(2, 0x1e293b);
        janela.add(gota);
        this.tweens.add({ targets: gota, y: VASO_Y - 30, duration: 260, ease: 'Quad.easeIn', onComplete: () => gota.destroy() });
        const v = this.estado.vasos[i];
        if (!antes && vasoFeliz(v)) msg('Just right! Now the next pot.', '#86efac');
        else if (v.agua > FAIXA_MAX) msg('Too much water! It will drip away slowly. Wait a moment.', '#fde68a');
      });
      janela.add(z);
    });
    interruptor.on('pointerdown', () => {
      if (this.acabou) return;
      this.estado = alternarLuz(this.estado);
      tocarSfx('ligar');
      msg(this.estado.luz ? 'Light on! Plants need light to make food.' : 'Light off. Plants need light!', this.estado.luz ? '#86efac' : '#fde68a');
    });

    this.desenhar = () => {
      const e = this.estado;
      // Light: pink-purple LEDs, like the real space garden.
      lampada.clear().fillStyle(0x1e293b, 1).fillRoundedRect(60, 30, 420, 18, 8);
      for (let k = 0; k < 14; k++) lampada.fillStyle(e.luz ? (k % 2 ? 0xf472b6 : 0xc084fc) : 0x64748b, 1).fillCircle(78 + k * 29, 39, 5);
      brilho.clear();
      if (e.luz) brilho.fillStyle(0xf472b6, 0.12).fillTriangle(60, 48, 480, 48, 540, 262).fillTriangle(60, 48, 0, 262, 540, 262);
      (interruptor.list[0] as Phaser.GameObjects.Arc).setFillStyle(e.luz ? 0xfacc15 : 0x475569);
      plantas.clear();
      medidores.clear();
      e.vasos.forEach((v, i) => {
        const x = XS[i];
        // Lettuce: leaves grow with the growth (a small sprout before).
        const tam = 14 + 26 * e.crescimento + (vasoFeliz(v) ? 4 : 0);
        for (let f = 0; f < 5; f++) {
          const a = -Math.PI / 2 + (f - 2) * 0.55;
          plantas.fillStyle(f % 2 ? 0x22c55e : 0x16a34a, 1).fillEllipse(x + Math.cos(a) * tam * 0.6, VASO_Y - 40 + Math.sin(a) * tam * 0.6, tam * 0.9, tam * 0.55);
        }
        plantas.fillStyle(0xdc2626, 0.5 * e.crescimento).fillEllipse(x, VASO_Y - 44 - tam * 0.3, tam * 0.6, tam * 0.4);   // red romaine tint
        // Pot.
        plantas.fillStyle(0xf97316, 1).fillRoundedRect(x - 40, VASO_Y - 36, 80, 56, 10).lineStyle(4, 0x1e293b, 1).strokeRoundedRect(x - 40, VASO_Y - 36, 80, 56, 10)
          .fillStyle(0xfdba74, 1).fillRect(x - 36, VASO_Y - 32, 72, 8);
        // Gauge: band in green, level in blue.
        const gx = x + 52, y0 = MEDIDOR.y0 + 40;
        medidores.fillStyle(0xffffff, 1).fillRoundedRect(gx, y0, MEDIDOR.w, MEDIDOR.h, 8).lineStyle(3, 0x1e293b, 1).strokeRoundedRect(gx, y0, MEDIDOR.w, MEDIDOR.h, 8)
          .fillStyle(0x86efac, 1).fillRect(gx + 2, y0 + MEDIDOR.h * (1 - FAIXA_MAX), MEDIDOR.w - 4, MEDIDOR.h * (FAIXA_MAX - FAIXA_MIN));
        const nivel = MEDIDOR.h * v.agua;
        medidores.fillStyle(vasoFeliz(v) ? 0x22c55e : v.agua > FAIXA_MAX ? 0xf97316 : 0x38bdf8, 1).fillRoundedRect(gx + 4, y0 + MEDIDOR.h - nivel, MEDIDOR.w - 8, Math.max(4, nivel - 2), 4);
      });
    };
    this.desenhar();

    this.vencer = () => {
      this.acabou = true;
      msg('Fresh lettuce!', '#86efac');
      vitoria(this, janela, JANELA_W, JANELA_H, 'Fresh lettuce!', 'In 2015 astronauts on the Space Station grew red romaine lettuce and ate it. Plants also make oxygen!', this.aoConcluir);
    };
    // Oxygen bubbles while everything is right (called from update).
    let bolhaT = 0;
    this.bolhas = (dt: number) => {
      bolhaT -= dt;
      if (bolhaT > 0) return;
      bolhaT = 0.25;
      const x = XS[Math.floor(Math.random() * 3)] + (Math.random() - 0.5) * 40;
      const b = this.add.circle(x, VASO_Y - 60, 5 + Math.random() * 4, 0xffffff, 0.8).setStrokeStyle(2, 0x38bdf8);
      const o = texto(this, x, VASO_Y - 60, 'O₂', 9, '#0369a1', 0xffffff);
      janela.add([b, o]);
      this.tweens.add({ targets: [b, o], y: 60, alpha: 0, duration: 1600, onComplete: () => { b.destroy(); o.destroy(); } });
    };
    this.events.once('shutdown', () => { this.desenhar = undefined; });
  }

  update(_t: number, dms: number) {
    if (this.acabou || !this.desenhar) return;
    const antes = this.estado;
    this.estado = passo(this.estado, Math.min(dms, 100) / 1000);
    this.desenhar();
    if (!tudoCerto(antes) && tudoCerto(this.estado)) tocarSfx('ok');
    if (tudoCerto(this.estado)) this.bolhas(dms / 1000);
    if (tarefaConcluida(this.estado)) this.vencer();
  }
}
