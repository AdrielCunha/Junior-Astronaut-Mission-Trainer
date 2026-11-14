// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Fix the wiring": one lamp went dark. Follow its wire, test it stretch by stretch to find the damage, then pick the repair.
// The rules live in ../fiacao-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import {
  criarFiacao, tocarTrecho, escolherReparo, defeitoAtual, lampadaApagada, fiacaoConcluida,
  TRECHOS, FIOS, RODADAS, type Fiacao, type Reparo, type Dano,
} from '../fiacao-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto } from './moldura';

const QUADRO_W = 760;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const FOLGA = (QUADRO_H - 460) / 2;   // the frame is taller than the layout was drawn for: centre the content
const JANELA_W = 680;
const JANELA_H = 330;
const INSTRUCAO = 'A lamp went dark! Follow the wire to it and find the spark of the fault!';
const ORIGEM_X = 86;
const FIM_X = 572;
const LAMPADA_X = 616;
const PONTOS = 50;              // samples per wire; each stretch is PONTOS / TRECHOS of them
const POR_TRECHO = PONTOS / TRECHOS;
const linhaY = (i: number) => 40 + i * 62;

const CORES = [
  { nome: 'red', cor: 0xef4444, simbolo: '●' },
  { nome: 'yellow', cor: 0xfacc15, simbolo: '■' },
  { nome: 'green', cor: 0x22c55e, simbolo: '▲' },
  { nome: 'blue', cor: 0x22d3ee, simbolo: '★' },
];

const NOME_DANO: Record<Dano, string> = { cortado: 'cut', descascado: 'stripped', queimado: 'burnt' };
const BOTOES: { id: Reparo; titulo: string; cor: number }[] = [
  { id: 'emenda', titulo: 'Splice', cor: 0x2563eb },
  { id: 'fita', titulo: 'Tape', cor: 0xea580c },
  { id: 'trocar', titulo: 'Replace wire', cor: 0x7c3aed },
];
const DICA: Record<Dano, string> = {
  cortado: 'The wire is cut! Join the two ends.',
  descascado: 'The wire cover came off! Cover the bare copper.',
  queimado: 'The wire burnt out! It cannot be fixed.',
};

