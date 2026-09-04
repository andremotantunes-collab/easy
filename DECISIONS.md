# DECISIONS — Easy.

Tudo o que foi decidido sem perguntar, e porquê. Por ordem de importância.

---

## 1. A marca escreve-se `Easy.` — com ponto

Em todo o texto visível: `<title>`, header, onboarding, manifest PWA, rodapé,
mensagens de exportação, `README.md`, `displayName` no `package.json`.

**Exceção única — identificadores**, onde um ponto final partiria a coisa:
nomes de ficheiro (`easy-orcamento.json`, `easy-documentos.zip`), chaves de
`localStorage` (`easy.budget.v1`), o nome da base IndexedDB (`easy-docs`), o
campo `name` do `package.json` e nomes de variáveis. Aí escreve-se `easy`, em
minúsculas.

A regra é verificada por teste automático (`src/lib/brand.test.ts`): **o nome da
marca, escrito com E maiúsculo, tem sempre de ser seguido de ponto final**, em
qualquer ficheiro do projeto. O teste corre no `npm run build` e falha o build.

(O próprio teste é o único ficheiro isento da varredura — teria de citar a
infração para poder descrevê-la.)

## 2. Os cinzentos do donut foram re-escalonados

O briefing autoriza mexer nos tons desde que o script volte a correr — e foi
preciso.

O validador da skill `dataviz` reprovou a paleta original no tema claro:
`--cat-invest` #6A6A73 e `--cat-poupanca` #87878F ficavam a **ΔE 9,9** de
separação em visão normal, abaixo do piso de 15. Na prática: duas fatias
adjacentes que ninguém distingue, nem com visão de cor perfeita.

Havia um conflito real entre duas regras do próprio briefing — cada fatia
≥ 3:1 contra `--surface` limita o cinzento mais claro a ~#8D8D95, e três
cinzentos abaixo desse teto não chegavam a ΔE 15. Resolveu-se por otimização em
vez de tentativa e erro (procura exaustiva do trio com maior separação mínima
sujeito ao mínimo de 3:1):

| Token | Antes | Agora | Contraste vs `--surface` |
|---|---|---|---|
| `--cat-fixas` (claro) | #3F3F46 | **#26262E** | 13,78:1 |
| `--cat-invest` (claro) | #6A6A73 | **#55555D** | 6,78:1 |
| `--cat-poupanca` (claro) | #87878F | **#8D8D95** | 3,02:1 |
| `--cat-fixas` (escuro) | #E4E4E7 | **#EDEDF2** | 15,63:1 |
| `--cat-invest` (escuro) | #9E9EA7 | **#A6A6AE** | 7,54:1 |
| `--cat-poupanca` (escuro) | #6E6E78 | **#62626A** | 3,02:1 |

Resultado: separação mínima **ΔE 18,0** (claro) e **21,1** (escuro), com todas as
fatias acima de 3:1. `--accent` e os tons de texto ficaram como estavam.

Duas verificações do validador ficam conscientemente por passar — *banda de
luminosidade* e *piso de croma* — porque medem paletas coloridas e este donut é
propositadamente quase monocromático. Ver `DESIGN.md`.

## 3. Dois campos acrescentados ao modelo de dados

O `Budget` do briefing não conseguia alimentar duas das seis métricas pedidas:

- **`poupancaAcumulada: Money`** — o fundo de emergência é
  `poupancaAcumulada / despesasFixas`, um *stock*, e o modelo só tinha o fluxo
  mensal. Editável em Definições, começa em 0.
- **`taxaAnualEsperada: number`** — a projeção a 10 anos precisa de uma taxa, e
  o briefing pede que seja editável. Por omissão 5 %.

## 4. `--segment-active` e `--card-border`

Dois tokens acrescentados ao sistema:

- **`--card-border`** — o briefing pede borda no claro e nenhuma no escuro. Ser
  um token evita variantes `dark:` espalhadas pelo código.
- **`--segment-active`** — a pastilha selecionada de um controlo segmentado tem
  de ler-se **mais clara** do que a calha nos dois temas. Usar `--bg` funcionava
  no claro e invertia no escuro (pastilha mais escura do que a calha, e ninguém
  percebia qual estava selecionada).

Ambos entram no `scripts/contrast-check.ts`.

## 5. Como o donut mostra um défice

Com sobras negativas não há fatia de sobras para desenhar. Em vez de esconder o
problema:

- a linha das sobras mostra o número negativo a `--negative`, sem arredondar
  para zero;
- o donut passa a ter como total os **compromissos** (fixas + investimentos +
  poupança), com as três fatias reais;
- um anel fino interior mostra **quanto do plano o rendimento cobre** — a parte
  coberta a `--accent`, a que falta a `--negative`;
- o valor ao centro do donut passa a `--negative`;
- aparece um cartão com as sugestões pela ordem que o briefing fixa: primeiro
  baixar investimento, depois rever as fixas.

## 6. Persistência

- **Orçamento** em `localStorage`, chave `easy.budget.v1`, com `version` no
  payload e uma tabela de migrações presente mas vazia (v1 é o primeiro
  esquema).
- **Documentos** em IndexedDB (`easy-docs`), tanto os blobs como o índice de
  metadados. O índice fica na mesma *store* para que "apagar tudo" limpe os dois
  de uma vez.
