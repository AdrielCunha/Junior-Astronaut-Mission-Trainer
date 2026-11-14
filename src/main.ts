// Generated with AI assistance (Claude). See README, "Use of AI tools".
import Phaser from 'phaser';
import { Espaco } from './cenas/Espaco';
import { Superficie } from './cenas/Superficie';
import { Interface } from './cenas/Interface';
import { Base } from './cenas/Base';
import { Carregar } from './cenas/Carregar';

// Carregar (loading screen) loads the assets, then starts three scenes that run together, bottom to top: Espaco (stars, Moon, planets), Superficie (the map,
// the commander, the modules) and Interface (bars and panels). See ARCHITECTURE.md.
// ?classic opens the first prototype (fixed base, click the rooms), kept while the team moves over.
const classico = new URLSearchParams(location.search).has('classic');

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'jogo',
  backgroundColor: '#05070f',
  // RESIZE: the canvas always fills the window; the scenes redraw at the new size.
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  // No sound yet: skip the audio system (it also warns when started before a tap).
  audio: { noAudio: true },
  scene: classico ? [Base] : [Espaco, Superficie, Interface, Carregar],
});
