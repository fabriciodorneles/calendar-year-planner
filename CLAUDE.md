# Calendar Year Planner — notas para quem for mexer

Planner pessoal com duas telas: o **calendário** (o ano inteiro numa tela, uma linha
por mês, clicável) e a **folha de buckets** (8 áreas da vida, até 6 objetivos cada).
As decisões de produto e a arquitetura estão em **[DESIGN.md](./DESIGN.md)** e
**[DESIGN-BUCKETS.md](./DESIGN-BUCKETS.md)** — leia antes de mudar comportamento;
eles são a fonte da verdade, não este arquivo.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173/calendar-year-planner/
npm run lint       # ESLint, zero warnings tolerado
npm run typecheck  # tsc --noEmit
npm test           # Vitest: recorte de marcações, feriados, buckets, merge do sync
npm run build      # typecheck + build
```

Deploy: push na `main` → GitHub Actions → GitHub Pages
(https://fabriciodorneles.github.io/calendar-year-planner/). O deploy só acontece
se lint, typecheck, testes e build passarem.

## Como o código está organizado

Uma pasta por tela em `src/features/`, e `src/shared/` para o que as duas usam.
Import dentro da própria pasta é relativo; atravessando a fronteira, alias `@/`.

| Onde | O quê |
|------|-------|
| `features/calendar/lib/dates.ts` | `ISODate` ('YYYY-MM-DD', sempre UTC), dias no mês, dia da semana |
| `features/calendar/lib/marks.ts` | **núcleo**: recorte de sobreposição, eventos vs rotinas, repetição |
| `features/calendar/lib/holidays.ts` | feriados nacionais, incluindo os móveis derivados da Páscoa |
| `features/calendar/store/plannerStore.ts` | zustand + persist (localStorage) + undo/redo + migrations |
| `features/buckets/lib/buckets.ts` | **núcleo** da folha: limite de 6, renumeração, reordenação, folha de fábrica |
| `features/buckets/store/bucketsStore.ts` | zustand + persist + undo/redo próprios |
| `features/*/store/sync.ts` | mapeamento linha do Postgres ↔ tipo do app, por feature |
| `shared/store/useSync.ts` | orquestra as duas telas: pull, merge, push, cursor |
| `shared/store/merge.ts` | last-write-wins por registro (testado) |
| `shared/lib/router.ts` | rota no hash (`#/`, `#/buckets`) e retorno do login |
| `shared/components/Toolbar.tsx` | barra contextual das duas telas |
| `supabase/buckets.sql` | script das tabelas dos buckets, para rodar no SQL Editor |

## Armadilhas já pagas — não reintroduza

**Células precisam de `grid-column` explícito.** Se as `.day` ficarem
auto-posicionadas, cada barra de evento inserida empurra os dias para o lado —
inclusive sob o cursor durante o arrasto, quebrando o hit-test.

**O arrasto vive numa `ref`, não no state.** `pointerup` chega antes do React
commitar o último `pointermove`; ler o state ali encerra a barra num dia defasado.

**Clique em dia ocupado é diferido 220ms.** Todo duplo clique começa com dois
cliques simples; sem o atraso, abrir os detalhes de um evento apagava e recriava
a marcação, perdendo título e série. Dia vazio continua instantâneo.

**Todo `id` tem que ser UUID de verdade.** As colunas no Postgres são `uuid`.
O gerador tem fallback próprio de UUID v4.

**Mudança no formato dos dados exige migration.** `SCHEMA_VERSION` +
`migrate` no persist. Já aconteceu de dados antigos sem o campo novo serem
lidos como outra coisa (atividades viraram rotinas silenciosamente).

**`emailRedirectTo` / `redirectTo` sem hash.** Passar `location.href` carrega o
`#` de um login anterior e o retorno vira `##access_token=...`, que o parser do
Supabase ignora — o token chega e a sessão nunca é criada.

**O cursor do sync é a hora do INÍCIO da passada.** Com a hora do fim, uma edição
feita durante a sincronização nasce com carimbo menor que o cursor novo e nunca
mais entra em `updatedAt > cursor` — fica presa no aparelho, sem erro e com o
indicador verde. Aconteceu em produção. Ver `shared/store/cursor.ts`.

**O pull não filtra por cursor.** O cursor é o relógio deste aparelho; o carimbo
foi posto pelo outro. Um celular atrasado grava a linha com hora anterior ao
cursor daqui e ela some para sempre. Puxar tudo é mais barato que perder dado.

**Aparelho novo adota o remoto.** Cada instalação cria seu próprio conjunto de
atividades iniciais — e seus próprios 8 buckets — com ids distintos; mesclar
duplicaria tudo. Quem adota também não faz push (devolveria o que acabou de chegar).

**A adoção não pode depender do cursor.** O cursor é compartilhado pelas duas
telas: quando a folha de buckets entrou, todo aparelho que já usava o calendário
tinha cursor > 0, `firstVisit` era falso, a adoção nunca disparou e cada um
empurrou os seus 8 buckets de fábrica — 64 linhas no banco e oito disputando a
posição 0, com a folha inteira exibindo "Aventura". O critério certo é **não ter
nada a perder** (`isPristine`), não "é a primeira sincronização". Tela nova que
nascer depois cai na mesma armadilha se copiar o `firstVisit`.

**Nada de `slice(0, N)` em cima de dado que vem do sync.** Era assim que
`sheetBuckets` montava a folha, e com duplicatas ele devolvia oito vezes a mesma
posição. Escolha uma por posição, com desempate determinístico — o mesmo em todos
os aparelhos. Limpeza do estrago: `supabase/dedupe-buckets.sql`.

**`overflow: hidden` não impede rolagem por programa.** Na folha de buckets, focar
o último campo de uma célula cheia rolava a lista e escondia os primeiros itens em
silêncio — e o arrasto, que mira coordenadas de tela, passava a soltar o item na
posição errada. Use `overflow: clip` onde o conteúdo nunca deve rolar.

**Rota no hash não pode ser escrita antes do Supabase ler a URL.** Na volta do
login o token vem em `#access_token=…`; escrever `#/buckets` antes de
`getSession()` resolver apaga o token e a sessão nunca é criada.

## Convenções

- Comentários explicam **por que**, não o que. Em português, como o resto do projeto.
- Nomes de domínio em inglês no código (`Mark`, `Activity`, `kind`); textos de UI em português.
- Mensagens de commit em inglês.
- Lógica de datas e sobreposição **tem** teste. UI não tem teste automatizado —
  valide dirigindo o app num browser real (foi assim que quase todos os bugs acima apareceram).
