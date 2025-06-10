import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

console.log('Initializing Supabase client with URL:', supabaseUrl);

// Create the client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    storage: {
      getItem: (key) => {
        console.log('Getting item from storage:', key);
        const value = localStorage.getItem(key);
        console.log('Storage value:', value ? 'present' : 'missing');
        return value;
      },
      setItem: (key, value) => {
        console.log('Setting item in storage:', key);
        localStorage.setItem(key, value);
      },
      removeItem: (key) => {
        console.log('Removing item from storage:', key);
        localStorage.removeItem(key);
      }
    }
  },
  db: {
    schema: 'public'
  }
});

// Initialize the client and check session
const initializeSupabase = async () => {
  try {
    console.log('Initializing Supabase client...');
    
    // Check if we have a stored session
    const storedSession = localStorage.getItem('supabase.auth.token');
    console.log('Stored session:', storedSession ? 'present' : 'missing');
    
    // Get the current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting initial session:', error);
      return;
    }
    
    console.log('Initial session state:', {
      hasSession: !!session,
      userId: session?.user?.id,
      accessToken: session?.access_token ? 'present' : 'missing'
    });
    
    return session;
  } catch (error) {
    console.error('Error initializing Supabase:', error);
    return null;
  }
};

// Export the initialization function
export const initializeAuth = initializeSupabase; 