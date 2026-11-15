// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Direct the Oxygen": click pipe pieces to turn them until the air from the tank reaches every room.
// (Same turn-the-piece rules as the old lighting task, which still live in ../iluminacao-tarefa.ts.)
// The rules live in ../iluminacao-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import {
  criarTarefaIluminacao, girarPeca, calcularEnergia, tarefaConcluida, N, E, S, W, type TarefaIluminacao, type Tipo,
} from '../iluminacao-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto } from './moldura';

const QUADRO_W = 760;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const FOLGA = (QUADRO_H - 500) / 2;   // the frame is taller than the layout was drawn for: centre the content
const INSTRUCAO = 'Turn the pipes to bring air to the rooms.';
const JW = 660, JH = 300;      // the window
const T = 92;                  // size of one piece
const BX = 100, BY = 12;       // board origin inside the window
const SIDES: Record<Tipo, number> = { reta: E | W, curva: N | E, T: E | S | W };

export class IluminacaoTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('IluminacaoTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  private criarTexturas() {
    canvas(this, 'ilum_fundo_v3', JW, JH, (c) => {
      c.fillStyle = '#2563eb'; c.beginPath(); c.roundRect(0, 0, JW, JH, 18); c.fill();
      c.save(); c.beginPath(); c.roundRect(0, 0, JW, JH, 18); c.clip();
      c.fillStyle = '#1d4ed8'; c.fillRect(0, 0, JW, JH * 0.12); c.restore();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.beginPath(); c.roundRect(2.5, 2.5, JW - 5, JH - 5, 18); c.stroke();
    });
    // The plate under each wire piece: flat.
    canvas(this, 'ilum_placa_v4', T, T, (c) => {
      c.fillStyle = '#cbd5e1'; c.beginPath(); c.roundRect(5, 5, T - 10, T - 10, 12); c.fill();
      c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#475569'; c.beginPath(); c.roundRect(15, 15, T - 30, T - 30, 8); c.fill();
    });
    const fio = (tipo: Tipo, ligado: boolean) => canvas(this, `ilum_v4_${tipo}_${ligado ? 'on' : 'off'}`, T, T, (c) => {
      const m = SIDES[tipo], cx = T / 2, cy = cx;   // exactly the image centre, so a turned piece stays aligned
      const lados: [number, number, number][] = [[N, 0, -1], [E, 1, 0], [S, 0, 1], [W, -1, 0]];
      const tracar = (larg: number, cor: string) => {
        c.strokeStyle = cor; c.lineWidth = larg; c.lineCap = 'round'; c.lineJoin = 'round';
        for (const [bit, dx, dy] of lados) if (m & bit) { c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + dx * (T / 2), cy + dy * (T / 2)); c.stroke(); }
        c.fillStyle = cor; c.beginPath(); c.arc(cx, cy, larg / 2, 0, Math.PI * 2); c.fill();
      };
      tracar(20, '#1e293b');
      tracar(11, ligado ? '#67e8f9' : '#94a3b8');
    });
    for (const tipo of ['reta', 'curva', 'T'] as Tipo[]) { fio(tipo, false); fio(tipo, true); }
    // The oxygen tank: a flat white cylinder with a blue band, a valve on the right and "O2" on the front.
    canvas(this, 'ilum_tanque_v3', 88, 90, (c) => {
      c.lineJoin = 'round';
      c.fillStyle = '#f1f5f9'; c.beginPath(); c.roundRect(6, 6, 56, 70, 18); c.fill();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#2563eb'; c.fillRect(8, 36, 52, 18); c.lineWidth = 4; c.strokeRect(8, 36, 52, 18);
      c.fillStyle = '#fbbf24'; c.beginPath(); c.roundRect(60, 30, 20, 20, 5); c.fill(); c.lineWidth = 4; c.stroke();
      c.fillStyle = '#ffffff'; c.font = '600 15px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 3; c.strokeStyle = '#1e293b'; c.strokeText('O₂', 34, 46); c.fillText('O₂', 34, 46);
    });
    // A room of the base: a flat module with a round window and a pipe stub on the left. The window turns pale blue once air arrives.
    for (const acesa of [false, true]) canvas(this, `ilum_sala_v3_${acesa ? 'on' : 'off'}`, 96, 96, (c) => {
      c.lineJoin = 'round';
      c.fillStyle = '#94a3b8'; c.beginPath(); c.roundRect(8, 38, 22, 20, 4); c.fill(); c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = acesa ? '#e2e8f0' : '#64748b'; c.beginPath(); c.roundRect(26, 14, 62, 68, 14); c.fill(); c.stroke();
      c.fillStyle = acesa ? '#67e8f9' : '#1e293b'; c.beginPath(); c.arc(57, 46, 20, 0, Math.PI * 2); c.fill(); c.lineWidth = 4; c.stroke();
      if (acesa) { c.fillStyle = '#ffffff'; for (const [x, y, r] of [[50, 52, 4], [60, 42, 5], [64, 54, 3]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); } }
    });
    // Glow: a flat pale-blue disc behind the room that got air.
    canvas(this, 'ilum_brilho_v3', 220, 220, (c) => {
      c.fillStyle = '#67e8f9'; c.beginPath(); c.arc(110, 110, 70, 0, Math.PI * 2); c.fill();
    });
  }

  create() {
    let estado: TarefaIluminacao = criarTarefaIluminacao();
    this.criarTexturas();
    const { raiz } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Direct the Oxygen');
    const msg = barraStatus(this, raiz, QUADRO_H, INSTRUCAO);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    const JX = -JW / 2, JY = -208;
    const janela = this.add.container(JX, JY);
    const rim = this.add.graphics();
    rim.lineStyle(5, 0x1e293b, 1).strokeRoundedRect(JX - 2, JY - 2, JW + 4, JH + 4, 20);
    raiz.add(rim);
    raiz.add(janela);
    janela.add(this.add.image(0, 0, 'ilum_fundo_v3').setOrigin(0));

    const centro = (c: number, l: number) => ({ x: BX + c * T + T / 2, y: BY + l * T + T / 2 });
    let acabou = false;

    // Plates, then the room's darkness, then the wires on top (so they stay bright).
    const placas = estado.pecas.map((_, i) => {
      const p = centro(i % estado.colunas, Math.floor(i / estado.colunas));
      const im = this.add.image(p.x, p.y, 'ilum_placa_v4').setInteractive({ useHandCursor: true });
      janela.add(im);
      return im;
    });
    const escuro = this.add.rectangle(0, 0, JW, JH, 0x1e293b, 0.45).setOrigin(0);
    janela.add(escuro);
    const angulos = estado.pecas.map((p) => p.rot * 90);
    const fios = estado.pecas.map((p, i) => {
      const pos = centro(i % estado.colunas, Math.floor(i / estado.colunas));
      const im = this.add.image(pos.x, pos.y, `ilum_v4_${p.tipo}_off`).setAngle(angulos[i]);
      janela.add(im);
      return im;
    });

    // The battery on the left and a lamp (with its glow) at the end of each lamp row.
    const yBat = centro(0, estado.linhaBateria).y;
    janela.add(this.add.image(BX - 36, yBat, 'ilum_tanque_v3'));
    const fioBat = this.add.graphics().lineStyle(12, 0x1e293b, 1).lineBetween(BX - 8, yBat, BX + 2, yBat);
    janela.add(fioBat);
    const lampadas = estado.linhasLampadas.map((l) => {
      const y = centro(0, l).y, x = BX + estado.colunas * T + 6;
      const brilho = this.add.image(x + 28, y, 'ilum_brilho_v3').setAlpha(0);
      const im = this.add.image(x + 8, y, 'ilum_sala_v3_off');
      janela.add([brilho, im]);
      return { im, brilho, acesa: false, x: x + 36, y };
    });

    const contador = texto(this, 0, 128, '', 20, '#ffffff', 0x1e293b);
    raiz.add(contador);
    const atualizarContador = (n: number) => contador.setText(`Rooms with air: ${n} of ${lampadas.length}`);
    atualizarContador(0);

    const atualizar = (primeira = false) => {
      const en = calcularEnergia(estado);
      fios.forEach((im, i) => im.setTexture(`ilum_v4_${estado.pecas[i].tipo}_${en.energizadas[i] ? 'on' : 'off'}`));
      let n = 0;
      lampadas.forEach((lp, k) => {
        const acesa = en.lampadas[k];
        if (acesa) n++;
        if (acesa === lp.acesa) return;
        lp.acesa = acesa;
        lp.im.setTexture(acesa ? 'ilum_sala_v3_on' : 'ilum_sala_v3_off');
        this.tweens.add({ targets: lp.brilho, alpha: acesa ? 0.45 : 0, scale: acesa ? 1 : 0.6, duration: 350 });
        if (acesa && !primeira) {
          tocarSfx('ligar');
          this.tweens.add({ targets: lp.im, scale: 1.2, duration: 140, yoyo: true });
          rajada(this, janela, lp.x, lp.y, [0x67e8f9, 0xe0f2fe, 0xffffff], 10, 70);
        }
      });
      atualizarContador(n);
      this.tweens.add({ targets: escuro, alpha: 0.45 * (1 - n / lampadas.length), duration: 400 });
      return n;
    };
    atualizar(true);

    const vencer = () => {
      acabou = true;
      msg('Air reached every room! Great job.', '#86efac');
      rajada(this, janela, JW / 2, JH / 2, [0xfde047, 0x86efac, 0x7dd3fc, 0xf9a8d4], 26, 200);
      const faixa = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-270, -58, 540, 116, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-270, -58, 540, 116, 40);
      const bloco = this.add.container(JW / 2, JH / 2, [
        faixa,
        texto(this, 0, -16, 'Oxygen delivered!', 34, '#ffffff', 0x1e293b),
        texto(this, 0, 28, 'Air needs a complete path to flow!', 15, '#dcfce7', 0x1e293b),
      ]).setScale(0).setDepth(40);
      janela.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 450, delay: 450, ease: 'Back.easeOut' });
      this.time.delayedCall(2900, () => { this.scene.stop(); this.aoConcluir?.(); });
    };

    placas.forEach((placa, i) => {
      placa.on('pointerover', () => { if (!acabou) placa.setScale(1.05); });
      placa.on('pointerout', () => placa.setScale(1));
      placa.on('pointerdown', () => {
        if (acabou) return;
        tocarSfx('clique');
        estado = girarPeca(estado, i % estado.colunas, Math.floor(i / estado.colunas));
        angulos[i] += 90;
        this.tweens.add({ targets: fios[i], angle: angulos[i], duration: 140, ease: 'Sine.easeOut' });
        const n = atualizar();
        if (tarefaConcluida(estado)) vencer();
        else if (n === 1) msg('One room has air! One more to go.', '#fde68a');
        else msg(INSTRUCAO);
      });
    });

    // Lit wires pulse softly.
    const aCadaQuadro = (tempo: number) => {
      const a = 0.88 + 0.12 * Math.sin(tempo / 220);
      const en = calcularEnergia(estado).energizadas;
      fios.forEach((im, i) => im.setAlpha(en[i] ? a : 1));
    };
    this.events.on('update', aCadaQuadro);
    this.events.once('shutdown', () => this.events.off('update', aCadaQuadro));
  }
}
