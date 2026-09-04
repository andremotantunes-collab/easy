# Easy.

Uma app pessoal de finanças que responde a uma pergunta só:

> **Quanto é que eu tenho, mesmo, para gastar este mês?**

Escreves quanto recebes, escolhes como queres repartir, e vês **o bolo** — o
dinheiro livre depois de investir e de pagar o que é fixo. Sem conta, sem banco,
sem servidor.

---

## Como correr

```bash
npm install
npm run dev -- --host
```

- **Local:** <http://localhost:5173>
- **Rede (telemóvel):** o Vite imprime o endereço da tua rede ao arrancar,
  por exemplo `http://192.168.1.70:5173`

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run build` | Corre o gate de contraste, o teste da marca, o TypeScript e compila |
| `npm test` | Testes do motor financeiro e da marca |
| `npm run check:contrast` | Valida todos os pares de contraste nos dois temas |
| `npm run icons` | Regenera os ícones PWA a partir do SVG |
| `npm run shots -- 9` | Captura os ecrãs nos dois temas e monta a folha de contacto; acrescenta `max` no fim para o iPhone 13 Pro Max |
| `npm run deploy` | Envia para o GitHub, que corre os testes e publica |
| `npm run verify` | Verificação automática a 390×844 **e** 430×932: rede, scroll horizontal, alvos de toque, campos ≥ 16 px |
| `npm run bots` | Solta bots humanizados na app e reporta o que partirem |
| `npm run offline` | Escreve `Easy.html`: a app inteira num ficheiro, para levar para o telemóvel |

## No telemóvel

A app está no ar aqui, sem conta e sem login:

**<https://andremotantunes-collab.github.io/easy/>**

**iPhone (Safari):** abre o endereço → botão **Partilhar** → **Adicionar ao
ecrã principal** → **Adicionar**. Fica com o ícone do **E.**, abre sem barra de
endereço, e a partir da primeira abertura **funciona sem rede** — o *service
worker* guarda tudo o que é preciso.

**Android (Chrome):** abre o endereço → menu **⋮** → **Instalar aplicação**.

Os dados continuam a ser só teus e só do telemóvel: o endereço serve a app,
nunca vê um número teu.

**A app publica-se sozinha.** Cada envio para o `master` corre os testes,
compila e põe no ar — e uma versão com testes a falhar nunca chega ao
telemóvel, porque a publicação só acontece depois de eles passarem. Demora
cerca de um minuto.

```bash
npm run deploy   # envia e espera pela publicação
git push         # dá exatamente no mesmo
```

## Levar num ficheiro só

```bash
npm run offline
```

Escreve **`Easy.html`** (~280 kB) com tudo lá dentro — CSS, JavaScript e ícone.
Passa-se para o telemóvel por cabo, AirDrop, email ou Drive, e abre-se a partir
do próprio telemóvel: **não precisa de servidor nem de ligação**.

No **Android** abre-se o ficheiro no Chrome e os dados ficam guardados como
seria de esperar. No **iPhone**, o Safari abre-o, mas o iOS trata cada abertura
de um ficheiro local como um sítio diferente: os dados podem não sobreviver a
fechar, e não há "adicionar ao ecrã principal". Para uso a sério no iPhone,
usa antes a PWA instalada — depois do primeiro carregamento também funciona
sem rede.

## Onde ficam os dados

Tudo fica **no dispositivo**. A app não tem backend, não faz chamadas de rede em
runtime, não usa contas nem analytics.

| O quê | Onde | Chave |
|---|---|---|
| Orçamento (rendimento, percentagens, despesas fixas, gastos, limites) | `localStorage` | `easy.budget.v1` |
| Documentos (ficheiros e índice) | IndexedDB | base `easy-docs` |
| Faturas dos gastos (ficheiros) | IndexedDB | base `easy-docs`, chaves `fatura.*` |
| Perfil (nome, dados, PIN) | `localStorage` | `easy.profile.v1` |
| Meses fechados | `localStorage` | `easy.historico.v1` |
| Foto de perfil | IndexedDB | base `easy-perfil` |
| Tema | `localStorage` | `easy.theme.v1` |
| Onboarding feito | `localStorage` | `easy.onboarded.v1` |

**Consequência importante:** se limpares os dados do browser, perdes tudo. Por
isso há **Exportar orçamento (JSON)** em Perfil › Os teus dados e **Exportar
tudo (ZIP)** em Documentos.

## Quatro separadores

A app tem quatro destinos, e só quatro:

| Separador | O que faz |
|---|---|
| **Início** (`/`) | O mês, e os meses anteriores. Fita de meses no topo, o bolo em grande, o donut com as fatias e duas métricas. Só mostra: não diz o que gastar |
| **Gastos** (`/gastos`) | O que se gastou dia a dia: registar, ver por categoria, limites, o gráfico do ritmo, e a fatura de cada gasto |
| **Documentos** (`/documentos`) | Uma lista, sem filtros nem categorias: contratos, recibos, seguros e impostos, guardados só neste telemóvel |
| **Perfil** (`/perfil`) | O teu perfil — foto, nome e resumo do mês — e tudo o que se ajusta, em lista |

Arrastar de lado troca de separador — ver **Andar pela app**.

O que se ajusta abre a partir do Perfil, com seta de voltar no header:

| Rota | O que faz |
|---|---|
| `/plano` | Rendimento e *sliders* de investimento/poupança, com o donut a reagir em tempo real |
| `/fixas` | Lista de despesas agrupada por categoria, com **Mensal / Anual** por despesa, total mensal e anual |
| `/investir` | Simulador de juro composto e cinco perfis de risco, sem produtos nem marcas |
| `/perfil/dados` | Nome, email, telemóvel, data de nascimento e NIF |
| `/definicoes` | Poupança acumulada, exportar e importar o orçamento, apagar tudo |

`/inicio` é o onboarding de dois passos, só da primeira vez.

## Estrutura

```
src/
  lib/finance.ts     motor de cálculo, funções puras, cêntimos inteiros
  lib/copy.ts        toda a copy PT-PT num sítio só
  lib/format.ts      formatação EUR/datas à mão (1 234,56 €, dd/mm/aaaa)
  lib/zip.ts         escritor de ZIP sem dependências
  lib/docs.ts        documentos em IndexedDB
  components/Donut.tsx   donut SVG escrito à mão
  screens/           um ficheiro por ecrã
