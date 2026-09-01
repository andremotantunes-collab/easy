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

- o Hero mostra o número negativo a `--negative`, sem arredondar para zero;
- o donut passa a ter como total os **compromissos** (fixas + investimentos +
  poupança), com as três fatias reais;
- um anel fino interior mostra **quanto do plano o rendimento cobre** — a parte
  coberta a `--accent`, a que falta a `--negative`;
- o cartão "Por dia" é substituído pela frase de défice;
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

## 11. Âmbito que ficou fora

Nada foi cortado em silêncio. Ver a secção "O que ficou de fora" no `README.md`.
