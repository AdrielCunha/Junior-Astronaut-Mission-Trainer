// Generated with AI assistance (Claude). See README, "Use of AI tools".
// The ground: real NASA terrain (Blender render), the crew's base (already built), the commander,
// and the cargo landers that bring new equipment. Players run the base, they do not build it:
// walk (or click), pick up the day's batteries at the Habitat, click a room to deliver one.
// Owns the ground camera and its zoom (sessao.u). When the flight to the Moon starts, the camera
// glides to the framing of the flight's first frame and the terrain dissolves into it (Espaco
// plays the frames) while the base stays visible, live.
import Phaser from 'phaser';
import { paraTela, paraChao, profundidade } from '../engine/iso';
import { passo, novoCorpo, G, G_LUA, G_TERRA, pulo, type Corpo, type Entrada } from '../engine/fisica';
import { TIPOS, montarBasePadrao, type Construcao, type TipoId } from '../engine/construcao';
import { empuxoDePouso, suprimentoDoDia } from '../engine/suprimentos';
import { sessao, dadosTerreno, suave, sDeU, S_MAPA, fonte } from './sessao';
import { fundacao, baseDe, sombraECarga } from './desenho';
import { sortear } from '../tarefas';
import type { DadosTarefa } from './Tarefa';
import voo from '../dados/voo.json';
import modelos from '../dados/modulos.json';
import sprite from '../dados/astronauta.json';

