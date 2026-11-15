// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Everything behind and beyond the ground, drawn in screen space under Superficie:
//   - the real star field (NASA SVS) in the direction the camera looks, with a constellation
//     traced now and then;
//   - the whole Moon (Blender sprite sheet), turned to the real Sun of the chapter date, with the
//     base pin; it takes over from Superficie's globe when the flight lands on the Moon view;
//   - the Earth, Sun and planets at their real positions for that date (engine/astro.ts).
// Driven by sessao.u (one zoom scale, see sessao.ts) and sessao.data. See ARCHITECTURE.md.
import Phaser from 'phaser';
import { dispositivoMovel } from '../mobile';
import { movimentoReduzido, configuracoesAbertas, video } from '../video';
import constelacoes from '../dados/constelacoes.json';
import { VOO as voo, CHAVE_VOO, LEVE } from './qualidade';
import { carregarFilme, garantirQuadro, proximoPendente } from './filme';
import { criarLua, LADO } from './luaShader';
import { criarPlaneta, diametroPlaneta, giroOlhando, pontoNoPlaneta } from './planetaShader';
import { JEZERO, DIA_MARTE_MS as SOL_MS } from './marte';
import { caminhoTransferencia, noCaminho, quadroNave, PARTIDA, DIAS_REAIS, DIA_MS } from './transferencia';
import dadosViagem from '../dados/viagem.json';
import foguetevoo from '../dados/foguete_voo.json';
import planetas3d from '../dados/planetas3d.json';
import ceuEstrelas from '../dados/ceu_estrelas.json';
import { PLANETAS, posicao, lua, voltasEm, nomeDaFase, AU_KM, RAIO_LUA_KM, RAIO_SOL_KM, TERRA_LUA_KM } from '../engine/astro';
import { sessao, suave, fonte, dataBonita, COR, sDeU, ELASTICO_MAX, PARADAS_ELASTICAS, RAIO_MARTE } from './sessao';
import { VISTA as vista, giroEm, pontoNaLua, naTela, visivel, solSobreBase, type V3 } from './globo';

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const ACHATAR = 0.6;
const GIRO_FILME = giroEm(Date.parse(`2024-05-${String(4 + (voo.dia ?? 1)).padStart(2, '0')}T12:00:00Z`));                         // the solar system is drawn tilted, like the map
const DIA_MARTE_MS = 88775244;               // one Mars day (sol), 24 h 39 min
const MARTE_MIN_PX = 30;                     // Mars is drawn at least this wide, so you can see its face
const HORAS_POR_SEG = 6;
// The trip to Mars (chapter 2): the sky streams past the ship. The ship points to +gx, which on the
// map is right and down (30, 15), so everything moves up and left. Speeds in px per second; far
// stars barely move, near ones leave a short trail, and soft clouds of stellar dust drift between.
const RUMO = { x: -30 / Math.hypot(30, 15), y: -15 / Math.hypot(30, 15) };
const CAMADAS = [
  { n: 220, v: 7, r: 0.9, a: 0.55, cor: 0xffffff, rastro: 0, poeira: false },
  { n: 90, v: 28, r: 1.3, a: 0.75, cor: 0xdbeafe, rastro: 0, poeira: false },
  { n: 30, v: 110, r: 1.6, a: 0.7, cor: 0xe0f2fe, rastro: 14, poeira: false },
  { n: 14, v: 45, r: 46, a: 0.045, cor: 0xa78bfa, rastro: 0, poeira: true },
  { n: 10, v: 70, r: 30, a: 0.05, cor: 0x7dd3fc, rastro: 0, poeira: true },
];                     // gentle time drift while you look from space

// Out at the solar system, time runs at 2 hours per second: the planets go around the Sun and
// turn on their axes at their real (NASA) pace, all on that one clock (Earth turns in 12 s; faster
// felt like motion sickness).
const HORAS_SISTEMA = 2;
const LONGE_DE = PARADAS_ELASTICAS[1];         // stop 2 (Jupiter and Saturn), in log zoom units

export class Espaco extends Phaser.Scene {
  private constelacaoAtual?: {img: Phaser.GameObjects.Image; mask?: Phaser.GameObjects.Graphics; progress?: {v:number}};
  private modoConstelacao = '';
  private ceu!: Phaser.GameObjects.Image;
  private ceuMarte!: Phaser.GameObjects.Rectangle;   // chapter 3: the daytime sky of Mars behind the map
  private ceuSistema!: Phaser.GameObjects.Image;     // the real sky behind the solar system (make_ceu.py)
  private cintila!: Phaser.GameObjects.Graphics;     // the brightest stars twinkling
  // Depth for the solar system: the asteroid belt and the Kuiper belt (dots going around the Sun
  // at their real pace) and soft nebulae that sit farther back than the planets (parallax).
  private cinto!: Phaser.GameObjects.Graphics;
  private nebulosas: { img: Phaser.GameObjects.Image; x: number; y: number; esc: number; prof: number }[] = [];
  private escalaCeuSistema = 1;
  private corpos = new Map<string, Phaser.GameObjects.Sprite>();   // Blender planets, lit from 16 sides
  private solBrilho!: Phaser.GameObjects.Image;
  private corposProx = new Map<string, Phaser.GameObjects.Sprite>();   // the next turn frame, faded in over it: a smooth turn
  // Chapter 2, the ship: stars and stellar dust streaming past, in parallax layers.
  private viagem: Phaser.GameObjects.Container | null = null;
  private estrelas: { x: number; y: number; c: number; r: number; img: Phaser.GameObjects.Image }[] = [];
  private escalaCeu = 1;
  private lua!: ReturnType<typeof criarLua>;        // live GPU Moon (luaShader.ts)
  private marte: ReturnType<typeof criarPlaneta> | null = null;   // live GPU Mars (planetaShader.ts)
  private quadro!: Phaser.GameObjects.Image;          // current flight frame
  private quadro2!: Phaser.GameObjects.Image;         // the next one, fading in over it
  private pino!: Phaser.GameObjects.Container;
  private pinoTexto!: Phaser.GameObjects.Text;
  private brilho!: Phaser.GameObjects.Arc;            // the colony's lights during the flight
  private g!: Phaser.GameObjects.Graphics;
  private gFrente!: Phaser.GameObjects.Graphics;
  // Chapter 3: the live Mars globe (this.marte) and its moons.
  private marteVivo = 0;              // 1 = Mars drawn by the live globe, 0 = by its Blender sprite
  private giroMarte = 0;              // extra turn (degrees) while out at the solar system
  private horasMarte = 0;             // hours for Phobos and Deimos (one per second)
  private rotulos = new Map<string, Phaser.GameObjects.Text>();
  private legenda!: Phaser.GameObjects.Text;
  private relogio = 0;
  private giroMostrado: number | null = null;         // the live Moon's angle, eased (see update)
  private pinoVoo: { x: number; y: number; a: number } | null = null;
  // Leaving for Mars (sessao.partida): the rocket, the Mars ship and their engine flames.
  private baseFilme: { x: number; y: number } | null = null;   // the base in the current film frame
  private foguete!: Phaser.GameObjects.Image;
  private nave!: Phaser.GameObjects.Image;
  private chamas!: Phaser.GameObjects.Graphics;
  private caminho = caminhoTransferencia();

