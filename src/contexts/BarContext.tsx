import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSupabaseClient } from '../services/supabase';

export interface BarRecord {
  id: string;
  slug: string;
  name: string;
}

interface BarContextValue {
  bar: BarRecord | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const BarContext = createContext<BarContextValue | undefined>(undefined);

export function BarProvider({ children }: { children: React.ReactNode }) {
  const { barSlug } = useParams<{ barSlug: string }>();
  const [bar, setBar] = useState<BarRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!barSlug) {
      setBar(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) throw new Error('Supabase client is not available');

      const { data, error: qerr } = await supabase
        .from('bars')
        .select('id, slug, name')
        .eq('slug', barSlug)
        .maybeSingle();

      if (qerr) throw qerr;
      setBar(data ?? null);
      if (!data) setError('Bar not found');
    } catch (e) {
      setBar(null);
      setError(e instanceof Error ? e.message : 'Failed to load bar');
    } finally {
      setLoading(false);
    }
  }, [barSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <BarContext.Provider value={{ bar, loading, error, refetch: load }}>
      {children}
    </BarContext.Provider>
  );
}

export function useBar() {
  const ctx = useContext(BarContext);
  if (ctx === undefined) {
    throw new Error('useBar must be used within a BarProvider');
  }
  return ctx;
}
