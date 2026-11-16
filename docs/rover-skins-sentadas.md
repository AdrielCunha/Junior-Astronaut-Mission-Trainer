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
