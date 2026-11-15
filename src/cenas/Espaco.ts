// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Everything behind and beyond the ground, drawn in screen space under Superficie:
//   - the real star field (NASA SVS) in the direction the camera looks, with a constellation
//     traced now and then;
//   - the whole Moon (Blender sprite sheet), turned to the real Sun of the chapter date, with the
//     base pin; it takes over from Superficie's globe when the flight lands on the Moon view;
//   - the Earth, Sun and planets at their real positions for that date (engine/astro.ts).
// Driven by sessao.u (one zoom scale, see sessao.ts) and sessao.data. See ARCHITECTURE.md.
import Phaser from 'phaser';
import { movimentoReduzido, configuracoesAbertas, video } from '../video';
import constelacoes from '../dados/constelacoes.json';
import { VOO as voo, LEVE } from './qualidade';
import { carregarFilme, garantirQuadro, proximoPendente } from './filme';
import { criarLua, LADO } from './luaShader';
import { PLANETAS, posicao, lua, nomeDaFase, AU_KM, RAIO_LUA_KM, RAIO_SOL_KM, TERRA_LUA_KM } from '../engine/astro';
import { sessao, suave, fonte, dataBonita, COR, sDeU } from './sessao';
import { VISTA as vista, giroEm, pontoNaLua, naTela, visivel, solSobreBase, type V3 } from './globo';

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const ACHATAR = 0.6;
const GIRO_FILME = giroEm(Date.parse(`2024-05-${String(4 + voo.dia).padStart(2, '0')}T12:00:00Z`));                         // the solar system is drawn tilted, like the map
const HORAS_POR_SEG = 6;                     // gentle time drift while you look from space

export class Espaco extends Phaser.Scene {
  private constelacaoAtual?: {img: Phaser.GameObjects.Image; mask?: Phaser.GameObjects.Graphics; progress?: {v:number}};
  private modoConstelacao = '';
  private ceu!: Phaser.GameObjects.Image;
  private escalaCeu = 1;
  private lua!: ReturnType<typeof criarLua>;        // live GPU Moon (luaShader.ts)
  private quadro!: Phaser.GameObjects.Image;          // current flight frame
  private pino!: Phaser.GameObjects.Container;
  private brilho!: Phaser.GameObjects.Arc;            // the colony's lights during the flight
  private g!: Phaser.GameObjects.Graphics;
  private rotulos = new Map<string, Phaser.GameObjects.Text>();
  private legenda!: Phaser.GameObjects.Text;
  private relogio = 0;
  private giroMostrado: number | null = null;         // the live Moon's angle, eased (see update)
  private pinoVoo: { x: number; y: number; a: number } | null = null;

  constructor() {
    super({ key: 'Espaco' });   // started by Carregar
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.ceu = this.add.image(W / 2, H / 2, 'ceu').setDepth(-100);
    this.modoConstelacao = '';
    this.events.once('shutdown',()=>this.limparConstelacao());
    this.escalaCeu = Math.max(W / this.ceu.width, H / this.ceu.height);
    this.ceu.setScale(this.escalaCeu);

    this.g = this.add.graphics();
    this.lua = criarLua(this, W / 2, H / 2);
    this.lua.setVisible(false);
    const gp = this.add.graphics();
    gp.fillStyle(0xf97316).fillCircle(0, -20, 7).fillTriangle(-5, -16, 5, -16, 0, 0);
    gp.lineStyle(2, COR.contorno).strokeCircle(0, -20, 7);
    const tp = this.add.text(10, -30, 'Your base\nShackleton crater rim', fonte(13, '#fed7aa', { fontStyle: 'bold', stroke: '#17130f', strokeThickness: 4 }));
    this.pino = this.add.container(0, 0, [gp, tp]).setVisible(false).setDepth(20);
    this.brilho = this.add.circle(0, 0, 9, 0xfde68a, 0.9).setDepth(19).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: this.brilho, scale: 1.8, alpha: 0.25, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.rotulos.clear();
    this.legenda = this.add.text(W / 2, H - 16, '', fonte(14, '#cbd5e1', { align: 'center', stroke: '#020617', strokeThickness: 4, wordWrap: { width: W - 40 } }))
      .setOrigin(0.5, 1);

    // Only rewrite the caption when it changes: every rewrite redraws the text and uploads it.
    this.legendaNova = '';
    const legendaPost = () => { if (this.legenda.text !== this.legendaNova) this.legenda.setText(this.legendaNova); };
    this.events.on('postupdate', legendaPost);
    this.events.once('shutdown', () => this.events.off('postupdate', legendaPost));

    // The Blender flight (ground <-> Moon): downloaded in the background by filme.ts, which lives
    // outside the scene, so a resize (it restarts this scene) cannot load a frame twice.
    this.quadro = this.add.image(W / 2, H / 2, '__DEFAULT').setDepth(10).setVisible(false);
    this.aqueceu = false;
    if (!movimentoReduzido()) carregarFilme(this.textures);

    this.time.addEvent({delay: LEVE ? 9000 : 5500,loop:true,callback:()=>this.tracarConstelacao()});
  }

