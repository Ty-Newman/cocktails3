export type UserRole = 'user' | 'admin' | 'superadmin';

export type BarMemberRole = 'owner' | 'admin' | 'staff' | 'patron';

export type BottleSize = '50ml' | '200ml' | '375ml' | '500ml' | '750ml' | '1L' | '1.75L';

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
  | 'syrup'
  | 'bitters'
  | 'juice';

export interface Profile {
  id: string;
  role: UserRole;
  bar_id: string;
  created_at: string;
  updated_at: string;
}

export interface Cocktail {
  id: string;
  bar_id?: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_featured?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ingredient {
  id: string;
  bar_id?: string;
  name: string;
  bottle_size: BottleSize | null;
  price_per_ounce: number | null;
  /** @deprecated removed from DB; optional for legacy reads */
  price?: number | null;
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
  ingredients?: Ingredient;
}

/** @deprecated Legacy shape; use favorite_cocktails_global / favorite_cocktails_bar in DB. */
export interface Favorite {
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
  cocktail_ingredients: Array<CocktailIngredient & {
    ingredients: Ingredient;
  }>;
} 