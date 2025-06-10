import { createContext, useContext, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface SupabaseContextType {
  supabase: SupabaseClient | null;
}

const SupabaseContext = createContext<SupabaseContextType>({ supabase: null });

export function SupabaseProvider({ children }: { children: ReactNode }) {
  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
} 