scripts/contrast-check.ts  gate de contraste que falha o build
```

## Gastos

O separador **Gastos** é onde se escreve o que se gastou — «Jantar», 19,90 € — e
o número lá em cima desce na hora. É a mesma pergunta da app, respondida ao
longo do mês em vez de uma vez no princípio.

A app separa duas coisas que costumam andar misturadas:

| | O que é | Onde |
|---|---|---|
| **Despesas fixas** | A renda, o carro, o ginásio, o seguro. Repetem-se todos os meses (ou uma vez por ano, e a app divide por doze). | Perfil → Despesas fixas |
| **Gastos** | O jantar, a gasolina, a farmácia, o dentista. Aconteceram num dia, e contam nesse mês e em mais nenhum. | Separador Gastos |

A conta faz-se por esta ordem:

    o que entra → fixas → gastos → investimentos → poupança → o bolo

Os gastos **saem do bolo** e não do que investes nem do que poupas: um jantar de
19,90 € não é motivo para deixar de investir, é menos 19,90 € para gastar. No
anel do Início aparecem como uma fatia laranja, que só existe quando há gastos.

**As categorias.** Cada gasto tem uma, e ela vem sugerida pelo que escreveste —
«jantar» é alimentação, «gasolina» é transportes, «farmácia» é saúde. É uma
sugestão, muda-se com um toque, e sem correspondência fica em «Outros» em vez
de adivinhar. Tocar numa categoria na lista permite pôr-lhe um **limite
mensal**: com limite, a categoria passa a dizer quanto ainda resta — ou quanto
já passou. Sem limite, diz só o que gastaste.

**A apresentação do gasto.** Tocar num gasto na lista abre-o: quanto foi, de
que categoria, em que dia — e a **fatura**. Anexa-se uma fotografia do talão ou
um PDF, ali ou já no momento de registar o gasto, e ela fica visível dentro do
próprio gasto. Um gasto com fatura leva um clipe na lista. O ficheiro fica no
IndexedDB do telemóvel como tudo o resto, e apagar o gasto apaga-o também —
mas o «Desfazer» traz os dois de volta.

As faturas **não aparecem** no separador Documentos, de propósito: um ano de
talões de café afogava os contratos e os recibos que lá estão. Cada uma
descarrega-se a partir do gasto a que pertence.

**O gráfico.** Uma linha com o que se gastou ao longo do tempo, em cinco
janelas: 7 dias, 30 dias, 12 meses, anos e tudo. Um dia sem gastos é um ponto a
zero e não um ponto que falta — sem isso a linha ligava dias que não se seguem
e mentia sobre o ritmo. A tracejado fica a média do período.

## Andar pela app

A barra de baixo tem quatro separadores. **Arrastar de lado troca de
separador**, na direção em que todos os telemóveis o fazem: o dedo empurra o
conteúdo e o conteúdo segue-o. Da direita para a esquerda traz a secção da
direita; da esquerda para a direita traz a da esquerda. A secção nova entra
pelo lado de onde vem, em 220 ms.

Isto substitui o arrasto do *browser*, que numa app de quatro separadores
quase sempre fazia o contrário do que se queria — voltava atrás no histórico em
vez de ir para o lado.

O gesto tem exceções, e são elas o trabalho todo: não dispara com uma folha
aberta, nem em cima de um cursor do Plano ou do Investir, nem na linha das
despesas fixas (que se arrasta para apagar), nem dentro de uma caixa que já
role de lado, nem numa sub-página como o Plano ou as Fixas — que não pertencem
à fila dos quatro. E precisa de ser claramente horizontal: 64 px de distância e
1,6× mais horizontal do que vertical, para não roubar o arrasto a quem só está
a percorrer a página.

## O objetivo

Há **um** objetivo de poupança, opcional, e **escondido à vista**. Não aparece
no Início, nem numa métrica, nem num aviso, nem no onboarding: não há contador,
não há celebração, não há lembrete. Só existe quando o fores ver.

Chega-se lá por duas portas, ambas discretas:

1. Um toque na linha **Poupança** da legenda do donut, no Início. Essa linha é,
   ao pixel, igual às outras três.
2. **Perfil → Definições**, ao lado da poupança acumulada.

A folha diz o nome, quanto já lá está de quanto queres, a percentagem, o que
falta e — se estiveres a poupar alguma coisa — em que mês lá chegas ao ritmo
atual. Sem ritmo não há data nenhuma: diz que o objetivo não avança e leva-te ao
plano. Acima de 50 anos também não há data, porque «Março de 2183» não ajuda
ninguém a decidir nada.

**A linha da honestidade.** A app tem **um só pote de poupança**
(`poupancaAcumulada`), e o objetivo é uma meta sobre esse pote — não uma conta
separada. A folha diz isso sempre, e diz também quantos meses de fundo de
emergência esse mesmo dinheiro cobre. Remover o objetivo **não** mexe no
dinheiro.

## Os meses

Tocar em **Ver todos os meses** (ou Perfil → Todos os meses) dá a lista de todos
os meses que a app viu, do mais recente para trás: o que guardaste, o que
sobrou, e uma fita com as fatias desse mês. É a fita que deixa comparar dois
meses sem ler um número — o mês com uma despesa fora do normal tem uma faixa
laranja que os outros não têm. Tocar num mês abre o Início nesse mês.

A app guarda cada mês que passa. **Sem servidor, nada corre com a app fechada**,
por isso um mês não fecha à meia-noite do dia 1: fecha **na primeira vez que
abres a app já no mês seguinte**. Nessa altura o mês anterior é arquivado como
estava, aparece um aviso no Início, e passa a estar na fita de meses lá no topo.

No Início aparece também **quanto os meses fechados puseram de lado** — a soma
da poupança e dos investimentos desses meses. É a soma dos registos, não do teu
saldo no banco: diz o que o plano separou nos meses que a app viu.

**O fecho não mexe em nenhum número teu.** A poupança acumulada continua a ser
tua para alterar. Se ficares meses sem abrir, é arquivado um registo — o do mês
que estava aberto; a app não inventa os meses que nunca viu.

## A conta

Não há contas nem servidor: a conta da **Easy.** é local. Crias um perfil com o
teu nome, podes pôr uma foto e preencher os teus dados, e podes definir um
**PIN de 4 dígitos**. Com PIN definido, a app abre trancada e o botão
**Terminar sessão** tranca-a na hora.

**O PIN não cifra nada.** Tranca a porta da frente — serve para o telemóvel
passar de mão sem mostrar o teu dinheiro. Quem tiver o telemóvel desbloqueado e
as ferramentas do browser abertas chega aos dados na mesma. Se te esqueceres do
PIN não há como o repor: a única saída é apagar tudo e recomeçar.

## Duas coisas que convém saber

**Despesas anuais.** Uma despesa marcada como anual aparece a cheio pelo valor
que é cobrado (`240,00 €/ano`) e, por baixo, pelo que custa por mês
(`20,00 €/mês`). É o valor mensal que entra na conta e nos totais.

**Modo discreto.** Um interruptor no Perfil — ou um toque no donut — troca todos
os valores em euros por `••••`. O donut, as percentagens e os nomes ficam à
vista: esconde valores, nunca estrutura. Os campos que estás a editar continuam
legíveis, senão não dava para escrever neles.

## Os bots

`npm run bots` solta bots com feitios diferentes a usar a app a sério, com
toques e arrastos verdadeiros do protocolo do Chromium — não cliques de rato,
que não disparam `touchstart` nenhum e deixariam o gesto de lado por testar.

| Feitio | O que faz |
|---|---|
| **apressado** | Toca depressa, não espera pelas animações, repete-se |
| **cuidadoso** | Espera, lê, confirma |
| **destrutivo** | Apaga tudo o que vê, e desfaz metade |
| **indeciso** | Abre folhas e fecha-as sem guardar — é o que apanha estado por limpar |
| **polegar** | Só arrasta, para martelar o gesto de lado |

Depois de **cada** ação verificam-se todas as invariantes: ecrã em branco,
valores por formatar (`NaN`, `undefined`, `[object Object]`), transbordo
horizontal a 390 px, o orçamento no disco a continuar a ser um orçamento, alvos
de toque abaixo de 44 px, erros de consola, e qualquer pedido de rede — que tem
de ser zero.

Cada corrida tem uma **semente**, impressa no cabeçalho. `--semente N` repete-a
toque a toque, e é assim que um erro encontrado por acaso passa a ser um erro
reproduzível. Quando uma invariante cai, o relatório traz o rasto das últimas
ações que lá chegaram.

## O que ficou de fora

- **Pré-visualização de PDF em iOS.** O `<object>` não renderiza PDF no Safari de
  iPhone; lá o utilizador cai no botão **Descarregar**. Um `pdf.js` embutido
  resolveria — meio dia.
- **Swipe para apagar com gesto contínuo real.** Está implementado com eventos de
  ponteiro e limiar; falta a fase de *momentum* e o encosto elástico. ~2 horas.
- **Reordenar despesas fixas** por arrastamento. ~2 horas.
- **Importar documentos a partir do ZIP exportado** (a exportação existe, o
  caminho de volta não). ~2 horas.

## Aviso

A **Easy.** é uma ferramenta de organização pessoal. Não presta aconselhamento
financeiro, fiscal ou de investimento. Os valores apresentados são estimativas.
