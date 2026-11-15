// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of the "route map" mini-task: drag the ship from the Moon to Mars while the asteroids drift.
// Pure functions, no Phaser: the scene (cenas/NaveTarefa.ts) only draws, and node --test can run these.
export type Ponto = { x: number; y: number };
export type Asteroide = { x: number; y: number; r: number; vx: number; vy: number };

export type TarefaNave = {
  largura: number;
  altura: number;
  start: Ponto;
  end: Ponto;
  radius: number;        // ship
  zonaPartida: number;   // asteroids never enter this circle around start...
  alvoR: number;         // ...nor around the destination; reaching `alvoR` of the planet wins
  obstacles: Asteroide[];
};

export function distancia(a: Ponto, b: Ponto) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// A little forgiving on purpose (children): the hit circles are smaller than the drawn sprites.
export function naveEmColisao(pos: Ponto, tarefa: TarefaNave) {
  return tarefa.obstacles.some((o) => distancia(pos, o) <= tarefa.radius * 0.7 + o.r * 0.85);
}

export function tarefaConcluida(pos: Ponto, tarefa: TarefaNave) {
  return distancia(pos, tarefa.end) <= tarefa.alvoR;
}

export function criarTarefaNave(): TarefaNave {
  return {
    largura: 640,
    altura: 340,
    start: { x: 74, y: 170 },
    end: { x: 566, y: 170 },
    radius: 20,
    zonaPartida: 78,
    alvoR: 44,
    obstacles: [
      { x: 190, y: 70, r: 26, vx: 12, vy: 46 },
      { x: 250, y: 270, r: 32, vx: -10, vy: -54 },
      { x: 330, y: 150, r: 22, vx: 34, vy: 38 },
      { x: 400, y: 60, r: 30, vx: -18, vy: 58 },
      { x: 460, y: 280, r: 24, vx: 20, vy: -44 },
      { x: 500, y: 170, r: 28, vx: -30, vy: 32 },
    ],
  };
}

// Advance every asteroid by dt seconds. They bounce off the map edges and off the two planets' zones.
export function moverAsteroides(tarefa: TarefaNave, dt: number) {
  const zonas: [Ponto, number][] = [[tarefa.start, tarefa.zonaPartida], [tarefa.end, tarefa.alvoR + 30]];
  for (const o of tarefa.obstacles) {
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    if (o.x < o.r) { o.x = o.r; o.vx = Math.abs(o.vx); }
    if (o.x > tarefa.largura - o.r) { o.x = tarefa.largura - o.r; o.vx = -Math.abs(o.vx); }
    if (o.y < o.r) { o.y = o.r; o.vy = Math.abs(o.vy); }
    if (o.y > tarefa.altura - o.r) { o.y = tarefa.altura - o.r; o.vy = -Math.abs(o.vy); }
    for (const [c, raio] of zonas) {
      const d = distancia(o, c);
      const minimo = raio + o.r;
      if (d < minimo) {
        const nx = (o.x - c.x) / (d || 1);
        const ny = (o.y - c.y) / (d || 1);
        o.x = c.x + nx * minimo;
        o.y = c.y + ny * minimo;
        const dentro = o.vx * nx + o.vy * ny;
        if (dentro < 0) { o.vx -= 2 * dentro * nx; o.vy -= 2 * dentro * ny; } // reflect
        // Pushed out past a map edge (a planet near the border)? Keep it on the map and slide it along the edge instead.
        const fx = Math.min(Math.max(o.x, o.r), tarefa.largura - o.r);
        if (fx !== o.x) {
          o.x = fx;
          const dy = Math.sqrt(Math.max(0, minimo * minimo - (o.x - c.x) ** 2));
          const lado = o.y >= c.y ? 1 : -1;
          o.y = Math.min(Math.max(c.y + lado * dy, o.r), tarefa.altura - o.r);
          o.vx = 0;
          o.vy = lado * (Math.abs(o.vy) || 30);
        }
      }
    }
  }
}
