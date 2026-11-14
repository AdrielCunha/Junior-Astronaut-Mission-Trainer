// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Life Support task: scrub the Moon dust off the air duct filter so the fan can push air again.
// Different every time: the number, size and place of the dust clumps are random.
import type Phaser from 'phaser';
import type { Tarefa } from './index';
import { CONTORNO, letra } from './estilo';

const PO = [0xa8a29e, 0x8f8983, 0xc2bdb7];   // lunar regolith greys, a bit lighter for the cartoon look

type Torrao = { g: Phaser.GameObjects.Graphics; x: number; y: number; r: number; vida: number; total: number };

export const poeiraDuto: Tarefa = {
  id: 'poeira-duto',
  sala: 'oxigenio',
  titulo: 'Life Support · Air Duct',
  instrucao: 'Moon dust is blocking the air! Scrub it away.',
  fato: 'Moon dust is sharp, like tiny bits of glass, and it sticks to everything. Apollo astronauts found it on their suits, their tools and inside their lander.',

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

    // Filter mesh over the opening, then the rim.
    const malha = cena.add.graphics().lineStyle(2 * u, 0x334155, 0.95);
    const passo = 15 * u;
    for (let d = -R + passo / 2; d < R; d += passo) {
      const meia = Math.sqrt(R * R - d * d);
      malha.lineBetween(cx - meia, cy + d, cx + meia, cy + d).lineBetween(cx + d, cy - meia, cx + d, cy + meia);
    }
    malha.lineStyle(9 * u, 0x64748b).strokeCircle(cx, cy, R).lineStyle(3 * u, CONTORNO).strokeCircle(cx, cy, R + 4.5 * u).strokeCircle(cx, cy, R - 4.5 * u);

    // Dust clumps with a cartoon outline: dark circles first, colored ones on top.
    const sujeira: Torrao[] = [];
    const n = 12 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * R * 0.8;
      const r = (11 + Math.random() * 12) * u;
      const g = cena.add.graphics({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d });
      const bolas = Array.from({ length: 4 }, () => ({ x: (Math.random() - 0.5) * r, y: (Math.random() - 0.5) * r, r: r * (0.45 + Math.random() * 0.3) }));
      for (const b of bolas) g.fillStyle(CONTORNO).fillCircle(b.x, b.y, b.r + 2.5 * u);
      bolas.forEach((b, k) => g.fillStyle(PO[k % PO.length]).fillCircle(b.x, b.y, b.r));
      g.fillStyle(0x78716c).fillCircle(bolas[0].x + r * 0.15, bolas[0].y, r * 0.13).fillCircle(bolas[1].x - r * 0.1, bolas[1].y + r * 0.1, r * 0.09);
      g.fillStyle(0xffffff, 0.35).fillCircle(bolas[2].x - r * 0.15, bolas[2].y - r * 0.18, r * 0.12);
      g.setScale(0);
      cena.tweens.add({ targets: g, scale: 1, duration: 300, delay: 60 + i * 25, ease: 'Back.easeOut' });
      const vida = 3 + r / u / 3;
      sujeira.push({ g, x: g.x, y: g.y, r, vida, total: vida });
    }

    // Airflow bar: a chunky pill that fills green.
    const by = y + h - alturaBarra / 2;
    const larguraBarra = Math.min(w * 0.62, 360 * u), altBarra = 20 * u;
    const bx = cx - larguraBarra / 2;
    cena.add.text(bx - 10 * u, by, 'AIR', letra(17 * u, '#ffffff', { stroke: '#1e293b', strokeThickness: 5 * u })).setOrigin(1, 0.5);
    cena.add.graphics()
      .fillStyle(0x1e3a8a).fillRoundedRect(bx, by - altBarra / 2, larguraBarra, altBarra, altBarra / 2)
      .lineStyle(3 * u, 0xffffff).strokeRoundedRect(bx, by - altBarra / 2, larguraBarra, altBarra, altBarra / 2);
    const enchimento = cena.add.graphics();
    const barra = { p: 0 };
    const desenharBarra = () => {
      const largura = Math.max(altBarra - 6 * u, (larguraBarra - 6 * u) * barra.p);
      enchimento.clear();
      if (barra.p > 0) enchimento.fillStyle(0x4ade80).fillRoundedRect(bx + 3 * u, by - altBarra / 2 + 3 * u, largura, altBarra - 6 * u, (altBarra - 6 * u) / 2);
    };

    let limpos = 0, acabou = false;
    const progresso = () => {
      const p = limpos / n;
      velocidade = 0.4 + 13 * p;
      cena.tweens.add({ targets: barra, p, duration: 200, onUpdate: desenharBarra });
    };

    const sumir = (t: Torrao) => {
      limpos++;
      for (let k = 0; k < 6; k++) {
        const c = cena.add.circle(t.x, t.y, (2.5 + Math.random() * 3) * u, PO[k % PO.length]).setStrokeStyle(1.5 * u, CONTORNO);
        cena.tweens.add({
          targets: c, x: t.x + (Math.random() - 0.5) * t.r * 3.2, y: t.y + (Math.random() - 0.5) * t.r * 3.2, alpha: 0, scale: 0.4,
          duration: 500, ease: 'Quad.easeOut', onComplete: () => c.destroy(),
        });
      }
      const brilho = cena.add.star(t.x, t.y, 4, 3 * u, 11 * u, 0xffffff).setAngle(15);
      cena.tweens.add({ targets: brilho, scale: 1.6, alpha: 0, angle: 60, duration: 420, onComplete: () => brilho.destroy() });
      cena.tweens.add({ targets: t.g, scale: 1.35, alpha: 0, duration: 180, onComplete: () => t.g.destroy() });
      progresso();
      if (limpos === n) acabar();
    };

    // The scrub brush follows the finger / mouse over the duct and wiggles while scrubbing.
    const escova = cena.add.container(0, 0).setVisible(false).setDepth(6);
    const eg = cena.add.graphics();
    eg.fillStyle(0xf97316).fillRoundedRect(-7 * u, -46 * u, 14 * u, 30 * u, 6 * u).lineStyle(2.5 * u, CONTORNO).strokeRoundedRect(-7 * u, -46 * u, 14 * u, 30 * u, 6 * u);
    eg.fillStyle(0x60a5fa).fillRoundedRect(-17 * u, -18 * u, 34 * u, 12 * u, 4 * u).lineStyle(2.5 * u, CONTORNO).strokeRoundedRect(-17 * u, -18 * u, 34 * u, 12 * u, 4 * u);
    eg.fillStyle(0xfde047);
    for (let k = -3; k <= 3; k++) eg.fillRect(k * 4.4 * u - 1.6 * u, -6 * u, 3.2 * u, 8 * u);
    eg.lineStyle(1.5 * u, CONTORNO).strokeRect(-16 * u, -6 * u, 32 * u, 8 * u);
    escova.add(eg);
    const dentro = (p: Phaser.Input.Pointer) => Math.hypot(p.x - cx, p.y - cy) < L * 1.15;

    const esfregar = (p: Phaser.Input.Pointer) => {
      const sobre = !acabou && dentro(p);
      escova.setVisible(sobre).setPosition(p.x, p.y);
      cena.input.setDefaultCursor(sobre ? 'none' : 'default');
      if (!p.isDown || acabou) return;
      escova.setAngle(Math.sin(cena.time.now / 40) * 14);
      const forca = Math.max(0.6, Math.hypot(p.x - p.prevPosition.x, p.y - p.prevPosition.y) / (8 * u));
      for (const t of sujeira) {
        if (t.vida <= 0 || Math.hypot(p.x - t.x, p.y - t.y) > t.r + 18 * u) continue;
        t.vida -= forca;
        t.g.setAlpha(0.35 + (0.65 * Math.max(0, t.vida)) / t.total);
        if (t.vida <= 0) sumir(t);
      }
    };
    cena.input.on('pointerdown', esfregar);
    cena.input.on('pointermove', esfregar);
    cena.input.on('pointerup', () => escova.setAngle(0));

    function acabar() {
      acabou = true;
      escova.setVisible(false);
      cena.input.setDefaultCursor('default');
      cena.tweens.killTweensOf(luz);
      luz.setAlpha(1).setFillStyle(0x22c55e);
      // Clean air blows out of both sides.
      for (const lado of [-1, 1]) for (let k = 0; k < 3; k++) {
        const sx = cx + lado * (L + 18 * u), sy = cy + (k - 1) * 30 * u;
        const seta = cena.add.text(sx, sy, lado < 0 ? '‹‹' : '››', letra(30 * u, '#bae6fd', { stroke: '#1e293b', strokeThickness: 5 * u })).setOrigin(0.5).setAlpha(0);
        cena.tweens.add({ targets: seta, x: sx + lado * 30 * u, alpha: { from: 1, to: 0 }, duration: 650, delay: k * 110, repeat: -1 });
      }
      cena.time.delayedCall(350, feito);
    }
  },
};
