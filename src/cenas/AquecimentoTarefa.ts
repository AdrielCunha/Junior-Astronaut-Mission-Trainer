// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Heating - Keep the habitat warm": a thermal camera shows where heat escapes from the habitat wall (blue =
// cold). Drag the gold insulation blankets onto the cold spots until the inside is warm. The rules live in
// ../aquecimento-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { criarAquecimento, cobrir, frioRestante, temperaturaDentro, tarefaConcluida, COLUNAS, LINHAS, NUM_FRIOS, TEMP_FRIA, TEMP_BOA, type EstadoAquecimento } from '../aquecimento-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, canvas, texto, vitoria } from './moldura';
import { PAINEL } from './PaineisSolaresTarefa';

const { JANELA_W, JANELA_H, QUADRO_W, QUADRO_H, FOLGA } = PAINEL;
const GRADE = { x: 24, y: 24, w: 384, h: 262 };
const CW = GRADE.w / COLUNAS, CH = GRADE.h / LINHAS;
const centro = (i: number) => ({ x: GRADE.x + (i % COLUNAS + 0.5) * CW, y: GRADE.y + (Math.floor(i / COLUNAS) + 0.5) * CH });
const BANDEJA = { x: 500, y0: 60, passo: 58 };

function texturas(cena: Phaser.Scene) {
  // Gold insulation blanket: crinkled shiny foil, like the ones on real spacecraft.
  canvas(cena, 'manta_ouro_v1', 64, 44, (c) => {
    const g = c.createLinearGradient(0, 0, 64, 44);
    g.addColorStop(0, '#fde68a'); g.addColorStop(0.45, '#f59e0b'); g.addColorStop(0.55, '#fcd34d'); g.addColorStop(1, '#d97706');
    c.fillStyle = g; c.beginPath(); c.roundRect(2, 2, 60, 40, 8); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1.5;
    for (const [a, b, d, e] of [[8, 12, 26, 20], [30, 8, 50, 22], [12, 30, 34, 26], [40, 30, 58, 36]]) { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); }
    c.lineWidth = 3; c.strokeStyle = '#1e293b'; c.beginPath(); c.roundRect(2, 2, 60, 40, 8); c.stroke();
  });
}

