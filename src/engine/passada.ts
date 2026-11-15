// The rendered walk has eight frames. In make_astronaut.py, both boots return to
// their lowest pose at phase 0 and 1/2: sprite columns 1 and 5 (column 0 is idle).
// Keep the displayed pose and its contact event together, including stop/start and landing.
export class CicloPassada {
  private fase = 0;
  private colunaAnterior = 0;

  private readonly quadros: number;

  constructor(quadros = 8) { this.quadros = quadros; }

  get faseAtual() { return this.fase; }

  reiniciar() {
    this.fase = 0;
    this.colunaAnterior = 0;
  }

  atualizar(dt: number, ritmo: number, andando: boolean, noChao: boolean, pousou: boolean) {
    if (!noChao || !andando) {
      this.reiniciar();
      return { coluna: noChao ? 0 : 3, contato: false };
    }
    // Starting and landing show a planted boot, rather than resuming halfway through a swing.
    if (pousou) this.reiniciar();
    if (this.colunaAnterior !== 0) this.fase = (this.fase + Math.min(0.05, Math.max(0, dt)) * ritmo) % this.quadros;
    const coluna = 1 + Math.floor(this.fase);
    const contato = !pousou && coluna !== this.colunaAnterior
      && (coluna === 1 || coluna === 1 + this.quadros / 2);
    this.colunaAnterior = coluna;
    return { coluna, contato };
  }
}