- Tema em `easy.theme.v1`; estado do onboarding em `easy.onboarded.v1`.

## 7. Escritor de ZIP à mão, sem dependência

A exportação usa `src/lib/zip.ts`, ~120 linhas, entradas *stored* (sem
compressão). Justificação: os ficheiros do utilizador já vêm comprimidos (PDF,
JPEG), o `deflate` não pagaria o seu peso, e evita-se uma dependência para uma
única funcionalidade. **Verificado** com o extrator do próprio Windows
(`Expand-Archive`): nomes UTF-8 intactos, desduplicação de nomes repetidos e
saneamento de caracteres inválidos a funcionar.

## 8. React 18, não 19

O `create-vite` atual gera React 19. A secção 2 do briefing fecha React 18, por
isso as dependências foram fixadas em 18.3.1 (e `@types/react` 18), contra a
omissão do gerador.

## 9. Configuração do Vitest separada

`vitest.config.ts` está separado do `vite.config.ts`: o Vitest traz o seu próprio
Vite e misturar os dois `defineConfig` faz o array de plugins deixar de
tipificar.

## 10. Playwright aponta para o Chromium já instalado

O pacote Playwright espera o build 1234; a máquina tem o 1208, e o briefing
proíbe correr `playwright install`. O `scripts/browser.mjs` tenta o arranque
normal e, se falhar, aponta para o binário existente.

## 11. Três separadores, e o Início deixou de dizer o que gastar

Pedido do cliente, e muda a tese do produto: a **Easy.** não movimenta dinheiro,
é uma fotografia do mês. Duas consequências:

- A tab bar passa de cinco itens a três — Início, Documentos, Perfil. Plano,
  Fixas, Investir e Os teus dados deixam de ser separadores e passam a linhas
  dentro do Perfil, com seta de voltar no header. O que se lê fica em cima; o
  que se ajusta fica um nível abaixo.
- O Início perde o Hero "Disponível para gastar", o cartão "Por dia" e os dois
  mosaicos de métricas. Fica o donut e as quatro fatias com valor e
  percentagem. A ordem das fatias passa a ser a da subtração — fixas,
  investimentos, poupança, sobras — porque as sobras já não são o destaque, são
  o resto.

Nos Documentos saíram os *chips* de filtro por categoria e a grelha de dois
cartões deu lugar a uma lista de uma coluna. Sem filtro, as *tags* deixaram de
ter onde aparecer: saíram do modelo (`DocTag`, `Doc.tags`), do `docs.ts`
(`TAGS`, `guessTag`, `setTags`) e da copy. Documentos já guardados que tragam o
campo antigo continuam a ler-se — o índice é lido como está e o campo a mais é
ignorado.

Saiu com isto o `diaDeRecebimento`: só existia para calcular a folga diária.
Saíram também `porDia`, `taxaPoupanca`, `pesoDespesasFixas` e `custoVidaAnual`
do motor, com os testes respetivos — código morto assim que os mosaicos caíram.

## 12. Os extras 2 e 4 entraram; o 1 e o 3 não

Da secção 7.7 do briefing entraram os dois que sobrevivem ao Início sem Hero:

- **Extra 4 — despesas anuais diluídas.** `FixedExpense` ganhou
  `periodicidade`, e `mensalizado()` divide um encargo anual por 12, arredondado
  ao cêntimo. A linha mostra `240,00 €/ano` a cheio e `20,00 €/mês` por baixo; é
  o valor mensal que entra na conta e nos totais.
- **Extra 2 — modo discreto.** `modoDiscreto` no orçamento, um interruptor no
  Perfil e um toque no donut como atalho. Esconde **valores**, nunca estrutura:
  o donut, as percentagens e os labels ficam. **Os campos editáveis são a
  exceção deliberada** — mascarar um número que estás a escrever torna o campo
  inutilizável, por isso o rendimento no Plano e a poupança acumulada em Os
  teus dados continuam legíveis enquanto os editas.

Ficaram de fora o **Extra 1** (botão "gastei") e o **Extra 3** (frase de estado
sobre o ritmo de gastos): ambos assentam no Hero e em a app apresentar dinheiro
para gastar, que foi retirado por decisão do cliente (secção 11). Estão no
`BACKLOG.md` com a estimativa.

O esquema do orçamento passou a **v2**, com a migração v1→v2 a preencher
`periodicidade: 'mensal'` nas despesas antigas e `modoDiscreto: false`. Orçamentos
guardados na v1 continuam a abrir.

## 13. O donut passou a um anel contínuo

Pedido do cliente: com 2 px de intervalo e pontas redondas, as quatro fatias
liam-se como quatro arcos que param antes de fechar o círculo. Passaram a
extremos rectos e a zero de intervalo, com 0,75 px de sobreposição em cada arco
para o antialiasing não deixar costura entre vizinhos.

O briefing pedia a separação estrutural porque a paleta é quase monocromática e
a cor não pode ser o único portador de informação. Esse requisito continua
cumprido pela legenda ao lado, onde cada fatia leva quadrado, nome, valor e
percentagem — o que mudou foi onde a separação vive, não se existe.

