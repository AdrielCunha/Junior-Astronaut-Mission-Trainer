export type Descoberta = { titulo: string; fato: string };
const CHAVE = 'lunar-odyssey-science-log-v1';
export function lerDescobertas(): Descoberta[] {
  try {
    const valor: unknown = JSON.parse(localStorage.getItem(CHAVE)??'[]');
    return Array.isArray(valor) ? valor.filter((v): v is Descoberta => !!v && typeof v.titulo==='string' && typeof v.fato==='string' && v.titulo.length<=200 && v.fato.length<=2000).slice(-100) : [];
  } catch { return []; }
}
export function registrarDescoberta(titulo: string, fato: string) {
  if (!titulo.trim() || !fato.trim()) return;
  const lista=lerDescobertas().filter(d=>d.titulo!==titulo || d.fato!==fato);
  lista.push({titulo:titulo.slice(0,200),fato:fato.slice(0,2000)});
  try { localStorage.setItem(CHAVE,JSON.stringify(lista.slice(-100))); } catch { /* optional device storage */ }
}
