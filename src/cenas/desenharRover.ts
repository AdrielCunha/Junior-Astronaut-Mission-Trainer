import type Phaser from 'phaser';
import { paraTela, profundidade, type Projecao } from '../engine/iso';
import type { Rover } from '../engine/rover';
import { SKINS } from '../dados/skins';
import { video } from '../video';

// Original sprite's hip line: keep the helmet, torso, arms and backpack intact.
export const LINHA_QUADRIL_SENTADO = 128;

// Stylized Apollo LRV: exposed aluminum frame, two fabric seats, wire-mesh wheels,
// rust-colored fenders, gold thermal blankets, front TV camera and mesh dish antenna.
export function desenharRover(g: Phaser.GameObjects.Graphics, p: Projecao, r: Rover, tempo: number, frente: Phaser.GameObjects.Graphics, carregado = true, instalando = false) {
  const k = r.corpo, co = Math.cos(r.angulo), si = Math.sin(r.angulo);
  const q = (x: number, y: number, z: number) => paraTela(p, k.x + x * co - y * si, k.y + x * si + y * co, k.z + z);
  const poli = (pts: {x: number; y: number}[], cor: number) => {
    g.fillStyle(cor).fillPoints(pts, true).lineStyle(1.5, 0x14243e).strokePoints(pts, true);
  };
  const caixa = (x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, cor: number) => {
    const base = [q(x0,y0,z0), q(x1,y0,z0), q(x1,y1,z0), q(x0,y1,z0)];
    const top = [q(x0,y0,z1), q(x1,y0,z1), q(x1,y1,z1), q(x0,y1,z1)];
    [0,1,2,3].sort((a,b) => (base[a].y+base[(a+1)%4].y)-(base[b].y+base[(b+1)%4].y)).forEach(i => {
      const j = (i+1)%4;
      poli([base[i],base[j],top[j],top[i]], 0x8b9baa);
    });
    poli(top, cor);
  };
  g.clear().setDepth(profundidade(k.x + 0.7, k.y + 0.7));
  frente.clear().setDepth(g.depth + 0.2);
  const solo = q(0,0,0);
  g.fillStyle(0x111827,0.28).fillEllipse(solo.x,solo.y+3,67,28);
  const rodas = [-0.60,0.60].flatMap(x => [-0.50,0.50].map(y => ({x,y,p:q(x,y,0.24)}))).sort((a,b)=>a.p.y-b.p.y);
  const roda = (w: typeof rodas[number]) => {
    const ponto = (x: number,z: number) => q(w.x+x,w.y,0.24+z);
    const aro = Array.from({length:24},(_,i)=>ponto(Math.cos(i*Math.PI/12)*0.25,Math.sin(i*Math.PI/12)*0.25));
    poli(aro,0x63717c);
    // Crossed steel mesh, rather than inflated black tires.
    for (const d of [-0.18,-0.09,0,0.09,0.18]) {
      const alcance = Math.sqrt(0.25**2-d**2);
      const a = ponto(-alcance,d), b = ponto(alcance,d), c = ponto(d,-alcance), e = ponto(d,alcance);
      g.lineStyle(0.8,0xdbe4e8,0.9).lineBetween(a.x,a.y,b.x,b.y).lineBetween(c.x,c.y,e.x,e.y);
    }
    const giro = tempo * Math.hypot(k.vx,k.vy) * 0.008;
    const a = ponto(Math.cos(giro)*0.21,Math.sin(giro)*0.21), b = ponto(-Math.cos(giro)*0.21,-Math.sin(giro)*0.21);
    g.lineStyle(1.4,0xf1f5f9).lineBetween(a.x,a.y,b.x,b.y);
    g.fillStyle(0xe2e8f0).fillCircle(w.p.x,w.p.y,3);
    const arco = Array.from({length:13},(_,i)=>ponto(Math.cos(i*Math.PI/12)*0.30,Math.sin(i*Math.PI/12)*0.30));
    g.lineStyle(5,0xa86a44).strokePoints(arco,false).lineStyle(1,0xedbd83).strokePoints(arco,false);
  };
  rodas.slice(0,2).forEach(roda);
  caixa(-0.82,-0.38,0.82,0.38,0.22,0.31,0xd8d9ce);
  // Rear tool rack and front thermal blankets over the battery compartment.
  caixa(-0.78,-0.34,-0.48,0.34,0.31,0.48,0xc9a04d);
  caixa(0.36,-0.34,0.79,0.34,0.31,0.43,0xe8c269);
  const led=q(0.66,0.14,0.45);
  g.fillStyle(instalando?0xfddd45:carregado?0x4ade80:0x475569).fillCircle(led.x,led.y,3.2)
    .lineStyle(1.2,0x14243e).strokeCircle(led.x,led.y,3.2);
  const tubo = (a: number[],b: number[],cor=0xdce3e8,espessura=2) => {
    const p0=q(a[0],a[1],a[2]),p1=q(b[0],b[1],b[2]);
    g.lineStyle(espessura,0x14243e).lineBetween(p0.x,p0.y,p1.x,p1.y)
      .lineStyle(Math.max(1,espessura-1),cor).lineBetween(p0.x,p0.y,p1.x,p1.y);
  };
  for (const lado of [-0.19,0.19]) {
    caixa(-0.35,lado-0.14,0.11,lado+0.14,0.31,0.40,0xddd6b5);
    // Light fabric backs, held by a narrow aluminum frame.
    poli([q(-0.37,lado-0.14,0.41),q(-0.37,lado+0.14,0.41),q(-0.45,lado+0.14,0.80),q(-0.45,lado-0.14,0.80)],0xede5c6);
    for (const borda of [-0.15,0.15]) tubo([-0.36,lado+borda,0.33],[-0.45,lado+borda,0.82]);
    tubo([-0.45,lado-0.15,0.82],[-0.45,lado+0.15,0.82]);
    tubo([0.12,lado-0.12,0.34],[0.35,lado-0.12,0.27]);
    tubo([0.12,lado+0.12,0.34],[0.35,lado+0.12,0.27]);
  }
  if (r.dirigindo) {
    // The original astronaut sprite supplies the upper body above these seated legs.
    const skin = SKINS.find(s => s.id === video.skin) ?? SKINS[0];
    const traje = Number.parseInt(skin.traje.slice(1),16);
    const botas = Number.parseInt(skin.botas.slice(1),16);
    const detalhe = Number.parseInt(skin.cor.slice(1),16);
    const membro = (pontos: number[][], largura: number, cor = traje) => {
      const pts = pontos.map(p => q(p[0],p[1],p[2]));
      g.lineStyle(largura+1.5,0x17130f).strokePoints(pts,false);
      for (const p of pts) g.fillStyle(0x17130f).fillCircle(p.x,p.y,(largura+1.5)/2);
      g.lineStyle(largura,cor).strokePoints(pts,false);
      for (const p of pts) g.fillStyle(cor).fillCircle(p.x,p.y,largura/2);
    };
    for (const lado of [-0.28,-0.10]) {
      membro([[-0.21,lado,0.47],[0.16,lado,0.45],[0.30,lado,0.29]],3.5);
      membro([[0.26,lado,0.33],[0.28,lado,0.31]],4,detalhe);
      membro([[0.28,lado,0.28],[0.39,lado,0.27]],4.5,botas);
    }
  }
  // Draw the controls, antenna and near wheels in front of the seated astronaut.
  g = frente;
  // Central T-shaped hand controller; Apollo LRV had no steering wheel.
  tubo([0,0,0.40],[0.10,0,0.64],0x465363,3);
  tubo([0.10,-0.09,0.64],[0.10,0.09,0.64],0x465363,3);
  caixa(0.20,-0.12,0.34,0.12,0.45,0.62,0x48525b);
  const painel = q(0.28,0,0.63);
  g.fillStyle(0xf1f5f9).fillCircle(painel.x,painel.y,2);
  // High-gain mesh dish, centered at the front, tilted toward Earth.
  tubo([0.64,0,0.43],[0.64,0,1.16],0x9caeb8,3);
  const prato = q(0.64,0,1.20);
  g.fillStyle(0xabbac0,0.65).fillEllipse(prato.x,prato.y,29,19)
    .lineStyle(1.5,0xe5e7eb).strokeEllipse(prato.x,prato.y,29,19);
  for(const d of [-8,-4,0,4,8]) {
    const h=9*Math.sqrt(1-(d/14)**2);
    g.lineStyle(0.6,0x405366).lineBetween(prato.x+d,prato.y-h,prato.x+d,prato.y+h);
  }
  for(const d of [-5,0,5]) {
    const w=14*Math.sqrt(1-(d/9)**2);
    g.lineStyle(0.6,0x405366).lineBetween(prato.x-w,prato.y+d,prato.x+w,prato.y+d);
  }
  g.lineStyle(1.5,0xdce3e8).lineBetween(prato.x-10,prato.y+6,prato.x+4,prato.y-4);
  // TV camera on the front side, and a slim low-gain antenna at the rear.
  tubo([0.66,0.30,0.43],[0.66,0.30,0.76]);
  caixa(0.56,0.25,0.77,0.35,0.73,0.85,0xe2e8f0);
  const lente=q(0.79,0.30,0.79);
  g.fillStyle(0x14243e).fillCircle(lente.x,lente.y,2.5);
  tubo([-0.68,-0.32,0.48],[-0.68,-0.32,1.12],0x334155,2);
  rodas.slice(2).forEach(roda);
}
