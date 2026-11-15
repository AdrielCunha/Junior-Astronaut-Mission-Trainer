// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Lock the Shield": the day-2 solar flare alarm (engine/eventos.ts). Type the door code on a keypad; the code is
// painted on the Moon's ground in a corner of the map (Superficie). Mouse/touch on the keys, or the number keys,
// Backspace and Enter. The rules live in ../engine/senha.ts (pure, tested); this scene only draws and reads input.
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { senhaDoEscudo, digitar, confereSenha, DIGITOS_SENHA } from '../engine/senha';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, texto, vitoria } from './moldura';

const QUADRO_W = 760;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);
const INSTRUCAO = 'Type the door code: 4 numbers painted in a corner of the map!';

export class SenhaEscudoTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('SenhaEscudoTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  create() {
    const senha = senhaDoEscudo(2, 'lua');   // the code painted on the Moon all game (Superficie)
    const { raiz } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Lock the Shield');
    const msg = barraStatus(this, raiz, QUADRO_H, INSTRUCAO);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    // The blue screen of the door panel.
    const LW = 680, LH = 380, LX = -LW / 2, LY = -QUADRO_H / 2 + 34;
    const tela = this.add.container(LX, LY);
    raiz.add(tela);
    tela.add(this.add.graphics().fillStyle(0x2563eb).fillRoundedRect(0, 0, LW, LH, 18).lineStyle(5, 0x1e293b).strokeRoundedRect(0, 0, LW, LH, 18));

    // Left: the display (one box per digit) and a radiation sign.
    tela.add(texto(this, 170, 48, '☢ SHIELD DOOR', 24, '#fde047'));
    const caixas: Phaser.GameObjects.Text[] = [];
    const bw = 62, gap = 12, x0 = 170 - (DIGITOS_SENHA * bw + (DIGITOS_SENHA - 1) * gap) / 2;
    const visor = this.add.graphics();
    tela.add(visor);
    for (let i = 0; i < DIGITOS_SENHA; i++) {
      const x = x0 + i * (bw + gap);
      visor.fillStyle(0x0f172a).fillRoundedRect(x, 100, bw, 80, 12).lineStyle(4, 0x1e293b).strokeRoundedRect(x, 100, bw, 80, 12);
      const t = texto(this, x + bw / 2, 140, '', 46, '#86efac');
      caixas.push(t); tela.add(t);
    }
    tela.add(texto(this, 170, 230, 'Look for 4 numbers\nin a corner of the map!', 20, '#ffffff').setAlign('center'));
    const luz = this.add.circle(170, 310, 18, 0xef4444).setStrokeStyle(4, 0x1e293b);
    tela.add(luz);
    this.tweens.add({ targets: luz, alpha: 0.35, duration: 380, yoyo: true, repeat: -1 });

    // Right: the keypad (1-9, erase, 0, OK).
    const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'apagar', '0', 'ok'];
    const kw = 78, kh = 66, kgap = 12, kx0 = 380, ky0 = 34;
    let digitado = '', acabou = false;
    const mostrar = () => caixas.forEach((c, i) => c.setText(digitado[i] ?? ''));
    const tremer = () => this.tweens.add({ targets: tela, x: LX + 10, duration: 50, yoyo: true, repeat: 3, onComplete: () => tela.setX(LX) });
    const apertar = (tecla: string) => {
      if (acabou) return;
      if (tecla !== 'ok') {
        const novo = digitar(digitado, tecla);
        if (novo !== digitado) tocarSfx('clique');
        digitado = novo; mostrar();
        if (digitado.length < DIGITOS_SENHA) return;
      }
      if (digitado.length < DIGITOS_SENHA) { msg(`The code has ${DIGITOS_SENHA} numbers.`, '#fde68a'); return; }
      if (confereSenha(digitado, senha)) {
        acabou = true;
        luz.setFillStyle(0x22c55e); this.tweens.killTweensOf(luz); luz.setAlpha(1);
        caixas.forEach((c) => c.setColor('#fde047'));
        msg('Door locked! The crew is safe from the flare.', '#86efac');
        vitoria(this, tela, LW, LH, 'Shield locked!', "A flare's light reaches the Moon in about 8 minutes!", this.aoConcluir);
      } else {
        msg('Wrong code! Look for the numbers in the corners of the map.', '#fca5a5');
        tremer();
        digitado = ''; this.time.delayedCall(300, mostrar);
      }
    };
    teclas.forEach((tecla, i) => {
      const x = kx0 + (i % 3) * (kw + kgap), y = ky0 + Math.floor(i / 3) * (kh + kgap);
      const cor = tecla === 'ok' ? 0x22c55e : tecla === 'apagar' ? 0xf97316 : 0xe2e8f0;
      const g = this.add.graphics().fillStyle(0x0b1a4a, 0.5).fillRoundedRect(x + 3, y + 5, kw, kh, 14)
        .fillStyle(cor).fillRoundedRect(x, y, kw, kh, 14).lineStyle(4, 0x1e293b).strokeRoundedRect(x, y, kw, kh, 14);
      const rotulo = tecla === 'ok' ? 'OK' : tecla === 'apagar' ? '⌫' : tecla;
      const t = texto(this, x + kw / 2, y + kh / 2, rotulo, tecla.length > 1 ? 26 : 32, tecla.length > 1 ? '#ffffff' : '#1e293b', tecla.length > 1 ? 0x1e293b : 0xe2e8f0);
      const z = this.add.zone(x, y, kw, kh).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { g.setY(2); t.setY(y + kh / 2 + 2); apertar(tecla); });
      z.on('pointerup', () => { g.setY(0); t.setY(y + kh / 2); });
      z.on('pointerout', () => { g.setY(0); t.setY(y + kh / 2); });
      tela.add([g, t, z]);
    });

    // Keyboard: numbers, Backspace, Enter.
    const tecladoFisico = (ev: KeyboardEvent) => {
      if (/^[0-9]$/.test(ev.key)) apertar(ev.key);
      else if (ev.key === 'Backspace') apertar('apagar');
      else if (ev.key === 'Enter') apertar('ok');
    };
    this.input.keyboard?.on('keydown', tecladoFisico);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown', tecladoFisico));
  }
}
