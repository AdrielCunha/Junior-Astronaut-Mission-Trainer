# Contexto do Projeto - Versão 1

## Visão geral
Este projeto é um jogo browser-based de estratégia/educação chamado Lunar Odyssey, desenvolvido em TypeScript com Phaser 3 e Vite. A proposta é simular uma missão tripulada do início da base na Lua até a construção de uma base em Marte, com decisões de gestão de recursos e sobrevivência em condições extremas.

## Objetivo do jogo
O jogador conduz uma tripulação em três capítulos:

1. Lua: construção do foguete.
2. Espaço: viagem até Marte.
3. Marte: construção da base e sobrevivência durante as noites frias.

A mecânica central é a gestão de baterias, oxigênio e progresso da missão. Cada decisão tem custo, e os recursos disponíveis diminuem ao longo do tempo.

## Tema e proposta educacional
O jogo foi pensado para crianças de 7 a 12 anos e usa uma abordagem lúdica para ensinar conceitos de:

- planejamento de recursos
- sobrevivência espacial
- clima espacial e radiação
- logística de missões
- impactos reais de eventos de espaço na missão

Os eventos climáticos representados no jogo são baseados em dados reais da NASA sobre tempestades solares e radiação.

## Estrutura do projeto

### Arquivos principais
- `index.html` — ponto de entrada da aplicação web
- `package.json` — configurações do projeto e scripts npm
- `tsconfig.json` — configuração do TypeScript
- `vite.config.ts` — configuração do Vite
- `README.md` — documentação principal do projeto

### Pasta `src/`
- `main.ts` — inicialização principal do jogo
- `capitulos.ts` — lógica dos capítulos do jogo
- `regras.ts` — regras e mecanismos do sistema
- `regras.test.ts` — testes automatizados das regras
- `cenas/` — cenas do Phaser
- `dados/` — arquivos JSON com dados de missão e ambiente

### Dados usados
A pasta `src/dados/` contém arquivos JSON, como:
- `lua.json`
- `marte.json`
- `nave.json`

Esses arquivos provavelmente armazenam informações do cenário, objetivos, recursos, clima e estatísticas que o jogo usa para montar as fases e eventos.

## Tecnologias
- TypeScript
- Phaser 3
- Vite
- Node.js
- Testes em Node via `node --test`

## Scripts disponíveis
No `package.json`, os scripts principais são:

- `npm install` — instala dependências
- `npm run dev` — inicia o jogo em modo de desenvolvimento
- `npm run build` — compila o projeto
- `npm run preview` — visualiza a build final
- `npm test` — executa testes das regras do jogo

## Fluxo geral do jogo
O jogo funciona em ciclos diários. A cada dia:

- o jogador lê o relatório da manhã
- distribui baterias entre os ambientes/áreas da missão
- observa o que aconteceu durante a noite
- ajusta a estratégia para o próximo ciclo

Cada capítulo avança por uma sequência de dias e depende de decisões que afetem oxigênio, energia e progressão da missão.

## Dados reais da NASA
A documentação menciona que o jogo usa dados reais de fontes como:

- DONKI — tempestades solares, CMEs e eventos relacionados
- OSDR RadLab — dose de radiação
- Curiosity REMS — temperatura da noite em Marte

Esses dados ajudam a simular cenários realistas de risco e sobrevivência espacial.

## Estado atual da versão 1
A versão 1 do projeto está em desenvolvimento e a documentação indica que os três capítulos são jogáveis do início ao fim. O projeto já possui estrutura base funcional, lógica de regras, testes e cenários implementados.

## Resumo executivo
Este projeto é um jogo educativo e estratégico sobre missão espacial em que o jogador toma decisões de sobrevivência e gestão de recursos em um cenário inspirado em missões reais da NASA. Ele combina narrativa, lógica de jogo e dados reais para criar uma experiência acessível e envolvente.
