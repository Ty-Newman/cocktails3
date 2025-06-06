-- Check ingredients
SELECT * FROM public.ingredients;

-- Check cocktails
SELECT * FROM public.cocktails;

-- Check cocktail ingredients with names
SELECT 
    c.name as cocktail_name,
    i.name as ingredient_name,
    ci.amount,
    ci.unit
FROM public.cocktail_ingredients ci
JOIN public.cocktails c ON ci.cocktail_id = c.id
JOIN public.ingredients i ON ci.ingredient_id = i.id
ORDER BY c.name, i.name; 