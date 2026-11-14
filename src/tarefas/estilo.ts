// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Shared cartoon look for the task screens: rounded font, bright colors, thick dark outlines.
import type Phaser from 'phaser';
import { fonte } from '../cenas/sessao';

export const CONTORNO = 0x1e293b;
export const CORES_FESTA = [0xfde047, 0x4ade80, 0xf472b6, 0x60a5fa, 0xfb923c];

export const letra = (tamanho: number, cor = '#ffffff', extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
  fonte(tamanho, cor, { fontFamily: '"Fredoka", system-ui, "Segoe UI", sans-serif', fontStyle: '600', ...extra });
