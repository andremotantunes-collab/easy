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
| `npm run shots -- 7` | Captura os ecrãs a 390×844 nos dois temas e monta a folha de contacto |
| `npm run verify` | Verificação automática: rede, scroll horizontal, alvos de toque |

## Instalar no telemóvel

**iPhone (Safari):** abre o endereço de rede → botão **Partilhar** → **Adicionar
ao ecrã principal** → **Adicionar**. Fica com ícone próprio e abre sem barra de
endereço.

**Android (Chrome):** abre o endereço → menu **⋮** → **Instalar aplicação**.

Depois do primeiro carregamento a app **funciona offline**: o *service worker*
guarda tudo o que é preciso.

## Onde ficam os dados

Tudo fica **no dispositivo**. A app não tem backend, não faz chamadas de rede em
runtime, não usa contas nem analytics.

| O quê | Onde | Chave |
|---|---|---|
| Orçamento (rendimento, percentagens, despesas fixas) | `localStorage` | `easy.budget.v1` |
| Documentos (ficheiros e índice) | IndexedDB | base `easy-docs` |
| Tema | `localStorage` | `easy.theme.v1` |
| Onboarding feito | `localStorage` | `easy.onboarded.v1` |

**Consequência importante:** se limpares os dados do browser, perdes tudo. Por
isso há **Exportar orçamento (JSON)** em Definições e **Exportar tudo (ZIP)** em
Documentos.

## Os cinco ecrãs

| Rota | O que faz |
|---|---|
| `/` | O bolo: Hero, donut, legenda, quanto podes gastar por dia, taxa de poupança e peso das fixas |
| `/plano` | Rendimento e *sliders* de investimento/poupança, com o donut a reagir em tempo real |
| `/fixas` | Lista de despesas agrupada por categoria, total mensal e anual |
| `/investir` | Simulador de juro composto e cinco perfis de risco, sem produtos nem marcas |
| `/documentos` | Contratos, recibos, seguros e impostos, guardados só neste telemóvel |

`/inicio` é o onboarding de dois passos (só da primeira vez) e as Definições
abrem pelo ícone no header.

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

## O que ficou de fora

- **Pré-visualização de PDF em iOS.** O `<object>` não renderiza PDF no Safari de
  iPhone; lá o utilizador cai no botão **Descarregar**. Um `pdf.js` embutido
  resolveria — meio dia.
- **Swipe para apagar com gesto contínuo real.** Está implementado com eventos de
  ponteiro e limiar; falta a fase de *momentum* e o encosto elástico. ~2 horas.
- **Edição de tags dos documentos.** As tags são atribuídas automaticamente pelo
  nome do ficheiro e ainda não se editam à mão. ~1 hora.
- **Reordenar despesas fixas** por arrastamento. ~2 horas.
- **Importar documentos a partir do ZIP exportado** (a exportação existe, o
  caminho de volta não). ~2 horas.

## Aviso

A **Easy.** é uma ferramenta de organização pessoal. Não presta aconselhamento
financeiro, fiscal ou de investimento. Os valores apresentados são estimativas.