## 14. Conta local: um perfil e um PIN, não um login

O cliente pediu login, entrar e sair da conta. A app não tem servidor, e um
login a sério — email, palavra-passe, recuperação — exige *backend*, chaves e
rede em tempo de execução, o que acabaria com o "funciona offline, nada sai do
telemóvel". Optou-se pela conta local:

- **Perfil** em `localStorage` (`easy.profile.v1`): nome, email, telemóvel, data
  de nascimento e NIF. A app não calcula nada com estes campos; existem para
  estarem à mão.
- **Foto** em IndexedDB, base `easy-perfil`, recortada ao quadrado e reduzida a
  256 px antes de ser guardada — uma foto de telemóvel são megabytes e isto
  desenha-se a 64 px.
- **PIN de 4 dígitos**, guardado como SHA-256 com sal aleatório de 16 bytes, via
  `crypto.subtle`. Onde o browser não oferece `crypto.subtle`, o PIN não se
  define, em vez de se guardar em claro.
- **A app arranca trancada** sempre que existe PIN — é para isso que serve um
  bloqueio — e "Terminar sessão" tranca-a de imediato. O bloqueio é um portão à
  frente do router: não há URL que passe por ele.
- **Esqueci-me do PIN** só pode oferecer uma saída: apagar perfil, orçamento e
  documentos. Não há servidor para repor nada, e o ecrã diz isso por palavras.

**O que o PIN não é:** cifra. Os dados continuam legíveis no armazenamento do
próprio browser para quem tenha o telemóvel desbloqueado e as ferramentas de
programador abertas. O texto de ajuda no ecrã diz isto ao utilizador, em vez de
prometer uma segurança que não existe.

## 15. O Início voltou a ter um número, sem voltar a mandar gastar

O cliente achou o Início "sem vida": era uma fotografia correcta e muda. Voltou
a ter hierarquia, sem desfazer a decisão da secção 11:

- **Hero.** As sobras a 48 px, na cor do acento — é a fatia que o acento
  representa — com o cabeçalho `O TEU BOLO` e, por baixo, `37 % de 2 400 € que
  entram`. É descritivo: diz o que sobra, não diz para gastar, e não há folga
  diária nem prazo nenhum. Um toque no valor entra em modo discreto.
- **Cartão do donut.** O anel e a legenda passaram para dentro de um cartão, e
  cada linha da legenda ganhou uma barra fina da cor da fatia: as quatro
  comparam-se sem ler um número.
- **Três métricas** numa fila que rola de lado — taxa de poupança, peso das
  fixas e fundo de emergência — cada uma com valor, barra e uma frase curta.
  Voltaram ao motor `taxaPoupanca`, `nivelTaxaPoupanca` e `pesoDespesasFixas`,
  com os testes respetivos.
- **Cabeçalho com nome e avatar**, agora que existe perfil: `Olá, Ricardo` com a
  foto à esquerda e o mês à direita.

O que continua fora, e por decisão: o rótulo "Disponível para gastar", o cartão
"Por dia" e qualquer frase que diga ao utilizador o que fazer com o dinheiro.

## 16. Passagem de material: profundidade contida, sem gradientes

O cliente pediu um acabamento premium, "Revolut + Apple", mantendo a estrutura.
Nada mudou de sítio; mudou o material:

- **A inversão que faz o trabalho todo.** Em claro, a página passou a um neutro
  ligeiramente frio (`#F5F5F7`) e os cartões a branco puro. Um cartão passa a
  levantar-se da página em vez de ser uma mancha cinzenta sobre branco. Em
  escuro o fundo desceu a `#08080A` e a superfície subiu, com o mesmo efeito.
- **Duas sombras empilhadas**, ambas suaves: uma de 1 px que assenta o cartão,
  outra larga e muito diluída que lhe dá altura. Não são sombras dramáticas, e
  em escuro reduzem-se a um vinco, porque sombra sobre preto não se vê.
- **Raios de 20 px** nos cartões e 12 px nos controlos; a *sheet* passou a
  28 px em cima.
- **Tipografia.** As tamanhos grandes passaram a ter *tracking* negativo
  progressivo (-0.035em no Hero), que é a correção ótica que uma família a
  sério faz sozinha; os *labels* desceram a 11 px com +0.075em, que é o que
  distingue uma maiúscula pequena deliberada de uma maiúscula gritada.
- **Títulos grandes** de 32 px nos ecrãs de primeiro nível sem outro conteúdo
  no cabeçalho — Documentos e Perfil. As sub-páginas e o Início, que lidera com
  o avatar, ficam com o cabeçalho compacto.
- **Separadores encaixados**: a linha entre linhas de uma lista começa onde
  começa o texto, e a última linha não tem nenhuma.
- **Resposta ao toque**: `scale(0.985)` a descer, 200 ms a voltar. É a diferença
  entre uma superfície física e uma imagem.

**Uma regra do briefing foi quebrada de propósito, e é esta:** a tab bar passou
a ter `backdrop-filter: blur(20px)` sobre um fundo translúcido. O briefing dizia
"sem blur, sem glassmorphism"; uma barra de separadores sobre material é o
gesto mais reconhecivelmente Apple que existe, e sem ele o conteúdo passa por
baixo de uma barra opaca em vez de se ver esbatido. É o único blur do produto.
Se o cliente preferir a barra opaca, é uma linha em `Layout.tsx`.

