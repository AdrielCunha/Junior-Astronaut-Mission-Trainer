// Gameplay countdown, kept in the session so resize and menus cannot reset the deadline.
// Long enough for children to react, short enough to keep the emergency tense.
export const PRAZO_TEMPESTADE_MS = 45_000;
// Extreme-storm protection is the same in every chapter and in developer previews.
export const BATERIAS_TEMPESTADE_EXTREMA = 3;
// Acute dose when the storm catches the crew, by batteries delivered to the shield before it hits.
export const DANO_POR_BATERIAS = [45, 35, 20, 0] as const;
export const danoDaTempestade = (baterias: number) =>
  DANO_POR_BATERIAS[Math.max(0, Math.min(DANO_POR_BATERIAS.length - 1, Math.floor(baterias)))];
export class TempestadeSolar {
  restante = PRAZO_TEMPESTADE_MS;
  status: 'inativa' | 'alerta' | 'protegida' | 'atingida' = 'inativa';
  iniciar(nivel: number) {
    this.restante = PRAZO_TEMPESTADE_MS;
    this.status = nivel >= BATERIAS_TEMPESTADE_EXTREMA ? 'alerta' : 'inativa';
  }
  passo(ms: number, baterias: number, _nivel: number): 'protegida' | 'atingida' | null {
    if (this.status !== 'alerta') return null;
    if (baterias >= BATERIAS_TEMPESTADE_EXTREMA) { this.status = 'protegida'; return 'protegida'; }
    this.restante = Math.max(0, this.restante - ms);
    if (this.restante > 0) return null;
    this.status = 'atingida';
    return 'atingida';
  }
}
