// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Maintenance - Valves": turn the O2 and CO2 wheels (drag around them) until both needles stay in the green.
// The rules live in ../equilibrar-valvulas-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import {
  criarTarefaValvulas, girarValvula, leituras, naFaixa, tudoNaFaixa, avancar, progresso, tarefaConcluida, nivelDoAngulo,
  type TarefaValvulas, type Valvula,
} from '../equilibrar-valvulas-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto } from './moldura';
import { tocarSfx } from '../sfx';

const QUADRO_W = 760;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const FOLGA = (QUADRO_H - 500) / 2;   // the frame is taller than the layout was drawn for: centre the content
const INSTRUCAO = 'Turn the wheels: both needles in the green!';
const RAIO_MOSTRADOR = 80;
const RAIO_RODA = 56;
const COLUNAS: Record<Valvula, { x: number; nome: string; cor: number }> = {
  o2: { x: -175, nome: 'O₂', cor: 0x38bdf8 },
  co2: { x: 175, nome: 'CO₂', cor: 0xfb923c },
};
const MOSTRADOR_Y = -92;
const RODA_Y = 58;

export class EquilibrarValvulasTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('EquilibrarValvulasTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  private criarTexturas() {
    // Gauge face: a flat round dial with ticks and a thick outline.
    canvas(this, 'valv_mostrador_v2', 200, 200, (c) => {
      c.fillStyle = '#e2e8f0'; c.beginPath(); c.arc(100, 100, 94, 0, Math.PI * 2); c.fill();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(100, 100, 82, 0, Math.PI * 2); c.fill();
      c.lineWidth = 3; c.stroke();
      c.lineCap = 'round';
      for (let i = 0; i <= 10; i++) {
        const a = (-225 + 27 * i) * Math.PI / 180;
        c.strokeStyle = '#1e293b'; c.lineWidth = i % 5 === 0 ? 4 : 2.5;
        c.beginPath(); c.moveTo(100 + Math.cos(a) * 62, 100 + Math.sin(a) * 62); c.lineTo(100 + Math.cos(a) * 72, 100 + Math.sin(a) * 72); c.stroke();
      }
    });
    // Needle pointing up, with its pivot at (20, 80).
    canvas(this, 'valv_ponteiro_v2', 40, 100, (c) => {
      c.lineJoin = 'round';
      c.fillStyle = '#ef4444'; c.beginPath(); c.moveTo(14, 80); c.lineTo(20, 4); c.lineTo(26, 80); c.closePath(); c.fill();
      c.lineWidth = 3; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#e2e8f0'; c.beginPath(); c.arc(20, 80, 10, 0, Math.PI * 2); c.fill(); c.stroke();
    });
    // The two wheels: a thick flat ring, four spokes, a hub and a yellow knob on top that shows where it points.
    for (const [chave, cor] of [['valv_roda_o2_v2', '#38bdf8'], ['valv_roda_co2_v2', '#fb923c']] as const) {
      canvas(this, chave, 150, 150, (c) => {
        c.lineCap = 'butt';
        // dark outline pass, then the colour pass on top
        for (const [larg, col, extra] of [[0, '#1e293b', 6], [0, cor, 0]] as const) {
          c.strokeStyle = col;
          for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2 + Math.PI / 4;
            c.lineWidth = 13 + extra; c.beginPath(); c.moveTo(75, 75); c.lineTo(75 + Math.cos(a) * 52, 75 + Math.sin(a) * 52); c.stroke();
          }
          c.lineWidth = 16 + extra; c.beginPath(); c.arc(75, 75, 54, 0, Math.PI * 2); c.stroke();
          void larg;
        }
        c.fillStyle = '#e2e8f0'; c.beginPath(); c.arc(75, 75, 19, 0, Math.PI * 2); c.fill();
        c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.stroke();
        c.fillStyle = '#facc15'; c.beginPath(); c.arc(75, 20, 11, 0, Math.PI * 2); c.fill();
        c.lineWidth = 3.5; c.stroke();
      });
    }
    // The pipe that joins the wheels: a flat steel tube.
    canvas(this, 'valv_cano_v2', 420, 44, (c) => {
      c.fillStyle = '#cbd5e1'; c.beginPath(); c.roundRect(2, 2, 416, 40, 12); c.fill();
      c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#94a3b8'; for (const x of [40, 370]) c.fillRect(x, 4, 10, 36);
    });
  }

  create() {
    let estado: TarefaValvulas = criarTarefaValvulas();
    this.criarTexturas();
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Maintenance - Valves');
    const msg = barraStatus(this, raiz, QUADRO_H, INSTRUCAO);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    // A dark panel behind the controls, and the pipe behind the wheels.
    const fundo = this.add.graphics();
    fundo.fillStyle(0x2563eb, 1).fillRoundedRect(-355, -200, 710, 306, 26);
    fundo.fillStyle(0x000000, 0.12).fillRoundedRect(-355, -200, 710, 306 * 0.42, { tl: 26, tr: 26, bl: 0, br: 0 });
    fundo.lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-355, -200, 710, 306, 26);
    raiz.add(fundo);
    raiz.add(this.add.image(0, RODA_Y, 'valv_cano_v2'));

    // The lamp in the middle: red, then yellow (one needle right), then green.
    const lampada = this.add.graphics();
    raiz.add(lampada);
    raiz.add(texto(this, 0, MOSTRADOR_Y + 44, 'Air', 18, '#ffffff', 0x1e293b));
    const pintarLampada = () => {
      const n = (naFaixa(estado, 'o2') ? 1 : 0) + (naFaixa(estado, 'co2') ? 1 : 0);
      const cor = [0xef4444, 0xfacc15, 0x22c55e][n];
      lampada.clear();
      lampada.fillStyle(cor, 1).fillCircle(0, MOSTRADOR_Y, 26);
      lampada.lineStyle(5, 0x1e293b, 1).strokeCircle(0, MOSTRADOR_Y, 26);
    };

    // ---- Gauges and wheels.
    const tipos: Valvula[] = ['o2', 'co2'];
    const faixas = new Map<Valvula, Phaser.GameObjects.Graphics>();
    const ponteiros = new Map<Valvula, Phaser.GameObjects.Image>();
    const rodas = new Map<Valvula, Phaser.GameObjects.Image>();
    const aneis = new Map<Valvula, Phaser.GameObjects.Graphics>();
    const estavaNoVerde = new Map<Valvula, boolean>();
    for (const q of tipos) {
      const { x, nome } = COLUNAS[q];
      raiz.add(this.add.image(x, MOSTRADOR_Y, 'valv_mostrador_v2').setScale(RAIO_MOSTRADOR / 82));
      const alvo = q === 'o2' ? estado.alvoO2 : estado.alvoCo2;
      const rad = (v: number) => Phaser.Math.DegToRad(-225 + 270 * v);
      const faixa = this.add.graphics();
      faixa.lineStyle(10, 0x16a34a, 1).beginPath().arc(x, MOSTRADOR_Y, 50, rad(alvo - estado.tolerancia), rad(alvo + estado.tolerancia), false).strokePath();
      faixas.set(q, faixa);
      const anel = this.add.graphics().setVisible(false);
      anel.lineStyle(6, 0x4ade80, 1).strokeCircle(x, MOSTRADOR_Y, RAIO_MOSTRADOR + 6);
      aneis.set(q, anel);
      raiz.add([faixa, anel]);
      raiz.add(texto(this, x, MOSTRADOR_Y + 30, nome, 24, '#ffffff', 0x1e293b));
      const p = this.add.image(x, MOSTRADOR_Y, 'valv_ponteiro_v2').setOrigin(0.5, 0.8).setScale(0.8);
      ponteiros.set(q, p);
      raiz.add(p);
      const r = this.add.image(x, RODA_Y, q === 'o2' ? 'valv_roda_o2_v2' : 'valv_roda_co2_v2').setScale(RAIO_RODA / 54).setInteractive({ useHandCursor: true });
      rodas.set(q, r);
      raiz.add(r);
      estavaNoVerde.set(q, false);
    }

    // ---- Stable air bar.
    const medidor = this.add.graphics();
    raiz.add(medidor);
    raiz.add(texto(this, -225, 133, 'Stable air', 17, '#ffffff', 0x1e293b));
    const desenharMedidor = () => {
      const q = progresso(estado);
      medidor.clear();
      medidor.fillStyle(0xffffff, 1).fillRoundedRect(-150, 120, 380, 26, 13);
      if (q > 0.01) {
        medidor.fillStyle(0x22c55e, 1).fillRoundedRect(-147, 123, Math.max(20, 374 * q), 20, 10);
      }
      medidor.lineStyle(4, 0x1e293b, 1).strokeRoundedRect(-150, 120, 380, 26, 13);
    };

    const pintar = () => {
      const l = leituras(estado);
      for (const q of tipos) {
        const alvoGraus = -135 + 270 * l[q];
        const p = ponteiros.get(q)!;
        p.angle = Phaser.Math.Angle.WrapDegrees(alvoGraus);
        rodas.get(q)!.angle = -135 + 270 * estado[q];
        aneis.get(q)!.setVisible(naFaixa(estado, q));
      }
      pintarLampada();
    };
    pintar();
    desenharMedidor();

    // ---- Input: grab a wheel and drag around its centre.
    let segurando: Valvula | null = null;
    let acabou = false;
    let avisou = false;
    const mover = (p: Phaser.Input.Pointer) => {
      if (!segurando || acabou) return;
      const q = segurando;
      const dx = (p.x - raiz.x) / s - COLUNAS[q].x, dy = (p.y - raiz.y) / s - RODA_Y;
      if (Math.hypot(dx, dy) < 8) return;
      const nivel = nivelDoAngulo(Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90);
      if (Math.abs(nivel - estado[q]) > 0.6) return;     // a jump across the gap at the bottom: ignore
      const antes = Math.round(estado[q] * 20);
      estado = girarValvula(estado, q, nivel);
      if (Math.round(estado[q] * 20) !== antes) tocarSfx('girar');
      pintar();
      for (const v of tipos) {                            // a little burst when a needle enters the green
        const dentro = naFaixa(estado, v);
        if (dentro && !estavaNoVerde.get(v)) tocarSfx('encaixe');
        if (dentro && !estavaNoVerde.get(v)) rajada(this, raiz, COLUNAS[v].x, MOSTRADOR_Y, [0x86efac, 0xfde047, 0xffffff], 8, 60);
        estavaNoVerde.set(v, dentro);
      }
      if (!avisou && estavaNoVerde.get('o2') !== estavaNoVerde.get('co2')) {
        avisou = true; msg('Careful: one valve moves the other!', '#fde68a');
      }
    };
    for (const q of tipos) {
      rodas.get(q)!.on('pointerdown', (p: Phaser.Input.Pointer) => { if (!acabou) { segurando = q; tocarSfx('pegar'); mover(p); } });
    }
    this.input.on('pointermove', mover);
    this.input.on('pointerup', () => { if (segurando) tocarSfx('soltar'); segurando = null; });
    this.input.on('gameout', () => { segurando = null; });

    const vencer = () => {
      acabou = true; segurando = null;
      msg('Stable air! Everything is fine on the ship.', '#86efac');
      rajada(this, raiz, 0, MOSTRADOR_Y, [0xfde047, 0x86efac, 0x7dd3fc, 0xf9a8d4], 26, 200);
      const faixa = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-270, -58, 540, 116, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-270, -58, 540, 116, 40);
      const bloco = this.add.container(0, -10, [
        faixa,
        texto(this, 0, -16, 'Stable air!', 38, '#ffffff', 0x14532d),
        texto(this, 0, 28, 'Earth air is about 21% oxygen!', 15, '#dcfce7', 0x14532d),
      ]).setScale(0).setDepth(40);
      raiz.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 450, delay: 250, ease: 'Back.easeOut' });
      this.time.delayedCall(2500, () => { this.scene.stop(); this.aoConcluir?.(); });
    };

    const aCadaQuadro = (_t: number, delta: number) => {
      if (acabou) return;
      const dt = Math.min(0.05, delta / 1000);
      const novo = avancar(estado, dt);
      if (novo === estado) return;
      estado = novo;
      desenharMedidor();
      if (tarefaConcluida(estado)) { vencer(); return; }
      if (tudoNaFaixa(estado) && progresso(estado) < 0.1) msg('Hold it like this for a bit...', '#fde68a');
    };
    this.events.on('update', aCadaQuadro);
    this.events.once('shutdown', () => this.events.off('update', aCadaQuadro));
  }
}
