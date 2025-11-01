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
    const words = name.trim().split(/\s+/).filter(w => w.toLowerCase() !== 'the' && w.length > 0);
    const significantWords = words.filter(w => w.length > 2); // Words longer than 2 chars
    
    const searchTerms = [
      cleanName, // Full name with & replaced
      name.replace(/[&]/g, ' ').trim(), // Full name with & as space
      ...(significantWords.length > 0 ? [significantWords.join(' ')] : []), // Significant words only
      ...(words.length > 1 ? [words[0]] : []), // First word (if more than one word)
    ].filter((term, index, self) => 
      // Remove duplicates and very short terms (except the full name attempts)
      index === self.indexOf(term) && (index < 2 || term.length > 2)
    );

    // Try each search term until we find a good match
    for (const term of searchTerms) {
      console.log('Trying search term:', term);
      const response = await fetch(`${BASE_URL}/search.php?s=${encodeURIComponent(term)}`);
      const data: CocktailDBResponse = await response.json();
      
      if (data.drinks && data.drinks.length > 0) {
        // Normalize the search name for comparison
        const normalizedSearchName = name.toLowerCase().replace(/[&]/g, 'and').replace(/\s+/g, ' ');
        
        // Find the best match - prefer exact or close matches
        const bestMatch = data.drinks.find(drink => {
          const normalizedDrinkName = drink.strDrink.toLowerCase().replace(/\s+/g, ' ');
          return normalizedDrinkName === normalizedSearchName || 
                 normalizedDrinkName.includes(normalizedSearchName) ||
                 normalizedSearchName.includes(normalizedDrinkName);
        }) || data.drinks.find(drink => {
          // Fallback: check if significant words match
          const drinkWords = drink.strDrink.toLowerCase().split(/\s+/);
          const searchWords = normalizedSearchName.split(/\s+/).filter(w => w !== 'the' && w.length > 2);
          return searchWords.length > 0 && searchWords.some(sw => 
            drinkWords.some(dw => dw.includes(sw) || sw.includes(dw))
          );
        }) || data.drinks[0];
        
        console.log(`Found match for "${name}":`, bestMatch.strDrink);
        
        // Only return if it's a reasonable match (not just a generic word match)
        if (term.length <= 2) {
          // If we're searching with a very short term, be more strict
          const normalizedMatch = bestMatch.strDrink.toLowerCase().replace(/\s+/g, ' ');
          const hasGoodMatch = normalizedMatch === normalizedSearchName || 
                              normalizedMatch.includes(normalizedSearchName) ||
                              normalizedSearchName.includes(normalizedMatch);
          if (!hasGoodMatch) {
            console.log(`Match "${bestMatch.strDrink}" not close enough to "${name}", continuing search...`);
            continue;
          }
        }
        
        // Return only the best match as the first result
        return {
          drinks: [bestMatch]
        };
      }
    }

    console.log('No matches found for:', name);
    return null;
  } catch (error) {
    console.error('Error fetching cocktail image:', error);
    return null;
  }
} 