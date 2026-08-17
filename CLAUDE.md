# Calendar Year Planner — notas para quem for mexer

Planner pessoal: o ano inteiro numa tela, uma linha por mês, clicável.
As decisões de produto e a arquitetura estão em **[DESIGN.md](./DESIGN.md)** —
leia antes de mudar comportamento; ele é a fonte da verdade, não este arquivo.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173/calendar-year-planner/
npm run lint       # ESLint, zero warnings tolerado
npm run typecheck  # tsc --noEmit
npm test           # Vitest: recorte de marcações, feriados, merge do sync
npm run build      # typecheck + build
```

Deploy: push na `main` → GitHub Actions → GitHub Pages
(https://fabriciodorneles.github.io/calendar-year-planner/). O deploy só acontece
se lint, typecheck, testes e build passarem.

## Como o código está organizado

| Onde | O quê |
|------|-------|
| `src/lib/dates.ts` | `ISODate` ('YYYY-MM-DD', sempre UTC), dias no mês, dia da semana |
| `src/lib/marks.ts` | **núcleo**: recorte de sobreposição, eventos vs rotinas, repetição |
| `src/lib/holidays.ts` | feriados nacionais, incluindo os móveis derivados da Páscoa |
| `src/lib/types.ts` | `Activity`, `Mark`, gerador de UUID |
| `src/store/plannerStore.ts` | zustand + persist (localStorage) + undo/redo + migrations |
| `src/store/sync.ts` / `useSync.ts` | Supabase: pull incremental, merge, push |
| `src/components/` | grid, linha de mês, dock, modais |

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

**Aparelho novo adota o remoto.** Cada instalação cria seu próprio conjunto de
atividades iniciais com ids distintos; mesclar duplicaria tudo.

## Convenções

- Comentários explicam **por que**, não o que. Em português, como o resto do projeto.
- Nomes de domínio em inglês no código (`Mark`, `Activity`, `kind`); textos de UI em português.
- Mensagens de commit em inglês.
- Lógica de datas e sobreposição **tem** teste. UI não tem teste automatizado —
  valide dirigindo o app num browser real (foi assim que quase todos os bugs acima apareceram).
