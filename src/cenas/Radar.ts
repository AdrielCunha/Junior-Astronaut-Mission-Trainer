// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Title screen. Like most game title screens: a big logo, one column of buttons under it (the main
// one bigger and brighter), the game's world alive behind them. Here that world is the rocket's
// radar: the sweep turns across the whole screen and its blips are the journey (Earth and the Moon
// base on the left, deep space and Mars on the right). Everything sits on the center line.
// Windows (how to play, explore, credits) use the task frame (../tarefas/estilo.ts).
//
// Speed: Phaser rebuilds the shapes of every Graphics object each frame, so nothing here stays a
// Graphics. Shapes are drawn once into textures and shown as images; only the windows, which are
// open for a moment, keep live Graphics.
import Phaser from 'phaser';
import { dispositivoMovel, escalaInterface } from '../mobile';
import paletaLua from '../dados/paleta_lua.json';
const LUA_COR=Number.parseInt(String(paletaLua.solo[2][1]).slice(1),16);
const LUA_CRATERA=Number.parseInt(paletaLua.rocha.slice(1),16);
import { abrirVideo, movimentoReduzido, configuracoesAbertas, video, escolherSkin } from '../video';
import { SKINS } from '../dados/skins';
import { sessao, type Mundo } from './sessao';
import { basesLiberadas } from '../salvamento';
import type { DadosChegada } from './Chegada';
import { CONTORNO, COR_BOTAO_TELA, botaoFechar, botaoVerde, criarIconeJogo, letra, moldura, pilulaEscura } from '../tarefas/estilo';
import { alternarMudo, estaMudo, definirAmbienteMusica } from '../audio';
import { definirVolumeMusica, volumeMusica } from '../audio';
import { definirVolumeEfeitos, tocarSfx, volumeEfeitos } from '../sfx';
import { idioma, escolherIdioma } from '../idioma';

export type DadosRadar = { aoComecar: () => void; aoExplorar: (mundo: Mundo) => void; continuar?: boolean; aoNovoJogo?: () => void };

// Edit the credits here: [section, [role, name][]]. An empty role centers the name (the team).
const CREDITOS: [string, [string, string][]][] = [
  ['THE TEAM · STAR LEAGUE', [
    ['', 'Adriel dos Santos Cunha (@adrielcunha)'],
    ['', 'Andrea da Paixão Ayala (@andreapayala)'],
    ['', 'Felipe Sabino Cota (@felipescota)'],
    ['', 'Juliana Elen Silva Oliveira (@jeso)'],
    ['', 'Matheus Coelho (@matheus-fsc)'],
    ['', 'Maria Paula Moreira Rocha (@mariapaulaa)']
  ]],
  ['SPECIAL THANKS', [
    ['Event', 'NASA Space Apps 2026 (Itabira - MG)'],
    ['Local Lead', 'Lucas Assunção Zanon (@Lucaszanon)'],
    ['Host Venue', 'CEU UNIFEI - Campus Itabira'],
    ['Event Page', 'spaceappschallenge.org/2026/'],
    ['', 'local-events/itabira/']
  ]],
  ['NASA DATA', [
    ['Solar storms', 'DONKI · ENLIL'],
    ['Radiation dose', 'OSDR RadLab'],
    ['Instruments', 'LRO/CRaTER · BioSentinel · Curiosity RAD'],
    ['Mars weather', 'Curiosity REMS'],
    ['Moon ground', 'LRO LOLA'],
    ['Moon colors', 'SVS CGI Moon Kit · LROC'],
    ['Stars', 'SVS Deep Star Maps · ESA/Gaia/DPAC'],
    ['Planet positions', 'JPL'],
    ['Earth', 'Blue Marble'],
    ['Mercury', 'MESSENGER'],
    ['Mars', 'Viking · USGS'],
  ]],
  ['MADE WITH', [
    ['Game engine', 'Phaser 3'],
    ['Code', 'TypeScript · Vite'],
    ['3D models', 'Blender'],
    ['Font', 'Fredoka · SIL OFL'],
    ['Music', 'AI-generated (Google Gemini, Flow Music)'],
    ['', 'Lunar Odyssey Theme'],
    ['', 'Beneath the Silver Tide'],
    ['', 'Across the Crimson Basin'],
    ['', 'Aventura Espacial 8-Bit'],
    ['Soundtrack files', 'AndreaAyalaa'],
  ]],
  ['AI TOOLS', [
    ['Coding help', 'Claude · Anthropic'],
    ['Images', 'OpenAI Codex'],
    ['Music', 'Google Gemini · Flow Music']
  ]],
];

const VEL_VARREDURA = 0.9;   // rad/s
const CIANO = 0x7dd3fc;

export class Radar extends Phaser.Scene {
  private u = 1;
  private travado = false;
  private janelaAberta = false;
  private reabrirConfiguracoes = false;
  private chaves: string[] = [];

  constructor() {
    super({ key: 'Radar' });
  }

