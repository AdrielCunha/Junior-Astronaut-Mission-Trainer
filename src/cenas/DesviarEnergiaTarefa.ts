// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Dividir a energia": tap the systems to switch them on or off so the goal systems run without going over the battery.
// The rules live in ../desviar-energia-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import {
  criarDivisao, alternarSistema, consumoTotal, rodadaAtual, SISTEMAS, RODADAS, CAPACIDADE_MAXIMA,
  type TarefaDivisao, type IdSistema,
} from '../desviar-energia-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto, concluirTarefa } from './moldura';
import { tocarSfx } from '../sfx';

const QUADRO_W = 760;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const FOLGA = (QUADRO_H - 460) / 2;
const JANELA_W = 680;
const JANELA_H = 330;
const CARTA_W = 88;
const CARTA_H = 170;
const CARTA_X = 190;              // first card
const CARTA_Y = 78;
const CARTA_PASSO = 96;
const BAT_X = 24;                 // battery
const BAT_Y = 66;
const CELULA_H = 17;
const INSTRUCAO = 'Turn on the starred systems. Do not overload!';
const ICONE = 84;

export class DesviarEnergiaTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('DesviarEnergiaTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  private criarTexturas() {
    // One flat icon per system, grey when off and coloured when on (drawn at 2x).
    const cores: Record<IdSistema, string> = { vida: '#4ade80', comunicacao: '#38bdf8', aquecedor: '#fb923c', luzes: '#fde047', motor: '#c084fc' };
    for (const s of SISTEMAS) {
      for (const on of [false, true]) {
        canvas(this, `energia_${s.id}_${on ? 'on' : 'off'}_v3`, ICONE * 2, ICONE * 2, (c) => {
          c.scale(2, 2);
          c.fillStyle = on ? cores[s.id] : '#94a3b8'; c.beginPath(); c.roundRect(3, 3, ICONE - 6, ICONE - 6, 18); c.fill();
          c.lineWidth = 4.5; c.strokeStyle = '#1e293b'; c.stroke();
          c.fillStyle = '#ffffff'; c.strokeStyle = '#1e293b'; c.lineWidth = 3.5; c.lineJoin = 'round'; c.lineCap = 'round';
          if (s.id === 'vida') {          // a heart
            c.beginPath(); c.moveTo(42, 64); c.bezierCurveTo(14, 44, 22, 20, 42, 33); c.bezierCurveTo(62, 20, 70, 44, 42, 64); c.closePath(); c.fill(); c.stroke();
          } else if (s.id === 'comunicacao') {   // an antenna with waves
            c.beginPath(); c.arc(42, 48, 7, 0, Math.PI * 2); c.fill(); c.stroke();
            c.beginPath(); c.moveTo(42, 55); c.lineTo(42, 68); c.stroke();
            for (const r of [16, 26]) { c.beginPath(); c.arc(42, 48, r, Math.PI * 1.25, Math.PI * 1.75); c.stroke(); }
          } else if (s.id === 'aquecedor') {      // a flame
            c.beginPath(); c.moveTo(42, 16); c.bezierCurveTo(62, 34, 66, 48, 58, 58); c.bezierCurveTo(52, 68, 32, 68, 26, 58); c.bezierCurveTo(20, 48, 32, 40, 34, 30); c.bezierCurveTo(38, 34, 40, 28, 42, 16); c.closePath(); c.fill(); c.stroke();
          } else if (s.id === 'luzes') {          // a bulb
            c.beginPath(); c.arc(42, 38, 18, 0, Math.PI * 2); c.fill(); c.stroke();
            c.beginPath(); c.roundRect(34, 54, 16, 12, 3); c.fill(); c.stroke();
          } else {                                // an engine nozzle with a flame
            c.beginPath(); c.moveTo(28, 20); c.lineTo(56, 20); c.lineTo(64, 50); c.lineTo(20, 50); c.closePath(); c.fill(); c.stroke();
            c.beginPath(); c.moveTo(30, 54); c.lineTo(42, 70); c.lineTo(54, 54); c.stroke();
          }
        });
      }
    }
    // The window: flat blue with a slightly darker top, like the other tasks.
    canvas(this, 'energia_fundo_v3', JANELA_W, JANELA_H, (c) => {
      c.beginPath(); c.roundRect(0, 0, JANELA_W, JANELA_H, 18); c.clip();
      c.fillStyle = '#2563eb'; c.fillRect(0, 0, JANELA_W, JANELA_H);
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 0, JANELA_W, JANELA_H * 0.42);
    });
    // The battery: a slate case with a terminal on top (the cells are drawn live).
    const bw = 150, bh = CELULA_H * CAPACIDADE_MAXIMA + 20;
    canvas(this, 'energia_bateria_v3', bw + 8, bh + 22, (c) => {
      c.translate(4, 4);
      c.fillStyle = '#1e293b'; c.beginPath(); c.roundRect(bw / 2 - 22, 0, 44, 14, 5); c.fill();
      c.fillStyle = '#e2e8f0'; c.beginPath(); c.roundRect(0, 10, bw, bh, 14); c.fill();
      c.lineWidth = 4.5; c.strokeStyle = '#1e293b'; c.stroke();
    });
  }

  create() {
    let estado: TarefaDivisao = criarDivisao();
    this.criarTexturas();
    const { raiz } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Power - Share the power');
    const msg = barraStatus(this, raiz, QUADRO_H, INSTRUCAO);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    // ---- The window.
    const JX = -JANELA_W / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    const rim = this.add.graphics();
    rim.lineStyle(5, 0x1e293b, 1).strokeRoundedRect(JX - 2, JY - 2, JANELA_W + 4, JANELA_H + 4, 20);
    raiz.add(rim);
    raiz.add(janela);
    janela.add(this.add.image(0, 0, 'energia_fundo_v3').setOrigin(0));

    // ---- Event banner and goal.
    const faixaEvento = this.add.graphics();
    faixaEvento.fillStyle(0x1e293b, 0.9).fillRoundedRect(16, 10, JANELA_W - 32, 38, 19);
    janela.add(faixaEvento);
    const tEvento = texto(this, JANELA_W / 2, 29, '', 17, '#fde68a');
    janela.add(tEvento);
    const tMeta = texto(this, CARTA_X + (CARTA_PASSO * 5 - 8) / 2, 64, '', 15, '#fde047', 0x1e3a8a);
    janela.add(tMeta);
    const tRodada = texto(this, JANELA_W / 2, JANELA_H - 22, '', 14, '#bfdbfe', 0x1e3a8a);
    janela.add(tRodada);

    // ---- The battery with one cell per unit: used = yellow, free = green, lost to the event = dark.
    const bateria = this.add.image(BAT_X + 20, BAT_Y - 14, 'energia_bateria_v3').setOrigin(0).setScale(0.88);
    janela.add(bateria);
    const celulas = this.add.graphics();
    janela.add(celulas);
    const tBat = texto(this, BAT_X + 20 + 66, BAT_Y + 180, '', 16, '#ffffff', 0x1e3a8a);
    janela.add(tBat);
    const BX = 65, CX_W = 96;
    const BY = BAT_Y + 4;

    // ---- The system cards.
    type Carta = { fundo: Phaser.GameObjects.Rectangle; icone: Phaser.GameObjects.Image; id: IdSistema; caixa: Phaser.GameObjects.Container };
    const cartas: Carta[] = SISTEMAS.map((s, i) => {
      const x = CARTA_X + i * CARTA_PASSO;
      const caixa = this.add.container(x + CARTA_W / 2, CARTA_Y + CARTA_H / 2);
      const fundo = this.add.rectangle(0, 0, CARTA_W, CARTA_H, 0xe2e8f0).setStrokeStyle(4, 0x1e293b).setInteractive({ useHandCursor: true });
      const icone = this.add.image(0, -46, `energia_${s.id}_off_v3`).setScale(0.42);
      caixa.add([fundo, icone,
        texto(this, 0, 8, s.id === 'vida' ? 'Life\nsupport' : s.nome, 12, '#ffffff', 0x1e293b),
        texto(this, 0, 42, `${s.consumo} units`, 18, '#fde047', 0x1e293b),
      ]);
      if (s.essencial) caixa.add(texto(this, 0, 76, 'ESSENTIAL', 11, '#fecaca', 0x7f1d1d));
      janela.add(caixa);
      fundo.setFillStyle(0x475569);
      return { fundo, icone, id: s.id, caixa };
    });
    const marcasMeta = cartas.map((c) => {
      const m = texto(this, 0, 60, '★ turn on', 14, '#fde68a', 0x1e293b).setVisible(false);
      c.caixa.add(m);
      return m;
    });

    // ---- Painting from the state.
    const pintar = () => {
      const r = rodadaAtual(estado);
      const uso = consumoTotal(estado);
      tEvento.setText(r.evento);
      tRodada.setText(`Round ${Math.min(estado.rodada + 1, RODADAS.length)} of ${RODADAS.length}`);
      tMeta.setText('★ Ligue: ' + r.meta.map((id) => SISTEMAS.find((s) => s.id === id)!.nome).join(' + ') + ' (a bateria aguenta ' + r.capacidade + ')');
      tBat.setText(`${uso} of ${r.capacidade} units`);
      celulas.clear();
      for (let k = 0; k < CAPACIDADE_MAXIMA; k++) {
        const y = BY + (CAPACIDADE_MAXIMA - 1 - k) * CELULA_H * 0.88 + 4;
        const cor = k < uso ? 0xfacc15 : k < r.capacidade ? 0x4ade80 : 0x64748b;
        celulas.fillStyle(cor, 1).fillRoundedRect(BX, y, CX_W, CELULA_H * 0.88 - 3, 4);
        celulas.lineStyle(2, 0x1e293b, 1).strokeRoundedRect(BX, y, CX_W, CELULA_H * 0.88 - 3, 4);
      }
      cartas.forEach((c, i) => {
        const on = estado.ligados.includes(c.id);
        c.fundo.setFillStyle(on ? 0x16a34a : 0x475569).setStrokeStyle(r.meta.includes(c.id) ? 5 : 4, r.meta.includes(c.id) ? 0xfde047 : 0x1e293b);
        const chave = `energia_${c.id}_${on ? 'on' : 'off'}_v3`;
        if (c.icone.texture.key !== chave) c.icone.setTexture(chave);
        marcasMeta[i].setVisible(r.meta.includes(c.id));
      });
    };
    pintar();

    let bloqueado = false;

    const vencer = () => {
      bloqueado = true;
      msg('Mission complete!', '#86efac');
      const brilho = this.add.rectangle(0, 0, JANELA_W, JANELA_H, 0xffffff, 0.6).setOrigin(0);
      janela.add(brilho);
      this.tweens.add({ targets: brilho, alpha: 0, duration: 900 });
      rajada(this, janela, JANELA_W / 2, JANELA_H / 2, [0xfde047, 0x86efac, 0x7dd3fc, 0xf9a8d4], 26, 190);
      const faixa = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-310, -76, 620, 152, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-310, -76, 620, 152, 40);
      const bloco = this.add.container(JANELA_W / 2, JANELA_H / 2, [
        faixa,
        texto(this, 0, -40, 'Power shared well!', 36, '#ffffff', 0x14532d),
        texto(this, 0, 24, 'Batteries save solar power\nfor when the Sun is hidden.', 15, '#dcfce7', 0x14532d),
      ]).setScale(0).setDepth(40);
      janela.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 200, delay: 50, ease: 'Back.easeOut' });
      concluirTarefa(this, this.aoConcluir);
    };

    const tocar = (id: IdSistema) => {
      if (bloqueado) return;
      const antes = estado.rodada;
      const { tarefa, resultado } = alternarSistema(estado, id);
      if (resultado === 'ignorado') return;
      const carta = cartas.find((c) => c.id === id)!;
      if (resultado === 'desarmou') {
        // Show the overload for a moment, then restart the round.
        bloqueado = true;
        tocarSfx('zap');
        celulas.clear();
        for (let k = 0; k < CAPACIDADE_MAXIMA; k++) {
          const y = BY + (CAPACIDADE_MAXIMA - 1 - k) * CELULA_H * 0.88 + 4;
          celulas.fillStyle(0xef4444, 1).fillRoundedRect(BX, y, CX_W, CELULA_H * 0.88 - 3, 4);
          celulas.lineStyle(2, 0x1e293b, 1).strokeRoundedRect(BX, y, CX_W, CELULA_H * 0.88 - 3, 4);
        }
        const aviso = this.add.rectangle(0, 0, JANELA_W, JANELA_H, 0xef4444, 0.35).setOrigin(0);
        janela.add(aviso);
        this.tweens.add({ targets: aviso, alpha: 0, duration: 700, onComplete: () => aviso.destroy() });
        this.tweens.add({ targets: janela, x: JX + 8, duration: 50, yoyo: true, repeat: 4, onComplete: () => janela.setX(JX) });
        msg('Too much power! Try again.', '#fca5a5');
        this.time.delayedCall(1100, () => {
          estado = tarefa;
          pintar();
          bloqueado = false;
          msg(INSTRUCAO, '#e2e8f0');
        });
        return;
      }
      estado = tarefa;
      tocarSfx(resultado === 'ligou' ? 'ligar' : 'clique');
      this.tweens.add({ targets: carta.caixa, scale: 1.06, duration: 90, yoyo: true });
      if (resultado === 'concluida') { pintar(); vencer(); return; }
      if (resultado === 'rodada') {
        bloqueado = true;
        const anterior = RODADAS[antes];
        // Keep the finished round on screen for a moment before the next event arrives.
        rajada(this, janela, JANELA_W / 2, 160, [0xfde047, 0x86efac, 0xffffff], 16, 120);
        msg(`Done! Next round...`, '#86efac');
        this.time.delayedCall(1500, () => {
          pintar();
          bloqueado = false;
          msg(INSTRUCAO, '#e2e8f0');
        });
        return;
      }
      pintar();
      const r = rodadaAtual(estado);
      const sobra = r.capacidade - consumoTotal(estado);
      msg(resultado === 'ligou' ? `${sobra} units left.` : INSTRUCAO, resultado === 'ligou' ? '#fde68a' : '#e2e8f0');
    };

    cartas.forEach((c) => c.fundo.on('pointerdown', () => tocar(c.id)));

    this.events.once('shutdown', () => { this.events.off('update'); this.tweens.killAll(); });
  }
}
