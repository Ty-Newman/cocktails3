-- Check if RLS is enabled
select tablename, rowsecurity 
from pg_tables 
where schemaname = 'public' 
and tablename = 'profiles';

-- Check existing policies
select * from pg_policies 
where tablename = 'profiles';

-- Drop existing policies to start fresh
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;

-- Recreate policies
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Users can insert their own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

create policy "Admins can view all profiles"
    on public.profiles for select
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and role = 'admin'
        )
    ); 