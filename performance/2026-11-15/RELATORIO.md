# Fluidez e conclusão das tarefas — 15/11/2026

O projeto usa Phaser, TypeScript e Vite, com física própria em `engine/fisica.ts` e `engine/rover.ts`. Não usa Unreal, replicação ou multiplayer. As alterações estão nos arquivos do projeto; as regras dos quebra-cabeças e os recursos concedidos continuam nos módulos originais.

## Diagnóstico, por impacto

1. **Espera artificial ao concluir tarefas, confirmada.** Havia `this.time.delayedCall(2800, () => { this.scene.stop(); this.aoConcluir?.(); })` e variações entre 2300 e 3600 ms. `moldura.vitoria` aguardava 3200 ms; `CenaTarefa`, 3500 ms. Eram timers não bloqueantes: o atraso era intencional, mesmo com FPS alto. Agora todos usam `TEMPO_SUCESSO = 400`; os dois jogos do banco têm ainda 50 ms para confirmar sua animação final. As entradas dos banners passaram para 50 ms de espera + 200 ms de animação, cabendo no novo prazo.

2. **Fechamento durante o sucesso podia descartar a confirmação, confirmado pelo fluxo.** O X/Esc chamava apenas `scene.stop()`, cancelando o timer que chamaria `aoConcluir`. Dependendo de quem abriu a tarefa, isso podia tratar um sucesso como cancelamento. `conclusaoTarefa.ts` agora compartilha uma proteção entre sucesso, timer, X/Esc e shutdown. O callback é chamado uma vez; um cancelamento antes do sucesso mantém as regras originais. Cada reabertura recebe uma proteção nova.

3. **Reconstrução desnecessária dos rastros, confirmada no código.** `Ambiente.redesenharPegadas` limpava e reconstruía todas as marcas a cada segundo, inclusive antes de começarem a desaparecer. A medição inicial acumulou aproximadamente 790 marcas em 15 segundos de direção. Agora as marcas novas continuam sendo acrescentadas, mas a reconstrução só começa quando a mais antiga chega aos 40 segundos de idade, início do fade. O desaparecimento aos 60 segundos foi mantido. A reprodução vetorial de rastros longos continua sendo uma limitação a investigar em sessões maiores.

4. **Câmera dependente do FPS, confirmada.** `Linear(..., 0.12)` por frame muda a resposta da câmera conforme o monitor e as quedas de FPS. Agora usa `1 - Math.pow(1 - 0.12, dt * 60)`, preservando a resposta a 60 FPS e ajustando a outros intervalos. A orientação do rover recebeu a mesma correção exponencial; a rotação da nave na tarefa passou a usar `dt`.

5. **Atualizações visuais redundantes, confirmadas.** `desenharRover` reinstalava textura, origem e escala em todo frame; agora atualiza quando a direção muda ou o rover volta a aparecer. `fundoRotulo` reconstruía curvas/bordas mesmo quando apenas a posição mudava; agora conserva a geometria e move o fundo. A oclusão reutiliza um retângulo, e o cálculo de proximidade sonora evita um array temporário e uma raiz quadrada por prédio.

6. **Outros candidatos ainda são hipóteses.** O autosave usa `JSON.stringify` e `localStorage` síncronos a cada dois segundos; a lista de caixas de colisão também é reconstruída por frame. Não há medição isolada atribuindo os engasgos a eles. Confirmar com o painel Performance e pilhas de CPU antes de mudar persistência ou invalidação de colisões. A física já usa delta em segundos, limita o passo a 50 ms, e o rover subdivide colisões em deslocamentos pequenos. Não foi encontrado conflito entre duas engines de física nem uma justificativa para trocar todo o sistema de movimento.

## Auditoria das tarefas

Na coluna “antes”, **não** significa que o fluxo de conclusão precisava da redução de espera e da proteção de fechamento descritas acima; não significa que as regras do quebra-cabeça estavam incorretas. Todos os painéis passaram pelo teste de ciclo de vida no navegador após a correção.

