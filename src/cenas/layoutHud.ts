// Shared pixel-rounded HUD grid, including the wrapped header on narrow screens.
import { dispositivoMovel } from '../mobile';

export function calcularLayoutHud(largura: number, altura: number, escala: number) {
  const movel = dispositivoMovel() && largura > altura;
  const u = Math.min(escala, largura / 560);
  const px = (n: number) => Math.round(n * u);
  if (movel) {
    const margem = px(10), espaco = px(6);
    const lado = px(38), entreCirculos = px(14);
    // Keep the main meters centered while leaving room for the menu and END DAY on the right.
    const maximoGrupo = largura - 2 * (margem + lado + espaco);
    const diametro = Math.min(px(58), Math.floor((maximoGrupo - 2 * entreCirculos) / 3));
    const larguraObjetivo = Math.min(px(320), largura - 2 * (margem + lado + espaco));
    const objetivo = { x: Math.round((largura - larguraObjetivo) / 2), y: margem, w: larguraObjetivo, h: px(38) };
    const topo = objetivo.y + objetivo.h + espaco;
    const menu = { x: largura - margem - lado, y: margem, w: lado, h: lado };
    const titulo = { x: margem, y: topo, w: 0, h: 0 };
    const larguraGrupo = 3 * diametro + 2 * entreCirculos;
    const recursos = Array.from({ length: 3 }, (_, i) => ({ x: Math.round((largura - larguraGrupo) / 2) + i * (diametro + entreCirculos), y: topo, w: diametro, h: diametro }));
    const faixa = { x: 0, y: 0, w: largura, h: topo + diametro + px(22) };
    const diametroRecurso = Math.min(px(42), Math.floor((maximoGrupo - 4 * espaco) / 5));
    const larguraRecursos = 5 * diametroRecurso + 4 * espaco;
    const capsula = { x: Math.round((largura - larguraRecursos) / 2), y: altura - margem - px(24) - diametroRecurso, w: larguraRecursos, h: diametroRecurso };
    const gapMenu = px(20), larguraFimDia = px(116);
    const fimDia = { x: menu.x - gapMenu - larguraFimDia, y: margem, w: larguraFimDia, h: lado };
    const passo = lado + espaco;
    const zoomY = menu.y + menu.h + espaco;
    const zoom = Array.from({ length: 3 }, (_, i) => ({ x: largura - margem - lado, y: zoomY + i * passo, w: lado, h: lado }));
    const controles = { x: largura - margem - lado, y: zoomY + 3 * passo, w: lado, h: lado };
    const nivel = { x: controles.x - px(12), y: controles.y + controles.h + espaco, w: lado + px(12), h: px(28) };
    const dicasCompactas = true, painelW = Math.min(px(260), largura - 2 * margem), abaW = px(24), painelH = px(148);
    const dicasPainel = { x: margem, y: Math.max(objetivo.y + objetivo.h + espaco, Math.round(altura * 0.5)), w: painelW, h: painelH };
    const dicasAba = { x: painelW - abaW, y: painelH - lado, w: abaW, h: lado };
    const dicas = { x: margem, y: dicasPainel.y, w: abaW, h: lado };
    return { u, margem, espaco, titulo, faixa, menu, recursos, capsula, objetivo, zoom, controles, nivel, fimDia, dicas, dicasCompactas, dicasPainel, dicasAba, dicasFechadasX: margem - dicasAba.x };
  }
  const margem = px(12), espaco = px(8), h1 = px(52), h2 = px(34);
  const util = largura - 2 * margem;
  const caixa = (x: number, y: number, w: number, h: number) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
  const lado = px(38), passo = lado + espaco;
  const estreito = util < px(960);
  const tituloH = px(60);
  const titulo = caixa(margem, margem + (h1 - tituloH) / 2, px(300), tituloH);
  const menu = caixa(largura - margem - lado, margem + Math.round((h1 - lado) / 2), lado, lado);
  const inicio = estreito ? margem : titulo.x + titulo.w + espaco;
  const fim = estreito ? largura - margem : menu.x - espaco;
  const topo = estreito ? margem + h1 + espaco : margem;
  const recursos = Array.from({ length: 3 }, (_, i) => {
    const x = Math.round(inicio + i * (fim - inicio + espaco) / 3);
    const direita = Math.round(inicio + (i + 1) * (fim - inicio + espaco) / 3) - espaco;
    return caixa(x, topo, direita - x, h1);
  });
  const faixa = caixa(0, 0, largura, topo + h1 + margem);
  const linha2 = faixa.h + espaco;
  const capsulaW = estreito ? Math.round((util - espaco) * 0.53) : px(300);
  const capsula = caixa(largura - margem - capsulaW, linha2, capsulaW, h2);
  const objetivo = caixa(margem, linha2, Math.min(px(360), Math.round(largura * 0.35), capsula.x - margem - espaco), h2);
  const zoomAltura = 3 * lado + 2 * espaco;
  const zoomY = Math.round((altura - zoomAltura) / 2);
  const nivelW = px(64), nivelH = px(28);
  const centroZoom = largura - margem - nivelW / 2;
  const zoomInicio = zoomY;
  const zoom = Array.from({ length: 3 }, (_, i) => caixa(centroZoom - lado / 2, zoomInicio + i * passo, lado, lado));
  const nivel = caixa(largura - margem - nivelW, zoomInicio + zoomAltura + espaco, nivelW, nivelH);
  const controles = caixa(zoom[2].x, zoom[2].y + passo, lado, lado);
  const fimDia = caixa(largura - margem - px(128), altura - margem - lado, px(128), lado);
  const dicasW = px(570), dicasCompactas = dicasW + espaco > fimDia.x - margem;
  const abaW = px(24), painelW = dicasCompactas ? Math.min(px(260), util - abaW) : dicasW;
  const painelH = dicasCompactas ? px(148) : lado;
  const dicasPainel = caixa(margem, fimDia.y + lado - painelH, painelW, painelH);
  const dicasAba = caixa(painelW - abaW, painelH - lado, abaW, lado);
  const dicas = caixa(margem, fimDia.y, dicasCompactas ? abaW : dicasW, lado);
  const dicasFechadasX = margem - dicasAba.x;
  return { u, margem, espaco, titulo, faixa, menu, recursos, capsula, objetivo, zoom, controles, nivel, fimDia, dicas, dicasCompactas, dicasPainel, dicasAba, dicasFechadasX };

}
