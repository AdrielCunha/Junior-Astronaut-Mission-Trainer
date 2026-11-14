// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Overlay that plays one task from the bank (../tarefas). Superficie launches it on the first
// battery a room gets each day; the battery goes in when the task ends or is closed.
// The frame is shared by every task: metal panel, title pill, red close button, a starry screen
// the task draws in, and the instruction pill at the bottom.
import Phaser from 'phaser';
import type { Tarefa } from '../tarefas';
import { CONTORNO, CORES_FESTA, letra } from '../tarefas/estilo';

export type DadosTarefa = { tarefa: Tarefa; aoTerminar: () => void };

export class CenaTarefa extends Phaser.Scene {
  constructor() {
    super({ key: 'Tarefa' });
  }

  create(d: DadosTarefa) {
    const W = this.scale.width, H = this.scale.height;
    const u = Phaser.Math.Clamp(Math.min(W / 1100, H / 650), 0.62, 1.4);

    // Blocks clicks to the map and the HUD underneath.
    this.add.rectangle(0, 0, W, H, 0x020617, 0.55).setOrigin(0).setInteractive();

    const largura = Math.min(W - 40 * u, 660 * u), altura = Math.min(H - 40 * u, 480 * u);
    const x0 = (W - largura) / 2, y0 = (H - altura) / 2 + 8 * u;

    // Metal panel.
    const moldura = this.add.graphics();
    moldura.fillStyle(0x000000, 0.35).fillRoundedRect(x0 + 6 * u, y0 + 8 * u, largura, altura, 26 * u);
    moldura.fillStyle(0xd5dde6).fillRoundedRect(x0, y0, largura, altura, 26 * u);
    moldura.lineStyle(5 * u, 0x64748b).strokeRoundedRect(x0, y0, largura, altura, 26 * u);
    moldura.lineStyle(2 * u, 0xffffff, 0.7).strokeRoundedRect(x0 + 7 * u, y0 + 7 * u, largura - 14 * u, altura - 14 * u, 20 * u);
    for (const [bx, by] of [[x0 + 18 * u, y0 + 18 * u], [x0 + largura - 18 * u, y0 + 18 * u], [x0 + 18 * u, y0 + altura - 18 * u], [x0 + largura - 18 * u, y0 + altura - 18 * u]]) {
      moldura.fillStyle(0x94a3b8).fillCircle(bx, by, 5 * u).lineStyle(1.5 * u, 0x64748b).strokeCircle(bx, by, 5 * u);
    }

    // Screen the task draws in.
    const tela = { x: x0 + 26 * u, y: y0 + 38 * u, w: largura - 52 * u, h: altura - 38 * u - 92 * u };
    const fundo = d.tarefa.fundo ?? 0x2563eb;
    const g = this.add.graphics();
    g.fillStyle(fundo).fillRoundedRect(tela.x, tela.y, tela.w, tela.h, 18 * u);
    g.fillStyle(0x000000, 0.12).fillRoundedRect(tela.x, tela.y, tela.w, tela.h * 0.42, { tl: 18 * u, tr: 18 * u, bl: 0, br: 0 });
    for (let i = 0; i < 45; i++) {
      const e = this.add.circle(tela.x + 10 * u + Math.random() * (tela.w - 20 * u), tela.y + 10 * u + Math.random() * (tela.h - 20 * u),
        (0.8 + Math.random() * 1.4) * u, 0xffffff, 0.4 + Math.random() * 0.5);
      if (i % 3 === 0) this.tweens.add({ targets: e, alpha: 0.1, duration: 600 + Math.random() * 900, yoyo: true, repeat: -1, delay: Math.random() * 800 });
    }
    d.tarefa.montar(this, { x: tela.x + 12 * u, y: tela.y + 12 * u, w: tela.w - 24 * u, h: tela.h - 24 * u, u }, () => feito());
    // The screen border goes on top of the task, so nothing pokes out of it.
    this.add.graphics().lineStyle(5 * u, CONTORNO).strokeRoundedRect(tela.x, tela.y, tela.w, tela.h, 18 * u);

    // Title pill on the top edge.
    const tTitulo = this.add.text(W / 2, y0, d.tarefa.titulo, letra(21 * u)).setOrigin(0.5).setDepth(2);
    const pw = tTitulo.width + 56 * u, ph = 44 * u;
    this.add.graphics().setDepth(1)
      .fillStyle(0x2563eb).fillRoundedRect(W / 2 - pw / 2, y0 - ph / 2, pw, ph, ph / 2)
      .lineStyle(4 * u, 0xffffff).strokeRoundedRect(W / 2 - pw / 2, y0 - ph / 2, pw, ph, ph / 2)
      .lineStyle(2 * u, CONTORNO).strokeRoundedRect(W / 2 - pw / 2 - 3 * u, y0 - ph / 2 - 3 * u, pw + 6 * u, ph + 6 * u, ph / 2 + 3 * u);

    // Instruction pill at the bottom. When the task is done it shows the fact instead.
    const pill = this.add.graphics();
    const py = tela.y + tela.h + 14 * u, pAlt = y0 + altura - 18 * u - py;
    const desenharPilula = (x: number, w: number) => {
      pill.clear().fillStyle(CONTORNO, 0.95).fillRoundedRect(x, py, w, pAlt, Math.min(pAlt / 2, 24 * u));
    };
    const pw0 = largura - 120 * u;
    desenharPilula(W / 2 - pw0 / 2, pw0);
    const tInstr = this.add.text(W / 2, py + pAlt / 2, d.tarefa.instrucao, letra(17 * u, '#ffffff', { align: 'center', wordWrap: { width: pw0 - 32 * u } })).setOrigin(0.5);

    let fechado = false;
    const fechar = () => {
      if (fechado) return;
      fechado = true;
      this.scene.stop();
      d.aoTerminar();
    };

    // Red close button on the top-left corner (closing still delivers the battery).
    const fecharBt = this.add.container(x0 + 4 * u, y0 + 4 * u).setDepth(3);
    const cg = this.add.graphics()
      .fillStyle(0xef4444).fillCircle(0, 0, 23 * u).lineStyle(4 * u, 0xffffff).strokeCircle(0, 0, 23 * u)
      .lineStyle(2 * u, CONTORNO).strokeCircle(0, 0, 26 * u)
      .lineStyle(5 * u, 0xffffff).lineBetween(-8 * u, -8 * u, 8 * u, 8 * u).lineBetween(8 * u, -8 * u, -8 * u, 8 * u);
    fecharBt.add(cg).setSize(52 * u, 52 * u).setInteractive({ useHandCursor: true })
      .on('pointerover', () => fecharBt.setScale(1.1)).on('pointerout', () => fecharBt.setScale(1))
      .on('pointerdown', fechar);
    this.input.keyboard?.once('keydown-ESC', fechar);

    let terminou = false;
    const feito = () => {
      if (terminou || fechado) return;
      terminou = true;
      const cx = tela.x + tela.w / 2, cy = tela.y + tela.h / 2;

      // Confetti.
      for (let i = 0; i < 36; i++) {
        const c = this.add.rectangle(cx, cy, (5 + Math.random() * 5) * u, (8 + Math.random() * 6) * u, CORES_FESTA[i % CORES_FESTA.length]).setDepth(4);
        const a = Math.random() * Math.PI * 2, dist = (90 + Math.random() * 170) * u;
        this.tweens.add({ targets: c, x: cx + Math.cos(a) * dist, y: cy + Math.sin(a) * dist + 60 * u, angle: Math.random() * 720 - 360,
          alpha: 0, duration: 1100 + Math.random() * 500, ease: 'Quad.easeOut', onComplete: () => c.destroy() });
      }
      // Sticker.
      const selo = this.add.text(cx, tela.y + tela.h * 0.2, 'GREAT JOB!', letra(40 * u, '#fde047', { stroke: '#1e293b', strokeThickness: 8 * u }))
        .setOrigin(0.5).setAngle(-6).setScale(0).setDepth(5);
      this.tweens.add({ targets: selo, scale: 1, duration: 450, ease: 'Back.easeOut' });
      this.tweens.add({ targets: selo, angle: 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 450 });

      // The fact replaces the instruction; a green button closes.
      const bt = this.add.text(0, 0, 'OK!  ▶', letra(20 * u, '#ffffff')).setOrigin(0.5);
      const bw = bt.width + 44 * u, bh = Math.min(pAlt, 50 * u);
      const bx = x0 + largura - 60 * u - bw / 2, by = py + pAlt / 2;
      const bg = this.add.graphics()
        .fillStyle(0x22c55e).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2)
        .lineStyle(4 * u, 0xffffff).strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
      const ok = this.add.container(bx, by, [bg, bt]).setSize(bw, bh).setInteractive({ useHandCursor: true }).on('pointerdown', fechar);
      this.tweens.add({ targets: ok, scale: 1.08, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const pw1 = bx - bw / 2 - 12 * u - (x0 + 60 * u);
      desenharPilula(x0 + 60 * u, pw1);
      tInstr.setPosition(x0 + 60 * u + pw1 / 2, py + pAlt / 2)
        .setStyle(letra(13.5 * u, '#e2e8f0', { align: 'center', fontStyle: '500', wordWrap: { width: pw1 - 28 * u } }))
        .setText(`Did you know? ${d.tarefa.fato}`);
      this.input.keyboard?.once('keydown-ENTER', fechar);
    };

    // shortcut: a resize starts the task over; fine for a task of a few seconds.
    const redimensionar = () => this.scene.restart(d);
    this.scale.on('resize', redimensionar);
    this.events.once('shutdown', () => { this.scale.off('resize', redimensionar); this.input.setDefaultCursor('default'); });
  }
}
