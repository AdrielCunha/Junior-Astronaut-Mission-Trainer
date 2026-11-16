# Publicar Lunar Odyssey no GitHub Pages

Site previsto: **https://lunarodyssey.earth/**, com
**https://www.lunarodyssey.earth/** redirecionando para a raiz.
Repositório confirmado pelo remote Git:
[AdrielCunha/Junior-Astronaut-Mission-Trainer](https://github.com/AdrielCunha/Junior-Astronaut-Mission-Trainer).
Provedor informado: Porkbun.

O workflow testa e compila pull requests para `main`; a publicação é manual.
Adicionar o arquivo ao repositório ou abrir um PR não publica o jogo.
Nesta preparação não houve mudança de DNS ou das configurações do GitHub.

## Build e configuração

A branch `integracao-skins` passou em `npm run build`. O `dist/` auditado tem
aproximadamente 91 MiB; o limite publicado do Pages é 1 GB. `base: './'` já mantém
os caminhos relativos compatíveis com a raiz do domínio e a URL do repositório.
O laboratório separado não entra no build normal.

Em Settings → Pages, escolher **Source: GitHub Actions**. Depois que
`.github/workflows/pages.yml` estiver na branch padrão, abrir Actions → Deploy
Lunar Odyssey to GitHub Pages → Run workflow e escolher a revisão a publicar.
O workflow usa Node 22, instala pelo lockfile, executa `npm test`, gera e publica
somente `dist/`. Pull requests executam apenas os testes e o build, sem deploy.
Não é necessário executar Blender na hospedagem: os sprites entram no build
como arquivos de `public/`.

Fontes: [base relativa](https://vite.dev/guide/build#relative-base),
[deploy Vite](https://vite.dev/guide/static-deploy#github-pages),
[limites Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

## Abrir o DNS na Porkbun

ACCOUNT → Domain Management → `lunarodyssey.earth` → botão DNS, ou
Details → DNS RECORDS → ícone de editar → Manage DNS Records → Add Record.
O formulário pede Type, Host, Answer/Value e TTL. Para a raiz, **deixar Host vazio**;
não escrever o domínio completo. Manter o TTL padrão.

Esses controles só modificam o DNS publicado se os nameservers ativos forem os da
Porkbun. Trocar apenas hospedagem conflitante nos hosts raiz e www, como o ALIAS
de estacionamento `pixie.porkbun.com`. Preservar MX e TXT de e-mail e outros serviços.

Fontes: [adicionar DNS na Porkbun](https://kb.porkbun.com/article/231-how-to-add-dns-records-on-porkbun),
[editar DNS](https://kb.porkbun.com/article/68-how-to-edit-dns-records),
[apontar registros A](https://kb.porkbun.com/article/54-pointing-your-domain-to-hosting-with-a-records),
[nameservers e DNS Records](https://kb.porkbun.com/article/175-how-to-use-the-domain-details-area).

## Verificar o domínio na conta GitHub

Em Settings → Pages da conta **AdrielCunha**, abrir Add a domain e informar
`lunarodyssey.earth`. Criar na Porkbun o TXT que o GitHub fornecer:

| Type | Host | Answer/Value |
|---|---|---|
| TXT | `_github-pages-challenge-AdrielCunha` | token gerado pelo GitHub |

Conferir o host exibido pelo GitHub e copiar seu valor exato. O token ainda precisa
ser obtido no painel da conta; não há um valor fixo que possa ser preenchido aqui.
Após propagação, pressionar Verify no GitHub e manter o TXT. Essa etapa ocorre na
conta dona do repositório, não no Settings do repositório.
[Verificação oficial](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages).

## Conectar raiz e www

Primeiro salvar **lunarodyssey.earth** em Settings → Pages → Custom domain do
repositório. Depois criar estes registros na Porkbun:

| Type | Host na Porkbun | Answer/Value |
|---|---|---|
| A | vazio | `185.199.108.153` |
| A | vazio | `185.199.109.153` |
| A | vazio | `185.199.110.153` |
| A | vazio | `185.199.111.153` |
| CNAME | `www` | `adrielcunha.github.io` |

O CNAME aponta para o host da conta, sem o nome do repositório. Com raiz e www
configurados, o GitHub redireciona www para `lunarodyssey.earth`, escolhido como
Custom domain. Usar esses hosts, sem wildcard. Para publicação por Actions, não
é necessário arquivo `CNAME` no artefato: o domínio fica no Settings do Pages.
[Registros e domínio oficiais](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

## HTTPS e conferência

Após validar o DNS, o GitHub emite o certificado automaticamente. Ativar **Enforce
HTTPS** em Settings → Pages quando disponível. Não é necessário instalar o SSL da
Porkbun no jogo. Propagação e disponibilização da opção podem levar até 24 horas.
[HTTPS oficial](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).

Conferir a partir de uma máquina com acesso à rede:

```sh
dig +short NS lunarodyssey.earth
dig +short A lunarodyssey.earth
dig +short CNAME www.lunarodyssey.earth
dig +short TXT _github-pages-challenge-AdrielCunha.lunarodyssey.earth
curl -I https://lunarodyssey.earth/
curl -I https://www.lunarodyssey.earth/
```

Nesta execução, as consultas DNS e HTTP foram bloqueadas pelo ambiente de trabalho.
Portanto, **os registros públicos atuais e os nameservers não foram confirmados**.
A tabela acima descreve a configuração desejada. Também falta obter o token TXT,
ativar o Pages, salvar o domínio, configurar o DNS e executar o deploy manual.

## Descrição, tópicos e link do repositório

O endereço desejado para o campo Website do repositório é
`https://lunarodyssey.earth`. Isso não publica nem valida o site.
O script abaixo adiciona os tópicos do jogo, preserva os existentes e preenche
a descrição em inglês somente quando ela estiver vazia:

```sh
node tools/dev/configurar_repositorio.mjs
node tools/dev/configurar_repositorio.mjs --apply
```

É necessário acesso ao GitHub pela rede e autenticação do `gh` com permissão
para editar esse repositório. A descrição, os tópicos e o Website não foram
alterados nesta preparação: a API do GitHub ficou inacessível.