| Tarefa | O que faz | Fluxo antes correto? | Correção aplicada |
|---|---|---|---|
| NaveTarefa | Traçar percurso evitando asteroides | Não | 2300 → 400 ms; proteção de conclusão; rotação usa delta |
| FiltroO2Tarefa | Aspirar sujeira do filtro | Não | 2800 → 400 ms; proteção de conclusão |
| OxigenioFaixaTarefa | Regular o nível de oxigênio | Não | 3600 → 400 ms; proteção de conclusão |
| ReatorTarefa | Ativar módulos e ignição | Não | 2800 → 400 ms; proteção de conclusão |
| DesviarEnergiaTarefa | Distribuir energia entre sistemas | Não | 3200 → 400 ms; proteção de conclusão |
| FiacaoTarefa | Reparar conexões elétricas | Não | 2800 → 400 ms; proteção de conclusão |
| PotenciaMotorTarefa | Ajustar potência dos motores | Não | 2800 → 400 ms; proteção de conclusão |
| DirecaoTarefa | Alinhar a direção da nave | Não | 2800 → 400 ms; proteção de conclusão |
| MapearRotaTarefa | Definir a rota | Não | 2800 → 400 ms; proteção de conclusão |
| TransferirDadosTarefa | Mirar a antena e enviar dados | Não | 3500 → 400 ms; confete antecipado; proteção de conclusão |
| ComunicacoesTarefa | Restabelecer a comunicação | Não | 2800 → 400 ms; proteção de conclusão |
| IluminacaoTarefa | Restaurar as luzes | Não | 2900 → 400 ms; proteção de conclusão |
| ColapsoReatorTarefa | Resfriar pontos de superaquecimento | Não | 2800 → 400 ms; proteção de conclusão |
| TrocarFiltroCo2Tarefa | Retirar e instalar o filtro de CO₂ | Não | 2800 → 400 ms; proteção de conclusão |
| EquilibrarValvulasTarefa | Equilibrar as válvulas | Não | 2500 → 400 ms; proteção de conclusão |
| TaparTempestadeTarefa | Posicionar proteção contra radiação | Não | 2800 → 400 ms; proteção de conclusão |
| FecharEscotilhasTarefa | Fechar as escotilhas | Não | 2800 → 400 ms; proteção de conclusão |
| PaineisSolaresTarefa | Limpar e posicionar painéis | Não | 2800 → 400 ms; proteção de conclusão |
| SeguirSolTarefa | Orientar o painel para o Sol | Não | Vitória compartilhada: 3200 → 400 ms |
| ForaDaSombraTarefa | Retirar painéis da sombra | Não | Vitória compartilhada: 3200 → 400 ms |
| LimparJanelaTarefa | Limpar a janela e encontrar a Terra | Não | Vitória compartilhada: 3200 → 400 ms |
| BateriaRoverTarefa | Instalar a bateria e fechar a trava | Não | Vitória compartilhada: 3200 → 400 ms |
| ParalamaTarefa | Consertar o paralama do rover | Não | Vitória compartilhada: 3200 → 400 ms |
| ScannerGeloTarefa | Identificar gelo | Não | Vitória compartilhada: 3200 → 400 ms |
| ManobraNaveTarefa | Corrigir a trajetória com propulsores | Não | Vitória compartilhada: 3200 → 400 ms |
| HortaTarefa | Regar e iluminar a horta | Não | Vitória compartilhada: 3200 → 400 ms |
| AquecimentoTarefa | Cobrir pontos frios | Não | Vitória compartilhada: 3200 → 400 ms |
| CenaTarefa / Tarefa | Executar os jogos do banco | Não | 3500 → 400 ms; resize após sucesso confirma; limpeza explícita de atalhos |
| poeiraDuto | Limpar o duto, dentro de CenaTarefa | Não | Confirmação interna: 350 → 50 ms, antes dos 400 ms do painel |
| escudoSol | Proteger contra raios, dentro de CenaTarefa | Não | Confirmação interna: 350 → 50 ms, antes dos 400 ms do painel |

### Timers, eventos e execução

| Recurso | Estado após revisão | Observação |
|---|---|---|
| Timer de sucesso | Corrigido | Um timer por execução; cancelado ao fechar; callback protegido contra repetição e callbacks antigos |
| Timers de erro de DesviarEnergia (1100/1500 ms) | Mantidos | Feedback e avanço/reinício de rodada; não são espera pós-vitória |
| Timer de Fiacao (1100 ms) | Mantido | Faz parte do teste das lâmpadas |
| Timer de Nave (560 ms) | Mantido | Recuperação após colisão, não fechamento por sucesso |
| Piscar de TaparTempestade (90 ms) | Mantido | Feedback de impacto, pertencente à cena |
| Confete de TransferirDados | Corrigido | 950 → 50 ms para aparecer dentro da confirmação curta |
| Tweens com `repeat: -1` | Corretos no ciclo revisado | Animações decorativas enquanto a cena existe; o TweenManager é encerrado pelo Phaser no shutdown |
| `events.on('update')` nas tarefas | Corretos no ciclo revisado | Callbacks removidos no shutdown; os testes verificam ausência de listeners `update` residuais |
| Eventos de mouse e teclado | Corretos no ciclo revisado | Phaser limpa os InputPlugins ao encerrar; limpeza explícita dos atalhos de fechar também foi adicionada |
| Resize de CenaTarefa | Corrigido | Reinicia um jogo incompleto, mas confirma um sucesso já obtido |
| Callbacks dos chamadores em Superficie | Mantidos e testados | Entrega, recarga e reparo executam o resultado e liberam `emTarefa`; seus fallbacks não duplicam a entrega |
| Async/threads/fetch nas tarefas | Ausentes | Não foi encontrado download ou thread por frame nesses painéis |
| Autosave | Hipótese pendente de perfil específico | Escrita síncrona na thread principal; manter persistência até medir seu custo isolado |

Timers e tweens não bloqueiam a thread durante a espera. Seus callbacks, desenho, lógica e criação de objetos executam na thread principal do navegador. Não é adequado enviar objetos Phaser para um Worker; um eventual Worker seria para cálculos puros, caso um perfil demonstre necessidade.

