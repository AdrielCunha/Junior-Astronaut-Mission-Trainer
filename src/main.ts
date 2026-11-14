// Generated with AI assistance (Claude). See README, "Use of AI tools".
import Phaser from 'phaser';
import { Base } from './cenas/Base';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'jogo',
  backgroundColor: '#05070f',
  // RESIZE: the canvas always fills the window; the scene redraws itself at the new size.
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  scene: [Base],
});
