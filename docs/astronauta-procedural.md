# Explorer 3D — skin com animação procedural

## Como selecionar

Abra **Menu → Settings → Astronaut suit** e escolha **Explorer 3D** (Explorador 3D
em português), a amostra ciano identificada por `3D`. A configuração da tela inicial
mostra a mesma skin. O seletor **Astronaut skin** em Video & comfort também funciona.

A escolha é salva em `lunar-odyssey-video.skin = "procedural"` e passa a valer ao
retornar ao mapa. Commander continua sendo o padrão. Os seis trajes renderizados
continuam disponíveis; o personagem procedural é a sétima skin, sem uma segunda
opção independente de animação. Preferências do experimento antigo que tinham
`animacao: "procedural"` são migradas para essa skin.

Se WebGL, o carregamento das malhas ou o contexto gráfico falhar, a skin usa os
sprites existentes do Commander. No rover, ela também usa o Commander sentado.
`SKINS_SPRITES` mantém apenas os seis conjuntos de arquivos originais: nenhuma
folha inexistente `astronaut_carga_procedural.png` é solicitada e as texturas de
fallback não são carregadas duas vezes.

## Comportamento final

- **Lua:** apoios alternados, com uma perna recolhida enquanto a outra sustenta o
  corpo. Pequenos voos visuais seguem um arco de gravidade lunar reproduzido 3,2×
  mais rápido. Durante o apoio, posição e orientação da sola ficam ancoradas no
  mundo. Ao parar, a outra bota baixa e registra um único contato adicional.
- **Marte:** caminhada articulada, com cinemática inversa nos joelhos e cotovelos.
- **Nave:** botas com proteção metálica e indicador de ímã. A sequência destrava,
  ergue, avança e fixa uma bota antes da troca de apoio. Na velocidade de jogo, a
  cadência e a transferência de apoio são encurtadas para preservar o deslocamento.
- **Salto manual:** a física continua determinando altura, duração e colisões;
  o modelo acompanha subida, recolhimento, descida e absorção do pouso. A preparação
  completa antes do impulso pode ser examinada no laboratório, sem atrasar o input
  de salto da missão.
- **Carga:** até cinco baterias 3D empilhadas nas duas mãos, com encaixes, entrada
  visual de cada módulo e oscilação amortecida. Mãos e base da pilha compartilham a
  transformação. O inventário e o contador continuam usando a quantidade real;
  a representação não impõe um novo limite às regras do jogo.

A projeção do personagem usa os vetores `ex`, `ey` e `ez` do terreno. Direita,
esquerda, altura e orientação da câmera correspondem aos eixos isométricos do mapa.
Pegadas, poeira e som na Lua vêm do mesmo evento de contato, na posição da sola:
não se geram marcas por distância durante o voo visual. Na nave não há pegadas
nem poeira; os sons de soltar/fixar o ímã seguem a animação. Todos os sons respeitam
volume e mudo de **Sound Effects**.

A velocidade final da nave é a original: **3,2 tiles/s**, aceleração **14**. O perfil
magnético usa freio **32** para reduzir a continuação do movimento ao soltar a tecla.
Esses valores são próprios do mundo da nave e independem da skin selecionada. Lua
e Marte usam o perfil normal.

## Modelo e renderização

O gerador reaproveita a geometria do capacete, tronco, painel e mochila de
`tools/lua3d/make_astronaut.py`. Braços e pernas foram articulados com juntas,
proteções e bordas arredondadas. O arquivo Blender e o GLB têm **16 ossos**, pesos
rígidos de articulação, cinco baterias e os grupos opcionais de botas magnéticas.

O runtime não carrega o GLB: usa `public/lab/astronauta-modelo.json`, com vértices,
normais suaves, materiais, contornos e grupos articulados. WebGL mantém a geometria
em buffers estáticos e atualiza as transformações dos grupos; não há dependência
3D adicional. A imagem é copiada para uma textura Phaser de 192 × 192, mantendo
posição dos pés, escala, profundidade, sombra e oclusão do personagem na cena.

As malhas só são solicitadas quando a skin procedural é selecionada. A qualidade
Low usa frequências menores; contatos ancorados podem forçar uma atualização para
acompanhar a posição do corpo. Não houve medição de FPS em hardware real nesta
integração: o modo clássico permanece disponível para comparação e dispositivos leves.

Arquivos de referência:

| Arquivo | Uso |
|---|---|
| `assets/blender/astronauta_lab/astronauta_baterias.blend` | Fonte Blender, rig e materiais |
| `public/lab/astronauta-modelo.json` | Malhas usadas pelo jogo |
| `public/lab/astronauta-procedural.glb` | Personagem com rig para inspeção externa |
| `public/lab/bateria-empilhavel.glb` | Bateria isolada |
| `public/lab/modelo-relatorio.json` | Contagem de ossos e grupos exportados |
| `public/lab/previa-astronauta-polido.png` | Render estático de revisão |

O arquivo-fonte mantém o acabamento e o contorno do original em Eevee. Nas imagens
de revisão geradas por CPU, o contorno invertido fica transparente para evitar a
diferença de culling do Cycles; isso não altera as malhas usadas em WebGL.

## Organização

- `src/dados/skins.ts`: catálogo, identificação da skin e fallback de texturas.
- `src/astronauta/emJogo.ts`: carregamento sob demanda, ponte com Phaser, seleção,
  sincronização com a física e descarte dos recursos ao encerrar a cena.
- `src/astronauta/movimento.ts`, `pose.ts`: salto, carga e poses articuladas.
- `src/astronauta/locomocao.ts`, `magnetica.ts`: projeção e apoios de cada ambiente.
- `src/astronauta/renderizador.ts`: buffers WebGL, iluminação e materiais.
- `src/engine/pegadas.ts`, `src/cenas/ambiente.ts`: marcas provenientes da sola.
- `src/engine/fisica.ts`, `src/cenas/sessao.ts`: perfil magnético da nave.

## Gerar e validar

```sh
npm test
npm run build
npm run lab:test
npm run lab:build
npm run lab:smoke
npm run lab:assets
```

`lab:assets` exige Blender e gera as malhas, fontes e imagens sem sobrescrever os
sprites originais. `lab:smoke` executa o bundle do laboratório com Canvas gravado:
verifica carregamento, quantidades de zero a cinco, caminhada, salto e coordenadas
finitas. Ele não substitui uma conferência visual de WebGL no navegador. Os testes
cobrem seleção e migração da skin, fallback, ausência de downloads no modo clássico,
eixos isométricos, apoio alternado, pegadas, ímãs, velocidade e frenagem da nave.

Para conferir a cena separada, execute `npm run lab` e abra
`/laboratorio-astronauta.html`. A missão continua na raiz `/`. O build de diagnóstico
fica em `dist-lab/`; o build normal continua em `dist/`. As duas saídas são ignoradas
pelo Git. Veja também [o guia do laboratório](../src/dev/astronauta-lab/README.md).
