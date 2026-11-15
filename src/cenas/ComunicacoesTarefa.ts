// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Tune the radio": drag two knobs (frequency and volume) until your wave matches the message wave from Earth.
// The rules live in ../comunicacoes-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import {
  criarTarefaComunicacoes, ajustarFrequencia, ajustarGanho, alinhamento, ondasAlinhadas, passar, progressoDaTrava,
  tarefaConcluida, ciclosDaOnda, amplitudeDaOnda, type TarefaComunicacoes,
} from '../comunicacoes-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto } from './moldura';
import { tocarSfx } from '../sfx';

const QUADRO_W = 760;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const INSTRUCAO = 'Turn the knobs to match Earth\'s wave.';
// The radio screen (local coordinates of `janela`).
const JW = 680, JH = 260;
const TELA = { x: 20, y: 20, w: JW - 40, h: JH - 70 };
// The two sliders (coordinates of the frame centre).
const X0 = -190, X1 = 190;
const Y_FREQ = 105, Y_GANHO = 155;

export class ComunicacoesTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('ComunicacoesTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  private criarTexturas() {
    // The window: flat blue with a dark outline.
    canvas(this, 'comu_janela_v3', JW, JH, (c) => {
      c.fillStyle = '#2563eb'; c.beginPath(); c.roundRect(0, 0, JW, JH, 18); c.fill();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.beginPath(); c.roundRect(2.5, 2.5, JW - 5, JH - 5, 18); c.stroke();
    });
    // Earth: flat.
    canvas(this, 'comu_terra_v3', 96, 96, (c) => {
      c.fillStyle = '#38bdf8'; c.beginPath(); c.arc(48, 48, 44, 0, Math.PI * 2); c.fill();
      c.save(); c.beginPath(); c.arc(48, 48, 44, 0, Math.PI * 2); c.clip();
      c.fillStyle = '#4ade80';
      c.beginPath(); c.ellipse(34, 40, 14, 18, 0.4, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(64, 58, 12, 9, -0.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(54, 22, 14, 5, -0.2, 0, Math.PI * 2); c.fill();
      c.restore();
      c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.beginPath(); c.arc(48, 48, 44, 0, Math.PI * 2); c.stroke();
    });
    // Slider track and knob.
    canvas(this, 'comu_trilho_v3', 420, 30, (c) => {
      c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(2, 5, 416, 20, 10); c.fill();
      c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#1e293b';
      for (let i = 0; i <= 20; i++) c.fillRect(20 + i * 19, i % 5 === 0 ? 10 : 12, 2, i % 5 === 0 ? 10 : 6);
    });
    canvas(this, 'comu_botao_v3', 56, 56, (c) => {
      c.fillStyle = '#facc15'; c.beginPath(); c.arc(28, 28, 22, 0, Math.PI * 2); c.fill();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#1e293b'; c.fillRect(26, 10, 4, 12);
    });
  }

  create() {
    let estado: TarefaComunicacoes = criarTarefaComunicacoes();
    this.criarTexturas();
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Tune the radio');
    const msg = barraStatus(this, raiz, QUADRO_H, INSTRUCAO);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    // ---- The window with the radio screen.
    const JX = -JW / 2, JY = -205;
    const janela = this.add.container(JX, JY);
    raiz.add(janela);
    janela.add(this.add.image(0, 0, 'comu_janela_v3').setOrigin(0));

    const fundoTela = this.add.graphics();
    fundoTela.fillStyle(0x14532d, 1).fillRoundedRect(TELA.x, TELA.y, TELA.w, TELA.h, 14);
    fundoTela.lineStyle(5, 0x1e293b, 1).strokeRoundedRect(TELA.x, TELA.y, TELA.w, TELA.h, 14);
    fundoTela.lineStyle(1, 0x15803d, 1);
    for (let i = 1; i < 10; i++) fundoTela.lineBetween(TELA.x + i * TELA.w / 10, TELA.y + 6, TELA.x + i * TELA.w / 10, TELA.y + TELA.h - 6);
    for (let i = 1; i < 4; i++) fundoTela.lineBetween(TELA.x + 6, TELA.y + i * TELA.h / 4, TELA.x + TELA.w - 6, TELA.y + i * TELA.h / 4);
    janela.add(fundoTela);
    janela.add(this.add.image(TELA.x + 38, TELA.y + 36, 'comu_terra_v3').setScale(0.55));
    janela.add(texto(this, TELA.x + 118, TELA.y + 18, 'Message from Earth', 15, '#fde047', 0x1e293b));
    janela.add(texto(this, TELA.x + 92, TELA.y + TELA.h - 18, 'Your wave', 15, '#86efac', 0x1e293b));
    const ondas = this.add.graphics();
    janela.add(ondas);

    // Progress bar under the screen.
    const barra = this.add.graphics();
    janela.add(barra);

    // ---- Sliders.
    const botoes = [
      { y: Y_FREQ, nome: 'Frequency' },
      { y: Y_GANHO, nome: 'Volume' },
    ].map(({ y, nome }) => {
      raiz.add(texto(this, -276, y, nome, 18, '#ffffff', 0x1e293b));
      raiz.add(this.add.image(0, y, 'comu_trilho_v3'));
      const b = this.add.image(X0, y, 'comu_botao_v3');
      raiz.add(b);
      return b;
    });

    // ---- Input.
    let modo: 'freq' | 'ganho' | null = null;
    let acabou = false;
    const aoLocal = (p: Phaser.Input.Pointer) => ({ x: (p.x - raiz.x) / s, y: (p.y - raiz.y) / s });
    const aplicar = (p: Phaser.Input.Pointer) => {
      if (acabou || !modo) return;
      const v = (aoLocal(p).x - X0) / (X1 - X0);
      const antes = Math.round((modo === 'freq' ? estado.frequencia : estado.ganho) * 20);
      estado = modo === 'freq' ? ajustarFrequencia(estado, v) : ajustarGanho(estado, v);
      if (Math.round((modo === 'freq' ? estado.frequencia : estado.ganho) * 20) !== antes) tocarSfx('girar');
    };
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (acabou) return;
      const l = aoLocal(p);
      if (l.x < X0 - 40 || l.x > X1 + 40) return;
      if (Math.abs(l.y - Y_FREQ) < 22) modo = 'freq';
      else if (Math.abs(l.y - Y_GANHO) < 22) modo = 'ganho';
      else return;
      tocarSfx('pegar');
      aplicar(p);
    });
    this.input.on('pointermove', aplicar);
    this.input.on('pointerup', () => { if (modo) tocarSfx('soltar'); modo = null; });

    // ---- Win.
    const vencer = () => {
      acabou = true; modo = null;
      msg('Message received! The signal is clear.', '#86efac');
      const brilho = this.add.rectangle(0, 0, JW, JH, 0xffffff, 0.5).setOrigin(0);
      janela.add(brilho);
      this.tweens.add({ targets: brilho, alpha: 0, duration: 900 });
      rajada(this, janela, TELA.x + 38, TELA.y + 36, [0xfde047, 0x86efac, 0x7dd3fc, 0xf9a8d4], 26, 170);
      const faixa = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-280, -58, 560, 116, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-280, -58, 560, 116, 40);
      const bloco = this.add.container(JW / 2, JH / 2 - 10, [
        faixa,
        texto(this, 0, -16, 'Communication restored!', 34, '#ffffff', 0x1e293b),
        texto(this, 0, 28, 'A radio message reaches Earth in 1.3 seconds!', 15, '#dcfce7', 0x1e293b),
      ]).setScale(0).setDepth(40);
      janela.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 450, delay: 250, ease: 'Back.easeOut' });
      this.time.delayedCall(2800, () => { this.scene.stop(); this.aoConcluir?.(); });
    };

    const desenharOnda = (g: Phaser.GameObjects.Graphics, ciclos: number, amp: number, fase: number, ruido: number, cy: number, meia: number) => {
      const x0 = TELA.x + 16, larg = TELA.w - 32;
      g.beginPath();
      for (let i = 0; i <= 90; i++) {
        const u = i / 90;
        const y = cy - Math.sin(u * Math.PI * 2 * ciclos + fase) * amp * meia + (ruido ? (Math.random() - 0.5) * ruido : 0);
        if (i === 0) g.moveTo(x0, y); else g.lineTo(x0 + u * larg, y);
      }
      g.strokePath();
    };

    let avisou = 0;
    const aCadaQuadro = (tempo: number, delta: number) => {
      const dt = Math.min(0.05, delta / 1000);
      if (!acabou) estado = passar(estado, dt);
      const q = alinhamento(estado);
      const ok = ondasAlinhadas(estado);
      botoes[0].x = X0 + estado.frequencia * (X1 - X0);
      botoes[1].x = X0 + estado.ganho * (X1 - X0);

      // Two waves: the Earth message above, yours below. Same phase, so only frequency and volume differ.
      ondas.clear();
      const meia = TELA.h / 4 - 8, fase = tempo / 300;
      const cyAlvo = TELA.y + TELA.h * 0.3, cyMinha = TELA.y + TELA.h * 0.72;
      ondas.lineStyle(4, 0xfde047, 1);
      desenharOnda(ondas, ciclosDaOnda(estado.frequenciaAlvo), amplitudeDaOnda(estado.ganhoAlvo), fase, 0, cyAlvo, meia);
      // Traffic light: far = red, close = orange, tuned = green.
      const corMinha = ok ? 0x4ade80 : q > 0.5 ? 0xfb923c : 0xf87171;
      ondas.lineStyle(ok || q > 0.5 ? 6 : 4, corMinha, 1);
      botoes.forEach((b) => b.setTint(ok ? 0x86efac : q > 0.5 ? 0xfb923c : 0xffffff));
      desenharOnda(ondas, ciclosDaOnda(estado.frequencia), amplitudeDaOnda(estado.ganho), fase, acabou ? 0 : (1 - q) * 22, cyMinha, meia);

      // Lock progress.
      const prog = progressoDaTrava(estado);
      barra.clear();
      barra.fillStyle(0xffffff, 1).fillRoundedRect(TELA.x + 130, JH - 32, TELA.w - 260, 24, 12);
      barra.lineStyle(4, 0x1e293b, 1).strokeRoundedRect(TELA.x + 130, JH - 32, TELA.w - 260, 24, 12);
      if (prog > 0) barra.fillStyle(0x22c55e, 1).fillRoundedRect(TELA.x + 133, JH - 29, Math.max(18, (TELA.w - 266) * prog), 18, 9);

      if (acabou) return;
      if (tarefaConcluida(estado)) { vencer(); return; }
      const nivel = ok ? 3 : q > 0.5 ? 2 : 1;
      if (nivel !== avisou) {
        avisou = nivel;
        if (nivel === 3) msg('The waves match! Hold it there for a moment...', '#86efac');
        else if (nivel === 2) msg('Getting close! Adjust a little more.', '#fb923c');
        else msg(INSTRUCAO);
      }
    };
    this.events.on('update', aCadaQuadro);
    this.events.once('shutdown', () => this.events.off('update', aCadaQuadro));
  }
}
