// Generated with AI assistance (Claude). See README, "Use of AI tools".
// The ground: real NASA terrain (Blender render), the crew's base (already built), the commander,
// and the cargo landers that bring new equipment. Players run the base, they do not build it:
// walk (or click), pick up the day's batteries at the Habitat, click a room to deliver one.
// Owns the ground camera and its zoom (sessao.u). When the flight to the Moon starts, the camera
// glides to the framing of the flight's first frame and the terrain dissolves into it (Espaco
// plays the frames) while the base stays visible, live.
import Phaser from 'phaser';
import paletaLua from '../dados/paleta_lua.json';
const COR_SOLO_CLARO=Number.parseInt(String(paletaLua.solo[2][1]).slice(1),16);
const COR_SOLO_MEDIO=Number.parseInt(String(paletaLua.solo[1][1]).slice(1),16);
const COR_SOLO_SOMBRA=Number.parseInt(paletaLua.contorno.slice(1),16);
import { Ambiente } from './ambiente';
import { configuracoesAbertas, movimentoReduzido, video } from '../video';
import { paraTela, paraChao, profundidade } from '../engine/iso';
import { passo, novoCorpo, G, G_LUA, G_TERRA, pulo, type Corpo, type Caixa, type Entrada } from '../engine/fisica';
import { encontrarCaminho, type Ponto } from '../engine/caminho';
import { TIPOS, montarBasePadrao, SETORES_SUPRIMENTOS, type Construcao, type TipoId } from '../engine/construcao';
import { empuxoDePouso, suprimentoDoDia } from '../engine/suprimentos';
import { sessao, dadosTerreno, suave, sDeU, S_MAPA, fonte } from './sessao';
import { fundacao, sombraECarga } from './desenho';
import { VOO as voo } from './qualidade';
import { sortear } from '../tarefas';
import type { DadosTarefa } from './Tarefa';
import modelos from '../dados/modulos.json';
import bandeiras from '../dados/bandeiras.json';
import sprite from '../dados/astronauta.json';

const P = dadosTerreno.imagem;
const ALCANCE = 1.3;          // tiles from a module's edge to use it
const ESCALA_MARCADOR = 0.62; // Compact destination marker; keep the source emblem crisp.
const PROFUNDIDADE_MARCADOR = 900_000; // Above world objects, below room labels and the HUD.
const ALTURA_POUSO = 14;      // tiles at character scale (about 50 m): where the lander appears
type Modelo = keyof typeof modelos;

// A cargo lander bringing one piece of equipment (see engine/suprimentos.ts).
type Pouso = {
  tipo: TipoId; gx: number; gy: number;        // footprint corner of the equipment it brings
  z: number; vz: number; chao: number;         // lander height, speed (tiles, tiles/s), ground
  fase: 'descendo' | 'pousado' | 'subindo'; t: number; empuxo: number;
  img: Phaser.GameObjects.Image; chama: Phaser.GameObjects.Image; sombra: Phaser.GameObjects.Ellipse;
};

export class Superficie extends Phaser.Scene {
  private tempoEfeitos = 0;
  private ambiente!: Ambiente;
  private corpo!: Corpo;
  private gCaminhos!: Phaser.GameObjects.Graphics;
  private gAstronauta!: Phaser.GameObjects.Graphics;   // shadow + carried batteries
  private comandante!: Phaser.GameObjects.Sprite;
  private sombraBandeira!: Phaser.GameObjects.Graphics;
  private mascaraBandeira!: Phaser.GameObjects.Graphics;
  private bandeira!: Phaser.GameObjects.Image;         // flag marking the chosen destination
  private direcao = 1;                                  // sprite row: map angle / 45 deg
  private desenhos = new Map<number, { g: Phaser.GameObjects.Graphics; img: Phaser.GameObjects.Image; rotulo?: Phaser.GameObjects.Text }>();
  private rota: Ponto[] = [];                            // A* waypoints to walk through
  private alvoUsar: Construcao | null = null;             // module to use when we arrive
  private bloqueadoCont = 0;
  private teclas!: Record<string, Phaser.Input.Keyboard.Key>;
  private passada = 0;
  private sobre: Construcao | null = null;              // module under the cursor
  private seguir = true;             // camera follows the commander until the player pans
  private arrastando = false;
  private apertouNoMapa = false;
  private mapa!: Phaser.GameObjects.Layer;          // terrain + everything on it
  private terreno!: Phaser.GameObjects.Image;
  private inicioVoo: { x: number; y: number } | null = null;
  private pouso: Pouso | null = null;

  constructor() {
    super({ key: 'Superficie' });   // started by Carregar
  }

  // Map center in world px: the flight's first frame is centered on it.
  private get centroMapa() {
    const h = dadosTerreno.n / 2;
    return paraTela(P, h, h, sessao.terreno.altura(h, h));
  }

