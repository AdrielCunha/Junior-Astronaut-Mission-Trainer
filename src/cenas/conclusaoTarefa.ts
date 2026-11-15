import type Phaser from 'phaser';
import { registrarDescoberta } from '../descobertas.ts';

export const TEMPO_SUCESSO = 400;
type Conclusao = {
  fechada: boolean;
  concluida: boolean;
  aoConcluir?: () => void;
  timer?: Phaser.Time.TimerEvent;
};
const conclusoes = new WeakMap<Phaser.Scene, Conclusao>();

// A new run gets its own guard; callbacks from an old run cannot finish it again.
export function prepararConclusaoTarefa(cena: Phaser.Scene) {
  const estado: Conclusao = { fechada: false, concluida: false };
  conclusoes.set(cena, estado);
  cena.events.once('shutdown', () => finalizar(cena, estado, false));
}

function finalizar(cena: Phaser.Scene, estado: Conclusao, parar: boolean) {
  if (estado.fechada) return;
  estado.fechada = true;
  estado.timer?.remove(false);
  if (parar) cena.scene.stop();
  if (estado.concluida) estado.aoConcluir?.();
}

export function fecharTarefa(cena: Phaser.Scene) {
  const estado = conclusoes.get(cena);
  if (estado) finalizar(cena, estado, true);
}

// Success is already confirmed by the task's rules. X, Esc, shutdown and the timer
// share the same result, so closing during the short celebration cannot lose it.
export function concluirTarefa(cena: Phaser.Scene, aoConcluir?: () => void) {
  const estado = conclusoes.get(cena);
  if (!estado || estado.fechada || estado.concluida) return;
  estado.concluida = true;
  // Every task's win banner has depth 40. Keep its title and scientific fact
  // in the journal so the short celebration never hides the learning material.
  const visitar = (o: Phaser.GameObjects.GameObject) => {
    const c=o as Phaser.GameObjects.Container;
    if (!Array.isArray(c.list)) return;
    if (c.depth===40) {
      const textos=c.list.filter(t=>t.type==='Text') as Phaser.GameObjects.Text[];
      if (textos.length>=2) registrarDescoberta(textos[0].text,textos.slice(1).map(t=>t.text).join('\n'));
    }
    c.list.forEach(visitar);
  };
  (cena.children?.list??[]).forEach(visitar);
  estado.aoConcluir = aoConcluir;
  estado.timer = cena.time.delayedCall(TEMPO_SUCESSO, () => finalizar(cena, estado, true));
}
