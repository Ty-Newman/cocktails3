import { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  CircularProgress,
  Container,
  Button,
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { getSupabaseClient } from '../services/supabase';
import { searchCocktailByName } from '../services/cocktailDB';
import { useCart } from '../contexts/CartContext';
import type { Cocktail, IngredientType, BottleSize } from '../types/supabase';
import { FavoriteButton } from '../components/FavoriteButton';

// Add the bottle size to ml mapping
const bottleSizeToMl: Record<BottleSize, number> = {
  '50ml': 50,
  '200ml': 200,
  '375ml': 375,
  '500ml': 500,
  '750ml': 750,
  '1L': 1000,
  '1.75L': 1750
};

// Add the price calculation function
const calculatePricePerOunce = (price: number | null, bottleSize: BottleSize | null, type: IngredientType): number | null => {
  if (price === null || bottleSize === null) return null;
  
  if (type === 'bitters') {
    // Average bitters bottle has about 200 dashes
    const dashesPerBottle = 200;
    return price / dashesPerBottle;
  }
  
  const mlInBottle = bottleSizeToMl[bottleSize];
  const mlPerOunce = 29.5735; // 1 ounce = 29.5735 ml
  return (price * mlPerOunce) / mlInBottle;
};

// Add function to calculate cocktail cost
const calculateCocktailCost = (ingredients: any[]): number => {
  if (!ingredients || ingredients.length === 0) return 0;

  return ingredients.reduce((total, ingredient) => {
    if (!ingredient.ingredients || !ingredient.amount) return total;

    const price = ingredient.ingredients.price;
    if (price === null) return total;

    const pricePerUnit = calculatePricePerOunce(
      price,
      ingredient.ingredients.bottle_size,
      ingredient.ingredients.type
    );

    // For items without bottle size (garnishes, non-bottled items)
    if (pricePerUnit === null) {
      return total + (price * ingredient.amount);
    }

    // For bottled items, calculate based on amount and unit
    const amount = ingredient.amount;
    const unit = ingredient.unit.toLowerCase();
    
    if (unit === 'dash' && ingredient.ingredients.type === 'bitters') {
      return total + (pricePerUnit * amount);
    } else if (unit === 'oz' || unit === 'ounce' || unit === 'ounces') {
      return total + (pricePerUnit * amount);
    } else if (unit === 'ml') {
      // Convert ml to oz for calculation
      const mlPerOunce = 29.5735;
      return total + (pricePerUnit * (amount / mlPerOunce));
    }

    return total;
  }, 0);
};

export function FeaturedCocktails() {
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: ''
  });

  const handleAddToCart = (cocktail: Cocktail) => {
    addToCart({
      id: cocktail.id,
      name: cocktail.name,
      price: cocktail.cost || 0,
      quantity: 1
    });
    setSnackbar({
      open: true,
      message: `${cocktail.name} added to cart!`
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  useEffect(() => {
    const fetchCocktails = async () => {
      try {
        console.log('Starting to fetch cocktails...');
        const supabase = await getSupabaseClient();
        if (!supabase) {
          throw new Error('Supabase client is not available');
        }

        const { data, error } = await supabase
          .from('cocktails')
          .select(`
            *,
            cocktail_ingredients (
              amount,
              unit,
              ingredients (
                id,
                name,
                price,
                bottle_size,
                type
              )
            )
          `)
          .eq('is_featured', true)
          .order('name');

        if (error) {
          throw error;
        }

        console.log('Raw data from Supabase:', data);

        if (!data) {
          setCocktails([]);
          setLoading(false);
          return;
        }

        // Process cocktails with images and costs
        console.log('Processing cocktails with images and costs...');
        const processedCocktails = await Promise.all(
          data.map(async (cocktail) => {
            console.log('Processing cocktail:', cocktail.name);
            const imageData = await searchCocktailByName(cocktail.name);
            const imageUrl = imageData?.drinks?.[0]?.strDrinkThumb;

            // Calculate cost using the helper function
            const cost = calculateCocktailCost(cocktail.cocktail_ingredients || []);

            return {
              ...cocktail,
              image_url: imageUrl,
              cost: cost
            };
          })
        );

        console.log('Final processed cocktails:', processedCocktails);
        setCocktails(processedCocktails);
      } catch (err) {
        console.error('Error fetching cocktails:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCocktails();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {cocktails.map((cocktail) => (
            <Grid item xs={12} sm={6} md={4} key={cocktail.id}>
              <Card sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  transition: 'transform 0.2s ease-in-out',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="200"
                  image={cocktail.image_url || 'https://placehold.co/400x200/1a1a1a/ffffff?text=No+Image'}
                  alt={cocktail.name}
                  sx={{
                    objectFit: 'cover',
                    backgroundColor: 'grey.900'
                  }}
                />
                <CardContent sx={{ 
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  '&:last-child': { pb: 2 }
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" noWrap>
                      {cocktail.name}
                    </Typography>
                    <FavoriteButton cocktailId={cocktail.id} size="small" />
                  </Box>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      minHeight: '2.5em'
                    }}
                  >
                    {cocktail.description}
                  </Typography>
                  <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                    Estimated Cost: ${cocktail.cost?.toFixed(2)}
                  </Typography>
                  <Box sx={{ 
                    mt: 1, 
                    mb: 2,
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Ingredients:
                    </Typography>
                    <Box sx={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 0.5,
                      maxHeight: '100px',
                      overflowY: 'auto',
                      '&::-webkit-scrollbar': {
                        width: '4px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#f1f1f1',
                        borderRadius: '4px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#888',
                        borderRadius: '4px',
                      },
                    }}>
                      {cocktail.cocktail_ingredients?.map((ci) => (
                        <Chip
                          key={ci.id}
                          label={`${ci.amount} ${ci.unit} ${ci.ingredients?.name}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddShoppingCartIcon />}
                    onClick={() => handleAddToCart(cocktail)}
                    fullWidth
                    sx={{ mt: 'auto' }}
                  >
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
} 