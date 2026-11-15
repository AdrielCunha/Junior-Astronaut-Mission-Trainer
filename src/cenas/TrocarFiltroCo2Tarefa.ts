// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Maintenance - CO₂ Filter": open the latches, drag the old filter to the bin, drag the new one into the slot.
// The rules live in ../trocar-filtro-co2-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import {
  criarTarefaFiltroCo2, abrirTrava, soltarFiltroVelho, soltarFiltroNovo, passarTempo, arSeguro, tarefaConcluida,
  type TarefaFiltroCo2, type Ponto,
} from '../trocar-filtro-co2-tarefa';
import { FONTE, abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto } from './moldura';
import { tocarSfx } from '../sfx';

const QUADRO_W = 760;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const FOLGA = (QUADRO_H - 500) / 2;   // the frame is taller than the layout was drawn for: centre the content
const FILTRO_W = 120;
const FILTRO_H = 170;

export class TrocarFiltroCo2Tarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('TrocarFiltroCo2Tarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  // A cartridge: flat colours, thick outline. `sujo` = saturated old filter.
  private desenharFiltro(c: CanvasRenderingContext2D, sujo: boolean) {
    c.lineJoin = 'round';
    c.fillStyle = sujo ? '#a8957c' : '#38bdf8'; c.beginPath(); c.roundRect(10, 14, 100, 142, 24); c.fill();
    c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.stroke();
    for (let y = 104; y <= 140; y += 12) { c.fillStyle = sujo ? '#7c6a55' : '#0284c7'; c.fillRect(18, y, 84, 4); }
    c.fillStyle = sujo ? '#d6d3d1' : '#e2e8f0'; c.beginPath(); c.roundRect(32, 2, 56, 20, 8); c.fill(); c.lineWidth = 3.5; c.stroke();
    c.fillStyle = sujo ? '#fef3c7' : '#ffffff'; c.beginPath(); c.roundRect(22, 40, 76, 44, 12); c.fill();
    c.lineWidth = 3; c.stroke();
    c.fillStyle = sujo ? '#b91c1c' : '#15803d'; c.font = `600 26px ${FONTE}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('CO₂', 60, 63);
    if (sujo) {
      for (const [x, y, r] of [[34, 112, 8], [80, 126, 7], [60, 100, 5], [90, 96, 6]] as const) {
        c.fillStyle = '#57483a'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      }
    }
  }

  private criarTexturas() {
    canvas(this, 'co2_filtro_velho_v2', FILTRO_W, FILTRO_H, (c) => this.desenharFiltro(c, true));
    canvas(this, 'co2_filtro_novo_v2', FILTRO_W, FILTRO_H, (c) => this.desenharFiltro(c, false));
    // The compartment: a flat steel recess with a dashed guide for the filter.
    canvas(this, 'co2_compartimento_v2', 240, 230, (c) => {
      c.fillStyle = '#94a3b8'; c.beginPath(); c.roundRect(10, 8, 220, 206, 26); c.fill();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#1e293b'; c.beginPath(); c.roundRect(60, 24, 120, 178, 22); c.fill();
      c.setLineDash([10, 8]); c.lineWidth = 3; c.strokeStyle = '#7dd3fc'; c.stroke(); c.setLineDash([]);
    });
    // Latch lever (hangs from its top end).
    canvas(this, 'co2_trava_v2', 40, 96, (c) => {
      c.fillStyle = '#facc15'; c.beginPath(); c.roundRect(6, 6, 28, 84, 12); c.fill();
      c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#1e293b'; for (let y = 50; y <= 78; y += 9) c.fillRect(11, y, 18, 3);
      c.fillStyle = '#e2e8f0'; c.beginPath(); c.arc(20, 20, 8, 0, Math.PI * 2); c.fill(); c.lineWidth = 3; c.stroke();
    });
    // The bin for the old filter.
    canvas(this, 'co2_lixo_v2', 170, 190, (c) => {
      c.fillStyle = '#3b82f6'; c.beginPath(); c.roundRect(14, 24, 142, 154, 26); c.fill();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#1e293b'; c.beginPath(); c.roundRect(34, 30, 102, 26, 13); c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = 7; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(60, 128); c.lineTo(85, 98); c.lineTo(110, 128); c.moveTo(85, 100); c.lineTo(85, 158); c.stroke();
    });
    // The shelf of the new filter.
    canvas(this, 'co2_prateleira_v2', 170, 190, (c) => {
      c.fillStyle = '#4ade80'; c.beginPath(); c.roundRect(14, 14, 142, 164, 26); c.fill();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#16a34a'; c.beginPath(); c.roundRect(24, 150, 122, 14, 7); c.fill();
      c.lineWidth = 3; c.stroke();
    });
    // Smoke puff for the dirty air: a flat grey circle.
    canvas(this, 'co2_fumaca_v2', 64, 64, (c) => {
      c.fillStyle = '#a8a29e'; c.beginPath(); c.arc(32, 32, 24, 0, Math.PI * 2); c.fill();
      c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.stroke();
    });
  }

  create() {
    let estado: TarefaFiltroCo2 = criarTarefaFiltroCo2();
    this.criarTexturas();
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Maintenance - CO₂ Filter');
    const msg = barraStatus(this, raiz, QUADRO_H, 'Press both yellow latches to release the filter.');
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    const { encaixe, lixo, prateleira } = estado;

    // ---- Scenery: bin, compartment, shelf.
    raiz.add(this.add.image(lixo.x, lixo.y, 'co2_lixo_v2'));
    raiz.add(this.add.image(prateleira.x, prateleira.y, 'co2_prateleira_v2'));
    raiz.add(this.add.image(encaixe.x, encaixe.y + 10, 'co2_compartimento_v2'));
    raiz.add(texto(this, lixo.x, lixo.y + 112, 'Trash', 18, '#ffffff', 0x1e293b));
    raiz.add(texto(this, prateleira.x, prateleira.y + 112, 'New filter', 18, '#ffffff', 0x1e293b));

    // Alarm lamp above the compartment: red and blinking until the air is safe.
    const lampada = this.add.circle(encaixe.x, encaixe.y - 128, 11, 0xef4444).setStrokeStyle(4, 0x1e293b);
    raiz.add(lampada);
    const piscar = this.tweens.add({ targets: lampada, alpha: 0.35, duration: 450, yoyo: true, repeat: -1 });

    // ---- Filters.
    const velho = this.add.image(encaixe.x, encaixe.y, 'co2_filtro_velho_v2').setDepth(5);
    const novo = this.add.image(prateleira.x, prateleira.y, 'co2_filtro_novo_v2').setDepth(5);
    raiz.add([velho, novo]);
    const flutuar = this.tweens.add({ targets: novo, y: prateleira.y - 5, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const destacar = (im: Phaser.GameObjects.Image) => {
      this.tweens.add({ targets: im, scale: 1.08, duration: 260, yoyo: true, repeat: 2 });
    };

    // ---- Latches: one on each side of the slot. Open = the lever swings outwards.
    const alavancas = [-1, 1].map((lado, i) => {
      const alavanca = this.add.image(encaixe.x + lado * 76, encaixe.y - 40, 'co2_trava_v2').setOrigin(0.5, 0.1).setDepth(8);
      const zona = this.add.zone(encaixe.x + lado * 76, encaixe.y, 70, 110).setInteractive({ useHandCursor: true });
      raiz.add([alavanca, zona]);
      const dica = this.tweens.add({ targets: alavanca, scale: 1.12, duration: 420, yoyo: true, repeat: -1 });
      zona.on('pointerdown', () => {
        const proximo = abrirTrava(estado, i);
        if (proximo === estado) return;
        estado = proximo; dica.stop();
        tocarSfx('clique');
        alavanca.setScale(1).setTint(0x86efac);
        this.tweens.add({ targets: alavanca, angle: lado * -85, duration: 280, ease: 'Back.easeOut' });
        rajada(this, raiz, alavanca.x, alavanca.y + 30, [0xfde047, 0x86efac], 6, 40);
        zona.disableInteractive();
        if (estado.fase === 'remover') { msg('Drag the old filter to the trash.'); destacar(velho); }
      });
      return alavanca;
    });

    // Dirty air: smoke puffs rising from the old filter while it is still in.
    const fumacas: Phaser.GameObjects.Image[] = [];
    const fumaTimer = this.time.addEvent({
      delay: 450, loop: true,
      callback: () => {
        if (estado.fase === 'respirando' || estado.fase === 'concluida' || fumacas.length > 8) return;
        const f = this.add.image(encaixe.x + Phaser.Math.Between(-30, 30), encaixe.y - 70, 'co2_fumaca_v2').setAlpha(0.7).setScale(0.6).setDepth(2);
        raiz.add(f); fumacas.push(f);
        this.tweens.add({
          targets: f, y: f.y - 55, alpha: 0, scale: 1.2, duration: 1600,
          onComplete: () => { fumacas.splice(fumacas.indexOf(f), 1); f.destroy(); },
        });
      },
    });

    // ---- CO2 meter: red (high) to green (safe).
    const medidor = this.add.graphics();
    raiz.add(medidor);
    raiz.add(texto(this, -222, 133, 'CO₂', 18, '#ffffff', 0x1e293b));
    const rotulo = texto(this, 245, 133, 'High', 18, '#fecaca', 0x1e293b);
    raiz.add(rotulo);
    const desenharMedidor = () => {
      const q = arSeguro(estado);
      const cor = q < 0.5
        ? Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(239, 68, 68), new Phaser.Display.Color(250, 204, 21), 100, q * 200)
        : Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(250, 204, 21), new Phaser.Display.Color(34, 197, 94), 100, (q - 0.5) * 200);
      medidor.clear();
      medidor.fillStyle(0xffffff, 1).fillRoundedRect(-190, 120, 380, 26, 13);
      const w = Math.max(20, 374 * (1 - q));   // the bar shows the CO2 level: it drains as the air gets safe
      medidor.fillStyle(Phaser.Display.Color.GetColor(cor.r, cor.g, cor.b), 1).fillRoundedRect(-187, 123, w, 20, 10);
      medidor.lineStyle(4, 0x1e293b, 1).strokeRoundedRect(-190, 120, 380, 26, 13);
      if (estado.fase === 'concluida') rotulo.setText('Safe').setColor('#bbf7d0');
      else if (estado.fase === 'respirando') rotulo.setText('Dropping').setColor('#fde68a');
      else rotulo.setText('High').setColor('#fecaca');
    };
    desenharMedidor();

    // ---- Dragging.
    let acabou = false;
    let arrastado: Phaser.GameObjects.Image | null = null;
    let deslocamento = { x: 0, y: 0 };
    const aoLocal = (p: Phaser.Input.Pointer): Ponto => ({ x: (p.x - raiz.x) / s, y: (p.y - raiz.y) / s });
    const pegar = (im: Phaser.GameObjects.Image, p: Phaser.Input.Pointer) => {
      const l = aoLocal(p);
      tocarSfx('pegar');
      arrastado = im; deslocamento = { x: im.x - l.x, y: im.y - l.y };
      this.tweens.killTweensOf(im);
      if (im === novo) flutuar.stop();
      im.setDepth(15).setScale(1.06);
    };
    const voltar = (im: Phaser.GameObjects.Image, alvo: Ponto) => {
      this.tweens.add({ targets: im, x: alvo.x, y: alvo.y, scale: 1, duration: 260, ease: 'Back.easeOut', onComplete: () => im.setDepth(5) });
    };

    velho.setInteractive({ useHandCursor: true });
    novo.setInteractive({ useHandCursor: true });
    velho.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (acabou) return;
      if (estado.fase === 'remover') pegar(velho, p);
      else if (estado.fase === 'travas') {
        msg('First release both yellow latches.', '#fde68a');
        this.tweens.add({ targets: velho, x: encaixe.x + 5, duration: 60, yoyo: true, repeat: 2, onComplete: () => velho.setX(encaixe.x) });
      }
    });
    novo.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (acabou) return;
      if (estado.fase === 'instalar') pegar(novo, p);
      else if (estado.fase === 'travas' || estado.fase === 'remover') {
        msg('Take out the old filter first.', '#fde68a');
        this.tweens.add({ targets: novo, angle: 6, duration: 70, yoyo: true, repeat: 2, onComplete: () => novo.setAngle(0) });
      }
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!arrastado) return;
      const l = aoLocal(p);
      arrastado.setPosition(l.x + deslocamento.x, l.y + deslocamento.y);
    });

    const vencer = () => {
      acabou = true; piscar.stop(); fumaTimer.remove();
      lampada.setFillStyle(0x22c55e).setAlpha(1).setStrokeStyle(4, 0x1e293b);
      msg('Clean air! CO₂ is back in the green.', '#86efac');
      rajada(this, raiz, encaixe.x, encaixe.y, [0xfde047, 0x86efac, 0x7dd3fc, 0xf9a8d4], 26, 190);
      const faixa = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-300, -62, 600, 124, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-300, -62, 600, 124, 40);
      const bloco = this.add.container(0, encaixe.y, [
        faixa,
        texto(this, 0, -26, 'Filter replaced!', 38, '#ffffff', 0x14532d),
        texto(this, 0, 12, 'On Apollo 13, the crew improvised a CO₂ filter', 15, '#dcfce7', 0x14532d),
        texto(this, 0, 34, 'with what they had onboard to keep breathing.', 15, '#dcfce7', 0x14532d),
      ]).setScale(0).setDepth(40);
      raiz.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 450, delay: 250, ease: 'Back.easeOut' });
      this.time.delayedCall(2800, () => { this.scene.stop(); this.aoConcluir?.(); });
    };

    this.input.on('pointerup', () => {
      const im = arrastado;
      arrastado = null;
      if (!im || acabou) return;
      const solto = { x: im.x, y: im.y };
      const antes = estado;
      if (im === velho) {
        estado = soltarFiltroVelho(estado, solto);
        if (estado === antes) { tocarSfx('soltar'); voltar(velho, encaixe); msg('The trash goes on the left. Try again!', '#fde68a'); return; }
        this.tweens.add({ targets: velho, x: lixo.x, y: lixo.y - 40, scale: 0.35, alpha: 0, duration: 380, ease: 'Cubic.easeIn' });
        tocarSfx('soltar');
        rajada(this, raiz, lixo.x, lixo.y - 30, [0x93c5fd, 0xe0f2fe], 8, 60);
        msg('Now drag the new filter into the slot.'); destacar(novo);
        return;
      }
      estado = soltarFiltroNovo(estado, solto);
      if (estado.fase !== 'respirando') {
        tocarSfx('soltar');
        voltar(novo, prateleira);
        if (estado !== antes) msg('That is not the right fit. Try the center opening.', '#fde68a');
        return;
      }
      this.tweens.add({ targets: novo, x: encaixe.x, y: encaixe.y, scale: 1, duration: 200, ease: 'Back.easeOut', onComplete: () => novo.setDepth(5) });
      tocarSfx('encaixe');
      rajada(this, raiz, encaixe.x, encaixe.y, [0xfde047, 0x7dd3fc, 0x86efac], 12, 90);
      alavancas.forEach((a) => this.tweens.add({ targets: a, angle: 0, duration: 300, ease: 'Back.easeOut' }));
      msg('Installed! CO₂ is dropping...', '#86efac');
      desenharMedidor();
    });

    const aCadaQuadro = (_t: number, delta: number) => {
      if (acabou || estado.fase !== 'respirando') return;
      estado = passarTempo(estado, Math.min(0.05, delta / 1000));
      desenharMedidor();
      if (tarefaConcluida(estado)) vencer();
    };
    this.events.on('update', aCadaQuadro);
    this.events.once('shutdown', () => this.events.off('update', aCadaQuadro));
  }
}
