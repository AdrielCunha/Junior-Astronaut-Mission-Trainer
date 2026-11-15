// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Engine - Power": drag three levers into their green zones and hold them there until the engine steadies.
// The rules live in ../potencia-motor-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { criarMotorAjuste, moverControle, controleNaZona, controlesNaZona, avancarEstabilidade, estabilidade, motorAjustado, potenciaMedia, todosNaZona, type MotorAjuste } from '../potencia-motor-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto } from './moldura';

const QUADRO_W = 760;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const FOLGA = (QUADRO_H - 500) / 2;   // the frame is taller than the layout was drawn for: centre the content
const JAN_W = 640;
const JAN_H = 300;
const INSTRUCAO = 'Drag the levers into the green zones.';
const NOMES: Record<string, string> = { turbo: 'Turbo', combustao: 'Fuel', sustentacao: 'Lift' };
const TRILHO_TOPO = 62;      // window y of value 1
const TRILHO_BASE = 252;     // window y of value 0
const ALAV_X = [300, 425, 550];

const yDoValor = (v: number) => TRILHO_BASE - v * (TRILHO_BASE - TRILHO_TOPO);
const valorDoY = (y: number) => (TRILHO_BASE - y) / (TRILHO_BASE - TRILHO_TOPO);

export class PotenciaMotorTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('PotenciaMotorTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  private criarTexturas() {
    // Flat blue control panel with a slightly darker top.
    canvas(this, 'motor_fundo_v2', JAN_W, JAN_H, (c) => {
      c.beginPath(); c.roundRect(0, 0, JAN_W, JAN_H, 18); c.clip();
      c.fillStyle = '#2563eb'; c.fillRect(0, 0, JAN_W, JAN_H);
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 0, JAN_W, JAN_H * 0.42);
      // a divider between the engine and the levers
      c.fillStyle = '#1e293b'; c.fillRect(222, 18, 4, JAN_H - 36);
    });
    // The lever groove.
    canvas(this, 'motor_trilho_v2', 36, 230, (c) => {
      c.fillStyle = '#1e293b'; c.beginPath(); c.roundRect(4, 2, 26, 220, 13); c.fill();
      c.lineWidth = 3; c.strokeStyle = '#1e293b'; c.stroke();
    });
    // Lever knobs: yellow while away from the zone, green when inside.
    const botao = (chave: string, cor: string) => canvas(this, chave, 76, 52, (c) => {
      c.fillStyle = cor; c.beginPath(); c.roundRect(4, 4, 62, 38, 16); c.fill();
      c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#1e293b'; for (const dy of [-6, 0, 6]) c.fillRect(20, 23 + dy, 30, 3);
    });
    botao('motor_botao_azul_v2', '#fbbf24');
    botao('motor_botao_verde_v2', '#4ade80');
    // The engine bell, pointing down (2x so it stays sharp).
    canvas(this, 'motor_bocal_v2', 240, 260, (c) => {
      c.scale(2, 2);
      c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = '#1e293b';
      c.fillStyle = '#cbd5e1'; c.beginPath();
      c.moveTo(38, 26); c.lineTo(82, 26); c.quadraticCurveTo(84, 78, 112, 124); c.lineTo(8, 124); c.quadraticCurveTo(36, 78, 38, 26); c.closePath(); c.fill();
      c.stroke();
      c.fillStyle = '#e2e8f0'; c.beginPath(); c.roundRect(34, 2, 52, 26, 8); c.fill(); c.stroke();   // chamber
      c.fillStyle = '#ef4444'; c.fillRect(36, 12, 48, 6);                                           // red band
      c.fillStyle = '#1e293b'; c.beginPath(); c.ellipse(60, 124, 52, 6, 0, 0, Math.PI * 2); c.fill();   // dark mouth
    });
  }

  create() {
    let estado: MotorAjuste = criarMotorAjuste();
    this.criarTexturas();
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Engine - Power');
    const msg = barraStatus(this, raiz, QUADRO_H, INSTRUCAO);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    // ---- The window.
    const JX = -JAN_W / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    const rim = this.add.graphics();
    rim.lineStyle(5, 0x1e293b, 1).strokeRoundedRect(JX - 2, JY - 2, JAN_W + 4, JAN_H + 4, 20);
    raiz.add(rim);
    raiz.add(janela);
    janela.add(this.add.image(0, 0, 'motor_fundo_v2').setOrigin(0));

    // ---- The engine on the left: a bell, a flame that grows with the power, a green glow when steady.
    const brilho = this.add.circle(0, 90, 80, 0x22c55e, 0);
    const chama = this.add.graphics();
    const bocal = this.add.image(0, 0, 'motor_bocal_v2').setScale(0.5).setOrigin(0.5, 0);
    const motor = this.add.container(112, 38, [brilho, chama, bocal]);
    janela.add(motor);
    janela.add(texto(this, 112, 20, 'Engine', 16, '#ffffff', 0x1e293b));

    const desenharChama = (t: number) => {
      const p = potenciaMedia(estado);
      const longa = 14 + 100 * p + Math.sin(t / 55) * 5;
      const larga = 18 + 22 * p;
      chama.clear();
      const camadas: [number, number, number][] = [[0xf97316, 1, 0.9], [0xfbbf24, 0.72, 0.8], [0xfffbeb, 0.42, 0.95]];
      for (const [cor, k, a] of camadas) {
        const l = longa * k * (1 + Math.sin(t / 70 + k * 5) * 0.06);
        const w = larga * (0.5 + k * 0.5);
        chama.fillStyle(cor, a);
        chama.beginPath(); chama.moveTo(-w, 120); chama.lineTo(w, 120);
        chama.lineTo(w * 0.4, 120 + l * 0.6); chama.lineTo(0, 120 + l); chama.lineTo(-w * 0.4, 120 + l * 0.6); chama.closePath(); chama.fillPath();
      }
    };

    // ---- The three levers.
    const alavancas = estado.controles.map((c, i) => {
      const x = ALAV_X[i];
      janela.add(this.add.image(x, 140, 'motor_trilho_v2'));
      const zona = this.add.graphics();
      const yMax = yDoValor(c.zonaMax), yMin = yDoValor(c.zonaMin);
      zona.fillStyle(0x22c55e, 1).fillRoundedRect(x - 25, yMax, 50, yMin - yMax, 10);
      zona.lineStyle(3, 0x1e293b, 1).strokeRoundedRect(x - 25, yMax, 50, yMin - yMax, 10);
      janela.add(zona);
      // ticks
      const marcas = this.add.graphics();
      marcas.fillStyle(0xffffff, 1);
      for (let k = 0; k <= 4; k++) marcas.fillRect(x + 22, yDoValor(k / 4) - 1, 8, 2);
      janela.add(marcas);
      janela.add(texto(this, x, 28, NOMES[c.id] ?? c.id, 15, '#ffffff', 0x1e293b));
      const lampada = this.add.circle(x, 278, 9, 0xcbd5e1).setStrokeStyle(4, 0x1e293b);
      janela.add(lampada);
      const knob = this.add.image(x, yDoValor(c.valor), 'motor_botao_azul_v2');
      janela.add(knob);
      const area = this.add.rectangle(x, 150, 100, 230, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      janela.add(area);
      return { id: c.id, x, knob, lampada, area, dentro: false };
    });

    // ---- Stability bar.
    const medidor = this.add.graphics();
    raiz.add(medidor);
    raiz.add(texto(this, -228, 133, 'Engine', 16, '#ffffff', 0x1e293b));
    const pct = texto(this, 222, 133, '0%', 18, '#ffffff', 0x1e293b);
    raiz.add(pct);
    const desenharMedidor = () => {
      const q = estabilidade(estado);
      const cor = Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(251, 146, 60), new Phaser.Display.Color(34, 197, 94), 100, q * 100);
      medidor.clear();
      medidor.fillStyle(0xffffff, 1).fillRoundedRect(-190, 120, 380, 26, 13).lineStyle(4, 0x1e293b, 1).strokeRoundedRect(-190, 120, 380, 26, 13);
      if (q > 0.01) {
        medidor.fillStyle(Phaser.Display.Color.GetColor(cor.r, cor.g, cor.b), 1).fillRoundedRect(-187, 123, Math.max(20, 374 * q), 20, 10);
      }
      pct.setText(`${Math.round(q * 100)}%`);
    };
    desenharMedidor();

    // ---- Input and state.
    let arrastando: string | null = null;
    let acabou = false;
    let ultimaMsg = '';
    const dizer = (m: string, cor?: string) => { if (m !== ultimaMsg) { ultimaMsg = m; msg(m, cor); } };
    const yLocal = (p: Phaser.Input.Pointer) => (p.y - raiz.y) / s - JY;
    const mover = (p: Phaser.Input.Pointer) => {
      if (!arrastando || acabou) return;
      const antes = estado.controles.find((c) => c.id === arrastando)?.valor ?? 0;
      estado = moverControle(estado, arrastando, valorDoY(yLocal(p)));
      const depois = estado.controles.find((c) => c.id === arrastando)?.valor ?? 0;
      if (Math.round(antes * 10) !== Math.round(depois * 10)) tocarSfx('girar');
    };
    for (const a of alavancas) a.area.on('pointerdown', (p: Phaser.Input.Pointer) => { if (acabou) return; arrastando = a.id; tocarSfx('pegar'); mover(p); });
    const soltar = () => { arrastando = null; };
    this.input.on('pointermove', mover);
    this.input.on('pointerup', soltar);
    this.input.on('gameout', soltar);

    const vencer = () => {
      acabou = true; arrastando = null;
      msg('Engine steady!', '#86efac');
      const flash = this.add.rectangle(0, 0, JAN_W, JAN_H, 0xffffff, 0.6).setOrigin(0);
      janela.add(flash);
      this.tweens.add({ targets: flash, alpha: 0, duration: 900 });
      rajada(this, janela, 112, 150, [0xfde047, 0x86efac, 0x7dd3fc, 0xfdba74], 26, 170);
      const faixa = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-250, -58, 500, 116, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-250, -58, 500, 116, 40);
      const bloco = this.add.container(JAN_W / 2, JAN_H / 2, [
        faixa,
        texto(this, 0, -16, 'Engine steady!', 38, '#ffffff', 0x14532d),
        texto(this, 0, 28, 'The engine pushes gas backward, so the ship moves forward.', 14, '#dcfce7', 0x14532d),
      ]).setScale(0).setDepth(40);
      janela.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 450, delay: 250, ease: 'Back.easeOut' });
      this.time.delayedCall(2800, () => { this.scene.stop(); this.aoConcluir?.(); });
    };

    const aCadaQuadro = (t: number, delta: number) => {
      const dt = Math.min(0.05, delta / 1000);
      if (!acabou) estado = avancarEstabilidade(estado, dt);
      estado.controles.forEach((c, i) => {
        const a = alavancas[i];
        a.knob.y = yDoValor(c.valor);
        const dentro = controleNaZona(c);
        if (dentro !== a.dentro) {
          a.dentro = dentro;
          a.knob.setTexture(dentro ? 'motor_botao_verde_v2' : 'motor_botao_azul_v2');
          a.lampada.setFillStyle(dentro ? 0x4ade80 : 0xcbd5e1);
          if (dentro && !acabou) { tocarSfx('ok'); rajada(this, janela, a.x, a.knob.y, [0x86efac, 0xfde047, 0xffffff], 8, 40); this.tweens.add({ targets: a.knob, scaleX: 1.15, scaleY: 1.15, duration: 120, yoyo: true }); }
        }
      });
      const fora = 3 - controlesNaZona(estado);
      motor.x = 112 + (acabou ? 0 : (Math.random() - 0.5) * fora * 2.4);
      brilho.setAlpha(estabilidade(estado) * 0.3);
      desenharChama(t);
      desenharMedidor();
      if (acabou) return;
      if (motorAjustado(estado)) { vencer(); return; }
      if (todosNaZona(estado)) dizer('Hold it there, the engine is steadying!', '#86efac');
      else if (fora === 3) dizer(INSTRUCAO);
      else dizer(`Almost! ${fora} lever${fora > 1 ? 's are' : ' is'} still out of the zone.`, '#fde68a');
    };
    this.events.on('update', aCadaQuadro);
    this.events.once('shutdown', () => {
      this.events.off('update', aCadaQuadro);
      this.input.off('pointermove', mover); this.input.off('pointerup', soltar); this.input.off('gameout', soltar);
    });
  }
}
