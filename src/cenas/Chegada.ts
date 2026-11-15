// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Launch animation: after LAUNCH MISSION and the countdown (Radar.ts), the game's rocket crosses
// the stars, brakes and arrives at the Moon, then the camera dives in and the first morning
// opens. The Moon is the same live shader used by the loading screen. Click or any key skips it.
// Chapter 3 uses the same film to arrive at Mars: the same rocket, and Mars (planetaShader.ts)
// turning as it grows.
import Phaser from 'phaser';
import { movimentoReduzido } from '../video';
import { tocarMotor, tocarSfx } from '../sfx';
import { sessao } from './sessao';
import { letra } from '../tarefas/estilo';
import { criarLua, LADO } from './luaShader';
import { giroEm } from './globo';
import { criarPlaneta, diametroPlaneta, giroOlhando } from './planetaShader';
import { JEZERO } from './marte';
import foguetevoo from '../dados/foguete_voo.json';

const DURACAO = 6800;   // ms of the full flight
// The game's own rocket without its launch pad (public/lua/modulos/foguete_voo.png, cut from the
// Blender picture foguete4.png by tools/lua3d/make_flying_rocket.py; loaded by Carregar).
export const CHAVE_FOGUETE = 'foguete_voo';

export type DadosChegada = { aoTerminar?: () => void; mundo?: 'lua' | 'marte' };

export class Chegada extends Phaser.Scene {
  private fim = false;

  constructor() { super({ key: 'Chegada' }); }

  preload() {
    if (!this.textures.exists('planeta_marte')) this.load.image('planeta_marte', 'lua/planetas/marte.png');
  }

