# Integração das novidades da equipe

Atualizado com `origin/main` em `67b5197` (PR #31), incluindo os ajustes de responsividade, controles mobile, idioma português, condições diárias, tarefas, áudio e editor. As bases de exploração respeitam o desbloqueio da campanha introduzido pela equipe.

As correções de persistência, reinício, pausa, movimento, trilhas limitadas do rover e conclusão rápida das tarefas foram preservadas. O botão de pulo alternativo não duplica os controles DOM nos dispositivos touch. A previsão respeita a condição de sinal indisponível e recebe tradução completa.

Validação após a integração:

- 281 testes automatizados aprovados.
- Build de produção aprovado; permanece o aviso de bundle acima de 500 kB.
- Regressão assistida no Chrome, viewport 412 × 915 e movimento reduzido: resultados em `integracao-main-final.json`. Não substitui teste em aparelho físico.

Os relatórios anteriores nesta pasta registram versões anteriores à integração. A campanha completa assistida documentada nesses arquivos não foi repetida integralmente com as novas condições diárias.
