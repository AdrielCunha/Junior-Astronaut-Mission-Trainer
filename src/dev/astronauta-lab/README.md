# Laboratório do astronauta procedural

Cena de inspeção separada da missão, sem acesso a inventário ou salvamento.
A integração no jogo é a skin **Explorer 3D**, descrita em
[docs/astronauta-procedural.md](../../../docs/astronauta-procedural.md).

```sh
npm run lab -- --host 0.0.0.0 --port 5174 --strictPort
```

Abra `/laboratorio-astronauta.html`. O Vite da missão pode continuar em outra porta.

- WASD/setas: mover; Caminhar: demonstração no lugar.
- Espaço: preparação, impulso, voo e pouso do salto.
- 0–5 ou botões: empilhar/retirar baterias.
- Lua/Marte/Nave: comparar os modos de locomoção e as botas magnéticas.
- Arrastar/scroll: orbitar/aproximar; Isométrica: voltar à projeção 45°/30°.
- Velocidade: variar o tempo da demonstração inteira, incluindo a física do laboratório.

O modo WebGL usa o mesmo modelo, poses e iluminação do jogo. Sem WebGL, o laboratório
usa Canvas para inspecionar a geometria; na missão, o fallback são sprites. As imagens
produzidas pelo renderer Canvas são diagnósticas e não representam a suavidade da GPU.

```sh
npm run lab:test
npm run lab:build
npm run lab:smoke
npm run lab:assets
```

O build isolado fica em `dist-lab/`. O gerador requer Blender e reaproveita a geometria
do astronauta original, mantendo os sprites. Para gerar prévias a partir do Canvas:

```sh
LAB_CAPTURE=1 npm run lab:smoke
python3 tools/preview_astronaut_lab.py
```

O segundo comando exige Pillow. GIFs e quadros de diagnóstico podem ser regenerados;
o commit inclui apenas os modelos e renders estáticos atuais.