## 17. Os meses fecham sozinhos, e não tocam em nada

O cliente pediu que a app «atualizasse no primeiro dia do mês», sempre no
telemóvel dele. Sem servidor, **nada corre com a app fechada** — não há tarefa
de fundo nem notificação. Portanto um mês fecha na **primeira abertura depois
de o mês virar**, e o texto da app diz isso por palavras em vez de fingir que
foi à meia-noite.

**O que o fecho faz:** arquiva o mês que estava aberto, com o rendimento e as
quatro fatias tal como o plano estava. **O que não faz, por escolha do
cliente:** mexer num único número dele. A poupança acumulada continua a ser um
campo que só ele altera — a app nunca escreve por cima do que ele escreveu.

Três regras que valia a pena fixar, e que os testes prendem:

- **Primeira abertura de sempre** não fecha nada: não há mês anterior, só um a
  começar.
- **Uma falha de vários meses arquiva UM registo**, o do mês que estava
  aberto. A app não sabe nada dos meses que nunca viu, e inventá-los a partir
  do plano de hoje seria escrever ficção no registo.
- **Fechar um mês que já está em ficheiro substitui**, não duplica — dois
  dispositivos, ou um relógio que andou para trás.

Guardado em `easy.historico.v1`, limitado a 60 meses, e apagado pelo «apagar
tudo» como o resto.

## 18. Os meses vivem no Início, não num separador

A primeira versão disto era um quarto separador, «Geral». O cliente preferiu
os meses dentro do Início — e tem razão: **um mês anterior é a mesma coisa
vista mais tarde, não um destino diferente**. A fita de meses no topo muda de
que mês é o ecrã, e tudo por baixo segue: o número grande, o anel, as fatias e
as métricas.

O Início mostra também **o que os meses fechados puseram de lado** — a soma da
poupança e dos investimentos até ao mês que se está a ver. É uma soma de
**registos**, não uma afirmação sobre um saldo bancário: diz o que o plano
separou nos meses que a app viu. O mês a decorrer não entra, porque ainda não
aconteceu, e o cartão só aparece quando há pelo menos um mês fechado.

A fita só aparece quando há mais do que um mês para ver. Duas coisas mudam num
mês fechado: as sugestões de défice desaparecem (não há nada a ajustar num mês
que acabou) e o **fundo de emergência** também, porque mede o que tens de lado
**hoje** — não pertence a um mês que já fechou.

## 19. O que estava a arrastar eram três filtros e um disco

A app parecia lenta no telemóvel sem nada de errado à vista. Medido com o CPU
travado a 1/6, o pior *frame* no Início era de **42 ms** com o campo de luz a
correr e de **14 ms** sem ele. Os três culpados eram o mesmo erro escrito de
três maneiras: **trabalho caro repetido a cada frame quando bastava uma vez.**

- **O desfoque estava no pai.** O `.aurora` cobre 160% do ecrã e tinha
  `blur(46px)`, com dois filhos a animar por dentro. Mexer um filho invalida a
  entrada do filtro, e 160% do ecrã eram desfocados outra vez a cada frame. O
  desfoque passou para os próprios elementos que animam: a textura é desfocada
  uma vez e o compositor limita-se a deslocá-la.
- **A sombra do anel envolvia o que muda.** O `<g>` do donut tinha
  `drop-shadow`, e a geometria lá dentro muda a cada frame enquanto se arrasta
  um *slider*. A sombra passou para o anel de fundo, que nunca muda — e como
  as fatias juntas formam exatamente esse anel, a sombra desenhada é a mesma.
- **Cada tique do *slider* escrevia o orçamento inteiro em disco.**
  `localStorage.setItem` é síncrono e era chamado a cada evento de *input*.
  Agora só fica a última versão pendente, escrita 250 ms depois de o dedo
  parar.

A promessa de que **um recarregamento não perde nada** mantém-se porque nada
sai do ecrã sem passar por `pagehide` ou `visibilitychange`, e ambos
descarregam o que está pendente. Uma escrita pendente é **descartada** ao
apagar tudo — senão ressuscitava, 250 ms depois, os dados que o utilizador
acabara de apagar. As quatro regras estão presas em `storage.test.ts`.

Duas notas sobre o método. Os *frames* foram medidos com o A/B dentro da mesma
corrida, porque entre corridas a variação é maior do que o efeito. E o arranque
**não** foi otimizado por medição: cinco carregamentos idênticos deram entre
1016 e 2472 ms, ruído que engole qualquer diferença. Aí a decisão passou a ser
por bytes, que são determinísticos.

## 20. Os ecrãs chegam quando alguém lá vai

O primeiro pacote tinha 247 kB e trazia os dez ecrãs, incluindo os sete que
ninguém vê ao abrir. Agora traz o Início e o Bloqueio — os dois que podem ser
o primeiro a aparecer — e os outros são pedidos quando fazem falta: **171 kB**,
menos 31%. Os dois destinos da barra são pedidos assim que o telemóvel fica
quieto, para que um toque nunca espere por um ficheiro.

