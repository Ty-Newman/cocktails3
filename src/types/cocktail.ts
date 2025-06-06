export interface Cocktail {
  id: string;
  name: string;
  description: string;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export interface Ingredient {
  id: string;
  name: string;
  price: number;
  image_url: string;
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
} 