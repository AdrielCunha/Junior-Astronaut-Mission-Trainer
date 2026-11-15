// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Escudo - Tempestade solar": drag water bags to the wall that faces the storm until the radiation felt inside drops.
// The rules live in ../tapar-tempestade-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { criarTarefaTapar, colocarSaco, removerSaco, doseSentida, tarefaConcluida, sacosNoLadoCerto, type TarefaTapar, type EncaixeTempestade } from '../tapar-tempestade-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto } from './moldura';
import { tocarSfx } from '../sfx';

const QUADRO_W = 760;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const FOLGA = (QUADRO_H - 500) / 2;   // the frame is taller than the layout was drawn for: centre the content
const INSTRUCAO = 'Drag the water bags to the wall where the storm is coming from.';
const BASE_Y = -45;          // vertical centre of the base module
const PASSO = 62;            // distance between slots
const BASE_LARG = 200;
const BASE_ALT = 250;

export class TaparTempestadeTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('TaparTempestadeTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  private criarTexturas() {
    // A water bag: a flat blue pouch with a knot on top and a thick outline.
    canvas(this, 'tapar_saco_v2', 128, 120, (c) => {
      c.scale(2, 2); c.lineJoin = 'round'; c.lineWidth = 3.5; c.strokeStyle = '#1e293b';
      c.fillStyle = '#38bdf8'; c.beginPath(); c.roundRect(6, 12, 52, 40, [20, 20, 16, 16]); c.fill(); c.stroke();
      c.fillStyle = '#0ea5e9'; c.beginPath(); c.roundRect(24, 3, 16, 12, 5); c.fill(); c.stroke();
      c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath();
      c.moveTo(14, 36); c.quadraticCurveTo(22, 30, 30, 36); c.quadraticCurveTo(38, 42, 46, 36); c.stroke();
    });
    // The base module: a flat rounded capsule with a window and the crew inside.
    canvas(this, 'tapar_base_v2', BASE_LARG + 24, BASE_ALT + 30, (c) => {
      c.translate(8, 6); c.lineJoin = 'round';
      c.fillStyle = '#e2e8f0'; c.beginPath(); c.roundRect(0, 0, BASE_LARG, BASE_ALT, 44); c.fill();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.stroke();
      const wx = 30, wy = 50, ww = BASE_LARG - 60, wh = 110;
      c.fillStyle = '#1e40af'; c.beginPath(); c.roundRect(wx, wy, ww, wh, 28); c.fill();
      c.lineWidth = 5; c.stroke();
      const equipe: [number, string][] = [[wx + 30, '#fde68a'], [wx + ww / 2, '#fda4af'], [wx + ww - 30, '#86efac']];
      for (const [x, cor] of equipe) {
        c.lineWidth = 3.5;
        c.fillStyle = '#e2e8f0'; c.beginPath(); c.arc(x, wy + 62, 20, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = cor; c.beginPath(); c.arc(x, wy + 63, 12, 0, Math.PI * 2); c.fill(); c.stroke();
      }
      // warning plate with the radiation symbol
      c.fillStyle = '#facc15'; c.beginPath(); c.roundRect(BASE_LARG / 2 - 36, 188, 72, 34, 12); c.fill();
      c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#1e293b'; c.beginPath(); c.arc(BASE_LARG / 2, 205, 4, 0, Math.PI * 2); c.fill();
      for (const a of [-1.57, 0.52, 2.62]) { c.beginPath(); c.moveTo(BASE_LARG / 2, 205); c.arc(BASE_LARG / 2, 205, 13, a - 0.5, a + 0.5); c.closePath(); c.fill(); }
    });
    // The sun: a flat yellow ball with a happy face.
    canvas(this, 'tapar_sol_v2', 200, 200, (c) => {
      c.fillStyle = '#fde047'; c.beginPath(); c.arc(100, 100, 52, 0, Math.PI * 2); c.fill();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.stroke();
      c.fillStyle = '#1e293b';
      c.beginPath(); c.arc(84, 94, 5, 0, Math.PI * 2); c.arc(116, 94, 5, 0, Math.PI * 2); c.fill();
      c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.arc(100, 106, 14, 0.2, Math.PI - 0.2); c.stroke();
    });
    // Flat blue scene area with a darker top band, stars, a grey moon ground and a thick outline.
    canvas(this, 'tapar_fundo_v2', 700, 330, (c) => {
      c.save(); c.beginPath(); c.roundRect(0, 0, 700, 330, 24); c.clip();
      c.fillStyle = '#2563eb'; c.fillRect(0, 0, 700, 330);
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 0, 700, 330 * 0.2);
      for (let i = 0; i < 45; i++) {
        const x = (i * 211) % 700, y = (i * 97) % 270, r = 1.2 + (i % 3) * 0.6;
        c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = '#cbd5e1'; c.fillRect(0, 280, 700, 50);
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.beginPath(); c.moveTo(0, 280); c.lineTo(700, 280); c.stroke();
      c.fillStyle = '#94a3b8';
      for (const [x, y, r] of [[120, 305, 14], [330, 300, 10], [560, 308, 16]]) { c.beginPath(); c.ellipse(x, y, r * 1.6, r * 0.6, 0, 0, Math.PI * 2); c.fill(); }
      c.restore();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.beginPath(); c.roundRect(2.5, 2.5, 695, 325, 22); c.stroke();
    });
  }

  create() {
    let estado: TarefaTapar = criarTarefaTapar('esquerda');
    this.criarTexturas();
    const dir = estado.ladoTempestade === 'esquerda' ? -1 : 1;      // side of the storm on the x axis
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Shield - Solar Storm');
    const msg = barraStatus(this, raiz, QUADRO_H, INSTRUCAO);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    // ---- Scene: sky, sun, base.
    raiz.add(this.add.image(0, -45, 'tapar_fundo_v2'));
    const sol = this.add.container(dir * 290, BASE_Y - 10);
    const raios = this.add.graphics();
    raios.fillStyle(0xfacc15, 1).lineStyle(3, 0x1e293b, 1);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      raios.fillTriangle(Math.cos(a - 0.12) * 56, Math.sin(a - 0.12) * 56, Math.cos(a + 0.12) * 56, Math.sin(a + 0.12) * 56, Math.cos(a) * 74, Math.sin(a) * 74);
      raios.strokeTriangle(Math.cos(a - 0.12) * 56, Math.sin(a - 0.12) * 56, Math.cos(a + 0.12) * 56, Math.sin(a + 0.12) * 56, Math.cos(a) * 74, Math.sin(a) * 74);
    }
    sol.add([raios, this.add.image(0, 0, 'tapar_sol_v2').setScale(0.9)]);
    this.tweens.add({ targets: raios, angle: 360, duration: 12000, repeat: -1 });
    this.tweens.add({ targets: sol, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    raiz.add(sol);
    raiz.add(texto(this, dir * 290, BASE_Y - 100, 'Solar storm!', 18, '#fde047', 0x1e293b));

    const base = this.add.image(0, BASE_Y, 'tapar_base_v2').setOrigin(0.5);
    raiz.add(base);

    // ---- Slots on both walls.
    const centroEncaixe = (e: EncaixeTempestade) => ({
      x: (e.lado === 'esquerda' ? -1 : 1) * (BASE_LARG / 2 + 36),
      y: BASE_Y + (e.fileira - (estado.fileiras - 1) / 2) * PASSO + 10,
    });
    const fantasmas = this.add.graphics();
    for (const e of estado.encaixes) {
      const c = centroEncaixe(e);
      fantasmas.fillStyle(0xffffff, 0.2).fillRoundedRect(c.x - 30, c.y - 28, 60, 56, 14);
      fantasmas.lineStyle(3, 0xffffff, 0.9).strokeRoundedRect(c.x - 30, c.y - 28, 60, 56, 14);
    }
    raiz.add(fantasmas);
    const sacosNoEncaixe = estado.encaixes.map((e) => {
      const c = centroEncaixe(e);
      const im = this.add.image(c.x, c.y, 'tapar_saco_v2').setScale(0.46).setVisible(false);
      im.setInteractive({ useHandCursor: true });
      raiz.add(im);
      return im;
    });

    // ---- Pile of bags (on the side opposite to the sun).
    const PX = -dir * 295, PY = 20;
    const posPilha = [[-20, 52], [20, 52], [-20, 10], [20, 10], [-20, -32], [20, -32]];
    raiz.add(this.add.graphics().fillStyle(0x1d4ed8, 1).fillRoundedRect(PX - 56, PY - 82, 112, 168, 18).lineStyle(4, 0x1e293b, 1).strokeRoundedRect(PX - 56, PY - 82, 112, 168, 18));
    raiz.add(texto(this, PX, PY - 66, 'Bags', 16, '#ffffff', 0x1e293b));
    const pilha = posPilha.map(([dx, dy]) => {
      const im = this.add.image(PX + dx, PY + dy, 'tapar_saco_v2').setScale(0.42);
      raiz.add(im);
      return im;
    });
    const zonaPilha = this.add.zone(PX, PY, 112, 168).setInteractive({ useHandCursor: true });
    raiz.add(zonaPilha);

    // ---- Radiation meter.
    const medidor = this.add.graphics();
    raiz.add(medidor);
    raiz.add(texto(this, -222, 133, 'Radiation', 16, '#ffffff', 0x1e293b));
    const pct = texto(this, 232, 133, '100%', 18, '#ffffff', 0x1e293b);
    raiz.add(pct);
    const desenharMedidor = () => {
      const d = doseSentida(estado);
      const cor = d > 0.5
        ? Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(250, 204, 21), new Phaser.Display.Color(239, 68, 68), 100, (d - 0.5) * 200)
        : Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(34, 197, 94), new Phaser.Display.Color(250, 204, 21), 100, d * 200);
      medidor.clear();
      medidor.fillStyle(0xffffff, 1).fillRoundedRect(-170, 120, 380, 26, 13).lineStyle(4, 0x1e293b, 1).strokeRoundedRect(-170, 120, 380, 26, 13);
      medidor.fillStyle(Phaser.Display.Color.GetColor(cor.r, cor.g, cor.b), 1).fillRoundedRect(-167, 123, Math.max(20, 374 * d), 20, 10);
      pct.setText(`${Math.round(d * 100)}%`);
    };
    let noAr = 0;   // bags being dragged or flying back (hidden from the pile)
    const pintarTudo = () => {
      estado.encaixes.forEach((e, i) => sacosNoEncaixe[i].setVisible(e.ocupado));
      pilha.forEach((im, i) => im.setVisible(i < estado.sacosNaPilha - noAr));
      desenharMedidor();
    };
    pintarTudo();

    // ---- Storm particles: they stop at a covered slot, or hit the base (which blinks) where the wall is bare.
    type Particula = { o: Phaser.GameObjects.Arc; y: number; v: number };
    const particulas: Particula[] = [];
    const yTopo = BASE_Y + 10 - (estado.fileiras / 2) * PASSO;
    const xParede = dir * (BASE_LARG / 2);
    const xBorda = dir * (BASE_LARG / 2 + 66);
    let acabou = false;
    let proximo = 0;
    const lancar = () => {
      const fileira = Phaser.Math.Between(0, estado.fileiras - 1);
      const y = yTopo + (fileira + 0.5) * PASSO + Phaser.Math.Between(-18, 18);
      const o = this.add.circle(dir * 235, y, Phaser.Math.Between(3, 5), 0xfde047).setStrokeStyle(1.5, 0x1e293b);
      raiz.add(o);
      particulas.push({ o, y, v: 150 + Math.random() * 90 });
    };
    const coberta = (y: number) => {
      const fileira = Math.min(estado.fileiras - 1, Math.max(0, Math.floor((y - yTopo) / PASSO)));
      return estado.encaixes.some((e) => e.lado === estado.ladoTempestade && e.fileira === fileira && e.ocupado);
    };
    const piscar = () => { base.setTint(0xfca5a5); this.time.delayedCall(90, () => base.clearTint()); };

    // ---- Dragging a bag from the pile.
    const aoLocal = (p: Phaser.Input.Pointer) => ({ x: (p.x - raiz.x) / s, y: (p.y - raiz.y) / s });
    let arrastado: Phaser.GameObjects.Image | null = null;
    const voltarPilha = (im: Phaser.GameObjects.Image) => {
      this.tweens.add({ targets: im, x: PX, y: PY, alpha: 0, scale: 0.3, duration: 260, ease: 'Quad.easeIn', onComplete: () => { im.destroy(); noAr--; pintarTudo(); } });
    };
    zonaPilha.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (acabou || arrastado || estado.sacosNaPilha - noAr <= 0) return;
      const l = aoLocal(p);
      arrastado = this.add.image(l.x, l.y, 'tapar_saco_v2').setScale(0.55).setDepth(50);
      raiz.add(arrastado);
      noAr++;
      tocarSfx('pegar');
      pintarTudo();
      msg('Take the bag to the wall.');
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (arrastado) { const l = aoLocal(p); arrastado.setPosition(l.x, l.y); } });

    let meio = false;
    const vencer = () => {
      acabou = true;
      msg('Shield active! The crew is safe.', '#86efac');
      this.tweens.add({ targets: base, scale: 1.04, duration: 220, yoyo: true, repeat: 2 });
      rajada(this, raiz, 0, BASE_Y, [0xfde047, 0x86efac, 0x7dd3fc, 0xf9a8d4], 26, 190);
      const faixa = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-270, -58, 540, 116, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-270, -58, 540, 116, 40);
      const bloco = this.add.container(0, BASE_Y, [
        faixa,
        texto(this, 0, -16, 'Shield active!', 38, '#ffffff', 0x14532d),
        texto(this, 0, 28, 'Water helps block radiation from space.', 15, '#dcfce7', 0x14532d),
      ]).setScale(0).setDepth(40);
      raiz.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 450, delay: 250, ease: 'Back.easeOut' });
      this.time.delayedCall(2800, () => { this.scene.stop(); this.aoConcluir?.(); });
    };

    const soltar = (p: Phaser.Input.Pointer) => {
      const im = arrastado;
      if (!im) return;
      arrastado = null;
      const l = aoLocal(p);
      let melhor: EncaixeTempestade | null = null, dist = 46;
      for (const e of estado.encaixes) {
        const c = centroEncaixe(e);
        const d = Phaser.Math.Distance.Between(l.x, l.y, c.x, c.y);
        if (d < dist) { dist = d; melhor = e; }
      }
      if (!melhor) { tocarSfx('soltar'); voltarPilha(im); msg(INSTRUCAO); return; }
      const r = colocarSaco(estado, melhor.id);
      const c = centroEncaixe(melhor);
      if (r.resultado === 'certo') {
        estado = r.tarefa;
        tocarSfx('encaixe');
        im.destroy();
        noAr--;
        pintarTudo();
        const alvo = sacosNoEncaixe[melhor.id];
        alvo.setScale(0.7);
        this.tweens.add({ targets: alvo, scale: 0.46, duration: 260, ease: 'Back.easeOut' });
        rajada(this, raiz, c.x, c.y, [0x7dd3fc, 0xe0f2fe, 0xfde047], 8, 50);
        if (tarefaConcluida(estado)) { vencer(); return; }
        if (!meio && sacosNoLadoCerto(estado) >= 2) { meio = true; msg('Great job! Cover the rest of the wall.', '#fde68a'); }
        else msg('Yes! The radiation is going down.', '#86efac');
      } else {
        this.tweens.add({ targets: im, x: c.x, y: c.y, duration: 120, yoyo: true, onComplete: () => voltarPilha(im) });
        msg(r.resultado === 'lado-errado' ? 'The storm is coming from the other side!' : INSTRUCAO, '#fca5a5');
      }
    };
    this.input.on('pointerup', soltar);

    // Taking a bag back from a slot (click it).
    sacosNoEncaixe.forEach((im, i) => im.on('pointerdown', () => {
      if (acabou || arrastado) return;
      estado = removerSaco(estado, estado.encaixes[i].id);
      tocarSfx('pegar');
      pintarTudo();
      msg('Bag returned. Place it again where you need it.');
    }));

    const aCadaQuadro = (_t: number, delta: number) => {
      const dt = Math.min(0.05, delta / 1000);
      if (!acabou) { proximo -= dt; if (proximo <= 0) { proximo = 0.09; if (particulas.length < 36) lancar(); } }
      for (let i = particulas.length - 1; i >= 0; i--) {
        const p = particulas[i];
        p.o.x += -dir * p.v * dt;
        const passou = dir < 0 ? p.o.x >= xBorda : p.o.x <= xBorda;
        const bateu = dir < 0 ? p.o.x >= xParede : p.o.x <= xParede;
        if (passou && coberta(p.y) && !bateu) {
          const b = this.add.circle(p.o.x, p.o.y, 5, 0x7dd3fc, 0.8); raiz.add(b);
          this.tweens.add({ targets: b, scale: 2.2, alpha: 0, duration: 260, onComplete: () => b.destroy() });
          p.o.destroy(); particulas.splice(i, 1);
        } else if (bateu) {
          if (!acabou) piscar();
          p.o.destroy(); particulas.splice(i, 1);
        }
      }
    };
    this.events.on('update', aCadaQuadro);
    this.events.once('shutdown', () => this.events.off('update', aCadaQuadro));
  }
}
