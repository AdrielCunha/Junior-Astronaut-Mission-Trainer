// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Mapa da rota" mini-task: drag the rocket from the Moon to Mars while the asteroids drift by.
// The rules live in ../nave-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { escalaPainel, moldura, faixaTitulo, barraStatus, botaoFechar, concluirTarefa } from './moldura';
import { criarTarefaNave, naveEmColisao, tarefaConcluida, moverAsteroides, distancia, type Ponto } from '../nave-tarefa';

const FONTE = '"Fredoka", system-ui, "Segoe UI", sans-serif';
const QUADRO_W = 704;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const FOLGA = (QUADRO_H - 456) / 2;   // the frame is taller than the layout was drawn for: centre the content
const TOTAL_W = QUADRO_W + 60;
const TOTAL_H = QUADRO_H + 80;

export class NaveTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('NaveTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  private canvas(chave: string, w: number, h: number, desenhar: (c: CanvasRenderingContext2D) => void) {
    if (this.textures.exists(chave)) return;
    const t = this.textures.createCanvas(chave, w, h);
    if (!t) return;
    desenhar(t.getContext());
    t.refresh();
  }

  // Flat cartoon look of the Life Support task: solid colours, thick dark outline, no gradients.
  // Textures are drawn at 2x and shown at 0.5, so the outline stays sharp.
  private esfera(chave: string, r: number, base: string, claro: string, escuro: string, detalhes: (c: CanvasRenderingContext2D, cx: number, cy: number) => void) {
    const K = 2, D = (r + 8) * 2;
    this.canvas(chave, D * K, D * K, (c) => {
      c.scale(K, K);
      const cx = D / 2, cy = D / 2;
      c.fillStyle = base; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.save(); c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
      detalhes(c, cx, cy);
      c.fillStyle = escuro; c.beginPath(); c.arc(cx + r * 0.55, cy + r * 0.55, r, 0, Math.PI * 2); c.arc(cx, cy, r * 1.01, 0, Math.PI * 2, true); c.fill('evenodd');
      c.fillStyle = claro; c.beginPath(); c.ellipse(cx - r * 0.4, cy - r * 0.5, r * 0.2, r * 0.1, -0.7, 0, Math.PI * 2); c.fill();
      c.restore();
      c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    });
  }

  private crateras(c: CanvasRenderingContext2D, cx: number, cy: number, lista: number[][], escuro: string) {
    for (const [dx, dy, rr] of lista) {
      c.fillStyle = escuro; c.beginPath(); c.arc(cx + dx, cy + dy, rr, 0, Math.PI * 2); c.fill();
      c.lineWidth = 2.5; c.strokeStyle = '#1e293b'; c.stroke();
    }
  }

  private criarTexturas() {
    this.esfera('rota_lua', 38, '#d1d5db', '#ffffff', 'rgba(71,85,105,0.35)', (c, cx, cy) =>
      this.crateras(c, cx, cy, [[-12, -8, 9], [12, 12, 7], [10, -16, 5], [-16, 16, 5]], '#9ca3af'));
    this.esfera('rota_marte', 40, '#f97316', '#fed7aa', 'rgba(124,45,18,0.35)', (c, cx, cy) => {
      c.fillStyle = '#c2410c'; c.beginPath(); c.ellipse(cx - 10, cy - 4, 15, 7, 0.3, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(cx + 14, cy + 14, 9, 6, -0.4, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(cx, cy - 38, 18, 8, 0, 0, Math.PI * 2); c.fill(); // polar cap
    });
    // Rocks: lumpy outline, flat colour, craters with an outline.
    const pedras = [['#c4b5a2', '#a39482'], ['#b6c2d1', '#94a3b8'], ['#d6b890', '#b8956a']];
    pedras.forEach(([ba, cr], k) => {
      const K = 2, D = 110;
      this.canvas(`ast${k}`, D * K, D * K, (c) => {
        c.scale(K, K);
        const pts: [number, number][] = [];
        for (let i = 0; i < 11; i++) {
          const a = (i / 11) * Math.PI * 2;
          const j = Math.abs(Math.sin(i * 12.9 + k * 78.2) * 43758.5) % 1;
          const r = 46 * (0.84 + 0.16 * j);
          pts.push([55 + Math.cos(a) * r, 55 + Math.sin(a) * r]);
        }
        const meio = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const caminho = () => {
          c.beginPath();
          const m0 = meio(pts[pts.length - 1], pts[0]);
          c.moveTo(m0[0], m0[1]);
          pts.forEach((p, i) => { const m = meio(p, pts[(i + 1) % pts.length]); c.quadraticCurveTo(p[0], p[1], m[0], m[1]); });
          c.closePath();
        };
        c.fillStyle = ba; caminho(); c.fill();
        c.save(); caminho(); c.clip();
        this.crateras(c, 55, 55, [[-14, 8, 11], [14, -14, 8], [12, 16, 6]], cr);
        c.restore();
        c.lineWidth = 6; c.strokeStyle = '#1e293b'; c.lineJoin = 'round'; caminho(); c.stroke();
      });
    });
    // The rocket (pointing up): flat colours and a thick dark outline.
    this.canvas('rota_foguete', 64 * 2, 112 * 2, (c) => {
      c.scale(2, 2); c.translate(32, 52);
      c.lineWidth = 3.5; c.strokeStyle = '#1e293b'; c.lineJoin = 'round';
      const aleta = (lado: number) => {
        c.fillStyle = '#ef4444'; c.beginPath(); c.moveTo(lado * 8, 8); c.lineTo(lado * 24, 36); c.lineTo(lado * 8, 31); c.closePath(); c.fill(); c.stroke();
      };
      aleta(-1); aleta(1);
      c.fillStyle = '#475569'; c.beginPath(); c.roundRect(-8, 30, 16, 8, 2); c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(-12, -22, 24, 56, [12, 12, 5, 5]); c.fill();
      c.save(); c.beginPath(); c.roundRect(-12, -22, 24, 56, [12, 12, 5, 5]); c.clip();
      c.fillStyle = '#ef4444'; c.fillRect(-12, 12, 24, 7);
      c.fillStyle = 'rgba(100,116,139,0.35)'; c.fillRect(4, -22, 8, 56);
      c.restore();
      c.beginPath(); c.roundRect(-12, -22, 24, 56, [12, 12, 5, 5]); c.stroke();
      c.fillStyle = '#ef4444'; c.beginPath(); c.moveTo(-12, -16); c.quadraticCurveTo(-8, -34, 0, -48); c.quadraticCurveTo(8, -34, 12, -16); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#38bdf8'; c.beginPath(); c.arc(0, -4, 6.5, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(-2, -6, 1.8, 0, Math.PI * 2); c.fill();
    });
    // The map screen: flat blue with a slightly darker top, like the other tasks.
    this.canvas('rota_fundo', 640, 340, (c) => {
      c.beginPath(); c.roundRect(0, 0, 640, 340, 18); c.clip();
      c.fillStyle = '#2563eb'; c.fillRect(0, 0, 640, 340);
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 0, 640, 340 * 0.42);
    });
  }

  create() {
    const tarefa = criarTarefaNave();
    const W = this.scale.width;
    const H = this.scale.height;
    const s = escalaPainel(this, TOTAL_W, TOTAL_H);
    this.criarTexturas();

    // Dimmed background; it is interactive so clicks never reach the game underneath.
    this.add.rectangle(0, 0, W, H, 0x020617, 0.55).setOrigin(0).setInteractive();

    const raiz = this.add.container(W / 2, H / 2 + 8 * s).setScale(s);
    const MX = -tarefa.largura / 2;   // map origin inside `raiz`
    const MY = -QUADRO_H / 2 + 36 + FOLGA;
    const mapa = this.add.container(MX, MY);

    const txt = (x: number, y: number, t: string, tam: number, cor: string, contorno = 0x1e293b) =>
      this.add.text(x, y, t, {
        fontFamily: FONTE, fontSize: `${tam}px`, color: cor, fontStyle: '600',
        stroke: `#${contorno.toString(16).padStart(6, '0')}`, strokeThickness: Math.max(2, tam / 6), resolution: window.devicePixelRatio || 1,
      }).setOrigin(0.5);

    // ---- Frame: a chunky metal screen with rivets, like a cockpit window.
    moldura(this, raiz, QUADRO_W, QUADRO_H);   // shaded metal, bevel, rivets
    raiz.add(this.add.image(MX, MY, 'rota_fundo').setOrigin(0));                                      // recessed blue window
    const quadro = this.add.graphics();
    quadro.lineStyle(5, 0x1e293b, 1).strokeRoundedRect(MX, MY, tarefa.largura, tarefa.altura, 18);
    raiz.add(quadro);
    raiz.add(mapa);

    // ---- Stars (twinkling).
    for (let i = 0; i < 70; i++) {
      const x = (Math.abs(Math.sin(i * 91.7) * 9973) % 1) * (tarefa.largura - 20) + 10;
      const y = (Math.abs(Math.sin(i * 47.3) * 7919) % 1) * (tarefa.altura - 20) + 10;
      const e = this.add.circle(x, y, i % 5 === 0 ? 2.6 : 1.5, 0xffffff, 0.85);
      mapa.add(e);
      this.tweens.add({ targets: e, alpha: 0.2, duration: 700 + (i % 7) * 260, yoyo: true, repeat: -1, delay: i * 40 });
    }

    // ---- Planets: the Moon (start) and Mars (final destination).
    // Each planet is a shaded sphere with a soft shadow under it, so it reads as a solid object.
    const planeta = (chave: string, p: Ponto) => {
      const sombra = this.add.image(p.x + 7, p.y + 10, chave).setScale(0.5).setTintFill(0x020617).setAlpha(0.35).setVisible(false);
      const esf = this.add.image(p.x, p.y, chave).setScale(0.5);
      mapa.add([sombra, esf]);
      return esf;
    };
    const aura = this.add.circle(tarefa.end.x, tarefa.end.y, tarefa.alvoR, 0xfde68a, 0.18).setStrokeStyle(3, 0xfde68a, 0.9);
    this.tweens.add({ targets: aura, scale: 1.18, alpha: 0.6, duration: 800, yoyo: true, repeat: -1 });
    mapa.add(aura);
    planeta('rota_lua', tarefa.start);
    planeta('rota_marte', tarefa.end);
    mapa.add(txt(tarefa.start.x, tarefa.start.y + 58, 'Moon · start', 15, '#bbf7d0'));
    mapa.add(txt(tarefa.end.x, tarefa.end.y - 66, 'Final planet', 17, '#fef3c7'));
    mapa.add(txt(tarefa.end.x, tarefa.end.y + 60, 'Marte', 14, '#fed7aa'));

    // ---- A dashed hint from the Moon to Mars; it fades out when the player starts to drag.
    const dica = this.add.graphics();
    dica.fillStyle(0xffffff, 0.45);
    for (let x = tarefa.start.x + 56; x < tarefa.end.x - 56; x += 22) dica.fillCircle(x, tarefa.start.y, 3);
    mapa.add(dica);

    // ---- Dashed trail behind the ship.
    const rastro = this.add.graphics();
    mapa.add(rastro);
    let pontos: Ponto[] = [];

    // ---- Asteroids (they drift on their own: see moverAsteroides).
    const rochas = tarefa.obstacles.map((o, i) => {
      const esc = ((o.r / 46) * 1.05) / 2;
      const sombra = this.add.image(o.x, o.y, `ast${i % 3}`).setScale(esc).setTintFill(0x020617).setAlpha(0.35).setVisible(false);
      const sp = this.add.image(o.x, o.y, `ast${i % 3}`).setScale(esc);
      mapa.add([sombra, sp]);
      return { o, sp, sombra, giro: (i % 2 ? 1 : -1) * (14 + i * 6) };
    });

    // ---- The ship: our rocket model, with a flickering flame.
    const chama = this.add.graphics();
    chama.fillStyle(0xf97316, 1).fillTriangle(-9, 0, 9, 0, 0, 30);
    chama.fillStyle(0xfde047, 1).fillTriangle(-5, 0, 5, 0, 0, 17);
    chama.setPosition(0, 36);
    this.tweens.add({ targets: chama, scaleY: 1.35, duration: 90, yoyo: true, repeat: -1 });
    // Shaded like our 3D rocket (white body, red nose, band and fins), pointing up so it can turn; with a soft shadow below.
    const foguete = this.add.image(0, 4, 'rota_foguete').setScale(0.5);
    const sombraNave = this.add.container(7, 7, [this.add.image(0, 4, 'rota_foguete').setScale(0.5).setTintFill(0x020617).setAlpha(0.35).setVisible(false)]);
    const corpo = this.add.container(0, 0, [chama, foguete]);
    const nave = this.add.container(tarefa.start.x, tarefa.start.y, [sombraNave, corpo]).setSize(64, 64).setDepth(10);
    nave.setInteractive({ useHandCursor: true });
    mapa.add(nave);
    let ang = 0;               // heading, radians (0 = pointing right)
    corpo.setRotation(ang + Math.PI / 2);
    sombraNave.setRotation(corpo.rotation);

    // Glass reflection over the whole map window (not interactive).

    // ---- Texts and buttons.
    faixaTitulo(this, raiz, QUADRO_H, 'Navigation - Route Map');
    const dizer = barraStatus(this, raiz, QUADRO_H, 'Drag the ship to the final planet.');
    const msg = (t: string, cor: string) => dizer(t, cor);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    // ---- Little bursts of colour (a crash, or the celebration).
    const rajada = (x: number, y: number, cores: number[], n: number, alcance: number) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random();
        const p = this.add.star(x, y, 5, 3, 7, cores[i % cores.length]).setDepth(30);
        mapa.add(p);
        this.tweens.add({
          targets: p, x: x + Math.cos(a) * alcance * (0.5 + Math.random() / 2), y: y + Math.sin(a) * alcance * (0.5 + Math.random() / 2),
          alpha: 0, angle: 180, duration: 650 + Math.random() * 300, onComplete: () => p.destroy(),
        });
      }
    };

    // ---- Game state.
    let pos: Ponto = { ...tarefa.start };
    let arrastando = false;
    let folga = { x: 0, y: 0 };
    let acabou = false;
    let bloqueado = false;   // short pause after a crash
    let dicaVisivel = true;

    const colocar = (p: Ponto) => { pos = p; nave.setPosition(p.x, p.y); };
    const aoLocal = (p: Phaser.Input.Pointer): Ponto => ({ x: (p.x - raiz.x) / s - MX, y: (p.y - raiz.y) / s - MY });

    const bater = () => {
      bloqueado = true;
      arrastando = false;
      tocarSfx('zap');
      msg('You hit an obstacle. Try another route.', '#fca5a5');
      rajada(pos.x, pos.y, [0xfde047, 0xfb923c, 0xffffff], 12, 60);
      this.tweens.add({ targets: nave, alpha: 0.25, duration: 90, yoyo: true, repeat: 3 });
      this.time.delayedCall(560, () => {
        nave.setAlpha(1);
        pontos = [];
        colocar({ ...tarefa.start });
        ang = 0;
        bloqueado = false;
      });
    };

    const vencer = () => {
      acabou = true;
      arrastando = false;
      colocar({ ...tarefa.end });
      tocarSfx('sucesso');
      msg('Route complete!', '#86efac');
      rajada(tarefa.end.x, tarefa.end.y, [0xfde047, 0x86efac, 0x7dd3fc, 0xf9a8d4], 26, 150);
      this.tweens.add({ targets: nave, scale: 0, angle: 200, duration: 800, delay: 150, ease: 'Quad.easeIn' });
      const faixaWin = this.add.graphics().fillStyle(0x16a34a, 1).fillRoundedRect(-210, -44, 420, 88, 44).lineStyle(6, 0xffffff, 1).strokeRoundedRect(-210, -44, 420, 88, 44);
      const t = txt(0, 0, 'Route complete!', 42, '#ffffff', 0x14532d);
      const bloco = this.add.container(tarefa.largura / 2, tarefa.altura / 2, [faixaWin, t]).setScale(0).setDepth(40);
      mapa.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 200, delay: 50, ease: 'Back.easeOut' });
      concluirTarefa(this, this.aoConcluir);
    };

    const mover = (alvoBruto: Ponto) => {
      const m = tarefa.radius;
      const alvo = { x: Phaser.Math.Clamp(alvoBruto.x, m, tarefa.largura - m), y: Phaser.Math.Clamp(alvoBruto.y, m, tarefa.altura - m) };
      // Walk the move in small steps, so a fast drag cannot jump over an asteroid.
      const passos = Math.max(1, Math.ceil(distancia(pos, alvo) / 4));
      const ini = { ...pos };
      for (let i = 1; i <= passos; i++) {
        const p = { x: ini.x + ((alvo.x - ini.x) * i) / passos, y: ini.y + ((alvo.y - ini.y) * i) / passos };
        if (naveEmColisao(p, tarefa)) { colocar(p); bater(); return; }
        if (tarefaConcluida(p, tarefa)) { vencer(); return; }
      }
      if (distancia(ini, alvo) > 2) ang = Math.atan2(alvo.y - ini.y, alvo.x - ini.x);
      colocar(alvo);
      const ultimo = pontos[pontos.length - 1];
      if (!ultimo || distancia(ultimo, alvo) > 18) { pontos.push({ ...alvo }); if (pontos.length > 28) pontos.shift(); }
      msg('Drag the ship to the final planet.', '#e2e8f0');
    };

    nave.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (acabou || bloqueado) return;
      const l = aoLocal(p);
      tocarSfx('pegar');
      folga = { x: pos.x - l.x, y: pos.y - l.y };
      arrastando = true;
      if (dicaVisivel) { dicaVisivel = false; this.tweens.add({ targets: dica, alpha: 0, duration: 400 }); }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!arrastando || acabou || bloqueado) return;
      const l = aoLocal(p);
      mover({ x: l.x + folga.x, y: l.y + folga.y });
    });
    this.input.on('pointerup', () => { arrastando = false; });
    this.input.on('gameout', () => { arrastando = false; });

    // ---- Every frame: asteroids drift, the ship turns towards where it goes, the trail is redrawn.
    const aCadaQuadro = (_t: number, delta: number) => {
      const dt = Math.min(0.05, delta / 1000);
      if (!acabou) moverAsteroides(tarefa, dt);
      for (const r of rochas) {
        r.sp.setPosition(r.o.x, r.o.y); r.sp.angle += r.giro * dt;
        r.sombra.setPosition(r.o.x + 7, r.o.y + 10).setAngle(r.sp.angle);
      }
      corpo.rotation = Phaser.Math.Angle.RotateTo(corpo.rotation, ang + Math.PI / 2, 0.18 * dt * 60);
      sombraNave.rotation = corpo.rotation;
      rastro.clear().fillStyle(0xffffff, 1);
      pontos.forEach((p, i) => { rastro.fillStyle(0xffffff, (i / pontos.length) * 0.85).fillCircle(p.x, p.y, 3); });
      // An asteroid can also drift into a ship that is standing still.
      if (!acabou && !bloqueado && naveEmColisao(pos, tarefa)) bater();
    };
    this.events.on('update', aCadaQuadro);
    this.events.once('shutdown', () => this.events.off('update', aCadaQuadro));
  }
}
