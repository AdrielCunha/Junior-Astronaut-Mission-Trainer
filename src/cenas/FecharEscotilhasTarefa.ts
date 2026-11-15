// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Safety - Hatches": drag each coloured lid onto the open hatch of the same colour before the solar storm.
// The rules live in ../fechar-escotilhas-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { criarTarefaEscotilhas, soltarTampa, protecao, tarefaConcluida, escotilhasAbertas, type TarefaEscotilhas } from '../fechar-escotilhas-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto } from './moldura';

const QUADRO_W = 760;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const FOLGA = (QUADRO_H - 500) / 2;   // the frame is taller than the layout was drawn for: centre the content
const INSTRUCAO = 'Drag each lid to its color.';
const NOMES = ['red', 'blue', 'yellow', 'green'];

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export class FecharEscotilhasTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('FecharEscotilhasTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  private criarTexturas(t: TarefaEscotilhas) {
    // The wall of the base: flat slate plate with a darker top band, panel seams and a darker strip for the lids.
    canvas(this, 'escotilhas_parede_v2', t.largura, t.altura, (c) => {
      c.save(); c.beginPath(); c.roundRect(0, 0, t.largura, t.altura, 18); c.clip();
      c.fillStyle = '#64748b'; c.fillRect(0, 0, t.largura, t.altura);
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 0, t.largura, t.altura * 0.2);
      c.fillStyle = '#475569'; c.fillRect(0, 175, t.largura, t.altura - 175);
      c.fillStyle = '#334155';
      for (let x = 40; x < t.largura; x += 80) c.fillRect(x, 0, 4, 175);
      c.fillStyle = '#1e293b'; c.fillRect(0, 173, t.largura, 4);
      c.restore();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.beginPath(); c.roundRect(2.5, 2.5, t.largura - 5, t.altura - 5, 16); c.stroke();
    });
    for (const e of t.escotilhas) {
      const R = t.raioEscotilha, S = R * 2 + 16, m = S / 2;
      // Open hatch: a dark hole with a flat coloured rim.
      canvas(this, `escotilhas_buraco_${e.id}_v2`, S, S, (c) => {
        c.fillStyle = hex(e.cor); c.beginPath(); c.arc(m, m, R - 2, 0, Math.PI * 2); c.fill();
        c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.stroke();
        c.fillStyle = '#0f172a'; c.beginPath(); c.arc(m, m, R - 12, 0, Math.PI * 2); c.fill();
        c.lineWidth = 4; c.stroke();
      });
      // The lid: a round door in the same colour, with a wheel handle.
      const L = 46, SL = L * 2 + 16, ml = SL / 2;
      canvas(this, `escotilhas_tampa_${e.id}_v2`, SL, SL, (c) => {
        c.lineCap = 'round';
        c.fillStyle = hex(e.cor); c.beginPath(); c.arc(ml, ml, L, 0, Math.PI * 2); c.fill();
        c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.stroke();
        for (let i = 0; i < 4; i++) {            // wheel spokes
          const a = i * Math.PI / 2 + Math.PI / 4;
          c.lineWidth = 11; c.strokeStyle = '#1e293b'; c.beginPath(); c.moveTo(ml, ml); c.lineTo(ml + Math.cos(a) * 26, ml + Math.sin(a) * 26); c.stroke();
          c.lineWidth = 5; c.strokeStyle = '#e2e8f0'; c.beginPath(); c.moveTo(ml, ml); c.lineTo(ml + Math.cos(a) * 26, ml + Math.sin(a) * 26); c.stroke();
        }
        c.fillStyle = '#e2e8f0'; c.beginPath(); c.arc(ml, ml, 9, 0, Math.PI * 2); c.fill(); c.lineWidth = 3.5; c.strokeStyle = '#1e293b'; c.stroke();
      });
    }
    // A flat green ring for the closed hatches.
    canvas(this, 'escotilhas_brilho_v2', 160, 160, (c) => {
      c.beginPath(); c.arc(80, 80, 52, 0, Math.PI * 2);
      c.lineWidth = 14; c.strokeStyle = '#1e293b'; c.stroke();
      c.lineWidth = 7; c.strokeStyle = '#22c55e'; c.stroke();
    });
  }

  create() {
    let estado: TarefaEscotilhas = criarTarefaEscotilhas();
    this.criarTexturas(estado);
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Safety - Hatches');
    const msg = barraStatus(this, raiz, QUADRO_H, INSTRUCAO);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    // ---- The wall window.
    const JX = -estado.largura / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    const rim = this.add.graphics();
    rim.lineStyle(5, 0x1e293b, 1).strokeRoundedRect(JX, JY, estado.largura, estado.altura, 18);
    raiz.add(janela);
    raiz.add(rim);
    janela.add(this.add.image(0, 0, 'escotilhas_parede_v2').setOrigin(0));

    // Red alarm light over the wall while hatches are open.
    const alarme = this.add.rectangle(0, 0, estado.largura, estado.altura, 0xef4444, 0.14).setOrigin(0);
    janela.add(alarme);
    const pisca = this.tweens.add({ targets: alarme, alpha: 0.04, duration: 700, yoyo: true, repeat: -1 });

    const brilhos = new Map<number, Phaser.GameObjects.Image>();
    for (const e of estado.escotilhas) {
      const br = this.add.image(e.x, e.y, 'escotilhas_brilho_v2').setAlpha(0).setScale(1.2);
      brilhos.set(e.id, br);
      janela.add([this.add.image(e.x, e.y, `escotilhas_buraco_${e.id}_v2`), br]);
    }
    const marcas = estado.escotilhas.map((e) => texto(this, e.x, e.y, '!', 34, '#fecaca', 0x1e293b).setAlpha(0.8));
    janela.add(marcas);
    const piscaMarcas = this.tweens.add({ targets: marcas, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    // ---- The lids, in the tray.
    const tampas = estado.tampas.map((tp) => {
      const sombra = this.add.ellipse(tp.xCasa, tp.yCasa, 1, 1, 0x000000, 0).setVisible(false);   // flat look: no drop shadow
      const im = this.add.image(tp.xCasa, tp.yCasa, `escotilhas_tampa_${tp.id}_v2`).setInteractive({ useHandCursor: true, draggable: true });
      janela.add([sombra, im]);
      return { tp, im, sombra, fechada: false };
    });
    const dePorId = (id: number) => tampas.find((x) => x.tp.id === id)!;

    // ---- Protection bar.
    const medidor = this.add.graphics();
    raiz.add(medidor);
    raiz.add(texto(this, -232, 133, 'Protection', 18, '#ffffff', 0x1e293b));
    const pct = texto(this, 222, 133, '0%', 18, '#ffffff', 0x1e293b);
    raiz.add(pct);
    const desenharMedidor = () => {
      const q = protecao(estado);
      const cor = q < 0.5
        ? Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(239, 68, 68), new Phaser.Display.Color(250, 204, 21), 100, q * 200)
        : Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(250, 204, 21), new Phaser.Display.Color(34, 197, 94), 100, (q - 0.5) * 200);
      medidor.clear();
      medidor.fillStyle(0xffffff, 1).fillRoundedRect(-160, 120, 340, 26, 13).lineStyle(4, 0x1e293b, 1).strokeRoundedRect(-160, 120, 340, 26, 13);
      if (q > 0.01) {
        const w = Math.max(20, 334 * q);
        medidor.fillStyle(Phaser.Display.Color.GetColor(cor.r, cor.g, cor.b), 1).fillRoundedRect(-157, 123, w, 20, 10);
      }
      pct.setText(`${Math.round(q * 100)}%`);
    };
    desenharMedidor();

    // ---- Dragging.
    let acabou = false;
    const aoLocal = (p: Phaser.Input.Pointer) => ({
      x: Phaser.Math.Clamp((p.x - raiz.x) / s - JX, 0, estado.largura),
      y: Phaser.Math.Clamp((p.y - raiz.y) / s - JY, 0, estado.altura),
    });
    const voltar = (id: number) => {
      const t = dePorId(id);
      this.tweens.add({ targets: t.im, x: t.tp.xCasa, y: t.tp.yCasa, scale: 1, duration: 260, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t.sombra, x: t.tp.xCasa + 4, y: t.tp.yCasa + 8, duration: 260 });
    };
    const vencer = () => {
      acabou = true;
      pisca.stop(); piscaMarcas.stop(); alarme.setVisible(false);
      msg('Base sealed! All the hatches are closed.', '#86efac');
      const brilho = this.add.rectangle(0, 0, estado.largura, estado.altura, 0xffffff, 0.5).setOrigin(0);
      janela.add(brilho);
      this.tweens.add({ targets: brilho, alpha: 0, duration: 900 });
      rajada(this, janela, estado.largura / 2, estado.altura / 2, [0xfde047, 0x86efac, 0x7dd3fc, 0xf9a8d4], 26, 190);
      const faixa = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-270, -58, 540, 116, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-270, -58, 540, 116, 40);
      const bloco = this.add.container(estado.largura / 2, estado.altura / 2, [
        faixa,
        texto(this, 0, -16, 'Base protected!', 38, '#ffffff', 0x14532d),
        texto(this, 0, 28, "The Moon has no air to protect from the Sun's radiation.", 15, '#dcfce7', 0x14532d),
      ]).setScale(0).setDepth(40);
      janela.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 450, delay: 250, ease: 'Back.easeOut' });
      this.time.delayedCall(2800, () => { this.scene.stop(); this.aoConcluir?.(); });
    };

    this.input.on('dragstart', (_p: Phaser.Input.Pointer, o: Phaser.GameObjects.Image) => {
      if (acabou) return;
      tocarSfx('pegar');
      this.tweens.killTweensOf(o);
      o.setScale(1.1); janela.bringToTop(o);
    });
    this.input.on('drag', (p: Phaser.Input.Pointer, o: Phaser.GameObjects.Image) => {
      if (acabou) return;
      const l = aoLocal(p);
      o.setPosition(l.x, l.y);
      const t = tampas.find((x) => x.im === o);
      if (t) t.sombra.setPosition(l.x + 7, l.y + 12);
    });
    this.input.on('dragend', (_p: Phaser.Input.Pointer, o: Phaser.GameObjects.Image) => {
      if (acabou) return;
      const t = tampas.find((x) => x.im === o);
      if (!t || t.fechada) return;
      const r = soltarTampa(estado, t.tp.id, { x: o.x, y: o.y });
      if (r.resultado === 'fechou') {
        estado = r.tarefa;
        const e = estado.escotilhas.find((x) => x.id === t.tp.id)!;
        tocarSfx('encaixe');
        t.fechada = true; t.im.disableInteractive();
        this.tweens.add({ targets: t.im, x: e.x, y: e.y, scale: 1, duration: 160, ease: 'Sine.easeOut' });
        this.tweens.add({ targets: t.sombra, x: e.x + 5, y: e.y + 9, duration: 160 });
        marcas[e.id].setVisible(false);
        this.tweens.add({ targets: brilhos.get(e.id)!, alpha: 0.9, duration: 250 });
        rajada(this, janela, e.x, e.y, [0xfde047, 0x86efac, 0x7dd3fc], 10, 70);
        desenharMedidor();
        if (tarefaConcluida(estado)) vencer();
        else msg(`The ${NOMES[e.id]} hatch is closed! ${escotilhasAbertas(estado)} to go.`, '#86efac');
      } else {
        if (r.resultado === 'errou') {
          tocarSfx('erro');
          msg('That hatch is a different color. Try again!', '#fde68a');
          this.tweens.add({ targets: o, angle: { from: -10, to: 10 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => o.setAngle(0) });
        }
        else tocarSfx('soltar');
        voltar(t.tp.id);
      }
    });
  }
}
