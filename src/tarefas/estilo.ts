// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Shared cartoon look for the task screens: rounded font, bright colors, thick dark outlines.
import type Phaser from 'phaser';
import { fonte } from '../cenas/sessao';

export const CONTORNO = 0x1e293b;
export const CORES_FESTA = [0xfde047, 0x4ade80, 0xf472b6, 0x60a5fa, 0xfb923c];

export const letra = (tamanho: number, cor = '#ffffff', extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
  fonte(tamanho, cor, { fontFamily: '"Fredoka", system-ui, "Segoe UI", sans-serif', fontStyle: '600', ...extra });

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
