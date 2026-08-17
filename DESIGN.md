# Calendar Year Planner — Design Doc

> Versão digital do *Big A## Calendar* (Jesse Itzler): o ano inteiro em uma tela,
> uma linha por mês, clicável, para marcar aventuras, hábitos e viagens com stickers.

**Status:** fases 1 e 2 implementadas; sincronização (fase 3) no ar · **Autor:** Fabrício · **Data:** 2026-08-16

> **Este doc cobre o calendário.** A segunda tela do app — a folha de buckets de
> áreas da vida — tem doc própria em **[DESIGN-BUCKETS.md](./DESIGN-BUCKETS.md)**.
> As duas dividem login, sincronização e a barra superior; o resto é independente.

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
| D1 | Persistência | `localStorage` como fonte local + **Supabase** (Postgres) sincronizando em segundo plano. |
| D2 | Escopo temporal | Multi-ano navegável. Atividades compartilhadas entre anos. |
| D3 | Aparência do evento | Emoji pequeno (mesmo tamanho da fonte) + título, sobre a cor cheia. |
| D4 | Atividades de vários dias | Arrastar pelo grid → barra contínua única. |
| D5 | Fluxo de marcação | Dois modos com toggle: **Pincel** e **Inspeção** (popover). |
| D6 | Stickers por dia | **Um evento por dia** (marcar de novo substitui); rotinas empilham, até 4 ícones + `+N`. |
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
| D17 | Categorias | Duas: **evento** (célula inteira, vira barra) e **rotina** (ícone na base, dia a dia). |
| D18 | Detalhes do dia | Duplo clique abre modal com título, detalhes, rotinas e feriado. |
| D19 | Dia da semana | Abreviação de 3 letras ao lado do número (`12 sáb`), centro alinhado. |
| D20 | Nome do feriado | Bolinha + nome no rodapé da célula. O nome encolhe quando as rotinas tomam a largura; a bolinha nunca. |
| D21 | Emoji da atividade | Seletor em grade rolável no editor, ~120 opções agrupadas por afinidade. |
| D24 | Login | OAuth Google e GitHub (um clique) + magic link como alternativa. |
| D23 | Repetição | Materializada em ocorrências reais, semanal ou quinzenal, até o fim do ano. |
| D22 | Camadas da célula | O evento pinta a célula inteira; número, dia da semana, feriado e rotinas ficam **por cima** da pintura (z-index 3), em branco. |

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

type ActivityKind = 'event' | 'routine';