  create(d: DadosRadar) {
    definirAmbienteMusica('inicio');
    const W = this.scale.width, H = this.scale.height;
    const movel = dispositivoMovel() && W > H;
    const u = (this.u = escalaInterface(W, H, 0.5));
    this.travado = false;
    this.janelaAberta = false;
    this.chaves = [];
    // The map, the zoom and the keys wait under the title screen, as under a task. The game is
    // fully covered, so it is not drawn until the title screen closes.
    sessao.emTarefa = true;
    const jogo = ['Espaco', 'Superficie', 'Interface'];
    for (const k of jogo) this.scene.setVisible(false, k);
    const redimensionar = () => this.scene.restart(d);
    // A language change redraws the screen (the pills fit their texts) with the settings open.
    this.events.once('idioma', () => { this.reabrirConfiguracoes = true; redimensionar(); });
    this.scale.on('resize', redimensionar);
    this.events.once('shutdown', () => {
      definirAmbienteMusica(sessao.mundo);
      sessao.emTarefa = false;
      for (const k of jogo) this.scene.setVisible(true, k);
      this.scale.off('resize', redimensionar);
      this.events.off('idioma');
      for (const k of this.chaves) if (this.textures.exists(k)) this.textures.remove(k);
    });

    const lancar = () => { if (this.travado || this.janelaAberta) return; this.travado = true; if (d.continuar) { this.scene.stop(); d.aoComecar(); } else { tocarSfx('ligar'); this.contagem(d.aoComecar); } };
    const explorar = (mundo: Mundo = 'lua') => { if (this.travado) return; this.travado = true; this.scene.stop(); d.aoExplorar(mundo); };

    const j = this.pontosJornada(W, H);
    this.fundo(W, H, j.rota);
    this.jornada(j);
    const inicioMenu = this.children.list.length;

    // ----- center column: logo, ribbon, buttons -----
    const cx = W / 2;
    const tam = movel ? Math.min(37 * u, W / 13) : Math.min(92 * u, W / 9.5);
    // The mobile title is a single measured block, not separate percentages of screen height:
    // Safari's address bar changes H while the phone stays in landscape.
    const yLogo = movel ? 0 : H * 0.2;
    const sombra = this.add.text(cx + 5 * u, yLogo + 7 * u, 'LUNAR ODYSSEY', letra(tam, '#0b1a4a', { stroke: '#0b1a4a', strokeThickness: tam / 4.5 })).setOrigin(0.5);
    const logo = this.add.text(cx, yLogo, 'LUNAR ODYSSEY', letra(tam, '#fde047', { stroke: '#1e293b', strokeThickness: tam / 4.5 })).setOrigin(0.5);
    if (!movel) this.tweens.add({ targets: [logo, sombra], y: '-=6', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const fita = this.make.text({ x: cx, y: yLogo + tam * 0.85, text: 'JUNIOR ASTRONAUT MISSION TRAINER',
      style: letra((movel ? 12 : 15) * u, '#ffffff', { letterSpacing: (movel ? 1 : 2) * u } as Phaser.Types.GameObjects.Text.TextStyle) }, false).setOrigin(0.5);
    const fw = fita.width + 44 * u, fh = fita.height + (movel ? 6 : 14) * u;
    this.imagem(cx, fita.y, fw, fh, (g) => g.fillStyle(CONTORNO, 0.95).fillRoundedRect(-fw / 2, -fh / 2, fw, fh, fh / 2));
    this.add.existing(fita);

    // LAUNCH and EXPLORE full width; HOW TO PLAY and CREDITS share the last row.
    const bw = Math.min((movel ? 310 : 340) * u, W - 60 * u), bh = (movel ? 37 : 58) * u, gap = (movel ? 12 : 16) * u;
    const linhas = d.continuar && d.aoNovoJogo ? 4 : 3;
    const alturaBotoes = linhas * bh + (linhas - 1) * gap + 8 * u;
    const topoLogo = yLogo - logo.height / 2;
    const topoFita = fita.y - fh / 2;
    const topoConteudo = Math.min(topoLogo, topoFita);
    const altoTitulo = Math.max(logo.y + logo.height / 2, fita.y + fh / 2) - topoConteudo;
    const espacoTitulo = (movel ? 20 : 8) * u;
    const alturaBloco = altoTitulo + espacoTitulo + alturaBotoes;
    const escalaBloco = movel ? Math.min(1, (H - 16 * u) / alturaBloco) : 1;
    const topoBloco = (H - alturaBloco * escalaBloco) / 2 - (movel ? Math.min(8 * u, Math.max(0, (H - alturaBloco * escalaBloco) / 4)) : 0);
    const y1 = movel ? topoConteudo + altoTitulo + espacoTitulo + (bh + 8 * u) / 2
      : Math.max(fita.y + fh / 2 + 54 * u, H * 0.5);
    const play = this.botao(cx, y1, bw, bh + 8 * u, d.continuar ? 'CONTINUE MISSION  \u25b6' : 'LAUNCH MISSION  \u25b6', 0x22c55e, (movel ? 20 : 24) * u, lancar);
    if (!movel) this.tweens.add({ targets: play, scale: 1.05, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    play.setData('acao', d.continuar ? 'continue' : 'launch');
    let proximaLinha = y1 + (bh + 8 * u) / 2 + gap + bh / 2;
    if (d.continuar && d.aoNovoJogo) {
      this.botao(cx, proximaLinha, bw, bh, 'NEW GAME', 0x2563eb, (movel ? 17 : 20) * u, () => this.confirmarNovoJogo(d.aoNovoJogo!, d.aoComecar)).setData('acao', 'new-game');
      proximaLinha += bh + gap;
    }
    this.botao(cx, proximaLinha, bw, bh, 'EXPLORE A BASE', 0x2563eb, (movel ? 17 : 20) * u, () => this.escolherBase(explorar));
    const y3 = proximaLinha + bh + gap, meia = (bw - gap) / 2;
    this.botao(cx - (meia + gap) / 2, y3, meia, bh, 'HOW TO PLAY', 0x475569, (movel ? 14 : 18) * u, () => this.comoJogar());
    this.botao(cx + (meia + gap) / 2, y3, meia, bh, 'CREDITS', 0x475569, (movel ? 14 : 18) * u, () => this.creditos());

    if (movel) {
      for (const objeto of this.children.list.slice(inicioMenu)) {
        const item = objeto as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
        item.x = cx + (item.x - cx) * escalaBloco;
        item.y = topoBloco + (item.y - topoConteudo) * escalaBloco;
        item.setScale(escalaBloco);
      }
    }

    // ----- corners -----
    this.botaoConfiguracoes(W - 40 * u, 40 * u);
    if (!movel) {
      const rodape = H - 22 * u;
      this.add.text(24 * u, rodape, 'Real NASA data · the May 2024 solar storm', letra(13 * u, '#bfdbfe', { fontStyle: '500' })).setOrigin(0, 0.5);
      const enter = this.add.text(W - 24 * u, rodape, d.continuar ? 'Press ENTER to continue' : 'Press ENTER to launch', letra(13 * u, '#bfdbfe', { fontStyle: '500' })).setOrigin(1, 0.5);
      this.tweens.add({ targets: enter, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });
    }

    this.input.keyboard?.on('keydown-ENTER', lancar);
    if (this.reabrirConfiguracoes) { this.reabrirConfiguracoes = false; this.configurarAudio(true); }
  }

  update() {
    const paused=movimentoReduzido() || configuracoesAbertas;
    this.tweens.getTweens().forEach(t=>{t.paused=paused;});
  }

  // ---------- drawing once ----------
  // Draws with a throwaway Graphics into a new texture of w x h, centered on (0, 0), and returns its key.
  private textura(w: number, h: number, desenhar: (g: Phaser.GameObjects.Graphics) => void, origem = { x: w / 2, y: h / 2 }) {
    // generateTexture ignores the Graphics' position, so the origin is moved inside the drawing.
    const g = this.make.graphics({}, false).translateCanvas(origem.x, origem.y);
    desenhar(g);
    const chave = `titulo_${this.chaves.length}`;
    if (this.textures.exists(chave)) this.textures.remove(chave);
    g.generateTexture(chave, Math.ceil(w), Math.ceil(h));
    g.destroy();
    this.chaves.push(chave);
    return chave;
  }

  private imagem(x: number, y: number, w: number, h: number, desenhar: (g: Phaser.GameObjects.Graphics) => void) {
    return this.add.image(x, y, this.textura(w, h, desenhar));
  }

  // ---------- background: space with a radar across the whole screen ----------
  private fundo(W: number, H: number, rota: Phaser.Curves.Spline) {
    const u = this.u;
    this.add.rectangle(0, 0, W, H, 0x020617).setOrigin(0).setInteractive();   // also blocks clicks to the map
    const cx = W / 2, cy = H * 0.56, R = Math.hypot(W, H) * 0.55;
    const fundo = this.textura(W, H, (g) => {
      const camadas = 14;
      for (let k = 0; k < camadas; k++) {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(0x0b1a4a), Phaser.Display.Color.ValueToColor(0x1d4ed8), camadas - 1, k);
        g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b)).fillCircle(cx, cy, R * (1 - k / camadas));
      }
      for (let i = 0; i < 80; i++) g.fillStyle(0xffffff, 0.2 + Math.random() * 0.5).fillCircle(Math.random() * W, Math.random() * H, (0.6 + Math.random() * 1.3) * u);
      const r0 = Math.min(W, H) * 0.24;
      g.lineStyle(2 * u, 0xffffff, 0.1);
      for (let k = 1; k <= 5; k++) g.strokeCircle(cx, cy, r0 * k);
      g.lineBetween(0, cy, W, cy).lineBetween(cx, 0, cx, H);
      for (let k = 0; k < 72; k++) {
        const a = (k * Math.PI) / 36, ra = r0 * 2 - (k % 6 === 0 ? 12 : 6) * u;
        g.lineStyle(2 * u, 0xffffff, k % 6 === 0 ? 0.3 : 0.15)
          .lineBetween(cx + Math.cos(a) * ra, cy + Math.sin(a) * ra, cx + Math.cos(a) * r0 * 2, cy + Math.sin(a) * r0 * 2);
      }
      const pts = rota.getSpacedPoints(110);
      for (let i = 0; i < pts.length - 1; i += 2) g.lineStyle(3 * u, 0xfde047, 0.55).lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    }, { x: 0, y: 0 });
    this.add.image(0, 0, fundo).setOrigin(0);

    for (let i = 0; i < 12; i++) {
      const e = this.add.circle(Math.random() * W, Math.random() * H, (1 + Math.random()) * u, 0xffffff, 0.8);
      this.tweens.add({ targets: e, alpha: 0.1, duration: 700 + Math.random() * 1000, yoyo: true, repeat: -1, delay: Math.random() * 900 });
    }

    // Sweep: a wedge drawn at half size, its corner on the radar's center, then only rotated.
    const r = Math.ceil(R / 2);
    const varredura = this.textura(r, r + 2, (g) => {
      for (let k = 0; k < 30; k++) g.fillStyle(CIANO, 0.2 * (1 - k / 30) ** 1.5).slice(0, r, r, -k * 0.03, -(k + 1) * 0.03, true).fillPath();
      g.lineStyle(1.5 * u, 0xffffff, 0.5).lineBetween(0, r, r, r);
    }, { x: 0, y: 0 });
    const img = this.add.image(cx, cy, varredura).setOrigin(0, r / (r + 2)).setScale(2);
    this.tweens.add({ targets: img, angle: 360, duration: (2 * Math.PI / VEL_VARREDURA) * 1000, repeat: -1 });
  }

  // ---------- the journey: blips on the sides, joined by the route ----------
  private pontosJornada(W: number, H: number) {
    const v = (fx: number, fy: number) => new Phaser.Math.Vector2(W * fx, H * fy);
    const terra = v(0.13, 0.3), lua = v(0.22, 0.66), viagem = v(0.78, 0.7), marte = v(0.87, 0.32);
    return { terra, lua, viagem, marte, rota: new Phaser.Curves.Spline([terra, lua, v(0.5, 0.97), viagem, marte]) };
  }

  private jornada({ terra, lua, viagem, marte, rota }: ReturnType<Radar['pontosJornada']>) {
    const u = this.u;
    const s = u * Math.min(1.6, Math.max(1, this.scale.height / 600));
    const lado = 70 * s;
    this.imagem(terra.x, terra.y, lado, lado, (g) => this.planeta(g, s, 'terra'));
    this.etiqueta(terra.x, terra.y + 36 * s, 'EARTH');

    const anel = this.add.circle(lua.x, lua.y, 26 * s).setStrokeStyle(4 * u, 0xfde047);
    this.tweens.add({ targets: anel, scale: 1.8, alpha: 0, duration: 1400, repeat: -1 });
    this.imagem(lua.x, lua.y - 6 * s, lado, lado + 12 * s, (g) => this.planeta(g.translateCanvas(0, 6 * s), s, 'lua'));
    this.etiqueta(lua.x, lua.y + 44 * s, '1 · MOON BASE');
    this.voceEstaAqui(lua.x, lua.y - 52 * s);

    this.imagem(viagem.x, viagem.y, 30 * s, 30 * s, (g) => g.fillStyle(0xfde047).fillCircle(0, 0, 11 * s).lineStyle(3 * u, CONTORNO).strokeCircle(0, 0, 11 * s));
    this.etiqueta(viagem.x, viagem.y + 28 * s, '2 · DEEP SPACE', true);
    this.imagem(marte.x, marte.y, lado, lado, (g) => this.planeta(g, s, 'marte'));
    this.etiqueta(marte.x, marte.y + 36 * s, '3 · MARS', true);

    // A little rocket flies the route from the Moon to Mars.
    const foguete = this.foguete(s);
    const voo = { t: 0.26 };
    const initial=rota.getPoint(voo.t);foguete.setPosition(initial.x,initial.y);
    this.tweens.add({
      targets: voo, t: 0.98, duration: 7000, repeat: -1, repeatDelay: 600, ease: 'Sine.easeInOut',
      onUpdate: () => {
        const q = rota.getPoint(voo.t), tg = rota.getTangent(voo.t);
        foguete.setPosition(q.x, q.y).setRotation(Math.atan2(tg.y, tg.x)).setAlpha(Math.min(1, (0.98 - voo.t) * 25, (voo.t - 0.26) * 25));
      },
    });
  }

  // Cartoon planets drawn around (0, 0), s = scale.
  private planeta(g: Phaser.GameObjects.Graphics, s: number, qual: 'terra' | 'lua' | 'marte' | 'nave') {
    const u = this.u;
    if (qual === 'terra') {
      g.fillStyle(0x60a5fa, 0.18).fillCircle(0, 0, 30 * s).fillStyle(0x3b82f6).fillCircle(0, 0, 20 * s).lineStyle(4 * u, CONTORNO).strokeCircle(0, 0, 20 * s);
      g.fillStyle(0x4ade80).fillCircle(-7 * s, -5 * s, 7 * s).fillCircle(8 * s, 7 * s, 5 * s).fillStyle(0xffffff, 0.6).fillCircle(-8 * s, -11 * s, 3 * s);
    } else if (qual === 'lua') {
      g.fillStyle(LUA_COR).fillCircle(0, 0, 26 * s).lineStyle(4 * u, CONTORNO).strokeCircle(0, 0, 26 * s);
      g.fillStyle(LUA_CRATERA).fillCircle(-9 * s, 7 * s, 7 * s).fillCircle(10 * s, -4 * s, 5 * s);
      g.fillStyle(0xf8fafc).beginPath().arc(0, -23 * s, 10 * s, Math.PI, 0).closePath().fillPath()
        .lineStyle(2.5 * u, CONTORNO).beginPath().arc(0, -23 * s, 10 * s, Math.PI, 0).closePath().strokePath();
    } else if (qual === 'marte') {
      g.fillStyle(0xf87171, 0.18).fillCircle(0, 0, 30 * s).fillStyle(0xf97316).fillCircle(0, 0, 20 * s).lineStyle(4 * u, CONTORNO).strokeCircle(0, 0, 20 * s);
      g.fillStyle(0xc2410c).fillCircle(6 * s, 5 * s, 5 * s).fillCircle(-7 * s, -4 * s, 3.5 * s);
    } else {
      this.desenharFoguete(g, s * 1.6);
    }
  }

  private etiqueta(x: number, y: number, s: string, trancado = false) {
    const u = this.u;
    const t = this.make.text({ x, y, text: s, style: letra(13 * u, trancado ? '#cbd5e1' : '#ffffff') }, false).setOrigin(0.5);
    const extra = trancado ? 18 * u : 0;
    const w = t.width + 22 * u + extra, h = t.height + 8 * u;
    this.imagem(x, y, w + 2, h + 2, (g) => {
      g.fillStyle(CONTORNO, 0.9).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      if (trancado) {
        const lx = w / 2 - 15 * u;
        g.lineStyle(2 * u, 0xfacc15).strokeCircle(lx, -2.5 * u, 3 * u).fillStyle(0xfacc15).fillRoundedRect(lx - 4.5 * u, -1.5 * u, 9 * u, 7 * u, 1.5 * u);
      }
    });
    t.setX(x - extra / 2);
    this.add.existing(t);
  }

  private voceEstaAqui(x: number, y: number) {
    const u = this.u;
    const t = this.make.text({ x: 0, y: 0, text: 'YOU ARE HERE', style: letra(13 * u, '#1e293b') }, false).setOrigin(0.5);
    const w = t.width + 20 * u, h = t.height + 8 * u;
    const fundo = this.add.image(0, 3 * u, this.textura(w + 6 * u, h + 16 * u, (g) => g
      .fillStyle(0xfde047).fillRoundedRect(-w / 2, -h / 2 - 3 * u, w, h, h / 2).fillTriangle(-6 * u, h / 2 - 4 * u, 6 * u, h / 2 - 4 * u, 0, h / 2 + 4 * u)
      .lineStyle(2.5 * u, CONTORNO).strokeRoundedRect(-w / 2, -h / 2 - 3 * u, w, h, h / 2)));
    const c = this.add.container(x, y, [fundo, t]);
    this.tweens.add({ targets: c, y: y - 5 * u, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private desenharFoguete(g: Phaser.GameObjects.Graphics, s: number) {
    g.fillStyle(0xef4444).fillTriangle(-10 * s, -5 * s, -15 * s, -10 * s, -4 * s, -5 * s).fillTriangle(-10 * s, 5 * s, -15 * s, 10 * s, -4 * s, 5 * s);
    g.fillStyle(0xf8fafc).fillRoundedRect(-13 * s, -5.5 * s, 22 * s, 11 * s, 5 * s).lineStyle(2 * s, CONTORNO).strokeRoundedRect(-13 * s, -5.5 * s, 22 * s, 11 * s, 5 * s);
    g.fillStyle(0xef4444).fillTriangle(9 * s, -5.5 * s, 9 * s, 5.5 * s, 17 * s, 0).lineStyle(2 * s, CONTORNO).strokeTriangle(9 * s, -5.5 * s, 9 * s, 5.5 * s, 17 * s, 0);
    g.fillStyle(0x38bdf8).fillCircle(1 * s, 0, 2.6 * s).lineStyle(1.5 * s, CONTORNO).strokeCircle(1 * s, 0, 2.6 * s);
  }

  private foguete(s: number) {
    const chama = this.add.image(-12 * s, 0, this.textura(14 * s, 10 * s, (g) => g
      .fillStyle(0xf97316).fillTriangle(0, -4 * s, 0, 4 * s, -12 * s, 0)
      .fillStyle(0xfde047).fillTriangle(0, -2.5 * s, 0, 2.5 * s, -7 * s, 0), { x: 13 * s, y: 5 * s })).setOrigin(13 / 14, 0.5);
    this.tweens.add({ targets: chama, scaleX: 0.6, duration: 90, yoyo: true, repeat: -1 });
    const corpo = this.add.image(0, 0, this.textura(40 * s, 24 * s, (g) => this.desenharFoguete(g, s), { x: 18 * s, y: 12 * s })).setOrigin(18 / 40, 0.5);
    return this.add.container(0, 0, [chama, corpo]);
  }

  // ---------- buttons ----------
  // Menu button: a pill with a white border, a dark outline and a drop shadow, centered on (x, y).
  private botao(x: number, y: number, w: number, h: number, texto: string, cor: number, tamanho: number, acao: () => void) {
    const u = this.u;
    const fundo = this.add.image(2 * u, 3 * u, this.textura(w + 14 * u, h + 16 * u, (g) => g
      .fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2 + 4 * u, -h / 2 + 6 * u, w, h, h / 2)
      .fillStyle(cor).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2)
      .fillStyle(0xffffff, 0.18).fillRoundedRect(-w / 2 + 8 * u, -h / 2 + 5 * u, w - 16 * u, h * 0.38, h * 0.19)
      .lineStyle(4 * u, 0xffffff).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2)
      .lineStyle(2 * u, CONTORNO).strokeRoundedRect(-w / 2 - 3 * u, -h / 2 - 3 * u, w + 6 * u, h + 6 * u, h / 2 + 3 * u),
    { x: w / 2 + 5 * u, y: h / 2 + 5 * u }));
    const volumeControl = w === 42 * u && h === 38 * u;
    const conteudo: Phaser.GameObjects.GameObject[] = [fundo];
    if (volumeControl) {
      const simbolo = this.add.graphics().lineStyle(3 * u, 0xffffff, 1).lineBetween(-6 * u, 0, 6 * u, 0);
      if (texto.includes('+')) simbolo.lineBetween(0, -6 * u, 0, 6 * u);
      conteudo.push(simbolo);
    } else {
      conteudo.push(this.add.text(0, 0, texto, letra(tamanho, '#ffffff', { stroke: '#1e293b', strokeThickness: 4 * u })).setOrigin(0.5));
    }
    const c = this.add.container(x, y, conteudo).setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerover', () => { if (!dispositivoMovel()) c.setScale(1.06); tocarSfx('suave'); }).on('pointerout', () => c.setScale(1)).on('pointerdown', () => { if (!this.travado) { if (!texto.startsWith('LAUNCH')) tocarSfx('clique'); acao(); } });
    return c;
  }

  // Round blue button, the same size as the red X on the task screens.
  private botaoMusica(x: number, y: number) {
    const u = this.u;
    const lado = 58 * u;
    const desenhar = (mudo: boolean) => (g: Phaser.GameObjects.Graphics) => {
      g.fillStyle(0x2563eb).fillCircle(0, 0, 23 * u).lineStyle(4 * u, 0xffffff).strokeCircle(0, 0, 23 * u).lineStyle(2 * u, CONTORNO).strokeCircle(0, 0, 26 * u);
      if (mudo) g.lineStyle(4 * u, 0xef4444).lineBetween(-11 * u, -11 * u, 11 * u, 11 * u);
    };
    const ligada = this.textura(lado, lado, desenhar(false)), desligada = this.textura(lado, lado, desenhar(true));
    const fundo = this.add.image(0, 0, estaMudo() ? desligada : ligada);
    const t = this.add.text(0, 1 * u, '♪', letra(24 * u)).setOrigin(0.5);
    const c = this.add.container(x, y, [fundo, t]).setSize(52 * u, 52 * u).setInteractive({ useHandCursor: true });
    c.on('pointerover', () => { c.setScale(1.1); tocarSfx('suave'); }).on('pointerout', () => c.setScale(1))
      .on('pointerdown', () => { const mudo = alternarMudo(); fundo.setTexture(mudo ? desligada : ligada); tocarSfx('clique'); });
  }

  private botaoConfiguracoes(x: number, y: number) {
    const u = this.u, lado = 58 * u;
    const imagem = this.add.image(0, 0, this.textura(lado, lado, (g) => {
      g.fillStyle(0x2563eb).fillCircle(0, 0, 23 * u).lineStyle(4 * u, 0xffffff).strokeCircle(0, 0, 23 * u).lineStyle(2 * u, CONTORNO).strokeCircle(0, 0, 26 * u);
      const dentes: Phaser.Geom.Point[] = [];
      for (let i = 0; i < 32; i++) {
        const angulo = -Math.PI / 2 + i * Math.PI / 16;
        const fase = i % 4;
        const raio = (fase === 1 || fase === 2 ? 20 : 15) * u;
        dentes.push(new Phaser.Geom.Point(Math.cos(angulo) * raio, Math.sin(angulo) * raio));
      }
      g.fillStyle(0xffffff).fillPoints(dentes, true).lineStyle(1.5 * u, CONTORNO).strokePoints(dentes, true);
      g.fillStyle(0x2563eb).fillCircle(0, 0, 7 * u).lineStyle(2 * u, CONTORNO).strokeCircle(0, 0, 7 * u);
    }));
    const c = this.add.container(x, y, [imagem]).setSize(52 * u, 52 * u).setInteractive({ useHandCursor: true });
    c.on('pointerover', () => { c.setScale(1.1); tocarSfx('suave'); }).on('pointerout', () => c.setScale(1)).on('pointerdown', () => { tocarSfx('clique'); this.configurarAudio(); });
  }

  private configurarAudio(idiomaMudou = false) {
    const u = this.u;
    this.janela('SETTINGS', 520, 470, (tela, fechar) => {
      const linhas: [string, () => number, (v: number) => void][] = [['Music', volumeMusica, definirVolumeMusica], ['Sound effects', volumeEfeitos, definirVolumeEfeitos]];
      linhas.forEach(([nome, ler, definir], i) => {
        const y = tela.y + tela.h * (i + 0.5) / 5;                 // five evenly spaced rows
        this.add.text(tela.x + 20 * u, y, nome, letra(18 * u, '#ffffff', { fontStyle: 'bold' })).setOrigin(0, 0.5);
        const valor = this.add.text(tela.x + tela.w - 132 * u, y, '', letra(16 * u, '#fde047', { fontStyle: 'bold' })).setOrigin(0.5);
        const atualizar = () => valor.setText(`${Math.round(ler() * 100)}%`);
        this.botao(tela.x + tela.w - 215 * u, y, 42 * u, 38 * u, '−', COR_BOTAO_TELA, 20 * u, () => { definir(ler() - 0.1); atualizar(); });
        this.botao(tela.x + tela.w - 48 * u, y, 42 * u, 38 * u, '+', COR_BOTAO_TELA, 20 * u, () => { definir(ler() + 0.1); atualizar(); });
        atualizar();
      });
      // Language: the window reopens so its own layout follows the new texts.
      const yI = tela.y + tela.h * 2.5 / 5;
      this.add.text(tela.x + 20 * u, idiomaMudou ? yI - 10 * u : yI, 'Language', letra(18 * u, '#ffffff', { fontStyle: 'bold' })).setOrigin(0, 0.5);
      this.botao(tela.x + tela.w - 100 * u, yI, 160 * u, 40 * u, idioma === 'pt' ? 'Português' : 'English', COR_BOTAO_TELA, 18 * u, () => {
        escolherIdioma(idioma === 'pt' ? 'en' : 'pt'); fechar(); this.events.emit('idioma');
      });
      // Like the video quality note: texts built from other values (dates) switch on their next update.
      if (idiomaMudou) this.add.text(tela.x + 20 * u, yI + 13 * u, 'Some texts update tomorrow.', letra(12 * u, '#bfdbfe', { fontStyle: '500' })).setOrigin(0, 0.5);
      // Astronaut suit: one swatch per skin (sheets in public/lua/astronaut_<id>.png).
      const yS = tela.y + tela.h * 3.5 / 5;
      this.add.text(tela.x + 20 * u, yS, 'Astronaut suit', letra(18 * u, '#ffffff', { fontStyle: 'bold' })).setOrigin(0, 0.5);
      const nome = this.add.text(tela.x + tela.w - 20 * u, yS, '', letra(16 * u, '#fde047', { fontStyle: 'bold' })).setOrigin(1, 0.5);
      const hex = (c: string) => Number.parseInt(c.slice(1), 16);
      const lado = 42 * u, raio = 9 * u;
      const aneis: Phaser.GameObjects.Graphics[] = [];
      const atualizarSkin = () => {
        aneis.forEach((a, i) => a.setAlpha(SKINS[i].id === video.skin ? 1 : 0));
        nome.setText(SKINS.find((s) => s.id === video.skin)?.nome ?? '');
      };
      SKINS.forEach((s, i) => {
        const m = 20 * u + lado / 2 + 4 * u;                        // same margin both sides, ring included
        const x = tela.x + m + (tela.w - 2 * m) * i / (SKINS.length - 1), y = tela.y + tela.h * 4.5 / 5;
        // Selection ring, then the plain rounded square in the skin's color.
        aneis.push(this.add.graphics().lineStyle(4 * u, 0xfde047)
          .strokeRoundedRect(x - lado / 2 - 5 * u, y - lado / 2 - 5 * u, lado + 10 * u, lado + 10 * u, raio + 4 * u));
        this.add.graphics().fillStyle(hex(s.cor)).fillRoundedRect(x - lado / 2, y - lado / 2, lado, lado, raio)
          .lineStyle(3 * u, CONTORNO).strokeRoundedRect(x - lado / 2, y - lado / 2, lado, lado, raio)
          .setInteractive(new Phaser.Geom.Rectangle(x - lado / 2, y - lado / 2, lado, lado), Phaser.Geom.Rectangle.Contains)
          .on('pointerover', () => tocarSfx('suave'))
          .on('pointerdown', () => { tocarSfx('clique'); escolherSkin(s.id); atualizarSkin(); });
      });
      atualizarSkin();
    }, 'DONE');
  }

  // ---------- windows in the task frame ----------
  // Opens a framed window; everything added until it closes belongs to it.
  // The content may return a cleanup for timers and input it added.
  // A new game resets the mission, then flies to the Moon like the very first launch (countdown, launch film,
  // landing on the pad), and only then opens the first morning.
  private confirmarNovoJogo(zerar: () => void, comecar: () => void) {
    this.janela('NEW GAME', 600, 340, (tela, fechar) => {
      const u = this.u, cx = tela.x + tela.w / 2;
      this.add.text(cx, tela.y + tela.h * 0.25, 'Start a new mission?\nYour current mission will be reset.',
        letra(18 * u, '#ffffff', { align: 'center', wordWrap: { width: tela.w - 24 * u } })).setOrigin(0.5);
      botaoVerde(this, cx, tela.y + tela.h * 0.77, 'START NEW GAME', 19 * u, 44 * u, u, () => {
        fechar(); this.travado = true; this.scene.stop(); zerar(); tocarSfx('ligar');
      }).setData('acao', 'confirm-new-game');
    }, 'CANCEL');
  }

  private janela(titulo: string, largura: number, altura: number, conteudo: (tela: { x: number; y: number; w: number; h: number }, fechar: () => void) => void | (() => void), rodapeOk = 'GOT IT!  ▶') {
    const u = this.u;
    const W = this.scale.width, H = this.scale.height;
    const antes = this.children.list.length;
    this.janelaAberta = true;
    let limpar: void | (() => void);
    const fechar = () => { this.janelaAberta = false; limpar?.(); for (const o of this.children.list.slice(antes)) o.destroy(); };
    this.add.rectangle(0, 0, W, H, 0x020617, 0.6).setOrigin(0).setInteractive();
    largura = Math.min(W - 40 * u, largura * u); altura = Math.min(H - 40 * u, altura * u);
    const x0 = (W - largura) / 2, y0 = (H - altura) / 2 - 8 * u;
    const { tela, rodape, borda } = moldura(this, { x: x0, y: y0, w: largura, h: altura }, u, titulo);
    limpar = conteudo(tela, fechar);
    // A resize restarts the scene with the window open: clean up then too.
    this.events.once('shutdown', () => limpar?.());
    borda();
    botaoVerde(this, x0 + largura / 2, rodape.y + rodape.h / 2, rodapeOk, 20 * u, Math.min(rodape.h, 50 * u), u, () => { tocarSfx('clique'); fechar(); }).setData('acao', 'close-window');
    botaoFechar(this, x0 + 4 * u, y0 + 4 * u, u, () => { tocarSfx('fechar'); fechar(); });
  }

  private comoJogar() {
    const u = this.u;
    const passos: [(x: number, y: number) => void, string][] = [
      [(x, y) => this.imagem(x, y, 34 * u, 22 * u, (g) => g
        .fillStyle(0x22c55e).fillRoundedRect(-13 * u, -8 * u, 24 * u, 16 * u, 3 * u).lineStyle(3 * u, 0xffffff).strokeRoundedRect(-13 * u, -8 * u, 24 * u, 16 * u, 3 * u)
        .fillStyle(0xffffff).fillRect(11 * u, -4 * u, 4 * u, 8 * u).fillStyle(0xbbf7d0).fillRect(-9 * u, -4 * u, 5 * u, 8 * u).fillRect(-2 * u, -4 * u, 5 * u, 8 * u)),
      'Get batteries at the Battery Bank every morning.'],
      [(x, y) => [0x3b82f6, 0xeab308, 0xf97316].forEach((c, k) => this.add.circle(x + (k - 1) * 11 * u, y + (k === 1 ? -5 : 4) * u, 7 * u, c).setStrokeStyle(2.5 * u, CONTORNO)),
        'Give them to the rooms: air, shield or rocket. Choose well!'],
      [(x, y) => { criarIconeJogo(this, x, y, 'warning', 34 * u); },
        'Something broke? Follow the orange arrow and fix it!'],
      [(x, y) => this.foguete(u * 1.2).setPosition(x, y).setAngle(-40), 'Survive a REAL solar storm and fly to Mars!'],
    ];
    this.janela('HOW TO PLAY', 660, 480, (tela) => {
      const n = passos.length;
      const alt = Math.min(62 * u, (tela.h - 48 * u - (n - 1) * 12 * u) / n);
      const yTopo = tela.y + (tela.h - (n * alt + (n - 1) * 12 * u)) / 2;
      passos.forEach(([icone, texto], i) => {
        const y = yTopo + i * (alt + 12 * u), x = tela.x + 22 * u, w = tela.w - 44 * u;
        pilulaEscura(this.add.graphics(), x, y, w, alt, u);
        this.add.circle(x + alt / 2 + 4 * u, y + alt / 2, alt / 2 - 6 * u, 0xffffff, 0.12);
        icone(x + alt / 2 + 4 * u, y + alt / 2);
        this.add.text(x + alt + 16 * u, y + alt / 2, texto, letra(16 * u, '#ffffff', { fontStyle: '500', wordWrap: { width: w - alt - 32 * u } })).setOrigin(0, 0.5);
      });
    });
  }

  // Pick a base to walk around freely, no mission. A base opens once a mission reaches it.
  private escolherBase(explorarBase: (mundo: Mundo) => void) {
    const u = this.u, liberadas = basesLiberadas();
    const bases: [string, Mundo, boolean][] = ([['MOON BASE', 'lua'], ['SPACESHIP', 'nave'], ['MARS BASE', 'marte']] as const).map(([n, m]) => [n, m, liberadas.includes(m)]);
    this.janela('EXPLORE A BASE', 660, 480, (tela, fechar) => {
      const gap = 18 * u, w = (tela.w - 44 * u - 2 * gap) / 3, h = tela.h - 44 * u;
      bases.forEach(([nome, qual, aberta], i) => {
        const x = tela.x + 22 * u + i * (w + gap), y = tela.y + 22 * u, cx = x + w / 2;
        pilulaEscura(this.add.graphics(), x, y, w, h, u);
        const s = u * 1.4;
        const icone = this.imagem(cx, y + h * 0.34, 90 * s, 90 * s, (g) => this.planeta(g, s, qual));
        if (qual === 'nave') icone.setAngle(-30);
        this.add.text(cx, y + h * 0.62, nome, letra(17 * u)).setOrigin(0.5);
        if (aberta) {
          botaoVerde(this, cx, y + h * 0.82, 'GO!  ▶', 18 * u, 44 * u, u, () => { tocarSfx('ligar'); fechar(); explorarBase(qual); });
        } else {
          this.add.text(cx, y + h * 0.82, 'LOCKED\nreach it in the mission', letra(14 * u, '#fde047', { align: 'center' })).setOrigin(0.5);
          icone.setAlpha(0.45);
        }
      });
    }, 'BACK');
  }

  private creditos() {
    const u = this.u;
    // Rolling credits, the classic way: one centered column moving up. Each section has a centered
    // heading, then role | name pairs on both sides of the center line. Ends with a thank you.
    this.janela('CREDITS', 660, 480, (tela) => {
      const cx = tela.x + tela.w / 2, gutter = 12 * u;
      const lista = this.add.container(0, 0);
      let y = 0;
      const pos = (o: Phaser.GameObjects.Text, dy: number) => { lista.add(o); y += o.height + dy; };

      pos(this.add.text(cx, y, 'LUNAR ODYSSEY', letra(44 * u, '#fde047', { stroke: '#1e293b', strokeThickness: 9 * u })).setOrigin(0.5, 0), 2 * u);
      pos(this.add.text(cx, y, 'Junior Astronaut Mission Trainer', letra(16 * u, '#ffffff', { stroke: '#1e293b', strokeThickness: 4 * u })).setOrigin(0.5, 0), 40 * u);
      for (const [secao, linhas] of CREDITOS) {
        pos(this.add.text(cx, y, `—  ${secao}  —`, letra(19 * u, '#fde047', { stroke: '#1e293b', strokeThickness: 5 * u })).setOrigin(0.5, 0), 12 * u);
        for (const [papel, nome] of linhas) {
          const estilo = letra((papel ? 15 : 18) * u, '#ffffff', { stroke: '#1e293b', strokeThickness: 4 * u });
          if (!papel) { pos(this.add.text(cx, y, nome, estilo).setOrigin(0.5, 0), 6 * u); continue; }
          lista.add(this.add.text(cx - gutter, y, papel, letra(15 * u, '#bfdbfe', { fontStyle: '500', stroke: '#1e293b', strokeThickness: 4 * u })).setOrigin(1, 0));
          pos(this.add.text(cx + gutter, y, nome, estilo).setOrigin(0, 0), 6 * u);
        }
        y += 34 * u;
      }
      y += 20 * u;
      const fim = this.add.image(cx, y + 20 * u, this.textura(60 * u, 40 * u, (g) => this.desenharFoguete(g, 1.6 * u))).setAngle(-30);
      lista.add(fim);
      y += 50 * u;
      const obrigado = this.add.text(cx, y, 'THANK YOU FOR PLAYING!', letra(30 * u, '#fde047', { stroke: '#1e293b', strokeThickness: 7 * u })).setOrigin(0.5, 0);
      const centroObrigado = y + obrigado.height / 2;
      pos(obrigado, 0);

      // Only the screen shows the list; its top and bottom edges fade out.
      const forma = this.make.graphics({}, false).fillRect(tela.x + 3 * u, tela.y + 3 * u, tela.w - 6 * u, tela.h - 6 * u);
      lista.setMask(forma.createGeometryMask());
      const faixa = 46 * u;
      const degrade = (cor: number, deCima: boolean) => this.textura(tela.w - 6 * u, faixa, (g) => {
        for (let k = 0; k < 23; k++) g.fillStyle(cor, (1 - k / 23) ** 1.5).fillRect(0, deCima ? k * faixa / 23 : faixa - (k + 1) * faixa / 23, tela.w - 6 * u, faixa / 23 + 1);
      }, { x: 0, y: 0 });
      this.add.image(tela.x + 3 * u, tela.y + 3 * u, degrade(0x2057cf, true)).setOrigin(0);
      this.add.image(tela.x + 3 * u, tela.y + tela.h - 3 * u - faixa, degrade(0x2563eb, false)).setOrigin(0);

      // Rolls by itself and stops with the thank you in the middle of the screen. The wheel or a
      // drag move a target; the list glides to it, so scrolling is smooth. Auto-roll waits a moment
      // after the child scrolls by hand.
      const inicio = tela.y + tela.h * 0.35, parada = tela.y + tela.h / 2 - centroObrigado;
      let alvo = inicio, mexeu = -1e9;
      lista.y = inicio;
      const mirar = (dy: number) => { alvo = Phaser.Math.Clamp(alvo + dy, parada, inicio); mexeu = this.time.now; };
      // Once per rendered frame, with that frame's real time (a 16 ms timer drifts against 60 Hz
      // and moves twice in some frames, none in others: that was the stutter).
      const rolar = (_t: number, dtMs: number) => {
        const dt = Math.min(0.05, dtMs / 1000);
        if (this.time.now - mexeu > 1500) alvo = Math.max(parada, alvo - 38 * u * dt);
        lista.y += (alvo - lista.y) * (1 - Math.exp(-dt * 10));
      };
      this.events.on('update', rolar);
      const roda = (_p: unknown, _o: unknown, _dx: number, dy: number) => mirar(-Phaser.Math.Clamp(dy, -120, 120) * 0.9);
      const arrasto = (p: Phaser.Input.Pointer) => { if (p.isDown) { mirar(p.y - p.prevPosition.y); lista.y = alvo; } };
      this.input.on('wheel', roda);
      this.input.on('pointermove', arrasto);
      return () => { this.events.off('update', rolar); this.input.off('wheel', roda); this.input.off('pointermove', arrasto); forma.destroy(); };
    }, 'CLOSE');
  }

  // 3, 2, 1, LIFT OFF! then the mission starts.
  private contagem(fim: () => void) {
    const u = this.u;
    const W = this.scale.width, H = this.scale.height;
    const reduzido = movimentoReduzido();
    const passos = ['3', '2', '1', 'LIFT OFF!'];
    // Reduced motion skips the numbers, but not the arrival itself: Chegada.ts shows a short,
    // static version of it instead of the full flight.
    if (!reduzido) {
      this.add.rectangle(0, 0, W, H, 0x020617, 0.55).setOrigin(0).setDepth(10);
      passos.forEach((s, i) => {
        this.time.delayedCall(i * 650, () => {
          tocarSfx(i < 3 ? 'bip' : 'whoosh');
          const t = this.add.text(W / 2, H / 2, s, letra((i < 3 ? 140 : 80) * u, i < 3 ? '#ffffff' : '#fde047', { stroke: '#1e293b', strokeThickness: 14 * u }))
            .setOrigin(0.5).setDepth(11).setScale(0.2);
          this.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.easeOut' });
          this.tweens.add({ targets: t, alpha: 0, duration: 250, delay: 420, onComplete: () => t.destroy() });
        });
      });
    }
    // After LIFT OFF the rocket flies to the Moon (Chegada.ts), lands on the pad in the game view
    // and goes up in smoke (Superficie.ts), then the first morning opens.
    const pousar = this.scene.isActive('Superficie');
    this.time.delayedCall(reduzido ? 250 : passos.length * 650 + 150, () => {
      const dados: DadosChegada = { aoTerminar: pousar ? () => sessao.emitir('pousoFoguete', fim) : fim };
      this.scene.launch('Chegada', dados);
      this.scene.bringToTop('Chegada');
      this.scene.stop();
    });
  }
}
