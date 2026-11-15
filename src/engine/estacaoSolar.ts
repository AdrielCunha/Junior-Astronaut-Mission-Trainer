// The Moon stores its daily batteries beside the solar array. Mars keeps its lander.
// Where the day's batteries charge: the Battery Bank on the Moon and on the ship (its Power
// Room), the lander on Mars.
export function origemBaterias(mundo: 'lua' | 'marte' | 'nave'): 'bateria' | 'habitat' {
  return mundo === 'marte' ? 'habitat' : 'bateria';
}

export function modeloBancoBaterias(restantes: number, explorando: boolean): `bateria_carga${number}` {
  const carga = explorando ? 5 : Math.max(0, Math.min(5, Math.floor(restantes)));
  return `bateria_carga${carga}`;
}
