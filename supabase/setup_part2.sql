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