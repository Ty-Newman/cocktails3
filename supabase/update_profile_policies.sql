-- First, drop all existing policies
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;

-- Ensure RLS is enabled
alter table public.profiles enable row level security;

-- Create a function to check if a user is an admin using JWT claims
create or replace function public.is_admin()
returns boolean as $$
begin
    return coalesce(
        (select role = 'admin' from public.profiles where id = auth.uid()),
        false
    );
end;
$$ language plpgsql security definer;

-- Create the new policies
-- Basic user access
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Users can insert their own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

-- Admin access (using security definer to avoid recursion)
create policy "Admins can view all profiles"
    on public.profiles for select
    using (public.is_admin());

-- Verify the policies
select 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
from pg_policies
where schemaname = 'public'
and tablename = 'profiles'
order by policyname; 