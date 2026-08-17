-- Limpeza dos conjuntos de buckets duplicados.
--
-- Como aconteceu: o cursor do sync é compartilhado pelas duas telas. Quando a
-- folha de buckets entrou no ar, todo aparelho que já usava o calendário chegou
-- nela com cursor > 0 — a regra "aparelho novo adota o remoto" olhava
-- `cursor === 0` e por isso nunca disparou. Cada aparelho empurrou os seus 8
-- buckets de fábrica; com sete deles, viraram 64 linhas e oito candidatas à
-- posição 0. O app já não se confunde mais com isso (`sheetBuckets` escolhe uma
-- por posição), mas as linhas continuam ocupando espaço e subindo no sync.
--
-- O que este script faz: mantém, para cada posição, a linha **mais antiga** —
-- que é a que o aparelho criou primeiro e a que os objetivos referenciam — e
-- marca as outras como apagadas.
--
-- Por que soft delete e não `delete`: apagar de verdade não chega nos
-- aparelhos. Cada um ainda tem as duplicatas no localStorage, e sem uma linha
-- com `deleted_at` mais novo para o merge aplicar, elas continuariam vivas lá.

-- 1) PRÉVIA — rode primeiro e confira a coluna `fica`. Nada é alterado aqui.
with manter as (
  select distinct on (user_id, sort_order) id
  from public.buckets
  where deleted_at is null
  order by user_id, sort_order, updated_at asc, id asc
)
select b.sort_order,
       b.title,
       to_timestamp(b.updated_at / 1000) at time zone 'America/Sao_Paulo' as editado_em,
       (b.id in (select id from manter)) as fica,
       (select count(*) from public.bucket_items i
         where i.bucket_id = b.id and i.deleted_at is null) as objetivos
from public.buckets b
where b.deleted_at is null
order by b.sort_order, b.updated_at;

-- 2) LIMPEZA — só rode depois de conferir a prévia.
with manter as (
  select distinct on (user_id, sort_order) id
  from public.buckets
  where deleted_at is null
  order by user_id, sort_order, updated_at asc, id asc
)
update public.buckets
set deleted_at = (extract(epoch from now()) * 1000)::bigint,
    updated_at = (extract(epoch from now()) * 1000)::bigint
where deleted_at is null
  and id not in (select id from manter);

-- 3) CONFERÊNCIA — o esperado é 8 linhas vivas e nenhum objetivo órfão.
select count(*) as buckets_vivos from public.buckets where deleted_at is null;

select count(*) as objetivos_orfaos
from public.bucket_items i
join public.buckets b on b.id = i.bucket_id
where i.deleted_at is null and b.deleted_at is not null;
