// Generated with AI assistance. See README, "Use of AI tools".
// When the window loses focus (another window, another tab, alt-tab), the browser never sends the
// key-up of a key that was held, so Phaser keeps it down: the astronaut walked on forever in that
// direction. On blur (and when the page is hidden) every scene lets go of all its keys and the
// commander stops.
import type Phaser from 'phaser';
import { sessao } from './cenas/sessao';

let instalado = false;

export function soltarTeclasAoPerderFoco(jogo: Phaser.Game) {
  if (instalado) return;
  instalado = true;
  const soltar = () => {
    for (const cena of jogo.scene.scenes) cena.input?.keyboard?.resetKeys();
    const corpo = sessao.posicaoAstronauta;
    if (corpo) { corpo.vx = 0; corpo.vy = 0; }
  };
  const aoEsconder = () => { if (document.hidden) soltar(); };
  window.addEventListener('blur', soltar);
  document.addEventListener('visibilitychange', aoEsconder);
  jogo.events.once('destroy', () => {
    instalado = false;
    window.removeEventListener('blur', soltar);
    document.removeEventListener('visibilitychange', aoEsconder);
  });
}
