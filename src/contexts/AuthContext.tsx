import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/auth-helpers-react';
import { supabase } from '../services/supabase';

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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event, session);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    console.log('Starting profile fetch for user:', userId);
    setLoading(true);

    try {
      // Try direct query with error handling
      console.log('Attempting direct profile query...', { userId });
      try {
        console.log('Executing Supabase query...');
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('Current session:', {
          hasSession: !!sessionData.session,
          accessToken: sessionData.session?.access_token ? 'present' : 'missing'
        });

        const query = supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        console.log('Query constructed, awaiting response...');
        const { data, error } = await query;
        
        console.log('Query response received:', { 
          hasData: !!data, 
          error: error?.message,
          data: data ? { id: data.id, role: data.role } : null,
          queryError: error ? {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          } : null
        });

        if (error) {
          console.error('Error in profile query:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }

        if (!data) {
          console.log('No profile found, attempting to create...');
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

          console.log('Profile creation attempt:', { 
            success: !!newProfile, 
            error: createError?.message,
            profile: newProfile ? { id: newProfile.id, role: newProfile.role } : null,
            createError: createError ? {
              message: createError.message,
              details: createError.details,
              hint: createError.hint,
              code: createError.code
            } : null
          });

          if (createError) {
            console.error('Error creating profile:', {
              message: createError.message,
              details: createError.details,
              hint: createError.hint,
              code: createError.code
            });
            throw createError;
          }

          console.log('Successfully created new profile:', newProfile);
          setProfile(newProfile);
        } else {
          console.log('Found existing profile:', data);
          setProfile(data);
        }
      } catch (queryError: any) {
        console.error('Error in profile query/creation:', {
          message: queryError.message,
          details: queryError.details,
          hint: queryError.hint,
          code: queryError.code,
          stack: queryError.stack
        });
        throw queryError;
      }
    } catch (error: any) {
      console.error('Unexpected error in fetchProfile:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        stack: error.stack
      });
    } finally {
      console.log('Setting loading to false');
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        console.log('Successfully signed out');
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
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