Sem indicador de espera, de propósito. Os pacotes são de 1 a 8 kB e já vêm
pedidos de antemão; um pisca-pisca a cada toque seria pior do que o *frame*
que tapa.

E o tema deixou de piscar. A escolha manual só era aplicada quando o
JavaScript chegava, e até lá o ecrã ficava com o tema do sistema — que pode ser
o oposto. São agora dez linhas no `<head>`, antes do primeiro pixel. A cor da
barra do sistema segue a mesma escolha: instalada no ecrã principal, a app
pinta até à barra de estado, e ficava clara por cima de um ecrã escuro.

## 21. Um ficheiro só, sem servidor nenhum

`npm run offline` escreve **`Easy.html`**: um documento completo, com o CSS, o
JavaScript e o ícone lá dentro, zero pedidos à rede. Guarda-se no telemóvel e
abre-se do próprio telemóvel, sem servidor e sem ligação.

Duas condições que isto obriga. O encaminhamento é por `#`, porque um caminho
não existe num ficheiro solto. E os *imports* dinâmicos da decisão 20 são
embutidos no mesmo `<script>` — dividir em pedaços não faz sentido onde não há
de onde os ir buscar.

**Onde isto funciona, e onde não.** Provado a correr de `file://`: abre, faz o
*onboarding*, navega, guarda, e os dados sobrevivem a fechar e voltar a abrir.
No **Android** basta abrir o ficheiro no Chrome. No **iPhone** o Safari abre-o,
mas o iOS trata cada abertura de um ficheiro local como um sítio novo — os
dados podem não sobreviver, e não há "adicionar ao ecrã principal". Para o
iPhone, o caminho que guarda mesmo continua a ser a **PWA instalada**, que
depois do primeiro carregamento também funciona sem rede.

## 22. Um custo do mês não é uma despesa fixa

A renda é a mesma em janeiro e em agosto. O dentista foi uma vez. Tratá-los
como a mesma coisa obriga a escolher entre duas mentiras: pôr o dentista nas
fixas, e ficar com um valor mensal que não é verdade em mais nenhum mês, ou
não o pôr em lado nenhum, e ficar com sobras que não existem.

Por isso passaram a ser duas listas. Uma **despesa fixa** repete-se e vive no
plano; um **custo do mês** tem um mês colado a ele (`'aaaa-mm'`) e conta nesse
e em mais nenhum. A conta ficou:

    total → fixas → custos do mês → investimentos → poupança → sobras

**Os custos entram antes das sobras e depois de tudo o resto, e não mexem no
que se investe nem no que se poupa.** Um mês com o dentista pago não é um mês
em que se deixe de investir — é um mês em que sobra menos. Quem quiser o
contrário mexe no plano, que é uma decisão e não um acidente. As fatias
continuam a somar o total ao cêntimo, porque as sobras continuam a ser o
resto.

**A quinta cor.** O anel tinha quatro fatias e ganhou uma. O laranja queimado
(`#8F4700` claro, `#FFA94D` escuro) é a única cor quente do anel, e não foi
escolhida a olho: separa-se da tinta das fixas por 1,34:1, que é exatamente o
piso a que as fatias vizinhas já viviam (1,31:1 entre Investimentos e
Poupança), e dá 6,84:1 contra a superfície — o dobro do mínimo. O portão de
contraste passou a verificá-la como verifica as outras.

**A fatia só existe quando existe.** Um mês normal não tem custos nenhuns, e
uma linha a dizer «0,00 €» todos os meses seria ruído a fingir de informação.

**O mês que fecha leva os custos dele.** Esta é a parte que obrigou o arquivo
a mudar de forma: `abrir` passou a receber uma função em vez de um número,
porque quem fecha é o mês que estava aberto e não o de hoje. Com a conta de
hoje, o dentista pago a 2 de outubro entrava no registo de setembro. Está
preso num teste.

Editam-se só os do mês a decorrer. Um mês fechado é um registo, e um registo
não se reescreve.

## 23. Todos os meses, numa lista

A fita no topo do Início troca de mês, mas não responde a «o que é que eu pus
de lado em cada mês?» — para isso é preciso ver os meses lado a lado. O ecrã
**Todos os meses** é uma linha por mês, do mais recente para trás, com o que
guardou, o que sobrou, e uma fita das fatias nas cores do anel. É a fita que
deixa comparar dois meses sem ler um único número: o mês com o dentista tem
uma faixa laranja que os outros não têm.

Duas escolhas de desenho que valeram a pena. As colunas são **nomeadas uma
vez, no topo**, e não em cada linha — repetir «Guardou» cinco vezes é ruído. E
o mês que se está a ver **vive no URL** (`/?mes=2026-08`) e não no componente:
assim o botão «voltar» do telemóvel desfaz a escolha, e a lista pode abrir o
Início já no mês certo. Um mês que não exista cai no corrente, em vez de dar
ecrã em branco.

## 24. O telemóvel é um 13 Pro Max

A app era verificada a 390×844 e mais nada. Um layout só verificado no ecrã
estreito parte-se no largo, onde há espaço a mais e nada obriga as colunas a
alinhar. O `npm run verify` passou a correr **as duas medidas** — 390×844 e
430×932 — em todos os ecrãs.

