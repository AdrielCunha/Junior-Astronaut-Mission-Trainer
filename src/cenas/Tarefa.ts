// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Overlay that plays one task from the bank (../tarefas). Superficie launches it on the first
// battery a room gets each day; the battery goes in when the task ends or is closed.
// The frame is shared by every task: metal panel, title pill, red close button, a starry screen
// the task draws in, and the instruction pill at the bottom.
import Phaser from 'phaser';
import { escalaInterface } from '../mobile';
import type { Tarefa } from '../tarefas';
import { CORES_FESTA, botaoFechar, criarIconeJogo, letra, moldura, pilulaEscura } from '../tarefas/estilo';
import { tocarSfx } from '../sfx';
import { sessao } from './sessao';
import { TEMPO_SUCESSO } from './conclusaoTarefa';
import { registrarDescoberta } from '../descobertas';

// aoTerminar(concluiu): true when the task was finished, false when it was closed (the X / Esc) before the end.
export type DadosTarefa = { tarefa: Tarefa; aoTerminar: (concluiu: boolean) => void };

export class CenaTarefa extends Phaser.Scene {
  private avisoSolar?: Phaser.GameObjects.Container;
  private textoSolar?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Tarefa' });
  }

  create(d: DadosTarefa) {
    const W = this.scale.width, H = this.scale.height;
    const u = escalaInterface(W, H);

    // Blocks clicks to the map and the HUD underneath.
    this.add.rectangle(0, 0, W, H, 0x020617, 0.55).setOrigin(0).setInteractive();

    // The storm deadline keeps running under the task, so show it here too.
    this.avisoSolar = undefined;
    this.textoSolar = undefined;
    if (sessao.tempestade.status === 'alerta') {
      const pw = Math.min(W - 40 * u, 270 * u), ph = 40 * u, cy = 18 * u + ph / 2;
      const fundo = this.add.graphics()
        .fillStyle(0x0b1a4a, 0.96).fillRoundedRect(W / 2 - pw / 2, 18 * u, pw, ph, ph / 2)
        .lineStyle(3 * u, 0xffd93b, 1).strokeRoundedRect(W / 2 - pw / 2, 18 * u, pw, ph, ph / 2);
      const icone = criarIconeJogo(this, W / 2 - pw / 2 + 22 * u, cy, 'radiation', 26 * u);
      this.textoSolar = this.add.text(W / 2 + 12 * u, cy, '', letra(15 * u, '#ffd93b', {
        fontStyle: 'bold', stroke: '#0b1a4a', strokeThickness: 3 * u,
      })).setOrigin(0.5);
      this.avisoSolar = this.add.container(0, 0, [fundo, icone, this.textoSolar]).setDepth(8);
    }

    const largura = Math.min(W - 40 * u, 660 * u), altura = Math.min(H - 40 * u, 480 * u);
    const x0 = (W - largura) / 2, y0 = (H - altura) / 2 + 8 * u;

    const { tela, rodape, borda } = moldura(this, { x: x0, y: y0, w: largura, h: altura }, u, d.tarefa.titulo, d.tarefa.fundo);
    d.tarefa.montar(this, { x: tela.x + 12 * u, y: tela.y + 12 * u, w: tela.w - 24 * u, h: tela.h - 24 * u, u }, () => feito());
    borda();

    // Instruction pill at the bottom. When the task is done it shows the fact instead.
    const pill = this.add.graphics();
    const py = rodape.y, pAlt = rodape.h;
    const pw0 = largura - 120 * u;
    pilulaEscura(pill, W / 2 - pw0 / 2, py, pw0, pAlt, u);
    const tInstr = this.add.text(W / 2, py + pAlt / 2, d.tarefa.instrucao, letra(17 * u, '#ffffff', { align: 'center', wordWrap: { width: pw0 - 32 * u } })).setOrigin(0.5);

    let fechado = false;
    const fechar = () => {
      if (fechado) return;
      fechado = true;
      this.scene.stop();
      d.aoTerminar(terminou);
    };

    // Red close button on the top-left corner: closing before the end does NOT deliver the battery.
    botaoFechar(this, x0 + 4 * u, y0 + 4 * u, u, () => { tocarSfx('fechar'); fechar(); });
    this.input.keyboard?.once('keydown-ESC', fechar);

    let terminou = false;
    const feito = () => {
      if (terminou || fechado) return;
      terminou = true;
      registrarDescoberta(d.tarefa.titulo,d.tarefa.fato);
      const cx = tela.x + tela.w / 2, cy = tela.y + tela.h / 2;

      tocarSfx('sucesso');
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
      this.tweens.add({ targets: selo, scale: 1, duration: 200, ease: 'Back.easeOut' });
      this.tweens.add({ targets: selo, angle: 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 450 });

      // The fact replaces the instruction; no button: the overlay closes by itself (Enter or the red X close it sooner).
      tInstr.setStyle(letra(13.5 * u, '#e2e8f0', { align: 'center', fontStyle: '500', wordWrap: { width: pw0 - 32 * u } }))
        .setText(`Did you know? ${d.tarefa.fato}`);
      this.time.delayedCall(TEMPO_SUCESSO, fechar);
      this.input.keyboard?.once('keydown-ENTER', fechar);
    };

    // shortcut: a resize starts the task over; fine for a task of a few seconds.
    const redimensionar = () => terminou ? fechar() : this.scene.restart(d);
    this.scale.on('resize', redimensionar);
    this.events.once('shutdown', () => {
      fechado = true;
      this.input.keyboard?.off('keydown-ESC', fechar);
      this.input.keyboard?.off('keydown-ENTER', fechar);
      this.scale.off('resize', redimensionar); this.input.setDefaultCursor('default');
    });
  }

  update() {
    if (!this.avisoSolar || !this.textoSolar) return;
    const t = sessao.tempestade;
    const ativo = t.status === 'alerta' || t.status === 'atingida';
    this.avisoSolar.setVisible(ativo);
    if (ativo) this.textoSolar.setText(`SOLAR STORM!  ${Math.ceil(t.restante / 1000)}s`);
  }
}
