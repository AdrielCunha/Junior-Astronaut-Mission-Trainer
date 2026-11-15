import type { Estado, Alocacao, Efeito } from './regras';
import type { Corpo } from './engine/fisica';
import type { Rover } from './engine/rover';
import type { TipoId } from './engine/construcao';
import type { DecoColocada } from './dados/decoracao';
import type { Fase, Mundo, RelatorioDia } from './cenas/sessao';

const CHAVE = 'lunar-odyssey-save-v1';
export type DadosPartida = {
  versao: 1; salvoEm: number; layout?: string; mundo: Mundo; capIdx: number; fase: Fase;
  estado: Estado; entregas: Alocacao; pontos: number[]; carregando: number; noHabitat: number;
  tarefasHoje: Efeito[]; ultimaTarefa: Partial<Record<Efeito,string>>; energiaHoje: boolean;
  curiosidadeRoverVista: boolean; diaCargaRover: number | null; rover: Rover | null; astronauta: Corpo | null;
  modulos: {id: number; tipo: TipoId; gx: number; gy: number; girado?: boolean}[]; decoracao: DecoColocada[];
  tempestade: {restante: number; status: 'inativa' | 'alerta' | 'protegida' | 'atingida'};
  danoTempestade: number; bateriasTempestade: number;
  desfechoPendente: {tipo: 'protegida' | 'atingida'; baterias: number} | null;
  ultimoDia: RelatorioDia | null; evento: {id: string; construcaoId: number} | null;
  eventoEm: number | null; ultimoEvento?: string; diasCalmos: number; tempoCalmo?: number; pulou: boolean;
};
const objeto = (v: unknown): v is Record<string,unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const numero = (v: unknown, min = 0, max = 100) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
function corpo(v: unknown) {
  return objeto(v) && numero(v.x,0,256) && numero(v.y,0,256) && numero(v.z,-256,256)
    && numero(v.raio,0.1,2) && ['vx','vy','vz'].every(k=>numero(v[k],-100,100)) && typeof v.noChao === 'boolean';
}
function valido(v: unknown): v is DadosPartida {
  if (!objeto(v) || v.versao !== 1 || !['lua','nave','marte'].includes(String(v.mundo))
    || !Number.isInteger(v.capIdx) || !numero(v.capIdx,0,2)
    || ['lua','nave','marte'][Number(v.capIdx)] !== v.mundo
    || !['inicio','manha','dia','noite','fim'].includes(String(v.fase))) return false;
  const e = v.estado;
  if (!objeto(e) || !Number.isInteger(e.dia) || !numero(e.dia,1,9)
    || !['oxigenio','dose','meta'].every(k=>numero(e[k])) || !objeto(e.obras)
    || !Object.values(e.obras).every(x=>numero(x,0,100))) return false;
  if (!objeto(v.entregas) || !['oxigenio','blindagem','meta','aquecimento'].every(k=>numero(v.entregas && (v.entregas as Record<string,unknown>)[k],0,100))
    || !numero(v.carregando,0,100) || !numero(v.noHabitat,0,100)
    || !Array.isArray(v.pontos) || !v.pontos.every(p=>numero(p,0,300))) return false;
  if (!Array.isArray(v.modulos) || v.modulos.length > 100 || !v.modulos.every(m=>objeto(m) && typeof m.tipo==='string' && numero(m.id,1,1000) && numero(m.gx,0,256) && numero(m.gy,0,256))
    || !Array.isArray(v.decoracao) || v.decoracao.length > 100 || !v.decoracao.every(d=>objeto(d) && typeof d.id==='string' && typeof d.nome==='string' && numero(d.gx,0,256) && numero(d.gy,0,256) && numero(d.w,0.1,20) && numero(d.h,0.1,20) && numero(d.altura,0,20))
    || !Array.isArray(v.tarefasHoje) || !v.tarefasHoje.every(t=>['oxigenio','blindagem','meta','aquecimento'].includes(String(t))) || !objeto(v.ultimaTarefa)) return false;
  if (v.astronauta !== null && !corpo(v.astronauta)) return false;
  if (v.rover !== null && (!objeto(v.rover) || !corpo(v.rover.corpo) || !numero(v.rover.angulo,-1e6,1e6) || typeof v.rover.dirigindo!=='boolean')) return false;
  if (!objeto(v.tempestade) || !numero(v.tempestade.restante,0,45_000)
    || !['inativa','alerta','protegida','atingida'].includes(String(v.tempestade.status))) return false;
  if (v.fase==='noite' && (!objeto(v.ultimoDia) || !objeto(v.ultimoDia.antes) || !objeto(v.ultimoDia.entregas) || typeof v.ultimoDia.fato!=='string')) return false;
  return numero(v.danoTempestade) && numero(v.bateriasTempestade,0,100)
    && (v.diaCargaRover===null || numero(v.diaCargaRover,1,9))
    && (v.eventoEm===null || numero(v.eventoEm,0,3600)) && numero(v.diasCalmos,0,100) && (v.tempoCalmo===undefined || numero(v.tempoCalmo,0,1e6));
}
export function lerPartida(): DadosPartida | null {
  try { const v: unknown = JSON.parse(localStorage.getItem(CHAVE) ?? 'null'); return valido(v) ? v : null; }
  catch { return null; }
}
export function gravarPartida(v: DadosPartida): boolean {
  try { localStorage.setItem(CHAVE,JSON.stringify(v)); return true; } catch { return false; }
}
export function apagarPartida() { try { localStorage.removeItem(CHAVE); } catch { /* optional browser storage */ } }
