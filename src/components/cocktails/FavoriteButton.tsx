import { IconButton, Tooltip } from '@mui/material';
import { Favorite, FavoriteBorder } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useState } from 'react';

interface FavoriteButtonProps {
  cocktailId: string;
  initialIsFavorite: boolean;
  onToggle?: (isFavorite: boolean) => void;
}

export default function FavoriteButton({ cocktailId, initialIsFavorite, onToggle }: FavoriteButtonProps) {
  const { user } = useAuth();
  const { getClient } = useSupabase();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleFavorite = async () => {
    if (!user || isLoading) return;

    setIsLoading(true);
    const supabase = getClient();

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .match({ user_id: user.id, cocktail_id: cocktailId });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert([{ user_id: user.id, cocktail_id: cocktailId }]);

        if (error) throw error;
      }

      setIsFavorite(!isFavorite);
      onToggle?.(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
      <IconButton
        onClick={handleToggleFavorite}
        disabled={isLoading}
        color="primary"
        size="small"
      >
        {isFavorite ? <Favorite /> : <FavoriteBorder />}
      </IconButton>
    </Tooltip>
  );
} 