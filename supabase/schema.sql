-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create enum for user roles
create type user_role as enum ('user', 'admin');

-- Create users table (extends Supabase auth.users)
create table public.profiles (
    id uuid references auth.users on delete cascade not null primary key,
    role user_role default 'user' not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create ingredients table
create table public.ingredients (
    id uuid default uuid_generate_v4() primary key,
    name text not null unique,
    link text,
    price decimal(10,2),
    image_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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

-- Create favorites table
create table public.favorites (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles on delete cascade not null,
    cocktail_id uuid references public.cocktails on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, cocktail_id)
);

-- Create cart table
create table public.cart (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles on delete cascade not null,
    cocktail_id uuid references public.cocktails on delete cascade not null,
    quantity integer default 1 not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, cocktail_id)
);

-- Create orders table
create table public.orders (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles on delete cascade not null,
    status text not null default 'pending',
    total_amount decimal(10,2) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create order_items table
create table public.order_items (
    id uuid default uuid_generate_v4() primary key,
    order_id uuid references public.orders on delete cascade not null,
    cocktail_id uuid references public.cocktails on delete cascade not null,
    quantity integer not null,
    price_at_time decimal(10,2) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.ingredients enable row level security;
alter table public.cocktails enable row level security;
alter table public.cocktail_ingredients enable row level security;
alter table public.favorites enable row level security;
alter table public.cart enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Create policies

-- Profiles policies
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Users can insert their own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

-- Ingredients policies
create policy "Anyone can view ingredients"
    on public.ingredients for select
    to authenticated
    using (true);

create policy "Only admins can modify ingredients"
    on public.ingredients for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid()
            and role = 'admin'
        )
    );

-- Cocktails policies
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

-- Cocktail ingredients policies
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

-- Favorites policies
create policy "Users can view their own favorites"
    on public.favorites for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can manage their own favorites"
    on public.favorites for all
    to authenticated
    using (auth.uid() = user_id);

-- Cart policies
create policy "Users can view their own cart"
    on public.cart for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can manage their own cart"
    on public.cart for all
    to authenticated
    using (auth.uid() = user_id);

-- Orders policies
create policy "Users can view their own orders"
    on public.orders for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can create their own orders"
    on public.orders for insert
    to authenticated
    with check (auth.uid() = user_id);

-- Order items policies
create policy "Users can view their own order items"
    on public.order_items for select
    to authenticated
    using (
        exists (
            select 1 from public.orders
            where id = order_items.order_id
            and user_id = auth.uid()
        )
    );

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, role)
    values (new.id, 'user');
    return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user signup
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user(); 