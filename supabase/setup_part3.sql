-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.ingredients enable row level security;
alter table public.cocktails enable row level security;
alter table public.cocktail_ingredients enable row level security;
alter table public.favorites enable row level security;
alter table public.cart enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Create policies

-- Profiles policies
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- Ingredients policies
create policy "Anyone can view ingredients"
    on public.ingredients for select
    to authenticated
    using (true);

create policy "Only admins can modify ingredients"
    on public.ingredients for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and role = 'admin'
        )
    );

-- Cocktails policies
create policy "Anyone can view cocktails"
    on public.cocktails for select
    to authenticated
    using (true);

create policy "Only admins can modify cocktails"
    on public.cocktails for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and role = 'admin'
        )
    );

-- Cocktail ingredients policies
create policy "Anyone can view cocktail ingredients"
    on public.cocktail_ingredients for select
    to authenticated
    using (true);

create policy "Only admins can modify cocktail ingredients"
    on public.cocktail_ingredients for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and role = 'admin'
        )
    );

-- Favorites policies
create policy "Users can view their own favorites"
    on public.favorites for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can manage their own favorites"
    on public.favorites for all
    to authenticated
    using (auth.uid() = user_id);

-- Cart policies
create policy "Users can view their own cart"
    on public.cart for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can manage their own cart"
    on public.cart for all
    to authenticated
    using (auth.uid() = user_id);

-- Orders policies
create policy "Users can view their own orders"
    on public.orders for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can create their own orders"
    on public.orders for insert
    to authenticated
    with check (auth.uid() = user_id);

-- Order items policies
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

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, role)
    values (new.id, 'user');
    return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user signup
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user(); 