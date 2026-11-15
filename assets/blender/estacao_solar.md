# Estação solar lunar

Estudo de modelo para o jogo: seis painéis em duas fileiras de três e um banco lateral com cinco baterias removíveis, alinhadas em uma única fila.

- `estacao_solar.blend`: cena editável, com coleções separadas para painéis, baterias, cabos, fundações e apresentação.
- `estacao_solar.png`: imagem de apresentação do conjunto.
- `../../tools/lua3d/make_solar_station.py`: gerador da cena em Python para Blender 5.2.

Os painéis possuem células individuais, trilhas coletoras, cantos protegidos, articulações, bases aparafusadas e cabos até o controlador. Cada bateria tem seu próprio encaixe, alça, contatos de carga e mostrador.

Os objetos `Bateria 01 | removivel` até `Bateria 05 | removivel` agrupam cada cartucho. O corredor junto aos indicadores de encaixe fica livre para a futura interação do astronauta.

O conjunto está integrado à base lunar. No mapa, os seis painéis ficam em duas fileiras verticais de três, com o banco à direita, um pouco mais à frente e à esquerda da posição inicial e ainda atrás do Life Support. O posicionamento procura uma área adequada no relevo real e mantém corredores de circulação.

Na Lua, as baterias diárias são coletadas no banco por clique ou pela tecla E quando o astronauta está perto. O banco mostra de zero a cinco cartuchos conforme o estoque. A exploração mostra o conjunto completo; a quantidade disponível na missão continua seguindo as regras diárias. Em Marte, a coleta continua no módulo de pouso.

`export_solar_station.py` exporta o painel e os seis estados do banco na mesma projeção do terreno. Execute `npm run assets:solar` com o executável `blender` no PATH, ou chame o Blender pelo caminho completo. A exportação usa o `.blend` aprovado e atualiza `src/dados/modulos.json`; o gerador da cena não precisa ser executado novamente.
