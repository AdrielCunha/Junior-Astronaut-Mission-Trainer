// Shared pixel-rounded HUD grid, Roblox style: no top bar. The title at the top left, the
// resource bars stacked at the top right, the objective centred on top, the battery counters in a
// column down the left side and the menu + zoom buttons down the right side. Phones in landscape get
// their own compact grid (round meters on top, counters at the bottom, joystick and buttons: mobile.ts).
import { dispositivoMovel } from '../mobile';

export function calcularLayoutHud(largura: number, altura: number, escala: number) {
  const movel = dispositivoMovel() && largura > altura;
  const u = Math.min(escala, largura / 560);
  const px = (n: number) => Math.round(n * u);
  if (movel) {
    const margem = px(10), espaco = px(6);
    const lado = px(38), entreCirculos = Math.max(16, px(14));
    // The resource rings sit to the left of the objective, on the same top row.
    const maximoGrupo = largura - 2 * (margem + lado + espaco);
    const diametro = Math.min(px(58), Math.floor((maximoGrupo - 2 * entreCirculos) / 3));
    const menu = { x: largura - margem - lado, y: margem, w: lado, h: lado };
    // A slightly more compact END DAY, centred on the same line as the objective.
    const escalaFim = Math.max(u, 1), larguraFimDia = Math.round(116 * escalaFim), alturaFimDia = Math.round(34 * escalaFim);
    const fimDia = { x: menu.x - px(20) - larguraFimDia, y: margem + Math.round((diametro - alturaFimDia) / 2), w: larguraFimDia, h: alturaFimDia };
    menu.y = fimDia.y + Math.round((fimDia.h - menu.h) / 2);
    const larguraGrupo = 3 * diametro + 2 * entreCirculos;
    const espacoRecursos = Math.max(30, px(32));
    const inicioObjetivo = margem + larguraGrupo + espacoRecursos;
    // Centre on the screen while keeping clear of the meters and END DAY.
    const larguraObjetivo = Math.max(0, Math.min(px(320), largura - 2 * inicioObjetivo, 2 * (fimDia.x - espaco) - largura));
    const alturaObjetivo = px(38);
    const objetivo = { x: Math.round((largura - larguraObjetivo) / 2), y: margem + Math.round((diametro - alturaObjetivo) / 2), w: larguraObjetivo, h: alturaObjetivo };
    const inicioRecursos = objetivo.x - espacoRecursos - larguraGrupo;
    const recursos = Array.from({ length: 3 }, (_, i) => ({ x: inicioRecursos + i * (diametro + entreCirculos), y: margem, w: diametro, h: diametro }));
    const titulo = { x: margem, y: margem, w: 0, h: 0 };
    const faixa = { x: 0, y: 0, w: largura, h: Math.max(margem + diametro + px(22), fimDia.y + fimDia.h, objetivo.y + objetivo.h) + espaco };
    const espacoInferior = Math.max(8, px(12));
    const diametroRecurso = Math.min(px(42), Math.floor((maximoGrupo - 4 * espacoInferior) / 5));
    const larguraRecursos = 5 * diametroRecurso + 4 * espacoInferior;
    const capsula = { x: Math.round((largura - larguraRecursos) / 2), y: altura - margem - px(24) - diametroRecurso, w: larguraRecursos, h: diametroRecurso };
    const espacoLateral = Math.max(8, px(12)), passo = lado + espacoLateral;
    const zoomY = menu.y + menu.h + espacoLateral;
    const zoom = Array.from({ length: 3 }, (_, i) => ({ x: largura - margem - lado, y: zoomY + i * passo, w: lado, h: lado }));
    const controles = { x: largura - margem - lado, y: zoomY + 3 * passo, w: lado, h: lado };
    const editar = { x: largura - margem - lado, y: zoomY + 4 * passo, w: lado, h: lado };
    const nivel = { x: controles.x - px(12), y: controles.y + controles.h + espaco, w: lado + px(12), h: px(28) };
    const avisoY = faixa.y + faixa.h + espaco;   // notices and the guide pill go under the round meters
    const dicasCompactas = true, painelW = Math.min(px(260), largura - 2 * margem), abaW = px(24), painelH = px(148);
    const dicasPainel = { x: margem, y: Math.max(objetivo.y + objetivo.h + espaco, Math.round(altura * 0.5)), w: painelW, h: painelH };
    const dicasAba = { x: painelW - abaW, y: painelH - lado, w: abaW, h: lado };
    const dicas = { x: margem, y: dicasPainel.y, w: abaW, h: lado };
    return { u, margem, espaco, titulo, faixa, menu, recursos, capsula, objetivo, avisoY, zoom, controles, nivel, editar, fimDia, dicas, dicasCompactas, dicasPainel, dicasAba, dicasFechadasX: margem - dicasAba.x };
  }
  const margem = px(12), espaco = px(8), h1 = largura<680 ? Math.max(52,px(52)) : px(52), h2 = px(34);
  const caixa = (x: number, y: number, w: number, h: number) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
  const lado = px(38), passo = lado + espaco;
  const util = largura - 2 * margem;
  // Top left: the logo with the date.
  const titulo = caixa(margem, margem, largura<680 ? Math.max(150,Math.round(util*0.4)) : Math.min(px(220), Math.round(util * 0.4)), h1);
  // Top right: one slim bar per resource, stacked.
  const recursoW = Math.min(px(230), Math.round(util * 0.42)), recursoH = px(48), recursoGap = px(6);
  const recursos = Array.from({ length: 3 }, (_, i) =>
    caixa(largura - margem - recursoW, margem + i * (recursoH + recursoGap), recursoW, recursoH));
  const fimRecursos = recursos[2].y + recursoH;
  // Objective: centred between the title and the bars, or under the title when there is no room.
  const livre = recursos[0].x - (titulo.x + titulo.w) - 2 * espaco;
  const estreito = livre < px(220);
  const objetivoW = estreito ? Math.min(px(360), recursos[0].x - margem - espaco) : Math.min(px(360), livre);
  const objetivo = estreito
    ? caixa(margem, titulo.y + h1 + espaco, objetivoW, h2)
    : caixa(Math.round((largura - objetivoW) / 2), margem + Math.round((h1 - h2) / 2), objetivoW, h2);
  // Left column: the five battery counters, one per row.
  const capsulaLinha = px(40);
  const capsula = caixa(margem, (estreito ? objetivo.y + h2 : titulo.y + h1) + espaco, px(72), 5 * capsulaLinha);
  // Area covered by the top HUD: arrows and notices stay below it.
  const faixa = caixa(0, 0, largura, Math.max(objetivo.y + h2, titulo.y + h1) + margem);
  const avisoY = estreito ? fimRecursos + espaco : objetivo.y + h2 + px(10);
  // Right column: the menu button on top of the three zoom buttons.
  const zoomAltura = 5 * lado + 4 * espaco;
  const zoomY = Math.max(Math.round((altura - zoomAltura) / 2), fimRecursos + 2 * espaco);
  const nivelW = px(64), nivelH = px(28);
  const centroZoom = largura - margem - nivelW / 2;
  const menu = caixa(centroZoom - lado / 2, zoomY, lado, lado);
  const zoom = Array.from({ length: 3 }, (_, i) => caixa(centroZoom - lado / 2, zoomY + (i + 1) * passo, lado, lado));
  const editar = caixa(centroZoom - lado / 2, zoomY + 4 * passo, lado, lado);
  // Touch-only Controls button: the desktop HUD never creates it, so it reuses the editor slot.
  const controles = editar;
  const nivel = caixa(largura - margem - nivelW, zoomY + zoomAltura + espaco, nivelW, nivelH);
  const fimDia = caixa(largura - margem - px(128), altura - margem - lado, px(128), lado);
  const dicasW = px(570), dicasCompactas = dicasW + espaco > fimDia.x - margem;
  const abaW = px(24), painelW = dicasCompactas ? Math.min(px(260), util - abaW) : dicasW;
  const painelH = dicasCompactas ? px(148) : lado;
  const dicasPainel = caixa(margem, fimDia.y + lado - painelH, painelW, painelH);
  const dicasAba = caixa(painelW - abaW, painelH - lado, abaW, lado);
  const dicas = caixa(margem, fimDia.y, dicasCompactas ? abaW : dicasW, lado);
  const dicasFechadasX = margem - dicasAba.x;
  return { u, margem, espaco, titulo, faixa, menu, recursos, capsula, objetivo, avisoY, zoom, controles, nivel, editar, fimDia, dicas, dicasCompactas, dicasPainel, dicasAba, dicasFechadasX };
}
