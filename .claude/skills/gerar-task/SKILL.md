---
name: gerar-task
description: Cria a especificação (MD) de uma nova task/minigame do Lunar Odyssey e o plano de implementação, antes de qualquer código. Use quando o usuário pedir uma task nova, quiser reescrever uma task existente ou organizar o backlog em claude/v1/tasks.
---

# Gerar task (spec antes de código)

Você produz **a especificação e o plano**. Não escreve código do jogo até o usuário aprovar a spec.

## 0. Regra de idioma (obrigatória)
- Todo texto visível ao jogador deve estar em inglês: títulos, instruções, botões, mensagens, textos de painel, HUD, feedback e documentação de tasks.
- A interface do jogo, as tasks e as mensagens do jogador devem seguir o inglês como idioma principal.
- Não reproduzir textos em PT-BR em cenas, botões, docs de gameplay ou materiais voltados ao usuário.
- Quando a task for criada ou reescrita, os textos de jogador devem ser escritos em inglês, com frases curtas e claras, sem uso de PT-BR.

## 1. Leia antes de escrever
- `claude/v1/lista-de-tasks.md` (backlog e categorias) e `claude/v1/modulo-de-tasks.md` (arquitetura).
- `claude/v1/tasks/` para ver se a task já existe (nesse caso, reescreva em vez de duplicar).
- Uma task já pronta como modelo: `src/nave-tarefa.ts` + `src/cenas/NaveTarefa.ts` + `src/nave-tarefa.test.ts`.
- `src/regras.ts` (efeitos: `oxigenio`, `blindagem`, `meta`, `aquecimento`) e `src/capitulos.ts` (capítulos).

## 2. Regra de coerência (barra de entrada)
Toda task precisa ter **tema do jogo**: ligar-se a pelo menos um de oxigênio, radiação/blindagem, energia, aquecimento, foguete ou navegação, e ensinar algo real (dados NASA do projeto). Se for genérica, recontextualize (ex.: "passar o cartão" vira "autenticar o painel de comando"). Nunca cite outros jogos na spec.

**Decisões fixas do projeto (por enquanto):**
- As tasks podem aparecer em **qualquer capítulo**. Não fixe capítulo na spec, a menos que o usuário peça. O gatilho vem de fora (botão `?debug=1`, evento ou fim de dia) e a task não depende de capítulo.
- **Sem recompensa e sem penalidade no estado do jogo** por enquanto. Concluir só dispara `aoConcluir`, e falhar só reinicia a tentativa. Registre na spec "Recompensa: a definir" e não implemente bônus em oxigênio, dose, baterias ou foguete.

## 3. Pergunte só o que falta
Se faltar o gatilho (botão, fim de dia, evento) ou a interação, pergunte em uma única mensagem curta. Senão, decida e registre a decisão.

## 4. Escreva `claude/v1/tasks/task-<slug>.md` neste formato fixo

```
# Task: <Nome>
- **Status:** ideia | spec aprovada | implementada | precisa de reescrita
- **Categoria:** Life Support | Radiation Shield | Navegação | Energia | Extra
- **Capítulo(s):** qualquer
- **Gatilho:** quando abre (botão debug `?debug=1`, evento, fim de dia...)
- **Recompensa:** a definir (por enquanto só `aoConcluir`)
- **Interação:** arrastar | clicar | sequência | segurar | escolher
- **Dificuldade (7–12 anos):** curta, sem texto longo, sem punição forte

## Objetivo
## O que a criança aprende (dado real)
## Fluxo (passos numerados)
## Regras de sucesso e falha (números e limites, ex.: raio 20, meta 5 acertos)
## Textos do jogador (PT-BR, curtos: título, instrução, erro, sucesso)
## Interface e estilo (arredondado, cores vivas, botão X, feedback com cor e animação)
## Lógica pura (funções, tipos, o que os testes cobrem)
## Cena (objetos Phaser, entrada de mouse/toque)
## Integração (onde abre, `aoConcluir`, o que acontece ao fechar sem terminar)
## Critérios de aceite (checklist testável)
```

## 5. Padrão de implementação (para depois da aprovação)
- Lógica pura em `src/<slug>-tarefa.ts` (sem Phaser; dados determinísticos), testes em `src/<slug>-tarefa.test.ts`, adicionados ao script `test` do `package.json`.
- Cena em `src/cenas/<Nome>Tarefa.ts`, registrada em `src/main.ts`; abre com `this.scene.launch('<Nome>Tarefa', { aoConcluir })`.
- Botão no painel `?debug=1` para abrir a task direto.
- Botão X e tecla Esc fecham sem entregar nada. Cena remove seus listeners no `shutdown`.
- Validar com `npx tsc --noEmit`, `npm test` e uma captura em Chrome headless.

## 6. Depois de escrever a spec
- Atualize `claude/v1/lista-de-tasks.md` (categoria e status da task).
- Mostre ao usuário um resumo de 5 linhas (tema, gatilho, interação) e pergunte se aprova antes de programar.
