-- Create cocktails table
create table public.cocktails (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    image_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create cocktail_ingredients junction table
create table public.cocktail_ingredients (
    id uuid default uuid_generate_v4() primary key,
    cocktail_id uuid references public.cocktails on delete cascade not null,
    ingredient_id uuid references public.ingredients on delete cascade not null,
    amount decimal(10,2) not null,
    unit text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(cocktail_id, ingredient_id)
);

-- Enable RLS
alter table public.cocktails enable row level security;
alter table public.cocktail_ingredients enable row level security;

-- Create policies
create policy "Anyone can view cocktails"
    on public.cocktails for select
    to authenticated
    using (true);

create policy "Only admins can modify cocktails"
    on public.cocktails for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and role = 'admin'
        )
    );

create policy "Anyone can view cocktail ingredients"
    on public.cocktail_ingredients for select
    to authenticated
    using (true);

create policy "Only admins can modify cocktail ingredients"
    on public.cocktail_ingredients for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and role = 'admin'
        )
    ); 