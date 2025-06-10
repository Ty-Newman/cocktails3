-- Drop existing trigger and function if they exist
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Recreate the function with better error handling and logging
create or replace function public.handle_new_user()
returns trigger as $$
begin
    -- Log the attempt
    raise notice 'Creating profile for user: %', new.id;
    
    -- Insert the profile
    insert into public.profiles (id, role)
    values (new.id, 'user');
    
    -- Log success
    raise notice 'Profile created successfully for user: %', new.id;
    
    return new;
exception
    when others then
        -- Log any errors
        raise notice 'Error creating profile for user %: %', new.id, SQLERRM;
        return new;
end;
$$ language plpgsql security definer;

-- Recreate the trigger
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Insert missing profiles for existing users
insert into public.profiles (id, role)
select id, 'user'
from auth.users u
where not exists (
    select 1 from public.profiles p where p.id = u.id
); 