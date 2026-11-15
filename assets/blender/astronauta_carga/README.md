# Astronauta carregando bateria

Pose com braços dobrados à frente, mãos nas laterais da bateria e bateria presa ao mesmo tronco que move os braços. O modelo gira em oito direções com profundidade real, incluindo as vistas de costas.

- `astronauta_segurando_bateria.blend`: pose 3D editável do traje Commander.
- `pose_carga.png`: prévia ampliada da pose.
- `oito_direcoes.png`: conferência das oito direções do sprite.
- `tools/lua3d/make_astronaut_carry.py`: gerador dos seis trajes, com nove quadros por direção.

Os sprites `public/lua/astronaut_carga_<traje>.png` usam exatamente a câmera, o tamanho de quadro e a âncora dos pés do astronauta original. O jogo troca a folha inteira durante o carregamento; não sobrepõe uma bateria flutuante. No rover, volta ao sprite normal para preservar a pose sentada. O contador de inventário continua separado acima do capacete.
