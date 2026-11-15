// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Life Support task: Moon rocks are stuck in the air duct. Drag each one out of the housing so the fan can push air again.
// Different every time: the number, size and place of the rocks are random.
import Phaser from 'phaser';
import type { Tarefa } from './index';
import { CONTORNO, criarBarra, letra } from './estilo';
import { tocarSfx } from '../sfx';

const PO = [0xa8a29e, 0x8f8983, 0xc2bdb7];   // lunar regolith greys, a bit lighter for the cartoon look

type Pedra = { g: Phaser.GameObjects.Graphics; r: number; x0: number; y0: number; fora: boolean };

export const poeiraDuto: Tarefa = {
  id: 'poeira-duto',
  sala: 'oxigenio',
  titulo: 'Life Support · Air Duct',
  instrucao: 'Drag the rocks out of the air duct!',
  fato: 'Apollo astronauts brought back 382 kg of Moon rocks!',

  montar(cena, { x, y, w, h, u }, feito) {
    const alturaBarra = 34 * u;
    const cx = x + w / 2, cy = y + (h - alturaBarra) / 2;
    const R = Math.min(w * 0.3, ((h - alturaBarra) / 2) * 0.84);
    const L = R * 1.2;

    // Housing: a bolted panel with a round opening.
    const caixa = cena.add.graphics();
    caixa.fillStyle(0x000000, 0.25).fillRoundedRect(cx - L + 5 * u, cy - L + 7 * u, 2 * L, 2 * L, 20 * u);
    caixa.fillStyle(0xcbd5e1).fillRoundedRect(cx - L, cy - L, 2 * L, 2 * L, 20 * u);
    caixa.fillStyle(0xe2e8f0).fillRoundedRect(cx - L, cy - L, 2 * L, 18 * u, { tl: 20 * u, tr: 20 * u, bl: 0, br: 0 });
    caixa.lineStyle(4 * u, CONTORNO).strokeRoundedRect(cx - L, cy - L, 2 * L, 2 * L, 20 * u);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const bx = cx + sx * (L - 15 * u), by = cy + sy * (L - 15 * u);
      caixa.fillStyle(0x94a3b8).fillCircle(bx, by, 6 * u).lineStyle(2.5 * u, CONTORNO).strokeCircle(bx, by, 6 * u);
      caixa.lineStyle(2 * u, CONTORNO).lineBetween(bx - 3 * u, by, bx + 3 * u, by);
    }
    caixa.fillStyle(0x0f172a).fillCircle(cx, cy, R);

    // Warning light: red while the air is blocked, green when it flows.
    const luz = cena.add.circle(cx + L - 36 * u, cy - L + 15 * u, 6 * u, 0xef4444)   // same height as the top bolts.setStrokeStyle(2.5 * u, CONTORNO);
    cena.tweens.add({ targets: luz, alpha: 0.3, duration: 380, yoyo: true, repeat: -1 });

    // Fan behind the filter, with an orange hub. It struggles while the dust is there.
    const ventoinha = cena.add.graphics({ x: cx, y: cy });
    for (let k = 0; k < 5; k++) {
      const a = (k * 2 * Math.PI) / 5;
      const p = (ang: number, r: number) => [Math.cos(ang) * r, Math.sin(ang) * r] as const;
      // Blade: a wedge with a rounded tip, kept inside the opening.
      const [ax, ay] = p(a - 0.36, R * 0.62), [bx, by] = p(a + 0.36, R * 0.62), [tx, ty] = p(a, R * 0.62);
      ventoinha.fillStyle(0xf1f5f9).fillCircle(tx, ty, R * 0.24).fillTriangle(0, 0, ax, ay, bx, by);
      ventoinha.lineStyle(2.5 * u, CONTORNO).lineBetween(0, 0, ax, ay).lineBetween(0, 0, bx, by)
        .beginPath().arc(tx, ty, R * 0.24, a - 1.7, a + 1.7).strokePath();
    }
    ventoinha.fillStyle(0xf97316).fillCircle(0, 0, R * 0.2).lineStyle(3 * u, CONTORNO).strokeCircle(0, 0, R * 0.2);
    ventoinha.fillStyle(0xffffff, 0.8).fillCircle(-R * 0.06, -R * 0.06, R * 0.05);
    let velocidade = 0.4;   // rad/s
    cena.time.addEvent({ delay: 16, loop: true, callback: () => { ventoinha.rotation += velocidade * 0.016; } });

    // Rim of the opening (no mesh any more: the rocks sit right in the way of the fan).
    const aro = cena.add.graphics();
    aro.lineStyle(9 * u, 0x64748b).strokeCircle(cx, cy, R).lineStyle(3 * u, CONTORNO).strokeCircle(cx, cy, R + 4.5 * u).strokeCircle(cx, cy, R - 4.5 * u);

    // Moon rocks stuck in the duct: lumpy grey stones with a cartoon outline. Drag each one out of the housing.
    const pedras: Pedra[] = [];
    const n = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      let px = 0, py = 0, r = 0;
      for (let tentativa = 0; tentativa < 30; tentativa++) {
        const ang = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * R * 0.62;
        r = (17 + Math.random() * 9) * u;
        px = cx + Math.cos(ang) * d; py = cy + Math.sin(ang) * d;
        if (pedras.every((o) => Math.hypot(o.g.x - px, o.g.y - py) > o.r + r + 4 * u)) break;
      }
      const g = cena.add.graphics({ x: px, y: py }).setDepth(5);
      const pontos = Array.from({ length: 9 }, (_v, k) => {
        const ang = (k / 9) * Math.PI * 2, rr = r * (0.8 + Math.random() * 0.3);
        return new Phaser.Math.Vector2(Math.cos(ang) * rr, Math.sin(ang) * rr);
      });
      const cor = PO[i % PO.length];
      g.fillStyle(cor).fillPoints(pontos, true).lineStyle(3.5 * u, CONTORNO).strokePoints(pontos, true);
      g.fillStyle(0x78716c).fillCircle(r * 0.25, r * 0.2, r * 0.16).fillCircle(-r * 0.3, r * 0.3, r * 0.1);
      g.fillStyle(0xffffff, 0.35).fillCircle(-r * 0.3, -r * 0.3, r * 0.17);
      g.setScale(0);
      cena.tweens.add({ targets: g, scale: 1, duration: 300, delay: 60 + i * 60, ease: 'Back.easeOut' });
      g.setInteractive(new Phaser.Geom.Circle(0, 0, r + 8 * u), Phaser.Geom.Circle.Contains);
      if (g.input) g.input.cursor = 'grab';
      cena.input.setDraggable(g);
      pedras.push({ g, r, x0: px, y0: py, fora: false });
    }

    // Airflow bar: a chunky pill that fills green.
    const by = y + h - alturaBarra / 2;
    const encher = criarBarra(cena, cx, by, Math.min(w * 0.62, 360 * u), u, 'AIR');
    const barra = { p: 0 };
    const desenharBarra = () => encher(barra.p);

    let fora = 0, acabou = false;
    const progresso = () => {
      const p = fora / n;
      velocidade = 0.4 + 13 * p;
      cena.tweens.add({ targets: barra, p, duration: 200, onUpdate: desenharBarra });
    };

    const naCaixa = (px: number, py: number) => Math.abs(px - cx) < L && Math.abs(py - cy) < L;
    const limiteY = y + h - alturaBarra - 8 * u;
    cena.input.on('dragstart', (_p: Phaser.Input.Pointer, g: Phaser.GameObjects.Graphics) => { tocarSfx('pegar'); g.setDepth(8); g.setScale(1.12); });
    cena.input.on('drag', (_p: Phaser.Input.Pointer, g: Phaser.GameObjects.Graphics, dx: number, dy: number) => {
      if (acabou) return;
      g.setPosition(Phaser.Math.Clamp(dx, x + 20 * u, x + w - 20 * u), Phaser.Math.Clamp(dy, y + 20 * u, limiteY));
    });
    cena.input.on('dragend', (_p: Phaser.Input.Pointer, g: Phaser.GameObjects.Graphics) => {
      const pedra = pedras.find((q) => q.g === g);
      if (!pedra || pedra.fora) return;
      g.setDepth(5).setScale(1);
      if (naCaixa(g.x, g.y)) {   // still in the housing: it rolls back into the duct
        tocarSfx('soltar');
        cena.tweens.add({ targets: g, x: pedra.x0, y: pedra.y0, duration: 260, ease: 'Back.easeOut' });
        return;
      }
      pedra.fora = true;
      tocarSfx('ok');
      g.disableInteractive();
      g.setDepth(2);
      const sinal = g.x < cx ? -1 : 1;
      cena.tweens.add({ targets: g, scale: 0.85, duration: 120, yoyo: true });
      for (let k = 0; k < 6; k++) {
        const c = cena.add.circle(g.x, g.y, (2.5 + Math.random() * 3) * u, PO[k % PO.length]).setStrokeStyle(1.5 * u, CONTORNO);
        cena.tweens.add({ targets: c, x: g.x + sinal * Math.random() * 30 * u, y: g.y + (Math.random() - 0.5) * 40 * u, alpha: 0, duration: 450, onComplete: () => c.destroy() });
      }
      fora++;
      progresso();
      if (fora === n) acabar();
    });

    function acabar() {
      acabou = true;
      cena.tweens.killTweensOf(luz);
      luz.setAlpha(1).setFillStyle(0x22c55e);
      // Clean air blows out of both sides.
      for (const lado of [-1, 1]) for (let k = 0; k < 3; k++) {
        const sx = cx + lado * (L + 18 * u), sy = cy + (k - 1) * 30 * u;
        const seta = cena.add.text(sx, sy, lado < 0 ? '‹‹' : '››', letra(30 * u, '#bae6fd', { stroke: '#1e293b', strokeThickness: 5 * u })).setOrigin(0.5).setAlpha(0);
        cena.tweens.add({ targets: seta, x: sx + lado * 30 * u, alpha: { from: 1, to: 0 }, duration: 650, delay: k * 110, repeat: -1 });
      }
      cena.time.delayedCall(50, feito);
    }
  },
};
