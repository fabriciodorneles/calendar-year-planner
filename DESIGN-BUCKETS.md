# Buckets de Áreas da Vida — Design Doc

> Segunda tela do app: uma folha com 8 áreas da vida, cada uma com até 6 objetivos
> tickáveis. Mesma origem do calendário — Jesse Itzler.

**Status:** implementada · **Autor:** Fabrício · **Data:** 2026-08-17
**Irmão deste doc:** [DESIGN.md](./DESIGN.md), que descreve o calendário e continua
sendo a fonte da verdade sobre ele.

---

## 1. Objetivo

Uma folha só, na tela inteira, com as 8 áreas da vida e o que eu quero realizar em
cada uma. O valor é o mesmo do calendário: bater o olho e ver o todo. O calendário
mostra **onde o tempo foi**; a folha mostra **para onde ele deveria ir**.

A referência é literal — a folha de papel dividida em 8, título manuscrito no topo
de cada quadro e uma lista curta com quadradinho ao lado. O app copia esse desenho,
não inventa outro.

### Critério de sucesso

Abro a tela, leio as 8 áreas em cinco segundos e escrevo um objetivo novo sem
procurar botão nenhum: clico na linha em branco e digito.

---

## 2. Não-objetivos

- **Não é um gerenciador de tarefas.** Sem prazo, prioridade, subtarefa, etiqueta
  ou lembrete. Seis linhas por área é o limite justamente para forçar a escolha.
- **Não se liga ao calendário.** Tickar "correr uma meia" não pinta nada em março,
  e marcar março não tica nada aqui. As duas telas dividem login, sync e barra —
  nada mais. Qualquer vínculo entre elas é assunto de outra fase (§11).
- **Sem progresso, contador ou percentual.** A folha original não tem, e um "3/6"
  transformaria intenção em métrica.
- **Sem histórico por ano.** Ver "o que eu queria em 2025" não é objetivo (D1).

---

## 3. Decisões tomadas

Tudo abaixo foi decidido, não é sugestão. Mudanças exigem editar este doc.

| # | Decisão | Escolha |
|---|---------|---------|
| D1 | Escopo temporal | **Atemporal.** Uma folha só, sem ano. O seletor de ano do calendário não afeta esta tela. |
| D2 | Quantidade de buckets | **Sempre 8 quadros**, nem mais nem menos. Sem criar, sem remover; só renomear. |
| D3 | Objetivos por bucket | Até **6**. Chegando lá, a linha de escrita some. |
| D4 | Layout | Dois arranjos com botão: **2×4 retrato** (padrão, fiel à folha) e **4×2 paisagem**. |
| D5 | Estética | Papel branco (`--sheet`), tinta quase preta, réguas grossas, **tudo manuscrito** — deliberadamente diferente do bege/condensado do calendário. |
| D6 | Fonte | Quatro manuscritas self-hosted, escolhidas num seletor na barra. Só afeta esta tela. Preferência local, por aparelho. |
| D7 | Criar objetivo | Linha em branco no fim da lista: digitou, virou item. Enter já abre a próxima. Sem botão. |
| D8 | Apagar objetivo | Esvaziar o texto e sair. Sem `×`, sem menu. |
| D9 | Reordenar | Arrastando pela alça (`⠿`), que só aparece no hover/foco. |
| D10 | Item feito | ✓ verde no quadradinho e o texto num peso mais leve. **Nada de risco** e nada se move de lugar. |
| D11 | Navegação | Rota no hash (`#/` e `#/buckets`) + alternador na barra superior. |
| D12 | Undo | Histórico próprio, 50 passos, separado do calendário. Dentro de um campo, o Cmd+Z nativo manda. |
| D13 | Persistência | `localStorage` + Supabase, mesmo desenho do calendário: tabelas próprias, pull/push incremental, merge last-write-wins. |
| D14 | Backup | Export/import JSON **no mesmo arquivo** do calendário. Arquivo antigo (sem buckets) importa sem apagar a folha. |
| D15 | Mobile | **Editável** no celular: 1 coluna × 8 linhas com scroll. Diferente do calendário, que é somente leitura no telefone. |
| D16 | Títulos iniciais | Aventura, Negócios, Casamento, Financeiro, Saúde, Filhos, Pessoal, Caridade — a ordem da folha original, em português. Todos editáveis. |
| D17 | Título vazio | **Permitido**, e é assim que se usa menos de 8 áreas: o quadro fica em branco e sai da leitura. Continua existindo e guardando seus objetivos. |
| D18 | Ícone | SVG self-hosted em `public/`, com o grid do ano e stickers de cor. PNG de 180px para o atalho do iOS, que não lê SVG. |

