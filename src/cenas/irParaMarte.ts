// Generated with AI assistance. See README, "Use of AI tools".
// Chapters 2 and 3 run on the same 3D engine as the Moon (Espaco + Superficie + Interface): the
// ship's deck (chapter 2) and the Mars map of Jezero crater (chapter 3). Switch the world, start
// the chapter keeping the crew's radiation dose and the scores, and (re)start the three scenes.
// The world's pictures are loaded first.
import Phaser from 'phaser';
import terrenoMarte from '../dados/terreno_marte.json';
import terrenoNave from '../dados/terreno_nave.json';
import naveProps from '../dados/nave_props.json';
import { sessao, type Mundo } from './sessao';

const OUTRAS = ['Base', 'Viagem', 'MarteVista', 'Radar', 'Tarefa', 'TerrenoMarte', 'NaveTarefa', 'CuriosidadeRover', 'EditorBase', 'MenuJogo'];

// Pictures each world needs that the loading screen did not load.
const IMAGENS: Partial<Record<Mundo, [string, string][]>> = {
  marte: [['terreno_marte', terrenoMarte.imagem.arquivo]],
  nave: [['terreno_nave', terrenoNave.imagem.arquivo], ['terreno_nave_teto', terrenoNave.imagemTeto], ...Object.entries(naveProps).map(([id, p]) => [`mod_${id}`, p.arquivo] as [string, string])],
};

export function carregarImagensMundo(cena: Phaser.Scene, mundo: Mundo, pronto: () => void) {
  const faltam=(IMAGENS[mundo]??[]).filter(([chave])=>!cena.textures.exists(chave));
  if (!faltam.length) { pronto(); return; }
  for (const [chave,arquivo] of faltam) cena.load.image(chave,arquivo);
  cena.load.once('complete',pronto);cena.load.start();
}

export function iniciarMundo3D(cena: Phaser.Scene, mundo: Mundo, capIdx: number, dose: number, pontos: number[], explorar = false) {
  const comecar = () => {
    const sm = cena.game.scene;
    sessao.usarMundo(mundo);
    sessao.comecarCapitulo(capIdx, dose, pontos);
    sessao.explorando = explorar;
    sessao.fase = explorar ? 'inicio' : 'manha';
    for (const k of OUTRAS) if (sm.getScene(k) && (sm.isActive(k) || sm.isPaused(k) || sm.isSleeping(k))) sm.stop(k);
    for (const k of ['Espaco', 'Superficie', 'Interface']) {
      if (sm.isActive(k) || sm.isPaused(k)) sm.stop(k);
      sm.start(k);
    }
  };
  const faltam = (IMAGENS[mundo] ?? []).filter(([chave]) => !cena.textures.exists(chave));
  if (!faltam.length) { comecar(); return; }
  for (const [chave, arquivo] of faltam) cena.load.image(chave, arquivo);
  cena.load.once('complete', comecar);
  cena.load.start();
}

// EXPLORE A BASE: walk around a world with no mission and no saving.
export const explorarMundo3D = (cena: Phaser.Scene, mundo: Mundo) => iniciarMundo3D(cena, mundo, ['lua', 'nave', 'marte'].indexOf(mundo), 0, [], true);
// Chapter 2, the ship, after leaving the Moon.
export const iniciarNave3D = (cena: Phaser.Scene, dose: number, pontos: number[]) => iniciarMundo3D(cena, 'nave', 1, dose, pontos);
// Chapter 3, Mars, after the landing.
export const iniciarMarte3D = (cena: Phaser.Scene, dose: number, pontos: number[]) => iniciarMundo3D(cena, 'marte', 2, dose, pontos);
