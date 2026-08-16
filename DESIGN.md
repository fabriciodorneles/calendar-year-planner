# Calendar Year Planner — Design Doc

> Versão digital do *Big A## Calendar* (Jesse Itzler): o ano inteiro em uma tela,
> uma linha por mês, clicável, para marcar aventuras, hábitos e viagens com stickers.

**Status:** rascunho aprovado para implementação · **Autor:** Fabrício · **Data:** 2026-08-16

---

## 1. Objetivo

Um app web onde eu vejo **o ano inteiro de uma vez**, em tela cheia, e marco os dias
com stickers de atividade. O valor está em bater o olho e enxergar a densidade do ano:
"fiz aventura em 7 dos 12 meses", "essa sequência de corrida quebrou em março".

O calendário de parede resolve isso com adesivos. Este app resolve com cliques, e ganha
contadores, múltiplos anos e backup.

### Critério de sucesso

Em janeiro eu abro o app, aperto tela cheia, e em 30 segundos marco a semana toda sem
pensar na interface. O grid ocupa a tela inteira; a UI de controle é invisível até eu chamar.

---

## 2. Não-objetivos (v1)

- Não é um calendário de compromissos — sem horários, sem convites, sem integração com Google Calendar.
- Não é multiusuário. Não há login, times ou compartilhamento na fase 1.
- Não é app mobile. Celular é somente leitura (ver §7.4).
- Sem título "THE BIG A## CALENDAR" no topo — decisão explícita: **o grid é a interface**,
  o header do original é decoração que rouba altura.
- Sem exportação de imagem/impressão na v1 (ver §12, backlog).

---

## 3. Decisões tomadas

Tudo abaixo foi decidido, não é sugestão. Mudanças exigem editar este doc.

| # | Decisão | Escolha |
|---|---------|---------|
| D1 | Persistência | `localStorage` na fase 1; backend na fase 2. Modelo de dados já preparado para sync. |
| D2 | Escopo temporal | Multi-ano navegável. Atividades compartilhadas entre anos. |
| D3 | Aparência do sticker | Emoji + cor de fundo na célula. |
| D4 | Atividades de vários dias | Arrastar pelo grid → barra contínua única. |
| D5 | Fluxo de marcação | Dois modos com toggle: **Pincel** e **Inspeção** (popover). |
| D6 | Stickers por dia | **Um só.** Marcar de novo substitui. |
| D7 | Mobile | Desktop-first. Celular: somente leitura, com scroll horizontal. |
| D8 | Metas | Meta anual opcional por atividade + contador do realizado. |
| D9 | Seletor de pincel | Dock lateral fino que auto-colapsa e expande **por cima** do grid. |
| D10 | Metas/estatísticas | Painel sobreposto, aberto por tecla `S` ou ícone no canto. |
| D11 | Conteúdo extra do dia | Nota de texto curta + feriados brasileiros pré-carregados. |
| D12 | Deploy | GitHub Pages, automático via GitHub Actions no push da `main`. |
| D13 | Grid | Coluna = dia do mês (1–31). Fins de semana sombreados em diagonal escalonada. |
| D14 | Cadastro de atividades | CRUD completo na UI, com set inicial sugerido. |
| D15 | Estética | Fiel à foto: bege/kraft, off-white, tipografia condensada em caixa alta. |
| D16 | Export | Export/import JSON dos dados. Só isso na v1. |

---

## 4. Stack

