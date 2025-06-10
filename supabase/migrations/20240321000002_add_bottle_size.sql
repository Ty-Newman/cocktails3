-- Create enum for bottle sizes
create type bottle_size as enum (
    '50ml',
    '200ml',
    '375ml',
    '500ml',
    '750ml',
    '1L',
    '1.75L'
);

-- Add bottle_size column to ingredients table
alter table public.ingredients
add column bottle_size bottle_size default '750ml';

-- Add price_per_ounce column to ingredients table
alter table public.ingredients
add column price_per_ounce decimal(10,2);

-- Add comment to explain the columns
comment on column public.ingredients.bottle_size is 'The size of the bottle (e.g., 750ml, 1L)';
comment on column public.ingredients.price_per_ounce is 'The price per ounce of the ingredient'; 