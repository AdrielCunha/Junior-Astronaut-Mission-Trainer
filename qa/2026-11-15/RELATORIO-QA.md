# Auditoria de QA e game design após a otimização

**Atualização:** os achados confirmados abaixo foram tratados posteriormente. Consultar [correções e validações](CORRECOES.md); este relatório preserva a reprodução dos problemas anteriores.

Data: 15/11/2026, America/Sao_Paulo. Projeto: **Lunar Odyssey**, Phaser 3 + TypeScript + Vite. Campanha de gestão de recursos com exploração a pé, rover e minijogos: Lua → nave → Marte.

**Resultado:** a campanha pode ser concluída, mas há bugs de reinício, pausa e persistência que devem ser corrigidos antes de considerar esta versão pronta. Não foi observado crash nas execuções finais registradas. Isso não certifica a ausência de crashes ou colisões problemáticas fora da cobertura abaixo.

## Método e limites da sessão

- **R — reproduzido no navegador:** Chrome headless com renderização AMD/Direct3D11; telas 412 × 915, 1366 × 768 e uma verificação de layout em 320 × 568. Os perfis de navegador são temporários e separados do perfil normal do jogador.
- **A — campanha assistida:** os 21 dias passaram pelo estado, pelas entregas, pelos relatórios e pelas transições reais. Para acelerar, o script chamou interações internas dos prédios, sem caminhar até cada um, e fechou os minijogos com Esc. **Não corresponde a resolver todos os puzzles manualmente nem a percorrer todos os cantos de cada mapa.** Não foi injetada vitória: as metas foram alcançadas pelas entregas e regras do jogo.
- **C — confirmado no código:** o trecho identifica diretamente o comportamento; quando não houve reprodução física no celular, isso é informado.
- **D — avaliação de design:** comportamento confirmado, mas sua aceitação depende da intenção do produto; não é classificado automaticamente como defeito de implementação.
- **H — hipótese:** precisa de um teste adicional; está separada dos defeitos reproduzidos.
- Teclado real via CDP foi usado para iniciar, andar, pular, pausar e pressionar E repetidamente. Algumas derrotas e o início de regressões usam fixtures de estado, explicitamente indicadas. Não houve campanha humana completa em telefone físico.
- As regressões anteriores continuam relevantes: 252 testes Node aprovados, build aprovado, 84 verificações de ciclo de vida em 28 painéis e testes de entrega/recarga/reparo/salvamento. Esses testes não substituem resolver cada tarefa pela entrada normal.

### Evidências

| Registro | Conteúdo |
|---|---|
| [Campanha final](campanha-mobile-final.json) | 8 dias da Lua, 5 da nave e 8 de Marte, estados finais, pausas, movimento e trilhas sonoras |
| [Regressões mobile](regressoes-mobile.json) | Recarregamento real, estação, exploração pendente, menus, derrotas e layout pequeno |
| [Regressões desktop](regressoes-desktop.json) | Repetição das regressões, pausa na cinemática, retry da nave e 20 pressionamentos reais de E |
| [Pausa durante a transição](pausa-transicao.json) | Verificação prolongada da aterrissagem com o menu aberto |
| [Desempenho](../../performance/2026-11-15/RELATORIO.md) | Método, antes/depois e limites das medições da etapa de otimização |

## Fase 1 — Lua: montar o foguete em oito dias

### Caminhos exercitados

**Normal:** iniciar em LAUNCH MISSION; ler o primeiro relatório com cinco baterias e Sol calmo; usar GO; andar e pular; buscar energia e distribuir entre oxigênio, escudo e oficina; encerrar cada dia e ler a noite. Na parte assistida, o plano prudente terminou o dia 8 com **foguete 100%, oxigênio 10 e dose 8**. A pontuação foi 202. O embarque abriu efetivamente o capítulo da nave.

**Curioso:** abrir e fechar o editor da base; experimentar o rover; verificar o zoom e as mudanças de vista já exercitadas no perfil de desempenho; inspecionar os relatórios e o resultado. O editor devolveu o mundo ao estado ativo. Não foi feita uma inspeção visual de todos os pontos da borda do mapa.

**Tentativa de quebrar:** fechar os minijogos com Esc durante toda a progressão assistida; testar 30 saídas do rover pela função de desembarque e, em outra execução, 20 pressionamentos reais de E. Não apareceram coordenadas inválidas nem bloqueio permanente nesses casos. Uma fixture com oxigênio 0 e foguete 100% reproduziu a mensagem errada de derrota.

