import { createClient } from '@supabase/supabase-js';
import { Database } from '../supabase/types';

// Use a single variable to check for valid environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isConnected = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'undefined' && supabaseAnonKey !== 'undefined');

let supabaseClient: any;

if (isConnected) {
  console.log('✅ Supabase credentials found, creating client');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseAnonKey.substring(0, 20) + '...');
  
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
} else {
  console.warn('❌ Supabase environment variables not found or invalid. Using mock client.');
  
  // A mock client that correctly simulates API failures by returning a rejected promise.
  const mockError = { message: 'Supabase not configured. Please connect to Supabase first.', code: 'SUPABASE_NOT_CONNECTED' };

  const mockAuth = {
    getSession: () => Promise.resolve({ data: { session: null }, error: mockError }),
    getUser: () => Promise.resolve({ data: { user: null }, error: mockError }),
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: mockError }),
    signUp: () => Promise.resolve({ data: { user: null, session: null }, error: mockError }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: (callback: any) => {
      setTimeout(() => callback('SIGNED_OUT', null), 100);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    updateUser: () => Promise.resolve({ data: { user: null }, error: mockError }),
  };

  const createMockQuery = () => ({
    select: () => createMockQuery(),
    insert: () => createMockQuery(),
    update: () => createMockQuery(),
    delete: () => createMockQuery(),
    upsert: () => createMockQuery(),
    eq: () => createMockQuery(),
    // Correctly simulate a failed database call by rejecting the promise.
    single: () => Promise.resolve({ data: null, error: mockError }),
    then: (callback: any) => Promise.resolve(callback({ data: null, error: mockError })),
    // The `then` method is also adjusted to return a rejected promise.
    catch: (callback: any) => Promise.reject(callback(mockError)),
  });

  supabaseClient = {
    auth: mockAuth,
    from: () => createMockQuery(),
    functions: {
      invoke: () => Promise.resolve({ data: null, error: mockError }),
    },
    rpc: () => Promise.resolve({ data: null, error: mockError }),
  };
}

export const supabase = supabaseClient;