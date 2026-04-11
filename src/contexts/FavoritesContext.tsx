import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favorites: string[];
  isFavorite: (cocktailId: string) => boolean;
  toggleFavorite: (cocktailId: string) => Promise<void>;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({
  children,
  barId,
}: {
  children: React.ReactNode;
  barId: string;
}) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      void loadFavorites();
    } else {
      setFavorites([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when user or tenant changes
  }, [user, barId]);

  const loadFavorites = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('favorites')
        .select('cocktail_id')
        .eq('user_id', user.id)
        .eq('bar_id', barId);

      if (error) throw error;

      setFavorites((data ?? []).map(fav => fav.cocktail_id));
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFavorite = (cocktailId: string) => {
    return favorites.includes(cocktailId);
  };

  const toggleFavorite = async (cocktailId: string) => {
    if (!user) return;

    try {
      if (isFavorite(cocktailId)) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('cocktail_id', cocktailId)
          .eq('bar_id', barId);

        if (error) throw error;

        setFavorites(favorites.filter(id => id !== cocktailId));
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert([{ user_id: user.id, cocktail_id: cocktailId, bar_id: barId }]);

        if (error) throw error;

        setFavorites([...favorites, cocktailId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        loading
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
