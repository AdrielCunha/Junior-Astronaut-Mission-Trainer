// Shared pixel-rounded HUD grid, including the wrapped header on narrow screens.
export function calcularLayoutHud(largura: number, altura: number, escala: number) {
  const u = Math.min(escala, largura / 560);
  const px = (n: number) => Math.round(n * u);
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
  const zoom = Array.from({ length: 3 }, (_, i) => caixa(centroZoom - lado / 2, zoomY + i * passo, lado, lado));
  const nivel = caixa(largura - margem - nivelW, zoomY + zoomAltura + espaco, nivelW, nivelH);
  const fimDia = caixa(largura - margem - px(128), altura - margem - lado, px(128), lado);
  const dicasW = px(570), dicasCompactas = dicasW + espaco > fimDia.x - margem;
  const abaW = px(24), painelW = dicasCompactas ? Math.min(px(260), util - abaW) : dicasW;
  const painelH = dicasCompactas ? px(148) : lado;
  const dicasPainel = caixa(margem, fimDia.y + lado - painelH, painelW, painelH);
  const dicasAba = caixa(painelW - abaW, painelH - lado, abaW, lado);
  const dicas = caixa(margem, fimDia.y, dicasCompactas ? abaW : dicasW, lado);
  const dicasFechadasX = margem - dicasAba.x;
  return { u, margem, espaco, titulo, faixa, menu, recursos, capsula, objetivo, zoom, nivel, fimDia, dicas, dicasCompactas, dicasPainel, dicasAba, dicasFechadasX };

}
