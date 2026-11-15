// Generated with AI assistance. See README, "Use of AI tools".
// One body of the solar system up close, full screen: click the Sun, a planet or the Moon in the
// solar system view (Espaco). The body flies in from where it was on the map and turns on its axis
// (drawn live on the GPU from its surface map baked in Blender, astroShader.ts) over the real sky, beside its
// facts (NASA planetary fact sheets) and its size next to Earth's. The arrows go to the next body;
// Esc, the Close button or a click on the sky closes it, flying the body back to the map.
import Phaser from 'phaser';
import planetas3d from '../dados/planetas3d.json';
import { fonte, sessao } from './sessao';
import { movimentoReduzido } from '../video';
import { criarAstro, ESCALA_ASTRO, ESCALA_ANEIS } from './astroShader';
import { ROTACAO_DIAS, voltasEm } from '../engine/astro';

export type DadosAstro = { nome: string; x?: number; y?: number; r?: number };

type Ficha = { titulo: string; tipo: string; cor: number; raioKm: number; dados: [string, string][]; fato: string };
// NASA planetary fact sheets (nssdc.gsfc.nasa.gov/planetary/factsheet) and NASA Science.
const FICHAS: Record<string, Ficha> = {
  sol: { titulo: 'The Sun', tipo: 'Our star', cor: 0xfdba74, raioKm: 696000,
    fato: "Its light takes 8 minutes and 20 seconds to reach Earth. The dark spots are sunspots: slightly cooler areas where the Sun's magnetic field pokes out.",
    dados: [['Radius', '696,000 km'], ['Turns once in', '25 days (equator)'], ['Surface', 'about 5,500 °C'], ['Gravity', '274 m/s²'], ['Age', '4.5 billion years'], ['Made of', 'hydrogen and helium']] },
  mercurio: { titulo: 'Mercury', tipo: 'The smallest planet, closest to the Sun', cor: 0xcbd5e1, raioKm: 2440,
    fato: 'It turns so slowly that one day, sunrise to sunrise, lasts 176 Earth days: two of its years.',
    dados: [['Radius', '2,440 km'], ['Day', '176 Earth days'], ['Year', '88 Earth days'], ['From the Sun', '58 million km'], ['Gravity', '3.7 m/s²'], ['Temperature', '-180 to 430 °C']] },
  venus: { titulo: 'Venus', tipo: 'The hottest planet', cor: 0xfde68a, raioKm: 6052,
    fato: 'It spins backward, and so slowly that one spin takes longer than its year. Its thick air traps the heat, and its clouds are made of sulfuric acid.',
    dados: [['Radius', '6,052 km'], ['Day', '243 Earth days, backward'], ['Year', '225 Earth days'], ['From the Sun', '108 million km'], ['Gravity', '8.9 m/s²'], ['Temperature', 'about 465 °C']] },
  terra: { titulo: 'Earth', tipo: 'Our home', cor: 0x93c5fd, raioKm: 6371,
    fato: "Its magnetic field and thick air shield us from much of the Sun's harmful radiation. On the Moon and on the way to Mars there is no such shield.",
    dados: [['Radius', '6,371 km'], ['Day', '24 hours'], ['Year', '365.25 days'], ['From the Sun', '150 million km'], ['Gravity', '9.8 m/s²'], ['Temperature', 'about 15 °C average']] },
  lua: { titulo: 'The Moon', tipo: "Earth's only natural satellite", cor: 0xe2e8f0, raioKm: 1737,
    fato: 'It turns once for every trip around Earth, so it always shows us the same face. Your base is at its south pole.',
    dados: [['Radius', '1,737 km'], ['Day', '29.5 Earth days'], ['From Earth', '384,400 km'], ['Gravity', '1.62 m/s²'], ['Air', 'almost none'], ['Temperature', '-173 to 127 °C']] },
  marte: { titulo: 'Mars', tipo: 'The red planet, your next stop', cor: 0xfdba74, raioKm: 3390,
    fato: 'Its red comes from rust: iron oxide in its dust. It has the largest volcano in the solar system, Olympus Mons, more than 20 km high.',
    dados: [['Radius', '3,390 km'], ['Day', '24 h 39 min (a sol)'], ['Year', '687 Earth days'], ['From the Sun', '228 million km'], ['Gravity', '3.7 m/s²'], ['Moons', 'Phobos and Deimos']] },
  jupiter: { titulo: 'Jupiter', tipo: 'The biggest planet, a ball of gas', cor: 0xfcd9a8, raioKm: 69911,
    fato: 'The Great Red Spot is a storm wider than Earth that has been blowing for hundreds of years. Jupiter has no ground to stand on.',
    dados: [['Radius', '69,911 km'], ['Day', '9 h 55 min'], ['Year', '11.9 Earth years'], ['From the Sun', '778 million km'], ['Gravity', '24.8 m/s²'], ['Moons', '95 known']] },
  saturno: { titulo: 'Saturn', tipo: 'The ringed planet', cor: 0xfde68a, raioKm: 58232,
    fato: 'Its rings are billions of chunks of ice and rock, from grains of dust to the size of a house, but in most places they are only about 10 m thick.',
    dados: [['Radius', '58,232 km'], ['Day', '10 h 39 min'], ['Year', '29.4 Earth years'], ['From the Sun', '1.43 billion km'], ['Gravity', '10.4 m/s²'], ['Moons', '274 known']] },
  urano: { titulo: 'Uranus', tipo: 'The planet that rolls on its side', cor: 0xa5f3fc, raioKm: 25362,
    fato: 'Its axis is tipped over by 98 degrees, so for many years the Sun shines over one pole while the other half has a dark winter 21 years long.',
    dados: [['Radius', '25,362 km'], ['Day', '17 h 14 min, backward'], ['Year', '84 Earth years'], ['From the Sun', '2.87 billion km'], ['Gravity', '8.7 m/s²'], ['Temperature', 'about -197 °C']] },
  netuno: { titulo: 'Neptune', tipo: 'The windiest planet, the farthest from the Sun', cor: 0x93c5fd, raioKm: 24622,
    fato: 'Its winds blow at about 2,000 km/h, the fastest in the solar system. It was found in 1846 with math, before anyone saw it.',
    dados: [['Radius', '24,622 km'], ['Day', '16 h 7 min'], ['Year', '165 Earth years'], ['From the Sun', '4.5 billion km'], ['Gravity', '11.2 m/s²'], ['Moons', '16 known']] },
};
// The bodies that have a map (make_planetas_3d.py), from the Sun out.
const ORDEM = ['sol', 'mercurio', 'venus', 'terra', 'lua', 'marte', 'jupiter', 'saturno', 'urano', 'netuno']
  .filter((n) => n in (planetas3d as Record<string, unknown>));
