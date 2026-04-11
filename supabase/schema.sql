-- Reference schema for local documentation and greenfield resets.
-- Matches migrations through 20250415120000_phase6_global_bar_favorites.sql
-- (+ bar_invite_links, accept_bar_invite; prior: bar_members, bar_cocktails, menu RLS, superadmin).
-- Requires Supabase auth (auth.users). Seed default bar before any row that references bars.

create extension if not exists "uuid-ossp";

-- Default tenant id (stable; used in column defaults and migration backfill)
-- a0000000-0000-4000-8000-000000000001

create type user_role as enum ('user', 'admin', 'superadmin');

create type bar_member_role as enum ('owner', 'admin', 'staff', 'patron');

create type ingredient_type as enum (
    'whiskey',
    'vodka',
    'rum',
    'gin',
    'tequila',
    'brandy',
    'liqueur',
    'wine',
    'beer',
    'mixer',
    'garnish',
    'other',
    'syrup',
    'bitters',
    'juice'
);

create type bottle_size as enum (
    '50ml',
    '200ml',
    '375ml',
    '500ml',
    '750ml',
    '1L',
    '1.75L'
);

-- -----------------------------------------------------------------------------
-- Bars (tenant) + settings
-- -----------------------------------------------------------------------------
create table public.bars (
    id uuid primary key default uuid_generate_v4(),
    slug text not null,
    name text not null,
    owner_user_id uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now()),
    constraint bars_slug_unique unique (slug)
);

create unique index bars_owner_user_id_unique
    on public.bars (owner_user_id)
    where owner_user_id is not null;

create index idx_bars_slug on public.bars (slug);

insert into public.bars (id, slug, name, owner_user_id)
values (
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'default',
    'Default Bar',
    null
);

create table public.bar_settings (
    bar_id uuid not null references public.bars (id) on delete cascade primary key,
    app_display_name text,
    logo_url text,
    primary_color text,
    secondary_color text,
    updated_at timestamptz not null default timezone('utc'::text, now())
);

insert into public.bar_settings (bar_id, app_display_name)
values (
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'Default Bar'
);

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
    id uuid references auth.users on delete cascade not null primary key,
    role user_role default 'user' not null,
    bar_id uuid not null
        references public.bars (id)
        default 'a0000000-0000-4000-8000-000000000001'::uuid,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

create index idx_profiles_bar_id on public.profiles (bar_id);

-- -----------------------------------------------------------------------------
-- ingredients (price column removed; see migration remove_redundant_price)
-- -----------------------------------------------------------------------------
create table public.ingredients (
    id uuid default uuid_generate_v4() primary key,
    bar_id uuid not null
        references public.bars (id)
        default 'a0000000-0000-4000-8000-000000000001'::uuid,
    name text not null,
    link text,
    bottle_size bottle_size default '750ml',
    price_per_ounce decimal(10,2),
    image_url text,
    type ingredient_type,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now()),
    constraint ingredients_bar_id_name_key unique (bar_id, name)
);

create index idx_ingredients_bar_id on public.ingredients (bar_id);

comment on column public.ingredients.price_per_ounce is
    'The price per ounce of the ingredient, used for cost calculations';

