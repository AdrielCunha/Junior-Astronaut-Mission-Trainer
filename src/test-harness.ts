import { type Alocacao, type Config, type DadosDoDia, type Estado, nenhuma } from './regras.ts';

export type EventoTeste = 'nenhum' | 'tempestade' | 'queda-oxigenio' | 'capitulo';

export type EstadoTeste = {
  capitulo: number;
  dia: number;
  estado: Estado;
  evento: EventoTeste;
  dados: DadosDoDia;
};

export type ParamEvento = {
  tipo: EventoTeste;
  nivel?: number;
  frio?: number;
  oxigenio?: number;
  dose?: number;
  meta?: number;
};

const limitar = (valor: number) => Math.max(0, Math.min(100, valor));

export function forcarEvento(base: EstadoTeste, evento: ParamEvento): EstadoTeste {
  const proximo: EstadoTeste = {
    ...base,
    evento: evento.tipo,
    dados: {
      nivel: evento.nivel ?? base.dados.nivel,
      frio: evento.frio ?? base.dados.frio,
    },
  };

  if (evento.tipo === 'tempestade') {
    const nivel = evento.nivel ?? 0;
    proximo.estado = {
      ...proximo.estado,
      dose: limitar(proximo.estado.dose + nivel * 10),
    };
  }

  if (evento.tipo === 'queda-oxigenio') {
    const perda = evento.oxigenio ?? 10;
    proximo.estado = {
      ...proximo.estado,
      oxigenio: Math.max(0, proximo.estado.oxigenio - perda),
    };
  }

  if (evento.tipo === 'capitulo') {
    proximo.estado = {
      ...proximo.estado,
      meta: Math.max(100, proximo.estado.meta),
    };
  }

  return proximo;
}

export function gerarPlanoAutomacao(c: Config, e: Estado, dados: DadosDoDia): Alocacao {
  const alvo = {
    oxigenio: Math.max(0, Math.ceil((5 - e.oxigenio + c.oxigenioPorNoite + (dados.frio ?? 0) * 10) / c.oxigenioPorBateria)),
    blindagem: Math.max(0, (dados.nivel ?? 0) - 1),
    meta: c.metaPorBateria > 0 ? Math.max(0, Math.ceil((100 - e.meta) / c.metaPorBateria)) : 0,
    aquecimento: Math.max(0, dados.frio ?? 0),
  };

  const plano = nenhuma();
  let restante = c.bateriasPorDia;

  plano.oxigenio = Math.min(Math.max(1, alvo.oxigenio), restante);
  restante -= plano.oxigenio;

  const ordem: Array<keyof Alocacao> = ['blindagem', 'aquecimento', 'meta'];
  for (const efeito of ordem) {
    const uso = Math.min(alvo[efeito], restante);
    plano[efeito] = uso;
    restante -= uso;
  }

  if (restante > 0 && plano.meta < alvo.meta) plano.meta += restante;
  return plano;
}

export function proximoCapitulo(base: EstadoTeste, proximoNumero: number): EstadoTeste {
  const prox = Math.min(base.capitulo + 1, proximoNumero || base.capitulo + 1);
  return {
    capitulo: prox,
    dia: 1,
    evento: 'capitulo',
    dados: { nivel: 0, frio: 0 },
    estado: {
      ...base.estado,
      dia: 1,
      oxigenio: 60,
      meta: 0,
      dose: base.estado.dose,
      obras: {},
    },
  };
}
