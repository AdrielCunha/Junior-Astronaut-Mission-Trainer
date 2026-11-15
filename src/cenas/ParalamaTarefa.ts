// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Rover - Fix the fender": the fender broke and the wheel throws dust everywhere. Cover the 4 gaps with folded
// maps, then close the 4 clamps. The rules live in ../paralama-tarefa.ts (pure functions, tested).
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { criarParalama, colocarMapa, prender, mapasColocados, tarefaConcluida, NUM_PECAS, type EstadoParalama } from '../paralama-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, canvas, texto, vitoria } from './moldura';
import { PAINEL } from './PaineisSolaresTarefa';

const { JANELA_W, JANELA_H, QUADRO_W, QUADRO_H, FOLGA } = PAINEL;
const RODA = { x: 200, y: 222, r: 66 };
const R_PARALAMA = 92;
const MAPA_W = 70, MAPA_H = 46, ESCALA_COLOCADO = 0.78;
const angulo = (i: number) => 216 + i * 36;                 // centre of gap i on the fender arc (degrees, 270 = up)
const rad = (g: number) => (g * Math.PI) / 180;
const pontoArco = (g: number, r = R_PARALAMA) => ({ x: RODA.x + Math.cos(rad(g)) * r, y: RODA.y + Math.sin(rad(g)) * r });
const ESPERA = [[440, 95], [530, 95], [440, 185], [530, 185]];

function texturas(cena: Phaser.Scene) {
  canvas(cena, 'paralama_fundo_v1', JANELA_W, JANELA_H, (c) => {
    c.save(); c.beginPath(); c.roundRect(0, 0, JANELA_W, JANELA_H, 18); c.clip();
    const g = c.createLinearGradient(0, 0, 0, JANELA_H);
    g.addColorStop(0, '#0b1230'); g.addColorStop(1, '#1e2a5a');
    c.fillStyle = g; c.fillRect(0, 0, JANELA_W, JANELA_H);
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 36; i++) { c.globalAlpha = 0.3 + (i % 4) * 0.15; c.fillRect((i * 97) % JANELA_W, (i * 53) % 170, 2, 2); }
    c.globalAlpha = 1;
    c.fillStyle = '#9ca3af'; c.fillRect(0, 262, JANELA_W, JANELA_H - 262);
    c.fillStyle = '#6b7280'; c.fillRect(0, 262, JANELA_W, 5);
    // tray where the maps wait
    c.fillStyle = 'rgba(15,23,42,0.55)'; c.beginPath(); c.roundRect(388, 52, 196, 186, 18); c.fill();
    c.restore();
  });
  canvas(cena, 'paralama_mapa_v1', MAPA_W + 8, MAPA_H + 8, (c) => {
    c.translate(4, 4);
    c.fillStyle = '#fef3c7'; c.beginPath(); c.roundRect(0, 0, MAPA_W, MAPA_H, 5); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(MAPA_W / 3, 0, 2, MAPA_H); c.fillRect((MAPA_W * 2) / 3, 0, 2, MAPA_H);
    c.fillStyle = '#86efac'; c.beginPath(); c.ellipse(20, 30, 14, 9, 0.3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#60a5fa'; c.lineWidth = 3; c.beginPath(); c.moveTo(4, 10); c.bezierCurveTo(26, 18, 40, 4, 66, 16); c.stroke();
    c.strokeStyle = '#ef4444'; c.lineWidth = 2.5; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(10, 40); c.lineTo(34, 24); c.lineTo(60, 34); c.stroke();
    c.setLineDash([]);
    c.lineWidth = 3; c.strokeStyle = '#1e293b'; c.beginPath(); c.roundRect(0, 0, MAPA_W, MAPA_H, 5); c.stroke();
  });
}

