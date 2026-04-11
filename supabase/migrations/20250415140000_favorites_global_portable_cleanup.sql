-- Global catalog favorites are stored only in favorite_cocktails_global; they follow the user
-- to any bar that lists the same cocktail. Remove legacy per-bar rows for global cocktails.

delete from public.favorite_cocktails_bar f
using public.cocktails c
where f.cocktail_id = c.id
  and c.bar_id is null;
