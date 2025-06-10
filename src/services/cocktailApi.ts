interface CocktailApiResponse {
  strDrinkThumb?: string;
}

export const searchCocktailByName = async (name: string): Promise<CocktailApiResponse | null> => {
  try {
    const response = await fetch(
      `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(name)}`
    );
    const data = await response.json();
    return data.drinks?.[0] || null;
  } catch (error) {
    console.error('Error fetching cocktail data:', error);
    return null;
  }
}; 