  create(d: DadosChegada = {}) {
    const W = this.scale.width, H = this.scale.height;
    const u = Phaser.Math.Clamp(Math.min(W / 1100, H / 650), 0.62, 1.4);
    const reduzido = movimentoReduzido();
    this.fim = false;
    // The map and its keys wait underneath, as under a task. The title screen clears this flag when
    // it closes (right after launching us), so set it again on the first frame too.
    sessao.emTarefa = true;
    this.events.once('update', () => { sessao.emTarefa = true; });
    this.events.once('shutdown', () => { sessao.emTarefa = false; });
    this.cameras.main.setBackgroundColor(0x05070f);
    this.cameras.main.fadeIn(450, 5, 7, 15);

    // ---- stars (three layers, drifting left to feel the speed) ----
    const rnd = new Phaser.Math.RandomDataGenerator(['lunar-odyssey-arrival']);
    const camadas = [0.25, 0.6, 1.1].map((vel, k) => {
      const g = this.add.graphics().setDepth(-90 + k);
      for (let i = 0; i < 70; i++) {
        g.fillStyle(0xffffff, rnd.realInRange(0.15, 0.85)).fillCircle(rnd.between(0, W), rnd.between(0, H), (0.5 + k * 0.5) * u);
      }
      const copia = this.add.graphics().setDepth(-90 + k);
      for (let i = 0; i < 70; i++) {
        copia.fillStyle(0xffffff, rnd.realInRange(0.15, 0.85)).fillCircle(rnd.between(0, W), rnd.between(0, H), (0.5 + k * 0.5) * u);
      }
      copia.x = W;
      return { vel, g, copia };
    });

    // ---- the Moon, far at first, growing as we get closer ----
    const luaX = W * 0.72, luaY = H * 0.62;
    const diametroFim = Math.min(W, H) * 1.05;
    const diametroIni = diametroFim * 0.28;
    const emMarte = d.mundo === 'marte';
    let lua: ReturnType<typeof criarLua> | null = null;
    let marte: ReturnType<typeof criarPlaneta> | null = null;
    let luaFalsa: Phaser.GameObjects.Arc | null = null;
    // Mars turns while we fly in, ending with Jezero crater (the base) facing us.
    const giroFim = giroOlhando(JEZERO.lon) - 12, GIRO_VOO = 70;
    if (emMarte && this.textures.exists('planeta_marte')) {
      marte = criarPlaneta(this, luaX, luaY, { textura: 'planeta_marte', atmos: 0xfdba74, atmosForca: 0.35 });
      marte.setSolTela(-1, 0.5);
      marte.setGiro(giroFim - GIRO_VOO).setScale(diametroIni / diametroPlaneta(1)).setDepth(-60);
    } else if (emMarte) {
      luaFalsa = this.add.circle(luaX, luaY, diametroIni / 2, 0xc2410c).setDepth(-60);
    } else if (this.textures.exists('luaAlbedo') && this.textures.exists('luaAltura')) {
      lua = criarLua(this, luaX, luaY);
      lua.setGiro(giroEm(Date.parse('2024-05-05T12:00:00Z'))).setScale(diametroIni / LADO).setDepth(-60);
    } else {
      luaFalsa = this.add.circle(luaX, luaY, diametroIni / 2, 0x94a3b8).setDepth(-60);
    }
    const brilho = this.add.circle(luaX, luaY, diametroIni * 0.62, emMarte ? 0xfb923c : 0x60a5fa, 0.08).setDepth(-65);

    // ---- the rocket ----
    const chama = this.add.graphics().setDepth(9);
    const foguete = this.add.image(0, 0, CHAVE_FOGUETE).setDepth(10);
    const baseEsc = 0.5 * u;
    const meiaAltura = foguetevoo.h / 2;

    // ---- text ----
    // Same lettering as the title screen logo and footer.
    const titulo = this.add.text(W / 2, H * 0.12, emMarte ? 'ARRIVING AT MARS' : 'ARRIVING AT THE MOON', letra(34 * u, '#fde047', {
      stroke: '#1e293b', strokeThickness: 8 * u, letterSpacing: 2 * u,
    })).setOrigin(0.5).setDepth(20).setAlpha(0);
    const dica = this.add.text(W / 2, H - 26 * u, 'Click or press any key to skip', letra(13 * u, '#bfdbfe', { fontStyle: '500' }))
      .setOrigin(0.5).setDepth(20).setAlpha(0);
    this.tweens.add({ targets: titulo, alpha: 1, duration: 900, delay: 500 });
    this.tweens.add({ targets: dica, alpha: 0.75, duration: 700, delay: 1200 });

    // ---- path: a curve from the top-left corner to the lunar limb, near the base ----
    const p0 = new Phaser.Math.Vector2(-W * 0.08, H * 0.18);
    const p1 = new Phaser.Math.Vector2(W * 0.30, H * 0.02);
    const p2 = new Phaser.Math.Vector2(W * 0.42, H * 0.40);
    const p3 = new Phaser.Math.Vector2(luaX - diametroFim * 0.02, luaY - diametroFim * 0.40);
    const curva = new Phaser.Curves.CubicBezier(p0, p1, p2, p3);
    const ponto = new Phaser.Math.Vector2();
    const anterior = new Phaser.Math.Vector2();

    const estado = { t: 0 };
    let pararMotor = () => {};
    const terminar = () => {
      if (this.fim) return;
      this.fim = true;
      pararMotor();
      this.tweens.killAll();
      this.cameras.main.fadeOut(reduzido ? 300 : 650, 5, 7, 15);
      let saiu = false;
      const sair = () => {
        if (saiu) return;
        saiu = true;
        if (this.scene.isActive()) this.scene.stop();
        d.aoTerminar?.();
      };
      this.cameras.main.once('camerafadeoutcomplete', sair);
      window.setTimeout(sair, 1600);
    };

    const desenhar = (t: number) => {
      // easeOut so the rocket brakes as it arrives
      const k = 1 - Math.pow(1 - t, 2.2);
      curva.getPoint(k, ponto);
      curva.getPoint(Math.max(0, k - 0.01), anterior);
      const ang = Math.atan2(ponto.y - anterior.y, ponto.x - anterior.x);
      foguete.setPosition(ponto.x, ponto.y).setRotation(ang + Math.PI / 2);
      // gets a little smaller as it nears the far side of the Moon
      const esc = baseEsc * (1.2 - 0.55 * k);
      foguete.setScale(esc);

      const potencia = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45 * 0.55; // exhaust eases off near the end
      const tremor = 0.85 + Math.random() * 0.3;
      const comp = 260 * esc * potencia * tremor;
      const larg = 34 * esc;
      const cos = Math.cos(ang + Math.PI / 2), sin = Math.sin(ang + Math.PI / 2);
      // the engine is at the bottom of the picture
      const bx = ponto.x - sin * meiaAltura * esc, by = ponto.y + cos * meiaAltura * esc;
      const tri = (l: number, w: number, cor: number, a: number) => {
        chama.fillStyle(cor, a).fillTriangle(
          bx - cos * w, by - sin * w,
          bx + cos * w, by + sin * w,
          bx - sin * l, by + cos * l,
        );
      };
      chama.clear();
      tri(comp, larg, 0xf97316, 0.9);
      tri(comp * 0.62, larg * 0.62, 0xfde047, 1);
      tri(comp * 0.3, larg * 0.3, 0xffffff, 1);

      // Moon grows
      const d = Phaser.Math.Linear(diametroIni, diametroFim, Phaser.Math.Easing.Sine.InOut(t));
      lua?.setScale(d / LADO);
      marte?.setGiro(giroFim - GIRO_VOO * (1 - Phaser.Math.Easing.Sine.Out(t))).setScale(d / diametroPlaneta(1));
      luaFalsa?.setRadius(d / 2);
      brilho.setRadius(d * 0.62);
      // stars drift
      for (const c of camadas) {
        const dx = -((t * DURACAO / 1000) * 60 * c.vel * u) % W;
        c.g.x = dx; c.copia.x = dx + W;
      }
    };

    if (reduzido) {
      // No flight: show the rocket already beside the Moon for a moment, then go.
      estado.t = 1;
      desenhar(1);
      this.time.delayedCall(1400, terminar);
    } else {
      pararMotor = tocarMotor(DURACAO / 1000 + 0.4, 0.8, 1.2);
      this.tweens.add({
        targets: estado, t: 1, duration: DURACAO, ease: 'Linear',
        onUpdate: () => desenhar(estado.t),
        onComplete: () => {
          // final dive: the whole picture grows and the screen fades into the game
          terminar();
          tocarSfx('whoosh');
          this.tweens.add({ targets: this.cameras.main, zoom: 1.6, duration: 700, ease: 'Cubic.In' });
        },
      });
      desenhar(0);
    }

    // skip
    this.input.once('pointerdown', terminar);
    this.input.keyboard?.once('keydown', terminar);
  }
}
