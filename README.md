# Calendar Year Planner

Duas telas inspiradas no Jesse Itzler:

- **Calendário** — versão digital do *Big A## Calendar*: o ano inteiro em uma tela,
  uma linha por mês, clicável para marcar atividades com stickers.
- **Buckets** — a folha de áreas da vida: 8 quadros manuscritos, até 6 objetivos
  tickáveis em cada.

O desenho completo — decisões, modelo de dados e fases — está em
[DESIGN.md](./DESIGN.md) e [DESIGN-BUCKETS.md](./DESIGN-BUCKETS.md).

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173/calendar-year-planner/
```

| Script | O que faz |
|--------|-----------|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | typecheck + build de produção em `dist/` |
| `npm test` | testes de recorte de marcações e feriados |
| `npm run lint` | ESLint |

## Como usar

Os dois botões no canto superior direito alternam entre **Calendário** (`#/`) e
**Buckets** (`#/buckets`). O login e a sincronização valem para as duas telas.

### Calendário

Escolha uma atividade no dock à esquerda (ele expande no hover) ou pelas teclas `1`–`9`,
e clique nos dias. Arrastar pinta um intervalo contínuo — inclusive atravessando a virada
do mês. Clicar de novo no mesmo dia com a mesma atividade apaga.

| Tecla | Ação |
|-------|------|
| `1`–`9` | escolhe a atividade ativa |
| `F` | tela cheia |
| `←` `→` | ano anterior / próximo |
| `Cmd/Ctrl+Z` · `Cmd/Ctrl+Shift+Z` | desfazer · refazer |
| `Esc` | fecha o editor de atividades |

### Buckets

Oito quadros, título editável, até seis objetivos em cada. Digite na linha em branco
do fim para criar (Enter já abre a próxima), clique no texto para editar, apague o
texto todo para remover, arraste pela alça `⠿` para reordenar e clique no quadradinho
para marcar como feito. Na barra dá para virar a folha entre retrato (2×4) e paisagem
(4×2) e trocar a fonte manuscrita. Funciona no celular, inclusive para editar.

Para sincronizar os buckets é preciso rodar [`supabase/buckets.sql`](./supabase/buckets.sql)
uma vez no SQL Editor do seu projeto Supabase. Sem isso a tela funciona local, mas o
indicador de sync fica vermelho.

### Dados

Os dados ficam no `localStorage` e, se você entrar com e-mail no botão de sincronização (`●` na
barra superior), sincronizam com o Supabase — o mesmo calendário em qualquer aparelho. O app
continua funcionando sem rede; o sync acontece em segundo plano quando ela volta.

O botão `↓` exporta um JSON de backup e `↑` importa.

### Configuração do Supabase

A URL do projeto e a *publishable key* estão em `src/lib/supabase.ts`. Essa chave é pública por
design — quem protege os dados são as policies de RLS ("cada um só enxerga as próprias linhas").
Para apontar para outro projeto, use `VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY`.

## Estado

Fase 1 do DESIGN.md entregue: grid do ano, pintura por clique e arrasto, barras multi-dia,
CRUD de atividades com metas, undo/redo, feriados nacionais, export/import, tela cheia e
deploy automático.

Sincronização entre dispositivos no ar (Supabase, login por link no e-mail ou OAuth).

Folha de buckets entregue: 8 áreas, objetivos tickáveis, dois layouts, quatro fontes,
undo próprio, sync e edição no celular.

Ainda não implementado: painel de estatísticas com metas e sequências.
