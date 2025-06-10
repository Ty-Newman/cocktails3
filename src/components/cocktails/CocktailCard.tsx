import { Card, CardContent, CardMedia, Typography, Box, Button } from '@mui/material';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import FavoriteButton from './FavoriteButton';
import type { Cocktail } from '../../types/cocktail';

interface CocktailCardProps {
  cocktail: Cocktail;
  onAddToCart?: () => void;
}

export default function CocktailCard({ cocktail, onAddToCart }: CocktailCardProps) {
  const { addItem } = useCart();
  const { user } = useAuth();

  const handleAddToCart = () => {
    addItem(cocktail.id, 1);
    onAddToCart?.();
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component="img"
        height="200"
        image={cocktail.image_url || '/placeholder.jpg'}
        alt={cocktail.name}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = '/placeholder.jpg';
        }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography gutterBottom variant="h5" component="h2">
            {cocktail.name}
          </Typography>
          {user && (
            <FavoriteButton
              cocktailId={cocktail.id}
              initialIsFavorite={false}
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" paragraph>
          {cocktail.description}
        </Typography>
        <Typography variant="h6" color="primary" gutterBottom>
          ${cocktail.price?.toFixed(2) || '0.00'}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleAddToCart}
        >
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
} 