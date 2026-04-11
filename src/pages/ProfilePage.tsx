import { useState, useEffect, useCallback } from 'react';
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
  Tabs,
  Tab,
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
  const { refreshBarFavorites } = useFavorites();
  const { addToCart } = useCart();
  const [favoritesTab, setFavoritesTab] = useState(0);
  const [globalFavoriteCocktails, setGlobalFavoriteCocktails] = useState<CocktailWithCost[]>([]);
  const [barFavoriteCocktails, setBarFavoriteCocktails] = useState<CocktailWithCost[]>([]);
  const [menuCocktailIds, setMenuCocktailIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingFavorites, setLoadingFavorites] = useState(true);
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

  const enrichCocktailRows = async (
    rows: CocktailWithCost[] | null | undefined
  ): Promise<CocktailWithCost[]> => {
    const list = rows ?? [];
    return Promise.all(
      list.map(async (cocktail) => {
        const imageData = await searchCocktailByName(cocktail.name);
        const cost = sumCocktailIngredientCosts(cocktail.cocktail_ingredients || []);
        return {
          ...cocktail,
          image_url: imageData?.drinks?.[0]?.strDrinkThumb ?? cocktail.image_url,
          cost,
        };
      })
    );
  };

  const reloadFavoritesSection = useCallback(async () => {
    if (!user?.id || !bar?.id) {
      setGlobalFavoriteCocktails([]);
      setBarFavoriteCocktails([]);
      setMenuCocktailIds(new Set());
      setLoadingFavorites(false);
      return;
    }

    setLoadingFavorites(true);
    try {
      await refreshBarFavorites();

      const [{ data: menuRows, error: menuErr }, { data: globalRows, error: gErr }, { data: barRows, error: bErr }] =
        await Promise.all([
          supabase
            .from('bar_cocktails')
            .select('cocktail_id')
            .eq('bar_id', bar.id)
            .eq('active', true),
          supabase.from('favorite_cocktails_global').select('cocktail_id').eq('user_id', user.id),
          supabase
            .from('favorite_cocktails_bar')
            .select('cocktail_id')
            .eq('user_id', user.id)
            .eq('bar_id', bar.id),
        ]);

      if (menuErr) throw menuErr;
      if (gErr) throw gErr;
      if (bErr) throw bErr;

      const onMenu = new Set((menuRows ?? []).map((r) => r.cocktail_id as string));
      setMenuCocktailIds(onMenu);

      const globalIds = [...new Set((globalRows ?? []).map((r) => r.cocktail_id as string))];
      const barIds = [...new Set((barRows ?? []).map((r) => r.cocktail_id as string))];

      const fetchByIds = async (ids: string[]) => {
        if (ids.length === 0) return [];
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
                price_per_ounce,
                price,
                bottle_size,
                type
              )
            )
          `)
          .in('id', ids);
        if (error) throw error;
        return enrichCocktailRows(data as CocktailWithCost[]);
      };

      const [globalEnriched, barEnriched] = await Promise.all([
        fetchByIds(globalIds),
        fetchByIds(barIds),
      ]);

      setGlobalFavoriteCocktails(globalEnriched);
      setBarFavoriteCocktails(barEnriched);
    } catch (error) {
      console.error('Error loading favorite cocktails:', error);
    } finally {
      setLoadingFavorites(false);
    }
  }, [user?.id, bar?.id, refreshBarFavorites]);

  useEffect(() => {
    if (user && bar?.id) {
      void reloadFavoritesSection();
    }
  }, [user, bar?.id, reloadFavoritesSection]);

  const removeFromSavedEverywhere = async (cocktailId: string) => {
    if (!user?.id) return;
    try {
      await supabase
        .from('favorite_cocktails_global')
        .delete()
        .eq('user_id', user.id)
        .eq('cocktail_id', cocktailId);
      await supabase
        .from('favorite_cocktails_bar')
        .delete()
        .eq('user_id', user.id)
        .eq('cocktail_id', cocktailId);
      await reloadFavoritesSection();
    } catch (e) {
      console.error(e);
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

  const activeFavoriteList =
    favoritesTab === 0 ? globalFavoriteCocktails : barFavoriteCocktails;
  const filteredCocktails = activeFavoriteList.filter((cocktail) =>
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
          Favorite cocktails
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <strong>All favorites</strong> are recipes you saved (global catalog).{' '}
          <strong>At this bar</strong> are drinks you favorited while browsing this venue&apos;s menu.
        </Typography>
        <Tabs
          value={favoritesTab}
          onChange={(_, v) => setFavoritesTab(v)}
          sx={{ mb: 2 }}
        >
          <Tab label="All favorites" />
          <Tab label={bar?.name ? `At ${bar.name}` : 'At this bar'} />
        </Tabs>
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

        {loadingFavorites ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : filteredCocktails.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchQuery
                ? 'No matching favorites found'
                : favoritesTab === 0
                  ? 'No saved favorites yet — heart drinks on a menu to add them here.'
                  : 'No favorites at this bar yet — open this bar’s menu and tap the heart on drinks you like.'}
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, gap: 1 }}>
                      <Typography variant="h6" noWrap sx={{ flex: 1 }}>
                        {cocktail.name}
                      </Typography>
                      {favoritesTab === 0 ? (
                        <Button
                          size="small"
                          color="inherit"
                          onClick={() => void removeFromSavedEverywhere(cocktail.id)}
                        >
                          Remove
                        </Button>
                      ) : (
                        <FavoriteButton
                          cocktailId={cocktail.id}
                          cocktailCatalogBarId={cocktail.bar_id ?? null}
                          size="small"
                          onFavoriteChange={() => void reloadFavoritesSection()}
                        />
                      )}
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
                      disabled={!menuCocktailIds.has(cocktail.id)}
                      sx={{ mt: 'auto' }}
                    >
                      {menuCocktailIds.has(cocktail.id)
                        ? 'Add to Cart'
                        : 'Not on this bar’s menu'}
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