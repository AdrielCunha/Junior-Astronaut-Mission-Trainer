// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Shared cartoon look for the task screens: rounded font, bright colors, thick dark outlines.
import type Phaser from 'phaser';
import { fonte } from '../cenas/sessao';

export const CONTORNO = 0x1e293b;
export const CORES_FESTA = [0xfde047, 0x4ade80, 0xf472b6, 0x60a5fa, 0xfb923c];

export const letra = (tamanho: number, cor = '#ffffff', extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
  fonte(tamanho, cor, { fontFamily: '"Fredoka", system-ui, "Segoe UI", sans-serif', fontStyle: '600', ...extra });

export type Caixa = { x: number; y: number; w: number; h: number };

// The frame every kid-facing screen shares (task screens, title screen): a metal panel with bolts,
// a bright starry screen, a title pill on the top edge and room for a dark pill at the bottom.
// Draw inside `tela`, then call borda() so the screen's edge stays on top of what was drawn.
export function moldura(cena: Phaser.Scene, painel: Caixa, u: number, titulo: string, fundo = 0x2563eb) {
  const { x: x0, y: y0, w: largura, h: altura } = painel;
  const g = cena.add.graphics();
  g.fillStyle(0x000000, 0.35).fillRoundedRect(x0 + 6 * u, y0 + 8 * u, largura, altura, 26 * u);
  g.fillStyle(0xd5dde6).fillRoundedRect(x0, y0, largura, altura, 26 * u);
  g.lineStyle(5 * u, 0x64748b).strokeRoundedRect(x0, y0, largura, altura, 26 * u);
  g.lineStyle(2 * u, 0xffffff, 0.7).strokeRoundedRect(x0 + 7 * u, y0 + 7 * u, largura - 14 * u, altura - 14 * u, 20 * u);
  for (const [bx, by] of [[x0 + 18 * u, y0 + 18 * u], [x0 + largura - 18 * u, y0 + 18 * u], [x0 + 18 * u, y0 + altura - 18 * u], [x0 + largura - 18 * u, y0 + altura - 18 * u]]) {
    g.fillStyle(0x94a3b8).fillCircle(bx, by, 5 * u).lineStyle(1.5 * u, 0x64748b).strokeCircle(bx, by, 5 * u);
  }

  const tela: Caixa = { x: x0 + 26 * u, y: y0 + 38 * u, w: largura - 52 * u, h: altura - 38 * u - 92 * u };
  g.fillStyle(fundo).fillRoundedRect(tela.x, tela.y, tela.w, tela.h, 18 * u);
  // Slightly darker toward the top, fading out (a hard edge read as a line across the screen).
  // Bands meet on whole pixels: overlapping them would draw thin darker lines.
  const faixas = 24, topo = Math.round(tela.y + 18 * u), alto = Math.round(tela.h * 0.5 - 18 * u);
  for (let k = 0; k < faixas; k++) {
    const a = topo + Math.round((k * alto) / faixas), b = topo + Math.round(((k + 1) * alto) / faixas);
    g.fillStyle(0x000000, 0.12 * (1 - (k + 0.5) / faixas)).fillRect(tela.x, a, tela.w, b - a);
  }
  g.fillStyle(0x000000, 0.12).fillRoundedRect(tela.x, tela.y, tela.w, topo - tela.y, { tl: 18 * u, tr: 18 * u, bl: 0, br: 0 });
  for (let i = 0; i < 45 + Math.round(tela.w * tela.h / (u * u * 9000)); i++) {
    const e = cena.add.circle(tela.x + 10 * u + Math.random() * (tela.w - 20 * u), tela.y + 10 * u + Math.random() * (tela.h - 20 * u),
      (0.8 + Math.random() * 1.4) * u, 0xffffff, 0.4 + Math.random() * 0.5);
    if (i % 3 === 0) cena.tweens.add({ targets: e, alpha: 0.1, duration: 600 + Math.random() * 900, yoyo: true, repeat: -1, delay: Math.random() * 800 });
  }

  const cx = x0 + largura / 2;
  const t = cena.add.text(cx, y0, titulo, letra(21 * u)).setOrigin(0.5).setDepth(2);
  const pw = t.width + 56 * u, ph = 44 * u;
  cena.add.graphics().setDepth(1)
    .fillStyle(0x2563eb).fillRoundedRect(cx - pw / 2, y0 - ph / 2, pw, ph, ph / 2)
    .lineStyle(4 * u, 0xffffff).strokeRoundedRect(cx - pw / 2, y0 - ph / 2, pw, ph, ph / 2)
    .lineStyle(2 * u, CONTORNO).strokeRoundedRect(cx - pw / 2 - 3 * u, y0 - ph / 2 - 3 * u, pw + 6 * u, ph + 6 * u, ph / 2 + 3 * u);

  const rodapeY = tela.y + tela.h + 14 * u;
  return {
    tela,
    rodape: { y: rodapeY, h: y0 + altura - 18 * u - rodapeY },
    borda: () => cena.add.graphics().lineStyle(5 * u, CONTORNO).strokeRoundedRect(tela.x, tela.y, tela.w, tela.h, 18 * u),
  };
}

// Dark pill for instructions and facts.
export const pilulaEscura = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, u: number) =>
  g.clear().fillStyle(CONTORNO, 0.95).fillRoundedRect(x, y, w, h, Math.min(h / 2, 24 * u));

