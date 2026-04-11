-- First, let's clear any existing data to avoid conflicts
DELETE FROM public.cocktail_ingredients;
DELETE FROM public.bar_cocktails;
DELETE FROM public.cocktails;
DELETE FROM public.ingredients;

-- Insert sample ingredients with per-unit prices (price per ounce for spirits, per unit for others)
INSERT INTO public.ingredients (name, price_per_ounce, image_url) VALUES
    ('Vodka', 0.88, 'https://example.com/vodka.jpg'),           -- $0.88 per oz
    ('Gin', 0.92, 'https://example.com/gin.jpg'),               -- $0.92 per oz
    ('White Rum', 0.85, 'https://example.com/white-rum.jpg'),   -- $0.85 per oz
    ('Tequila', 0.95, 'https://example.com/tequila.jpg'),       -- $0.95 per oz
    ('Whiskey', 1.10, 'https://example.com/whiskey.jpg'),       -- $1.10 per oz
    ('Triple Sec', 0.65, 'https://example.com/triple-sec.jpg'), -- $0.65 per oz
    ('Lime Juice', 0.15, 'https://example.com/lime-juice.jpg'), -- $0.15 per oz
    ('Lemon Juice', 0.15, 'https://example.com/lemon-juice.jpg'), -- $0.15 per oz
    ('Simple Syrup', 0.05, 'https://example.com/simple-syrup.jpg'), -- $0.05 per oz
    ('Orange Juice', 0.10, 'https://example.com/orange-juice.jpg'), -- $0.10 per oz
    ('Cranberry Juice', 0.10, 'https://example.com/cranberry-juice.jpg'), -- $0.10 per oz
    ('Club Soda', 0.05, 'https://example.com/club-soda.jpg'),   -- $0.05 per oz
    ('Mint Leaves', 0.25, 'https://example.com/mint.jpg'),      -- $0.25 per leaf
    ('Sugar', 0.02, 'https://example.com/sugar.jpg'),           -- $0.02 per cube
    ('Bitters', 0.30, 'https://example.com/bitters.jpg');       -- $0.30 per dash

-- Insert sample cocktails
INSERT INTO public.cocktails (name, description, image_url) VALUES
    ('Mojito', 'A refreshing Cuban highball with mint and lime', 'https://example.com/mojito.jpg'),
    ('Margarita', 'A classic tequila cocktail with lime and triple sec', 'https://example.com/margarita.jpg'),
    ('Old Fashioned', 'A sophisticated whiskey cocktail with bitters and sugar', 'https://example.com/old-fashioned.jpg'),
    ('Cosmopolitan', 'A vodka-based cocktail with cranberry and lime', 'https://example.com/cosmopolitan.jpg'),
    ('Gin & Tonic', 'A simple and refreshing gin cocktail', 'https://example.com/gin-tonic.jpg');

-- Resolve IDs within the default bar (stable tenant id from migrations)
DO $$
DECLARE
    default_bar uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
    mojito_id uuid;
    margarita_id uuid;
    old_fashioned_id uuid;
    cosmopolitan_id uuid;
    gin_tonic_id uuid;
    white_rum_id uuid;
    tequila_id uuid;
    whiskey_id uuid;
    vodka_id uuid;
    gin_id uuid;
    triple_sec_id uuid;
    lime_juice_id uuid;
    simple_syrup_id uuid;
    mint_leaves_id uuid;
    club_soda_id uuid;
    bitters_id uuid;
    sugar_id uuid;
    cranberry_juice_id uuid;