  constructor() {
    super({ key: 'Espaco' });   // started by Carregar
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.ceu = this.add.image(W / 2, H / 2, 'ceu').setDepth(-100);
    this.modoConstelacao = '';
    this.events.once('shutdown',()=>this.limparConstelacao());
    this.ceuMarte = this.add.rectangle(0, 0, W, H, 0xc99a72).setOrigin(0).setDepth(-99).setVisible(false);
    this.viagem = null; this.estrelas = [];
    if (sessao.mundo === 'nave') {
      this.viagem = this.add.container(0, 0).setDepth(-98);
      for (let c = 0; c < CAMADAS.length; c++) {
        const camada = CAMADAS[c], chave = `estrela_viagem_${c}`;
        // Bake circles and trails once; moving images batch without tessellating paths per frame.
        if (!this.textures.exists(chave)) {
          const lado = camada.poeira ? 128 : camada.rastro ? 40 : 8;
          const textura = this.textures.createCanvas(chave, lado, lado)!, ctx = textura.getContext();
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = camada.poeira ? camada.a : 1;
          for (const k of camada.poeira ? [1, 0.7, 0.45] : [1]) {
            ctx.beginPath(); ctx.arc(lado / 2, lado / 2, camada.r * k, 0, Math.PI * 2); ctx.fill();
          }
          textura.refresh();
        }
        const chaveRastro = `${chave}_rastro`;
        if (camada.rastro && !this.textures.exists(chaveRastro)) {
          const textura = this.textures.createCanvas(chaveRastro, 40, 40)!, ctx = textura.getContext();
          ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = camada.r;
          ctx.beginPath(); ctx.moveTo(20, 20); ctx.lineTo(20 - RUMO.x * camada.rastro, 20 - RUMO.y * camada.rastro); ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(20, 20, camada.r, 0, Math.PI * 2); ctx.fill();
          textura.refresh();
        }
        for (let i = 0; i < camada.n; i++) {
          const x = Math.random() * W, y = Math.random() * H, r = camada.r * (0.6 + Math.random() * 0.8);
          const img = this.add.image(x, y, chave).setTint(camada.cor).setAlpha(camada.poeira ? 1 : camada.a).setScale(r / camada.r);
          this.viagem.add(img);
          this.estrelas.push({ x, y, c, r, img });
        }
      }
    }
    this.escalaCeu = Math.max(W / this.ceu.width, H / this.ceu.height);
    this.ceu.setScale(this.escalaCeu);
    this.ceuSistema = this.add.image(W / 2, H / 2, 'ceu_sistema').setDepth(-100).setAlpha(0)
      .setScale(Math.max(W / this.textures.get('ceu_sistema').getSourceImage().width, H / this.textures.get('ceu_sistema').getSourceImage().height));
    this.cintila = this.add.graphics().setDepth(-97).setBlendMode(Phaser.BlendModes.ADD);
    // A little bigger than the screen: it shrinks a bit when the zoom is pulled out (parallax).
    this.escalaCeuSistema = this.ceuSistema.scaleX * Math.exp(0.05 * ELASTICO_MAX);
    this.ceuSistema.setScale(this.escalaCeuSistema);
    this.cinto = this.add.graphics().setDepth(0.4);
    this.criarNebulosas(W, H);

    this.g = this.add.graphics();
    this.gFrente = this.add.graphics().setDepth(2);   // Mars's moons when they pass in front of it
    this.corpos.clear(); this.corposProx.clear();
    // The Sun's own light: a soft additive glow behind its ball (no rays), breathing in update.
    if (!this.textures.exists('brilho_sol')) {
      const c = this.textures.createCanvas('brilho_sol', 256, 256)!, x = c.getContext();
      const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, 'rgba(255,236,170,1)'); gr.addColorStop(0.22, 'rgba(255,196,90,0.75)');
      gr.addColorStop(0.45, 'rgba(255,140,40,0.25)'); gr.addColorStop(1, 'rgba(255,110,20,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 256, 256); c.refresh();
    }
    this.solBrilho = this.add.image(0, 0, 'brilho_sol').setVisible(false).setDepth(0.5).setBlendMode(Phaser.BlendModes.ADD);
    // Each body is a Blender sprite (make_planetas_3d.py) that turns on its axis; a click opens it
    // full screen (Astro).
    for (const nome of [...Object.keys(planetas3d), 'sol_m']) {
      if (nome === 'nota') continue;
      const s = this.add.sprite(0, 0, `pl3d_${nome}`, 0).setVisible(false).setDepth(1);
      s.setInteractive({ hitArea: new Phaser.Geom.Circle(0, 0, 1), hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true })
        .on('pointerdown', () => this.abrirAstro(nome === 'sol_m' ? 'sol' : nome));
      if (nome === 'sol' || nome === 'sol_m') s.setDepth(0.95);   // the Sun behind the planets: they pass in front of it
      this.corpos.set(nome, s);
      this.corposProx.set(nome, this.add.sprite(0, 0, `pl3d_${nome}`, 0).setVisible(false).setDepth(s.depth + 0.01));
    }
    this.lua = criarLua(this, W / 2, H / 2);
    this.lua.setVisible(false);
    this.marte = this.textures.exists('planeta_marte')
      ? criarPlaneta(this, 0, 0, { textura: 'planeta_marte', atmos: 0xfdba74, atmosForca: 0.35 }).setVisible(false) as ReturnType<typeof criarPlaneta>
      : null;
    const gp = this.add.graphics();
    gp.fillStyle(0xf97316).fillCircle(0, -20, 7).fillTriangle(-5, -16, 5, -16, 0, 0);
    gp.lineStyle(2, COR.contorno).strokeCircle(0, -20, 7);
    const tp = this.pinoTexto = this.add.text(10, -30, 'Your base\nShackleton crater rim', fonte(13, '#fed7aa', { fontStyle: 'bold', stroke: '#17130f', strokeThickness: 4 }));
    this.pino = this.add.container(0, 0, [gp, tp]).setVisible(false).setDepth(20);
    this.brilho = this.add.circle(0, 0, 9, 0xfde68a, 0.9).setDepth(19).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: this.brilho, scale: 1.8, alpha: 0.25, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.rotulos.clear();
    this.legenda = this.add.text(W / 2, H - 16, '', fonte(14, '#cbd5e1', { align: 'center', stroke: '#020617', strokeThickness: 4, wordWrap: { width: W - 40 } }))
      .setOrigin(0.5, 1);

    // Only rewrite the caption when it changes: every rewrite redraws the text and uploads it.
    this.legendaNova = '';
    const legendaPost = () => {
      if (this.legenda.text !== this.legendaNova) this.legenda.setText(this.legendaNova);
      // Lift the marker and its label just enough to clear the planet caption on phones.
      if (this.legendaNova && dispositivoMovel()) {
        const limite = this.legenda.y - this.legenda.height - this.pino.y - 8;
        const deslocamento = Math.min(0, limite);
        gp.setY(deslocamento);
        this.pinoTexto.setY(Math.min(-30 + deslocamento, limite - this.pinoTexto.height));
      } else {
        gp.setY(0);this.pinoTexto.setY(-30);
      }
    };
    this.events.on('postupdate', legendaPost);
    this.events.once('shutdown', () => this.events.off('postupdate', legendaPost));

    // The Blender flight (ground <-> Moon): downloaded in the background by filme.ts, which lives
    // outside the scene, so a resize (it restarts this scene) cannot load a frame twice.
    this.quadro = this.add.image(W / 2, H / 2, '__DEFAULT').setDepth(10).setVisible(false);
    this.quadro2 = this.add.image(W / 2, H / 2, '__DEFAULT').setDepth(10.5).setVisible(false);
    this.foguete = this.add.image(0, 0, 'foguete_voo').setDepth(15).setVisible(false)
      .setOrigin(foguetevoo.pe[0] / foguetevoo.w, foguetevoo.pe[1] / foguetevoo.h);
    this.nave = this.add.image(0, 0, 'nave_d0').setDepth(15).setVisible(false);
    this.chamas = this.add.graphics().setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
    this.aqueceu = '';
    if (!movimentoReduzido()) carregarFilme(this.textures);

    this.time.addEvent({delay: LEVE ? 9000 : 5500,loop:true,callback:()=>this.tracarConstelacao()});
  }

