import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  Box, 
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Chip,
  Stack
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { supabase } from '../services/supabase';
import { searchCocktailByName } from '../services/cocktailDB';
import type { Cocktail, CocktailWithIngredients, BottleSize } from '../types/supabase';

interface CocktailWithImage extends Cocktail {
  imageUrl: string;
  cost: number;
  ingredients: {
    name: string;
    amount: number;
    unit: string;
    price: number;
  }[];
}

const bottleSizeToMl: Record<BottleSize, number> = {
  '50ml': 50,
  '200ml': 200,
  '375ml': 375,
  '500ml': 500,
  '750ml': 750,
  '1L': 1000,
  '1.75L': 1750
};

const calculatePricePerOunce = (price: number | null, bottleSize: BottleSize): number => {
  if (price === null) return 0;
  const mlInBottle = bottleSizeToMl[bottleSize];
  const mlPerOunce = 29.5735; // 1 ounce = 29.5735 ml
  return (price * mlPerOunce) / mlInBottle;
};

export default function FeaturedCocktails() {
  const [cocktails, setCocktails] = useState<CocktailWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCocktails();
  }, []);

  const fetchCocktails = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Starting to fetch cocktails...');

      const { data, error } = await supabase
        .from('cocktails')
        .select(`
          *,
          cocktail_ingredients (
            amount,
            unit,
            ingredients (
              name,
              price,
              bottle_size
            )
          )
        `);

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      console.log('Raw data from Supabase:', data);

      if (!data || data.length === 0) {
        console.log('No cocktails found in the database');
        setCocktails([]);
        setLoading(false);
        return;
      }

      // Process cocktails with images and costs
      console.log('Processing cocktails with images and costs...');
      const processedCocktails = await Promise.all(
        (data as CocktailWithIngredients[]).map(async (cocktail) => {
          try {
            console.log(`Processing cocktail: ${cocktail.name}`);
            
            // Only search API if image_url is not already provided (check for null, undefined, empty string, or placeholder URLs)
            let imageUrl = cocktail.image_url || '';
            
            // Check if URL is a placeholder/example URL that should be replaced
            const isPlaceholderUrl = (url: string | null | undefined): boolean => {
              if (!url || typeof url !== 'string') return true;
              const lowerUrl = url.toLowerCase();
              return lowerUrl.includes('example.com') ||
                     lowerUrl.includes('placeholder') ||
                     lowerUrl.includes('placehold') ||
                     lowerUrl.includes('via.placeholder') ||
                     lowerUrl.includes('dummy') ||
                     lowerUrl.startsWith('http://example') ||
                     lowerUrl.startsWith('https://example');
            };
            
            if (!imageUrl || imageUrl.trim() === '' || isPlaceholderUrl(imageUrl)) {
              try {
                const imageData = await searchCocktailByName(cocktail.name);
                console.log('Image data received:', imageData);
                
                if (imageData?.drinks && imageData.drinks.length > 0) {
                  // Find the best match
                  const bestMatch = imageData.drinks.find(drink => 
                    drink.strDrink.toLowerCase().includes(cocktail.name.toLowerCase())
                  ) || imageData.drinks[0];
                  imageUrl = bestMatch.strDrinkThumb || imageUrl;
                }
              } catch (error) {
                console.error(`Error fetching image for ${cocktail.name}:`, error);
                // Continue with existing imageUrl (or empty string)
              }
            }
            
            console.log(`Image URL for ${cocktail.name}:`, imageUrl);

            // Calculate total cost and process ingredients
            const ingredients = cocktail.cocktail_ingredients.map(ci => {
              const pricePerOunce = calculatePricePerOunce(ci.ingredients.price, ci.ingredients.bottle_size);
              return {
                name: ci.ingredients.name,
                amount: ci.amount,
                unit: ci.unit,
                price: pricePerOunce
              };
            });

            const totalCost = ingredients.reduce((sum, ing) => {
              return sum + (ing.price * ing.amount);
            }, 0);

            console.log(`Processed ${cocktail.name} with cost:`, totalCost);

            return {
              ...cocktail,
              imageUrl,
              cost: totalCost,
              ingredients
            };
          } catch (error) {
            console.error(`Error processing cocktail ${cocktail.name}:`, error);
            return {
              ...cocktail,
              imageUrl: '',
              cost: 0,
              ingredients: []
            };
          }
        })
      );

      console.log('Final processed cocktails:', processedCocktails);
      setCocktails(processedCocktails);
    } catch (error) {
      console.error('Error fetching cocktails:', error);
      setError('Failed to load cocktails');
    } finally {
      setLoading(false);
    }
  };

  const filteredCocktails = cocktails.filter(cocktail =>
    cocktail.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Featured Cocktails
        </Typography>
        
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search cocktails..."
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          sx={{ mb: 4 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {filteredCocktails.length === 0 ? (
          <Alert severity="info">
            No cocktails found matching your search.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {filteredCocktails.map((cocktail) => (
              <Grid item xs={12} sm={6} md={4} key={cocktail.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={cocktail.imageUrl || 'https://via.placeholder.com/200x200?text=No+Image'}
                    alt={cocktail.name}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h5" component="h2">
                      {cocktail.name}
                    </Typography>
                    {cocktail.description && (
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {cocktail.description}
                      </Typography>
                    )}
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Total Cost: ${cocktail.cost.toFixed(2)}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {cocktail.ingredients.map((ingredient, index) => (
                        <Chip
                          key={index}
                          label={`${ingredient.name} (${ingredient.amount} ${ingredient.unit})`}
                          size="small"
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
} 