export class FiacaoTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('FiacaoTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  private criarTexturas() {
    // Flat blue window with a darker top band, a battery box for each wire on the left and a lamp socket on the right.
    canvas(this, 'fiacao_fundo_v3', JANELA_W, JANELA_H, (c) => {
      c.beginPath(); c.roundRect(0, 0, JANELA_W, JANELA_H, 18); c.clip();
      c.fillStyle = '#2563eb'; c.fillRect(0, 0, JANELA_W, JANELA_H);
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 0, JANELA_W, JANELA_H * 0.42);
      for (let i = 0; i < FIOS; i++) {
        const y = linhaY(i);
        c.fillStyle = '#e2e8f0'; c.beginPath(); c.roundRect(18, y - 22, 68, 44, 10); c.fill(); c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.stroke();
        c.fillStyle = '#1e293b'; c.fillRect(30, y - 28, 12, 7); c.fillRect(62, y - 28, 12, 7);
        c.fillStyle = '#94a3b8'; c.beginPath(); c.roundRect(574, y - 24, 70, 48, 12); c.fill(); c.lineWidth = 4; c.stroke();
      }
    });
  }

  create() {
    let estado: Fiacao = criarFiacao();
    this.criarTexturas();
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Maintenance - Fix the wiring');
    const msg = barraStatus(this, raiz, QUADRO_H, INSTRUCAO);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    // ---- The window.
    const JX = -JANELA_W / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    const rim = this.add.graphics();
    rim.lineStyle(5, 0x1e293b, 1).strokeRoundedRect(JX - 2, JY - 2, JANELA_W + 4, JANELA_H + 4, 20);
    raiz.add(rim);
    raiz.add(janela);
    janela.add(this.add.image(0, 0, 'fiacao_fundo_v3').setOrigin(0));

    // ---- Wires: each one runs from its battery box to a (shuffled) lamp, so they cross each other.
    const caminhos: Phaser.Math.Vector2[][] = estado.destino.map((dest, i) => {
      const y1 = linhaY(i), y2 = linhaY(dest);
      return new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(ORIGEM_X, y1), new Phaser.Math.Vector2(ORIGEM_X + 230, y1),
        new Phaser.Math.Vector2(FIM_X - 230, y2), new Phaser.Math.Vector2(FIM_X, y2)).getPoints(PONTOS - 1);
    });
    const cabos = this.add.graphics();
    const teste = this.add.graphics();
    const dano = this.add.graphics();
    const corrente = this.add.graphics();
    janela.add([cabos, corrente, teste, dano]);
    CORES.forEach((k, i) => janela.add(texto(this, 52, linhaY(i) + 1, k.simbolo, 20, '#1e293b', 0xe2e8f0)));
    caminhos.forEach((pts, i) => {
      cabos.lineStyle(14, 0x1e293b, 1).strokePoints(pts);
      cabos.lineStyle(9, CORES[i].cor, 1).strokePoints(pts);
    });

    // ---- Lamps.
    const lampadas = Array.from({ length: FIOS }, (_n, j) => {
      const l = this.add.circle(LAMPADA_X, linhaY(j), 17, 0xfde047).setStrokeStyle(4, 0x1e293b);
      janela.add(l);
      return l;
    });
    const acenderLampadas = () => lampadas.forEach((l, j) => l.setFillStyle(!fiacaoConcluida(estado) && j === lampadaApagada(estado) ? 0x475569 : 0xfde047));
    acenderLampadas();

    // ---- Repair buttons (greyed until the damage is found).
    const botoes = BOTOES.map((b, k) => {
      const x = JANELA_W / 2 + (k - 1) * 200, y = 290;
      const g = this.add.graphics()
        .fillStyle(b.cor, 1).fillRoundedRect(-88, -21, 176, 42, 14)
        .lineStyle(4, 0x1e293b, 1).strokeRoundedRect(-88, -21, 176, 42, 14);
      const c = this.add.container(x, y, [g, texto(this, 0, 1, b.titulo, 19, '#ffffff', 0x1e293b)]).setSize(176, 42).setAlpha(0.4);
      c.setInteractive({ useHandCursor: true });
      janela.add(c);
      return { c, id: b.id };
    });
    const liberarBotoes = (sim: boolean) => botoes.forEach((b) => b.c.setAlpha(sim ? 1 : 0.4));

    // ---- Where the damage is, drawn only after the child finds it.
    const mostrarDano = () => {
      const d = defeitoAtual(estado);
      const pts = caminhos[d.fio];
      const p = pts[d.trecho * POR_TRECHO + Math.floor(POR_TRECHO / 2)], q = pts[d.trecho * POR_TRECHO + Math.floor(POR_TRECHO / 2) + 1];
      const ang = Math.atan2(q.y - p.y, q.x - p.x), cx = Math.cos(ang), cy = Math.sin(ang);
      dano.clear();
      if (d.dano === 'cortado') {
        dano.lineStyle(20, 0x1d4ed8, 1).lineBetween(p.x - cx * 9, p.y - cy * 9, p.x + cx * 9, p.y + cy * 9);
        for (const sinal of [-1, 1]) {
          dano.fillStyle(0xf59e0b, 1).fillCircle(p.x + cx * 11 * sinal, p.y + cy * 11 * sinal, 6);
          dano.lineStyle(3, 0x1e293b, 1).strokeCircle(p.x + cx * 11 * sinal, p.y + cy * 11 * sinal, 6);
        }
      } else if (d.dano === 'descascado') {
        dano.lineStyle(9, 0xf59e0b, 1).lineBetween(p.x - cx * 14, p.y - cy * 14, p.x + cx * 14, p.y + cy * 14);
        for (let k = -2; k <= 2; k++) dano.lineStyle(3, 0x1e293b, 1).lineBetween(p.x + cx * k * 6 - cy * 6, p.y + cy * k * 6 + cx * 6, p.x + cx * k * 6 + cy * 6, p.y + cy * k * 6 - cx * 6);
      } else {
        dano.fillStyle(0x111827, 1).fillCircle(p.x, p.y, 15).lineStyle(4, 0x1e293b, 1).strokeCircle(p.x, p.y, 15);
        dano.fillStyle(0x64748b, 1).fillCircle(p.x - 9, p.y - 20, 6).fillCircle(p.x + 6, p.y - 28, 5);
      }
      const faisca = texto(this, p.x, p.y - 4, '⚡', 22, '#fde047', 0x1e293b).setDepth(30);
      janela.add(faisca);
      this.tweens.add({ targets: faisca, alpha: 0.2, duration: 220, yoyo: true, repeat: 5, onComplete: () => faisca.destroy() });
    };

    // ---- Testing a wire: the tested stretches flash green (current) or red (no current).
    const piscar = (fio: number, de: number, ate: number, cor: number) => {
      teste.clear();
      const pts = caminhos[fio].slice(de * POR_TRECHO, Math.min(PONTOS, (ate + 1) * POR_TRECHO + 1));
      teste.lineStyle(7, cor, 1).strokePoints(pts);
      teste.setAlpha(1);
      this.tweens.killTweensOf(teste);
      this.tweens.add({ targets: teste, alpha: 0, duration: 900, delay: 250 });
    };

    let acabou = false;
    let ocupado = false;
    const aoLocal = (p: Phaser.Input.Pointer) => ({ x: (p.x - raiz.x) / s - JX, y: (p.y - raiz.y) / s - JY });

    const vencer = () => {
      acabou = true;
      acenderLampadas();
      msg('Wiring fixed!', '#86efac');
      liberarBotoes(false);
      lampadas.forEach((l) => this.tweens.add({ targets: l, scale: 1.5, duration: 200, yoyo: true }));
      const brilho = this.add.rectangle(0, 0, JANELA_W, JANELA_H, 0xffffff, 0.6).setOrigin(0);
      janela.add(brilho);
      this.tweens.add({ targets: brilho, alpha: 0, duration: 900 });
      rajada(this, janela, JANELA_W / 2, JANELA_H / 2, [0xfde047, 0x86efac, 0x7dd3fc, 0xf9a8d4], 26, 190);
      const faixa = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-250, -66, 500, 132, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-250, -66, 500, 132, 40);
      const bloco = this.add.container(JANELA_W / 2, JANELA_H / 2, [
        faixa,
        texto(this, 0, -26, 'Wiring fixed!', 38, '#ffffff', 0x14532d),
        texto(this, 0, 24, 'NASA space shuttles had\nhundreds of kilometers of wires.', 15, '#dcfce7', 0x14532d),
      ]).setScale(0).setDepth(40);
      janela.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 450, delay: 250, ease: 'Back.easeOut' });
      this.time.delayedCall(2800, () => { this.scene.stop(); this.aoConcluir?.(); });
    };

    // ---- Electric current only at the damage: a pulsing glow with small crackling arcs on the broken wire.
    const atualizarCorrente = (tempo: number) => {
      corrente.clear();
      if (fiacaoConcluida(estado) || estado.achado) return;
      const d = defeitoAtual(estado);
      const p = caminhos[d.fio][d.trecho * POR_TRECHO + Math.floor(POR_TRECHO / 2)];
      const r = 10 + 3 * Math.sin(tempo / 110);
      corrente.fillStyle(0xfde047, 0.35).fillCircle(p.x, p.y, r + 9);
      corrente.fillStyle(0xfde047, 1).fillCircle(p.x, p.y, r);
      corrente.lineStyle(3, 0x1e293b, 1).strokeCircle(p.x, p.y, r);
      const passo = Math.floor(tempo / 90);   // the arcs jump a few times per second
      for (let k = 0; k < 4; k++) {
        const ang = (passo * 1.7 + k * Math.PI / 2) % (Math.PI * 2);
        const meio = ang + 0.35 * (((passo + k) % 2) ? 1 : -1);
        corrente.lineStyle(3, 0xffffff, 1).beginPath().moveTo(p.x, p.y)
          .lineTo(p.x + Math.cos(meio) * (r + 6), p.y + Math.sin(meio) * (r + 6))
          .lineTo(p.x + Math.cos(ang) * (r + 17), p.y + Math.sin(ang) * (r + 17)).strokePath();
      }
    };
    this.events.on('update', atualizarCorrente);
    this.events.once('shutdown', () => this.events.off('update', atualizarCorrente));

    // ---- Touch on a wire: find the closest wire stretch.
    janela.setSize(JANELA_W, JANELA_H);
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (acabou || ocupado || estado.achado) return;
      const l = aoLocal(ptr);
      let fio = -1, idx = 0, melhor = 24;
      caminhos.forEach((pts, i) => pts.forEach((pt, k) => {
        const dd = Phaser.Math.Distance.Between(l.x, l.y, pt.x, pt.y);
        if (dd < melhor) { melhor = dd; fio = i; idx = k; }
      }));
      if (fio < 0) return;
      const trecho = Math.min(TRECHOS - 1, Math.floor(idx / POR_TRECHO));
      const { estado: novo, resultado } = tocarTrecho(estado, fio, trecho);
      estado = novo;
      if (resultado === 'bom') {
        piscar(fio, 0, TRECHOS - 1, 0x4ade80);
        msg(`The ${CORES[fio].nome} wire is fine. Look for the one that leads to the dark lamp!`, '#e2e8f0');
      } else if (resultado === 'com-corrente') {
        piscar(fio, 0, trecho, 0x4ade80);
        msg('There is current here. The fault is further ahead!', '#86efac');
      } else if (resultado === 'sem-corrente') {
        piscar(fio, trecho, trecho, 0xf87171);
        msg('No current here. The fault is further back!', '#fca5a5');
      } else if (resultado === 'achou') {
        piscar(fio, trecho, trecho, 0xfde047);
        mostrarDano();
        liberarBotoes(true);
        msg(DICA[defeitoAtual(estado).dano], '#fde68a');
      }
    });

    // ---- Repair buttons.
    botoes.forEach((b) => b.c.on('pointerdown', () => {
      if (acabou || ocupado || !estado.achado) { if (!estado.achado && !acabou) msg('First find the fault in the wire!', '#e2e8f0'); return; }
      const d = defeitoAtual(estado);
      const novo = escolherReparo(estado, b.id);
      if (novo === estado) {
        msg(`That repair cannot fix a ${NOME_DANO[d.dano]} wire. Try another!`, '#fca5a5');
        this.tweens.add({ targets: b.c, angle: 4, duration: 60, yoyo: true, repeat: 2, onComplete: () => b.c.setAngle(0) });
        return;
      }
      ocupado = true;
      estado = novo;
      dano.clear();
      liberarBotoes(false);
      const pts = caminhos[d.fio], p = pts[d.trecho * POR_TRECHO + Math.floor(POR_TRECHO / 2)];
      rajada(this, janela, p.x, p.y, [CORES[d.fio].cor, 0xffffff, 0xfde047], 12, 60);
      if (fiacaoConcluida(estado)) { acenderLampadas(); vencer(); return; }
      const apagada = lampadas[estado.destino[d.fio]];
      apagada.setFillStyle(0xfde047);
      this.tweens.add({ targets: apagada, scale: 1.5, duration: 200, yoyo: true });
      msg(`Fixed! Another lamp went dark... (${estado.rodada + 1} of ${RODADAS})`, '#86efac');
      this.time.delayedCall(1100, () => { acenderLampadas(); ocupado = false; msg(INSTRUCAO, '#e2e8f0'); });
    }));
  }
}
