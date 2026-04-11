-- Phase 2: enforce that patron writes for favorites/cart reference cocktails on the bar's active menu.
-- Also stop requiring bar_id = home bar (profiles.bar_id) so tenants in the URL work for multi-bar users.

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

-- -----------------------------------------------------------------------------
-- favorites: read own rows anywhere; insert/update only if drink is on that bar's menu
-- -----------------------------------------------------------------------------
drop policy if exists "Users can manage their own favorites" on public.favorites;
create policy "Users can manage their own favorites"
    on public.favorites for all
    to authenticated
    using (auth.uid() = user_id)
    with check (
        auth.uid() = user_id
        and public.cocktail_on_bar_menu(bar_id, cocktail_id)
    );

-- -----------------------------------------------------------------------------
-- cart: same pattern (ready when the app uses server-side cart)
-- -----------------------------------------------------------------------------
drop policy if exists "Users can manage their own cart" on public.cart;
create policy "Users can manage their own cart"
    on public.cart for all
    to authenticated
    using (auth.uid() = user_id)
    with check (
        auth.uid() = user_id
        and public.cocktail_on_bar_menu(bar_id, cocktail_id)
    );

-- -----------------------------------------------------------------------------
-- orders: allow placing an order for any bar the user names (not only home bar)
-- -----------------------------------------------------------------------------
drop policy if exists "Users can create their own orders" on public.orders;
create policy "Users can create their own orders"
    on public.orders for insert
    to authenticated
    with check (
        auth.uid() = user_id
        and exists (select 1 from public.bars b where b.id = bar_id)
    );

-- Line items must reference cocktails on that order's bar menu
drop policy if exists "Users can insert own order_items" on public.order_items;
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
