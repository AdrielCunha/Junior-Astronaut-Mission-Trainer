# Rover: personagens sentados em 16 direções

As 12 skins com sprites usam uma folha sentada de **192 × 3072 px**: uma coluna,
16 linhas, uma imagem a cada 22,5°. Explorer 3D utiliza a folha do Commander enquanto
o personagem dirige. As folhas de caminhada e de transporte de baterias permanecem
as mesmas.

O gerador reutiliza os personagens de `make_astronaut.py` e `personagens_extra.py`.
O rover de `make_lrv.py` entra como holdout: a folha do motorista já contém os recortes
onde banco, rodas, controles e antenas passam à frente do corpo. Assim, o motorista
acompanha a direção desenhada e a suspensão do veículo sem exigir uma nova malha ou
renderização 3D a cada frame do jogo.

Para regenerar o recorte e todas as skins (Blender e ImageMagick):

```sh
LRV_BLEND=tools/lua3d/.cache/lrv_oclusor.blend blender -b -noaudio -P tools/lua3d/make_lrv.py
for skin in comandante robo alien gato urso coelho cachorro pinguim dino raposa unicornio panda; do
  SENTADO=1 SKIN="$skin" blender -b -noaudio --python-exit-code 1 -P tools/lua3d/make_astronaut.py || break
done
```

Em máquinas sem GPU exposta ao processo, Mesa/EGL pode renderizar o mesmo Eevee via
CPU: acrescente `LIBGL_ALWAYS_SOFTWARE=1 EGL_PLATFORM=surfaceless LP_NUM_THREADS=4`
ao ambiente. O resultado mantém câmera, materiais, iluminação, amostragem e recorte.
As renderizações intermediárias ficam em `tools/lua3d/.cache/`, ignorado pelo Git.

`src/dados/skins.test.ts` valida o tamanho das folhas de todas as skins selecionáveis.
`src/engine/rover.test.ts` cobre movimento, colisões e aproximação dos pontos da rota.
O jogo ainda aceita folhas antigas com oito direções, mas as skins deste catálogo
usam as 16 direções completas.

```sh
node --test src/dados/skins.test.ts src/engine/rover.test.ts
npm run build
```

## Recuperação automática de colisões

Um save restaurado ou uma estrutura movida pode deixar o rover dentro de um sólido.
Antes de dirigir, e também enquanto está estacionado, o jogo verifica sua posição
e procura solo livre próximo às laterais dos obstáculos. Cada destino é validado
contra todas as estruturas, os limites do mapa e a inclinação sob as rodas.

A recuperação mantém o jogador no mesmo veículo, zera as velocidades e ajusta a
altura ao terreno. A rota anterior é cancelada; o deslocamento corretivo não entra
no odômetro nem no giro das rodas. Funciona também sem bateria. Se as laterais
estiverem bloqueadas, tenta a última posição livre e uma busca no mapa. Sem destino
seguro, não coloca o veículo em outra colisão e limita a busca a uma vez por segundo.

## Astronauta e entrega de suprimentos

O astronauta também é retirado automaticamente de sólidos que surgirem sobre ele.
A recuperação respeita altura e mantém válidos os pousos e a caminhada sobre telhados.
Astronauta e rover compartilham a busca por uma saída, com os respectivos raios.

Durante toda a entrega, a área do módulo e a pegada central de 2 × 2 do foguete ficam
reservadas para colisão e navegação. Assim, o jogador não consegue voltar a caminhar
embaixo do veículo durante a descida ou a decolagem. A reserva termina quando o
foguete sai; as colisões do equipamento entregue continuam ativas.
