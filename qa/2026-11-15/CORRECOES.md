# Correções após a auditoria

Os problemas confirmados no [relatório original](RELATORIO-QA.md) receberam correções pontuais. As evidências anteriores continuam registradas como histórico; os arquivos abaixo documentam o comportamento posterior.

| Item | Mudança |
|---|---|
| QA-01 — reinício | PLAY AGAIN FROM THE MOON e NEW GAME usam o mesmo reset explícito de mundo, capítulo, recursos, dose e pontos, sem recarregar um save final. O estado transitório de decolagem também é limpo na recriação da superfície. |
| QA-02 — pausa | MenuJogo pausa Viagem, Chegada e MarteVista, além das cenas do mundo. A troca de capítulo encerra o menu. Sair de uma cinemática pelo menu volta ao checkpoint salvo. |
| QA-03 — explorações | O save inclui exploração programada, expedição, pontos concluídos, tempo de espera, movimento da expedição, corrida e estado diário do rover. O scanner reabre a partir do último ponto pendente, pois o painel em si não é salvo. Os novos campos são opcionais para manter saves anteriores compatíveis e são validados na leitura. |
| QA-04 — estações | As estações concluídas são serializadas e restauradas; continuam indisponíveis até o próximo dia. |
| QA-05 — escolha da base | As três bases podem ser exploradas. A exploração livre usa a base escolhida e impede que seu estado sobrescreva o save da campanha. Voltar ao menu recupera a campanha salva. |
| QA-06 — previsão | O relatório da manhã mostra o intervalo de previsão e de baterias, mantendo a revelação do nível observado à noite. O aviso sobre tempestade extrema é condicional à previsão. |
| QA-07 — derrota | A explicação diferencia falta de oxigênio, excesso de radiação e meta incompleta. |
| QA-08 — pular tarefas | A regra existente foi preservada: tarefas de bateria podem ser puladas. O botão recebe “Skip” e os chamadores mostram o efeito da ação. Cancelar atividades opcionais sem terminar continua sem marcar sucesso. |
| QA-09 — touch | Um botão JUMP com área de 104 × 48 px usa a mesma entrada e física do pulo por teclado. Fica oculto durante tarefas, cenas, menus e direção do rover. |
| QA-10 — fatos científicos | O fechamento continua em 400 ms. A conclusão registra o fato no SCIENCE LOG do menu, com leitura sem limite de tempo e navegação entre descobertas. O diário é uma coleção local independente do reinício da campanha. |
| QA-11 — botão residual | Removido “Build ship” da vitória da nave; a ação de progressão é Land on Mars. A tarefa continua disponível onde é utilizada. |
| QA-12 — créditos | Removido o placeholder. As faixas foram listadas e a contribuição dos arquivos foi identificada; autoria de composição não foi inferida. |
| QA-13 — retry de Marte | Uma derrota em Marte oferece “Try Mars again”, com o mesmo limite de dose de recuperação usado na nave, além da opção de reiniciar a campanha. |
| QA-14 — leitura mobile | O cabeçalho mobile usa um resumo curto do dia, com texto de 12 px e mais espaço vertical. O diário usa texto de pelo menos 14 px. Dicas do rover quebram linha e ficam dentro da largura visível da câmera. |
| PERF-01 — rastros prolongados | A medição de 90 s confirmou degradação com milhares de marcas. O desenho agora tem limite de 480 marcas no modo leve e 1800 no detalhado, com desaparecimento suave da cauda. Marcas paradas mantêm o envelhecimento por tempo. O limite afeta detalhe visual, não velocidade, colisão ou recursos. |

## Validação

- 257 testes de regras, física, tarefas, persistência e diário aprovados. Incluem compatibilidade com saves antigos, rejeição de progresso inválido, limite e deduplicação do diário e ausência de recompensa duplicada.
- TypeScript e build Vite aprovados; o aviso já existente de bundle grande permanece.
- [14 regressões de navegador aprovadas](correcoes-validacao-final.json): confirmação de reinício com reload, pausa/retomada, estações, exploração pendente e em andamento, proteção do save durante exploração livre, retry de Marte, mensagem de derrota, previsão, pulo touch, consulta ao diário e limpeza da animação de decolagem.
- [Campanha completa após as correções](campanha-corrigida-final.json): 8 dias da Lua, 5 da nave e 8 de Marte terminados com vitória; o botão final voltou para Lua/dia 1, oxigênio 60, dose 0, meta 0 e pontos vazios. Sem erro de runtime registrado.
- Capturas: [pulo mobile](correcoes-final-touch.png) e [diário em 320 × 568](correcoes-final-science.png).

A campanha foi assistida, com interações internas e possibilidade de pular os puzzles, conforme o método do relatório original. Os testes de interface foram feitos no Chrome emulado, não em telefone físico. As hipóteses de falha de rede/asset e todas as combinações possíveis de eventos continuam sendo cobertura adicional, não bugs afirmados como resolvidos.

### Direção por 90 segundos

Mesmo perfil em Windows/Chrome, modo leve, 412 × 915 e CPU limitada a 4×; uma execução antes e uma depois do limite visual. Sem compilação simultânea nesses perfis.

| Medida durante a direção | Antes do limite de rastros | Depois |
|---|---:|---:|
| FPS médio | 19,1 | 24,7 |
| p95 do frame | 80 ms | 60 ms |
| Frames acima de 50 ms | 39,86% | 9,08% |
| Long tasks | 790 | 190 |
| FPS médio nos últimos 30 s | 17,0 | 25,4 |
| Marcas registradas no fim da direção | 2594 | 496 |

O teste confirmou redução do acúmulo e dos engasgos, mas não comprova 60 FPS nem um ganho igual em todos os aparelhos. As mudanças de vista ainda apresentaram pausas isoladas nessa simulação. Registros: [antes](../../performance/2026-11-15/final-rover-90s.json), [depois](../../performance/2026-11-15/rover-90s-otimizado-final.json), [captura final](../../performance/2026-11-15/rover-90s-otimizado-final.png).

## Repetir as verificações

```powershell
npm.cmd test
npm.cmd run build
node tools/dev/qa_correcoes.mjs 'http://127.0.0.1:5173/?leve' 1 412x915 qa/2026-11-15/reteste-correcoes.json reduced --capturar
node tools/dev/qa_campanha.mjs 'http://127.0.0.1:5173/?leve' 1 412x915 qa/2026-11-15/reteste-campanha.json reduced
node tools/dev/medir_missao.mjs 'http://127.0.0.1:5173/?leve' 4 412x915 performance/2026-11-15/reteste-90s.json reduced --rover-longo
```

Rodar sequencialmente e sem compilar durante as medições. Os testes aguardam a cena da tarefa ficar ativa antes de usar sua conclusão nativa; não dependem de uma quantidade fixa de frames nem de imports duplicados pelo HMR. O roteiro de correções contém verificações com falha explícita; os roteiros antigos de auditoria são observacionais e registram também o comportamento anterior.
