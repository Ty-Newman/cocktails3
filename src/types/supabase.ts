export interface Cocktail {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ingredient {
  id: string;
  name: string;
  price: number;
  link: string | null;
  image_url: string | null;
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
  ingredients: Ingredient;
}

export interface CocktailWithIngredients extends Cocktail {
  cocktail_ingredients: CocktailIngredient[];
} 