  private legendaNova = '';
  private subir = 0;              // ms until the next background frame upload
  private aqueceu = '';            // the film (CHAVE_VOO) whose first frames went up ahead of time
  private definirLegenda(s: string) { this.legendaNova = s; }

  // A frame is sent to the GPU the first time it is drawn. Sending all of them at once froze the
  // start (hundreds of MB of textures). Only the first few go ahead of time, slowly; the rest are
  // sent one by one as the flight reaches them.
  private aquecer() {
    const chave = CHAVE_VOO;
    const fora = this.add.image(-4000, -4000, '__DEFAULT').setAlpha(0.01).setOrigin(0);
    let i = 0;
    const ev = this.time.addEvent({
      delay: 150, loop: true, callback: () => {
        if (chave === CHAVE_VOO && garantirQuadro(this.textures, i)) fora.setTexture(`${chave}${i}`);
        i++;
        if (i >= Math.min(6, voo.quadros)) { ev.remove(); fora.destroy(); }
      },
    });
  }

  // A thin constellation figure draws itself, stays a moment and fades.
  private tracarConstelacao() {
    if (!constelacoes.length || !video.efeitos || configuracoesAbertas || sessao.partida || sessao.mundo === 'marte' || this.ceuSistema.alpha > 0.5) return;   // the figures belong to the Moon view's sky
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

  // The brightest stars of the sky in view twinkle a little (make_ceu.py found them).
  // One body's sprite: the rotation frame of the moment and the frame lit from angle luz (the Sun's
  // side on screen, counterclockwise from the right), scaled to radius r.
  // Soft nebulae: a few clouds of glowing gas, made once as textures (no files), drawn with
  // additive light over the real sky. prof: how far back (0 = with the planets, 1 = the sky).
  private criarNebulosas(W: number, H: number) {
    this.nebulosas = [];
    const cores = [['rgba(168,85,247,', 'rgba(236,72,153,'], ['rgba(45,212,191,', 'rgba(59,130,246,'], ['rgba(251,146,60,', 'rgba(244,63,94,']];
    let semente = 7;
    const rnd = () => { semente = (semente * 16807) % 2147483647; return semente / 2147483647; };
    cores.forEach((par, i) => {
      const chave = `nebulosa_${i}`;
      if (!this.textures.exists(chave)) {
        const c = this.textures.createCanvas(chave, 512, 512)!, x = c.getContext();
        for (let k = 0; k < 14; k++) {
          const cx = 256 + (rnd() - 0.5) * 260, cy = 256 + (rnd() - 0.5) * 200, r = 60 + rnd() * 150;
          const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
          const cor = par[k % 2];
          gr.addColorStop(0, `${cor}${(0.10 + rnd() * 0.12).toFixed(2)})`); gr.addColorStop(1, `${cor}0)`);
          x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
        }
        c.refresh();
      }
      const ang = (i / cores.length) * Math.PI * 2 + 0.6, dist = 0.42 + rnd() * 0.12;
      const img = this.add.image(0, 0, chave).setDepth(-96).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      this.nebulosas.push({ img, x: Math.cos(ang) * W * dist, y: Math.sin(ang) * H * dist, esc: (Math.max(W, H) * (0.5 + rnd() * 0.3)) / 512, prof: 0.45 + rnd() * 0.35 });
    });
  }

  // Asteroids, made once: the main belt (2.2 to 3.3 AU) and the Kuiper belt (39 to 48 AU), each on
  // a slightly oval orbit, going around at the pace Kepler's third law gives (a year = a^1.5).
  private static asteroides = (() => {
    let semente = 11;
    const rnd = () => { semente = (semente * 16807) % 2147483647; return semente / 2147483647; };
    const lista: { a: number; e: number; w: number; l0: number; b: number }[] = [];
    for (let i = 0; i < 700; i++) lista.push({ a: 2.2 + rnd() * 1.1, e: rnd() * 0.15, w: rnd() * 6.283, l0: rnd() * 6.283, b: 0.35 + rnd() * 0.5 });
    for (let i = 0; i < 350; i++) lista.push({ a: 39 + rnd() * 9, e: rnd() * 0.12, w: rnd() * 6.283, l0: rnd() * 6.283, b: 0.3 + rnd() * 0.45 });
    return lista;
  })();

  private desenharCinturoes(tela: (p: { x: number; y: number }) => { x: number; y: number }, t: number, alfa: number, W: number, H: number) {
    const g = this.cinto.clear();
    if (alfa <= 0.01) return;
    const dias = (t - Date.UTC(2000, 0, 1, 12)) / 86400000;
    // Pulled out, the main belt crowds around the Sun: smaller, fainter dots.
    const el = sessao.elastico, lado = el > 1 ? 1.2 : 2, apaga = 1 - 0.65 * suave(0.3, 1.5, el);
    for (const k of Espaco.asteroides) {
      const v = k.l0 + (2 * Math.PI * dias) / (365.25 * Math.pow(k.a, 1.5));
      const r = (k.a * (1 - k.e * k.e)) / (1 + k.e * Math.cos(v - k.w)) * AU_KM;
      const q = tela({ x: Math.cos(v) * r, y: Math.sin(v) * r });
      if (q.x < -2 || q.y < -2 || q.x > W + 2 || q.y > H + 2) continue;
      g.fillStyle(k.a > 30 ? 0xc7d2fe : 0xf5e6c8, alfa * (0.35 + k.b) * (k.a > 30 ? 1 : apaga)).fillRect(q.x - lado / 2, q.y - lado / 2, lado, lado);
    }
  }

  private mostrarNebulosas(alfa: number, el: number, W: number, H: number) {
    for (const n of this.nebulosas) {
      // Farther back, it shrinks less as the view pulls out: the layers part, and space feels deep.
      const k = Math.exp(-el * (1 - n.prof) * 0.5);
      n.img.setVisible(alfa > 0.01).setAlpha(alfa * 0.3).setPosition(W / 2 + n.x * k, H / 2 + n.y * k).setScale(n.esc * k);
    }
    // The sky itself is the farthest layer: it barely moves.
    this.ceuSistema.setScale(this.escalaCeuSistema * Math.exp(-0.05 * el));
  }

  // voltas: how many times it has turned on its axis (the frames of Venus already turn backward).
  private mostrarCorpo(nome: string, x: number, y: number, r: number, luz: number, voltas: number, alfa = 1) {
    const s = this.corpos.get(nome);
    if (!s) return;
    type Folha = { raio: number; giros: number; direcoes: number };
    const corpos3d = planetas3d as unknown as Record<string, { pequeno: Folha; medio?: Folha }>;
    const info = nome === 'sol_m' ? corpos3d.sol.medio! : corpos3d[nome].pequeno;   // sol_m: the big Sun's sheet
    const n = info.direcoes;
    const k = ((Math.round(luz / (2 * Math.PI / n)) % n) + n) % n;
    // Where it is in its turn, in frames: the frame below and the next one over it, faded in by
    // the fraction, so the turn is continuous instead of stepping from frame to frame.
    const f = (((voltas % 1) + 1) % 1) * info.giros;
    const j = Math.floor(f), frac = f - j;
    s.setVisible(alfa > 0).setFrame(j * n + k).setPosition(x, y).setScale(r / info.raio).setAlpha(alfa);
    const prox = this.corposProx.get(nome)!;
    prox.setVisible(alfa > 0 && frac > 0.01).setFrame(((j + 1) % info.giros) * n + k).setPosition(x, y).setScale(r / info.raio)
      .setAlpha(alfa * frac).setDepth(s.depth + 0.01);
    // The click target: the disc, at least 16 px across on screen for the small ones.
    const alvo = s.input?.hitArea as Phaser.Geom.Circle | undefined;
    if (alvo) alvo.setTo(s.width / 2, s.height / 2, Math.max(info.raio, (16 * info.raio) / r));
  }

  private abrirAstro(nome: string) {
    if (sessao.vista !== 'sistema' || sessao.voo || this.scene.isActive('Astro')) return;
    const grande = this.corpos.get('sol_m');
    const c = nome === 'sol' && grande?.visible && grande.alpha > 0.5 ? grande : this.corpos.get(nome)!;
    this.scene.launch('Astro', { nome, x: c.x, y: c.y, r: (c.displayWidth / 2) * 0.8 });
    this.scene.bringToTop('Astro');
  }

  private cintilar(qual: 'lua' | 'sistema' | null, W: number, H: number) {
    const g = this.cintila.clear();
    if (!qual || movimentoReduzido() || !video.efeitos) return;
    const img = qual === 'sistema' ? this.ceuSistema : this.ceu;
    const lista = (ceuEstrelas as unknown as Record<string, number[][]>)[qual] ?? [];
    const k = img.scaleX, t = this.time.now / 1000;
    for (let i = 0; i < Math.min(70, lista.length); i++) {
      const [x, y, b] = lista[i];
      const px = W / 2 + (x - ceuEstrelas.w / 2) * k, py = H / 2 + (y - ceuEstrelas.h / 2) * k;
      if (px < 0 || py < 0 || px > W || py > H) continue;
      const a = Math.max(0, Math.sin(t * (0.7 + (i % 7) * 0.23) + i * 1.9)) ** 3 * 0.55 * b;
      if (a < 0.02) continue;
      g.fillStyle(0xe0f2fe, a * 0.35).fillCircle(px, py, 3.2);
      g.lineStyle(1, 0xffffff, a).lineBetween(px - 4, py, px + 4, py).lineBetween(px, py - 4, px, py + 4);
    }
  }

  // Moves and draws the streaming sky (chapter 2). Still with reduced motion or effects off.
  private viajar(dt: number, W: number, H: number) {
    const anda = !movimentoReduzido() && video.efeitos && !configuracoesAbertas;
    for (const e of this.estrelas) {
      const c = CAMADAS[e.c];
      if (anda) {
        e.x += RUMO.x * c.v * dt; e.y += RUMO.y * c.v * dt;
        const m = c.poeira ? e.r * 2 : 20;               // wrap around, entering from the far side
        if (e.x < -m) e.x += W + 2 * m; if (e.y < -m) e.y += H + 2 * m;
        if (e.x > W + m) e.x -= W + 2 * m; if (e.y > H + m) e.y -= H + 2 * m;
      }
      const chave = `estrela_viagem_${e.c}${c.rastro && anda ? '_rastro' : ''}`;
      if (e.img.texture.key !== chave) e.img.setTexture(chave);
      e.img.setPosition(e.x, e.y);
    }
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
    // Mars (chapter 3): behind the map the daytime sky of Mars. Its zoom out flies like the
    // Moon's: its own film, its live globe, then the solar system.
    // The ship (chapter 2): its deck floats among the stars, nothing else around it.
    const emMarte = sessao.mundo === 'marte';
    const noChaoMarte = emMarte && sessao.vista === 'chao' && !sessao.voo;
    this.ceuMarte.setVisible(noChaoMarte);
    this.ceu.setVisible(!noChaoMarte);
    const textoPino = emMarte ? `Your base\n${JEZERO.nome}` : 'Your base\nShackleton crater rim';
    if (this.pinoTexto.text !== textoPino) this.pinoTexto.setText(textoPino);
    for (const c of this.corpos.values()) c.setVisible(false);
    for (const c of this.corposProx.values()) c.setVisible(false);
    this.solBrilho.setVisible(false);
    if (sessao.mundo === 'nave') {
      // The ship looks down on the planets' plane like the solar system view: same real sky.
      const nave = sessao.mundo === 'nave';
      this.ceuSistema.setAlpha(nave ? 1 : 0); if (nave) this.ceu.setVisible(false);
      this.cintilar(nave ? 'sistema' : null, W, H);
      if (this.viagem) this.viajar(dtMs / 1000, W, H);
      this.lua.setVisible(false); this.quadro.setVisible(false); this.pino.setVisible(false); this.brilho.setVisible(false);
      this.g.clear(); this.cinto.clear(); this.mostrarNebulosas(0, 0, W, H); this.legendaNova = '';
      for (const r of this.rotulos.values()) r.setVisible(false);
      return;
    }
    if (this.aqueceu !== CHAVE_VOO && sessao.filmePronto) { this.aqueceu = CHAVE_VOO; this.aquecer(); }
    this.avancarPartida(dtMs / 1000);
    const P = sessao.partida;
    this.foguete.setVisible(false);
    this.nave.setVisible(false);
    this.chamas.clear();
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
    this.quadro2.setVisible(false);
    if (q !== null) {
      let i = 0;
      while (i < voo.p.length - 1 && voo.p[i + 1] <= q) i++;
      // Frames reach the GPU just in time: this one and the next two ahead (either direction).
      for (let k = -2; k <= 2; k++) if (i + k >= 0 && i + k < voo.quadros) garantirQuadro(this.textures, i + k);
      // If this frame never downloaded, keep showing the last one that did.
      while (i > 0 && !this.textures.exists(`${CHAVE_VOO}${i}`)) i--;
      const temQuadro = this.textures.exists(`${CHAVE_VOO}${i}`);
      // Fades in under the map picture at the start (and out at the end of the way back), so the
      // space around the map's cut edges turns into ground gradually instead of in one frame.
      const fim = suave(0, 0.03, q) * (1 - suave(0.975, 1, q));
      if (temQuadro) {
        // Never smaller than the screen: when this frame is not on the GPU yet an older one stands
        // in, and shrinking it to this frame's distance left a dark rim that flickered at the edges.
        const cobre = Math.max(W / (voo.w * voo.margem), H / (voo.h * voo.margem));
        this.quadro.setTexture(`${CHAVE_VOO}${i}`).setScale(Math.max(cobre, sessao.escalaFilme * Math.pow(voo.razao, -(q - voo.p[i]))))
          .setPosition(W / 2, H / 2).setAlpha(fim).setVisible(fim > 0);
        // The next frame fades in over this one as the flight moves between them, each at its own
        // distance. Without it the picture held still and then jumped to the next frame (the
        // camera turns a little between frames): a stepped motion that made some players queasy.
        // Neighbouring frames are this close that the blend shows no ghost.
        const n = i + 1;
        if (n < voo.quadros && this.textures.exists(`${CHAVE_VOO}${n}`) && q > voo.p[i]) {
          const f = Phaser.Math.Clamp((q - voo.p[i]) / (voo.p[n] - voo.p[i]), 0, 1);
          this.quadro2.setTexture(`${CHAVE_VOO}${n}`).setScale(Math.max(cobre, sessao.escalaFilme * Math.pow(voo.razao, -(q - voo.p[n]))))
            .setPosition(W / 2, H / 2).setAlpha(fim * f).setVisible(fim * f > 0.01);
        }
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
      this.baseFilme = { x: bx, y: by };
    } else {
      this.pinoVoo = null;
      this.baseFilme = null;
    }
    // Leaving for Mars: the rocket climbs away from the base while the film zooms out.
    if (P?.fase === 'filme' && q !== null && this.baseFilme) {
      const r = this.subida(this.baseFilme.x, this.baseFilme.y, q, W, H);
      this.desenharFoguete(r.x, r.y, r.dx, r.dy, Phaser.Math.Linear(30, 12, q));
    }
    // During the film the live globe only shows at its very end (the frames fade into it); before
    // that it stays off, or it showed through as the frames faded out at the map end of the film.
    const u = q !== null ? (q > 0.95 ? uG : 0) : sessao.u;
    // In the Moon view time runs on (no wrap: a wrap made the Moon jump back), so you watch the
    // Moon turn under the Sun. It restarts from the day's noon only once you are back on the ground.
    if (sessao.vista === 'chao' && !sessao.voo) this.relogio = 0;
    else if (!sessao.voo && !movimentoReduzido() && !configuracoesAbertas)
      this.relogio += (dtMs / 1000) * Phaser.Math.Linear(HORAS_POR_SEG, HORAS_SISTEMA, suave(2.05, 2.35, sessao.nivel));
    this.brilho.setScale(movimentoReduzido() ? 1 : this.brilho.scaleX);
    this.tweens.getTweensOf(this.brilho).forEach(t=>{t.paused=movimentoReduzido() || !video.efeitos;});
    if (!movimentoReduzido() && !configuracoesAbertas) carregarFilme(this.textures);
    // Leaving for Mars, the sky shows the real launch window (transferencia.ts) and, during the
    // crossing, the date runs along the trip. s is the fraction of the trip's time: the path is
    // spaced in time, so the ship keeps its real speed.
    const sCruzeiro = P?.fase === 'cruzeiro' ? P.t : 0;
    const t = P && P.fase !== 'filme' ? PARTIDA + sCruzeiro * DIAS_REAIS * DIA_MS : sessao.data + this.relogio * 3600000;
    this.ceu.setAlpha(0.55 + 0.45 * suave(0.6, 1.6, n));
    // Out to the planets the sky turns to the one the solar system camera really sees.
    const sistema = suave(2.05, 2.35, n);
    this.ceuSistema.setAlpha(sistema);
    if (sistema > 0.5 && this.constelacaoAtual) this.limparConstelacao();
    this.cintilar(noChaoMarte ? null : sistema > 0.5 ? 'sistema' : 'lua', W, H);
    this.g.clear(); this.gFrente.clear();
    for (const r of this.rotulos.values()) r.setVisible(false);
    this.legendaNova = '';
    this.pino.setVisible(false);
    this.lua.setVisible(false);
    this.marte?.setVisible(false);
    this.brilho.setVisible(!!this.pinoVoo);
    if (this.pinoVoo) {
      const { x, y, a } = this.pinoVoo;
      this.brilho.setPosition(x, y);
      this.pino.setVisible(true).setAlpha(a).setPosition(x, y);
    }
    this.cinto.clear(); this.mostrarNebulosas(0, 0, W, H);   // drawn again below when out at the planets
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
    // The body the view starts from: the Moon, or Mars on chapter 3. It sits in the middle of the
    // screen and the view slides to the Sun as it pulls out.
    const marteP = posicao(PLANETAS[3], t);
    const marteKm = { x: marteP.x * AU_KM, y: marteP.y * AU_KM };
    const centro = emMarte ? marteKm : luaKm;
    const C = { x: centro.x * (1 - w), y: centro.y * (1 - w) };
    let th: number;
    if (emMarte) {
      // Turned so the Sun is to the left of Mars and a little below, where the film and the live
      // globe have their light: the light never jumps as the view pulls out.
      th = Math.atan2(-0.5 / ACHATAR, -1) - Math.atan2(-marteKm.y, -marteKm.x);
    } else {
      // Turn the drawing so the Sun is on the same side as the light on the Moon sprite.
      const solTela = Math.atan2(-dot(vista.toSun as V3, vista.up as V3), dot(vista.toSun as V3, vista.right as V3));
      // During the crossing to Mars the drawing keeps the turn of the departure day, so the solar
      // system does not spin while the months go by.
      const ldGiro = P && P.fase !== 'filme' ? lua(PARTIDA) : ld;
      const tg = P && P.fase !== 'filme' ? posicao(PLANETAS[2], PARTIDA) : terraP;
      th = -solTela - Math.atan2(-(tg.y * AU_KM + ldGiro.y * TERRA_LUA_KM), -(tg.x * AU_KM + ldGiro.x * TERRA_LUA_KM));
    }
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
    if (emMarte) {
      if (this.globoMarte(tela, marteKm, kmPx, t, n, dtMs, W, H)) return;
    } else if (largura > 14) {
      this.lua.setGiro(giro).setVisible(true).setPosition(lq.x, lq.y).setScale(largura / LADO);
      const pm = pontoNaLua(vista.base.lat, vista.base.lon, giro);
      const p = naTela(pm);
      const a = (1 - suave(2.05, 2.2, n)) * (visivel(pm) ? 1 : 0);
      // During the film the base is marked from the film's own frames (pinoVoo): one pin only.
      if (!this.pinoVoo && !sessao.voo) this.pino.setVisible(a > 0).setAlpha(a).setPosition(lq.x + p.x * largura, lq.y + p.y * largura);
    } else {
      g.fillStyle(0xcfc4a8).fillCircle(lq.x, lq.y, 3).lineStyle(1, COR.contorno).strokeCircle(lq.x, lq.y, 3);
    }
    // Leaving for Mars: the ship climbs straight off the Moon, engine on; the zoom out to the
    // planets follows it.
    if (P && (P.fase === 'saida' || P.fase === 'zoom')) {
      const pm = pontoNaLua(vista.base.lat, vista.base.lon, giro);
      const pb = naTela(pm);
      this.saidaDaLua(P, lq.x + pb.x * largura, lq.y + pb.y * largura, RAIO_LUA_KM * kmPx, W, H);
      if (P.fase === 'saida') return;
    }
    if (n < 2.08) {
      if (sessao.voo) return;
      const sol = solSobreBase(giro);
      this.definirLegenda(
        `The Moon · ${dataBonita(t)} · ${nomeDaFase(lua(t).fase)} seen from Earth\n` +
        `At the pole, the Sun stays low: ${sol >= 0 ? sol.toFixed(1) + '° above' : (-sol).toFixed(1) + '° below'} the horizon.`);
      return;
    }

    // Orbits.
    const orbita = (cx: number, cy: number, r: number, cor: number, a: number) => {
      if (a <= 0.01) return;
      const pts = [];
      for (let i = 0; i <= 96; i++) { const ang = (i / 96) * Math.PI * 2; pts.push(tela({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r })); }
      // Soft: a faint wide glow under a thin line (they read as paths, not as wires).
      g.lineStyle(4, cor, a * 0.12).strokePoints(pts, false);
      g.lineStyle(1, cor, a * 0.5).strokePoints(pts, false);
    };
    // The view rests on the inner planets, out to Mars, the next destination. Pulling the zoom
    // out (three stops, sessao.paradaElastica) shows the outer planets; it comes back by itself.
    const el = sessao.elastico, fora = suave(0.15, 0.9, el);
    const internos = PLANETAS;
    // Each orbit is the real ellipse (NASA JPL elements), the Sun at one focus: r = a(1-e^2)/(1+e cos v),
    // turned by the longitude of perihelion. Mercury's and Mars's are visibly off-center.
    const elipse = (p: (typeof PLANETAS)[number], cor: number, a: number) => {
      if (a <= 0.01) return;
      const w = (p.varpi * Math.PI) / 180, pts = [];
      for (let i = 0; i <= 128; i++) {
        const v = (i / 128) * Math.PI * 2, r = (p.a * (1 - p.e * p.e)) / (1 + p.e * Math.cos(v)) * AU_KM;
        pts.push(tela({ x: Math.cos(v + w) * r, y: Math.sin(v + w) * r }));
      }
      g.lineStyle(4, cor, a * 0.12).strokePoints(pts, false);
      g.lineStyle(1, cor, a * 0.5).strokePoints(pts, false);
    };
    // The zoom out is the camera pulling back: everything moves toward the middle and shrinks,
    // nothing grows. Each stop has its own Sun (sizes in px for a 720 px tall screen):
    //   stop 1 (out to Mars): the small Sun, a little bigger than the planets;
    //   stops 2 and 3: a big Sun, its disc out to 1.8 AU (just past Mars's orbit), from its own
    //     288 px sheet. It takes over at the end of the glide to stop 2, once the inner planets have
    //     shrunk away; to stop 3 it simply shrinks with the view.
    const kc = Math.min(W, H) / 720;
    const passa = suave(1.3, LONGE_DE, el);                        // small Sun -> big Sun
    const rSol1 = Math.max(RAIO_SOL_KM * kmPx, 38 * kc * Math.exp(-el));   // shrinks with the camera
    const rSol2 = 1.8 * AU_KM * kmPx;
    const rs = rSol1 + (rSol2 - rSol1) * passa;                    // for the halo and the labels
    // The inner planets only shrink, never vanish: small, they stay in front of the big Sun.
    this.desenharCinturoes(tela, t, rotulos * 0.9, W, H);
    this.mostrarNebulosas(sistema, el, W, H);
    for (const p of internos) {
      const externo = p.a > 2;
      elipse(p, p.nome === 'Mars' ? 0xfb923c : externo ? 0x94a3b8 : 0xa5b4fc, (p.nome === 'Mars' ? 0.6 : 0.45) * rotulos * (externo ? fora : 1 - suave(0.9, 1.4, el)));
    }
    orbita(terra.x, terra.y, TERRA_LUA_KM, 0x94a3b8, 0.5 * (1 - suave(2.5, 2.7, n)) * suave(2.05, 2.2, n));

    // Sun.
    const sp = tela({ x: 0, y: 0 });
    // Bodies are drawn far bigger than real (the view stops at Mars, so there is room); distances
    // stay real. Pulled out, the planets get smaller so they do not pile up.
    const encolhe = Math.exp(-0.38 * el);
    // The Sun: its Blender ball turning (granulation and sunspots), and its light around it.
    const aSol = Math.min(1, rotulos * 2);
    const relogio = movimentoReduzido() ? 0 : this.time.now / 1000;
    const pulso = 1 + 0.05 * Math.sin(relogio * 1.3) + 0.02 * Math.sin(relogio * 3.1);
    // Its light: wide around the small Sun, closer around the big one.
    this.solBrilho.setVisible(aSol > 0).setPosition(sp.x, sp.y).setScale((rs * (3.4 - 1.6 * passa) * pulso) / 128).setAlpha(aSol * 0.9);
    this.mostrarCorpo('sol', sp.x, sp.y, rSol1, 0, voltasEm('sol', t), aSol * (1 - passa));
    this.mostrarCorpo('sol_m', sp.x, sp.y, rSol2, 0, voltasEm('sol', t), aSol * passa);
    this.rotulo('Sun', sp.x, sp.y + rs + 4, 'Sun', '#fde68a', rotulos);

    // Planets: Blender models (make_planetas_3d.py), each showing the frame lit from where the Sun
    // is on screen.
    const NOMES: Record<string, [string, number]> = { Mercury: ['mercurio', 12], Venus: ['venus', 18], Earth: ['terra', 19], Mars: ['marte', 16],
      Jupiter: ['jupiter', 26], Saturn: ['saturno', 22], Uranus: ['urano', 18], Neptune: ['netuno', 18] };
    // The inner labels and the Moon step aside early on the way out, before the planets crowd the middle.
    const perto = 1 - suave(0.25, 0.8, el);
    // On Mars the live globe hands over to its Blender sprite as it gets small.
    const marteVivo = emMarte ? this.marteVivo : 0;
    for (const p of internos) {
      const pos = posicao(p, t);
      const q = tela({ x: pos.x * AU_KM, y: pos.y * AU_KM });
      const [chave, base] = NOMES[p.nome] ?? ['', 8];
      const externo = p.a > 2;
      const r = Math.max(p.raioKm * kmPx, base * kc * (externo ? Math.exp(-0.15 * el) : encolhe), 3.5 * kc);   // the outer ones only show pulled out: they shrink less
      if (externo && fora <= 0.01) continue;              // off screen until the zoom is pulled out
      const alfa = p.nome === 'Mars' ? 1 - marteVivo : 1;
      // In front of the big Sun a planet would show its dark night side: there it is drawn lit
      // from above instead (half lit), so it still reads as a planet.
      const sobreSol = !externo && Math.hypot(q.x - sp.x, q.y - sp.y) < rs * 0.97;
      const luz = sobreSol ? Math.PI / 2 : Math.atan2(-(sp.y - q.y), sp.x - q.x);   // lit from the Sun's side
      if (this.corpos.has(chave)) this.mostrarCorpo(chave, q.x, q.y, r, luz, voltasEm(chave, t), alfa);
      else g.fillStyle(p.cor).fillCircle(q.x, q.y, r);
      // In front of the big Sun a planet shows its night side (its day side faces the Sun): a dark
      // disc. A light rim keeps it reading as a planet, not a hole.
      if (!externo && alfa > 0) {
        const sobre = 1 - suave(rs * 0.9, rs * 1.05, Math.hypot(q.x - sp.x, q.y - sp.y));
        if (sobre > 0.01) this.gFrente.lineStyle(1.5 * kc, 0xfff7e6, 0.9 * sobre * alfa).strokeCircle(q.x, q.y, r + 0.5 * kc);
      }
      if (p.nome === 'Earth') {
        this.rotulo('Earth', q.x, q.y + r + 4, rotulos > 0.5 && !emMarte ? (P?.fase === 'cruzeiro' ? 'Earth + Moon' : 'Earth + Moon\nyou are here') : emMarte ? 'Earth + Moon' : 'Earth', '#93c5fd', suave(2.08, 2.2, n) * perto);
        // The Moon goes around it at its real angle (NASA phase), far enough out to be seen; it
        // passes behind Earth on the far side of its orbit.
        if (rotulos * perto > 0.05) {
          const am = Math.atan2(ld.y, ld.x) + th, dm = r + 16 * kc;
          const mx = q.x + Math.cos(am) * dm, my = q.y - Math.sin(am) * dm * ACHATAR;
          g.lineStyle(1, 0x94a3b8, 0.25 * rotulos * perto).strokeEllipse(q.x, q.y, dm * 2, dm * 2 * ACHATAR);
          this.corpos.get('lua')!.setDepth(Math.sin(am) > 0 ? 0.9 : 1.1);
          // Its turn follows its trip around Earth, so the same face keeps looking at Earth (the
          // frames start with the map's longitude 0 at 200 degrees, make_planetas_3d.py).
          const voltasLua = (am + Math.PI - (200 * Math.PI) / 180) / (2 * Math.PI);
          this.mostrarCorpo('lua', mx, my, 6 * kc, Math.atan2(-(sp.y - my), sp.x - mx), voltasLua, rotulos * perto);
        }
      } else if (p.nome === 'Mars') {
        // Chapter 3's destination: shown, locked until the rocket gets there.
        g.lineStyle(1.5, 0xfb923c, 0.7 * rotulos * perto).strokeCircle(q.x, q.y, r + 6 * kc);
        this.rotulo(p.nome, q.x, q.y + r + 8, emMarte ? 'Mars\nyou are here' : P ? 'Mars\nnext stop' : 'Mars\nnext stop (locked)', '#fdba74', rotulos * perto);
      } else {
        this.rotulo(p.nome, q.x, q.y + r + 4, p.nome, externo ? '#e2e8f0' : '#cbd5e1', rotulos * (externo ? fora : perto));
      }
    }
    if (!emMarte) this.rotulo('Moon', lq.x, lq.y + Math.max(largura / 2.2, 3) + 4, 'Moon', '#e2e8f0', suave(2.08, 2.2, n) * (1 - rotulos));

    const marte = posicao(PLANETAS[3], t);
    const dm = Math.hypot(marte.x - terraP.x, marte.y - terraP.y);
    this.definirLegenda(
      `${dataBonita(t)} · real positions from NASA JPL orbital elements · planet sizes enlarged, distances true · time: 1 second = ${HORAS_SISTEMA} hours · click a body to see it up close\n` +
      (el > 0.3 ? `Neptune is 4.5 billion km from the Sun: sunlight takes 4 hours to get there. Back to the inner planets in ${Math.ceil(sessao.segundosParaVoltar)} s, or zoom in.`
        : emMarte ? `Earth is ${(dm * AU_KM / 1e6).toFixed(0)} million km away today. A radio message takes ${(dm * 499 / 60).toFixed(0)} minutes each way, so Mission Control cannot steer you live.`
        : rotulos > 0.5 ? `Scroll out to peek at the outer planets. Mars, your next stop, is ${(dm * AU_KM / 1e6).toFixed(0)} million km away today. Light takes ${(dm * 499 / 60).toFixed(0)} minutes to get there.`
        : `The Moon is ${TERRA_LUA_KM.toLocaleString('en-US')} km from Earth. Light crosses that in 1.3 seconds.`));

    // Leaving for Mars: the ship crosses on the transfer path, solid behind it, dashed ahead.
    if (P?.fase === 'cruzeiro') {
      const s = sCruzeiro;
      const km = (a: { x: number; y: number }) => tela({ x: a.x * AU_KM, y: a.y * AU_KM });
      for (let i = 0; i < 120; i++) {
        const a = km(this.caminho[i]), b = km(this.caminho[i + 1]);
        if (i / 120 < s) g.lineStyle(2, 0xfbbf24, 0.9).lineBetween(a.x, a.y, b.x, b.y);
        else if (i % 2 === 0) g.lineStyle(1.5, 0xfbbf24, 0.45).lineBetween(a.x, a.y, b.x, b.y);
      }
      const a = km(noCaminho(this.caminho, s)), b = km(noCaminho(this.caminho, s + 0.004));
      const rumo = Math.atan2(-(b.y - a.y), b.x - a.x);
      const motor = s < 0.06 || s > 0.94;                 // the engine only fires to leave and to arrive
      this.desenharNave(a.x, a.y, rumo, 0.26, motor ? 1 : 0, 15);
      const dia = Math.round(s * DIAS_REAIS);
      this.definirLegenda(`${dataBonita(t)} · day ${dia} of ${Math.round(DIAS_REAIS)} · the path that saves the most fuel\n` +
        (motor ? 'Engine on! It only fires to leave and to arrive.'
          : 'The way to Mars opens only every 26 months!'));
    }
  }

  // ---------- Chapter 3: Mars as the view's own body ----------
  // Mars at its real place and size, drawn live (planetaShader.ts) exactly as the last frame of
  // its film (make_flight_marte.py: tilted view, Jezero turned toward the camera, the Sun to the
  // left), with the base pin and its two moons. Pulled out to the planets it turns, and once it
  // is small its Blender sprite takes over (the planet loop). Returns true in the globe view
  // (the solar system is not drawn there).
  private globoMarte(tela: (p: { x: number; y: number }) => { x: number; y: number }, marteKm: { x: number; y: number },
    kmPx: number, t: number, n: number, dtMs: number, W: number, H: number) {
    const m = this.marte;
    const dt = dtMs / 1000, lento = movimentoReduzido();
    const kc = Math.min(W, H) / 720;
    const q = tela(marteKm), sp = tela({ x: 0, y: 0 });
    const D = 2 * RAIO_MARTE * kmPx;
    this.marteVivo = m && D > 2 * 16 * kc * 1.4 ? 1 : 0;   // a shader has no alpha: one or the other
    // Out at the planets Mars turns at its real pace on the system's clock; on the way back it
    // turns back to the film's angle, so the film starts from the same picture.
    const sistema = suave(2.05, 2.35, n);
    if (sessao.vista === 'sistema' && !sessao.voo) {
      if (!lento && !configuracoesAbertas) this.giroMarte += dt * HORAS_SISTEMA * (360 / (SOL_MS / 3600000)) * sistema;
    } else {
      const falta = ((-this.giroMarte % 360) + 540) % 360 - 180;
      this.giroMarte += falta * (1 - Math.exp(-dt * 5));
    }
    if (!lento && !configuracoesAbertas) this.horasMarte += dt;
    const giro = giroOlhando(JEZERO.lon) - 12 + this.giroMarte;
    if (m && this.marteVivo) {
      m.setVisible(true).setPosition(q.x, q.y).setScale(D / diametroPlaneta(1));
      m.setGiro(giro);
      m.setSolTela(sp.x - q.x, sp.y - q.y);   // the view is turned so this is the film's light
    }
    // The base pin on Jezero crater (during the film the film's own frames mark it).
    const pino = pontoNoPlaneta(JEZERO.lat, JEZERO.lon, giro);
    const ap = (1 - suave(2.05, 2.2, n)) * (pino.frente ? 1 : 0);
    if (!this.pinoVoo && !sessao.voo && ap > 0) this.pino.setVisible(true).setAlpha(ap).setPosition(q.x + pino.x * (D / 2), q.y + pino.y * (D / 2));
    // Phobos and Deimos round Mars's equator (orbit radius in Mars radii, period in hours: NASA).
    const al = (sessao.voo ? 0 : 1) * (1 - suave(2.05, 2.2, n));
    const luas = [{ nome: 'Phobos', raio: 2.76, horas: 7.65, cor: 0xd6c3b0 }, { nome: 'Deimos', raio: 6.92, horas: 30.3, cor: 0xe7d8c9 }];
    luas.forEach((l, i) => {
      if (al <= 0.01) return;
      const ang = (this.horasMarte / l.horas) * Math.PI * 2 + i * 2.1;
      const rr = l.raio * (D / 2);
      const x = q.x + Math.cos(ang) * rr, y = q.y - Math.sin(ang) * rr * ACHATAR;
      const naFrente = Math.sin(ang) < 0;
      this.g.lineStyle(1, 0xe2e8f0, 0.25 * al).strokeEllipse(q.x, q.y, rr * 2, rr * 2 * ACHATAR);
      if (!naFrente && Math.hypot(x - q.x, y - q.y) < D / 2) return;      // behind the planet
      const r = Math.max(3, D * 0.012 * (i === 0 ? 1 : 0.7));
      (naFrente ? this.gFrente : this.g).fillStyle(l.cor, al).fillEllipse(x, y, r * 2.4, r * 1.8).lineStyle(1.5, COR.contorno, al).strokeEllipse(x, y, r * 2.4, r * 1.8);
      this.rotulo(l.nome, x, y + r + 3, l.nome, '#e2e8f0', al);
    });
    if (n >= 2.08) return false;
    if (!sessao.voo) this.definirLegenda(
      `Mars · ${dataBonita(t)} · your base in ${JEZERO.nome} (${JEZERO.lat.toFixed(1)}° N, ${JEZERO.lon.toFixed(1)}° E), where NASA's Perseverance rover landed in 2021\n` +
      `Mars is about half as wide as Earth. A day there, a sol, lasts ${Math.floor(SOL_MS / 3600000)} h ${Math.floor((SOL_MS % 3600000) / 60000)} min. Phobos and Deimos are its two small moons.`);
    return true;
  }

  // ---------- Leaving for Mars (sessao.partida) ----------

  // Moves the departure on from one part to the next: the zoom flights are sessao's own.
  private avancarPartida(dt: number) {
    const P = sessao.partida;
    if (!P || P.acabou) return;
    const lento = movimentoReduzido();
    const quieto = !sessao.voo && !sessao.transicao;
    if (P.fase === 'filme' && quieto && sessao.vista === 'lua') { P.fase = 'saida'; P.t = 0; }
    else if (P.fase === 'saida') {
      P.t = Math.min(1, P.t + dt / (lento ? 1.5 : 4));
      if (P.t >= 1 && !sessao.transicao) { P.fase = 'zoom'; sessao.voar('sistema'); }
    } else if (P.fase === 'zoom' && quieto && sessao.vista === 'sistema') { P.fase = 'cruzeiro'; P.t = 0; }
    else if (P.fase === 'cruzeiro') {
      P.t = Math.min(1, P.t + dt / (lento ? 3 : 10));
      if (P.t >= 1) {
        P.acabou = true;
        this.time.delayedCall(lento ? 200 : 1200, () => {
          this.cameras.main.fadeOut(600, 2, 6, 23);
          this.cameras.main.once('camerafadeoutcomplete', () => { sessao.partida = null; P.fim(); });
        });
      }
    }
  }

  // Where the rocket is during the film: just off the base, away from the Moon's center (the
  // screen center at the end of the film), farther as the film zooms out.
  private subida(bx: number, by: number, q: number, W: number, H: number) {
    let dx = bx - W / 2, dy = by - H / 2;
    const d = Math.hypot(dx, dy);
    const w = Phaser.Math.Clamp(d / 80, 0, 1);
    dx = (d ? dx / d : 0) * w; dy = (d ? dy / d : 0) * w - (1 - w);
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const dist = 16 + 34 * q;
    return { x: bx + dx * dist, y: by + dy * dist, dx, dy };
  }

  // The rocket from the map, small, nose along (dx, dy), flame out of its base.
  private desenharFoguete(x: number, y: number, dx: number, dy: number, alto: number) {
    const k = alto / foguetevoo.h;
    this.foguete.setVisible(true).setDepth(15).setPosition(x, y).setScale(k).setRotation(Math.atan2(dx, -dy));
    const l = alto * 0.55 * Phaser.Math.FloatBetween(0.85, 1.15), w = alto * 0.09;
    const px = -dy, py = dx;
    this.chamas.fillStyle(0xfb923c, 0.9).fillTriangle(x + px * w, y + py * w, x - px * w, y - py * w, x - dx * l, y - dy * l);
    this.chamas.fillStyle(0xfde68a, 0.95).fillTriangle(x + px * w * 0.5, y + py * w * 0.5, x - px * w * 0.5, y - py * w * 0.5, x - dx * l * 0.55, y - dy * l * 0.55);
  }

  // The Mars ship picture for a heading, with its engine flame behind it (as in Viagem).
  private desenharNave(x: number, y: number, rumo: number, escala: number, empuxo: number, prof: number) {
    const q = quadroNave(rumo);
    this.nave.setTexture(q.chave).setOrigin(q.ox, q.oy).setPosition(x, y).setScale(escala).setVisible(true).setDepth(prof);
    this.chamas.setDepth(prof);
    if (empuxo <= 0) return;
    const ux = -Math.cos(rumo), uy = Math.sin(rumo) * ACHATAR;
    const L = Math.hypot(ux, uy) || 1;
    const m = dadosViagem.nave.motorUnidades * dadosViagem.nave.pxPorUnidade * escala;
    const bx = x + (ux / L) * m, by = y + (uy / L) * m;
    const comp = (26 + 16 * empuxo) * escala * Phaser.Math.FloatBetween(0.85, 1.15);
    const lx = -uy / L, ly = ux / L, w = 9 * escala;
    this.chamas.fillStyle(0xfb923c, 0.85).fillTriangle(bx + lx * w, by + ly * w, bx - lx * w, by - ly * w, bx + (ux / L) * comp, by + (uy / L) * comp);
    this.chamas.fillStyle(0xfde68a, 0.95).fillTriangle(bx + lx * w * 0.5, by + ly * w * 0.5, bx - lx * w * 0.5, by - ly * w * 0.5, bx + (ux / L) * comp * 0.55, by + (uy / L) * comp * 0.55);
  }

  // Straight off the Moon: from where the film left the rocket, the ship climbs away from the
  // Moon's center with its engine on, faster and faster; the zoom out keeps it in view.
  private saidaDaLua(P: NonNullable<typeof sessao.partida>, bx: number, by: number, R: number, W: number, H: number) {
    const r0 = this.subida(bx, by, 1, W, H);
    const t = P.fase === 'saida' ? P.t : 1;
    const d = R * (0.15 + 1.6 * t * t);                    // accelerating
    const x = r0.x + r0.dx * d, y = r0.y + r0.dy * d;
    const rumo = Math.atan2(-r0.dy, r0.dx);
    this.desenharNave(x, y, rumo, Phaser.Math.Clamp(R / 1300, 0.06, 0.24), 1.3, 15);
    if (P.fase !== 'saida') return;
    this.definirLegenda('Straight to Mars! Weak Moon gravity makes leaving easy.\n' +
      'Leaving the Moon takes 2.4 km/s. Leaving Earth takes 11.2 km/s!');
  }
}
