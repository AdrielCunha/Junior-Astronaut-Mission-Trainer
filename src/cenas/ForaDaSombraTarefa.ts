// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Energy - Out of the shadow": the Sun is low and the rocks cast long shadows; slide the panels along their
// rail to the sunlit spots. The rules live in ../fora-da-sombra-tarefa.ts (pure functions, tested).
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { criarSombra, moverPainel, painelNoSol, paineisNoSol, tarefaConcluida, ocupada, VAGAS, type EstadoSombra } from '../fora-da-sombra-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, texto, vitoria } from './moldura';
import { texturasPaineis, PAINEL } from './PaineisSolaresTarefa';

const { JANELA_W, JANELA_H, QUADRO_W, QUADRO_H, FOLGA } = PAINEL;
const TRILHO_Y = 236, ALTURA_POSTE = 46;
const xVaga = (i: number) => 56 + i * ((JANELA_W - 112) / (VAGAS - 1));

export class ForaDaSombraTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('ForaDaSombraTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  create() {
    let estado: EstadoSombra = criarSombra(Math.floor(Math.random() * 100000));
    texturasPaineis(this);
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Out of the shadow');
    const msg = barraStatus(this, raiz, QUADRO_H, 'Slide each panel into the sunlight.');
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    const JX = -JANELA_W / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    raiz.add(janela);
    janela.add(this.add.image(0, 0, 'paineis_fundo_v1').setOrigin(0));
    // Low Sun on the left: long shadows to the right.
    janela.add(this.add.image(40, 96, 'paineis_sol_v1').setScale(0.6));

    // Sunlit ground glow, then each shadow: a boulder and the long dark shape it casts over its spots.
    const passo = (JANELA_W - 112) / (VAGAS - 1);
    const chao = this.add.graphics();
    estado.sombra.forEach((sombra, i) => {
      if (!sombra) chao.fillStyle(0xfde047, 0.4).fillRoundedRect(xVaga(i) - passo / 2 + 4, TRILHO_Y + 2, passo - 8, 22, 10);
    });
    const sombras = this.add.graphics();
    const pedras = this.add.graphics();
    for (let i = 0; i < VAGAS; i++) {
      if (!estado.sombra[i] || (i > 0 && estado.sombra[i - 1])) continue;
      let fim = i;
      while (fim + 1 < VAGAS && estado.sombra[fim + 1]) fim++;
      const x0 = xVaga(i) - passo / 2, x1 = xVaga(fim) + passo / 2;
      const px = Math.max(26, x0 - 4), alto = 118 + (fim - i) * 8, larg = 56;
      // Light comes low from the left: the shadow runs from the boulder's top down to the right, over the
      // panels standing on these spots (it is drawn over them).
      sombras.fillStyle(0x020617, 0.6).beginPath();
      sombras.moveTo(px, TRILHO_Y + 24); sombras.lineTo(px, TRILHO_Y - alto + 12); sombras.lineTo(x1, TRILHO_Y - 100); sombras.lineTo(x1, TRILHO_Y + 24);
      sombras.closePath(); sombras.fillPath();
      // a boulder: lumpy rock with a lit top
      pedras.fillStyle(0x6b7280, 1).fillRoundedRect(px - larg / 2, TRILHO_Y - alto + 10, larg, alto + 10, { tl: 22, tr: 18, bl: 6, br: 6 })
        .lineStyle(4, 0x1e293b, 1).strokeRoundedRect(px - larg / 2, TRILHO_Y - alto + 10, larg, alto + 10, { tl: 22, tr: 18, bl: 6, br: 6 })
        .fillStyle(0x9ca3af, 1).fillRoundedRect(px - larg / 2 + 6, TRILHO_Y - alto + 16, larg * 0.45, 12, 6)
        .fillStyle(0x4b5563, 1).fillCircle(px + 8, TRILHO_Y - alto / 2 + 10, 5).fillCircle(px - 6, TRILHO_Y - 8, 3.5);
    }
    // The rail with its spots.
    const trilho = this.add.graphics()
      .fillStyle(0x1e293b, 1).fillRoundedRect(20, TRILHO_Y + 6, JANELA_W - 40, 12, 6)
      .fillStyle(0x94a3b8, 1).fillRoundedRect(23, TRILHO_Y + 8, JANELA_W - 46, 6, 3);
    for (let i = 0; i < VAGAS; i++) trilho.fillStyle(0xe2e8f0, 1).fillCircle(xVaga(i), TRILHO_Y + 11, 4).lineStyle(2, 0x1e293b).strokeCircle(xVaga(i), TRILHO_Y + 11, 4);
    janela.add([chao, trilho]);

    // Panels: a pole on a little cart, a plate on top. Dragged sideways only.
    const paineis = estado.paineis.map((vaga, i) => {
      const poste = this.add.graphics()
        .fillStyle(0x1e293b, 1).fillRoundedRect(-22, -4, 44, 14, 6).fillStyle(0xf97316, 1).fillRoundedRect(-19, -2, 38, 9, 4)
        .fillStyle(0x1e293b, 1).fillRect(-5, -ALTURA_POSTE, 10, ALTURA_POSTE).fillStyle(0x94a3b8, 1).fillRect(-2.5, -ALTURA_POSTE, 5, ALTURA_POSTE);
      const placa = this.add.image(0, -ALTURA_POSTE - 12, 'paineis_placa_v2').setScale(0.62).setAngle(-28);
      const raio = texto(this, 0, -ALTURA_POSTE - 48, '⚡', 24, '#fde047', 0x1e293b).setAlpha(0);
      const c = this.add.container(xVaga(vaga), TRILHO_Y, [poste, placa, raio]).setSize(84, 110);
      // A container's hit area is measured from its top-left (size / 2 before its position): this covers the pole and the plate.
      c.setInteractive(new Phaser.Geom.Rectangle(0, 55 - ALTURA_POSTE - 54, 84, ALTURA_POSTE + 70), Phaser.Geom.Rectangle.Contains);
      this.input.setDraggable(c);
      c.setData('i', i);
      return { c, raio };
    });
    janela.addAt(pedras, janela.getIndex(trilho) + 1);   // boulders behind the panels
    janela.add(paineis.map((p) => p.c));
    janela.add(sombras);   // shadows fall over the panels (and the boulders' far side)

    const atualizar = () => {
      paineis.forEach((p, i) => {
        const sol = painelNoSol(estado, i);
        p.raio.setAlpha(sol ? 1 : 0);
      });
    };
    atualizar();

    const contador = texto(this, 0, 133, '', 20, '#ffffff', 0x1e293b);
    raiz.add(contador);
    const contar = () => contador.setText(`☀ ${paineisNoSol(estado)} of ${estado.paineis.length} panels in the sun`);
    contar();

    let acabou = false;
    this.input.on('dragstart', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container) => {
      if (acabou) return;
      tocarSfx('pegar');
      janela.moveBelow<Phaser.GameObjects.GameObject>(obj, sombras);
    });
    this.input.on('drag', (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container) => {
      if (acabou) return;
      const lx = (p.x - raiz.x) / s - JX;
      obj.x = Phaser.Math.Clamp(lx, xVaga(0) - 20, xVaga(VAGAS - 1) + 20);
    });
    this.input.on('dragend', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container) => {
      if (acabou) return;
      const i = obj.getData('i') as number;
      let alvo = 0;
      for (let v = 1; v < VAGAS; v++) if (Math.abs(xVaga(v) - obj.x) < Math.abs(xVaga(alvo) - obj.x)) alvo = v;
      if (ocupada(estado, alvo, i)) { tocarSfx('soltar'); msg('Another panel is there. Pick a free spot!', '#fde68a'); }
      else estado = moverPainel(estado, i, alvo);
      this.tweens.add({ targets: obj, x: xVaga(estado.paineis[i]), duration: 160, ease: 'Back.easeOut' });
      atualizar(); contar();
      if (tarefaConcluida(estado)) {
        acabou = true;
        tocarSfx('sucesso');
        msg('All panels in the sun!', '#86efac');
        vitoria(this, janela, JANELA_W, JANELA_H, 'All in the sun!', 'Near the Moon\'s south pole the Sun stays low, so the shadows are very long.', this.aoConcluir);
      } else if (painelNoSol(estado, i)) { tocarSfx('encaixe'); msg('Sunlight! Now the next panel.', '#86efac'); }
      else msg('Still in the shadow. Look for the bright ground!', '#fde68a');
    });

    this.events.once('shutdown', () => { this.input.off('dragstart'); this.input.off('drag'); this.input.off('dragend'); });
  }
}
