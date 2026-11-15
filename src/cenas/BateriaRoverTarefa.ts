// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Rover - Swap the battery": pull the empty battery out, turn the new one until its + matches the slot's +,
// slide it in and close the latch. The rules live in ../bateria-rover-tarefa.ts (pure functions, tested).
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { criarBateria, tirarVazia, girar, encaixar, travar, posicaoCerta, tarefaConcluida, type EstadoBateria } from '../bateria-rover-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, canvas, texto, vitoria } from './moldura';
import { PAINEL } from './PaineisSolaresTarefa';

const { JANELA_W, JANELA_H, QUADRO_W, QUADRO_H, FOLGA } = PAINEL;
const BW = 150, BH = 96;                 // battery size
const VAGA = { x: 200, y: 165 };         // centre of the battery bay
const NOVA = { x: 460, y: 150 };         // where the new battery waits
const LIXO = { x: 470, y: 262 };         // where the empty one goes

// Battery picture: + terminal on the top-left, − on the top-right, a cut corner at the bottom-right
// (the bay has the same cut, so it fits only one way).
function desenharBateria(c: CanvasRenderingContext2D, cheia: boolean) {
  c.translate(6, 14);
  const forma = () => {
    c.beginPath(); c.moveTo(10, 0); c.lineTo(BW - 10, 0); c.quadraticCurveTo(BW, 0, BW, 10);
    c.lineTo(BW, BH - 26); c.lineTo(BW - 26, BH); c.lineTo(10, BH); c.quadraticCurveTo(0, BH, 0, BH - 10);
    c.lineTo(0, 10); c.quadraticCurveTo(0, 0, 10, 0); c.closePath();
  };
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.save(); c.translate(4, 5); forma(); c.fill(); c.restore();
  forma(); c.fillStyle = cheia ? '#e2e8f0' : '#94a3b8'; c.fill();
  c.save(); forma(); c.clip();
  c.fillStyle = cheia ? '#f97316' : '#64748b'; c.fillRect(0, BH * 0.42, BW, BH * 0.24);
  c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(8, 6, BW - 16, 8);
  c.restore();
  forma(); c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.stroke();
  // terminals
  c.fillStyle = '#ef4444'; c.beginPath(); c.roundRect(14, -10, 30, 14, 4); c.fill(); c.lineWidth = 3; c.stroke();
  c.fillStyle = '#334155'; c.beginPath(); c.roundRect(BW - 44, -10, 30, 14, 4); c.fill(); c.stroke();
  // + and − signs drawn as bars (white with a dark outline), so they read the same at any turn
  const barra = (x: number, y: number, w: number, h: number) => { c.fillStyle = '#1e293b'; c.fillRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4); };
  barra(29, 26, 16, 5); barra(29, 26, 5, 16); barra(BW - 29, 26, 16, 5);
  c.fillStyle = '#ffffff'; c.fillRect(29 - 8, 26 - 2.5, 16, 5); c.fillRect(29 - 2.5, 26 - 8, 5, 16); c.fillRect(BW - 29 - 8, 26 - 2.5, 16, 5);
  // charge light
  c.fillStyle = cheia ? '#22c55e' : '#ef4444'; c.beginPath(); c.arc(BW / 2, BH * 0.8, 7, 0, Math.PI * 2); c.fill();
  c.lineWidth = 2.5; c.stroke();
}

