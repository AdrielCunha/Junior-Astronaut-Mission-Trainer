// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Shared look of the task panels (metal frame, blue title pill, dark instruction pill, red close button),
// the same one as the Life Support task (cenas/Tarefa.ts), so every task feels like part of the same cockpit.
import Phaser from 'phaser';
import { sfxDaMensagem, tocarSfx } from '../sfx';
import { prepararConclusaoTarefa, fecharTarefa, concluirTarefa } from './conclusaoTarefa';
export { concluirTarefa } from './conclusaoTarefa';
import { escalaInterface } from '../mobile';

export const FONTE = '"Fredoka", system-ui, "Segoe UI", sans-serif';
export const CONTORNO = 0x1e293b;   // dark outline of the Life Support look

export function texto(scene: Phaser.Scene, x: number, y: number, t: string, tam: number, cor: string, contorno = CONTORNO) {
  return scene.add.text(x, y, t, {
    fontFamily: FONTE, fontSize: `${tam}px`, color: cor, fontStyle: '600',
    stroke: `#${contorno.toString(16).padStart(6, '0')}`, strokeThickness: Math.max(2, tam / 6), resolution: window.devicePixelRatio || 1,
  }).setOrigin(0.5);
}

// A canvas texture drawn once and kept for every later run of any task.
export function canvas(scene: Phaser.Scene, chave: string, w: number, h: number, desenhar: (c: CanvasRenderingContext2D) => void) {
  if (scene.textures.exists(chave)) return;
  const t = scene.textures.createCanvas(chave, w, h);
  if (!t) return;
  desenhar(t.getContext());
  t.refresh();
}

// Every task panel has the same size on screen as the Life Support one (cenas/Tarefa.ts): 660 x 480 at the
// UI scale u (1 at 1100x650). `totalW` x `totalH` is the panel we draw (frame + title + status), so the frame is totalW-60 x totalH-80.
export function escalaPainel(scene: Phaser.Scene, totalW: number, totalH: number) {
  const W = scene.scale.width, H = scene.scale.height;
  const u = escalaInterface(W, H);
  const alvoW = Math.min(W - 40 * u, 660 * u), alvoH = Math.min(H - 40 * u, 480 * u);
  return Math.min(alvoW / (totalW - 60), alvoH / (totalH - 80));
}

// Dims the game below (and blocks its clicks), then makes the root container scaled to the standard panel size.
export function abrirPainel(scene: Phaser.Scene, totalW: number, totalH: number) {
  const W = scene.scale.width, H = scene.scale.height;
  scene.add.rectangle(0, 0, W, H, 0x020617, 0.55).setOrigin(0).setInteractive();
  const s = escalaPainel(scene, totalW, totalH);
  const raiz = scene.add.container(W / 2, H / 2 + 8 * s).setScale(s);
  return { raiz, s };
}

// Metal panel of the Life Support task (src/cenas/Tarefa.ts): flat light metal, slate border, white inner line, bolts.
// Centred on (0,0) of `raiz`.
export function moldura(scene: Phaser.Scene, raiz: Phaser.GameObjects.Container, w: number, h: number) {
  const chave = `moldura_${w}x${h}`;
  canvas(scene, chave, w + 40, h + 50, (c) => {
    c.translate(20, 14);
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.roundRect(6, 8, w, h, 26); c.fill();
    c.fillStyle = '#d5dde6'; c.beginPath(); c.roundRect(0, 0, w, h, 26); c.fill();
    c.lineWidth = 5; c.strokeStyle = '#64748b'; c.stroke();
    c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.roundRect(7, 7, w - 14, h - 14, 20); c.stroke();
    for (const sx of [18, w - 18]) for (const sy of [18, h - 18]) {
      c.fillStyle = '#94a3b8'; c.beginPath(); c.arc(sx, sy, 5, 0, Math.PI * 2); c.fill();
      c.lineWidth = 1.5; c.strokeStyle = '#64748b'; c.stroke();
    }
  });
  raiz.add(scene.add.image(-w / 2 - 20, -h / 2 - 14, chave).setOrigin(0));
}

// Blue pill on the top edge, white border and a dark outline around it.
export function faixaTitulo(scene: Phaser.Scene, raiz: Phaser.GameObjects.Container, h: number, titulo: string) {
  const t = scene.add.text(0, -h / 2, titulo, {
    fontFamily: FONTE, fontSize: '21px', color: '#ffffff', fontStyle: '600', resolution: window.devicePixelRatio || 1,
  }).setOrigin(0.5);
  const pw = t.width + 56, ph = 44, y = -h / 2 - ph / 2;
  const g = scene.add.graphics();
  g.fillStyle(0x2563eb).fillRoundedRect(-pw / 2, y, pw, ph, ph / 2);
  g.lineStyle(4, 0xffffff).strokeRoundedRect(-pw / 2, y, pw, ph, ph / 2);
  g.lineStyle(2, CONTORNO).strokeRoundedRect(-pw / 2 - 3, y - 3, pw + 6, ph + 6, ph / 2 + 3);
  raiz.add(g);
  raiz.add(t);
}