export class ParalamaTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('ParalamaTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  create() {
    let estado: EstadoParalama = criarParalama();
    texturas(this);
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Fix the fender');
    const msg = barraStatus(this, raiz, QUADRO_H, 'Drag a map over each gap in the fender.');
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    const JX = -JANELA_W / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    raiz.add(janela);
    janela.add(this.add.image(0, 0, 'paralama_fundo_v1').setOrigin(0));
    janela.add(texto(this, 486, 70, 'MAPS', 13, '#cbd5e1'));

    // The rover's side: chassis, a wire-mesh wheel, and what is left of the fender (two stubs).
    const rover = this.add.graphics()
      .fillStyle(0x000000, 0.25).fillEllipse(RODA.x, 266, 170, 16)
      .fillStyle(0xcbd5e1, 1).fillRoundedRect(20, 104, 70, 34, 10).lineStyle(4, 0x1e293b, 1).strokeRoundedRect(20, 104, 70, 34, 10)
      .fillStyle(0xf97316, 1).fillRect(24, 126, 62, 6);
    const roda = this.add.graphics();
    roda.fillStyle(0x475569, 1).fillCircle(0, 0, RODA.r).lineStyle(6, 0x1e293b, 1).strokeCircle(0, 0, RODA.r);
    roda.lineStyle(2, 0x94a3b8, 0.8);
    for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; roda.lineBetween(Math.cos(a) * 22, Math.sin(a) * 22, Math.cos(a + 0.5) * (RODA.r - 6), Math.sin(a + 0.5) * (RODA.r - 6)); }
    for (let i = 0; i < 18; i++) { const a = (i * Math.PI) / 9; roda.fillStyle(0xe2e8f0, 1).fillRect(Math.cos(a) * (RODA.r - 3) - 3, Math.sin(a) * (RODA.r - 3) - 3, 6, 6); }
    roda.fillStyle(0xcbd5e1, 1).fillCircle(0, 0, 20).lineStyle(4, 0x1e293b, 1).strokeCircle(0, 0, 20).fillStyle(0xf97316, 1).fillCircle(0, 0, 7);
    roda.setPosition(RODA.x, RODA.y);
    const paralama = this.add.graphics();
    const arco = (g: Phaser.GameObjects.Graphics, a0: number, a1: number, cor: number) => {
      g.lineStyle(26, 0x1e293b, 1).beginPath().arc(RODA.x, RODA.y, R_PARALAMA, rad(a0), rad(a1)).strokePath();
      g.lineStyle(20, cor, 1).beginPath().arc(RODA.x, RODA.y, R_PARALAMA, rad(a0 + 1), rad(a1 - 1)).strokePath();
    };
    arco(paralama, 180, 199, 0xcbd5e1);
    arco(paralama, angulo(NUM_PECAS - 1) + 18, 360, 0xcbd5e1);
    // Dashed outlines of the gaps.
    const vagas = this.add.graphics();
    for (let i = 0; i < NUM_PECAS; i++) {
      const p = pontoArco(angulo(i));
      vagas.save();
      vagas.lineStyle(3, 0xfde047, 0.9);
      const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
        const lx = (sx * MAPA_W * ESCALA_COLOCADO) / 2, ly = (sy * MAPA_H * ESCALA_COLOCADO) / 2, a = rad(angulo(i) + 90);
        return { x: p.x + lx * Math.cos(a) - ly * Math.sin(a), y: p.y + lx * Math.sin(a) + ly * Math.cos(a) };
      });
      for (let k = 0; k < 4; k++) {   // dashed edge
        const a = pts[k], b = pts[(k + 1) % 4];
        for (let t = 0; t < 1; t += 0.2) vagas.lineBetween(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.x + (b.x - a.x) * (t + 0.1), a.y + (b.y - a.y) * (t + 0.1));
      }
      vagas.restore();
    }
    janela.add([rover, roda, paralama, vagas]);
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) this.tweens.add({ targets: roda, angle: 360, duration: 2400, repeat: -1 });

    // Dust thrown up by the wheel while the gaps are open (less and less as maps go on).
    const poeira = this.time.addEvent({
      delay: 70, loop: true, callback: () => {
        if (Math.random() > (NUM_PECAS - mapasColocados(estado)) / NUM_PECAS) return;
        const p = pontoArco(250 + Math.random() * 60, RODA.r);
        const grao = this.add.circle(p.x, p.y, 2 + Math.random() * 4, 0xa8a29e, 0.9);
        janela.addAt(grao, 1);
        this.tweens.add({ targets: grao, x: p.x - 60 - Math.random() * 120, y: p.y - 70 - Math.random() * 80, alpha: 0, duration: 700 + Math.random() * 400, ease: 'Quad.easeOut', onComplete: () => grao.destroy() });
      },
    });

    // Maps waiting in the tray.
    const mapas = ESPERA.map(([x, y], i) => {
      const m = this.add.image(x, y, 'paralama_mapa_v1').setInteractive({ useHandCursor: true, draggable: true }).setData('i', i);
      janela.add(m);
      return m;
    });
    // Clamps (shown once every gap is covered).
    const presilhas = Array.from({ length: NUM_PECAS }, (_v, i) => {
      const p = pontoArco(angulo(i), R_PARALAMA + 18);
      const g = this.add.graphics();
      const desenhar = (fechada: boolean) => {
        g.clear().fillStyle(fechada ? 0xf97316 : 0xe2e8f0, 1).fillRoundedRect(-9, -15, 18, 30, 6).lineStyle(3, 0x1e293b, 1).strokeRoundedRect(-9, -15, 18, 30, 6);
        if (!fechada) g.fillStyle(0x1e293b, 1).fillRect(-3, -8, 6, 16);
      };
      desenhar(false);
      const c = this.add.container(p.x, p.y, [this.add.circle(0, 0, 24, 0xfde047, 0.25), g]).setAngle(angulo(i) + 90).setVisible(false)
        .setSize(48, 48).setInteractive({ useHandCursor: true });
      janela.add(c);
      return { c, desenhar };
    });

    let acabou = false;
    const local = (p: Phaser.Input.Pointer) => ({ x: (p.x - raiz.x) / s - JX, y: (p.y - raiz.y) / s - JY });
    this.input.on('dragstart', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      if (acabou || estado.mapas[obj.getData('i')] !== null) return;
      tocarSfx('pegar');
      janela.bringToTop(obj);
      this.tweens.add({ targets: obj, scale: ESCALA_COLOCADO, angle: 0, duration: 120 });
    });
    this.input.on('drag', (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      if (acabou || estado.mapas[obj.getData('i')] !== null) return;
      const l = local(p);
      obj.setPosition(l.x, l.y);
    });
    this.input.on('dragend', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      const i = obj.getData('i') as number;
      if (acabou || estado.mapas[i] !== null) return;
      let alvo = -1, melhor = 60;
      for (let v = 0; v < NUM_PECAS; v++) {
        const p = pontoArco(angulo(v)), d = Phaser.Math.Distance.Between(obj.x, obj.y, p.x, p.y);
        if (d < melhor && !estado.mapas.includes(v)) { melhor = d; alvo = v; }
      }
      if (alvo < 0) {
        tocarSfx('soltar');
        this.tweens.add({ targets: obj, x: ESPERA[i][0], y: ESPERA[i][1], scale: 1, duration: 220 });
        return;
      }
      estado = colocarMapa(estado, i, alvo);
      const p = pontoArco(angulo(alvo));
      tocarSfx('encaixe');
      obj.disableInteractive();
      this.tweens.add({ targets: obj, x: p.x, y: p.y, angle: angulo(alvo) + 90, scale: ESCALA_COLOCADO, duration: 160, ease: 'Back.easeOut' });
      if (estado.fase === 'prender') {
        poeira.remove();
        msg('No more dust! Now close the 4 clamps.', '#86efac');
        presilhas.forEach((q, k) => {
          q.c.setVisible(true);
          janela.bringToTop(q.c);
          this.tweens.add({ targets: q.c.list[0], scale: 1.25, yoyo: true, repeat: -1, duration: 450, delay: k * 90 });
        });
      } else msg(`${mapasColocados(estado)} of ${NUM_PECAS} gaps covered.`, '#ffffff');
    });

    presilhas.forEach((q, k) => q.c.on('pointerdown', () => {
      if (acabou || estado.fase !== 'prender' || estado.presilhas[k]) return;
      estado = prender(estado, k);
      q.desenhar(true);
      this.tweens.killTweensOf(q.c.list[0]);
      (q.c.list[0] as Phaser.GameObjects.Arc).setVisible(false);
      tocarSfx('clique');
      if (tarefaConcluida(estado)) {
        acabou = true;
        msg('Fender fixed!', '#86efac');
        vitoria(this, janela, JANELA_W, JANELA_H, 'Fender fixed!', 'True story: on Apollo 17 the crew fixed a broken rover fender with maps, tape and clamps.', this.aoConcluir);
      }
    }));
    // A map tapped without dragging gets a hint.
    mapas.forEach((m) => m.on('pointerup', (p: Phaser.Input.Pointer) => { if (!acabou && p.getDistance() < 6 && estado.mapas[m.getData('i')] === null) msg('Drag the map onto a yellow gap.', '#fde68a'); }));

    this.events.once('shutdown', () => { this.input.off('dragstart'); this.input.off('drag'); this.input.off('dragend'); });
  }
}