function texturas(cena: Phaser.Scene) {
  canvas(cena, 'bateria_rover_cheia_v1', BW + 16, BH + 24, (c) => desenharBateria(c, true));
  canvas(cena, 'bateria_rover_vazia_v1', BW + 16, BH + 24, (c) => desenharBateria(c, false));
  canvas(cena, 'bateria_rover_fundo_v1', JANELA_W, JANELA_H, (c) => {
    c.save(); c.beginPath(); c.roundRect(0, 0, JANELA_W, JANELA_H, 18); c.clip();
    const g = c.createLinearGradient(0, 0, 0, JANELA_H);
    g.addColorStop(0, '#1e3a8a'); g.addColorStop(1, '#172554');
    c.fillStyle = g; c.fillRect(0, 0, JANELA_W, JANELA_H);
    // the rover's side panel (light metal with an orange stripe)
    c.fillStyle = '#cbd5e1'; c.beginPath(); c.roundRect(40, 40, 320, 250, 22); c.fill();
    c.fillStyle = '#f97316'; c.fillRect(40, 266, 320, 10);
    c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.beginPath(); c.roundRect(40, 40, 320, 250, 22); c.stroke();
    // the bay: dark hole with the same cut corner and a + painted next to it
    const x0 = VAGA.x - BW / 2 - 6, y0 = VAGA.y - BH / 2 - 6, w = BW + 12, h = BH + 12;
    c.fillStyle = '#0f172a'; c.beginPath();
    c.moveTo(x0, y0); c.lineTo(x0 + w, y0); c.lineTo(x0 + w, y0 + h - 30); c.lineTo(x0 + w - 30, y0 + h); c.lineTo(x0, y0 + h); c.closePath(); c.fill();
    c.lineWidth = 3; c.strokeStyle = '#64748b'; c.stroke();
    c.fillStyle = '#ef4444'; c.font = '600 26px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.strokeText('+', x0 + 26, y0 + 26); c.fillText('+', x0 + 26, y0 + 26);
    // tray for the empty battery
    c.fillStyle = 'rgba(15,23,42,0.6)'; c.beginPath(); c.roundRect(LIXO.x - 95, LIXO.y - 30, 190, 52, 16); c.fill();
    c.restore();
  });
}

