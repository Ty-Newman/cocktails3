import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  /** @deprecated Prefer isFavorite(id, catalogBarId). Bar-scoped rows only (non–global cocktails). */
  favorites: string[];
  isFavorite: (cocktailId: string, cocktailCatalogBarId?: string | null) => boolean;
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
  const [globalFavoriteIds, setGlobalFavoriteIds] = useState<string[]>([]);
  const [barOnlyFavoriteIds, setBarOnlyFavoriteIds] = useState<string[]>([]);
  const [menuCocktailIds, setMenuCocktailIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);

  const loadBarFavorites = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [menuRes, globalRes, barRes] = await Promise.all([
        supabase
          .from('bar_cocktails')
          .select('cocktail_id')
          .eq('bar_id', barId)
          .eq('active', true),
        supabase.from('favorite_cocktails_global').select('cocktail_id').eq('user_id', user.id),
        supabase
          .from('favorite_cocktails_bar')
          .select('cocktail_id')
          .eq('user_id', user.id)
          .eq('bar_id', barId),
      ]);

      if (menuRes.error) throw menuRes.error;
      if (globalRes.error) throw globalRes.error;
      if (barRes.error) throw barRes.error;

      setMenuCocktailIds(new Set((menuRes.data ?? []).map((r) => r.cocktail_id as string)));
      setGlobalFavoriteIds([...new Set((globalRes.data ?? []).map((r) => r.cocktail_id as string))]);
      setBarOnlyFavoriteIds([...new Set((barRes.data ?? []).map((r) => r.cocktail_id as string))]);
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
      setGlobalFavoriteIds([]);
      setBarOnlyFavoriteIds([]);
      setMenuCocktailIds(new Set());
      setLoading(false);
    }
  }, [user, barId, loadBarFavorites]);

  const isFavorite = (cocktailId: string, cocktailCatalogBarId?: string | null) => {
    if (cocktailCatalogBarId === undefined) {
      return (
        barOnlyFavoriteIds.includes(cocktailId) ||
        (globalFavoriteIds.includes(cocktailId) && menuCocktailIds.has(cocktailId))
      );
    }
    if (isGlobalTemplate(cocktailCatalogBarId)) {
      return globalFavoriteIds.includes(cocktailId) && menuCocktailIds.has(cocktailId);
    }
    return barOnlyFavoriteIds.includes(cocktailId);
  };

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

    const currentlyFavorite = isFavorite(cocktailId, catalogBarId);

    try {
      if (currentlyFavorite) {
        if (globalTemplate) {
          const { error: delG } = await supabase
            .from('favorite_cocktails_global')
            .delete()
            .eq('user_id', user.id)
            .eq('cocktail_id', cocktailId);
          if (delG) throw delG;
          await supabase
            .from('favorite_cocktails_bar')
            .delete()
            .eq('user_id', user.id)
            .eq('cocktail_id', cocktailId);
        } else {
          const { error: delB } = await supabase
            .from('favorite_cocktails_bar')
            .delete()
            .eq('user_id', user.id)
            .eq('bar_id', barId)
            .eq('cocktail_id', cocktailId);
          if (delB) throw delB;
        }
      } else {
        if (globalTemplate) {
          const { error: upG } = await supabase.from('favorite_cocktails_global').upsert(
            { user_id: user.id, cocktail_id: cocktailId },
            { onConflict: 'user_id,cocktail_id' }
          );
          if (upG) throw upG;
        } else {
          const { error: insB } = await supabase.from('favorite_cocktails_bar').insert({
            user_id: user.id,
            bar_id: barId,
            cocktail_id: cocktailId,
          });
          if (insB) throw insB;
        }
      }

      await loadBarFavorites();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const derivedFavoritesOnMenu = [
    ...new Set([
      ...barOnlyFavoriteIds.filter((id) => menuCocktailIds.has(id)),
      ...globalFavoriteIds.filter((id) => menuCocktailIds.has(id)),
    ]),
  ];

  return (
    <FavoritesContext.Provider
      value={{
        favorites: derivedFavoritesOnMenu,
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
