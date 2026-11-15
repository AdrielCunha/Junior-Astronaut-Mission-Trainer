// The Moon stores its daily batteries beside the solar array. Mars keeps its lander.
export function origemBaterias(mundo: 'lua' | 'marte'): 'bateria' | 'habitat' {
  return mundo === 'lua' ? 'bateria' : 'habitat';
}

export function modeloBancoBaterias(restantes: number, explorando: boolean): `bateria_carga${number}` {
  const carga = explorando ? 5 : Math.max(0, Math.min(5, Math.floor(restantes)));
  return `bateria_carga${carga}`;
}