  private legendaNova = '';
  private subir = 0;              // ms until the next background frame upload
  private aqueceu = false;
  private definirLegenda(s: string) { this.legendaNova = s; }

  // A frame is sent to the GPU the first time it is drawn. Sending all of them at once froze the
  // start (hundreds of MB of textures). Only the first few go ahead of time, slowly; the rest are
  // sent one by one as the flight reaches them.
  private aquecer() {
    const fora = this.add.image(-4000, -4000, 'voo0').setAlpha(0.01).setOrigin(0);
    let i = 0;
    const ev = this.time.addEvent({
      delay: 150, loop: true, callback: () => {
        if (garantirQuadro(this.textures, i)) fora.setTexture(`voo${i}`);
        i++;
        if (i >= Math.min(6, voo.quadros)) { ev.remove(); fora.destroy(); }
      },
    });
  }

  // A thin constellation figure draws itself, stays a moment and fades.
  private tracarConstelacao() {
    if (!constelacoes.length || !video.efeitos || configuracoesAbertas) return;
    if(movimentoReduzido() && this.constelacaoAtual)return;
    this.limparConstelacao();
    const i = Phaser.Math.Between(0, constelacoes.length - 1);
    const c = constelacoes[i];
    const s = this.escalaCeu;
    const x = this.ceu.x + (c.x - this.ceu.width / 2) * s, y = this.ceu.y + (c.y - this.ceu.height / 2) * s;
    const img = this.add.image(x, y, `const${i}`).setOrigin(0).setScale(s).setAlpha(0.32).setDepth(-90)
      .setBlendMode(Phaser.BlendModes.ADD).setTint(0xbfdbfe);
    this.constelacaoAtual={img};
    if(movimentoReduzido()){img.setAlpha(0.16);return;}
    const mask = this.make.graphics({}, false);
    const m = img.createGeometryMask(mask); img.setMask(m);
    const w = c.w * s, h = c.h * s;
    const prog = { v: 0 };
    this.constelacaoAtual={img,mask,progress:prog};
    this.tweens.add({
      targets: prog, v: 1, duration: 2200, ease: 'Sine.easeInOut',
      onUpdate: () => { mask.clear().fillStyle(0xffffff).fillRect(x, y, w * prog.v, h); },
      onComplete: () => this.tweens.add({ targets: img, alpha: 0, delay: 2000, duration: 1200, onComplete: () => this.limparConstelacao() }),
    });
  }

  private limparConstelacao() {
    const c=this.constelacaoAtual;if(!c)return;
    this.tweens.killTweensOf(c.img);
    if(c.progress)this.tweens.killTweensOf(c.progress);
    c.img.clearMask(true);c.mask?.destroy();c.img.destroy();this.constelacaoAtual=undefined;
  }

  private rotulo(id: string, x: number, y: number, s: string, cor: string, alpha: number) {
    let t = this.rotulos.get(id);
    if (!t) { t = this.add.text(0, 0, s, fonte(13, cor, { fontStyle: 'bold', stroke: '#020617', strokeThickness: 4 })).setOrigin(0.5, 0); this.rotulos.set(id, t); }
    t.setText(s).setPosition(x, y).setAlpha(alpha).setVisible(alpha > 0.01);
  }

