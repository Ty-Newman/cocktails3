import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favorites: string[];
  isFavorite: (cocktailId: string) => boolean;
  toggleFavorite: (
    cocktailId: string,
    cocktailCatalogBarId?: string | null
  ) => Promise<void>;
  loading: boolean;
  refreshBarFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

async function fetchCocktailCatalogBarId(cocktailId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('cocktails')
    .select('bar_id')
    .eq('id', cocktailId)
    .maybeSingle();
  if (error) {
    console.error('fetchCocktailCatalogBarId:', error);
    return null;
  }
  const v = data?.bar_id;
  return v == null ? null : String(v);
}

function isGlobalTemplate(catalogBarId: string | null | undefined): boolean {
  return catalogBarId == null || catalogBarId === '';
}

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

  const loadBarFavorites = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('favorite_cocktails_bar')
        .select('cocktail_id')
        .eq('user_id', user.id)
        .eq('bar_id', barId);

      if (error) throw error;

      setFavorites((data ?? []).map((row) => row.cocktail_id as string));
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [user, barId]);

  useEffect(() => {
    if (user) {
      void loadBarFavorites();
    } else {
      setFavorites([]);
      setLoading(false);
    }
  }, [user, barId, loadBarFavorites]);

  const isFavorite = (cocktailId: string) => favorites.includes(cocktailId);

  const toggleFavorite = async (
    cocktailId: string,
    cocktailCatalogBarId?: string | null
  ) => {
    if (!user) return;

    let catalogBarId = cocktailCatalogBarId;
    if (catalogBarId === undefined) {
      catalogBarId = await fetchCocktailCatalogBarId(cocktailId);
    }
    const globalTemplate = isGlobalTemplate(catalogBarId);

    try {
      if (isFavorite(cocktailId)) {
        const { error: delBar } = await supabase
          .from('favorite_cocktails_bar')
          .delete()
          .eq('user_id', user.id)
          .eq('bar_id', barId)
          .eq('cocktail_id', cocktailId);

        if (delBar) throw delBar;

        if (globalTemplate) {
          const { error: delG } = await supabase
            .from('favorite_cocktails_global')
            .delete()
            .eq('user_id', user.id)
            .eq('cocktail_id', cocktailId);
          if (delG) throw delG;
        }

        setFavorites((prev) => prev.filter((id) => id !== cocktailId));
      } else {
        if (globalTemplate) {
          const { error: upG } = await supabase.from('favorite_cocktails_global').upsert(
            { user_id: user.id, cocktail_id: cocktailId },
            { onConflict: 'user_id,cocktail_id' }
          );
          if (upG) throw upG;
        }

        const { error: insB } = await supabase.from('favorite_cocktails_bar').insert({
          user_id: user.id,
          bar_id: barId,
          cocktail_id: cocktailId,
        });

        if (insB) {
          if (globalTemplate) {
            await supabase
              .from('favorite_cocktails_global')
              .delete()
              .eq('user_id', user.id)
              .eq('cocktail_id', cocktailId);
          }
          throw insB;
        }

        setFavorites((prev) => (prev.includes(cocktailId) ? prev : [...prev, cocktailId]));
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
        loading,
        refreshBarFavorites: loadBarFavorites,
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
