import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSupabaseClient } from '../services/supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../types/supabase';
import { DEFAULT_BAR_SLUG } from '../constants/bars';

export interface OwnedBarSummary {
  id: string;
  slug: string;
  name: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** Slug of the user's home bar (`profiles.bar_id`), for redirects outside tenant routes. */
  homeBarSlug: string | null;
  /** Bar row where `owner_user_id` is this user, if any. */
  ownedBar: OwnedBarSummary | null;
  loading: boolean;
  /** Platform staff (`profiles.role = superadmin`). */
  isSuperadmin: boolean;
  /** Venue admin/owner for the given bar (`bar_members`). Superadmin is treated as admin for any bar. */
  canAdminBar: (barId: string | null | undefined) => boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [homeBarSlug, setHomeBarSlug] = useState<string | null>(null);
  const [ownedBar, setOwnedBar] = useState<OwnedBarSummary | null>(null);
  const [adminMemberBarIds, setAdminMemberBarIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);

  const resolveHomeBarSlug = async (supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClient>>>, barId: string | null | undefined) => {
    if (!barId) {
      setHomeBarSlug(DEFAULT_BAR_SLUG);
      return;
    }
    const { data } = await supabase.from('bars').select('slug').eq('id', barId).maybeSingle();
    setHomeBarSlug(data?.slug ?? DEFAULT_BAR_SLUG);
  };

  const fetchProfile = async (userId: string) => {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      console.error('Supabase client is not available');
      return null;
    }

    try {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setHomeBarSlug(null);
        setOwnedBar(null);
        setAdminMemberBarIds(new Set());
        return null;
      }

      console.log('Profile fetched:', data);
      const p = data as unknown as Profile;
      await resolveHomeBarSlug(supabase, p.bar_id);

      const { data: owned } = await supabase
        .from('bars')
        .select('id, slug, name')
        .eq('owner_user_id', userId)
        .maybeSingle();
      setOwnedBar(
        owned ? { id: owned.id, slug: owned.slug, name: owned.name } : null
      );

      const { data: adminRows, error: adminErr } = await supabase
        .from('bar_members')
        .select('bar_id')
        .eq('user_id', userId)
        .in('role', ['owner', 'admin']);
      if (adminErr) {
        console.error('Error fetching bar_members:', adminErr);
        setAdminMemberBarIds(new Set());
      } else {
        setAdminMemberBarIds(new Set((adminRows ?? []).map((r) => r.bar_id as string)));
      }

      return p;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      setHomeBarSlug(null);
      setOwnedBar(null);
      setAdminMemberBarIds(new Set());
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    console.log('Setting up auth...');

    const setupAuth = async () => {
      try {
        const supabase = await getSupabaseClient();
        if (!supabase) {
          console.error('Supabase client is not available');
          setLoading(false);
          return;
        }
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Initial session check:', { hasSession: !!session, error });
        
        if (!mounted) return;

        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        if (session) {
          setSession(session);
          setUser(session.user);
          const profile = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(profile);
          }
        }
        if (mounted) {
          setLoading(false);
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', { event, hasSession: !!session });
          if (!mounted) return;

          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            const profile = await fetchProfile(session.user.id);
            if (mounted) {
              setProfile(profile);
            }
          } else {
            setProfile(null);
            setHomeBarSlug(null);
            setOwnedBar(null);
            setAdminMemberBarIds(new Set());
          }
          
          if (mounted) {
            setLoading(false);
          }
        });

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error in setupAuth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    setupAuth();
  }, []);

  const getRedirectUrl = () => {
    // Allow override via environment variable, otherwise use current origin
    const envRedirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;
    const baseUrl = envRedirectUrl || window.location.origin;
    return `${baseUrl}/auth/callback`;
  };

  const signInWithGoogle = async () => {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client is not available');
    }

    try {
      const redirectTo = getRedirectUrl();
      console.log('Google OAuth redirect URL:', redirectTo);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signInWithDiscord = async () => {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client is not available');
    }

    try {
      const redirectTo = getRedirectUrl();
      console.log('Discord OAuth redirect URL:', redirectTo);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Discord:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const p = await fetchProfile(session.user.id);
    setProfile(p);
  };

  const signOut = async () => {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client is not available');
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const canAdminBar = useCallback(
    (barId: string | null | undefined) => {
      if (!barId) return false;
      if (profile?.role === 'superadmin') return true;
      return adminMemberBarIds.has(barId);
    },
    [profile?.role, adminMemberBarIds]
  );

  const value = {
    session,
    user,
    profile,
    homeBarSlug,
    ownedBar,
    loading,
    isSuperadmin: profile?.role === 'superadmin',
    canAdminBar,
    signInWithGoogle,
    signInWithDiscord,
    signOut,
    refreshProfile,
  };

  console.log('AuthContext state:', {
    hasSession: !!session,
    hasUser: !!user,
    hasProfile: !!profile,
    profileRole: profile?.role,
    isSuperadmin: profile?.role === 'superadmin',
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 