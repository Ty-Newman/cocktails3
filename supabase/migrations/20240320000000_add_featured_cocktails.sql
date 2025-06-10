-- Add is_featured column to cocktails table
alter table public.cocktails
add column if not exists is_featured boolean default false;

-- Create index for faster featured cocktails queries
create index if not exists idx_cocktails_is_featured
on public.cocktails(is_featured);

-- Add RLS policy for featured cocktails
create policy "Anyone can view featured cocktails"
on public.cocktails for select
to authenticated
using (is_featured = true);

-- Add RLS policy for admins to manage featured status
create policy "Admins can update featured status"
on public.cocktails for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  )
); 