## Verificação e medições

- Suíte de regras, física, tarefas e novas regressões de conclusão: `npm test`.
- Regressão de orientação do rover a 30, 60 e 120 FPS.
- Compilação TypeScript e build Vite: `npm run build`.
- Chrome real em modo headless, AMD Radeon via Direct3D11, viewport 412 × 915, modo leve e movimento reduzido. CPU limitada a 4× apenas para os perfis de movimento. Builds de desenvolvimento no mesmo localhost; uma execução inicial e uma final. Isso é simulação em computador Windows, não um celular físico.
- Caminhada real durante 4 s e direção real durante 15 s, verificando deslocamento para evitar medir um veículo parado. Controle da direção injetado pelo benchmark; colisões, física, câmera e desenho continuam os do jogo.

| Cenário | FPS médio antes → depois | p95 do frame, ms | Frames > 50 ms | Long tasks |
|---|---|---|---|---|
| Andar | 31,1 → 36,9 | 50,1 → 30,1 | 6,35% → 0% | 8 → 0 |
| Dirigir | 30,2 → 32,9 | 40,1 → 40,0 | 1,77% → 0,20% | 9 → 1 |

Esses números mostram menos engasgos nessa execução, mas não demonstram 60 FPS, um ganho estatisticamente estável ou comportamento térmico prolongado. O perfil final também teve travadas de aquecimento inicial e de mudanças de vista: consultar todos os estágios nos JSON, não apenas a tabela. Rastros após 40–60 segundos e aparelhos reais continuam exigindo testes mais longos.

O ciclo de vida foi exercitado em **28 cenas × 3 condições = 84 verificações**: sucesso automático, Esc durante sucesso e cancelamento. Nos painéis prontos, o teste instancia a cena real e aciona a vitória compartilhada, sem resolver automaticamente todos os quebra-cabeças. As regras são cobertas pela suíte Node. Na medição final, o fechamento automático observado ficou aproximadamente entre **351 e 546 ms** sem limitação artificial de CPU; o timer configurado é 400 ms de tempo da cena e pode se atrasar se o navegador estiver ocupado.

Testes adicionais acionam os chamadores reais de Superficie e confirmam: uma bateria por entrega, nenhuma duplicação, liberação dos controles, cancelamento da recarga sem gastar bateria, recarga bem-sucedida com um único gasto, recompensa única de reparo, remoção do evento e leitura do progresso salvo. Não substituem uma campanha completa jogada manualmente nos três capítulos.

Registros: [antes](baseline-mobile.json), [depois](final-mobile.json), [integração e repetição dos painéis](task-integration.json), [captura do rover](final-mobile.png).

## Reprodução

No PowerShell, com o localhost iniciado:

```powershell
npm.cmd test
npm.cmd run build
node tools/dev/medir_missao.mjs 'http://127.0.0.1:5173/?leve' 4 412x915 performance/2026-11-15/reteste-mobile.json reduced --capturar
node tools/dev/medir_missao.mjs 'http://127.0.0.1:5173/?leve' 1 412x915 performance/2026-11-15/reteste-tarefas.json reduced --tarefas --somente-tarefas
```

O script aceita `CHROME_BIN` para outro caminho do Chrome; em Windows usa a instalação padrão e inicia sem janela. `--tarefas` importa os módulos de teste pelo servidor Vite de desenvolvimento. Para medir produção, usar `VITE_MEDIR=1` no build e o preview, sem `--tarefas`. Rodar perfis sequencialmente e sem compilar ao mesmo tempo.

No DevTools, gravar **Performance** com câmera seguindo o jogador, dirigir e virar durante pelo menos 60 s, concluir uma tarefa e verificar o retorno ao mapa. Inspecionar long tasks e as pilhas de `Superficie.update`, `Ambiente.redesenharPegadas`, `gravarPartida` e `encontrarCaminho`. Usar Performance Monitor/FPS e p95, em vez de apenas FPS médio. Se adicionar `performance.mark`, marcar conclusão confirmada e fechamento; evitar `console.log` por frame.

## Próximos ganhos possíveis

- **Cache de caixas por alteração de layout:** elimina alocações por frame; precisa de invalidação em mover, duplicar, restaurar e construir. Ganho em milissegundos ainda não medido.
- **Pool para confete/poeira**, se o perfil indicar criação/coleta frequente: reduz pressão no coletor; não há ganho percentual comprovado.
- **LOD dos rastros por zoom/qualidade** e perfil de 60 s: reduz custo de renderizar marcas antigas, com ajuste visual a validar. Um protótipo com texturas temporárias trouxe mais pausas e foi descartado.
- **Passo fixo com interpolação visual**, se testes em diferentes taxas demonstrarem jitter restante: estabiliza a simulação, mas adiciona custo e exige cuidado com cliques, colisões e câmera; não foi introduzido sem evidência.
- **Download/decodificação e shaders das mudanças de vista:** ainda apresentam pausas em algumas amostras e devem ser perfilados separadamente do movimento.
