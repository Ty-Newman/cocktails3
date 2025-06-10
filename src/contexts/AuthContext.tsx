import { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseClient, getSupabaseClientSync } from '../services/supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../types/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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
        return null;
      }

      console.log('Profile fetched:', data);
      return data as unknown as Profile;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
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

  const signInWithGoogle = async () => {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client is not available');
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Discord:', error);
      throw error;
    }
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

  const value = {
    session,
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    signInWithGoogle,
    signInWithDiscord,
    signOut
  };

  // Debug admin status
  console.log('AuthContext state:', {
    hasSession: !!session,
    hasUser: !!user,
    hasProfile: !!profile,
    profileRole: profile?.role,
    isAdmin: profile?.role === 'admin'
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