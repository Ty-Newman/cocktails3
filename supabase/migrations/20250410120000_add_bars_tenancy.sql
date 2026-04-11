-- Whitelabel / multi-tenant foundation: bars, bar_settings, bar_id on tenant tables.
-- Run once in Supabase SQL Editor (or via supabase db push).
-- Default bar UUID is stable so DEFAULT on bar_id columns works for legacy clients.

-- -----------------------------------------------------------------------------
-- 1. Bars (tenant)
-- -----------------------------------------------------------------------------
create table if not exists public.bars (
    id uuid primary key default uuid_generate_v4(),
    slug text not null,
    name text not null,
    owner_user_id uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now()),
    constraint bars_slug_unique unique (slug)
);

-- At most one bar per owner when owner is set (platform default bar has null owner)
create unique index if not exists bars_owner_user_id_unique
    on public.bars (owner_user_id)
    where owner_user_id is not null;

create index if not exists idx_bars_slug on public.bars (slug);

-- -----------------------------------------------------------------------------
-- 2. Bar settings (branding / white-label)
-- -----------------------------------------------------------------------------
create table if not exists public.bar_settings (
    bar_id uuid not null references public.bars (id) on delete cascade primary key,
    app_display_name text,
    logo_url text,
    primary_color text,
    secondary_color text,
    updated_at timestamptz not null default timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 3. Seed default bar (fixed id for DEFAULT on bar_id columns)
-- -----------------------------------------------------------------------------
insert into public.bars (id, slug, name, owner_user_id)
values (
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'default',
    'Default Bar',
    null
)
on conflict (id) do nothing;

insert into public.bar_settings (bar_id, app_display_name)
values (
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'Default Bar'
)
on conflict (bar_id) do nothing;

-- -----------------------------------------------------------------------------
-- 4. profiles.bar_id
-- -----------------------------------------------------------------------------
alter table public.profiles
    add column if not exists bar_id uuid references public.bars (id);

update public.profiles
set bar_id = 'a0000000-0000-4000-8000-000000000001'::uuid
where bar_id is null;

alter table public.profiles
    alter column bar_id set default 'a0000000-0000-4000-8000-000000000001'::uuid;

alter table public.profiles
    alter column bar_id set not null;

create index if not exists idx_profiles_bar_id on public.profiles (bar_id);

-- -----------------------------------------------------------------------------
-- 5. Tenant-scoped tables: add bar_id + backfill + NOT NULL + default
-- -----------------------------------------------------------------------------
alter table public.ingredients
    add column if not exists bar_id uuid references public.bars (id);

update public.ingredients
set bar_id = 'a0000000-0000-4000-8000-000000000001'::uuid
where bar_id is null;

alter table public.ingredients
    alter column bar_id set default 'a0000000-0000-4000-8000-000000000001'::uuid;

alter table public.ingredients
    alter column bar_id set not null;

-- Replace global unique(name) with per-bar uniqueness
alter table public.ingredients drop constraint if exists ingredients_name_key;
alter table public.ingredients drop constraint if exists ingredients_bar_id_name_key;

alter table public.ingredients
    add constraint ingredients_bar_id_name_key unique (bar_id, name);

create index if not exists idx_ingredients_bar_id on public.ingredients (bar_id);

-- cocktails
alter table public.cocktails
    add column if not exists bar_id uuid references public.bars (id);

update public.cocktails
set bar_id = 'a0000000-0000-4000-8000-000000000001'::uuid
where bar_id is null;

alter table public.cocktails
    alter column bar_id set default 'a0000000-0000-4000-8000-000000000001'::uuid;

alter table public.cocktails
    alter column bar_id set not null;

create index if not exists idx_cocktails_bar_id on public.cocktails (bar_id);

-- cocktail_ingredients
alter table public.cocktail_ingredients
    add column if not exists bar_id uuid references public.bars (id);

update public.cocktail_ingredients ci
set bar_id = c.bar_id
from public.cocktails c
where ci.cocktail_id = c.id
  and ci.bar_id is null;

update public.cocktail_ingredients
set bar_id = 'a0000000-0000-4000-8000-000000000001'::uuid
where bar_id is null;

alter table public.cocktail_ingredients
    alter column bar_id set default 'a0000000-0000-4000-8000-000000000001'::uuid;

alter table public.cocktail_ingredients
    alter column bar_id set not null;

create index if not exists idx_cocktail_ingredients_bar_id on public.cocktail_ingredients (bar_id);

-- favorites
alter table public.favorites
    add column if not exists bar_id uuid references public.bars (id);

update public.favorites f
set bar_id = p.bar_id
from public.profiles p
where f.user_id = p.id
  and f.bar_id is null;

update public.favorites
set bar_id = 'a0000000-0000-4000-8000-000000000001'::uuid
where bar_id is null;

alter table public.favorites
    alter column bar_id set default 'a0000000-0000-4000-8000-000000000001'::uuid;

alter table public.favorites
    alter column bar_id set not null;

alter table public.favorites drop constraint if exists favorites_user_id_cocktail_id_key;
alter table public.favorites drop constraint if exists favorites_bar_id_user_id_cocktail_id_key;

alter table public.favorites
    add constraint favorites_bar_id_user_id_cocktail_id_key unique (bar_id, user_id, cocktail_id);

create index if not exists idx_favorites_bar_id on public.favorites (bar_id);

-- cart
alter table public.cart
    add column if not exists bar_id uuid references public.bars (id);

update public.cart c
set bar_id = p.bar_id
from public.profiles p
where c.user_id = p.id
  and c.bar_id is null;

update public.cart
set bar_id = 'a0000000-0000-4000-8000-000000000001'::uuid
where bar_id is null;

alter table public.cart
    alter column bar_id set default 'a0000000-0000-4000-8000-000000000001'::uuid;

alter table public.cart
    alter column bar_id set not null;

alter table public.cart drop constraint if exists cart_user_id_cocktail_id_key;
alter table public.cart drop constraint if exists cart_bar_id_user_id_cocktail_id_key;

alter table public.cart
    add constraint cart_bar_id_user_id_cocktail_id_key unique (bar_id, user_id, cocktail_id);

create index if not exists idx_cart_bar_id on public.cart (bar_id);

-- orders
alter table public.orders
    add column if not exists bar_id uuid references public.bars (id);

update public.orders o
set bar_id = p.bar_id
from public.profiles p
where o.user_id = p.id
  and o.bar_id is null;

update public.orders
set bar_id = 'a0000000-0000-4000-8000-000000000001'::uuid
where bar_id is null;

alter table public.orders
    alter column bar_id set default 'a0000000-0000-4000-8000-000000000001'::uuid;

alter table public.orders
    alter column bar_id set not null;

create index if not exists idx_orders_bar_id on public.orders (bar_id);

-- order_items
alter table public.order_items
    add column if not exists bar_id uuid references public.bars (id);

update public.order_items oi
set bar_id = o.bar_id
from public.orders o
where oi.order_id = o.id
  and oi.bar_id is null;

update public.order_items
set bar_id = 'a0000000-0000-4000-8000-000000000001'::uuid
where bar_id is null;

alter table public.order_items
    alter column bar_id set default 'a0000000-0000-4000-8000-000000000001'::uuid;

alter table public.order_items
    alter column bar_id set not null;

create index if not exists idx_order_items_bar_id on public.order_items (bar_id);

-- -----------------------------------------------------------------------------
-- 6. New signups: attach to default bar (until per-user bar creation exists)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, role, bar_id)
    values (
        new.id,
        'user',
        'a0000000-0000-4000-8000-000000000001'::uuid
    );
    return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. RLS for bars + bar_settings (read for authenticated; tighten later per tenant)
-- -----------------------------------------------------------------------------
alter table public.bars enable row level security;
alter table public.bar_settings enable row level security;

drop policy if exists "Authenticated users can read bars" on public.bars;
create policy "Authenticated users can read bars"
    on public.bars for select
    to authenticated
    using (true);

drop policy if exists "Authenticated users can read bar_settings" on public.bar_settings;
create policy "Authenticated users can read bar_settings"
    on public.bar_settings for select
    to authenticated
    using (true);

-- Optional: allow anon read if you need public slug resolution before login
-- drop policy if exists "Anon can read bars" on public.bars;
-- create policy "Anon can read bars" on public.bars for select to anon using (true);
