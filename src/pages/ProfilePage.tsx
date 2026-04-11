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
  CircularProgress,
  Chip,
  Button,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useCart } from '../contexts/CartContext';
import { FavoriteButton } from '../components/FavoriteButton';
import type { Cocktail } from '../types/cocktail';
import { searchCocktailByName } from '../services/cocktailDB';
import { useBar } from '../contexts/BarContext';
import { sumCocktailIngredientCosts } from '../utils/cocktailCost';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { barPath } from '../utils/barPaths';
import {
  BAR_SLUG_PATTERN,
  normalizeBarSlugInput,
} from '../utils/registrationIntent';

type CocktailWithCost = Cocktail & { cost?: number };

export function ProfilePage() {
  const { user, ownedBar, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { bar } = useBar();
  const { favorites, loading: favoritesLoading } = useFavorites();
  const { addToCart } = useCart();
  const [favoriteCocktails, setFavoriteCocktails] = useState<CocktailWithCost[]>([]);
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

  const [createBarOpen, setCreateBarOpen] = useState(false);
  const [createBarName, setCreateBarName] = useState('');
  const [createBarSlug, setCreateBarSlug] = useState('');
  const [createBarBusy, setCreateBarBusy] = useState(false);
  const [createBarError, setCreateBarError] = useState<string | null>(null);

  useEffect(() => {
    if (favorites.length > 0) {
      void loadFavoriteCocktails();
    } else {
      setFavoriteCocktails([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites, bar?.id]);

  const loadFavoriteCocktails = async () => {
    try {
      setLoading(true);
      const { data: menuRows, error: menuErr } = await supabase
        .from('bar_cocktails')
        .select('cocktail_id')
        .eq('bar_id', bar!.id)
        .eq('active', true);
      if (menuErr) throw menuErr;
      const onMenu = new Set((menuRows ?? []).map((r) => r.cocktail_id as string));
      const ids = favorites.filter((id) => onMenu.has(id));
      if (ids.length === 0) {
        setFavoriteCocktails([]);
        return;
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
              price_per_ounce,
              price,
              bottle_size,
              type
            )
          )
        `)
        .in('id', ids);

      if (error) throw error;

      // Process cocktails with images from CocktailDB and calculate costs
      const processedCocktails = await Promise.all(
        (data || []).map(async (cocktail) => {
          const imageData = await searchCocktailByName(cocktail.name);
          const cost = sumCocktailIngredientCosts(cocktail.cocktail_ingredients || []);
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

  const handleAddToCart = (cocktail: CocktailWithCost) => {
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

  const handleCreateBar = async () => {
    setCreateBarError(null);
    const name = createBarName.trim();
    const slug = normalizeBarSlugInput(createBarSlug);
    if (!name) {
      setCreateBarError('Enter a name for your bar.');
      return;
    }
    if (!slug || slug.length < 2 || !BAR_SLUG_PATTERN.test(slug)) {
      setCreateBarError(
        'URL slug must be 2–40 characters: lowercase letters, numbers, and hyphens only.'
      );
      return;
    }
    setCreateBarBusy(true);
    try {
      const { data, error } = await supabase.rpc('complete_oauth_registration', {
        p_join_bar_slug: null,
        p_create_bar: true,
        p_bar_name: name,
        p_bar_slug: slug,
      });
      if (error) throw error;
      const r = data as { ok?: boolean; error?: string; bar_slug?: string };
      if (r?.ok === false) {
        setCreateBarError(
          r.error === 'slug_taken'
            ? 'That URL is already taken. Try another slug.'
            : r.error === 'already_own_bar'
              ? 'You already have a bar.'
              : r.error === 'reserved_slug'
                ? 'That URL is reserved. Try another slug.'
                : r.error ?? 'Could not create bar.'
        );
        return;
      }
      await refreshProfile();
      setCreateBarOpen(false);
      setCreateBarName('');
      setCreateBarSlug('');
      const newSlug = r?.bar_slug ?? slug;
      navigate(barPath(newSlug), { replace: true });
    } catch (e) {
      console.error(e);
      setCreateBarError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setCreateBarBusy(false);
    }
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

      {ownedBar ? (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Your bar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You manage{' '}
            <Link component={RouterLink} to={barPath(ownedBar.slug)}>
              {ownedBar.name}
            </Link>{' '}
            <Typography component="span" variant="body2" color="text.disabled">
              /{ownedBar.slug}
            </Typography>
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Your own bar (optional)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Open a free venue page with its own menu and admin tools. You can stay on this bar as a
            guest forever—this is only if you want to run a separate space. Paid upgrades may be
            offered later; you will not be charged without opting in.
          </Typography>
          <Button variant="outlined" onClick={() => setCreateBarOpen(true)}>
            Create my bar
          </Button>
        </Paper>
      )}

      <Dialog
        open={createBarOpen}
        onClose={() => !createBarBusy && setCreateBarOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create your bar</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {createBarError && <Alert severity="error">{createBarError}</Alert>}
          <TextField
            label="Bar / venue name"
            value={createBarName}
            onChange={(e) => setCreateBarName(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label="URL slug"
            value={createBarSlug}
            onChange={(e) => setCreateBarSlug(normalizeBarSlugInput(e.target.value))}
            fullWidth
            helperText={`${window.location.origin}/your-slug`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateBarOpen(false)} disabled={createBarBusy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void handleCreateBar()} disabled={createBarBusy}>
            {createBarBusy ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

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