type Activity = {
  id: string;
  kind: ActivityKind;    // define todo o comportamento no grid (§5.3)
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
  title: string | null;  // 'Serra do Cipó' — mostrado na célula
  details: string | null;// texto longo, só no modal
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

> **Um dia pertence a no máximo um evento.** (consequência de D6)

O invariante vale **dentro da categoria evento**, não no dataset inteiro: rotinas convivem
livremente entre si e com o evento do dia. Por isso o recorte recebe um `Scope` — um
predicado que decide quais marcações a operação enxerga — e pintar um evento nunca apaga
uma rotina. A regra de resolução ao pintar por cima de outro evento:

Ao gravar uma nova `Mark` no intervalo `[s, e]`, para cada `Mark` existente que intersecta:

| Caso | Ação |
|------|------|
| A existente está **contida** em `[s, e]` | soft delete da existente |
| `[s, e]` cobre só o **início** da existente | trunca: `existente.start = e + 1 dia` |
| `[s, e]` cobre só o **fim** da existente | trunca: `existente.end = s − 1 dia` |
| `[s, e]` cai **no miolo** da existente | divide em duas Marks, herdando `activityId` e `note` |

Esse recorte é a peça mais fácil de errar do app e é **o principal alvo dos testes unitários**.

### 5.2 Título e detalhes

`title` e `details` pertencem à **Mark**, não ao dia: uma viagem de 5 dias tem um título, não
cinco. O `title` aparece na célula (truncado) e cai no nome da atividade quando vazio;
`details` só no modal.

Consequência aceita: não existe anotação em dia sem atividade. Se incomodar, a saída é uma
entidade `DayNote` separada — não vamos antecipar.

### 5.4 Repetição

Uma marcação pode ser repetida **toda semana** ou **semana sim, semana não**, até 31/dez
do ano dela. A repetição desloca o intervalo inteiro, então um evento de sábado a domingo
repetido de 14 em 14 dias continua caindo em sábado e domingo — o caso que originou a
feature (fim de semana sim, fim de semana não, com a filha).

**Materializada, não guardada como regra.** Cada ocorrência é uma `Mark` de verdade:

- apagar um fim de semana específico (viajei, troquei) é apagar aquela ocorrência,
  sem inventar um conceito de "exceção à regra";
- contadores, recorte de sobreposição, modal e export continuam funcionando sem
  nenhum código novo.

O preço é que mudar a cadência depois não reescreve o passado. O `seriesId` compartilhado
mitiga: dá para apagar a série inteira de uma vez e refazer.

### 5.3 Eventos e rotinas

| | Evento | Rotina |
|---|---|---|
| Exemplos | viagem, aventura, aniversário | academia, estudos, leitura |
| Na célula | ocupa tudo: cor + emoji + título | quadradinho na linha de baixo |
| Vários dias | barra contínua (uma Mark) | uma Mark por dia |
| Por dia | no máximo um | vários, 4 visíveis + `+N` |

Rotina arrastada grava **um registro por dia**: cinco dias de academia são cinco ocorrências,
não um bloco de cinco dias. Assim apagar um dia isolado não parte nada ao meio, e o contador
de metas conta ocorrências naturalmente. O arrasto continua servindo de pintura em lote.

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

### 6.2 Camadas da célula

Três camadas empilhadas na mesma área:

1. **Fundo** — cor de dia útil/fim de semana.
2. **Evento** (z-index 2) — cor cheia de borda a borda, com o título centralizado.
3. **Conteúdo do dia** (z-index 3) — cabeçalho (`19 qui`) no topo, rodapé com feriado
   e rotinas na base. Sobre um dia pintado esse texto vira branco.

O evento nunca esconde o número do dia: quem cobre a célula é a cor, não a informação.

### 6.3 Regras de célula

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

### 7.2 Modal do dia — duplo clique

Duplo clique em qualquer dia abre o modal com: o evento (título, detalhes, intervalo, repetição,
remover), a lista de rotinas marcadas e o feriado, se houver. Duplo clique foi escolhido em vez
de clique simples para não competir com a pintura, que é a ação dominante.

**O duplo clique precisa de cuidado com o toggle.** Todo duplo clique começa com dois cliques
simples; sobre um dia já marcado isso rodava o toggle duas vezes — o primeiro recortava o dia
da barra, o segundo criava uma marcação nova e vazia, destruindo título e série de quem só
queria ver os detalhes. Solução: **em dia já ocupado o toggle espera 220ms** para ver se vira
duplo clique; em dia vazio continua instantâneo, para a pintura não ficar lenta.

### 7.3 Teclado

| Tecla | Ação |
|-------|------|
| `1`–`9` | seleciona a atividade ativa |
| `F` | tela cheia (Fullscreen API) |
| `←` `→` | ano anterior / próximo |
| `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z` | desfazer / refazer |
| `Esc` | fecha o modal do dia ou o editor (funciona também com o cursor num campo) |
| `P` / `I` | alterna modo Pincel / Inspeção — *fase 2* |
| `S` | abre/fecha o painel de estatísticas — *fase 2* |

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

Com a entrada da segunda tela o `src/` passou a ser dividido por feature
(ver DESIGN-BUCKETS.md §8). O que é do calendário:

```
src/
  main.tsx
  App.tsx                       # escolhe a tela pela rota
  features/calendar/
    CalendarScreen.tsx          # dock + grid + modais + atalhos
    components/
      CalendarGrid.tsx          # o grid 12×32
      MonthRow.tsx              # uma linha; memoizada por mês
      ActivityDock.tsx          # dock lateral auto-colapsante
      ActivityEditor.tsx        # CRUD de atividades
      DayModal.tsx              # detalhes do dia (§7.2)
      EmojiPicker.tsx
    store/
      plannerStore.ts           # Zustand + persist + undo/redo
      selectors.ts              # marks por mês, contadores, sequências
      defaults.ts               # set inicial de atividades
      sync.ts                   # linhas do Postgres ↔ Activity/Mark
    lib/
      dates.ts                  # ISODate, iteração, dias no mês, weekday
      marks.ts                  # recorte/merge da §5.1  ← núcleo testado
      holidays.ts               # feriados BR, incl. móveis
      types.ts
    styles/grid.css
  shared/                       # usado pelas duas telas
    components/Toolbar.tsx, SyncPanel.tsx
    lib/router.ts, supabase.ts, io.ts, records.ts
    store/useSync.ts, merge.ts
    styles/tokens.css, chrome.css
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

`localStorage`, chave `cyp:v1`, escrita com debounce de 400ms, versionada em `SCHEMA_VERSION`
com `migrate` no persist.

**v1 → v2:** `kind`, `title` e `details` não existiam. Como toda marcação do v1 pintava a
célula inteira — o comportamento de evento — as atividades antigas migram para `kind: 'event'`,
e a antiga `note` vira `details`. Sem essa migração elas caíam no ramo "não é evento" e
apareciam como rotinas, embora o editor mostrasse "Evento" (um `<select>` sem valor exibe a
primeira opção). Foi assim que o bug apareceu em produção. Export/import JSON (D16) é o backup enquanto não há servidor — e a
UI lembra disso se nunca houve export e existem mais de 50 marks.

**Sincronização (implementada).** O `localStorage` continua sendo a fonte local — o app abre e
funciona sem rede. Por cima dele, `store/sync.ts` conversa com o Supabase:

- **pull completo:** `select *` das duas tabelas. Já foi incremental (`updated_at > cursor`) e
  isso perdia dado: o cursor é o relógio *deste* aparelho e o carimbo foi posto pelo *outro*.
  Um celular alguns minutos atrasado gravava a linha com hora anterior ao cursor daqui e ela
  ficava invisível para sempre, sem erro. São poucas centenas de linhas — trazer todas custa
  menos que perder uma;
- **merge:** last-write-wins por registro (`mergeById`), o lado com `updatedAt` maior vence;
- **push:** upsert apenas dos registros tocados depois do cursor, atividades antes das marcações
  (a marcação referencia a atividade);
- **quando:** ao entrar, ao voltar o foco da janela, **ao sair de vista**
  (`visibilitychange`/`pagehide`) e 2,5s depois de cada alteração.

O cursor só avança **depois** do push: se ele falhar, a tentativa seguinte reenvia o mesmo
intervalo em vez de deixar registros para trás. E o valor gravado é a hora em que a passada
**começou**, nunca a do fim — senão uma marcação feita durante a sincronização nasce com
carimbo menor que o cursor novo e nunca mais entra em nenhum push (aconteceu em produção;
`shared/store/cursor.ts` guarda a explicação e o teste). Pelo mesmo motivo, alteração que
chega com uma passada em andamento fica anotada e dispara outra ao final, em vez de ser
descartada.

Como cada dia é um registro separado, edições em dispositivos diferentes se somam; só colidem de
verdade se forem no mesmo dia. O empate no `updatedAt` mantém o local, evitando escrita à toa.
**Limitação assumida:** LWW depende dos relógios dos aparelhos estarem razoavelmente certos.

O `id` de cada registro precisa ser um UUID de verdade — as colunas são `uuid` no Postgres. O
gerador tem fallback próprio de UUID v4 para o caso de `crypto.randomUUID` não existir.

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
a página e está tudo lá. ✅ **Entregue.**

> **Aprendido na implementação:** células e barras precisam de `grid-column` explícito. Com as
> células auto-posicionadas, cada barra inserida deslocava os dias para o lado — inclusive sob o
> cursor no meio do arrasto. O contador de metas ficou no dock expandido (§7.5); o painel de
> estatísticas completo (§7.6) continua na fase 2.

### Fase 2 — Refinamento
✅ Modal do dia com título e detalhes · ✅ categorias evento/rotina · ✅ dia da semana ·
✅ nome do feriado na célula · ✅ seletor de emoji · ✅ leitura no celular.
Pendente: painel de estatísticas com metas e sequências, e o modo Inspeção com popover.

### Fase 3 — Sincronização ✅
Supabase (Postgres + auth por magic link) · RLS por usuário · pull/push incremental com merge
last-write-wins · offline-first preservado.

**Login:** OAuth do Google e do GitHub, um clique. O magic link continua disponível, mas o SMTP
compartilhado do Supabase limita a poucos envios por hora — é fácil bater o rate limit testando,
e foi o que motivou o OAuth.

**Pendências conhecidas:** os índices `activities_user_idx` e `marks_user_start_idx` ainda não
foram criados (irrelevante no volume atual, ~400 linhas); a `service_role` nunca entra no front;
e qualquer pessoa que chegue à URL pode criar conta e gravar no projeto Supabase — se isso
incomodar, uma policy restringindo por e-mail resolve.

### Backlog (não priorizado)
Export PNG · CSS de impressão A3/A2 · temas · aniversários recorrentes · atalho de "repetir
semanalmente" · heatmap de consistência.

---

## 12. Riscos

| Risco | Mitigação |
|-------|-----------|
| Perder dados ao limpar o browser | Resolvido pelo sync: os dados vivem no Postgres. O export JSON continua como backup extra. |
| Relógio errado num aparelho | LWW usa `updatedAt` local; um relógio muito adiantado sempre venceria. Aceito para uso pessoal. |
| Recorte de sobreposição (§5.1) com bug destrutivo | Testes unitários exaustivos + undo/redo. |
| Grid ilegível em telas pequenas de desktop | Unidades de container; piso testado em 1280×720. |
| Célula ficar poluída (número, semana, feriado, evento, rotinas) | Verificado a 1280×720 com célula de 37×54: tudo ainda legível. Abaixo disso o feriado é o primeiro a cortar. |
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
