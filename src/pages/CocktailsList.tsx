import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  TextField,
  InputAdornment,
  CircularProgress,
  Button,
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { supabase } from '../lib/supabase';
import { searchCocktailByName } from '../services/cocktailDB';
import { useCart } from '../contexts/CartContext';
import { FavoriteButton } from '../components/FavoriteButton';
import type { Cocktail, IngredientType, BottleSize, CocktailIngredient } from '../types/cocktail';

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
const calculateCocktailCost = (ingredients: CocktailIngredient[]): number => {
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

export function CocktailsList() {
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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

  useEffect(() => {
    loadCocktails();
  }, []);

  const loadCocktails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cocktails')
        .select(`
          *,
          cocktail_ingredients (
            id,
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
        .order('name');

      if (error) throw error;

      // Process cocktails with images from CocktailDB and calculate costs
      console.log(`Processing ${(data || []).length} cocktails for images...`);
      const cocktailPromises = (data || []).map(async (cocktail, index) => {
          try {
            console.log(`[${index + 1}/${(data || []).length}] Processing: ${cocktail.name}, current image_url:`, cocktail.image_url);
            
            // Only search API if image_url is not already provided (check for null, undefined, empty string, or placeholder URLs)
            let imageUrl = cocktail.image_url;
            
            // Check if URL is a placeholder/example URL that should be replaced
            const isPlaceholderUrl = (url: string | null | undefined): boolean => {
              if (!url || typeof url !== 'string') return true;
              const lowerUrl = url.toLowerCase();
              // Detect common placeholder patterns
              return lowerUrl.includes('example.com') ||
                     lowerUrl.includes('placeholder') ||
                     lowerUrl.includes('placehold') ||
                     lowerUrl.includes('via.placeholder') ||
                     lowerUrl.includes('dummy') ||
                     lowerUrl.startsWith('http://example') ||
                     lowerUrl.startsWith('https://example');
            };
            
            // Explicit check: search if imageUrl is null, undefined, empty string, whitespace-only, or placeholder
            const needsSearch = imageUrl === null || 
                               imageUrl === undefined || 
                               imageUrl === '' || 
                               (typeof imageUrl === 'string' && imageUrl.trim() === '') ||
                               isPlaceholderUrl(imageUrl);
            
            console.log(`[${index + 1}] ${cocktail.name} - needsSearch: ${needsSearch}, imageUrl: ${JSON.stringify(imageUrl)}, type: ${typeof imageUrl}, isPlaceholder: ${isPlaceholderUrl(imageUrl)}`);
            
            if (needsSearch) {
              console.log(`[${index + 1}] Searching API for ${cocktail.name}...`);
              try {
                const imageData = await searchCocktailByName(cocktail.name);
                imageUrl = imageData?.drinks?.[0]?.strDrinkThumb || imageUrl;
                console.log(`[${index + 1}] Search result for ${cocktail.name}:`, imageUrl ? 'Found' : 'Not found');
              } catch (error) {
                console.error(`[${index + 1}] Error fetching image for ${cocktail.name}:`, error);
                // Continue with existing imageUrl (or null/undefined)
              }
            } else {
              console.log(`[${index + 1}] ${cocktail.name} already has image_url, skipping API search`);
            }
            
            const cost = calculateCocktailCost(cocktail.cocktail_ingredients || []);
            console.log(`[${index + 1}] Completed processing ${cocktail.name}`);
            return {
              ...cocktail,
              image_url: imageUrl,
              cost
            };
          } catch (error) {
            console.error(`[${index + 1}] Error processing cocktail ${cocktail.name}:`, error);
            // Return cocktail with original image_url if processing fails
            return {
              ...cocktail,
              image_url: cocktail.image_url || null,
              cost: calculateCocktailCost(cocktail.cocktail_ingredients || [])
            };
          }
        });
      
      // Use allSettled to ensure all cocktails are processed even if some fail
      const results = await Promise.allSettled(cocktailPromises);
      const processedCocktails = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Cocktail at index ${index} failed:`, result.reason);
          // Return a fallback object for failed cocktails
          const cocktail = (data || [])[index];
          return {
            ...cocktail,
            image_url: cocktail.image_url || null,
            cost: calculateCocktailCost(cocktail.cocktail_ingredients || [])
          };
        }
      });
      
      console.log(`Completed processing all ${processedCocktails.length} cocktails`);

      setCocktails(processedCocktails);
    } catch (err) {
      console.error('Error loading cocktails:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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

  const filteredCocktails = cocktails.filter(cocktail =>
    cocktail.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        All Cocktails
      </Typography>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search cocktails..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 4 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Grid container spacing={3}>
          {filteredCocktails.map((cocktail) => (
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