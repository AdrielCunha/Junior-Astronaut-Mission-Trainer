// Shared pixel-rounded HUD grid, Roblox style: no top bar. The title at the top left, the
// resource bars stacked at the top right, the objective centred on top, the battery counters in a
// column down the left side and the menu + zoom buttons down the right side.
export function calcularLayoutHud(largura: number, altura: number, escala: number) {
  const u = Math.min(escala, largura / 560);
  const px = (n: number) => Math.round(n * u);
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
  const nivel = caixa(largura - margem - nivelW, zoomY + zoomAltura + espaco, nivelW, nivelH);
  const fimDia = caixa(largura - margem - px(128), altura - margem - lado, px(128), lado);
  const dicasW = px(570), dicasCompactas = dicasW + espaco > fimDia.x - margem;
  const abaW = px(24), painelW = dicasCompactas ? Math.min(px(260), util - abaW) : dicasW;
  const painelH = dicasCompactas ? px(148) : lado;
  const dicasPainel = caixa(margem, fimDia.y + lado - painelH, painelW, painelH);
  const dicasAba = caixa(painelW - abaW, painelH - lado, abaW, lado);
  const dicas = caixa(margem, fimDia.y, dicasCompactas ? abaW : dicasW, lado);
  const dicasFechadasX = margem - dicasAba.x;
  return { u, margem, espaco, titulo, faixa, menu, recursos, capsula, objetivo, avisoY, zoom, nivel, editar, fimDia, dicas, dicasCompactas, dicasPainel, dicasAba, dicasFechadasX };
}
