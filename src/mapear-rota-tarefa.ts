// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of "Map the route": join the stars of a constellation in numbered order, dragging a line from star to star.
// Pure functions, no Phaser: the scene (cenas/MapearRotaTarefa.ts) only draws, and node --test can run these.

// ---- Old list-of-points model (kept: other code and tests may still import it).
export type PontoRota = { id: string; visitado: boolean };

export type TarefaMapearRota = {
  pontos: PontoRota[];
};

export function criarTarefaMapearRota(): TarefaMapearRota {
  return {
    pontos: [
      { id: 'inicio', visitado: false },
      { id: 'corridor', visitado: false },
      { id: 'porto', visitado: false },
      { id: 'destino', visitado: false },
    ],
  };
}

export function visitarPonto(tarefa: TarefaMapearRota, id: string): TarefaMapearRota {
  const ordem = ['inicio', 'corridor', 'porto', 'destino'];
  const atual = ordem.indexOf(id);
  if (atual < 0) return tarefa;

  const pontos = tarefa.pontos.map((ponto) => {
    if (ponto.id !== id) return ponto;
    return { ...ponto, visitado: true };
  });

  const minIndex = ordem.indexOf(tarefa.pontos.filter((p) => p.visitado).slice(-1)[0]?.id ?? 'inicio');
  if (atual > minIndex + 1) {
    return tarefa;
  }

  return { ...tarefa, pontos };
}

export function tarefaConcluida(tarefa: TarefaMapearRota) {
  return tarefa.pontos.every((ponto) => ponto.visitado);
}

// ---- Constellation model.
export type Estrela = { numero: number; x: number; y: number; ligada: boolean };

export type Constelacao = {
  largura: number;
  altura: number;
  raioToque: number;   // how close the pointer must be to a star to count (generous on purpose)
  estrelas: Estrela[]; // numero 1..N, in the order they must be joined
};

export function criarConstelacao(): Constelacao {
  const pts: [number, number][] = [[96, 250], [190, 120], [320, 190], [270, 292], [430, 90], [540, 210], [470, 290]];
  return {
    largura: 640,
    altura: 340,
    raioToque: 34,
    estrelas: pts.map(([x, y], i) => ({ numero: i + 1, x, y, ligada: i === 0 })), // the first star starts lit: the line leaves from it
  };
}

// The number of the next star to join, or 0 when all are joined.
export function proximaEstrela(c: Constelacao) {
  return c.estrelas.find((e) => !e.ligada)?.numero ?? 0;
}

// The star under a point (nearest within reach), or 0.
export function estrelaNoPonto(c: Constelacao, p: { x: number; y: number }) {
  let melhor = 0, dMelhor = c.raioToque;
  for (const e of c.estrelas) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d <= dMelhor) { melhor = e.numero; dMelhor = d; }
  }
  return melhor;
}

// Join a star: only the next one in order counts. Any other star returns the same object (nothing lost, nothing punished).
export function ligarEstrela(c: Constelacao, numero: number): Constelacao {
  if (numero !== proximaEstrela(c)) return c;
  return { ...c, estrelas: c.estrelas.map((e) => e.numero === numero ? { ...e, ligada: true } : e) };
}

export function estrelasLigadas(c: Constelacao) {
  return c.estrelas.filter((e) => e.ligada).length;
}

export function constelacaoConcluida(c: Constelacao) {
  return c.estrelas.every((e) => e.ligada);
}
