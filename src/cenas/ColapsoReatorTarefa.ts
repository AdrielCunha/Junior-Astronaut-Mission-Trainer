// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Stop the reactor meltdown": hot spots pop up on the reactor core. Tap each one to cool it before the core overheats.
// The rules live in ../colapso-reator-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { criarTarefaColapsoReator, avancar, resfriar, tarefaConcluida, META, type TarefaColapsoReator } from '../colapso-reator-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto } from './moldura';

const QUADRO_W = 760;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const FOLGA = (QUADRO_H - 500) / 2;   // the frame is taller than the layout was drawn for: centre the content
const JW = 680, JH = 376, JX = -JW / 2, JY = -QUADRO_H / 2 + 36 + FOLGA;
const NX = 50, NY = 6, NR = 148;      // the reactor core: centre and radius inside the window
const TX = -285, T_TOPO = -140, T_ALTURA = 280;   // the thermometer
const INSTRUCAO = 'Tap the hot spots to cool the reactor!';

const mistura = (a: number, b: number, k: number) => {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(a), Phaser.Display.Color.ValueToColor(b), 100, Math.round(k * 100));
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};

export class ColapsoReatorTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('ColapsoReatorTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  private criarTexturas() {
    canvas(this, 'colapso_janela_v3', JW, JH, (c) => {
      c.fillStyle = '#2563eb'; c.beginPath(); c.roundRect(0, 0, JW, JH, 22); c.fill();
      c.save(); c.beginPath(); c.roundRect(0, 0, JW, JH, 22); c.clip();
      c.fillStyle = '#1d4ed8'; c.fillRect(0, 0, JW, JH * 0.12); c.restore();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.beginPath(); c.roundRect(2.5, 2.5, JW - 5, JH - 5, 22); c.stroke();
    });
    // A hot spot: a flat red disc with a yellow flame.
    canvas(this, 'colapso_ponto_v3', 80, 80, (c) => {
      c.lineJoin = 'round';
      c.fillStyle = '#dc2626'; c.beginPath(); c.arc(40, 40, 33, 0, Math.PI * 2); c.fill();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#fbbf24'; c.beginPath();
      c.moveTo(40, 14); c.bezierCurveTo(54, 30, 58, 40, 52, 52); c.bezierCurveTo(48, 60, 32, 60, 28, 52); c.bezierCurveTo(22, 40, 34, 32, 40, 14); c.closePath(); c.fill();
      c.lineWidth = 3.5; c.stroke();
      c.fillStyle = '#fef9c3'; c.beginPath(); c.ellipse(40, 51, 7, 8, 0, 0, Math.PI * 2); c.fill();
    });
  }

  create() {
    let estado: TarefaColapsoReator = criarTarefaColapsoReator();
    this.criarTexturas();
    const { raiz } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Stop the reactor meltdown');
    const msg = barraStatus(this, raiz, QUADRO_H, INSTRUCAO);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    const rim = this.add.graphics();
    rim.lineStyle(5, 0x1e293b, 1).strokeRoundedRect(JX - 2, JY - 2, JW + 4, JH + 4, 24);
    raiz.add(rim);
    const janela = this.add.container(JX + JW / 2, JY + JH / 2);
    raiz.add(janela);
    janela.add(this.add.image(0, 0, 'colapso_janela_v3'));
    const alerta = this.add.rectangle(0, 0, JW, JH, 0xdc2626, 0).setDepth(20);

    // ---- Core (changes colour with the temperature) and thermometer.
    const nucleo = this.add.graphics();
    const termometro = this.add.graphics();
    janela.add([nucleo, termometro]);
    const contador = texto(this, NX, -172, '', 19, '#ffffff', 0x1e293b);
    janela.add([contador, texto(this, TX, -168, 'Heat', 18, '#ffffff', 0x1e293b)]);
    janela.add(alerta);

    const desenhar = (tempo: number) => {
      const k = estado.temperatura;
      const cor = k < 0.5 ? mistura(0x22c55e, 0xfacc15, k * 2) : mistura(0xfacc15, 0xef4444, (k - 0.5) * 2);
      nucleo.clear();
      nucleo.fillStyle(0xe2e8f0, 1).fillCircle(NX, NY, NR + 10).lineStyle(5, 0x1e293b, 1).strokeCircle(NX, NY, NR + 10);
      const pulso = 1 + 0.015 * Math.sin(tempo * (4 + k * 8));
      nucleo.fillStyle(cor, 1).fillCircle(NX, NY, NR * pulso).lineStyle(5, 0x1e293b, 1).strokeCircle(NX, NY, NR * pulso);
      nucleo.fillStyle(0xffffff, 0.35).fillCircle(NX - 50, NY - 55, 26);
      termometro.clear();
      termometro.fillStyle(0xffffff, 1).fillRoundedRect(TX - 22, T_TOPO, 44, T_ALTURA, 20).lineStyle(5, 0x1e293b, 1).strokeRoundedRect(TX - 22, T_TOPO, 44, T_ALTURA, 20);
      const h = Math.max(14, (T_ALTURA - 12) * k);
      termometro.fillStyle(cor, 1).fillRoundedRect(TX - 16, T_TOPO + T_ALTURA - 6 - h, 32, h, 14);
      termometro.lineStyle(4, 0xdc2626, 1).lineBetween(TX - 30, T_TOPO + 34, TX + 30, T_TOPO + 34);   // the danger line
    };

    // ---- Hot spots.
    const pontos = new Map<number, Phaser.GameObjects.Image>();
    let acabou = false;

    const vencer = () => {
      acabou = true;
      alerta.setAlpha(0);
      pontos.forEach((im) => { im.disableInteractive(); this.tweens.killTweensOf(im); this.tweens.add({ targets: im, scale: 0, duration: 200, onComplete: () => im.destroy() }); });
      pontos.clear();
      msg('Meltdown stopped! The reactor is cool.', '#86efac');
      const brilho = this.add.rectangle(0, 0, JW, JH, 0xffffff, 0.5);
      janela.add(brilho);
      this.tweens.add({ targets: brilho, alpha: 0, duration: 900 });
      rajada(this, janela, NX, NY, [0x7dd3fc, 0x86efac, 0xfde047, 0xf9a8d4], 28, 200);
      const faixa = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-300, -60, 600, 120, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-300, -60, 600, 120, 40);
      const bloco = this.add.container(0, 0, [
        faixa,
        texto(this, 0, -22, 'Meltdown stopped!', 38, '#ffffff', 0x1e293b),
        texto(this, 0, 26, 'Reactors need constant cooling so they do not overheat.', 14, '#dcfce7', 0x1e293b),
      ]).setScale(0).setDepth(40);
      janela.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 450, delay: 250, ease: 'Back.easeOut' });
      this.time.delayedCall(2800, () => { this.scene.stop(); this.aoConcluir?.(); });
    };

    const criarPonto = (id: number, x: number, y: number) => {
      const im = this.add.image(NX + x * NR, NY + y * NR, 'colapso_ponto_v3').setScale(0)
        .setInteractive(new Phaser.Geom.Circle(40, 40, 38), Phaser.Geom.Circle.Contains);
      im.input!.cursor = 'pointer';
      janela.add(im);
      this.tweens.add({ targets: im, scale: 1, duration: 220, ease: 'Back.easeOut', onComplete: () => this.tweens.add({ targets: im, scale: 1.12, duration: 320, yoyo: true, repeat: -1 }) });
      im.on('pointerdown', () => {
        if (acabou) return;
        const novo = resfriar(estado, id);
        if (novo === estado) return;
        estado = novo;
        pontos.delete(id);
        im.disableInteractive();
        this.tweens.killTweensOf(im);
        rajada(this, janela, im.x, im.y, [0x7dd3fc, 0xe0f2fe, 0xffffff], 12, 60);
        this.tweens.add({ targets: im, scale: 0, alpha: 0, duration: 160, onComplete: () => im.destroy() });
        if (tarefaConcluida(estado)) vencer();
        else msg(`Cooled! ${estado.resfriados} of ${META}.`, '#7dd3fc');
      });
      pontos.set(id, im);
    };

    let tempo = 0, alarmes = 0;
    const aCadaQuadro = (_t: number, delta: number) => {
      const dt = Math.min(0.05, delta / 1000);
      tempo += dt;
      if (!acabou) {
        estado = avancar(estado, dt);
        if (estado.alarmes !== alarmes) {
          alarmes = estado.alarmes;
          pontos.forEach((im) => { im.disableInteractive(); this.tweens.killTweensOf(im); im.destroy(); });
          pontos.clear();
          msg('Overheated! Cool it down faster.', '#fca5a5');
        }
        for (const p of estado.pontos) if (!pontos.has(p.id)) criarPonto(p.id, p.x, p.y);
        alerta.setAlpha(estado.temperatura > 0.8 ? 0.08 + 0.06 * Math.sin(tempo * 12) : 0);
        contador.setText(`Spots cooled: ${estado.resfriados} of ${META}`);
      }
      desenhar(tempo);
    };
    contador.setText(`Spots cooled: 0 of ${META}`);
    this.events.on('update', aCadaQuadro);
    this.events.once('shutdown', () => this.events.off('update', aCadaQuadro));
  }
}