const css = (c: number) => '#' + c.toString(16).padStart(6, '0');
type Grande = { mapa: string; inclinacao: number; sentido: number; atmos: number[] | null; atmosForca: number; sol: boolean; aneis?: boolean };
// How fast time runs here: the body turns at its real (NASA) pace on this clock. T or the chip
// below the body change it.
const ESCALAS: [number, string][] = [[1, '1 hour'], [3, '3 hours'], [6, '6 hours']];   // gentle: fast spins feel like motion sickness
// One turn on its axis, written out (sidereal: relative to the stars).
const umaVolta = (dias: number) => {
  const h = Math.abs(dias) * 24;
  return h < 48 ? `${Math.floor(h)} h ${Math.round((h % 1) * 60)} min` : `${Math.abs(dias).toFixed(1)} Earth days`;
};
const grande = (nome: string) => (planetas3d as unknown as Record<string, { grande: Grande }>)[nome].grande;

export class Astro extends Phaser.Scene {
  private dados: DadosAstro = { nome: 'terra' };
  private antesEmTarefa = false;
  private emTarefaGuardado = false;
  private corpo?: ReturnType<typeof criarAstro>;
  private raio = 1;                                       // the body's radius on screen, full size
  private static escala = 0;                              // ESCALAS index, kept from body to body
  private horas = 0;                                      // hours run on this view's clock
  private voltas0 = 0;                                    // where the turn starts: the real one, now
  private saindo = false;

  constructor() {
    super({ key: 'Astro' });
  }

  init(d: DadosAstro) {
    this.dados = d;
    this.saindo = false;
    this.corpo = undefined;
    this.horas = 0; this.voltas0 = voltasEm(d.nome, Date.now());
    if (!this.emTarefaGuardado) { this.antesEmTarefa = sessao.emTarefa; this.emTarefaGuardado = true; }
    sessao.emTarefa = true;                                // the map and the zoom wait
  }

  preload() {
    const chave = `mapa_${this.dados.nome}`;
    if (!this.textures.exists(chave)) this.load.image(chave, grande(this.dados.nome).mapa);
  }

