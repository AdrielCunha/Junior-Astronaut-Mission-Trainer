# Otimização do mapa da nave

O problema foi reproduzido no Chrome headless com GPU AMD, viewport 1366 × 768, `?hd`, efeitos e movimento completos, sem redução artificial da CPU. Medição em servidor Vite local; estes números não representam todos os computadores ou celulares.

| Cenário | Antes, FPS | Depois, FPS | Antes, p95 | Depois, p95 |
|---|---:|---:|---:|---:|
| Nave parada | 14,2 | 50,2 | 110,1 ms | 30,1 ms |
| Caminhando na nave | 14,3 | 58,6 | 100 ms | 30 ms |

Durante a caminhada, a proporção de quadros acima de 50 ms caiu de 84,7% para 0% nesta amostra de cinco segundos. O caminho é automatizado e limitado pelas colisões; não representa uma campanha completa. O FPS é calculado pelos intervalos de requestAnimationFrame.

Diagnóstico: o céu da nave redesenhava 364 estrelas/nuvens usando Graphics e os seis propulsores redesenhavam centenas de círculos a cada quadro. Desativar apenas o céu elevou o FPS inicial para 18; desativar apenas os propulsores, para 20,7. Ambos contribuíam para o custo. Agora as formas são rasterizadas uma vez em texturas reutilizadas; apenas posição, seleção de rastro e intensidade mudam. As imagens dos propulsores têm margens transparentes reduzidas. O céu continua com parallax e respeita movimento reduzido.

O movimento da nave descartava o tempo acima de 50 ms por quadro, contribuindo para a sensação de câmera lenta. Agora usa o intervalo real limitado a 100 ms; a física subdivide intervalos acima de 1/30 s em passos de até 1/60 s, mantendo colisões e evitando repetir um pulo dentro do mesmo quadro. A recuperação após suspensão da aba permanece limitada. O cálculo de tempo dos outros mapas foi preservado.

Validação: 283 testes aprovados, incluindo deslocamento equivalente a 10/15/20/30/60 FPS, bloqueio por parede fina e recuperação limitada após suspensão. Evidências: `nave-antes.json`, `nave-final.json`, `nave-final.png`. A captura foi feita durante a medição, antes da remoção do contador temporário.

Reprodução:

```powershell
node tools/dev/medir_missao.mjs 'http://127.0.0.1:5173/?hd' 1 1366x768 performance/2026-11-15/nave-final.json full --somente-nave --capturar
```

Comparar as primeiras duas amostras, com todos os efeitos ativos. As duas seguintes desligam componentes individualmente para diagnóstico. Repetir no equipamento do jogador andando pela nave e alternando o zoom. O contador temporário de FPS foi removido da interface a pedido do jogador.
