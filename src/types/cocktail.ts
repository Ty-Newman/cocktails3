export type IngredientType = 'spirit' | 'liqueur' | 'wine' | 'beer' | 'mixer' | 'bitters' | 'garnish' | 'other';

export type BottleSize = '50ml' | '200ml' | '375ml' | '500ml' | '750ml' | '1L' | '1.75L';

export interface Cocktail {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  cost?: number;
  cocktail_ingredients?: CocktailIngredient[];
}

export interface CocktailIngredient {
  id: string;
  cocktail_id: string;
  ingredient_id: string;
  amount: number;
  unit: string;
  ingredients?: Ingredient;
}

export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  price: number;
  bottle_size: BottleSize | null;
  type: IngredientType;
  link?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  is_bottled: boolean;
} 