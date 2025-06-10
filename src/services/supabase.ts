import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

console.log('Initializing Supabase client with URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  }
});

// Enhanced connection test
console.log('Testing Supabase connection...');
supabase.from('profiles').select('count').single()
  .then(({ data, error }) => {
    if (error) {
      console.error('Supabase connection test failed:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } else {
      console.log('Supabase connection test successful:', {
        data,
        url: supabaseUrl,
        hasAnonKey: !!supabaseAnonKey
      });
    }
  })
  .catch(error => {
    console.error('Supabase connection test error:', {
      message: error.message,
      stack: error.stack
    });
  }); 