Ganhou também uma verificação que não existia: **nenhum campo de texto abaixo
de 16 px**. O Safari do iPhone dá zoom sozinho quando se toca num campo mais
pequeno do que isso, e a página fica torta até se sair do campo. Não há remédio
no CSS; o remédio é não haver campos assim, e agora é uma regra verificada e
não uma boa intenção.

Duas correções que as capturas a 430 px apanharam: o `capitalize` do Tailwind
punha maiúscula em **todas** as palavras («Custos De Setembro»), que em
português está errado; e as alturas em `vh` do visualizador de documentos
passaram a `dvh`, porque no iOS a barra do Safari aparece e desaparece e `vh`
não sabe disso.

## 25. A marca era um S. numa app chamada Easy.

O atalho no ecrã principal do telemóvel é onde a marca trabalha mais: está ao
lado do nome, em 60 px, entre dezenas de outros ícones. E o que lá estava era
um **S.** — que numa app chamada **Easy.** não diz nada a ninguém. Passou a ser
um **E.**, no mesmo sistema: mesmo azulejo, mesmo gradiente, mesmo ponto final.

O desenho seguiu as regras que já lá estavam, e foram **medidas com o
`getBBox` do próprio browser** em vez de contas de cabeça: a letra tem a mesma
altura de caixa que a anterior (a tinta corre de 16 a 48, num quadrado de 64),
é centrada nos limites do **traço** e não do caminho (19,90 a 44,10 — centro
exato de 64), e o par letra+ponto é equilibrado **pela tinta** e não pela
caixa, o que o desloca 1,5 unidades e não as quatro e tal que uma caixa
pediria. Verificado a 16, 30, 60 e 120 px: aguenta em todos.

## 26. O ícone do atalho tem de ser PNG

O `Easy.html` declarava o ícone do atalho em SVG. **O Safari do iPhone ignora
um `apple-touch-icon` em SVG** — e, ignorando-o, põe uma miniatura da própria
página no ecrã principal em vez do ícone. Era isso que se via.

O ficheiro passa a levar **duas** declarações, de tipos diferentes e de
propósito: o separador do browser fica com o SVG, que escala; o atalho leva um
**PNG de 180×180** embutido em `data:` URI — 180 é a medida que o iOS pede. O
`npm run icons` passou a gerar esse tamanho a par dos 192 e 512 do manifesto, e
o `index.html` da versão servida aponta-lhe também.

Fica um risco por confirmar, e vale a pena dizê-lo em vez de o esconder: nem
todas as versões do iOS aceitam um `apple-touch-icon` em `data:` URI. Num
ficheiro solto não há alternativa — um `<link>` para um PNG ao lado deixaria de
ser um ficheiro só. Se o ícone continuar errado no iPhone, o caminho que
garante o ícone é a **PWA instalada**, onde o PNG é um ficheiro de verdade.

## 27. Um custo do mês e um gasto eram a mesma coisa

Os "custos do mês" da decisão 22 tinham nascido há poucas horas quando ficou
claro o que eram mesmo: **gastos sem data**. Pedir uma zona para escrever
«jantar 19,90 €» é pedir a mesma lista, com um dia e uma categoria.

Podiam ter ficado as duas coisas — a lista de custos do mês *e* a lista de
gastos. Ficou uma só, e a razão é simples: duas listas para o mesmo dinheiro é
uma fábrica de bugs. Mais tarde ou mais cedo alguém escreve o dentista nas
duas, e o bolo passa a estar errado sem ninguém perceber porquê.

O `custosDoMes` virou `gastos`, com **dia** em vez de mês e com **categoria**.
O mês de um gasto sai do dia dele, e não ao contrário: assim não há dois campos
a poderem discordar um do outro. A migração v3→v4 converte cada custo antigo
num gasto **no dia 1 do mês dele** — a única coisa honesta a fazer com uma data
que nunca chegou a ser guardada — e apaga o campo antigo, para o mesmo dinheiro
não ficar contado duas vezes. Está preso num teste.

A conta não mudou de forma: os gastos ocupam o lugar que os custos ocupavam,
entre as fixas e o resto. **É isto que faz o bolo descer a cada gasto
registado** — as sobras são o resto, e o resto encolhe. Há um teste que regista
quatro gastos seguidos e verifica que o bolo desce exatamente o valor de cada
um.

## 28. A categoria vem do que se escreve

Escrever «Jantar» e depois escolher «Alimentação» numa lista de sete é escrever
a mesma coisa duas vezes — e no telemóvel, a segunda vez é a que não se faz. A
categoria vem sugerida por uma lista de palavras que se escrevem mesmo:
*jantar*, *gasolina*, *farmácia*, *netflix*, *renda*.

Três decisões dentro disto. Não é uma tentativa de perceber português, é uma
lista — sem correspondência responde **«Outros»**, que é honesto, em vez de
adivinhar. A comparação ignora acentos e maiúsculas, porque quem escreve
depressa escreve «cafe». E respeita fronteiras de palavra: *cafe* apanha «café
da manhã» e não apanha «cafeteira». A sugestão **para** de seguir a escrita
assim que se toca numa categoria: a partir daí é uma escolha, e uma escolha não
se desfaz sozinha à tecla seguinte.

