-- Drop all existing policies
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Anyone can view ingredients" on public.ingredients;
drop policy if exists "Only admins can modify ingredients" on public.ingredients;
drop policy if exists "Anyone can view cocktails" on public.cocktails;
drop policy if exists "Only admins can modify cocktails" on public.cocktails;
drop policy if exists "Anyone can view cocktail ingredients" on public.cocktail_ingredients;
drop policy if exists "Only admins can modify cocktail ingredients" on public.cocktail_ingredients;

-- Temporarily disable RLS for profiles to allow initial setup
alter table public.profiles disable row level security;

-- Create basic policies for other tables
create policy "Anyone can view ingredients"
    on public.ingredients for select
    using (true);

create policy "Anyone can view cocktails"
    on public.cocktails for select
    using (true);

create policy "Anyone can view cocktail ingredients"
    on public.cocktail_ingredients for select
    using (true);

-- Create a function to check if a user is an admin
create or replace function public.is_admin()
returns boolean as $$
begin
    return exists (
        select 1 from public.profiles
        where id = auth.uid()
        and role = 'admin'
    );
end;
$$ language plpgsql security definer;

-- Create admin-only policies
create policy "Only admins can modify ingredients"
    on public.ingredients for all
    using (public.is_admin());

create policy "Only admins can modify cocktails"
    on public.cocktails for all
    using (public.is_admin());

create policy "Only admins can modify cocktail ingredients"
    on public.cocktail_ingredients for all
    using (public.is_admin()); 