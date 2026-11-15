---
name: novo-item
description: Cria um novo item visual do Lunar Odyssey (módulo da base, equipamento de carga, estrutura, foguete) ou uma nova skin do astronauta, no estilo cartoon do jogo, renderizado em Blender. Use quando o usuário pedir um módulo/edifício/equipamento novo, quiser redesenhar um existente para combinar com o tema, ou pedir uma nova cor/skin do astronauta.
---

# Novo item visual (estilo cartoon do jogo)

Os sprites são renders isométricos de modelos 3D feitos por código em `tools/lua3d/`. Nada é desenhado
à mão: edite o script, renderize, confira a imagem. Texto visível ao jogador fica em inglês.

## 1. Identidade visual (siga sempre)
- **Corpo:** cinza-azulado claro `#cbd5e1` / `#e2e8f0` (paredes, tampas, estruturas).
- **Destaque:** laranja `#f97316` (bordas, saias, nervuras, pés) e `#fb923c` (variação). A sala tem a sua cor própria no
  jogo (blindagem = amarelo `#facc15`, suporte = azul): use essa cor como destaque no lugar do laranja.
- **Vidro / luzes:** ciano `#8ae8ff` (`visor`), claraboia `#38bdf8`, escuro `#1e293b` para portas e vãos,
  aço `#94a3b8` para mastros, hastes e ripas, bolinha vermelha `#ef4444` no topo de mastros.
- **Só cores claras.** A rampa toon multiplica a cor: marrom ou cinza escuro vira lama ao lado dos outros módulos.
- **Contorno grosso** (`linha` 0.02–0.03 nas peças grandes, 0.005–0.012 nos detalhes). Biséis pequenos (`bevel` 0.02–0.03).
- Base do módulo: `piso(w, h)` (deck claro). Exceções: blindagem (monte de regolito) e rover (móvel, sem piso).
- Referências prontas: `oficina()` (galpão), `habitat()`, `suporte()`, `plataforma()`, `foguete()`.

## 2. Geometria: armadilhas conhecidas
- Eixos do mapa: **X = gx, Y = −gy**. Um módulo de w×h tiles ocupa X 0..w, Y −h..0 (os helpers `caixa`, `cilindro`,
  `esfera`, `haste` já recebem gy positivo e invertem).
- A câmera só vê as faces **+gx (lado direito) e +gy (frente/esquerda)**. Porta, janelas e luzes vão nessas faces.
  Detalhe na face oposta fica escondido.
- **Não deixe o arco/abóbada aberto na frente.** Meio cilindro (`delete x<0`) perde as tampas: feche a ponta visível com
  uma empena (semidisco montado com `from_pydata`, ver `oficina()`).
- Apagar metade de um cilindro/esfera com `bmesh.ops.delete` também apaga a face da tampa.
- Andaimes e estruturas de construção devem ser **vazados** (molduras), senão escondem o que está dentro.
- Mantenha tudo dentro do footprint do tipo (`TIPOS` no script = `src/engine/construcao.ts`).

## 3. Passo a passo (módulo)
1. **Escolha o footprint** (w×h tiles) e a altura. Para tipo novo: adicione em `src/engine/construcao.ts` (`TipoId`,
   `TIPOS`, e `BASE_PADRAO`/`SETORES_SUPRIMENTOS` se aparecer sozinho) e em `TIPOS` de `tools/lua3d/make_modules.py`.
2. **Escreva `def nome():`** em `make_modules.py` com os helpers (`caixa`, `cilindro`, `esfera`, `haste`, `visor`, `lampada`,
   `piso`) e registre em `MODELOS`. Animação por frames: `ANIMADOS = {'nome': 3}` e use `FASE` (0..2) nas luzes.
3. **Renderize só o que mudou** (mantém as outras entradas do `modulos.json`):
   ```
   cd tools/lua3d
   MODULOS=nome "/c/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b -P make_modules.py
   ```
   (`MODULOS=a,b,c` renderiza vários; para animados inclua `nome_anim1,nome_anim2`.)
4. **Quantize para 255 cores** se o Blender não tiver ImageMagick/Pillow (o script avisa):
   ```
   python -c "from PIL import Image; f='public/lua/modulos/nome.png'; Image.open(f).quantize(255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(f)"
   ```
5. **Confira a imagem** (Read no PNG; para várias, monte uma folha de contato com Pillow num fundo `#b8bcc6` e compare
   com `oficina.png`/`habitat.png`). Procure: lado aberto, peça atravessando parede, cor suja, detalhe só na face escondida.
6. `npx tsc --noEmit` e `npm test`. O jogo carrega `public/lua/modulos/<id>.png` pelo `modulos.json` automaticamente.
7. Se o Chrome estiver conectado, abra o jogo (`npm run dev`) e veja o módulo no mapa. Se não, diga ao usuário que
   a conferência no jogo não foi feita.

## 4. Skin nova do astronauta
- Script: `tools/lua3d/make_astronaut.py`. Adicione uma entrada no dicionário `SKINS` (`suit`, `pack`, `accent`, `glint`,
  `boot`, cores claras) e a mesma entrada em `src/dados/skins.ts` (`id`, `nome` em inglês, `arquivo`, `cor`, `traje`).
- Renderize: `SKIN=<id> blender -b -P tools/lua3d/make_astronaut.py` → `public/lua/astronaut_<id>.png`
  (a skin `comandante` gera `astronaut.png` e o json). Quantize como acima.
- Renders em paralelo são seguros: cada skin usa sua própria pasta `.cache/astro_<id>`.
- Quadro de 192 px, folha de 9 colunas × 8 direções. Não mude tamanho/âncora numa skin só (todas usam `astronauta.json`).
- O seletor (engrenagem na tela inicial e "Video & comfort") lê a lista de `skins.ts`; o quadradinho usa `cor`.

## 5. Ao terminar
Resuma o que mudou, mostre a imagem final ao usuário e diga o que **não** foi verificado (por exemplo, o jogo no navegador).
Não faça commit sem o usuário pedir.