-- -----------------------------------------------------------------------------
-- cocktails
-- -----------------------------------------------------------------------------
create table public.cocktails (
    id uuid default uuid_generate_v4() primary key,
    bar_id uuid references public.bars (id),
    name text not null,
    description text,
    image_url text,
    is_featured boolean default false not null,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

create index idx_cocktails_bar_id on public.cocktails (bar_id);
create index idx_cocktails_is_featured on public.cocktails (is_featured);

-- -----------------------------------------------------------------------------
-- bar_members (venue roles; profile.role is user/superadmin only)
-- -----------------------------------------------------------------------------
create table public.bar_members (
    bar_id uuid not null references public.bars (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    role bar_member_role not null default 'patron',
    created_at timestamptz not null default timezone('utc'::text, now()),
    primary key (bar_id, user_id)
);

create index idx_bar_members_user_id on public.bar_members (user_id);
create index idx_bar_members_bar_id on public.bar_members (bar_id);

-- -----------------------------------------------------------------------------
-- bar_invite_links (magic invite tokens; bar admins manage)
-- -----------------------------------------------------------------------------
create table public.bar_invite_links (
    id uuid primary key default gen_random_uuid(),
    bar_id uuid not null references public.bars (id) on delete cascade,
    token text not null
        default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
        unique,
    created_by uuid references auth.users (id) on delete set null,
    label text,
    expires_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz not null default timezone('utc'::text, now())
);

create index idx_bar_invite_links_bar_id on public.bar_invite_links (bar_id);

-- -----------------------------------------------------------------------------
-- bar_cocktails (menu; per-bar featured)
-- -----------------------------------------------------------------------------
create table public.bar_cocktails (
    bar_id uuid not null references public.bars (id) on delete cascade,
    cocktail_id uuid not null references public.cocktails (id) on delete cascade,
    active boolean not null default true,
    is_featured boolean not null default false,
    sort_order integer not null default 0,
    created_at timestamptz not null default timezone('utc'::text, now()),
    primary key (bar_id, cocktail_id)
);

create index idx_bar_cocktails_bar_id on public.bar_cocktails (bar_id);
create index idx_bar_cocktails_cocktail_id on public.bar_cocktails (cocktail_id);

-- -----------------------------------------------------------------------------
-- cocktail_ingredients
-- -----------------------------------------------------------------------------
create table public.cocktail_ingredients (
    id uuid default uuid_generate_v4() primary key,
    bar_id uuid not null
        references public.bars (id)
        default 'a0000000-0000-4000-8000-000000000001'::uuid,
    cocktail_id uuid references public.cocktails on delete cascade not null,
    ingredient_id uuid references public.ingredients on delete cascade not null,
    amount decimal(10,2) not null,
    unit text not null,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now()),
    unique (cocktail_id, ingredient_id)
);

create index idx_cocktail_ingredients_bar_id on public.cocktail_ingredients (bar_id);

-- -----------------------------------------------------------------------------
-- favorites (global canonical + per-bar menu context)
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

create table public.cart (
    id uuid default uuid_generate_v4() primary key,
    bar_id uuid not null
        references public.bars (id)
        default 'a0000000-0000-4000-8000-000000000001'::uuid,
    user_id uuid references public.profiles on delete cascade not null,
    cocktail_id uuid references public.cocktails on delete cascade not null,
    quantity integer default 1 not null,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now()),
    constraint cart_bar_id_user_id_cocktail_id_key unique (bar_id, user_id, cocktail_id)
);

create index idx_cart_bar_id on public.cart (bar_id);

