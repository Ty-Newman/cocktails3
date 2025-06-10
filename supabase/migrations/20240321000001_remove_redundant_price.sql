-- Remove the redundant price column
ALTER TABLE public.ingredients DROP COLUMN price;

-- Add a comment to explain the price_per_ounce column
COMMENT ON COLUMN public.ingredients.price_per_ounce IS 'The price per ounce of the ingredient, used for cost calculations'; 