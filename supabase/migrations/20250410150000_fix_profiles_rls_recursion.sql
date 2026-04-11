-- Fix 42P17 infinite recursion: policies must not subquery public.profiles directly.
-- Use SECURITY DEFINER helpers so profile reads bypass RLS (same pattern as current_user_bar_id).

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
-- Replace admin / tenant policies that used EXISTS (SELECT ... FROM profiles)
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
