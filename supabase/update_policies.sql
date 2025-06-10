-- Create a function to check if a user is an admin
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = user_id
    and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Drop existing policies
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;
drop policy if exists "Admins can delete any profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- Enable RLS
alter table public.profiles enable row level security;

-- Allow users to view their own profile
create policy "Users can view own profile"
    on public.profiles for select
    to authenticated
    using (auth.uid() = id);

-- Allow users to update their own profile
create policy "Users can update own profile"
    on public.profiles for update
    to authenticated
    using (auth.uid() = id);

-- Allow admins to view all profiles
create policy "Admins can view all profiles"
    on public.profiles for select
    to authenticated
    using (public.is_admin(auth.uid()));

-- Allow admins to update any profile
create policy "Admins can update any profile"
    on public.profiles for update
    to authenticated
    using (public.is_admin(auth.uid()));

-- Allow admins to delete any profile
create policy "Admins can delete any profile"
    on public.profiles for delete
    to authenticated
    using (public.is_admin(auth.uid())); 