-- -----------------------------------------------------------------------------
-- orders
-- -----------------------------------------------------------------------------
create table public.orders (
    id uuid default uuid_generate_v4() primary key,
    bar_id uuid not null
        references public.bars (id)
        default 'a0000000-0000-4000-8000-000000000001'::uuid,
    user_id uuid references public.profiles on delete cascade not null,
    status text not null default 'pending',
    total_amount decimal(10,2) not null,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

create index idx_orders_bar_id on public.orders (bar_id);

create table public.order_items (
    id uuid default uuid_generate_v4() primary key,
    bar_id uuid not null
        references public.bars (id)
        default 'a0000000-0000-4000-8000-000000000001'::uuid,
    order_id uuid references public.orders on delete cascade not null,
    cocktail_id uuid references public.cocktails on delete cascade not null,
    quantity integer not null,
    price_at_time decimal(10,2) not null,
    created_at timestamptz not null default timezone('utc'::text, now())
);

create index idx_order_items_bar_id on public.order_items (bar_id);

-- -----------------------------------------------------------------------------
-- RLS helper
-- -----------------------------------------------------------------------------
create or replace function public.current_user_bar_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select bar_id from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_user_bar_id() from public;
grant execute on function public.current_user_bar_id() to authenticated;
grant execute on function public.current_user_bar_id() to anon;

create or replace function public.current_user_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role = 'superadmin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.current_user_is_superadmin() from public;
grant execute on function public.current_user_is_superadmin() to authenticated;
grant execute on function public.current_user_is_superadmin() to anon;

create or replace function public.user_can_admin_bar(p_bar_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_superadmin()
  or exists (
    select 1
    from public.bar_members m
    where m.bar_id = p_bar_id
      and m.user_id = auth.uid()
      and m.role in ('owner'::bar_member_role, 'admin'::bar_member_role)
  );
$$;

revoke all on function public.user_can_admin_bar(uuid) from public;
grant execute on function public.user_can_admin_bar(uuid) to authenticated;
grant execute on function public.user_can_admin_bar(uuid) to anon;

create or replace function public.cocktail_on_bar_menu(p_bar_id uuid, p_cocktail_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bar_cocktails bc
    where bc.bar_id = p_bar_id
      and bc.cocktail_id = p_cocktail_id
      and bc.active = true
  );
$$;

revoke all on function public.cocktail_on_bar_menu(uuid, uuid) from public;
grant execute on function public.cocktail_on_bar_menu(uuid, uuid) to authenticated;
grant execute on function public.cocktail_on_bar_menu(uuid, uuid) to anon;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_superadmin();
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.current_user_is_admin() to anon;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.bars enable row level security;
alter table public.bar_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.ingredients enable row level security;
alter table public.cocktails enable row level security;
alter table public.cocktail_ingredients enable row level security;
alter table public.favorite_cocktails_global enable row level security;
alter table public.favorite_cocktails_bar enable row level security;
alter table public.cart enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.bar_members enable row level security;
alter table public.bar_invite_links enable row level security;
alter table public.bar_cocktails enable row level security;

create policy "Authenticated users can read bars"
    on public.bars for select
    to authenticated
    using (true);

create policy "Authenticated users can read bar_settings"
    on public.bar_settings for select
    to authenticated
    using (true);

create policy "Anon can read bars"
    on public.bars for select
    to anon
    using (true);

create policy "Anon can read bar_settings"
    on public.bar_settings for select
    to anon
    using (true);

create policy "Anon can view ingredients"
    on public.ingredients for select
    to anon
    using (true);

create policy "Anon can view cocktails"
    on public.cocktails for select
    to anon
    using (true);

create policy "Anon can view cocktail_ingredients"
    on public.cocktail_ingredients for select
    to anon
    using (true);

create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Users can insert their own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

create policy "Admins can view profiles in their bar"
    on public.profiles for select
    to authenticated
    using (public.user_can_admin_bar(bar_id));

create policy "Admins can update profiles in their bar"
    on public.profiles for update
    to authenticated
    using (public.user_can_admin_bar(bar_id))
    with check (public.user_can_admin_bar(bar_id));

create policy "Admins can delete profiles in their bar"
    on public.profiles for delete
    to authenticated
    using (
        public.user_can_admin_bar(bar_id)
        and id <> auth.uid()
    );

create policy "Admins see co-member profiles"
    on public.profiles for select
    to authenticated
    using (
        exists (
            select 1
            from public.bar_members mym
            inner join public.bar_members them
                on them.bar_id = mym.bar_id
                and them.user_id = profiles.id
            where mym.user_id = auth.uid()
              and public.user_can_admin_bar(mym.bar_id)
        )
    );

create policy "Anyone can view ingredients"
    on public.ingredients for select
    to authenticated
    using (true);

create policy "Only admins can modify ingredients"
    on public.ingredients for all
    to authenticated
    using (public.user_can_admin_bar(bar_id))
    with check (public.user_can_admin_bar(bar_id));

create policy "Anyone can view cocktails"
    on public.cocktails for select
    to authenticated
    using (true);

create policy "Anyone can view featured cocktails"
    on public.cocktails for select
    to authenticated
    using (is_featured = true);

create policy "Admins insert cocktails"
    on public.cocktails for insert
    to authenticated
    with check (
        (bar_id is null and public.current_user_is_superadmin())
        or (bar_id is not null and public.user_can_admin_bar(bar_id))
    );

create policy "Admins update cocktails"
    on public.cocktails for update
    to authenticated
    using (
        (bar_id is null and public.current_user_is_superadmin())
        or (bar_id is not null and public.user_can_admin_bar(bar_id))
    )
    with check (
        (bar_id is null and public.current_user_is_superadmin())
        or (bar_id is not null and public.user_can_admin_bar(bar_id))
    );

create policy "Admins delete cocktails"
    on public.cocktails for delete
    to authenticated
    using (
        (bar_id is null and public.current_user_is_superadmin())
        or (bar_id is not null and public.user_can_admin_bar(bar_id))
    );

create policy "Anyone can view cocktail ingredients"
    on public.cocktail_ingredients for select
    to authenticated
    using (true);

create policy "Only admins can modify cocktail ingredients"
    on public.cocktail_ingredients for all
    to authenticated
    using (public.user_can_admin_bar(bar_id))
    with check (public.user_can_admin_bar(bar_id));

create policy "Users read own bar memberships"
    on public.bar_members for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Bar admins read bar_members for their bar"
    on public.bar_members for select
    to authenticated
    using (public.user_can_admin_bar(bar_id));

create policy "Bar admins manage bar_members"
    on public.bar_members for all
    to authenticated
    using (public.user_can_admin_bar(bar_id))
    with check (public.user_can_admin_bar(bar_id));

create policy "Bar admins manage invite links"
    on public.bar_invite_links for all
    to authenticated
    using (public.user_can_admin_bar(bar_id))
    with check (public.user_can_admin_bar(bar_id));

create policy "Anyone can read bar_cocktails"
    on public.bar_cocktails for select
    using (true);

create policy "Bar admins manage bar_cocktails"
    on public.bar_cocktails for all
    to authenticated
    using (public.user_can_admin_bar(bar_id))
    with check (public.user_can_admin_bar(bar_id));

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

create policy "Users can view their own cart"
    on public.cart for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can manage their own cart"
    on public.cart for all
    to authenticated
    using (auth.uid() = user_id)
    with check (
        auth.uid() = user_id
        and public.cocktail_on_bar_menu(bar_id, cocktail_id)
    );

create policy "Users can view their own orders"
    on public.orders for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can create their own orders"
    on public.orders for insert
    to authenticated
    with check (
        auth.uid() = user_id
        and exists (select 1 from public.bars b where b.id = bar_id)
    );

create policy "Users can insert own order_items"
    on public.order_items for insert
    to authenticated
    with check (
        exists (
            select 1
            from public.orders o
            where o.id = order_id
              and o.user_id = auth.uid()
              and o.bar_id = bar_id
        )
        and public.cocktail_on_bar_menu(bar_id, cocktail_id)
    );

create policy "Users can view their own order items"
    on public.order_items for select
    to authenticated
    using (
        exists (
            select 1 from public.orders
            where id = order_items.order_id
            and user_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- Post-OAuth: join a bar (patrons) or create owned bar (bar owners)
-- -----------------------------------------------------------------------------
create or replace function public.complete_oauth_registration(
    p_join_bar_slug text default null,
    p_create_bar boolean default false,
    p_bar_name text default null,
    p_bar_slug text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := auth.uid();
    default_bar uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
    target_bar uuid;
    new_bar_id uuid;
    cur_bar_id uuid;
    slug_norm text;
    reserved text[] := array[
        'default', 'login', 'auth', 'register', 'admin', 'api', 'www',
        'owner', 'bars', 'cocktails', 'profile', 'cart', 'join', 'auth-callback'
    ];
begin
    if uid is null then
        return json_build_object('ok', false, 'error', 'not_authenticated');
    end if;

    select bar_id into cur_bar_id from public.profiles where id = uid;
    if not found then
        return json_build_object('ok', false, 'error', 'no_profile');
    end if;

    if exists (select 1 from public.bars b where b.owner_user_id = uid) then
        if p_create_bar then
            return json_build_object('ok', false, 'error', 'already_own_bar');
        end if;
        return json_build_object('ok', true, 'action', 'noop_already_owner');
    end if;

    if p_create_bar then
        if p_bar_name is null or trim(p_bar_name) = ''
           or p_bar_slug is null or trim(p_bar_slug) = '' then
            return json_build_object('ok', false, 'error', 'bar_name_and_slug_required');
        end if;

        slug_norm := lower(regexp_replace(trim(p_bar_slug), '\s+', '-', 'g'));

        if slug_norm !~ '^[a-z0-9][a-z0-9-]{0,38}$' or length(slug_norm) < 2 then
            return json_build_object('ok', false, 'error', 'invalid_slug');
        end if;

        if slug_norm = any (reserved) then
            return json_build_object('ok', false, 'error', 'reserved_slug');
        end if;

        if exists (select 1 from public.bars b where b.slug = slug_norm) then
            return json_build_object('ok', false, 'error', 'slug_taken');
        end if;

        insert into public.bars (slug, name, owner_user_id)
        values (slug_norm, trim(p_bar_name), uid)
        returning id into new_bar_id;

        insert into public.bar_settings (bar_id, app_display_name)
        values (new_bar_id, trim(p_bar_name));

        insert into public.bar_members (bar_id, user_id, role)
        values (new_bar_id, uid, 'owner'::public.bar_member_role)
        on conflict (bar_id, user_id) do update
        set role = excluded.role;

        update public.profiles
        set
            bar_id = new_bar_id,
            role = 'user'::public.user_role,
            updated_at = timezone('utc'::text, now())
        where id = uid;

        return json_build_object('ok', true, 'action', 'created_bar', 'bar_slug', slug_norm);
    end if;

    if p_join_bar_slug is not null and trim(p_join_bar_slug) <> '' then
        if cur_bar_id is distinct from default_bar then
            return json_build_object('ok', true, 'action', 'noop_home_bar_already_set');
        end if;

        select b.id into target_bar
        from public.bars b
        where b.slug = lower(trim(p_join_bar_slug));

        if target_bar is null then
            return json_build_object('ok', false, 'error', 'bar_not_found');
        end if;

        update public.profiles
        set
            bar_id = target_bar,
            updated_at = timezone('utc'::text, now())
        where id = uid;

        insert into public.bar_members (bar_id, user_id, role)
        values (target_bar, uid, 'patron'::public.bar_member_role)
        on conflict (bar_id, user_id) do nothing;

        return json_build_object('ok', true, 'action', 'joined_bar');
    end if;

    return json_build_object('ok', true, 'action', 'default');
end;
$$;

revoke all on function public.complete_oauth_registration(text, boolean, text, text) from public;
grant execute on function public.complete_oauth_registration(text, boolean, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- accept_bar_invite: token → patron membership + home bar if still default
-- -----------------------------------------------------------------------------
create or replace function public.accept_bar_invite(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := auth.uid();
    default_bar uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
    link public.bar_invite_links%rowtype;
    slug text;
begin
    if uid is null then
        return json_build_object('ok', false, 'error', 'not_authenticated');
    end if;

    if p_token is null or length(trim(p_token)) < 8 then
        return json_build_object('ok', false, 'error', 'invalid_token');
    end if;

    select * into link
    from public.bar_invite_links
    where token = trim(p_token)
    limit 1;

    if not found then
        return json_build_object('ok', false, 'error', 'invalid_token');
    end if;

    if link.revoked_at is not null then
        return json_build_object('ok', false, 'error', 'revoked');
    end if;

    if link.expires_at is not null and link.expires_at < timezone('utc'::text, now()) then
        return json_build_object('ok', false, 'error', 'expired');
    end if;

    insert into public.bar_members (bar_id, user_id, role)
    values (link.bar_id, uid, 'patron'::public.bar_member_role)
    on conflict (bar_id, user_id) do nothing;

    update public.profiles p
    set
        bar_id = link.bar_id,
        updated_at = timezone('utc'::text, now())
    where p.id = uid
      and p.bar_id = default_bar;

    select b.slug into slug from public.bars b where b.id = link.bar_id;

    return json_build_object(
        'ok', true,
        'bar_id', link.bar_id,
        'bar_slug', slug
    );
end;
$$;

revoke all on function public.accept_bar_invite(text) from public;
grant execute on function public.accept_bar_invite(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Auth: new user → profile on default bar
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

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