  update(_t: number, dtMs: number) {
    const mode=!video.efeitos?'off':movimentoReduzido()?'static':'animated';
    if(mode!==this.modoConstelacao && !configuracoesAbertas){this.modoConstelacao=mode;this.limparConstelacao();if(mode!=='off')this.tracarConstelacao();}
    const W = this.scale.width, H = this.scale.height;
    sessao.passo(dtMs / 1000);     // Espaco runs first: every layer sees the same zoom this frame
    if (!this.aqueceu && sessao.filmePronto) { this.aqueceu = true; this.aquecer(); }
    // On the ground, send decoded flight frames to the GPU one at a time, in order: every 150 ms
    // while the commander stands still (a hitch then is barely seen), every 700 ms while walking.
    // What is still missing when the flight starts goes up just in time (see below).
    this.subir -= dtMs;
    if (this.subir <= 0 && !sessao.voo && sessao.vista === 'chao') {
      this.subir = sessao.parado ? 150 : 700;
      const i = proximoPendente();
      if (i >= 0) garantirQuadro(this.textures, i);
    }
    const n = sessao.nivel;
    const uG = sessao.uGlobo;
    // Flight frames. Show the frame rendered just before the current point p and shrink it to
    // the current distance (never blend two frames: that ghosts). Frames are rendered with a
    // margin, so the shrinking frame still covers the screen. Near the end it fades into the
    // live Moon, drawn underneath at the same size.
    const q = sessao.quadroFilme;
    this.quadro.setVisible(false);
    if (q !== null) {
      let i = 0;
      while (i < voo.p.length - 1 && voo.p[i + 1] <= q) i++;
      // Frames reach the GPU just in time: this one and the next two ahead (either direction).
      for (let k = -2; k <= 2; k++) if (i + k >= 0 && i + k < voo.quadros) garantirQuadro(this.textures, i + k);
      // If this frame never downloaded, keep showing the last one that did.
      while (i > 0 && !this.textures.exists(`voo${i}`)) i--;
      const temQuadro = this.textures.exists(`voo${i}`);
      const fim = 1 - suave(0.975, 1, q);
      if (temQuadro) {
        this.quadro.setTexture(`voo${i}`).setScale(sessao.escalaFilme * Math.pow(voo.razao, -(q - voo.p[i])))
          .setPosition(W / 2, H / 2).setAlpha(fim).setVisible(fim > 0);
      }
      // The colony on the moving planet: the base's pixel in this frame and the next (from
      // Blender), each at the scale it has now, blended by how far we are between them.
      const j = Math.min(voo.p.length - 1, i + 1);
      const fw = voo.w * voo.margem, fh = voo.h * voo.margem;
      const em = (k: number) => {
        const s = sessao.escalaFilme * Math.pow(voo.razao, -(q - voo.p[k]));
        return { x: W / 2 + (voo.base[k][0] - fw / 2) * s, y: H / 2 + (voo.base[k][1] - fh / 2) * s };
      };
      const a = em(i), b = em(j);
      const f = j > i ? Phaser.Math.Clamp((q - voo.p[i]) / (voo.p[j] - voo.p[i]), 0, 1) : 0;
      const bx = Phaser.Math.Linear(a.x, b.x, f), by = Phaser.Math.Linear(a.y, b.y, f);
      const ap = temQuadro ? suave(0.2, 0.3, q) * (1 - suave(0.975, 1, q)) : 0;
      this.pinoVoo = ap > 0 ? { x: bx, y: by, a: ap } : null;
    } else {
      this.pinoVoo = null;
    }
    const u = q !== null && q > 0.95 ? uG : sessao.u;
    // In the Moon view time runs on (no wrap: a wrap made the Moon jump back), so you watch the
    // Moon turn under the Sun. It restarts from the day's noon only once you are back on the ground.
    if (sessao.vista === 'chao' && !sessao.voo) this.relogio = 0;
    else if (!sessao.voo && !movimentoReduzido() && !configuracoesAbertas) this.relogio += (dtMs / 1000) * HORAS_POR_SEG;
    this.brilho.setScale(movimentoReduzido() ? 1 : this.brilho.scaleX);
    this.tweens.getTweensOf(this.brilho).forEach(t=>{t.paused=movimentoReduzido() || !video.efeitos;});
    if (!movimentoReduzido() && !configuracoesAbertas) carregarFilme(this.textures);
    const t = sessao.data + this.relogio * 3600000;
    this.ceu.setAlpha(0.55 + 0.45 * suave(0.6, 1.6, n));
    this.g.clear();
    for (const r of this.rotulos.values()) r.setVisible(false);
    this.legendaNova = '';
    this.pino.setVisible(false);
    this.lua.setVisible(false);
    this.brilho.setVisible(!!this.pinoVoo);
    if (this.pinoVoo) {
      const { x, y, a } = this.pinoVoo;
      this.brilho.setPosition(x, y);
      this.pino.setVisible(true).setAlpha(a).setPosition(x, y);
    }
    if (u < uG - 0.01) return;            // Superficie draws the ground, the regions and the globe

    const kmPx = sDeU(u);                 // screen px per km, the same scale Superficie used
    // The live Moon's angle never jumps: during a flight it turns to the angle the film was
    // rendered at (chapter day 1, noon), and after landing it turns on to today's.
    const alvoGiro = sessao.voo?.tipo === 'filme' ? GIRO_FILME : giroEm(t);
    if (this.giroMostrado === null || movimentoReduzido()) this.giroMostrado = alvoGiro;
    const falta = ((alvoGiro - this.giroMostrado + 540) % 360) - 180;
    this.giroMostrado += falta * (1 - Math.exp(-(dtMs / 1000) * 5));
    const giro = this.giroMostrado;

    // ----- Earth, Sun and planets (heliocentric km, ecliptic plane) -----
    const terraP = posicao(PLANETAS[2], t);
    const terra = { x: terraP.x * AU_KM, y: terraP.y * AU_KM };
    const ld = lua(t);
    const luaKm = { x: terra.x + ld.x * TERRA_LUA_KM, y: terra.y + ld.y * TERRA_LUA_KM };
    const raioVista = (Math.min(W, H) / 2) / kmPx;
    const w = suave(Math.log(0.02 * AU_KM), Math.log(1.5 * AU_KM), Math.log(raioVista));
    const C = { x: luaKm.x * (1 - w), y: luaKm.y * (1 - w) };
    // Turn the drawing so the Sun is on the same side as the light on the Moon sprite.
    const solTela = Math.atan2(-dot(vista.toSun as V3, vista.up as V3), dot(vista.toSun as V3, vista.right as V3));
    const th = -solTela - Math.atan2(-luaKm.y, -luaKm.x);
    const cs = Math.cos(th), sn = Math.sin(th);
    const tela = (p: { x: number; y: number }) => {
      const dx = p.x - C.x, dy = p.y - C.y;
      const rx = dx * cs - dy * sn, ry = dx * sn + dy * cs;
      return { x: W / 2 + rx * kmPx, y: H / 2 - ry * kmPx * ACHATAR };
    };
    const rotulos = suave(2.25, 2.45, n);
    const g = this.g;

    // The Moon: sprite frame (same size the globe had when Superficie handed over), pin, caption.
    const lq = tela(luaKm);
    const largura = 2 * vista.halfExtent * RAIO_LUA_KM * kmPx;     // frame width on screen
    if (largura > 14) {
      this.lua.setGiro(giro).setVisible(true).setPosition(lq.x, lq.y).setScale(largura / LADO);
      const pm = pontoNaLua(vista.base.lat, vista.base.lon, giro);
      const p = naTela(pm);
      const a = (1 - suave(2.05, 2.2, n)) * (visivel(pm) ? 1 : 0);
      // During the film the base is marked from the film's own frames (pinoVoo): one pin only.
      if (!this.pinoVoo && !sessao.voo) this.pino.setVisible(a > 0).setAlpha(a).setPosition(lq.x + p.x * largura, lq.y + p.y * largura);
    } else {
      g.fillStyle(0xcfc4a8).fillCircle(lq.x, lq.y, 3).lineStyle(1, COR.contorno).strokeCircle(lq.x, lq.y, 3);
    }
    if (n < 2.08) {
      if (sessao.voo) return;
      const sol = solSobreBase(giro);
      this.definirLegenda(
        `The Moon · ${dataBonita(t)} · ${nomeDaFase(lua(t).fase)} seen from Earth\n` +
        `Sun over your base: ${sol >= 0 ? sol.toFixed(1) + '° above' : (-sol).toFixed(1) + '° below'} the horizon. At the pole it only skims the horizon.`);
      return;
    }

    // Orbits.
    const orbita = (cx: number, cy: number, r: number, cor: number, a: number) => {
      if (a <= 0.01) return;
      const pts = [];
      for (let i = 0; i <= 96; i++) { const ang = (i / 96) * Math.PI * 2; pts.push(tela({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r })); }
      g.lineStyle(1, cor, a).strokePoints(pts, false);
    };
    // Inner planets only: the view stops at Mars, the next destination.
    const internos = PLANETAS.filter((p) => p.a < 2);
    for (const p of internos) orbita(0, 0, p.a * AU_KM, p.nome === 'Mars' ? 0xc2410c : 0x94a3b8, (p.nome === 'Mars' ? 0.55 : 0.3) * rotulos);
    orbita(terra.x, terra.y, TERRA_LUA_KM, 0x94a3b8, 0.5 * (1 - suave(2.5, 2.7, n)) * suave(2.05, 2.2, n));

    // Sun.
    const sp = tela({ x: 0, y: 0 });
    const rs = Math.max(RAIO_SOL_KM * kmPx, 12);
    g.fillStyle(0xfde68a, 0.15).fillCircle(sp.x, sp.y, rs * 2.2);
    g.fillStyle(0xfacc15).fillCircle(sp.x, sp.y, rs);
    g.lineStyle(2, COR.contorno).strokeCircle(sp.x, sp.y, rs);
    this.rotulo('Sun', sp.x, sp.y + rs + 4, 'Sun', '#fde68a', rotulos);

    // Planets (sizes are drawn bigger than real so you can see them; distances are real).
    for (const p of internos) {
      const pos = posicao(p, t);
      const q = tela({ x: pos.x * AU_KM, y: pos.y * AU_KM });
      const r = Math.max(p.raioKm * kmPx, p.raioKm > 20000 ? 6 : 4);
      g.fillStyle(p.cor).fillCircle(q.x, q.y, r);
      g.lineStyle(1.5, COR.contorno).strokeCircle(q.x, q.y, r);
      if (p.nome === 'Earth') {
        g.fillStyle(0x16a34a).fillEllipse(q.x - r * 0.25, q.y - r * 0.15, r * 0.9, r * 0.6);
        this.rotulo('Earth', q.x, q.y + r + 4, rotulos > 0.5 ? 'Earth + Moon\nyou are here' : 'Earth', '#93c5fd', suave(2.08, 2.2, n));
      } else if (p.nome === 'Mars') {
        // Chapter 3's destination: shown, locked until the rocket gets there.
        g.lineStyle(1.5, 0xfb923c, 0.8).strokeCircle(q.x, q.y, r + 5);
        this.rotulo(p.nome, q.x, q.y + r + 8, 'Mars\nnext stop (locked)', '#fdba74', rotulos);
      } else {
        this.rotulo(p.nome, q.x, q.y + r + 4, p.nome, '#cbd5e1', rotulos);
      }
    }
    this.rotulo('Moon', lq.x, lq.y + Math.max(largura / 2.2, 3) + 4, 'Moon', '#e2e8f0', suave(2.08, 2.2, n) * (1 - rotulos));

    const marte = posicao(PLANETAS[3], t);
    const dm = Math.hypot(marte.x - terraP.x, marte.y - terraP.y);
    this.definirLegenda(
      `${dataBonita(t)} · real positions from NASA JPL orbital elements · planet sizes enlarged, distances true\n` +
      (rotulos > 0.5 ? `Mars, your next stop, is ${(dm * AU_KM / 1e6).toFixed(0)} million km away today. Light takes ${(dm * 499 / 60).toFixed(0)} minutes to get there.`
        : `The Moon is ${TERRA_LUA_KM.toLocaleString('en-US')} km from Earth. Light crosses that in 1.3 seconds.`));
  }
}