### Por que mobile editável aqui e não no calendário

O que impede a edição no celular do calendário é o gesto: pintar por arrasto em
células de 30px depende de hit-test fino. Aqui não há gesto nenhum — é campo de
texto e caixa de seleção, que o toque resolve bem. Tickar um objetivo do sofá é
justamente o uso que faz a folha valer no telefone.

---

## 4. Modelo de dados

Duas entidades, ambas com o tripé de sincronização (`id` UUID, `updatedAt`,
`deletedAt`) que o DESIGN.md §5 já usa.

```ts
type Bucket = {
  id: string;
  title: string;        // 'Aventura' — editável
  order: number;        // 0..7, posição na folha (linha por linha)
  updatedAt: number;
  deletedAt: number | null;
};

type Goal = {
  id: string;
  bucketId: string;
  text: string;
  done: boolean;
  order: number;        // 0..5 dentro do bucket, sempre normalizado
  updatedAt: number;
  deletedAt: number | null;
};
```

### 4.1 Invariantes

1. **Sempre 8 buckets vivos.** Nasce assim e não há como mexer nisso pela UI.
   `sheetBuckets()` ordena por `order` e corta em 8 — se o sync trouxer lixo de
   uma versão futura, a folha continua desenhável.
2. **`order` normalizado em 0..n−1 dentro do bucket.** Apagar e reordenar
   renumeram os vizinhos. Sem isso, dois objetivos acabariam com o mesmo `order` e
   a ordem passaria a depender de quem chegou primeiro no sync.
3. **Máximo 6 objetivos vivos por bucket** — contado por bucket, não no total, e
   apagar um libera vaga.

### 4.2 Soft delete

Apagar um objetivo é carimbar `deletedAt`; a linha continua no array e na tabela.
É o que faz a remoção se propagar para os outros aparelhos — sem isso, o aparelho
que não viu a remoção reenviaria a linha de volta no push seguinte.

### 4.3 Só reescreve quem mudou

`moveGoal` e `removeGoal` carimbam `updatedAt` **apenas** nas linhas que de fato
mudaram de posição. Um arrasto que troca dois vizinhos sobe duas linhas, não seis.
Isso é testado (`buckets.test.ts`), porque é fácil de quebrar sem ninguém notar.

---

## 5. Layout

### 5.1 A folha

```css
.sheet {
  aspect-ratio: 1 / 1.4142;      /* retrato: proporção de papel */
  height: 100%;                   /* ocupa a altura da viewport */
  container-type: size;           /* habilita cqh na tipografia */
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(4, 1fr);
}
```

Centralizada, com o bege do app ao redor — "folha sobre a mesa", como na
referência. Em paisagem vira `1.4142 / 1` com 4 colunas × 2 linhas.

**Coincidência útil:** nos dois arranjos a célula mede ~0,354 da altura da folha
(retrato: 0,707H/2; paisagem: 1,414H/4). Por isso a tipografia em `cqh` serve aos
dois sem um segundo conjunto de tamanhos.

### 5.2 A conta que faz 6 objetivos caberem

Cada célula tem 25cqh (um quarto da folha). O conteúdo máximo soma ~21cqh:

| Parte | Custo |
|---|---|
| padding vertical | 2,4cqh |
| título (3,2cqh × 1,15 + 0,3) | 4,0cqh |
| gap título→lista | 0,6cqh |
| 6 objetivos (1,7cqh × 1,25) | 12,8cqh |
| 5 gaps entre objetivos | 1,25cqh |

Mexer em qualquer um desses valores pede refazer a conta — está verificado nas 4
fontes em 1280×720, 1440×900 e 1920×1080.

### 5.3 A armadilha do `overflow: hidden`

