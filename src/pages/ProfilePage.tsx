import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Divider,
  CircularProgress,
  Chip,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useCart } from '../contexts/CartContext';
import { FavoriteButton } from '../components/FavoriteButton';
import type { Cocktail, IngredientType, BottleSize } from '../types/cocktail';
import { searchCocktailByName } from '../services/cocktailDB';

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

export function ProfilePage() {
  const { user } = useAuth();
  const { favorites, loading: favoritesLoading } = useFavorites();
  const { addToCart } = useCart();
  const [favoriteCocktails, setFavoriteCocktails] = useState<Cocktail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: ''
  });

  useEffect(() => {
    if (favorites.length > 0) {
      loadFavoriteCocktails();
    } else {
      setFavoriteCocktails([]);
      setLoading(false);
    }
  }, [favorites]);

  const loadFavoriteCocktails = async () => {
    try {
      setLoading(true);
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
        .in('id', favorites);

      if (error) throw error;

      // Process cocktails with images from CocktailDB and calculate costs
      const processedCocktails = await Promise.all(
        (data || []).map(async (cocktail) => {
          const imageData = await searchCocktailByName(cocktail.name);
          const cost = calculateCocktailCost(cocktail.cocktail_ingredients || []);
          return {
            ...cocktail,
            image_url: imageData?.drinks?.[0]?.strDrinkThumb,
            cost
          };
        })
      );

      setFavoriteCocktails(processedCocktails);
    } catch (error) {
      console.error('Error loading favorite cocktails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (cocktailId: string) => {
    setImageErrors(prev => ({
      ...prev,
      [cocktailId]: true
    }));
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

  const filteredCocktails = favoriteCocktails.filter(cocktail =>
    cocktail.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Profile
        </Typography>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Please sign in to view your profile
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Your Profile
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Favorite Cocktails
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search your favorites..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {loading || favoritesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : filteredCocktails.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchQuery
                ? 'No matching favorites found'
                : 'You haven\'t added any favorites yet'}
            </Typography>
          </Paper>
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
                    image={imageErrors[cocktail.id] ? 'https://placehold.co/400x200/1a1a1a/ffffff?text=No+Image' : cocktail.image_url}
                    alt={cocktail.name}
                    onError={() => handleImageError(cocktail.id)}
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
      </Box>

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