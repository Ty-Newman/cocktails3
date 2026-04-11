/** Nested shape returned by Supabase when selecting `cocktails (...)` from `bar_cocktails`. */
export type BarCocktailRow<T extends Record<string, unknown> = Record<string, unknown>> = {
  active?: boolean;
  is_featured?: boolean;
  sort_order?: number;
  cocktails: T | null;
};

export function cocktailsFromBarMenuRows<T extends Record<string, unknown>>(
  rows: BarCocktailRow<T>[] | null | undefined
): T[] {
  return (rows ?? [])
    .map((r) => r.cocktails)
    .filter((c): c is T => c != null);
}
