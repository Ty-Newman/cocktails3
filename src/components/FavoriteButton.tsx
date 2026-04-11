import { IconButton, Tooltip } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useFavorites } from '../contexts/FavoritesContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface FavoriteButtonProps {
  cocktailId: string;
  /** `cocktails.bar_id`; null/undefined means global template (favorites sync to global list). */
  cocktailCatalogBarId?: string | null;
  size?: 'small' | 'medium' | 'large';
  /** Called after a successful toggle (e.g. Profile tabs reload). */
  onFavoriteChange?: () => void;
}

export function FavoriteButton({
  cocktailId,
  cocktailCatalogBarId,
  size = 'medium',
  onFavoriteChange,
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    await toggleFavorite(cocktailId, cocktailCatalogBarId);
    onFavoriteChange?.();
  };

  const favorited = isFavorite(cocktailId, cocktailCatalogBarId);

  return (
    <Tooltip
      title={
        user
          ? favorited
            ? 'Remove from favorites'
            : 'Add to favorites'
          : 'Sign in to add favorites'
      }
    >
      <IconButton
        onClick={() => void handleClick()}
        color="primary"
        size={size}
        sx={{
          '&:hover': {
            transform: 'scale(1.1)',
            transition: 'transform 0.2s ease-in-out',
          },
        }}
      >
        {favorited ? (
          <FavoriteIcon color="error" />
        ) : (
          <FavoriteBorderIcon />
        )}
      </IconButton>
    </Tooltip>
  );
}