| Camada | Escolha | Por quê |
|--------|---------|---------|
| Build | **Vite** | Dev server instantâneo, build estático que o GitHub Pages serve direto. |
| UI | **React 19 + TypeScript** | Pedido seu; tipagem importa porque a lógica de datas/intervalos é onde bugs se escondem. |
| Estado | **Zustand** + middleware `persist` | Store global pequena, sem boilerplate de Context, e o `persist` já resolve D1 (localStorage) com um adaptador trocável por HTTP na fase 2. |
| Estilo | **CSS puro + custom properties**, arquivos por componente | O layout é um grid e uma paleta de tokens. Tailwind ou lib de componentes seriam peso morto aqui. |
| Datas | Funções próprias sobre `Date` (UTC) | O app precisa de ~6 operações (dias no mês, dia da semana, iterar intervalo). Uma lib inteira não se paga. Páscoa/feriados: algoritmo próprio (§9.3). |
| Fontes | `@fontsource` (self-hosted) | Sem CDN externo: carrega offline e não quebra se o CDN cair. |
| Testes | **Vitest** para a lógica; Playwright opcional na fase 2 | O que precisa de teste é resolução de sobreposição e feriados móveis, não pixels. |
| Lint | ESLint + Prettier + `tsc --noEmit` no CI | — |

Sem backend, sem banco, sem Docker na fase 1. Isso é deliberado: o app precisa estar
utilizável antes de ganhar infraestrutura.

---

## 5. Modelo de dados

Preparado para sync desde já (D1): todo registro tem `id` estável (UUID), `updatedAt`
(epoch ms) e **soft delete** via `deletedAt`. Quando o backend entrar, isso permite
merge last-write-wins sem redesenhar nada.

```ts
type ISODate = string;  // 'YYYY-MM-DD', sempre UTC

type Activity = {
  id: string;
  name: string;          // 'Aventura'
  emoji: string;         // '🏔️'
  color: string;         // hex do fundo da célula
  goal: number | null;   // meta anual em dias; null = sem meta
  order: number;         // posição no dock e atalho numérico (1-9)
  updatedAt: number;
  deletedAt: number | null;
};

/** Uma marcação contínua: 1 dia (start === end) ou uma barra. */
type Mark = {
  id: string;
  activityId: string;
  start: ISODate;
  end: ISODate;          // inclusivo
  note: string | null;   // 'Serra do Cipó'
  updatedAt: number;
  deletedAt: number | null;
};

type PlannerState = {
  schemaVersion: number;   // migrations
  activities: Activity[];
  marks: Mark[];
  ui: { currentYear: number; mode: 'brush' | 'inspect'; activeActivityId: string | null };
};
```

### 5.1 Invariante central

> **Um dia pertence a no máximo uma `Mark`.** (consequência de D6)

Isso vale para o dataset inteiro, não por atividade. É o que mantém a leitura limpa e o
que torna a renderização trivial — mas exige uma regra de resolução explícita ao pintar
por cima de algo existente:

Ao gravar uma nova `Mark` no intervalo `[s, e]`, para cada `Mark` existente que intersecta:

| Caso | Ação |
|------|------|
| A existente está **contida** em `[s, e]` | soft delete da existente |
| `[s, e]` cobre só o **início** da existente | trunca: `existente.start = e + 1 dia` |
| `[s, e]` cobre só o **fim** da existente | trunca: `existente.end = s − 1 dia` |
| `[s, e]` cai **no miolo** da existente | divide em duas Marks, herdando `activityId` e `note` |

Esse recorte é a peça mais fácil de errar do app e é **o principal alvo dos testes unitários**.

### 5.2 Notas e o caso "nota sem sticker"

A `note` pertence à **Mark**, não ao dia: uma viagem de 5 dias tem uma nota, não cinco.

Consequência aceita: não existe nota em dia sem atividade. Se eu quiser anotar um dia solto,
crio uma atividade `Nota 📝` e uso ela. Se na prática isso incomodar, a saída é uma entidade
`DayNote` separada — não vamos antecipar.

### 5.3 Barras que atravessam meses

Uma `Mark` de 30/jan a 02/fev é **um registro só**. A renderização a fatia por linha de mês:
o segmento em janeiro termina com a borda direita aberta, o de fevereiro começa com a
esquerda aberta, sinalizando continuidade. O modelo nunca fatia; só a view.

---

