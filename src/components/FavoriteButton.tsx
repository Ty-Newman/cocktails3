import { IconButton, Tooltip } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useFavorites } from '../contexts/FavoritesContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface FavoriteButtonProps {
  cocktailId: string;
  size?: 'small' | 'medium' | 'large';
}

export function FavoriteButton({ cocktailId, size = 'medium' }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    await toggleFavorite(cocktailId);
  };

  return (
    <Tooltip title={user ? (isFavorite(cocktailId) ? 'Remove from favorites' : 'Add to favorites') : 'Sign in to add favorites'}>
      <IconButton
        onClick={handleClick}
        color="primary"
        size={size}
        sx={{
          '&:hover': {
            transform: 'scale(1.1)',
            transition: 'transform 0.2s ease-in-out',
          },
        }}
      >
        {isFavorite(cocktailId) ? (
          <FavoriteIcon color="error" />
        ) : (
          <FavoriteBorderIcon />
        )}
      </IconButton>
    </Tooltip>
  );
} 