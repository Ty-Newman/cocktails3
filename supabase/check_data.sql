-- Check profiles table data
select * from public.profiles;

-- Check auth.users data
select id, email, created_at from auth.users;

-- Compare the two tables
select 
    u.id as auth_user_id,
    u.email,
    p.id as profile_id,
    p.role,
    p.created_at as profile_created_at
from auth.users u
left join public.profiles p on u.id = p.id; 