const BASE_URL = 'https://www.thecocktaildb.com/api/json/v1/1';

export interface CocktailDBResponse {
  drinks: Array<{
    idDrink: string;
    strDrink: string;
    strDrinkThumb: string;
    strInstructions: string;
  }>;
}

export async function searchCocktailByName(name: string): Promise<CocktailDBResponse | null> {
  try {
    // Clean the name and try different variations
    const cleanName = name.replace(/[&]/g, 'and').trim();
    const searchTerms = [
      cleanName,
      name.replace(/[&]/g, ' ').trim(),
      name.split(' ')[0] // Try just the first word
    ];

    // Try each search term until we find a match
    for (const term of searchTerms) {
      console.log('Trying search term:', term);
      const response = await fetch(`${BASE_URL}/search.php?s=${encodeURIComponent(term)}`);
      const data: CocktailDBResponse = await response.json();
      
      if (data.drinks && data.drinks.length > 0) {
        // Find the best match
        const bestMatch = data.drinks.find(drink => 
          drink.strDrink.toLowerCase().includes(term.toLowerCase())
        ) || data.drinks[0];
        
        console.log('Found match:', bestMatch.strDrink);
        return data;
      }
    }

    console.log('No matches found for:', name);
    return null;
  } catch (error) {
    console.error('Error fetching cocktail image:', error);
    return null;
  }
} 