Um container com `overflow: hidden` **continua sendo rolável por programa**. Quando
os 6 objetivos não cabiam, focar o último campo fazia o browser rolar a lista para
mostrá-lo, e os primeiros itens saíam da vista em silêncio — o desenho parecia
certo e o arrasto passava a soltar o item uma posição acima do alvo, porque o
hit-test mira coordenadas de tela.

Duas correções, ambas necessárias: os tamanhos da §5.2, e **`overflow: clip`** na
célula e na lista, que corta sem criar container rolável.

### 5.4 Celular (D15)

Abaixo de 700px a folha perde a proporção fixa, vira 1 coluna × 8 linhas e a página
rola. `container-type` volta a `normal` — sem altura fixa não existe `cqh` — e a
tipografia passa a px. A barra superior quebra em duas linhas em vez de escapar
pela lateral.

---

## 6. Interação

| Ação | Como |
|------|------|
| Renomear bucket | Clicar no título e digitar. Enter confirma, Esc desiste, sair do campo grava. Apagar o título deixa o quadro sem nome (D17). |
| Criar objetivo | Digitar na linha em branco do fim. **Enter cria e já abre a próxima linha**; sair do campo também cria. |
| Editar objetivo | Clicar no texto. Grava ao sair do campo ou no Enter. |
| Apagar objetivo | Apagar todo o texto e sair (D8). |
| Reordenar | Arrastar pela alça `⠿` (D9). |
| Tickar | Clicar no quadradinho. |
| Virar a folha | Botão `2×4`/`4×2` na barra. |
| Trocar a fonte | Seletor na barra. |
| Desfazer | `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z` ou os botões da barra. |

### 6.1 Texto no state local, store no commit

Todo campo (título e objetivo) guarda o que está sendo digitado em `useState` e só
chama a store ao sair ou no Enter. Gravar por tecla encheria o undo com uma letra
por passo e acordaria o push do sync a cada digitada. O efeito que sincroniza o
valor de volta só age quando o campo **não** está em foco, para uma chegada do sync
não puxar o texto debaixo do cursor.

### 6.2 O arrasto vive numa `ref`

Mesma armadilha do calendário (DESIGN.md §11): `pointerup` chega antes de o React
commitar o último `pointermove`, então a posição de destino é lida de uma `ref`, não
do state. O `pointer capture` fica na lista e a linha sob o cursor é achada por
`elementFromPoint`. A gravação acontece **uma vez, no `pointerup`** — mover ao vivo
encheria o histórico de passos parciais.

### 6.3 Undo próprio (D12)

Cada tela tem seu histórico e os botões da barra agem na tela atual. Dentro de um
`input`/`textarea` o atalho não é interceptado: ali quem desfaz é o campo, letra a
letra, que é o que se espera de um editor de texto.

---

## 7. Sincronização

Tabelas `buckets` e `bucket_items` — script pronto em
[`supabase/buckets.sql`](./supabase/buckets.sql), para colar no SQL Editor do
projeto. Sem rodar esse script a tela funciona normalmente offline; só o sync
falha, e o indicador da barra fica vermelho.

O `useSync` compartilhado faz **uma passada só** para as duas telas: pull do
calendário e dos buckets em paralelo, merge por `mergeById` (last-write-wins), push
das duas, e só então o cursor avança. Um cursor único de propósito: com um cursor
por tela, uma falha de rede deixaria metade dos dados para trás sem sinal na UI.

O cursor gravado é a hora em que a passada **começou** e o pull não filtra por ele —
as duas regras estão explicadas em `shared/store/cursor.ts`, e ambas nasceram de dado
perdido de verdade (DESIGN.md §9.4).

### 7.1 Aparelho novo adota o remoto

Cada instalação cria seus próprios 8 buckets, com ids distintos. Mesclar dois
aparelhos produziria 16. Vale a mesma regra que o calendário já usava para as
atividades iniciais: se este aparelho nunca escreveu nada — nenhum objetivo vivo e
os 8 títulos ainda de fábrica (`isPristine`) — ele adota a folha do servidor em vez
de somar a sua. E quem adotou não faz push: seria devolver linha por linha o que
acabou de chegar.

---

## 8. Arquitetura

