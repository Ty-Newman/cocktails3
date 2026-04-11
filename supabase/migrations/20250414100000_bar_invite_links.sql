-- Phase 5: magic invite links → bar_members (patron) after sign-in.

create table public.bar_invite_links (
    id uuid primary key default gen_random_uuid(),
    bar_id uuid not null references public.bars (id) on delete cascade,
    token text not null
        default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
        unique,
    created_by uuid references auth.users (id) on delete set null,
    label text,
    expires_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz not null default timezone('utc'::text, now())
);

create index idx_bar_invite_links_bar_id on public.bar_invite_links (bar_id);

alter table public.bar_invite_links enable row level security;

create policy "Bar admins manage invite links"
    on public.bar_invite_links for all
    to authenticated
    using (public.user_can_admin_bar(bar_id))
    with check (public.user_can_admin_bar(bar_id));

-- -----------------------------------------------------------------------------
-- accept_bar_invite: validate token, add patron membership, set home bar if default
-- -----------------------------------------------------------------------------
create or replace function public.accept_bar_invite(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := auth.uid();
    default_bar uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
    link public.bar_invite_links%rowtype;
    slug text;
begin
    if uid is null then
        return json_build_object('ok', false, 'error', 'not_authenticated');
    end if;

    if p_token is null or length(trim(p_token)) < 8 then
        return json_build_object('ok', false, 'error', 'invalid_token');
    end if;

    select * into link
    from public.bar_invite_links
    where token = trim(p_token)
    limit 1;

    if not found then
        return json_build_object('ok', false, 'error', 'invalid_token');
    end if;

    if link.revoked_at is not null then
        return json_build_object('ok', false, 'error', 'revoked');
    end if;

    if link.expires_at is not null and link.expires_at < timezone('utc'::text, now()) then
        return json_build_object('ok', false, 'error', 'expired');
    end if;

    insert into public.bar_members (bar_id, user_id, role)
    values (link.bar_id, uid, 'patron'::public.bar_member_role)
    on conflict (bar_id, user_id) do nothing;

    update public.profiles p
    set
        bar_id = link.bar_id,
        updated_at = timezone('utc'::text, now())
    where p.id = uid
      and p.bar_id = default_bar;

    select b.slug into slug from public.bars b where b.id = link.bar_id;

    return json_build_object(
        'ok', true,
        'bar_id', link.bar_id,
        'bar_slug', slug
    );
end;
$$;

revoke all on function public.accept_bar_invite(text) from public;
grant execute on function public.accept_bar_invite(text) to authenticated;
