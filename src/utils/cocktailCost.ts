import type { IngredientType, BottleSize } from '../types/supabase';

const bottleSizeToMl: Record<BottleSize, number> = {
  '50ml': 50,
  '200ml': 200,
  '375ml': 375,
  '500ml': 500,
  '750ml': 750,
  '1L': 1000,
  '1.75L': 1750,
};

function legacyPricePerUnit(
  bottlePrice: number,
  bottleSize: BottleSize,
  type: IngredientType | string | null | undefined
): number | null {
  const mlInBottle = bottleSizeToMl[bottleSize];
  const mlPerOunce = 29.5735;
  if (type === 'bitters') {
    const dashesPerBottle = 200;
    return bottlePrice / dashesPerBottle;
  }
  return (bottlePrice * mlPerOunce) / mlInBottle;
}

/** Nested ingredient row from Supabase joins (cocktail_ingredients → ingredients). */
export type CostIngredientRow = {
  price_per_ounce?: number | null;
  /** Legacy column if still present in some environments */
  price?: number | null;
  bottle_size?: BottleSize | null;
  type?: IngredientType | string | null;
};

/**
 * Estimated line cost for one cocktail ingredient row.
 * Prefers `price_per_ounce` from the database; falls back to legacy bottle `price` + `bottle_size`.
 */
export function ingredientLineCost(
  amount: number,
  unit: string,
  ing: CostIngredientRow | null | undefined
): number {
  if (!ing) return 0;
  const u = unit.toLowerCase();
  const ppo = ing.price_per_ounce;

  if (ppo != null) {
    if (u === 'oz' || u === 'ounce' || u === 'ounces') return ppo * amount;
    if (u === 'ml') return ppo * (amount / 29.5735);
    if (u === 'dash' && ing.type === 'bitters') return ppo * amount;
    return ppo * amount;
  }

  const bottlePrice = ing.price;
  if (bottlePrice == null) return 0;
  if (ing.bottle_size == null) {
    return bottlePrice * amount;
  }
  const pricePerUnit = legacyPricePerUnit(bottlePrice, ing.bottle_size, ing.type);
  if (pricePerUnit == null) return bottlePrice * amount;

  if (u === 'dash' && ing.type === 'bitters') return pricePerUnit * amount;
  if (u === 'oz' || u === 'ounce' || u === 'ounces') return pricePerUnit * amount;
  if (u === 'ml') return pricePerUnit * (amount / 29.5735);

  return bottlePrice * amount;
}

export function sumCocktailIngredientCosts(
  rows: Array<{ amount: number; unit: string; ingredients?: CostIngredientRow | null }> | null | undefined
): number {
  if (!rows?.length) return 0;
  return rows.reduce((total, row) => {
    return total + ingredientLineCost(row.amount, row.unit, row.ingredients);
  }, 0);
}