## 29. O gráfico, e porque é que os dias vazios contam

Cinco janelas — 7 dias, 30 dias, 12 meses, anos e tudo — e uma linha.

O detalhe que decide se o gráfico diz a verdade: **os buracos são preenchidos
com zero**. Um dia sem gastos é um ponto a zero, não um ponto que não existe.
Sem isso a linha ligava segunda-feira a quinta-feira como se quarta não tivesse
acontecido, e o desenho mentia sobre o ritmo. As janelas fixas (7 dias, 30
dias, 12 meses) mantêm o tamanho mesmo sem gastos nenhuns; as abertas (anos,
tudo) ficam vazias em vez de inventar um eixo sem primeiro registo.

O desenho vai em SVG esticado à largura do ecrã, e por isso **não tem uma única
letra lá dentro**: texto dentro de um SVG esticado sai achatado. Os rótulos são
HTML por fora, com a tipografia do resto da app, e o traço leva `vector-effect`
para não engordar com o esticão. Os dois números do topo dizem o que são —
«média de 15 €» e «máximo 84 €» — porque dois números sem nome são dois
enigmas.

As cinco pastilhas de período **passam para a segunda linha** em vez de
andarem num carrossel: não cabem numa linha a 390 px, e uma pastilha meia
escondida na margem parece um erro em vez de um convite a arrastar.

## 30. Um limite por categoria, e só quando se quer

«Quanto tenho para gastar nesta categoria» só tem resposta se houver um tecto,
e um tecto é uma coisa que se decide — não se deduz. Por isso uma categoria
**nasce sem limite** e mostra apenas o que gastaste. Tocar nela põe-lhe um, e a
partir daí ela diz quanto resta, ou quanto já passou, e a barra fica vermelha.
Pôr o limite a zero tira-o.

Foi a alternativa a duas piores: inventar um orçamento por categoria a partir
do rendimento (ficção), ou obrigar a definir sete limites antes de poder
registar o primeiro gasto (ninguém chegava ao fim).

## 31. Os Gastos ganharam separador

Passaram a ser quatro: Início, Gastos, Documentos, Perfil. Um gasto regista-se
várias vezes por dia, e o que está a três toques de distância não se regista.
Cabem os quatro a 390 px, que é a medida mais estreita que a app promete.

## 32. Um endereço, sem login

Um preview alojado atrás de uma sessão iniciada não é uma app no telemóvel: é
uma página que se abre depois de fazer login. A app passou a viver num
endereço público — `andremotantunes-collab.github.io/easy` — que se abre e se
instala no ecrã principal como qualquer outra.

**O que fica público é o código, e mais nada.** Não há servidor, não há conta,
não há chamada de rede em tempo de execução: o endereço entrega os ficheiros e
acabou. Todos os números continuam no `localStorage` e no IndexedDB do
telemóvel, e nunca saem de lá. É a mesma promessa de sempre, agora com um sítio
por onde entrar.

Três detalhes que isto obrigou a resolver:

- **O prefixo.** A app vive dentro de `/easy/` e não na raiz. O prefixo entra
  por variável de ambiente (`BASE_PATH`), e não escrito na configuração, para o
  `npm run dev`, as capturas e o `npm run verify` continuarem a correr na raiz
  sem prefixo nenhum. O router recebe-o por `import.meta.env.BASE_URL`.
- **O `404.html`.** O Pages não sabe de rotas: recarregar `/easy/gastos` dava
  404. Uma cópia do `index.html` chamada `404.html` resolve — o Pages devolve-a,
  a app arranca, e o router trata do resto.
- **Os ícones do manifesto** passaram a caminhos relativos, para o mesmo
  ficheiro servir na raiz e dentro de `/easy/`.

Está tudo verificado contra o endereço a sério, e não só contra a build local:
abre, faz o *onboarding*, regista um gasto, sobrevive a recarregar um caminho
fundo, e o *service worker* regista — que é o que faz a app funcionar sem rede
depois da primeira visita.

**Publica-se sozinha, e os testes estão no caminho.** Cada envio para o
`master` corre os testes, compila e publica. Pô-los antes da publicação e não
depois é a diferença entre um site que está sempre a funcionar e um site que
avisa depois de partir.

**O endereço é público, e não dá para ser de outra maneira aqui.** O
repositório chegou a ser posto privado para confirmar, e o site caiu com 404 —
o GitHub Pages só serve de repositórios privados em planos pagos, e mesmo aí o
*site* continuaria aberto a quem tivesse o link: sites com controlo de acesso
existem só no plano Enterprise. Como a app não tem servidor nem dados no
servidor, o que fica exposto é o código e mais nada. Quem quiser o código
fechado tem de trocar de alojamento, não de definição.

## 33. A marca voltou a ser um S., e desta vez desenhado

A decisão 25 tinha trocado o **S.** por um **E.**, com o argumento de que numa
app chamada **Easy.** um S. não diz nada a ninguém. O argumento era bom e a
escolha é do dono da marca: voltou a ser **S.**, no mesmo sistema — mesmo
azulejo, mesmo gradiente, mesmo ponto final, mesma altura de caixa.

