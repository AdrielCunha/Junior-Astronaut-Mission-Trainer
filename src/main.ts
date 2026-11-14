// Generated with AI assistance (Claude). See README, "Use of AI tools".
import Phaser from 'phaser';
import { Espaco } from './cenas/Espaco';
import { Superficie } from './cenas/Superficie';
import { Interface } from './cenas/Interface';
import { Base } from './cenas/Base';
import { CenaTarefa } from './cenas/Tarefa';
import { Carregar } from './cenas/Carregar';

// Carregar (loading screen) loads the assets, then starts three scenes that run together, bottom to top: Espaco (stars, Moon, planets), Superficie (the map,
// the commander, the modules) and Interface (bars and panels). See ARCHITECTURE.md.
// ?classic opens the first prototype (fixed base, click the rooms), kept while the team moves over.
// Canvas text does not make the browser fetch a font, so ask for the task font up front.
document.fonts?.load('600 16px Fredoka').catch(() => {});
const classico = new URLSearchParams(location.search).has('classic');

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'jogo',
  backgroundColor: '#05070f',
  // RESIZE: the canvas always fills the window; the scenes redraw at the new size.
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  // No sound yet: skip the audio system (it also warns when started before a tap).
  audio: { noAudio: true },
  // CenaTarefa only runs while a task is open, above the game; Carregar covers everything while loading.
  scene: classico ? [Base] : [Espaco, Superficie, Interface, CenaTarefa, Carregar],
});
