// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Maintenance - Oxygen in Range": the oxygen leaks away; hold the "Inject O₂" button to keep the level in the green band.
// The rules live in ../oxigenio-faixa-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { criarTarefaOxigenioFaixa, passo, progresso, tarefaConcluida, naFaixa, emAlerta, type TarefaOxigenioFaixa } from '../oxigenio-faixa-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto } from './moldura';

const QUADRO_W = 760;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const FOLGA = (QUADRO_H - 500) / 2;   // the frame is taller than the layout was drawn for: centre the content
const JW = 600, JH = 300;             // the blue window
const TUBO = { x: 150, y: 24, w: 76, h: 252 };   // the vertical gauge, in window coordinates
const INSTRUCAO = 'Hold the button to inject O₂ and keep the level in the green.';

export class OxigenioFaixaTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('OxigenioFaixaTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  private criarTexturas() {
    // The window: a flat blue plate with a lighter top strip, thick dark outline.
    canvas(this, 'oxig_janela_v3', JW, JH, (c) => {
      c.fillStyle = '#2563eb'; c.beginPath(); c.roundRect(0, 0, JW, JH, 18); c.fill();
      c.save(); c.beginPath(); c.roundRect(0, 0, JW, JH, 18); c.clip();
      c.fillStyle = '#1d4ed8'; c.fillRect(0, 0, JW, JH * 0.1);
      c.fillStyle = '#1e40af'; c.fillRect(JW * 0.42, 14, 3, JH - 28);
      c.restore();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.beginPath(); c.roundRect(2.5, 2.5, JW - 5, JH - 5, 18); c.stroke();
    });
    // The glass tube of the gauge, with tick marks.
    canvas(this, 'oxig_tubo_v3', TUBO.w + 20, TUBO.h + 20, (c) => {
      c.fillStyle = '#e2e8f0'; c.strokeStyle = '#1e293b'; c.lineWidth = 5;
      c.beginPath(); c.roundRect(12, 10, TUBO.w - 4, TUBO.h, 14); c.fill(); c.stroke();
      c.lineWidth = 3;
      for (let i = 0; i <= 10; i++) {
        const y = 10 + 8 + (TUBO.h - 16) * (i / 10);
        c.beginPath(); c.moveTo(4, y); c.lineTo(i % 5 === 0 ? 12 : 8, y); c.stroke();
      }
    });
  }

  create() {
    let estado: TarefaOxigenioFaixa = criarTarefaOxigenioFaixa();
    this.criarTexturas();
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Maintenance - Oxygen in Range');
    const msg = barraStatus(this, raiz, QUADRO_H, INSTRUCAO);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    // ---- The window.
    const JX = -JW / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    raiz.add(janela);
    janela.add(this.add.image(0, 0, 'oxig_janela_v3').setOrigin(0));
    const alertaBorda = this.add.graphics().setVisible(false);
    alertaBorda.lineStyle(6, 0xef4444, 1).strokeRoundedRect(2, 2, JW - 4, JH - 4, 18);
    janela.add(alertaBorda);

    // ---- The gauge. Level y grows downwards: nivel 1 is the top of the tube.
    const iy = (n: number) => TUBO.y + 8 + (TUBO.h - 16) * (1 - n);
    const tx = TUBO.x - 6, tw = TUBO.w - 12;   // inner column of the tube (window coordinates)
    janela.add(this.add.image(TUBO.x - 18, TUBO.y - 10, 'oxig_tubo_v3').setOrigin(0));
    const faixa = this.add.graphics();
    faixa.fillStyle(0x22c55e, 0.45).fillRect(tx + 6, iy(estado.faixaMax), tw - 12, iy(estado.faixaMin) - iy(estado.faixaMax));
    faixa.lineStyle(3, 0x15803d, 1).strokeRect(tx + 6, iy(estado.faixaMax), tw - 12, iy(estado.faixaMin) - iy(estado.faixaMax));
    const liquido = this.add.graphics();
    const seta = this.add.graphics();
    janela.add([liquido, faixa, seta]);
    const rotuloFaixa = texto(this, TUBO.x - 62, (iy(estado.faixaMax) + iy(estado.faixaMin)) / 2, 'safe\nrange', 15, '#bbf7d0', 0x14532d).setAlign('center');
    janela.add(rotuloFaixa);

    // ---- Status reading on the right.
    const leitura = texto(this, 440, 62, 'Low oxygen', 24, '#fde68a', 0x1e293b);
    const dica = texto(this, 440, 98, 'Inject to raise it', 15, '#ffffff', 0x1e293b);
    janela.add([leitura, dica]);

    // ---- The "Injetar O2" button (hold it).
    const BX = 440, BY = 190, BW = 220, BH = 84;
    const botao = this.add.graphics();
    const rotuloBotao = texto(this, BX, BY, 'Inject O₂', 30, '#ffffff', 0x14532d);
    const zona = this.add.zone(BX, BY, BW, BH).setInteractive({ useHandCursor: true });
    janela.add([botao, rotuloBotao, zona]);
    let injetando = false;
    let teclaEspaco = false;
    const desenharBotao = () => {
      const ativo = injetando || teclaEspaco;
      botao.clear();
      botao.fillStyle(0x1e293b, 1).fillRoundedRect(BX - BW / 2, BY - BH / 2 + 7, BW, BH, 26);
      botao.fillStyle(ativo ? 0x15803d : 0x22c55e, 1).fillRoundedRect(BX - BW / 2, BY - BH / 2 + (ativo ? 6 : 0), BW, BH, 26);
      botao.lineStyle(4, 0x1e293b, 1).strokeRoundedRect(BX - BW / 2, BY - BH / 2 + (ativo ? 6 : 0), BW, BH, 26);
      rotuloBotao.setY(BY + (ativo ? 6 : 0));
    };
    desenharBotao();
    zona.on('pointerdown', () => { injetando = true; desenharBotao(); });
    const soltar = () => { if (injetando) { injetando = false; desenharBotao(); } };
    this.input.on('pointerup', soltar);
    this.input.on('gameout', soltar);
    const kb = this.input.keyboard;
    const descer = (e: KeyboardEvent) => { if (e.code === 'Space') { teclaEspaco = true; desenharBotao(); } };
    const subir = (e: KeyboardEvent) => { if (e.code === 'Space') { teclaEspaco = false; desenharBotao(); } };
    kb?.on('keydown', descer);
    kb?.on('keyup', subir);

    // ---- Progress bar (time kept in the green band).
    const medidor = this.add.graphics();
    raiz.add(medidor);
    raiz.add(texto(this, -218, 133, 'Air', 18, '#ffffff', 0x1e293b));
    const pct = texto(this, 222, 133, '0%', 18, '#ffffff', 0x1e293b);
    raiz.add(pct);
    const desenharMedidor = () => {
      const q = progresso(estado);
      medidor.clear();
      medidor.fillStyle(0xffffff, 1).fillRoundedRect(-190, 120, 380, 26, 13).lineStyle(4, 0x1e293b, 1).strokeRoundedRect(-190, 120, 380, 26, 13);
      if (q > 0.01) medidor.fillStyle(0x22c55e, 1).fillRoundedRect(-187, 123, Math.max(20, 374 * q), 20, 10);
      pct.setText(`${Math.round(q * 100)}%`);
    };

    let ultimoEstado = '';
    const desenhar = () => {
      const cor = emAlerta(estado) ? 0xef4444 : naFaixa(estado) ? 0x22c55e : 0xfacc15;
      const topo = iy(estado.nivel);
      liquido.clear();
      liquido.fillStyle(cor, 1).fillRoundedRect(tx + 2, topo, tw - 4, TUBO.y + 8 + TUBO.h - 16 - topo + 6, 6);
      liquido.fillStyle(0xffffff, 0.35).fillRect(tx + 8, topo + 2, 6, Math.max(0, TUBO.y + TUBO.h - 14 - topo - 6));
      seta.clear();
      seta.fillStyle(0x1e293b, 1).fillTriangle(tx + tw + 12, topo, tx + tw + 34, topo - 11, tx + tw + 34, topo + 11);
      seta.fillStyle(cor, 1).fillTriangle(tx + tw + 15, topo, tx + tw + 30, topo - 7, tx + tw + 30, topo + 7);
      const e = emAlerta(estado) ? 'alerta' : naFaixa(estado) ? 'ok' : 'falta';
      if (e !== ultimoEstado) {
        ultimoEstado = e;
        alertaBorda.setVisible(e === 'alerta');
        if (e === 'alerta') { leitura.setText('Too much oxygen!').setColor('#fecaca'); dica.setText('Let go of the button'); msg('Careful: too much O₂ is dangerous!', '#fca5a5'); }
        else if (e === 'ok') { leitura.setText('Safe level!').setColor('#bbf7d0'); dica.setText('Keep it there'); msg('Great job! Keep the level in the green.', '#86efac'); }
        else { leitura.setText('Low oxygen').setColor('#fde68a'); dica.setText('Hold the button'); msg(INSTRUCAO); }
      }
      desenharMedidor();
    };
    desenhar();

    let acabou = false;
    const vencer = () => {
      acabou = true; injetando = false; teclaEspaco = false; desenharBotao();
      msg('Air balanced! Mission accomplished.', '#86efac');
      const brilho = this.add.rectangle(0, 0, JW, JH, 0xffffff, 0.5).setOrigin(0);
      janela.add(brilho);
      this.tweens.add({ targets: brilho, alpha: 0, duration: 900 });
      rajada(this, janela, JW / 2, JH / 2, [0xfde047, 0x86efac, 0x7dd3fc, 0xf9a8d4], 26, 170);
      const fundo = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-280, -70, 560, 140, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-280, -70, 560, 140, 40);
      const bloco = this.add.container(JW / 2, JH / 2, [
        fundo,
        texto(this, 0, -34, 'Air balanced!', 36, '#ffffff', 0x14532d),
        texto(this, 0, 8, 'Did you know? The air on the International Space Station', 15, '#dcfce7', 0x14532d),
        texto(this, 0, 32, 'has about 21% oxygen, just like Earth.', 15, '#dcfce7', 0x14532d),
      ]).setScale(0).setDepth(40);
      janela.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 450, delay: 250, ease: 'Back.easeOut' });
      this.time.delayedCall(3600, () => { this.scene.stop(); this.aoConcluir?.(); });
    };

    let bolha = 0;
    const aCadaQuadro = (_t: number, delta: number) => {
      if (acabou) return;
      const dt = Math.min(0.05, delta / 1000);
      const ativo = injetando || teclaEspaco;
      estado = passo(estado, ativo, dt);
      desenhar();
      bolha += dt;
      if (ativo && bolha > 0.06) {
        bolha = 0;
        const b = this.add.circle(tx + 10 + Math.random() * (tw - 20), iy(estado.nivel) + 30, 3 + Math.random() * 2, 0xffffff, 0.8).setDepth(12);
        janela.add(b);
        this.tweens.add({ targets: b, y: iy(estado.nivel) + 4, alpha: 0, duration: 500, onComplete: () => b.destroy() });
      }
      if (tarefaConcluida(estado)) vencer();
    };
    this.events.on('update', aCadaQuadro);
    this.events.once('shutdown', () => {
      this.events.off('update', aCadaQuadro);
      kb?.off('keydown', descer);
      kb?.off('keyup', subir);
    });
  }
}
