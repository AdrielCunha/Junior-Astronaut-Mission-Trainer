// Generated with AI assistance. See README, "Use of AI tools".
// Every Phaser text goes through t(): scenes keep writing English, the player sees the chosen
// language. `text` still returns the English source, so comparisons in the scenes keep working.
import Phaser from 'phaser';
import { t, aoMudarIdioma, faltando } from './idioma';

type TextoTraduzido = Phaser.GameObjects.Text & { _en?: string; _text: string };
const proto = Phaser.GameObjects.Text.prototype as TextoTraduzido;
const setTextOriginal = proto.setText;
proto.setText = function (this: TextoTraduzido, valor: string | string[]) {
  const en = Array.isArray(valor) ? valor.join('\n') : String(valor ?? '');
  this._en = en;
  return setTextOriginal.call(this, t(en));
};
Object.defineProperty(proto, 'text', {
  configurable: true,
  get(this: TextoTraduzido) { return this._en ?? this._text; },
  set(this: TextoTraduzido, valor: string) { this.setText(valor); },
});

// Rewrites the texts already on screen in the new language (every scene, inside containers and
// layers too). Texts a scene built from other values (a date) change on their next update.
export function instalarIdioma(jogo: Phaser.Game) {
  // Dev server only: texts with no Portuguese entry yet, to find them while playing.
  if (import.meta.env.DEV) (window as typeof window & { __SEM_TRADUCAO__?: Set<string> }).__SEM_TRADUCAO__ = faltando;
  aoMudarIdioma(() => {
    const visitar = (objs: Phaser.GameObjects.GameObject[]) => {
      for (const o of objs) {
        if (o instanceof Phaser.GameObjects.Text) { const en = (o as TextoTraduzido)._en; if (en !== undefined) o.setText(en); }
        else if (o instanceof Phaser.GameObjects.Container || o instanceof Phaser.GameObjects.Layer) visitar(o.list);
      }
    };
    for (const cena of jogo.scene.getScenes(false)) visitar(cena.children.list);
  });
}
