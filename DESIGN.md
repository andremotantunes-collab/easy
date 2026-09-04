# DESIGN — Easy.

O que foi consultado antes de escrever CSS, e o que daí se aplicou.

> **Nota sobre as fontes.** As páginas das Apple Human Interface Guidelines e o
> vídeo da WWDC25 são renderizados por JavaScript: a obtenção automática
> devolveu apenas o título, sem corpo. O que está abaixo é, por isso, a
> aplicação das regras estabelecidas do HIG (tamanhos de toque, safe areas,
> tab bars, hierarquia tipográfica) e não uma citação verificada dessas páginas.
> Está assinalado para que ninguém assuma uma verificação que não houve.

---

## 1. Apple HIG — o que se aplicou

| Regra | Onde vive no código |
|---|---|
| Alvos de toque ≥ 44×44 pt | `min-h-[44px]` em todos os botões e chips, 56 px nas linhas de lista e nos itens da tab bar; os `input[type=range]` têm 44 px de altura com o *thumb* centrado |
| Safe areas | `env(safe-area-inset-top)` no header, `env(safe-area-inset-bottom)` na tab bar, no *sheet*, no *toast* e no rodapé do ecrã |
| `viewport-fit=cover` | `index.html`, sem o qual as safe areas não são reportadas |
| Tab bar de 3–5 itens, ícone + label | 3 itens (Início, Documentos, Perfil), `lucide-react` a 23 px + label de 10,5 px, sobre material translúcido |
| Margens laterais consistentes | 20 px em todos os ecrãs, 12 px entre cartões |
| Hierarquia tipográfica clara | escala fixa: Hero 48/52 · Título 28/34 · Valor 22/28 · Corpo 16/22 · Label 13/18 · Nota 12/16 |
| Um só elemento dominante por ecrã | um único valor em Hero por ecrã, sem exceção |

## 2. Linguagem de superfícies (WWDC25) — *contida*

O que se tirou daqui é a **contenção**, não o efeito: profundidade dada por
superfície e hierarquia, nunca por sombra ou desfoque.

- Um degrau de superfície: `--bg` → `--surface` → `--surface-2`.
- Cartões distinguem-se por superfície + 1 px de borda no tema claro; no escuro
  a borda desaparece (`--card-border: transparent`) e resta só a superfície mais
  clara.
- **Zero** `backdrop-filter`, `blur`, gradientes decorativos ou sombras.

## 3. Revolut — o que se copiou e o que não

**Copiado:** número gigante no topo de cada ecrã; cartões empilhados numa só
coluna; densidade baixa; um único acento de cor.

**Não copiado:** gradientes vivos, ilustrações, *confetti*, cor espalhada pela
interface, ícones coloridos.

## 4. `dataviz` — o que a skill mudou

A skill foi aplicada antes de desenhar o donut, as *stat tiles* e a barra de
capital/juro. Três decisões saíram de lá:

1. **A paleta foi validada por script, não a olho.** O
   `validate_palette.js` reprovou os cinzentos originais do briefing: no tema
   claro, `--cat-invest` (#6A6A73) e `--cat-poupanca` (#87878F) ficavam a ΔE 9,9
   de separação em visão normal — abaixo do piso de 15, ou seja, indistinguíveis
   mesmo para quem vê todas as cores. Os tons foram re-escalonados (ver
   `DECISIONS.md`), passando a ΔE 18,0 sem perder o mínimo de 3:1 contra
   `--surface`.
2. **A cor nunca é o único portador de informação.** Cada linha da legenda tem
   quadrado + nome + valor + percentagem. As fatias separam-se por 2 px de
   intervalo estrutural, não por matiz.
3. **Marcas finas e eixos discretos.** Traço de 26 px no donut do Início e de
   16 px no do Plano, com extremos arredondados, sem grelha e sem rótulo em
   cima de cada fatia.

**Uma exceção, consciente e delimitada:** as duas *stat tiles* do «Como está o
teu mês» são coloridas a sério — número, barra e pastilha do veredicto na cor
da métrica. Ali a cor **é** a informação (o mês está bem ou está mal), ao
contrário do anel, onde separa categorias sem juízo de valor. A regra 2 acima
mantém-se: a palavra do veredicto está sempre escrita. Ver a decisão 35.

Duas verificações do validador **não se aplicam** a este produto e ficam
conscientemente por passar: a *banda de luminosidade* e o *piso de croma*. Ambas
existem para paletas categóricas coloridas; aqui o donut é deliberadamente
quase monocromático — um acento e três cinzentos — porque o desenho quer que o
único elemento colorido do ecrã seja o dinheiro que sobra. "Reads gray" é o
objetivo, não o defeito.

## 5. Regra de desempate

> Entre bonito e legível, escolhe-se legível.

Aplicada, por exemplo, ao donut: os extremos arredondados só são usados quando a
fatia é maior do que a espessura do traço; abaixo disso passam a rectos, porque
um extremo arredondado numa fatia estreita distorce a proporção que a fatia
existe para comunicar.
