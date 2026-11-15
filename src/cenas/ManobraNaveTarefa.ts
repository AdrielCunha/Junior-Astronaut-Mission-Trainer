// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Ship - Thruster puffs": keep the ship inside the bending lane with small puffs left and right. In space a
// push keeps you moving, so every puff needs a puff the other way to stop. The rules live in
// ../manobra-nave-tarefa.ts (pure functions, tested); this scene only draws and reads the buttons/keys.
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { criarManobra, soprar, passo, naFaixa, centroFaixa, tarefaConcluida, MEIA_FAIXA, type EstadoManobra } from '../manobra-nave-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, texto, vitoria } from './moldura';
import { PAINEL } from './PaineisSolaresTarefa';

const { JANELA_W, JANELA_H, QUADRO_W, QUADRO_H, FOLGA } = PAINEL;
const NAVE_Y = 220;            // the ship stays at this height; the lane scrolls down past it
const VELOCIDADE_TELA = 70;    // pixels per second the stars and the lane move down

export class ManobraNaveTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;
  private estado!: EstadoManobra;
  private acabou = false;
  private desenhar?: () => void;
  private vencer = () => {};

  constructor() { super('ManobraNaveTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  create() {
    this.estado = criarManobra(1 + Math.floor(Math.random() * 1000));
    this.acabou = false;
    const { raiz } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Thruster puffs');
    const msg = barraStatus(this, raiz, QUADRO_H, 'Tap ◀ or ▶ (or the arrow keys) to stay in the green lane.');
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    const JX = -JANELA_W / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    raiz.add(janela);
    const espaco = this.add.graphics().fillStyle(0x0b1230, 1).fillRoundedRect(0, 0, JANELA_W, JANELA_H, 18);
    const estrelas = Array.from({ length: 50 }, (_v, i) => ({ x: (i * 97) % JANELA_W, y: (i * 61) % JANELA_H, r: i % 7 ? 1 : 2 }));
    const ceu = this.add.graphics();
    const faixa = this.add.graphics();
    // The ship seen from above: white body, orange stripes, blue window; flames show the last puff.
    const nave = this.add.container(0, NAVE_Y);
    const corpo = this.add.graphics()
      .fillStyle(0xe2e8f0, 1).fillTriangle(0, -34, -16, 14, 16, 14).lineStyle(4, 0x1e293b, 1).strokeTriangle(0, -34, -16, 14, 16, 14)
      .fillStyle(0xf97316, 1).fillTriangle(-16, 14, -26, 22, -12, 6).fillTriangle(16, 14, 26, 22, 12, 6)
      .fillStyle(0x38bdf8, 1).fillCircle(0, -6, 6).lineStyle(3, 0x1e293b, 1).strokeCircle(0, -6, 6);
    const jatoE = this.add.graphics().fillStyle(0xfde047, 1).fillTriangle(-16, -2, -34, -6, -16, 6).setAlpha(0);
    const jatoD = this.add.graphics().fillStyle(0xfde047, 1).fillTriangle(16, -2, 34, -6, 16, 6).setAlpha(0);
    nave.add([jatoE, jatoD, corpo]);
    janela.add([espaco, ceu, faixa, nave]);
    janela.add(this.add.graphics().lineStyle(5, 0x1e293b, 1).strokeRoundedRect(0, 0, JANELA_W, JANELA_H, 18));

    // Puff buttons, big for small hands.
    const botao = (x: number, lado: -1 | 1) => {
      const b = this.add.container(x, 135, [
        this.add.circle(0, 0, 30, 0x2563eb).setStrokeStyle(4, 0xffffff),
        this.add.circle(0, 0, 33).setStrokeStyle(2, 0x1e293b),
        this.add.graphics().fillStyle(0xffffff).fillTriangle(-8*lado,-11,-8*lado,11,10*lado,0),
      ]).setSize(66, 66).setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => puff(lado));
      raiz.add(b);
      return b;
    };
    // The "On course" bar between the two buttons.
    const medidor = this.add.graphics();
    raiz.add(medidor);
    raiz.add(texto(this, 0, 112, 'On course', 15, '#ffffff', 0x1e293b));

    const puff = (lado: -1 | 1) => {
      if (this.acabou) return;
      this.estado = soprar(this.estado, lado);
      tocarSfx('whoosh');
      const jato = lado > 0 ? jatoE : jatoD;   // pushing right fires the left thruster
      jato.setAlpha(1);
      this.tweens.add({ targets: jato, alpha: 0, duration: 260 });
    };
    botao(-250, -1);
    botao(250, 1);
    this.input.keyboard?.on('keydown-LEFT', () => puff(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => puff(1));
    this.input.keyboard?.on('keydown-A', () => puff(-1));
    this.input.keyboard?.on('keydown-D', () => puff(1));

    let dentro = true;
    this.desenhar = () => {
      const e = this.estado;
      ceu.clear();
      for (const s of estrelas) {
        const y = (s.y + e.t * VELOCIDADE_TELA * 0.5) % JANELA_H;
        ceu.fillStyle(0xffffff, 0.6).fillRect(s.x, y, s.r, s.r);
      }
      // The lane: from the top of the view (future) down to the bottom (past).
      faixa.clear();
      const pts: { x: number; y: number }[] = [];
      for (let y = 0; y <= JANELA_H + 1; y += 8) {
        const tt = e.t + (NAVE_Y - y) / VELOCIDADE_TELA;
        pts.push({ x: centroFaixa(Math.max(0, tt), e.semente) * JANELA_W, y });
      }
      const meia = MEIA_FAIXA * JANELA_W;
      faixa.fillStyle(0x22c55e, 0.22);
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        faixa.fillPoints([{ x: a.x - meia, y: a.y }, { x: a.x + meia, y: a.y }, { x: b.x + meia, y: b.y }, { x: b.x - meia, y: b.y }], true);
      }
      faixa.lineStyle(3, 0x86efac, 0.9);
      for (const lado of [-1, 1]) {
        faixa.beginPath();
        pts.forEach((p, i) => (i ? faixa.lineTo(p.x + lado * meia, p.y) : faixa.moveTo(p.x + lado * meia, p.y)));
        faixa.strokePath();
      }
      nave.setX(e.x * JANELA_W).setAngle(Phaser.Math.Clamp(e.v * 60, -20, 20));
      medidor.clear().fillStyle(0xffffff, 1).fillRoundedRect(-170, 125, 340, 22, 11).lineStyle(4, 0x1e293b, 1).strokeRoundedRect(-170, 125, 340, 22, 11);
      if (e.progresso > 0.01) medidor.fillStyle(naFaixa(e) ? 0x22c55e : 0xfacc15, 1).fillRoundedRect(-167, 128, Math.max(16, 334 * e.progresso), 16, 8);
      const ok = naFaixa(e);
      if (ok !== dentro && !this.acabou) {
        dentro = ok;
        if (ok) msg('Back on course! Small puffs keep you there.', '#86efac');
        else msg('Off course! Puff the other way to stop drifting.', '#fde68a');
      }
    };
    this.desenhar();

    this.vencer = () => {
      this.acabou = true;
      msg('Course locked!', '#86efac');
      vitoria(this, janela, JANELA_W, JANELA_H, 'Course locked!', 'In space nothing slows you down: a push keeps you moving until another push stops you.', this.aoConcluir);
    };
    this.events.once('shutdown', () => {
      this.desenhar = undefined;
      for (const k of ['keydown-LEFT', 'keydown-RIGHT', 'keydown-A', 'keydown-D']) this.input.keyboard?.off(k);
    });
  }

  update(_t: number, dms: number) {
    if (this.acabou || !this.desenhar) return;
    this.estado = passo(this.estado, Math.min(dms, 100) / 1000);
    this.desenhar();
    if (tarefaConcluida(this.estado)) this.vencer();
  }
}
