export interface Cocktail {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  ingredients?: CocktailIngredient[];
  cost?: number;
}

export interface Ingredient {
  id: string;
  name: string;
  link: string | null;
  price: number | null;
  bottle_size: string;
  price_per_ounce: number | null;
  image_url: string | null;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface CocktailIngredient {
  id: string;
  cocktail_id: string;
  ingredient_id: string;
  amount: number;
  unit: string;
  created_at: string;
  updated_at: string;
  ingredient?: Ingredient;
} 