// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Ship - Clean the window": wipe the fog and dust off the ship's window (dust takes two strokes), then tap Earth.
// The rules live in ../limpar-janela-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { criarJanela, limpar, tocar, fracaoLimpa, tarefaConcluida, COLUNAS, LINHAS, DICAS, type Alvo, type EstadoJanela } from '../limpar-janela-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, canvas, texto, vitoria } from './moldura';
import { PAINEL } from './PaineisSolaresTarefa';

const { JANELA_W, JANELA_H, QUADRO_W, QUADRO_H, FOLGA } = PAINEL;
const RAIO_PANO = 28;
// Where the things outside are; one of the layouts is picked each time.
const ARRANJOS: Record<Alvo, [number, number, number]>[] = [
  { terra: [410, 140, 62], lua: [170, 205, 36], marte: [520, 60, 20], estrela: [90, 70, 16] },
  { terra: [170, 130, 62], lua: [440, 90, 36], marte: [70, 240, 20], estrela: [520, 230, 16] },
  { terra: [300, 175, 62], lua: [95, 95, 36], marte: [505, 205, 20], estrela: [480, 60, 16] },
];

function texturas(cena: Phaser.Scene) {
  canvas(cena, 'janela_espaco_v1', JANELA_W, JANELA_H, (c) => {
    c.save(); c.beginPath(); c.roundRect(0, 0, JANELA_W, JANELA_H, 40); c.clip();
    const g = c.createRadialGradient(JANELA_W / 2, JANELA_H / 2, 40, JANELA_W / 2, JANELA_H / 2, JANELA_W * 0.7);
    g.addColorStop(0, '#1e1b4b'); g.addColorStop(1, '#020617');
    c.fillStyle = g; c.fillRect(0, 0, JANELA_W, JANELA_H);
    for (let i = 0; i < 90; i++) {
      c.globalAlpha = 0.3 + (i % 5) * 0.14; c.fillStyle = '#ffffff';
      c.fillRect((i * 137) % JANELA_W, (i * 71) % JANELA_H, i % 7 ? 1.5 : 2.5, i % 7 ? 1.5 : 2.5);
    }
    c.restore();
  });
  canvas(cena, 'janela_terra_v1', 132, 132, (c) => {
    const g = c.createRadialGradient(50, 50, 10, 66, 66, 62);
    g.addColorStop(0, '#60a5fa'); g.addColorStop(1, '#1d4ed8');
    c.fillStyle = g; c.beginPath(); c.arc(66, 66, 60, 0, Math.PI * 2); c.fill();
    c.save(); c.clip();
    c.fillStyle = '#22c55e';
    for (const [x, y, rx, ry] of [[40, 50, 22, 16], [58, 70, 12, 22], [92, 40, 18, 12], [96, 88, 16, 20]]) { c.beginPath(); c.ellipse(x, y, rx, ry, 0.4, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [x, y, rx, ry] of [[30, 82, 24, 6], [80, 24, 26, 6], [100, 66, 16, 5], [56, 106, 22, 6]]) { c.beginPath(); c.ellipse(x, y, rx, ry, -0.2, 0, Math.PI * 2); c.fill(); }
    c.restore();
    c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.beginPath(); c.arc(66, 66, 60, 0, Math.PI * 2); c.stroke();
  });
  canvas(cena, 'janela_lua_v1', 80, 80, (c) => {
    c.fillStyle = '#d1d5db'; c.beginPath(); c.arc(40, 40, 35, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#9ca3af';
    for (const [x, y, r] of [[28, 30, 8], [52, 46, 10], [34, 56, 5], [54, 24, 4]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
    c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.beginPath(); c.arc(40, 40, 35, 0, Math.PI * 2); c.stroke();
  });
  canvas(cena, 'janela_marte_v1', 48, 48, (c) => {
    const g = c.createRadialGradient(18, 18, 4, 24, 24, 22);
    g.addColorStop(0, '#fb923c'); g.addColorStop(1, '#c2410c');
    c.fillStyle = g; c.beginPath(); c.arc(24, 24, 19, 0, Math.PI * 2); c.fill();
    c.lineWidth = 3; c.strokeStyle = '#1e293b'; c.stroke();
  });
  canvas(cena, 'janela_estrela_v1', 40, 40, (c) => {
    c.fillStyle = '#fef9c3'; c.beginPath();
    for (let i = 0; i < 8; i++) { const r = i % 2 ? 5 : 18, a = (i * Math.PI) / 4 - Math.PI / 2; c.lineTo(20 + Math.cos(a) * r, 20 + Math.sin(a) * r); }
    c.closePath(); c.fill();
  });
}

export class LimparJanelaTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('LimparJanelaTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  create() {
    const semente = Math.floor(Math.random() * 100000);
    let estado: EstadoJanela = criarJanela(semente);
    const arranjo = ARRANJOS[semente % ARRANJOS.length];
    texturas(this);
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Clean the window');
    const msg = barraStatus(this, raiz, QUADRO_H, 'Rub the window to wipe off the fog and dust.');
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    const JX = -JANELA_W / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    raiz.add(janela);
    janela.add(this.add.image(0, 0, 'janela_espaco_v1').setOrigin(0));

    // Things outside: tapping them only works once the glass is clean.
    const chaves: Record<Alvo, string> = { terra: 'janela_terra_v1', lua: 'janela_lua_v1', marte: 'janela_marte_v1', estrela: 'janela_estrela_v1' };
    const objetos = (Object.keys(chaves) as Alvo[]).map((alvo) => {
      const [x, y, r] = arranjo[alvo];
      const img = this.add.image(x, y, chaves[alvo]).setDisplaySize(r * 2, r * 2);
      const zona = this.add.zone(x, y, r * 2 + 24, r * 2 + 24).setInteractive({ useHandCursor: true });
      janela.add([img, zona]);
      return { alvo, img, zona };
    });

    // Dirt layer: fog on every cell, brown dust specks on the cells that need a second stroke.
    const cw = JANELA_W / COLUNAS, ch = JANELA_H / LINHAS;
    const sujeira = this.add.graphics();
    const desenharSujeira = () => {
      sujeira.clear();
      estado.sujeira.forEach((v, k) => {
        if (!v) return;
        const x = (k % COLUNAS) * cw, y = Math.floor(k / COLUNAS) * ch;
        // Corner cells follow the window's rounded corners.
        const c = k % COLUNAS, l = Math.floor(k / COLUNAS), R = 40;
        const raio = { tl: c === 0 && l === 0 ? R : 0, tr: c === COLUNAS - 1 && l === 0 ? R : 0, bl: c === 0 && l === LINHAS - 1 ? R : 0, br: c === COLUNAS - 1 && l === LINHAS - 1 ? R : 0 };
        sujeira.fillStyle(0xdbe4ee, v === 2 ? 0.88 : 0.72).fillRoundedRect(x, y, cw + 0.5, ch + 0.5, raio);
        if (v === 2) {
          // moon dust: specks of different sizes, a different pattern on every cell
          for (let i = 0; i < 7; i++) {
            const h = Math.sin(k * 91.7 + i * 47.3) * 43758.5453, a = h - Math.floor(h);
            const h2 = Math.sin(k * 12.9 + i * 78.2) * 24634.6345, b = h2 - Math.floor(h2);
            sujeira.fillStyle(i % 3 ? 0x9a8a74 : 0x7c6f5e, 0.75).fillCircle(x + (0.12 + a * 0.76) * cw, y + (0.12 + b * 0.76) * ch, 2 + ((a + b) * 3) % 4);
          }
        }
      });
    };
    janela.add(sujeira);
    desenharSujeira();
    // The porthole frame drawn over the glass.
    const aro = this.add.graphics()
      .lineStyle(14, 0x94a3b8, 1).strokeRoundedRect(0, 0, JANELA_W, JANELA_H, 40)
      .lineStyle(4, 0x1e293b, 1).strokeRoundedRect(-7, -7, JANELA_W + 14, JANELA_H + 14, 46).strokeRoundedRect(7, 7, JANELA_W - 14, JANELA_H - 14, 34);
    for (const [x, y] of [[30, 12], [JANELA_W - 30, 12], [30, JANELA_H - 12], [JANELA_W - 30, JANELA_H - 12]]) aro.fillStyle(0xe2e8f0).fillCircle(x, y, 4).lineStyle(1.5, 0x1e293b).strokeCircle(x, y, 4);
    const pano = this.add.circle(0, 0, RAIO_PANO, 0x7dd3fc, 0.3).setStrokeStyle(3, 0xffffff, 0.9).setVisible(false);
    janela.add([aro, pano]);

    // Progress bar.
    const medidor = this.add.graphics();
    raiz.add(medidor);
    raiz.add(texto(this, -232, 133, 'Clean', 18, '#ffffff', 0x1e293b));
    const pct = texto(this, 222, 133, '0%', 18, '#ffffff', 0x1e293b);
    raiz.add(pct);
    const desenharMedidor = () => {
      const q = estado.fase === 'limpar' ? fracaoLimpa(estado) : 1;
      medidor.clear().fillStyle(0xffffff, 1).fillRoundedRect(-160, 120, 340, 26, 13).lineStyle(4, 0x1e293b, 1).strokeRoundedRect(-160, 120, 340, 26, 13);
      if (q > 0.01) medidor.fillStyle(q >= 1 ? 0x22c55e : 0x38bdf8, 1).fillRoundedRect(-157, 123, Math.max(20, 334 * q), 20, 10);
      pct.setText(`${Math.round(q * 100)}%`);
    };
    desenharMedidor();

    let acabou = false;
    let tocadasNoGesto = new Set<number>();   // one layer per cell per stroke: dust needs two strokes
    const local = (p: Phaser.Input.Pointer) => ({ x: (p.x - raiz.x) / s - JX, y: (p.y - raiz.y) / s - JY });
    const esfregar = (l: { x: number; y: number }) => {
      const celulas: number[] = [];
      estado.sujeira.forEach((v, k) => {
        if (!v || tocadasNoGesto.has(k)) return;
        const cx = (k % COLUNAS + 0.5) * cw, cy = (Math.floor(k / COLUNAS) + 0.5) * ch;
        if (Math.hypot(l.x - cx, l.y - cy) <= RAIO_PANO + 14) { celulas.push(k); tocadasNoGesto.add(k); }
      });
      if (!celulas.length) return;
      estado = limpar(estado, celulas);
      tocarSfx('suave');
      desenharSujeira(); desenharMedidor();
      if (estado.fase === 'achar') {
        pano.setVisible(false);
        tocarSfx('ok');
        msg('So clear! Now find Earth and tap it.', '#86efac');
        this.tweens.add({ targets: objetos.find((o) => o.alvo === 'terra')!.img, scale: '*=1.08', yoyo: true, duration: 500, repeat: 1 });
      }
    };

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (acabou || estado.fase !== 'limpar') return;
      tocadasNoGesto = new Set();
      esfregar(local(p));
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (acabou || estado.fase !== 'limpar') return;
      const l = local(p);
      pano.setVisible(l.x >= 0 && l.x <= JANELA_W && l.y >= 0 && l.y <= JANELA_H).setPosition(l.x, l.y);
      if (p.isDown) esfregar(l);
    });
    this.input.on('pointerup', () => {
      if (acabou || estado.fase !== 'limpar') return;
      if (estado.sujeira.some((v) => v === 1) && tocadasNoGesto.size) msg('Some dust is still there. Rub again!', '#fde68a');
      tocadasNoGesto = new Set();
    });

    objetos.forEach((o) => o.zona.on('pointerdown', () => {
      if (acabou || estado.fase !== 'achar') return;
      estado = tocar(estado, o.alvo);
      if (tarefaConcluida(estado)) {
        acabou = true;
        msg('You found Earth!', '#86efac');
        vitoria(this, janela, JANELA_W, JANELA_H, 'Hello, Earth!', 'The Space Station\'s Cupola has 7 windows, with covers that close to protect the glass.', this.aoConcluir);
        return;
      }
      tocarSfx('soltar');
      if (o.alvo !== 'terra') msg(DICAS[o.alvo], '#fde68a');
      this.tweens.add({ targets: o.img, angle: { from: -8, to: 8 }, yoyo: true, duration: 80, repeat: 2, onComplete: () => o.img.setAngle(0) });
    }));

    this.events.once('shutdown', () => { this.input.off('pointerdown'); this.input.off('pointermove'); this.input.off('pointerup'); });
  }
}
