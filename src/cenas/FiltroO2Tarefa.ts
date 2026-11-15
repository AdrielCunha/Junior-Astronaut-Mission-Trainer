// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Maintenance - O₂ Filter": drag the vacuum over the dust stains until the air quality bar is full.
// The rules live in ../filtro-o2-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { criarTarefaFiltroO2, limparEm, qualidadeDoAr, tarefaConcluida, centroDaCelula, type TarefaFiltroO2 } from '../filtro-o2-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto, concluirTarefa } from './moldura';

const QUADRO_W = 760;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const FOLGA = (QUADRO_H - 500) / 2;   // the frame is taller than the layout was drawn for: centre the content
const INSTRUCAO = 'Drag the vacuum over the dust.';

export class FiltroO2Tarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('FiltroO2Tarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  private criarTexturas(t: TarefaFiltroO2) {
    // The filter: a flat blue plate with a grid, thick dark outline.
    canvas(this, 'filtro_malha_v2', t.largura, t.altura, (c) => {
      c.fillStyle = '#2563eb'; c.beginPath(); c.roundRect(0, 0, t.largura, t.altura, 18); c.fill();
      c.save(); c.beginPath(); c.roundRect(0, 0, t.largura, t.altura, 18); c.clip();
      c.fillStyle = '#1d4ed8'; c.fillRect(0, 0, t.largura, t.altura * 0.12);
      c.fillStyle = '#1e40af';
      for (let x = 7; x <= t.largura; x += 14) c.fillRect(x - 1, 0, 3, t.altura);
      for (let y = 7; y <= t.altura; y += 14) c.fillRect(0, y - 1, t.largura, 3);
      c.restore();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.beginPath(); c.roundRect(2.5, 2.5, t.largura - 5, t.altura - 5, 18); c.stroke();
    });
    // A flat dust blob.
    canvas(this, 'filtro_poeira_v2', 96, 96, (c) => {
      c.fillStyle = '#a16207'; c.strokeStyle = '#1e293b'; c.lineWidth = 4;
      c.beginPath(); c.arc(48, 48, 40, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#854d0e';
      for (const [x, y, r] of [[34, 38, 7], [58, 52, 9], [42, 62, 5]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
    });
    // The vacuum nozzle, pointing up (2x).
    canvas(this, 'filtro_bocal_v2', 120, 150, (c) => {
      c.scale(2, 2);
      c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = '#1e293b';
      c.fillStyle = '#64748b'; c.beginPath(); c.roundRect(24, 38, 12, 34, 4); c.fill(); c.stroke();   // hose
      c.fillStyle = '#facc15'; c.beginPath(); c.roundRect(6, 8, 48, 34, [20, 20, 6, 6]); c.fill(); c.stroke();   // head
      c.fillStyle = '#1e293b'; c.beginPath(); c.roundRect(14, 12, 32, 8, 4); c.fill();                    // opening
      c.fillStyle = '#ef4444'; c.strokeStyle = '#1e293b'; c.lineWidth = 2; c.beginPath(); c.arc(30, 32, 4, 0, Math.PI * 2); c.fill(); c.stroke();   // light
    });
  }

  create() {
    let estado: TarefaFiltroO2 = criarTarefaFiltroO2();
    this.criarTexturas(estado);
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Maintenance - O₂ Filter');
    const msg = barraStatus(this, raiz, QUADRO_H, INSTRUCAO);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    // ---- The filter window.
    const JX = -estado.largura / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    const rim = this.add.graphics();
    rim.lineStyle(5, 0x1e293b, 1).strokeRoundedRect(JX - 2, JY - 2, estado.largura + 4, estado.altura + 4, 20);
    raiz.add(rim);
    raiz.add(janela);
    janela.add(this.add.image(0, 0, 'filtro_malha_v2').setOrigin(0));

    // One dust blob per dirty cell; they fade as the cell is cleaned.
    const poeiras = estado.celulas.map((c) => {
      const p = centroDaCelula(estado, c);
      const jx = Math.sin(c.x * 12.9 + c.y * 78.2) * 6, jy = Math.cos(c.x * 39.3 + c.y * 11.1) * 5;
      const im = this.add.image(p.x + jx, p.y + jy, 'filtro_poeira_v2').setScale(0.72).setVisible(c.sujeira > 0);
      janela.add(im);
      return im;
    });
    const pintarPoeira = () => estado.celulas.forEach((c, i) => {
      const im = poeiras[i];
      if (c.sujeira <= 0) { if (im.visible) im.setVisible(false); return; }
      im.setAlpha(0.25 + 0.75 * c.sujeira).setScale(0.45 + 0.35 * c.sujeira);
    });
    pintarPoeira();

    // ---- The vacuum: a ring that shows its reach, and a nozzle that turns where it goes.
    const anel = this.add.graphics().setDepth(10).setVisible(false);
    anel.fillStyle(0xfde047, 0.25).fillCircle(0, 0, estado.raio).lineStyle(4, 0x1e293b, 1).strokeCircle(0, 0, estado.raio);
    const bocal = this.add.image(0, 0, 'filtro_bocal_v2').setScale(0.5).setOrigin(0.5, 0.2).setDepth(11).setVisible(false);
    janela.add([anel, bocal]);

    // ---- Air quality bar.
    const medidor = this.add.graphics();
    raiz.add(medidor);
    raiz.add(texto(this, -218, 133, 'Air', 18, '#ffffff', 0x1e293b));
    const pct = texto(this, 222, 133, '0%', 18, '#ffffff', 0x1e293b);
    raiz.add(pct);
    const desenharMedidor = () => {
      const q = qualidadeDoAr(estado);
      const cor = q < 0.5
        ? Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(239, 68, 68), new Phaser.Display.Color(250, 204, 21), 100, q * 200)
        : Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(250, 204, 21), new Phaser.Display.Color(34, 197, 94), 100, (q - 0.5) * 200);
      medidor.clear();
      medidor.fillStyle(0xffffff, 1).fillRoundedRect(-190, 120, 380, 26, 13).lineStyle(4, 0x1e293b, 1).strokeRoundedRect(-190, 120, 380, 26, 13);
      if (q > 0.01) medidor.fillStyle(Phaser.Display.Color.GetColor(cor.r, cor.g, cor.b), 1).fillRoundedRect(-187, 123, Math.max(20, 374 * q), 20, 10);
      pct.setText(`${Math.round(q * 100)}%`);
    };
    desenharMedidor();

    // ---- Input and state.
    let arrastando = false;
    let pos = { x: 0, y: 0 };
    let ang = 0;
    let acabou = false;
    let meio = false;
    const aoLocal = (p: Phaser.Input.Pointer) => ({
      x: Phaser.Math.Clamp((p.x - raiz.x) / s - JX, 0, estado.largura),
      y: Phaser.Math.Clamp((p.y - raiz.y) / s - JY, 0, estado.altura),
    });
    const dentro = (p: Phaser.Input.Pointer) => {
      const l = { x: (p.x - raiz.x) / s - JX, y: (p.y - raiz.y) / s - JY };
      return l.x >= 0 && l.y >= 0 && l.x <= estado.largura && l.y <= estado.altura;
    };
    const mostrar = (v: boolean) => { anel.setVisible(v); bocal.setVisible(v); };
    const mover = (p: Phaser.Input.Pointer) => {
      if (acabou) return;
      const l = aoLocal(p);
      if (Phaser.Math.Distance.Between(l.x, l.y, pos.x, pos.y) > 2) ang = Math.atan2(l.y - pos.y, l.x - pos.x);
      pos = l;
      mostrar(arrastando || dentro(p));
    };
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (dentro(p)) { arrastando = true; tocarSfx('ligar'); mover(p); } });
    this.input.on('pointermove', mover);
    this.input.on('pointerup', () => { arrastando = false; });
    this.input.on('gameout', () => { arrastando = false; mostrar(false); });

    const vencer = () => {
      acabou = true; arrastando = false; mostrar(false);
      msg('Filter clean! The air is good.', '#86efac');
      const brilho = this.add.rectangle(0, 0, estado.largura, estado.altura, 0xffffff, 0.5).setOrigin(0);
      janela.add(brilho);
      this.tweens.add({ targets: brilho, alpha: 0, duration: 900 });
      rajada(this, janela, estado.largura / 2, estado.altura / 2, [0xfde047, 0x86efac, 0x7dd3fc, 0xf9a8d4], 26, 170);
      const faixa = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-250, -58, 500, 116, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-250, -58, 500, 116, 40);
      const bloco = this.add.container(estado.largura / 2, estado.altura / 2, [
        faixa,
        texto(this, 0, -16, 'Filter clean!', 38, '#ffffff', 0x14532d),
        texto(this, 0, 28, 'Moon dust sticks to everything!', 15, '#dcfce7', 0x14532d),
      ]).setScale(0).setDepth(40);
      janela.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 200, delay: 50, ease: 'Back.easeOut' });
      concluirTarefa(this, this.aoConcluir);
    };

    const aCadaQuadro = (_t: number, delta: number) => {
      const dt = Math.min(0.05, delta / 1000);
      anel.setPosition(pos.x, pos.y).setAlpha(arrastando ? 1 : 0.55);
      bocal.setPosition(pos.x, pos.y);
      bocal.rotation = Phaser.Math.Angle.RotateTo(bocal.rotation, ang + Math.PI / 2, 0.2);
      if (!arrastando || acabou) return;
      const novo = limparEm(estado, pos, dt);
      if (novo === estado) return;
      estado = novo;
      pintarPoeira();
      desenharMedidor();
      // A few specks fly into the nozzle.
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2, r = estado.raio * (0.4 + Math.random() * 0.6);
        const g = this.add.circle(pos.x + Math.cos(a) * r, pos.y + Math.sin(a) * r, 2.5, 0xa16207).setDepth(12);
        janela.add(g);
        this.tweens.add({ targets: g, x: pos.x, y: pos.y, alpha: 0, duration: 260, onComplete: () => g.destroy() });
      }
      if (tarefaConcluida(estado)) { vencer(); return; }
      if (!meio && qualidadeDoAr(estado) >= 0.5) { meio = true; tocarSfx('ok'); msg('It is getting clean! Keep going.', '#fde68a'); }
    };
    this.events.on('update', aCadaQuadro);
    this.events.once('shutdown', () => this.events.off('update', aCadaQuadro));
  }
}