  create() {
    // Scene inspection is available in development or explicitly opted-in benchmark builds.
    if (import.meta.env.DEV || import.meta.env.VITE_MEDIR === '1') Object.assign(window, { superficie: this, sessao });
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this.desenhos.clear();
    this.pouso = null;
    this.tempoEfeitos = 0;
    this.mapa = this.add.layer().setDepth(0);
    this.terreno = this.add.image(0, 0, 'terreno').setOrigin(0).setDepth(-1e6);
    this.mapa.add(this.terreno);
    this.gCaminhos = this.add.graphics().setDepth(-900_000);
    this.mapa.add(this.gCaminhos);
    this.ambiente = new Ambiente(this,this.mapa,P,sessao.terreno);

    // The crew's base is already there (engine/construcao.ts, BASE_PADRAO).
    if (!sessao.grade.lista.length) montarBasePadrao(sessao.grade);
    const hab = sessao.grade.lista.find((c) => c.tipo.id === 'habitat')!;
    const sx = hab.gx + hab.tipo.w + 0.7, sy = hab.gy + hab.tipo.h / 2;
    this.corpo = novoCorpo(sx, sy, sessao.terreno.altura(sx, sy));
    this.corpo.noChao = true;

    this.gAstronauta = this.add.graphics();
    this.comandante = this.add.sprite(0, 0, 'astronauta', 0).setOrigin(sprite.pe[0] / sprite.frame, sprite.pe[1] / sprite.frame)
      .setScale(sprite.escala);
    const bInfo = bandeiras.lua;
    this.bandeira = this.add.image(0, 0, 'bandeira_lua')
      .setOrigin(bInfo.ancora[0] / bInfo.w, bInfo.ancora[1] / bInfo.h)
      .setScale(bInfo.escala * ESCALA_MARCADOR)
      .setVisible(false);
    this.sombraBandeira = this.add.graphics().setDepth(PROFUNDIDADE_MARCADOR-1).setVisible(false);
    this.mascaraBandeira = this.make.graphics({},false);
    this.bandeira.setMask(this.mascaraBandeira.createGeometryMask());
    this.events.once('shutdown',()=>{this.bandeira.clearMask(true);this.mascaraBandeira.destroy();});
    this.mapa.add([this.gAstronauta, this.comandante, this.sombraBandeira, this.bandeira]);
    for (const c of sessao.grade.lista) this.desenharModulo(c);
    this.desenharCaminhos();

    const pe = paraTela(P, this.corpo.x, this.corpo.y, this.corpo.z);
    this.cameras.main.centerOn(pe.x, pe.y);

    // ---- input: keys walk; drag pans; a tap walks there, or to a room and uses it ----
    const kb = this.input.keyboard!;
    this.teclas = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-E', () => this.usarPerto());
    this.arrastando = false;
    this.apertouNoMapa = false;
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      const q = paraChao(P, sessao.terreno, ptr.worldX, ptr.worldY);
      this.destacar(q ? sessao.grade.em(q.gx, q.gy) ?? null : null);
      if (!ptr.isDown || !this.apertouNoMapa || this.input.pointer2.isDown) return;
      if (!this.arrastando && Phaser.Math.Distance.Between(ptr.downX, ptr.downY, ptr.x, ptr.y) < 8) return;
      this.arrastando = true;
      this.seguir = false;
      const cam = this.cameras.main;
      cam.scrollX -= (ptr.x - ptr.prevPosition.x) / cam.zoom;
      cam.scrollY -= (ptr.y - ptr.prevPosition.y) / cam.zoom;
    });
    // A press on a panel button (Interface, Tarefa) never reaches this scene, but the panel closes on
    // that press, so the release does. Only a release whose press was on the map is a click.
    this.input.on('pointerdown', () => { this.arrastando = false; this.apertouNoMapa = true; });
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (this.apertouNoMapa && !this.arrastando && !this.input.pointer2.isDown && ptr.button === 0) this.clicar(ptr);
      this.arrastando = false;
      this.apertouNoMapa = false;
    });
    this.input.mouse?.disableContextMenu();

    sessao.ouvir(this, 'estado', () => { for (const c of sessao.grade.lista) this.desenharModulo(c); });
    sessao.ouvir(this, 'suprimento', (tipo) => this.chegar(tipo));
  }

  // ---------- zoom ----------
  private aplicarZoom() {
    const s = sDeU(sessao.u);
    const cam = this.cameras.main;

    // Ground: keep the point under the cursor / pinch still (Clash of Clans style).
    const a = sessao.ancora;
    const antes = a && !sessao.voo && sessao.vista === 'chao' ? cam.getWorldPoint(a.x, a.y) : null;
    cam.setZoom(s / S_MAPA);
    if (antes && a) {
      cam.preRender();
      const depois = cam.getWorldPoint(a.x, a.y);
      cam.scrollX += antes.x - depois.x; cam.scrollY += antes.y - depois.y;
      this.seguir = false;
    }

    // Flight: glide to the map center (the first frame's center). Then the terrain picture
    // dissolves into the flight frames, but the base (modules, commander, lander) stays, live,
    // shrinking with the frames while the camera only backs away (p < 0.3, same view angle);
    // past that the planet turns and Espaco marks the base with a light instead.
    const v = sessao.voo;
    const mc = this.centroMapa;
    this.terreno.setAlpha(1);
    if (v?.tipo === 'filme') {
      if (!this.inicioVoo) this.inicioVoo = { x: cam.midPoint.x, y: cam.midPoint.y };
      const k = v.fase === 'prep' && v.sentido > 0 ? suave(0, 1, v.t) : 1;
      cam.centerOn(Phaser.Math.Linear(this.inicioVoo.x, mc.x, k), Phaser.Math.Linear(this.inicioVoo.y, mc.y, k));
      const q = sessao.quadroFilme;
      if (q !== null) {
        cam.setZoom((sDeU(sessao.uFilme) * Math.pow(voo.razao, -q)) / S_MAPA);
        this.terreno.setAlpha(1 - suave(0, 0.03, q));
      }
      this.mapa.setAlpha(q === null ? 1 : 1 - suave(0.22, 0.32, q));
    } else {
      this.inicioVoo = null;
      this.mapa.setAlpha(sessao.vista === 'chao' ? 1 : 0);
    }
    if (sessao.vista !== 'chao' || sessao.voo) this.recolherBandeira();
    this.mapa.setVisible(this.mapa.alpha > 0.001);
    this.input.enabled = sessao.vista === 'chao' && !sessao.voo && !sessao.emTarefa && !configuracoesAbertas && !sessao.transicao;
  }

  // ---------- input ----------
  private clicar(ptr: Phaser.Input.Pointer) {
    const q = paraChao(P, sessao.terreno, ptr.worldX, ptr.worldY);
    if (!q) return;
    this.seguir = true;
    const c = sessao.grade.em(q.gx, q.gy);
    // If clicking a module we are already standing next to, use it immediately.
    if (c && this.perto(c)) {
      this.rota = [];
      this.alvoUsar = null;
      this.usar(c);
      return;
    }
    let destGx: number, destGy: number;
    if (c) {
      const ap = this.pontoDeAcesso(c);
      destGx = ap.gx; destGy = ap.gy;
      this.alvoUsar = c;
    } else {
      destGx = q.gx; destGy = q.gy;
      this.alvoUsar = null;
    }
    const caixas = sessao.grade.caixas();
    const caminho = encontrarCaminho(sessao.terreno, caixas, this.corpo.raio, this.corpo.x, this.corpo.y, destGx, destGy);
    this.rota = caminho ?? [];
    this.bloqueadoCont = 0;
    if (this.rota.length > 0) {
      this.plantarBandeira(destGx, destGy);
    } else {
      this.recolherBandeira();
    }
  }

  /** Plants the flag marking the chosen destination spot on the terrain. */
  private plantarBandeira(gx: number, gy: number, planeta = 'lua') {
    const bInfo = (bandeiras as Record<string, typeof bandeiras.lua>)[planeta] ?? bandeiras.lua;
    const z = sessao.terreno.altura(gx, gy);
    const pe = paraTela(P, gx, gy, z);
    this.bandeira.setTexture(`bandeira_${planeta}`);
    this.bandeira.setOrigin(bInfo.ancora[0] / bInfo.w, bInfo.ancora[1] / bInfo.h);
    this.bandeira.setPosition(pe.x, pe.y);
    this.bandeira.setDepth(PROFUNDIDADE_MARCADOR);
    this.bandeira.setVisible(true).setAlpha(1);

    this.encaixarBandeira(gx,gy,bInfo.w*bInfo.escala*ESCALA_MARCADOR,bInfo.h*bInfo.escala*ESCALA_MARCADOR);
    const cr = sessao.terreno.crateras.find(c=>Math.hypot(gx-c.x,gy-c.y)<c.raio*0.86);
    const t = cr ? Math.hypot(gx-cr.x,gy-cr.y)/cr.raio : 1;
    const descida = cr ? cr.profundidade*(1-(t/0.86)**2)**1.3*Math.abs(P.ez[1]) : 0;

    // Settle into the crater floor rather than appearing at rim height.
    this.tweens.killTweensOf(this.bandeira);
    const escala = bInfo.escala * ESCALA_MARCADOR;
    if(movimentoReduzido()) {this.bandeira.setScale(escala);return;}
    this.bandeira.setScale(escala * 0.8).setY(pe.y-descida);
    this.tweens.add({
      targets: this.bandeira,
      y: pe.y,
      scaleX: escala,
      scaleY: escala,
      duration: 250,
      ease: 'Sine.easeOut',
    });
  }

  private encaixarBandeira(gx: number,gy: number,width: number,height: number) {
    const t=sessao.terreno;
    const foot=paraTela(P,gx,gy,t.altura(gx,gy));
    // A terrain horizon for each sprite column. Foreground rim can hide the mast base,
    // while the marker's foreground depth still keeps it readable near buildings.
    const left=foot.x-12,right=foot.x+width+12,top=foot.y-height*2-24;
    const edge: {x:number;y:number}[]=[];
    const inside=t.crateras.find(c=>Math.hypot(gx-c.x,gy-c.y)<c.raio*1.25);
    for(let x=left;x<=right+2;x+=2) {
      const offset=(x-foot.x)/(P.ex[0]-P.ey[0]);
      let horizon=Infinity;
      const reach=inside?inside.raio*2.5:0.12;
      for(let d=0;d<=reach;d+=0.06) {
        const xx=gx+offset+d,yy=gy-offset+d;
        if(!t.dentro(xx,yy))continue;
        horizon=Math.min(horizon,paraTela(P,xx,yy,t.altura(xx,yy)-0.025).y);
      }
      edge.push({x,y:Number.isFinite(horizon)?horizon:foot.y+height});
    }
    this.mascaraBandeira.clear().fillStyle(0xffffff).fillPoints([{x:left,y:top},{x:right+2,y:top},...edge.reverse()],true);
    const shadow=[];
    for(let i=0;i<24;i++) {
      const a=i*Math.PI*2/24,x=gx+Math.cos(a)*0.15,y=gy+Math.sin(a)*0.11;
      shadow.push(paraTela(P,x,y,t.altura(x,y)+0.006));
    }
    this.sombraBandeira.clear().fillStyle(COR_SOLO_SOMBRA,0.35).fillPoints(shadow,true).setVisible(true);
  }

  /** Smoothly folds and hides the destination flag when arriving or changing path. */
  private recolherBandeira() {
    if (!this.bandeira || !this.bandeira.visible) return;
    this.tweens.killTweensOf(this.bandeira);
    this.tweens.add({
      targets: this.bandeira,
      alpha: 0,
      scaleY: 0,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => this.bandeira.setVisible(false),
    });
  }

  /** Picks the best approach point for a module: the nearest edge midpoint that is accessible. */
  private pontoDeAcesso(c: Construcao): { gx: number; gy: number } {
    const k = this.corpo;
    const caixas = sessao.grade.caixas();
    const mx = c.gx + c.tipo.w / 2, my = c.gy + c.tipo.h / 2;
    const margem = 0.7;
    // Four edge midpoints (N, S, E, W), sorted by distance to the commander.
    const candidatos = [
      { gx: mx, gy: c.gy - margem },                       // north
      { gx: mx, gy: c.gy + c.tipo.h + margem },            // south
      { gx: c.gx - margem, gy: my },                       // west
      { gx: c.gx + c.tipo.w + margem, gy: my },            // east
    ].sort((a, b) => Math.hypot(a.gx - k.x, a.gy - k.y) - Math.hypot(b.gx - k.x, b.gy - k.y));

    // Exclude module c itself when checking if the spot is blocked by another module
    const outrasCaixas = caixas.filter((b) =>
      Math.abs(b.x0 - (c.gx + 0.08)) > 0.05 || Math.abs(b.y0 - (c.gy + 0.08)) > 0.05
    );

    for (const p of candidatos) {
      if (p.gx >= 1 && p.gy >= 1 && p.gx < sessao.terreno.n - 1 && p.gy < sessao.terreno.n - 1) {
        if (sessao.terreno.inclinacaoEm(p.gx, p.gy) <= sessao.terreno.maxAndar) {
          const colide = outrasCaixas.some((b) => {
            const px = Math.max(b.x0, Math.min(p.gx, b.x1));
            const py = Math.max(b.y0, Math.min(p.gy, b.y1));
            return (p.gx - px) ** 2 + (p.gy - py) ** 2 < (k.raio + 0.08) ** 2;
          });
          if (!colide) return p;
        }
      }
    }
    return candidatos[0];
  }

  // Rooms you can use light up under the cursor, like buttons.
  private destacar(c: Construcao | null) {
    const usavel = c && (c.tipo.id === 'habitat' || c.tipo.sala) ? c : null;
    if (usavel === this.sobre) return;
    if (this.sobre) this.desenhos.get(this.sobre.id)?.img.clearTint();
    this.sobre = usavel;
    if (usavel) this.desenhos.get(usavel.id)?.img.setTint(0xfff3c4);
    this.input.setDefaultCursor(usavel ? 'pointer' : 'default');
  }

  private entrada(): Entrada {
    const t = this.teclas;
    // Screen directions to map axes: up-screen = -gx -gy, right-screen = +gx -gy.
    let sx = 0, sy = 0;
    if (t.W.isDown || t.UP.isDown) sy -= 1;
    if (t.S.isDown || t.DOWN.isDown) sy += 1;
    if (t.A.isDown || t.LEFT.isDown) sx -= 1;
    if (t.D.isDown || t.RIGHT.isDown) sx += 1;
    let dx = sx + sy, dy = sy - sx;
    if (sx || sy) { this.rota = []; this.alvoUsar = null; this.seguir = true; this.recolherBandeira(); }
    else if (this.rota.length) {
      // Follow the A* waypoint list: steer toward the first remaining waypoint, pop it
      // when close enough, and repeat until the route is done.
      const wp = this.rota[0];
      dx = wp.gx - this.corpo.x; dy = wp.gy - this.corpo.y;
      const d = Math.hypot(dx, dy);

      // Check if we should interact with the target module (close enough to any edge).
      if (this.alvoUsar && this.perto(this.alvoUsar)) {
        const u = this.alvoUsar;
        this.rota = []; this.alvoUsar = null; dx = dy = 0;
        this.recolherBandeira();
        this.usar(u);
      } else if (d < 0.35) {
        // Reached this waypoint, advance to the next.
        this.rota.shift();
        if (!this.rota.length) {
          dx = dy = 0;
          this.recolherBandeira();
          if (this.alvoUsar && this.perto(this.alvoUsar)) {
            const u = this.alvoUsar;
            this.alvoUsar = null;
            this.usar(u);
          } else {
            this.alvoUsar = null;
          }
        }
      }
    }
    return { dx, dy, pular: Phaser.Input.Keyboard.JustDown(t.SPACE) };
  }

  // ---------- batteries ----------
  private perto(c: Construcao) {
    const k = this.corpo;
    const px = Phaser.Math.Clamp(k.x, c.gx, c.gx + c.tipo.w), py = Phaser.Math.Clamp(k.y, c.gy, c.gy + c.tipo.h);
    return Math.hypot(k.x - px, k.y - py) <= ALCANCE;
  }

  private usarPerto() {
    const c = sessao.grade.lista.find((m) => this.perto(m) && (m.tipo.id === 'habitat' || m.tipo.sala));
    if (c) this.usar(c);
  }

  private usar(c: Construcao) {
    if (sessao.emTarefa) return;
    if (!c.tipo.sala && c.tipo.id !== 'habitat') {
      sessao.emitir('mensagem', `${c.tipo.nome}: ${c.tipo.papel}`);
      return;
    }
    if (sessao.fase !== 'dia') {
      sessao.emitir('mensagem', sessao.fase === 'inicio' ? 'Press "Start mission" to begin day 1.' : 'Wait for the morning report.');
      return;
    }
    if (c.tipo.id === 'habitat') {
      if (!sessao.noHabitat) { sessao.emitir('mensagem', 'No batteries left at the habitat today.'); return; }
      sessao.carregando += sessao.noHabitat;
      sessao.noHabitat = 0;
      sessao.emitir('mensagem', `You picked up ${sessao.carregando} batteries. Take them to the rooms.`, '#86efac');
    } else if (c.tipo.sala) {
      if (!sessao.carregando) { sessao.emitir('mensagem', 'Your hands are empty. Pick up batteries at the habitat.'); return; }
      // The first battery a room gets each day comes with a task from the bank (../tarefas).
      const sala = c.tipo.sala;
      const tarefa = sessao.tarefasHoje.has(sala) ? undefined : sortear(sala, sessao.ultimaTarefa[sala]);
      sessao.tarefasHoje.add(sala);
      if (tarefa) {
        sessao.ultimaTarefa[sala] = tarefa.id;
        sessao.emTarefa = true;
        const dados: DadosTarefa = { tarefa, aoTerminar: () => { sessao.emTarefa = false; this.entregar(c); } };
        this.scene.launch('Tarefa', dados);
        return;
      }
      this.entregar(c);
      return;
    }
    sessao.emitir('estado');
  }

  private entregar(c: Construcao) {
    sessao.carregando--;
    sessao.entregas[c.tipo.sala!]++;
    sessao.emitir('mensagem', `+1 battery to ${c.tipo.nome}.`, '#86efac');
    sessao.emitir('estado');
  }

  // ---------- cargo lander ----------
  // Picks a flat, free spot near the base, then the lander comes down on it with its engine.
  private chegar(tipo: TipoId) {
    if (this.pouso || sessao.grade.lista.some((c) => c.tipo.id === tipo)) return;
    const hab = sessao.grade.lista.find((c) => c.tipo.id === 'habitat')!;
    const t = TIPOS[tipo];
    const [dx, dy] = SETORES_SUPRIMENTOS[tipo] ?? [6, -6];
    const center = Math.floor(sessao.terreno.n / 2);
    const p = sessao.grade.procurarComEspaco(t, center + dx, center + dy);
    if (!p) return;
    const chao = sessao.terreno.alturaMax(p.gx, p.gy, t.w, t.h) + 0.025;
    const img = this.add.image(0, 0, 'mod_pouso');
    const chama = this.add.image(0, 0, 'mod_chama').setBlendMode(Phaser.BlendModes.ADD);
    const sombra = this.add.ellipse(0, 0, 60, 26, 0x000000, 0.25);
    this.mapa.add([sombra, chama, img]);
    this.pouso = { tipo, gx: p.gx, gy: p.gy, z: chao + ALTURA_POUSO, vz: -3, chao, fase: 'descendo', t: 0, empuxo: 0, img, chama, sombra };
    this.seguir = false;
    sessao.emitir('mensagem', `Cargo lander coming in with the ${t.nome}! There is no air on the Moon, so a parachute would not work: it brakes with its rocket engine.`, '#fde68a');
  }

  private animarPouso(dt: number) {
    const L = this.pouso;
    if (!L) return;
    const t = TIPOS[L.tipo];
    L.t += dt;
    if (L.fase === 'descendo') {
      L.empuxo = empuxoDePouso(L.z - L.chao, L.vz, G);
      L.vz += (L.empuxo - G) * dt;
      L.z += L.vz * dt;
      if (L.z <= L.chao) {
        L.z = L.chao; L.vz = 0; L.empuxo = 0; L.fase = 'pousado'; L.t = 0;
        this.poeira(L.gx + t.w / 2, L.gy + t.h / 2, L.chao);
      }
    } else if (L.fase === 'pousado' && L.t > 1.2) {
      // Unload: the equipment joins the base, the lander lifts off for its next trip.
      const c = sessao.grade.construir(t, L.gx, L.gy);
      if (c) {
        this.desenharModulo(c);
        this.desenharCaminhos();
        const d = this.desenhos.get(c.id)!;
        d.img.setAlpha(0); d.rotulo?.setAlpha(0);
        this.tweens.add({ targets: [d.img, d.rotulo].filter(Boolean), alpha: 1, duration: 600 });
        const s = suprimentoDoDia(sessao.estado.dia);
        sessao.emitir('mensagem', `${t.nome} unlocked! ${s?.tipo === t.id ? s.fato : t.papel}`, '#86efac');
        sessao.emitir('desbloqueado', c);
      }
      L.fase = 'subindo'; L.t = 0;
    } else if (L.fase === 'subindo') {
      L.empuxo = 2.5 * G;
      L.vz += (L.empuxo - G) * dt;
      L.z += L.vz * dt;
      if (L.z > L.chao + ALTURA_POUSO * 1.4) {
        L.img.destroy(); L.chama.destroy(); L.sombra.destroy();
        this.pouso = null;
        this.seguir = true;
        return;
      }
    }
    // Lander centered on the equipment's footprint (its own is 2 x 2).
    const cx = L.gx + t.w / 2, cy = L.gy + t.h / 2;
    const m = modelos.pouso, mc = modelos.chama;
    const p = paraTela(P, cx - 1, cy - 1, L.z);
    L.img.setOrigin(m.ancora[0] / m.w, m.ancora[1] / m.h).setScale(m.escala).setPosition(p.x, p.y);
    const forca = Phaser.Math.Clamp(L.empuxo / (2 * G), 0, 1.4);
    L.chama.setOrigin(mc.ancora[0] / mc.w, mc.ancora[1] / mc.h).setPosition(p.x, p.y)
      .setScale(mc.escala * (0.6 + 0.4 * forca), mc.escala * (0.4 + 0.8 * forca) * Phaser.Math.FloatBetween(0.85, 1.15))
      .setAlpha(forca > 0.05 ? 0.95 : 0);
    const solo = paraTela(P, cx, cy, L.chao);
    const alto = L.z - L.chao;
    L.sombra.setPosition(solo.x, solo.y).setScale(1 / (1 + alto * 0.08)).setAlpha(Phaser.Math.Clamp(0.35 - alto * 0.015, 0.08, 0.35));
    const prof = profundidade(cx + 1, cy + 1);
    L.sombra.setDepth(prof - 2); L.chama.setDepth(prof + 0.5); L.img.setDepth(prof + 1);
    // Watch it land, then hand the camera back.
    if (sessao.vista === 'chao' && !sessao.voo) {
      const cam = this.cameras.main;
      cam.centerOn(Phaser.Math.Linear(cam.midPoint.x, solo.x, 0.05), Phaser.Math.Linear(cam.midPoint.y, solo.y - 30, 0.05));
    }
  }

  // ---------- loop ----------
  update(_t: number, dtMs: number) {
    const dt = Math.min(0.05, dtMs / 1000);
    this.aplicarZoom();
    this.sombraBandeira.setVisible(this.bandeira.visible).setAlpha(this.bandeira.alpha);
    if(configuracoesAbertas || sessao.transicao) {this.input.keyboard?.resetKeys();return;}
    const caixas = sessao.grade.caixas();
    const e = this.input.enabled ? this.entrada() : null;
    const antesNoChao = this.corpo.noChao;
    const { bloqueado } = passo(this.corpo, e, sessao.terreno, caixas, dt);
    if (this.rota.length > 0 && bloqueado) {
      if (++this.bloqueadoCont > 20) {
        this.rota = [];
        this.alvoUsar = null;
        this.bloqueadoCont = 0;
        this.recolherBandeira();
      }
    } else {
      this.bloqueadoCont = 0;
    }
    if (antesNoChao && !this.corpo.noChao && this.corpo.vz > 0 && !sessao.pulou) {
      sessao.pulou = true;
      const lua = pulo(G_LUA), terra = pulo(G_TERRA);
      sessao.emitir('mensagem',
        `Moon jump! Gravity here is ${G_LUA} m/s², one sixth of Earth's ${G_TERRA}. ` +
        `You rise ${lua.altura.toFixed(1)} m and float ${lua.tempo.toFixed(1)} s. On Earth: ${terra.altura.toFixed(2)} m, ${terra.tempo.toFixed(1)} s.`, '#93c5fd');
    }
    if (Math.hypot(this.corpo.vx, this.corpo.vy) > 0.3 && this.corpo.noChao) this.passada += dt * 12;
    this.animarPouso(dt);
    this.desenharComandante();
    sessao.parado = Math.hypot(this.corpo.vx, this.corpo.vy) < 0.05 && this.corpo.noChao;
    this.atualizarOclusao(dt);
    if(this.mapa.visible) this.ambiente.update(dt,this.corpo,sessao.grade.lista);
    this.animarModulos(dt);

    // Camera follows the commander on the ground.
    if (sessao.vista === 'chao' && !sessao.voo && this.seguir && !this.pouso) {
      const pe = paraTela(P, this.corpo.x, this.corpo.y, this.corpo.z);
      const cam = this.cameras.main;
      cam.centerOn(Phaser.Math.Linear(cam.midPoint.x, pe.x, 0.12), Phaser.Math.Linear(cam.midPoint.y, pe.y, 0.12));
    }
  }

  // Dust kicked up by the engine: it flies in clean arcs and drops straight back (no air).
  private poeira(gx: number, gy: number, z: number) {
    const p = paraTela(P, gx, gy, z);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const d = this.add.circle(p.x, p.y, Phaser.Math.Between(2, 4), COR_SOLO_CLARO).setDepth(profundidade(gx, gy) + 5);
      this.mapa.add(d);
      this.tweens.add({ targets: d, x: p.x + Math.cos(a) * 55, y: p.y + Math.sin(a) * 24, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => d.destroy() });
    }
  }

  // ---------- drawing ----------
  // Which Blender picture a module shows: the launch pad carries the rocket in 5 build stages.
  private modelo(c: Construcao): Modelo {
    const meta = sessao.estado.meta;
    if (c.tipo.id === 'plataforma' && meta > 0) return `foguete${Math.min(4, Math.floor(meta / 25))}` as Modelo;
    return c.tipo.id as Modelo;
  }

  // Puts a module picture on the map: its anchor pixel is the footprint corner (gx, gy) at floor height.
  private posicionar(img: Phaser.GameObjects.Image, c: Construcao, id: Modelo) {
    const m = modelos[id];
    const p = paraTela(P, c.gx, c.gy, c.z);
    img.setTexture(`mod_${id}`).setOrigin(m.ancora[0] / m.w, m.ancora[1] / m.h).setScale(m.escala).setPosition(p.x, p.y);
  }

  private desenharModulo(c: Construcao) {
    let d = this.desenhos.get(c.id);
    if (!d) {
      d = { g: this.add.graphics(), img: this.add.image(0, 0, 'mod_habitat') };
      // Rooms you use carry their name, like the first prototype.
      if (c.tipo.sala || c.tipo.id === 'habitat') {
        d.rotulo = this.add.text(0, 0, c.tipo.nome, fonte(13, '#f8fafc', { fontStyle: 'bold', stroke: '#17130f', strokeThickness: 4 }))
          .setOrigin(0.5, 1);
      }
      this.mapa.add([d.g, d.img, ...(d.rotulo ? [d.rotulo] : [])]);
      this.desenhos.set(c.id, d);
    }
    d.g.clear();
    fundacao(d.g, P, c, (x, y) => sessao.terreno.altura(x, y));
    this.posicionar(d.img, c, this.modelo(c));
    // Sort by the module's back corner (where its picture is anchored), not its front corner:
    // using the front corner pushed every module in front of the commander, so the astronaut
    // disappeared under it whenever walking next to a wall.
    const prof = profundidade(c.gx, c.gy);
    d.g.setDepth(prof - 1); d.img.setDepth(prof);
    if (d.rotulo) {
      const topo = paraTela(P, c.gx + c.tipo.w / 2, c.gy + c.tipo.h / 2, c.z + c.tipo.altura + 0.6);
      d.rotulo.setPosition(topo.x, topo.y).setDepth(1e6);
    }
  }

  // Subtle surface tracks follow actual walkable routes and terrain height.
  private desenharCaminhos() {
    const g = this.gCaminhos.clear();
    const hab = sessao.grade.lista.find(c => c.tipo.id === 'habitat');
    if (!hab) return;
    const start = { gx: hab.gx+hab.tipo.w/2, gy: hab.gy+hab.tipo.h+0.65 };
    const boxes = sessao.grade.caixas();
    for (const c of sessao.grade.lista) {
      if (c === hab || c.tipo.id === 'painel') continue;
      const candidates = [
        {gx:c.gx+c.tipo.w/2,gy:c.gy+c.tipo.h+0.65},
        {gx:c.gx+c.tipo.w+0.65,gy:c.gy+c.tipo.h/2},
        {gx:c.gx-0.65,gy:c.gy+c.tipo.h/2},
        {gx:c.gx+c.tipo.w/2,gy:c.gy-0.65},
      ];
      let best: Ponto[] | null = null, shortest = Infinity;
      for (const end of candidates) {
        const path = encontrarCaminho(sessao.terreno,boxes,0.22,start.gx,start.gy,end.gx,end.gy);
        if (!path) continue;
        const full = [start,...path];
        let length = 0;
        for(let i=1;i<full.length;i++) length += Math.hypot(full[i].gx-full[i-1].gx,full[i].gy-full[i-1].gy);
        if(length < shortest) {shortest=length;best=full;}
      }
      if (!best) continue;
      const points: {x:number;y:number}[] = [];
      for(let i=1;i<best.length;i++) {
        const a=best[i-1],b=best[i],steps=Math.max(1,Math.ceil(Math.hypot(b.gx-a.gx,b.gy-a.gy)*4));
        for(let j=0;j<=steps;j++) {
          const x=a.gx+(b.gx-a.gx)*j/steps,y=a.gy+(b.gy-a.gy)*j/steps;
          points.push(paraTela(P,x,y,sessao.terreno.altura(x,y)+0.01));
        }
      }
      g.lineStyle(9,COR_SOLO_MEDIO,0.20).strokePoints(points,false);
      g.lineStyle(2,COR_SOLO_CLARO,0.22).strokePoints(points,false);
    }
  }

  private animarModulos(dt: number) {
    const animate=video.efeitos && !movimentoReduzido();
    if(animate) this.tempoEfeitos=this.time.now/1000;
    for(const c of sessao.grade.lista) {
      if(c.tipo.id!=='suporte' && c.tipo.id!=='oficina') continue;
      const d=this.desenhos.get(c.id);if(!d) continue;
      // Only the instrument display changes, using actual Blender renders. The model stays still.
      const frame=animate ? Math.floor(this.tempoEfeitos/(video.qualidade==='leve'?1.3:0.85)+c.id)%3 : 0;
      const key=(frame ? `${c.tipo.id}_anim${frame}` : c.tipo.id) as Modelo;
      if(d.img.texture.key!==`mod_${key}` && this.textures.exists(`mod_${key}`)) this.posicionar(d.img,c,key);
    }
  }

  private atualizarOclusao(dt: number) {
    const k = this.corpo;
    const depth = profundidade(k.x + 0.3, k.y + 0.3);
    const feet = paraTela(P, k.x, k.y, k.z);
    for (const c of sessao.grade.lista) {
      const d = this.desenhos.get(c.id);
      if (!d) continue;
      const bounds = d.img.getBounds();
      const overlaps = bounds.contains(feet.x, feet.y - 15) || bounds.contains(feet.x, feet.y - 26);
      const behind = k.x < c.gx + c.tipo.w && k.y < c.gy + c.tipo.h && k.z < c.z + c.tipo.altura - 0.1;
      const normal = profundidade(c.gx + c.tipo.w, c.gy + c.tipo.h);
      const order = overlaps ? (behind ? Math.max(normal, depth + 0.5) : Math.min(normal, depth - 0.5)) : normal;
      // setDepth re-sorts the layer: only when the order really changes.
      if (d.img.depth !== order) { d.img.setDepth(order); d.g.setDepth(order - 0.1); }
      const alpha = overlaps && behind ? 0.38 : 1;
      const next = Phaser.Math.Linear(d.img.alpha, alpha, 1 - Math.exp(-dt * 12));
      d.img.setAlpha(next); d.g.setAlpha(next);
    }
  }

  private desenharComandante() {
    const k = this.corpo;
    const escala = Math.abs(P.ez[1]) / 36;
    const pe = paraTela(P, k.x, k.y, k.z);
    const g = this.gAstronauta.clear();
    sombraECarga(g, pe, paraTela(P, k.x, k.y, sessao.terreno.altura(k.x, k.y)), escala, sessao.carregando);
    // Sprite: row = facing (8 directions), column 0 = standing, 1.. = Moon hop cycle.
    const v = Math.hypot(k.vx, k.vy);
    if (v > 0.3) this.direcao = (Math.round(Math.atan2(-k.vy, k.vx) / (Math.PI / 4)) + 8) % 8;
    const col = v > 0.3 && k.noChao ? 1 + (Math.floor(this.passada) % sprite.andar) : k.noChao ? 0 : 3;
    this.comandante.setPosition(pe.x, pe.y).setFrame(this.direcao * sprite.colunas + col);
    const d = profundidade(k.x + 0.3, k.y + 0.3);
    g.setDepth(d - 1); this.comandante.setDepth(d);
  }
}