## 6. Layout do grid

### 6.1 Estrutura

CSS Grid de **12 linhas × 32 colunas** (1 de rótulo + 31 de dias), dimensionado para caber
inteiro na viewport sem scroll — essa é a exigência central do produto:

```css
.grid {
  display: grid;
  grid-template-columns: var(--label-w) repeat(31, 1fr);
  grid-template-rows: repeat(12, 1fr);
  height: 100dvh;
  container-type: size;   /* habilita unidades cqw/cqh na tipografia */
}
```

Nada de altura fixa em px: as células dividem o espaço disponível. A tipografia do número
do dia escala com `cqw`, então o grid respira igual em um notebook de 13" e em um monitor
de 32".

### 6.2 Regras de célula

- **Meses curtos:** fevereiro renderiza 28 (ou 29) células; as colunas 29–31 ficam vazias e
  não recebem clique. Idem para os meses de 30 dias.
- **Fim de semana:** sombreado calculado por `(ano, mês, dia) → dia da semana`. Como cada mês
  começa num dia diferente, o sombreado desce em diagonal escalonada — é exatamente o padrão
  visível na foto de referência.
- **Hoje:** contorno de destaque, sem preencher, para não competir com os stickers.
- **Feriado:** marcador discreto (ponto no canto inferior), nunca um sticker — feriado é
  contexto, não atividade.
- **Nota:** canto superior direito dobrado. O texto aparece no hover/popover.

### 6.3 Rótulos

Coluna zero: `JAN`…`DEZ` em condensada caixa alta, na cor bege do original. Os números dos
dias vão pequenos no canto superior esquerdo de cada célula, como no papel. **Sem cabeçalho
de título** (§2).

---

## 7. Interação

### 7.1 Modo Pincel (padrão) — tecla `P`

1. Escolho a atividade ativa no dock (§7.5) ou por atalho numérico `1`–`9`.
2. **Clique** em um dia → marca com a atividade ativa.
3. **Clique e arrasto** → barra contínua; o preview acompanha o cursor durante o arrasto e
   só grava no `pointerup`.
4. **Clique em um dia que já tem a atividade ativa** → apaga (toggle).
5. Clique em um dia com atividade **diferente** → substitui, aplicando o recorte da §5.1.

O arrasto usa Pointer Events (funciona com mouse e trackpad) e captura o ponteiro, então
sair do grid no meio do gesto não corrompe a seleção.

### 7.2 Modo Inspeção — tecla `I`

Clique abre um popover ancorado no dia, com: atividade (trocável), intervalo, campo de nota
e botão de excluir. É o modo para detalhar, não para marcar em massa.

O toggle entre modos é um ícone discreto no canto e as teclas `P`/`I`.

### 7.3 Teclado

| Tecla | Ação |
|-------|------|
| `1`–`9` | seleciona a atividade ativa |
| `P` / `I` | alterna modo Pincel / Inspeção |
| `S` | abre/fecha o painel de estatísticas |
| `F` | tela cheia (Fullscreen API) |
| `←` `→` | ano anterior / próximo |
| `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z` | desfazer / refazer |
| `Esc` | fecha painel, popover ou cancela arrasto |

**Undo/redo não é opcional.** Pintar por arrasto erra fácil, e sem desfazer o recorte da §5.1
destrói dados de forma assustadora. Histórico em memória, ~50 passos, limpo ao trocar de ano.

### 7.4 Mobile (somente leitura, D7)

Abaixo de 900px: o grid ganha scroll horizontal com a coluna de meses fixa, e toda edição
fica desabilitada. Um aviso discreto explica ("edição disponível no desktop"). Nenhuma UI
de toque é construída na v1.

### 7.5 Dock lateral (D9)

- **Colapsado (padrão):** faixa de ~44px na borda esquerda, mostrando só emoji + cor de cada
  atividade. Funciona como legenda mínima permanente.
