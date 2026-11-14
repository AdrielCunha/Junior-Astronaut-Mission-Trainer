// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Transfer Data": aim the antenna dish at Earth (it drifts) and hold the signal while the data blocks are sent.
// The rules live in ../transferir-dados-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import {
  criarTransferenciaAntena, avancarTransferencia, posicaoDaTerra, forcaDoSinal, sinalBom, blocosEnviados, transferenciaConcluida,
  type TransferenciaAntena,
} from '../transferir-dados-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto } from './moldura';

const QUADRO_W = 704;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const FOLGA = (QUADRO_H - 456) / 2;   // the frame is taller than the layout was drawn for: centre the content
const INSTRUCAO = 'Drag to aim the antenna at Earth and hold the signal.';
const CORES = [['#fdba74', '#f97316', '#c2410c'], ['#93c5fd', '#3b82f6', '#1d4ed8'], ['#f9a8d4', '#ec4899', '#be185d'], ['#bef264', '#84cc16', '#4d7c0f']];
const LETRAS = ['A', 'B', 'C', 'D'];
const ANG_MIN = -1.5, ANG_MAX = 0.25;

export class TransferirDadosTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('TransferirDadosTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  private criarTexturas(t: TransferenciaAntena) {
    // Flat blue screen (darker top band, stars) with flat grey lunar ground and outlined craters.
    canvas(this, 'antena_fundo_v2', t.largura, t.altura, (c) => {
      c.fillStyle = '#2563eb'; c.fillRect(0, 0, t.largura, t.altura);
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 0, t.largura, t.altura * 0.2);
      for (let i = 0; i < 60; i++) {
        const px = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * t.largura;
        const py = (Math.sin(i * 78.233) * 24634.6345 % 1 + 1) % 1 * (t.altura - 60);
        c.fillStyle = 'rgba(255,255,255,0.8)';
        c.beginPath(); c.arc(px, py, i % 8 === 0 ? 2.2 : 1.4, 0, Math.PI * 2); c.fill();
      }
      c.lineJoin = 'round'; c.lineWidth = 5; c.strokeStyle = '#1e293b';
      c.fillStyle = '#cbd5e1'; c.beginPath();
      c.moveTo(0, t.altura - 40); c.quadraticCurveTo(160, t.altura - 78, 320, t.altura - 50); c.quadraticCurveTo(480, t.altura - 28, t.largura, t.altura - 58);
      c.lineTo(t.largura, t.altura); c.lineTo(0, t.altura); c.closePath(); c.fill(); c.stroke();
      for (const [cx, cy, r] of [[250, 318, 22], [380, 326, 16], [470, 306, 12], [560, 322, 20], [40, 330, 14]]) {
        c.fillStyle = '#94a3b8'; c.beginPath(); c.ellipse(cx, cy, r, r * 0.35, 0, 0, Math.PI * 2); c.fill();
        c.lineWidth = 2.5; c.stroke();
      }
    });
    // Earth (2x): flat ocean, continents and clouds, thick outline.
    canvas(this, 'antena_terra_v2', 220, 220, (c) => {
      c.translate(110, 110);
      c.save(); c.beginPath(); c.arc(0, 0, 84, 0, Math.PI * 2); c.clip();
      c.fillStyle = '#38bdf8'; c.fillRect(-90, -90, 180, 180);
      c.fillStyle = '#4ade80';
      c.beginPath(); c.ellipse(-26, -22, 30, 22, -0.5, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(34, 10, 24, 34, 0.4, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(-30, 44, 18, 14, 0.2, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffffff';
      for (const [x, y, rx, ry] of [[-6, -52, 28, 7], [22, 48, 22, 6], [-56, 8, 16, 6]]) { c.beginPath(); c.ellipse(x, y, rx, ry, -0.15, 0, Math.PI * 2); c.fill(); }
      c.restore();
      c.lineWidth = 6; c.strokeStyle = '#1e293b'; c.beginPath(); c.arc(0, 0, 84, 0, Math.PI * 2); c.stroke();
    });
    // The dish (2x), pivot in the middle, pointing to the right (angle 0): a bowl and a feed horn.
    canvas(this, 'antena_prato_v2', 240, 240, (c) => {
      c.translate(120, 120); c.scale(2, 2);
      c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 3.5; c.strokeStyle = '#1e293b';
      c.beginPath(); c.moveTo(-14, 0); c.lineTo(34, 0); c.lineWidth = 6; c.stroke();
      c.lineWidth = 3.5;
      c.fillStyle = '#e2e8f0'; c.beginPath(); c.moveTo(-6, -50); c.quadraticCurveTo(-52, 0, -6, 50); c.quadraticCurveTo(-24, 0, -6, -50); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ef4444'; c.beginPath(); c.arc(36, 0, 7, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#64748b'; c.beginPath(); c.arc(0, 0, 10, 0, Math.PI * 2); c.fill(); c.stroke();
    });
    // Base of the antenna: a flat metal tower with a footing.
    canvas(this, 'antena_torre_v2', 80, 90, (c) => {
      c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = '#1e293b';
      c.fillStyle = '#94a3b8'; c.beginPath(); c.moveTo(28, 6); c.lineTo(52, 6); c.lineTo(62, 78); c.lineTo(18, 78); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#64748b'; c.beginPath(); c.roundRect(6, 70, 68, 16, 7); c.fill(); c.stroke();
    });
    // Data blocks, one colour each (2x), with a letter.
    CORES.forEach(([, medio], i) => canvas(this, `antena_pacote${i}_v2`, 112, 112, (c) => {
      c.translate(56, 56);
      c.fillStyle = medio; c.beginPath(); c.roundRect(-36, -36, 72, 72, 18); c.fill();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#ffffff'; c.font = '600 40px "Fredoka", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.lineWidth = 6; c.strokeStyle = '#1e293b'; c.strokeText(LETRAS[i], 0, 3); c.fillText(LETRAS[i], 0, 3);
    }));
  }

  create() {
    let estado: TransferenciaAntena = criarTransferenciaAntena();
    this.criarTexturas(estado);
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Communications - Transfer Data');
    const msg = barraStatus(this, raiz, QUADRO_H, INSTRUCAO);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    // ---- The window.
    const JX = -estado.largura / 2, JY = -QUADRO_H / 2 + 36 + FOLGA;
    const rim = this.add.graphics();
    rim.lineStyle(5, 0x1e293b, 1).strokeRoundedRect(JX, JY, estado.largura, estado.altura, 18);
    const janela = this.add.container(JX, JY);
    raiz.add(janela);
    raiz.add(rim);
    const mascara = this.make.graphics({}, false);
    mascara.fillStyle(0xffffff).fillRoundedRect(raiz.x + JX * s, raiz.y + JY * s, estado.largura * s, estado.altura * s, 18 * s);
    janela.setMask(mascara.createGeometryMask());
    this.events.once('shutdown', () => mascara.destroy());
    janela.add(this.add.image(0, 0, 'antena_fundo_v2').setOrigin(0));

    const { antena } = estado;
    const feixe = this.add.graphics();
    janela.add(feixe);
    const terra = this.add.image(estado.terra.x, 150, 'antena_terra_v2').setScale(0.5);
    const alvo = this.add.graphics();
    janela.add([alvo, terra]);
    janela.add(texto(this, estado.terra.x, estado.terra.yMax + 66, 'Earth', 16, '#ffffff', 0x1e293b));
    janela.add(this.add.image(antena.x, antena.y + 12, 'antena_torre_v2'));
    const prato = this.add.image(antena.x, antena.y - 8, 'antena_prato_v2').setScale(0.5);
    janela.add(prato);
    janela.add(texto(this, antena.x + 6, estado.altura - 14, 'Moon base', 15, '#ffffff', 0x1e293b));

    // ---- HUD in the window: data slots (top left), signal bars (top right), transfer bar (bottom right).
    const hud = this.add.graphics();
    janela.add(hud);
    janela.add(texto(this, 56, 18, 'Data', 16, '#ffffff', 0x1e293b));
    const vagas = CORES.map((_, i) => {
      const im = this.add.image(26 + i * 40, 52, `antena_pacote${i}_v2`).setScale(0.3);
      const marca = texto(this, 26 + i * 40, 52, '✔', 22, '#ffffff', 0x1e293b).setVisible(false);
      janela.add([im, marca]);
      return { im, marca };
    });
    janela.add(texto(this, estado.largura - 74, 18, 'Signal', 16, '#ffffff', 0x1e293b));
    janela.add(texto(this, estado.largura - 150, estado.altura - 20, 'Sent', 15, '#ffffff', 0x1e293b));

    const desenharHud = (forca: number) => {
      hud.clear();
      // signal bars
      for (let i = 0; i < 5; i++) {
        const acesa = forca > (i + 0.5) / 5 * 0.95;
        const cor = i < 2 ? 0xef4444 : i < 4 ? 0xfacc15 : 0x22c55e;
        hud.fillStyle(0x1e293b, 1).fillRoundedRect(estado.largura - 120 + i * 18, 40 - i * 4 - 6, 14, 14 + i * 4, 4);
        if (acesa) hud.fillStyle(cor, 1).fillRoundedRect(estado.largura - 119 + i * 18, 40 - i * 4 - 5, 12, 12 + i * 4, 3);
      }
      // transfer bar
      hud.fillStyle(0x1e293b, 1).fillRoundedRect(estado.largura - 116, estado.altura - 32, 100, 20, 10);
      if (estado.progresso > 0.01) {
        const w = Math.max(14, 94 * estado.progresso);
        hud.fillStyle(0x22c55e, 1).fillRoundedRect(estado.largura - 113, estado.altura - 29, w, 14, 7);
      }
    };

    // ---- Input and state.
    let arrastando = false;
    let angAlvo = -0.9;
    let ang = -0.9;
    let tempo = 0;
    let acabou = false;
    let enviadosAntes = 0;
    let avisou = false;
    let tinhaSinal = false;
    const local = (p: Phaser.Input.Pointer) => ({ x: (p.x - raiz.x) / s - JX, y: (p.y - raiz.y) / s - JY });
    const dentro = (p: Phaser.Input.Pointer) => {
      const l = local(p);
      return l.x >= 0 && l.y >= 0 && l.x <= estado.largura && l.y <= estado.altura;
    };
    const apontar = (p: Phaser.Input.Pointer) => {
      const l = local(p);
      angAlvo = Phaser.Math.Clamp(Math.atan2(l.y - (antena.y - 8), l.x - antena.x), ANG_MIN, ANG_MAX);
    };
    const aoPressionar = (p: Phaser.Input.Pointer) => { if (dentro(p) && !acabou) { arrastando = true; apontar(p); } };
    const aoMover = (p: Phaser.Input.Pointer) => { if (arrastando && !acabou) apontar(p); };
    const aoSoltar = () => { arrastando = false; };
    this.input.on('pointerdown', aoPressionar);
    this.input.on('pointermove', aoMover);
    this.input.on('pointerup', aoSoltar);
    this.input.on('gameout', aoSoltar);

    const pontaDoPrato = () => ({ x: antena.x + Math.cos(ang) * 38, y: antena.y - 8 + Math.sin(ang) * 38 });

    const enviarPacote = (i: number) => {
      const ini = pontaDoPrato();
      const p = this.add.image(ini.x, ini.y, `antena_pacote${i}_v2`).setScale(0.22).setDepth(25);
      janela.add(p);
      const marcador = { v: 0 };
      this.tweens.add({
        targets: marcador, v: 1, duration: 900, ease: 'Sine.easeIn',
        onUpdate: () => {
          const fim = posicaoDaTerra(estado, tempo);
          p.setPosition(Phaser.Math.Linear(ini.x, fim.x, marcador.v), Phaser.Math.Linear(ini.y, fim.y, marcador.v));
          p.setScale(0.22 * (1 - marcador.v * 0.7)).setAngle(marcador.v * 360);
        },
        onComplete: () => {
          const fim = posicaoDaTerra(estado, tempo);
          rajada(this, janela, fim.x, fim.y, [0xfde047, 0x7dd3fc, 0xf9a8d4], 8, 50);
          this.tweens.add({ targets: terra, scale: 0.58, yoyo: true, duration: 140 });
          p.destroy();
        },
      });
      vagas[i].im.setTint(0x94a3b8).setAlpha(0.6); vagas[i].marca.setVisible(true);
    };

    const vencer = () => {
      acabou = true; arrastando = false;
      msg('Transfer complete!', '#86efac');
      const brilho = this.add.rectangle(0, 0, estado.largura, estado.altura, 0xffffff, 0.5).setOrigin(0);
      janela.add(brilho);
      this.tweens.add({ targets: brilho, alpha: 0, duration: 900 });
      this.time.delayedCall(950, () => rajada(this, janela, estado.terra.x, posicaoDaTerra(estado, tempo).y, [0xfde047, 0x86efac, 0x7dd3fc, 0xf9a8d4], 26, 170));
      const faixa = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-270, -58, 540, 116, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-270, -58, 540, 116, 40);
      const bloco = this.add.container(estado.largura / 2, estado.altura / 2 - 20, [
        faixa,
        texto(this, 0, -16, 'Data sent!', 38, '#ffffff', 0x14532d),
        texto(this, 0, 28, 'Radio waves carry messages from the ship to Earth.', 15, '#dcfce7', 0x14532d),
      ]).setScale(0).setDepth(40);
      janela.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 450, delay: 1100, ease: 'Back.easeOut' });
      this.time.delayedCall(3500, () => { this.scene.stop(); this.aoConcluir?.(); });
    };

    const aCadaQuadro = (_t: number, delta: number) => {
      const dt = Math.min(0.05, delta / 1000);
      tempo += dt;
      ang = Phaser.Math.Angle.RotateTo(ang, angAlvo, 2.6 * dt);
      prato.rotation = ang;
      const pos = posicaoDaTerra(estado, tempo);
      terra.setPosition(pos.x, pos.y);
      const bom = sinalBom(estado, ang, tempo);
      if (!acabou) {
        const novo = avancarTransferencia(estado, dt, ang, tempo);
        if (novo !== estado) {
          estado = novo;
          for (let i = enviadosAntes; i < blocosEnviados(estado); i++) enviarPacote(i);
          enviadosAntes = blocosEnviados(estado);
        }
        if (transferenciaConcluida(estado)) vencer();
        else if (bom !== tinhaSinal || !avisou) {
          avisou = true; tinhaSinal = bom;
          if (bom) msg('Strong signal! Hold it there.', '#86efac');
          else if (estado.progresso > 0) msg('Signal lost! Aim at Earth again.', '#fde68a');
        }
      }
      // beam: a cone whose half-angle is the tolerance, so the child sees how close is close enough
      const ox = antena.x + Math.cos(ang) * 38, oy = antena.y - 8 + Math.sin(ang) * 38;
      const comp = 520, tol = estado.tolerancia;
      feixe.clear();
      feixe.fillStyle(bom ? 0x4ade80 : 0xbae6fd, bom ? 0.4 : 0.3);
      feixe.fillTriangle(ox, oy, ox + Math.cos(ang - tol) * comp, oy + Math.sin(ang - tol) * comp, ox + Math.cos(ang + tol) * comp, oy + Math.sin(ang + tol) * comp);
      feixe.lineStyle(2, bom ? 0xbbf7d0 : 0xe0f2fe, 0.8);
      for (let d = (tempo * 140) % 40; d < 440; d += 40) feixe.strokeCircle(ox + Math.cos(ang) * d, oy + Math.sin(ang) * d, 2 + d / 60);
      alvo.clear();
      alvo.lineStyle(4, bom ? 0x4ade80 : 0xffffff, bom ? 0.95 : 0.45).strokeCircle(pos.x, pos.y, 54 + (bom ? Math.sin(tempo * 8) * 3 : 0));
      desenharHud(forcaDoSinal(estado, ang, tempo));
    };
    this.events.on('update', aCadaQuadro);
    this.events.once('shutdown', () => {
      this.events.off('update', aCadaQuadro);
      this.input.off('pointerdown', aoPressionar);
      this.input.off('pointermove', aoMover);
      this.input.off('pointerup', aoSoltar);
      this.input.off('gameout', aoSoltar);
    });
  }
}
