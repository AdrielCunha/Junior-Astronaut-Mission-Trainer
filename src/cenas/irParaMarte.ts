// Generated with AI assistance. See README, "Use of AI tools".
// Chapter 3 runs on the same 3D engine as the Moon (Espaco + Superficie + Interface), on the
// Mars map of Jezero crater: switch the world, start the chapter keeping the crew's radiation
// dose and the scores, and (re)start the three scenes. The Mars map picture is loaded first.
import Phaser from 'phaser';
import terrenoMarte from '../dados/terreno_marte.json';
import { sessao } from './sessao';

const OUTRAS = ['Base', 'Viagem', 'MarteVista', 'Radar', 'Tarefa', 'TerrenoMarte'];

export function iniciarMarte3D(cena: Phaser.Scene, dose: number, pontos: number[]) {
  const comecar = () => {
    const sm = cena.game.scene;
    sessao.usarMundo('marte');
    sessao.comecarCapitulo(2, dose, pontos);
    sessao.fase = 'manha';                            // no title screen: the first morning (with the intro)
    for (const k of OUTRAS) if (sm.getScene(k) && (sm.isActive(k) || sm.isPaused(k) || sm.isSleeping(k))) sm.stop(k);
    for (const k of ['Espaco', 'Superficie', 'Interface']) {
      if (sm.isActive(k) || sm.isPaused(k)) sm.stop(k);
      sm.start(k);
    }
  };
  if (cena.textures.exists('terreno_marte')) { comecar(); return; }
  cena.load.image('terreno_marte', terrenoMarte.imagem.arquivo);
  cena.load.once('complete', comecar);
  cena.load.start();
}