A entrada da segunda tela dividiu o `src/` por feature. Nada de comportamento mudou
na reorganização; só caminhos de import.

```
public/                       # copiado cru para a raiz do build
  favicon.svg                 # ícone da aba: grid do ano com stickers
  apple-touch-icon.png        # 180px, para o atalho na tela do iOS
src/
  App.tsx                     # rota: calendário ou buckets
  main.tsx
  shared/                     # o que as duas telas usam
    components/  Toolbar.tsx (contextual), SyncPanel.tsx
    lib/         router.ts, supabase.ts, io.ts (backup), records.ts (newId/isLive)
    store/       useSync.ts (orquestra as duas), merge.ts (LWW, testado)
    styles/      tokens.css, chrome.css
  features/
    calendar/    CalendarScreen.tsx, components/, lib/, store/, styles/
    buckets/     BucketsScreen.tsx, components/, lib/, store/, styles/
```

**Convenção de import:** dentro da própria pasta, caminho relativo; atravessando a
fronteira (feature → shared, ou barra → feature), o alias `@/`. Sem ele, um arquivo
de feature enxergaria `../../../shared`.

O que ficou em `shared` é o que **as duas telas** usam. O sync é um caso à parte: o
orquestrador é compartilhado, mas o mapeamento de linhas (snake_case ↔ camelCase)
mora na feature dona da tabela — `features/*/store/sync.ts`.

### 8.1 Rota no hash (D11)

`#/` e `#/buckets`, porque o GitHub Pages serve arquivo estático e `/buckets` daria
404. Qualquer hash desconhecido cai no calendário.

**Cuidado com o caminho dos ícones.** O Vite já prefixa a `base`
(`/calendar-year-planner/`) nos assets declarados no `index.html`, então o `href`
deles é escrito a partir da raiz (`/favicon.svg`). Usar `%BASE_URL%favicon.svg`
faz o prefixo entrar duas vezes e o ícone dar 404 no Pages — some da aba sem
nenhum erro no console.

**Cuidado com o retorno do login.** O `redirectTo` do Supabase não pode carregar
hash — vira `##access_token=…` e o parser ignora (DESIGN.md §9.4). Então a tela de
origem é guardada no `sessionStorage` e aplicada na volta **depois** de
`getSession()` resolver: escrever no hash antes disso apagaria o token da URL antes
de o Supabase lê-lo, e a sessão nunca seria criada.

---

## 9. Testes

`src/features/buckets/lib/buckets.test.ts` cobre a lógica pura, que é onde o dado
se perde: limite de 6 por bucket, vaga liberada por remoção, soft delete com
renumeração, reordenação nas duas direções e com índice fora da lista, "só reescreve
quem mudou", isolamento entre buckets e a detecção de folha de fábrica.

A UI não tem teste automatizado (regra do projeto). O que foi validado dirigindo o
app num browser real: criar/editar/apagar, arrastar entre todas as posições, undo,
limite de 6, persistência após reload, troca de fonte e layout, e a folha nas 4
fontes em três resoluções.

---

## 10. Riscos

| Risco | Mitigação |
|-------|-----------|
| Objetivo longo estourar a célula | Quebra em duas linhas e o texto encolhe até o limite; passando disso, `clip` corta. Seis linhas curtas é o desenho pretendido. |
| Fonte manuscrita ilegível em tela pequena | Piso de 10px no `clamp` e quatro fontes à escolha — Patrick Hand é a mais legível. |
| Edição simultânea no mesmo objetivo em dois aparelhos | LWW: o último a gravar vence. Como cada objetivo é uma linha, colisão real só no mesmo item. |
| Esquecer de rodar o SQL e achar que o sync quebrou | A tela funciona offline; o indicador da barra fica vermelho com a mensagem do Postgres. |
| Alguém querer 9 buckets | Não dá, e é de propósito (D2). Mudar exige mexer aqui primeiro. |

---

## 11. Backlog (não priorizado)

Export da folha em PNG/impressão A4 · arrastar objetivo **entre** buckets ·
revisão anual (arquivar a folha do ano e começar outra, que é o D1 invertido) ·
ligação com o calendário (ex.: um objetivo com contador alimentado pelas marcações).
