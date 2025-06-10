import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

console.log('Creating Supabase client...');

// Create a singleton instance
let supabaseInstance: ReturnType<typeof createClient> | null = null;
let initPromise: Promise<ReturnType<typeof createClient>> | null = null;

const initializeClient = async () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (!initPromise) {
    initPromise = (async () => {
      console.log('Initializing new Supabase client...');
      const client = createClient(supabaseUrl, supabaseAnonKey, {
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

      // Wait for initial session check
      try {
        const { data: { session }, error } = await client.auth.getSession();
        if (error) {
          console.error('Error during client initialization:', error);
          throw error;
        }
        console.log('Client initialized with session:', !!session);
      } catch (error) {
        console.error('Failed to initialize client:', error);
        throw error;
      }

      supabaseInstance = client;
      return client;
    })();
  }

  return initPromise;
};

// Export a function that ensures the client is initialized
export const getSupabaseClient = async () => {
  return initializeClient();
};

// Export a synchronous getter that returns the instance if it exists
export const getSupabaseClientSync = () => {
  if (!supabaseInstance) {
    throw new Error('Supabase client not initialized. Use getSupabaseClient() first.');
  }
  return supabaseInstance;
};

// Create and export the client instance
const client = createClient(supabaseUrl, supabaseAnonKey, {
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

// Initialize the client immediately
initializeClient().catch(console.error);

// Export the client instance
export const supabase = client; 