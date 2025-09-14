import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Read Supabase credentials from Vite env.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

// Create a client only when configured. Otherwise, export `null` so callers can guard.
const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseKey as string, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        autoRefreshToken: true,
      },
    })
  : null

export default supabase