BEGIN
    -- Get cocktail IDs
    SELECT id INTO mojito_id FROM public.cocktails WHERE name = 'Mojito' LIMIT 1;
    SELECT id INTO margarita_id FROM public.cocktails WHERE name = 'Margarita' LIMIT 1;
    SELECT id INTO old_fashioned_id FROM public.cocktails WHERE name = 'Old Fashioned' LIMIT 1;
    SELECT id INTO cosmopolitan_id FROM public.cocktails WHERE name = 'Cosmopolitan' LIMIT 1;
    SELECT id INTO gin_tonic_id FROM public.cocktails WHERE name = 'Gin & Tonic' LIMIT 1;

    -- Get ingredient IDs
    SELECT id INTO white_rum_id FROM public.ingredients WHERE bar_id = default_bar AND name = 'White Rum';
    SELECT id INTO tequila_id FROM public.ingredients WHERE bar_id = default_bar AND name = 'Tequila';
    SELECT id INTO whiskey_id FROM public.ingredients WHERE bar_id = default_bar AND name = 'Whiskey';
    SELECT id INTO vodka_id FROM public.ingredients WHERE bar_id = default_bar AND name = 'Vodka';
    SELECT id INTO gin_id FROM public.ingredients WHERE bar_id = default_bar AND name = 'Gin';
    SELECT id INTO triple_sec_id FROM public.ingredients WHERE bar_id = default_bar AND name = 'Triple Sec';
    SELECT id INTO lime_juice_id FROM public.ingredients WHERE bar_id = default_bar AND name = 'Lime Juice';
    SELECT id INTO simple_syrup_id FROM public.ingredients WHERE bar_id = default_bar AND name = 'Simple Syrup';
    SELECT id INTO mint_leaves_id FROM public.ingredients WHERE bar_id = default_bar AND name = 'Mint Leaves';
    SELECT id INTO club_soda_id FROM public.ingredients WHERE bar_id = default_bar AND name = 'Club Soda';
    SELECT id INTO bitters_id FROM public.ingredients WHERE bar_id = default_bar AND name = 'Bitters';
    SELECT id INTO sugar_id FROM public.ingredients WHERE bar_id = default_bar AND name = 'Sugar';
    SELECT id INTO cranberry_juice_id FROM public.ingredients WHERE bar_id = default_bar AND name = 'Cranberry Juice';

    -- Insert cocktail ingredients using the stored IDs
    -- Mojito
    INSERT INTO public.cocktail_ingredients (cocktail_id, ingredient_id, amount, unit)
    VALUES 
        (mojito_id, white_rum_id, 2, 'oz'),
        (mojito_id, lime_juice_id, 1, 'oz'),
        (mojito_id, simple_syrup_id, 0.75, 'oz'),
        (mojito_id, mint_leaves_id, 6, 'leaves'),
        (mojito_id, club_soda_id, 2, 'oz');

    -- Margarita
    INSERT INTO public.cocktail_ingredients (cocktail_id, ingredient_id, amount, unit)
    VALUES 
        (margarita_id, tequila_id, 2, 'oz'),
        (margarita_id, triple_sec_id, 1, 'oz'),
        (margarita_id, lime_juice_id, 1, 'oz');

    -- Old Fashioned
    INSERT INTO public.cocktail_ingredients (cocktail_id, ingredient_id, amount, unit)
    VALUES 
        (old_fashioned_id, whiskey_id, 2, 'oz'),
        (old_fashioned_id, bitters_id, 2, 'dashes'),
        (old_fashioned_id, sugar_id, 1, 'cube');

    -- Cosmopolitan
    INSERT INTO public.cocktail_ingredients (cocktail_id, ingredient_id, amount, unit)
    VALUES 
        (cosmopolitan_id, vodka_id, 1.5, 'oz'),
        (cosmopolitan_id, triple_sec_id, 0.5, 'oz'),
        (cosmopolitan_id, cranberry_juice_id, 1, 'oz'),
        (cosmopolitan_id, lime_juice_id, 0.5, 'oz');

    -- Gin & Tonic
    INSERT INTO public.cocktail_ingredients (cocktail_id, ingredient_id, amount, unit)
    VALUES 
        (gin_tonic_id, gin_id, 2, 'oz'),
        (gin_tonic_id, club_soda_id, 4, 'oz');

    INSERT INTO public.bar_cocktails (bar_id, cocktail_id, active, is_featured)
    VALUES
        (default_bar, mojito_id, true, false),
        (default_bar, margarita_id, true, false),
        (default_bar, old_fashioned_id, true, false),
        (default_bar, cosmopolitan_id, true, false),
        (default_bar, gin_tonic_id, true, false)
    ON CONFLICT (bar_id, cocktail_id) DO NOTHING;
END $$; 