export class AquecimentoTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('AquecimentoTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  create() {
    let estado: EstadoAquecimento = criarAquecimento(Math.floor(Math.random() * 100000));
    texturas(this);
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Keep the habitat warm');
    const msg = barraStatus(this, raiz, QUADRO_H, 'Drag a gold blanket onto each BLUE cold spot.');
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    const JX = -JANELA_W / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    raiz.add(janela);
    janela.add(this.add.graphics().fillStyle(0x0b1020, 1).fillRoundedRect(0, 0, JANELA_W, JANELA_H, 18));
    janela.add(texto(this, GRADE.x + GRADE.w / 2, 12, 'THERMAL CAMERA', 11, '#cbd5e1'));

    // The wall seen through a thermal camera: warm orange, cold spots blue (pulsing).
    const parede = this.add.graphics();
    const pulsos: Phaser.GameObjects.Arc[] = [];
    const desenharParede = () => {
      parede.clear();
      for (let i = 0; i < COLUNAS * LINHAS; i++) {
        const c = centro(i), frio = estado.frios.includes(i) && !estado.cobertos.includes(i);
        const coberto = estado.cobertos.includes(i);
        parede.fillStyle(frio ? 0x1d4ed8 : coberto ? 0xf97316 : (i % 3 ? 0xea580c : 0xc2410c), 1)
          .fillRoundedRect(c.x - CW / 2 + 2, c.y - CH / 2 + 2, CW - 4, CH - 4, 8);
        if (frio) parede.fillStyle(0x60a5fa, 1).fillCircle(c.x, c.y, 16).fillStyle(0xbfdbfe, 1).fillCircle(c.x, c.y, 8);
      }
      parede.lineStyle(4, 0x475569, 1).strokeRoundedRect(GRADE.x - 2, GRADE.y - 2, GRADE.w + 4, GRADE.h + 4, 10);
    };
    janela.add(parede);
    desenharParede();
    estado.frios.forEach((i) => {
      const c = centro(i);
      const p = this.add.circle(c.x, c.y, 22).setStrokeStyle(3, 0xbfdbfe, 0.9);
      janela.add(p);
      pulsos.push(p);
      this.tweens.add({ targets: p, scale: 1.35, alpha: 0, duration: 900, repeat: -1 });
    });

    // Thermometer on the right: inside temperature, from cold blue to warm green.
    const termo = this.add.graphics();
    const grau = texto(this, BANDEJA.x + 52, 30, '', 15, '#ffffff');
    janela.add([termo, grau]);
    const desenharTermo = () => {
      const t = temperaturaDentro(estado), q = (t - TEMP_FRIA) / (TEMP_BOA - TEMP_FRIA);
      termo.clear().fillStyle(0xffffff, 1).fillRoundedRect(BANDEJA.x + 42, 50, 22, 220, 11).lineStyle(3, 0x1e293b, 1).strokeRoundedRect(BANDEJA.x + 42, 50, 22, 220, 11)
        .fillStyle(q >= 1 ? 0x22c55e : q > 0.5 ? 0xfacc15 : 0x38bdf8, 1).fillRoundedRect(BANDEJA.x + 46, 266 - 212 * Math.max(0.06, q), 14, 212 * Math.max(0.06, q), 7);
      grau.setText(`${t} °C`);
    };
    desenharTermo();

    // Blankets in a column on the right, each draggable.
    janela.add(texto(this, BANDEJA.x - 14, 30, 'BLANKETS', 11, '#cbd5e1'));
    const casa = (k: number) => ({ x: BANDEJA.x - 14, y: BANDEJA.y0 + 20 + k * BANDEJA.passo });
    Array.from({ length: NUM_FRIOS }, (_v, k) => {
      const p = casa(k);
      const m = this.add.image(p.x, p.y, 'manta_ouro_v1').setInteractive({ useHandCursor: true, draggable: true }).setData('k', k);
      janela.add(m);
    });

    let acabou = false;
    const local = (p: Phaser.Input.Pointer) => ({ x: (p.x - raiz.x) / s - JX, y: (p.y - raiz.y) / s - JY });
    this.input.on('dragstart', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      if (acabou || !obj.input?.enabled) return;
      tocarSfx('pegar');
      janela.bringToTop(obj);
    });
    this.input.on('drag', (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      if (acabou) return;
      const l = local(p);
      obj.setPosition(l.x, l.y);
    });
    this.input.on('dragend', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      if (acabou) return;
      const k = obj.getData('k') as number;
      const col = Math.floor((obj.x - GRADE.x) / CW), lin = Math.floor((obj.y - GRADE.y) / CH);
      const dentro = col >= 0 && col < COLUNAS && lin >= 0 && lin < LINHAS;
      const voltar = () => this.tweens.add({ targets: obj, x: casa(k).x, y: casa(k).y, duration: 220, ease: 'Sine.easeOut' });
      if (!dentro) { voltar(); return; }
      const i = lin * COLUNAS + col;
      const r = cobrir(estado, i);
      if (r.r !== 'coberto') {
        tocarSfx('soltar');
        msg(r.r === 'ja' ? 'That spot already has a blanket.' : 'That spot is warm already (orange). Find the BLUE ones!', '#fde68a');
        voltar();
        return;
      }
      estado = r.e;
      const c = centro(i);
      obj.disableInteractive();
      this.tweens.add({ targets: obj, x: c.x, y: c.y, duration: 140, ease: 'Back.easeOut' });
      pulsos[estado.frios.indexOf(i)]?.setVisible(false);
      tocarSfx('encaixe');
      desenharParede(); desenharTermo();
      if (tarefaConcluida(estado)) {
        acabou = true;
        tocarSfx('ligar');
        msg('Warm and cozy!', '#86efac');
        vitoria(this, janela, JANELA_W, JANELA_H, 'Warm and cozy!', 'Spacecraft are wrapped in shiny gold blankets to keep heat in. Curiosity measured a Mars night of −98 °C, colder than any freezer!', this.aoConcluir);
      } else msg(`Good! ${frioRestante(estado)} cold spot${frioRestante(estado) > 1 ? 's' : ''} left.`, '#86efac');
    });
    this.events.once('shutdown', () => { this.input.off('dragstart'); this.input.off('drag'); this.input.off('dragend'); });
  }
}