### Problemas

| ID | Fase | Tipo | Gravidade | Como reproduzir | Esperado vs. real | Causa provável | Correção pontual |
|---|---|---|---|---|---|---|---|
| QA-06 | Lua e campanha | inconsistência | médio | Abrir a manhã; comparar o texto com `previsao` e `nivel`. A reprodução mais clara foi nave/dia 1: previsão [1,3], nível 2. | O projeto descreve uma decisão sob previsão; a manhã revela exatamente quantas baterias o escudo precisa. | [Interface.ts:599](../../src/cenas/Interface.ts#L599) usa `d.nivel`; os testes de equilíbrio usam a média da previsão. | Decidir se a incerteza faz parte do jogo. Se fizer, mostrar o intervalo na manhã e revelar o valor real à noite; revalidar equilíbrio e prazo das tempestades. **R/C/D.** |
| QA-07 | Lua; mesmo ramo em outras fases | inconsistência | médio | Fixture: oxigênio 0, meta 100%; abrir a tela de derrota. | Esperado: explicar falta de oxigênio. Real: título OUT OF OXYGEN e texto “The rocket was not ready in time.” | [Interface.ts:656](../../src/cenas/Interface.ts#L656) usa `metaIncompleta` para qualquer derrota. | Escolher a mensagem pelo resultado: oxigênio, radiação ou meta incompleta. **R/C.** |
| QA-08 | Lua, nave e Marte | inconsistência | médio | Abrir tarefa de energia/prédio e usar Esc; repetir até o fim da campanha. | Se o puzzle é obrigatório, cancelar deveria mantê-lo pendente. Real: cancelar entrega/coleta a bateria e permite toda a campanha sem resolver esses puzzles. | [Superficie.ts:801](../../src/cenas/Superficie.ts#L801) e [Superficie.ts:824](../../src/cenas/Superficie.ts#L824) entregam também no shutdown, por intenção explícita do código. | **Decisão de design, não regressão:** se o skip é intencional, nomeá-lo “Pular” e explicar seu efeito; se não for, separar cancelar de concluir nesses chamadores. Preservar a proteção contra duplicação. **A/R/C/D.** |
| QA-09 | Três fases, touch | experiência | médio | Em aparelho sem teclado físico, tentar executar o pulo pela interface de toque. | A mecânica existe no teclado; não há equivalente de toque identificado. | [Superficie.ts:708](../../src/cenas/Superficie.ts#L708) lê apenas `JustDown(SPACE)`; os painéis mostram dicas de teclado. | Adicionar botão de pulo contextual para touch ou explicitar que a versão móvel tem esse limite. Confirmar a ergonomia num telefone real. **C; teste físico pendente.** |
| QA-10 | Três fases | experiência | médio | Concluir uma tarefa e tentar ler o fato científico no banner. | Fechar rápido é desejado, mas textos educativos de várias palavras somem em aproximadamente 0,4 s. | [conclusaoTarefa.ts:3](../../src/cenas/conclusaoTarefa.ts#L3) e [Tarefa.ts:93](../../src/cenas/Tarefa.ts#L93). | Manter o fechamento rápido e publicar o fato num diário ou cartão acessível depois, sem bloquear o movimento. **R/C/D.** |
| QA-12 | Menu inicial/créditos | desnecessário | baixo | Abrir CREDITS e aguardar a seção Music. | Crédito finalizado; real: “(add the author)”. | Placeholder em [Radar.ts:57](../../src/cenas/Radar.ts#L57). | Substituir pelo crédito validado das músicas; não inventar autoria nem apagar os arquivos de fallback. **R/C.** |
| PERF-01 | Lua, perfil mobile simulado | desempenho | médio | Rodar o benchmark com viewport 412 × 915, CPU 4×, modo leve. | Movimento regular; a versão final ainda tem cerca de 36,9 FPS ao andar e 32,9 ao dirigir nessa configuração. | O perfil confirma o resultado global, mas não isola uma única causa restante. | Perfilar thread principal e GPU em aparelho real; medir sessões de 60 s antes de mudar novamente física ou rastros. Não prometer 60 FPS com essa amostra. **R; causa restante H.** |

### O que pode ser retirado ou simplificado

- Substituir o placeholder de crédito, em vez de entregar texto provisório ao jogador.
- Simplificar a paginação da tela de resultado: na última página há apenas uma nota de dados num painel grande. Manter resultado/pontuação visíveis e deixar detalhes expansíveis é uma opção de design, não uma correção de progressão.
- Não foi comprovado que os objetos decorativos ou o modo clássico estejam mortos. Eles têm uso em colisão, exploração, dados ou rotas alternativas de execução; não recomendar exclusão sem análise de referências.

## Fase 2 — Nave: chegar a Marte em cinco dias

### Caminhos exercitados

**Normal:** entrar pelo embarque da Lua, com **dose 8 e 202 pontos anteriores**; ler o relatório de espaço profundo; andar e pular; distribuir quatro baterias diárias entre suporte, proteção e motores; fechar cinco noites na campanha assistida. Resultado: **viagem 100%, oxigênio 5, dose 13**, mais 192 pontos. LAND ON MARS abriu a cinemática e depois o mapa de Marte.

**Curioso:** abrir a horta como estação opcional; concluí-la pelo fluxo de sucesso compartilhado já testado, salvar e recarregar; examinar EXPLORE A BASE e selecionar MOON BASE. O save preservou dose, capítulo e pontos, mas não a marca da horta concluída. A escolha da Lua devolveu à nave.

**Tentativa de quebrar:** Esc nos minijogos durante a campanha; pausa real por Esc durante a aterrissagem; salvar/recarregar antes de uma exploração programada; fixture de derrota e retry. O retry da nave voltou ao dia 1, oxigênio 60 e dose 20. A cinemática avançou durante a pausa, o que é defeito reproduzido.

### Problemas

| ID | Fase | Tipo | Gravidade | Como reproduzir | Esperado vs. real | Causa provável | Correção pontual |
|---|---|---|---|---|---|---|---|
| QA-02 | Nave → Marte | bug | alto | Vencer a nave; LAND ON MARS; pressionar Esc durante a viagem e manter a pausa. | A pausa deveria congelar a cinemática e a transição. Real: MenuJogo abre, mas Viagem continua ativa; `t` avançou de 0,0975 para 0,523875 em 900 ms. No teste prolongado, o mundo mudou para Marte/dia 1, com MenuJogo ainda aberto e Superficie ativa, sem pausa. | [MenuJogo.ts:28](../../src/cenas/MenuJogo.ts#L28) pausa apenas Espaco, Superficie e Interface; `Viagem` fica fora da lista. | Pausar também a cinemática ativa ou bloquear a abertura do menu nela; manter o mesmo estado ao retomar e limpar overlays antes da troca de capítulo. Ver [evidência visual](pausa-transicao.png). **R/C.** |
| QA-03 | Nave reproduzida; esquema compartilhado | bug | médio | Iniciar dia 2 com exploração programada; salvar antes de disparar; recarregar e continuar. | Esperado: preservar a exploração pendente ou restaurar sua disponibilidade. Real: countdown 2 s antes, `null` depois; nenhuma expedição. | [sessao.ts:113](../../src/cenas/sessao.ts#L113) não serializa `exploracaoEm`, `expedicao` nem o progresso relacionado; `usarMundo` reinicia esses campos. | Persistir uma representação validada da atividade, ou cancelar explicitamente e reoferecer sem perder/repetir recompensa. Incluir restauração e migração do save. **R/C.** |
| QA-04 | Nave | bug | médio | Concluir Veggie Garden; salvar; recarregar no mesmo dia. | Esperado: “Done today” continuar. Real: `estacoesHoje` passa de `[nave_plantas]` para `[]`. | Campo ausente em DadosPartida e no restaurador, embora [sessao.ts:202](../../src/cenas/sessao.ts#L202) controle a regra diária. | Salvar/restaurar IDs válidos das estações; limpar somente na manhã seguinte. O teste não demonstrou ganho infinito de baterias nessa estação. **R/C.** |
| QA-05 | Menu após chegar à nave | inconsistência | médio | SAVE & MAIN MENU ou reload; EXPLORE A BASE; MOON BASE → GO. | Esperado: explorar a Lua ou uma indicação clara de retomar. Real: o mundo continua `nave`, mesma fase e dia. | [Radar.ts:472](../../src/cenas/Radar.ts#L472) oferece a Lua, mas [Interface.ts:197](../../src/cenas/Interface.ts#L197) e `aoExplorar: retomar` apenas retomam o estado atual. | Separar exploração e campanha; iniciar a base escolhida sem sobrescrever o save, ou remover essa escolha enganosa durante uma campanha. **R/C.** |
| QA-06 | Nave, dia 1 | inconsistência | médio | Abrir o primeiro relatório da nave. | Previsão [1,3], mas UI revela “HIGH” e “2 batteries”. | Mesmo uso direto de `d.nivel` descrito na Lua. | Alinhar a UI ao modelo de previsão ou atualizar a proposta e o equilíbrio para informação exata. **R/C/D.** |
| QA-11 | Vitória da nave | desnecessário | baixo | Chegar ao resultado da nave; comparar “Build ship” com “Land on Mars”. | O objetivo de navegação já acabou; “Build ship” abre NaveTarefa e só gera a mensagem “Ship route complete”, sem ser necessário à aterrissagem. | Ação residual em [Interface.ts:668](../../src/cenas/Interface.ts#L668). | Remover esse botão do resultado ou renomear como minijogo opcional com função clara. Não excluir NaveTarefa globalmente: há outras referências. **R/C/D.** |

Também se aplicam QA-07 a QA-10: texto de derrota, política de skip, pulo touch e fato científico curto. A horta foi o exemplo de estação reproduzido; não se afirma que todas as estações foram jogadas manualmente.

### O que pode ser retirado ou simplificado

- O botão residual **Build ship** no resultado é candidato direto a remoção ou renomeação.
- O seletor de exploração apresenta SPACESHIP e MARS BASE como COMING SOON mesmo depois de os capítulos existirem na campanha. Isso pode significar “exploração livre indisponível”, mas o texto não faz a distinção: esclarecer ou ocultar cartões indisponíveis nesse contexto.
- Não remover as estações inteiras: elas oferecem exploração opcional. Corrigir a persistência e deixar explícito seu efeito na missão.

## Fase 3 — Marte: construir a base e sobreviver oito dias

### Caminhos exercitados

**Normal:** aterrissar conservando **dose 13 e pontos [202,192]**; ler o aviso de frio; priorizar Heating e suporte, construir proteção e cúpula; alimentar as noites frias. A campanha assistida terminou com **base 100%, oxigênio 10, dose 21**, obras `{aquecimento:2, blindagem:3, oxigenio:3, meta:12}`. A pontuação final do capítulo é 189, totalizando **583/900** pelas regras atuais.

**Curioso:** abrir/fechar o editor; observar o rover; abrir a vista de Marte pelo zoom, aguardar o carregamento e voltar com Esc. O retorno fechou MarteVista e liberou `emTarefa`. A dificuldade inicial de um primeiro script foi uma espera insuficiente do próprio harness pelo preload, corrigida antes da execução final; não foi contabilizada como bug do jogo.

**Tentativa de quebrar:** 30 ciclos de desembarque pela lógica do rover; fixture de morte por oxigênio; salvar no resultado e usar o botão que promete recomeçar na Lua; repetir o caso também depois da vitória. Em ambos, o recarregamento reapresenta o save de Marte, e não uma campanha nova. O layout final foi capturado em 412 × 915 e 320 × 568.

### Problemas

| ID | Fase | Tipo | Gravidade | Como reproduzir | Esperado vs. real | Causa provável | Correção pontual |
|---|---|---|---|---|---|---|---|
| QA-01 | Marte, vitória ou derrota | bug | alto | Salvar no resultado; clicar PLAY AGAIN FROM THE MOON. Continuar no título que reaparece. | Esperado: Lua, dia 1, recursos novos. Real após vitória: Marte, `fase=fim`, dia 9, meta 100; após morte: Marte, `fase=fim`, oxigênio 0. | [Interface.ts:675](../../src/cenas/Interface.ts#L675) só chama `location.reload()`; Carregar restaura o save existente, inclusive salvo em `pagehide`. | Usar o mesmo fluxo explícito de NEW GAME: limpar/resetar o save e reinicializar capítulo, mundo, dose, pontos e overlays. Verificar a ordem para `pagehide` não ressuscitar o estado antigo. **R/C.** |
| QA-03 | Marte por código compartilhado | bug | médio | Salvar com exploração/expedição pendente; carregar. | O esquema compartilhado não guarda a atividade. A perda foi reproduzida na nave; a reprodução específica de Marte com progresso de amostra ainda deve ser feita. | Serialização incompleta em sessao/DadosPartida. | Cobrir tipo, progresso, temporizador e concessão única de recompensa; adicionar regressão específica de Marte. **C; R na nave.** |
| QA-13 | Marte, derrota | experiência | médio | Perder em Marte e examinar as opções. | A nave oferece retry do capítulo; Marte oferece apenas “from the Moon”, hoje ainda quebrado por QA-01. | Ramo de Marte em [Interface.ts:674](../../src/cenas/Interface.ts#L674) não oferece retry local. | Além de corrigir QA-01, considerar “Tentar Marte novamente” com dose de retry consistente. É uma decisão de dificuldade, não um requisito já estabelecido. **R/C/D.** |
| QA-14 | Mobile pequeno | experiência | baixo | Abrir HUD/resultado em 320 × 568. | As ações finais couberam na tela, sem overflow horizontal detectado. Alguns textos secundários ficam com cerca de 7–10 px de altura visual, dificultando leitura. | Escala reduzida do HUD e dicas com mínimo pequeno. | Reduzir informação simultânea e aumentar os textos essenciais; validar leitura e alvo de toque no aparelho real. Não foi realizado teste de usabilidade com crianças. **R/D.** |

Aplicam-se também QA-06 a QA-10. Não foi observado rover voando, posição não finita ou falha ao retornar do zoom nos cenários executados; isso não cobre todas as colisões e inclinações do mapa.

### O que pode ser retirado ou simplificado

- Evitar que a única saída de uma derrota seja repetir a campanha inteira; oferecer escolhas claras de retry e reinício.
- Reduzir páginas de resultado quase vazias e deslocar fatos/dados detalhados para consulta opcional.
- Não remover prédios de aquecimento, blindagem, suporte ou cúpula: todos participam das regras e custos observados. Não há evidência suficiente para excluir assets decorativos de Marte.

## Dez problemas mais urgentes

| Prioridade | ID | Motivo |
|---|---|---|
| 1 | QA-01 | O botão de recomeçar volta ao save final/morto e quebra a recuperação do jogador |
| 2 | QA-02 | Uma tela que afirma estar pausada permite a cinemática continuar; precisa proteger também a transição |
| 3 | QA-03 | Salvar/carregar perde a exploração pendente e não contempla a expedição |
| 4 | QA-04 | Atividades “uma vez por dia” reabrem após recarregar |
| 5 | QA-05 | Escolher explorar a Lua devolve à nave sem explicar a mudança de intenção |
| 6 | QA-07 | A explicação de derrota contradiz o estado do jogo e ensina a correção errada |
| 7 | QA-06 | UI e proposta de decisão sob previsão estão desalinhadas |
| 8 | QA-09 | A versão touch não tem equivalente identificado para pular |
| 9 | QA-10 | O fechamento rápido elimina a oportunidade de ler o conteúdo educativo |
| 10 | QA-08 | Definir e comunicar a política de pular tarefas; o comportamento atual é intencional no código, mas muda o papel dos puzzles |

Não foi confirmado nenhum defeito **crítico** de crash inevitável ou corrupção permanente do arquivo. QA-01 e QA-02 são os dois itens **altos**. As avaliações de game design estão identificadas como D e não devem ser tratadas como regressões técnicas sem decisão de produto.

## Qualidade geral e ordem de trabalho

O núcleo de recursos e a progressão dos três capítulos funcionaram na campanha assistida. As músicas trocaram corretamente: Lunar Odyssey Theme → Beneath the Silver Tide → Across the Crimson Basin. Dose, pontos anteriores e resultado final se mantiveram entre os capítulos. A pausa comum congelou movimento nos três mapas; os controles voltaram após editor e zoom nos testes executados. O retry da nave também funcionou.

As correções anteriores de fechamento e concessão única de recursos continuam cobertas pelas regressões. Os novos achados acima **ainda são pendências de correção**, não mudanças já implementadas nesta auditoria. Primeiro corrigir reinício e pausa; depois completar persistência; em seguida alinhar mensagens, exploração e affordances touch. Só então ajustar equilíbrio e desempenho prolongado com uma medição nova. Não é necessário reescrever o jogo para esses itens.

### Hipóteses e cobertura ainda pendente

| Caso | O que ainda não está comprovado | Como confirmar |
|---|---|---|
| Rastros após 40–60 s | A reconstrução do fade pode reintroduzir picos em sessões longas; o benchmark de direção durou 15 s | Dirigir 90 s com pegadas ligadas/desligadas, comparar p95 e long tasks |
| Telefone físico | Temperatura, GPU e touch podem produzir comportamento diferente do desktop emulado | Android Chrome e iPhone Safari, retrato/paisagem, sessão de pelo menos 15 min |
| Morte durante instalação/tarefa | As fixtures testaram os resultados, não todas as combinações de morte no meio de animação e salvamento | Expirar tempestade durante instalação e reparo; garantir cancelamento/conclusão única e recuperação dos controles |
| Carregamento com erro | Não foi simulado 404, rede intermitente ou falha de decodificação nas transições | Bloquear um asset de cada mundo e interromper a rede durante preload; exigir retry/feedback e saída segura |
| Todos os cantos e puzzles | A campanha assistida não prova acessibilidade física de todos os destinos nem solução manual de cada puzzle | Percorrer cada rota com cliques/WASD e resolver cada tarefa sem helper; incluir bordas, crateras, layouts duplicados e versão touch |
| Eventos raros de missão | Não foram exploradas todas as sequências possíveis de tempestades, eventos aleatórios, infirmaria e layouts editados | Rodar seeds reprodutíveis e conferir orçamento/recompensas por dia |

## Checklist de reteste após corrigir

- [ ] Iniciar sem save: Lua/dia 1, recursos corretos e música correta.
- [ ] Concluir os 8 + 5 + 8 dias sem injetar recursos; depois repetir com cada minijogo resolvido pela entrada normal.
- [ ] Conferir o transporte de dose e pontos nas duas transições e o total final.
- [ ] Vencer e perder em Marte; PLAY AGAIN FROM THE MOON deve abrir Lua/dia 1 e continuar assim após outro reload.
- [ ] Repetir NEW GAME após save antigo, vitória e derrota; verificar `pagehide`/autosave.
- [ ] Pausar durante decolagem, cruzeiro e aterrissagem; esperar mais do que a duração da cena e confirmar que nada avançou nem mudou de capítulo.
- [ ] Retomar a cinemática; deve completar uma vez, fechar o menu e devolver o controle do mundo correto.
- [ ] Concluir cada estação da nave; salvar/carregar; continuar marcada até o próximo dia.
- [ ] Salvar antes e durante exploração/expedição; restaurar objetivo, progresso e temporizador sem perder nem duplicar recompensa.
- [ ] Selecionar cada base de exploração a partir dos três capítulos; comparar rótulo e mundo carregado e preservar o save de campanha.
- [ ] Forçar oxigênio 0, radiação 100 e meta incompleta separadamente; conferir título, explicação e opções de recuperação.
- [ ] Validar a opção de retry de cada capítulo conforme a decisão de design.
- [ ] Abrir/fechar tarefas com X, Esc, conclusão automática e cliques rápidos; verificar a política de skip e a aplicação única dos recursos.
- [ ] Pressionar E repetidamente perto do rover; embarcar, dirigir contra paredes, frear e desembarcar em local livre.
- [ ] Conferir colisões e limites ao andar/dirigir em todos os mapas e após mover/duplicar objetos no editor.
- [ ] Usar editor, desfazer, salvar e carregar; verificar posições e colisões correspondentes.
- [ ] Em telefone real: andar, pular, usar prédio, entrar/sair do rover, zoom, pausar e voltar; testar retrato e paisagem.
- [ ] Confirmar leitura de dicas, botões e fatos científicos sem aumentar novamente o bloqueio pós-missão.
- [ ] Medir 90 s de caminhada/direção, incluindo fade dos rastros; comparar FPS, p95 e frames > 50 ms.
- [ ] Interromper rede/asset no carregamento e verificar erro recuperável.
- [ ] Executar `npm.cmd test` e `npm.cmd run build`, além das reproduções de navegador abaixo.

### Reproduzir a automação

Com o servidor Vite local ativo:

```powershell
node tools/dev/qa_campanha.mjs 'http://127.0.0.1:5173/?leve' 1 412x915 qa/2026-11-15/reteste-campanha.json reduced
node tools/dev/qa_regressoes.mjs 'http://127.0.0.1:5173/?leve' 1 1366x768 qa/2026-11-15/reteste-regressoes.json reduced
node tools/dev/qa_pausa.mjs 'http://127.0.0.1:5173/?leve' 1 1366x768 qa/2026-11-15/reteste-pausa.json reduced
```

Os scripts registram o comportamento atual; várias reproduções de bugs são observacionais, portanto `completed: true` significa que o roteiro terminou, não que o jogo foi aprovado. Seus helpers internos exigem o servidor de desenvolvimento. Após as correções, comparar os campos relevantes dos registros com os resultados esperados deste relatório.
