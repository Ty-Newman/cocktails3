export type UserRole = 'user' | 'admin';

export type IngredientType = 
  | 'whiskey'
  | 'vodka'
  | 'rum'
  | 'gin'
  | 'tequila'
  | 'brandy'
  | 'liqueur'
  | 'wine'
  | 'beer'
  | 'mixer'
  | 'garnish'
  | 'other'
  | 'syrup';

export interface Profile {
  id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

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
  type: IngredientType | null;
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

export interface Favorite {
  id: string;
  user_id: string;
  cocktail_id: string;
  created_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  cocktail_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  cocktail_id: string;
  quantity: number;
  price_at_time: number;
  created_at: string;
}

export interface CocktailWithIngredients extends Cocktail {
  cocktail_ingredients: CocktailIngredient[];
} 