// The dark pill at the bottom with the instruction. Returns a function to change its text and colour.
export function barraStatus(scene: Phaser.Scene, raiz: Phaser.GameObjects.Container, h: number, inicial: string) {
  const g = scene.add.graphics();
  g.fillStyle(CONTORNO, 0.95).fillRoundedRect(-270, h / 2 - 63, 540, 40, 20);
  raiz.add(g);
  const t = scene.add.text(0, h / 2 - 43, inicial, {
    fontFamily: FONTE, fontSize: '17px', color: '#ffffff', fontStyle: '600', align: 'center', resolution: window.devicePixelRatio || 1,
  }).setOrigin(0.5);
  raiz.add(t);
  return (msg: string, cor = '#ffffff') => {
    if (msg !== t.text) { const som = sfxDaMensagem(cor); if (som) tocarSfx(som); }
    t.setText(msg).setColor(cor);
  };
}

// Red X / Esc cancel an unfinished task, or confirm an already completed one.
export function botaoFechar(scene: Phaser.Scene, raiz: Phaser.GameObjects.Container, w: number, h: number) {
  prepararConclusaoTarefa(scene);
  const b = scene.add.container(-w / 2 + 4, -h / 2 + 4, [
    scene.add.circle(0, 0, 23, 0xef4444).setStrokeStyle(4, 0xffffff),
    scene.add.circle(0, 0, 26).setStrokeStyle(2, CONTORNO),
    scene.add.graphics().lineStyle(5, 0xffffff, 1).lineBetween(-8, -8, 8, 8).lineBetween(8, -8, -8, 8),
  ]).setSize(52, 52).setDepth(20);
  b.setInteractive({ useHandCursor: true });
  b.on('pointerover', () => b.setScale(1.1));
  b.on('pointerout', () => b.setScale(1));
  const sair = () => { tocarSfx('fechar'); fecharTarefa(scene); };
  b.on('pointerup', sair);
  scene.input.keyboard?.once('keydown-ESC', sair);
  scene.events.once('shutdown', () => scene.input.keyboard?.off('keydown-ESC', sair));
  raiz.add(b);
  if ((scene.sys.settings.data as { pular?: string })?.pular) {
    raiz.add(texto(scene,-w/2+43,-h/2+12,'Skip',17,'#ffffff').setOrigin(0,0.5));
  }
}

// Little stars that burst out of a point (a success, or a hit).
export function rajada(scene: Phaser.Scene, pai: Phaser.GameObjects.Container, x: number, y: number, cores: number[], n: number, alcance: number) {
  if (n >= 26) tocarSfx('sucesso');   // the big confetti is the task win
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random();
    const p = scene.add.star(x, y, 5, 3, 7, cores[i % cores.length]).setDepth(30);
    pai.add(p);
    scene.tweens.add({
      targets: p, x: x + Math.cos(a) * alcance * (0.5 + Math.random() / 2), y: y + Math.sin(a) * alcance * (0.5 + Math.random() / 2),
      alpha: 0, angle: 180, duration: 650 + Math.random() * 300, onComplete: () => p.destroy(),
    });
  }
}

// The win moment shared by the newer tasks: a white flash, confetti, a green banner with the title and the
// real fact, then the panel closes and calls aoFim. `pai` is the task's play area, (w, h) its size.
export function vitoria(scene: Phaser.Scene, pai: Phaser.GameObjects.Container, w: number, h: number, titulo: string, fato: string, aoFim?: () => void) {
  const brilho = scene.add.rectangle(0, 0, w, h, 0xffffff, 0.5).setOrigin(0);
  pai.add(brilho);
  scene.tweens.add({ targets: brilho, alpha: 0, duration: 900 });
  rajada(scene, pai, w / 2, h / 2, [0xfde047, 0x86efac, 0x7dd3fc, 0xf9a8d4], 26, 190);
  const bw = Math.min(560, w - 30);
  const faixa = scene.add.graphics()
    .fillStyle(0x16a34a, 1).fillRoundedRect(-bw / 2, -62, bw, 124, 40)
    .lineStyle(5, CONTORNO, 1).strokeRoundedRect(-bw / 2, -62, bw, 124, 40);
  const nota = texto(scene, 0, 28, fato, 15, '#dcfce7', 0x14532d).setWordWrapWidth(bw - 50).setAlign('center');
  const bloco = scene.add.container(w / 2, h / 2, [faixa, texto(scene, 0, -20, titulo, 36, '#ffffff', 0x14532d), nota]).setScale(0).setDepth(40);
  pai.add(bloco);
  scene.tweens.add({ targets: bloco, scale: 1, duration: 200, delay: 50, ease: 'Back.easeOut' });
  concluirTarefa(scene, aoFim);
}
