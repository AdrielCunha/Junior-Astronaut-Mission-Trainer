// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of "Transfer data": keep the antenna dish pointed at Earth (which drifts) while data blocks are sent.
// Pure functions, no Phaser: the scene (cenas/TransferirDadosTarefa.ts) only draws, and node --test can run these.

// ---- Old list-of-blocks model (kept: other code and tests may still import it).
export type BlocoDados = { id: string; enviado: boolean };

export type TarefaTransferirDados = {
  blocos: BlocoDados[];
};

export function criarTarefaTransferirDados(): TarefaTransferirDados {
  return {
    blocos: [
      { id: 'a', enviado: false },
      { id: 'b', enviado: false },
      { id: 'c', enviado: false },
      { id: 'd', enviado: false },
    ],
  };
}

export function enviarBloco(tarefa: TarefaTransferirDados, id: string): TarefaTransferirDados {
  return {
    ...tarefa,
    blocos: tarefa.blocos.map((bloco) => bloco.id === id ? { ...bloco, enviado: true } : bloco),
  };
}

export function tarefaConcluida(tarefa: TarefaTransferirDados) {
  return tarefa.blocos.every((bloco) => bloco.enviado);
}

// ---- Antenna model.
export type Ponto = { x: number; y: number };

export type TransferenciaAntena = {
  largura: number;
  altura: number;
  antena: Ponto;          // pivot of the dish
  terra: { x: number; yMin: number; yMax: number; periodo: number }; // Earth drifts up and down on its line
  tolerancia: number;     // radians: how far off the beam can be and still carry data
  duracao: number;        // seconds of good signal needed to send everything
  progresso: number;      // 0..1
  dados: TarefaTransferirDados;
};

export function criarTransferenciaAntena(): TransferenciaAntena {
  return {
    largura: 640,
    altura: 340,
    antena: { x: 90, y: 290 },
    terra: { x: 540, yMin: 80, yMax: 220, periodo: 14 },
    tolerancia: 0.14,
    duracao: 6,
    progresso: 0,
    dados: criarTarefaTransferirDados(),
  };
}

// Where Earth is at time t (seconds): a smooth, predictable drift.
export function posicaoDaTerra(t: TransferenciaAntena, tempo: number): Ponto {
  const { x, yMin, yMax, periodo } = t.terra;
  const meio = (yMin + yMax) / 2, amp = (yMax - yMin) / 2;
  return { x, y: meio + amp * Math.sin((tempo / periodo) * Math.PI * 2) };
}

export function anguloParaTerra(t: TransferenciaAntena, tempo: number) {
  const p = posicaoDaTerra(t, tempo);
  return Math.atan2(p.y - t.antena.y, p.x - t.antena.x);
}

// Smallest absolute difference between two angles, in radians (0..PI).
export function erroAngular(a: number, b: number) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

export function sinalBom(t: TransferenciaAntena, anguloAntena: number, tempo: number) {
  return erroAngular(anguloAntena, anguloParaTerra(t, tempo)) <= t.tolerancia;
}

// Signal strength 0..1 (1 = dead on): for the meter. Fades to 0 at three times the tolerance.
export function forcaDoSinal(t: TransferenciaAntena, anguloAntena: number, tempo: number) {
  const e = erroAngular(anguloAntena, anguloParaTerra(t, tempo));
  return Math.max(0, Math.min(1, 1 - Math.max(0, e - t.tolerancia * 0.3) / (t.tolerancia * 2.7)));
}

// Advance by dt seconds. Good signal fills the transfer; a bad one just pauses it (nothing is lost).
// Each quarter of progress sends the next data block.
export function avancarTransferencia(t: TransferenciaAntena, dt: number, anguloAntena: number, tempo: number): TransferenciaAntena {
  if (dt <= 0 || t.progresso >= 1 || !sinalBom(t, anguloAntena, tempo)) return t;
  const progresso = Math.min(1, t.progresso + dt / t.duracao);
  const n = t.dados.blocos.length;
  const enviados = progresso >= 1 ? n : Math.floor(progresso * n);
  let dados = t.dados;
  for (let i = 0; i < enviados; i++) dados = enviarBloco(dados, dados.blocos[i].id);
  return { ...t, progresso, dados };
}

export function blocosEnviados(t: TransferenciaAntena) {
  return t.dados.blocos.filter((b) => b.enviado).length;
}

export function transferenciaConcluida(t: TransferenciaAntena) {
  return t.progresso >= 1 && tarefaConcluida(t.dados);
}
