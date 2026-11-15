// UI-only preferences and auto-hide policy; never changes mission state.
export const CHAVE_DICAS = 'lunar-odyssey-controles-recolhidos';
type Armazenamento = { getItem(chave: string): string | null; setItem(chave: string, valor: string): void };
function armazenamentoSeguro(): Armazenamento | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}
export class PreferenciaDicas {
  private recolhida?: boolean;
  private expandiuManualmente = false;
  private autoConcluido = false;
  private tempo = 0;
  private movimento = false;
  private pulo = false;
  private armazenamento: Armazenamento | null;
  constructor(armazenamento: Armazenamento | null = armazenamentoSeguro()) {
    this.armazenamento = armazenamento;
    try {
      const salvo = armazenamento?.getItem(CHAVE_DICAS);
      if (salvo === '1' || salvo === '0') this.recolhida = salvo === '1';
    } catch { /* storage can be unavailable in embedded/private contexts */ }
  }
  inicial(compacto: boolean) { return this.recolhida ??= compacto; }
  definir(recolhida: boolean, manual = true) {
    this.recolhida = recolhida;
    if (manual && !recolhida) this.expandiuManualmente = true;
    try { this.armazenamento?.setItem(CHAVE_DICAS, recolhida ? '1' : '0'); } catch { /* optional persistence */ }
  }
  private verificar() {
    if (this.autoConcluido || this.expandiuManualmente) return false;
    if (this.tempo < 12000 && !(this.movimento && this.pulo)) return false;
    this.autoConcluido = true;
    if (this.recolhida) return false;
    this.definir(true, false);
    return true;
  }
  passo(ms: number) { this.tempo += Math.max(0, ms); return this.verificar(); }
  usar(controle: 'movimento' | 'pulo') {
    if (controle === 'movimento') this.movimento = true; else this.pulo = true;
    return this.verificar();
  }
}