- **Expandido (hover ou `Tab`):** desliza para ~240px mostrando nome, atalho e meta —
  **sobreposto ao grid, com backdrop translúcido**. Isso é essencial: expandir *empurrando* o
  grid causaria reflow do calendário inteiro, que é exatamente o que você recusou.
- Rodapé do dock: `+` para criar atividade, engrenagem para gerenciar (CRUD, D14).

### 7.6 Painel de estatísticas (D10)

Sobreposto, aberto por `S`. Por atividade: emoji, nome, total de dias no ano, meta e barra de
progresso, maior sequência e distribuição por mês (12 barrinhas). Fecha com `Esc` e o
calendário volta limpo. Tudo derivado das marks em tempo de render — nada de contador
persistido para dessincronizar.

---

## 8. Estética (D15)

```css
:root {
  --paper:        #FBF9F5;  /* fundo geral */
  --cell:         #FFFFFF;  /* célula de dia útil */
  --cell-weekend: #F2EBE1;  /* célula de fim de semana */
  --rule:         #E5DCD0;  /* linhas do grid */
  --rule-strong:  #D6C9B8;  /* borda externa e separador de mês */
  --label:        #C9B79F;  /* JAN..DEZ e números dos dias */
  --ink:          #4A4239;  /* texto de UI */
  --today:        #B08968;  /* contorno do dia de hoje */
}
```

- **Tipografia:** condensada bold em caixa alta para os meses (Oswald ou Archivo Narrow,
  self-hosted). Números dos dias: mesma família, peso normal, ~0.6× do rótulo.
- **Linhas finas** (1px, `--rule`), borda externa mais escura, como no papel.
- **Sem sombras, sem gradientes, sem cantos arredondados** no grid. O charme do original é ser
  chapado e tipográfico.
- **Stickers:** cor sólida preenchendo a célula + emoji centralizado. A paleta inicial é
  escolhida para contrastar com o bege e manter os emojis legíveis:
  terracota `#C1654F`, verde-oliva `#6B7F5C`, azul-petróleo `#4A6E7E`, mostarda `#C79A45`,
  ameixa `#7D5A6E`, tijolo `#9C5B4A`.
- **Tema escuro:** fora do escopo (você escolheu só o fiel ao original).

---

## 9. Arquitetura

### 9.1 Estrutura de pastas

```
src/
  main.tsx
  App.tsx
  components/
    CalendarGrid.tsx      # o grid 12×32
    MonthRow.tsx          # uma linha; memoizada por mês
    DayCell.tsx           # célula; nada de estado próprio
    MarkBar.tsx           # segmento de barra multi-dia
    ActivityDock.tsx      # dock lateral auto-colapsante
    ActivityEditor.tsx    # CRUD de atividades
    StatsPanel.tsx        # painel de metas/contadores
    DayPopover.tsx        # modo Inspeção
    YearSwitcher.tsx
  store/
    plannerStore.ts       # Zustand + persist
    selectors.ts          # marks por mês, contadores, sequências
    history.ts            # undo/redo
  lib/
    dates.ts              # ISODate, iteração, dias no mês, weekday
    marks.ts              # recorte/merge da §5.1  ← núcleo testado
    holidays.ts           # feriados BR, incl. móveis
    storage.ts            # adaptador de persistência (troca na fase 2)
    io.ts                 # export/import JSON
  styles/
    tokens.css, grid.css, ...
```

### 9.2 Fluxo de dados

Store única. Componentes leem via seletores memoizados. `MonthRow` é memoizada e só
re-renderiza quando as marks daquele mês mudam — durante um arrasto, o preview vive em
estado local do grid e **não toca a store** até o `pointerup`.

### 9.3 Feriados (D11)

