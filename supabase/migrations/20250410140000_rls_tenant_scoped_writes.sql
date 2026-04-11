-- Tenant-scoped writes + public read for slug resolution and unauthenticated menus.
-- Apply after 20250410120000_add_bars_tenancy.sql

-- -----------------------------------------------------------------------------
-- Helper: caller's home bar (from profiles.bar_id)
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

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.current_user_is_admin() to anon;

-- -----------------------------------------------------------------------------
-- Anon read: resolve bar by slug + browse catalog without login
-- -----------------------------------------------------------------------------
drop policy if exists "Anon can read bars" on public.bars;
create policy "Anon can read bars"
    on public.bars for select
    to anon
    using (true);

drop policy if exists "Anon can read bar_settings" on public.bar_settings;
create policy "Anon can read bar_settings"
    on public.bar_settings for select
    to anon
    using (true);

drop policy if exists "Anon can view ingredients" on public.ingredients;
create policy "Anon can view ingredients"
    on public.ingredients for select
    to anon
    using (true);

drop policy if exists "Anon can view cocktails" on public.cocktails;
create policy "Anon can view cocktails"
    on public.cocktails for select
    to anon
    using (true);

drop policy if exists "Anon can view cocktail_ingredients" on public.cocktail_ingredients;
create policy "Anon can view cocktail_ingredients"
    on public.cocktail_ingredients for select
    to anon
    using (true);

-- -----------------------------------------------------------------------------
-- Admins may only mutate rows in their home bar
-- -----------------------------------------------------------------------------
drop policy if exists "Only admins can modify ingredients" on public.ingredients;
create policy "Only admins can modify ingredients"
    on public.ingredients for all
    to authenticated
    using (
        public.current_user_is_admin()
        and bar_id = public.current_user_bar_id()
    )
    with check (
        public.current_user_is_admin()
        and bar_id = public.current_user_bar_id()
    );

drop policy if exists "Only admins can modify cocktails" on public.cocktails;
create policy "Only admins can modify cocktails"
    on public.cocktails for all
    to authenticated
    using (
        public.current_user_is_admin()
        and bar_id = public.current_user_bar_id()
    )
    with check (
        public.current_user_is_admin()
        and bar_id = public.current_user_bar_id()
    );

drop policy if exists "Admins can update featured status" on public.cocktails;
create policy "Admins can update featured status"
    on public.cocktails for update
    to authenticated
    using (
        public.current_user_is_admin()
        and bar_id = public.current_user_bar_id()
    )
    with check (
        public.current_user_is_admin()
        and bar_id = public.current_user_bar_id()
    );

drop policy if exists "Only admins can modify cocktail ingredients" on public.cocktail_ingredients;
create policy "Only admins can modify cocktail ingredients"
    on public.cocktail_ingredients for all
    to authenticated
    using (
        public.current_user_is_admin()
        and bar_id = public.current_user_bar_id()
    )
    with check (
        public.current_user_is_admin()
        and bar_id = public.current_user_bar_id()
    );

-- -----------------------------------------------------------------------------
-- Favorites / cart: scoped to caller's home bar
-- -----------------------------------------------------------------------------
drop policy if exists "Users can manage their own favorites" on public.favorites;
create policy "Users can manage their own favorites"
    on public.favorites for all
    to authenticated
    using (
        auth.uid() = user_id
        and bar_id = public.current_user_bar_id()
    )
    with check (
        auth.uid() = user_id
        and bar_id = public.current_user_bar_id()
    );

drop policy if exists "Users can manage their own cart" on public.cart;
create policy "Users can manage their own cart"
    on public.cart for all
    to authenticated
    using (
        auth.uid() = user_id
        and bar_id = public.current_user_bar_id()
    )
    with check (
        auth.uid() = user_id
        and bar_id = public.current_user_bar_id()
    );

drop policy if exists "Users can create their own orders" on public.orders;
create policy "Users can create their own orders"
    on public.orders for insert
    to authenticated
    with check (
        auth.uid() = user_id
        and bar_id = public.current_user_bar_id()
    );

-- -----------------------------------------------------------------------------
-- Profiles: admins can list/update/delete users in the same bar (user management UI)
-- -----------------------------------------------------------------------------
drop policy if exists "Admins can view profiles in their bar" on public.profiles;
create policy "Admins can view profiles in their bar"
    on public.profiles for select
    to authenticated
    using (
        public.current_user_is_admin()
        and bar_id = public.current_user_bar_id()
    );

drop policy if exists "Admins can update profiles in their bar" on public.profiles;
create policy "Admins can update profiles in their bar"
    on public.profiles for update
    to authenticated
    using (
        public.current_user_is_admin()
        and bar_id = public.current_user_bar_id()
    )
    with check (bar_id = public.current_user_bar_id());

drop policy if exists "Admins can delete profiles in their bar" on public.profiles;
create policy "Admins can delete profiles in their bar"
    on public.profiles for delete
    to authenticated
    using (
        public.current_user_is_admin()
        and bar_id = public.current_user_bar_id()
        and id <> auth.uid()
    );