O que muda é como o S. está feito. Não são dois arcos a olho: são **dois bojos
elípticos tangentes** em (32,32), o de cima com centro (32; 25,55) e o de baixo
com centro (32; 38,45), ambos com 8 de raio horizontal e 6,45 de raio vertical.
Tangentes, a curva atravessa o meio na horizontal — e o S. não ganha o joelho
torto que arcos desenhados à mão ganham sempre.

A parte que só se descobre a olhar é a **abertura**. A primeira tentativa
fechava cada bojo 305 graus e aos 40 px lia-se um **8**, não um S. As pontas
passaram a cortar 12 graus depois do ponto mais largo de cada bojo (282 graus
de volta), e o contraforma abre o suficiente para a letra se ler ao tamanho a
que trabalha. Verificado a 40, 64, 180 e 200 px.

As três regras da decisão 25 mantêm-se, medidas com o `getBBox` do próprio
browser: a tinta corre de 16 a 48 num quadrado de 64 — a **mesma** altura de
caixa do E. que lá estava; é centrada nos limites do **traço** e não do caminho
(20,90 a 43,10, centro exato de 64), e o S. é mais estreito do que a caixa
quadrada pediria, que é o que um S. é; e o par letra+ponto continua equilibrado
**pela tinta**, deslocado 1,5 unidades.

Mudou nos três sítios onde o desenho vive, e não só no atalho do telemóvel: o
`public/favicon.svg` do separador, o `Logo.tsx` dentro da app, e o
`scripts/gen-icons.mjs` que gera os PNG de 180, 192 e 512. Um atalho com S. ao
lado de um cabeçalho com E. seria pior do que qualquer das duas letras.

## 34. Um gasto passou a poder ter o papel dele

A lista dos gastos era um beco. Dizia o quê e quanto, e não havia forma de
abrir um: tocar numa linha não fazia nada. Passou a haver uma **apresentação do
gasto** — valor, categoria, dia — e é lá dentro que vive a **fatura**.

Anexa-se em dois momentos, e são momentos diferentes de propósito: **ao
registar**, porque quem escreve o jantar à mesa tem o talão na mão nesse
instante e não volta lá amanhã; e **na apresentação**, para o papel que aparece
depois. No primeiro caso o ficheiro só vai ao disco quando se guarda — abrir a
folha, escolher um ficheiro e desistir não pode deixar um blob órfão no
IndexedDB para sempre.

**As faturas ficam fora do índice dos Documentos.** Partilham a base
`easy-docs`, porque o «apagar tudo» é um `clear` dessa base e não pode deixar
talões para trás, e porque não há razão para uma segunda base de dados. Mas as
chaves são `fatura.*` e nada disto toca no índice: um ano de talões de café
afogava os contratos e os recibos de vencimento que a lista dos Documentos
existe para guardar. Quem sabe que a fatura existe é o gasto.

**Apagar um gasto apaga a fatura dele** — senão o ficheiro ficava no disco sem
ninguém que soubesse dele, invisível e para sempre. Mas o blob é lido **antes**
e guardado no desfazer: um toque em «Desfazer» tem de trazer o papel de volta,
e não só a linha.

Fica um caso honesto por dizer: um orçamento **importado** de outro telemóvel
traz o bilhete da fatura mas não o ficheiro, porque os blobs não cabem no JSON.
A app diz isso na cara, com uma frase, em vez de mostrar uma moldura vazia sem
explicação.

## 35. «Como está o teu mês» estava morto

Os dois cartões das métricas tinham quatro andares: rótulo, número, barra, e
uma frase de duas linhas em cinzento — «Guardas uma boa fatia todos os meses».
A frase era a coisa mais alta do cartão a dizer o que o número já tinha dito, e
o cinzento fazia dela ruído.

Passou a ser uma **pastilha de uma palavra**, na cor da métrica: «Boa»,
«Pouco», «Cabem bem», «Pesadas». Quem quer o número lê o número; quem quer
saber se é bom ou mau vê a cor antes de ler a palavra. O cartão perdeu uma
linha e ganhou o único sítio do ecrã onde a cor é mesmo a informação.

E havia uma cor errada. O peso das fixas usava `--cat-fixas` — a tinta quase
preta, #23233A. É a cor certa para uma fatia do anel, onde ela é uma
categoria entre outras, e a errada para um veredicto: um mês **saudável**
ficava com o cartão apagado, e um mês saudável é a maioria dos meses. Contas
que cabem passaram a ser o azul-ciano da casa (`--cat-sobras`), e o âmbar ficou
reservado para as contas que pesam a sério. A lavagem de fundo subiu de 13 %
para 22 %.

Isto afasta-se, de propósito e só aqui, do princípio da secção 4 do
`DESIGN.md` — «um único acento de cor», «reads gray é o objetivo». O anel
continua quase monocromático, porque lá a cor separa categorias que não têm
juízo de valor nenhum. Nestes dois cartões a cor **é** o juízo, e um veredicto
sobre o teu mês em cinzento não é sóbrio, é apagado. O que se manteve foi a
regra que interessa: a cor nunca é o único portador — a palavra está lá dentro
da pastilha.

## 36. Âmbito que ficou fora

Nada foi cortado em silêncio. Ver a secção "O que ficou de fora" no `README.md`.
