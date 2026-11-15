// Generated with AI assistance. See README, "Use of AI tools".
// Dev server only (opened from the DEV panel): a look at the Mars map rendered by
// tools/lua3d/make_terrain_marte.py + render_terrain.py --corpo marte, before it is playable
// (plan phase 4). Drag to move, wheel to zoom, Esc or the button to leave.
import Phaser from 'phaser';
import terreno from '../dados/terreno_marte.json';
import paleta from '../dados/paleta_marte.json';

const cor = (h: string) => Number.parseInt(h.slice(1), 16);

export class TerrenoMarte extends Phaser.Scene {
  private aoSair: () => void = () => {};

  constructor() {
    super({ key: 'TerrenoMarte' });
  }

  init(d: { aoSair?: () => void }) {
    this.aoSair = d?.aoSair ?? (() => {});
  }

  preload() {
    // A fresh name each time, so a new render shows up without reloading the page.
    this.textures.remove('dev_terreno_marte');
    this.load.image('dev_terreno_marte', `${terreno.imagem.arquivo}?v=${Date.now()}`);
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    // Mars sky by height (paleta_marte.json "ceu"): butterscotch near the ground.
    const g = this.add.graphics().setScrollFactor(0);
    const faixas = paleta.ceu;
    for (let i = 0; i < 40; i++) {
      const t = i / 39;
      let k = 0;
      while (k < faixas.length - 2 && (faixas[k + 1][0] as number) <= t * 0.6) k++;
      g.fillStyle(cor(faixas[Math.min(k, faixas.length - 1)][1] as string)).fillRect(0, H - (i + 1) * (H / 40), W, H / 40 + 1);
    }
    const img = this.add.image(0, 0, 'dev_terreno_marte').setOrigin(0);
    // Three cameras: the main one draws the sky, `cam` the map (zoom and drag), `ui` the words.
    // (A camera's zoom also scales objects with scrollFactor 0, so the words need their own.)
    const cam = this.cameras.add(0, 0, W, H);
    const ui = this.cameras.add(0, 0, W, H);
    this.cameras.main.ignore(img);
    cam.ignore(g);
    const z0 = Math.min(W / img.width, H / img.height) * 0.95;
    cam.setZoom(z0).centerOn(img.width / 2, img.height / 2);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
      cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * Math.exp(-dy * 0.0015), z0 * 0.5, 2));
    });
    this.input.keyboard?.on('keydown-ESC', () => this.sair());

    const t = terreno as unknown as { centro: { lat: number; lon: number }; pouso: { lat: number; lon: number }; janelaNome: string; alturas: number[][]; metrosPorTile: number; fonte: { nome: string } };
    const kmPouso = Math.hypot(
      (t.centro.lat - t.pouso.lat) * 59.27,
      (t.centro.lon - t.pouso.lon) * 59.27 * Math.cos((t.pouso.lat * Math.PI) / 180),
    );
    const hs = t.alturas.flat();
    const desnivel = (Math.max(...hs) - Math.min(...hs)) * t.metrosPorTile;
    const estilo = { fontFamily: 'system-ui, sans-serif', color: '#fff7ed', stroke: '#3b2420', strokeThickness: 4 };
    this.add.text(16, 14, `Mars map preview (dev) · window "${t.janelaNome}"`, { ...estilo, fontSize: '20px', fontStyle: 'bold' }).setScrollFactor(0);
    this.add.text(16, 44,
      `Jezero crater · ${t.centro.lat.toFixed(3)}° N ${t.centro.lon.toFixed(3)}° E · ${kmPouso.toFixed(1)} km from Perseverance's landing site\n` +
      `64 x 64 tiles of 80 m (5.1 km) · ${desnivel.toFixed(0)} m of relief · ${t.fonte.nome}\n` +
      'Drag to move, wheel to zoom, Esc to leave',
      { ...estilo, fontSize: '13px', lineSpacing: 4 }).setScrollFactor(0);
    const sair = this.add.text(W - 16, H - 16, 'Back', { ...estilo, fontSize: '16px', fontStyle: 'bold', backgroundColor: '#2563eb', padding: { x: 14, y: 8 }, strokeThickness: 0 })
      .setOrigin(1, 1).setScrollFactor(0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.sair());
    sair.setDepth(10);
    const palavras = this.children.list.filter((o) => o !== img && o !== g);
    this.cameras.main.ignore(palavras);
    cam.ignore(palavras);
    ui.ignore([img, g]);
  }

  private sair() {
    this.scene.stop();
    this.aoSair();
  }
}
