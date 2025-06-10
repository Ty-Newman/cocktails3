-- First, let's check if the current user is actually an admin
select id, role 
from public.profiles 
where id = auth.uid();

-- Drop and recreate the admin policy with more detailed conditions
drop policy if exists "Admins can view all profiles" on public.profiles;

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

-- Test the policy directly
select 
    auth.uid() as current_user_id,
    exists (
        select 1 from public.profiles
        where id = auth.uid()
        and role = 'admin'
    ) as is_admin,
    (select count(*) from public.profiles) as total_profiles,
    (select count(*) from public.profiles where role = 'admin') as admin_count; 