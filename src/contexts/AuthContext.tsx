import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/auth-helpers-react';
import { supabase, initializeAuth } from '../services/supabase';

type UserRole = 'user' | 'admin';

interface Profile {
  id: string;
  role: UserRole;
}

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

  useEffect(() => {
    // Initialize auth state
    const setupAuth = async () => {
      console.log('Setting up auth state...');
      setLoading(true);

      try {
        // Get initial session with a timeout
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null }, error: null }>((_, reject) => 
            setTimeout(() => reject(new Error('Session check timeout')), 5000)
          )
        ]);
        
        const { data: { session }, error: sessionError } = result;
        
        if (sessionError) {
          console.error('Error getting initial session:', sessionError);
          throw sessionError;
        }

        console.log('Initial session check:', {
          hasSession: !!session,
          userId: session?.user?.id,
          accessToken: session?.access_token ? 'present' : 'missing'
        });

        if (session?.user) {
          setSession(session);
          setUser(session.user);
          
          // Wait for profile fetch to complete
          await fetchProfile(session.user.id);
        } else {
          console.log('No initial session found');
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (error: any) {
        console.error('Error in setupAuth:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        // Reset state on error
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    setupAuth();

    let timeoutId: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[AuthContext] Tab became visible, re-checking session/profile...');
        // Clear any existing timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        // Debounce the setupAuth call
        timeoutId = setTimeout(() => {
          setupAuth();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    console.log('Starting profile fetch for user:', userId);
    setLoading(true);

    try {
      // Get current session to ensure we have the latest auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session for profile fetch:', sessionError);
        throw sessionError;
      }

      if (!session) {
        console.error('No session found for profile fetch');
        throw new Error('No session found');
      }

      if (!session.access_token) {
        console.error('No access token in session');
        throw new Error('No access token');
      }

      console.log('Making profile query with session:', {
        hasSession: true,
        accessToken: 'present',
        userId: session.user.id,
        headers: {
          authorization: 'Bearer [REDACTED]'
        }
      });

      // Log the actual query we're about to make
      console.log('Executing profile query:', {
        table: 'profiles',
        select: '*',
        filter: { id: userId }
      });

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log('Profile fetch response:', { 
        hasData: !!data, 
        error: error?.message,
        data: data ? { id: data.id, role: data.role } : null,
        status: error ? 'error' : 'success'
      });

      if (error) {
        console.error('Error fetching profile:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      if (!data) {
        console.log('No profile found, creating new profile...');
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([
            {
              id: userId,
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          throw createError;
        }

        console.log('Successfully created new profile:', newProfile);
        setProfile(newProfile);
      } else {
        console.log('Found existing profile:', data);
        setProfile(data);
      }
    } catch (error: any) {
      console.error('Error in fetchProfile:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        stack: error.stack
      });
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signInWithDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signOut = async () => {
    console.log('Sign out initiated');
    try {
      console.log('Current session before sign out:', {
        hasSession: !!session,
        hasUser: !!user,
        hasProfile: !!profile
      });
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', {
          message: error.message,
          code: error.code
        });
      } else {
        console.log('Successfully signed out');
        // Force clear local state
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    } catch (error: any) {
      console.error('Unexpected error during sign out:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
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
    signOut,
  };

  console.log('Current auth state:', {
    session: !!session,
    user: !!user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin'
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 