// Round red X on a frame's top-left corner.
export function botaoFechar(cena: Phaser.Scene, x: number, y: number, u: number, acao: () => void) {
  const c = cena.add.container(x, y).setDepth(3);
  c.add(cena.add.graphics()
    .fillStyle(0xef4444).fillCircle(0, 0, 23 * u).lineStyle(4 * u, 0xffffff).strokeCircle(0, 0, 23 * u)
    .lineStyle(2 * u, CONTORNO).strokeCircle(0, 0, 26 * u)
    .lineStyle(5 * u, 0xffffff).lineBetween(-8 * u, -8 * u, 8 * u, 8 * u).lineBetween(8 * u, -8 * u, -8 * u, 8 * u));
  return c.setSize(52 * u, 52 * u).setInteractive({ useHandCursor: true })
    .on('pointerover', () => c.setScale(1.1)).on('pointerout', () => c.setScale(1))
    .on('pointerdown', acao);
}

// Big green pill button that gently pulses, centered on (x, y).
export function botaoVerde(cena: Phaser.Scene, x: number, y: number, texto: string, tamanho: number, alturaMax: number, u: number, acao: () => void) {
  const t = cena.add.text(0, 0, texto, letra(tamanho)).setOrigin(0.5);
  const bw = t.width + 2.2 * tamanho, bh = Math.min(alturaMax, t.height + 0.9 * tamanho);
  const g = cena.add.graphics()
    .fillStyle(0x22c55e).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2)
    .lineStyle(4 * u, 0xffffff).strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
  const c = cena.add.container(x, y, [g, t]).setSize(bw, bh).setInteractive({ useHandCursor: true }).on('pointerdown', acao);
  cena.tweens.add({ targets: c, scale: 1.08, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return c;
}

// Chunky progress pill with a label on its left, centered on (cx, cy). Returns a setter, 0..1.
export function criarBarra(cena: Phaser.Scene, cx: number, cy: number, largura: number, u: number, rotulo: string, cor = 0x4ade80) {
  const alt = 20 * u, x = cx - largura / 2;
  cena.add.text(x - 10 * u, cy, rotulo, letra(17 * u, '#ffffff', { stroke: '#1e293b', strokeThickness: 5 * u })).setOrigin(1, 0.5);
  cena.add.graphics()
    .fillStyle(0x1e3a8a).fillRoundedRect(x, cy - alt / 2, largura, alt, alt / 2)
    .lineStyle(3 * u, 0xffffff).strokeRoundedRect(x, cy - alt / 2, largura, alt, alt / 2);
  const g = cena.add.graphics();
  return (p: number) => {
    g.clear();
    if (p > 0) g.fillStyle(cor).fillRoundedRect(x + 3 * u, cy - alt / 2 + 3 * u, Math.max(alt - 6 * u, (largura - 6 * u) * Math.min(1, p)), alt - 6 * u, (alt - 6 * u) / 2);
  };
}