export class BateriaRoverTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('BateriaRoverTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  create() {
    let estado: EstadoBateria = criarBateria(Math.floor(Math.random() * 100000));
    texturas(this);
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Swap the rover battery');
    const msg = barraStatus(this, raiz, QUADRO_H, 'Drag the empty battery out of the rover.');
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    const JX = -JANELA_W / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    raiz.add(janela);
    janela.add(this.add.image(0, 0, 'bateria_rover_fundo_v1').setOrigin(0));
    janela.add(texto(this, LIXO.x, LIXO.y + 36, 'EMPTY', 13, '#cbd5e1'));

    const vazia = this.add.image(VAGA.x, VAGA.y, 'bateria_rover_vazia_v1').setInteractive({ useHandCursor: true, draggable: true });
    const nova = this.add.image(NOVA.x, NOVA.y, 'bateria_rover_cheia_v1').setAngle(estado.giro * 90).setScale(0.85).setAlpha(0.5)
      .setInteractive({ useHandCursor: true, draggable: true });
    // Turn button under the new battery.
    const giroBtn = this.add.container(NOVA.x + 105, NOVA.y + 70, [
      this.add.circle(0, 0, 24, 0x2563eb).setStrokeStyle(4, 0xffffff),
      this.add.circle(0, 0, 27).setStrokeStyle(2, 0x1e293b),
      texto(this, 0, 0, '↻', 26, '#ffffff'),
    ]).setSize(54, 54).setInteractive({ useHandCursor: true }).setAlpha(0.4);
    // Latch over the bay: open (up) until the battery is in.
    // Hinged on the bay's top-left corner; open = raised, closed = lying across the top of the battery.
    const trava = this.add.container(VAGA.x - BW / 2 + 4, VAGA.y - BH / 2 - 22, [
      this.add.graphics().fillStyle(0xfacc15, 1).fillRoundedRect(0, -11, BW - 8, 22, 11).lineStyle(4, 0x1e293b, 1).strokeRoundedRect(0, -11, BW - 8, 22, 11)
        .fillStyle(0xffffff, 0.5).fillRoundedRect(12, -7, BW - 40, 6, 3),
      this.add.circle(0, 0, 9, 0xcbd5e1).setStrokeStyle(3, 0x1e293b),
    ]).setAngle(-35);
    trava.setInteractive(new Phaser.Geom.Rectangle(-10, -24, BW + 10, 48), Phaser.Geom.Rectangle.Contains);
    trava.input!.cursor = 'pointer';
    const seta = texto(this, VAGA.x + 40, VAGA.y - BH / 2 - 100, '👇', 26, '#ffffff').setVisible(false);
    janela.add([vazia, nova, giroBtn, trava, seta]);
    this.tweens.add({ targets: seta, y: seta.y + 8, yoyo: true, repeat: -1, duration: 400 });

    let acabou = false;
    const local = (p: Phaser.Input.Pointer) => ({ x: (p.x - raiz.x) / s - JX, y: (p.y - raiz.y) / s - JY });
    const girarNova = () => {
      if (acabou || estado.etapa !== 'encaixar') return;
      estado = girar(estado);
      tocarSfx('clique');
      this.tweens.killTweensOf(nova);
      this.tweens.add({ targets: nova, angle: nova.angle + 90, duration: 180, ease: 'Back.easeOut', onComplete: () => nova.setAngle(estado.giro * 90) });
      if (posicaoCerta(estado)) msg('The + matches! Drag it into the rover.', '#86efac');
      else msg('Turn it until the + is on the top-left.', '#ffffff');
    };
    giroBtn.on('pointerdown', girarNova);
    nova.on('pointerup', (p: Phaser.Input.Pointer) => { if (p.getDistance() < 8) girarNova(); });

    this.input.on('drag', (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      if (acabou) return;
      if (obj === vazia && estado.etapa !== 'tirar') return;
      if (obj === nova && estado.etapa !== 'encaixar') return;
      const l = local(p);
      obj.setPosition(l.x, l.y);
    });
    this.input.on('dragstart', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      if (!acabou && ((obj === vazia && estado.etapa === 'tirar') || (obj === nova && estado.etapa === 'encaixar'))) tocarSfx('pegar');
    });
    this.input.on('dragend', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      if (acabou) return;
      if (obj === vazia && estado.etapa === 'tirar') {
        if (Phaser.Math.Distance.Between(obj.x, obj.y, VAGA.x, VAGA.y) < 70) {
          this.tweens.add({ targets: obj, x: VAGA.x, y: VAGA.y, duration: 150 });
          msg('Pull it all the way out!', '#fde68a');
          return;
        }
        estado = tirarVazia(estado);
        tocarSfx('soltar');
        this.tweens.add({ targets: obj, x: LIXO.x, y: LIXO.y - 4, scale: 0.55, duration: 260, ease: 'Sine.easeOut' });
        nova.setAlpha(1); giroBtn.setAlpha(1);
        msg(posicaoCerta(estado) ? 'Drag the new battery into the rover.' : 'Turn the new battery so its + is on the top-left.', '#ffffff');
        return;
      }
      if (obj === nova && estado.etapa === 'encaixar') {
        const perto = Phaser.Math.Distance.Between(obj.x, obj.y, VAGA.x, VAGA.y) < 90;
        const antes = estado;
        if (perto) estado = encaixar(estado);
        if (estado !== antes) {
          tocarSfx('encaixe');
          this.tweens.add({ targets: obj, x: VAGA.x, y: VAGA.y, scale: 1, duration: 180, ease: 'Back.easeOut' });
          msg('It fits! Now close the yellow latch.', '#86efac');
          seta.setVisible(true);
          return;
        }
        if (perto) { tocarSfx('soltar'); msg('Wrong way! The + must match the + on the rover.', '#fde68a'); }
        this.tweens.add({ targets: obj, x: NOVA.x, y: NOVA.y, duration: 220, ease: 'Sine.easeOut' });
      }
    });

    trava.on('pointerdown', () => {
      if (acabou) return;
      if (estado.etapa !== 'travar') { tocarSfx('soltar'); msg(estado.etapa === 'tirar' ? 'First take out the empty battery.' : 'Put the new battery in first.', '#fde68a'); return; }
      estado = travar(estado);
      seta.setVisible(false);
      tocarSfx('ligar');
      this.tweens.add({ targets: trava, angle: 0, duration: 200, ease: 'Back.easeOut' });
      if (tarefaConcluida(estado)) {
        acabou = true;
        msg('Rover powered up!', '#86efac');
        vitoria(this, janela, JANELA_W, JANELA_H, 'Rover powered up!', 'The Apollo rover ran on two 36-volt batteries.', this.aoConcluir);
      }
    });

    this.events.once('shutdown', () => { this.input.off('drag'); this.input.off('dragstart'); this.input.off('dragend'); });
  }
}
