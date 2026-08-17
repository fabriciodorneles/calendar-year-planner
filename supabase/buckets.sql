-- Buckets de áreas da vida (DESIGN-BUCKETS.md §7).
-- Cole no SQL Editor do projeto Supabase e rode uma vez. É idempotente.
--
-- Mesmo padrão das tabelas do calendário: id uuid gerado no cliente, carimbo
-- `updated_at` em epoch ms para o last-write-wins, soft delete em `deleted_at`
-- (a linha some da tela mas continua existindo para propagar a remoção), e RLS
-- por usuário. `order` e `text` são palavras ocupadas em SQL — daí `sort_order`
-- e `label`.

create table if not exists public.buckets (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null default '',
  sort_order integer not null default 0,
  updated_at bigint not null,
  deleted_at bigint
);

create table if not exists public.bucket_items (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  bucket_id  uuid not null references public.buckets (id) on delete cascade,
  label      text not null default '',
  done       boolean not null default false,
  sort_order integer not null default 0,
  updated_at bigint not null,
  deleted_at bigint
);

-- O pull é sempre "meu, e mudou depois do cursor".
create index if not exists buckets_user_updated_idx
  on public.buckets (user_id, updated_at);
create index if not exists bucket_items_user_updated_idx
  on public.bucket_items (user_id, updated_at);

alter table public.buckets enable row level security;
alter table public.bucket_items enable row level security;

-- Cada um só enxerga e escreve as próprias linhas. `with check` é o que impede
-- gravar uma linha com o user_id de outra pessoa.
drop policy if exists "buckets são de quem os criou" on public.buckets;
create policy "buckets são de quem os criou" on public.buckets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "objetivos são de quem os criou" on public.bucket_items;
create policy "objetivos são de quem os criou" on public.bucket_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
