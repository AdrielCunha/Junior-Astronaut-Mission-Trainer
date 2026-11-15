// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Energy - Follow the Sun": the Sun slides across the sky; drag to keep the panel facing it until the battery fills.
// The rules live in ../seguir-sol-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { criarSeguirSol, passo, girarPainel, alinhado, tarefaConcluida, ANGULO_MAX, type EstadoSeguirSol } from '../seguir-sol-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, texto, vitoria } from './moldura';
import { texturasPaineis, PAINEL } from './PaineisSolaresTarefa';

const { JANELA_W, JANELA_H, PIVO_Y, PLACA_Y, QUADRO_W, QUADRO_H, FOLGA } = PAINEL;
const CX = JANELA_W / 2, RX = 240, RY = 190;   // the Sun's arc around the panel
const rad = (g: number) => (g * Math.PI) / 180;

export class SeguirSolTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;
  private estado!: EstadoSeguirSol;
  private acabou = false;
  private desenhar?: () => void;

  constructor() { super('SeguirSolTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  create() {
    this.estado = criarSeguirSol(Math.floor(Math.random() * 100000));
    this.acabou = false;
    texturasPaineis(this);
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Follow the Sun');
    const msg = barraStatus(this, raiz, QUADRO_H, 'Drag to turn the panel toward the Sun.');
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    const JX = -JANELA_W / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    raiz.add(janela);
    janela.add(this.add.image(0, 0, 'paineis_fundo_v1').setOrigin(0));

    // Dotted path of the Sun, so the child sees where it is going.
    const trilha = this.add.graphics();
    for (let a = -70; a <= 70; a += 7) trilha.fillStyle(0xfde047, 0.35).fillCircle(CX + Math.sin(rad(a)) * RX, PIVO_Y - Math.cos(rad(a)) * RY, 2.5);
    const sol = this.add.image(0, 0, 'paineis_sol_v1').setScale(0.8);
    const raio = this.add.graphics();
    const base = this.add.graphics()
      .fillStyle(0x000000, 0.25).fillEllipse(CX, 258, 90, 12)
      .fillStyle(0x1e293b, 1).fillRect(CX - 7, PIVO_Y, 14, 26).fillStyle(0x94a3b8, 1).fillRect(CX - 3.5, PIVO_Y, 7, 26)
      .fillStyle(0x1e293b, 1).fillRoundedRect(CX - 30, 252, 60, 10, 4).fillStyle(0x64748b, 1).fillRoundedRect(CX - 28, 253, 56, 6, 3);
    const placa = this.add.container(CX, PIVO_Y, [this.add.image(0, PLACA_Y, 'paineis_placa_v2').setScale(1.3)]);
    const eixo = this.add.circle(CX, PIVO_Y, 9, 0xcbd5e1).setStrokeStyle(3, 0x1e293b);
    const zona = this.add.zone(0, 0, JANELA_W, JANELA_H).setOrigin(0).setInteractive({ useHandCursor: true });
    janela.add([trilha, raio, base, placa, eixo, sol, zona]);

    // Charge bar (same look as the other panel task).
    const medidor = this.add.graphics();
    raiz.add(medidor);
    raiz.add(texto(this, -232, 133, 'Charge', 18, '#ffffff', 0x1e293b));
    const pct = texto(this, 222, 133, '0%', 18, '#ffffff', 0x1e293b);
    raiz.add(pct);

    let eraAlinhado = false;
    this.desenhar = () => {
      const e = this.estado;
      const sx = CX + Math.sin(rad(e.sol)) * RX, sy = PIVO_Y - Math.cos(rad(e.sol)) * RY;
      sol.setPosition(sx, sy);
      placa.setAngle(e.painel);
      const ok = alinhado(e);
      raio.clear();
      if (ok) {
        const px = CX + Math.sin(rad(e.painel)) * 40, py = PIVO_Y - Math.cos(rad(e.painel)) * 40;
        raio.lineStyle(10, 0xfde047, 0.25).lineBetween(sx, sy, px, py).lineStyle(4, 0xfde047, 0.9).lineBetween(sx, sy, px, py);
      }
      medidor.clear()
        .fillStyle(0xffffff, 1).fillRoundedRect(-160, 120, 340, 26, 13).lineStyle(4, 0x1e293b, 1).strokeRoundedRect(-160, 120, 340, 26, 13);
      if (e.carga > 0.01) medidor.fillStyle(ok ? 0x22c55e : 0xfacc15, 1).fillRoundedRect(-157, 123, Math.max(20, 334 * e.carga), 20, 10);
      pct.setText(`${Math.round(e.carga * 100)}%`);
      if (ok !== eraAlinhado && !this.acabou) {
        eraAlinhado = ok;
        if (ok) { tocarSfx('encaixe'); msg('Charging! Keep facing the Sun.', '#86efac'); }
        else msg('The Sun moved! Turn the panel again.', '#fde68a');
      }
    };
    this.desenhar();

    const mirar = (p: Phaser.Input.Pointer) => {
      if (this.acabou) return;
      const lx = (p.x - raiz.x) / s - JX, ly = (p.y - raiz.y) / s - JY;
      const ang = Phaser.Math.Clamp((Math.atan2(lx - CX, PIVO_Y - ly) * 180) / Math.PI, -ANGULO_MAX, ANGULO_MAX);
      this.estado = girarPainel(this.estado, ang);
    };
    zona.on('pointerdown', (p: Phaser.Input.Pointer) => { tocarSfx('pegar'); mirar(p); });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (p.isDown) mirar(p); });

    this.events.once('shutdown', () => { this.input.off('pointermove'); this.desenhar = undefined; });
    this.vencer = () => {
      this.acabou = true;
      msg('Battery full!', '#86efac');
      vitoria(this, janela, JANELA_W, JANELA_H, 'Battery full!', 'The Space Station\'s solar wings turn to follow the Sun, just like you did.', this.aoConcluir);
    };
  }

  private vencer = () => {};

  update(_t: number, dms: number) {
    if (this.acabou || !this.desenhar) return;
    this.estado = passo(this.estado, Math.min(dms, 100) / 1000);
    this.desenhar();
    if (tarefaConcluida(this.estado)) this.vencer();
  }
}
