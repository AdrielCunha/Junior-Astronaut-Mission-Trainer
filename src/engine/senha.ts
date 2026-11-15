// Generated with AI assistance (Claude). See README, "Use of AI tools".
// The door code of the Radiation Shield for the day-2 solar flare alarm: the code is painted on the Moon's
// ground near the Shield (Superficie) and typed on a keypad (SenhaEscudoTarefa). Only that alarm uses it.
// The code depends on the day and the world, so the painting and the keypad always agree (after a reload too).
// No Phaser, so node --test can run it.

export const DIGITOS_SENHA = 4;
export const EVENTO_SENHA = 'nasa-flare';   // the day-2 alarm (engine/eventos.ts, alarmeDoDia(2))

export function senhaDoEscudo(dia: number, mundo: string): string {
  let h = Math.imul(dia + 17, 2654435761) ^ [...mundo].reduce((a, c) => Math.imul(a, 31) + c.charCodeAt(0), 11);
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  return String(1000 + (h % 9000));            // always 4 digits, never starting with 0
}

// Typing: digits only, at most DIGITOS_SENHA of them.
export function digitar(atual: string, tecla: string): string {
  if (tecla === 'apagar') return atual.slice(0, -1);
  if (!/^[0-9]$/.test(tecla) || atual.length >= DIGITOS_SENHA) return atual;
  return atual + tecla;
}

export const confereSenha = (digitado: string, senha: string) => digitado.length === DIGITOS_SENHA && digitado === senha;

// Where the code is painted: in a corner of the map (the free corner farthest from the Shield), so finding it
// is a trip to the edge of the Moon map. Kept inside the map by a margin; `livre` says whether a tile has no
// module on it. Always the same spot for the same base.
export const MARGEM_SENHA = 10;   // tiles from the map's edge
export function lugarDaSenha(escudo: { gx: number; gy: number; w: number; h: number }, livre: (gx: number, gy: number) => boolean, n = 128) {
  const cx = escudo.gx + escudo.w / 2, cy = escudo.gy + escudo.h / 2, m = MARGEM_SENHA;
  const livreLinha = (x: number, y: number) => [-2, -1, 0, 1, 2].every((d) => livre(Math.floor(x + d), Math.floor(y)));
  const cantos = [[m, m], [n - m, m], [m, n - m], [n - m, n - m]]
    .sort((a, b) => Math.hypot(b[0] - cx, b[1] - cy) - Math.hypot(a[0] - cx, a[1] - cy));   // farthest first
  for (const passo of [0, 3, 6]) {                          // a corner taken by a module: try a bit further in
    for (const [x, y] of cantos) {
      const gx = x + Math.sign(n / 2 - x) * passo, gy = y + Math.sign(n / 2 - y) * passo;
      if (livreLinha(gx, gy)) return { gx, gy };
    }
  }
  return { gx: cantos[0][0], gy: cantos[0][1] };
}
