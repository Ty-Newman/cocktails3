-- Create enum type for ingredient types
CREATE TYPE ingredient_type AS ENUM (
    'whiskey',
    'vodka',
    'rum',
    'gin',
    'tequila',
    'brandy',
    'liqueur',
    'wine',
    'beer',
    'mixer',
    'syrup',
    'garnish',
    'other'
);

-- Add type column to ingredients table
ALTER TABLE public.ingredients
ADD COLUMN type ingredient_type;

-- Add comment to explain the column
COMMENT ON COLUMN public.ingredients.type IS 'The type of ingredient (e.g., whiskey, vodka, etc.)'; 