const P = dadosTerreno.imagem;
const ALCANCE = 1.3;          // tiles from a module's edge to use it
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
  private corpo!: Corpo;
  private gAstronauta!: Phaser.GameObjects.Graphics;   // shadow + carried batteries
  private comandante!: Phaser.GameObjects.Sprite;
  private direcao = 1;                                  // sprite row: map angle / 45 deg
  private desenhos = new Map<number, { g: Phaser.GameObjects.Graphics; img: Phaser.GameObjects.Image; rotulo?: Phaser.GameObjects.Text }>();
  private alvo: { gx: number; gy: number; usar?: Construcao } | null = null;
  private teclas!: Record<string, Phaser.Input.Keyboard.Key>;
  private passada = 0;
  private sobre: Construcao | null = null;              // module under the cursor
  private seguir = true;             // camera follows the commander until the player pans
  private arrastando = false;
  private mapa!: Phaser.GameObjects.Layer;          // terrain + everything on it
  private terreno!: Phaser.GameObjects.Image;
  private inicioVoo: { x: number; y: number } | null = null;
  private pouso: Pouso | null = null;

  constructor() {
    super({ key: 'Superficie', active: true });
  }

  preload() {
    this.load.image('terreno', P.arquivo);
    for (const [id, m] of Object.entries(modelos)) this.load.image(`mod_${id}`, m.arquivo);
    this.load.spritesheet('astronauta', 'lua/astronaut.png', { frameWidth: sprite.frame, frameHeight: sprite.frame });
  }

  // Map center in world px: the flight's first frame is centered on it.
  private get centroMapa() {
    const h = dadosTerreno.n / 2;
    return paraTela(P, h, h, sessao.terreno.altura(h, h));
  }

  create() {
    // Dev server only: lets browser tests drive the game. Removed from the production build.
    if (import.meta.env.DEV) Object.assign(window, { superficie: this, sessao });
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this.desenhos.clear();
    this.pouso = null;
    this.mapa = this.add.layer().setDepth(0);
    this.terreno = this.add.image(0, 0, 'terreno').setOrigin(0).setDepth(-1e6);
    this.mapa.add(this.terreno);

    // The crew's base is already there (engine/construcao.ts, BASE_PADRAO).
    if (!sessao.grade.lista.length) montarBasePadrao(sessao.grade);
    const hab = sessao.grade.lista.find((c) => c.tipo.id === 'habitat')!;
    const sx = hab.gx + hab.tipo.w + 0.7, sy = hab.gy + hab.tipo.h / 2;
    this.corpo = novoCorpo(sx, sy, sessao.terreno.altura(sx, sy));
    this.corpo.noChao = true;

    this.gAstronauta = this.add.graphics();
    this.comandante = this.add.sprite(0, 0, 'astronauta', 0).setOrigin(sprite.pe[0] / sprite.frame, sprite.pe[1] / sprite.frame)
      .setScale(sprite.escala);
    this.mapa.add([this.gAstronauta, this.comandante]);
    for (const c of sessao.grade.lista) this.desenharModulo(c);

    const pe = paraTela(P, this.corpo.x, this.corpo.y, this.corpo.z);
    this.cameras.main.centerOn(pe.x, pe.y);

    // ---- input: keys walk; drag pans; a tap walks there, or to a room and uses it ----
    const kb = this.input.keyboard!;
    this.teclas = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-E', () => this.usarPerto());
    this.arrastando = false;
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      const q = paraChao(P, sessao.terreno, ptr.worldX, ptr.worldY);
      this.destacar(q ? sessao.grade.em(q.gx, q.gy) ?? null : null);
      if (!ptr.isDown || this.input.pointer2.isDown) return;
      if (!this.arrastando && Phaser.Math.Distance.Between(ptr.downX, ptr.downY, ptr.x, ptr.y) < 8) return;
      this.arrastando = true;
      this.seguir = false;
      const cam = this.cameras.main;
      cam.scrollX -= (ptr.x - ptr.prevPosition.x) / cam.zoom;
      cam.scrollY -= (ptr.y - ptr.prevPosition.y) / cam.zoom;
    });
    this.input.on('pointerdown', () => { this.arrastando = false; });
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (!this.arrastando && !this.input.pointer2.isDown && ptr.button === 0) this.clicar(ptr);
      this.arrastando = false;
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
    this.mapa.setVisible(this.mapa.alpha > 0.001);
    this.input.enabled = sessao.vista === 'chao' && !sessao.voo && !sessao.emTarefa;
  }

  // ---------- input ----------
  private clicar(ptr: Phaser.Input.Pointer) {
    const q = paraChao(P, sessao.terreno, ptr.worldX, ptr.worldY);
    if (!q) return;
    this.seguir = true;
    const c = sessao.grade.em(q.gx, q.gy);
    this.alvo = c ? { gx: c.gx + c.tipo.w / 2, gy: c.gy + c.tipo.h + 0.5, usar: c } : q;
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
    if (sx || sy) { this.alvo = null; this.seguir = true; }
    else if (this.alvo) {
      dx = this.alvo.gx - this.corpo.x; dy = this.alvo.gy - this.corpo.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.25 || (this.alvo.usar && this.perto(this.alvo.usar))) {
        const u = this.alvo.usar;
        this.alvo = null; dx = dy = 0;
        if (u) this.usar(u);
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
    const p = sessao.grade.procurar(t, hab.gx + 6, hab.gy - 6) ?? sessao.grade.procurar(t, hab.gx, hab.gy);
    if (!p) return;
    const chao = sessao.terreno.alturaMedia(p.gx, p.gy, t.w, t.h);
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
    const caixas = sessao.grade.caixas();
    const e = this.input.enabled ? this.entrada() : null;
    const antesNoChao = this.corpo.noChao;
    passo(this.corpo, e, sessao.terreno, caixas, dt);
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
      const d = this.add.circle(p.x, p.y, Phaser.Math.Between(2, 4), 0xc9bfa8).setDepth(profundidade(gx, gy) + 5);
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
    fundacao(d.g, P, c, baseDe(c, (x, y) => sessao.terreno.altura(x, y)));
    this.posicionar(d.img, c, this.modelo(c));
    const prof = profundidade(c.gx + c.tipo.w, c.gy + c.tipo.h);
    d.g.setDepth(prof - 1); d.img.setDepth(prof);
    if (d.rotulo) {
      const topo = paraTela(P, c.gx + c.tipo.w / 2, c.gy + c.tipo.h / 2, c.z + c.tipo.altura + 0.6);
      d.rotulo.setPosition(topo.x, topo.y).setDepth(1e6);
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
