// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Start the Reactor": switch on the pump, piping and generator in order, then HOLD the ignition until the charge fills.
// The rules live in ../reator-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { criarTarefaReator, ligarEmOrdem, proximoModulo, carregar, reatorOnline, type TarefaReator } from '../reator-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto } from './moldura';

const QUADRO_W = 760;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const FOLGA = (QUADRO_H - 500) / 2;   // the frame is taller than the layout was drawn for: centre the content
const JW = 680, JH = 376, JX = -JW / 2, JY = -QUADRO_H / 2 + 36 + FOLGA;
const NUCLEO = { x: 0, y: 62 };
const POS: Record<string, { x: number; y: number; nome: string }> = {
  bomba: { x: -235, y: -100, nome: '1  Pump' },
  tubulacao: { x: 0, y: -100, nome: '2  Piping' },
  gerador: { x: 235, y: -100, nome: '3  Generator' },
};
const INSTRUCAO = 'Switch them on in number order: start with the pump.';

type Icone = (c: CanvasRenderingContext2D, lig: boolean) => void;

export class ReatorTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('ReatorTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  private cartao(chave: string, lig: boolean, icone: Icone) {
    canvas(this, chave, 140, 140, (c) => {
      c.fillStyle = lig ? '#22c55e' : '#94a3b8'; c.beginPath(); c.roundRect(10, 10, 120, 120, 30); c.fill();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.stroke();
      c.save(); c.translate(70, 70); icone(c, lig); c.restore();
    });
  }

  private criarTexturas() {
    const traco = (c: CanvasRenderingContext2D, lig: boolean) => { c.fillStyle = lig ? '#f0fdf4' : '#e2e8f0'; c.strokeStyle = lig ? '#14532d' : '#1e293b'; c.lineWidth = 4; c.lineJoin = 'round'; };
    // Pump: a ring with an impeller.
    this.cartao('reator_bomba_off_v2', false, (c, l) => this.bomba(c, l, traco));
    this.cartao('reator_bomba_on_v2', true, (c, l) => this.bomba(c, l, traco));
    // Pipe with an elbow.
    this.cartao('reator_tubo_off_v2', false, (c, l) => this.tubo(c, l, traco));
    this.cartao('reator_tubo_on_v2', true, (c, l) => this.tubo(c, l, traco));
    // Generator: a cylinder with a lightning bolt.
    this.cartao('reator_gerador_off_v2', false, (c, l) => this.gerador(c, l, traco));
    this.cartao('reator_gerador_on_v2', true, (c, l) => this.gerador(c, l, traco));

    canvas(this, 'reator_janela_v2', JW, JH, (c) => {
      c.fillStyle = '#2563eb'; c.beginPath(); c.roundRect(0, 0, JW, JH, 22); c.fill();
      c.save(); c.beginPath(); c.roundRect(0, 0, JW, JH, 22); c.clip();
      c.fillStyle = '#1d4ed8'; c.fillRect(0, 0, JW, JH * 0.12); c.restore();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.beginPath(); c.roundRect(2.5, 2.5, JW - 5, JH - 5, 22); c.stroke();
    });
    // The reactor core: flat disc (tinted grey until powered).
    canvas(this, 'reator_nucleo_v2', 200, 200, (c) => {
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(100, 100, 90, 0, Math.PI * 2); c.fill();
      c.lineWidth = 6; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#e2e8f0'; c.beginPath(); c.arc(100, 100, 50, 0, Math.PI * 2); c.fill();
      c.lineWidth = 5; c.stroke();
    });
    canvas(this, 'reator_halo_v2', 300, 300, (c) => {
      c.fillStyle = '#fde047'; c.beginPath(); c.arc(150, 150, 140, 0, Math.PI * 2); c.fill();
    });
    // Ignition button (idle / pressed).
    for (const [chave, cor] of [['reator_botao_v2', '#ef4444'], ['reator_botao_ok_v2', '#22c55e']] as const) {
      canvas(this, chave, 120, 120, (c) => {
        c.fillStyle = cor; c.beginPath(); c.arc(60, 60, 48, 0, Math.PI * 2); c.fill();
        c.lineWidth = 6; c.strokeStyle = '#1e293b'; c.stroke();
        c.strokeStyle = '#fff'; c.lineWidth = 7; c.lineCap = 'round';
        c.beginPath(); c.arc(60, 66, 17, -Math.PI * 0.32, Math.PI * 1.32, false); c.stroke();
        c.beginPath(); c.moveTo(60, 42); c.lineTo(60, 64); c.stroke();
      });
    }
  }

  private bomba(c: CanvasRenderingContext2D, l: boolean, traco: (c: CanvasRenderingContext2D, l: boolean) => void) {
    traco(c, l);
    c.beginPath(); c.arc(0, 0, 34, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = l ? '#16a34a' : '#64748b';
    for (let i = 0; i < 4; i++) { c.save(); c.rotate(i * Math.PI / 2 + 0.3); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(26, -4, 26, 20); c.quadraticCurveTo(8, 16, 0, 0); c.fill(); c.stroke(); c.restore(); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2); c.fill(); c.stroke();
  }

  private tubo(c: CanvasRenderingContext2D, l: boolean, traco: (c: CanvasRenderingContext2D, l: boolean) => void) {
    traco(c, l);
    c.lineWidth = 26; c.lineCap = 'round'; c.strokeStyle = l ? '#14532d' : '#1e293b';
    c.beginPath(); c.moveTo(-34, 22); c.lineTo(-34, -14); c.quadraticCurveTo(-34, -30, -18, -30); c.lineTo(34, -30); c.stroke();
    c.lineWidth = 16; c.strokeStyle = l ? '#f0fdf4' : '#e2e8f0';
    c.beginPath(); c.moveTo(-34, 22); c.lineTo(-34, -14); c.quadraticCurveTo(-34, -30, -18, -30); c.lineTo(34, -30); c.stroke();
    c.lineWidth = 4; c.strokeStyle = l ? '#14532d' : '#1e293b';
    for (const x of [-34, 6]) { c.beginPath(); c.roundRect(x < 0 ? -48 : 0, x < 0 ? 4 : -44, x < 0 ? 28 : 12, x < 0 ? 12 : 28, 3); c.stroke(); }
  }

  private gerador(c: CanvasRenderingContext2D, l: boolean, traco: (c: CanvasRenderingContext2D, l: boolean) => void) {
    traco(c, l);
    c.beginPath(); c.roundRect(-34, -32, 68, 64, 14); c.fill(); c.stroke();
    c.fillStyle = l ? '#facc15' : '#94a3b8';
    c.beginPath(); c.moveTo(6, -26); c.lineTo(-18, 6); c.lineTo(-2, 6); c.lineTo(-8, 28); c.lineTo(18, -8); c.lineTo(2, -8); c.closePath(); c.fill(); c.stroke();
  }

  create() {
    let estado: TarefaReator = criarTarefaReator();
    this.criarTexturas();
    const { raiz } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Start the Reactor');
    const msg = barraStatus(this, raiz, QUADRO_H, INSTRUCAO);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    const rim = this.add.graphics();
    rim.lineStyle(5, 0x1e293b, 1).strokeRoundedRect(JX - 2, JY - 2, JW + 4, JH + 4, 24);
    raiz.add(rim);
    const janela = this.add.container(JX + JW / 2, JY + JH / 2);
    raiz.add(janela);
    janela.add(this.add.image(0, 0, 'reator_janela_v2'));

    // Pipes from each module to the core; they light up when the module is on.
    const canos = this.add.graphics();
    janela.add(canos);
    const desenharCanos = () => {
      canos.clear();
      for (const m of estado.modulos) {
        const p = POS[m.id];
        canos.lineStyle(20, 0x1e293b, 1).lineBetween(p.x, p.y, NUCLEO.x, NUCLEO.y);
        canos.lineStyle(11, m.ligado ? 0xfde047 : 0x94a3b8, 1).lineBetween(p.x, p.y, NUCLEO.x, NUCLEO.y);
      }
    };

    const halo = this.add.image(NUCLEO.x, NUCLEO.y, 'reator_halo_v2').setAlpha(0).setScale(1.1);
    const nucleo = this.add.image(NUCLEO.x, NUCLEO.y, 'reator_nucleo_v2').setScale(0.66).setTint(0x94a3b8);
    const anel = this.add.graphics();
    janela.add([halo, nucleo, anel]);
    desenharCanos();

    // The three modules, big and rounded; the next one pulses.
    const cartoes = estado.modulos.map((m) => {
      const p = POS[m.id];
      const chave = { bomba: 'reator_bomba', tubulacao: 'reator_tubo', gerador: 'reator_gerador' }[m.id]!;
      const img = this.add.image(0, 0, `${chave}_off_v2`).setScale(0.9);
      const rotulo = texto(this, 0, 76, p.nome, 17, '#ffffff', 0x1e293b);
      const c = this.add.container(p.x, p.y, [img, rotulo]).setSize(120, 120);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerover', () => c.setScale(1.06));
      c.on('pointerout', () => c.setScale(1));
      c.on('pointerup', () => {
        if (acabou) return;
        const novo = ligarEmOrdem(estado, m.id);
        if (novo === estado) {
          const prox = proximoModulo(estado);
          msg(prox ? `Easy! You still need to switch on: ${POS[prox].nome.slice(3)}.` : 'That one is already on.', '#fde68a');
          this.tweens.add({ targets: c, x: p.x + 8, yoyo: true, repeat: 2, duration: 50, onComplete: () => c.setX(p.x) });
          return;
        }
        estado = novo;
        img.setTexture(`${chave}_on_v2`);
        desenharCanos();
        rajada(this, janela, p.x, p.y, [0xfde047, 0x86efac, 0x7dd3fc], 12, 80);
        this.tweens.add({ targets: c, scale: { from: 1.25, to: 1 }, duration: 350, ease: 'Back.easeOut' });
        const prox = proximoModulo(estado);
        if (prox) msg(`Great job! Next: ${POS[prox].nome.slice(3)}.`, '#86efac');
        else { msg('Everything is on! Hold the ignition button.', '#86efac'); botao.setVisible(true); this.tweens.add({ targets: botao, scale: { from: 0, to: 1 }, duration: 400, ease: 'Back.easeOut' }); }
        pulsar();
      });
      janela.add(c);
      return { id: m.id, c };
    });
    let pulso: Phaser.Tweens.Tween | undefined;
    const pulsar = () => {
      pulso?.stop();
      for (const k of cartoes) k.c.setAlpha(1);
      const prox = proximoModulo(estado);
      const alvo = cartoes.find((k) => k.id === prox);
      if (alvo) pulso = this.tweens.add({ targets: alvo.c, alpha: { from: 1, to: 0.55 }, yoyo: true, repeat: -1, duration: 450 });
    };

    // Ignition button (hold).
    const botao = this.add.container(245, 88, [
      this.add.image(0, 0, 'reator_botao_v2').setScale(0.8),
      texto(this, 0, 52, 'IGNITION', 15, '#ffffff', 0x1e293b),
    ]).setSize(90, 90).setVisible(false);
    botao.setInteractive({ useHandCursor: true });
    janela.add(botao);
    let segurando = false;
    let acabou = false;
    const soltar = () => { segurando = false; };
    botao.on('pointerdown', () => { if (estado.modulos.every((m) => m.ligado) && !acabou) { segurando = true; botao.setScale(0.94); } });
    botao.on('pointerup', () => { soltar(); botao.setScale(1); });
    botao.on('pointerout', () => { soltar(); botao.setScale(1); });
    this.input.on('pointerup', soltar);
    this.input.on('gameout', soltar);
    pulsar();

    const vencer = () => {
      acabou = true; segurando = false;
      msg('Reactor on! Power is back.', '#86efac');
      nucleo.clearTint();
      halo.setAlpha(0.6);
      rajada(this, janela, NUCLEO.x, NUCLEO.y, [0xfde047, 0x86efac, 0x7dd3fc, 0xf9a8d4], 28, 190);
      const brilho = this.add.rectangle(0, 0, JW, JH, 0xffffff, 0.5);
      janela.add(brilho);
      this.tweens.add({ targets: brilho, alpha: 0, duration: 900 });
      const faixa = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-300, -60, 600, 120, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-300, -60, 600, 120, 40);
      const bloco = this.add.container(0, 0, [
        faixa,
        texto(this, 0, -22, 'Reactor on!', 38, '#ffffff', 0x1e293b),
        texto(this, 0, 26, 'On the Moon, night lasts about 14 days, so power has to be stored.', 14, '#dcfce7', 0x1e293b),
      ]).setScale(0).setDepth(40);
      janela.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 450, delay: 250, ease: 'Back.easeOut' });
      this.time.delayedCall(2800, () => { this.scene.stop(); this.aoConcluir?.(); });
    };

    let tempo = 0;
    const aCadaQuadro = (_t: number, delta: number) => {
      const dt = Math.min(0.05, delta / 1000);
      tempo += dt;
      if (acabou) { halo.setScale(1.1 + Math.sin(tempo * 4) * 0.05); return; }
      estado = carregar(estado, dt, segurando);
      const q = estado.carga;
      anel.clear();
      if (botao.visible) {
        anel.lineStyle(14, 0x1e293b, 1).strokeCircle(NUCLEO.x, NUCLEO.y, 74);
        if (q > 0) anel.lineStyle(10, 0xfde047, 1).beginPath().arc(NUCLEO.x, NUCLEO.y, 74, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * q).strokePath();
      }
      const lig = estado.modulos.filter((m) => m.ligado).length;
      const luz = Math.max(lig / 6, q);
      halo.setAlpha(luz * 0.5).setScale(1.1 + Math.sin(tempo * 8) * 0.04 * q);
      const t = Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(148, 163, 184), new Phaser.Display.Color(255, 255, 255), 100, Math.min(100, luz * 100));
      nucleo.setTint(Phaser.Display.Color.GetColor(t.r, t.g, t.b));
      if (reatorOnline(estado)) vencer();
    };
    this.events.on('update', aCadaQuadro);
    const limpar = () => { this.events.off('update', aCadaQuadro); this.input.off('pointerup', soltar); this.input.off('gameout', soltar); pulso?.stop(); };
    this.events.once('shutdown', limpar);
  }
}
