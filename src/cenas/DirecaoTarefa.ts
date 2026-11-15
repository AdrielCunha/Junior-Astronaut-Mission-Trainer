// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Navigation - Direction": drag around the compass to turn the rocket towards North, East and South, holding each one.
// The rules live in ../direcao-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { criarRumo, apontarPara, avancarRumo, alvoAtual, rumoConcluido, rumoNoAlvo, progressoDoAlvo, type TarefaRumo } from '../direcao-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto } from './moldura';
import { tocarSfx } from '../sfx';
import { idioma } from '../idioma';

const QUADRO_W = 760;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const FOLGA = (QUADRO_H - 500) / 2;   // the frame is taller than the layout was drawn for: centre the content
const JAN_W = 640;
const JAN_H = 300;
const CX = 190, CY = 158;      // compass centre in the window
const RAIO = 118;              // radius of the ring (the marker sits on it)
const VEL_GIRO = 420;          // degrees per second the rocket turns towards the pointer
const INSTRUCAO = 'Drag around the compass to turn the rocket.';
const rad = (g: number) => (g * Math.PI) / 180;

export class DirecaoTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('DirecaoTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  private criarTexturas() {
    // Flat blue screen with a slightly darker top band and a few stars.
    canvas(this, 'direcao_fundo_v2', JAN_W, JAN_H, (c) => {
      c.save(); c.beginPath(); c.roundRect(0, 0, JAN_W, JAN_H, 18); c.clip();
      c.fillStyle = '#2563eb'; c.fillRect(0, 0, JAN_W, JAN_H);
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 0, JAN_W, JAN_H * 0.2);
      for (let i = 0; i < 50; i++) {
        const x = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * JAN_W, y = (Math.sin(i * 78.233) * 12543.123 % 1 + 1) % 1 * JAN_H;
        c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(x, y, 1.2 + (i % 3) * 0.6, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    });
    // The compass: flat ring with ticks and the four letters (N, E, S, W).
    canvas(this, `direcao_bussola_v2_${idioma}`, 280, 280, (c) => {
      c.translate(140, 140);
      c.fillStyle = '#e2e8f0'; c.beginPath(); c.arc(0, 0, 130, 0, Math.PI * 2); c.fill();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#1e40af'; c.beginPath(); c.arc(0, 0, 108, 0, Math.PI * 2); c.fill();
      c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.stroke();
      c.lineCap = 'round';
      for (let a = 0; a < 360; a += 15) {
        const grande = a % 90 === 0, medio = a % 45 === 0;
        const r1 = 106, r2 = grande ? 92 : medio ? 97 : 100;
        c.lineWidth = grande ? 4 : 2.5; c.strokeStyle = '#ffffff';
        c.beginPath(); c.moveTo(Math.sin(rad(a)) * r1, -Math.cos(rad(a)) * r1); c.lineTo(Math.sin(rad(a)) * r2, -Math.cos(rad(a)) * r2); c.stroke();
      }
      c.font = '600 26px "Fredoka", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      const letras: [string, number, string][] = [['N', 0, '#fca5a5'], [idioma === 'pt' ? 'L' : 'E', 90, '#ffffff'], ['S', 180, '#ffffff'], [idioma === 'pt' ? 'O' : 'W', 270, '#ffffff']];
      for (const [l, a, cor] of letras) {
        const x = Math.sin(rad(a)) * 74, y = -Math.cos(rad(a)) * 74;
        c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.strokeText(l, x, y); c.fillStyle = cor; c.fillText(l, x, y);
      }
    });
    // The rocket, pointing up (2x): flat colours, thick outline.
    canvas(this, 'direcao_nave_v2', 100, 180, (c) => {
      c.scale(2, 2); c.lineJoin = 'round'; c.lineWidth = 3.5; c.strokeStyle = '#1e293b';
      const asa = (sx: number) => {
        c.fillStyle = '#ef4444'; c.beginPath(); c.moveTo(25 + sx * 8, 52); c.lineTo(25 + sx * 24, 78); c.lineTo(25 + sx * 24, 86); c.lineTo(25 + sx * 8, 76); c.closePath(); c.fill(); c.stroke();
      };
      asa(-1); asa(1);
      c.fillStyle = '#475569'; c.beginPath(); c.roundRect(15, 80, 20, 7, 3); c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(25, 2); c.quadraticCurveTo(44, 26, 40, 80); c.lineTo(10, 80); c.quadraticCurveTo(6, 26, 25, 2); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ef4444'; c.beginPath(); c.moveTo(25, 2); c.quadraticCurveTo(35, 12, 37, 26); c.lineTo(13, 26); c.quadraticCurveTo(15, 12, 25, 2); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#38bdf8'; c.beginPath(); c.arc(25, 48, 8, 0, Math.PI * 2); c.fill(); c.stroke();
    });
  }

  create() {
    let estado: TarefaRumo = criarRumo();
    this.criarTexturas();
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Navigation - Direction');
    const msg = barraStatus(this, raiz, QUADRO_H, INSTRUCAO);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    // ---- The window.
    const JX = -JAN_W / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    const rim = this.add.graphics();
    rim.lineStyle(5, 0x1e293b, 1).strokeRoundedRect(JX, JY, JAN_W, JAN_H, 18);
    raiz.add(janela);
    raiz.add(rim);
    janela.add(this.add.image(0, 0, 'direcao_fundo_v2').setOrigin(0));
    janela.add(this.add.image(CX, CY, `direcao_bussola_v2_${idioma}`));

    // The lock ring (fills while the heading is held), the rocket, and the marker for the target heading.
    const anel = this.add.graphics();
    janela.add(anel);
    const sombraNave = this.add.image(CX, CY, 'direcao_nave_v2').setScale(0.62).setVisible(false);   // flat look: no drop shadow
    const nave = this.add.image(CX, CY, 'direcao_nave_v2').setScale(0.62);
    janela.add([sombraNave, nave]);
    const marcador = this.add.container(0, 0, [
      this.add.triangle(0, 0, 0, 14, 16, -10, -16, -10, 0xfacc15).setStrokeStyle(4, 0x1e293b),
    ]);
    janela.add(marcador);
    this.tweens.add({ targets: marcador, scale: 1.25, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // The right panel: which heading is next.
    const pedido = texto(this, 500, 100, 'Point the rocket to', 18, '#ffffff', 0x1e293b);
    const nomeAlvo = texto(this, 500, 152, 'NORTH', 46, '#fde047', 0x1e293b);
    const dica = texto(this, 500, 210, 'Hold it until it locks!', 16, '#e0f2fe', 0x1e293b);
    janela.add([pedido, nomeAlvo, dica]);

    // The three headings under the window: grey, yellow (now), green (done).
    const fichas = this.add.graphics();
    raiz.add(fichas);
    const nomes = estado.alvos.map((a, i) => { const t = texto(this, (i - 1) * 130, 133, a.nome, 16, '#ffffff', 0x1e293b); raiz.add(t); return t; });
    const desenharFichas = () => {
      fichas.clear();
      estado.alvos.forEach((a, i) => {
        const feito = i < estado.indice, agora = i === estado.indice;
        const x = (i - 1) * 130 - 55;
        fichas.fillStyle(0x1e293b, 1).fillRoundedRect(x, 117, 110, 32, 16);
        fichas.fillStyle(feito ? 0x22c55e : agora ? 0xfacc15 : 0x64748b, 1).fillRoundedRect(x + 3, 120, 104, 26, 13);
        nomes[i].setText(feito ? `${a.nome} ✓` : a.nome).setColor(agora ? '#422006' : '#ffffff').setStroke(agora ? '#fef9c3' : '#1e293b', 4);
      });
    };

    const posicionarAlvo = () => {
      const a = alvoAtual(estado);
      marcador.setVisible(!!a);
      if (!a) return;
      marcador.setPosition(CX + Math.sin(rad(a.angulo)) * (RAIO + 8), CY - Math.cos(rad(a.angulo)) * (RAIO + 8)).setRotation(rad(a.angulo));
      nomeAlvo.setText(a.nome.toUpperCase());
    };
    posicionarAlvo();
    desenharFichas();

    // ---- Input and state.
    let arrastando = false;
    let desejado = estado.rumo;       // where the pointer says to point
    let acabou = false;
    let ultimaMsg = '';
    const dizer = (m: string, cor?: string) => { if (m !== ultimaMsg) { ultimaMsg = m; msg(m, cor); } };
    const mover = (p: Phaser.Input.Pointer) => {
      if (!arrastando || acabou) return;
      const dx = (p.x - raiz.x) / s - JX - CX, dy = (p.y - raiz.y) / s - JY - CY;
      if (Math.hypot(dx, dy) < 18) return;
      desejado = (Math.atan2(dx, -dy) * 180) / Math.PI;
    };
    const fundo = this.add.rectangle(0, 0, JAN_W, JAN_H, 0xffffff, 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
    janela.add(fundo);
    fundo.on('pointerdown', (p: Phaser.Input.Pointer) => { if (!acabou) { arrastando = true; tocarSfx('pegar'); mover(p); } });
    const soltar = () => { if (arrastando) tocarSfx('soltar'); arrastando = false; };
    this.input.on('pointermove', mover);
    this.input.on('pointerup', soltar);
    this.input.on('gameout', soltar);

    const vencer = () => {
      acabou = true; arrastando = false;
      msg('Right heading! Direction steady.', '#86efac');
      anel.clear();
      marcador.setVisible(false);
      pedido.setVisible(false); nomeAlvo.setVisible(false); dica.setVisible(false);
      const flash = this.add.rectangle(0, 0, JAN_W, JAN_H, 0xffffff, 0.6).setOrigin(0);
      janela.add(flash);
      this.tweens.add({ targets: flash, alpha: 0, duration: 900 });
      rajada(this, janela, CX, CY, [0xfde047, 0x86efac, 0x7dd3fc, 0xf9a8d4], 26, 170);
      const faixa = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-250, -58, 500, 116, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-250, -58, 500, 116, 40);
      const bloco = this.add.container(JAN_W / 2, JAN_H / 2, [
        faixa,
        texto(this, 0, -16, 'Right heading!', 38, '#ffffff', 0x14532d),
        texto(this, 0, 28, 'A compass does not work on the Moon!', 14, '#dcfce7', 0x14532d),
      ]).setScale(0).setDepth(40);
      janela.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 450, delay: 250, ease: 'Back.easeOut' });
      this.time.delayedCall(2800, () => { this.scene.stop(); this.aoConcluir?.(); });
    };

    const aCadaQuadro = (_t: number, delta: number) => {
      const dt = Math.min(0.05, delta / 1000);
      if (!acabou) {
        // The rocket turns by the shortest way, at a limited speed, so it feels heavy but not slow.
        const dif = Phaser.Math.Angle.WrapDegrees(desejado - estado.rumo);
        const passo = Math.sign(dif) * Math.min(Math.abs(dif), VEL_GIRO * dt);
        const passoAntes = Math.floor(estado.rumo / 15);
        estado = apontarPara(estado, estado.rumo + passo);
        if (Math.floor(estado.rumo / 15) !== passoAntes) tocarSfx('girar');
        const antes = estado.indice;
        estado = avancarRumo(estado, dt);
        if (estado.indice !== antes) {
          const a = estado.alvos[antes];
          tocarSfx('encaixe');
          rajada(this, janela, CX + Math.sin(rad(a.angulo)) * RAIO, CY - Math.cos(rad(a.angulo)) * RAIO, [0xfde047, 0x86efac, 0xffffff], 14, 80);
          desenharFichas();
          if (rumoConcluido(estado)) { vencer(); return; }
          posicionarAlvo();
          dizer(`${a.nome} locked! Now ${estado.alvos[estado.indice].nome}.`, '#86efac');
        } else if (rumoNoAlvo(estado)) dizer('Hold it there...', '#fde68a');
        else dizer(INSTRUCAO);
      }
      nave.rotation = rad(estado.rumo);
      sombraNave.rotation = nave.rotation;
      anel.clear();
      const p = progressoDoAlvo(estado);
      if (!acabou && p > 0) {
        anel.lineStyle(10, 0x22c55e, 1).beginPath().arc(CX, CY, RAIO + 8, rad(-90), rad(-90 + 360 * p), false).strokePath();
      }
    };
    this.events.on('update', aCadaQuadro);
    this.events.once('shutdown', () => {
      this.events.off('update', aCadaQuadro);
      this.input.off('pointermove', mover); this.input.off('pointerup', soltar); this.input.off('gameout', soltar);
    });
  }
}
