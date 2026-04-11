-- Bar owner signup vs join-bar signup (patrons). Profile "create my bar" reuses same RPC.
-- Patrons signing in from a bar context only join that bar if they are still on the platform default bar.

create or replace function public.complete_oauth_registration(
    p_join_bar_slug text default null,
    p_create_bar boolean default false,
    p_bar_name text default null,
    p_bar_slug text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := auth.uid();
    default_bar uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
    target_bar uuid;
    new_bar_id uuid;
    cur_bar_id uuid;
    slug_norm text;
    reserved text[] := array[
        'default', 'login', 'auth', 'register', 'admin', 'api', 'www',
        'owner', 'bars', 'cocktails', 'profile', 'cart', 'join', 'auth-callback'
    ];
begin
    if uid is null then
        return json_build_object('ok', false, 'error', 'not_authenticated');
    end if;

    select bar_id into cur_bar_id from public.profiles where id = uid;
    if not found then
        return json_build_object('ok', false, 'error', 'no_profile');
    end if;

    if exists (select 1 from public.bars b where b.owner_user_id = uid) then
        if p_create_bar then
            return json_build_object('ok', false, 'error', 'already_own_bar');
        end if;
        return json_build_object('ok', true, 'action', 'noop_already_owner');
    end if;

    if p_create_bar then
        if p_bar_name is null or trim(p_bar_name) = ''
           or p_bar_slug is null or trim(p_bar_slug) = '' then
            return json_build_object('ok', false, 'error', 'bar_name_and_slug_required');
        end if;

        slug_norm := lower(regexp_replace(trim(p_bar_slug), '\s+', '-', 'g'));

        if slug_norm !~ '^[a-z0-9][a-z0-9-]{0,38}$' or length(slug_norm) < 2 then
            return json_build_object('ok', false, 'error', 'invalid_slug');
        end if;

        if slug_norm = any (reserved) then
            return json_build_object('ok', false, 'error', 'reserved_slug');
        end if;

        if exists (select 1 from public.bars b where b.slug = slug_norm) then
            return json_build_object('ok', false, 'error', 'slug_taken');
        end if;

        insert into public.bars (slug, name, owner_user_id)
        values (slug_norm, trim(p_bar_name), uid)
        returning id into new_bar_id;

        insert into public.bar_settings (bar_id, app_display_name)
        values (new_bar_id, trim(p_bar_name));

        update public.profiles
        set
            bar_id = new_bar_id,
            role = 'admin'::public.user_role,
            updated_at = timezone('utc'::text, now())
        where id = uid;

        return json_build_object('ok', true, 'action', 'created_bar', 'bar_slug', slug_norm);
    end if;

    if p_join_bar_slug is not null and trim(p_join_bar_slug) <> '' then
        if cur_bar_id is distinct from default_bar then
            return json_build_object('ok', true, 'action', 'noop_home_bar_already_set');
        end if;

        select b.id into target_bar
        from public.bars b
        where b.slug = lower(trim(p_join_bar_slug));

        if target_bar is null then
            return json_build_object('ok', false, 'error', 'bar_not_found');
        end if;

        update public.profiles
        set
            bar_id = target_bar,
            updated_at = timezone('utc'::text, now())
        where id = uid;

        return json_build_object('ok', true, 'action', 'joined_bar');
    end if;

    return json_build_object('ok', true, 'action', 'default');
end;
$$;

revoke all on function public.complete_oauth_registration(text, boolean, text, text) from public;
grant execute on function public.complete_oauth_registration(text, boolean, text, text) to authenticated;
