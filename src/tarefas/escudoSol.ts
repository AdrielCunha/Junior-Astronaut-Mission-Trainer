// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Radiation Shield task: a solar storm sends particles at the habitat; the child drags the shield
// around the habitat to face the Sun, which drifts slowly, until the crew is safe.
// Different every time: the Sun starts at a random spot and drifts either way.
import type Phaser from 'phaser';
import type { Tarefa } from './index';
import { CONTORNO, criarBarra, letra } from './estilo';

const MEIO = 0.6;          // half the shield's arc, rad
const ALINHADO = 0.35;     // how close to the Sun counts as facing it, rad
const VEL_SOL = 0.3;       // how fast the Sun drifts, rad/s
const TEMPO = 4;           // seconds facing the Sun to finish
// A parked shield sees the Sun pass for 2 * ALINHADO / VEL_SOL = 2.3 s, less than TEMPO, and the bar
// drains while the Sun is away: the child has to follow the Sun.
console.assert(2 * ALINHADO / VEL_SOL < TEMPO);
const PARTICULAS = [0xfde047, 0xfb923c, 0xf97316];
const dif = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

type Particula = { c: Phaser.GameObjects.Arc; vx: number; vy: number };

export const escudoSol: Tarefa = {
  id: 'escudo-sol',
  sala: 'blindagem',
  titulo: 'Radiation Shield · Storm Guard',
  instrucao: 'A solar storm is coming! Turn the shield to face the Sun.',
  fato: 'In a solar storm the Sun throws out fast particles. Astronauts shelter behind thick walls or water tanks, which block most of them.',

  montar(cena, { x, y, w, h, u }, feito) {
    const alturaBarra = 34 * u;
    const hUtil = h - alturaBarra;
    const cx = x + w / 2, cy = y + hUtil / 2;
    const Rs = Math.min(hUtil / 2 * 0.52, w * 0.2);   // shield radius
    const Rm = 30 * u;                                  // the little Moon in the middle
    const orbita = { rx: w / 2 - 42 * u, ry: hUtil / 2 - 36 * u };

    // Faint track the shield slides on.
    const trilho = cena.add.graphics().lineStyle(3 * u, 0xffffff, 0.25);
    for (let k = 0; k < 36; k += 2) trilho.beginPath().arc(cx, cy, Rs, (k * Math.PI) / 18, ((k + 1) * Math.PI) / 18).strokePath();

    // Center: a little Moon with the base on top. Drawn over the shield arm, so the arm comes out of it.
    const lua = cena.add.graphics().setDepth(2);
    lua.fillStyle(0xd1d5db).fillCircle(cx, cy, Rm);
    lua.fillStyle(0xe5e7eb).fillCircle(cx - Rm * 0.28, cy - Rm * 0.22, Rm * 0.55);
    for (const [dx, dy, r] of [[-0.38, 0.32, 0.22], [0.42, -0.02, 0.18], [0.08, 0.56, 0.14], [0.5, 0.45, 0.1], [-0.1, -0.05, 0.09]]) {
      lua.fillStyle(0x9ca3af).fillCircle(cx + dx * Rm, cy + dy * Rm, r * Rm).lineStyle(2 * u, 0x6b7280).strokeCircle(cx + dx * Rm, cy + dy * Rm, r * Rm);
    }
    lua.lineStyle(3 * u, CONTORNO).strokeCircle(cx, cy, Rm);
    const chao = cy - Rm + 3 * u, rd = 14 * u;   // ground line on top of the Moon, dome radius
    // Flag and antenna next to the dome.
    lua.lineStyle(2.5 * u, CONTORNO).lineBetween(cx - 21 * u, chao + 4 * u, cx - 24 * u, chao - 22 * u);
    lua.fillStyle(0xf97316).fillTriangle(cx - 24 * u, chao - 22 * u, cx - 24 * u, chao - 13 * u, cx - 36 * u, chao - 18 * u)
      .lineStyle(2 * u, CONTORNO).strokeTriangle(cx - 24 * u, chao - 22 * u, cx - 24 * u, chao - 13 * u, cx - 36 * u, chao - 18 * u);
    lua.lineStyle(2.5 * u, CONTORNO).lineBetween(cx + 19 * u, chao + 4 * u, cx + 23 * u, chao - 16 * u);
    lua.fillStyle(0xe2e8f0).fillCircle(cx + 23 * u, chao - 18 * u, 5 * u).lineStyle(2 * u, CONTORNO).strokeCircle(cx + 23 * u, chao - 18 * u, 5 * u);
    // Habitat dome with a window.
    lua.fillStyle(0x94a3b8).fillRoundedRect(cx - rd - 4 * u, chao - 2 * u, 2 * rd + 8 * u, 6 * u, 2 * u)
      .lineStyle(2.5 * u, CONTORNO).strokeRoundedRect(cx - rd - 4 * u, chao - 2 * u, 2 * rd + 8 * u, 6 * u, 2 * u);
    lua.fillStyle(0xf8fafc).beginPath().arc(cx, chao - 2 * u, rd, Math.PI, 0).closePath().fillPath()
      .lineStyle(2.5 * u, CONTORNO).beginPath().arc(cx, chao - 2 * u, rd, Math.PI, 0).closePath().strokePath();
    lua.fillStyle(0x38bdf8).fillCircle(cx, chao - 2 * u - rd * 0.45, rd * 0.32).lineStyle(2 * u, CONTORNO).strokeCircle(cx, chao - 2 * u - rd * 0.45, rd * 0.32);
    const luz = cena.add.circle(cx, chao - rd - 6 * u, 4.5 * u, 0xef4444).setStrokeStyle(2 * u, CONTORNO).setDepth(2);
    const dano = cena.add.circle(cx, cy - 6 * u, Rm * 1.5, 0xef4444, 0).setDepth(3);

    // The shield: an arm out of the Moon's center to a thick yellow arc with an orange knob to grab.
    const brilho = cena.add.graphics().lineStyle(34 * u, 0xfef9c3, 0.45).beginPath().arc(0, 0, Rs, -MEIO - 0.05, MEIO + 0.05).strokePath();
    const esc = cena.add.graphics();
    esc.lineStyle(8 * u, CONTORNO).lineBetween(0, 0, Rs - 12 * u, 0);
    esc.lineStyle(4 * u, 0x94a3b8).lineBetween(0, 0, Rs - 12 * u, 0);
    esc.lineStyle(28 * u, CONTORNO).beginPath().arc(0, 0, Rs, -MEIO, MEIO).strokePath();
    const borda = (3.5 * u) / Rs;
    esc.lineStyle(21 * u, 0xfacc15).beginPath().arc(0, 0, Rs, -MEIO + borda, MEIO - borda).strokePath();
    esc.lineStyle(4 * u, 0xfef08a).beginPath().arc(0, 0, Rs + 5 * u, -MEIO + 0.1, MEIO - 0.1).strokePath();
    // Orange knob to grab, in the middle of the shield.
    esc.fillStyle(0xf97316).fillCircle(Rs, 0, 12 * u).lineStyle(3 * u, CONTORNO).strokeCircle(Rs, 0, 12 * u);
    esc.fillStyle(0xffffff, 0.7).fillCircle(Rs - 3 * u, -4 * u, 3 * u);
    const braco = cena.add.container(cx, cy, [brilho, esc]).setDepth(1);

    // The Sun, with a face, drifting along the edge of the screen.
    const raios = cena.add.graphics();
    for (let k = 0; k < 10; k++) {
      const a = (k * Math.PI) / 5;
      const p = (ang: number, r: number) => [Math.cos(ang) * r, Math.sin(ang) * r] as const;
      const [ax, ay] = p(a - 0.17, 27 * u), [bx, by] = p(a + 0.17, 27 * u), [tx, ty] = p(a, 40 * u);
      raios.fillStyle(0xfb923c).fillTriangle(ax, ay, bx, by, tx, ty).lineStyle(2 * u, CONTORNO).strokeTriangle(ax, ay, bx, by, tx, ty);
    }
    const rosto = cena.add.graphics();
    rosto.fillStyle(0xfde047).fillCircle(0, 0, 25 * u).lineStyle(3 * u, CONTORNO).strokeCircle(0, 0, 25 * u);
    rosto.fillStyle(0xfb7185, 0.6).fillCircle(-13 * u, 6 * u, 4 * u).fillCircle(13 * u, 6 * u, 4 * u);
    rosto.fillStyle(CONTORNO).fillCircle(-8 * u, -4 * u, 2.8 * u).fillCircle(8 * u, -4 * u, 2.8 * u);
    rosto.lineStyle(2.5 * u, CONTORNO).beginPath().arc(0, 2 * u, 9 * u, 0.2 * Math.PI, 0.8 * Math.PI).strokePath();
    const sol = cena.add.container(0, 0, [raios, rosto]);
    cena.tweens.add({ targets: raios, angle: 360, duration: 9000, repeat: -1 });
    let aSol = Math.random() * Math.PI * 2;
    const sentido = Math.random() < 0.5 ? -1 : 1;
    // aSol is the Sun's real direction from the Moon, so it turns at the same speed all the way round;
    // the Sun sits where that ray meets the oval of the screen.
    const posSol = () => {
      const c = Math.cos(aSol), s = Math.sin(aSol);
      const r = 1 / Math.sqrt((c * c) / (orbita.rx * orbita.rx) + (s * s) / (orbita.ry * orbita.ry));
      sol.setPosition(cx + c * r, cy + s * r);
    };
    posSol();
    const direcaoSol = () => aSol;

    // The shield starts facing away, so the child has to turn it.
    let aEsc = direcaoSol() + Math.PI;
    braco.setRotation(aEsc);

    // "Drag me" hint until the first touch.
    const dica = cena.add.text(0, 0, 'Drag me!', letra(17 * u, '#fde047', { stroke: '#1e293b', strokeThickness: 5 * u })).setOrigin(0.5).setDepth(3);
    // Just outside the shield, on its side away from the habitat.
    const fora = Rs + 22 * u + Math.abs(Math.cos(aEsc)) * dica.width / 2 + Math.abs(Math.sin(aEsc)) * dica.height / 2;
    dica.setPosition(cx + Math.cos(aEsc) * fora, cy + Math.sin(aEsc) * fora);
    cena.tweens.add({ targets: dica, y: dica.y - 8 * u, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const encher = criarBarra(cena, cx, y + h - alturaBarra / 2, Math.min(w * 0.62, 360 * u), u, 'SAFE');
    let progresso = 0, acabou = false;
    let tocou = false;   // the drifting Sun can pass in front of an untouched shield: that must not count

    const girar = (p: Phaser.Input.Pointer) => {
      if (!p.isDown || acabou || p.x < x || p.x > x + w || p.y < y || p.y > y + h) return;
      tocou = true;
      if (dica.active) dica.destroy();
      aEsc = Math.atan2(p.y - cy, p.x - cx);
      braco.setRotation(aEsc);
    };
    cena.input.on('pointerdown', girar);
    cena.input.on('pointermove', girar);

    const particulas: Particula[] = [];
    const lancar = () => {
      if (acabou) return;
      const a = Math.atan2(cy - sol.y, cx - sol.x) + (Math.random() - 0.5) * 0.25;
      const v = (150 + Math.random() * 50) * u;
      const c = cena.add.circle(sol.x, sol.y, (2.5 + Math.random() * 2) * u, PARTICULAS[particulas.length % 3]).setStrokeStyle(1.5 * u, CONTORNO);
      particulas.push({ c, vx: Math.cos(a) * v, vy: Math.sin(a) * v });
    };
    cena.time.addEvent({ delay: 110, loop: true, callback: lancar });

    const faisca = (px: number, py: number) => {
      const s = cena.add.star(px, py, 4, 2 * u, 8 * u, 0xffffff).setDepth(2);
      cena.tweens.add({ targets: s, scale: 1.7, alpha: 0, angle: 45, duration: 300, onComplete: () => s.destroy() });
    };

    let antes = cena.time.now;
    cena.time.addEvent({
      delay: 16, loop: true, callback: () => {
        const dt = Math.min(0.05, (cena.time.now - antes) / 1000);
        antes = cena.time.now;
        if (!acabou) { aSol += sentido * VEL_SOL * dt; posSol(); }

        for (let i = particulas.length - 1; i >= 0; i--) {
          const q = particulas[i];
          q.c.x += q.vx * dt; q.c.y += q.vy * dt;
          const r = Math.hypot(q.c.x - cx, q.c.y - cy);
          const bloqueada = r < Rs + 12 * u && r > Rs - 14 * u && Math.abs(dif(Math.atan2(q.c.y - cy, q.c.x - cx), aEsc)) < MEIO;
          const atingiu = r < Rm + 6 * u;
          if (!bloqueada && !atingiu) continue;
          if (bloqueada) faisca(q.c.x, q.c.y);
          else { cena.tweens.killTweensOf(dano); dano.setAlpha(0.45); cena.tweens.add({ targets: dano, alpha: 0, duration: 260 }); }
          q.c.destroy();
          particulas.splice(i, 1);
        }

        if (acabou) return;
        const alinhado = tocou && Math.abs(dif(aEsc, direcaoSol())) < ALINHADO;
        brilho.setVisible(alinhado);
        luz.setFillStyle(alinhado ? 0x22c55e : 0xef4444);
        progresso = Math.max(0, progresso + (alinhado ? dt / TEMPO : -dt * 0.35));
        encher(progresso);
        if (progresso >= 1) acabar();
      },
    });

    function acabar() {
      acabou = true;
      brilho.setVisible(true);
      luz.setFillStyle(0x22c55e);
      for (const q of particulas) cena.tweens.add({ targets: q.c, alpha: 0, duration: 250 });
      cena.tweens.add({ targets: sol, scale: 1.15, duration: 300, yoyo: true, ease: 'Sine.easeInOut' });
      cena.time.delayedCall(350, feito);
    }
  },
};