Calculados offline, sem API. Páscoa pelo algoritmo de Meeus/Jones/Butcher; daí derivam
Carnaval (−47 dias), Sexta-feira Santa (−2) e Corpus Christi (+60). Fixos: 01/01, 21/04,
01/05, 07/09, 12/10, 02/11, 15/11, 20/11 (Consciência Negra) e 25/12. Testes cobrem os
móveis em vários anos — é onde esse tipo de código costuma errar.

### 9.4 Persistência (D1)

`localStorage`, chave `cyp:v1`, escrita com debounce de 400ms. `schemaVersion` no payload,
com migrations em cadeia. Export/import JSON (D16) é o backup enquanto não há servidor — e a
UI lembra disso se nunca houve export e existem mais de 50 marks.

**Fase 2** troca só `lib/storage.ts` por um adaptador HTTP: como todo registro já tem `id`,
`updatedAt` e `deletedAt`, o merge é last-write-wins por registro, sem redesenho do modelo.

### 9.5 Acessibilidade

Grid com `role="grid"`, navegação por setas, foco visível, emojis com `aria-label`, e o
sticker nunca comunicando só por cor (emoji sempre acompanha). Contraste mínimo AA no texto de UI.

---

## 10. Deploy (D12)

GitHub Actions: `push` na `main` → `npm ci`, `tsc --noEmit`, `eslint`, `vitest run`,
`vite build` → publica em GitHub Pages. `base` do Vite ajustada ao nome do repositório.
Build quebrado não publica.

---

## 11. Fases

### Fase 1 — Calendário utilizável
Scaffold Vite/TS/React · tokens e estética · grid 12×32 com fins de semana, meses curtos e
hoje · store + localStorage · atividades com set inicial + CRUD · dock colapsante · modo
Pincel com clique e arrasto · undo/redo · tela cheia · seletor de ano · feriados · export/import
JSON · deploy no Pages.

**Pronto quando:** eu abro em tela cheia, marco um mês inteiro só com mouse e teclado, recarrego
a página e está tudo lá.

### Fase 2 — Refinamento
Modo Inspeção e popover · notas · painel de estatísticas com metas e sequências · leitura no
celular · testes de `marks.ts` e `holidays.ts` completos.

### Fase 3 — Backend (só se a fase 1 provar o uso)
API Node (Fastify) + SQLite/Postgres · auth de usuário único · sync last-write-wins ·
adaptador HTTP substituindo o localStorage.

### Backlog (não priorizado)
Export PNG · CSS de impressão A3/A2 · temas · aniversários recorrentes · atalho de "repetir
semanalmente" · heatmap de consistência.

---

## 12. Riscos

| Risco | Mitigação |
|-------|-----------|
| Perder dados ao limpar o browser | Export JSON + lembrete de backup; fase 3 resolve de vez. |
| Recorte de sobreposição (§5.1) com bug destrutivo | Testes unitários exaustivos + undo/redo. |
| Grid ilegível em telas pequenas de desktop | Unidades de container; piso testado em 1280×720. |
| "Um sticker por dia" (D6) apertar na prática | Modelo suporta relaxar a invariante depois; a view precisaria de faixas na célula. |
| Emojis renderizam diferente por SO | Aceito. A cor de fundo carrega o significado; o emoji reforça. |

---

## 13. Perguntas em aberto

Nenhuma bloqueia o começo — todas têm um default assumido.

1. **Semana começa domingo ou segunda?** Só afeta quais colunas são sombreadas.
   *Default: sábado e domingo sombreados (fim de semana), sem noção de "início da semana".*
2. **Set inicial de atividades:** default = Aventura 🏔️, Corrida 🏃, Academia 🏋️, Leitura 📚,
   Viagem ✈️. Quer outras? Metas anuais já preenchidas em alguma?
3. **Ano padrão ao abrir:** o ano corrente do sistema, ou 2026 fixo? *Default: ano corrente.*
4. **Nota sem sticker** (§5.2): fica de fora mesmo? *Default: sim, fora.*
5. **Marcar o passado/futuro sem limite?** *Default: sim, qualquer ano navegável.*
