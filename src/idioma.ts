// Generated with AI assistance. See README, "Use of AI tools".
// Game language. English is the source text and the default; Portuguese comes from a table
// keyed by the English text, so the scenes keep their strings as they are.
import { PT, type Traducao } from './textosPt.ts';

export type Idioma = 'en' | 'pt';
const KEY = 'lunar-odyssey-idioma';
export let idioma: Idioma = 'en';
try { if (localStorage.getItem(KEY) === 'pt') idioma = 'pt'; } catch { /* Storage is optional. */ }

// Keys with {} are patterns: "Day {} of {}" matches "Day 3 of 10" and the parts are translated too.
const exatos = new Map<string, Traducao>();
const moldes: [RegExp, Traducao, RegExp][] = [];
const escapar = (s: string) => s.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
const baixos = new Map<string, Traducao>();
for (let [en, pt] of Object.entries(PT)) {
  // {nasa} is filled by the scene before the text is shown (engine/eventos.ts).
  en = en.replace('{nasa}', '{}'); if (typeof pt === 'string') pt = pt.replace('{nasa}', '{}');
  if (!en.includes('{}')) { exatos.set(en, pt); baixos.set(en.toLowerCase(), pt); continue; }
  const fonte = `^${en.split('{}').map(escapar).join('([\\s\\S]*?)')}$`;
  moldes.push([new RegExp(fonte), pt, new RegExp(fonte, 'i')]);
}
// The most specific pattern first: "Chapter {} of {}: {}" before "Chapter {}".
const literais = (r: RegExp) => r.source.replace(/\(\[\\s\\S\]\*\?\)/g, '').length;
moldes.sort((a, b) => literais(b[0]) - literais(a[0]));

// Numbers inside a sentence follow the Portuguese format: 2.4 → 2,4 and 384,400 → 384.400.
const numero = (s: string) => /^-?\d+\.\d+\D{0,2}$/.test(s) ? s.replace('.', ',') : /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '.') : s;
function aplicar(pt: Traducao, partes: string[]) {
  if (typeof pt === 'function') return pt(...partes);
  let i = 0;
  return pt.replace(/\{(\d*)\}/g, (_: string, n: string) => partes[n === '' ? i++ : Number(n)] ?? '');
}

const SEPARADORES = ['\n', '  ·  ', ' · ', '  /  ', ' + ', ', '];
export const faltando = new Set<string>();
function traduzir(s: string): string {
  const exato = exatos.get(s);
  if (exato !== undefined) return aplicar(exato, []);
  for (const [re, pt] of moldes) {
    const m = re.exec(s);
    if (m) return aplicar(pt, m.slice(1).map((p) => numero(t(p))));
  }
  // Texts the scene turned into upper or lower case ("DAY 1", nomeMeta.toLowerCase()).
  const caixa = s === s.toUpperCase() ? 'up' : s === s.toLowerCase() ? 'low' : '';
  if (caixa && /\p{L}/u.test(s)) {
    const mudar = (r: string) => caixa === 'up' ? r.toUpperCase() : r.toLowerCase();
    const baixo = baixos.get(s.toLowerCase());
    if (baixo !== undefined) return mudar(aplicar(baixo, []));
    for (const [, pt, re] of moldes) {
      const m = re.exec(s);
      if (m) return mudar(aplicar(pt, m.slice(1).map((p) => numero(t(p)))));
    }
  }
  // Spaces and decorations around the text: "— THE TEAM —", "  Back".
  const [, antes, miolo, depois] = /^([^\p{L}\d]*)([\s\S]*?)([^\p{L}\d]*)$/u.exec(s)!;
  if (miolo && (antes || depois)) return antes + t(miolo) + depois;
  for (const sep of SEPARADORES) if (s.includes(sep)) return s.split(sep).map(t).join(sep);
  if (/[a-z]{3}/i.test(s)) faltando.add(s);
  return s;
}

const cache = new Map<string, string>();
// Translates a text shown to the player; in English it returns the text unchanged.
export function t(s: string): string {
  if (idioma === 'en' || !s) return s;
  let r = cache.get(s);
  if (r === undefined) {
    r = traduzir(s);
    if (cache.size > 4000) cache.clear();
    cache.set(s, r);
  }
  return r;
}

export const localeData = () => idioma === 'pt' ? 'pt-BR' : 'en-US';

const ouvintes = new Set<() => void>();
export function aoMudarIdioma(f: () => void) { ouvintes.add(f); return () => { ouvintes.delete(f); }; }
export function escolherIdioma(novo: Idioma) {
  if (novo === idioma) return;
  idioma = novo;
  cache.clear();
  try { localStorage.setItem(KEY, novo); } catch { /* Storage is optional. */ }
  for (const f of ouvintes) f();
}