  create() {
    const W = this.scale.width, H = this.scale.height, M = Math.min(W, H);
    const nome = this.dados.nome, info = grande(nome), ficha = FICHAS[nome];
    const voo = this.dados.x !== undefined && !movimentoReduzido();
    const t0 = voo ? 550 : 0;

    // The sky, a shade that keeps the text readable; a click on the sky closes.
    const ceu = this.add.image(W / 2, H / 2, 'ceu_sistema');
    ceu.setScale(Math.max(W / ceu.width, H / ceu.height));
    const veu = this.add.graphics();
    veu.fillStyle(0x020617, 0.35).fillRect(0, 0, W, H);
    const lado = W > H * 1.15;                             // facts beside the body on wide screens, under it otherwise
    if (lado) veu.fillGradientStyle(0x020617, 0x020617, 0x020617, 0x020617, 0, 0.75, 0, 0.75).fillRect(W * 0.45, 0, W * 0.55, H);
    else veu.fillGradientStyle(0x020617, 0x020617, 0x020617, 0x020617, 0, 0, 0.75, 0.75).fillRect(0, H * 0.4, W, H * 0.6);
    const fundo = this.add.container(0, 0, [ceu, veu]).setAlpha(0);
    this.tweens.add({ targets: fundo, alpha: 1, duration: 350 });
    ceu.setInteractive().on('pointerdown', () => this.fechar());

    const cx = lado ? W * 0.3 : W / 2, cy = lado ? H * 0.52 : H * 0.25;
    // Saturn's rings reach 2.3 times its radius: the ball is drawn smaller so they fit.
    const raio = (lado ? Math.min(W * 0.22, H * 0.36) : Math.min(W * 0.36, H * 0.17)) * (grande(this.dados.nome).aneis ? 0.5 : 1);
    if (nome === 'sol' && this.textures.exists('brilho_sol')) {
      // Same soft radial glow as the solar system view (texture made by Espaco), breathing.
      const brilho = this.add.image(cx, cy, 'brilho_sol').setBlendMode(Phaser.BlendModes.ADD).setScale((raio * 3) / 128).setAlpha(0);
      this.tweens.add({ targets: brilho, alpha: 0.85, duration: 400, delay: t0 * 0.6 });
      if (!movimentoReduzido()) this.tweens.add({ targets: brilho, scale: (raio * 3.3) / 128, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // The body, live on the GPU, turning continuously like the Moon (astroShader.ts).
    const corpo = criarAstro(this, cx, cy, Math.ceil(raio * 2 * (info.aneis ? ESCALA_ANEIS : ESCALA_ASTRO)), { textura: `mapa_${nome}`, ...info, aneis: !!info.aneis, nuvens: nome === 'terra' });
    this.corpo = corpo; this.raio = raio;
    this.update(this.time.now);
    if (voo) {
      // Fly in from the map: start where, and as big as, it was there.
      corpo.setPosition(this.dados.x!, this.dados.y!).setScale((this.dados.r ?? 10) / raio);
      this.tweens.add({ targets: corpo, x: cx, y: cy, scale: 1, duration: t0, ease: 'Cubic.easeInOut' });
    }

    // ---------- the facts panel ----------
    const s = Phaser.Math.Clamp(M / 720, 0.72, 1.4);
    const px = lado ? W * 0.55 : W * 0.06, larg = lado ? Math.min(W * 0.4, 560 * s) : W * 0.88;
    const painel = this.add.container(0, 0);
    let y = 0;
    const texto = (str: string, tam: number, cor: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}, x = 0, w = larg) => {
      const t = this.add.text(x, y, str, fonte(tam, cor, { wordWrap: { width: w }, ...extra }));
      painel.add(t);
      return t;
    };
    const indice = ORDEM.indexOf(nome);
    y += texto(`${indice + 1} OF ${ORDEM.length}`, 12 * s, '#7dd3fc', { fontStyle: 'bold' }).height + 2;
    y += texto(ficha.titulo, 40 * s, css(ficha.cor), { fontStyle: 'bold' }).height;
    y += texto(ficha.tipo, 16 * s, '#bfdbfe').height + 14 * s;

    // Stat cards, two per row.
    const gap = 10 * s, cw = (larg - gap) / 2;
    const cartoes = this.add.graphics(); painel.add(cartoes);
    for (let i = 0; i < ficha.dados.length; i += 2) {
      const y0 = y;
      let alto = 0;
      for (let c = 0; c < 2 && i + c < ficha.dados.length; c++) {
        const [k, v] = ficha.dados[i + c], x = c * (cw + gap) + 12 * s;
        y = y0 + 9 * s;
        const tk = texto(k.toUpperCase(), 11 * s, '#94a3b8', { fontStyle: 'bold' }, x, cw - 24 * s);
        y += tk.height + 2;
        const tv = texto(v, 17 * s, '#f8fafc', { fontStyle: 'bold' }, x, cw - 24 * s);
        alto = Math.max(alto, tk.height + tv.height + 22 * s);
      }
      for (let c = 0; c < 2 && i + c < ficha.dados.length; c++) {
        cartoes.fillStyle(0x0f2a5f, 0.78).fillRoundedRect(c * (cw + gap), y0, cw, alto, 10 * s)
          .lineStyle(1, 0x3b82f6, 0.45).strokeRoundedRect(c * (cw + gap), y0, cw, alto, 10 * s);
      }
      y = y0 + alto + gap;
    }

    // Size next to Earth's, to scale. The Sun is too big: Earth is a dot beside a slice of its edge.
    y += 4 * s;
    const razao = ficha.raioKm / FICHAS.terra.raioKm;
    const comp = this.add.graphics(); painel.add(comp);
    const rMax = 22 * s, yc = y + rMax;
    if (nome === 'sol') {
      const R = rMax * 8, ox = rMax * 2.2 - R, a = Math.asin(rMax / R);
      const pts: Phaser.Types.Math.Vector2Like[] = [];
      for (let i = 0; i <= 16; i++) { const t = -a + (2 * a * i) / 16; pts.push({ x: ox + R * Math.cos(t), y: yc + R * Math.sin(t) }); }
      pts.push({ x: 0, y: yc + rMax }, { x: 0, y: yc - rMax });
      comp.fillStyle(ficha.cor, 1).fillPoints(pts, true);
    } else {
      comp.fillStyle(ficha.cor, 1).fillCircle(rMax, yc, razao >= 1 ? rMax : Math.max(2, rMax * razao));
    }
    const xTerra = rMax * 2 + 16 * s, rTerra = razao >= 1 ? Math.max(1.5, rMax / razao) : rMax;
    if (nome !== 'terra') comp.fillStyle(0x60a5fa, 1).fillCircle(xTerra + rTerra, yc, rTerra);
    const legenda = nome === 'terra' ? 'Earth is the yardstick for the others.'
      : razao >= 1 ? `${razao.toFixed(razao > 10 ? 0 : 1)} times as wide as Earth (the blue dot).`
      : `${Math.round(razao * 100)}% as wide as Earth (the blue disc).`;
    const xl = (nome === 'terra' ? rMax * 2 : xTerra + rTerra * 2) + 14 * s;
    const yAntes = y;
    y = yc - 9 * s;
    texto(legenda, 14 * s, '#cbd5e1', {}, xl, larg - xl);
    y = yAntes + rMax * 2 + 14 * s;

    // The fun fact.
    const yf = y;
    y += 12 * s;
    const tf = texto(ficha.fato, 15 * s, '#bbf7d0', {}, 16 * s, larg - 30 * s);
    const caixaFato = this.add.graphics();
    caixaFato.fillStyle(0x064e3b, 0.6).fillRoundedRect(0, yf, larg, tf.height + 24 * s, 10 * s)
      .fillStyle(0x34d399, 1).fillRect(0, yf + 8 * s, 4 * s, tf.height + 8 * s);
    painel.addAt(caixaFato, painel.getIndex(tf));
    y += tf.height + 22 * s;
    y += texto('Sources: NASA planetary fact sheets and NASA Science', 11 * s, '#64748b').height;

    // In place: centered on the body's height when beside it, under it otherwise.
    const py = lado ? Phaser.Math.Clamp(cy - y / 2, 70, Math.max(70, H - y - 70)) : Math.min(cy + raio + 20 * s, Math.max(70, H - y - 70));
    // A click on the panel does not close the view.
    this.add.zone(px, py, larg, y).setOrigin(0).setInteractive();
    this.children.bringToTop(painel);
    painel.setPosition(px + 30, py).setAlpha(0);
    this.tweens.add({ targets: painel, alpha: 1, x: px, duration: 420, delay: t0 * 0.5, ease: 'Cubic.easeOut' });

    // ---------- controls: previous / next body, close ----------
    const botao = (rotulo: string, x: number, yb: number, ox: number, oy: number, cor: string, acao: () => void) =>
      this.add.text(x, yb, rotulo, fonte(16 * s, '#ffffff', { fontStyle: 'bold', backgroundColor: cor, padding: { x: 14, y: 8 } }))
        .setOrigin(ox, oy).setInteractive({ useHandCursor: true }).on('pointerdown', acao);
    const anterior = ORDEM[(indice + ORDEM.length - 1) % ORDEM.length], seguinte = ORDEM[(indice + 1) % ORDEM.length];
    const yb = H - 22;
    botao(`‹  ${FICHAS[anterior].titulo}`, 20, yb, 0, 1, '#1e3a8a', () => this.ir(anterior));
    botao(`${FICHAS[seguinte].titulo}  ›`, W - 20, yb, 1, 1, '#1e3a8a', () => this.ir(seguinte));
    botao('Close  ✕', W - 20, 22, 1, 0, '#2563eb', () => this.fechar());
    if (W > 640) this.add.text(W / 2, yb - 10, 'Esc closes  ·  arrow keys: next body', fonte(12 * s, '#94a3b8')).setOrigin(0.5, 1);
    // The clock: one turn takes the real time; the chip says how fast time runs here.
    const dias = ROTACAO_DIAS[nome] ?? 1;
    // Above the body on wide screens; top left otherwise (the facts are under the body there).
    const relogio = this.add.text(lado ? cx : 20, lado ? Math.max(70, cy - raio * (info.aneis ? 1.25 : 1) - 14 * s) : 20, '', fonte(13 * s, '#e0f2fe', { align: 'center', backgroundColor: '#0f2a5fcc', padding: { x: 12, y: 7 } }))
      .setOrigin(lado ? 0.5 : 0, lado ? 1 : 0).setInteractive({ useHandCursor: true });
    const escrever = () => relogio.setText(movimentoReduzido()
      ? `One turn takes ${umaVolta(dias)}${dias < 0 ? ', backward' : ''}`
      : `One turn takes ${umaVolta(dias)}${dias < 0 ? ', backward' : ''}\nTime here: 1 second = ${ESCALAS[Astro.escala][1]}  ·  T: faster`);
    const trocar = () => { Astro.escala = (Astro.escala + 1) % ESCALAS.length; escrever(); };
    escrever();
    relogio.on('pointerdown', trocar);

    const teclado = this.input.keyboard;
    teclado?.on('keydown-ESC', () => this.fechar());
    teclado?.on('keydown-LEFT', () => this.ir(anterior));
    teclado?.on('keydown-RIGHT', () => this.ir(seguinte));
    teclado?.on('keydown-T', trocar);
    this.events.once('shutdown', () => teclado?.removeAllListeners());
    if (!voo) this.cameras.main.fadeIn(200, 2, 6, 23);
  }

  update(_time: number, dt = 0) {
    // The turn: continuous, at the body's real pace on this view's clock (Venus backward). Still
    // with reduced motion.
    if (!this.corpo) return;
    const nome = this.dados.nome;
    if (!movimentoReduzido()) this.horas += (dt / 1000) * ESCALAS[Astro.escala][0];
    const voltas = this.voltas0 + this.horas / 24 / Math.abs(ROTACAO_DIAS[nome] ?? 1);
    this.corpo.setGiro(grande(nome).sentido * 2 * Math.PI * (voltas % 1));
    this.corpo.setTempo(this.horas % 10000);   // Earth's clouds drift and change on the same clock
  }

  private ir(nome: string) {
    if (this.saindo) return;
    this.saindo = true;
    this.cameras.main.fadeOut(160, 2, 6, 23);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ nome }));
  }

  private fechar() {
    if (this.saindo) return;
    this.saindo = true;
    const fim = () => { sessao.emTarefa = this.antesEmTarefa; this.emTarefaGuardado = false; this.scene.stop(); };
    // Fly back to where the body is on the map now (it may be another body than the one clicked).
    const naMapa = (this.scene.get('Espaco') as unknown as { corpos?: Map<string, Phaser.GameObjects.Sprite> }).corpos?.get(this.dados.nome);
    if (!naMapa?.visible || movimentoReduzido() || !this.corpo) { fim(); return; }
    const e0 = ((naMapa.displayWidth / 2) * 0.8) / this.raio;
    this.tweens.add({ targets: this.corpo, x: naMapa.x, y: naMapa.y, scale: e0, duration: 420, ease: 'Cubic.easeInOut' });
    for (const o of this.children.list) {
      if (o !== this.corpo) this.tweens.add({ targets: o, alpha: 0, duration: 380 });
    }
    this.time.delayedCall(430, fim);
  }
}
