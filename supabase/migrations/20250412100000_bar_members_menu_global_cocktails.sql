-- Multi-bar model: superadmin on profiles; bar_members for venue roles; bar_cocktails menu;
-- global cocktails (bar_id NULL) + backfill menu from legacy per-bar rows.
--
-- Before running in production: promote any platform operators from profiles.role = 'admin'
-- to 'superadmin' if they must retain cross-tenant access after venue admins are demoted.

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
-- New enum labels are not usable in the same transaction (PostgreSQL 55P04).
-- Compare profiles.role via ::text in functions below until this migration commits.
alter type public.user_role add value if not exists 'superadmin';

do $enum$
begin
    create type public.bar_member_role as enum ('owner', 'admin', 'staff', 'patron');
exception
    when duplicate_object then null;
end $enum$;

-- -----------------------------------------------------------------------------
-- 2. bar_members
-- -----------------------------------------------------------------------------
create table if not exists public.bar_members (
    bar_id uuid not null references public.bars (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    role public.bar_member_role not null default 'patron',
    created_at timestamptz not null default timezone('utc'::text, now()),
    primary key (bar_id, user_id)
);

create index if not exists idx_bar_members_user_id on public.bar_members (user_id);
create index if not exists idx_bar_members_bar_id on public.bar_members (bar_id);

-- -----------------------------------------------------------------------------
-- 3. bar_cocktails (menu)
-- -----------------------------------------------------------------------------
create table if not exists public.bar_cocktails (
    bar_id uuid not null references public.bars (id) on delete cascade,
    cocktail_id uuid not null references public.cocktails (id) on delete cascade,
    active boolean not null default true,
    is_featured boolean not null default false,
    sort_order integer not null default 0,
    created_at timestamptz not null default timezone('utc'::text, now()),
    primary key (bar_id, cocktail_id)
);

create index if not exists idx_bar_cocktails_bar_id on public.bar_cocktails (bar_id);
create index if not exists idx_bar_cocktails_cocktail_id on public.bar_cocktails (cocktail_id);

alter table public.bar_cocktails
    add column if not exists is_featured boolean not null default false;

-- -----------------------------------------------------------------------------
-- 4. Backfill menu from legacy cocktails.bar_id, then promote rows to global pool (A1)
-- -----------------------------------------------------------------------------
insert into public.bar_cocktails (bar_id, cocktail_id, active, is_featured, sort_order)
select c.bar_id, c.id, true, coalesce(c.is_featured, false), 0
from public.cocktails c
where c.bar_id is not null
on conflict (bar_id, cocktail_id) do nothing;

alter table public.cocktails alter column bar_id drop not null;

update public.cocktails set bar_id = null where bar_id is not null;

-- -----------------------------------------------------------------------------
-- 5. Backfill bar_members (owners first, then legacy profile admins)
-- -----------------------------------------------------------------------------
insert into public.bar_members (bar_id, user_id, role)
select b.id, b.owner_user_id, 'owner'::public.bar_member_role
from public.bars b
where b.owner_user_id is not null
on conflict (bar_id, user_id) do nothing;

insert into public.bar_members (bar_id, user_id, role)
select p.bar_id, p.id, 'admin'::public.bar_member_role
from public.profiles p
where p.role = 'admin'::public.user_role
on conflict (bar_id, user_id) do nothing;

update public.profiles
set role = 'user'::public.user_role
where role = 'admin'::public.user_role;

-- -----------------------------------------------------------------------------
-- 6. Helper functions
-- -----------------------------------------------------------------------------
create or replace function public.current_user_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role::text = 'superadmin' from public.profiles p where p.id = auth.uid()),
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
      and m.role in ('owner'::public.bar_member_role, 'admin'::public.bar_member_role)
  );
$$;

revoke all on function public.user_can_admin_bar(uuid) from public;
grant execute on function public.user_can_admin_bar(uuid) to authenticated;
grant execute on function public.user_can_admin_bar(uuid) to anon;

-- Legacy name: now means platform superadmin only (no venue admin via profile.role).
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
-- 7. RLS: bar_members
-- -----------------------------------------------------------------------------
alter table public.bar_members enable row level security;

drop policy if exists "Users read own bar memberships" on public.bar_members;
create policy "Users read own bar memberships"
    on public.bar_members for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists "Bar admins read bar_members for their bar" on public.bar_members;
create policy "Bar admins read bar_members for their bar"
    on public.bar_members for select
    to authenticated
    using (public.user_can_admin_bar(bar_id));

drop policy if exists "Bar admins manage bar_members" on public.bar_members;
create policy "Bar admins manage bar_members"
    on public.bar_members for all
    to authenticated
    using (public.user_can_admin_bar(bar_id))
    with check (public.user_can_admin_bar(bar_id));

-- -----------------------------------------------------------------------------
-- 8. RLS: bar_cocktails
-- -----------------------------------------------------------------------------
alter table public.bar_cocktails enable row level security;

drop policy if exists "Anyone can read bar_cocktails" on public.bar_cocktails;
create policy "Anyone can read bar_cocktails"
    on public.bar_cocktails for select
    using (true);

drop policy if exists "Bar admins manage bar_cocktails" on public.bar_cocktails;
create policy "Bar admins manage bar_cocktails"
    on public.bar_cocktails for all
    to authenticated
    using (public.user_can_admin_bar(bar_id))
    with check (public.user_can_admin_bar(bar_id));

-- -----------------------------------------------------------------------------
-- 9. RLS: tenant writes — use user_can_admin_bar(row.bar_id)
-- -----------------------------------------------------------------------------
drop policy if exists "Only admins can modify ingredients" on public.ingredients;
create policy "Only admins can modify ingredients"
    on public.ingredients for all
    to authenticated
    using (public.user_can_admin_bar(bar_id))
    with check (public.user_can_admin_bar(bar_id));

drop policy if exists "Only admins can modify cocktails" on public.cocktails;
drop policy if exists "Admins can update featured status" on public.cocktails;

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

drop policy if exists "Only admins can modify cocktail ingredients" on public.cocktail_ingredients;
create policy "Only admins can modify cocktail ingredients"
    on public.cocktail_ingredients for all
    to authenticated
    using (public.user_can_admin_bar(bar_id))
    with check (public.user_can_admin_bar(bar_id));

drop policy if exists "Admins can view profiles in their bar" on public.profiles;
create policy "Admins can view profiles in their bar"
    on public.profiles for select
    to authenticated
    using (public.user_can_admin_bar(bar_id));

drop policy if exists "Admins can update profiles in their bar" on public.profiles;
create policy "Admins can update profiles in their bar"
    on public.profiles for update
    to authenticated
    using (public.user_can_admin_bar(bar_id))
    with check (public.user_can_admin_bar(bar_id));

drop policy if exists "Admins can delete profiles in their bar" on public.profiles;
create policy "Admins can delete profiles in their bar"
    on public.profiles for delete
    to authenticated
    using (
        public.user_can_admin_bar(bar_id)
        and id <> auth.uid()
    );

drop policy if exists "Admins see co-member profiles" on public.profiles;
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

-- -----------------------------------------------------------------------------
-- 10. OAuth registration: owner via bar_members; profile.role stays user; join adds patron
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
