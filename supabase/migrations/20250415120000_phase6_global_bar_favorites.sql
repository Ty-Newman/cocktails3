-- Phase 6: split favorites into global (canonical cocktails) + per-bar context.

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table public.favorite_cocktails_global (
    user_id uuid not null references public.profiles (id) on delete cascade,
    cocktail_id uuid not null references public.cocktails (id) on delete cascade,
    created_at timestamptz not null default timezone('utc'::text, now()),
    primary key (user_id, cocktail_id)
);

create index idx_favorite_cocktails_global_user_id on public.favorite_cocktails_global (user_id);
create index idx_favorite_cocktails_global_cocktail_id on public.favorite_cocktails_global (cocktail_id);

create table public.favorite_cocktails_bar (
    user_id uuid not null references public.profiles (id) on delete cascade,
    bar_id uuid not null references public.bars (id) on delete cascade,
    cocktail_id uuid not null references public.cocktails (id) on delete cascade,
    created_at timestamptz not null default timezone('utc'::text, now()),
    primary key (user_id, bar_id, cocktail_id)
);

create index idx_favorite_cocktails_bar_user_bar on public.favorite_cocktails_bar (user_id, bar_id);

-- -----------------------------------------------------------------------------
-- Backfill from legacy favorites (migration runs as superuser; RLS not applied)
-- -----------------------------------------------------------------------------
insert into public.favorite_cocktails_global (user_id, cocktail_id, created_at)
select distinct f.user_id, f.cocktail_id, f.created_at
from public.favorites f
inner join public.cocktails c on c.id = f.cocktail_id
where c.bar_id is null
on conflict (user_id, cocktail_id) do nothing;

insert into public.favorite_cocktails_bar (user_id, bar_id, cocktail_id, created_at)
select f.user_id, f.bar_id, f.cocktail_id, f.created_at
from public.favorites f
on conflict (user_id, bar_id, cocktail_id) do nothing;

-- -----------------------------------------------------------------------------
-- Drop legacy favorites + helper
-- -----------------------------------------------------------------------------
drop policy if exists "Users can view their own favorites" on public.favorites;
drop policy if exists "Users can manage their own favorites" on public.favorites;
drop table if exists public.favorites;

drop function if exists public.is_cocktail_favorited(uuid);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.favorite_cocktails_global enable row level security;
alter table public.favorite_cocktails_bar enable row level security;

create policy "Users manage own global favorites"
    on public.favorite_cocktails_global for all
    to authenticated
    using (auth.uid() = user_id)
    with check (
        auth.uid() = user_id
        and exists (
            select 1
            from public.cocktails c
            where c.id = cocktail_id
              and c.bar_id is null
        )
    );

create policy "Users manage own bar favorites"
    on public.favorite_cocktails_bar for all
    to authenticated
    using (auth.uid() = user_id)
    with check (
        auth.uid() = user_id
        and public.cocktail_on_bar_menu(bar_id, cocktail_id)
    );
