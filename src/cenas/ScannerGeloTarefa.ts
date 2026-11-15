// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Scan for ice": scan the spots of a dark crater floor, follow the numbers up and mark the ice.
// The rules live in ../scanner-gelo-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { criarScanner, escanear, marcar, melhorLeitura, COLUNAS, LINHAS, type EstadoScanner } from '../scanner-gelo-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, texto, vitoria } from './moldura';
import { PAINEL } from './PaineisSolaresTarefa';

const { JANELA_W, JANELA_H, QUADRO_W, QUADRO_H, FOLGA } = PAINEL;
const GRADE = { x: 40, y: 30, w: 360, h: 240 };                 // the crater floor
const CW = GRADE.w / COLUNAS, CH = GRADE.h / LINHAS;
const centro = (i: number) => ({ x: GRADE.x + (i % COLUNAS + 0.5) * CW, y: GRADE.y + (Math.floor(i / COLUNAS) + 0.5) * CH });
const cor = (v: number) => (v >= 90 ? 0x38bdf8 : v >= 70 ? 0x22c55e : v >= 40 ? 0xfacc15 : v >= 20 ? 0xfb923c : 0x64748b);

export class ScannerGeloTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('ScannerGeloTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  create() {
    let estado: EstadoScanner = criarScanner(Math.floor(Math.random() * 100000));
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Scan for ice');
    const msg = barraStatus(this, raiz, QUADRO_H, 'Tap a spot to scan it. Follow the bigger numbers!');
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    const JX = -JANELA_W / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    raiz.add(janela);
    const fundo = this.add.graphics()
      .fillStyle(0x0b1020, 1).fillRoundedRect(0, 0, JANELA_W, JANELA_H, 18)
      .fillStyle(0x1e293b, 1).fillRoundedRect(GRADE.x - 8, GRADE.y - 8, GRADE.w + 16, GRADE.h + 16, 18)
      .lineStyle(4, 0x475569, 1).strokeRoundedRect(GRADE.x - 8, GRADE.y - 8, GRADE.w + 16, GRADE.h + 16, 18);
    janela.add(fundo);
    // Dark ground with a few stones.
    const chao = this.add.graphics();
    for (let i = 0; i < COLUNAS * LINHAS; i++) {
      const c = centro(i);
      chao.fillStyle(0x334155, 1).fillRoundedRect(c.x - CW / 2 + 3, c.y - CH / 2 + 3, CW - 6, CH - 6, 10)
        .fillStyle(0x475569, 1).fillRoundedRect(c.x - CW / 2 + 3, c.y - CH / 2 + 3, CW - 6, (CH - 6) * 0.4, 10);
    }
    janela.add(chao);

    // Side panel: the scanner, with the best reading so far as a vertical meter.
    const lateral = this.add.graphics();
    janela.add(lateral);
    janela.add(texto(this, 500, 44, 'BEST READING', 13, '#cbd5e1'));
    const melhorTxt = texto(this, 500, 78, '–', 34, '#ffffff');
    const escTxt = texto(this, 500, 255, 'Scans: 0', 14, '#cbd5e1');
    janela.add([melhorTxt, escTxt]);
    const desenharLateral = () => {
      const m = melhorLeitura(estado);
      melhorTxt.setText(m ? `${m}%` : '–').setColor(m ? `#${cor(m).toString(16).padStart(6, '0')}` : '#ffffff');
      lateral.clear().fillStyle(0xffffff, 1).fillRoundedRect(478, 106, 44, 130, 16).lineStyle(4, 0x1e293b, 1).strokeRoundedRect(478, 106, 44, 130, 16);
      if (m > 0) lateral.fillStyle(cor(m), 1).fillRoundedRect(482, 232 - Math.max(12, 122 * (m / 100)), 36, Math.max(12, 122 * (m / 100)), 12);
      escTxt.setText(`Scans: ${estado.escaneios}`);
    };
    desenharLateral();

    // Each spot: a reading when scanned, tap again (or the MARK button) to mark.
    const rotulos = Array.from({ length: COLUNAS * LINHAS }, (_v, i) => {
      const c = centro(i);
      const g = this.add.graphics();
      const t = texto(this, c.x, c.y, '?', 22, '#94a3b8').setAlpha(0.6);
      const zona = this.add.zone(c.x, c.y, CW, CH).setInteractive({ useHandCursor: true });
      janela.add([g, t, zona]);
      return { g, t, zona };
    });
    let selecionado = -1;
    const redesenhar = () => {
      rotulos.forEach((r, i) => {
        const c = centro(i), v = estado.leituras[i];
        r.g.clear();
        if (v !== null) {
          r.g.fillStyle(cor(v), 0.9).fillRoundedRect(c.x - CW / 2 + 5, c.y - CH / 2 + 5, CW - 10, CH - 10, 10).lineStyle(3, 0x1e293b, 1).strokeRoundedRect(c.x - CW / 2 + 5, c.y - CH / 2 + 5, CW - 10, CH - 10, 10);
          r.t.setText(`${v}%`).setColor('#ffffff').setAlpha(1).setFontSize(20);
        }
        if (i === selecionado) r.g.lineStyle(4, 0xffffff, 1).strokeRoundedRect(c.x - CW / 2 + 1, c.y - CH / 2 + 1, CW - 2, CH - 2, 12);
      });
    };
    redesenhar();

    // The MARK button: the selected (already scanned) spot is the ice.
    const marcarBtn = this.add.container(500, 285, [
      this.add.graphics().fillStyle(0x16a34a, 1).fillRoundedRect(-52, -17, 104, 34, 17).lineStyle(4, 0xffffff, 1).strokeRoundedRect(-52, -17, 104, 34, 17),
      texto(this, 0, 0, 'MARK ICE', 15, '#ffffff', 0x14532d),
    ]).setSize(104, 34).setInteractive({ useHandCursor: true }).setAlpha(0.45);
    janela.add(marcarBtn);

    let acabou = false;
    rotulos.forEach((r, i) => r.zona.on('pointerdown', () => {
      if (acabou) return;
      if (estado.leituras[i] === null) {
        estado = escanear(estado, i);
        tocarSfx('bip');
        selecionado = i;
        const v = estado.leituras[i] as number;
        msg(v >= 100 ? 'The needle is at the top! This must be it. Tap MARK ICE.' : v >= 70 ? `${v}%! Very close. Scan the spots around it.` : `${v}%. Try another spot.`, v >= 70 ? '#86efac' : '#ffffff');
      } else { selecionado = i; tocarSfx('clique'); }
      marcarBtn.setAlpha(1);
      desenharLateral(); redesenhar();
    }));
    marcarBtn.on('pointerdown', () => {
      if (acabou || selecionado < 0) { msg('Tap a spot first.', '#fde68a'); return; }
      const r = marcar(estado, selecionado);
      estado = r.e;
      if (r.certo) {
        acabou = true;
        this.tweens.add({ targets: rotulos[selecionado].t, scale: 1.4, yoyo: true, duration: 250, repeat: 2 });
        msg('Ice found!', '#86efac');
        redesenhar();
        vitoria(this, janela, JANELA_W, JANELA_H, 'Ice found!', 'In 2009 NASA found water ice in a dark crater near the Moon\'s south pole.', this.aoConcluir);
        return;
      }
      tocarSfx('soltar');
      msg(r.dica, '#fde68a');
    });
  }
}
