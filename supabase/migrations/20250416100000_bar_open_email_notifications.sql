-- Bar open state + email notification preferences (Resend called from Edge Function).

alter table public.bars
    add column if not exists is_open boolean not null default false;

alter table public.profiles
    add column if not exists notify_bar_open_email boolean not null default true;

comment on column public.bars.is_open is
    'Patron-facing “we are open”; staff toggles via set_bar_open + Edge Function emails.';

comment on column public.profiles.notify_bar_open_email is
    'Opt-out: when true (default), user may receive bar-open emails for bars they belong to.';

-- -----------------------------------------------------------------------------
-- set_bar_open: bar admins update flag; returns whether to send “open” notifications
-- -----------------------------------------------------------------------------
create or replace function public.set_bar_open(p_bar_id uuid, p_is_open boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := auth.uid();
    prev boolean;
begin
    if uid is null then
        return json_build_object('ok', false, 'error', 'not_authenticated');
    end if;

    if not public.user_can_admin_bar(p_bar_id) then
        return json_build_object('ok', false, 'error', 'forbidden');
    end if;

    select b.is_open into prev from public.bars b where b.id = p_bar_id;
    if not found then
        return json_build_object('ok', false, 'error', 'bar_not_found');
    end if;

    update public.bars
    set
        is_open = p_is_open,
        updated_at = timezone('utc'::text, now())
    where id = p_bar_id;

    return json_build_object(
        'ok', true,
        'was_open', prev,
        'is_open', p_is_open,
        'should_notify_email', (prev = false and p_is_open = true)
    );
end;
$$;

revoke all on function public.set_bar_open(uuid, boolean) from public;
grant execute on function public.set_bar_open(uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- Recipient list for Edge Function (service_role only — not exposed to clients)
-- -----------------------------------------------------------------------------
create or replace function public.get_bar_open_email_recipients(p_bar_id uuid)
returns table (email text, user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
    select u.email::text, p.id
    from public.bar_members m
    inner join public.profiles p on p.id = m.user_id
    inner join auth.users u on u.id = m.user_id
    where m.bar_id = p_bar_id
      and m.role = 'patron'::public.bar_member_role
      and p.notify_bar_open_email = true
      and u.email is not null
      and btrim(u.email::text) <> ''
$$;

revoke all on function public.get_bar_open_email_recipients(uuid) from public;
grant execute on function public.get_bar_open_email_recipients(uuid) to service_role;
