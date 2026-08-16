# Calendar Year Planner

Versão digital do *Big A## Calendar*: o ano inteiro em uma tela, uma linha por mês,
clicável para marcar atividades com stickers.

O desenho completo — decisões, modelo de dados e fases — está em [DESIGN.md](./DESIGN.md).

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

Os dados ficam no `localStorage` do browser. Use o botão `↓` da barra superior para exportar
um JSON de backup e `↑` para importar — **é a única cópia de segurança até o backend da fase 3**.

## Estado

Fase 1 do DESIGN.md entregue: grid do ano, pintura por clique e arrasto, barras multi-dia,
CRUD de atividades com metas, undo/redo, feriados nacionais, export/import, tela cheia e
deploy automático.

Ainda não implementado (fases 2 e 3): modo de inspeção com popover, notas por marcação,
painel de estatísticas, e sincronização com backend.
